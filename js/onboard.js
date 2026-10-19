'use strict';
// Setting up a new life, in five steps: Look, Personality, Dream, the birth lottery and
// Home. The character stands full-body on the left and can be spun by dragging.

const Onboard = (() => {
  const STEPS = ['Look', 'Personality', 'Dream', 'Birth lottery', 'Home'];
  const LABELS = {
    hair: { short: 'Short', fade: 'Fade', afro: 'Afro', puffs: 'Puffs', braids: 'Braids', locs: 'Locs', bob: 'Bob', long: 'Long', curly: 'Curly', bun: 'Bun', mohawk: 'Mohawk', bald: 'Bald' },
    head: { none: 'None', beanie: 'Beanie', cap: 'Cap', bucket: 'Bucket hat', beret: 'Beret', gele: 'Gele', hijab: 'Hijab', turban: 'Turban' },
    eyewear: { none: 'None', round: 'Round', square: 'Square', shades: 'Shades' },
    facial: { none: 'None', stubble: 'Stubble', goatee: 'Goatee', moustache: 'Moustache', beard: 'Beard' },
    earrings: { none: 'None', studs: 'Studs', hoops: 'Hoops' },
    body: { woman: 'Woman', man: 'Man' },
    style: { casual: 'Casual', hoodie: 'Hoodie', office: 'Office', gym: 'Gym', hivis: 'Hi-vis' },
    fabric: { plain: 'Plain', ankara: 'Ankara', kente: 'Kente', tartan: 'Tartan', pinstripe: 'Pinstripe' },
  };
  const LISTS = { hair: HAIR, head: HEADWEAR, eyewear: EYEWEAR, facial: FACIAL, earrings: EARRINGS, body: BODIES, style: STYLES, fabric: FABRICS };
  let drawing = false;

  // ------------------------------------------------------------ the spinning character

  let stage = null;
  function startStage() {
    const box = $('#obStage');
    if (!stage) {
      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.05;
      const scene = new THREE.Scene();
      const pm = new THREE.PMREMGenerator(renderer);
      scene.environment = pm.fromScene(new FX.RoomEnvironment(), 0.04).texture;
      scene.environmentIntensity = 0.5;
      pm.dispose();
      scene.add(new THREE.HemisphereLight('#ffffff', '#b8b2a8', 0.9));
      const key = new THREE.DirectionalLight('#fff4e8', 2.2);
      key.position.set(-3, 5, 6);
      scene.add(key);
      const disc = new THREE.Mesh(new THREE.CircleGeometry(3.2, 48), new THREE.MeshStandardMaterial({ color: '#dfe3e0', roughness: 0.9 }));
      disc.rotation.x = -Math.PI / 2;
      disc.position.y = -3.68;
      scene.add(disc);
      const cam = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
      stage = { renderer, scene, cam, model: null, key: '', angle: 0.25, spin: 0, drag: null, raf: 0 };
      const el = renderer.domElement;
      el.addEventListener('pointerdown', (e) => { stage.drag = e.clientX; el.setPointerCapture(e.pointerId); });
      el.addEventListener('pointermove', (e) => { if (stage.drag === null) return; stage.spin = (e.clientX - stage.drag) * 0.012; stage.angle += stage.spin; stage.drag = e.clientX; });
      el.addEventListener('pointerup', () => { stage.drag = null; });
    }
    box.prepend(stage.renderer.domElement);
    cancelAnimationFrame(stage.raf);
    loop();
  }
  function loop() {
    const el = stage.renderer.domElement, box = el.parentElement;
    if (!box || $('#create').classList.contains('hidden')) return;
    const w = box.clientWidth, h = box.clientHeight;
    if (el.width !== Math.round(w * stage.renderer.getPixelRatio()) || el.height !== Math.round(h * stage.renderer.getPixelRatio())) {
      stage.renderer.setSize(w, h, false);
      stage.cam.aspect = w / h;
      stage.cam.updateProjectionMatrix();
    }
    const look = lookFromCreate();
    const key = JSON.stringify(look);
    if (key !== stage.key) {
      if (stage.model) stage.scene.remove(stage.model);
      stage.model = Avatar.build(look, 'full');
      stage.scene.add(stage.model);
      stage.key = key;
    }
    if (stage.drag === null) { stage.spin *= 0.94; stage.angle += stage.spin + 0.002; }
    stage.model.rotation.y = stage.angle;
    const fit = Math.max(1, 0.75 / stage.cam.aspect);
    stage.cam.position.set(0, 0.2, 15.5 * fit);
    stage.cam.lookAt(0, -1.1, 0);
    stage.renderer.render(stage.scene, stage.cam);
    stage.raf = requestAnimationFrame(loop);
  }

  // ------------------------------------------------------------ steps

  const L = () => create.look;
  function chips(key) {
    return LISTS[key].map((v) => `<button class="chip-btn ${L()[key] === v ? 'on' : ''}" data-pick="${key}" data-v="${v}">${LABELS[key][v]}</button>`).join('');
  }
  function swatches(arr, key, n = arr.length) {
    return arr.slice(0, n).map((c, i) => `<button class="swatch ${L()[key] === i ? 'on' : ''}" style="background:${c}" data-pick="${key}" data-i="${i}" aria-label="${key} ${i + 1}"></button>`).join('');
  }
  function lookHTML() {
    return `
      <label class="ob-name"><input id="obName" maxlength="16" value="${esc(create.name)}" aria-label="Your Londoner's name"><span>your Londoner's name</span></label>
      <h4>Body</h4><div class="seg">${chips('body')}</div>
      <h4>Skin tone</h4><div class="swatches">${swatches(SKIN, 'skin')}</div>
      <h4>Hairstyle</h4><div class="swatches">${chips('hair')}</div>
      <h4>Hair colour</h4><div class="swatches">${swatches(HAIR_COLOURS, 'hairColour')}</div>
      <h4>Outfit</h4><div class="swatches">${chips('style')}</div>
      <h4>Fabric</h4><div class="swatches">${chips('fabric')}</div>
      <h4>Colour</h4><div class="swatches">${swatches(OUTFITS, 'outfit', BASE_OUTFITS)}</div>
      <h4>Headwear</h4><div class="swatches">${chips('head')}</div>
      ${L().head !== 'none' ? `<h4>Headwear colour</h4><div class="swatches">${swatches(HAT_COLOURS, 'hatColour')}</div>` : ''}
      <h4>Glasses</h4><div class="swatches">${chips('eyewear')}</div>
      <h4>Facial hair</h4><div class="swatches">${chips('facial')}</div>
      <h4>Earrings</h4><div class="swatches">${chips('earrings')}</div>`;
  }
  function traitsHTML() {
    return `<p class="ob-q">Choose 2 traits for ${esc(create.name)}.</p>
      <div class="ob-grid">${Object.entries(TRAITS).map(([id, t]) => `
        <button class="ob-card ${create.traits.includes(id) ? 'on' : ''}" data-trait="${id}" aria-pressed="${create.traits.includes(id)}">
          <span class="ob-icon">${t.icon}</span><b>${t.name}</b><small>${t.desc}</small></button>`).join('')}</div>`;
  }
  function dreamHTML() {
    return `<p class="ob-q">What's ${esc(create.name)}'s big dream?</p>
      <div class="ob-list">${Object.entries(DREAMS).map(([id, d]) => `
        <button class="ob-row ${create.dream === id ? 'on' : ''}" data-dream="${id}" aria-pressed="${create.dream === id}">
          <span class="ob-icon">${d.icon}</span><span><b>${d.name}</b><small>${d.desc}</small></span></button>`).join('')}</div>`;
  }
  function birthHTML() {
    if (!create.birthDrawn) {
      return `<p class="ob-q center">Every Londoner starts somewhere. What was ${esc(create.name)} born into?</p>
        <div class="lottery ${drawing ? 'rolling' : ''}" id="lottery"><span>${drawing ? '🎲' : '❔'}</span></div>
        <p class="hint center">${drawing ? 'Drawing…' : 'Tap Draw to find out. It is decided once for your account.'}</p>`;
    }
    const P = BIRTH_PERKS[create.bg];
    const immigrant = create.bg === 'immigrant';
    const list = COUNTRIES.filter(([c, n]) => !(immigrant && c === 'GB') && n.toLowerCase().includes(create.countrySearch.toLowerCase()));
    return `<p class="ob-q center">Every Londoner starts somewhere. What was ${esc(create.name)} born into?</p>
      <div class="lottery done ${create.bg}"><span>${P.icon}</span></div>
      <h2 class="center">${P.title}</h2>
      <p class="center ob-tag">${P.line}</p>
      <ul class="ob-perks">${P.perks.map((x) => `<li>💪🏾 ${esc(x)}</li>`).join('')}</ul>
      <p class="hint center">Decided once for your account. Starting a new life won't change it.</p>
      <h4>${immigrant ? 'Where did you move from?' : 'Where are your family roots?'}</h4>
      <div class="country-row">
        <span class="country-picked">${flagOf(create.country)} <b>${esc(countryName(create.country))}</b></span>
        <input id="countrySearch" class="country-search" placeholder="Search countries" value="${esc(create.countrySearch)}" aria-label="Search countries">
      </div>
      <div class="countries">${list.map(([c, n]) => `<button class="country ${create.country === c ? 'on' : ''}" data-country="${c}" title="${esc(n)}"><span class="flag">${flagOf(c)}</span><span>${esc(n)}</span></button>`).join('') || '<p class="hint">No country matches that search.</p>'}</div>`;
  }
  function homeLocked(h) { return h.deposit > BACKGROUNDS[create.bg].money - 150; }
  function homesFor() { return Object.entries(HOMES).filter(([, h]) => h.lives.includes(create.bg)); }
  function homeHTML() {
    const B = BACKGROUNDS[create.bg];
    return `<p class="ob-q">Where will ${esc(create.name)} live? Rent leaves every Monday.</p>
      <div class="ob-list">${homesFor().map(([id, h]) => {
        const locked = homeLocked(h);
        const rent = create.bg === 'oldmoney' ? 'Rent paid by Pater' : `Rent ${money(h.rent)}/wk`;
        return `<button class="ob-home ${create.home === id ? 'on' : ''} ${locked ? 'locked' : ''}" data-home="${id}" ${locked ? 'disabled' : ''}>
          <span class="ob-home-top"><b>${h.name} · ${LOCATIONS[h.area].name}</b><i>${h.tag}</i></span>
          <small>${esc(h.desc)}</small>
          ${locked ? '<span class="ob-meta">Can\'t afford it yet. Work your way here.</span>' : `<span class="ob-meta"><b>Start with ${money(B.money - h.deposit)}</b> · ${rent}${h.deposit ? ` · ${money(h.deposit)} deposit` : ''}</span>`}
        </button>`;
      }).join('')}</div>`;
  }

  // What the big button says, and whether it works yet.
  function primary() {
    switch (create.step) {
      case 0: return create.name.trim() ? ['Continue', true] : ['Name your Londoner', false];
      case 1: return create.traits.length === 2 ? ['Continue', true] : [`Choose ${2 - create.traits.length} more`, false];
      case 2: return create.dream ? ['Continue', true] : ['Choose a dream', false];
      case 3: return create.birthDrawn ? ['Choose where to live', true] : [drawing ? 'Drawing…' : 'Draw', !drawing];
      default: return [create.home ? 'Move in' : 'Choose a home', !!create.home];
    }
  }

  function render() {
    const st = create.step;
    const body = [lookHTML, traitsHTML, dreamHTML, birthHTML, homeHTML][st]();
    const [label, ok] = primary();
    $('#obTitle').textContent = STEPS[st];
    $('#obDots').innerHTML = STEPS.map((_, i) => `<i class="${i <= st ? 'on' : ''}"></i>`).join('');
    const scroll = $('#obBody').scrollTop;
    $('#obBody').innerHTML = body;
    if (st === 0) $('#obBody').scrollTop = scroll;
    $('#obGo').textContent = label;
    $('#obGo').disabled = !ok;
    $('#obNext').textContent = st === 4 ? 'Move in' : 'Next';
    $('#obNext').disabled = !ok;
    $('#obShuffle').disabled = st === 3;
    bind();
  }
  function bind() {
    document.querySelectorAll('[data-pick]').forEach((b) => {
      b.onclick = () => { const k = b.dataset.pick; L()[k] = b.dataset.i !== undefined ? +b.dataset.i : b.dataset.v; render(); };
    });
    const name = $('#obName');
    if (name) name.oninput = () => { create.name = name.value; const [label, ok] = primary(); $('#obGo').textContent = label; $('#obGo').disabled = !ok; $('#obNext').disabled = !ok; };
    document.querySelectorAll('[data-trait]').forEach((b) => {
      b.onclick = () => {
        const id = b.dataset.trait;
        if (create.traits.includes(id)) create.traits = create.traits.filter((t) => t !== id);
        else create.traits = [...create.traits, id].slice(-2);
        render();
      };
    });
    document.querySelectorAll('[data-dream]').forEach((b) => { b.onclick = () => { create.dream = b.dataset.dream; render(); }; });
    document.querySelectorAll('[data-home]').forEach((b) => { b.onclick = () => { create.home = b.dataset.home; render(); }; });
    document.querySelectorAll('[data-country]').forEach((b) => { b.onclick = () => { create.country = b.dataset.country; render(); }; });
    const cs = $('#countrySearch');
    if (cs) cs.oninput = () => {
      create.countrySearch = cs.value;
      render();
      const again = $('#countrySearch');
      again.focus();
      again.setSelectionRange(again.value.length, again.value.length);
    };
  }

  // ------------------------------------------------------------ the birth lottery

  const BIRTH_KEY = 'london-hustle-birth';
  function localBirth() {
    let b = null;
    try { b = localStorage.getItem(BIRTH_KEY); } catch (e) { b = null; }
    if (!BACKGROUNDS[b]) {
      const r = Math.random();
      b = r < 0.4 ? 'immigrant' : r < 0.8 ? 'newgen' : 'oldmoney';
      try { localStorage.setItem(BIRTH_KEY, b); } catch (e) { /* storage unavailable */ }
    }
    return b;
  }
  async function draw() {
    if (drawing || create.birthDrawn) return;
    drawing = true;
    render();
    const reveal = new Promise((r) => setTimeout(r, 1600));
    let b = null;
    if (Online.signedIn()) b = await Online.drawBirth();
    if (!BACKGROUNDS[b]) b = localBirth();
    await reveal;
    drawing = false;
    setBirth(b);
    render();
  }
  function setBirth(b) {
    create.bg = b;
    create.birthDrawn = true;
    if (b === 'immigrant' && (!create.country || create.country === 'GB')) create.country = pick(COUNTRIES.slice(1))[0];
    if (b !== 'immigrant' && !create.country) create.country = 'GB';
    if (!HOMES[create.home] || !HOMES[create.home].lives.includes(b)) create.home = DEFAULT_HOME[b];
  }

  // ------------------------------------------------------------ navigation

  function go() {
    if (!primary()[1]) return;
    if (create.step === 3 && !create.birthDrawn) return draw();
    if (create.step === 4) { leave(); return newGame(); }
    create.step++;
    $('#obBody').scrollTop = 0;
    render();
  }
  function back() {
    if (create.step === 0) { leave(); return showTitle(); }
    create.step--;
    render();
  }
  function shuffle() {
    const r = (n) => Math.floor(Math.random() * n);
    const st = create.step;
    if (st === 0) {
      Object.assign(L(), {
        body: pick(BODIES), skin: r(SKIN.length), hair: pick(HAIR), hairColour: Math.random() < 0.8 ? r(6) : r(HAIR_COLOURS.length),
        outfit: r(BASE_OUTFITS), style: pick(STYLES), fabric: pick(FABRICS), head: Math.random() < 0.6 ? 'none' : pick(HEADWEAR),
        hatColour: r(HAT_COLOURS.length), eyewear: Math.random() < 0.6 ? 'none' : pick(EYEWEAR), facial: Math.random() < 0.6 ? 'none' : pick(FACIAL),
        earrings: Math.random() < 0.6 ? 'none' : pick(EARRINGS),
      });
    } else if (st === 1) {
      const ids = Object.keys(TRAITS).sort(() => Math.random() - 0.5);
      create.traits = ids.slice(0, 2);
    } else if (st === 2) create.dream = pick(Object.keys(DREAMS));
    else if (st === 4) { const open = homesFor().filter(([, h]) => !homeLocked(h)); create.home = pick(open)[0]; }
    render();
  }
  function leave() {
    World.setPaused(false);
    if (stage) cancelAnimationFrame(stage.raf);
  }

  return {
    // Start setting up a life. Signed-in players already know their birth if they drew it before.
    open() {
      create.step = 0;
      create.traits = create.traits || [];
      create.birthDrawn = false;
      if (!create.name) create.name = (Online.signedIn() && Online.profile().display_name) || pick(NAMES);
      const known = Online.signedIn() ? Online.profile().birth : (() => { try { return localStorage.getItem(BIRTH_KEY); } catch (e) { return null; } })();
      if (BACKGROUNDS[known]) setBirth(known);
      World.setPaused(true);
      $('#obBack').onclick = back;
      $('#obNext').onclick = go;
      $('#obGo').onclick = go;
      $('#obShuffle').onclick = shuffle;
      render();
      startStage();
    },
    render,
  };
})();
