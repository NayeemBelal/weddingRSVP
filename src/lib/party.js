// Shared labelling for party members. A sub-guest may be a named person, or an
// unnamed "wife" / "child" tag when the couple doesn't know the name yet.

const ORDINALS = ["", "", "2nd", "3rd", "4th", "5th", "6th", "7th", "8th"];

/** Full name if any, otherwise empty string. */
export function memberName(m) {
  const n = `${m.first_name ?? ""} ${m.last_name ?? ""}`.trim();
  return n || (m.name ?? "") || "";
}

/**
 * Label as the guest sees it on the RSVP page: "Sadia Rahman", "Your wife",
 * "Your child", "Your 2nd child". `siblings` is the list this member belongs to.
 */
export function memberLabel(m, siblings = []) {
  const name = memberName(m);
  if (name) return name;
  if (m.relation === "wife") return "Your wife";
  if (m.relation === "child") {
    const kids = siblings.filter((x) => x.relation === "child" && !memberName(x));
    const i = kids.indexOf(m);
    return i > 0 ? `Your ${ORDINALS[i + 1] || `${i + 1}th`} child` : "Your child";
  }
  return "Guest";
}

/** Short label for the admin table: "Sadia Rahman", "Wife", "Child". */
export function memberShort(m) {
  return memberName(m) || (m.relation === "wife" ? "Wife" : m.relation === "child" ? "Child" : "Guest");
}

/**
 * "you", "you and your wife", "you, your wife and 2 children",
 * "you, Sadia and your child". Used for the {{party}} placeholder in texts.
 */
export function partySummary(subs = []) {
  const named = subs.map(memberName).filter(Boolean);
  const wife = subs.some((s) => s.relation === "wife" && !memberName(s));
  const kids = subs.filter((s) => s.relation === "child" && !memberName(s)).length;
  const parts = ["you", ...named];
  if (wife) parts.push("your wife");
  if (kids === 1) parts.push("your child");
  if (kids > 1) parts.push(`your ${kids} children`);
  if (parts.length === 1) return "you";
  if (parts.length === 2) return `${parts[0]} and ${parts[1]}`;
  return `${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]}`;
}
