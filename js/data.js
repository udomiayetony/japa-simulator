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

const WEATHER = [
  { id: 'rain',  label: 'Drizzle',  icon: '🌧️', w: 40 },
  { id: 'grey',  label: 'Grey',     icon: '☁️', w: 30 },
  { id: 'sun',   label: 'Sunny',    icon: '☀️', w: 22 },
  { id: 'heat',  label: 'Heatwave', icon: '🥵', w: 8 },
];

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
