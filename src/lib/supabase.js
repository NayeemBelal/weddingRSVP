import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_KEY;

export const configured = Boolean(url && key);

if (!configured) {
  // Don't crash the whole site. Home and FAQ still render; RSVP and admin show a clear message.
  console.error(
    "[supabase] VITE_SUPABASE_URL / VITE_SUPABASE_KEY are not set. Add them in Netlify → Site configuration → Environment variables, then redeploy."
  );
}

export const supabase = createClient(url || "https://not-configured.invalid", key || "not-configured", {
  auth: { persistSession: true, autoRefreshToken: true },
});
