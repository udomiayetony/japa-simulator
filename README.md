# 👑 London Hustle

A free 3D browser life sim about surviving 60 days in London. Pan around a low-poly London, tap a building to go there, and hustle. Nothing to download, nothing to install.

## Pick your London life

Choose where you're from (about 50 countries, shown by flag), then one of three lives:

| Background | Start | Goal |
|---|---|---|
| ✈️ **Fresh Immigrant** | Just landed in London with an immigrant visa. £1,200, a room in Woolwich, a 20-hour work cap. | Switch to a Skilled Worker visa before day 35, then save £3,000. |
| 🎩 **Old Money** | Chelsea flat, family trust, weekly allowance... until Pater cuts you off. | Build a £12,000 net worth on your own. |
| 🧢 **New Gen** | Council flat in Peckham, £2,000 owed to QuickCash Loans at 2% a week. | Clear the debt and save a £2,500 deposit. |

## What's in the world

- **The full London map**, placed from real coordinates: the Thames follows its real course (including the Isle of Dogs and Greenwich loops), with Hyde Park and the Serpentine, Regent's Park, Hampstead Heath, Greenwich Park, Victoria Park, Battersea Park and more.
- **Trains you can see**: every Tube line, the Overground, the Elizabeth line and rail run on their own tracks in their line colours, and the DLR runs on a raised viaduct. When you take the Tube you ride a train in the line's colour along the real route.
- **Stations and bridges**: an Underground entrance at every place (our own design, not the TfL roundel), the nine mainline termini (Paddington, Euston, St Pancras, Liverpool Street, Waterloo, Victoria, London Bridge, Marylebone, Charing Cross) and eleven Thames bridges from Hammersmith to London Bridge.
- **A real London calendar**: the game follows today's date, with Notting Hill Carnival, Bonfire Night fireworks, the Christmas lights on Oxford Street, Winter Wonderland and New Year's Eve over the Thames. Snow days, heatwaves and Thames fog change what you can do.
- **A home to decorate**: furnish and paint your room in 3D. Comfort makes sleep and home time better.
- **Set up your life like Lagos Life**: sign up, then five steps: a full-body character (body, outfit style and fabrics like Ankara and Kente), 2 personality traits, a dream, the birth lottery (Fresh Immigrant, Old Money or New Gen, drawn once per account) and where to live.
- **Start inside your home**: tap the bed, kitchen, shower and furniture, then go outside to the city. Tabs for Home, Map, Shop and Phone, and soft background music.
- **Help when you need it**: a 60-second guided start, a goal tracker that always shows your next step, 💡 hints (free for your first 2 days, then a small fee) and a daily login streak with rare outfits.
- **Accessible**: bigger text, colour-blind-safe colours and full keyboard play.
- **60 landmarks**: Big Ben and Parliament, Westminster Abbey, the London Eye, Buckingham Palace, Nelson's Column, Piccadilly Circus, BT Tower, the British Museum, St Paul's, the Millennium Bridge, Tate Modern, the Shard, Tower Bridge, the Tower of London, the Gherkin, the Walkie-Talkie, the Cheesegrater, Canary Wharf, the O2, the Cutty Sark, the Royal Observatory, the Thames Barrier, Battersea Power Station, the Royal Albert Hall, the Natural History Museum, Harrods, Kensington Palace, Wembley, the Emirates, the London Stadium and the Orbit, Alexandra Palace, Crystal Palace and Heathrow.
- **Street life**: red buses, black cabs, river boats, red phone boxes and parody billboards. Day turns to night and it actually rains.
- **A modern 3D engine** (Three.js 0.169): real-time soft shadows, ambient occlusion, reflective glass and water, drifting cloud shadows, and windows that light up at night. A High, Medium or Low graphics setting keeps phones smooth.
- **Memoji-style 3D characters**: 8 skin tones, 12 hairstyles, 9 hair colours, headwear (beanie, cap, bucket hat, beret, gele, hijab, turban), glasses, facial hair, earrings and outfits.
- **24 places to go**, from Peckham and Woolwich to Covent Garden, Greenwich, Notting Hill, Wembley and the Tower of London, each with its own things to do.
- **A real(ish) Tube network**: Elizabeth, Jubilee, Central, Northern, Victoria, Piccadilly, District, Metropolitan, Overground, DLR and rail, with zone fares, peak pricing, daily caps, the Night Tube and RMT strikes.
- **Careers with promotions**: delivery rider, barista, retail, tour guide, bartender, care worker (sponsors visas), developer and investment banking analyst, each with three levels.
- **Sims-style needs**: hunger, energy, fun, social and hygiene. Your mood affects your pay, interviews and promotions.
- **Friends with perks**: Chidi (Woolwich), Jade (Peckham), Tom (Chelsea) and Priya (Shoreditch).
- **London life events** and a daily parody newspaper, *The Evening Hustle*.
- **Weekly bills**: rent every Monday, debt repayments and council tax. Two weeks in your overdraft and you're evicted.
- **Endings and grades** with a shareable result card.

## Live London (online)

Sign up free to play with other Londoners. Online play adds:

- **Cloud saves**: continue on any device.
- **Live players**: see who's online and where they are on the map.
- **Chat in every neighbourhood**, with reporting, blocking, rate limits and a banned-words filter.
- **Friends and private messages** (friends only).
- **Mayor of London elections**: stand, campaign and vote each week. The Mayor's policy changes the game for everyone (fare freeze, rent cap, wage rise or clean air zone) and they can post announcements to the whole city.
- **Property market**: buy flats, houses and Thames plots that earn rent every Monday.
- **Creators**: opt in to be discoverable by brands (the brand marketplace is Phase 4).

Online play needs a Supabase project. The database lives in `supabase/migrations/` (every table has row level security), and the public URL and anon key go in `js/config.js`. Leave `supabaseUrl` empty to run fully offline.

See [docs/PRD.md](docs/PRD.md) for the product plan, including the multiplayer roadmap.

Progress saves automatically in your browser.

## Play locally

It's plain HTML, CSS and JavaScript (with Three.js loaded from a CDN as ES modules), so there's no build step. It needs to be served over HTTP, because browsers don't load ES modules from `file://`.

```bash
python3 -m http.server 8000
# then open http://localhost:8000
```


## Deploy for free

- **GitHub Pages**: Settings → Pages → Deploy from branch → `main` / root.
- **Vercel / Netlify**: import the repo; no build command needed.

## Project layout

```
index.html     page shell, HUD and screens
style.css      all styling (responsive down to phone width)
js/boot.js     loads Three.js, Supabase and the game scripts
js/config.js   public Supabase settings (URL and anon key)
js/online.js   Live London: auth, cloud saves, presence, chat, friends, City Hall, property
js/live-ui.js  screens for sign-up, chat, people and City Hall
js/data.js     world data: places (real coordinates), Tube lines, jobs, headlines
js/avatar.js   Memoji-style 3D characters and portraits
js/game.js     engine: time, calendar, weather, needs, travel, careers, events, endings, HUD
js/coach.js    hints, guided start, goal tracker, daily rewards, wardrobe, accessibility, keyboard
js/onboard.js  the five-step setup: look, personality, dream, birth lottery, home
js/home.js     your home: the 3D room you start in, tappable furniture and the shop
js/music.js    background music made live with Web Audio
js/world.js    the 3D city (Three.js): Thames, bridges, parks, landmarks, railways, stations, people, traffic, festivals, camera
docs/PRD.md    product requirements
supabase/      database migrations for Live London
```

Brand names in the game are parodies. Place names and Tube lines are real London geography, simplified.
