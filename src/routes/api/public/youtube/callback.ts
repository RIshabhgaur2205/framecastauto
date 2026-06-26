import { createFileRoute, redirect } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";

export const Route = createFileRoute("/api/public/youtube/callback")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const code = url.searchParams.get("code");
        const stateRaw = url.searchParams.get("state");
        const error = url.searchParams.get("error");
        const origin = `${url.protocol}//${url.host}`;

        const bounce = (qs: Record<string, string>) => {
          const target = new URL("/dashboard/channels", origin);
          for (const [k, v] of Object.entries(qs)) target.searchParams.set(k, v);
          return Response.redirect(target.toString(), 302);
        };

        if (error) return bounce({ yt_error: error });
        if (!code || !stateRaw) return bounce({ yt_error: "missing_params" });

        try {
          const { decryptToken, encryptToken } = await import("@/lib/crypto.server");
          const decoded = JSON.parse(decryptToken(stateRaw)) as { u: string; e: number };
          if (!decoded.u || Date.now() > decoded.e) {
            return bounce({ yt_error: "state_expired" });
          }

          const { exchangeCodeForTokens, fetchMyChannel } = await import(
            "@/lib/youtube.server"
          );
          const tokens = await exchangeCodeForTokens(code, origin);
          if (!tokens.refresh_token) {
            return bounce({ yt_error: "no_refresh_token" });
          }
          const channel = await fetchMyChannel(tokens.access_token);

          const supabase = createClient(
            process.env.SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!,
            { auth: { persistSession: false, autoRefreshToken: false } },
          );

          const { error: upErr } = await supabase
            .from("channels")
            .upsert(
              {
                user_id: decoded.u,
                provider: "youtube",
                channel_id: channel.id,
                external_id: channel.id,
                channel_name: channel.title,
                name: channel.title,
                thumbnail_url: channel.thumbnail,
                status: "connected",
                connected_at: new Date().toISOString(),
                oauth_refresh_token: encryptToken(tokens.refresh_token),
                oauth_access_token: tokens.access_token,
                oauth_expires_at: new Date(
                  Date.now() + (tokens.expires_in - 60) * 1000,
                ).toISOString(),
                oauth_scope: tokens.scope,
              },
              { onConflict: "user_id,channel_id" },
            );
          if (upErr) return bounce({ yt_error: upErr.message.slice(0, 80) });

          return bounce({
            yt_connected: channel.title,
            yt_channel_id: channel.id,
            yt_scope: tokens.scope ?? "",
          });
        } catch (e) {
          const msg = e instanceof Error ? e.message : "callback_failed";
          return bounce({ yt_error: msg.slice(0, 120) });
        }
      },
    },
  },
  component: () => null,
  loader: () => {
    throw redirect({ to: "/dashboard/channels" });
  },
});
