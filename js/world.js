'use strict';
// The 3D low-poly London: real-coordinate Thames, parks, monuments, districts,
// traffic, billboards and the player. Uses the global THREE (r128).

const World = (() => {
  const SCALE = 1.6; // map units per world unit (map is 28 units per km, so ~17.5 world units per km)
  const wx = (x) => (x - 500) / SCALE;
  const wz = (y) => (y - 310) / SCALE;
  const at = (lat, lon) => { const p = geo(lat, lon); return [wx(p.x), wz(p.y)]; };
  // Local size factor so things in squeezed outer London shrink a little too.
  const kAt = (lat, lon) => geoScale(Math.hypot((lon - GEO_CENTER[1]) * 69.4, (GEO_CENTER[0] - lat) * 111.2));
  const KM = PX_PER_KM / SCALE;
  const PITCH = 0.98;
  const FOV = 34;

  let renderer, scene, camera, root, pinLayer;
  let hemi, sun, rain = null, rainOn = false;
  let composer = null, bloomPass = null, quality = 'high', nightLevel = 0;
  const clouds = [];
  const others = new Map(); // other live players: id -> { sprite, key, loc }
  const nightMats = [];
  const target = new THREE.Vector3(0, 0, 0);
  let dist = 110, goalTarget = null, goalDist = null;
  let attract = false, attractT = 0;
  const pins = {};
  const monPins = [];
  const plots = [];
  const heights = {};
  const spinners = [];
  let onSelect = () => {};
  let avatar = null, avatarAnim = null, avatarLoc = null;
  const vehicles = [];
  const boats = [];
  let lastTime = performance.now();
  const ray = new THREE.Raycaster();
  const occupied = []; // [x, z, r] circles kept free of filler

  // ------------------------------------------------------------ materials & helpers

  const mats = {};
  function mat(color, opts = {}) {
    const key = color + JSON.stringify(opts);
    if (!mats[key]) mats[key] = new THREE.MeshStandardMaterial({ color, roughness: 0.82, metalness: 0, ...opts });
    return mats[key];
  }
  // Reflective glass for the skyscrapers.
  const glass = (color) => mat(color, { roughness: 0.08, metalness: 0.7 });
  const WATER = () => mat('#3a8fd6', { roughness: 0.06, metalness: 0.3 });
  function canvasTex(w, h, draw) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    draw(c.getContext('2d'), w, h);
    const t = new THREE.CanvasTexture(c);
    t.anisotropy = 4;
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }
  const windowTex = canvasTex(64, 64, (g) => {
    g.fillStyle = '#ffffff'; g.fillRect(0, 0, 64, 64);
    g.fillStyle = '#56657a'; g.fillRect(12, 10, 40, 34);
    g.fillStyle = '#8fa3bd'; g.fillRect(12, 10, 18, 34);
  });
  windowTex.wrapS = windowTex.wrapT = THREE.RepeatWrapping;
  // Night lights: a 4x4 block of windows with some lit, used as an emissive map.
  const litTex = canvasTex(64, 64, (g) => {
    g.fillStyle = '#000000'; g.fillRect(0, 0, 64, 64);
    let seed = 5;
    for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) {
      seed = (seed * 16807) % 2147483647;
      if (seed % 10 < 5) { g.fillStyle = seed % 3 ? '#ffd27a' : '#fff1c9'; g.fillRect(i * 16 + 3, j * 16 + 2, 10, 9); }
    }
  });
  litTex.wrapS = litTex.wrapT = THREE.RepeatWrapping;
  const winMats = {};
  function winMat(color, rx, ry) {
    const key = `${color}|${rx}|${ry}`;
    if (!winMats[key]) {
      const t = windowTex.clone();
      t.needsUpdate = true;
      t.repeat.set(rx, ry);
      const e = litTex.clone();
      e.needsUpdate = true;
      e.repeat.set(rx / 4, ry / 4);
      winMats[key] = new THREE.MeshStandardMaterial({ color, map: t, roughness: 0.7, metalness: 0.05, emissive: '#ffc46b', emissiveMap: e, emissiveIntensity: 0 });
      nightMats.push(winMats[key]);
    }
    return winMats[key];
  }
  const BOX = new THREE.BoxGeometry(1, 1, 1);
  function box(parent, w, h, d, color, x = 0, y = 0, z = 0) {
    const m = new THREE.Mesh(BOX, typeof color === 'string' ? mat(color) : color);
    m.scale.set(w, h, d);
    m.position.set(x, y + h / 2, z);
    if (h <= 0.15) m.userData.flat = true;
    parent.add(m);
    return m;
  }
  function building(parent, w, h, d, color, x = 0, z = 0, roof = '#d9d6cf') {
    const side = winMat(color, Math.max(1, Math.round(w / 0.9)), Math.max(1, Math.round(h / 0.9)));
    const sideD = winMat(color, Math.max(1, Math.round(d / 0.9)), Math.max(1, Math.round(h / 0.9)));
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), [sideD, sideD, mat(roof), mat(roof), side, side]);
    m.position.set(x, h / 2, z);
    parent.add(m);
    box(parent, w + 0.12, 0.14, d + 0.12, roof, x, h, z);
    return m;
  }
  function cyl(parent, rt, rb, h, color, x = 0, y = 0, z = 0, seg = 10) {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), typeof color === 'string' ? mat(color) : color);
    m.position.set(x, y + h / 2, z);
    parent.add(m);
    return m;
  }
  function cone(parent, r, h, color, x = 0, y = 0, z = 0, seg = 4) {
    const m = new THREE.Mesh(new THREE.ConeGeometry(r, h, seg), mat(color));
    m.position.set(x, y + h / 2, z);
    if (seg === 4) m.rotation.y = Math.PI / 4;
    parent.add(m);
    return m;
  }
  function ball(parent, r, color, x, y, z, sx = 1, sy = 1, sz = 1, seg = 16) {
    const m = new THREE.Mesh(new THREE.SphereGeometry(r, seg, Math.max(6, seg / 2)), mat(color));
    m.position.set(x, y, z);
    m.scale.set(sx, sy, sz);
    parent.add(m);
    return m;
  }
  const TREE_TOP = new THREE.IcosahedronGeometry(1, 0);
  function tree(parent, x, z, s = 1, color = '#3f9b4a') {
    cyl(parent, 0.1 * s, 0.14 * s, 0.7 * s, '#7a5a3a', x, 0, z, 5);
    const t = new THREE.Mesh(TREE_TOP, mat(color));
    t.scale.setScalar(0.75 * s);
    t.position.set(x, 1.15 * s, z);
    t.rotation.set(x, z, 0);
    parent.add(t);
  }
  function plot(parent, w, d, color = '#ecebe4') { box(parent, w, 0.08, d, color, 0, 0.02, 0); }
  function sign(parent, text, w, h, x, y, z, bg = '#111111', fg = '#ffd84d', rotY = 0) {
    const tex = canvasTex(512, Math.round(512 * h / w), (c, cw, ch) => {
      c.fillStyle = bg; c.fillRect(0, 0, cw, ch);
      c.fillStyle = fg; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.font = `800 ${Math.round(ch * 0.55)}px "Plus Jakarta Sans", system-ui, sans-serif`;
      c.fillText(text, cw / 2, ch / 2 + 2);
    });
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex }));
    m.position.set(x, y, z);
    m.rotation.y = rotY;
    parent.add(m);
    return m;
  }
  function groupAt(lat, lon, scale = 1, rotY = 0) {
    const [x, z] = at(lat, lon);
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    g.scale.setScalar(scale * Math.max(0.6, kAt(lat, lon)));
    g.rotation.y = rotY;
    root.add(g);
    return g;
  }
  function flatLabel(text, x, z, size = 5, rot = 0, color = 'rgba(255,255,255,.85)') {
    const tex = canvasTex(1024, 128, (g, w, h) => {
      g.font = '800 84px "Plus Jakarta Sans", system-ui, sans-serif';
      g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillStyle = color;
      g.fillText(text.split('').join(String.fromCharCode(8202)), w / 2, h / 2);
    });
    const m = new THREE.Mesh(new THREE.PlaneGeometry(size * 8, size), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false }));
    m.rotation.x = -Math.PI / 2;
    m.rotation.z = rot;
    m.position.set(x, 0.14, z);
    m.userData.flat = true;
    m.userData.noShadow = true;
    root.add(m);
  }

  // ------------------------------------------------------------ the Thames

  const THAMES = [
    [51.433, -0.560], [51.433, -0.512], [51.405, -0.452], [51.403, -0.337], [51.411, -0.308], [51.430, -0.322],
    [51.458, -0.307], [51.487, -0.288], [51.473, -0.268], [51.478, -0.250], [51.488, -0.230], [51.467, -0.213],
    [51.465, -0.188], [51.482, -0.173], [51.4846, -0.1497], [51.488, -0.1272], [51.4946, -0.1233], [51.5008, -0.1218],
    [51.5065, -0.1200], [51.5088, -0.1150], [51.5098, -0.1043], [51.5085, -0.0920], [51.5079, -0.0877], [51.5055, -0.0754],
    [51.5040, -0.0600], [51.5025, -0.0510], [51.5085, -0.0360], [51.5050, -0.0300], [51.4960, -0.0290], [51.4870, -0.0230],
    [51.4850, -0.0090], [51.4870, -0.0030], [51.5050, 0.0000], [51.5090, 0.0060], [51.5040, 0.0120], [51.4960, 0.0130],
    [51.4930, 0.0300], [51.4966, 0.0365], [51.4960, 0.0620], [51.5030, 0.0900], [51.5070, 0.1300], [51.5000, 0.2200],
  ].map(([la, lo]) => at(la, lo));
  const RIVER_W = 6.5;

  function distToSeg(px, pz, ax, az, bx, bz) {
    const dx = bx - ax, dz = bz - az;
    const t = Math.max(0, Math.min(1, ((px - ax) * dx + (pz - az) * dz) / (dx * dx + dz * dz || 1)));
    return Math.hypot(px - (ax + t * dx), pz - (az + t * dz));
  }
  function riverDist(x, z) {
    let m = Infinity;
    for (let i = 0; i < THAMES.length - 1; i++) m = Math.min(m, distToSeg(x, z, ...THAMES[i], ...THAMES[i + 1]));
    return m;
  }
  function ribbon(points, width, color, y) {
    const m = typeof color === 'string' ? mat(color) : color;
    const jointGeo = new THREE.CylinderGeometry(width / 2, width / 2, 0.1, 18);
    for (let i = 0; i < points.length - 1; i++) {
      const [ax, az] = points[i], [bx, bz] = points[i + 1];
      const seg = new THREE.Mesh(BOX, m);
      seg.scale.set(width, 0.1, Math.hypot(bx - ax, bz - az));
      seg.position.set((ax + bx) / 2, y, (az + bz) / 2);
      seg.rotation.y = Math.atan2(bx - ax, bz - az);
      seg.userData.flat = true;
      root.add(seg);
      const joint = new THREE.Mesh(jointGeo, m);
      joint.position.set(bx, y, bz);
      joint.userData.flat = true;
      root.add(joint);
    }
  }

  // ------------------------------------------------------------ parks

  const PARKS = [
    { name: 'Hyde Park', lat: 51.5072, lon: -0.1700, rx: 2.0, rz: 0.75, lake: [-0.1, 0.05, 0.7, 0.14, -0.25] },
    { name: 'Green Park', lat: 51.5040, lon: -0.1400, rx: 0.45, rz: 0.3 },
    { name: "St James's Park", lat: 51.5025, lon: -0.1335, rx: 0.55, rz: 0.22, lake: [0, 0, 0.35, 0.06, -0.1] },
    { name: "Regent's Park", lat: 51.5300, lon: -0.1560, rx: 0.95, rz: 0.75 },
    { name: 'Hampstead Heath', lat: 51.5608, lon: -0.1631, rx: 1.3, rz: 1.0 },
    { name: 'Greenwich Park', lat: 51.4775, lon: -0.0020, rx: 0.65, rz: 0.45 },
    { name: 'Victoria Park', lat: 51.5362, lon: -0.0390, rx: 1.0, rz: 0.4, rot: -0.3 },
    { name: 'Battersea Park', lat: 51.4790, lon: -0.1580, rx: 0.65, rz: 0.4 },
    { name: 'Olympic Park', lat: 51.5430, lon: -0.0160, rx: 0.55, rz: 1.0 },
    { name: 'Clapham Common', lat: 51.4580, lon: -0.1480, rx: 0.6, rz: 0.45 },
    { name: 'Primrose Hill', lat: 51.5395, lon: -0.1605, rx: 0.3, rz: 0.25 },
  ];
  const parkShapes = [];
  function buildParks() {
    for (const p of PARKS) {
      const [x, z] = at(p.lat, p.lon);
      const k = kAt(p.lat, p.lon);
      const rx = p.rx * KM * k, rz = p.rz * KM * k;
      const lawn = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 0.1, 40), mat('#78b94e', { roughness: 0.95 }));
      lawn.scale.set(rx, 1, rz);
      lawn.position.set(x, 0.05, z);
      lawn.rotation.y = p.rot || 0;
      lawn.userData.flat = true;
      root.add(lawn);
      parkShapes.push({ x, z, rx, rz, rot: p.rot || 0 });
      if (p.lake) {
        const [lx, lz, lrx, lrz, lr] = p.lake;
        const lake = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 0.1, 30), WATER());
        lake.userData.flat = true;
        lake.scale.set(lrx * KM * k, 1, lrz * KM * k);
        lake.position.set(x + lx * KM * k, 0.1, z + lz * KM * k);
        lake.rotation.y = lr;
        root.add(lake);
      }
      // paths
      const path = new THREE.Mesh(BOX, mat('#e7dfc6'));
      path.scale.set(rx * 1.7, 0.1, 0.45);
      path.position.set(x, 0.09, z);
      path.rotation.y = (p.rot || 0) + 0.35;
      path.userData.flat = true;
      root.add(path);
      flatLabel(p.name.toUpperCase(), x, z + rz * 0.55, Math.min(1.4, rx / 6), 0, 'rgba(60,110,50,.55)');
    }
  }
  function inPark(x, z, pad = 0) {
    return parkShapes.some((p) => {
      const c = Math.cos(-p.rot), s = Math.sin(-p.rot);
      const dx = (x - p.x) * c - (z - p.z) * s, dz = (x - p.x) * s + (z - p.z) * c;
      return (dx / (p.rx + pad)) ** 2 + (dz / (p.rz + pad)) ** 2 < 1;
    });
  }

  // ------------------------------------------------------------ roads

  const EDGES = [];
  function buildRoads() {
    const seen = new Set();
    for (const line of LINES) {
      for (let i = 0; i < line.stops.length - 1; i++) {
        const a = line.stops[i], b = line.stops[i + 1];
        const key = [a, b].sort().join('-');
        if (seen.has(key)) continue;
        seen.add(key);
        EDGES.push([a, b]);
        const A = LOCATIONS[a], B = LOCATIONS[b];
        ribbon([[wx(A.x), wz(A.y)], [wx(B.x), wz(B.y)]], 1.25, '#7d848b', 0.12);
      }
    }
  }

  // ------------------------------------------------------------ districts (playable places)

  const HUB = {
    heathrow(g) {
      plot(g, 18, 12, '#dfe3e6');
      box(g, 18, 0.1, 2.4, '#4a5058', 0, 0.06, 3.5);
      for (let i = -8; i < 9; i += 2) box(g, 1, 0.1, 0.2, '#ffffff', i, 0.1, 3.5);
      building(g, 10, 2.2, 3.2, '#bcd4e6', 0, -2.5, '#e9edf0');
      cyl(g, 0.5, 0.7, 4.5, '#e9edf0', 6.5, 0, -2.5, 8);
      box(g, 1.8, 0.9, 1.8, '#2f3a45', 6.5, 4.5, -2.5);
      const pl = new THREE.Group();
      const body = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 5, 10), mat('#ffffff'));
      body.rotation.z = Math.PI / 2; pl.add(body);
      box(pl, 1.2, 0.12, 5, '#ffffff', 0, -0.05, 0);
      box(pl, 0.7, 1.1, 0.12, '#d52b1e', -2.2, 0.1, 0);
      pl.position.set(-3, 0.8, 3.5);
      g.add(pl);
    },
    hydepark(g) {
      box(g, 3, 0.08, 2.4, '#ecebe4', 0, 0.06, 0);
      building(g, 2.2, 1, 1.4, '#f1ece0', 0, -0.3, '#3d6b4a');
      for (let i = 0; i < 4; i++) box(g, 0.5, 0.25, 0.9, ['#2f6fdb', '#e0453a', '#f2b233', '#ffffff'][i], -1.2 + i * 0.8, 0.05, 1.6);
    },
    chelsea(g) {
      plot(g, 9, 6);
      for (let i = 0; i < 4; i++) {
        building(g, 1.8, 2.8, 2.2, '#f4efe6', -2.9 + i * 1.95, -1.2, '#3d4650');
        box(g, 0.5, 0.5, 0.3, ['#c0392b', '#1f6f8b', '#2d6a4f', '#f2b134'][i], -2.9 + i * 1.95, 0, 0.0);
      }
      box(g, 8.5, 0.1, 1.2, '#c8a27a', 0, 0.06, 1.9);
    },
    oxford(g) {
      plot(g, 9, 6);
      building(g, 4, 3.4, 2.8, '#e7d3b0', -2.2, -1.2);
      building(g, 3.6, 4.4, 2.8, '#c9d6df', 2.2, -1.2);
      const cols = ['#d52b1e', '#ffffff', '#1d3557', '#f4a261'];
      for (let i = 0; i < 4; i++) box(g, 1.6, 0.22, 0.8, cols[i], -3 + i * 2, 1.4, 0.4);
    },
    soho(g) {
      plot(g, 8, 6);
      building(g, 3.4, 3, 2.6, '#a8323e', -1.9, -1.2, '#5b1a21');
      sign(g, '★ MUSICAL ★', 3, 0.7, -1.9, 2, 0.12);
      building(g, 2, 2.4, 2, '#6b4f3a', 1.8, -1.4, '#3a2a1e');
      building(g, 1.8, 2.8, 2, '#d9c7a7', 2.4, 1.4);
    },
    covent(g) {
      plot(g, 8, 6, '#e8e1d2');
      building(g, 6, 1.8, 3.2, '#efe7d6', 0, -0.6, '#b8b1a3');
      const roof = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.6, 6, 16, 1, false, 0, Math.PI), mat('#cfd8de'));
      roof.rotation.z = Math.PI / 2; roof.rotation.y = Math.PI / 2; roof.position.set(0, 1.8, -0.6); g.add(roof);
      for (let i = 0; i < 4; i++) ball(g, 0.25, ['#e0453a', '#f2b233', '#2f6fdb', '#26a269'][i], -2.4 + i * 1.6, 0.3, 2);
    },
    westminster(g) {
      // Buckingham Palace and the Victoria Memorial
      plot(g, 12, 9, '#e3dccb');
      building(g, 9, 2.4, 2.6, '#e9e1cc', 0, -2.2, '#bdb39b');
      box(g, 2.4, 0.5, 2.7, '#e9e1cc', 0, 2.4, -2.2);
      box(g, 0.5, 0.9, 0.04, '#d52b1e', 0, 3.1, -2.2);
      box(g, 0.04, 1.2, 0.04, '#777777', 0, 2.9, -2.2);
      cyl(g, 1.3, 1.5, 0.5, '#f3f0e8', 0, 0, 1.6, 24);
      cyl(g, 0.4, 0.5, 2.2, '#f3f0e8', 0, 0.5, 1.6, 12);
      ball(g, 0.35, '#d4af37', 0, 2.95, 1.6, 1, 1.2, 1);
      for (const x of [-4.5, 4.5]) box(g, 0.25, 0.9, 0.25, '#d52b1e', x, 0, 0.2);
    },
    southbank(g) {
      plot(g, 8, 6, '#dcd6cb');
      building(g, 5, 1.8, 2.6, '#9a9d9f', -1, -1, '#7a7d80');
      box(g, 2.8, 0.1, 1.6, '#c8c3b8', 1.8, 0.06, 1.6);
      for (let i = 0; i < 5; i++) box(g, 0.25, 0.4, 0.6, ['#ff006e', '#ffbe0b', '#3a86ff', '#8338ec', '#06d6a0'][i], -3 + i * 0.6, 0.05, 1.8);
    },
    camden(g) {
      plot(g, 9, 7);
      const cols = ['#e63946', '#f4a261', '#2a9d8f', '#e9c46a', '#6c4ab6', '#1d9bf0', '#ff70a6', '#70d6ff'];
      for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) box(g, 1.6, 0.5, 1.4, cols[(r * 4 + c) % 8], -3.3 + c * 2.2, 0.05, -2 + r * 1.8);
      box(g, 9, 0.08, 1.1, WATER(), 0, 0.06, 3.1);
      box(g, 2.4, 0.5, 0.7, '#2d6a4f', 1.5, 0.1, 3.1);
    },
    kingscross(g) {
      plot(g, 9, 7);
      building(g, 3.8, 2.6, 3, '#b5533c', -2.4, -1.2, '#7c3a2a');
      const shed = new THREE.Mesh(new THREE.CylinderGeometry(1.8, 1.8, 4.6, 14, 1, false, 0, Math.PI), mat('#c9d3dc'));
      shed.rotation.z = Math.PI / 2; shed.rotation.y = Math.PI / 2; shed.position.set(2, 0.2, -1.2); g.add(shed);
      box(g, 1, 4.8, 1, '#b5533c', 4, 0, 1.6);
      cone(g, 0.7, 1.4, '#5a6b4f', 4, 4.8, 1.6, 4);
    },
    city(g) {
      // Bank junction: the Bank of England and the Royal Exchange
      plot(g, 8, 6, '#e3dccb');
      building(g, 4, 2, 3, '#e6dcc4', -1.8, -1, '#bdb39b');
      box(g, 3, 1.8, 2.2, '#efe7d6', 2, 0, -0.4);
      for (let i = 0; i < 6; i++) cyl(g, 0.12, 0.12, 1.6, '#ffffff', 0.9 + i * 0.4, 0, 0.75, 8);
      cone(g, 2.1, 0.7, '#cfc6b2', 2, 1.8, -0.4, 4);
    },
    towerhill(g) {
      // The Tower of London: White Tower in a walled ward
      plot(g, 8, 7, '#b9c98f');
      const wall = mat('#cdbd98');
      for (const [w, d, x, z] of [[8, 0.5, 0, -3.3], [8, 0.5, 0, 3.3], [0.5, 7, -3.8, 0], [0.5, 7, 3.8, 0]]) {
        const m = new THREE.Mesh(BOX, wall); m.scale.set(w, 1, d); m.position.set(x, 0.5, z); g.add(m);
      }
      for (const [x, z] of [[-3.8, -3.3], [3.8, -3.3], [-3.8, 3.3], [3.8, 3.3]]) cyl(g, 0.6, 0.6, 1.5, '#c4b38c', x, 0, z, 12);
      box(g, 3, 2.6, 2.6, '#e8dcc0', 0, 0, 0);
      for (const [x, z] of [[-1.5, -1.3], [1.5, -1.3], [-1.5, 1.3], [1.5, 1.3]]) {
        cyl(g, 0.3, 0.3, 3.2, '#e8dcc0', x, 0, z, 8);
        ball(g, 0.34, '#6d7f8a', x, 3.3, z, 1, 1.2, 1, 8);
      }
    },
    shoreditch(g) {
      plot(g, 8, 6);
      building(g, 3.4, 2.4, 2.6, '#9c5a3c', -2, -1.2, '#4e2d1e');
      const art = canvasTex(256, 128, (c, w, h) => {
        const cs = ['#ff006e', '#ffbe0b', '#3a86ff', '#8338ec', '#06d6a0'];
        for (let i = 0; i < 18; i++) { c.fillStyle = cs[i % 5]; c.beginPath(); c.arc((i * 53) % w, (i * 31) % h, 12 + (i % 4) * 7, 0, 7); c.fill(); }
      });
      const wall = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 2.2), new THREE.MeshBasicMaterial({ map: art }));
      wall.position.set(-2, 1.15, 0.12); g.add(wall);
      const cols = ['#111111', '#e63946', '#2a9d8f', '#f4a261'];
      for (let i = 0; i < 4; i++) box(g, 2, 0.9, 0.9, cols[i], 2.2, (i % 2) * 0.9, -2 + Math.floor(i / 2) * 1.1);
    },
    stratford(g) {
      // Westfield
      plot(g, 9, 7);
      building(g, 7, 2.4, 4, '#cfd8de', 0, -0.8, '#9aa8b2');
      sign(g, 'WESTFIELD-ISH', 3.5, 0.6, 0, 1.6, 1.25, '#ffffff', '#111111');
    },
    canary(g) {
      plot(g, 10, 8, '#dfe4e8');
      box(g, 2.6, 13, 2.6, glass('#b4c8d8'), 0, 0, -1);
      cone(g, 1.85, 2.1, '#dfe6ec', 0, 13, -1, 4);
      building(g, 2.2, 10, 2.2, '#8faabf', -3.2, 1);
      building(g, 2.2, 9.5, 2.4, '#a9bccb', 3.2, 1.2);
      building(g, 1.9, 7, 1.9, '#6f8ea8', 3.3, -2.6);
      building(g, 1.8, 8, 1.8, '#c3d0da', -3.2, -2.6);
    },
    greenwich(g) {
      // The Cutty Sark and Greenwich Market
      plot(g, 9, 7);
      const hull = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.5, 6, 12, 1), mat('#1e2a33'));
      hull.rotation.z = Math.PI / 2; hull.scale.set(1, 1, 0.55); hull.position.set(-0.5, 1, -1.2); g.add(hull);
      box(g, 5.6, 0.12, 0.9, '#a77b4f', -0.5, 1.6, -1.2);
      for (const x of [-2.4, -0.5, 1.4]) { cyl(g, 0.06, 0.08, 4, '#7a5a3a', x, 1.6, -1.2, 6); for (let k = 0; k < 3; k++) box(g, 1.5 - k * 0.3, 0.06, 0.06, '#7a5a3a', x, 2.6 + k, -1.2); }
      box(g, 6, 0.1, 2, '#e7dfc6', -0.5, 0, -1.2);
      building(g, 3, 1.4, 2, '#b36a4a', 2.4, 2, '#7a3f2a');
    },
    woolwich(g) {
      plot(g, 9, 7);
      for (let i = 0; i < 3; i++) {
        building(g, 2, 2.2, 2.2, ['#c97b5a', '#d9a066', '#b5654b'][i], -3 + i * 2.2, -1.6, '#6b3f2a');
        cone(g, 1.55, 0.9, '#6b3f2a', -3 + i * 2.2, 2.2, -1.6, 4);
      }
      box(g, 2.6, 1.4, 2, '#00843d', 2.6, 0, 1.3);
      box(g, 3, 0.22, 0.8, '#f4c430', 2.6, 1.4, 0.2);
    },
    peckham(g) {
      plot(g, 9, 7);
      building(g, 5, 3, 3.4, '#8d9196', 1.6, -1, '#6c7075');
      const cols = ['#ff6b6b', '#ffd93d', '#6bcb77', '#4d96ff'];
      for (let i = 0; i < 4; i++) { cyl(g, 0.05, 0.05, 0.9, '#444444', -0.4 + i * 1.2, 3.1, -1, 4); cone(g, 0.6, 0.35, cols[i], -0.4 + i * 1.2, 3.9, -1, 8); }
      for (let i = 0; i < 3; i++) building(g, 1.8, 2.2, 2, ['#c06c52', '#d4a373', '#a3b18a'][i], -3.3 + i * 1.9, 2, '#5c3d2e');
    },
    brixton(g) {
      plot(g, 8, 7);
      building(g, 3.8, 2.8, 2.6, '#e9dcc2', -1.8, -1.6, '#7c6a4f');
      const cols = ['#009b3a', '#fed100', '#111111', '#e63946', '#2a9d8f', '#f4a261'];
      for (let i = 0; i < 6; i++) box(g, 1.2, 0.6, 1.1, cols[i], -2.8 + (i % 3) * 1.6, 0.05, 1 + Math.floor(i / 3) * 1.4);
      building(g, 2.2, 2.4, 2.6, '#3b3b58', 2.6, -0.6, '#22223b');
    },
    battersea(g) {
      // Battersea Power Station: brick block with four white chimneys
      plot(g, 10, 8, '#dad3c4');
      building(g, 7, 4, 4.4, '#9a5b45', 0, 0, '#6e3e2f');
      for (const [x, z] of [[-3.1, -1.9], [3.1, -1.9], [-3.1, 1.9], [3.1, 1.9]]) cyl(g, 0.45, 0.6, 5, '#f4f1ea', x, 4, z, 16);
    },
    kensington(g) {
      // Natural History Museum
      plot(g, 10, 7, '#e3dccb');
      building(g, 8, 2.2, 2.6, '#d9c3a0', 0, -1, '#8a7a62');
      for (const x of [-0.8, 0.8]) { box(g, 0.8, 4, 0.8, '#d0b48c', x, 0, 0.4); cone(g, 0.6, 1.2, '#6b6f7a', x, 4, 0.4, 4); }
      for (const x of [-4, 4]) { box(g, 0.9, 3, 0.9, '#d0b48c', x, 0, -1); cone(g, 0.7, 1, '#6b6f7a', x, 3, -1, 4); }
    },
    nottinghill(g) {
      // Pastel terraces and Portobello Road stalls
      plot(g, 10, 7);
      const pastel = ['#f7c6d9', '#bde0fe', '#fff1a8', '#c8f2c2', '#e4c1f9', '#ffd6a5'];
      for (let i = 0; i < 6; i++) building(g, 1.5, 2.4, 2, pastel[i], -3.9 + i * 1.56, -1.6, '#5b5f66');
      for (let i = 0; i < 5; i++) box(g, 1.2, 0.5, 0.9, ['#e63946', '#2a9d8f', '#f4a261', '#6c4ab6', '#1d9bf0'][i], -3.2 + i * 1.6, 0.05, 1.8);
    },
    wembley(g) {
      // Wembley Stadium and its arch
      plot(g, 16, 13, '#dfe3e6');
      const bowl = new THREE.Mesh(new THREE.CylinderGeometry(5.6, 5, 2.6, 36, 1, true), mat('#eef1f4', { side: THREE.DoubleSide }));
      bowl.scale.set(1.25, 1, 1); bowl.position.y = 1.3; g.add(bowl);
      const pitch = new THREE.Mesh(new THREE.CylinderGeometry(4.6, 4.6, 0.1, 36), mat('#5fae47'));
      pitch.scale.set(1.25, 1, 1); pitch.position.y = 0.15; g.add(pitch);
      const arch = new THREE.Mesh(new THREE.TorusGeometry(6.6, 0.22, 8, 48, Math.PI), mat('#ffffff'));
      arch.rotation.y = 0.2; arch.position.y = 0.2; g.add(arch);
    },
    croydon(g) {
      plot(g, 10, 8);
      building(g, 5, 6, 2.2, '#9aa3ab', -1.6, -1.8, '#6c757d');
      sign(g, 'LUNAR HOUSE', 3.4, 0.8, -1.6, 1.2, -0.67, '#ffffff', '#1d3557');
      building(g, 2.2, 8, 2.2, '#c5c9cc', 2.8, -1.2);
      box(g, 10, 0.06, 0.25, '#78be20', 0, 0.08, 3.4);
    },
  };

  // ------------------------------------------------------------ monuments

  function eye(g, r) {
    const e = new THREE.Group();
    e.add(new THREE.Mesh(new THREE.TorusGeometry(r, 0.11, 6, 56), mat('#f4f6f8')));
    for (let i = 0; i < 20; i++) {
      const a = (i / 20) * Math.PI * 2;
      const spoke = new THREE.Mesh(BOX, mat('#dfe5ea'));
      spoke.scale.set(0.04, r, 0.04);
      spoke.position.set(Math.cos(a) * r / 2, Math.sin(a) * r / 2, 0);
      spoke.rotation.z = a - Math.PI / 2;
      e.add(spoke);
      const pod = new THREE.Mesh(new THREE.SphereGeometry(0.24, 8, 6), mat('#bfe3f5'));
      pod.scale.set(1, 1, 1.4);
      pod.position.set(Math.cos(a) * r, Math.sin(a) * r, 0);
      e.add(pod);
    }
    e.position.y = r + 0.6;
    g.add(e);
    spinners.push(e);
    const leg = (s) => { const l = box(g, 0.25, r + 0.8, 0.25, '#dfe5ea', 0, 0, s * 0.8); l.rotation.x = s * 0.25; };
    leg(1); leg(-1);
  }

  const MONUMENTS = [
    { name: 'Big Ben & Parliament', lat: 51.4993, lon: -0.1250, r: 6, rot: 0.15, build(g) {
      building(g, 2.2, 2.4, 8, '#d8c49a', 0, -0.5, '#7f8c6a');
      for (let z = -4; z <= 3; z += 1.1) cone(g, 0.22, 0.8, '#7f8c6a', 0.9, 2.5, z, 4);
      box(g, 1.6, 4, 1.6, '#cdb683', 0, 0, -4.4); cone(g, 1.1, 1.8, '#5a6b4f', 0, 4, -4.4, 4);
      box(g, 1.2, 7.2, 1.2, '#d8c49a', 0.2, 0, 3.9);
      box(g, 1.4, 1.4, 1.4, '#cdb683', 0.2, 7.2, 3.9);
      for (const [x, z, ry] of [[0.91, 3.9, Math.PI / 2], [0.2, 4.61, 0]]) { const f = new THREE.Mesh(new THREE.CircleGeometry(0.5, 20), mat('#fffbea')); f.position.set(x, 7.9, z); f.rotation.y = ry; g.add(f); }
      cone(g, 0.9, 2.3, '#5a6b4f', 0.2, 8.6, 3.9, 4);
    } },
    { name: 'Westminster Abbey', lat: 51.4994, lon: -0.1281, r: 3.5, build(g) {
      building(g, 1.8, 2.4, 5, '#d6c6a3', 0, 0, '#7f7465');
      for (const x of [-0.55, 0.55]) { box(g, 0.6, 4, 0.6, '#d6c6a3', x, 0, 2.6); cone(g, 0.35, 0.6, '#7f7465', x, 4, 2.6, 4); }
    } },
    { name: 'London Eye', lat: 51.5033, lon: -0.1196, r: 3, rot: 0.6, build(g) { eye(g, 3.8); } },
    { name: "Nelson's Column", lat: 51.5078, lon: -0.1280, r: 2.5, build(g) {
      box(g, 4, 0.1, 3, '#e8e2d6', 0, 0.02, 0);
      box(g, 1, 0.8, 1, '#c9c2b4', 0, 0, 0);
      cyl(g, 0.22, 0.28, 6, '#d9d3c5', 0, 0.8, 0, 12);
      ball(g, 0.3, '#5a5a5a', 0, 7.1, 0);
      for (const [x, z] of [[-1.5, -1], [1.5, -1], [-1.5, 1], [1.5, 1]]) ball(g, 0.45, '#2a2a2a', x, 0.35, z, 1.4, 0.8, 0.8, 10);
      cyl(g, 0.6, 0.6, 0.15, '#7fc2e8', -1.2, 0.05, 1.2, 16); cyl(g, 0.6, 0.6, 0.15, '#7fc2e8', 1.2, 0.05, 1.2, 16);
    } },
    { name: 'Piccadilly Circus', lat: 51.5100, lon: -0.1347, r: 2.5, build(g) {
      building(g, 3, 2.6, 2, '#d9cdb8', 0, -0.5);
      const scr = canvasTex(512, 256, (c, w, h) => {
        const cols = ['#ff2d55', '#ffd60a', '#0a84ff', '#30d158', '#bf5af2', '#ff9f0a'];
        for (let i = 0; i < 6; i++) { c.fillStyle = cols[i]; c.fillRect((i % 3) * (w / 3), Math.floor(i / 3) * (h / 2), w / 3, h / 2); }
        c.fillStyle = '#fff'; c.font = '800 46px system-ui'; c.textAlign = 'center';
        c.fillText('PERI', w / 6, h / 4 + 16); c.fillText('QUICK£', w / 2, h / 4 + 16); c.fillText('UBAH', w * 5 / 6, h / 4 + 16);
      });
      const s = new THREE.Mesh(new THREE.PlaneGeometry(2.9, 1.4), new THREE.MeshBasicMaterial({ map: scr }));
      s.position.set(0, 1.8, 0.52); g.add(s);
      cyl(g, 0.3, 0.4, 0.6, '#c9c2b4', 0, 0, 1.6, 10); ball(g, 0.2, '#3d3d3d', 0, 0.9, 1.6);
    } },
    { name: 'BT Tower', lat: 51.5215, lon: -0.1389, r: 1.5, build(g) {
      cyl(g, 0.5, 0.6, 7, '#c8ced3', 0, 0, 0, 16);
      for (let i = 0; i < 4; i++) cyl(g, 0.75, 0.75, 0.35, i % 2 ? '#5f6b75' : '#e9edf0', 0, 7 + i * 0.4, 0, 16);
      cyl(g, 0.12, 0.12, 1.2, '#9aa3ab', 0, 8.6, 0, 6);
    } },
    { name: 'British Museum', lat: 51.5194, lon: -0.1270, r: 3, build(g) {
      building(g, 5, 1.8, 3, '#ece4d2', 0, 0, '#bdb39b');
      for (let i = 0; i < 8; i++) cyl(g, 0.12, 0.12, 1.6, '#ffffff', -1.75 + i * 0.5, 0, 1.6, 8);
      cone(g, 2.9, 0.6, '#d8cfbd', 0, 1.8, 1.4, 4).scale.set(1, 1, 0.3);
      ball(g, 0.9, '#cfe0ea', 0, 1.8, -0.2, 1, 0.5, 1);
    } },
    { name: "St Paul's Cathedral", lat: 51.5138, lon: -0.0984, r: 3.5, build(g) {
      building(g, 2.4, 2.2, 6, '#efe8d8', 0, 0, '#cfc6b2');
      box(g, 4.4, 2.2, 1.6, '#efe8d8', 0, 0, 0);
      cyl(g, 1.25, 1.35, 1.2, '#efe8d8', 0, 2.2, 0, 20);
      ball(g, 1.25, '#9fb3b8', 0, 3.4, 0, 1, 0.95, 1, 20);
      cyl(g, 0.22, 0.28, 0.9, '#efe8d8', 0, 4.5, 0, 10);
      cone(g, 0.2, 0.5, '#d4af37', 0, 5.4, 0, 8);
      for (const x of [-0.8, 0.8]) { box(g, 0.7, 3.3, 0.7, '#efe8d8', x, 0, 3); cone(g, 0.3, 0.6, '#9fb3b8', x, 3.3, 3, 8); }
    } },
    { name: 'Millennium Bridge', lat: 51.5094, lon: -0.0987, r: 0, build(g) {
      const b = box(g, 0.7, 0.12, 8, '#c8ced3', 0, 0.3, 0);
      void b;
      for (const z of [-2, 2]) box(g, 1.2, 0.3, 0.15, '#9aa3ab', 0, 0.05, z);
    } },
    { name: 'Tate Modern', lat: 51.5076, lon: -0.0994, r: 3, build(g) {
      building(g, 5.5, 2.4, 2.6, '#7c4a3a', 0, 0, '#4f2e24');
      box(g, 1, 5, 1, '#7c4a3a', 0, 0, 0.2);
    } },
    { name: 'The Shard', lat: 51.5045, lon: -0.0865, r: 2.5, build(g) {
      const s = new THREE.Mesh(new THREE.ConeGeometry(2.1, 16, 4), glass('#9fc0dc'));
      s.position.y = 8; s.rotation.y = Math.PI / 4; g.add(s);
    } },
    { name: 'Tower Bridge', lat: 51.5055, lon: -0.0754, r: 0, rot: -0.05, build(g) {
      box(g, 1.6, 0.25, 9, '#5a7fa0', 0, 0.25, 0);
      for (const z of [-2, 2]) {
        box(g, 1.5, 4.6, 1.3, '#d8c49a', 0, 0, z);
        for (const [x, dz] of [[-0.55, -0.45], [0.55, -0.45], [-0.55, 0.45], [0.55, 0.45]]) cone(g, 0.22, 0.9, '#5a6b4f', x, 4.6, z + dz, 4);
      }
      box(g, 1.6, 0.22, 4, '#5a7fa0', 0, 3.8, 0);
      for (const z of [-3.6, 3.6]) { const c = box(g, 0.12, 0.12, 3.4, '#5a7fa0', 0, 2.2, z); c.rotation.x = z > 0 ? 0.9 : -0.9; }
    } },
    { name: 'The Gherkin', lat: 51.5145, lon: -0.0803, r: 2, build(g) {
      const pts = [];
      for (let i = 0; i <= 14; i++) { const t = i / 14; pts.push(new THREE.Vector2(Math.sin(Math.PI * (0.12 + t * 0.88)) * 1.5 * (1 - t * 0.15), t * 9)); }
      g.add(new THREE.Mesh(new THREE.LatheGeometry(pts, 18), glass('#3f7486')));
    } },
    { name: 'Walkie-Talkie', lat: 51.5113, lon: -0.0836, r: 2, build(g) {
      const m = new THREE.Mesh(new THREE.CylinderGeometry(1.7, 1.15, 8, 4), glass('#7f9fba'));
      m.position.y = 4; m.rotation.y = Math.PI / 4; m.scale.set(1, 1, 0.75); g.add(m);
    } },
    { name: 'The Cheesegrater', lat: 51.5138, lon: -0.0826, r: 2, build(g) {
      const geo = new THREE.CylinderGeometry(0.4, 1.8, 10, 4, 1);
      const m = new THREE.Mesh(geo, glass('#a5bccd'));
      m.position.y = 5; m.rotation.y = Math.PI / 4; m.scale.set(1, 1, 0.55); g.add(m);
    } },
    { name: 'The O2', lat: 51.5030, lon: 0.0032, r: 4, build(g) {
      const d = new THREE.Mesh(new THREE.SphereGeometry(4, 24, 10, 0, Math.PI * 2, 0, Math.PI / 2), mat('#f2f2ee'));
      d.scale.set(1, 0.32, 1); g.add(d);
      for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; const m = cyl(g, 0.07, 0.07, 3.2, '#f2c12e', Math.cos(a) * 3.2, 0, Math.sin(a) * 3.2, 6); m.rotation.set(Math.sin(a) * 0.2, 0, -Math.cos(a) * 0.2); }
    } },
    { name: 'Royal Observatory', lat: 51.4769, lon: -0.0005, r: 2, build(g) {
      building(g, 2.2, 1.2, 1.6, '#b35c44', 0, 0, '#7d3c2b');
      ball(g, 0.55, '#7d8a8f', 0.6, 1.3, 0, 1, 0.9, 1, 12);
      box(g, 0.08, 0.06, 6, '#e8e8e8', -1.4, 0.08, 0);
    } },
    { name: 'Thames Barrier', lat: 51.4966, lon: 0.0365, r: 0, rot: 0.1, build(g) {
      for (let i = 0; i < 7; i++) {
        const z = -4.2 + i * 1.4;
        const s = new THREE.Mesh(new THREE.SphereGeometry(0.55, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2), mat('#c9ced3'));
        s.scale.set(1.4, 1.1, 0.7); s.position.set(0, 0.1, z); g.add(s);
      }
    } },
    { name: 'Royal Albert Hall', lat: 51.5009, lon: -0.1774, r: 2.5, build(g) {
      cyl(g, 2, 2, 1.6, '#b0614a', 0, 0, 0, 28);
      ball(g, 2, '#c3cfd4', 0, 1.6, 0, 1, 0.35, 1, 24);
      box(g, 4.2, 0.15, 0.35, '#e4d7b9', 0, 1.2, 0);
    } },
    { name: 'Harrods', lat: 51.4994, lon: -0.1632, r: 2.5, build(g) {
      building(g, 4, 2.6, 2.6, '#c46a45', 0, 0, '#2d5a3d');
      ball(g, 0.6, '#2d5a3d', 0, 2.8, 0, 1, 1.1, 1, 12);
      box(g, 4.2, 0.15, 0.4, '#14532d', 0, 0.9, 1.4);
    } },
    { name: 'Kensington Palace', lat: 51.5058, lon: -0.1877, r: 2.5, build(g) {
      building(g, 4, 1.6, 2.6, '#c88d6a', 0, 0, '#5f6b75');
    } },
    { name: 'Emirates Stadium', lat: 51.5549, lon: -0.1084, r: 3.5, build(g) {
      const bowl = new THREE.Mesh(new THREE.CylinderGeometry(3.4, 3, 1.6, 30, 1, true), mat('#e64545', { side: THREE.DoubleSide }));
      bowl.scale.set(1.25, 1, 1); bowl.position.y = 0.8; g.add(bowl);
      const p = new THREE.Mesh(new THREE.CylinderGeometry(2.8, 2.8, 0.1, 30), mat('#5fae47')); p.scale.set(1.25, 1, 1); p.position.y = 0.1; g.add(p);
    } },
    { name: 'London Stadium', lat: 51.5386, lon: -0.0166, r: 4, build(g) {
      const bowl = new THREE.Mesh(new THREE.CylinderGeometry(3.8, 3.3, 1.8, 32, 1, true), mat('#eef1f4', { side: THREE.DoubleSide }));
      bowl.scale.set(1.25, 1, 1); bowl.position.y = 0.9; g.add(bowl);
      const p = new THREE.Mesh(new THREE.CylinderGeometry(3.1, 3.1, 0.1, 32), mat('#5fae47')); p.scale.set(1.25, 1, 1); p.position.y = 0.12; g.add(p);
    } },
    { name: 'ArcelorMittal Orbit', lat: 51.5383, lon: -0.0115, r: 1.5, build(g) {
      const o = new THREE.Mesh(new THREE.TorusKnotGeometry(0.8, 0.16, 64, 6, 2, 5), mat('#c0392b'));
      o.scale.set(1, 3.4, 1); o.position.y = 3.8; g.add(o);
      cyl(g, 0.8, 0.8, 0.45, '#7f1d1d', 0, 6.8, 0, 12);
    } },
    { name: 'Alexandra Palace', lat: 51.5942, lon: -0.1310, r: 3, build(g) {
      building(g, 6, 1.6, 2, '#c9a27e', 0, 0, '#5f6b75');
      box(g, 0.6, 3.6, 0.6, '#c9a27e', 2.4, 0, 0); cyl(g, 0.04, 0.04, 2, '#555555', 2.4, 3.6, 0, 4);
    } },
    { name: 'Crystal Palace Tower', lat: 51.4240, lon: -0.0730, r: 1.5, build(g) {
      const t = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 1.3, 9, 4, 1, true), mat('#d94b3a', { wireframe: true }));
      t.position.y = 4.5; g.add(t);
    } },
    { name: 'ExCeL London', lat: 51.5080, lon: 0.0290, r: 3, build(g) { building(g, 7, 1.3, 2.4, '#d8dde2', 0, 0, '#b6bec6'); } },
    { name: 'City Airport', lat: 51.5048, lon: 0.0495, r: 3, build(g) {
      box(g, 9, 0.08, 1.2, '#4a5058', 0, 0.04, 0);
      for (let i = -4; i < 5; i++) box(g, 0.5, 0.1, 0.12, '#ffffff', i, 0.06, 0);
      building(g, 2.4, 1, 1, '#bcd4e6', 0, -1.4);
    } },
    { name: 'Westfield White City', lat: 51.5072, lon: -0.2219, r: 2.5, build(g) { building(g, 4, 1.6, 2.4, '#cfd8de', 0, 0, '#9aa8b2'); } },
    { name: 'King George V Dock', lat: 51.5025, lon: 0.0650, r: 0, build(g) { box(g, 10, 0.09, 1.6, WATER(), 0, 0.02, 0); } },
  ];

  function buildMonuments() {
    for (const m of MONUMENTS) {
      const g = groupAt(m.lat, m.lon, 1, m.rot || 0);
      m.build(g);
      const [x, z] = at(m.lat, m.lon);
      if (m.r) occupied.push([x, z, m.r * Math.max(0.6, kAt(m.lat, m.lon)) + 1]);
      const bb = new THREE.Box3().setFromObject(g);
      monPins.push({ name: m.name, x, z, y: bb.max.y + 0.6 });
    }
  }

  // ------------------------------------------------------------ filler city (instanced)

  function filler() {
    const avoid = Object.values(LOCATIONS).map((p) => [wx(p.x), wz(p.y)]);
    const edgeSegs = EDGES.map(([a, b]) => [wx(LOCATIONS[a].x), wz(LOCATIONS[a].y), wx(LOCATIONS[b].x), wz(LOCATIONS[b].y)]);
    const palette = ['#d9b38c', '#c98b6b', '#e8dccb', '#b7c4cf', '#d6cfc4', '#a9714f', '#f0e6d2', '#9fb1bf'];
    const roofs = ['#cfcac0', '#6b4f3a'];
    const blocks = palette.map(() => []);
    const trees = [];
    let seed = 11;
    const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    const step = 3.6;
    for (let x = -250; x <= 250; x += step) {
      for (let z = -170; z <= 190; z += step) {
        const jx = x + (rnd() - 0.5) * 0.9, jz = z + (rnd() - 0.5) * 0.9;
        const d = Math.hypot(jx, jz);
        const dens = d < 45 ? 0.46 : d < 110 ? 0.32 : d < 170 ? 0.2 : 0.11;
        const r = rnd();
        if (r > dens + 0.12) continue;
        if (riverDist(jx, jz) < RIVER_W / 2 + 1.3) continue;
        if (avoid.some(([ax, az]) => Math.hypot(jx - ax, jz - az) < 7)) continue;
        if (occupied.some(([ox, oz, or]) => Math.hypot(jx - ox, jz - oz) < or)) continue;
        if (edgeSegs.some((s) => distToSeg(jx, jz, ...s) < 1.7)) continue;
        if (inPark(jx, jz, 0.5)) continue;
        if (r < dens) {
          const h = (d < 45 ? 1.5 + rnd() * 2.4 : 1.1 + rnd() * 1.5);
          blocks[Math.floor(rnd() * palette.length)].push([jx, jz, 1.6 + rnd() * 0.8, h, 1.8 + rnd() * 0.6, rnd() > 0.55 ? 1 : 0]);
        } else trees.push([jx, jz, 0.6 + rnd() * 0.4]);
      }
    }
    // Parks get lots of trees
    for (const p of parkShapes) {
      const n = Math.round((p.rx * p.rz) / 3);
      for (let i = 0; i < n; i++) {
        const a = rnd() * Math.PI * 2, rr = Math.sqrt(rnd()) * 0.92;
        const lx = Math.cos(a) * p.rx * rr, lz = Math.sin(a) * p.rz * rr;
        const c = Math.cos(p.rot), s = Math.sin(p.rot);
        trees.push([p.x + lx * c - lz * s, p.z + lx * s + lz * c, 0.6 + rnd() * 0.5]);
      }
    }
    const dummy = new THREE.Object3D();
    blocks.forEach((list, ci) => {
      if (!list.length) return;
      const side = winMat(palette[ci], 2, 3);
      for (const roofIdx of [0, 1]) {
        const items = list.filter((b) => b[5] === roofIdx);
        if (!items.length) continue;
        const geo = new THREE.BoxGeometry(1, 1, 1);
        const im = new THREE.InstancedMesh(geo, [side, side, mat(roofs[roofIdx]), mat(roofs[roofIdx]), side, side], items.length);
        items.forEach(([x, z, w, h, dd], i) => {
          dummy.position.set(x, h / 2, z); dummy.scale.set(w, h, dd); dummy.rotation.set(0, 0, 0); dummy.updateMatrix();
          im.setMatrixAt(i, dummy.matrix);
        });
        root.add(im);
      }
    });
    const trunk = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.1, 0.14, 0.7, 5), mat('#7a5a3a'), trees.length);
    const topA = new THREE.InstancedMesh(TREE_TOP, mat('#3f9b4a'), trees.length);
    trees.forEach(([x, z, s], i) => {
      dummy.position.set(x, 0.35 * s, z); dummy.scale.set(s, s, s); dummy.rotation.set(0, 0, 0); dummy.updateMatrix(); trunk.setMatrixAt(i, dummy.matrix);
      dummy.position.set(x, 1.15 * s, z); dummy.scale.setScalar(0.75 * s); dummy.rotation.set(x, z, 0); dummy.updateMatrix(); topA.setMatrixAt(i, dummy.matrix);
    });
    root.add(trunk, topA);
  }

  // ------------------------------------------------------------ street props & billboards

  function streetProps() {
    const dummy = new THREE.Object3D();
    const spots = [];
    for (const p of Object.values(LOCATIONS)) {
      const x = wx(p.x), z = wz(p.y);
      spots.push([x + 4.4, z + 3.2], [x - 4.2, z + 3.4]);
    }
    const booth = new THREE.InstancedMesh(new THREE.BoxGeometry(0.45, 1.1, 0.45), mat('#d52b1e'), spots.length);
    const cap = new THREE.InstancedMesh(new THREE.BoxGeometry(0.55, 0.12, 0.55), mat('#b0241a'), spots.length);
    spots.forEach(([x, z], i) => {
      dummy.position.set(x, 0.55, z); dummy.scale.set(1, 1, 1); dummy.updateMatrix(); booth.setMatrixAt(i, dummy.matrix);
      dummy.position.set(x, 1.16, z); dummy.updateMatrix(); cap.setMatrixAt(i, dummy.matrix);
    });
    root.add(booth, cap);
  }

  const ADS = [
    [51.5160, -0.1000, '#ffd400', '#111111', 'QuickCash Loans', 'Money in 5 mins. Only 2% a week ❤️'],
    [51.5000, -0.0500, '#1b1340', '#ffffff', '$JOLLOF COIN 🚀', 'Guaranteed* to the moon. *not guaranteed'],
    [51.5020, -0.1050, '#7a0019', '#ffffff', 'PREST', 'Oat flat white, £4.20. Sorry.'],
    [51.5290, -0.1050, '#00ccbc', '#ffffff', 'Delivaroo', 'Ride with us. Rain or rain.'],
    [51.4750, -0.0900, '#c8102e', '#ffffff', 'PERI PALACE', 'Extra hot. Extra chips. Extra cheeky.'],
    [51.4000, -0.0900, '#f3f3f3', '#1d3557', 'Visa wahala?', 'Lunar House, Croydon. Bring snacks.'],
    [51.5230, -0.1700, '#000000', '#ffffff', 'Ubah', 'Surge pricing? Never heard of her.'],
    [51.4850, 0.0500, '#ffb703', '#3d1a00', 'OWAMBE SATURDAY', 'Woolwich. Aso-ebi compulsory.'],
    [51.4900, -0.2100, '#2b2d42', '#edf2f4', 'MIND THE RENT', 'Landlords love a "market review".'],
    [51.5250, -0.0500, '#ff4d6d', '#ffffff', 'Klarnu', 'Buy now. Cry later. 4 easy payments.'],
  ];
  function billboards() {
    for (const [lat, lon, bg, fg, big, sub] of ADS) {
      const tex = canvasTex(512, 256, (c, w, h) => {
        c.fillStyle = bg; c.fillRect(0, 0, w, h);
        c.fillStyle = fg; c.textAlign = 'left';
        c.font = '800 52px "Plus Jakarta Sans", system-ui, sans-serif'; c.fillText(big, 28, 110);
        c.font = '600 25px "Plus Jakarta Sans", system-ui, sans-serif'; c.globalAlpha = 0.85; c.fillText(sub, 28, 168); c.globalAlpha = 1;
        c.fillStyle = 'rgba(255,255,255,.9)'; c.fillRect(w - 64, 14, 48, 26);
        c.fillStyle = '#111'; c.font = '700 16px system-ui'; c.fillText('AD', w - 52, 33);
      });
      const g = groupAt(lat, lon, 1.1, 0);
      box(g, 0.18, 2.2, 0.18, '#333333', -1.6, 0, 0);
      box(g, 0.18, 2.2, 0.18, '#333333', 1.6, 0, 0);
      box(g, 4.6, 2.5, 0.25, '#1a1a1a', 0, 2.1, -0.05);
      const face = new THREE.Mesh(new THREE.PlaneGeometry(4.4, 2.2), new THREE.MeshBasicMaterial({ map: tex }));
      face.position.set(0, 3.35, 0.09);
      g.add(face);
      const [x, z] = at(lat, lon);
      occupied.push([x, z, 3]);
    }
  }

  // ------------------------------------------------------------ traffic

  function bus() {
    const g = new THREE.Group();
    box(g, 0.7, 1.1, 2, '#d52b1e', 0, 0.1, 0);
    box(g, 0.72, 0.18, 1.9, '#2b3440', 0, 0.45, 0);
    box(g, 0.72, 0.18, 1.9, '#2b3440', 0, 0.85, 0);
    return g;
  }
  function cab() {
    const g = new THREE.Group();
    box(g, 0.6, 0.45, 1.2, '#15171a', 0, 0.1, 0);
    box(g, 0.55, 0.3, 0.7, '#2d3540', 0, 0.55, -0.05);
    box(g, 0.2, 0.08, 0.15, '#ffcc00', 0, 0.85, -0.05);
    return g;
  }
  function spawnTraffic() {
    for (let i = 0; i < 40; i++) {
      const mesh = i % 3 === 0 ? cab() : bus();
      const e = EDGES[i % EDGES.length];
      vehicles.push({ mesh, from: e[0], to: e[1], t: Math.random(), speed: 0.05 + Math.random() * 0.05, side: Math.random() < 0.5 ? 0.35 : -0.35 });
      root.add(mesh);
    }
    for (let i = 0; i < 7; i++) {
      const g = new THREE.Group();
      box(g, 0.9, 0.4, 2.6, '#ffffff', 0, 0, 0);
      box(g, 0.7, 0.45, 1.2, i % 2 ? '#1d3557' : '#c0392b', 0, 0.4, -0.2);
      root.add(g);
      boats.push({ mesh: g, t: 0.28 + i * 0.06, speed: 0.0025 + (i % 3) * 0.001, dir: i % 2 ? 1 : -1 });
    }
  }
  function tickTraffic(dt) {
    for (const v of vehicles) {
      const A = LOCATIONS[v.from], B = LOCATIONS[v.to];
      const ax = wx(A.x), az = wz(A.y), bx = wx(B.x), bz = wz(B.y);
      const len = Math.hypot(bx - ax, bz - az);
      v.t += (v.speed * dt * 60) / Math.max(4, len);
      if (v.t >= 1) {
        const opts = [...(ADJ[v.to] || [])].filter((n) => n !== v.from);
        v.from = v.to;
        v.to = opts.length ? opts[Math.floor(Math.random() * opts.length)] : [...ADJ[v.from]][0];
        v.t = 0;
        continue;
      }
      const dx = bx - ax, dz = bz - az, l = len || 1;
      const nx = -dz / l, nz = dx / l;
      v.mesh.position.set(ax + dx * v.t + nx * v.side, 0.12, az + dz * v.t + nz * v.side);
      v.mesh.rotation.y = Math.atan2(dx, dz);
      const edge = 6 / l;
      v.mesh.visible = v.t > edge && v.t < 1 - edge;
    }
    const n = THAMES.length - 1;
    for (const b of boats) {
      b.t += b.speed * dt * b.dir;
      if (b.t > 0.95) b.t = 0.25;
      if (b.t < 0.25) b.t = 0.95;
      const f = b.t * n, i = Math.min(n - 1, Math.floor(f)), k = f - i;
      const [ax, az] = THAMES[i], [bx, bz] = THAMES[i + 1];
      const l = Math.hypot(bx - ax, bz - az) || 1;
      b.mesh.position.set(ax + (bx - ax) * k + (-(bz - az) / l) * 1.2 * b.dir, 0.12, az + (bz - az) * k + ((bx - ax) / l) * 1.2 * b.dir);
      b.mesh.rotation.y = Math.atan2(bx - ax, bz - az) + (b.dir < 0 ? Math.PI : 0);
    }
  }

  // ------------------------------------------------------------ clouds (only their shadows show)

  function makeClouds() {
    const m = new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false });
    const geo = new THREE.IcosahedronGeometry(1, 1);
    for (let i = 0; i < 14; i++) {
      const c = new THREE.Group();
      for (let k = 0; k < 5; k++) {
        const puff = new THREE.Mesh(geo, m);
        puff.scale.set(6 + (k % 3) * 2, 2.5, 5 + (k % 2) * 2);
        puff.position.set((k - 2) * 5, (k % 2) * 1.2, ((k * 7) % 5) - 2);
        puff.castShadow = true;
        puff.userData.cloud = true;
        c.add(puff);
      }
      c.position.set(-200 + i * 31, 34, -120 + ((i * 53) % 240));
      c.userData.speed = 1.2 + (i % 4) * 0.4;
      scene.add(c);
      clouds.push(c);
    }
  }

  // ------------------------------------------------------------ the player

  function makeAvatar(look) {
    const g = new THREE.Group();
    const model = Avatar.build(look, 'full');
    model.position.y = 3.8;
    model.traverse((o) => { if (o.isMesh) o.castShadow = true; });
    g.add(model);
    const ring = new THREE.Mesh(new THREE.RingGeometry(1.3, 1.75, 32), new THREE.MeshBasicMaterial({ color: '#20b26b', transparent: true, opacity: 0.9 }));
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.15;
    g.add(ring);
    g.scale.setScalar(0.48);
    return g;
  }
  function spotFor(loc) {
    const p = LOCATIONS[loc];
    return new THREE.Vector3(wx(p.x) + 1.4, 0.12, wz(p.y) + 4);
  }

  // ------------------------------------------------------------ other live players

  // Other players are drawn as floating portrait cards around the place they are in.
  const portraitTextures = new Map();
  function portraitTexture(look) {
    const key = JSON.stringify(look || {});
    if (!portraitTextures.has(key)) {
      const img = new Image();
      const tex = new THREE.Texture(img);
      tex.colorSpace = THREE.SRGBColorSpace;
      img.onload = () => { tex.needsUpdate = true; };
      img.src = Avatar.portrait(look || {});
      portraitTextures.set(key, tex);
    }
    return portraitTextures.get(key);
  }
  function hashAngle(id) {
    let h = 0;
    for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
    return (h % 360) * (Math.PI / 180);
  }
  function setPlayers(list) {
    const keep = new Set();
    const counts = {};
    for (const p of list.slice(0, 80)) {
      if (!p || !p.id || !LOCATIONS[p.loc]) continue;
      keep.add(p.id);
      counts[p.loc] = (counts[p.loc] || 0) + 1;
      const key = JSON.stringify(p.look || {});
      let o = others.get(p.id);
      if (!o || o.key !== key) {
        if (o) root.remove(o.sprite);
        const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: portraitTexture(p.look), transparent: true, depthWrite: false }));
        sprite.scale.set(3.2, 3.2, 1);
        sprite.renderOrder = 2;
        root.add(sprite);
        o = { sprite, key, loc: null };
        others.set(p.id, o);
      }
      if (o.loc !== p.loc) {
        o.loc = p.loc;
        const L = LOCATIONS[p.loc];
        const a = hashAngle(p.id) + counts[p.loc] * 0.7;
        const r = 5 + (counts[p.loc] % 3) * 1.4;
        o.sprite.position.set(wx(L.x) + Math.cos(a) * r, 2.2, wz(L.y) + Math.sin(a) * r * 0.8);
      }
    }
    for (const [id, o] of others) if (!keep.has(id)) { root.remove(o.sprite); others.delete(id); }
    for (const [id, el] of Object.entries(pins)) {
      let badge = el.querySelector('.pin-count');
      const n = counts[id] || 0;
      if (n && !badge) { badge = document.createElement('span'); badge.className = 'pin-count'; el.appendChild(badge); }
      if (badge) { if (n) badge.textContent = n > 99 ? '99+' : n; else badge.remove(); }
    }
  }

  // ------------------------------------------------------------ pins & labels

  function makePins() {
    pinLayer.innerHTML = '';
    for (const [id, p] of Object.entries(LOCATIONS)) {
      const el = document.createElement('button');
      el.className = 'pin';
      el.type = 'button';
      el.dataset.loc = id;
      el.setAttribute('aria-label', p.name);
      el.innerHTML = `<span class="pin-bubble">${p.icon}</span><span class="pin-name">${p.name}</span>`;
      el.addEventListener('click', (e) => { e.stopPropagation(); onSelect(id); });
      pinLayer.appendChild(el);
      pins[id] = el;
    }
    for (const m of monPins) {
      const el = document.createElement('span');
      el.className = 'mon-label';
      el.textContent = m.name;
      pinLayer.appendChild(el);
      m.el = el;
    }
  }
  const tmpV = new THREE.Vector3();
  function project(x, y, z, w, h) {
    tmpV.set(x, y, z).project(camera);
    return [(tmpV.x * 0.5 + 0.5) * w, (-tmpV.y * 0.5 + 0.5) * h, tmpV.z];
  }
  function placePins() {
    const w = renderer.domElement.clientWidth, h = renderer.domElement.clientHeight;
    for (const [id, el] of Object.entries(pins)) {
      const p = LOCATIONS[id];
      const [x, y, z] = project(wx(p.x), (heights[id] || 4) + 1.4, wz(p.y), w, h);
      const off = z > 1 || x < -60 || x > w + 60 || y < -60 || y > h + 60;
      el.style.transform = `translate(${x}px, ${y}px)`;
      el.style.visibility = off ? 'hidden' : 'visible';
    }
    const showMon = dist < 95;
    for (const m of monPins) {
      if (!showMon) { m.el.style.visibility = 'hidden'; continue; }
      const [x, y, z] = project(m.x, m.y, m.z, w, h);
      const off = z > 1 || x < -80 || x > w + 80 || y < -40 || y > h + 40;
      m.el.style.transform = `translate(${x}px, ${y}px)`;
      m.el.style.visibility = off ? 'hidden' : 'visible';
    }
  }

  // ------------------------------------------------------------ camera & input

  let shadowSize = 0;
  function updateSun() {
    const off = new THREE.Vector3(-0.5, 1, 0.38).normalize().multiplyScalar(160);
    sun.position.copy(target).add(off);
    sun.target.position.copy(target);
    const size = Math.round(Math.max(30, Math.min(170, dist * 0.85)) / 5) * 5;
    if (size !== shadowSize) {
      shadowSize = size;
      const c = sun.shadow.camera;
      c.left = -size; c.right = size; c.top = size; c.bottom = -size;
      c.near = 20; c.far = 360;
      c.updateProjectionMatrix();
    }
  }

  function updateCamera() {
    camera.position.set(target.x, target.y + Math.sin(PITCH) * dist, target.z + Math.cos(PITCH) * dist);
    camera.lookAt(target);
  }
  function clampTarget() {
    target.x = Math.max(-240, Math.min(240, target.x));
    target.z = Math.max(-160, Math.min(175, target.z));
    dist = Math.max(22, Math.min(330, dist));
  }
  function bindInput(el) {
    const ptrs = new Map();
    let moved = 0, downAt = 0, pinchStart = 0, distStart = 0;
    el.addEventListener('pointerdown', (e) => {
      el.setPointerCapture(e.pointerId);
      ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
      moved = 0; downAt = performance.now();
      goalTarget = goalDist = null;
      if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; pinchStart = Math.hypot(a.x - b.x, a.y - b.y); distStart = dist; }
    });
    el.addEventListener('pointermove', (e) => {
      const prev = ptrs.get(e.pointerId);
      if (!prev) { el.style.cursor = pickPlace(e) ? 'pointer' : 'grab'; return; }
      const dx = e.clientX - prev.x, dy = e.clientY - prev.y;
      ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
      moved += Math.abs(dx) + Math.abs(dy);
      if (ptrs.size === 1) {
        const wpp = (2 * dist * Math.tan((FOV * Math.PI) / 360)) / el.clientHeight;
        target.x -= dx * wpp;
        target.z -= (dy * wpp) / Math.sin(PITCH);
      } else if (ptrs.size === 2) {
        const [a, b] = [...ptrs.values()];
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        if (pinchStart) dist = (distStart * pinchStart) / d;
      }
      clampTarget();
    });
    el.addEventListener('pointerup', (e) => {
      const wasTap = ptrs.size === 1 && moved < 8 && performance.now() - downAt < 450;
      ptrs.delete(e.pointerId);
      if (ptrs.size < 2) pinchStart = 0;
      if (wasTap) { const id = pickPlace(e); if (id) onSelect(id); }
    });
    el.addEventListener('pointercancel', (e) => ptrs.delete(e.pointerId));
    el.addEventListener('wheel', (e) => {
      e.preventDefault();
      goalDist = null;
      dist *= 1 + Math.max(-0.3, Math.min(0.3, e.deltaY * 0.0015));
      clampTarget();
    }, { passive: false });
  }
  function pickPlace(e) {
    const r = renderer.domElement.getBoundingClientRect();
    const v = new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(v, camera);
    const hit = ray.intersectObjects(plots.map((p) => p.mesh))[0];
    return hit ? hit.object.userData.loc : null;
  }

  // ------------------------------------------------------------ weather & time

  function makeRain() {
    const n = 1600;
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { pos[i * 3] = (Math.random() - 0.5) * 140; pos[i * 3 + 1] = Math.random() * 40; pos[i * 3 + 2] = (Math.random() - 0.5) * 100; }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    rain = new THREE.Points(geo, new THREE.PointsMaterial({ color: '#9fb7d6', size: 0.25, transparent: true, opacity: 0.7 }));
    rain.visible = false;
    scene.add(rain);
  }
  const DAY_BG = new THREE.Color('#a9c98a'), NIGHT_BG = new THREE.Color('#1c2a44');
  function setTime(hourFloat, weather) {
    let light;
    if (hourFloat >= 7 && hourFloat < 18) light = 1;
    else if (hourFloat >= 5 && hourFloat < 7) light = 0.35 + (hourFloat - 5) * 0.325;
    else if (hourFloat >= 18 && hourFloat < 21) light = 1 - (hourFloat - 18) * 0.22;
    else light = 0.16;
    const grey = weather === 'rain' || weather === 'grey' ? 0.8 : 1;
    hemi.intensity = 0.25 + 0.45 * light * grey;
    sun.intensity = 0.15 + 3.1 * light * grey;
    sun.color.set(light < 0.75 ? '#ffc58f' : '#fff3e2');
    scene.environmentIntensity = 0.15 + 0.35 * light;
    scene.background = NIGHT_BG.clone().lerp(DAY_BG, light);
    scene.fog.color.copy(scene.background);
    nightLevel = Math.max(0, Math.min(1, (0.85 - light) / 0.5));
    for (const m of nightMats) m.emissiveIntensity = nightLevel * 1.6;
    if (bloomPass) bloomPass.strength = 0.12 + nightLevel * 0.55;
    rainOn = weather === 'rain';
    if (rain) rain.visible = rainOn;
  }

  // ------------------------------------------------------------ loop

  function frame(now) {
    const dt = Math.min(0.25, (now - lastTime) / 1000);
    lastTime = now;
    if (attract) {
      attractT += dt * 0.04;
      target.x = Math.sin(attractT) * 45;
      target.z = Math.cos(attractT * 0.7) * 14;
    }
    if (goalTarget) { target.lerp(goalTarget, Math.min(1, dt * 4)); if (target.distanceTo(goalTarget) < 0.05) goalTarget = null; }
    if (goalDist) { dist += (goalDist - dist) * Math.min(1, dt * 4); if (Math.abs(goalDist - dist) < 0.1) goalDist = null; }
    updateCamera();
    updateSun();
    for (const c of clouds) {
      c.position.x += c.userData.speed * dt * 3;
      if (c.position.x > target.x + 220) c.position.x = target.x - 220;
      if (c.position.x < target.x - 220) c.position.x = target.x + 220;
    }
    tickTraffic(dt);
    for (const s of spinners) s.rotation.z += dt * 0.06;
    for (const o of others.values()) o.sprite.position.y = 2.2 + Math.sin(now / 600 + o.sprite.position.x) * 0.15;
    if (avatar) {
      if (avatarAnim) {
        const k = Math.min(1, (now - avatarAnim.start) / avatarAnim.ms);
        const e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
        avatar.position.lerpVectors(avatarAnim.from, avatarAnim.to, e);
        avatar.position.y = 0.12 + Math.sin(k * Math.PI) * Math.min(14, avatarAnim.len * 0.15);
        if (!goalTarget) target.lerp(new THREE.Vector3(avatar.position.x, 0, avatar.position.z - 2), Math.min(1, dt * 3));
        if (k >= 1) { avatarAnim.done(); avatarAnim = null; }
      } else {
        avatar.position.y = 0.12 + Math.abs(Math.sin(now / 380)) * 0.1;
        avatar.rotation.y += (0.35 - avatar.rotation.y) * Math.min(1, dt * 3);
      }
    }
    if (rainOn && rain) {
      const pos = rain.geometry.attributes.position;
      for (let i = 0; i < pos.count; i++) { let y = pos.getY(i) - dt * 40; if (y < 0) y += 40; pos.setY(i, y); }
      pos.needsUpdate = true;
      rain.position.set(target.x, 0, target.z);
    }
    if (composer) composer.render(dt); else renderer.render(scene, camera);
    placePins();
    requestAnimationFrame(frame);
  }
  function resize() {
    const el = renderer.domElement.parentElement;
    renderer.setSize(el.clientWidth, el.clientHeight, false);
    camera.aspect = el.clientWidth / el.clientHeight;
    camera.updateProjectionMatrix();
    if (composer) composer.setSize(el.clientWidth, el.clientHeight);
  }

  // ------------------------------------------------------------ graphics quality

  const QUALITY_KEY = 'london-hustle-graphics';
  function defaultQuality() {
    const phone = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
    return phone || window.innerWidth < 760 ? 'medium' : 'high';
  }
  // high: shadows, ambient occlusion and bloom. medium: shadows and bloom. low: none.
  function applyQuality(q) {
    quality = q;
    const dpr = window.devicePixelRatio || 1;
    renderer.setPixelRatio(q === 'high' ? Math.min(dpr, 2) : q === 'medium' ? Math.min(dpr, 1.5) : 1);
    renderer.shadowMap.enabled = q !== 'low';
    sun.castShadow = q !== 'low';
    sun.shadow.mapSize.set(q === 'high' ? 2048 : 1024, q === 'high' ? 2048 : 1024);
    if (sun.shadow.map) { sun.shadow.map.dispose(); sun.shadow.map = null; }
    composer = null; bloomPass = null;
    const el = renderer.domElement.parentElement;
    const w = el.clientWidth, h = el.clientHeight;
    if (q !== 'low') {
      composer = new FX.EffectComposer(renderer);
      composer.addPass(new FX.RenderPass(scene, camera));
      if (q === 'high') {
        const ao = new FX.GTAOPass(scene, camera, w, h);
        ao.blendIntensity = 0.85;
        composer.addPass(ao);
      }
      bloomPass = new FX.UnrealBloomPass(new THREE.Vector2(w, h), 0.12 + nightLevel * 0.55, 0.55, 0.86);
      composer.addPass(bloomPass);
      composer.addPass(new FX.OutputPass());
    }
    resize();
    // Materials compile differently with and without shadows
    root.traverse((o) => { if (o.material) [].concat(o.material).forEach((m) => { m.needsUpdate = true; }); });
  }

  // A sky scene used to light and reflect the city (water and glass pick it up).
  function skyEnvironment() {
    const sky = new THREE.Scene();
    const tex = canvasTex(16, 256, (g, w, h) => {
      const gr = g.createLinearGradient(0, 0, 0, h);
      gr.addColorStop(0, '#5f9ee8'); gr.addColorStop(0.48, '#bcd9f4'); gr.addColorStop(0.52, '#e9e4d6'); gr.addColorStop(1, '#8a9a7a');
      g.fillStyle = gr; g.fillRect(0, 0, w, h);
    });
    sky.add(new THREE.Mesh(new THREE.SphereGeometry(50, 32, 16), new THREE.MeshBasicMaterial({ map: tex, side: THREE.BackSide })));
    const sunDisc = new THREE.Mesh(new THREE.SphereGeometry(4, 16, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(6, 5.6, 4.8) }));
    sunDisc.position.set(-22, 34, 16);
    sky.add(sunDisc);
    const pmrem = new THREE.PMREMGenerator(renderer);
    const env = pmrem.fromScene(sky, 0.02).texture;
    pmrem.dispose();
    return env;
  }

  // ------------------------------------------------------------ public API

  return {
    init(container, pinContainer) {
      pinLayer = pinContainer;
      renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.0;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      renderer.domElement.className = 'world-canvas';
      container.appendChild(renderer.domElement);
      scene = new THREE.Scene();
      scene.background = DAY_BG.clone();
      scene.fog = new THREE.Fog(DAY_BG.clone(), 260, 620);
      camera = new THREE.PerspectiveCamera(FOV, 1, 1, 900);
      scene.environment = skyEnvironment();
      hemi = new THREE.HemisphereLight('#dfefff', '#7f9a68', 1.0);
      sun = new THREE.DirectionalLight('#fff3e2', 2.6);
      sun.shadow.bias = -0.0005;
      sun.shadow.normalBias = 0.04;
      scene.add(hemi, sun, sun.target);
      root = new THREE.Group();
      scene.add(root);

      const ground = new THREE.Mesh(new THREE.PlaneGeometry(1400, 1000), mat('#97c06c', { roughness: 0.95 }));
      ground.rotation.x = -Math.PI / 2;
      root.add(ground);
      ribbon(THAMES, RIVER_W + 1.4, '#cdbf98', 0.03);
      ribbon(THAMES, RIVER_W, WATER(), 0.07);
      buildParks();
      buildRoads();
      for (const id of Object.keys(LOCATIONS)) {
        const p = LOCATIONS[id];
        const g = groupAt(p.lat, p.lon, id === 'heathrow' ? 1 : 0.85);
        if (HUB[id]) HUB[id](g);
        const bb = new THREE.Box3().setFromObject(g);
        heights[id] = Math.max(2, bb.max.y);
        const size = bb.getSize(new THREE.Vector3());
        const hit = new THREE.Mesh(new THREE.BoxGeometry(Math.max(6, size.x), Math.max(3, size.y), Math.max(5, size.z)), new THREE.MeshBasicMaterial({ visible: false }));
        hit.position.set(wx(p.x), Math.max(3, size.y) / 2, wz(p.y));
        hit.userData.loc = id;
        root.add(hit);
        plots.push({ id, mesh: hit });
      }
      buildMonuments();
      billboards();
      filler();
      streetProps();
      flatLabel('RIVER THAMES', ...at(51.4905, -0.2300), 3, 0.25, 'rgba(255,255,255,.8)');
      flatLabel('THE CITY', ...at(51.5185, -0.0900), 1.4, 0, 'rgba(90,110,80,.5)');
      flatLabel('WEST END', ...at(51.5175, -0.1330), 1.4, 0, 'rgba(90,110,80,.5)');
      flatLabel('EAST LONDON', ...at(51.5300, 0.0300), 2.4, 0, 'rgba(90,110,80,.45)');
      flatLabel('SOUTH LONDON', ...at(51.4450, -0.1000), 2.4, 0, 'rgba(90,110,80,.45)');
      flatLabel('NORTH LONDON', ...at(51.5700, -0.1100), 2.4, 0, 'rgba(90,110,80,.45)');
      flatLabel('WEST LONDON', ...at(51.5100, -0.2700), 2.4, 0, 'rgba(90,110,80,.45)');
      spawnTraffic();
      makeRain();
      makeClouds();
      root.traverse((o) => {
        if (!o.isMesh) return;
        o.receiveShadow = !o.userData.noShadow;
        o.castShadow = !o.userData.flat && !o.userData.noShadow;
      });
      ground.castShadow = false;
      makePins();
      bindInput(renderer.domElement);
      window.addEventListener('resize', resize);
      let saved = null;
      try { saved = localStorage.getItem(QUALITY_KEY); } catch (e) { saved = null; }
      applyQuality(['high', 'medium', 'low'].includes(saved) ? saved : defaultQuality());
      setTime(12, 'sun');
      requestAnimationFrame(frame);
    },
    onSelect(cb) { onSelect = cb; },
    setAttract(on) {
      attract = on;
      if (on) { goalDist = 150; if (avatar) avatar.visible = false; } else if (avatar) avatar.visible = true;
    },
    setAvatar(look, loc) {
      if (avatar) root.remove(avatar);
      avatar = makeAvatar(look);
      avatar.position.copy(spotFor(loc));
      avatarLoc = loc;
      root.add(avatar);
    },
    moveAvatar(loc, ms = 1300) {
      if (!avatar || loc === avatarLoc) return Promise.resolve();
      const from = avatar.position.clone(), to = spotFor(loc);
      avatar.rotation.y = Math.atan2(to.x - from.x, to.z - from.z);
      avatarLoc = loc;
      return new Promise((done) => { avatarAnim = { from, to, ms, len: from.distanceTo(to), start: performance.now(), done }; });
    },
    focus(loc, zoom) {
      const p = LOCATIONS[loc];
      goalTarget = new THREE.Vector3(wx(p.x), 0, wz(p.y) + 1);
      if (zoom) goalDist = zoom;
    },
    setTime,
    setPlayers,
    getQuality: () => quality,
    setQuality(q) {
      try { localStorage.setItem(QUALITY_KEY, q); } catch (e) { /* storage unavailable */ }
      applyQuality(q);
    },
    // Point the camera at a real-world spot (used for screenshots and tests).
    lookAt(lat, lon, d) { const [x, z] = at(lat, lon); goalTarget = new THREE.Vector3(x, 0, z); if (d) goalDist = d; },
    markPins(here, home, selected) {
      for (const [id, el] of Object.entries(pins)) {
        el.classList.toggle('here', id === here);
        el.classList.toggle('home', id === home);
        el.classList.toggle('selected', id === selected);
        el.querySelector('.pin-bubble').textContent = id === home ? '🏠' : LOCATIONS[id].icon;
      }
    },
  };
})();
