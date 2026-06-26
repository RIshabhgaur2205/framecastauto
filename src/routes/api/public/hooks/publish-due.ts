// Cron-invoked: publish any "ready" videos whose scheduled_for has passed.
import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";

export const Route = createFileRoute("/api/public/hooks/publish-due")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const auth = request.headers.get("apikey") || request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
        if (!auth || auth !== process.env.SUPABASE_PUBLISHABLE_KEY) {
          return new Response(JSON.stringify({ error: "unauthorized" }), {
            status: 401,
            headers: { "Content-Type": "application/json" },
          });
        }

        const supabase = createClient(
          process.env.SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!,
          { auth: { persistSession: false, autoRefreshToken: false } },
        );

        const nowIso = new Date().toISOString();
        const { data: due, error } = await supabase
          .from("videos")
          .select("id, user_id")
          .eq("status", "ready")
          .lte("scheduled_for", nowIso)
          .not("channel_id", "is", null)
          .limit(10);
        if (error) {
          return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }

        const { runPublishForVideo } = await import("@/lib/publish.server");
        const results: Array<{ id: string; ok: boolean; error?: string }> = [];
        for (const v of due ?? []) {
          try {
            await runPublishForVideo(v.id, v.user_id);
            results.push({ id: v.id, ok: true });
          } catch (e) {
            results.push({
              id: v.id,
              ok: false,
              error: e instanceof Error ? e.message : "unknown",
            });
          }
        }

        return new Response(
          JSON.stringify({ checked: due?.length ?? 0, results }),
          { headers: { "Content-Type": "application/json" } },
        );
      },
    },
  },
});
