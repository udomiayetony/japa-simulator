// Static world data for London Hustle.
// Brands are parodies; places, landmarks and Tube lines follow real London geography (simplified).

const BACKGROUNDS = {
  immigrant: {
    name: 'Fresh Immigrant',
    tag: 'Just landed in London with an immigrant visa',
    blurb: "You packed your whole life into two suitcases, hugged your family goodbye and landed at Heathrow with £1,200 and big dreams. Your starter visa lets you work 20 hours a week, and the clock is ticking. Millions of Londoners started exactly here, and plenty of them made it big.",
    goal: 'Switch to a Skilled Worker visa before your starter visa runs out (day 35), then reach £3,000 in savings by day 60.',
    home: 'woolwich',
    money: 1200, debt: 0, rent: 140,
    skills: { hustle: 30, charm: 20, code: 20 },
  },
  oldmoney: {
    name: 'Old Money',
    tag: 'Chelsea flat, family trust, knows everyone',
    blurb: "Pater pays the rent on your Chelsea flat and sends a weekly allowance. You went to a school with a Latin motto. Everyone says you've never worked a day in your life. They're right.",
    goal: 'Pater is losing patience. Build a net worth of £12,000 by day 60 and prove you can make it on your own.',
    home: 'chelsea',
    money: 3000, debt: 0, rent: 0,
    skills: { hustle: 5, charm: 45, code: 10 },
  },
  newgen: {
    name: 'New Gen',
    tag: 'Born in Peckham, living on loans',
    blurb: "Council flat in Peckham, £2,000 owed to QuickCash Loans and three 'pay in 4' plans you've lost track of. You know every bus route and every chicken shop by heart.",
    goal: 'Clear your QuickCash debt and save £2,500 towards a deposit by day 60.',
    home: 'peckham',
    money: 300, debt: 2000, rent: 160,
    skills: { hustle: 40, charm: 25, code: 10 },
  },
};

// Character options for the Memoji-style avatar.
const SKIN = ['#fde0cf', '#f5c9a6', '#e3a77f', '#c98b5e', '#a8693f', '#8a522f', '#6a3c22', '#4a2816'];
const HAIR = ['short', 'fade', 'afro', 'puffs', 'braids', 'locs', 'bob', 'long', 'curly', 'bun', 'mohawk', 'bald'];
const HAIR_COLOURS = ['#17110e', '#3b2416', '#6b4226', '#9a5a2c', '#d9b36c', '#b8b8b8', '#7a4fd6', '#e05aa8', '#3c8ef0'];
const OUTFITS = ['#2f6fdb', '#e0453a', '#26a269', '#7a4fd6', '#f2b233', '#1f2328', '#f2f2f2', '#e86f9a'];
const HEADWEAR = ['none', 'beanie', 'cap', 'bucket', 'beret', 'gele', 'hijab', 'turban'];
const HAT_COLOURS = ['#e0453a', '#f2b233', '#2f6fdb', '#7a4fd6', '#26a269', '#1f2328', '#f2f2f2', '#6b7f4a'];
const EYEWEAR = ['none', 'round', 'square', 'shades'];
const FACIAL = ['none', 'stubble', 'goatee', 'moustache', 'beard'];
const EARRINGS = ['none', 'studs', 'hoops'];

// Where your character is from. Flags are emoji built from the two-letter country code.
const COUNTRIES = [
  ['GB', 'United Kingdom'], ['NG', 'Nigeria'], ['GH', 'Ghana'], ['KE', 'Kenya'], ['ZA', 'South Africa'], ['ZW', 'Zimbabwe'],
  ['UG', 'Uganda'], ['CM', 'Cameroon'], ['SL', 'Sierra Leone'], ['SO', 'Somalia'], ['ET', 'Ethiopia'], ['SD', 'Sudan'],
  ['EG', 'Egypt'], ['MA', 'Morocco'], ['JM', 'Jamaica'], ['TT', 'Trinidad and Tobago'], ['BB', 'Barbados'], ['IN', 'India'],
  ['PK', 'Pakistan'], ['BD', 'Bangladesh'], ['LK', 'Sri Lanka'], ['NP', 'Nepal'], ['CN', 'China'], ['HK', 'Hong Kong'],
  ['PH', 'Philippines'], ['VN', 'Vietnam'], ['MY', 'Malaysia'], ['JP', 'Japan'], ['KR', 'South Korea'], ['AF', 'Afghanistan'],
  ['IR', 'Iran'], ['IQ', 'Iraq'], ['SY', 'Syria'], ['TR', 'Turkey'], ['PL', 'Poland'], ['RO', 'Romania'], ['UA', 'Ukraine'],
  ['LT', 'Lithuania'], ['IT', 'Italy'], ['ES', 'Spain'], ['PT', 'Portugal'], ['FR', 'France'], ['DE', 'Germany'], ['GR', 'Greece'],
  ['IE', 'Ireland'], ['BR', 'Brazil'], ['CO', 'Colombia'], ['US', 'United States'], ['CA', 'Canada'], ['AU', 'Australia'],
];
const flagOf = (code) => String.fromCodePoint(...[...code].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65));
const countryName = (code) => (COUNTRIES.find(([c]) => c === code) || [code, code])[1];

