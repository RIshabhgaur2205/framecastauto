# Fix ad videos: one real voice, spoken on camera

Right now ads are built in two disconnected halves: ElevenLabs speaks the whole script with a fixed male voice ("George"), while Veo separately films a character it invents per shot — so the narration can be male over a female actor, and the mouth never matches the words. The fix is to let the video model own both the performance and the voice, driven by the script.

## What changes

1. **Locked character persona**
   When the ad script is written, the model also returns a `persona`: gender presentation, age range, hair, wardrobe, accent/voice quality. That exact persona string is prepended to every shot prompt, so the same person appears in all clips.

2. **Spoken dialogue instead of narration**
   The script is split into per-shot lines. Each Veo shot prompt now carries the exact words that character speaks on camera, plus instruction to record clean natural dialogue with matching lip sync and no background music/voiceover. Veo 3.1 generates the audio itself, in the persona's voice.

3. **No more separate voiceover for ads**
   For `video_type = "ad"`, the ElevenLabs voiceover step is skipped entirely. Regular (non-ad) videos keep the current narration pipeline unchanged.

4. **Render keeps the clip audio**
   Ad clips are currently muted at render. They will play unmuted, in shot order, and the timeline duration is derived from the actual clip durations rather than the voiceover length.

5. **Captions come from the generated audio**
   Captions for ads are produced by transcribing the assembled dialogue (existing Scribe step, run over the concatenated ad audio) so on-screen text matches what is actually said. If transcription is unavailable, the per-shot script lines are used with clip-based timings.

6. **Safety net**
   If Veo returns a clip with no usable audio track, that shot falls back to a synthesized line — using a voice whose gender matches the locked persona, not a fixed male voice — so a run never ships mismatched narration again.

## Technical notes

- `src/lib/generation.functions.ts`: extend the ad script JSON to `{script, headline, cta, persona, lines[]}`; gate the voiceover block on `!isAd`; pass `persona` + `dialogue` into each `startAdVideoJob` prompt; store both in `ai_frames` so resume does not re-bill completed shots.
- `src/lib/pipeline.server.ts`: `startAdVideoJob` prompt template gains dialogue/persona sections; ad scenes in `buildJ2VPayload` drop `muted: true` and stop layering the global narration `audio` element when `isAd`; duration computed from clips.
- Caption style, brand overlays, end card, and publishing flow stay as they are.
- Existing in-flight generations keep working: records without `persona`/`lines` fall back to today's behaviour.
