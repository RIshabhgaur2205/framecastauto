// Server-only helpers for the generation pipeline.
// Never import this from route/component files. Server fns must dynamic-import it.

const ELEVEN_VOICE_ID = "JBFqnCBsd6RMkjVDRZzb"; // George
const VIDEO_WIDTH = 1080;
const VIDEO_HEIGHT = 1920;

type CaptionWord = { text: string; start: number; end: number };

/* ----------------------------- ElevenLabs TTS ----------------------------- */

export async function synthesizeVoiceover(text: string): Promise<ArrayBuffer> {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) throw new Error("ELEVENLABS_API_KEY not configured");

  const res = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${ELEVEN_VOICE_ID}?output_format=mp3_44100_128`,
    {
      method: "POST",
      headers: {
        "xi-api-key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text,
        model_id: "eleven_multilingual_v2",
        voice_settings: {
          stability: 0.55,
          similarity_boost: 0.75,
          style: 0.35,
          use_speaker_boost: true,
          speed: 1.0,
        },
      }),
    },
  );
  if (!res.ok) {
    throw new Error(`ElevenLabs TTS ${res.status}: ${(await res.text()).slice(0, 200)}`);
  }
  return res.arrayBuffer();
}

/* ----------------------------- ElevenLabs STT ----------------------------- */

const ISO_639_3: Record<string, string> = {
  en: "eng", es: "spa", hi: "hin", fr: "fra", de: "deu", pt: "por", it: "ita",
  ja: "jpn", ar: "ara", zh: "cmn", ru: "rus", ko: "kor", tr: "tur", id: "ind",
};

export async function transcribeForCaptions(
  audio: ArrayBuffer,
  language: string = "en",
): Promise<{ words: CaptionWord[]; duration: number }> {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) throw new Error("ELEVENLABS_API_KEY not configured");

  const form = new FormData();
  form.append("file", new Blob([audio], { type: "audio/mpeg" }), "voice.mp3");
  form.append("model_id", "scribe_v2");
  form.append("diarize", "false");
  form.append("tag_audio_events", "false");
  form.append("language_code", ISO_639_3[language.toLowerCase()] ?? "eng");

  const res = await fetch("https://api.elevenlabs.io/v1/speech-to-text", {
    method: "POST",
    headers: { "xi-api-key": apiKey },
    body: form,
  });
  if (!res.ok) {
    throw new Error(`ElevenLabs STT ${res.status}: ${(await res.text()).slice(0, 200)}`);
  }
  const json = (await res.json()) as {
    words?: Array<{ text: string; start: number; end: number; type?: string }>;
  };
  const words = (json.words ?? [])
    .filter((w) => w.type !== "audio_event" && w.text?.trim())
    .map((w) => ({ text: w.text, start: w.start, end: w.end }));
  const duration = words.length ? words[words.length - 1].end : 0;
  return { words, duration };
}

export function wordsToSrt(words: CaptionWord[]): string {
  // Group into ~5-word cues
  const cues: Array<{ start: number; end: number; text: string }> = [];
  let buf: CaptionWord[] = [];
  for (const w of words) {
    buf.push(w);
    if (buf.length >= 5 || /[.!?]$/.test(w.text)) {
      cues.push({
        start: buf[0].start,
        end: buf[buf.length - 1].end,
        text: buf.map((b) => b.text).join(" ").trim(),
      });
      buf = [];
    }
  }
  if (buf.length) {
    cues.push({
      start: buf[0].start,
      end: buf[buf.length - 1].end,
      text: buf.map((b) => b.text).join(" ").trim(),
    });
  }
  const fmt = (t: number) => {
    const ms = Math.floor((t % 1) * 1000);
    const s = Math.floor(t) % 60;
    const m = Math.floor(t / 60) % 60;
    const h = Math.floor(t / 3600);
    const pad = (n: number, w = 2) => String(n).padStart(w, "0");
    return `${pad(h)}:${pad(m)}:${pad(s)},${pad(ms, 3)}`;
  };
  return cues
    .map((c, i) => `${i + 1}\n${fmt(c.start)} --> ${fmt(c.end)}\n${c.text}\n`)
    .join("\n");
}

/* --------------------------------- Pexels --------------------------------- */

export type StockClip = { url: string; preview: string; duration: number };

export async function fetchStockClips(query: string, count = 4): Promise<StockClip[]> {
  const apiKey = process.env.PEXELS_API_KEY;
  if (!apiKey) throw new Error("PEXELS_API_KEY not configured");

  const res = await fetch(
    `https://api.pexels.com/videos/search?query=${encodeURIComponent(query)}&per_page=${Math.max(count * 3, 12)}&orientation=portrait&size=medium`,
    { headers: { Authorization: apiKey } },
  );
  if (!res.ok) {
    throw new Error(`Pexels ${res.status}: ${(await res.text()).slice(0, 200)}`);
  }
  const json = (await res.json()) as {
    videos?: Array<{
      duration: number;
      image: string;
      video_files: Array<{ link: string; width: number; height: number; quality: string }>;
    }>;
  };
  const clips: StockClip[] = [];
  // Prefer longer clips (>=3s feels like a real shot, not a blip).
  const candidates = (json.videos ?? []).slice().sort((a, b) => b.duration - a.duration);
  for (const v of candidates) {
    const file =
      v.video_files.find((f) => f.height >= 1280 && f.height <= 1920 && f.quality === "hd") ??
      v.video_files.find((f) => f.height >= 720) ??
      v.video_files[0];
    if (!file) continue;
    clips.push({ url: file.link, preview: v.image, duration: v.duration });
    if (clips.length >= count) break;
  }
  if (!clips.length) throw new Error(`No Pexels clips for "${query}"`);
  return clips;
}

