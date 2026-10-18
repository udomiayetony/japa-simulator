# London Hustle: Product Requirements Document

**Product:** London Hustle
**Owner:** Tony Udomiaye
**Status:** Phase 1 complete · Better than Lagos Life batch built (18 Oct 2026) · Phase 2 in build (Supabase) · Phase 3 planned · Phase 4 approved (18 Oct 2026)
**Last updated:** 18 October 2026

---

## 1. Summary

London Hustle is a free, browser-based 3D life simulator set in London. Players create a Memoji-style character, choose where they are from and a starting life (Fresh Immigrant, Old Money or New Gen) and survive 60 days of London: rent, the Tube, jobs, visas, friends and the city's culture. It is inspired by the format of *Lagos Life* (lagoslife.app), which grew to millions of players in days by making a whole city feel personal and funny. London Hustle applies that format to London, with immigrant success stories at its heart: London is a city built by people who arrived with very little and made it.

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

- **Primary:** Immigrants and children of immigrants in the UK, and people planning to move here, from every country, aged 18–35.
- **Secondary:** Londoners and UK Gen Z who enjoy satire about rent, the Tube and the cost of living.
- **Tertiary:** Anyone who played Lagos Life and wants another city.

## 5. Player experience

### 5.1 First session
1. The title screen shows the living 3D city slowly panning behind a card: "Live your London story".
2. Character creation: a large Memoji-style 3D head that updates live while the player picks skin, hair, colours, headwear, glasses, facial hair, earrings and outfit.
3. The player chooses one of three lives:
   - **Fresh Immigrant:** "Just landed in London with an immigrant visa." Arrives at Heathrow on a starter visa (20 hours of work a week). Goal: switch to a Skilled Worker visa by day 35, then save £3,000.
   - **Old Money:** Chelsea flat and an allowance until Pater cuts them off on day 15. Goal: £12,000 net worth.
   - **New Gen:** Peckham council flat with £2,000 of high-interest debt. Goal: clear the debt and save £2,500.
4. The player picks **where they are from**, by flag: the country they moved from (Fresh Immigrant) or their family roots (Old Money and New Gen, UK by default). The flag shows next to their name, on the ending card and in the share text, and the "fly home" trip and family calls use it.
5. A 60-second **guided start** walks them through their first play: tap a place, pick how to get there, eat something, apply for a job. They can skip it at any time.
6. The player taps buildings to travel (Tube, bus, bike, walk, cab), takes actions, gets jobs and makes friends. The 🎯 goal tracker always shows the next step, and the 💡 button sells hints.
7. The game ends at day 60, or earlier through deportation or eviction, with a grade and a shareable result.

### 5.2 Core loop
Check needs → choose a place → travel (time and money) → take an action (time, money, needs, skills) → random London events → weekly bills on Monday.

## 6. Requirements

Priority: **P0** must ship in the phase, **P1** should ship, **P2** nice to have.

### Phase 1: Single-player London (static site, no backend), complete

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
| S1 | **Fresh Immigrant** replaces the Lagos-specific "Fresh Japa" story: universal immigrant story, "starter visa" wording, "fly home" and family events. | P0 |
| S2 | **Country picker with flags** for every life (about 50 countries, searchable). Flag shown in the HUD, ending card and share text. | P0 |
| E1 | **Rendering engine upgrade** (Three.js 0.169): physically based materials, ACES filmic tone mapping, environment lighting from a sky. | P0 |
| E2 | Real-time soft shadows from the sun, which follows the camera; drifting cloud shadows. | P0 |
| E3 | Ambient occlusion (GTAO) for soft contact shadows; bloom for night lights. | P1 |
| E4 | Reflective glass towers and water; lit windows across the city at night. | P1 |
| E5 | Glossy clear-coat materials and studio lighting for characters. | P1 |
| E6 | Graphics setting (High, Medium, Low), automatically Medium on phones. | P0 |
| Q1 | Works at 390px phone width; no horizontal scrolling; readable in light and dark device modes. | P0 |
| Q2 | Smooth on a mid-range phone (aim for 30+ fps). | P1 |

### Phase 2: Live London (Supabase: accounts, database, realtime), in build