// Real coordinates are turned into map positions (28 units per km around Charing Cross).
// Outer London is gently squeezed so the whole city fits on screen.
const GEO_CENTER = [51.5074, -0.1278];
const PX_PER_KM = 28;
function geoScale(dKm) { return dKm > 5 ? (5 + (dKm - 5) * 0.5) / dKm : 1; }
function geo(lat, lon) {
  const ex = (lon - GEO_CENTER[1]) * 69.4;
  const sz = (GEO_CENTER[0] - lat) * 111.2;
  const k = geoScale(Math.hypot(ex, sz));
  return { x: 500 + ex * k * PX_PER_KM, y: 310 + sz * k * PX_PER_KM };
}
function place(lat, lon, o) { return { ...o, ...geo(lat, lon), lat, lon }; }

// Playable places. Zones follow the real fare zones.
const LOCATIONS = {
  heathrow:    place(51.4700, -0.4543, { name: 'Heathrow', zone: 6, icon: '✈️', desc: 'Where so many London stories start. The arrivals hall smells of hope and overpriced sandwiches.' }),
  hydepark:    place(51.5075, -0.1620, { name: 'Hyde Park', zone: 1, icon: '🌳', desc: "Swans, joggers, Speakers' Corner and the Serpentine." }),
  chelsea:     place(51.4900, -0.1640, { name: 'Chelsea', zone: 1, icon: '💎', desc: "King's Road brunches, Range Rovers and people called Hugo." }),
  oxford:      place(51.5155, -0.1430, { name: 'Oxford Circus', zone: 1, icon: '🛍️', desc: 'Shopping chaos. Tourists stop dead at the top of every staircase.' }),
  soho:        place(51.5137, -0.1320, { name: 'Soho', zone: 1, icon: '🍸', desc: 'Pubs, theatres and the busiest pavements in Europe.' }),
  covent:      place(51.5118, -0.1225, { name: 'Covent Garden', zone: 1, icon: '🎪', desc: 'Street performers, the market hall and the Royal Opera House.' }),
  westminster: place(51.4985, -0.1390, { name: 'Westminster', zone: 1, icon: '🏛️', desc: 'Buckingham Palace, Parliament and a lot of men in bearskin hats.' }),
  southbank:   place(51.5040, -0.1110, { name: 'South Bank', zone: 1, icon: '🎡', desc: 'The London Eye, skateboarders under the Southbank Centre and riverside book stalls.' }),
  camden:      place(51.5395, -0.1430, { name: 'Camden Town', zone: 2, icon: '🎸', desc: 'Market stalls, canal boats and goths who have been here since 1987.' }),
  kingscross:  place(51.5320, -0.1235, { name: "King's Cross", zone: 1, icon: '📚', desc: 'The British Library, Coal Drops Yard and a queue of Harry Potter fans.' }),
  city:        place(51.5150, -0.0910, { name: 'The City (Bank)', zone: 1, icon: '🏦', desc: 'The Square Mile. Lanyards, suits and £6 flat whites.' }),
  towerhill:   place(51.5105, -0.0760, { name: 'Tower of London', zone: 1, icon: '👑', desc: 'Beefeaters, ravens and the Crown Jewels, next to Tower Bridge.' }),
  shoreditch:  place(51.5250, -0.0770, { name: 'Shoreditch', zone: 1, icon: '💻', desc: 'Startups, street art, beards and a bagel shop on Brick Lane that never closes.' }),
  stratford:   place(51.5420, -0.0040, { name: 'Stratford', zone: 3, icon: '🏅', desc: 'Olympic Park and a shopping mall bigger than some towns.' }),
  canary:      place(51.5050, -0.0200, { name: 'Canary Wharf', zone: 2, icon: '🏙️', desc: 'Glass towers, bankers and a very clean shopping centre underground.' }),
  greenwich:   place(51.4815, -0.0060, { name: 'Greenwich', zone: 2, icon: '🔭', desc: 'The Cutty Sark, the Royal Observatory and the Prime Meridian.' }),
  woolwich:    place(51.4880, 0.0690, { name: 'Woolwich', zone: 4, icon: '⛴️', desc: 'Little Lagos on the Thames. Jollof, owambe and the Woolwich Ferry.' }),
  peckham:     place(51.4700, -0.0690, { name: 'Peckham', zone: 2, icon: '🏘️', desc: 'Rye Lane, rooftop bars, African food shops and the best hair salons in London.' }),
  brixton:     place(51.4620, -0.1150, { name: 'Brixton', zone: 2, icon: '🎶', desc: 'Brixton Village, Electric Avenue and a lot of reggae.' }),
  battersea:   place(51.4790, -0.1380, { name: 'Battersea', zone: 1, icon: '⚡', desc: 'The power station is now shops, flats and a glass lift up a chimney.' }),
  kensington:  place(51.4950, -0.1745, { name: 'South Kensington', zone: 1, icon: '🦕', desc: 'Free museums, the Royal Albert Hall and Harrods round the corner.' }),
  nottinghill: place(51.5150, -0.2010, { name: 'Notting Hill', zone: 2, icon: '🎨', desc: 'Pastel houses, Portobello Road market and the Carnival every August.' }),
  wembley:     place(51.5580, -0.2830, { name: 'Wembley', zone: 4, icon: '🏟️', desc: 'The arch, the stadium and every big gig and cup final.' }),
  croydon:     place(51.3762, -0.0982, { name: 'Croydon', zone: 5, icon: '🛂', desc: 'Trams, tower blocks and Lunar House, home of the Home Office.' }),
};

