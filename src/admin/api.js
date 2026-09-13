import { supabase } from "../lib/supabase.js";

// ── Phone helpers (US only) ──────────────────────────────────────────
export function toE164(value) {
  const d = (value || "").replace(/\D/g, "");
  if (d.length === 10) return `+1${d}`;
  if (d.length === 11 && d.startsWith("1")) return `+${d}`;
  return null;
}
export function prettyPhone(e164) {
  if (!e164) return "";
  const d = e164.replace(/\D/g, "").replace(/^1/, "");
  if (d.length !== 10) return e164;
  return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
}

// ── Status derived from rows ────────────────────────────────────────
export function partyStatus(g) {
  if (!g.responded_at) return "pending";
  const anyYes = g.attending === true || (g.sub_guests || []).some((s) => s.attending === true);
  return anyYes ? "attending" : "declined";
}
export function partySize(g) {
  return 1 + (g.sub_guests || []).length;
}
export function attendingCount(g) {
  return (g.attending ? 1 : 0) + (g.sub_guests || []).filter((s) => s.attending).length;
}
export function fullName(p) {
  return `${p.first_name} ${p.last_name}`.trim();
}

// ── Reads ───────────────────────────────────────────────────────────
export async function fetchGuests() {
  const { data, error } = await supabase
    .from("guests")
    .select("*, sub_guests(*), notes(id, body, created_at)")
    .order("last_name")
    .order("first_name");
  if (error) throw error;
  return data.map((g) => ({
    ...g,
    sub_guests: [...(g.sub_guests || [])].sort((a, b) => a.sort_order - b.sort_order),
    notes: [...(g.notes || [])].sort((a, b) => (a.created_at < b.created_at ? 1 : -1)),
  }));
}

export async function fetchGuest(id) {
  const { data, error } = await supabase
    .from("guests")
    .select("*, sub_guests(*), notes(*), messages(*), activity(*)")
    .eq("id", id)
    .single();
  if (error) throw error;
  data.sub_guests.sort((a, b) => a.sort_order - b.sort_order);
  data.notes.sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
  data.messages.sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
  data.activity.sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
  return data;
}