| ID | Requirement | Priority |
|---|---|---|
| L1 | Accounts (email or social login), 18+ age gate, cloud saves. | P0 |
| L2 | **Live players** in the city: see other avatars, "Londoners online" counter. | P0 |
| L3 | Chat and "gist": local chat per place, friend requests, DMs with moderation and reporting. | P0 |
| L4 | **Mayor of London elections:** players stand, campaign and vote each term; the Mayor picks a policy that changes the rules for everyone (Tube fare freeze, rent cap, minimum wage rise, ULEZ charge) and posts announcements to the banner. | P1 |
| L5 | Shared property market: limited flats and "Thames plots" players can buy and rent out. | P1 |
| L6 | Account types (player, creator, brand) so Phase 4 can build on them. | P1 |
| L7 | Verified creator accounts and public player profiles (follower counts, reach), needed for brand collaborations. | P1 |
| L8 | Daily headline written by an editor or generated, served from the API. | P2 |

**Phase 2 build status (18 Oct 2026):** L1–L7 built and tested end to end against the live Supabase project (eu-west-2, London). L8 has a `headlines` table that the game reads; writing headlines is done in the Supabase dashboard for now.

Known limits to fix before Phase 4 money flows: the in-game economy is still client-side (a determined player could edit their own save), so property prices and rent are game money only. Phase 4 earnings are based on reach and campaigns, not in-game money, but anything that pays out real money must be calculated on the server.

### Better than Lagos Life (approved and built, 18 Oct 2026)

Approved by Tony on 18 Oct 2026: A1–A3, B1–B3, C1–C3 and D1–D6. Not approved, so not built: A4–A6, B4–B11 and C4–C8.

**A. Hints that cost money**

| ID | Requirement | Status |
|---|---|---|
| A1 | A 💡 "Next step" button suggests the best next move for the player's situation: their needs, visa clock, job, debt, rent day and goal. | Built |
| A2 | Hints cost in-game money, and the fee is shown before the player pays: **basic £5** (one line), **detailed £20** (where to go, how to get there and why), **money tip 5% of cash, capped at £200** (minimum £2). | Built |
| A3 | Hints are free for the first 2 game days. The help screen and the goal tracker are always free. | Built |

**B. Easy to start, hard to put down**

| ID | Requirement | Status |
|---|---|---|
| B1 | A 60-second guided start instead of a wall of help text: tap a place → pick how to travel → eat → apply for a job. Each step highlights what to tap; Skip is always there. | Built |
| B2 | A goal tracker always on screen, for example "🎯 Next: Get a job that sponsors visas (step 2 of 4)". Four steps per life; tapping it opens hints. | Built |
| B3 | A daily login reward with a streak (one per real day): £20, 3 meals, £40, coffee and croissant, £60, £80, and on day 7 a rare outfit colour that can't be picked anywhere else. Streaks are kept in the browser and in the cloud save. Outfits are changed in Me → Wardrobe. | Built |

**C. A London you can recognise**

| ID | Requirement | Status |
|---|---|---|
| C1 | Visible trains on their own tracks in line colours: Tube lines (Central red, Jubilee grey, and so on), Overground, Elizabeth line and rail, and the DLR on a raised viaduct. When the player takes the Tube, they ride a train in the line's colour along the real route, changing colour at each change of line. Buses and cabs are shown the same way. | Built |
| C2 | An Underground entrance at every place, in our own design (a navy sign with a mint stripe and the station name), **not** the TfL roundel, which is a registered trade mark. Plus the nine mainline termini at their real positions: Paddington, Euston, St Pancras, Liverpool Street, Waterloo, Victoria, London Bridge, Marylebone and Charing Cross. | Built |
| C3 | Thames bridges at their real positions, spanning the river at right angles: Hammersmith, Battersea, Albert, Chelsea, Vauxhall, Lambeth, Westminster, Waterloo, Blackfriars, Southwark and London Bridge, in arch, beam or suspension styles and their real colours. Roads and railways that cross the river now go over bridges, and traffic rises over them. | Built |

**D. Depth and polish**