// Lines connect stations; used for drawing roads and for Tube routing.
const LINES = [
  { name: 'Jubilee',    colour: '#868f98', stops: ['wembley', 'oxford', 'westminster', 'southbank', 'canary', 'greenwich', 'stratford'] },
  { name: 'Central',    colour: '#dc241f', stops: ['nottinghill', 'oxford', 'soho', 'city', 'stratford'] },
  { name: 'Northern',   colour: '#1c1c1c', stops: ['camden', 'kingscross', 'city'] },
  { name: 'Northern',   colour: '#1c1c1c', stops: ['camden', 'soho', 'southbank', 'battersea'] },
  { name: 'Victoria',   colour: '#0098d4', stops: ['kingscross', 'oxford', 'westminster', 'brixton'] },
  { name: 'Piccadilly', colour: '#003688', stops: ['heathrow', 'kensington', 'hydepark', 'soho', 'covent', 'kingscross'] },
  { name: 'District',   colour: '#00782a', stops: ['kensington', 'chelsea', 'westminster', 'city', 'towerhill'] },
  { name: 'Elizabeth',  colour: '#6950a1', stops: ['heathrow', 'oxford', 'city', 'canary', 'woolwich'] },
  { name: 'Metropolitan', colour: '#9b0056', stops: ['wembley', 'kingscross'] },
  { name: 'Overground', colour: '#ee7c0e', stops: ['camden', 'stratford'] },
  { name: 'Overground', colour: '#ee7c0e', stops: ['shoreditch', 'peckham', 'croydon'] },
  { name: 'DLR',        colour: '#00a4a7', stops: ['towerhill', 'canary', 'greenwich'] },
  { name: 'DLR',        colour: '#00a4a7', stops: ['stratford', 'canary', 'woolwich'] },
  { name: 'Rail',       colour: '#8a8a8a', stops: ['southbank', 'brixton', 'croydon'], rail: true },
];

