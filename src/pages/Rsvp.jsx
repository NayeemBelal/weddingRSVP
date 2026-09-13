import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { EVENT } from "../data/event.js";
import { supabase } from "../lib/supabase.js";

const swap = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.25, 0.1, 0.25, 1] } },
  exit: { opacity: 0, y: -10, transition: { duration: 0.3 } },
};

export default function Rsvp() {
  const [params] = useSearchParams();
  const code = params.get("c");

  // lookup | notfound | pick | choose | done | closed
  const [step, setStep] = useState(code ? "loading" : "lookup");
  const [name, setName] = useState("");
  const [matches, setMatches] = useState([]);
  const [party, setParty] = useState(null); // { guest_id, label, members: [{id,name,attending}] }
  const [attending, setAttending] = useState({});
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [yesCount, setYesCount] = useState(0);

  const choose = (p) => {
    setParty(p);
    // Pre-fill with a previous reply if they've answered before.
    setAttending(Object.fromEntries(p.members.map((m) => [m.id, m.attending ?? null])));
    setStep("choose");
  };

  // Personal link: /rsvp?c=CODE skips the search.
  useEffect(() => {
    if (!code) return;
    (async () => {
      const { data, error: err } = await supabase.rpc("party_by_code", { code });
      if (err || !data?.length) return setStep("lookup");
      choose(data[0]);
    })();
  }, [code]);

  const lookup = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    const { data, error: err } = await supabase.rpc("search_parties", { q: name });
    setBusy(false);
    if (err) return setError("Something went wrong on our end. Please try again in a moment.");
    if (!data || data.length === 0) return setStep("notfound");
    if (data.length === 1) return choose(data[0]);
    setMatches(data);
    setStep("pick");
  };

  const allAnswered = party && party.members.every((m) => attending[m.id] !== null);

  const submit = async (e) => {
    e.preventDefault();
    if (!allAnswered) return;
    setBusy(true);
    setError("");
    const responses = party.members.map((m) => ({ id: m.id, attending: attending[m.id] }));
    const { data, error: err } = await supabase.rpc("submit_rsvp", {
      p_guest_id: party.guest_id,
      responses,
      note: note || null,
    });
    setBusy(false);
    if (err) {
      if (/closed/i.test(err.message)) return setStep("closed");
      return setError("We couldn't save your reply. Please try again, or text us.");
    }
    setYesCount(data?.attending_count ?? 0);
    setStep("done");
  };

  const reset = () => {
    setStep("lookup");
    setParty(null);
    setMatches([]);
    setNote("");
    setError("");
  };

  const contactLink = (
    <a href={`sms:${EVENT.contactPhone.replace(/\D/g, "")}`}>{EVENT.contactPhone}</a>
  );

  return (
    <section className="panel">
      <AnimatePresence mode="wait">
        {step === "loading" && (
          <motion.div key="loading" {...swap} className="stack">
            <p className="panel-sub">Finding your invitation…</p>
          </motion.div>
        )}

        {step === "lookup" && (
          <motion.form key="lookup" {...swap} onSubmit={lookup} className="stack">
            <h1 className="caps panel-title">Kindly reply</h1>
            <p className="panel-sub">
              Enter your name as it appears on your invitation and we'll find your family.
            </p>
            <label className="field">
              <span className="caps field-label">Your name</span>
              <input
                type="text"
                autoComplete="name"
                placeholder="First and last name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </label>
            {error && <p className="form-error">{error}</p>}
            <button className="btn" type="submit" disabled={name.trim().length < 2 || busy}>
              {busy ? <span className="spinner" aria-label="Searching" /> : "Find my invitation"}
            </button>
          </motion.form>
        )}

        {step === "notfound" && (
          <motion.div key="notfound" {...swap} className="stack">
            <h1 className="caps panel-title">We couldn't find that name</h1>
            <p className="panel-sub">
              We don't see "{name.trim()}" on our list. Try the name your invitation was
              addressed to, or the name of someone else in your household. If you think it should
              be there, text us at {contactLink} and we'll add you.
            </p>
            <button className="btn btn-ghost" type="button" onClick={() => setStep("lookup")}>
              Try another name
            </button>
          </motion.div>
        )}

        {step === "pick" && (
          <motion.div key="pick" {...swap} className="stack">
            <h1 className="caps panel-title">Which one is you?</h1>
            <p className="panel-sub">More than one invitation matches that name.</p>
            <ul className="pick-list">
              {matches.map((p) => (
                <li key={p.guest_id}>
                  <button type="button" className="pick-row" onClick={() => choose(p)}>
                    <span className="pick-label">{p.label}</span>
                    <span className="pick-members">
                      {p.members.map((m) => m.name).join(", ")}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
            <button className="link-btn" type="button" onClick={() => setStep("lookup")}>
              Search again
            </button>
          </motion.div>
        )}

        {step === "choose" && (
          <motion.form key="choose" {...swap} onSubmit={submit} className="stack">
            <h1 className="caps panel-title">{party.label}</h1>
            <p className="panel-sub">
              Let us know who will be joining us on {EVENT.weekday}, {EVENT.month} {EVENT.day}.
            </p>

            <ul className="guest-list">
              {party.members.map((m) => (
                <li key={m.id} className="guest-row">
                  <span className="guest-name">{m.name}</span>
                  <span className="choice" role="radiogroup" aria-label={`${m.name} attending?`}>
                    {[
                      { v: true, label: "Attending" },
                      { v: false, label: "Can't make it" },
                    ].map((opt) => (
                      <button
                        key={String(opt.v)}
                        type="button"
                        role="radio"
                        aria-checked={attending[m.id] === opt.v}
                        className={attending[m.id] === opt.v ? "chip is-on" : "chip"}
                        onClick={() => setAttending((prev) => ({ ...prev, [m.id]: opt.v }))}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </span>
                </li>
              ))}
            </ul>

            <label className="field">
              <span className="caps field-label">Anything we should know?</span>
              <textarea
                rows={3}
                placeholder="Dietary needs, accessibility, or a note for the couple"
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </label>

            {error && <p className="form-error">{error}</p>}
            <button className="btn" type="submit" disabled={!allAnswered || busy}>
              {busy ? <span className="spinner" aria-label="Saving" /> : "Send reply"}
            </button>
            {!code && (
              <button className="link-btn" type="button" onClick={reset}>
                Not your family? Search a different name
              </button>
            )}
          </motion.form>
        )}

        {step === "done" && (
          <motion.div key="done" {...swap} className="stack thanks">
            <img src="/bismillah.webp" alt="" className="bismillah bismillah-sm" />
            <h1 className="script thanks-title">Jazakallahu Khayran</h1>
            <p className="panel-sub">
              {yesCount > 0
                ? `Your reply is saved. We can't wait to celebrate with ${
                    yesCount === 1 ? "you" : `all ${yesCount} of you`
                  }.`
                : "Your reply is saved. We'll miss you, and we're grateful you let us know."}
            </p>
            <p className="caps thanks-detail">
              {EVENT.weekday}, {EVENT.month} {EVENT.day}, {EVENT.year} at {EVENT.time}
              <br />
              {EVENT.venue}
            </p>
            <button className="link-btn" type="button" onClick={() => setStep("choose")}>
              Change your reply
            </button>
          </motion.div>
        )}

        {step === "closed" && (
          <motion.div key="closed" {...swap} className="stack">
            <h1 className="caps panel-title">RSVPs have closed</h1>
            <p className="panel-sub">
              The reply window has passed. If you need to reach us about your invitation, text
              us at {contactLink}.
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
