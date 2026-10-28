# Ads policy — non-intrusive by design

Implementation: `src/features/ads/adConfig.ts`, `src/features/ads/AdSlot.tsx`.

## Where ads may appear

| Placement | Surface | Why it is low-stakes |
|---|---|---|
| `settings` | Settings page | Configuration, not a work flow; visited deliberately |
| `qa` | QA page | Internal/diagnostic audience |
| `rewards` | Rewards page | A natural pause point after progress review; content-rich (AdSense policy compliant); not part of any work flow |

Never: Tasks, Calendar, Budget entry, Routines, focus/Pomodoro, onboarding, the paywall/pricing page, or any screen with a running timer. Rationale: AdSense restricts ads on screens users are not looking at; and for this product, ads must never compete with the next action or the focus state (see `docs/research-manual.md` §2/§8).

## Non-intrusion guarantees (enforced in code)

1. **Static only.** No animation, autoplay, interstitials, pop-ups or anchors. A single labeled card (`<aside>` with "Advertisement" / "From Gylio" label).
2. **Frequency-capped.** House ads render at most `HOUSE_AD_SESSION_CAP` (3) times per placement per browser session (`sessionStorage` counter). Beyond the cap the slot renders nothing.
3. **No layout shift.** AdSense units reserve `ADSENSE_MIN_HEIGHT` (100px) so filling never pushes content (CLS guard — also protects ad quality score).
4. **Clearly labeled.** Sponsored vs. house ("From Gylio") are labeled differently; house cards link to `/pricing` (upgrade), never to third parties.
5. **Pro has no ads.** The slot renders nothing for accounts with the `ad_free` feature.
6. **One impression per mount.** Ref-guarded against React StrictMode double effects, so dev analytics don't inflate CTR.

## Providers

- **house** (default): Gylio's own Pro-upsell cards. Daily rotation (`houseAdIndex`) keeps one creative per day — no flicker between renders.
- **adsense**: only when `VITE_ADS_PROVIDER=adsense` and both `VITE_ADSENSE_CLIENT` and `VITE_ADSENSE_SLOT` are set. Test mode (`VITE_ADS_TEST_MODE=true` or dev) sets `data-adtest="on"` — test ads never earn and never count as invalid traffic.
- **off**: no ads anywhere.

## Measurement

`ad_impression` and `ad_click` events (provider, placement, creative) flow through the standard analytics pipeline to `/api/analytics/events`. The admin Analytics tab reports impressions, clicks and CTR per provider/placement. Decisions (new placements, cap changes) should be made on this data, with retention as the guardrail metric.

## Economics (honest framing)

Display revenue at this scale is a trickle (typical AdSense RPM $1–5). The primary monetization lever is the house card driving Pro conversion; AdSense exists to monetize the free tier's leftover inventory without adding intrusion. Any change that raises revenue by raising intrusion is rejected by policy — the cap and placement list are the guardrails.