// Jobs. pay is per hour. sponsor = can sponsor a Skilled Worker visa.
// Jobs. pay is per hour. sponsor = can sponsor a Skilled Worker visa.
// levels: the career ladder [title, pay per hour, shifts needed, skill needs].
const JOBS = {
  rider:     { title: 'Delivery rider (Delivaroo)', place: 'camden',      pay: 11,   sponsor: false, req: {}, desc: "Cycling round Camden in the rain with someone else's Peri Palace.",
    levels: [['Delivery rider', 11, 0], ['Top-rated rider', 13, 8, { hustle: 40 }], ['Rider team lead', 15.5, 16, { hustle: 55 }]] },
  barista:   { title: 'Barista at Prest', place: 'city', pay: 11.5, sponsor: false, req: {}, desc: 'Oat flat whites for stressed bankers from 6am.',
    levels: [['Barista', 11.5, 0], ['Shift supervisor', 13.5, 8, { charm: 30 }], ['Store manager', 17, 18, { charm: 45 }]] },
  retail:    { title: 'Sales assistant, Westfield', place: 'stratford', pay: 11.6, sponsor: false, req: { charm: 20 }, desc: 'Folding jumpers that customers unfold immediately.',
    levels: [['Sales assistant', 11.6, 0], ['Senior sales', 13, 8, { charm: 35 }], ['Store manager', 17.5, 18, { charm: 50 }]] },
  guide:     { title: 'Tour guide, Westminster', place: 'westminster', pay: 13, sponsor: false, req: { charm: 30 }, desc: 'Walking tourists past Big Ben and pretending you know every king.',
    levels: [['Tour guide', 13, 0], ['Senior guide', 15, 8, { charm: 45 }], ['Head of tours', 19, 18, { charm: 60 }]] },
  bartender: { title: 'Bartender, Covent Garden', place: 'covent', pay: 12, sponsor: false, req: { charm: 20 }, desc: 'Pouring pints and mixing espresso martinis for theatre crowds.',
    levels: [['Bartender', 12, 0], ['Head bartender', 14.5, 8, { charm: 40 }], ['Bar manager', 18, 18, { charm: 55, hustle: 30 }]] },
  care:      { title: 'Care worker', place: 'croydon', pay: 13, sponsor: true, req: {}, desc: 'Hard, important work. Many immigrant success stories start here. Sponsors visas.',
    levels: [['Care worker', 13, 0], ['Senior carer', 15, 8, { charm: 30 }], ['Care team leader', 18, 18, { charm: 40, hustle: 35 }]] },
  dev:       { title: 'Junior developer, startup', place: 'shoreditch', pay: 24, sponsor: true, req: { code: 45 }, desc: 'Free kombucha, a ping-pong table and equity that will probably be worth nothing.',
    levels: [['Junior developer', 24, 0], ['Developer', 30, 8, { code: 60 }], ['Senior developer', 38, 18, { code: 75 }]] },
  analyst:   { title: 'Analyst, investment bank', place: 'canary', pay: 38, sponsor: true, req: { charm: 45, code: 30 }, desc: '80-hour weeks, a big bonus and a lanyard to be proud of. A smart outfit is a must.',
    levels: [['Analyst', 38, 0], ['Associate', 48, 8, { charm: 55, code: 40 }], ['Vice President', 62, 18, { charm: 65, code: 50 }]] },
};

// Morning paper. Shown in the ticker at the start of each day, like a daily feed.
const HEADLINES = [
  'Tube fares rise again. Commuters report "no surprise whatsoever".',
  'Man stands on left side of escalator. Investigation launched.',
  'Landlord describes damp one-bed in Zone 4 as "characterful". Rent: £1,650.',
  'Jollof wars: Ghana files appeal. Peckham says case closed.',
  'Pigeon spotted riding Central line for third day running.',
  'Heatwave warning issued for temperatures above 24°C.',
  'Study finds Londoners have not spoken to a neighbour since 2009.',
  'Pret-style chain launches £5 "artisanal" toast.',
  'Fox steals entire Deliveroo order in Brixton. No arrests.',
  'Uncle in Woolwich still waiting for reply to Facebook message from 2017.',
  'Estate agent finds "cosy" studio is actually a cupboard. Lists it anyway.',
  'Overground line names now "impossible to remember", say commuters.',
  'Big Ben bongs on time. Nation relieved.',
  'Nigerian mum in Croydon asks son when he is buying a house. Again.',
  'Wimbledon queue forms for queue to join the queue.',
  'Owambe in Woolwich runs four hours over. Neighbours join in.',
  'Notting Hill Carnival steel bands start rehearsing. Ears prepare.',
  'New coffee shop in Shoreditch sells only the smell of coffee.',
];
const TIPS = [
  'Tip: the Tube has a daily fare cap. Ride as much as you like once you hit it.',
  'Tip: a happy you earns more and does better in interviews.',
  'Tip: rent leaves your account every Monday morning.',
  'Tip: close friends unlock perks. Hang out more.',
  'Tip: keep showing up to work and you will get promoted.',
  'Tip: museums in South Kensington are free. Culture costs nothing.',
  'Tip: buses are cheap, but slow. Walking is free, but slower.',
];

