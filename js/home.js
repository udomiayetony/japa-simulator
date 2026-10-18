'use strict';
// Your home: a small 3D room you furnish and paint. Furniture adds comfort, which makes
// sleep and home time better, and some pieces unlock new things to do at home.

const Home = (() => {
  let renderer = null, scene, camera, room = null, raf = 0;
  let angle = 0.75, drag = null;
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

  // ------------------------------------------------------------ furniture models

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
      cyl(g, 0.28, 0.22, 0.5, '#c46a45', -3.4, 0, -3.4);
      for (let i = 0; i < 6; i++) {
        const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.3, 8, 6), mat('#3f9b4a'));
        leaf.scale.set(0.6, 1.4, 0.6);
        leaf.position.set(-3.4 + Math.cos(i) * 0.2, 0.9 + (i % 3) * 0.15, -3.4 + Math.sin(i) * 0.2);
        leaf.rotation.z = Math.cos(i * 2) * 0.5;
        leaf.castShadow = true;
        g.add(leaf);
      }
    },
    lamp(g) {
      cyl(g, 0.25, 0.3, 0.06, '#333333', -3.3, 0, 2.9);
      cyl(g, 0.04, 0.04, 1.9, '#333333', -3.3, 0.06, 2.9, 6);
      cyl(g, 0.22, 0.38, 0.4, mat('#fff3d1', { emissive: '#ffd27a', emissiveIntensity: 0.9 }), -3.3, 1.9, 2.9);
      const l = new THREE.PointLight('#ffd9a0', 6, 6);
      l.position.set(-3.1, 2, 2.7);
      g.add(l);
    },
    poster(g) {
      const t = tex(96, 128, (c, w, h) => { c.fillStyle = '#ffd400'; c.fillRect(0, 0, w, h); c.fillStyle = '#111'; c.font = '800 20px sans-serif'; c.textAlign = 'center'; c.fillText('MIND', w / 2, 50); c.fillText('THE', w / 2, 74); c.fillText('RENT', w / 2, 98); });
      plane(g, 0.9, 1.2, t, -1.6, 2.4, -3.97);
    },
    flag(g) {
      const t = tex(160, 120, (c, w, h) => { c.fillStyle = '#ffffff'; c.fillRect(0, 0, w, h); c.font = '96px serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(flagOf(S.country), w / 2, h / 2 + 6); });
      plane(g, 1.1, 0.8, t, 0.2, 2.6, -3.97);
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
      box(g, 0.45, 2.2, 1.4, '#8a6a4a', -3.75, 0, -1.6);
      const cols = ['#c0392b', '#2f6fdb', '#26a269', '#f2b233', '#7a4fd6', '#1f2328'];
      for (let r = 0; r < 4; r++) for (let i = 0; i < 6; i++) box(g, 0.32, 0.36, 0.15, cols[(r + i) % 6], -3.65, 0.12 + r * 0.52, -2.15 + i * 0.2);
    },
    speaker(g) {
      box(g, 0.45, 0.9, 0.45, '#222222', 1.4, 0, 1.9);
      const cone = new THREE.Mesh(new THREE.CircleGeometry(0.15, 16), mat('#555555'));
      cone.position.set(1.17, 0.6, 1.9);
      cone.rotation.y = -Math.PI / 2;
      g.add(cone);
    },
    desk(g) {
      box(g, 1.8, 0.08, 0.8, '#e9e1d2', -1.6, 0.85, -3.45);
      for (const x of [-2.4, -0.8]) box(g, 0.08, 0.85, 0.7, '#9aa3ab', x, 0, -3.45);
      box(g, 0.7, 0.04, 0.5, '#c9ced3', -1.6, 0.93, -3.35);
      const screen = box(g, 0.7, 0.45, 0.03, mat('#2a3440', { emissive: '#6fb6ff', emissiveIntensity: 0.6 }), -1.6, 0.95, -3.6);
      screen.rotation.x = -0.15;
      box(g, 0.6, 0.08, 0.6, '#333333', -1.6, 0.5, -2.7);
      box(g, 0.6, 0.6, 0.08, '#333333', -1.6, 0.58, -2.42);
    },
  };

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
    const F = S.furniture || {};
    if (!F.bed) { box(room, 1.6, 0.25, 2.6, '#e8e3d8', 2.6, 0, -2.6); box(room, 1.0, 0.12, 0.45, '#ffffff', 2.6, 0.25, -3.6); }
    for (const k of Object.keys(FURNITURE)) if (F[k] && BUILD[k]) BUILD[k](room);
    const me = Avatar.build(S.look, 'full');
    me.scale.setScalar(0.27);
    me.position.set(0.1, 1.03, 0.9);
    me.rotation.y = 0.5;
    me.traverse((o) => { if (o.isMesh) o.castShadow = true; });
    room.add(me);
    scene.add(room);
  }

  function setup(canvasBox) {
    if (!renderer) {
      renderer = new THREE.WebGLRenderer({ antialias: true });
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      scene = new THREE.Scene();
      scene.background = new THREE.Color('#e9efe4');
      const pm = new THREE.PMREMGenerator(renderer);
      scene.environment = pm.fromScene(new FX.RoomEnvironment(), 0.04).texture;
      scene.environmentIntensity = 0.45;
      pm.dispose();
      scene.add(new THREE.HemisphereLight('#ffffff', '#c9b79a', 0.6));
      const sun = new THREE.DirectionalLight('#fff1dc', 2.2);
      sun.position.set(-8, 9, 3);
      sun.castShadow = true;
      sun.shadow.mapSize.set(1024, 1024);
      Object.assign(sun.shadow.camera, { left: -6, right: 6, top: 6, bottom: -6 });
      sun.shadow.bias = -0.0005;
      scene.add(sun);
      camera = new THREE.PerspectiveCamera(36, 1, 0.1, 100);
      const el = renderer.domElement;
      el.addEventListener('pointerdown', (e) => { drag = e.clientX; el.setPointerCapture(e.pointerId); });
      el.addEventListener('pointermove', (e) => { if (drag === null) return; angle = Math.max(0.15, Math.min(1.45, angle - (e.clientX - drag) * 0.006)); drag = e.clientX; });
      el.addEventListener('pointerup', () => { drag = null; });
    }
    canvasBox.appendChild(renderer.domElement);
  }
  function loop() {
    const el = renderer.domElement.parentElement;
    if (!el) return;
    const w = el.clientWidth, h = el.clientHeight;
    if (renderer.domElement.width !== Math.round(w * renderer.getPixelRatio())) { renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); }
    const r = 13.5;
    camera.position.set(Math.sin(angle) * r, 8.2, Math.cos(angle) * r);
    camera.lookAt(-0.6, 1.1, -0.6);
    renderer.render(scene, camera);
    raf = requestAnimationFrame(loop);
  }

  // ------------------------------------------------------------ the decorate screen

  function panel() {
    const F = S.furniture || {};
    const comfort = homeComfort();
    $('#homePanel').innerHTML = `
      <div class="home-stats"><span>💷 ${money(S.money)}</span><span>🛋️ Comfort ${comfort}</span></div>
      <p class="hint">Comfort makes sleep and home time better. Some pieces unlock new things to do at home.</p>
      <h4>Walls (£25 to repaint)</h4>
      <div class="swatches">${WALL_COLOURS.map((c, i) => `<button class="swatch ${S.wall === i ? 'on' : ''}" style="background:${c}" data-wall="${i}" aria-label="Wall colour ${i + 1}" ${S.wall !== i && S.money < 25 ? 'disabled' : ''}></button>`).join('')}</div>
      <h4>Furniture</h4>
      <div class="shop">${Object.entries(FURNITURE).map(([k, f]) => `
        <button class="shop-item ${F[k] ? 'owned' : ''}" data-buy="${k}" ${F[k] || f.price > S.money ? 'disabled' : ''}>
          <span class="shop-icon">${f.icon}</span>
          <span><b>${f.name}</b><small>${f.perk ? esc(f.perk) : `+${f.comfort} comfort`}</small></span>
          <span class="shop-price">${F[k] ? '✓ Yours' : money(f.price)}</span>
        </button>`).join('')}</div>`;
    document.querySelectorAll('[data-buy]').forEach((b) => { b.onclick = () => buy(b.dataset.buy); });
    document.querySelectorAll('[data-wall]').forEach((b) => {
      b.onclick = () => {
        const i = +b.dataset.wall;
        if (i === S.wall || S.money < 25) return;
        S.money = round2(S.money - 25);
        S.stats.spent += 25;
        S.wall = i;
        log('🎨 Repainted your walls (£25).');
        save();
        buildRoom();
        panel();
      };
    });
  }
  function buy(k) {
    const f = FURNITURE[k];
    if (!f || S.furniture[k] || S.money < f.price) return;
    S.money = round2(S.money - f.price);
    S.stats.spent += f.price;
    S.furniture[k] = true;
    log(`${f.icon} Bought ${f.name.toLowerCase()} for your home (${money(f.price)}).`);
    toast(`${f.icon} ${f.name} added to your home`);
    save();
    buildRoom();
    panel();
  }

  return {
    open() {
      if (!S || S.loc !== S.home) return;
      const el = $('#home');
      el.innerHTML = `
        <div class="home-card">
          <header class="home-head"><div><p class="eyebrow">Your home</p><h2>${esc(LOCATIONS[S.home].name)}</h2></div>
            <button class="pill icon" id="homeClose" aria-label="Close">✕</button></header>
          <div class="home-body"><div class="home-view" id="homeView" aria-label="Your room in 3D. Drag to look around."></div><div class="home-panel" id="homePanel"></div></div>
        </div>`;
      el.classList.remove('hidden');
      World.setPaused(true);
      setup($('#homeView'));
      buildRoom();
      panel();
      $('#homeClose').onclick = Home.close;
      $('#homeClose').focus();
      cancelAnimationFrame(raf);
      loop();
    },
    close() {
      cancelAnimationFrame(raf);
      $('#home').classList.add('hidden');
      World.setPaused(false);
      render();
    },
    isOpen: () => !$('#home').classList.contains('hidden'),
  };
})();
