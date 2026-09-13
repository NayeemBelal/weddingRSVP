import { useEffect, useState } from "react";
import { Routes, Route, NavLink, Navigate } from "react-router-dom";
import { supabase } from "../lib/supabase.js";
import Guests from "./Guests.jsx";
import Notes from "./Notes.jsx";
import Messages from "./Messages.jsx";
import Settings from "./Settings.jsx";
import "./admin.css";

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    const { error: err } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (err) setError("That email and password didn't match.");
  };

  return (
    <div className="adm-login">
      <form className="adm-login-card" onSubmit={submit}>
        <img src="/monogram.webp" alt="" className="adm-login-mark" />
        <h1>Guest list</h1>
        <label>
          <span>Email</span>
          <input type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>
        <label>
          <span>Password</span>
          <input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </label>
        {error && <p className="adm-error">{error}</p>}
        <button className="adm-btn adm-btn-primary" disabled={busy}>
          {busy ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </div>
  );
}

export default function AdminApp() {
  const [session, setSession] = useState(undefined);

  useEffect(() => {
    document.documentElement.classList.add("admin-mode");
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => {
      sub.subscription.unsubscribe();
      document.documentElement.classList.remove("admin-mode");
    };
  }, []);

  if (session === undefined) return <div className="adm-loading">Loading…</div>;
  if (!session) return <Login />;

  return (
    <div className="adm">
      <header className="adm-top">
        <div className="adm-brand">
          <img src="/monogram.webp" alt="" />
          <span>Nayeem &amp; Faatimah</span>
        </div>
        <nav className="adm-tabs">
          <NavLink to="/admin" end>Guests</NavLink>
          <NavLink to="/admin/notes">Notes</NavLink>
          <NavLink to="/admin/messages">Messages</NavLink>
          <NavLink to="/admin/settings">Settings</NavLink>
        </nav>
        <div className="adm-top-right">
          <a href="/" target="_blank" rel="noreferrer" className="adm-link">View site</a>
          <button className="adm-link" onClick={() => supabase.auth.signOut()}>Sign out</button>
        </div>
      </header>
      <main className="adm-main">
        <Routes>
          <Route index element={<Guests />} />
          <Route path="notes" element={<Notes />} />
          <Route path="messages" element={<Messages />} />
          <Route path="settings" element={<Settings />} />
          <Route path="*" element={<Navigate to="/admin" replace />} />
        </Routes>
      </main>
    </div>
  );
}