const NPCS = {
  chidi: { name: 'Chidi',  place: 'woolwich',   emoji: '🧑🏿', desc: 'Came to London six years ago with one suitcase. Now he knows everybody in Woolwich.' },
  jade:  { name: 'Jade',   place: 'peckham',    emoji: '👩🏾', desc: 'Peckham born and raised. Does nails, sells vintage, has three side hustles.' },
  tom:   { name: 'Tom',    place: 'chelsea',    emoji: '👱🏼‍♂️', desc: 'Old Etonian. Surprisingly decent. Will invite you to polo.' },
  priya: { name: 'Priya',  place: 'shoreditch', emoji: '👩🏽‍💻', desc: 'Tech recruiter and part-time DJ. Knows which startups are hiring.' },
};

const GROCERY_SHOPS = {
  woolwich: { name: 'African food shop', price: 14 },
  peckham:  { name: 'Rye Lane market',   price: 13 },
  brixton:  { name: 'Brixton Market',    price: 13 },
  stratford:{ name: 'Tesca Extra',       price: 17 },
  chelsea:  { name: 'Waitwell',          price: 32 },
  croydon:  { name: 'Aldo',              price: 12 },
  nottinghill: { name: 'Portobello Road market', price: 16 },
  greenwich: { name: 'Greenwich Market', price: 15 },
};

const TUBE_INCIDENTS = [
  { text: 'Severe delays: signal failure at Earl\'s Court. Of course.', mins: 25 },
  { text: 'A tourist stood on the left of the escalator. You tutted. They didn\'t notice.', fun: -3 },
  { text: 'Someone opened an egg sandwich in a packed carriage. Brutal.', fun: -6, hygiene: -3 },
  { text: 'You got a seat! An actual seat! At rush hour!', energy: 8, fun: 4 },
  { text: '"Please stand clear of the closing doors." Someone did not. Delays.', mins: 10 },
  { text: 'A busker played Afrobeats on the platform. You two-stepped a little.', fun: 6 },
  { text: 'Found a £20 note on the Central line floor. London provides.', money: 20 },
  { text: 'Lost your Oyster card. Had to tap your bank card like everyone else.', fun: -2 },
];

// months: the months (0 = January) a weather type can happen in. No list means all year.
const WEATHER = [
  { id: 'rain',  label: 'Drizzle',    icon: '🌧️', w: 40 },
  { id: 'grey',  label: 'Grey',       icon: '☁️', w: 30 },
  { id: 'sun',   label: 'Sunny',      icon: '☀️', w: 22 },
  { id: 'heat',  label: 'Heatwave',   icon: '🥵', w: 14, months: [5, 6, 7] },
  { id: 'snow',  label: 'Snow day',   icon: '❄️', w: 10, months: [11, 0, 1] },
  { id: 'fog',   label: 'Thames fog', icon: '🌫️', w: 9, months: [9, 10, 11, 0, 1, 2] },
];

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

// ---------------------------------------------------------------- the London calendar
// Dates follow the real calendar. The game starts on the day you start playing.

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
// The nth given weekday (0 = Sunday) of a month; n = -1 means the last one.
function nthWeekday(y, m, wd, n) {
  if (n < 0) {
    const d = new Date(y, m + 1, 0);
    d.setDate(d.getDate() - ((d.getDay() - wd + 7) % 7));
    return d;
  }
  const d = new Date(y, m, 1);
  d.setDate(1 + ((wd - d.getDay() + 7) % 7) + (n - 1) * 7);
  return d;
}

