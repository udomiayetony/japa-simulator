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
- **40 landmarks**: Big Ben and Parliament, Westminster Abbey, the London Eye, Buckingham Palace, Nelson's Column, Piccadilly Circus, BT Tower, the British Museum, St Paul's, the Millennium Bridge, Tate Modern, the Shard, Tower Bridge, the Tower of London, the Gherkin, the Walkie-Talkie, the Cheesegrater, Canary Wharf, the O2, the Cutty Sark, the Royal Observatory, the Thames Barrier, Battersea Power Station, the Royal Albert Hall, the Natural History Museum, Harrods, Kensington Palace, Wembley, the Emirates, the London Stadium and the Orbit, Alexandra Palace, Crystal Palace and Heathrow.
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
js/boot.js     loads Three.js and the game scripts
js/data.js     world data: places (real coordinates), Tube lines, jobs, headlines
js/avatar.js   Memoji-style 3D characters and portraits
js/game.js     engine: time, needs, travel, careers, events, endings, HUD
js/world.js    the 3D city (Three.js): Thames, parks, landmarks, traffic, camera
docs/PRD.md    product requirements
```

Brand names in the game are parodies. Place names and Tube lines are real London geography, simplified.