/** One matching clip per query (deduplicated). Skips queries that fail; backfills from a broad query. */
export async function fetchStockClipsForQueries(
  queries: string[],
  fallbackQuery: string,
): Promise<StockClip[]> {
  const out: StockClip[] = [];
  const seen = new Set<string>();
  for (const q of queries) {
    try {
      const clips = await fetchStockClips(q, 4);
      const pick = clips.find((c) => !seen.has(c.url)) ?? null;
      if (pick) {
        out.push(pick);
        seen.add(pick.url);
      }
    } catch {
      // single-query failure: ignore, backfill below
    }
  }
  const target = Math.max(queries.length, 6);
  if (out.length < target) {
    try {
      const extras = await fetchStockClips(fallbackQuery, target + 4);
      for (const c of extras) {
        if (seen.has(c.url)) continue;
        out.push(c);
        seen.add(c.url);
        if (out.length >= target) break;
      }
    } catch {
      // ignore; caller errors if zero
    }
  }
  if (!out.length) throw new Error("No stock clips available for script");
  return out;
}

/* -------------------------------- JSON2Video ------------------------------ */

const J2V_BASE = "https://api.json2video.com/v2/movies";

type CaptionStyle = "bold" | "minimal" | "neon" | "subtle";

function captionStyleConfig(style: CaptionStyle) {
  // JSON2Video subtitles settings
  switch (style) {
    case "neon":
      return {
        style: "classic",
        "font-family": "Montserrat",
        "font-size": 64,
        "word-color": "#A78BFA",
        "line-color": "#FFFFFF",
        "shadow-color": "#000000",
        "shadow-offset": 4,
        position: "bottom-center",
        "all-caps": true,
      };
    case "minimal":
      return {
        style: "classic",
        "font-family": "Inter",
        "font-size": 48,
        "word-color": "#FFFFFF",
        "line-color": "#FFFFFF",
        "shadow-color": "#000000",
        "shadow-offset": 2,
        position: "bottom-center",
      };
    case "subtle":
      return {
        style: "classic",
        "font-family": "Inter",
        "font-size": 44,
        "word-color": "#E5E7EB",
        "line-color": "#E5E7EB",
        "shadow-color": "#000000",
        "shadow-offset": 2,
        position: "bottom-center",
      };
    case "bold":
    default:
      return {
        style: "classic",
        "font-family": "Montserrat",
        "font-size": 68,
        "word-color": "#FFFFFF",
        "line-color": "#FFFFFF",
        "shadow-color": "#000000",
        "shadow-offset": 4,
        position: "bottom-center",
        "all-caps": true,
      };
  }
}

