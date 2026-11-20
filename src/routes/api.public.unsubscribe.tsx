import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";

/** One-click unsubscribe for mail apps (the List-Unsubscribe header in our emails). */
async function unsubscribeByToken(token: string | null) {
  if (!token || token.length !== 36) return false;
  const url = process.env["SUPABASE_URL"] || import.meta.env["VITE_SUPABASE_URL"];
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"] || import.meta.env["VITE_SUPABASE_PUBLISHABLE_KEY"];
  if (!url || !key) return false;
  const sb = createClient(url, key, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization");
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
  const { error } = await sb.rpc("unsubscribe", { p_token: token });
  return !error;
}

export const Route = createFileRoute("/api/public/unsubscribe")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const ok = await unsubscribeByToken(new URL(request.url).searchParams.get("token"));
        return new Response(ok ? "Unsubscribed" : "Invalid link", { status: ok ? 200 : 400 });
      },
      GET: async ({ request }) => {
        const token = new URL(request.url).searchParams.get("token") ?? "";
        return Response.redirect(new URL(`/unsubscribe?token=${encodeURIComponent(token)}`, request.url).toString(), 302);
      },
    },
  },
});
