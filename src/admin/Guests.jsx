import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  fetchGuests, fetchGuest, fetchTemplates, saveGuest, deleteGuest, setAttendance, parseCsv, toCsv,
  sendSms, renderTemplate, partyStatus, partySize, attendingCount, fullName, prettyPhone,
} from "./api.js";

import ImagePicker from "./ImagePicker.jsx";

const SITE = "https://faatimahandnayeem.com";

const STATUS_LABEL = { pending: "Pending", attending: "Attending", declined: "Declined" };

export default function Guests() {
  const [guests, setGuests] = useState(null);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [side, setSide] = useState("all");
  const [sort, setSort] = useState({ key: "name", dir: 1 });
  const [params, setParams] = useSearchParams();
  const [panel, setPanel] = useState(null); // { mode: 'edit'|'new', guest }
  const [toast, setToast] = useState("");
  const fileRef = useRef();

  const load = async () => setGuests(await fetchGuests());
  useEffect(() => { load(); }, []);

  // Deep link from Notes / Messages: /admin?guest=ID
  useEffect(() => {
    const id = params.get("guest");
    if (id && guests) {
      const g = guests.find((x) => x.id === id);
      if (g) setPanel({ mode: "edit", guest: g });
      setParams({}, { replace: true });
    }
  }, [params, guests]);

  const flash = (msg) => { setToast(msg); setTimeout(() => setToast(""), 2200); };

  const stats = useMemo(() => {
    if (!guests) return null;
    const s = { parties: guests.length, people: 0, attending: 0, declined: 0, pending: 0, responded: 0 };
    for (const g of guests) {
      s.people += partySize(g);
      const st = partyStatus(g);
      if (st === "pending") s.pending += 1; else s.responded += 1;
      if (st === "attending") s.attending += attendingCount(g);
      if (st === "declined") s.declined += partySize(g);
      else if (st === "attending") s.declined += partySize(g) - attendingCount(g);
    }
    return s;
  }, [guests]);

  const rows = useMemo(() => {
    if (!guests) return [];
    const needle = q.trim().toLowerCase();
    let out = guests.filter((g) => {
      if (status !== "all" && partyStatus(g) !== status) return false;
      if (side !== "all" && g.side !== side) return false;
      if (!needle) return true;
      const hay = [fullName(g), g.phone, g.group_label, ...g.sub_guests.map(fullName)].join(" ").toLowerCase();
      return hay.includes(needle);
    });
    const cmp = {
      name: (a, b) => (a.last_name + a.first_name).localeCompare(b.last_name + b.first_name),
      party: (a, b) => partySize(a) - partySize(b),
      attending: (a, b) => attendingCount(a) - attendingCount(b),
      status: (a, b) => partyStatus(a).localeCompare(partyStatus(b)),
      replied: (a, b) => (a.responded_at || "").localeCompare(b.responded_at || ""),
    }[sort.key];
    return out.sort((a, b) => cmp(a, b) * sort.dir);
  }, [guests, q, status, side, sort]);

  const toggleSort = (key) => setSort((s) => (s.key === key ? { key, dir: -s.dir } : { key, dir: 1 }));

  const onImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const parsed = parseCsv(await file.text());
    if (!parsed.length) return flash("No rows found in that file.");
    if (!confirm(`Import ${parsed.length} ${parsed.length === 1 ? "guest" : "guests"}?`)) return;
    let ok = 0, failed = [];
    for (const r of parsed) {
      try { await saveGuest(r); ok += 1; } catch (err) { failed.push(`${r.first_name} ${r.last_name}: ${err.message}`); }
    }
    await load();
    flash(`Imported ${ok}.${failed.length ? ` ${failed.length} skipped.` : ""}`);
    if (failed.length) alert("Skipped:\n" + failed.join("\n"));
    e.target.value = "";
  };

  const onExport = () => {
    const blob = new Blob([toCsv(guests)], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `guest-list-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  if (!guests) return <p className="adm-muted">Loading…</p>;

  return (
    <section className="adm-page">
      <div className="adm-stats">
        <Stat label="Parties invited" value={stats.parties} />
        <Stat label="People invited" value={stats.people} />
        <Stat label="Attending" value={stats.attending} tone="good" />
        <Stat label="Not coming" value={stats.declined} tone="bad" />
        <Stat label="Pending" value={stats.pending} tone="warn" sub={`${stats.parties ? Math.round((stats.responded / stats.parties) * 100) : 0}% replied`} />
      </div>

      <div className="adm-toolbar">
        <input
          className="adm-search"
          placeholder="Search names, phone, group…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <div className="adm-chips">
          {["all", "pending", "attending", "declined"].map((s) => (
            <button key={s} className={status === s ? "adm-chip is-on" : "adm-chip"} onClick={() => setStatus(s)}>
              {s === "all" ? "All" : STATUS_LABEL[s]}
            </button>
          ))}
          <span className="adm-chip-sep" />
          {["all", "bride", "groom"].map((s) => (
            <button key={s} className={side === s ? "adm-chip is-on" : "adm-chip"} onClick={() => setSide(s)}>
              {s === "all" ? "Both sides" : s === "bride" ? "Faatimah's" : "Nayeem's"}
            </button>
          ))}
        </div>
        <div className="adm-toolbar-actions">
          <input ref={fileRef} type="file" accept=".csv,text/csv" hidden onChange={onImport} />
          <button className="adm-btn" onClick={() => fileRef.current.click()}>Import CSV</button>
          <button className="adm-btn" onClick={onExport}>Export</button>
          <button className="adm-btn adm-btn-primary" onClick={() => setPanel({ mode: "new", guest: null })}>
            Add guest
          </button>
        </div>
      </div>

      <div className="adm-table-wrap">
        <table className="adm-table">
          <thead>
            <tr>
              <Th label="Name" k="name" sort={sort} onSort={toggleSort} />
              <th>Phone</th>
              <th>Party</th>
              <Th label="Attending" k="attending" sort={sort} onSort={toggleSort} />
              <Th label="Status" k="status" sort={sort} onSort={toggleSort} />
              <Th label="Replied" k="replied" sort={sort} onSort={toggleSort} />
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr><td colSpan={7} className="adm-empty">{guests.length ? "No one matches those filters." : "No guests yet. Add one or import a CSV."}</td></tr>
            )}
            {rows.map((g) => {
              const st = partyStatus(g);
              return (
                <tr key={g.id} className="adm-row" onClick={() => setPanel({ mode: "edit", guest: g })}>
                  <td>
                    <div className="adm-name">{fullName(g)}</div>
                    {g.group_label && <div className="adm-sub">{g.group_label}{g.side ? ` · ${g.side === "bride" ? "Faatimah's" : "Nayeem's"}` : ""}</div>}
                  </td>
                  <td className="adm-mono">{prettyPhone(g.phone)}</td>
                  <td className="adm-sub">{g.sub_guests.length ? g.sub_guests.map(fullName).join(", ") : "Just them"}</td>
                  <td className="adm-mono">{g.responded_at ? `${attendingCount(g)} of ${partySize(g)}` : `— of ${partySize(g)}`}</td>
                  <td><span className={`adm-badge adm-badge-${st}`}>{STATUS_LABEL[st]}</span></td>
                  <td className="adm-sub">{g.responded_at ? new Date(g.responded_at).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : ""}</td>
                  <td className="adm-sub">{g.notes.length > 0 && <span title={g.notes[0].body}>✎ {g.notes.length}</span>}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {panel && (
        <GuestPanel
          key={panel.guest?.id || "new"}
          mode={panel.mode}
          guest={panel.guest}
          onClose={() => setPanel(null)}
          onSaved={async (msg) => { await load(); flash(msg); }}
        />
      )}
      {toast && <div className="adm-toast">{toast}</div>}
    </section>
  );
}

function Stat({ label, value, sub, tone }) {
  return (
    <div className={`adm-stat ${tone ? `adm-stat-${tone}` : ""}`}>
      <div className="adm-stat-value">{value}</div>
      <div className="adm-stat-label">{label}</div>
      {sub && <div className="adm-stat-sub">{sub}</div>}
    </div>
  );
}

function Th({ label, k, sort, onSort }) {
  const active = sort.key === k;
  return (
    <th className={active ? "is-sorted" : ""} onClick={() => onSort(k)}>
      {label} {active && (sort.dir === 1 ? "↑" : "↓")}
    </th>
  );
}

// ── Side panel: view / edit one household ───────────────────────────
function GuestPanel({ mode, guest, onClose, onSaved }) {
  const blank = { first_name: "", last_name: "", phone: "", side: "", group_label: "", sub_guests: [] };
  const [form, setForm] = useState(
    guest
      ? { ...guest, phone: prettyPhone(guest.phone), side: guest.side || "", group_label: guest.group_label || "", sub_guests: guest.sub_guests.map((s) => ({ ...s })) }
      : blank
  );
  const [attend, setAttend] = useState(() =>
    guest
      ? [{ kind: "guest", id: guest.id, name: fullName(guest), attending: guest.attending }, ...guest.sub_guests.map((s) => ({ kind: "sub", id: s.id, name: fullName(s), attending: s.attending }))]
      : []
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [tab, setTab] = useState("details");

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const setSub = (i, k, v) => setForm((f) => {
    const subs = f.sub_guests.map((s, j) => (j === i ? { ...s, [k]: v } : s));
    return { ...f, sub_guests: subs };
  });
  const addSub = () => set("sub_guests", [...form.sub_guests, { first_name: "", last_name: form.last_name, attending: null }]);
  const removeSub = (i) => set("sub_guests", form.sub_guests.filter((_, j) => j !== i));

  const save = async () => {
    setBusy(true);
    setError("");
    try {
      await saveGuest(form);
      await onSaved(mode === "new" ? "Guest added." : "Saved.");
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const saveAttendance = async () => {
    setBusy(true);
    try {
      await setAttendance(guest.id, attend);
      await onSaved("Reply recorded.");
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!confirm(`Delete ${fullName(guest)} and their party? This can't be undone.`)) return;
    setBusy(true);
    await deleteGuest(guest.id);
    await onSaved("Deleted.");
    onClose();
  };

  const rsvpLink = guest ? `${window.location.origin}/rsvp?c=${guest.invite_code}` : "";

  return (
    <>
      <div className="adm-scrim" onClick={onClose} />
      <aside className="adm-panel" role="dialog" aria-label={mode === "new" ? "Add guest" : "Edit guest"}>
        <header className="adm-panel-head">
          <h2>{mode === "new" ? "Add guest" : fullName(guest)}</h2>
          <button className="adm-icon-btn" onClick={onClose} aria-label="Close">×</button>
        </header>

        {mode === "edit" && (
          <nav className="adm-panel-tabs">
            {[["details", "Details"], ["reply", "Reply"], ["text", "Text"], ["notes", `Notes${guest.notes.length ? ` (${guest.notes.length})` : ""}`]].map(([k, l]) => (
              <button key={k} className={tab === k ? "is-on" : ""} onClick={() => setTab(k)}>{l}</button>
            ))}
          </nav>
        )}

        <div className="adm-panel-body">
          {tab === "details" && (
            <>
              <div className="adm-grid-2">
                <label className="adm-field"><span>First name</span><input value={form.first_name} onChange={(e) => set("first_name", e.target.value)} autoFocus={mode === "new"} /></label>
                <label className="adm-field"><span>Last name</span><input value={form.last_name} onChange={(e) => set("last_name", e.target.value)} /></label>
              </div>
              <label className="adm-field"><span>Phone</span><input inputMode="tel" placeholder="(214) 555-0101" value={form.phone} onChange={(e) => set("phone", e.target.value)} /></label>
              <div className="adm-grid-2">
                <label className="adm-field">
                  <span>Side</span>
                  <select value={form.side} onChange={(e) => set("side", e.target.value)}>
                    <option value="">—</option>
                    <option value="groom">Nayeem's</option>
                    <option value="bride">Faatimah's</option>
                  </select>
                </label>
                <label className="adm-field"><span>Group</span><input placeholder="Family, Friends, Work…" value={form.group_label} onChange={(e) => set("group_label", e.target.value)} /></label>
              </div>

              <div className="adm-subhead">
                <span>Sub-guests</span>
                <button className="adm-link" onClick={addSub}>+ Add person</button>
              </div>
              {form.sub_guests.length === 0 && <p className="adm-muted adm-small">No one else on this invitation.</p>}
              {form.sub_guests.map((s, i) => (
                <div key={s.id || `new-${i}`} className="adm-sub-row">
                  <input placeholder="First" value={s.first_name} onChange={(e) => setSub(i, "first_name", e.target.value)} />
                  <input placeholder="Last" value={s.last_name} onChange={(e) => setSub(i, "last_name", e.target.value)} />
                  <button className="adm-icon-btn" onClick={() => removeSub(i)} aria-label="Remove">×</button>
                </div>
              ))}

              {mode === "edit" && (
                <div className="adm-linkbox">
                  <span>Personal RSVP link</span>
                  <code>{rsvpLink}</code>
                  <button className="adm-link" onClick={() => { navigator.clipboard.writeText(rsvpLink); }}>Copy</button>
                </div>
              )}

              {error && <p className="adm-error">{error}</p>}
              <div className="adm-panel-actions">
                {mode === "edit" && <button className="adm-link adm-danger" onClick={remove} disabled={busy}>Delete</button>}
                <span className="adm-spacer" />
                <button className="adm-btn" onClick={onClose} disabled={busy}>Cancel</button>
                <button className="adm-btn adm-btn-primary" onClick={save} disabled={busy || !form.first_name.trim()}>
                  {busy ? "Saving…" : "Save"}
                </button>
              </div>
            </>
          )}

          {tab === "reply" && (
            <>
              <p className="adm-muted adm-small">
                Record a reply they gave you by text, phone or in person. Guests can still change it themselves on the site.
              </p>
              <ul className="adm-attend">
                {attend.map((p, i) => (
                  <li key={p.id}>
                    <span>{p.name}</span>
                    <div className="adm-seg">
                      {[[true, "Yes"], [false, "No"], [null, "—"]].map(([v, l]) => (
                        <button
                          key={String(v)}
                          className={p.attending === v ? "is-on" : ""}
                          onClick={() => setAttend((a) => a.map((x, j) => (j === i ? { ...x, attending: v } : x)))}
                        >{l}</button>
                      ))}
                    </div>
                  </li>
                ))}
              </ul>
              <p className="adm-muted adm-small">
                {guest.responded_at
                  ? `Last replied ${new Date(guest.responded_at).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}.`
                  : "Hasn't replied yet."}
              </p>
              {error && <p className="adm-error">{error}</p>}
              <div className="adm-panel-actions">
                <span className="adm-spacer" />
                <button className="adm-btn" onClick={onClose} disabled={busy}>Cancel</button>
                <button className="adm-btn adm-btn-primary" onClick={saveAttendance} disabled={busy}>
                  {busy ? "Saving…" : "Save reply"}
                </button>
              </div>
            </>
          )}

          {tab === "text" && <TextTab guest={guest} />}

          {tab === "notes" && (
            guest.notes.length === 0
              ? <p className="adm-empty">No notes from this household.</p>
              : <ul className="adm-notes">
                  {guest.notes.map((n) => (
                    <li key={n.id} className="adm-note">
                      <p className="adm-note-body">{n.body}</p>
                      <p className="adm-note-meta"><span>{new Date(n.created_at).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}</span></p>
                    </li>
                  ))}
                </ul>
          )}
        </div>
      </aside>
    </>
  );
}