export type ReferenceMedia = { url: string; type: "image" | "video" };

export type BrandRenderOpts = {
  isAd?: boolean;
  logoUrl?: string | null;
  brandPrimary?: string | null;
  brandAccent?: string | null;
  headline?: string | null;
  ctaText?: string | null;
  ctaUrl?: string | null;
  brandName?: string | null;
};

function buildJ2VPayload(opts: {
  voiceoverUrl: string;
  srtUrl: string | null;
  clips: StockClip[];
  referenceMedia?: ReferenceMedia[];
  duration: number;
  captionStyle: CaptionStyle;
  burnCaptions: boolean;
} & BrandRenderOpts) {
  const {
    voiceoverUrl,
    srtUrl,
    clips,
    referenceMedia = [],
    duration,
    captionStyle,
    burnCaptions,
    isAd = false,
    logoUrl = null,
    brandPrimary = null,
    brandAccent = null,
    headline = null,
    ctaText = null,
    ctaUrl = null,
    brandName = null,
  } = opts;

  if (duration <= 0) throw new Error("Cannot render: duration is 0");
  if (!clips.length && !referenceMedia.length) throw new Error("Cannot render: no clips");

  // Allocate ~25-40% of the timeline to product reference media (capped at 4s/each),
  // and the rest to stock B-roll. References open the video (hero shot) and reappear later.
  const refCount = referenceMedia.length;
  const stockCount = clips.length;
  // With no stock b-roll (ad mode: brand media + Gemini-generated frames only),
  // spread the full timeline across the available visuals so nothing goes black.
  const refDuration = refCount
    ? stockCount
      ? Math.min(4, Math.max(2.5, (duration * 0.35) / refCount))
      : Math.max(1.5, duration / refCount)
    : 0;
  const totalRefTime = +(refDuration * refCount).toFixed(2);
  const stockTotal = Math.max(duration - totalRefTime, stockCount * 1.5);
  const stockPer = stockCount ? +(stockTotal / stockCount).toFixed(2) : 0;

  const zooms = [2, -2, 3, -3, 1, -1, 2, -2];

  const refScene = (m: ReferenceMedia, i: number) => ({
    duration: +refDuration.toFixed(2),
    elements: [
      {
        type: m.type === "image" ? "image" : "video",
        src: m.url,
        duration: +refDuration.toFixed(2),
        // Fill the full 1080x1920 frame (crop overflow) so nothing is letterboxed.
        width: VIDEO_WIDTH,
        height: VIDEO_HEIGHT,
        resize: "cover",
        position: "center-center",
        ...(m.type === "video" ? { muted: true, loop: 1 } : {}),
        zoom: zooms[i % zooms.length],
      },
    ],
  });

  const stockScene = (c: StockClip, i: number) => ({
    duration: stockPer,
    elements: [
      {
        type: "video",
        src: c.url,
        duration: stockPer,
        width: VIDEO_WIDTH,
        height: VIDEO_HEIGHT,
        resize: "cover",
        position: "center-center",
        muted: true,
        loop: 1,
        zoom: zooms[i % zooms.length],
      },
    ],
  });

  // Open with the first reference (hero), then alternate stock/reference so the
  // product reappears throughout instead of only at the start.
  const scenes: Array<ReturnType<typeof refScene> | ReturnType<typeof stockScene>> = [];
  let refIdx = 0;
  if (refCount && stockCount) {
    scenes.push(refScene(referenceMedia[refIdx++], 0));
    const interval = Math.max(2, Math.ceil(stockCount / Math.max(refCount - 1, 1)));
    for (let i = 0; i < stockCount; i++) {
      scenes.push(stockScene(clips[i], scenes.length));
      if (refIdx < refCount && (i + 1) % interval === 0) {
        scenes.push(refScene(referenceMedia[refIdx++], scenes.length));
      }
    }
    while (refIdx < refCount) scenes.push(refScene(referenceMedia[refIdx++], scenes.length));
  } else if (refCount) {
    referenceMedia.forEach((m, i) => scenes.push(refScene(m, i)));
  } else {
    clips.forEach((c, i) => scenes.push(stockScene(c, i)));
  }

  const globalElements: Array<Record<string, unknown>> = [
    { type: "audio", src: voiceoverUrl, start: 0, duration },
  ];

  if (burnCaptions && srtUrl) {
    const settings = captionStyleConfig(captionStyle) as Record<string, unknown>;
    if (isAd && brandPrimary) settings["word-color"] = brandPrimary;
    globalElements.push({ type: "subtitles", captions: srtUrl, settings });
  }

  if (isAd) {
    // On-screen hook for the first ~3.5s.
    if (headline) {
      globalElements.push({
        type: "text",
        text: headline,
        start: 0.3,
        duration: 3.2,
        x: 80,
        y: 220,
        width: VIDEO_WIDTH - 160,
        settings: {
          "font-family": "Oswald",
          "font-size": "76px",
          "font-weight": "700",
          color: brandAccent ?? "#FFFFFF",
          "text-align": "center",
          "text-shadow": "0 6px 24px rgba(0,0,0,0.65)",
          "line-height": "1.05",
        },
      });
    }
    // Persistent logo watermark, top-right.
    if (logoUrl) {
      globalElements.push({
        type: "image",
        src: logoUrl,
        start: 0,
        duration,
        x: VIDEO_WIDTH - 260,
        y: 90,
        width: 180,
        resize: "fit",
      });
    }
    // Branded end card.
    const endCta = ctaText || "Shop now";
    scenes.push({
      duration: 2.6,
      "background-color": brandPrimary ?? "#0A0A0A",
      elements: [
        ...(logoUrl
          ? [
              {
                type: "image",
                src: logoUrl,
                duration: 2.6,
                x: (VIDEO_WIDTH - 420) / 2,
                y: 620,
                width: 420,
                resize: "fit",
              },
            ]
          : []),
        {
          type: "text",
          text: endCta,
          duration: 2.6,
          x: 100,
          y: 1120,
          width: VIDEO_WIDTH - 200,
          settings: {
            "font-family": "Oswald",
            "font-size": "88px",
            "font-weight": "700",
            color: brandAccent ?? "#FFFFFF",
            "text-align": "center",
          },
        },
        ...(ctaUrl || brandName
          ? [
              {
                type: "text",
                text: (ctaUrl || brandName) as string,
                duration: 2.6,
                x: 100,
                y: 1290,
                width: VIDEO_WIDTH - 200,
                settings: {
                  "font-family": "Roboto",
                  "font-size": "46px",
                  color: brandAccent ?? "#FFFFFF",
                  "text-align": "center",
                },
              },
            ]
          : []),
      ],
    } as never);
  }

  return {
    resolution: "custom",
    width: VIDEO_WIDTH,
    height: VIDEO_HEIGHT,
    quality: "high",
    scenes,
    elements: globalElements,
  };
}