export async function fetchNotes() {
  const { data, error } = await supabase
    .from("notes")
    .select("id, body, created_at, guest:guests(id, first_name, last_name)")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

export async function fetchSettings() {
  const { data, error } = await supabase.from("settings").select("*");
  if (error) throw error;
  return Object.fromEntries(data.map((r) => [r.key, r.value]));
}

export async function fetchTemplates() {
  const { data, error } = await supabase.from("message_templates").select("*").order("key");
  if (error) throw error;
  return data;
}

export async function fetchMessages() {
  const { data, error } = await supabase
    .from("messages")
    .select("*, guest:guests(id, first_name, last_name)")
    .order("created_at", { ascending: false })
    .limit(300);
  if (error) throw error;
  return data;
}

// ── Writes ──────────────────────────────────────────────────────────
async function actor() {
  const { data } = await supabase.auth.getUser();
  return data?.user?.email || "admin";
}
async function log(guest_id, event) {
  await supabase.from("activity").insert({ guest_id, actor: await actor(), event });
}

/** Create or update a guest and replace its sub-guest list. */
export async function saveGuest({ id, first_name, last_name, phone, side, group_label, sub_guests }) {
  const row = {
    first_name: first_name.trim(),
    last_name: (last_name || "").trim(),
    phone: phone ? toE164(phone) : null,
    side: side || null,
    group_label: group_label?.trim() || null,
  };
  if (phone && !row.phone) throw new Error("Phone number must be a 10-digit US number.");

  let guestId = id;
  if (id) {
    const { error } = await supabase.from("guests").update(row).eq("id", id);
    if (error) throw friendly(error);
    await log(id, "Details updated");
  } else {
    const { data, error } = await supabase.from("guests").insert(row).select("id").single();
    if (error) throw friendly(error);
    guestId = data.id;
    await log(guestId, "Added to guest list");
  }

  // Sub-guests: upsert the ones with ids, insert new, delete removed.
  const { data: existing } = await supabase.from("sub_guests").select("id").eq("guest_id", guestId);
  const keep = new Set(sub_guests.filter((s) => s.id).map((s) => s.id));
  const toDelete = (existing || []).filter((s) => !keep.has(s.id)).map((s) => s.id);
  if (toDelete.length) await supabase.from("sub_guests").delete().in("id", toDelete);

  const rows = sub_guests
    .filter((s) => s.first_name.trim())
    .map((s, i) => ({
      ...(s.id ? { id: s.id } : {}),
      guest_id: guestId,
      first_name: s.first_name.trim(),
      last_name: (s.last_name || "").trim(),
      attending: s.attending ?? null,
      sort_order: i + 1,
    }));
  if (rows.length) {
    const { error } = await supabase.from("sub_guests").upsert(rows);
    if (error) throw friendly(error);
  }
  return guestId;
}

/** Record a reply on the party's behalf (phone call, text, in person). */
export async function setAttendance(guestId, responses) {
  for (const r of responses) {
    if (r.kind === "guest") await supabase.from("guests").update({ attending: r.attending }).eq("id", r.id);
    else await supabase.from("sub_guests").update({ attending: r.attending }).eq("id", r.id);
  }
  const anyAnswered = responses.some((r) => r.attending !== null);
  await supabase
    .from("guests")
    .update({ responded_at: anyAnswered ? new Date().toISOString() : null })
    .eq("id", guestId);
  const yes = responses.filter((r) => r.attending).length;
  await log(guestId, anyAnswered ? `Reply recorded by admin: ${yes} attending` : "Reply cleared by admin");
}

export async function deleteGuest(id) {
  const { error } = await supabase.from("guests").delete().eq("id", id);
  if (error) throw friendly(error);
}

export async function saveSetting(key, value) {
  const { error } = await supabase.from("settings").upsert({ key, value, updated_at: new Date().toISOString() });
  if (error) throw friendly(error);
}

export async function saveTemplate(key, body, media_url = null) {
  const { error } = await supabase
    .from("message_templates")
    .update({ body, media_url, updated_at: new Date().toISOString() })
    .eq("key", key);
  if (error) throw friendly(error);
}

/** Upload an image for MMS and return its public URL. */
export async function uploadImage(file) {
  if (!/^image\/(jpeg|png|gif|webp)$/.test(file.type)) throw new Error("Use a JPG, PNG, GIF or WebP image.");
  if (file.size > 5 * 1024 * 1024) throw new Error("Image must be under 5 MB.");
  const ext = file.name.split(".").pop().toLowerCase();
  const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await supabase.storage.from("media").upload(path, file, { contentType: file.type });
  if (error) throw new Error(error.message);
  return supabase.storage.from("media").getPublicUrl(path).data.publicUrl;
}

// ── CSV ─────────────────────────────────────────────────────────────
/** Columns: First, Last, Phone, Side, Group, Sub-guests (semicolon separated "First Last"). */
export function parseCsv(text) {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (!lines.length) return [];
  const cells = (line) => {
    const out = [];
    let cur = "", q = false;
    for (const ch of line) {
      if (ch === '"') q = !q;
      else if (ch === "," && !q) { out.push(cur); cur = ""; }
      else cur += ch;
    }
    out.push(cur);
    return out.map((c) => c.trim());
  };
  const header = cells(lines[0]).map((h) => h.toLowerCase());
  const col = (names) => header.findIndex((h) => names.some((n) => h.startsWith(n)));
  const iFirst = col(["first"]), iLast = col(["last"]), iPhone = col(["phone"]);
  const iSide = col(["side"]), iGroup = col(["group"]), iSubs = col(["sub", "guests", "party", "plus"]);
  const start = iFirst >= 0 ? 1 : 0; // no header: assume First, Last, Phone, Subs
  return lines.slice(start).map((line) => {
    const c = cells(line);
    const pick = (i, fallback) => (i >= 0 ? c[i] : c[fallback]) || "";
    const subs = pick(iSubs, 3)
      .split(/;|\|/)
      .map((s) => s.trim())
      .filter(Boolean)
      .map((s) => {
        const [first_name, ...rest] = s.split(/\s+/);
        return { first_name, last_name: rest.join(" ") };
      });
    return {
      first_name: pick(iFirst, 0),
      last_name: pick(iLast, 1),
      phone: pick(iPhone, 2),
      side: pick(iSide, -1).toLowerCase() || null,
      group_label: pick(iGroup, -1) || null,
      sub_guests: subs,
    };
  }).filter((r) => r.first_name);
}

export function toCsv(guests) {
  const esc = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const head = ["First", "Last", "Phone", "Side", "Group", "Status", "Attending", "Party size", "Replied", "Sub-guests", "Notes"];
  const rows = guests.map((g) => [
    g.first_name, g.last_name, prettyPhone(g.phone), g.side || "", g.group_label || "",
    partyStatus(g), attendingCount(g), partySize(g),
    g.responded_at ? new Date(g.responded_at).toLocaleDateString() : "",
    g.sub_guests.map((s) => `${fullName(s)}${s.attending === true ? " (yes)" : s.attending === false ? " (no)" : ""}`).join("; "),
    g.notes.map((n) => n.body).join(" | "),
  ]);
  return [head, ...rows].map((r) => r.map(esc).join(",")).join("\n");
}

function friendly(error) {
  if (/duplicate key.*phone/i.test(error.message)) return new Error("That phone number is already on the list.");
  return new Error(error.message);
}

// ── Texting (Twilio via the send-sms edge function) ─────────────────
export async function sendSms({ guest_ids, template, body, media_url }) {
  const { data, error } = await supabase.functions.invoke("send-sms", {
    body: { guest_ids, template: template || undefined, body: body || undefined, media_url: media_url || undefined },
  });
  if (error) throw new Error(error.message || "Send failed");
  if (data?.error) throw new Error(data.error);
  return data; // { sent, results: [{guest_id, status, error}] }
}

export function renderTemplate(tpl, g, siteUrl = window.location.origin) {
  const vars = {
    first_name: g.first_name,
    last_name: g.last_name,
    rsvp_link: `${siteUrl}/rsvp?c=${g.invite_code}`,
    attending_count: String(attendingCount(g)),
  };
  return tpl.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, k) => vars[k] ?? "");
}
