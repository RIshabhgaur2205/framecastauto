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

function buildJ2VPayload(opts: {
  voiceoverUrl: string;
  srtUrl: string | null;
  clips: StockClip[];
  referenceMedia?: ReferenceMedia[];
  duration: number;
  captionStyle: CaptionStyle;
  burnCaptions: boolean;
}) {
  const { voiceoverUrl, srtUrl, clips, referenceMedia = [], duration, captionStyle, burnCaptions } = opts;
  if (duration <= 0) throw new Error("Cannot render: duration is 0");
  if (!clips.length && !referenceMedia.length) throw new Error("Cannot render: no clips");

  // Allocate ~25-40% of the timeline to product reference media (capped at 4s/each),
  // and the rest to stock B-roll. References open the video (hero shot) and reappear later.
  const refCount = referenceMedia.length;
  const stockCount = clips.length;
  const refDuration = refCount
    ? Math.min(4, Math.max(2.5, (duration * 0.35) / refCount))
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
        "fit-mode": "cover",
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
        "fit-mode": "cover",
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
    globalElements.push({
      type: "subtitles",
      captions: srtUrl,
      settings: captionStyleConfig(captionStyle),
    });
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
}): Promise<string> {
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