export async function submitShotstackRender(opts: {
  voiceoverUrl: string;
  srtUrl: string | null;
  clips: StockClip[];
  referenceMedia?: ReferenceMedia[];
  duration: number;
  captionStyle: CaptionStyle;
  burnCaptions: boolean;
} & BrandRenderOpts): Promise<string> {

  const apiKey = process.env.JSON2VIDEO_API_KEY;
  if (!apiKey) throw new Error("JSON2VIDEO_API_KEY not configured");
  const payload = buildJ2VPayload(opts);
  const res = await fetch(J2V_BASE, {
    method: "POST",
    headers: { "x-api-key": apiKey, "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw new Error(`JSON2Video submit ${res.status}: ${(await res.text()).slice(0, 300)}`);
  }
  const json = (await res.json()) as { success?: boolean; project?: string; message?: string };
  if (!json.success || !json.project) {
    throw new Error(`JSON2Video submit failed: ${json.message ?? "no project id"}`);
  }
  return json.project;
}

export async function getShotstackStatus(
  renderId: string,
): Promise<{ status: string; url: string | null; error: string | null }> {
  const apiKey = process.env.JSON2VIDEO_API_KEY;
  if (!apiKey) throw new Error("JSON2VIDEO_API_KEY not configured");
  const res = await fetch(`${J2V_BASE}?project=${encodeURIComponent(renderId)}`, {
    headers: { "x-api-key": apiKey },
  });
  if (!res.ok) {
    throw new Error(`JSON2Video status ${res.status}: ${(await res.text()).slice(0, 200)}`);
  }
  const json = (await res.json()) as {
    success?: boolean;
    movie?: { status?: string; url?: string; message?: string };
  };
  const raw = json.movie?.status ?? "unknown";
  // Normalize to shotstack-ish states the caller expects: done | failed | <other>
  let status = raw;
  if (raw === "done") status = "done";
  else if (raw === "error" || raw === "failed") status = "failed";
  return {
    status,
    url: json.movie?.url ?? null,
    error: status === "failed" ? json.movie?.message ?? "Render failed" : null,
  };
}



/* ------------------------- Gemini ad visual generation ------------------------ */

const AI_IMAGES = "https://ai.gateway.lovable.dev/v1/images/generations";
const IMAGE_MODEL = "google/gemini-3-pro-image";

/**
 * Generates a single 9:16 ad frame with Gemini. When `refImage` is provided the
 * model edits/extends the brand's own product shot so the visual stays on-product.
 */
export async function generateAdVisual(
  prompt: string,
  refImage?: { base64: string; mime: string } | null,
): Promise<ArrayBuffer> {
  const apiKey = process.env.LOVABLE_API_KEY;
  if (!apiKey) throw new Error("LOVABLE_API_KEY missing on server");

  const content: Array<Record<string, unknown>> = [{ type: "text", text: prompt }];
  if (refImage) {
    content.push({
      type: "image_url",
      image_url: { url: `data:${refImage.mime};base64,${refImage.base64}` },
    });
  }

  let lastErr = "";
  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await fetch(AI_IMAGES, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: IMAGE_MODEL,
        messages: [{ role: "user", content }],
        modalities: ["image", "text"],
      }),
    });
    if (res.status === 429) {
      const wait = Number(res.headers.get("retry-after") ?? 0) || 2 ** attempt * 2;
      if (attempt < 2) {
        await new Promise((r) => setTimeout(r, wait * 1000));
        continue;
      }
      throw new Error("Image rate limit exceeded. Please retry shortly.");
    }
    if (res.status === 402) throw new Error("AI credits exhausted. Add credits to continue.");
    if (!res.ok) throw new Error(`Image gen ${res.status}: ${(await res.text()).slice(0, 300)}`);

    const json = (await res.json()) as {
      data?: Array<{ b64_json?: string }>;
      choices?: Array<{
        message?: { images?: Array<{ image_url?: { url?: string } }> };
      }>;
    };
    // /v1/images/generations returns data[].b64_json; keep the chat shape as fallback.
    const raw =
      json.data?.[0]?.b64_json ?? json.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    if (raw) {
      const b64 = raw.includes(";base64,") ? raw.split(";base64,")[1] : raw;
      const bytes = Buffer.from(b64, "base64");
      return bytes.buffer.slice(
        bytes.byteOffset,
        bytes.byteOffset + bytes.byteLength,
      ) as ArrayBuffer;
    }
    lastErr = "no image payload";
    await new Promise((r) => setTimeout(r, 1500));
  }
  throw new Error(`Gemini returned no image for the ad scene (${lastErr})`);
}

