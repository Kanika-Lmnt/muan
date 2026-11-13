# Paisaidee launch checklist

Kar's list of what has to happen before Paisaidee goes public, and what to
keep an eye on after. Tick things off by changing `[ ]` to `[x]`.

## The 3 must-dos for the legal pages

- [ ] **Fill in the brackets** in `legal/privacy.html` and `legal/terms.html`:
  - `[operator]`: your full name, or your business name once it's registered.
  - `[contact email]`: an address you check, ideally a separate one such as
    hello@paisaidee.app once the domain is bought. Not your personal Gmail.
  - Terms section 16: choose whether the Lao or the English version wins if
    the two translations ever differ. Lao is the safer choice for users in
    Laos, but then the Lao text has to be checked carefully.
  - Then delete the yellow "Draft" banner on both pages.
- [ ] **Translate and check**: put the "short version" boxes into Lao (ideally
  the whole pages), and have someone who knows Lao law read both. The
  relevant law is the Law on Electronic Data Protection (2017). Claude is not
  a lawyer: the pages are a careful draft written from what the code does,
  not legal advice.
- [ ] **Delete my account button** inside the app. Apple requires in-app
  account deletion for any app with sign-up. Until it exists, the policy
  says to email, and you must actually delete within 30 days when asked.

## Before the App Store

- [ ] **Sign in with Apple.** Apple's rules say an iPhone app that offers
  Google sign-in must also offer Sign in with Apple (or a similar
  privacy-focused option). Plan it into stage 3.
- [ ] **Age rating 17+** when filling in the App Store form, because the app
  lists bars and alcohol.
- [ ] Privacy "nutrition label" in App Store Connect: answer it from
  `legal/privacy.html`. The two must match.
- [ ] Buy and attach paisaidee.app (also needed for Google sign-in in the app).

## Things to be wary of

**Promises.** Everything the app or these pages promise has to stay true.
A broken promise is the easiest thing for someone to use against you.
- If you add something that collects new data (friends, analytics, push
  notifications, comments), update the Privacy Policy **before** it ships.
- "Sponsored" must always be on paid placements. Never sell a spot in
  ແນະນຳ / Top lists without the label.
- Deletion requests: do them, within 30 days, and keep a note that you did.
- The welcome now says places are "added by hand", not "checked by us",
  because the newer venues are still unverified. Keep claims modest.

**Photos.** The biggest real risk. Only your own photos, or ones a venue said
yes to. Keep the message where they said yes (a screenshot is fine) in case
anyone asks later.

**Venue owners.** Before giving someone edit access, make sure they really
run the place. A fake "owner" could change a real business's hours or photos.

**Prizes and giveaways.** Rewards for doing something ("get the Bar Hopper
badge, get a free drink") are fine. Random draws ("check in to enter, one
winner gets...") can count as a lottery, which usually needs permission.
Ask before running one. The same goes for paid alcohol promotions: alcohol
advertising can have its own rules.

**Low numbers.** "1 person this month" on a quiet venue could let someone
guess who went. Consider hiding counts below 3.

**The business itself.** Once money comes in (sponsored slots, partners),
register a business and put its name in the terms as the operator, so the
responsibility sits with the business, not you personally. Also check
whether "Paisaidee" can be registered as a trademark with the Department of
Intellectual Property.

**Security.** The secrets in Cloudflare (Google, Cloudinary, OpenRouteService,
Cloudflare API token) must never go in the code or in screenshots. If one
leaks, change it straight away.
