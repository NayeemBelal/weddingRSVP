import { EVENT } from "../data/event.js";

const FAQS = [
  {
    q: "When should I arrive?",
    a: `Doors open at ${EVENT.time}. Please plan to be seated by 6:30 pm so we can begin together.`,
  },
  {
    q: "What should I wear?",
    a: "Desi attire. Men: sherwanis or other desi formal wear. Women: desi formal wear.",
  },
  {
    q: "Where do I park?",
    a: "Use the parking garage just west of the Marriott, across Marinda Road, between Daniel Road and Dallas Parkway. It's outlined on the map below.",
    img: { src: "/parking-map.png", alt: "Map of the Dallas/Plano Marriott at Legacy Town Center with the parking garage outlined in red, west of the hotel across Marinda Road" },
  },
  {
    q: "Do you have a registry?",
    a: "Your presence is the gift. If you'd like to give something, a card box will be at the reception.",
  },
  {
    q: "How do I change my reply?",
    a: "Go back to the RSVP page, search your name again, and update who's coming. The newest reply replaces the last one.",
  },
];

export default function Faq() {
  return (
    <section className="panel panel-wide">
      <h1 className="caps panel-title">FAQ</h1>
      <p className="panel-sub">
        If yours isn't here, text us at{" "}
        <a href={`sms:${EVENT.contactPhone.replace(/\D/g, "")}`}>{EVENT.contactPhone}</a>.
      </p>
      <dl className="faq">
        {FAQS.map((f) => (
          <details key={f.q} className="faq-item">
            <summary className="faq-q">
              <span>{f.q}</span>
              <span className="faq-mark" aria-hidden="true" />
            </summary>
            <p className="faq-a">{f.a}</p>
            {f.img && (
              <img className="faq-img" src={f.img.src} alt={f.img.alt} loading="lazy" />
            )}
          </details>
        ))}
      </dl>
    </section>
  );
}