/** Downloads a media URL and returns base64 + mime for Gemini image editing. */
export async function fetchAsBase64(
  url: string,
): Promise<{ base64: string; mime: string } | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const mime = res.headers.get("content-type") ?? "image/png";
    if (!mime.startsWith("image/")) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    return { base64: buf.toString("base64"), mime };
  } catch {
    return null;
  }
}

/* --------------------- Veo ad video-clip generation (UGC) -------------------- */

const AI_VIDEOS = "https://ai.gateway.lovable.dev/v1/videos";

export type VeoJobState = {
  status: "queued" | "in_progress" | "completed" | "failed" | string;
  progress: number;
  error: string | null;
};

/**
 * Starts one live-action ad clip (vertical 720x1280, 8s, audio muted at render).
 * Returns null when the gateway is rate limited / already busy so the caller can
 * simply try again on its next poll instead of failing the run.
 */
export async function startAdVideoJob(opts: {
  prompt: string;
  seconds?: "4" | "6" | "8";
  premium?: boolean;
  ref?: { base64: string; mime: string } | null;
}): Promise<string | null> {
  const apiKey = process.env.LOVABLE_API_KEY;
  if (!apiKey) throw new Error("LOVABLE_API_KEY missing on server");

  const body: Record<string, unknown> = {
    model: opts.premium ? "google/veo-3.1-fast" : "google/veo-3.1-lite",
    prompt: opts.prompt,
    seconds: opts.seconds ?? "8",
    size: "720x1280",
  };
  if (opts.ref) {
    body.input_reference = `data:${opts.ref.mime};base64,${opts.ref.base64}`;
  }

  const res = await fetch(AI_VIDEOS, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify(body),
  });
  if (res.status === 429) return null; // busy / rate limited — retry on next poll
  if (res.status === 402) {
    const j = (await res.json().catch(() => null)) as { message?: string } | null;
    throw new Error(j?.message ?? "AI credits exhausted. Add credits to continue.");
  }
  if (!res.ok) {
    throw new Error(`Video gen ${res.status}: ${(await res.text()).slice(0, 300)}`);
  }
  const job = (await res.json()) as { id?: string };
  if (!job.id) throw new Error("Video generation returned no job id");
  return job.id;
}

export async function getAdVideoJob(id: string): Promise<VeoJobState> {
  const apiKey = process.env.LOVABLE_API_KEY;
  if (!apiKey) throw new Error("LOVABLE_API_KEY missing on server");
  const res = await fetch(`${AI_VIDEOS}/${encodeURIComponent(id)}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  if (!res.ok) {
    // Treat an unreadable job as failed so the caller can restart that shot.
    return { status: "failed", progress: 0, error: `status ${res.status}` };
  }
  const job = (await res.json()) as {
    status?: string;
    progress?: number;
    error?: { message?: string } | null;
  };
  return {
    status: job.status ?? "in_progress",
    progress: job.progress ?? 0,
    error: job.error?.message ?? null,
  };
}

/** Downloads the finished MP4 (the gateway URL is short-lived, so store it). */
export async function downloadAdVideoClip(id: string): Promise<ArrayBuffer> {
  const apiKey = process.env.LOVABLE_API_KEY;
  if (!apiKey) throw new Error("LOVABLE_API_KEY missing on server");
  const res = await fetch(`${AI_VIDEOS}/${encodeURIComponent(id)}/content`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  if (!res.ok) throw new Error(`Video download ${res.status}`);
  return await res.arrayBuffer();
}
