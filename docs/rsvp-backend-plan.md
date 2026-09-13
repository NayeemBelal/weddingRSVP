# RSVP management system: plan

Status: Phases 1, 2 and 3 built. Texting is live through Twilio.

Decisions made:
- Hosting: Netlify. SPA redirect is in `netlify.toml`. Set `VITE_SUPABASE_URL`
  and `VITE_SUPABASE_KEY` in Netlify environment variables (values in `.env`).
- Admin login: email and password, one account created in Supabase Auth.
- Phones: US only, stored as E.164.
- Texting: Twilio toll-free number (not Telnyx).
- Kids and dietary fields: left out.

## What the best tools get right

Looked at Zola, Joy, The Knot, RSVPify, GuestlistOnline and Text My Wedding.
The patterns that make them feel easy:

- **The household is the unit, not the person.** Zola and Joy group a family
  into one party. One person replies for everyone, and the list shows both the
  party and each individual. That is exactly your guest + sub-guests model.
- **Status is derived, never typed.** When a guest replies on the site, the
  list updates on its own. The couple only overrides by hand when someone
  replies by text or in person.
- **The dashboard is a single strip of numbers** above the table: invited,
  attending, declined, pending. Everything else is a filter on the table.
- **Reminders go only to people who haven't replied.** Text My Wedding's whole
  product is "text the pending list". That is the Twilio feature to build first.
- **Guests can fix their own mistakes.** Coming back to the RSVP page and
  replying again replaces the old reply. No "contact the couple to change it".
- **Everything is one table, and the row is the front door.** Click a row,
  edit the household in a side panel, never leave the page.

## What we are building

Three parts, sharing one Supabase project.

1. **Guest RSVP flow** on the public site. Search by name, tick who is coming,
   leave a note. Also reachable through a personal link in each text message
   so the family is pre-selected.
2. **Admin** at `/admin`, behind a login for the two of you. Table of every
   household, a side panel to edit one household, a Notes tab, a Messages tab,
   and a stats strip.
3. **Texting** through Twilio. Invitations, reminders to the pending list,
   confirmations after a reply, and inbound replies logged against the guest.

## Data model

Vocabulary follows yours: a **guest** is the person you invited and have a
phone number for. **Sub-guests** are the people they bring. Together they are
a **party**.

```
guests
  id              uuid, primary key
  first_name      text
  last_name       text
  phone           text, unique, stored as E.164 (+12145550101)
  attending       boolean, null until they reply
  responded_at    timestamp, null until they reply
  invite_code     short random text, unique, used in personal links
  side            'bride' | 'groom' | null          (optional filter)
  group_label     text, null                        (e.g. "Family", "Work")
  created_at, updated_at

sub_guests
  id              uuid
  guest_id        -> guests
  first_name, last_name
  attending       boolean, null until the party replies
  sort_order      int

notes
  id, guest_id -> guests, body text, created_at
  (one row per reply that included a note, so history is kept)

messages
  id, guest_id -> guests
  direction       'outbound' | 'inbound'
  body            text
  status          'queued' | 'sent' | 'delivered' | 'failed' | 'received'
  twilio_id       text
  template        text, null   (e.g. "invite", "reminder", "confirmation")
  created_at

message_templates
  key, body (with {{first_name}} style placeholders), updated_at

activity
  id, guest_id, actor ('guest' | admin email | 'system'), event text, created_at
  (e.g. "replied: 3 attending", "phone changed", "reminder sent")
```

Party status is computed from the rows, not stored:

| Status | Rule |
|---|---|
| Pending | guest.responded_at is null |
| Attending | responded and at least one person in the party is attending |
| Declined | responded and nobody in the party is attending |

Headcount = count of people in the party with attending = true.

## Security model

The public site never reads the tables directly. Two Postgres functions do
the work, so a guest can only ever see and change their own party:

- `search_parties(query)` returns id, party label and member first names for
  matches. Nothing else. Requires at least 2 characters.
- `submit_rsvp(guest_id or invite_code, responses, note)` writes attending
  flags, the note, responded_at, and an activity row.

Row level security is on for every table. Only a logged-in admin (Supabase
Auth, email and password, two accounts) can read or write directly.
Twilio webhooks hit an edge function that checks the Twilio signature before
touching the database.

## Admin screens

**Guests (default tab)**

- Stats strip: Invited parties, People invited, Attending, Declined, Pending,
  Reply rate.
- Table columns: Name, Phone, Party (names of sub-guests), Attending / Total,
  Status, Replied, Last message. Sortable. Search box. Filter chips for status
  and side.
- Row click opens a side panel:
  - Edit first name, last name, phone.
  - Sub-guests list: add, rename, remove, reorder.
  - Attendance toggles per person, so you can record a reply someone gave you
    by text or in person. Marks responded_at and logs "set by admin".
  - Notes from this household.
  - Message history with this number, and a "Send text" box with templates.
  - Copy personal RSVP link.
  - Delete household, with confirmation.
