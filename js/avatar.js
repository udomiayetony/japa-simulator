'use strict';
// Memoji-style 3D characters: big glossy heads, large eyes, soft shading.
// Original models built from simple shapes. Uses the global THREE (r128).

const Avatar = (() => {
  const PI = Math.PI;
  const mats = {};
  // Glossy, clear-coated materials give the soft Memoji sheen. `shininess` maps to
  // roughness; the second argument is kept from the older Phong-based version.
  function phong(color, shininess = 18, specular = 0, extra = {}) {
    const key = color + shininess + JSON.stringify(extra);
    if (!mats[key]) {
      const roughness = Math.max(0.12, Math.min(0.75, 0.78 - shininess / 160));
      mats[key] = new THREE.MeshPhysicalMaterial({
        color, roughness, metalness: 0,
        clearcoat: shininess >= 60 ? 1 : 0.45, clearcoatRoughness: shininess >= 60 ? 0.05 : 0.35,
        sheen: 0.06, sheenRoughness: 0.7, sheenColor: '#ffffff',
        ...extra,
      });
    }
    return mats[key];
  }
  const geos = {};
  function sphere(r, w = 32, h = 24, ps, pl, ts, tl) {
    const key = [r, w, h, ps, pl, ts, tl].join();
    if (!geos[key]) geos[key] = new THREE.SphereGeometry(r, w, h, ps, pl, ts, tl);
    return geos[key];
  }
  function add(g, geo, m, x = 0, y = 0, z = 0, sx = 1, sy = 1, sz = 1) {
    const o = new THREE.Mesh(geo, m);
    o.position.set(x, y, z);
    o.scale.set(sx, sy, sz);
    g.add(o);
    return o;
  }
  // A slice of a sphere around the head. `gap` (radians) leaves the face open.
  function shell(g, r, m, t0, tl, gap = 0, sx = 1, sy = 1, sz = 1, y = 0, z = 0) {
    const geo = sphere(r, 40, 28, PI / 2 + gap / 2, 2 * PI - gap, t0, tl);
    return add(g, geo, m, 0, y, z, sx, sy, sz);
  }
  const darken = (hex, f) => '#' + new THREE.Color(hex).multiplyScalar(f).getHexString();

  // Turn any stored look (old saves included) into a complete one.
  function normalize(look = {}) {
    const pickIdx = (v, arr, d) => (typeof v === 'number' && v >= 0 && v < arr.length ? v : d);
    const pickName = (v, arr, d) => (arr.includes(v) ? v : typeof v === 'number' && arr[v] ? arr[v] : d);
    return {
      skin: pickIdx(look.skin, SKIN, 5),
      hair: pickName(look.hair, HAIR, 'afro'),
      hairColour: pickIdx(look.hairColour, HAIR_COLOURS, 0),
      outfit: pickIdx(look.outfit, OUTFITS, 0),
      head: pickName(look.head, HEADWEAR, 'none'),
      hatColour: pickIdx(look.hatColour, HAT_COLOURS, 0),
      eyewear: pickName(look.eyewear, EYEWEAR, 'none'),
      facial: pickName(look.facial, FACIAL, 'none'),
      earrings: pickName(look.earrings, EARRINGS, 'none'),
    };
  }

  // ------------------------------------------------------------ head parts

  function face(g, L) {
    const skinHex = SKIN[L.skin];
    const skin = phong(skinHex, 16, 0x1e1e1e);
    add(g, sphere(1), skin, 0, 0, 0, 1, 1.06, 0.97);
    for (const s of [-1, 1]) {
      add(g, sphere(0.23, 16, 12), skin, s * 0.97, -0.05, -0.02, 0.62, 1, 0.65);
      add(g, sphere(0.12, 12, 10), phong(darken(skinHex, 0.85)), s * 1.0, -0.05, 0.03, 0.4, 0.7, 0.4);
    }
    add(g, sphere(0.14, 18, 14), phong(darken(skinHex, 0.95), 20, 0x222222), 0, -0.1, 0.95, 1.05, 0.82, 0.8);
    // Cheeks
    const blush = phong('#ff7b8a', 5, 0x000000, { transparent: true, opacity: 0.22, depthWrite: false });
    for (const s of [-1, 1]) add(g, sphere(0.2, 16, 12), blush, s * 0.56, -0.2, 0.74, 1, 0.7, 0.5);
    // Eyes: white, iris, pupil and two highlights
    const white = phong('#ffffff', 90, 0x666666);
    const iris = phong('#4a2c17', 70, 0x555555);
    const pupil = phong('#090909', 100, 0x777777);
    const glint = new THREE.MeshBasicMaterial({ color: '#ffffff' });
    for (const s of [-1, 1]) {
      add(g, sphere(0.235, 28, 20), white, s * 0.35, 0.08, 0.78, 1, 1.15, 0.58);
      add(g, sphere(0.15, 24, 16), iris, s * 0.35, 0.06, 0.885, 1, 1.12, 0.5);
      add(g, sphere(0.078, 16, 12), pupil, s * 0.35, 0.06, 0.945, 1, 1.12, 0.4);
      add(g, sphere(0.042, 10, 8), glint, s * 0.35 + 0.06, 0.14, 0.98);
      add(g, sphere(0.02, 8, 6), glint, s * 0.35 - 0.05, 0.0, 0.975);
      // Upper lid line gives the friendly Memoji look
      const lid = add(g, new THREE.TorusGeometry(0.23, 0.024, 8, 24, PI * 0.9), phong(darken(skinHex, 0.55)), s * 0.35, 0.08, 0.86, 1, 1.12, 1);
      lid.rotation.z = PI * 0.05;
      // Brows
      const browCol = L.hair === 'bald' ? darken(skinHex, 0.5) : darken(HAIR_COLOURS[L.hairColour], 0.85);
      const brow = add(g, new THREE.TorusGeometry(0.17, 0.038, 8, 18, PI * 0.7), phong(browCol, 10), s * 0.35, 0.36, 0.88, 1, 0.75, 1);
      brow.rotation.z = PI / 2 - PI * 0.35 + s * -0.05;
    }
    // Open grin with teeth
    const mouth = add(g, new THREE.CircleGeometry(0.27, 28, PI, PI), phong('#7a1f2b', 30), 0, -0.34, 0.92, 1, 0.85, 1);
    mouth.rotation.x = -0.25;
    const teeth = add(g, new THREE.BoxGeometry(0.44, 0.075, 0.02), phong('#ffffff', 60, 0x444444), 0, -0.37, 0.935);
    teeth.rotation.x = -0.25;
    add(g, sphere(0.09, 14, 10), phong('#e0606e', 20), 0, -0.48, 0.89, 1.4, 0.5, 0.6);
    const lip = add(g, new THREE.TorusGeometry(0.27, 0.026, 8, 24, PI), phong(darken(skinHex, 0.75)), 0, -0.34, 0.92, 1, 0.85, 1);
    lip.rotation.set(-0.25, 0, PI);
  }

  function hair(g, L, hatOn) {
    const m = phong(HAIR_COLOURS[L.hairColour], 34, 0x3a3a3a, { side: THREE.DoubleSide });
    const cap = () => !hatOn && shell(g, 1.05, m, 0, PI * 0.31, 0, 1, 1.08, 1, 0.02);
    const sides = (end = PI * 0.52, gap = 2.1) => shell(g, 1.06, m, PI * 0.3, end - PI * 0.3, gap, 1, 1.08, 1, 0.02);
    const strands = (n, r, len, spread = 0.8) => {
      for (let i = 0; i < n; i++) {
        const a = PI * (0.5 + spread * (i / (n - 1) - 0.5)) + PI;
        const x = Math.cos(a) * 0.98, z = Math.sin(a) * 0.98 - 0.05;
        const l = len * (0.85 + ((i * 37) % 10) / 50);
        const c = add(g, new THREE.CylinderGeometry(r, r * 0.8, l, 10), m, x, 0.35 - l / 2, z);
        c.rotation.z = -x * 0.08;
      }
    };
    switch (L.hair) {
      case 'short': cap(); sides(PI * 0.5); break;
      case 'fade': cap(); shell(g, 1.035, m, PI * 0.3, PI * 0.18, 2.2, 1, 1.07, 1, 0.01); break;
      case 'afro': if (!hatOn) add(g, sphere(1.3, 32, 24), m, 0, 0.45, -0.42, 1.1, 1, 1); else sides(PI * 0.55); break;
      case 'puffs': cap(); sides(PI * 0.48); if (!hatOn) for (const s of [-1, 1]) add(g, sphere(0.5, 24, 18), m, s * 0.66, 0.92, -0.15); break;
      case 'braids': cap(); sides(PI * 0.55); strands(14, 0.06, 1.9, 1.1); break;
      case 'locs': cap(); sides(PI * 0.55); strands(12, 0.09, 1.7, 1.15); break;
      case 'bob': cap(); shell(g, 1.16, m, PI * 0.26, PI * 0.38, 1.7, 1.06, 1.12, 1.02, 0.02); break;
      case 'long': cap(); shell(g, 1.16, m, PI * 0.26, PI * 0.52, 1.7, 1.08, 1.6, 1.05, -0.3); shell(g, 1.1, m, PI * 0.3, PI * 0.45, 3.4, 1.05, 1.55, 1.0, -0.32); break;
      case 'curly':
        if (!hatOn) for (let i = 0; i < 46; i++) {
          const t = (i / 46) * PI * 0.55, p = i * 2.4;
          const x = Math.sin(t) * Math.cos(p), y = Math.cos(t), z = Math.sin(t) * Math.sin(p);
          if (z > 0.55 && y < 0.75) continue; // keep the face clear
          add(g, sphere(0.3, 14, 10), m, x * 1.05, y * 1.08 + 0.05, z * 1.0);
        }
        sides(PI * 0.6);
        break;
      case 'bun': cap(); sides(PI * 0.5); if (!hatOn) add(g, sphere(0.4, 24, 18), m, 0, 1.15, -0.25); break;
      case 'mohawk':
        if (!hatOn) for (let i = 0; i < 6; i++) {
          const t = -0.35 + i * 0.28;
          const c = add(g, new THREE.ConeGeometry(0.16, 0.55, 12), m, 0, Math.cos(t) * 1.15, Math.sin(t) * 1.15);
          c.rotation.x = t;
        }
        shell(g, 1.02, phong(HAIR_COLOURS[L.hairColour], 5, 0x000000, { transparent: true, opacity: 0.35 }), 0, PI * 0.45, 1.6, 1, 1.07, 1);
        break;
      default: break;
    }
  }

  function headwear(g, L) {
    if (L.head === 'none') return;
    const col = HAT_COLOURS[L.hatColour];
    const m = phong(col, 24, 0x2a2a2a);
    const dark = phong(darken(col, 0.78), 24, 0x2a2a2a);
    switch (L.head) {
      case 'beanie': {
        shell(g, 1.1, m, 0, PI * 0.42, 0, 1, 1.1, 1, 0.05);
        const cuff = add(g, new THREE.TorusGeometry(1.03, 0.15, 12, 40), dark, 0, 0.36, 0, 1, 1, 1);
        cuff.rotation.x = PI / 2;
        add(g, sphere(0.22, 16, 12), m, 0, 1.25, 0);
        break;
      }
      case 'cap': {
        shell(g, 1.08, m, 0, PI * 0.4, 0, 1, 1.08, 1, 0.05);
        const brim = add(g, new THREE.CylinderGeometry(0.72, 0.72, 0.06, 28), dark, 0, 0.42, 0.98, 1, 1, 1.35);
        brim.rotation.x = 0.18;
        add(g, sphere(0.08, 10, 8), dark, 0, 1.2, 0);
        break;
      }
      case 'bucket': {
        shell(g, 1.12, m, 0, PI * 0.42, 0, 1, 1.08, 1, 0.08);
        const brim = add(g, new THREE.CylinderGeometry(1.25, 1.6, 0.25, 36, 1, true), dark, 0, 0.36, 0);
        brim.material = phong(darken(col, 0.78), 24, 0x2a2a2a, { side: THREE.DoubleSide });
        brim.rotation.x = 0.08;
        break;
      }
      case 'beret': {
        const b = add(g, sphere(1.16, 32, 20), m, 0.15, 0.78, -0.08, 1.12, 0.42, 1.1);
        b.rotation.z = -0.22;
        add(g, sphere(0.07, 10, 8), dark, 0.05, 1.27, 0);
        break;
      }
      case 'gele': {
        shell(g, 1.1, m, 0, PI * 0.47, 0, 1, 1.12, 1, 0.04);
        for (let i = 0; i < 6; i++) {
          const a = -1.0 + i * 0.4;
          const f = add(g, sphere(0.62, 24, 16), i % 2 ? dark : m, Math.sin(a) * 0.55, 1.15 + Math.cos(a) * 0.15, -0.2 + Math.cos(a * 1.4) * 0.15, 1.15, 0.6, 0.32);
          f.rotation.set(0.25, a * 0.6, -a * 0.9);
        }
        add(g, sphere(0.28, 18, 12), dark, 0.62, 0.62, 0.55);
        break;
      }
      case 'hijab': {
        const hm = phong(col, 18, 0x222222, { side: THREE.DoubleSide });
        shell(g, 1.14, hm, 0, PI * 0.8, 2.25, 1, 1.1, 1.03, -0.02);
        add(g, new THREE.CylinderGeometry(0.85, 1.35, 1.25, 32, 1, true), hm, 0, -1.25, -0.05);
        break;
      }
      case 'turban': {
        shell(g, 1.1, m, 0, PI * 0.45, 0, 1, 1.1, 1, 0.04);
        [[1.0, 0.42], [0.86, 0.78], [0.62, 1.06]].forEach(([r, y], i) => {
          const t = add(g, new THREE.TorusGeometry(r, 0.24, 14, 36), i % 2 ? dark : m, 0, y, -0.04);
          t.rotation.set(PI / 2 + 0.12, 0, 0.05 * (i - 1));
        });
        break;
      }
      default: break;
    }
  }

  function eyewear(g, L) {
    if (L.eyewear === 'none') return;
    const frame = phong(L.eyewear === 'round' ? '#2a2a2a' : '#151515', 80, 0x777777);
    for (const s of [-1, 1]) {
      if (L.eyewear === 'round') {
        add(g, new THREE.TorusGeometry(0.26, 0.034, 10, 32), frame, s * 0.35, 0.07, 1.0);
      } else if (L.eyewear === 'square') {
        const t = add(g, new THREE.TorusGeometry(0.3, 0.045, 8, 4), frame, s * 0.36, 0.07, 1.0, 1, 0.78, 1);
        t.rotation.z = PI / 4;
      } else {
        add(g, sphere(0.26, 24, 16), phong('#0d0d0d', 120, 0xaaaaaa), s * 0.36, 0.07, 0.99, 1.05, 0.8, 0.3);
      }
    }
    add(g, new THREE.BoxGeometry(0.2, 0.035, 0.035), frame, 0, 0.13, 1.03);
  }

  function facialHair(g, L) {
    if (L.facial === 'none') return;
    const col = HAIR_COLOURS[L.hairColour];
    const m = phong(col, 20, 0x2a2a2a);
    if (L.facial === 'beard') {
      shell(g, 1.035, m, PI * 0.66, PI * 0.34, 0, 1.03, 1.08, 1.02);
      shell(g, 1.04, m, PI * 0.5, PI * 0.18, 2.6, 1.03, 1.07, 1);
      add(g, new THREE.TorusGeometry(0.2, 0.06, 10, 20, PI), m, 0, -0.21, 0.93);
    } else if (L.facial === 'stubble') {
      shell(g, 1.012, phong(col, 5, 0x000000, { transparent: true, opacity: 0.35, depthWrite: false }), PI * 0.66, PI * 0.34, 0, 1, 1.065, 0.985);
    } else if (L.facial === 'goatee') {
      add(g, sphere(0.2, 16, 12), m, 0, -0.78, 0.68, 1, 1.15, 0.7);
      add(g, new THREE.TorusGeometry(0.2, 0.05, 10, 20, PI), m, 0, -0.21, 0.93);
    } else if (L.facial === 'moustache') {
      add(g, new THREE.TorusGeometry(0.21, 0.065, 10, 20, PI), m, 0, -0.21, 0.93);
    }
  }

  function earrings(g, L) {
    if (L.earrings === 'none') return;
    const gold = phong('#e7b84a', 120, 0xffe9a8);
    for (const s of [-1, 1]) {
      if (L.earrings === 'studs') add(g, sphere(0.06, 12, 10), gold, s * 1.0, -0.27, 0.05);
      else { const h = add(g, new THREE.TorusGeometry(0.13, 0.022, 8, 24), gold, s * 1.02, -0.42, 0.05); h.rotation.y = PI / 2; }
    }
  }

  function buildHead(L) {
    const g = new THREE.Group();
    const hatOn = ['beanie', 'cap', 'bucket', 'beret', 'gele', 'hijab', 'turban'].includes(L.head);
    face(g, L);
    if (L.head !== 'hijab' && L.head !== 'turban') hair(g, L, hatOn);
    headwear(g, L);
    eyewear(g, L);
    facialHair(g, L);
    if (L.head !== 'hijab') earrings(g, L);
    return g;
  }

  // ------------------------------------------------------------ body

  function buildBody(L) {
    const g = new THREE.Group();
    const skin = phong(SKIN[L.skin], 16, 0x1e1e1e);
    const top = phong(OUTFITS[L.outfit], 22, 0x222222);
    const legsM = phong('#2b3a55', 18, 0x1a1a1a);
    const shoe = phong('#f4f4f4', 40, 0x444444);
    add(g, new THREE.CylinderGeometry(0.3, 0.34, 0.4, 20), skin, 0, -1.08, -0.05);
    const torso = new THREE.LatheGeometry([
      new THREE.Vector2(0, -2.62), new THREE.Vector2(0.92, -2.58), new THREE.Vector2(1.05, -2.25),
      new THREE.Vector2(1.04, -1.65), new THREE.Vector2(0.92, -1.3), new THREE.Vector2(0.5, -1.16), new THREE.Vector2(0, -1.13),
    ], 32);
    add(g, torso, top, 0, 0, -0.05, 1, 1, 0.78);
    // Arms and legs hang from pivots at the shoulder and hip so they can swing when walking.
    for (const s of [-1, 1]) {
      const shoulder = new THREE.Group();
      shoulder.position.set(s * 1.0, -1.38, -0.05);
      shoulder.rotation.z = s * 0.14;
      shoulder.userData.limb = { kind: 'arm', side: s };
      add(shoulder, new THREE.CylinderGeometry(0.22, 0.2, 1.15, 16), top, 0, -0.575, 0);
      add(shoulder, sphere(0.21, 16, 12), skin, 0, -1.22, 0.03);
      g.add(shoulder);
      const hip = new THREE.Group();
      hip.position.set(s * 0.42, -2.6, -0.05);
      hip.userData.limb = { kind: 'leg', side: s };
      add(hip, new THREE.CylinderGeometry(0.29, 0.26, 1.0, 16), legsM, 0, -0.5, 0);
      add(hip, sphere(0.3, 16, 12), shoe, 0, -1.02, 0.13, 1.05, 0.62, 1.5);
      g.add(hip);
    }
    return g;
  }

  function build(look, mode = 'full') {
    const L = normalize(look);
    const g = new THREE.Group();
    g.add(buildHead(L));
    if (mode === 'full') g.add(buildBody(L));
    return g;
  }

  // ------------------------------------------------------------ portraits

  let pr = null;
  const cache = new Map();
  function portraitRig() {
    if (pr) return pr;
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    renderer.setPixelRatio(1);
    renderer.setSize(360, 360, false);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    const scene = new THREE.Scene();
    // Studio lighting: soft environment, a warm key light and a cool rim light.
    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new FX.RoomEnvironment(), 0.04).texture;
    scene.environmentIntensity = 0.55;
    scene.add(new THREE.HemisphereLight('#ffffff', '#9a8f86', 0.9));
    const key = new THREE.DirectionalLight('#fff4e8', 2.4); key.position.set(-2.5, 3, 5); scene.add(key);
    const rim = new THREE.DirectionalLight('#dfe8ff', 1.6); rim.position.set(3, 2, -3); scene.add(rim);
    const cam = new THREE.PerspectiveCamera(28, 1, 0.1, 50);
    pr = { renderer, scene, cam };
    return pr;
  }

  // Head-and-shoulders picture of a look, as a data URL (cached).
  function portrait(look) {
    const L = normalize(look);
    const key = JSON.stringify(L);
    if (cache.has(key)) return cache.get(key);
    let url = '';
    try {
      const { renderer, scene, cam } = portraitRig();
      const model = build(L, 'full');
      model.rotation.y = -0.18;
      scene.add(model);
      cam.position.set(0, 0.05, 7.4);
      cam.lookAt(0, -0.35, 0);
      renderer.render(scene, cam);
      url = renderer.domElement.toDataURL('image/png');
      scene.remove(model);
    } catch (e) {
      url = '';
    }
    cache.set(key, url);
    return url;
  }

  return { build, portrait, normalize };
})();