| ID | Requirement | Status |
|---|---|---|
| D1 | Walking characters: the player walks the streets with swinging arms and legs (no more hopping), Londoners walk the pavements and parks, and other live players walk across the map to where they go. | Built |
| D2 | A home to decorate: a 3D room you furnish and paint (12 pieces of furniture, 7 wall colours). Furniture adds comfort, which improves sleep and home time; the sofa unlocks "Have friends round", the desk unlocks "Study coding at home", the bed gives more energy and the telly is more fun. First version of the Phase 3 housing item. | Built (first version) |
| D3 | Weather events with gameplay effects, by season: snow days (Dec–Feb: buses slower, no cycling, snowmen and snowball fights, delivery riders earn 30% more), heatwaves (Jun–Aug: the Tube is a sauna, ice creams), Thames fog (Oct–Mar: the Woolwich Ferry stops, cabs crawl). Each is visible in the 3D city: falling snow and white parks, thick fog, warm light. | Built |
| D4 | A real London calendar. The game starts on the real date you start playing and follows the calendar: London Marathon, Pride, Notting Hill Carnival (August bank holiday weekend), Halloween, Bonfire Night fireworks over Battersea Park, Christmas lights on Oxford Street (with the Trafalgar Square tree), Winter Wonderland, Christmas Day (no Tube or buses), Boxing Day sales and New Year's Eve fireworks over the Thames. Each event has an announcement, something to do at its place and 3D visuals. | Built |
| D5 | Speed: the city appears fast, then adds detail as you play. The core city (river, parks, roads, the 24 places) draws first; landmarks, stations, bridges, railways, filler buildings, traffic, trains and people stream in over the next frames; glow and shading switch on once everything has loaded. Game scripts download in parallel and Supabase no longer delays the start. Measured with software rendering (no graphics chip): title in under 1 second, first 3D frame in 2.0–2.5 seconds on a phone-sized screen. | Built |
| D6 | Accessibility: a Bigger text option, colour-blind-safe need rings and bars (blue and orange with a "!" when low), full keyboard play (arrows or WASD to move the map, + and - to zoom, P for a list of places, 1–9 for actions, H for hints, M for the menu, Esc to close), visible focus outlines, screen-reader labels on the need rings, and reduced motion when the device asks for it. | Built |

### Phase 3: Deeper life sim

| ID | Requirement | Priority |
|---|---|---|
| D1 | Housing tiers (house share room → studio → one-bed → house) with furniture and a build mode. (Furniture and decorating are now built; tiers and moving home are not.) | P1 |
| D2 | Action queue: tap objects and the character walks there and does them in order. | P1 |
| D3 | Phone with apps: Jobs, Bank, Invest, Dating, Maps. | P1 |
| D4 | Dating, relationships and marriage; children and school. | P2 |
| D5 | Crime and justice: pickpockets, police, magistrates court, fines. | P2 |
| D6 | Healthcare: NHS GP waits, A&E, sickness moodlets. | P2 |
| D7 | Vehicles: Lime bikes, mopeds, cars and the congestion charge. | P2 |
| D8 | More cities: Manchester, Birmingham, plus "fly home" link-ups with other city games. | P2 |
| D9 | Native app wrappers (iOS/Android). | P2 |

### Phase 4: Brand marketplace (approved 18 Oct 2026)

**Goal:** let businesses advertise inside London Hustle and collaborate with players, with players sharing in the revenue. Builds on Phase 2 accounts and profiles.

#### 4.1 Revenue products and splits (agreed 18 Oct 2026)

| Product | What the brand buys | Revenue split |
|---|---|---|
| **Ad spaces** | Public billboards, Thames plots, bus wraps, Tube posters, venue sponsorship (e.g. "ASOS Covent Garden") | **Platform 100%** |
| **Player-owned placements** | A billboard on a player's house roof or shopfront | **Property owner 25% / platform 75%** |
| **Creator collaborations** | A chosen player wears the brand's items, brands their home and posts from inside the game | **Creator 70% / platform 30%**. Verified top creators: **80% / 20%** |
| **Brand drops** | Free branded items available to every player | **Platform 100%** (players get the items free) |
| **Community pool** | Funded from ad spaces and brand drops | **3% of that revenue**, shared monthly among active players by playtime |

Splits apply to net revenue, after payment processing fees (roughly 2–3%). Brands may add a performance bonus through their own affiliate links (for example 5% of tracked sales), paid on top of the campaign fee.

**Worked example: an ASOS fall launch with one creator, £10,000.**

| Part | Price | Creator gets | Platform gets |
|---|---|---|---|
| Character wears the line + 3 in-game posts | £8,000 | £5,600 (70%) | £2,400 |
| Rooftop billboard on the creator's house for 4 weeks | £2,000 | £500 (25%) | £1,500 |
| **Total** | **£10,000** | **£6,100** | **£3,900** |

#### 4.2 Requirements

