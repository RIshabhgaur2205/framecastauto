// Server-only YouTube + Google OAuth helpers. Dynamic-import only.
import { decryptToken, encryptToken } from "./crypto.server";

const SCOPES = [
  "https://www.googleapis.com/auth/youtube.upload",
  "https://www.googleapis.com/auth/youtube.readonly",
  "https://www.googleapis.com/auth/youtube.force-ssl",
  "openid",
  "email",
  "profile",
].join(" ");

export function getRedirectUri(origin: string): string {
  return `${origin.replace(/\/$/, "")}/api/public/youtube/callback`;
}

export function buildAuthUrl(origin: string, state: string): string {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  if (!clientId) throw new Error("GOOGLE_OAUTH_CLIENT_ID missing");
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: getRedirectUri(origin),
    response_type: "code",
    scope: SCOPES,
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: "true",
    state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

type TokenResp = {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  scope: string;
  token_type: string;
};

export async function exchangeCodeForTokens(
  code: string,
  origin: string,
): Promise<TokenResp> {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID!;
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET!;
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: getRedirectUri(origin),
      grant_type: "authorization_code",
    }),
  });
  if (!res.ok) throw new Error(`Google token ${res.status}: ${(await res.text()).slice(0, 300)}`);
  return (await res.json()) as TokenResp;
}

export async function refreshAccessToken(encryptedRefresh: string): Promise<{
  access_token: string;
  expires_in: number;
}> {
  const refresh = decryptToken(encryptedRefresh);
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID!;
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET!;
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refresh,
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) throw new Error(`Google refresh ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return (await res.json()) as { access_token: string; expires_in: number };
}

export async function fetchMyChannel(accessToken: string): Promise<{
  id: string;
  title: string;
  thumbnail: string | null;
}> {
  const res = await fetch(
    "https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true",
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
  if (!res.ok) throw new Error(`YouTube channels ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const j = (await res.json()) as {
    items?: Array<{
      id: string;
      snippet: { title: string; thumbnails?: { default?: { url?: string } } };
    }>;
  };
  const c = j.items?.[0];
  if (!c) throw new Error("No YouTube channel on this Google account");
  return {
    id: c.id,
    title: c.snippet.title,
    thumbnail: c.snippet.thumbnails?.default?.url ?? null,
  };
}

/** Resumable upload of an MP4 fetched from a URL. */
export async function uploadVideoToYoutube(args: {
  accessToken: string;
  videoUrl: string;
  title: string;
  description: string;
  tags?: string[];
  privacyStatus?: "private" | "unlisted" | "public";
}): Promise<string> {
  const metadata = {
    snippet: {
      title: args.title.slice(0, 100),
      description: args.description.slice(0, 4900),
      tags: args.tags?.slice(0, 10) ?? [],
      categoryId: "22",
    },
    status: {
      privacyStatus: args.privacyStatus ?? "private",
      selfDeclaredMadeForKids: false,
    },
  };

  // 1) Fetch the rendered MP4 to determine size and stream bytes.
  const vidRes = await fetch(args.videoUrl);
  if (!vidRes.ok) throw new Error(`Fetch render ${vidRes.status}`);
  const videoBuf = await vidRes.arrayBuffer();
  const size = videoBuf.byteLength;

  // 2) Initiate resumable upload.
  const initRes = await fetch(
    "https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${args.accessToken}`,
        "Content-Type": "application/json; charset=UTF-8",
        "X-Upload-Content-Length": String(size),
        "X-Upload-Content-Type": "video/mp4",
      },
      body: JSON.stringify(metadata),
    },
  );
  if (!initRes.ok)
    throw new Error(`YT init ${initRes.status}: ${(await initRes.text()).slice(0, 300)}`);
  const uploadUrl = initRes.headers.get("location");
  if (!uploadUrl) throw new Error("No upload location from YouTube");

  // 3) PUT bytes in a single request (Shorts are tiny).
  const putRes = await fetch(uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": "video/mp4", "Content-Length": String(size) },
    body: videoBuf,
  });
  if (!putRes.ok)
    throw new Error(`YT upload ${putRes.status}: ${(await putRes.text()).slice(0, 300)}`);
  const j = (await putRes.json()) as { id?: string };
  if (!j.id) throw new Error("YouTube returned no video id");
  return j.id;
}

/** Upload SRT as a native YouTube caption track. */
export async function uploadCaptionTrack(args: {
  accessToken: string;
  youtubeVideoId: string;
  srt: string;
  language?: string;
  name?: string;
}): Promise<void> {
  const metadata = {
    snippet: {
      videoId: args.youtubeVideoId,
      language: args.language ?? "en",
      name: args.name ?? "English",
      isDraft: false,
    },
  };
  const boundary = `framecast_${Date.now()}`;
  const body =
    `--${boundary}\r\n` +
    `Content-Type: application/json; charset=UTF-8\r\n\r\n` +
    `${JSON.stringify(metadata)}\r\n` +
    `--${boundary}\r\n` +
    `Content-Type: application/octet-stream\r\n\r\n` +
    `${args.srt}\r\n` +
    `--${boundary}--`;
  const res = await fetch(
    "https://www.googleapis.com/upload/youtube/v3/captions?part=snippet&sync=false",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${args.accessToken}`,
        "Content-Type": `multipart/related; boundary=${boundary}`,
      },
      body,
    },
  );
  if (!res.ok) {
    // Don't fail the whole publish if captions fail.
    console.warn(`Caption upload ${res.status}: ${(await res.text()).slice(0, 200)}`);
  }
}

export { encryptToken };
