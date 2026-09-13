import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

// Queues one text per guest. Called by the admin (user JWT) or by the database
// after a guest replies (X-Internal-Secret). The process-queue function does
// the actual sending, 100 per minute, so 600 at once is fine.
//
// Body: { guest_ids: string[], template?: string, body?: string, media_url?: string }

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-internal-secret",
};
const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { ...cors, "Content-Type": "application/json" } });

function render(tpl: string, vars: Record<string, string>) {
  return tpl.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, k) => vars[k] ?? "");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);

  const admin = createClient(SUPABASE_URL, SERVICE_KEY);
  const { data: secrets, error: secErr } = await admin.rpc("internal_secrets");
  if (secErr || !secrets) return json({ error: "Secrets unavailable" }, 500);

  // ── Auth: internal secret (from the database) or a signed-in admin ──
  let actor = "system";
  const internal = req.headers.get("x-internal-secret");
  if (internal) {
    if (internal !== secrets.internal_secret) return json({ error: "Forbidden" }, 403);
  } else {
    const auth = req.headers.get("authorization") || "";
    const userClient = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: auth } } });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return json({ error: "Sign in required" }, 401);
    actor = user.email ?? "admin";
  }

  const { guest_ids, template, body, media_url } = await req.json().catch(() => ({}));
  if (!Array.isArray(guest_ids) || guest_ids.length === 0) return json({ error: "guest_ids required" }, 400);
  if (!template && !body) return json({ error: "template or body required" }, 400);

  let tplBody = body as string | undefined;
  let media = (media_url as string | undefined) || null;
  if (template) {
    const { data: t } = await admin.from("message_templates").select("body, media_url").eq("key", template).single();
    if (!t) return json({ error: `No template '${template}'` }, 400);
    tplBody = t.body;
    if (!media) media = t.media_url ?? null;
  }

  const { data: guests } = await admin
    .from("guests")
    .select("id, first_name, last_name, phone, attending, invite_code, sub_guests(attending)")
    .in("id", guest_ids);

  const rows = [];
  const skipped: string[] = [];
  for (const g of guests ?? []) {
    if (!g.phone) { skipped.push(g.id); continue; }
    const attending_count = (g.attending ? 1 : 0) + (g.sub_guests ?? []).filter((s: { attending: boolean | null }) => s.attending).length;
    rows.push({
      guest_id: g.id,
      direction: "outbound",
      status: "queued",
      template: template ?? null,
      media_url: media,
      body: render(tplBody!, {
        first_name: g.first_name,
        last_name: g.last_name,
        rsvp_link: `${secrets.site_url}/rsvp?c=${g.invite_code}`,
        attending_count: String(attending_count),
      }),
    });
  }

  if (rows.length) {
    const { error } = await admin.from("messages").insert(rows);
    if (error) return json({ error: error.message }, 500);
    await admin.from("activity").insert(rows.map((r) => ({ guest_id: r.guest_id, actor, event: `Text queued${template ? ` (${template})` : ""}` })));
  }

  // Small sends go out right away instead of waiting for the next minute tick.
  if (rows.length > 0 && rows.length <= 25) {
    fetch(`${SUPABASE_URL}/functions/v1/process-queue`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Internal-Secret": secrets.internal_secret },
      body: JSON.stringify({ limit: 25 }),
    }).catch(() => {});
  }

  return json({ queued: rows.length, skipped });
});
