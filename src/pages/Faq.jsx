import { EVENT } from "../data/event.js";

const FAQS = [
  {
    q: "When should I arrive?",
    a: `Doors open at ${EVENT.time}. Please plan to be seated by 6:30 pm so we can begin together.`,
  },
  {
    q: "What should I wear?",
    a: "Formal attire. Think what you'd wear to a wedding in a ballroom: sherwanis, suits, sarees, lehengas, and gowns are all welcome.",
  },
  {
    q: "Where do I park?",
    a: "The Marriott has on-site parking, and there are public garages across Bishop Road at Legacy Town Center. We'll have details on validation closer to the date.",
  },
  {
    q: "Are children welcome?",
    a: "Yes. The whole family is invited. Let us know on your reply how many little ones are coming so we can plan seating.",
  },
  {
    q: "Will there be food?",
    a: "Dinner will be served, and everything is halal. Tell us about any allergies or dietary needs in the note on your reply.",
  },
  {
    q: "Is there a hotel block?",
    a: "We're arranging a room block at the Marriott for out-of-town guests. Check back here for the booking link.",
  },
  {
    q: "Can I bring a guest who isn't on my invitation?",
    a: `Seating is limited, so we can only host the names on your invitation. If your circumstances change, text us at ${EVENT.contactPhone} and we'll do our best.`,
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
          </details>
        ))}
      </dl>
    </section>
  );
}
