import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import "./App.css";

const fadeUp = (delay = 0) => ({
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.9, ease: [0.25, 0.1, 0.25, 1], delay },
  },
});

export default function App() {
  const [loading, setLoading] = useState(true);
  const [showRsvp, setShowRsvp] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ name: "", guests: "", phone: "" });

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 2000);
    return () => clearTimeout(t);
  }, []);

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const SCRIPT_URL =
    "https://script.google.com/macros/s/AKfycbwN7OgbUZDzQkTZwDaHB2QfPTOpDz5mn8wstOIgLTTWmmq1RaTY6ZlINxwZe5PwyUHw/exec";

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    const url = new URL(SCRIPT_URL);
    url.searchParams.append("name", form.name);
    url.searchParams.append("guests", form.guests);
    url.searchParams.append("phone", form.phone);
    try {
      await fetch(url.toString(), { method: "GET", mode: "no-cors" });
    } catch (err) {
      console.error("[RSVP] Fetch error:", err);
    }
    setSubmitting(false);
    setSubmitted(true);
  };

  return (
    <>
      <AnimatePresence>
        {loading && (
          <motion.div
            className="intro"
            key="intro"
            initial={{ opacity: 1 }}
            exit={{
              opacity: 0,
              transition: { duration: 1, ease: "easeInOut" },
            }}
          >
            <motion.div
              className="intro-monogram"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 1, ease: [0.25, 0.1, 0.25, 1] }}
            >
              <span className="intro-initial">F</span>
              <span className="intro-amp">&amp;</span>
              <span className="intro-initial">N</span>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="page">
        {/* Flowers — bottom left */}
        <motion.img
          src="/rightflowers.png"
          alt=""
          className="flowers flowers-bl"
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.4, ease: "easeOut" }}
        />

        {/* Flowers — top right */}
        <motion.img
          src="/leftflowers.png"
          alt=""
          className="flowers flowers-tr"
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.4, ease: "easeOut", delay: 0.1 }}
        />

        {/* Arch card */}
        <div className="arch-wrapper">
          <motion.div
            className="arch-card"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.1, ease: [0.25, 0.1, 0.25, 1] }}
          >
            {/* Arch background image */}
            <img src="/arch.png" alt="" className="arch-img" />

            {/* Content inside the arch */}
            <div className="arch-content">
              <AnimatePresence mode="wait">
                {!showRsvp ? (
                  <motion.div
                    key="invite"
                    className="invite-content"
                    initial="hidden"
                    animate="visible"
                    exit={{ opacity: 0, y: -20, transition: { duration: 0.4 } }}
                  >
                    <motion.img
                      src="/bismillah.png"
                      alt="Bismillah ir-Rahman ir-Rahim"
                      className="bismillah"
                      variants={fadeUp(0.3)}
                    />

                    <motion.p
                      className="invite-tagline"
                      variants={fadeUp(0.55)}
                    >
                      We request the honor of your presence
                      <br />
                      at the Nikkah ceremony of
                    </motion.p>

                    <motion.h1 className="name" variants={fadeUp(0.75)}>
                      Nayeem Belal
                    </motion.h1>

                    <motion.div className="ampersand" variants={fadeUp(0.88)}>
                      &amp;
                    </motion.div>

                    <motion.h1 className="name" variants={fadeUp(1.0)}>
                      Faatimah Hafeez
                    </motion.h1>

                    <motion.div className="divider" variants={fadeUp(1.1)} />

                    <motion.p className="date" variants={fadeUp(1.2)}>
                      August 29, 2026
                    </motion.p>
                    <motion.p className="time" variants={fadeUp(1.28)}>
                      11 AM
                    </motion.p>

                    <motion.p className="venue" variants={fadeUp(1.36)}>
                      East Plano Islamic Center
                    </motion.p>
                    <motion.p className="address" variants={fadeUp(1.42)}>
                      4700 14th St, Plano, TX 75074
                    </motion.p>

                    <motion.button
                      className="rsvp-btn"
                      variants={fadeUp(1.56)}
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => setShowRsvp(true)}
                    >
                      RSVP
                    </motion.button>
                  </motion.div>
                ) : (
                  <motion.div
                    key="rsvp"
                    className="rsvp-content"
                    initial={{ opacity: 0, y: 40 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 20, transition: { duration: 0.3 } }}
                    transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
                  >
                    <AnimatePresence mode="wait">
                      {!submitted ? (
                        <motion.form
                          key="form"
                          className="rsvp-form"
                          onSubmit={handleSubmit}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.4 }}
                        >
                          <motion.p
                            className="rsvp-heading"
                            initial={{ opacity: 0, y: 16 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1, duration: 0.6 }}
                          >
                            Kindly Reply
                          </motion.p>
                          <motion.p
                            className="rsvp-sub"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.2, duration: 0.5 }}
                          >
                            August 29, 2026 · East Plano Islamic Center
                          </motion.p>

                          {[
                            {
                              name: "name",
                              label: "Full Name",
                              type: "text",
                              placeholder: "Your name",
                            },
                            {
                              name: "guests",
                              label: "Total Guests Attending",
                              type: "number",
                              placeholder: "1",
                            },
                            {
                              name: "phone",
                              label: "Phone Number",
                              type: "tel",
                              placeholder: "+1 (000) 000-0000",
                            },
                          ].map((field, i) => (
                            <motion.div
                              key={field.name}
                              className="field-group"
                              initial={{ opacity: 0, y: 14 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{
                                delay: 0.25 + i * 0.1,
                                duration: 0.5,
                              }}
                            >
                              <label className="field-label">
                                {field.label}
                              </label>
                              <input
                                className="field-input"
                                type={field.type}
                                name={field.name}
                                placeholder={field.placeholder}
                                value={form[field.name]}
                                onChange={handleChange}
                                min={field.name === "guests" ? 1 : undefined}
                                required
                              />
                            </motion.div>
                          ))}

                          <motion.button
                            type="submit"
                            className="rsvp-btn submit-btn"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.6, duration: 0.5 }}
                            whileHover={!submitting ? { scale: 1.03 } : {}}
                            whileTap={!submitting ? { scale: 0.97 } : {}}
                            disabled={submitting}
                          >
                            {submitting ? (
                              <span className="spinner" />
                            ) : (
                              "Confirm Attendance"
                            )}
                          </motion.button>

                          <motion.button
                            type="button"
                            className="back-btn"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.7, duration: 0.4 }}
                            onClick={() => setShowRsvp(false)}
                          >
                            ← Back
                          </motion.button>
                        </motion.form>
                      ) : (
                        <motion.div
                          key="thanks"
                          className="thanks"
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{
                            duration: 0.6,
                            ease: [0.25, 0.1, 0.25, 1],
                          }}
                        >
                          <img
                            src="/bismillah.png"
                            alt=""
                            className="bismillah bismillah-sm"
                          />
                          <p className="thanks-heading">Jazakallahu Khayran</p>
                          <p className="thanks-msg">
                            We look forward to celebrating with you,
                            <br />
                            {form.name}.
                          </p>
                          <p className="thanks-detail">
                            August 29, 2026 · 11 AM
                            <br />
                            East Plano Islamic Center
                          </p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </div>
      </div>
    </>
  );
}
