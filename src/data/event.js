export const EVENT = {
  groom: "Nayeem Belal",
  groomParents: "Abu Belal & Fawzia Belal",
  bride: "Faatimah Hafeez",
  brideParents: "Mohammed Abdul Hafeez & Mariam Hafeez",
  weekday: "Sunday",
  month: "Dec",
  day: "27",
  year: "2026",
  time: "6 pm",
  venue: "Dallas/Plano Marriott at Legacy Town Center",
  address: "7121 Bishop Road, Plano, Texas 75024",
  mapsUrl:
    "https://www.google.com/maps/search/?api=1&query=Dallas%2FPlano+Marriott+at+Legacy+Town+Center+7121+Bishop+Rd+Plano+TX",
  rsvpBy: "November 27, 2026",
  contactPhone: "(000) 000-0000",
  // ISO times for the calendar file, Central Time (UTC-6 in December)
  startsAt: "20261228T000000Z",
  endsAt: "20261228T050000Z",
};

export function calendarFile() {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//faatimahandnayeem.com//EN",
    "BEGIN:VEVENT",
    `UID:reception-${EVENT.startsAt}@faatimahandnayeem.com`,
    `DTSTAMP:${EVENT.startsAt}`,
    `DTSTART:${EVENT.startsAt}`,
    `DTEND:${EVENT.endsAt}`,
    "SUMMARY:Wedding reception of Nayeem & Faatimah",
    `LOCATION:${EVENT.venue}\\, ${EVENT.address}`,
    "URL:https://faatimahandnayeem.com",
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return "data:text/calendar;charset=utf-8," + encodeURIComponent(lines.join("\r\n"));
}
