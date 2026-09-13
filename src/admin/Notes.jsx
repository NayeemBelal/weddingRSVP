import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fetchNotes, fullName } from "./api.js";

export default function Notes() {
  const [notes, setNotes] = useState(null);

  useEffect(() => {
    fetchNotes().then(setNotes).catch(() => setNotes([]));
  }, []);

  if (!notes) return <p className="adm-muted">Loading…</p>;

  return (
    <section className="adm-page">
      <div className="adm-page-head">
        <h1>Notes</h1>
        <p className="adm-muted">{notes.length} {notes.length === 1 ? "note" : "notes"} from guests</p>
      </div>
      {notes.length === 0 ? (
        <p className="adm-empty">No notes yet. Anything a guest types in the note box when replying shows up here.</p>
      ) : (
        <ul className="adm-notes">
          {notes.map((n) => (
            <li key={n.id} className="adm-note">
              <p className="adm-note-body">{n.body}</p>
              <p className="adm-note-meta">
                <Link to={`/admin?guest=${n.guest?.id}`}>{n.guest ? fullName(n.guest) : "Unknown"}</Link>
                <span>{new Date(n.created_at).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}</span>
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
