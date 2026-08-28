# Painted Paws — Running To-Do

Tracked here so nothing falls through the cracks across sessions. Ask me to add, check off, or reprioritize anything — just say so in plain language.

## Open

- [ ] **Confirm migration 0067 has been run** (`supabase/migrations/0067_sign_waiver_notification_type.sql`) — adds the `sign_waiver` notification type. Until this runs, the new "please sign your waiver" email could fail when you book someone without a signed waiver on file.
- [ ] **Decide on Vercel/Supabase region fix** — Vercel functions run in `iad1` (DC), Supabase is in Canada Central. Measured 200–450ms extra latency per query. Options: upgrade to Vercel Pro + set region to `yyz1`, or leave as-is. No action needed from me until you decide.
- [ ] **Google Ads setup with new Dun & Bradstreet number** — I don't have login access to your Google Ads account, so this needs you at the keyboard. When you're ready, tell me whether you want me to (a) draft ad copy/campaign structure for you to paste in, or (b) walk you through the dashboard step-by-step live.

## Done (recent)
- [x] Confirmed tipping is not taxed — separate Stripe checkout, no tax line item, no code change needed (2026-08-26)
- [x] National Dog Day Canva-style post drafted as an artifact + caption (2026-08-26)
- [x] Retry fix for intermittent "logged in but can't see admin settings" (shipped 2026-08-25)
- [x] Sales tax added to Quick Quote tool
- [x] $5 short-coat breed discount (Bulldogs/Pit Bulls)
- [x] Weight categories updated (20/50/75/75+)
- [x] Coupon stacking (multi-coupon, still single-use each)
- [x] Requested→Confirm workflow removed; new mandatory waiver-signing email added
