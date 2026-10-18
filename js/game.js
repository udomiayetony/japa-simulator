'use strict';
// Japa Simulator: London Hustle — game engine, UI and save system.

const SAVE_KEY = 'japa-london-save-v1';
const GAME_DAYS = 60;
let S = null; // the whole game state lives here and is saved to localStorage

const $ = (sel, root = document) => root.querySelector(sel);
const clamp = (v, a = 0, b = 100) => Math.max(a, Math.min(b, v));
const chance = (p) => Math.random() < p;
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const round2 = (n) => Math.round(n * 100) / 100;
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function money(n) {
  const abs = Math.abs(n);
  const str = abs.toLocaleString('en-GB', { minimumFractionDigits: abs % 1 ? 2 : 0, maximumFractionDigits: 2 });
  return (n < 0 ? '-£' : '£') + str;
}

// ---------------------------------------------------------------- time

const day = () => Math.floor(S.t / 1440) + 1;
const hour = () => Math.floor((S.t % 1440) / 60);
const dow = () => (day() - 1) % 7; // 0 = Monday
const isWeekend = () => dow() >= 5;
function clock() {
  const m = S.t % 1440;
  return String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0');
}
function isPeak() {
  const m = S.t % 1440;
  return !isWeekend() && ((m >= 390 && m < 570) || (m >= 960 && m < 1140));
}
function tubeOpen() {
  const h = hour();
  if (h >= 5) return true;
  // Night Tube runs Friday and Saturday nights
  return dow() === 5 || dow() === 6;
}

function advance(mins, opts = {}) {
  let left = mins;
  while (left > 0 && !S.over) {
    const step = Math.min(60, left);
    const before = day();
    S.t += step;
    left -= step;
    const h = step / 60;
    const n = S.needs;
    n.hunger = clamp(n.hunger - (opts.sleep ? 1.2 : 3.5) * h);
    n.energy = clamp(n.energy - (opts.sleep ? 0 : 3) * h);
    n.fun = clamp(n.fun - (opts.sleep ? 0.5 : 1.5) * h);
    n.social = clamp(n.social - (opts.sleep ? 0.5 : 1.2) * h);
    n.hygiene = clamp(n.hygiene - (opts.sleep ? 1 : 2) * h);
    if (day() !== before) newDay();
  }
}

function rollWeather() {
  const total = WEATHER.reduce((a, w) => a + w.w, 0);
  let r = Math.random() * total;
  for (const w of WEATHER) { r -= w.w; if (r <= 0) return w.id; }
  return 'grey';
}

function newDay() {
  const d = day();
  S.fares = { tube: 0, bus: 0 };
  S.weather = rollWeather();
  S.strike = d > 2 && chance(0.05);
  if (d > GAME_DAYS) return;
  if (S.strike) S.queue.push('strike');
  if (dow() === 0) weekly();
  if (d % 30 === 1) monthly();
  if (S.over) return;

  // Scripted story beats
  const scripted = {
    immigrant: { 2: 'chidiHello', 28: 'visaWarn' },
    oldmoney: { 2: 'paterCall', 15: 'cutOff' },
    newgen: { 2: 'debtIntro' },
  }[S.bg];
  if (scripted[d]) S.queue.push(scripted[d]);
  else if (d > 2 && chance(0.45)) {
    const ev = randomEvent();
    if (ev) S.queue.push(ev);
  }
  if (S.weather === 'heat' && chance(0.6)) S.queue.push('heatwave');
}

function weekly() {
  S.weekHours = 0;
  log('📅 New week. Bills are due.');
  if (S.allowance) { S.money += S.allowance; log(`💷 Pater's weekly allowance landed: +${money(S.allowance)}.`, 'good'); }
  if (S.rent) { S.money -= S.rent; S.stats.spent += S.rent; log(`🏠 Rent paid: -${money(S.rent)}.`, 'bad'); }
  if (S.debt > 0) {
    const interest = Math.round(S.debt * 0.02);
    S.debt += interest;
    const due = Math.min(80, S.debt);
    if (S.money >= due) {
      S.money -= due; S.debt -= due;
      log(`💳 QuickCash took ${money(due)} (and added ${money(interest)} interest). Debt left: ${money(S.debt)}.`, 'bad');
    } else {
      S.debt += 25;
      log(`💳 QuickCash repayment bounced. £25 late fee. Debt now ${money(S.debt)}.`, 'bad');
    }
  }
  S.money = round2(S.money);
  if (S.money < 0) {
    S.overdraftWeeks++;
    if (S.money < -400 || S.overdraftWeeks >= 2) return endGame('evicted');
    log('⚠️ You\'re in your overdraft. One more week like this and the landlord will change the locks.', 'bad');
    toast('⚠️ Overdraft! Get money in before next Monday.');
  } else S.overdraftWeeks = 0;
}

function monthly() {
  const bill = S.bg === 'oldmoney' && !S.flags.cutOff ? 0 : 110;
  if (bill) { S.money -= bill; S.stats.spent += bill; log(`🧾 Council tax, phone and Wi-Fi: -${money(bill)}.`, 'bad'); }
}

// ---------------------------------------------------------------- effects & log

const NEED_LABELS = { hunger: 'Hunger', energy: 'Energy', fun: 'Fun', social: 'Social', hygiene: 'Hygiene' };
const SKILL_LABELS = { hustle: 'Hustle', charm: 'Charm', code: 'Coding' };

function fx(e = {}) {
  const chips = [];
  for (const k in e) {
    const v = e[k];
    if (!v) continue;
    if (k in S.needs) { S.needs[k] = clamp(S.needs[k] + v); chips.push(`${v > 0 ? '+' : ''}${Math.round(v)} ${NEED_LABELS[k]}`); }
    else if (k in S.skills) { S.skills[k] = clamp(S.skills[k] + v); chips.push(`${v > 0 ? '+' : ''}${v} ${SKILL_LABELS[k]}`); }
    else if (k === 'money') {
      S.money = round2(S.money + v);
      if (v > 0) S.stats.earned += v; else S.stats.spent -= v;
      chips.push(`${v > 0 ? '+' : '-'}${money(Math.abs(v))}`);
    } else if (k === 'family') { S.family = clamp(S.family + v); chips.push(`${v > 0 ? '+' : ''}${v} Family`); }
  }
  return chips.length ? ` (${chips.join(', ')})` : '';
}

function log(text, kind = '') {
  S.log.unshift({ t: `D${day()} ${clock()}`, text, kind });
  S.log.length = Math.min(S.log.length, 60);
}

