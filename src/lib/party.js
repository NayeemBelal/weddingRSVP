// Shared labelling for party members. A sub-guest may be a named person, or an
// unnamed "wife" / "husband" / "son" / "daughter" tag when the couple doesn't know the name.

const ORDINALS = ["", "", "2nd", "3rd", "4th", "5th", "6th", "7th", "8th"];
const WORD = { wife: "wife", husband: "husband", son: "son", daughter: "daughter", child: "child" };
const PLURAL = { wife: "wives", husband: "husbands", son: "sons", daughter: "daughters", child: "children" };

/** Full name if any, otherwise empty string. */
export function memberName(m) {
  const n = `${m.first_name ?? ""} ${m.last_name ?? ""}`.trim();
  return n || (m.name ?? "") || "";
}

const possessive = (first) => (first ? `${first}${/s$/i.test(first) ? "'" : "'s"}` : "Their");

/**
 * Label as the guest sees it on the RSVP page: "Sadia Rahman", "Nayeem's wife",
 * "Bill's son", "Bill's 2nd son". `siblings` is the list this member belongs to,
 * `ownerFirst` is the invited guest's first name.
 */
export function memberLabel(m, siblings = [], ownerFirst = "") {
  const name = memberName(m);
  if (name) return name;
  const word = WORD[m.relation];
  if (!word) return "Guest";
  const same = siblings.filter((x) => x.relation === m.relation && !memberName(x));
  const i = same.indexOf(m);
  const ord = i > 0 ? `${ORDINALS[i + 1] || `${i + 1}th`} ` : "";
  return `${possessive(ownerFirst)} ${ord}${word}`;
}

/** Short label for the admin table: "Sadia Rahman", "Wife", "Son", "Daughter". */
export function memberShort(m) {
  const name = memberName(m);
  if (name) return name;
  const word = WORD[m.relation];
  return word ? word[0].toUpperCase() + word.slice(1) : "Guest";
}

/**
 * Second-person summary for texts: "you", "you and your wife",
 * "you, your wife and your 2 sons", "you, Sadia and your daughter".
 */
export function partySummary(subs = []) {
  const named = subs.map(memberName).filter(Boolean);
  const parts = ["you", ...named];
  for (const rel of ["wife", "husband", "son", "daughter", "child"]) {
    const n = subs.filter((s) => s.relation === rel && !memberName(s)).length;
    if (n === 1) parts.push(`your ${WORD[rel]}`);
    if (n > 1) parts.push(`your ${n} ${PLURAL[rel]}`);
  }
  if (parts.length === 1) return "you";
  if (parts.length === 2) return `${parts[0]} and ${parts[1]}`;
  return `${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]}`;
}
