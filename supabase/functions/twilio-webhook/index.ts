import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

// Twilio calls this for (a) delivery status updates and (b) inbound texts.
// Every request is checked against Twilio's signature before anything is written.

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const twiml = (body = "") =>
  new Response(`<?xml version="1.0" encoding="UTF-8"?><Response>${body}</Response>`, { headers: { "Content-Type": "text/xml" } });

async function validSignature(authToken: string, url: string, params: URLSearchParams, signature: string | null) {
  if (!signature) return false;
  const keys = [...params.keys()].sort();
  const data = url + keys.map((k) => k + params.get(k)).join("");
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(authToken), { name: "HMAC", hash: "SHA-1" }, false, ["sign"]);
  const mac = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(data));
  const expected = btoa(String.fromCharCode(...new Uint8Array(mac)));
  return expected === signature;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("POST only", { status: 405 });
  const admin = createClient(SUPABASE_URL, SERVICE_KEY);
  const { data: secrets } = await admin.rpc("internal_secrets");
  if (!secrets) return new Response("Secrets unavailable", { status: 500 });

  const params = new URLSearchParams(await req.text());
  // Twilio signs the public URL it was configured with (https, no port).
  const url = `${SUPABASE_URL}/functions/v1/twilio-webhook`;
  if (!(await validSignature(secrets.twilio_auth_token, url, params, req.headers.get("x-twilio-signature")))) {
    return new Response("Bad signature", { status: 403 });
  }

  const sid = params.get("MessageSid") || params.get("SmsSid");
  const status = params.get("MessageStatus") || params.get("SmsStatus");
  const from = params.get("From");
  const body = (params.get("Body") || "").trim();

  // (a) Delivery status for a message we sent
  if (status && ["queued", "sent", "delivered", "failed", "undelivered"].includes(status) && from === secrets.twilio_from) {
    const mapped = status === "undelivered" ? "failed" : status;
    await admin.from("messages").update({ status: mapped, error: params.get("ErrorMessage") ?? null }).eq("provider_id", sid);
    return twiml();
  }

  // (b) Inbound text from a guest
  if (from && status === "received") {
    const { data: guestId } = await admin.rpc("guest_by_phone", { p: from });
    await admin.from("messages").insert({ guest_id: guestId ?? null, direction: "inbound", body: body || "(empty)", status: "received", provider_id: sid });
    if (guestId) {
      await admin.from("activity").insert({ guest_id: guestId, actor: "guest", event: `Texted: ${body.slice(0, 80)}` });

      // A plain YES / NO from a party of one is a complete reply.
      const { data: g } = await admin.from("guests").select("id, first_name, sub_guests(id)").eq("id", guestId).single();
      const word = body.toLowerCase().replace(/[^a-z]/g, "");
      const isYes = ["yes", "y", "attending", "coming"].includes(word);
      const isNo = ["no", "n", "cant", "cannot", "decline"].includes(word);
      if (g && g.sub_guests.length === 0 && (isYes || isNo)) {
        await admin.from("guests").update({ attending: isYes, responded_at: new Date().toISOString() }).eq("id", guestId);
        await admin.from("activity").insert({ guest_id: guestId, actor: "system", event: `Reply recorded from text: ${isYes ? "attending" : "not attending"}` });
        const reply = isYes
          ? `Thank you ${g.first_name}! We have you down as attending. See you Dec 27 at 6 pm.`
          : `Thank you for letting us know, ${g.first_name}. We'll miss you.`;
        await admin.from("messages").insert({ guest_id: guestId, direction: "outbound", body: reply, status: "sent", template: "auto_reply" });
        return twiml(`<Message>${reply.replace(/&/g, "&amp;").replace(/</g, "&lt;")}</Message>`);
      }
    }
    return twiml();
  }

  return twiml();
});