let toastTimer;
function toast(msg) {
  const el = $('#toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2600);
}

const mood = () => {
  const n = S.needs;
  return (n.hunger + n.energy + n.fun + n.social + n.hygiene) / 5;
};
function moodLabel(m) {
  if (m >= 75) return ['😄', 'Thriving'];
  if (m >= 55) return ['🙂', 'Doing alright'];
  if (m >= 35) return ['😐', 'Getting by'];
  if (m >= 20) return ['😩', 'Struggling'];
  return ['😵', 'Burnt out'];
}
const netWorth = () => round2(S.money - S.debt);

// ---------------------------------------------------------------- travel

const ADJ = {};
for (const line of LINES) {
  for (let i = 0; i < line.stops.length - 1; i++) {
    const [a, b] = [line.stops[i], line.stops[i + 1]];
    (ADJ[a] ||= new Set()).add(b);
    (ADJ[b] ||= new Set()).add(a);
  }
}
function hops(a, b) {
  if (a === b) return 0;
  const seen = new Set([a]);
  let frontier = [a], n = 0;
  while (frontier.length) {
    n++;
    const next = [];
    for (const s of frontier) for (const t of ADJ[s] || []) {
      if (t === b) return n;
      if (!seen.has(t)) { seen.add(t); next.push(t); }
    }
    frontier = next;
  }
  return Infinity;
}
const dist = (a, b) => Math.hypot(LOCATIONS[a].x - LOCATIONS[b].x, LOCATIONS[a].y - LOCATIONS[b].y);

function travelOptions(to) {
  const from = S.loc;
  const d = dist(from, to);
  const z1 = LOCATIONS[from].zone, z2 = LOCATIONS[to].zone;
  const zmin = Math.min(z1, z2), zmax = Math.max(z1, z2);
  const h = hops(from, to);
  const opts = [];

  let fare = (zmin === 1 ? 2.8 : 2.1) + 0.55 * (zmax - zmin) - (isPeak() ? 0 : 0.4);
  if (from === 'heathrow' || to === 'heathrow') fare += 1.6;
  const cap = 8.9 + 1.6 * Math.max(0, zmax - 2);
  const tubeCost = round2(Math.max(0, Math.min(fare, cap - S.fares.tube)));
  opts.push({
    mode: 'tube', label: '🚇 Tube', mins: Math.round(6 + h * 7), cost: tubeCost,
    note: (isPeak() ? 'Peak fare' : 'Off-peak') + (tubeCost < round2(fare) ? ', daily cap hit' : ''),
    disabled: S.strike ? 'RMT strike: no Tube today' : !tubeOpen() ? 'Closed. Night Tube runs Fri & Sat only' : null,
  });
  opts.push({
    mode: 'bus', label: '🚌 Bus', mins: Math.round(15 + d * 0.17), cost: round2(Math.max(0, Math.min(1.75, 5.25 - S.fares.bus))),
    note: S.strike ? 'Rammed because of the strike' : 'Hopper fare',
  });
  const cycleMins = Math.round(5 + d * 0.09);
  opts.push({
    mode: 'cycle', label: '🚲 Santa Cycle', mins: cycleMins, cost: round2(1.65 * Math.ceil(cycleMins / 30)),
    note: S.weather === 'rain' ? 'In the rain, brave' : 'Hire bike',
    disabled: d > 480 ? 'Too far to cycle' : null,
  });
  opts.push({
    mode: 'walk', label: '🚶 Walk', mins: Math.round(d * 0.28), cost: 0,
    note: d > 260 ? 'A very long, very free walk' : 'Free, but tiring',
  });
  const late = hour() >= 23 || hour() < 5;
  opts.push({
    mode: 'cab', label: '🚕 Ubah', mins: Math.round(8 + d * 0.11), cost: Math.round((8 + d * 0.05) * (late ? 1.6 : 1)),
    note: late ? 'Late-night surge' : 'Door to door',
  });
  for (const o of opts) if (!o.disabled && o.cost > S.money) o.disabled = 'Not enough money';
  return opts;
}

function travel(to, mode) {
  const o = travelOptions(to).find((x) => x.mode === mode);
  if (!o || o.disabled) return;
  closeModal();
  const from = S.loc;
  S.money = round2(S.money - o.cost);
  S.stats.spent += o.cost;
  if (mode === 'tube') { S.fares.tube += o.cost; S.stats.tubeTrips++; }
  if (mode === 'bus') { S.fares.bus += o.cost; S.stats.busTrips++; }
  const tiring = { walk: Math.min(60, o.mins * 0.12), cycle: o.mins * 0.15, tube: 3, bus: 3, cab: 0 }[mode];
  let extra = '';
  let mins = o.mins;
  if ((mode === 'tube' || mode === 'bus') && chance(0.22)) {
    const inc = pick(TUBE_INCIDENTS);
    if (inc.mins) mins += inc.mins;
    extra = ' ' + inc.text + fx({ fun: inc.fun, energy: inc.energy, hygiene: inc.hygiene, money: inc.money });
  }
  if (mode === 'cycle' && S.weather === 'rain') fx({ hygiene: -8, fun: -3 });
  if (mode === 'walk' && S.weather === 'sun') fx({ fun: 4 });
  advance(mins);
  fx({ energy: -tiring });
  S.loc = to;
  log(`${o.label.split(' ')[0]} ${LOCATIONS[from].name} → ${LOCATIONS[to].name} (${mins} min${o.cost ? ', ' + money(o.cost) : ''}).${extra}`);
  afterAction();
}

// ---------------------------------------------------------------- jobs

function jobReq(id) {
  const req = { ...JOBS[id].req };
  if (id === 'dev' && S.perks.priya30) req.code = 30;
  if (id === 'analyst' && S.perks.tom60) { req.charm -= 15; req.code -= 15; }
  return req;
}
function missingReq(id) {
  const req = jobReq(id);
  return Object.keys(req).filter((k) => S.skills[k] < req[k]).map((k) => `${SKILL_LABELS[k]} ${req[k]}`);
}

function applyJob(id) {
  const j = JOBS[id];
  let p = 0.45 + mood() / 250 + S.skills.charm / 400;
  if (S.needs.hygiene < 30) p -= 0.25;
  if (id === 'care' && S.perks.chidi30) p = 1;
  if (id === 'analyst' && S.bg === 'oldmoney') p += 0.15;
  if (chance(p)) {
    const old = S.job;
    S.job = id;
    return `🎉 You got the job: ${j.title}! ${money(j.pay)}/hr.${old ? ` Goodbye, ${JOBS[old].title}.` : ''}${j.sponsor && S.visa && S.visa.type === 'student' ? ' They can SPONSOR your visa. Go to Lunar House in Croydon!' : ''}`;
  }
  return pick([
    '😞 "We\'ve decided to go with another candidate." Classic.',
    '😞 The interviewer asked where you see yourself in five years. You said "London". Not enough.',
    '😞 No luck this time. They "will keep your CV on file".',
  ]);
}

function workShift(hrs) {
  const j = JOBS[S.job];
  const factor = 0.75 + mood() / 400;
  let pay = round2(hrs * j.pay * factor);
  if (hrs >= 12) pay = round2(pay * 1.2);
  S.weekHours += hrs;
  S.stats.shifts++;
  const tip = S.job === 'barista' || S.job === 'rider' ? Math.round(Math.random() * 8) : 0;
  const lines = {
    rider: ['Got splashed by a bus on Camden High Street.', 'Someone tipped £5. Faith in humanity restored.', 'Delivered 14 orders of Peri Palace.'],
    barista: ['Wrote "Jon" on a cup for a man called Siobhan.', 'Made 212 oat flat whites.', 'A banker said "cheers mate" and meant it.'],
    retail: ['Folded the same jumper eleven times.', 'A customer asked if you "had it in the back".', 'The mall was packed. Your feet are destroyed.'],
    care: ['Mrs Patel told you about the Blitz again. You love her.', 'Long shift, but you made a real difference today.', 'Covered for a colleague who had to go to the GP.'],
    dev: ['Fixed a bug that turned out to be a missing semicolon.', 'Sat through a two-hour "quick sync".', 'Shipped a feature. The founder tweeted about it.'],
    analyst: ['Built a 90-tab spreadsheet. Nobody will read it.', 'Your MD said "good work". You\'ll remember it forever.', 'Ate dinner at your desk at 11pm.'],
  }[S.job];
  return `💼 Worked ${hrs}h as ${j.title}. ${pick(lines)}` + fx({ money: pay + tip, energy: -hrs * 3.5, fun: -hrs * 1.5, hustle: 1 });
}

// ---------------------------------------------------------------- NPC perks

const PERKS = {
  chidi30: { npc: 'chidi', at: 30, text: '🧑🏿 Chidi: "That care home in Croydon dey sponsor visa o. Tell them say na me send you." (Care job interview is now guaranteed.)' },
  chidi60: { npc: 'chidi', at: 60, run: () => { if (S.home === 'woolwich') { S.rent -= 25; return '🧑🏿 Chidi found you a cheaper room on the same street. Rent -£25/week!'; } return '🧑🏿 Chidi sent you home with a cooler of jollof and £100 "for transport".' + fx({ money: 100, hunger: 40 }); } },
  jade30: { npc: 'jade', at: 30, text: '👩🏾 Jade sorted you a pitch at her mate\'s Camden stall. Market earnings boosted!' },
  jade60: { npc: 'jade', at: 60, run: () => '👩🏾 Jade cut you in on a vintage reselling flip.' + fx({ money: 250, hustle: 4 }) },
  tom30: { npc: 'tom', at: 30, run: () => '👱🏼‍♂️ Tom invited you to polo. You learned when to clap.' + fx({ charm: 6, fun: 20 }) },
  tom60: { npc: 'tom', at: 60, text: '👱🏼‍♂️ Tom put in a word with his uncle at the bank. Analyst requirements are lower for you now.' },
  priya30: { npc: 'priya', at: 30, text: '👩🏽‍💻 Priya: "That startup is desperate for juniors. Coding 30 will do." (Dev job requirement lowered.)' },
  priya60: { npc: 'priya', at: 60, run: () => '👩🏽‍💻 Priya passed you a freelance website gig for a Shoreditch café.' + fx({ money: 400, code: 3 }) },
};

function hangOut(id) {
  const npc = NPCS[id];
  S.rel[id] = clamp(S.rel[id] + 12 + Math.round(S.skills.charm / 15));
  const lines = {
    chidi: ['Chidi showed you which Woolwich shops sell real Nigerian pepper.', 'You and Chidi argued about Arsenal for two hours.', 'Chidi shared his japa war stories.'],
    jade: ['Jade did your nails while spilling all the Peckham gossip.', 'You and Jade went thrifting on Rye Lane.', 'Jade taught you the 12 bus route by heart.'],
    tom: ['Tom took you to his members\' club. The sandwiches had no crusts.', 'Tom confessed he\'s never been to Zone 3.', 'You taught Tom what "wagwan" means.'],
    priya: ['Priya reviewed your CV and deleted half of it.', 'You went to Priya\'s DJ set in a converted warehouse.', 'Priya explained what a "Series A" is. Twice.'],
  }[id];
  let out = `${npc.emoji} ${pick(lines)}` + fx({ social: 25, fun: 10 });
  for (const [key, p] of Object.entries(PERKS)) {
    if (p.npc === id && !S.perks[key] && S.rel[id] >= p.at) {
      S.perks[key] = true;
      const msg = p.run ? p.run() : p.text;
      S.queue.push({ perk: msg });
    }
  }
  return out;
}

// ---------------------------------------------------------------- location actions

function act(label, o) { return { label, mins: 60, cost: 0, ...o }; }
function openBetween(a, b) {
  const h = hour();
  return a < b ? h >= a && h < b : h >= a || h < b;
}

function placeActions(loc) {
  const A = [];
  const atHome = loc === S.home;
  const h = hour();

  if (atHome) {
    const quality = S.bg === 'oldmoney' ? 100 : 85;
    A.push(act('😴 Sleep (8h)', { mins: 480, sleep: true, run: () => '😴 You slept.' + fx({ energy: quality, hygiene: -5 }) }));
    A.push(act('💤 Nap (2h)', { mins: 120, sleep: true, run: () => '💤 Power nap.' + fx({ energy: 22 }) }));
    A.push(act('🚿 Shower', { mins: 20, run: () => '🚿 Fresh.' + fx({ hygiene: 100, fun: 2 }) }));
    A.push(act('🍳 Cook a meal', {
      mins: 60, disabled: S.groceries < 1 ? 'No groceries. Buy some at a market' : null,
      run: () => { S.groceries--; return '🍳 You cooked ' + pick(['jollof rice', 'egusi and pounded yam', 'pasta with too much cheese', 'a fry-up', 'chicken curry']) + '.' + fx({ hunger: 50, fun: 4 }); },
    }));
    A.push(act('📺 Watch telly', { mins: 120, run: () => '📺 ' + pick(['Binged Top Boy.', 'Watched Bake Off. Cried a little.', 'Watched Nollywood on YouTube.', 'Watched Love Island and judged everyone.']) + fx({ fun: 22, energy: 5 }) }));
    if (S.bg === 'immigrant') {
      A.push(act('📞 Call home', { mins: 60, run: () => '📞 Mummy asked if you\'ve "seen the Queen\'s son yet". ' + fx({ social: 22, family: 6, fun: 6 }) }));
      A.push(act('💸 Send £100 home', { mins: 10, cost: 100, run: () => { S.stats.sentHome += 100; return '💸 Sent £100 home. The family group chat is full of prayers for you.' + fx({ family: 15, fun: 5 }); } }));
    } else {
      A.push(act('💬 Group chat', { mins: 45, run: () => '💬 ' + pick(['The group chat roasted your new haircut.', 'Someone posted a voice note longer than a podcast.', 'Planned a holiday you will never go on.']) + fx({ social: 15, fun: 5 }) }));
    }
    if (S.debt > 0) {
      for (const amt of [100, 500]) {
        const pay = Math.min(amt, S.debt);
        A.push(act(`💳 Pay ${money(pay)} off QuickCash`, { mins: 5, cost: pay, run: () => { S.debt = round2(S.debt - pay); return `💳 Paid ${money(pay)} off your debt. ${S.debt > 0 ? money(S.debt) + ' to go.' : 'DEBT FREE! 🎉'}`; } }));
      }
    }
  }

  // Food
  const chicken = ['peckham', 'brixton', 'woolwich', 'camden', 'stratford', 'croydon', 'soho'];
  if (chicken.includes(loc)) A.push(act('🍗 Chicken shop (£4.50)', { mins: 20, cost: 4.5, run: () => '🍗 Two wings, chips and a Rubicon. Peak London cuisine.' + fx({ hunger: 35, fun: 4, hygiene: -3 }) }));
  if (['city', 'kingscross', 'oxford', 'southbank', 'canary', 'shoreditch', 'heathrow'].includes(loc)) {
    const price = loc === 'heathrow' ? 12 : 6.2;
    A.push(act(`🥪 Meal deal at Prest (${money(price)})`, { mins: 15, cost: price, run: () => '🥪 Sad desk-lunch sandwich. It did the job.' + fx({ hunger: 28 }) }));
  }
  if (GROCERY_SHOPS[loc]) {
    const g = GROCERY_SHOPS[loc];
    A.push(act(`🛒 Groceries, ${g.name} (${money(g.price)})`, { mins: 30, cost: g.price, disabled: openBetween(7, 22) ? null : 'Closed', run: () => { S.groceries += 5; return `🛒 Bought groceries at ${g.name}: 5 home-cooked meals.`; } }));
  }

  // Jobs here
  for (const [id, j] of Object.entries(JOBS)) {
    if (j.place !== loc) continue;
    if (S.job === id) {
      let cap = null;
      if (S.visa && S.visa.type === 'student') cap = 20 - S.weekHours;
      const shiftOk = openBetween(5, 22) ? null : 'Shifts run 5am to 10pm';
      for (const hrs of id === 'analyst' ? [8, 12] : [4, 8]) {
        const capMsg = cap !== null && hrs > cap ? `Student visa: max 20h/week (${cap}h left)` : null;
        A.push(act(`💼 Work ${hrs}h shift`, { mins: hrs * 60, disabled: shiftOk || capMsg, sub: `~${money(Math.round(j.pay * hrs))}`, run: () => workShift(hrs) }));
      }
    } else {
      const miss = missingReq(id);
      let dis = miss.length ? 'Needs ' + miss.join(', ') : null;
      if (!dis && id === 'analyst' && !S.outfit) dis = 'Needs a smart outfit (Oxford Circus)';
      if (!dis && !openBetween(9, 18)) dis = 'Interviews 9am to 6pm';
      A.push(act(`📝 Apply: ${j.title}`, { mins: 120, disabled: dis, sub: `${money(j.pay)}/hr${j.sponsor ? ' · sponsors visas' : ''}`, run: () => applyJob(id) }));
    }
  }

  // NPCs
  for (const [id, n] of Object.entries(NPCS)) {
    if (n.place === loc) A.push(act(`${n.emoji} Hang out with ${n.name}`, { mins: 120, sub: `Friendship ${S.rel[id]}/100`, run: () => hangOut(id) }));
  }

  // Place specials
  const sunny = S.weather === 'sun' || S.weather === 'heat';
  const specials = {
    heathrow: [
      S.bg === 'immigrant'
        ? act('🇳🇬 Fly to Lagos for 3 days', { mins: 4320, cost: 850, run: () => '🇳🇬 Home! Mummy cooked everything. Everyone asked when you\'re building a house.' + fx({ social: 60, fun: 60, family: 30, energy: 20 }) })
        : act('🏝️ Weekend in Ibiza', { mins: 2880, cost: 450, run: () => '🏝️ Two days in Ibiza. Your bank account is crying, you are not.' + fx({ fun: 70, social: 40, energy: -20 }) }),
      act('✈️ Plane spotting', { mins: 60, run: () => '✈️ Watched planes land. Remembered why you came.' + fx({ fun: 8 }) }),
    ],
    hydepark: [
      act('🌳 Walk in the park', { mins: 60, run: () => (sunny ? '🌳 Gorgeous day in Hyde Park. All of London is here.' : '🌳 A soggy but peaceful walk.') + fx({ fun: sunny ? 18 : 8, energy: -4 }) }),
      act('🏊 Swim in the Serpentine', { mins: 90, cost: 5, disabled: sunny ? null : 'Too cold. Wait for sun', run: () => '🏊 Wild swimming! Freezing. Glorious.' + fx({ fun: 25, hygiene: -10, energy: -8 }) }),
      act("🗣️ Rant at Speakers' Corner", { mins: 60, run: () => '🗣️ You gave a passionate speech about Tube fares. Three people clapped.' + fx({ charm: 3, fun: 8 }) }),
    ],
    chelsea: [
      act("🥂 Brunch on King's Road", { mins: 90, cost: 28, disabled: openBetween(9, 16) ? null : 'Brunch is 9am to 4pm', run: () => '🥂 Avocado, eggs and a Bloody Mary. Very Chelsea.' + fx({ hunger: 45, fun: 12, social: 8, charm: 1 }) }),
      act('🖼️ Saatchi Gallery', { mins: 120, run: () => '🖼️ Stared at modern art. Nodded thoughtfully.' + fx({ fun: 12, charm: 1 }) }),
    ],
    oxford: [
      act('👔 Smart outfit, Marks & Spensa', { mins: 60, cost: 90, disabled: S.outfit ? 'You already have one' : openBetween(9, 21) ? null : 'Shops closed', run: () => { S.outfit = true; return '👔 Bought an interview suit. You look like a Canary Wharf person now.' + fx({ charm: 4, fun: 6 }); } }),
      act('🛍️ New fit at Primork (£25)', { mins: 60, cost: 25, disabled: openBetween(9, 21) ? null : 'Shops closed', run: () => '🛍️ New fit. The drip is cheap but the drip is real.' + fx({ fun: 12, charm: 1 }) }),
      act('🪟 Window shopping', { mins: 60, run: () => '🪟 Looked at things you can\'t afford. Free entertainment.' + fx({ fun: 5, energy: -4 }) }),
    ],
    soho: [
      act('🍺 Pint at the pub (£7.20)', { mins: 90, cost: 7.2, disabled: openBetween(11, 24) ? null : 'Pubs are shut', run: () => { S.stats.pints++; return '🍺 ' + pick(['£7.20 for a pint. London innit.', 'Ended up in a deep chat with a stranger from Leeds.', 'Pub quiz. Your team came 2nd.']) + fx({ social: 18, fun: 12, charm: 1 }); } }),
      act('🎭 West End show', { mins: 180, cost: 45, disabled: h >= 18 && h < 21 ? null : 'Shows start 6pm to 9pm', run: () => '🎭 Saw a musical. You will be humming it for a week.' + fx({ fun: 40, social: 5 }) }),
      act('🎤 Comedy open mic', { mins: 120, disabled: h >= 19 || h < 1 ? null : 'Evenings only', run: () => chance(0.3 + S.skills.charm / 200) ? '🎤 Your joke about the Elizabeth line KILLED.' + fx({ charm: 5, fun: 25 }) : '🎤 Silence. Someone coughed.' + fx({ charm: 2, fun: -8 }) }),
    ],
    southbank: [
      act('🎡 Ride the London Eye', { mins: 60, cost: 32, run: () => '🎡 All of London below you. Worth it (once).' + fx({ fun: 22 }) }),
      act('🏛️ Tate Modern (free)', { mins: 120, run: () => '🏛️ Free culture! Saw a giant spider sculpture.' + fx({ fun: 12, charm: 1 }) }),
      act('🚶 Thames walk to Big Ben', { mins: 60, run: () => '🚶 Big Ben bonged as you walked past. Main character moment.' + fx({ fun: sunny ? 15 : 8, energy: -4 }) }),
      act('🎸 Busk on the South Bank', { mins: 180, run: () => { const e = Math.round(10 + S.skills.charm * 0.6 + Math.random() * 25); return `🎸 Busked by the river and made ${money(e)}.` + fx({ money: e, charm: 2, fun: 5, energy: -8 }); } }),
    ],
    camden: [
      act('🧥 Sell at the market stall', { mins: 180, disabled: openBetween(10, 18) ? null : 'Market open 10am to 6pm', run: () => { const e = Math.round((15 + S.skills.hustle * 1.2 + Math.random() * 30) * (S.perks.jade30 ? 1.6 : 1)); return `🧥 Sold vintage at Camden Market: ${money(e)}.` + fx({ money: e, hustle: 2, energy: -10, social: 6 }); } }),
      act('🎸 Gig at the Roundhouse', { mins: 180, cost: 18, disabled: h >= 19 && h < 23 ? null : 'Gigs start 7pm', run: () => '🎸 Sweaty, loud, brilliant.' + fx({ fun: 35, social: 15, energy: -10, hygiene: -10 }) }),
      act('🛶 Walk the canal', { mins: 60, run: () => '🛶 Strolled along Regent\'s Canal past the narrowboats.' + fx({ fun: 10 }) }),
    ],
    kingscross: [
      act('📚 Study coding, British Library', { mins: 180, disabled: openBetween(9, 20) ? null : 'Library open 9am to 8pm', run: () => '📚 Three hours of tutorials. ' + pick(['Finally understood loops.', 'Built a to-do app.', 'Learned what an API is.']) + fx({ code: 5, energy: -10, fun: -4 }) }),
      act('💻 Paid bootcamp module', { mins: 240, cost: 60, run: () => '💻 Intensive bootcamp session. Your brain hurts, in a good way.' + fx({ code: 10, energy: -15 }) }),
      ...(S.bg === 'immigrant' ? [act('🇬🇧 Revise "Life in the UK"', { mins: 120, run: () => { S.flags.lifeUkPrep = (S.flags.lifeUkPrep || 0) + 1; return '🇬🇧 Memorised the year of the Battle of Hastings and how tall Big Ben is.' + fx({ fun: -3 }); } })] : []),
    ],
    city: [
      act('🍷 After-work drinks', { mins: 90, cost: 9, disabled: h >= 17 && h < 23 ? null : 'After 5pm', run: () => { S.stats.pints++; return '🍷 Drinks with City types. You collected three business cards.' + fx({ social: 14, charm: 3, fun: 8 }); } }),
      act('🏛️ Leadenhall Market wander', { mins: 45, run: () => '🏛️ Beautiful Victorian market. You took a photo for Instagram.' + fx({ fun: 6 }) }),
    ],
    shoreditch: [
      act('🍕 Tech meetup (free pizza)', { mins: 150, disabled: h >= 18 && h < 22 ? null : 'Meetups are 6pm to 10pm', run: () => { S.rel.priya = clamp(S.rel.priya + 5); return '🍕 Ate free pizza and nodded through a talk about AI.' + fx({ hunger: 30, code: 3, charm: 2, social: 12 }); } }),
      act('🥯 Salt beef bagel, Brick Lane', { mins: 20, cost: 3.5, run: () => '🥯 Brick Lane bagel. Open 24/7, mustard on point.' + fx({ hunger: 32, fun: 5 }) }),
      act('🎨 Street art tour', { mins: 60, run: () => '🎨 Spotted a Banksy (probably).' + fx({ fun: 10 }) }),
    ],
    stratford: [
      act('🏟️ Walk the Olympic Park', { mins: 60, run: () => '🏟️ Walked round the London Stadium. Felt very sporty.' + fx({ fun: 10, energy: -4 }) }),
      act('🌀 The Orbit slide', { mins: 60, cost: 20, run: () => '🌀 World\'s longest tunnel slide. You screamed.' + fx({ fun: 28 }) }),
    ],
    canary: [
      act('🍸 Rooftop networking', { mins: 120, cost: 22, disabled: h >= 17 ? null : 'After 5pm', run: () => '🍸 Swapped LinkedIns with three VPs.' + fx({ charm: 4, social: 10, fun: 6 }) }),
    ],
    woolwich: [
      act('🎉 Owambe party', { mins: 300, cost: 20, disabled: dow() === 5 && h >= 14 ? null : 'Owambe is Saturday afternoon', run: () => { S.rel.chidi = clamp(S.rel.chidi + 8); return '🎉 Aso-ebi, jollof and spraying money on the dance floor. Lagos in London!' + fx({ fun: 40, social: 35, hunger: 40, energy: -15 }); } }),
      act('⛴️ Ride the Woolwich Ferry', { mins: 45, run: () => '⛴️ Free ferry across the Thames. Underrated.' + fx({ fun: 8 }) }),
      act('🍛 Jollof at Mama Put (£10)', { mins: 45, cost: 10, run: () => '🍛 Proper smoky party jollof. Tastes like home.' + fx({ hunger: 50, fun: 8 }) }),
    ],
    peckham: [
      act('💇 Braids at the salon', { mins: 240, cost: 45, run: () => '💇 Four hours in the chair. Your hair is a masterpiece.' + fx({ charm: 4, hygiene: 15, fun: 10, social: 10 }) }),
      act('🌇 Rooftop bar sunset', { mins: 120, cost: 9, disabled: sunny || S.weather === 'grey' ? null : 'Rooftop shut, it\'s raining', run: () => '🌇 Sunset over the London skyline from a Peckham car park roof.' + fx({ fun: 20, social: 10 }) }),
      act('📦 Flip trainers online', { mins: 120, run: () => { const e = Math.round(S.skills.hustle * 0.8 + Math.random() * 30 - 10); return e > 0 ? `📦 Flipped a pair of trainers for ${money(e)} profit.` + fx({ money: e, hustle: 2 }) : '📦 Nobody bought. They\'re in your wardrobe now.' + fx({ hustle: 1, fun: -4 }); } }),
    ],
    brixton: [
      act('🌮 Brixton Village food', { mins: 60, cost: 12, run: () => '🌮 Jerk chicken from Brixton Village. Elite.' + fx({ hunger: 45, fun: 10 }) }),
      act('🎶 Club night at the Academy', { mins: 240, cost: 25, disabled: h >= 21 || h < 2 ? null : 'Opens 9pm', run: () => '🎶 Danced till your legs gave up.' + fx({ fun: 40, social: 20, energy: -20, hygiene: -15 }) }),
    ],
    croydon: [
      act('📦 Boxpark food & drinks', { mins: 90, cost: 14, run: () => '📦 Food and a pint at Boxpark Croydon.' + fx({ hunger: 40, fun: 10, social: 6 }) }),
    ],
  };
  A.push(...(specials[loc] || []));

  // Home Office at Lunar House
  if (loc === 'croydon' && S.bg === 'immigrant') {
    if (S.visa.type === 'student') {
      const sponsored = S.job && JOBS[S.job].sponsor;
      A.push(act('🛂 Apply: Skilled Worker visa', {
        mins: 240, cost: 1500, sub: 'Fees + NHS surcharge',
        disabled: !sponsored ? 'Need a job that sponsors visas' : !openBetween(9, 16) ? 'Lunar House: 9am to 4pm' : null,
        run: () => { S.visa = { type: 'skilled' }; S.flags.visaDay = day(); return '🛂 After four hours in the queue... APPROVED! Skilled Worker visa granted. You can stay! 🇬🇧'; },
      }));
    }
    if (!S.flags.lifeUk) {
      A.push(act('📝 Take "Life in the UK" test', {
        mins: 120, cost: 50, disabled: openBetween(9, 16) ? null : 'Test centre: 9am to 4pm',
        run: () => {
          const prep = S.flags.lifeUkPrep || 0;
          if (chance(0.25 + prep * 0.25)) { S.flags.lifeUk = true; return '📝 PASSED! You now know more British history than most Brits.' + fx({ fun: 15 }); }
          return '📝 Failed. Who knew how many people are in the House of Lords? Revise at the British Library.' + fx({ fun: -10 });
        },
      }));
    }
  }

  A.push(act('⏳ Hang about (1h)', { mins: 60, run: () => '⏳ ' + pick(['People-watched for an hour.', 'Scrolled TikTok on a bench.', 'Watched pigeons fight over a chip.']) }));
  for (const a of A) if (!a.disabled && a.cost > S.money) a.disabled = 'Not enough money';
  return A;
}

function runAction(a) {
  if (a.disabled || S.over) return;
  if (a.cost) { S.money = round2(S.money - a.cost); S.stats.spent += a.cost; }
  advance(a.mins, { sleep: a.sleep });
  if (S.over) return afterAction();
  const text = a.run ? a.run() : '';
  if (text) log(text, /🎉|APPROVED|PASSED|DEBT FREE/.test(text) ? 'good' : /😞|Failed/.test(text) ? 'bad' : '');
  afterAction();
}

function crisis() {
  const n = S.needs;
  if (n.energy <= 0) {
    log(S.loc === S.home
      ? '😵 You collapsed into bed fully dressed and slept 10 hours.'
      : `😵 You passed out in ${LOCATIONS[S.loc].name}. A stranger called 111. You woke up in A&E nine hours later. (Free, thank you NHS.)`, 'bad');
    advance(600, { sleep: true });
    n.energy = 55;
    n.fun = clamp(n.fun - 15);
    toast('😵 You collapsed from exhaustion!');
  }
  if (n.hunger <= 0) {
    fx({ energy: -10, fun: -8 });
    log('🍽️ You are starving. Eat something before you collapse!', 'bad');
  }
  if (n.hygiene <= 5 && !S.flags.smellWarn) {
    S.flags.smellWarn = true;
    log('🦨 People are moving away from you on the bus. Shower!', 'bad');
  }
}

function afterAction() {
  if (!S.over) crisis();
  if (!S.over) checkEnd();
  if (!S.over && goalMet() && !S.flags.goalToast) {
    S.flags.goalToast = true;
    toast('🏆 Goal reached! Keep it up until day 60.');
    log('🏆 You\'ve hit your goal! Hold on to it until day 60.', 'good');
  }
  save();
  render();
  processQueue();
}

// ---------------------------------------------------------------- events

const EVENTS = {
  strike: { title: '🚇 Tube strike!', text: 'The RMT has called a strike. No Tube today. Buses will be rammed and everyone will be late.', choices: [{ label: 'Typical. Bus it is.', run: () => '' }] },
  heatwave: { title: '🥵 Heatwave', text: '33°C. The Central line is hotter than the legal limit for transporting cattle. Nobody in London owns a fan.', choices: [{ label: 'Suffer in silence', run: () => fx({ energy: -10, hygiene: -10 }) }] },
  chidiHello: { title: '📱 WhatsApp from Chidi', text: '"Welcome to London my guy! Come to Woolwich, I go show you road. Rule one: always stand on the right."', choices: [{ label: 'On my way!', run: () => fx({ social: 10, fun: 5 }) }] },
  visaWarn: { title: '🛂 Home Office letter', text: 'Your student visa expires on day 35. If you\'re not on a Skilled Worker visa by then, you\'re going home. Get a job that sponsors visas, then apply at Lunar House in Croydon.', choices: [{ label: 'No pressure then 😬', run: () => fx({ fun: -5 }) }] },
  paterCall: { title: '📞 Pater calls', text: '"I\'ve spoken to your mother. We\'re worried you have no ambition. Show us you can stand on your own two feet."', choices: [{ label: '"Yes, Pater."', run: () => '' }, { label: '"I\'m literally an influencer."', run: () => fx({ fun: 5, family: -10 }) }] },
  cutOff: {
    title: '💀 Cut off', text: 'Pater has had enough. "No more allowance. I\'ll pay half the Chelsea rent and not a penny more. It\'s time you worked."',
    choices: [{ label: 'Gulp.', run: () => { S.allowance = 0; S.rent = 350; S.flags.cutOff = true; return fx({ fun: -15 }); } }],
  },
  debtIntro: { title: '💳 QuickCash Loans', text: 'Friendly reminder! Your £2,000 loan costs 2% interest a week. We\'ll take £80 every Monday. Have a lovely day ❤️', choices: [{ label: 'Wonderful.', run: () => fx({ fun: -5 }) }] },
};

const RANDOM_EVENTS = {
  rentHike: {
    cond: () => S.rent > 0, title: '🏠 Message from your landlord', text: '"Due to market conditions, rent is going up £15 a week from Monday. Thanks."',
    choices: [
      { label: 'Accept it 😩', run: () => { S.rent += 15; return fx({ fun: -5 }); } },
      { label: 'Push back politely', run: () => { if (S.skills.charm >= 35) return ' Your charm worked. Rent stays the same!'; S.rent += 15; return ' They didn\'t budge.' + fx({ fun: -8 }); } },
    ],
  },
  mumMoney: {
    cond: () => S.bg === 'immigrant', title: '📞 Mummy calls', text: '"Your brother\'s school fees are due. Just £100 small. God will bless you."',
    choices: [
      { label: 'Send £100', cost: 100, run: () => { S.stats.sentHome += 100; return fx({ money: -100, family: 15, social: 10 }); } },
      { label: 'Say you\'re broke', run: () => fx({ family: -12, fun: -10 }) },
    ],
  },
  klarnu: {
    cond: () => S.bg === 'newgen', title: '📱 Klarnu', text: 'Your "pay in 4" instalment of £45 for those trainers is due.',
    choices: [
      { label: 'Pay £45', cost: 45, run: () => fx({ money: -45 }) },
      { label: 'Ignore it', run: () => { S.debt += 60; return ' Added £60 (with fees) to your debt.' + fx({ fun: -4 }); } },
    ],
  },
  henley: {
    cond: () => S.bg === 'oldmoney' && !S.flags.cutOff, title: '🚣 Henley Regatta', text: 'Mummy wants you at Henley. Blazers, boats and Pimm\'s.',
    choices: [
      { label: 'Go (whole day)', run: () => { advance(360); return fx({ fun: 25, charm: 4, social: 20 }); } },
      { label: 'Decline', run: () => fx({ family: -8 }) },
    ],
  },
  fox: { cond: () => true, title: '🦊 Urban fox', text: 'A fox ripped open your bin bags and screamed outside your window at 3am.', choices: [{ label: 'Classic London.', run: () => fx({ energy: -12, fun: -4 }) }] },
  phone: {
    cond: () => S.money > 50, title: '🛵 Phone snatched!', text: 'A moped thief grabbed your phone right out of your hand on the high street.',
    choices: [
      { label: 'Buy a new one (£180)', cost: 180, run: () => fx({ money: -180, fun: -8 }) },
      { label: 'Use your old cracked phone', run: () => fx({ social: -15, charm: -2 }) },
    ],
  },
  carnival: {
    cond: () => day() >= 22 && day() <= 32 && isWeekend() && !S.flags.carnival, title: '🎊 Notting Hill Carnival!', text: 'Steel drums, sound systems, jerk chicken and a million people. It only happens once a year.',
    choices: [
      { label: 'Go! (£25, 6h)', cost: 25, run: () => { S.flags.carnival = true; advance(360); return fx({ money: -25, fun: 45, social: 30, hunger: 30, energy: -20 }); } },
      { label: 'Too crowded', run: () => { S.flags.carnival = true; return fx({ fun: -5 }); } },
    ],
  },
  crypto: {
    cond: () => S.money > 250, title: '🚀 "Guaranteed" crypto', text: 'Your cousin swears $JOLLOF coin is going to the moon. "Put £200 in. Trust me."',
    choices: [
      { label: 'Invest £200', cost: 200, run: () => chance(0.3) ? ' IT MOONED! You cashed out £450.' + fx({ money: 250 }) : ' It rugged. £200 gone.' + fx({ money: -200, fun: -10 }) },
      { label: 'Nah, I\'m good', run: () => '' },
    ],
  },
  bday: {
    cond: () => true, title: '🎂 Birthday dinner', text: 'Your mate\'s birthday at a Shoreditch rooftop. "Set menu £60 pp, we\'ll split the bill."',
    choices: [
      { label: 'Go (£60)', cost: 60, run: () => fx({ money: -60, social: 25, fun: 15 }) },
      { label: '"Can\'t make it 🙏"', run: () => fx({ social: -10 }) },
    ],
  },
  boiler: { cond: () => S.bg !== 'oldmoney', title: '🔥 Boiler broke', text: 'No hot water. The landlord says someone will come "early next week".', choices: [{ label: 'Cold showers it is', run: () => fx({ hygiene: -15, fun: -8 }) }] },
  freeCoffee: { cond: () => true, title: '☕ Free coffee', text: 'The barista at Prest liked your vibe and gave you a free coffee.', choices: [{ label: 'Ledge.', run: () => fx({ energy: 12, fun: 5 }) }] },
  gp: { cond: () => true, title: '🩺 NHS GP', text: 'You called the GP at 8am sharp. You were 47th in the queue. Earliest appointment: three weeks.', choices: [{ label: 'Sigh.', run: () => fx({ fun: -4 }) }] },
  recruiter: { cond: () => S.skills.code >= 30, title: '💼 LinkedIn recruiter', text: '"Exciting opportunity!!! 🚀" It\'s a three-month unpaid internship in Slough.', choices: [{ label: 'Laugh and ignore', run: () => fx({ fun: 5 }) }] },
  overdraft: { cond: () => S.money < 0, title: '🏦 Bank letter', text: 'You\'ve gone into an unarranged overdraft. That\'s a £25 fee.', choices: [{ label: 'Ouch.', run: () => fx({ money: -25, fun: -6 }) }] },
  sunnyDay: { cond: () => S.weather === 'sun', title: '☀️ It\'s actually sunny', text: 'The whole of London has taken its top off and gone to the park.', choices: [{ label: 'Love this city', run: () => fx({ fun: 10 }) }] },
};

function randomEvent() {
  const pool = Object.keys(RANDOM_EVENTS).filter((id) => {
    const last = S.cooldown[id];
    return RANDOM_EVENTS[id].cond() && (!last || day() - last >= 8);
  });
  if (!pool.length) return null;
  const id = pick(pool);
  S.cooldown[id] = day();
  return id;
}

function processQueue() {
  if (S.over || !$('#modal').classList.contains('hidden') || !S.queue.length) return;
  const item = S.queue[0];
  if (typeof item === 'object' && item.perk) {
    openModal(`<h2>🤝 Friendship perk</h2><p>${esc(item.perk)}</p><div class="choices"><button class="btn primary" data-ok>Nice!</button></div>`);
    $('[data-ok]').onclick = () => { S.queue.shift(); log(item.perk, 'good'); closeModal(); save(); render(); processQueue(); };
    return;
  }
  const ev = EVENTS[item] || RANDOM_EVENTS[item];
  if (!ev) { S.queue.shift(); return processQueue(); }
  const buttons = ev.choices.map((c, i) => {
    const dis = c.cost && c.cost > S.money;
    return `<button class="btn ${i === 0 ? 'primary' : ''}" data-choice="${i}" ${dis ? 'disabled title="Not enough money"' : ''}>${esc(c.label)}</button>`;
  }).join('');
  openModal(`<h2>${esc(ev.title)}</h2><p>${esc(ev.text)}</p><div class="choices">${buttons}</div>`);
  document.querySelectorAll('[data-choice]').forEach((b) => {
    b.onclick = () => {
      const c = ev.choices[+b.dataset.choice];
      S.queue.shift();
      closeModal();
      const out = c.run() || '';
      log(`${ev.title}: ${c.label}.${out}`);
      afterAction();
    };
  });
}

// ---------------------------------------------------------------- endings

function goalMet() {
  if (S.bg === 'immigrant') return S.visa.type === 'skilled' && S.money >= 3000;
  if (S.bg === 'oldmoney') return netWorth() >= 12000;
  return S.debt <= 0 && S.money >= 2500;
}
function goalProgress() {
  if (S.bg === 'immigrant') {
    return [
      { label: S.visa.type === 'skilled' ? 'Skilled Worker visa ✅' : `Student visa: ${Math.max(0, S.visa.expires - day())} days left`, pct: S.visa.type === 'skilled' ? 100 : 0 },
      { label: `Savings ${money(Math.max(0, S.money))} / £3,000`, pct: clamp(S.money / 30) },
    ];
  }
  if (S.bg === 'oldmoney') return [{ label: `Net worth ${money(netWorth())} / £12,000`, pct: clamp(netWorth() / 120) }];
  return [
    { label: S.debt > 0 ? `Debt left: ${money(S.debt)}` : 'Debt cleared ✅', pct: S.debt > 0 ? clamp(100 - S.debt / 20) : 100 },
    { label: `Savings ${money(Math.max(0, S.money))} / £2,500`, pct: clamp(S.money / 25) },
  ];
}

function checkEnd() {
  if (S.over) return;
  if (S.visa && S.visa.type === 'student' && day() > S.visa.expires) return endGame('deported');
  if (day() > GAME_DAYS) endGame('finish');
}

function endGame(kind) {
  if (S.over) return;
  const win = kind === 'finish' && goalMet();
  S.over = { kind, win, day: Math.min(day(), GAME_DAYS) };
  S.queue = [];
  save();
  setTimeout(showEnd, 50);
}

function endingText() {
  const o = S.over;
  if (o.kind === 'deported') return ['Back to Lagos 🇳🇬', 'Your student visa ran out before you found a sponsor. Mummy is happy to see you, at least. The japa dream continues... next year.'];
  if (o.kind === 'evicted') return ['Evicted 📦', 'Two weeks deep in your overdraft and the landlord changed the locks. London is not for the faint-hearted.'];
  if (o.win) {
    return {
      immigrant: ['Indefinite Leave to Hustle 🇬🇧', 'Skilled Worker visa, savings in the bank and a family back home who brag about you at every party. You made the japa work.'],
      oldmoney: ['Self-Made (Mostly) 🎩', 'Pater actually said "well done" at Sunday lunch. You\'ll never let anyone forget you had a job.'],
      newgen: ['Debt-Free in the Ends 🔑', 'QuickCash is a memory and you\'ve got a deposit saved. Peckham\'s finest is going places.'],
    }[S.bg];
  }
  return ['Still Hustling... 🏙️', 'You survived 60 days in London, which is an achievement in itself. You didn\'t quite hit your goal, but the city hasn\'t beaten you yet.'];
}

function score() {
  const rel = Object.values(S.rel).reduce((a, b) => a + b, 0);
  let s = netWorth() / 4 + mood() * 8 + rel * 2 + (S.over && S.over.win ? 1500 : 0) + S.over.day * 10;
  if (S.flags.lifeUk) s += 200;
  return Math.max(0, Math.round(s));
}
function grade(s) {
  if (s >= 3000) return 'S';
  if (s >= 2200) return 'A';
  if (s >= 1500) return 'B';
  if (s >= 900) return 'C';
  return 'D';
}

function showEnd() {
  const [head, body] = endingText();
  const sc = score();
  const g = grade(sc);
  const share = `I played Japa Simulator: London Hustle as ${BACKGROUNDS[S.bg].name} and got "${head}" (grade ${g}). ${S.stats.tubeTrips} Tube rides, ${S.stats.pints} pints, net worth ${money(netWorth())}. Can you survive London?`;
  openModal(`
    <div class="end">
      <div class="end-avatar">${avatarSVG(S.look, S.over.win ? 90 : 30)}</div>
      <p class="eyebrow">Day ${S.over.day} · ${esc(BACKGROUNDS[S.bg].name)}</p>
      <h2>${esc(head)}</h2>
      <p>${esc(body)}</p>
      <div class="grade">Grade <b>${g}</b><span>${sc.toLocaleString()} pts</span></div>
      <ul class="end-stats">
        <li><b>${money(netWorth())}</b>net worth</li>
        <li><b>${S.stats.tubeTrips}</b>Tube rides</li>
        <li><b>${S.stats.busTrips}</b>bus rides</li>
        <li><b>${S.stats.shifts}</b>shifts worked</li>
        <li><b>${S.stats.pints}</b>pints</li>
        <li><b>${Object.values(S.rel).filter((r) => r >= 30).length}</b>close friends</li>
        ${S.bg === 'immigrant' ? `<li><b>${money(S.stats.sentHome)}</b>sent home</li>` : ''}
      </ul>
      <div class="choices">
        <button class="btn primary" id="shareBtn">📋 Copy result</button>
        <a class="btn" target="_blank" rel="noopener" href="https://twitter.com/intent/tweet?text=${encodeURIComponent(share)}">Share on X</a>
        <button class="btn" id="againBtn">🔁 Play again</button>
      </div>
    </div>`);
  $('#shareBtn').onclick = () => {
    navigator.clipboard?.writeText(share).then(() => toast('Copied! Paste it anywhere.'), () => toast(share));
  };
  $('#againBtn').onclick = () => { clearSave(); closeModal(); showScreen('create'); };
}

// ---------------------------------------------------------------- save

function save() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(S)); } catch (e) { /* storage unavailable */ } }
function load() { try { const raw = localStorage.getItem(SAVE_KEY); return raw ? JSON.parse(raw) : null; } catch (e) { return null; } }
function clearSave() { try { localStorage.removeItem(SAVE_KEY); } catch (e) { /* ignore */ } }

