# Fix ads stuck on "Sourcing visuals"

## What I found (verified)

The AI visuals **are** working — but the run dies before rendering.

- Video `8488...6383c` (ad) has been sitting at `sourcing_visuals` since 08:30, with no error recorded.
- Gateway logs show 7 successful Gemini image calls between 08:31 and 08:34:35, each taking 20–47 seconds.
- Storage holds only 6 of those frames (`0.png`–`5.png`); the 7th image was generated and billed but never saved.
- Nothing happened after 08:34:35: no further AI calls, no status change, no error.

Conclusion: the whole pipeline runs inside a **single long server call**. Ad mode generates 4–8 frames sequentially at ~30s each, so the request runs 4–6 minutes and gets cut off by the request time limit before it can submit the render. Because the cut is silent, the row stays "Sourcing visuals" forever and the queue spinner never stops.

## Fix

1. **Make the run resumable per frame.** Change the resume check so it reuses whatever frames already exist and only generates the missing ones (today it regenerates everything unless the full set is present). Persist each frame's storage path on the video row as it is produced, so a retry restarts from frame 6 instead of frame 0 — no re-billed images.

2. **Cut visuals work into chunks that finish inside one request.** Generate a small batch of frames per call (e.g. 2), save them, and return a "more work to do" result. The queue page keeps calling the pipeline until visuals are complete, then the render is submitted. Progress becomes visible instead of a stalled spinner.

3. **Reduce the number of frames.** Cap ad frames at 4–6 and reuse them across scenes in the timeline, so a typical 30s ad needs far less generation time.

4. **Never leave a run silently stuck.** Record a heartbeat timestamp on every step. If a video has been in a working status with no heartbeat for several minutes, the queue shows it as "Interrupted — resume" with a retry action rather than an endless spinner.

5. **Unstick the current video.** Resume this ad from its 6 existing frames so it renders without regenerating anything.

## Technical notes

- `src/lib/generation.functions.ts` (visuals block, lines ~385–474): switch from all-or-nothing resume to incremental, batched frame generation with per-frame persistence.
- `src/lib/pipeline.server.ts`: no change needed to `generateAdVisual` itself; it is returning images correctly.
- `src/routes/_authenticated/dashboard.queue.tsx`: continue-until-done polling loop, plus the stale/interrupted state in the status badge.
- New column (or reuse of `stock_clips`-style jsonb) to store generated ad frame paths and a `last_progress_at` timestamp.
