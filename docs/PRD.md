# London Hustle: Product Requirements Document

**Product:** Japa Simulator: London Hustle
**Owner:** Tony Udomiaye
**Status:** Phase 1 in build · Phases 2–3 planned
**Last updated:** 18 October 2026

---

## 1. Summary

London Hustle is a free, browser-based 3D life simulator set in London. Players create a Memoji-style character, choose a starting life (Fresh Japa, Old Money or New Gen) and survive 60 days of London: rent, the Tube, jobs, visas, friends and the city's culture. It is inspired by the format of *Lagos Life* (lagoslife.app), which grew to millions of players in days by making a whole city feel personal and funny. London Hustle applies that format to London, with a strong diaspora ("japa") story at its centre.

## 2. Reference product: what Lagos Life does

A scan of lagoslife.app (public pages, Terms, Privacy Policy, public API responses and UI text in its public web bundle, 18 Oct 2026) shows:

| Area | What Lagos Life has |
|---|---|
| **Platform** | Next.js web app with a WebGL 3D city, installable as a PWA, plus iOS/Android apps ("Vatar: Life in Your City"). One account across web and app. 18+ only. |
| **World** | One isometric low-poly city with a lagoon, roads, palm trees, and ~40 landmark venues shown as emoji pins (Afrika Shrine, UNILAG, Eko Hotels, Ikoyi Golf Club, General Hospital, Police Station, Polling Unit, Church, Mosque, Market, Beach, Jibowu Park…). More Nigerian cities (Abuja, Port Harcourt, Kano) are referenced. |
| **Sim loop** | Needs (hunger, energy, hygiene, bladder, social, fun), moodlets ("Feeling Sick", "Lagos Heat"), skills (cooking, dance, music, coding), and an action queue: "tap objects, your Sim does them in order". |
| **Careers** | Multi-level careers (tech, banking with CIBN exams, law school, aviation, medicine, music) with promotions, short courses at UNILAG, and a gig board ("HANDI") for odd jobs. |
| **Home & property** | Housing tiers (boys' quarters → self-contain → mini-flat → duplex), rent and landlords, furniture and room building, land plots with titles (C of O). Live counters of homes and "Sea Plots". |
| **Money** | In-game naira, a phone with apps (Jobs, Invest, bank, loans, KYC/BVN jokes), betting and a casino, vehicles (okada, cars from a dealer). |
| **Society** | Dating, marriage, anniversaries, best friends ("Paddy Mi"), children and school events, church/mosque, hospitals and sickness. |
| **Crime & law** | Phone snatching, robbery, police divisions, jail, bail hearings, court. |
| **Politics** | Players elect a Governor each term. The Governor picks policies that change the rules for everyone (wage rises, tax holidays, shorter jail terms) and posts announcements to all players. |
| **Live & social** | Live "players online" and visit counters, a daily headline and tip, verified celebrity accounts, real advertisers on billboards and on "sea plots", a music partner (in-game album and "Game music" toggle). |
| **UI style** | Frosted white pill buttons over the 3D city, green call-to-action buttons, emoji place pins, a green announcement banner, and a bottom card for sign-up and actions. |

## 3. Goals

1. **Make London feel personal and funny.** Every place, price and event should be recognisable to someone who lives in, or moved to, London.
2. **Viral first session.** A new player understands the game within 30 seconds and finishes the session with something to share (an ending card, a funny moment).
3. **Look premium.** A complete 3D London with its real landmarks and Memoji-quality characters that people want to screenshot.
4. **Run anywhere.** Works on a phone browser with no install, loads fast, and works offline once loaded.

### Non-goals (for now)
- Real-money purchases or gambling with real value.
- Photorealism. The style is bright, low-poly and toy-like.
- A copy of Lagos Life's code, art or branding. We match the *format* and *feel*, with original work.

## 4. Audience

- **Primary:** Nigerians and other West Africans in the UK or planning to move ("japa"), aged 18–35.
- **Secondary:** Londoners and UK Gen Z who enjoy satire about rent, the Tube and the cost of living.
- **Tertiary:** Anyone who played Lagos Life and wants another city.

## 5. Player experience

### 5.1 First session
1. The title screen shows the living 3D city slowly panning behind a card: "Live your London story".
2. Character creation: a large Memoji-style 3D head that updates live while the player picks skin, hair, colours, headwear, glasses, facial hair, earrings and outfit.
3. The player chooses one of three lives:
   - **Fresh Japa:** lands at Heathrow on a student visa (20 hours of work a week). Goal: switch to a Skilled Worker visa by day 35, then save £3,000.
   - **Old Money:** Chelsea flat and an allowance until Pater cuts them off on day 15. Goal: £12,000 net worth.
   - **New Gen:** Peckham council flat with £2,000 of high-interest debt. Goal: clear the debt and save £2,500.
4. The player taps buildings to travel (Tube, bus, bike, walk, cab), takes actions, gets jobs and makes friends.
5. The game ends at day 60, or earlier through deportation or eviction, with a grade and a shareable result.

### 5.2 Core loop
Check needs → choose a place → travel (time and money) → take an action (time, money, needs, skills) → random London events → weekly bills on Monday.

## 6. Requirements

Priority: **P0** must ship in the phase, **P1** should ship, **P2** nice to have.

### Phase 1: Single-player London (static site, no backend), building now

| ID | Requirement | Priority |
|---|---|---|
| W1 | **Full London map**, placed from real coordinates (lat/long) with gentle compression of outer boroughs so the whole city fits. The Thames follows its real course, including the Isle of Dogs and Greenwich Peninsula loops. | P0 |
| W2 | **Monuments**, modelled individually: Big Ben and the Houses of Parliament, Westminster Abbey, London Eye, Buckingham Palace and the Victoria Memorial, Trafalgar Square and Nelson's Column, Piccadilly Circus lights, BT Tower, British Museum, St Paul's Cathedral, Millennium Bridge, Tate Modern, the Shard, Tower Bridge, Tower of London, the Gherkin, the Walkie-Talkie, the Cheesegrater, Canary Wharf, the O2, Cutty Sark, Royal Observatory, Thames Barrier, Battersea Power Station, Royal Albert Hall, Natural History Museum, Harrods, Kensington Palace, Wembley Stadium, Emirates Stadium, the London Stadium and the Orbit, Alexandra Palace, Crystal Palace transmitter, King's Cross, Heathrow, Camden Market, the Notting Hill pastel houses. | P0 |
| W3 | **Parks and green space:** Hyde Park and the Serpentine, Kensington Gardens, Green Park, St James's Park, Regent's Park, Hampstead Heath, Greenwich Park, Victoria Park, Battersea Park, Olympic Park. | P0 |
| W4 | **Street life:** red double-deckers, black cabs and river boats moving; red phone boxes, post boxes, plane trees, parody billboards. | P1 |
| W5 | **Day/night and weather:** lighting follows the in-game clock; rain is visible. | P1 |
| W6 | Camera: drag to pan, pinch/scroll to zoom, tap a building or pin to select; the camera follows the player when they travel. | P0 |
| A1 | **Memoji-style 3D avatar**: big glossy head, large expressive eyes with highlights, brows, ears, smile; chunky body. | P0 |
| A2 | Avatar options: 8 skin tones; 12 hairstyles (short, fade, afro, puffs, braids, locs, bob, long, curly, bun, mohawk, bald); 9 hair colours including fun colours; headwear (beanie, cap, bucket hat, beret, gele, hijab, turban); eyewear (round, square, sunglasses); facial hair (stubble, goatee, beard, moustache); earrings; 8 outfit colours. | P0 |
| A3 | The same avatar appears in creation (live 3D preview), the HUD (portrait), the world (full body) and the ending card. | P0 |
| G1 | 24 playable places, including new ones: Westminster, Covent Garden, Tower Hill, Greenwich, Notting Hill, South Kensington, Wembley and Battersea. | P0 |
| G2 | **Career levels:** jobs promote after enough shifts and skill, with new titles and higher pay (for example Barista → Shift Supervisor → Store Manager). | P1 |
| G3 | New jobs: tour guide (Westminster), bartender (Covent Garden). | P1 |
| G4 | **Daily headline** (parody newspaper "The Evening Hustle") and a tip in the ticker each morning, like Lagos Life's daily feed. | P1 |
| G5 | Keep the current systems: needs, skills, Tube fares with caps, strikes, the Night Tube, rent, debt, visas, friends with perks, events, endings, save in the browser. | P0 |
| P1 | Installable PWA (manifest and icon). | P2 |
| Q1 | Works at 390px phone width; no horizontal scrolling; readable in light and dark device modes. | P0 |
| Q2 | Smooth on a mid-range phone (aim for 30+ fps). | P1 |

### Phase 2: Live London (needs a backend: accounts, database, realtime)

| ID | Requirement | Priority |
|---|---|---|
| L1 | Accounts (email or social login), 18+ age gate, cloud saves. | P0 |
| L2 | **Live players** in the city: see other avatars, "Londoners online" counter. | P0 |
| L3 | Chat and "gist": local chat per place, friend requests, DMs with moderation and reporting. | P0 |
| L4 | **Mayor of London elections:** players stand, campaign and vote each term; the Mayor picks a policy that changes the rules for everyone (Tube fare freeze, rent cap, minimum wage rise, ULEZ charge) and posts announcements to the banner. | P1 |
| L5 | Shared property market: limited flats and "Thames plots" players can buy and rent out. | P1 |
| L6 | Real advertiser billboards and plots (self-serve booking, approval queue). | P2 |
| L7 | Verified creator accounts. | P2 |
| L8 | Daily headline written by an editor or generated, served from the API. | P2 |

### Phase 3: Deeper life sim

| ID | Requirement | Priority |
|---|---|---|
| D1 | Housing tiers (house share room → studio → one-bed → house) with furniture and a build mode. | P1 |
| D2 | Action queue: tap objects and the character walks there and does them in order. | P1 |
| D3 | Phone with apps: Jobs, Bank, Invest, Dating, Maps. | P1 |
| D4 | Dating, relationships and marriage; children and school. | P2 |
| D5 | Crime and justice: pickpockets, police, magistrates court, fines. | P2 |
| D6 | Healthcare: NHS GP waits, A&E, sickness moodlets. | P2 |
| D7 | Vehicles: Lime bikes, mopeds, cars and the congestion charge. | P2 |
| D8 | More cities: Manchester, Birmingham, plus a "fly home to Lagos" link-up. | P2 |
| D9 | Native app wrappers (iOS/Android). | P2 |

## 7. Look and feel

- **City:** bright low-poly London on a soft green ground, a blue Thames with sandy embankments, grey roads, white plots. Landmarks are larger than real scale so they read clearly from above.
- **Characters:** Memoji-inspired. Oversized rounded heads, large eyes with white highlights, soft glossy shading, simple friendly smiles. Original models, not Apple assets.
- **Interface:** frosted white pills, green primary buttons, emoji pins, a green announcement ticker, a bottom card for actions. Font: Plus Jakarta Sans.
- **Tone:** affectionate London and Naija humour. Brands are parodies (Prest, Primork, Delivaroo, Ubah, QuickCash).

## 8. Technical approach

- **Phase 1:** static HTML/CSS/JS with Three.js (r128 from cdnjs). No build step. Hosted on GitHub Pages or Vercel. Saves in `localStorage`.
- **Phase 2:** add a backend, for example Supabase (Postgres, auth, realtime) or Firebase. Websocket presence for live players, row-level security on all player data, rate limiting and moderation for chat.
- **Performance:** shared geometries and cached materials, instancing for trees and filler buildings, capped device pixel ratio, lower detail on phones.

## 9. Success metrics

| Metric | Phase 1 target |
|---|---|
| Players who finish character creation | 80% of visitors who press Start |
| Median first session | 10+ minutes |
| Players who reach an ending | 30% |
| Share clicks on the ending card | 15% of endings |
| Lighthouse performance (mobile) | 70+ |

## 10. Legal and safety notes

- Parody names for brands; real place names and landmarks are used descriptively.
- Do not reuse Lagos Life's or Apple's assets, code, names or logos. Do not use the TfL roundel or Underground logo.
- Phase 2 needs a privacy policy, terms, an 18+ gate, chat moderation and a reporting flow before launch.

## 11. Open questions

1. Should Phase 2 run on Supabase or Firebase?
2. Should the 60-day limit stay, or should the game become open-ended once multiplayer exists?
3. Should we add a music partner or licensed soundtrack, as Lagos Life did?
4. Should we monetise, and how (cosmetics, advertiser billboards)?