// ---------------------------------------------------------------- avatar

function avatarSVG(look, m = 70) {
  const skin = SKIN[look.skin], hc = HAIR_COLOURS[look.hairColour], out = OUTFITS[look.outfit];
  const mouth = m > 60 ? 'M44 55 Q50 61 56 55' : m > 35 ? 'M45 57 L55 57' : 'M44 59 Q50 53 56 59';
  const orb = m > 60 ? '#38c172' : m > 35 ? '#f6c343' : '#e3342f';
  const back = {
    afro: `<circle cx="50" cy="38" r="22" fill="${hc}"/>`,
    long: `<path d="M32 40 Q32 22 50 22 Q68 22 68 40 L70 74 L30 74 Z" fill="${hc}"/>`,
    braids: `<path d="M33 40 Q33 23 50 23 Q67 23 67 40 L69 80 L63 80 L62 50 L38 50 L37 80 L31 80 Z" fill="${hc}"/>`,
  }[look.hair] || '';
  const front = {
    afro: '',
    short: `<path d="M35 42 Q35 26 50 26 Q65 26 65 42 Q60 33 50 33 Q40 33 35 42 Z" fill="${hc}"/>`,
    bun: `<circle cx="50" cy="22" r="7" fill="${hc}"/><path d="M35 42 Q35 27 50 27 Q65 27 65 42 Q58 32 50 32 Q42 32 35 42 Z" fill="${hc}"/>`,
    long: `<path d="M35 42 Q36 27 50 27 Q64 27 65 42 Q57 31 47 33 Q40 35 35 42 Z" fill="${hc}"/>`,
    braids: `<path d="M35 41 Q36 27 50 27 Q64 27 65 41 Q57 32 50 32 Q43 32 35 41 Z" fill="${hc}"/>`,
    bald: '',
  }[look.hair] || '';
  return `<svg viewBox="0 0 100 135" class="avatar" aria-hidden="true">
    <ellipse cx="50" cy="130" rx="24" ry="4" fill="rgba(0,0,0,.15)"/>
    <g class="bob">
      <g class="orb"><path d="M50 2 L56 10 L50 18 L44 10 Z" fill="${orb}" stroke="rgba(0,0,0,.2)"/></g>
      ${back}
      <rect x="44" y="58" width="12" height="8" fill="${skin}"/>
      <path d="M30 70 Q30 64 38 64 L62 64 Q70 64 70 70 L70 100 L30 100 Z" fill="${out}"/>
      <rect x="22" y="66" width="9" height="30" rx="4.5" fill="${out}"/>
      <rect x="69" y="66" width="9" height="30" rx="4.5" fill="${out}"/>
      <circle cx="26.5" cy="98" r="4.5" fill="${skin}"/><circle cx="73.5" cy="98" r="4.5" fill="${skin}"/>
      <rect x="35" y="99" width="12" height="25" rx="3" fill="#2d3748"/>
      <rect x="53" y="99" width="12" height="25" rx="3" fill="#2d3748"/>
      <rect x="33" y="122" width="15" height="6" rx="3" fill="#f7fafc"/><rect x="52" y="122" width="15" height="6" rx="3" fill="#f7fafc"/>
      <circle cx="50" cy="44" r="16" fill="${skin}"/>
      ${front}
      <circle cx="44" cy="45" r="1.8" fill="#1a202c"/><circle cx="56" cy="45" r="1.8" fill="#1a202c"/>
      <path d="${mouth}" stroke="#1a202c" stroke-width="1.8" fill="none" stroke-linecap="round"/>
    </g>
  </svg>`;
}

