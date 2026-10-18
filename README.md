# 🇬🇧 Japa Simulator: London Hustle

A free 3D browser life sim about surviving 60 days in London. Pan around a low-poly London, tap a building to go there, and hustle. Nothing to download, nothing to install.

## Pick your London life

| Background | Start | Goal |
|---|---|---|
| ✈️ **Fresh Japa** | Just landed from Lagos on a student visa. £1,200, a room in Woolwich, a 20-hour work cap. | Switch to a Skilled Worker visa before day 35, then save £3,000. |
| 🎩 **Old Money** | Chelsea flat, family trust, weekly allowance... until Pater cuts you off. | Build a £12,000 net worth on your own. |
| 🧢 **New Gen** | Council flat in Peckham, £2,000 owed to QuickCash Loans at 2% a week. | Clear the debt and save a £2,500 deposit. |

## What's in the world

- **A 3D low-poly London** you can drag and zoom: the Thames, Big Ben and Parliament, the London Eye, the Shard, Tower Bridge, the Gherkin, St Paul's, Canary Wharf, the Olympic Stadium and the Orbit, red buses, black cabs, river boats and parody billboards. Day turns to night and it actually rains.

- **A real(ish) Tube map**: Elizabeth, Jubilee, Central, Northern, Victoria, Piccadilly, District, Overground, DLR and rail, with zone-based fares, peak/off-peak pricing, daily caps, Night Tube at weekends and RMT strikes.
- **Ways to travel**: Tube, bus (Hopper fare), hire bikes, walking and pricey late-night cabs. Delays, egg sandwiches and lucky seats on the way.
- **16 London neighbourhoods**: Heathrow, Hyde Park, Chelsea, Oxford Circus, Soho, Westminster & South Bank, Camden, King's Cross, the City, Shoreditch, Stratford, Canary Wharf, Woolwich, Peckham, Brixton and Croydon (with Lunar House, home of the Home Office).
- **Sims-style needs**: hunger, energy, fun, social and hygiene. Your mood affects your pay and job interviews.
- **Jobs and careers**: delivery rider, barista, retail, care worker (sponsors visas), junior developer and investment banking analyst.
- **Skills**: study coding at the British Library, network in the City and Shoreditch, hustle at Camden Market.
- **Friends with perks**: Chidi (Woolwich), Jade (Peckham), Tom (Chelsea) and Priya (Shoreditch).
- **London life events**: rent hikes, urban foxes, heatwaves, Notting Hill Carnival, Owambe on Saturdays, Mummy asking for school fees, moped phone thieves, "guaranteed" crypto and three-week GP waits.
- **Weekly bills**: rent every Monday, debt repayments and council tax. Two weeks in your overdraft and you're evicted.
- **Endings and grades** with a shareable result card.

Progress saves automatically in your browser.

## Play locally

It's plain HTML, CSS and JavaScript (with Three.js from a CDN), so there's no build step.

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
js/data.js     world data: backgrounds, places, Tube lines, jobs, friends
js/game.js     engine: time, needs, travel, actions, events, endings, HUD
js/world.js    the 3D city (Three.js): landmarks, traffic, camera, pins
```

Brand names in the game are parodies. Place names and Tube lines are real London geography, simplified.
