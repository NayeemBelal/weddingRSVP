import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { EVENT, calendarFile } from "../data/event.js";

const item = {
  hidden: { opacity: 0, y: 14 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: [0.25, 0.1, 0.25, 1] } },
};
const list = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.12, delayChildren: 0.2 } },
};

export default function Home({ animate }) {
  return (
    <motion.section
      className="invite"
      variants={list}
      initial="hidden"
      animate={animate ? "visible" : "hidden"}
    >
      <motion.img
        src="/bismillah.webp"
        alt="Bismillah ir-Rahman ir-Rahim"
        className="bismillah"
        variants={item}
      />

      <motion.p className="caps invite-lead" variants={item}>
        We cordially invite you to the
        <br />
        wedding reception of
      </motion.p>

      <motion.h1 className="script name" variants={item}>
        {EVENT.groom}
      </motion.h1>
      <motion.p className="caps parents" variants={item}>
        Son of {EVENT.groomParents}
      </motion.p>

      <motion.div className="script amp" variants={item} aria-hidden="true">
        &amp;
      </motion.div>

      <motion.h1 className="script name" variants={item}>
        {EVENT.bride}
      </motion.h1>
      <motion.p className="caps parents" variants={item}>
        Daughter of {EVENT.brideParents}
      </motion.p>

      <motion.div className="date-block" variants={item}>
        <p className="caps weekday">{EVENT.weekday}</p>
        <p className="date-line">
          <span className="caps">{EVENT.month}</span>
          <span className="rule" />
          <span className="day">{EVENT.day}</span>
          <span className="rule" />
          <span className="caps">{EVENT.year}</span>
        </p>
        <p className="caps time">at {EVENT.time}</p>
      </motion.div>

      <motion.div className="venue-block" variants={item}>
        <p className="caps venue">{EVENT.venue}</p>
        <p className="caps address">{EVENT.address}</p>
        <p className="quiet-links">
          <a href={EVENT.mapsUrl} target="_blank" rel="noreferrer">
            Open in Maps
          </a>
          <span aria-hidden="true">·</span>
          <a href={calendarFile()} download="nayeem-and-faatimah.ics">
            Add to calendar
          </a>
        </p>
      </motion.div>

      <motion.div variants={item}>
        <Link to="/rsvp" className="btn">
          Reply to the invitation
        </Link>
        <p className="caps rsvp-by">Kindly reply by {EVENT.rsvpBy}</p>
      </motion.div>
    </motion.section>
  );
}