// ---------------------------------------------------------------- map

function mapSVG() {
  const L = LOCATIONS;
  const segs = [];
  LINES.forEach((line, li) => {
    const off = ((li % 3) - 1) * 3.5;
    for (let i = 0; i < line.stops.length - 1; i++) {
      const a = L[line.stops[i]], b = L[line.stops[i + 1]];
      const dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy);
      const nx = (-dy / len) * off, ny = (dx / len) * off;
      segs.push(`<line x1="${a.x + nx}" y1="${a.y + ny}" x2="${b.x + nx}" y2="${b.y + ny}" stroke="${line.colour}" stroke-width="5" stroke-linecap="round" ${line.rail ? 'stroke-dasharray="10 6"' : ''}><title>${line.name}</title></line>`);
    }
  });
  const stations = Object.entries(L).map(([id, p]) => {
    const here = id === S.loc, home = id === S.home;
    const below = ['southbank', 'peckham', 'brixton', 'canary', 'chelsea', 'woolwich'].includes(id);
    return `<g class="station ${here ? 'here' : ''}" data-loc="${id}" tabindex="0" role="button" aria-label="${esc(p.name)}">
      <circle class="hit" cx="${p.x}" cy="${p.y}" r="24" />
      <circle class="dot" cx="${p.x}" cy="${p.y}" r="${here ? 15 : 12}" />
      <text class="st-icon" x="${p.x}" y="${p.y + 4}" text-anchor="middle">${home ? '🏠' : p.icon}</text>
      <text class="st-label" x="${p.x}" y="${p.y + (below ? 31 : -20)}" text-anchor="middle">${esc(p.name)}</text>
    </g>`;
  }).join('');
  const me = L[S.loc];
  const weather = S.weather === 'rain' ? '<g class="rain">' + Array.from({ length: 40 }, (_, i) => `<line x1="${(i * 97) % 1000}" y1="${(i * 53) % 620}" x2="${((i * 97) % 1000) - 6}" y2="${((i * 53) % 620) + 14}"/>`).join('') + '</g>' : '';
  const nightOpacity = hour() >= 21 || hour() < 6 ? 0.28 : hour() >= 19 ? 0.12 : 0;
  return `<svg viewBox="0 0 1000 620" id="map" role="img" aria-label="Map of London">
    <rect width="1000" height="620" class="land"/>
    <path class="park" d="M255 265 Q300 250 345 268 L340 305 Q300 318 258 302 Z"/>
    <path class="park" d="M760 135 Q800 120 840 140 L835 185 Q795 195 765 180 Z"/>
    <path class="park" d="M600 520 Q640 510 680 525 L675 545 Q640 552 605 540 Z"/>
    <path class="river" d="M0 455 C120 440 200 470 280 430 C340 400 400 360 470 345 C520 335 560 345 610 360 C660 375 680 420 720 415 C760 410 760 350 800 360 C850 372 880 390 1000 370"/>
    <text class="river-label" x="150" y="470">River Thames</text>
    ${segs.join('')}
    ${stations}
    <g class="me-pin" transform="translate(${me.x - 15} ${me.y - 66}) scale(.3)">${avatarSVG(S.look, mood()).replace('<svg viewBox="0 0 100 135" class="avatar" aria-hidden="true">', '').replace('</svg>', '')}</g>
    ${weather}
    <rect width="1000" height="620" fill="#0b1640" opacity="${nightOpacity}" pointer-events="none"/>
  </svg>`;
}

