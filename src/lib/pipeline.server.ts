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

export async function transcribeForCaptions(
  audio: ArrayBuffer,
): Promise<{ words: CaptionWord[]; duration: number }> {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) throw new Error("ELEVENLABS_API_KEY not configured");

  const form = new FormData();
  form.append("file", new Blob([audio], { type: "audio/mpeg" }), "voice.mp3");
  form.append("model_id", "scribe_v2");
  form.append("diarize", "false");
  form.append("tag_audio_events", "false");
  form.append("language_code", "eng");

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
    `https://api.pexels.com/videos/search?query=${encodeURIComponent(query)}&per_page=${count * 2}&orientation=portrait&size=medium`,
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
  for (const v of json.videos ?? []) {
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

/* -------------------------------- Shotstack ------------------------------- */

const SHOTSTACK_BASE = "https://api.shotstack.io/edit/stage";

type CaptionStyle = "bold" | "minimal" | "neon" | "subtle";

function captionFontConfig(style: CaptionStyle) {
  switch (style) {
    case "neon":
      return { color: "#A78BFA", size: 64, weight: 800 };
    case "minimal":
      return { color: "#FFFFFF", size: 48, weight: 500 };
    case "subtle":
      return { color: "#E5E7EB", size: 44, weight: 500 };
    case "bold":
    default:
      return { color: "#FFFFFF", size: 68, weight: 800 };
  }
}

function buildShotstackPayload(opts: {
  voiceoverUrl: string;
  srtUrl: string | null;
  clips: StockClip[];
  duration: number;
  captionStyle: CaptionStyle;
  burnCaptions: boolean;
}) {
  const { voiceoverUrl, srtUrl, clips, duration, captionStyle, burnCaptions } = opts;
  if (duration <= 0) throw new Error("Cannot render: duration is 0");
  if (!clips.length) throw new Error("Cannot render: no clips");

  const per = duration / clips.length;
  const videoClips = clips.map((c, i) => ({
    asset: { type: "video", src: c.url },
    start: +(i * per).toFixed(2),
    length: +per.toFixed(2),
    fit: "cover",
    scale: 1,
  }));

  const tracks: Array<{ clips: unknown[] }> = [
    { clips: videoClips },
    {
      clips: [
        {
          asset: { type: "audio", src: voiceoverUrl },
          start: 0,
          length: duration,
        },
      ],
    },
  ];

  if (burnCaptions && srtUrl) {
    const f = captionFontConfig(captionStyle);
    tracks.unshift({
      clips: [
        {
          asset: {
            type: "caption",
            src: srtUrl,
            font: { color: f.color, size: f.size, weight: f.weight, family: "Montserrat ExtraBold" },
            background: { color: "#000000", opacity: 0.35, padding: 18, borderRadius: 8 },
            stroke: { color: "#000000", width: 3 },
          },
          start: 0,
          length: duration,
        },
      ],
    });
  }

  return {
    timeline: {
      background: "#000000",
      tracks,
    },
    output: {
      format: "mp4",
      size: { width: VIDEO_WIDTH, height: VIDEO_HEIGHT },
      fps: 30,
    },
  };
}

export async function submitShotstackRender(opts: {
  voiceoverUrl: string;
  srtUrl: string | null;
  clips: StockClip[];
  duration: number;
  captionStyle: CaptionStyle;
  burnCaptions: boolean;
}): Promise<string> {
  const apiKey = process.env.SHOTSTACK_API_KEY;
  if (!apiKey) throw new Error("SHOTSTACK_API_KEY not configured");
  const payload = buildShotstackPayload(opts);
  const res = await fetch(`${SHOTSTACK_BASE}/render`, {
    method: "POST",
    headers: { "x-api-key": apiKey, "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw new Error(`Shotstack submit ${res.status}: ${(await res.text()).slice(0, 300)}`);
  }
  const json = (await res.json()) as { response?: { id?: string } };
  const id = json.response?.id;
  if (!id) throw new Error("Shotstack returned no render id");
  return id;
}

export async function getShotstackStatus(
  renderId: string,
): Promise<{ status: string; url: string | null; error: string | null }> {
  const apiKey = process.env.SHOTSTACK_API_KEY;
  if (!apiKey) throw new Error("SHOTSTACK_API_KEY not configured");
  const res = await fetch(`${SHOTSTACK_BASE}/render/${renderId}`, {
    headers: { "x-api-key": apiKey },
  });
  if (!res.ok) {
    throw new Error(`Shotstack status ${res.status}: ${(await res.text()).slice(0, 200)}`);
  }
  const json = (await res.json()) as {
    response?: { status?: string; url?: string; error?: string };
  };
  return {
    status: json.response?.status ?? "unknown",
    url: json.response?.url ?? null,
    error: json.response?.error ?? null,
  };
}


