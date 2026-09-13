import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import ImagePicker from "./ImagePicker.jsx";
import {
  fetchMessages, fetchTemplates, saveTemplate, fetchGuests, sendSms, renderTemplate,
  fullName, partyStatus, prettyPhone,
} from "./api.js";

const SITE = "https://faatimahandnayeem.com";
const AUDIENCES = [
  ["pending", "Haven't replied"],
  ["attending", "Attending"],
  ["declined", "Not coming"],
  ["all", "Everyone"],
];

export default function Messages() {
  const [templates, setTemplates] = useState(null);
  const [log, setLog] = useState(null);
  const [guests, setGuests] = useState(null);
  const [saved, setSaved] = useState("");

  // Compose state
  const [audience, setAudience] = useState("pending");
  const [tplKey, setTplKey] = useState("reminder");
  const [custom, setCustom] = useState("");
  const [useCustom, setUseCustom] = useState(false);
  const [customImage, setCustomImage] = useState(null);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState(null);

  const reload = async () => {
    const [t, l, g] = await Promise.all([fetchTemplates(), fetchMessages().catch(() => []), fetchGuests()]);
    setTemplates(t);
    setLog(l);
    setGuests(g);
  };
  useEffect(() => { reload(); }, []);

  const recipients = useMemo(() => {
    if (!guests) return [];
    return guests.filter((g) => g.phone && (audience === "all" || partyStatus(g) === audience));
  }, [guests, audience]);

  const activeTemplate = templates?.find((t) => t.key === tplKey);
  const bodyText = useCustom ? custom : activeTemplate?.body || "";
  const imageUrl = useCustom ? customImage : activeTemplate?.media_url || null;
  const preview = recipients[0] ? renderTemplate(bodyText, recipients[0], SITE) : bodyText;

  const queued = (log || []).filter((m) => m.status === "queued" || m.status === "sending").length;

  const send = async () => {
    if (!recipients.length || !bodyText.trim()) return;
    const ok = confirm(`Send this text to ${recipients.length} ${recipients.length === 1 ? "person" : "people"}?\n\n${preview}`);
    if (!ok) return;
    setSending(true);
    setResult(null);
    try {
      const r = await sendSms({
        guest_ids: recipients.map((g) => g.id),
        template: useCustom ? undefined : tplKey,
        body: useCustom ? custom : undefined,
        media_url: useCustom ? customImage : undefined,
      });
      setResult(
        r.queued <= 25
          ? `Sending ${r.queued} now.`
          : `Queued ${r.queued}. They go out at about 100 per minute, so allow ${Math.ceil(r.queued / 100)} min. Refresh the log to watch.`
      );
      await reload();
    } catch (err) {
      setResult(`Couldn't send: ${err.message}`);
    } finally {
      setSending(false);
    }
  };

  const save = async (t) => {
    await saveTemplate(t.key, t.body, t.media_url || null);
    setSaved(t.key);
    setTimeout(() => setSaved(""), 1500);
  };

  if (!templates || !log || !guests) return <p className="adm-muted">Loading…</p>;

  return (
    <section className="adm-page">
      <div className="adm-page-head">
        <h1>Messages</h1>
        <p className="adm-muted">Texts go out from (833) 605-8411. Replies land in the log and on each guest.</p>
      </div>

      <div className="adm-card adm-compose">
        <h2>Send a text</h2>
        <div className="adm-compose-grid">
          <label className="adm-field">
            <span>To</span>
            <select value={audience} onChange={(e) => setAudience(e.target.value)}>
              {AUDIENCES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
            </select>
            <small>{recipients.length} {recipients.length === 1 ? "person" : "people"} with a phone number</small>
          </label>
          <label className="adm-field">
            <span>Message</span>
            <select value={useCustom ? "__custom" : tplKey} onChange={(e) => { if (e.target.value === "__custom") setUseCustom(true); else { setUseCustom(false); setTplKey(e.target.value); } }}>
              {templates.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
              <option value="__custom">Write my own</option>
            </select>
          </label>
        </div>
        {useCustom && (
          <>
            <ImagePicker value={customImage} onChange={setCustomImage} />
            <label className="adm-field">
              <span>Text</span>
              <textarea rows={4} value={custom} onChange={(e) => setCustom(e.target.value)} placeholder="Hi {{first_name}}, …" />
            </label>
          </>
        )}
        <div className="adm-preview">
          <span>Preview{recipients[0] ? ` for ${fullName(recipients[0])}` : ""}</span>
          {imageUrl && <img className="adm-preview-img" src={imageUrl} alt="" />}
          <p>{preview || <em className="adm-muted">Nothing to send yet.</em>}</p>
        </div>
        <div className="adm-panel-actions">
          {result && <span className="adm-muted">{result}</span>}
          {!result && queued > 0 && <span className="adm-muted">{queued} still going out…</span>}
          <span className="adm-spacer" />
          <button className="adm-btn" onClick={reload} disabled={sending}>Refresh</button>
          <button className="adm-btn adm-btn-primary" onClick={send} disabled={sending || !recipients.length || !bodyText.trim()}>
            {sending ? "Queueing…" : `Send to ${recipients.length}`}
          </button>
        </div>
      </div>

      <div className="adm-two-col">
        <div>
          <h2>Templates</h2>
          <p className="adm-muted adm-small">
            Placeholders: <code>{"{{first_name}}"}</code>, <code>{"{{rsvp_link}}"}</code>,{" "}
            <code>{"{{attending_count}}"}</code>. The confirmation goes out automatically when someone replies on the site.
          </p>
          {templates.map((t, i) => (
            <div key={t.key} className="adm-card">
              <ImagePicker
                label={`${t.label} image`}
                value={t.media_url}
                onChange={(url) => {
                  const next = [...templates];
                  next[i] = { ...t, media_url: url };
                  setTemplates(next);
                }}
              />
              <label className="adm-field">
                <span>{t.label}</span>
                <textarea
                  rows={4}
                  value={t.body}
                  onChange={(e) => {
                    const next = [...templates];
                    next[i] = { ...t, body: e.target.value };
                    setTemplates(next);
                  }}
                />
                <small>
                  {t.body.length} characters, about {Math.ceil(t.body.length / 160)} SMS segment
                  {Math.ceil(t.body.length / 160) === 1 ? "" : "s"}. {saved === t.key && "Saved."}
                </small>
              </label>
              <button className="adm-btn" onClick={() => save(templates[i])}>Save</button>
            </div>
          ))}
        </div>

        <div>
          <h2>Log</h2>
          {log.length === 0 ? (
            <p className="adm-empty">No texts sent or received yet.</p>
          ) : (
            <ul className="adm-msg-log">
              {log.map((m) => (
                <li key={m.id} className={`adm-msg adm-msg-${m.direction} ${m.status === "failed" ? "adm-msg-failed" : ""}`}>
                  {m.media_url && <img className="adm-msg-img" src={m.media_url} alt="" />}
                  <p>{m.body}</p>
                  <small>
                    {m.direction === "outbound" ? "To" : "From"}{" "}
                    {m.guest ? <Link to={`/admin?guest=${m.guest.id}`}>{fullName(m.guest)}</Link> : "unknown number"}
                    {" · "}{m.status}{m.error ? ` (${m.error})` : ""}
                    {" · "}{new Date(m.created_at).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
                  </small>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