// ---------------------------------------------------------------- render

function bar(label, v, cls = '') {
  const lvl = v < 25 ? 'low' : v < 50 ? 'mid' : 'ok';
  return `<div class="bar ${cls}"><span>${label}</span><div class="track"><i class="${lvl}" style="width:${Math.round(v)}%"></i></div><b>${Math.round(v)}</b></div>`;
}

function render() {
  if (!S) return;
  const w = WEATHER.find((x) => x.id === S.weather);
  const [mEmoji, mText] = moodLabel(mood());
  $('#hud').innerHTML = `
    <div class="hud-item brand">🇬🇧 Japa Sim</div>
    <div class="hud-item"><small>${DAYS[dow()]} · Day ${Math.min(day(), GAME_DAYS)}/${GAME_DAYS}</small><b>${clock()}</b></div>
    <div class="hud-item"><small>Weather</small><b>${w.icon} ${w.label}</b></div>
    <div class="hud-item ${S.money < 0 ? 'neg' : ''}"><small>Bank</small><b>${money(S.money)}</b></div>
    ${S.debt > 0 ? `<div class="hud-item neg"><small>Debt</small><b>${money(S.debt)}</b></div>` : ''}
    <div class="hud-item"><small>Rent/week</small><b>${money(S.rent)}</b></div>
    <div class="hud-item"><small>Job</small><b>${S.job ? esc(JOBS[S.job].title.split(',')[0]) : 'Unemployed'}</b></div>
    ${S.strike ? '<div class="hud-item neg"><small>TfL</small><b>Strike!</b></div>' : ''}
    <div class="hud-actions"><button class="btn small" id="helpBtn" title="How to play">❓</button><button class="btn small" id="menuBtn" title="Menu">☰</button></div>`;

  $('#me').innerHTML = `
    <div class="me-top">
      <div class="me-avatar">${avatarSVG(S.look, mood())}</div>
      <div>
        <h3>${esc(S.name)}</h3>
        <span class="pill">${esc(BACKGROUNDS[S.bg].name)}</span>
        <p class="mood">${mEmoji} ${mText}</p>
      </div>
    </div>
    <h4>Needs</h4>
    ${Object.keys(S.needs).map((k) => bar(NEED_LABELS[k], S.needs[k])).join('')}
    <h4>Skills</h4>
    ${Object.keys(S.skills).map((k) => bar(SKILL_LABELS[k], S.skills[k], 'skill')).join('')}
    ${S.bg === 'immigrant' ? bar('Family pride', S.family, 'skill') : ''}
    <h4>Goal</h4>
    <p class="goal">${esc(BACKGROUNDS[S.bg].goal)}</p>
    ${goalProgress().map((g) => bar(g.label, g.pct, 'goalbar')).join('')}
    <h4>Bag</h4>
    <div class="bag">
      <span title="Groceries">🥫 ${S.groceries} meals</span>
      <span title="Smart outfit">${S.outfit ? '👔 Suit' : '👕 Casual'}</span>
      <span title="Tube spend today">💳 ${money(S.fares.tube + S.fares.bus)} today</span>
      ${S.visa && S.visa.type === 'student' ? `<span>🛂 ${S.weekHours}/20h this week</span>` : ''}
    </div>`;

  $('#mapwrap').innerHTML = mapSVG();
  document.querySelectorAll('.station').forEach((g) => {
    const go = () => g.dataset.loc !== S.loc && openTravel(g.dataset.loc);
    g.onclick = go;
    g.onkeydown = (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } };
  });

  const loc = LOCATIONS[S.loc];
  const acts = placeActions(S.loc);
  const npcsHere = Object.entries(NPCS).filter(([, n]) => n.place === S.loc);
  $('#place').innerHTML = `
    <div class="place-head">
      <span class="place-icon">${S.loc === S.home ? '🏠' : loc.icon}</span>
      <div><h3>${esc(loc.name)}${S.loc === S.home ? ' <span class="pill">Home</span>' : ''}</h3><small>Zone ${loc.zone}</small></div>
    </div>
    <p class="desc">${esc(loc.desc)}</p>
    ${npcsHere.map(([, n]) => `<p class="npc">${n.emoji} <b>${n.name}</b> is around. ${esc(n.desc)}</p>`).join('')}
    <div class="actions">${acts.map((a, i) => `
      <button class="act" data-act="${i}" ${a.disabled ? 'disabled' : ''}>
        <span class="act-label">${esc(a.label)}</span>
        <span class="act-meta">${fmtMins(a.mins)}${a.cost ? ' · ' + money(a.cost) : ''}${a.sub ? ' · ' + esc(a.sub) : ''}</span>
        ${a.disabled ? `<span class="act-why">${esc(a.disabled)}</span>` : ''}
      </button>`).join('')}
    </div>
    <p class="hint">🗺️ Tap a station on the map to travel.${S.loc !== S.home ? ` Home is ${esc(LOCATIONS[S.home].name)}.` : ''}</p>`;
  document.querySelectorAll('[data-act]').forEach((b) => { b.onclick = () => runAction(acts[+b.dataset.act]); });

  $('#log').innerHTML = S.log.slice(0, 30).map((l) => `<li class="${l.kind}"><time>${l.t}</time>${esc(l.text)}</li>`).join('');
  $('#helpBtn').onclick = showHelp;
  $('#menuBtn').onclick = showMenu;
}