// on(year) gives the first day; len is how many days it runs. visual is drawn in the 3D city.
// action is what you can do at `place` while it is on: hours [from, to) and its effects.
const CALENDAR = [
  { id: 'marathon', name: 'London Marathon', icon: '🏃', place: 'westminster', len: 1,
    on: (y) => nthWeekday(y, 3, 0, -1),
    text: '40,000 runners are pounding the streets from Greenwich to The Mall. Some are dressed as Big Ben.',
    action: { label: '📣 Cheer on the Marathon', mins: 120, hours: [9, 15], fx: { fun: 18, social: 10 } } },
  { id: 'pride', name: 'Pride in London', icon: '🏳️‍🌈', place: 'soho', len: 1, visual: 'pride',
    on: (y) => nthWeekday(y, 6, 6, 1),
    text: 'A million people, a parade from Hyde Park Corner to Whitehall and glitter in places glitter should not be.',
    action: { label: '🏳️‍🌈 Join the Pride parade', mins: 240, hours: [11, 20], fx: { fun: 40, social: 30, energy: -12 } } },
  { id: 'carnival', name: 'Notting Hill Carnival', icon: '🎊', place: 'nottinghill', len: 2, visual: 'carnival',
    on: (y) => { const d = nthWeekday(y, 7, 1, -1); d.setDate(d.getDate() - 1); return d; },
    text: 'Steel drums, sound systems, jerk chicken and two million people. Europe\'s biggest street party is on.',
    action: { label: '🎊 Dance at Carnival', mins: 300, cost: 25, hours: [10, 21], fx: { fun: 45, social: 30, hunger: 30, energy: -20 } } },
  { id: 'halloween', name: 'Halloween', icon: '🎃', place: 'camden', len: 1,
    on: (y) => new Date(y, 9, 31),
    text: 'Camden has gone full horror film. The goths say it is just a normal Friday for them.',
    action: { label: '🎃 Halloween night out', mins: 240, cost: 15, hours: [19, 24], fx: { fun: 35, social: 25, energy: -12 } } },
  { id: 'bonfire', name: 'Bonfire Night', icon: '🎆', place: 'battersea', len: 1, visual: 'fireworks', fireworksAt: 'battersea',
    on: (y) => new Date(y, 10, 5),
    text: 'Remember, remember the fifth of November. Fireworks over Battersea Park tonight.',
    action: { label: '🎆 Fireworks in Battersea Park', mins: 150, cost: 12, hours: [18, 23], fx: { fun: 35, social: 15 } } },
  { id: 'xmaslights', name: 'Christmas lights on Oxford Street', icon: '🎄', place: 'oxford', len: 62, visual: 'xmas',
    on: (y) => nthWeekday(y, 10, 4, 1),
    text: 'The Christmas lights are switched on along Oxford Street. Tourists are walking even slower now.',
    action: { label: '🎄 See the Christmas lights', mins: 60, hours: [16, 23], fx: { fun: 14, social: 4 } } },
  { id: 'wonderland', name: 'Winter Wonderland', icon: '🎡', place: 'hydepark', len: 44, visual: 'wonderland',
    on: (y) => new Date(y, 10, 20),
    text: 'Winter Wonderland opens in Hyde Park: ice rink, mulled wine and a big wheel.',
    action: { label: '⛸️ Winter Wonderland', mins: 180, cost: 22, hours: [10, 22], fx: { fun: 32, social: 12, hunger: 15 } } },
  { id: 'christmas', name: 'Christmas Day', icon: '🎁', place: null, len: 1,
    on: (y) => new Date(y, 11, 25),
    text: 'No Tube, no buses, everything shut. London is silent apart from the sound of the Queen\'s, sorry, King\'s Speech.' },
  { id: 'boxing', name: 'Boxing Day sales', icon: '🛍️', place: 'oxford', len: 1,
    on: (y) => new Date(y, 11, 26),
    text: 'The Boxing Day sales are on. People queued outside Selfridges from 5am.',
    action: { label: '🛍️ Fight through the sales', mins: 180, cost: 40, hours: [8, 20], fx: { fun: 18, charm: 2, energy: -10 } } },
  { id: 'nye', name: 'New Year\'s Eve on the Thames', icon: '🎆', place: 'southbank', len: 1, visual: 'fireworks', fireworksAt: 'southbank',
    on: (y) => new Date(y, 11, 31),
    text: 'Big Ben, the London Eye and 12 minutes of fireworks over the Thames at midnight.',
    action: { label: '🎆 New Year fireworks on the Embankment', mins: 180, cost: 15, hours: [20, 24], fx: { fun: 50, social: 30, energy: -15 } } },
];

