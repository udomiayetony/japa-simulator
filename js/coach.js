'use strict';
// Helping players along: paid hints, the guided start, the goal tracker, daily login
// rewards, the wardrobe, accessibility settings and keyboard play.

const Coach = (() => {
  // ------------------------------------------------------------ goal tracker

  function goalSteps() {
    const sponsored = !!(S.job && JOBS[S.job].sponsor);
    const working = !!S.job || S.stats.shifts > 0;
    if (S.bg === 'immigrant') {
      const skilled = S.visa.type === 'skilled';
      return [
        ['Get a job', working || skilled],
        ['Get a job that sponsors visas', sponsored || skilled],
        ['Switch to a Skilled Worker visa at Lunar House', skilled],
        ['Save £3,000', skilled && S.money >= 3000],
      ];
    }
    if (S.bg === 'oldmoney') {
      return [
        ['Get a job', working],
        ['Get promoted', (S.stats.promotions || 0) > 0],
        ['Reach £6,000 net worth', netWorth() >= 6000],
        ['Reach £12,000 net worth', netWorth() >= 12000],
      ];
    }
    return [
      ['Get a job', working],
      ['Get your debt under £1,000', S.debt < 1000],
      ['Clear your QuickCash debt', S.debt <= 0],
      ['Save £2,500', S.debt <= 0 && S.money >= 2500],
    ];
  }

  // ------------------------------------------------------------ the hint engine

  const FOOD = /🍗|🥪|🌮|🍛|🥯|📦 Boxpark|🍳|🥂|🍦/;
  function bestOption(to) {
    const opts = travelOptions(to).filter((o) => !o.disabled);
    return opts.find((o) => o.mode === 'tube') || opts.find((o) => o.mode === 'bus') || opts.find((o) => o.mode === 'walk') || opts[0];
  }
  function howTo(to) {
    if (to === S.loc) return '';
    const o = bestOption(to);
    return o ? ` Get to ${LOCATIONS[to].name} by ${o.label.replace(/^\S+ /, '')} (${fmtMins(o.mins)}, ${o.cost ? money(o.cost) : 'free'}).` : '';
  }
  function bestJob() {
    const ok = Object.keys(JOBS).filter((id) => !missingReq(id).length && (id !== 'analyst' || S.outfit));
    const score = (id) => JOBS[id].pay + (S.bg === 'immigrant' && JOBS[id].sponsor ? 100 : 0);
    return ok.sort((a, b) => score(b) - score(a))[0];
  }
  function nearestWith(test) {
    return Object.keys(LOCATIONS).filter((id) => placeActions(id).some((a) => test(a.label))).sort((a, b) => dist(S.loc, a) - dist(S.loc, b))[0];
  }

  // Everything worth doing, most urgent first. Each item has a one-liner, a step-by-step
  // version and the place it is about.
  function advice() {
    const n = S.needs, out = [];
    const atHome = S.loc === S.home, homeName = LOCATIONS[S.home].name;
    if (n.energy < 22) {
      out.push({ short: atHome ? 'Get some sleep.' : `Go home to ${homeName} and sleep.`, place: S.home,
        detail: `Your energy is ${Math.round(n.energy)}. At zero you collapse and lose half a day.${howTo(S.home)} Then tap 😴 Sleep (8h).` });
    }
    if (n.hunger < 28) {
      const here = placeActions(S.loc).find((a) => FOOD.test(a.label) && !a.disabled);
      const where = here ? S.loc : nearestWith((l) => FOOD.test(l)) || S.home;
      out.push({ short: here ? `Eat something: ${here.label.replace(/^\S+ /, '')}.` : `Eat something in ${LOCATIONS[where].name}.`, place: where,
        detail: `Hunger is ${Math.round(n.hunger)}. When it hits zero you lose energy and fun fast.${here ? ` Tap ${here.label} right here.` : howTo(where)} Cooking at home is cheapest: a grocery shop gives you 5 meals.` });
    }
    if (n.hygiene < 20) {
      out.push({ short: 'Go home and shower.', place: S.home, detail: `Hygiene is ${Math.round(n.hygiene)}. Low hygiene makes job interviews much harder.${howTo(S.home)} A shower takes 20 minutes.` });
    }
    const next = Math.max(0, 7 - dow()) % 7 || 7;
    if (S.rent && S.money < S.rent + 20 && next <= 3) {
      const where = S.job ? JOBS[S.job].place : 'camden';
      out.push({ short: `Rent of ${money(S.rent)} is due in ${next} day${next > 1 ? 's' : ''}. Earn some money now.`, place: where,
        detail: `You have ${money(S.money)} and rent is ${money(S.rent)} on Monday. Two weeks in your overdraft gets you evicted. ${S.job ? `Work shifts at ${LOCATIONS[where].name}.` : 'Sell at Camden Market (10am to 6pm) while you look for a job.'}${howTo(where)}` });
    }
    if (S.bg === 'immigrant' && S.visa.type === 'student') {
      const left = Math.max(0, S.visa.expires - day());
      if (S.job && JOBS[S.job].sponsor) {
        if (S.money < 1500) {
          out.push({ short: `Save ${money(1500 - S.money)} more for the visa fee.`, place: JOBS[S.job].place,
            detail: `Your job sponsors visas. The Skilled Worker application costs £1,500 at Lunar House in Croydon. Work shifts at ${LOCATIONS[JOBS[S.job].place].name} until you have it. Your starter visa ends in ${left} days.${howTo(JOBS[S.job].place)}` });
        } else {
          out.push({ short: 'Apply for your Skilled Worker visa in Croydon.', place: 'croydon',
            detail: `You have a sponsor and the £1,500 fee. Go to Lunar House in Croydon between 9am and 4pm and tap 🛂 Apply: Skilled Worker visa.${howTo('croydon')}` });
        }
      } else {
        out.push({ short: 'Get a job that sponsors visas: care work in Croydon.', place: 'croydon',
          detail: `Your starter visa ends in ${left} days. Care work in Croydon sponsors visas and needs no skills. Interviews run 9am to 6pm, and they go better when you're clean and happy.${S.perks.chidi30 ? ' Chidi put in a word, so the job is yours.' : ' Make friends with Chidi in Woolwich and he will put in a word for you.'}${howTo('croydon')}` });
      }
    }
    if (!S.job) {
      const j = bestJob();
      if (j) {
        const J = JOBS[j];
        out.push({ short: `Apply to be a ${J.title} in ${LOCATIONS[J.place].name}.`, place: J.place,
          detail: `It pays ${money(J.pay)} an hour${J.sponsor ? ' and sponsors visas' : ''}. Interviews run 9am to 6pm. Your chances go up with charm, a good mood and a shower.${howTo(J.place)} Then tap 📝 Apply.` });
      }
    } else {
      const better = bestJob();
      if (better && better !== S.job && JOBS[better].pay > jobLevel()[1] + 4) {
        const J = JOBS[better];
        out.push({ short: `You could earn more as a ${J.title}.`, place: J.place, detail: `It pays ${money(J.pay)} an hour against your ${money(jobLevel()[1])}. Interviews run 9am to 6pm.${howTo(J.place)}` });
      }
    }
    if (S.bg === 'newgen' && S.debt > 0 && S.money > 250) {
      out.push({ short: 'Pay down your QuickCash debt at home.', place: S.home,
        detail: `QuickCash adds 2% interest every week, so every pound you pay off now saves you more later. Keep enough for rent (${money(S.rent)} on Mondays) and pay the rest at home.${howTo(S.home)}` });
    }
    if (S.bg === 'oldmoney' && S.job !== 'analyst') {
      const miss = missingReq('analyst');
      out.push({ short: miss.length ? `Build up to the bank job: you need ${miss.join(' and ')}.` : !S.outfit ? 'Buy a suit, then apply at the bank in Canary Wharf.' : 'Apply for the analyst job in Canary Wharf.', place: miss.length ? 'kingscross' : !S.outfit ? 'oxford' : 'canary',
        detail: `The analyst job pays ${money(JOBS.analyst.pay)} an hour, the fastest way to £12,000. It needs Charm ${jobReq('analyst').charm}, Coding ${jobReq('analyst').code} and a smart outfit. Study coding at the British Library in King's Cross, network in the City for charm and buy a suit at Oxford Circus.` });
    }
    if (S.job) {
      const lv = JOBS[S.job].levels[(S.jobLevel || 0) + 1];
      if (lv) {
        const [title, pay, shifts, req = {}] = lv;
        const miss = Object.keys(req).filter((k) => S.skills[k] < req[k]).map((k) => `${SKILL_LABELS[k]} ${req[k]}`);
        const left = Math.max(0, shifts - (S.jobShifts || 0));
        out.push({ short: `Keep working to become ${title}.`, place: JOBS[S.job].place,
          detail: `${title} pays ${money(pay)} an hour. ${left ? `${left} more shift${left > 1 ? 's' : ''} to go. ` : ''}${miss.length ? `You also need ${miss.join(' and ')}. ` : ''}Stay in a good mood: promotions need it above 40.` });
      }
    }
    if (n.fun < 30 || n.social < 30) {
      const npc = Object.entries(NPCS).sort((a, b) => dist(S.loc, a[1].place) - dist(S.loc, b[1].place))[0];
      out.push({ short: `You need some fun. Hang out with ${npc[1].name} in ${LOCATIONS[npc[1].place].name}.`, place: npc[1].place,
        detail: `Low mood cuts your pay and your interview chances. Friends give you social and fun, and close friends unlock perks.${howTo(npc[1].place)}` });
    }
    if (S.job) {
      out.push({ short: `Work a shift as ${jobTitle()}.`, place: JOBS[S.job].place, detail: `Shifts run 5am to 10pm at ${LOCATIONS[JOBS[S.job].place].name}. Longer shifts pay more per trip.${howTo(JOBS[S.job].place)}` });
    }
    out.push({ short: 'Explore: tap a place on the map and see what you can do there.', place: null, detail: 'Every neighbourhood has something different: markets, museums, gigs and side hustles.' });
    return out;
  }

  // The best way to earn money right now, with an estimate per hour.
  function moneyTip() {
    const m = mood(), hs = S.skills.hustle, ch = S.skills.charm, opts = [];
    if (S.job) {
      const perHour = jobLevel()[1] * (0.75 + m / 400);
      opts.push({ per: perHour, place: JOBS[S.job].place, text: `Work 8-hour shifts as ${jobTitle()} in ${LOCATIONS[JOBS[S.job].place].name}: about ${money(Math.round(perHour * 8))} a shift.${S.visa && S.visa.type === 'student' ? ' Your starter visa caps you at 20 hours a week.' : ''}` });
    }
    const j = bestJob();
    if (j && j !== S.job) opts.push({ per: JOBS[j].pay * (0.75 + m / 400) * 0.9, place: JOBS[j].place, text: `Get the ${JOBS[j].title} job in ${LOCATIONS[JOBS[j].place].name}: ${money(JOBS[j].pay)} an hour. Interviews 9am to 6pm.` });
    opts.push({ per: ((30 + hs * 1.2) * (S.perks.jade30 ? 1.6 : 1)) / 3, place: 'camden', text: `Sell vintage at Camden Market (10am to 6pm): about ${money(Math.round((30 + hs * 1.2) * (S.perks.jade30 ? 1.6 : 1)))} for 3 hours. More Hustle means more sales${S.perks.jade30 ? '' : ', and Jade can get you a better pitch'}.` });
    if ([4, 5].includes(dow())) opts.push({ per: ((42 + hs * 1.3) * (S.perks.jade30 ? 1.4 : 1)) / 3, place: 'nottinghill', text: `It's ${DAYS[dow()]}: sell on Portobello Road in Notting Hill for about ${money(Math.round((42 + hs * 1.3) * (S.perks.jade30 ? 1.4 : 1)))} in 3 hours.` });
    opts.push({ per: (33 + ch * 0.8) / 3, place: 'covent', text: `Busk in Covent Garden: about ${money(Math.round(33 + ch * 0.8))} for 3 hours. Charm makes the crowd generous.` });
    if (S.job !== 'analyst') {
      const miss = missingReq('analyst');
      opts.push({ per: 0, place: 'canary', text: `Long game: the bank in Canary Wharf pays ${money(JOBS.analyst.pay)} an hour. ${miss.length ? `You need ${miss.join(' and ')}` : 'You have the skills'}${S.outfit ? '' : ' and a suit from Oxford Circus'}.` });
    }
    opts.sort((a, b) => b.per - a.per);
    const save = S.groceries < 2 && S.bg !== 'oldmoney'
      ? ' Save money too: groceries cost about £14 for 5 meals, against £4.50 for every chicken shop meal.'
      : ' Save money too: the Tube has a daily cap, so after a few rides the rest of the day is free.';
    return { short: opts[0].text, detail: opts[0].text + save, place: opts[0].place };
  }

  // ------------------------------------------------------------ paid hints

  const HINTS = {
    basic: { title: 'Next step', desc: 'What to do next, in one line' },
    detailed: { title: 'Step by step', desc: 'Where to go, how to get there and why' },
    money: { title: 'Money tip', desc: 'The best way to make money right now' },
  };
  const hintsFree = () => day() <= 2;
  function hintPrice(kind) {
    if (hintsFree()) return 0;
    if (kind === 'basic') return 5;
    if (kind === 'detailed') return 20;
    return Math.max(2, Math.min(200, Math.round(S.money * 0.05)));
  }
  function openHints() {
    if (!S || S.over) return;
    const free = hintsFree();
    openModal(`
      <h2>💡 Hints</h2>
      <p>${free ? 'Hints are <b>free</b> for your first 2 days. After that they cost a little, and you always see the price first.' : 'Hints cost a little. You see the price before you pay.'}</p>
      <div class="hint-options">${Object.entries(HINTS).map(([k, h]) => {
        const price = hintPrice(k);
        const dis = price > S.money;
        return `<button class="hint-option" data-hint="${k}" ${dis ? 'disabled' : ''}>
          <span><b>${h.title}</b><small>${h.desc}</small></span>
          <span class="hint-price ${price ? '' : 'free'}">${price ? money(price) : 'FREE'}${k === 'money' && price ? '<small>5% of your cash</small>' : ''}${dis ? '<small>Not enough money</small>' : ''}</span>
        </button>`;
      }).join('')}</div>
      <p class="hint">The 🎯 tracker and the help screen are always free.</p>
      <div class="choices"><button class="btn" data-close>Close</button></div>`);
    $('[data-close]').onclick = () => { closeModal(); processQueue(); };
    document.querySelectorAll('[data-hint]').forEach((b) => { b.onclick = () => confirmHint(b.dataset.hint); });
  }
  function confirmHint(kind) {
    const price = hintPrice(kind);
    if (!price) return showHint(kind);
    openModal(`
      <h2>💡 ${HINTS[kind].title}</h2>
      <p>This hint costs <b>${money(price)}</b>. You have ${money(S.money)}.</p>
      <div class="choices"><button class="btn" id="hintBack">Back</button><button class="btn primary" id="hintPay">Pay ${money(price)}</button></div>`);
    $('#hintBack').onclick = openHints;
    $('#hintPay').onclick = () => showHint(kind);
  }
  function showHint(kind) {
    const price = hintPrice(kind);
    if (price > S.money) return toast('Not enough money for that hint.');
    if (price) {
      S.money = round2(S.money - price);
      S.stats.spent += price;
      log(`💡 Bought a hint: ${HINTS[kind].title} (${money(price)}).`);
    }
    S.stats.hints = (S.stats.hints || 0) + 1;
    const a = kind === 'money' ? moneyTip() : advice()[0];
    save();
    render();
    openModal(`
      <p class="eyebrow">💡 ${HINTS[kind].title}${price ? ` · ${money(price)}` : ' · Free'}</p>
      <h2>${esc(a.short)}</h2>
      ${kind === 'basic' ? '' : `<p>${esc(a.detail)}</p>`}
      <div class="choices">${a.place && a.place !== S.loc ? '<button class="btn" id="hintMap">Show me on the map</button>' : ''}<button class="btn primary" data-close>Got it</button></div>`);
    $('[data-close]').onclick = () => { closeModal(); processQueue(); };
    if ($('#hintMap')) $('#hintMap').onclick = () => { closeModal(); selectPlace(a.place); };
  }

  // ------------------------------------------------------------ guided start

  // A welcome card, then four steps: cook at home, go outside, travel, apply for a job.
  const tutJob = () => (S.bg === 'immigrant' ? 'care' : bestJob() || 'barista');
  function tutStep() { return S && S.tut && !S.tut.done ? S.tut.step : -1; }
  function tutText() {
    switch (tutStep()) {
      case 0: return ui.view === 'room'
        ? 'You\'re hungry after the move. Tap the <b>🍳 Kitchen</b> and cook a meal.'
        : 'You\'re hungry. <b>Eat something</b>: tap a food action in the list below.';
      case 1: return 'Now see London. Tap <b>🚪 Go outside</b>.';
      case 2: {
        const J = JOBS[tutJob()];
        return `${esc(J.title)} is hiring in <b>${esc(LOCATIONS[J.place].name)}</b>. Tap it on the map, then pick how to get there. The 🚇 Tube is quick, walking is free.`;
      }
      case 3: return 'Last step: tap <b>📝 Apply</b> for the job. Interviews run 9am to 6pm and go better when you\'re clean and happy.';
      default: return '';
    }
  }
  function advanceTut(to) {
    if (tutStep() < 0) return;
    S.tut.step = Math.max(S.tut.step, to);
    if (S.tut.step >= 4) finishTut(true);
  }
  function finishTut(completed) {
    S.tut = { done: true };
    save();
    if (completed) toast('🎉 You\'re set! The 🎯 card shows your next goal.');
    render();
    setTimeout(checkDaily, 600);
  }
  function event(kind, data) {
    const st = tutStep();
    if (st < 0 || S.tut.welcome) return;
    if (st === 0 && kind === 'action' && FOOD.test(data.label)) advanceTut(1);
    else if (st <= 1 && kind === 'view' && data === 'city') advanceTut(2);
    else if (st <= 2 && kind === 'travel') advanceTut(3);
    else if (kind === 'action' && /Apply:/.test(data.label)) advanceTut(4);
  }

  // Cards down the left: the next goal, what you need most right now, your dream and streak.
  function needCard() {
    const n = S.needs, room = ui.view === 'room';
    const low = Object.keys(n).filter((k) => n[k] < 35).sort((a, b) => n[a] - n[b])[0];
    if (!low) return null;
    const home = S.loc === S.home;
    const c = {
      hunger: ['🍔', 'Eat something', home ? 'Tap the kitchen' : 'Find food nearby', 'kitchen'],
      energy: ['😴', 'Get some sleep', home ? 'Tap the bed' : 'Head home to sleep', 'bed'],
      hygiene: ['🚿', 'Have a shower', home ? 'Tap the shower' : 'Head home to shower', 'shower'],
      fun: ['🎉', 'Have some fun', home ? 'Tap your phone or the telly' : 'Go and do something fun', 'me'],
      social: ['💬', 'See people', home ? 'Tap your phone to call someone' : 'Hang out with a friend', 'me'],
    }[low];
    return { icon: c[0], title: c[1], sub: c[2], act: () => (room && home ? Home.tapHot(c[3]) : openHints()) };
  }
  function renderTasks() {
    const box = $('#tasks');
    if (!box) return;
    const cards = [];
    if (tutStep() < 0) {
      const steps = goalSteps();
      const i = steps.findIndex(([, done]) => !done);
      cards.push(i < 0
        ? { icon: '🏆', title: 'Goal reached!', sub: 'Hold on to it until day 60', act: openHints, cls: 'done' }
        : { icon: '🎯', title: steps[i][0], sub: `Next goal · step ${i + 1} of ${steps.length}`, act: openHints, id: 'goalPill' });
    }
    const need = needCard();
    if (need) cards.push(need);
    if (S.dream && !S.flags.dreamDone) {
      const [v, max, label] = dreamProgress();
      cards.push({ icon: DREAMS[S.dream].icon, title: DREAMS[S.dream].name, sub: label, pct: (100 * v) / max, act: () => { ui.tab = 'me'; ui.expanded = true; render(); } });
    }
    const st = dailyState();
    if (st.streak > 1 && st.last === isoDate(new Date())) cards.push({ icon: '🔥', title: `${st.streak}-day streak`, sub: 'Come back tomorrow', act: null, cls: 'small' });
    box.innerHTML = cards.map((c, i) => `<button class="task ${c.cls || ''}" data-task="${i}" ${c.id ? `id="${c.id}"` : ''} ${c.act ? '' : 'tabindex="-1"'}>
      <span class="task-icon">${c.icon}</span><span><b>${esc(c.title)}</b><small>${esc(c.sub)}</small>${c.pct !== undefined ? `<i class="task-bar"><i style="width:${Math.min(100, c.pct)}%"></i></i>` : ''}</span></button>`).join('');
    box.querySelectorAll('[data-task]').forEach((b) => { const c = cards[+b.dataset.task]; if (c.act) b.onclick = c.act; });
  }

  function renderHUD() {
    const box = $('#coach');
    if (!box) return;
    renderTasks();
    document.querySelectorAll('.coach-target').forEach((p) => p.classList.remove('coach-target'));
    const st = tutStep();
    if (st < 0) { box.innerHTML = ''; return; }
    if (S.tut.welcome) {
      box.innerHTML = `
        <div class="coach-card welcome" role="dialog" aria-label="Welcome">
          <div class="welcome-row"><span class="welcome-wave">👋🏾</span><div><b>Welcome to London!</b><p>Quick tour, under one minute. Let's go!</p></div></div>
          <span class="coach-dots">${[0, 1, 2, 3].map(() => '<i></i>').join('')}</span>
          <div class="welcome-btns"><button class="link-btn" id="coachSkip">Skip</button><button class="btn green" id="coachStart">Start</button></div>
        </div>`;
      $('#coachSkip').onclick = () => finishTut(false);
      $('#coachStart').onclick = () => { S.tut.welcome = false; save(); render(); };
      return;
    }
    // Point at what to tap.
    const targets = {
      0: ui.view === 'room' ? '.hot[data-hot="kitchen"]' : null,
      1: '#goOutside, .nav-btn[data-nav="map"]',
      2: `.pin[data-loc="${JOBS[tutJob()].place}"]`,
      3: null,
    };
    if (targets[st]) document.querySelectorAll(targets[st]).forEach((el) => el.classList.add('coach-target'));
    box.innerHTML = `
      <div class="coach-card" role="status">
        <div class="coach-top"><b>Quick tour</b><span class="coach-dots">${[0, 1, 2, 3].map((i) => `<i class="${i < st ? 'done' : i === st ? 'on' : ''}"></i>`).join('')}</span><span class="coach-count">${st + 1} of 4</span>
        <button class="coach-skip" id="coachSkip">Skip</button></div>
        <p>${tutText()}</p>
      </div>`;
    $('#coachSkip').onclick = () => finishTut(false);
  }

  // ------------------------------------------------------------ daily login reward

  const DAILY_KEY = 'london-hustle-daily';
  function dailyState() {
    let st = {};
    try { st = JSON.parse(localStorage.getItem(DAILY_KEY)) || {}; } catch (e) { st = {}; }
    // Signed-in players carry their streak in the cloud save; use whichever is newer.
    if (S && S.daily && (S.daily.last || '') > (st.last || '')) st = { ...S.daily };
    st.outfits = [...new Set([...(st.outfits || []), ...((S && S.daily && S.daily.outfits) || [])])];
    return st;
  }
  function storeDaily(st) {
    try { localStorage.setItem(DAILY_KEY, JSON.stringify(st)); } catch (e) { /* storage unavailable */ }
    if (S) S.daily = st;
  }
  function checkDaily() {
    if (!S || S.over || tutStep() >= 0 || $('#game').classList.contains('hidden')) return;
    if (!$('#modal').classList.contains('hidden') || S.queue.length) { setTimeout(checkDaily, 1500); return; }
    const st = dailyState();
    const today = isoDate(new Date());
    if (st.last === today) return;
    const y = new Date();
    y.setDate(y.getDate() - 1);
    const streak = st.last === isoDate(y) ? (st.streak || 0) + 1 : 1;
    const slot = (streak - 1) % 7;
    const reward = DAILY_REWARDS[slot];
    openModal(`
      <div class="daily">
        <p class="eyebrow">Daily reward</p>
        <h2>${streak > 1 ? `🔥 ${streak}-day streak!` : 'Welcome back!'}</h2>
        <p>Come back every day for a reward. Day 7 unlocks an outfit you can't get anywhere else.</p>
        <ol class="streak">${DAILY_REWARDS.map((r, i) => `<li class="${i < slot ? 'got' : i === slot ? 'today' : ''}"><span>${r.icon}</span><small>Day ${i + 1}</small></li>`).join('')}</ol>
        <p class="daily-today">Today: <b>${reward.icon} ${reward.label}</b></p>
        <div class="choices"><button class="btn primary" id="claimDaily">Claim</button></div>
      </div>`);
    $('#claimDaily').onclick = () => {
      let msg = `${reward.icon} Daily reward: ${reward.label}.`;
      if (reward.money) { S.money = round2(S.money + reward.money); S.stats.earned += reward.money; }
      if (reward.meals) S.groceries += reward.meals;
      if (reward.needs) fx(reward.needs);
      if (reward.outfit) {
        const next = REWARD_OUTFITS.findIndex((_, i) => !st.outfits.includes(i));
        if (next >= 0) {
          st.outfits.push(next);
          msg = `👕 Daily reward: a ${REWARD_OUTFITS[next][1].toLowerCase()} outfit! Change it any time in Me → Wardrobe.`;
          setOutfit(BASE_OUTFITS + next);
        } else { S.money = round2(S.money + 100); msg = '👕 You have every outfit, so here\'s £100 instead.'; }
      }
      storeDaily({ last: today, streak, outfits: st.outfits });
      log(msg, 'good');
      closeModal();
      save();
      render();
      toast(msg);
    };
  }

  // ------------------------------------------------------------ wardrobe

  function setOutfit(i) {
    S.look = { ...S.look, outfit: i };
    World.setAvatar(S.look, S.loc);
    if (Online.signedIn()) Online.updateProfile({ look: S.look });
  }
  function wardrobeHTML() {
    const owned = dailyState().outfits;
    const list = [...Array(BASE_OUTFITS).keys(), ...owned.map((i) => BASE_OUTFITS + i)];
    const locked = REWARD_OUTFITS.length - owned.length;
    return `<h4>Wardrobe</h4><div class="swatches">${list.map((i) => `<button class="swatch ${S.look.outfit === i ? 'on' : ''}" style="background:${OUTFITS[i]}" data-outfit="${i}" aria-label="${i >= BASE_OUTFITS ? REWARD_OUTFITS[i - BASE_OUTFITS][1] : 'Outfit ' + (i + 1)}"></button>`).join('')}</div>
      ${locked ? `<p class="hint">🔒 ${locked} rare outfit${locked > 1 ? 's' : ''} to unlock with a 7-day login streak.</p>` : ''}`;
  }
  function bindWardrobe(root) {
    root.querySelectorAll('[data-outfit]').forEach((b) => { b.onclick = () => { setOutfit(+b.dataset.outfit); save(); render(); }; });
  }

  // ------------------------------------------------------------ accessibility

  const A11Y_KEY = 'london-hustle-a11y';
  let a11y = { big: false, cb: false };
  function applyA11y() {
    document.documentElement.classList.toggle('big-text', !!a11y.big);
    document.documentElement.classList.toggle('cb-safe', !!a11y.cb);
  }
  function settingsHTML() {
    const t = (k, label, sub) => `<button class="toggle" data-a11y="${k}" role="switch" aria-checked="${!!a11y[k]}"><span><b>${label}</b><small>${sub}</small></span><i></i></button>`;
    return `<h4 class="menu-label">Accessibility</h4>
      ${t('big', 'Bigger text', 'Larger writing and buttons')}
      ${t('cb', 'Colour-blind-safe colours', 'Blue and orange need rings, with a ! when low')}
      <p class="hint">Keyboard: arrows or WASD move the map, + and - zoom, P lists places, 1 to 9 pick actions, H hint, M menu.</p>`;
  }
  function bindSettings() {
    document.querySelectorAll('[data-a11y]').forEach((b) => {
      b.onclick = () => {
        a11y[b.dataset.a11y] = !a11y[b.dataset.a11y];
        b.setAttribute('aria-checked', String(a11y[b.dataset.a11y]));
        try { localStorage.setItem(A11Y_KEY, JSON.stringify(a11y)); } catch (e) { /* storage unavailable */ }
        applyA11y();
      };
    });
  }

  // ------------------------------------------------------------ places list (keyboard and screen readers)

  function showPlaces() {
    if (!S || S.over) return;
    const draw = (q) => Object.entries(LOCATIONS)
      .filter(([, p]) => p.name.toLowerCase().includes(q.toLowerCase()))
      .sort((a, b) => a[1].name.localeCompare(b[1].name))
      .map(([id, p]) => `<button class="place-row ${id === S.loc ? 'here' : ''}" data-place="${id}"><span>${id === S.home ? '🏠' : p.icon}</span><b>${esc(p.name)}</b><small>Zone ${p.zone}${id === S.loc ? ' · You are here' : ''}</small></button>`).join('') || '<p class="hint">No place matches.</p>';
    openModal(`<h2>🗺️ Places</h2><input class="country-search" id="placeSearch" placeholder="Search places" aria-label="Search places"><div class="place-list" id="placeList">${draw('')}</div>
      <div class="choices"><button class="btn" data-close>Close</button></div>`);
    const bind = () => document.querySelectorAll('[data-place]').forEach((b) => { b.onclick = () => { closeModal(); selectPlace(b.dataset.place); }; });
    bind();
    const input = $('#placeSearch');
    input.focus();
    input.oninput = () => { $('#placeList').innerHTML = draw(input.value); bind(); };
    input.onkeydown = (e) => { if (e.key === 'Enter') { const f = $('[data-place]'); if (f) f.click(); } };
    $('[data-close]').onclick = () => { closeModal(); processQueue(); };
  }

  // ------------------------------------------------------------ keyboard play

  function onKey(e) {
    if (!S || $('#game').classList.contains('hidden') || e.ctrlKey || e.metaKey || e.altKey) return;
    if (/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) return;
    if (!$('#modal').classList.contains('hidden')) return;
    const k = e.key.toLowerCase();
    const pan = { arrowleft: [-1, 0], a: [-1, 0], arrowright: [1, 0], d: [1, 0], arrowup: [0, -1], w: [0, -1], arrowdown: [0, 1], s: [0, 1] }[k];
    if (pan && !(k.startsWith('arrow') && document.activeElement.closest && document.activeElement.closest('.sheet'))) { e.preventDefault(); World.nudge(...pan); return; }
    if (k === '+' || k === '=') return World.zoomBy(0.85);
    if (k === '-' || k === '_') return World.zoomBy(1.18);
    if (k === 'h') return openHints();
    if (k === 'm') return showMenu();
    if (k === 'p' || k === 'l') return showPlaces();
    if (k === '?') return showHelp();
    if (k === 't') { const h = $('#sheetHandle'); if (h) h.click(); return; }
    if (k === 'escape' && ui.target) { const c = $('#stayBtn'); if (c) c.click(); return; }
    if (/^[1-9]$/.test(k)) {
      const list = [...document.querySelectorAll('#sheet [data-act]:not([disabled]), #sheet [data-mode]:not([disabled])')];
      const b = list[+k - 1];
      if (b) { b.focus(); b.click(); }
    }
  }

  return {
    init() {
      try { a11y = { ...a11y, ...JSON.parse(localStorage.getItem(A11Y_KEY) || '{}') }; } catch (e) { /* use defaults */ }
      applyA11y();
      document.addEventListener('keydown', onKey);
    },
    start() { if (tutStep() < 0) setTimeout(checkDaily, 800); },
    event, renderHUD, openHints, advice, moneyTip, goalSteps, hintPrice, checkDaily,
    ownedOutfits: () => dailyState().outfits,
    wardrobeHTML, bindWardrobe, settingsHTML, bindSettings, showPlaces,
  };
})();