function fmtMins(m) {
  if (m >= 1440) return `${Math.round(m / 1440)} days`;
  if (m >= 60) return `${+(m / 60).toFixed(1)}h`;
  return `${m} min`;
}

function openTravel(to) {
  const p = LOCATIONS[to];
  const opts = travelOptions(to);
  const lines = [...new Set(LINES.filter((l) => l.stops.includes(to)).map((l) => l.name))];
  openModal(`
    <div class="travel-head"><span class="place-icon">${to === S.home ? '🏠' : p.icon}</span><div><h2>${esc(p.name)}</h2><small>Zone ${p.zone} · ${lines.join(', ')}</small></div></div>
    <p>${esc(p.desc)}</p>
    <div class="travel-opts">${opts.map((o) => `
      <button class="act" data-mode="${o.mode}" ${o.disabled ? 'disabled' : ''}>
        <span class="act-label">${o.label}</span>
        <span class="act-meta">${fmtMins(o.mins)} · ${o.cost ? money(o.cost) : 'Free'} · ${esc(o.note)}</span>
        ${o.disabled ? `<span class="act-why">${esc(o.disabled)}</span>` : ''}
      </button>`).join('')}</div>
    <div class="choices"><button class="btn" data-close>Stay here</button></div>`);
  document.querySelectorAll('[data-mode]').forEach((b) => { b.onclick = () => travel(to, b.dataset.mode); });
  $('[data-close]').onclick = closeModal;
}

