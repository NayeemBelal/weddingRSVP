import { useState, useEffect } from "react";
import { Routes, Route, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { PageFrame, Monogram } from "./components/Ornaments.jsx";
import Nav from "./components/Nav.jsx";
import Home from "./pages/Home.jsx";
import Rsvp from "./pages/Rsvp.jsx";
import Faq from "./pages/Faq.jsx";
import AdminApp from "./admin/AdminApp.jsx";

function Intro({ onDone }) {
  useEffect(() => {
    const t = setTimeout(onDone, 2200);
    return () => clearTimeout(t);
  }, [onDone]);
  return (
    <motion.div
      className="intro"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 1.2, ease: "easeInOut" } }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.92 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1.3, ease: [0.25, 0.1, 0.25, 1] }}
      >
        <Monogram size={220} />
      </motion.div>
    </motion.div>
  );
}

export default function App() {
  const location = useLocation();
  const isAdmin = location.pathname.startsWith("/admin");
  // The monogram splash plays on every full page load, then the page fades in beneath it.
  const [intro, setIntro] = useState(!isAdmin);
  const finishIntro = () => setIntro(false);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  if (isAdmin) {
    return (
      <Routes>
        <Route path="/admin/*" element={<AdminApp />} />
      </Routes>
    );
  }

  return (
    <>
      <AnimatePresence>{intro && <Intro key="intro" onDone={finishIntro} />}</AnimatePresence>
      <div className={intro ? "site" : "site is-ready"}>
        <PageFrame />
        <div className="shell">
          <Nav />
          <main className="content">
            <Routes location={location}>
              <Route path="/" element={<Home animate={!intro} />} />
              <Route path="/rsvp" element={<Rsvp />} />
              <Route path="/faq" element={<Faq />} />
              <Route path="*" element={<Home animate={!intro} />} />
            </Routes>
          </main>
        </div>
      </div>
    </>
  );
}
