import { NavLink, Link } from "react-router-dom";
import { Monogram } from "./Ornaments.jsx";

const links = [
  { to: "/", label: "Home", end: true },
  { to: "/rsvp", label: "RSVP" },
  { to: "/faq", label: "FAQ" },
];

export default function Nav() {
  return (
    <header className="nav">
      <Link to="/" className="nav-mark" aria-label="Home">
        <Monogram size={76} />
      </Link>
      <nav className="nav-links" aria-label="Main">
        {links.map((l) => (
          <NavLink
            key={l.to}
            to={l.to}
            end={l.end}
            className={({ isActive }) => (isActive ? "nav-link is-active" : "nav-link")}
          >
            {l.label}
          </NavLink>
        ))}
      </nav>
    </header>
  );
}