function showHelp() {
  openModal(`
    <h2>How to play</h2>
    <ul class="help">
      <li>🗺️ <b>Travel</b> by tapping stations on the map. Tube is fast, buses are cheap, walking is free. Fares are capped daily, like real London.</li>
      <li>⚡ Every action takes <b>time</b>. Keep your <b>needs</b> up: eat, sleep, shower, have fun and see people. A happy you earns more and interviews better.</li>
      <li>💼 <b>Get a job</b> at its location. Better jobs need skills: study at King's Cross, network in the City and Shoreditch, hustle at Camden.</li>
      <li>🤝 <b>Make friends</b> (Chidi in Woolwich, Jade in Peckham, Tom in Chelsea, Priya in Shoreditch). Close friends unlock perks.</li>
      <li>🏠 <b>Rent</b> is taken every Monday. Two weeks in your overdraft and you're evicted.</li>
      <li>🏆 <b>Goal:</b> ${esc(BACKGROUNDS[S.bg].goal)}</li>
    </ul>
    <div class="choices"><button class="btn primary" data-close>Let's go</button></div>`);
  $('[data-close]').onclick = () => { closeModal(); processQueue(); };
}

function showMenu() {
  openModal(`
    <h2>Menu</h2>
    <p>Your game saves automatically in this browser.</p>
    <div class="choices vertical">
      <button class="btn primary" data-close>Resume</button>
      <button class="btn" id="titleBtn">Title screen</button>
      <button class="btn danger" id="restartBtn">Start a new life</button>
    </div>`);
  $('[data-close]').onclick = () => { closeModal(); processQueue(); };
  $('#titleBtn').onclick = () => { closeModal(); showTitle(); };
  $('#restartBtn').onclick = (e) => {
    if (!e.currentTarget.dataset.armed) {
      e.currentTarget.dataset.armed = '1';
      e.currentTarget.textContent = 'Tap again to lose this game';
      return;
    }
    clearSave(); S = null; closeModal(); showScreen('create');
  };
}