| ID | Requirement | Priority |
|---|---|---|
| M1 | **Brand accounts** with company verification (company number, website, contact) and a brand dashboard. | P0 |
| M2 | **Ad inventory and booking:** a map of available ad spaces with format, size, location, audience estimate and price; book by the week; upload artwork; see live status. | P0 |
| M3 | **Pricing:** fixed weekly prices per space to start (premium for central London and landmarks), moving to impressions-based (CPM) pricing once traffic data exists. | P1 |
| M4 | **Player-owned ad slots:** players who own or rent a home can opt in to a rooftop billboard slot, set a minimum price, and approve or decline every booking. | P0 |
| M5 | **Creator marketplace:** creators opt in with a profile (reach, audience, style, rates); brands search, send a brief and an offer; creators accept, counter or decline. | P0 |
| M6 | **Campaign delivery in the game:** branded outfits and items appear on the creator's avatar, branding on their home, and sponsored posts, all for the agreed dates. | P0 |
| M7 | **Brand drops:** brands publish free items (outfits, accessories, furniture) to every player's wardrobe for a set period. | P1 |
| M8 | **Reporting:** impressions, unique viewers, time in view, clicks on "Shop the look" links, sales from affiliate links where the brand shares them. | P0 |
| M9 | **Payouts:** creator earnings dashboard, payouts through a regulated provider (e.g. Stripe Connect), £50 minimum, paid 30 days after a campaign ends; earnings held if fraud is suspected. | P0 |
| M10 | **Community pool:** 3% of ad-space and brand-drop revenue, shared monthly among active players by playtime; paid as real money above the payout minimum, otherwise rolled over. | P1 |
| M11 | **Review and brand safety:** every ad and campaign is reviewed before going live; banned categories (gambling, adult, weapons, political ads); alcohol limited and never near young-looking content; players can hide any ad they find offensive. | P0 |
| M12 | **Clear labelling:** every sponsored item, billboard and post shows "Ad" or "Paid partnership", in line with the UK CAP Code. | P0 |

#### 4.3 Who can earn
- Earning players must be 18+, identity-verified, and accept creator terms. Real-money payouts go to **verified creators only** at launch.
- Tax: the UK requires digital platforms to report sellers' earnings to HMRC (the OECD model reporting rules). The payout provider collects the details; players are responsible for their own tax.
- Anti-fraud: no paying for views from bots or alt accounts; impression counting excludes idle and duplicate sessions.

#### 4.4 Out of scope for Phase 4
- Programmatic ad networks and third-party ad tracking (no ad tracking across other sites, matching our privacy stance).
- Selling player data to brands. Brands see aggregated reporting only.

## 7. Look and feel

- **City:** bright low-poly London on a soft green ground, a blue Thames with sandy embankments, grey roads, white plots. Landmarks are larger than real scale so they read clearly from above.
- **Characters:** Memoji-inspired. Oversized rounded heads, large eyes with white highlights, soft glossy shading, simple friendly smiles. Original models, not Apple assets.
- **Interface:** frosted white pills, green primary buttons, emoji pins, a green announcement ticker, a bottom card for actions. Font: Plus Jakarta Sans.
- **Tone:** affectionate London humour that celebrates the city's many cultures and its immigrant success stories. Brands are parodies (Prest, Primork, Delivaroo, Ubah, QuickCash).

## 8. Technical approach

- **Phase 1:** static HTML/CSS/JS with Three.js 0.169 (ES modules from jsDelivr, loaded through an import map) and its post-processing add-ons. No build step. Hosted on GitHub Pages or Vercel. Saves in `localStorage`.
- **Phase 2:** add a backend, for example Supabase (Postgres, auth, realtime) or Firebase. Websocket presence for live players, row-level security on all player data, rate limiting and moderation for chat.
- **Performance:** shared geometries and cached materials, instancing for trees, filler buildings and walking Londoners, capped device pixel ratio, a graphics setting that turns off ambient occlusion and shadows on weaker devices, and a staged world build so the first frame appears before the detail.
- **Phase 4:** payments and payouts through Stripe Connect (identity checks, payouts, tax reporting data); ad artwork stored and served by our own backend; an admin review queue.

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
- Phase 4 needs advertiser terms, creator terms, an ad review policy, CAP Code-compliant labelling, and HMRC platform reporting through the payout provider.

## 11. Open questions

1. ~~Should Phase 2 run on Supabase or Firebase?~~ Decided: Supabase.
2. Should the 60-day limit stay, or should the game become open-ended once multiplayer exists?
3. Should we add a music partner or licensed soundtrack, as Lagos Life did?
4. Phase 4: what weekly price should the first ad spaces launch at? (Suggestion: £50–£500 per week depending on location, reviewed after the first month of traffic data.)
5. Phase 4: should brand drops be free for players forever, or limited-time items that create urgency?
