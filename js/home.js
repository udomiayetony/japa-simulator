'use strict';
// Your home: the 3D room you start in. Tap the bed, kitchen, shower and furniture to use
// them, and buy furniture and paint in the Shop. Comfort makes sleep and home time better.

const Home = (() => {
  let renderer = null, scene, camera, room = null, raf = 0, active = false, builtKey = '';
  let angle = 0.75, drag = null, openHot = null, me = null;
  const mats = {};
  const mat = (color, o = {}) => (mats[color + JSON.stringify(o)] ||= new THREE.MeshStandardMaterial({ color, roughness: 0.75, ...o }));
  const BOX = new THREE.BoxGeometry(1, 1, 1);
  function box(g, w, h, d, color, x, y, z) {
    const m = new THREE.Mesh(BOX, typeof color === 'string' ? mat(color) : color);
    m.scale.set(w, h, d);
    m.position.set(x, y + h / 2, z);
    m.castShadow = m.receiveShadow = true;
    g.add(m);
    return m;
  }
  function cyl(g, rt, rb, h, color, x, y, z, seg = 16) {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), typeof color === 'string' ? mat(color) : color);
    m.position.set(x, y + h / 2, z);
    m.castShadow = m.receiveShadow = true;
    g.add(m);
    return m;
  }
  function tex(w, h, draw) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    draw(c.getContext('2d'), w, h);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }
  function plane(g, w, h, map, x, y, z, ry = 0, extra = {}) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map, roughness: 0.8, ...extra }));
    m.position.set(x, y, z);
    m.rotation.y = ry;
    g.add(m);
    return m;
  }
  const floorTex = tex(256, 256, (c, w, h) => {
    for (let i = 0; i < 8; i++) {
      c.fillStyle = ['#c49a6c', '#b98d5f', '#cfa577', '#bf9363'][i % 4];
      c.fillRect(0, (i * h) / 8, w, h / 8);
      c.fillStyle = 'rgba(0,0,0,.18)';
      c.fillRect(0, (i * h) / 8, w, 2);
      c.fillRect(((i * 97) % w), (i * h) / 8, 2, h / 8);
    }
  });

  const BUILD = {
    bed(g) {
      box(g, 2.2, 0.35, 3, '#8a6a4a', 2.4, 0, -2.4);
      box(g, 2.0, 0.3, 2.8, '#f4f1ea', 2.4, 0.35, -2.4);
      box(g, 2.04, 0.12, 1.8, '#3d6fb6', 2.4, 0.62, -1.9);
      box(g, 1.6, 0.18, 0.5, '#ffffff', 2.4, 0.65, -3.5);
      box(g, 2.2, 1.2, 0.15, '#7a5a3a', 2.4, 0, -3.95);
    },
    sofa(g) {
      const c = '#3f6b8f';
      box(g, 1.0, 0.45, 2.6, c, -3.3, 0, 0.6);
      box(g, 0.3, 0.6, 2.6, c, -3.7, 0.45, 0.6);
      for (const z of [-0.6, 1.8]) box(g, 1.0, 0.65, 0.25, c, -3.3, 0, z);
      for (const z of [0.15, 1.05]) box(g, 0.8, 0.12, 0.85, '#4f7da3', -3.2, 0.45, z);
    },
    tv(g) {
      box(g, 0.6, 0.55, 1.8, '#3b3b3b', 1.4, 0, 0.6);
      box(g, 0.08, 1.0, 1.7, '#111111', 1.42, 0.75, 0.6);
      const s = new THREE.Mesh(new THREE.PlaneGeometry(1.55, 0.88), new THREE.MeshBasicMaterial({ color: '#5fa8e8' }));
      s.position.set(1.37, 1.25, 0.6);
      s.rotation.y = -Math.PI / 2;
      g.add(s);
    },
    rug(g) {
      const t = tex(128, 96, (c, w, h) => { c.fillStyle = '#c0504d'; c.fillRect(0, 0, w, h); c.strokeStyle = '#f2d17a'; c.lineWidth = 6; c.strokeRect(10, 10, w - 20, h - 20); c.fillStyle = '#2f5d8a'; c.fillRect(30, 30, w - 60, h - 60); });
      const m = new THREE.Mesh(new THREE.PlaneGeometry(2.8, 2), new THREE.MeshStandardMaterial({ map: t, roughness: 1 }));
      m.rotation.x = -Math.PI / 2;
      m.position.set(-0.9, 0.012, 0.7);
      m.receiveShadow = true;
      g.add(m);
    },
    plant(g) {
      cyl(g, 0.28, 0.22, 0.5, '#c46a45', -3.4, 0, -3.4).position.set(1.7, 0.25, 3.5);
      for (let i = 0; i < 6; i++) {
        const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.3, 8, 6), mat('#3f9b4a'));
        leaf.scale.set(0.6, 1.4, 0.6);
        leaf.position.set(1.7 + Math.cos(i) * 0.2, 0.9 + (i % 3) * 0.15, 3.5 + Math.sin(i) * 0.2);
        leaf.rotation.z = Math.cos(i * 2) * 0.5;
        leaf.castShadow = true;
        g.add(leaf);
      }
    },
    lamp(g) {
      cyl(g, 0.25, 0.3, 0.06, '#333333', -3.4, 0, -2.5);
      cyl(g, 0.04, 0.04, 1.9, '#333333', -3.4, 0.06, -2.5, 6);
      cyl(g, 0.22, 0.38, 0.4, mat('#fff3d1', { emissive: '#ffd27a', emissiveIntensity: 0.9 }), -3.4, 1.9, -2.5);
      const l = new THREE.PointLight('#ffd9a0', 6, 6);
      l.position.set(-3.1, 2, -2.3);
      g.add(l);
    },
    poster(g) {
      const t = tex(96, 128, (c, w, h) => { c.fillStyle = '#ffd400'; c.fillRect(0, 0, w, h); c.fillStyle = '#111'; c.font = '800 20px sans-serif'; c.textAlign = 'center'; c.fillText('MIND', w / 2, 50); c.fillText('THE', w / 2, 74); c.fillText('RENT', w / 2, 98); });
      plane(g, 0.9, 1.2, t, -1.0, 2.5, -3.97);
    },
    flag(g) {
      const t = tex(160, 120, (c, w, h) => { c.fillStyle = '#ffffff'; c.fillRect(0, 0, w, h); c.font = '96px serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(flagOf(S.country), w / 2, h / 2 + 6); });
      plane(g, 1.1, 0.8, t, 2.4, 2.8, -3.97);
    },
    lights(g) {
      const geo = new THREE.SphereGeometry(0.05, 6, 4);
      const cols = ['#ffdf6b', '#ff8a8a', '#8ad8ff', '#ffffff'];
      for (let i = 0; i <= 28; i++) {
        const t = i / 28;
        const b = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: new THREE.Color(cols[i % 4]).multiplyScalar(1.6), toneMapped: false }));
        b.position.set(-3.9 + t * 7.8, 3.6 - Math.sin(t * Math.PI * 4) ** 2 * 0.25, -3.94);
        g.add(b);
      }
    },
    bookshelf(g) {
      box(g, 1.2, 2.2, 0.45, '#8a6a4a', 0.7, 0, -3.75);
      const cols = ['#c0392b', '#2f6fdb', '#26a269', '#f2b233', '#7a4fd6', '#1f2328'];
      for (let r = 0; r < 4; r++) for (let i = 0; i < 6; i++) box(g, 0.15, 0.36, 0.32, cols[(r + i) % 6], 0.22 + i * 0.19, 0.12 + r * 0.52, -3.62);
    },
    speaker(g) {
      box(g, 0.45, 0.9, 0.45, '#222222', 1.4, 0, 1.9);
      const cone = new THREE.Mesh(new THREE.CircleGeometry(0.15, 16), mat('#555555'));
      cone.position.set(1.17, 0.6, 1.9);
      cone.rotation.y = -Math.PI / 2;
      g.add(cone);
    },
    desk(g) {
      box(g, 1.7, 0.08, 0.8, '#e9e1d2', -1.0, 0.85, -3.45);
      for (const x of [-1.75, -0.25]) box(g, 0.08, 0.85, 0.7, '#9aa3ab', x, 0, -3.45);
      box(g, 0.7, 0.04, 0.5, '#c9ced3', -1.0, 0.93, -3.35);
      const screen = box(g, 0.7, 0.45, 0.03, mat('#2a3440', { emissive: '#6fb6ff', emissiveIntensity: 0.6 }), -1.0, 0.95, -3.6);
      screen.rotation.x = -0.15;
      box(g, 0.6, 0.08, 0.6, '#333333', -1.0, 0.5, -2.7);
      box(g, 0.6, 0.6, 0.08, '#333333', -1.0, 0.58, -2.42);
    },
  };


  // Things every home has: a door, a kitchen corner and a shower.
  function basics(g) {
    // Door on the back wall
    box(g, 0.95, 2.3, 0.08, '#6b4226', -2.8, 0, -3.97);
    box(g, 0.08, 0.08, 0.12, '#d4af37', -2.45, 1.1, -3.9);
    // Kitchen: worktop with hob, and a fridge
    box(g, 0.8, 0.95, 1.8, '#e8e4dc', 3.5, 0, 1.6);
    box(g, 0.84, 0.06, 1.84, '#5d5f63', 3.5, 0.95, 1.6);
    for (const z of [1.25, 1.85]) cyl(g, 0.17, 0.17, 0.02, '#111111', 3.5, 1.01, z, 20);
    box(g, 0.85, 2.0, 0.85, '#dfe3e6', 3.48, 0, 3.0);
    box(g, 0.04, 0.6, 0.06, '#9aa3ab', 3.04, 1.1, 2.75);
    // Shower cubicle
    box(g, 1.3, 0.08, 1.3, '#f4f6f7', -3.3, 0, 3.3);
    const glassM = new THREE.MeshPhysicalMaterial({ color: '#cfe8f5', transparent: true, opacity: 0.28, roughness: 0.05, transmission: 0 });
    for (const [w, d, x, z] of [[1.3, 0.04, -3.3, 2.66], [0.04, 1.3, -2.66, 3.3]]) {
      const pane = new THREE.Mesh(BOX, glassM);
      pane.scale.set(w, 2.1, d);
      pane.position.set(x, 1.13, z);
      g.add(pane);
    }
    cyl(g, 0.03, 0.03, 0.5, '#c0c6cc', -3.85, 1.9, 3.3, 6);
    cyl(g, 0.14, 0.1, 0.06, '#c0c6cc', -3.75, 2.3, 3.3, 12);
  }

  // Tappable spots. match picks this spot's actions from the home's action list.
  function hotspots() {
    const F = S.furniture || {};
    const list = [
      { key: 'bed', icon: '🛏️', name: F.bed ? 'Bed' : 'Mattress', pos: [2.5, 1.2, -2.4], match: /Sleep|Nap/ },
      { key: 'kitchen', icon: '🍳', name: 'Kitchen', pos: [3.5, 1.7, 2.2], match: /Cook/ },
      { key: 'shower', icon: '🚿', name: 'Shower', pos: [-3.3, 2.5, 3.3], match: /Shower/ },
      { key: 'me', icon: '📱', name: 'Your phone', pos: [0.1, 2.9, 0.9], match: F.tv ? /Call home|Group chat|Send £|QuickCash/ : /telly|Call home|Group chat|Send £|QuickCash/ },
      { key: 'door', icon: '🚪', name: 'Go outside', pos: [-2.8, 2.6, -3.9], go: true },
    ];
    if (F.tv) list.push({ key: 'tv', icon: '📺', name: 'Telly', pos: [1.4, 2.0, 0.6], match: /telly/ });
    if (F.sofa) list.push({ key: 'sofa', icon: '🛋️', name: 'Sofa', pos: [-3.3, 1.3, 0.6], match: /friends round/ });
    if (F.desk) list.push({ key: 'desk', icon: '💻', name: 'Desk', pos: [-1.0, 1.7, -3.4], match: /Study coding at home/ });
    return list;
  }

  function buildRoom() {
    if (room) scene.remove(room);
    room = new THREE.Group();
    const wall = WALL_COLOURS[S.wall || 0];
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(8, 8), new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.6 }));
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    room.add(floor);
    const wm = mat(wall, { roughness: 0.95 });
    const back = new THREE.Mesh(new THREE.BoxGeometry(8.2, 4, 0.2), wm);
    back.position.set(0, 2, -4.1);
    back.receiveShadow = true;
    const left = new THREE.Mesh(new THREE.BoxGeometry(0.2, 4, 8), wm);
    left.position.set(-4.1, 2, 0);
    left.receiveShadow = true;
    room.add(back, left);
    box(room, 8.2, 0.15, 0.06, '#ffffff', 0, 0, -3.98);
    box(room, 0.06, 0.15, 8, '#ffffff', -3.98, 0, 0);
    // A window onto London
    const sky = tex(128, 128, (c, w, h) => {
      const gr = c.createLinearGradient(0, 0, 0, h);
      gr.addColorStop(0, '#7fb6ee'); gr.addColorStop(1, '#d9ecfb');
      c.fillStyle = gr; c.fillRect(0, 0, w, h);
      c.fillStyle = '#8796a6';
      for (let i = 0; i < 9; i++) c.fillRect(i * 15, h - 30 - ((i * 37) % 40), 12, 60);
    });
    plane(room, 1.8, 1.6, sky, -3.99, 2.2, -0.2, Math.PI / 2, { emissive: '#ffffff', emissiveMap: sky, emissiveIntensity: 0.6 });
    box(room, 0.08, 0.1, 2.0, '#ffffff', -3.96, 1.35, -0.2);
    box(room, 0.08, 0.1, 2.0, '#ffffff', -3.96, 3.0, -0.2);
    box(room, 0.08, 1.75, 0.06, '#ffffff', -3.96, 1.35, -0.2);
    basics(room);
    const F = S.furniture || {};
    if (!F.bed) { box(room, 1.6, 0.25, 2.6, '#e8e3d8', 2.6, 0, -2.6); box(room, 1.0, 0.12, 0.45, '#ffffff', 2.6, 0.25, -3.6); }
    for (const k of Object.keys(FURNITURE)) if (F[k] && BUILD[k]) BUILD[k](room);
    me = Avatar.build(S.look, 'full');
    me.scale.setScalar(0.27);
    me.position.set(0.1, 1.03, 0.9);
    me.rotation.y = 0.5;
    me.traverse((o) => { if (o.isMesh) o.castShadow = true; });
    room.add(me);
    scene.add(room);
    builtKey = roomKey();
    drawHot();
  }
  const roomKey = () => JSON.stringify([S.furniture, S.wall, S.look, S.country]);

  function setup() {
    if (renderer) return;
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.domElement.className = 'room-canvas';
    scene = new THREE.Scene();
    scene.background = new THREE.Color('#dfe8d6');
    const pm = new THREE.PMREMGenerator(renderer);
    scene.environment = pm.fromScene(new FX.RoomEnvironment(), 0.04).texture;
    scene.environmentIntensity = 0.45;
    pm.dispose();
    scene.add(new THREE.HemisphereLight('#ffffff', '#c9b79a', 0.6));
    const sun = new THREE.DirectionalLight('#fff1dc', 2.2);
    sun.position.set(-8, 9, 3);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    Object.assign(sun.shadow.camera, { left: -7, right: 7, top: 7, bottom: -7 });
    sun.shadow.bias = -0.0005;
    scene.add(sun);
    camera = new THREE.PerspectiveCamera(36, 1, 0.1, 100);
    const el = renderer.domElement;
    let moved = 0;
    el.addEventListener('pointerdown', (e) => { drag = e.clientX; moved = 0; el.setPointerCapture(e.pointerId); });
    el.addEventListener('pointermove', (e) => { if (drag === null) return; moved += Math.abs(e.clientX - drag); angle = Math.max(0.15, Math.min(1.45, angle - (e.clientX - drag) * 0.006)); drag = e.clientX; });
    el.addEventListener('pointerup', () => { drag = null; if (moved < 6) { openHot = null; renderBar(); } });
    $('#room').prepend(el);
  }

  // Fit the room into the space between the top bar and the bottom panel.
  function frameCamera() {
    const el = renderer.domElement, W = window.innerWidth, H = window.innerHeight;
    if (el.width !== Math.round(W * renderer.getPixelRatio()) || el.height !== Math.round(H * renderer.getPixelRatio())) renderer.setSize(W, H, false);
    const dock = $('#dock');
    const top = 100, floorY = dock && dock.offsetParent ? dock.getBoundingClientRect().top - 6 : H;
    const regionH = Math.max(160, floorY - top), yc = top + regionH / 2;
    camera.aspect = W / H;
    camera.fov = W < H ? 46 : 36;
    const t = Math.tan((camera.fov * Math.PI) / 360);
    const r = Math.max(10, 12.5 / (2 * t * camera.aspect), 10.5 / (2 * t * (regionH / H)));
    camera.setViewOffset(W, H, 0, H / 2 - yc, W, H);
    camera.position.set(Math.sin(angle) * r, r * 0.62, Math.cos(angle) * r);
    camera.lookAt(-0.3, 0.9, -0.3);
    camera.updateProjectionMatrix();
  }

  const v3 = new THREE.Vector3();
  function placeHot() {
    const W = window.innerWidth, H = window.innerHeight;
    document.querySelectorAll('#roomHot .hot').forEach((b) => {
      const h = hotspots().find((x) => x.key === b.dataset.hot);
      if (!h) return;
      v3.set(...h.pos).project(camera);
      b.style.transform = `translate(${(v3.x * 0.5 + 0.5) * W}px, ${(-v3.y * 0.5 + 0.5) * H}px)`;
    });
  }
  function drawHot() {
    $('#roomHot').innerHTML = hotspots().map((h) => `<button class="hot ${openHot === h.key ? 'on' : ''}" data-hot="${h.key}" aria-label="${h.name}"><span>${h.icon}</span><small>${h.name}</small></button>`).join('');
    document.querySelectorAll('#roomHot .hot').forEach((b) => { b.onclick = () => tapHot(b.dataset.hot); });
  }
  function tapHot(key) {
    const h = hotspots().find((x) => x.key === key);
    if (!h) return;
    if (h.go) { openHot = null; return goOutside(); }
    openHot = openHot === key ? null : key;
    Coach.event('hot', key);
    renderBar();
    drawHot();
  }

  function loop() {
    if (!active) return;
    if (roomKey() !== builtKey) buildRoom();
    frameCamera();
    if (me) me.position.y = 1.03 + Math.abs(Math.sin(performance.now() / 600)) * 0.03;
    renderer.render(scene, camera);
    placeHot();
    raf = requestAnimationFrame(loop);
  }

  // The card for a tapped spot and the Go outside button, above the bottom panel.
  function renderBar() {
    const bar = $('#roomBar');
    if (!bar) return;
    if (!active || !S) { bar.innerHTML = ''; return; }
    const h = openHot && hotspots().find((x) => x.key === openHot);
    let card = '';
    if (h && h.match) {
      const acts = placeActions(S.home).map((a, i) => [a, i]).filter(([a]) => h.match.test(a.label));
      const extra = h.key === 'kitchen' ? `<p class="hint">🥫 ${S.groceries} meal${S.groceries === 1 ? '' : 's'} in the fridge${S.groceries ? '' : '. Buy groceries at a market'}.</p>` : '';
      card = `<div class="hot-card card" role="dialog" aria-label="${h.name}">
        <div class="hot-head"><b>${h.icon} ${h.name}</b><button class="link-btn" id="hotClose" aria-label="Close">✕</button></div>${extra}
        <div class="actions">${acts.map(([a, i]) => `<button class="act" data-hot-act="${i}" ${a.disabled ? 'disabled' : ''}>
          <span class="act-label">${esc(a.label)}</span><span class="act-meta">${fmtMins(a.mins)}${a.cost ? ' · ' + money(a.cost) : ''}</span>
          ${a.disabled ? `<span class="act-why">${esc(a.disabled)}</span>` : ''}</button>`).join('') || '<p class="hint">Nothing to do here right now.</p>'}</div></div>`;
    }
    bar.innerHTML = `${card}<button class="pill go-outside" id="goOutside">🚪 Go outside</button>`;
    $('#goOutside').onclick = () => { openHot = null; goOutside(); };
    if ($('#hotClose')) $('#hotClose').onclick = () => { openHot = null; renderBar(); drawHot(); };
    bar.querySelectorAll('[data-hot-act]').forEach((b) => {
      b.onclick = () => { const acts = placeActions(S.home); openHot = null; runAction(acts[+b.dataset.hotAct]); };
    });
  }

  // ------------------------------------------------------------ the shop

  function shopHTML() {
    const F = S.furniture || {};
    const owned = Coach.ownedOutfits();
    return `
      <div class="home-stats"><span>💷 ${money(S.money)}</span><span>🛋️ Comfort ${homeComfort()}</span></div>
      <p class="hint">Furniture is delivered to your home in ${esc(LOCATIONS[S.home].name)}. Comfort makes sleep and home time better, and some pieces unlock new things to do.</p>
      <h4>Furniture</h4>
      <div class="shop">${Object.entries(FURNITURE).map(([k, f]) => `
        <button class="shop-item ${F[k] ? 'owned' : ''}" data-buy="${k}" ${F[k] || f.price > S.money ? 'disabled' : ''}>
          <span class="shop-icon">${f.icon}</span>
          <span><b>${f.name}</b><small>${f.perk ? esc(f.perk) : `+${f.comfort} comfort`}</small></span>
          <span class="shop-price">${F[k] ? '✓ Yours' : money(f.price)}</span>
        </button>`).join('')}</div>
      <h4>Paint your walls (£25)</h4>
      <div class="swatches">${WALL_COLOURS.map((c, i) => `<button class="swatch ${S.wall === i ? 'on' : ''}" style="background:${c}" data-wall="${i}" aria-label="Wall colour ${i + 1}" ${S.wall !== i && S.money < 25 ? 'disabled' : ''}></button>`).join('')}</div>
      ${Coach.wardrobeHTML()}
      ${owned.length < REWARD_OUTFITS.length ? '' : ''}`;
  }
  function bindShop(root) {
    root.querySelectorAll('[data-buy]').forEach((b) => { b.onclick = () => buy(b.dataset.buy); });
    root.querySelectorAll('[data-wall]').forEach((b) => {
      b.onclick = () => {
        const i = +b.dataset.wall;
        if (i === S.wall || S.money < 25) return;
        S.money = round2(S.money - 25);
        S.stats.spent += 25;
        S.wall = i;
        log('🎨 Repainted your walls (£25).');
        save();
        render();
      };
    });
    Coach.bindWardrobe(root);
  }
  function buy(k) {
    const f = FURNITURE[k];
    if (!f || S.furniture[k] || S.money < f.price) return;
    S.money = round2(S.money - f.price);
    S.stats.spent += f.price;
    S.furniture[k] = true;
    log(`${f.icon} Bought ${f.name.toLowerCase()} for your home (${money(f.price)}).`);
    toast(`${f.icon} ${f.name} delivered to your home`);
    save();
    render();
  }

  return {
    setActive(on) {
      if (on === active) { if (on) renderBar(); return; }
      active = on;
      $('#room').classList.toggle('hidden', !on);
      if (on) {
        setup();
        buildRoom();
        cancelAnimationFrame(raf);
        loop();
      } else {
        cancelAnimationFrame(raf);
        openHot = null;
      }
      renderBar();
    },
    isActive: () => active,
    renderBar,
    tapHot,
    shopHTML,
    bindShop,
  };
})();
