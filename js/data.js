// Static world data for Japa Simulator: London Hustle.
// Brands are parodies; places and Tube lines are real London geography (simplified).

const BACKGROUNDS = {
  immigrant: {
    name: 'Fresh Japa',
    tag: 'Just landed from Lagos on a student visa',
    blurb: 'You sold your car, said bye to Mummy at Murtala Muhammed and landed at Heathrow with £1,200 and big dreams. Student visa: 20 hours of work a week, and the clock is ticking.',
    goal: 'Switch to a Skilled Worker visa before your student visa expires (day 35), then reach £3,000 in savings by day 60.',
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

const SKIN = ['#f6d7c3', '#e8b48f', '#c68a5e', '#9a6340', '#6b4128', '#3f2617'];
const HAIR = ['afro', 'braids', 'short', 'bun', 'long', 'bald'];
const HAIR_COLOURS = ['#1b1110', '#4a2c1d', '#a0622d', '#d8b36a', '#b23a2b', '#7a7a7a'];
const OUTFITS = ['#2b6cb0', '#c53030', '#2f855a', '#6b46c1', '#d69e2e', '#1a202c'];

// x/y are positions on the 1000x620 map. Zones follow the real fare zones (roughly).
const LOCATIONS = {
  heathrow:   { name: 'Heathrow',          zone: 6, x: 70,  y: 320, icon: '✈️',  desc: 'Where every japa story starts. The arrivals hall smells of hope and overpriced sandwiches.' },
  hydepark:   { name: 'Hyde Park',         zone: 1, x: 300, y: 285, icon: '🌳', desc: 'Swans, joggers, Speakers\' Corner and the Serpentine.' },
  chelsea:    { name: 'Chelsea',           zone: 1, x: 285, y: 395, icon: '🏛️', desc: "King's Road brunches, Range Rovers and people called Hugo." },
  oxford:     { name: 'Oxford Circus',     zone: 1, x: 385, y: 230, icon: '🛍️', desc: 'Shopping chaos. Tourists stop dead at the top of every staircase.' },
  soho:       { name: 'Soho',              zone: 1, x: 450, y: 270, icon: '🎭', desc: 'Theatres, pubs and the busiest pavements in Europe.' },
  southbank:  { name: 'Westminster & South Bank', zone: 1, x: 470, y: 380, icon: '🎡', desc: 'Big Ben, the London Eye and skateboarders under the Southbank Centre.' },
  camden:     { name: 'Camden Town',       zone: 2, x: 430, y: 115, icon: '🎸', desc: 'Market stalls, canal boats and goths who have been here since 1987.' },
  kingscross: { name: "King's Cross",      zone: 1, x: 510, y: 175, icon: '📚', desc: 'The British Library, Coal Drops Yard and a queue of Harry Potter fans.' },
  city:       { name: 'The City (Bank)',   zone: 1, x: 590, y: 295, icon: '🏦', desc: 'The Square Mile. Lanyards, suits and £6 flat whites.' },
  shoreditch: { name: 'Shoreditch',        zone: 1, x: 640, y: 215, icon: '💻', desc: 'Startups, street art, beards and a bagel shop that never closes.' },
  stratford:  { name: 'Stratford',         zone: 3, x: 810, y: 160, icon: '🏟️', desc: 'Olympic Park and a shopping mall bigger than some towns.' },
  canary:     { name: 'Canary Wharf',      zone: 2, x: 735, y: 345, icon: '🏙️', desc: 'Glass towers, bankers and a very clean shopping centre underground.' },
  woolwich:   { name: 'Woolwich',          zone: 4, x: 905, y: 430, icon: '🏠', desc: 'Little Lagos on the Thames. Jollof, owambe and the Woolwich Ferry.' },
  peckham:    { name: 'Peckham',           zone: 2, x: 640, y: 480, icon: '🏘️', desc: 'Rye Lane, rooftop bars, African food shops and the best hair salons in London.' },
  brixton:    { name: 'Brixton',           zone: 2, x: 495, y: 500, icon: '🎶', desc: 'Brixton Village, Electric Avenue and a lot of reggae.' },
  croydon:    { name: 'Croydon',           zone: 5, x: 560, y: 590, icon: '🏢', desc: 'Trams, tower blocks and Lunar House, home of the Home Office.' },
};

// Lines connect stations; used for drawing the map and for Tube routing.
const LINES = [
  { name: 'Jubilee',     colour: '#868f98', stops: ['stratford', 'canary', 'southbank', 'oxford'] },
  { name: 'Central',     colour: '#dc241f', stops: ['stratford', 'city', 'soho', 'oxford'] },
  { name: 'Northern',    colour: '#1c1c1c', stops: ['camden', 'kingscross', 'city'] },
  { name: 'Northern',    colour: '#1c1c1c', stops: ['camden', 'soho', 'southbank'] },
  { name: 'Victoria',    colour: '#0098d4', stops: ['kingscross', 'oxford', 'hydepark', 'brixton'] },
  { name: 'Piccadilly',  colour: '#003688', stops: ['heathrow', 'hydepark', 'soho', 'kingscross'] },
  { name: 'District',    colour: '#00782a', stops: ['chelsea', 'southbank', 'city'] },
  { name: 'Elizabeth',   colour: '#6950a1', stops: ['heathrow', 'oxford', 'city', 'canary', 'woolwich'] },
  { name: 'Overground',  colour: '#ee7c0e', stops: ['camden', 'stratford'] },
  { name: 'Overground',  colour: '#ee7c0e', stops: ['shoreditch', 'peckham', 'croydon'] },
  { name: 'DLR',         colour: '#00a4a7', stops: ['stratford', 'canary', 'woolwich'] },
  { name: 'Rail',        colour: '#8a8a8a', stops: ['southbank', 'brixton', 'croydon'], rail: true },
];

// Jobs. pay is per hour. sponsor = can sponsor a Skilled Worker visa.
const JOBS = {
  rider:   { title: 'Delivery rider (Delivaroo)', place: 'camden',     pay: 11,   sponsor: false, req: {},                       desc: 'Cycling round Camden in the rain with someone else\'s Peri Palace.' },
  barista: { title: 'Barista at Prest',           place: 'city',       pay: 11.5, sponsor: false, req: {},                       desc: 'Oat flat whites for stressed bankers from 6am.' },
  retail:  { title: 'Sales assistant, Westfield', place: 'stratford',  pay: 11.6, sponsor: false, req: { charm: 20 },            desc: 'Folding jumpers that customers unfold immediately.' },
  care:    { title: 'Care worker',                place: 'croydon',    pay: 13,   sponsor: true,  req: {},                       desc: 'Hard, important work. Many japa stories start here. Sponsors visas.' },
  dev:     { title: 'Junior developer, startup',  place: 'shoreditch', pay: 24,   sponsor: true,  req: { code: 45 },             desc: 'Free kombucha, a ping-pong table and equity that will probably be worth nothing.' },
  analyst: { title: 'Analyst, investment bank',   place: 'canary',     pay: 38,   sponsor: true,  req: { charm: 45, code: 30 },  desc: '80-hour weeks, a big bonus and a lanyard to be proud of. A smart outfit is a must.' },
};

const NPCS = {
  chidi: { name: 'Chidi',  place: 'woolwich',   emoji: '🧑🏿', desc: 'Japa veteran, 6 years in. Knows everybody in Woolwich.' },
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