// Furniture for your home. comfort makes sleep and home time better.
const FURNITURE = {
  rug:       { name: 'Rug', icon: '🟫', price: 35, comfort: 3 },
  plant:     { name: 'Plant', icon: '🪴', price: 15, comfort: 3 },
  lamp:      { name: 'Floor lamp', icon: '💡', price: 30, comfort: 3 },
  poster:    { name: 'Poster', icon: '🖼️', price: 12, comfort: 2 },
  flag:      { name: 'Your flag', icon: '🏳️', price: 8, comfort: 2 },
  lights:    { name: 'Fairy lights', icon: '✨', price: 14, comfort: 2 },
  bookshelf: { name: 'Bookshelf', icon: '📚', price: 70, comfort: 3 },
  speaker:   { name: 'Speaker', icon: '🔊', price: 90, comfort: 3, perk: 'Music makes telly and home time more fun' },
  sofa:      { name: 'Sofa', icon: '🛋️', price: 180, comfort: 8, perk: 'Unlocks "Have friends round"' },
  tv:        { name: 'Big telly', icon: '📺', price: 220, comfort: 4, perk: 'Telly is more fun' },
  desk:      { name: 'Desk and laptop', icon: '💻', price: 260, comfort: 2, perk: 'Unlocks "Study coding at home"' },
  bed:       { name: 'Memory-foam bed', icon: '🛏️', price: 300, comfort: 6, perk: 'Sleep gives more energy' },
};
const WALL_COLOURS = ['#efe4cf', '#cfe3d4', '#d4e1f2', '#f2d4cf', '#e3d9f2', '#f6e7a8', '#2f3e46'];
const START_FURNITURE = {
  immigrant: [],
  oldmoney: ['sofa', 'bed', 'lamp', 'rug', 'tv', 'bookshelf', 'plant'],
  newgen: ['tv', 'poster'],
};

// Daily login rewards. Day 7 of a streak unlocks an outfit colour you can't pick anywhere else.
const BASE_OUTFITS = OUTFITS.length;
const REWARD_OUTFITS = [['#d4af37', 'Gold'], ['#00a19a', 'Teal sequin'], ['#5b2a86', 'Royal purple'], ['#ff2e88', 'Hot pink'], ['#c0c6cc', 'Silver'], ['#d9601a', 'Burnt orange'], ['#191970', 'Midnight']];
OUTFITS.push(...REWARD_OUTFITS.map(([c]) => c));
const DAILY_REWARDS = [
  { icon: '💷', label: '£20', money: 20 },
  { icon: '🥫', label: '3 free meals', meals: 3 },
  { icon: '💷', label: '£40', money: 40 },
  { icon: '☕', label: 'Coffee and croissant', needs: { energy: 25, fun: 10 } },
  { icon: '💷', label: '£60', money: 60 },
  { icon: '💷', label: '£80', money: 80 },
  { icon: '👕', label: 'Free outfit', outfit: true },
];

// ---------------------------------------------------------------- setting up a new life

// Outfit styles and fabrics for the full-body character.
const BODIES = ['woman', 'man'];
const STYLES = ['casual', 'hoodie', 'office', 'gym', 'hivis'];
const FABRICS = ['plain', 'ankara', 'kente', 'tartan', 'pinstripe'];