// ---------------------------------------------------------------- modal & screens

function openModal(html) {
  $('#modal-card').innerHTML = html;
  $('#modal').classList.remove('hidden');
  const first = $('#modal-card button:not([disabled])');
  if (first) first.focus();
}
function closeModal() { $('#modal').classList.add('hidden'); }

function showScreen(id) {
  document.querySelectorAll('.screen').forEach((s) => s.classList.toggle('hidden', s.id !== id));
  if (id === 'create') renderCreate();
}

function showTitle() {
  const saved = load();
  $('#continueBtn').classList.toggle('hidden', !(saved && !saved.over));
  showScreen('title');
}

const create = { name: '', bg: 'immigrant', look: { skin: 4, hair: 0, hairColour: 0, outfit: 0 } };
const NAMES = ['Tunde', 'Amara', 'Ifeoma', 'Kwame', 'Zainab', 'Femi', 'Chioma', 'Dami', 'Ngozi', 'Seyi'];

function renderCreate() {
  if (!create.name) create.name = pick(NAMES);
  const sw = (arr, key) => arr.map((c, i) => `<button class="swatch ${create.look[key] === i ? 'on' : ''}" style="background:${c}" data-look="${key}" data-i="${i}" aria-label="${key} ${i + 1}"></button>`).join('');
  $('#create-body').innerHTML = `
    <div class="create-grid">
      <div class="preview">
        ${avatarSVG(lookFromCreate(), 80)}
        <label class="field"><span>Name</span><input id="nameInput" maxlength="16" value="${esc(create.name)}"></label>
      </div>
      <div class="looks">
        <h4>Skin</h4><div class="swatches">${sw(SKIN, 'skin')}</div>
        <h4>Hair</h4><div class="swatches">${HAIR.map((h, i) => `<button class="chip ${create.look.hair === i ? 'on' : ''}" data-hair="${i}">${h}</button>`).join('')}</div>
        <h4>Hair colour</h4><div class="swatches">${sw(HAIR_COLOURS, 'hairColour')}</div>
        <h4>Outfit</h4><div class="swatches">${sw(OUTFITS, 'outfit')}</div>
      </div>
    </div>
    <h4>Who are you in London?</h4>
    <div class="bgs">${Object.entries(BACKGROUNDS).map(([id, b]) => `
      <button class="bg-card ${create.bg === id ? 'on' : ''}" data-bg="${id}">
        <b>${{ immigrant: '✈️', oldmoney: '🎩', newgen: '🧢' }[id]} ${b.name}</b>
        <small>${b.tag}</small>
        <p>${b.blurb}</p>
        <p class="bg-goal">🏆 ${b.goal}</p>
        <span class="bg-stats">Start: ${money(b.money)}${b.debt ? ` · Debt ${money(b.debt)}` : ''} · Rent ${b.rent ? money(b.rent) + '/wk' : 'paid by Pater'}</span>
      </button>`).join('')}</div>`;
  document.querySelectorAll('[data-look]').forEach((b) => { b.onclick = () => { create.look[b.dataset.look] = +b.dataset.i; renderCreate(); }; });
  document.querySelectorAll('[data-hair]').forEach((b) => { b.onclick = () => { create.look.hair = +b.dataset.hair; renderCreate(); }; });
  document.querySelectorAll('[data-bg]').forEach((b) => { b.onclick = () => { create.bg = b.dataset.bg; renderCreate(); }; });
  $('#nameInput').oninput = (e) => { create.name = e.target.value; };
}

// The avatar renderer expects hair as a style name; creation stores the index.
function lookFromCreate() {
  return { skin: create.look.skin, hair: HAIR[create.look.hair], hairColour: create.look.hairColour, outfit: create.look.outfit };
}

function newGame() {
  const B = BACKGROUNDS[create.bg];
  const look = lookFromCreate();
  S = {
    v: 1, name: (create.name || 'Tunde').trim().slice(0, 16) || 'Tunde', bg: create.bg, look,
    t: 8 * 60, loc: create.bg === 'immigrant' ? 'heathrow' : B.home, home: B.home,
    money: B.money, debt: B.debt, rent: B.rent, allowance: create.bg === 'oldmoney' ? 400 : 0,
    needs: { hunger: 70, energy: create.bg === 'immigrant' ? 45 : 75, fun: 65, social: 55, hygiene: create.bg === 'immigrant' ? 50 : 80 },
    skills: { ...B.skills }, job: null, weekHours: 0, groceries: create.bg === 'immigrant' ? 0 : 3, outfit: create.bg === 'oldmoney', family: 60,
    visa: create.bg === 'immigrant' ? { type: 'student', expires: 35 } : null,
    rel: { chidi: create.bg === 'immigrant' ? 10 : 0, jade: create.bg === 'newgen' ? 20 : 0, tom: create.bg === 'oldmoney' ? 20 : 0, priya: 0 },
    perks: {}, flags: {}, weather: 'grey', strike: false, fares: { tube: 0, bus: 0 }, overdraftWeeks: 0,
    stats: { tubeTrips: 0, busTrips: 0, earned: 0, spent: 0, sentHome: 0, shifts: 0, pints: 0 },
    log: [], queue: [], cooldown: {}, over: null,
  };
  S.weather = rollWeather();
  const intro = {
    immigrant: `✈️ ${S.name} has landed at Heathrow. £1,200 in the bank, a student visa and a suitcase full of garri. Your room is in Woolwich. The Elizabeth line goes straight there.`,
    oldmoney: `🎩 ${S.name} wakes up in a Chelsea flat Pater pays for. Allowance: £400 a week. Ambition: undecided.`,
    newgen: `🧢 ${S.name} wakes up in the family council flat in Peckham. £300 in the bank, £2,000 owed to QuickCash. Time to get it.`,
  }[S.bg];
  log(intro);
  save();
  startGame();
  showHelp();
}

function startGame() {
  showScreen('game');
  render();
  if (S.over) showEnd();
  else processQueue();
}

function init() {
  $('#newBtn').onclick = () => {
    const saved = load();
    if (!saved || saved.over) return showScreen('create');
    openModal(`<h2>Start a new life?</h2><p>Your saved game (${esc(saved.name)}, day ${Math.floor(saved.t / 1440) + 1}) will be replaced.</p>
      <div class="choices"><button class="btn" data-close>Keep my save</button><button class="btn primary" id="confirmNew">Start fresh</button></div>`);
    $('[data-close]').onclick = closeModal;
    $('#confirmNew').onclick = () => { clearSave(); closeModal(); showScreen('create'); };
  };
  $('#continueBtn').onclick = () => { S = load(); if (S) startGame(); };
  $('#startBtn').onclick = newGame;
  $('#backBtn').onclick = showTitle;
  $('#modal').addEventListener('click', (e) => {
    if (e.target.id === 'modal' && (!S || (!S.over && !S.queue.length))) closeModal();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !$('#modal').classList.contains('hidden') && S && !S.over && !S.queue.length) closeModal();
  });
  showTitle();
}

document.addEventListener('DOMContentLoaded', init);