- Add guest button opens the same panel empty.
- Import from CSV (First, Last, Phone, Sub-guests separated by semicolons)
  and Export to CSV.

**Notes tab**

- Every note, newest first, with the household name and date. Click through
  to the household.

**Messages tab**

- Templates: Invitation, Reminder, Confirmation, Day-before. Editable.
- Send to: Everyone, Pending only, Attending only, or a hand-picked set.
  Preview with real names before sending. Confirmation step shows the count.
- Log of every sent and received text, with delivery status.
- Inbound replies: anything a guest texts back shows here and on their
  household. A "YES" or "NO" reply from a one-person party can be recorded
  as their RSVP automatically, everything else just gets logged for you to
  read.

**Settings**

- RSVP deadline. After it passes the public form shows "RSVPs are closed,
  text us" instead of the form. You can still edit in admin.
- Contact number shown on the site.
- Admin accounts.

## Phases

**Phase 1: real RSVPs (replaces the mock data)**

1. Tables, RLS, and the two functions above, applied as migrations.
2. Public RSVP page talks to Supabase: search, submit, re-submit.
3. Personal link support: `/rsvp?c=CODE` skips the search.
4. Seed with your real list once you send a CSV.

**Phase 2: admin**

1. Login page and route guard.
2. Guests table, stats strip, side panel with full editing.
3. Notes tab. CSV import and export.

**Phase 3: texting**

1. Edge function `send-sms` that calls Twilio and logs to messages.
2. Edge function `twilio-webhook` for delivery status and inbound texts.
3. Messages tab: templates, bulk send to a filter, log.
4. Automatic confirmation text after a guest replies on the site.

**Phase 4: extras, only if wanted** (see brainstorm)

## Brainstorm: things worth adding

Ranked by how much they help for the effort.

1. **Personal RSVP links in every text.** Removes the name search for most
   guests and prevents the wrong family being picked. Cheap, high value.
2. **Confirmation text after replying.** "Thanks, we have you down for 3."
   Guests trust it, and you get fewer "did it go through?" texts.
3. **RSVP deadline with a soft close.** Form closes, admin still edits.
4. **Scheduled reminders.** A cron edge function that texts the pending list
   on dates you choose, with a preview the day before it fires.
5. **Dietary or accessibility field per person.** Right now it is a free
   note. A per-person field is easier to hand to the caterer.
6. **Kids flag on sub-guests.** Gives you a child headcount for the venue and
   kids' meals.
7. **Side and group labels.** Filter the table by bride/groom family, or by
   "Work", so each of you can chase your own pending list.
8. **Activity log.** Every change with who did it, so two people editing the
   same list never wonder what happened.
9. **Undo on delete.** Soft-delete households for 30 days.
10. **Wall of notes on the site** (optional, later). Show selected guest notes
    publicly, like a guestbook.
11. **Table assignments and day-of check-in.** Useful but a separate project.
    Zola and Fotify do it. Skip unless you want it.
12. **Contact collector link.** A public form where people you don't have a
    number for can send it to you. Joy and Zola both offer this.

## How texting works

- Admin sends (Messages tab, or a guest's Text tab) call the `send-sms`
  edge function, which writes one queued row per guest to `messages`.
- `process-queue` drains up to 100 queued rows per run. pg_cron runs it every
  minute, and small sends (25 or fewer) trigger it immediately. Twilio
  toll-free numbers send at 3 per second, so 100 per minute is well inside
  the limit and 600 texts take about 6 minutes.
- `twilio-webhook` receives delivery status and inbound texts, verifies the
  Twilio signature, logs everything, and records a plain YES or NO from a
  party of one as their reply.
- After a guest replies on the site, the database queues a confirmation text.
- Secrets (Twilio SID, auth token, from number, site URL, internal secret)
  live in Supabase Vault, read by the functions through `internal_secrets()`.
- Function sources are mirrored under `supabase/functions/`.

## Still open

1. **RSVP deadline.** November 27, 2026 is the placeholder, editable in
   admin Settings.
2. **Toll-free verification.** Twilio requires toll-free numbers to be
   verified for US messaging or carriers filter the texts. Confirm
   (833) 605-8411 shows as verified in the Twilio console before the first
   bulk send.

## Sources

- Zola guest list: https://www.zola.com/wedding-planning/guests
- Zola help, guest list tool: https://www.zola.com/faq/115002148572-what-is-the-guest-list-tool-
- Joy guest list: https://withjoy.com/guest-list/
- Joy help, plus ones and parties: https://withjoy.com/help/en/articles/8343360-adding-plus-ones-and-parties
- GuestlistOnline comparison: https://www.guestlistonline.com/blog/best-guest-list-manager-tools-compared
- Text My Wedding, reminder texts: https://text-my-wedding.com/blog/how-to-send-rsvp-text
- VowConnection app roundup: https://vowconnection.com/best-wedding-guest-list-manager-apps-2026/
