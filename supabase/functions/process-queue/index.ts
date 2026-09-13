import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

// Sends queued texts through Twilio. Runs every minute from pg_cron and right
// after small sends. Claims up to `limit` rows atomically, sends a few at a
// time, and records the outcome on each row.

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const CONCURRENCY = 4;

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("POST only", { status: 405 });
  const admin = createClient(SUPABASE_URL, SERVICE_KEY);
  const { data: secrets } = await admin.rpc("internal_secrets");
  if (!secrets) return new Response("Secrets unavailable", { status: 500 });
  if (req.headers.get("x-internal-secret") !== secrets.internal_secret) return new Response("Forbidden", { status: 403 });

  const { limit = 100 } = await req.json().catch(() => ({}));
  const { data: batch, error } = await admin.rpc("claim_queued_messages", { n: Math.min(Number(limit) || 100, 100) });
  if (error) return new Response(error.message, { status: 500 });
  if (!batch?.length) return Response.json({ sent: 0, failed: 0 });

  const guestIds = [...new Set(batch.map((m: { guest_id: string }) => m.guest_id))];
  const { data: guests } = await admin.from("guests").select("id, phone").in("id", guestIds);
  const phone = new Map((guests ?? []).map((g: { id: string; phone: string }) => [g.id, g.phone]));

  const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${secrets.twilio_account_sid}/Messages.json`;
  const basic = "Basic " + btoa(`${secrets.twilio_account_sid}:${secrets.twilio_auth_token}`);
  const statusCallback = `${SUPABASE_URL}/functions/v1/twilio-webhook`;

  let sent = 0, failed = 0;
  const sendOne = async (m: { id: string; guest_id: string; body: string; template: string | null; media_url: string | null }) => {
    const to = phone.get(m.guest_id);
    let status = "sent", provider_id: string | null = null, err: string | null = null;
    if (!to) { status = "failed"; err = "No phone"; }
    else {
      try {
        const form = new URLSearchParams({ To: to, From: secrets.twilio_from, Body: m.body, StatusCallback: statusCallback });
        if (m.media_url) form.set("MediaUrl", m.media_url); // MMS: image shows above the text
        const res = await fetch(twilioUrl, { method: "POST", headers: { Authorization: basic, "Content-Type": "application/x-www-form-urlencoded" }, body: form });
        const out = await res.json();
        if (!res.ok) { status = "failed"; err = out.message ?? `Twilio ${res.status}`; }
        else provider_id = out.sid;
      } catch (e) { status = "failed"; err = String(e); }
    }
    await admin.from("messages").update({ status, provider_id, error: err }).eq("id", m.id);
    await admin.from("activity").insert({ guest_id: m.guest_id, actor: "system", event: status === "sent" ? `Text sent${m.template ? ` (${m.template})` : ""}` : `Text failed: ${err}` });
    if (status === "sent") sent++; else failed++;
  };

  // A few at a time keeps well under Twilio's per-second limit.
  for (let i = 0; i < batch.length; i += CONCURRENCY) {
    await Promise.all(batch.slice(i, i + CONCURRENCY).map(sendOne));
  }

  return Response.json({ sent, failed, remaining_hint: batch.length === limit ? "more may be queued" : "drained" });
});