// Pick 2. Each one changes how the game plays (see game.js).
const TRAITS = {
  hustler: { icon: '💼', name: 'Hustler', desc: 'Sees money everywhere. Hustle grows faster and bosses notice, so promotions come sooner.' },
  foodie:  { icon: '🍲', name: 'Foodie', desc: 'Lives for a good plate. Food fills you up more and puts you in a better mood.' },
  party:   { icon: '🎉', name: 'Party Animal', desc: 'First on the dance floor. Fun hits harder, but it also runs out quicker.' },
  gym:     { icon: '💪', name: 'Gym Rat', desc: 'Leg day every day. Energy lasts longer, but you need more showers.' },
  smooth:  { icon: '😏', name: 'Smooth Talker', desc: 'Chats to anyone. Charm grows faster and time with people means more.' },
  lazy:    { icon: '😴', name: 'Lazy Bones', desc: 'Why stand when you can sit? Energy lasts much longer, but work pays a bit less.' },
  clean:   { icon: '🧼', name: 'Clean Freak', desc: 'Always fresh. Hygiene drops much slower than everyone else\'s.' },
  owl:     { icon: '🌙', name: 'Night Owl', desc: 'London never sleeps and neither do you. Late nights cost less energy and are more fun.' },
};

// A long-term dream on top of your life's goal.
const DREAMS = {
  ladder:   { icon: '👔', name: 'Top of the Ladder', desc: 'Reach the top level of any career.' },
  property: { icon: '🏡', name: 'On the Property Ladder', desc: 'Build a net worth of £15,000.' },
  mate:     { icon: '🤝', name: "Everyone's Mate", desc: 'Become close friends (60+) with 4 people.' },
  founder:  { icon: '🦄', name: 'Shoreditch Unicorn', desc: 'Pitch your startup in Shoreditch and get it funded.' },
  explorer: { icon: '🗺️', name: 'Proper Londoner', desc: 'Visit all 24 places on the map.' },
};

// Where you live. deposit comes out of your starting money; lives limits who can pick it.
const HOMES = {
  share:   { name: 'House share', area: 'woolwich', tag: 'Hard start', rent: 140, deposit: 0, lives: ['immigrant', 'newgen', 'oldmoney'], desc: 'One room in a five-bed house share. Cheap, loud, and the bathroom rota is war.' },
  halls:   { name: 'Student halls', area: 'kingscross', tag: 'Student life', rent: 125, deposit: 0, lives: ['immigrant', 'newgen'], desc: 'A box room in halls by the British Library. Shared kitchen, free Wi-Fi, fire drills at 3am.' },
  council: { name: 'Family council flat', area: 'peckham', tag: 'Home', rent: 160, deposit: 0, lives: ['newgen'], desc: 'Your mum\'s flat on the estate. You pay your share, your little brother pays nothing.' },
  studio:  { name: 'Studio flat', area: 'brixton', tag: 'Balanced', rent: 195, deposit: 350, lives: ['immigrant', 'newgen', 'oldmoney'], desc: 'Your own front door, a kitchen corner and a shower that actually works.' },
  onebed:  { name: 'One-bed flat', area: 'stratford', tag: 'Big spender', rent: 280, deposit: 700, lives: ['immigrant', 'newgen', 'oldmoney'], desc: 'A proper bedroom, a sitting room and a view of the Olympic Park. Big rent.' },
  chelsea: { name: 'Mansion flat', area: 'chelsea', tag: 'Pater pays', rent: 350, deposit: 0, lives: ['oldmoney'], desc: 'Two bedrooms off the King\'s Road. Pater pays the rent until he loses patience.' },
};
const DEFAULT_HOME = { immigrant: 'share', newgen: 'council', oldmoney: 'chelsea' };

// What the birth lottery tells you about each start.
const BIRTH_PERKS = {
  immigrant: { icon: '✈️', title: 'Fresh Immigrant!', line: 'Just landed in London with an immigrant visa.', perks: ['£1,200 in the bank to start', 'Starter visa: work 20 hours a week', 'Switch to a Skilled Worker visa by day 35', 'Hustle starts at 30'] },
  oldmoney:  { icon: '🎩', title: 'Old Money!', line: 'Family trust, knows everyone.', perks: ['£3,000 to start and £400 a week from Pater', 'Pater pays your rent, for now', 'Charm starts at 45', 'Prove yourself: £12,000 net worth by day 60'] },
  newgen:    { icon: '🧢', title: 'New Gen!', line: 'Born in London, living on loans.', perks: ['£300 to start and a £2,000 QuickCash loan', 'QuickCash takes £80 every Monday, at 2% a week', 'Hustle starts at 40: you know every bus route', 'Clear the debt and save £2,500'] },
};