// ── Text tab: history with this number, plus a send box ─────────────
function TextTab({ guest }) {
  const [history, setHistory] = useState(null);
  const [templates, setTemplates] = useState([]);
  const [choice, setChoice] = useState("reminder");
  const [custom, setCustom] = useState("");
  const [customImage, setCustomImage] = useState(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");

  const load = async () => {
    const [g, t] = await Promise.all([fetchGuest(guest.id), fetchTemplates()]);
    setHistory(g.messages);
    setTemplates(t);
  };
  useEffect(() => { load(); }, [guest.id]);

  const isCustom = choice === "__custom";
  const tpl = templates.find((t) => t.key === choice);
  const preview = isCustom ? custom : renderTemplate(tpl?.body || "", guest, SITE);
  const previewImage = isCustom ? customImage : tpl?.media_url || null;

  const send = async () => {
    if (!guest.phone) return;
    setBusy(true);
    setNote("");
    try {
      const r = await sendSms({ guest_ids: [guest.id], template: isCustom ? undefined : choice, body: isCustom ? custom : undefined, media_url: isCustom ? customImage : undefined });
      setNote(r.queued ? "Sending now. Status updates below in a moment." : "Not sent: no phone number.");
      if (isCustom) { setCustom(""); setCustomImage(null); }
      await new Promise((res) => setTimeout(res, 2500));
      await load();
    } catch (err) {
      setNote(`Couldn't send: ${err.message}`);
    } finally {
      setBusy(false);
    }
  };

  if (!guest.phone) return <p className="adm-empty">No phone number on file. Add one under Details to text them.</p>;
  if (!history) return <p className="adm-muted">Loading…</p>;

  return (
    <>
      <div className="adm-thread">
        {history.length === 0 && <p className="adm-muted adm-small">No texts with {prettyPhone(guest.phone)} yet.</p>}
        {[...history].reverse().map((m) => (
          <div key={m.id} className={`adm-bubble adm-bubble-${m.direction} ${m.status === "failed" ? "is-failed" : ""}`}>
            {m.media_url && <img className="adm-bubble-img" src={m.media_url} alt="" />}
            <p>{m.body}</p>
            <small>{m.status}{m.error ? ` · ${m.error}` : ""} · {new Date(m.created_at).toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" })}</small>
          </div>
        ))}
      </div>
      <label className="adm-field">
        <span>Send</span>
        <select value={choice} onChange={(e) => setChoice(e.target.value)}>
          {templates.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
          <option value="__custom">Write my own</option>
        </select>
      </label>
      {isCustom ? (
        <>
          <ImagePicker value={customImage} onChange={setCustomImage} />
          <label className="adm-field"><span>Text</span><textarea rows={3} value={custom} onChange={(e) => setCustom(e.target.value)} /></label>
        </>
      ) : (
        <div className="adm-preview">
          <span>Preview</span>
          {previewImage && <img className="adm-preview-img" src={previewImage} alt="" />}
          <p>{preview}</p>
        </div>
      )}
      {note && <p className="adm-muted adm-small">{note}</p>}
      <div className="adm-panel-actions">
        <span className="adm-spacer" />
        <button className="adm-btn adm-btn-primary" onClick={send} disabled={busy || (isCustom && !custom.trim())}>
          {busy ? "Sending…" : `Text ${guest.first_name}`}
        </button>
      </div>
    </>
  );
}
