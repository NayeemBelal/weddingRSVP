import { useEffect, useState } from "react";
import { fetchSettings, saveSetting } from "./api.js";

export default function Settings() {
  const [s, setS] = useState(null);
  const [saved, setSaved] = useState("");

  useEffect(() => {
    fetchSettings().then(setS);
  }, []);

  const update = async (key, value) => {
    setS({ ...s, [key]: value });
    await saveSetting(key, value);
    setSaved(key);
    setTimeout(() => setSaved(""), 1500);
  };

  if (!s) return <p className="adm-muted">Loading…</p>;

  return (
    <section className="adm-page adm-narrow">
      <div className="adm-page-head">
        <h1>Settings</h1>
      </div>

      <div className="adm-card">
        <label className="adm-field adm-field-row">
          <div>
            <span>RSVPs open</span>
            <small>When off, the RSVP page shows "RSVPs have closed" and asks guests to text you. You can still edit replies here.</small>
          </div>
          <input
            type="checkbox"
            className="adm-switch"
            checked={s.rsvp_closed !== "true"}
            onChange={(e) => update("rsvp_closed", e.target.checked ? "false" : "true")}
          />
        </label>
      </div>

      <div className="adm-card">
        <label className="adm-field">
          <span>Reply-by date shown on the site</span>
          <input
            value={s.rsvp_deadline || ""}
            onChange={(e) => setS({ ...s, rsvp_deadline: e.target.value })}
            onBlur={(e) => update("rsvp_deadline", e.target.value)}
          />
          <small>Free text, e.g. "November 27, 2026". {saved === "rsvp_deadline" && "Saved."}</small>
        </label>
        <label className="adm-field">
          <span>Contact number shown on the site</span>
          <input
            value={s.contact_phone || ""}
            placeholder="(000) 000-0000"
            onChange={(e) => setS({ ...s, contact_phone: e.target.value })}
            onBlur={(e) => update("contact_phone", e.target.value)}
          />
          <small>Your Twilio toll-free number once it's set up. {saved === "contact_phone" && "Saved."}</small>
        </label>
      </div>

      <div className="adm-card">
        <h2>Accounts</h2>
        <p className="adm-muted">
          Sign-in accounts are managed in Supabase under Authentication → Users. Add a second
          account there if Faatimah wants her own login.
        </p>
      </div>
    </section>
  );
}
