'use strict';
// The 3D low-poly London: ground, Thames, roads, landmarks, traffic, billboards and the player.
// Uses the global THREE (r128). Exposes a small World API the game UI talks to.

const World = (() => {
  const SCALE = 8;
  const wx = (x) => (x - 500) / SCALE;
  const wz = (y) => (y - 310) / SCALE;
  const PITCH = 0.98; // camera tilt, radians from horizontal
  const FOV = 34;

  let renderer, scene, camera, root, pinLayer;
  let hemi, sun, rain = null, rainOn = false;
  const target = new THREE.Vector3(0, 0, 4);
  let dist = 95, goalTarget = null, goalDist = null;
  let attract = false, attractT = 0;
  const pins = {};
  const plots = []; // { id, mesh } invisible hit boxes
  const heights = {};
  let onSelect = () => {};
  let avatar = null, avatarAnim = null, avatarLoc = null;
  const vehicles = [];
  const boats = [];
  let lastTime = performance.now();
  const ray = new THREE.Raycaster();

  // ------------------------------------------------------------ materials & helpers

  const mats = {};
  function mat(color, opts = {}) {
    const key = color + JSON.stringify(opts);
    if (!mats[key]) mats[key] = new THREE.MeshLambertMaterial({ color, ...opts });
    return mats[key];
  }

  function canvasTex(w, h, draw) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    draw(c.getContext('2d'), w, h);
    const t = new THREE.CanvasTexture(c);
    t.anisotropy = 4;
    return t;
  }

  const windowTex = canvasTex(64, 64, (g) => {
    g.fillStyle = '#ffffff'; g.fillRect(0, 0, 64, 64);
    g.fillStyle = '#56657a'; g.fillRect(12, 10, 40, 34);
    g.fillStyle = '#8fa3bd'; g.fillRect(12, 10, 18, 34);
  });
  windowTex.wrapS = windowTex.wrapT = THREE.RepeatWrapping;
  const winMats = {};
  function winMat(color, rx, ry) {
    const key = `${color}|${rx}|${ry}`;
    if (!winMats[key]) {
      const t = windowTex.clone();
      t.needsUpdate = true;
      t.repeat.set(rx, ry);
      winMats[key] = new THREE.MeshLambertMaterial({ color, map: t });
    }
    return winMats[key];
  }

  const BOX = new THREE.BoxGeometry(1, 1, 1);
  function box(parent, w, h, d, color, x = 0, y = 0, z = 0) {
    const m = new THREE.Mesh(BOX, typeof color === 'string' ? mat(color) : color);
    m.scale.set(w, h, d);
    m.position.set(x, y + h / 2, z);
    parent.add(m);
    return m;
  }

  // A building with window texture on the sides and a flat roof.
  function building(parent, w, h, d, color, x = 0, z = 0, roof = '#d9d6cf') {
    const side = winMat(color, Math.max(1, Math.round(w / 1.1)), Math.max(1, Math.round(h / 1.1)));
    const sideD = winMat(color, Math.max(1, Math.round(d / 1.1)), Math.max(1, Math.round(h / 1.1)));
    const top = mat(roof);
    const geo = new THREE.BoxGeometry(w, h, d);
    const m = new THREE.Mesh(geo, [sideD, sideD, top, top, side, side]);
    m.position.set(x, h / 2, z);
    parent.add(m);
    box(parent, w + 0.15, 0.18, d + 0.15, roof, x, h, z);
    return m;
  }

  function cyl(parent, rt, rb, h, color, x = 0, y = 0, z = 0, seg = 8) {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat(color));
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

  const TREE_TOP = new THREE.IcosahedronGeometry(1, 0);
  function tree(parent, x, z, s = 1, color = '#3f9b4a') {
    cyl(parent, 0.12 * s, 0.16 * s, 0.8 * s, '#7a5a3a', x, 0, z, 5);
    const t = new THREE.Mesh(TREE_TOP, mat(color));
    t.scale.setScalar(0.85 * s);
    t.position.set(x, 1.3 * s, z);
    t.rotation.set(Math.random(), Math.random(), 0);
    parent.add(t);
  }

  function plot(parent, w, d, color = '#ecebe4') {
    box(parent, w, 0.08, d, color, 0, 0.02, 0);
  }

  function group(id) {
    const p = LOCATIONS[id];
    const g = new THREE.Group();
    g.position.set(wx(p.x), 0, wz(p.y));
    root.add(g);
    return g;
  }

  function flatLabel(text, x, z, size = 5, rot = 0, color = 'rgba(255,255,255,.85)') {
    const tex = canvasTex(1024, 128, (g, w, h) => {
      g.font = '800 84px "Plus Jakarta Sans", system-ui, sans-serif';
      g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillStyle = color;
      g.letterSpacing = '18px';
      g.fillText(text, w / 2, h / 2);
    });
    const m = new THREE.Mesh(new THREE.PlaneGeometry(size * 8, size), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false }));
    m.rotation.x = -Math.PI / 2;
    m.rotation.z = rot;
    m.position.set(x, 0.12, z);
    root.add(m);
  }

  // ------------------------------------------------------------ geography

  const RIVER = [[-300, 470], [0, 455], [120, 445], [200, 465], [280, 430], [340, 398], [400, 362], [470, 345], [520, 337],
    [565, 346], [610, 360], [655, 378], [680, 410], [720, 418], [758, 400], [770, 366], [805, 358], [850, 372], [885, 386], [1000, 370], [1300, 368]]
    .map(([x, y]) => [wx(x), wz(y)]);
  const RIVER_W = 5.2;

  function distToSeg(px, pz, ax, az, bx, bz) {
    const dx = bx - ax, dz = bz - az;
    const t = Math.max(0, Math.min(1, ((px - ax) * dx + (pz - az) * dz) / (dx * dx + dz * dz)));
    return Math.hypot(px - (ax + t * dx), pz - (az + t * dz));
  }
  const riverDist = (x, z) => Math.min(...RIVER.slice(1).map((p, i) => distToSeg(x, z, RIVER[i][0], RIVER[i][1], p[0], p[1])));

  function ribbon(points, width, color, y, parent = root) {
    const m = mat(color);
    for (let i = 0; i < points.length - 1; i++) {
      const [ax, az] = points[i], [bx, bz] = points[i + 1];
      const len = Math.hypot(bx - ax, bz - az);
      const seg = new THREE.Mesh(BOX, m);
      seg.scale.set(width, 0.1, len);
      seg.position.set((ax + bx) / 2, y, (az + bz) / 2);
      seg.rotation.y = Math.atan2(bx - ax, bz - az);
      parent.add(seg);
      const joint = new THREE.Mesh(new THREE.CylinderGeometry(width / 2, width / 2, 0.1, 16), m);
      joint.position.set(bx, y, bz);
      parent.add(joint);
    }
  }

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
        ribbon([[wx(A.x), wz(A.y)], [wx(B.x), wz(B.y)]], 1.6, '#8e949b', 0.1);
      }
    }
  }

  // ------------------------------------------------------------ landmarks

  const BUILD = {
    heathrow(g) {
      plot(g, 18, 12, '#dfe3e6');
      box(g, 18, 0.1, 2.4, '#4a5058', 0, 0.06, 3.5);
      for (let i = -8; i < 9; i += 2) box(g, 1, 0.1, 0.2, '#ffffff', i, 0.1, 3.5);
      building(g, 10, 2.2, 3.2, '#bcd4e6', 0, -2.5, '#e9edf0');
      cyl(g, 0.5, 0.7, 4.5, '#e9edf0', 6.5, 0, -2.5, 8);
      box(g, 1.8, 0.9, 1.8, '#2f3a45', 6.5, 4.5, -2.5);
      // plane
      const pl = new THREE.Group();
      const body = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 5, 10), mat('#ffffff'));
      body.rotation.z = Math.PI / 2; pl.add(body);
      box(pl, 1.2, 0.12, 5, '#ffffff', 0, -0.05, 0);
      box(pl, 0.7, 1.1, 0.12, '#d52b1e', -2.2, 0.1, 0);
      pl.position.set(-3, 0.8, 3.5);
      g.add(pl);
      return 5;
    },
    hydepark(g) {
      plot(g, 16, 9, '#a9d88a');
      const pond = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 0.1, 24), mat('#5fb0e6'));
      pond.scale.set(4.2, 1, 1.4); pond.position.set(0.5, 0.1, 1.2); pond.rotation.y = -0.3; g.add(pond);
      for (let i = 0; i < 22; i++) {
        const x = (Math.random() - 0.5) * 15, z = (Math.random() - 0.5) * 8;
        if (Math.hypot((x - 0.5) / 4.6, (z - 1.2) / 1.8) > 1) tree(g, x, z, 0.8 + Math.random() * 0.5, Math.random() < 0.5 ? '#3f9b4a' : '#58b05a');
      }
      return 3;
    },
    chelsea(g) {
      plot(g, 12, 8);
      for (let i = 0; i < 5; i++) {
        building(g, 2, 3.2, 2.6, '#f4efe6', -4.5 + i * 2.2, -1.6, '#3d4650');
        box(g, 0.6, 0.6, 0.3, ['#c0392b', '#1f6f8b', '#2d6a4f', '#f2b134', '#6c4ab6'][i], -4.5 + i * 2.2, 0, -0.2);
      }
      box(g, 11, 0.12, 1.4, '#c8a27a', 0, 0.06, 2);
      tree(g, -4, 3, 0.8); tree(g, 0, 3, 0.8); tree(g, 4, 3, 0.8);
      return 4.5;
    },
    oxford(g) {
      plot(g, 12, 9);
      building(g, 5, 4, 3.4, '#e7d3b0', -3, -1.8);
      building(g, 4.5, 5.5, 3.4, '#c9d6df', 2.5, -1.8);
      const cols = ['#d52b1e', '#ffffff', '#1d3557', '#f4a261', '#2a9d8f'];
      for (let i = 0; i < 5; i++) box(g, 1.6, 0.25, 0.9, cols[i], -4.4 + i * 2.2, 1.6, 0.2);
      for (let i = 0; i < 6; i++) box(g, 0.4, 0.9, 0.4, ['#1d3557', '#e63946', '#f1faee'][i % 3], -4 + i * 1.6, 0, 2.6);
      return 6.5;
    },
    soho(g) {
      plot(g, 11, 9);
      building(g, 4.2, 3.6, 3.4, '#a8323e', -2.6, -1.8, '#5b1a21');
      const sign = canvasTex(256, 64, (c, w, h) => { c.fillStyle = '#111'; c.fillRect(0, 0, w, h); c.fillStyle = '#ffd84d'; c.font = '800 36px system-ui'; c.textAlign = 'center'; c.fillText('★ MUSICAL ★', w / 2, 46); });
      const s = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 0.9), new THREE.MeshBasicMaterial({ map: sign }));
      s.position.set(-2.6, 2.4, -0.05); g.add(s);
      building(g, 2.4, 2.8, 2.4, '#6b4f3a', 2.2, -2.2, '#3a2a1e');
      building(g, 2.2, 3.4, 2.4, '#d9c7a7', 4.4, 1.2);
      box(g, 2.6, 0.2, 1, '#2d6a4f', 2.2, 1.6, -0.6);
      return 4.5;
    },
    southbank(g) {
      plot(g, 14, 10);
      // Houses of Parliament + Big Ben (north side of the plot, by the river)
      building(g, 7, 2.4, 2, '#d8c49a', -2.5, -3.2, '#7f8c6a');
      for (let i = -5.5; i < 1; i += 1.4) cone(g, 0.25, 0.9, '#7f8c6a', i, 2.5, -3.2, 4);
      box(g, 1.3, 7.5, 1.3, '#d8c49a', 2, 0, -3.2);
      box(g, 1.5, 1.5, 1.5, '#cdb683', 2, 7.5, -3.2);
      const face = new THREE.Mesh(new THREE.CircleGeometry(0.55, 20), mat('#ffffff'));
      face.position.set(2, 8.25, -2.44); g.add(face);
      cone(g, 0.95, 2.4, '#5a6b4f', 2, 9, -3.2, 4);
      // London Eye
      const eye = new THREE.Group();
      const ring = new THREE.Mesh(new THREE.TorusGeometry(4, 0.12, 6, 48), mat('#f4f6f8'));
      eye.add(ring);
      for (let i = 0; i < 16; i++) {
        const a = (i / 16) * Math.PI * 2;
        const spoke = new THREE.Mesh(BOX, mat('#dfe5ea'));
        spoke.scale.set(0.05, 4, 0.05);
        spoke.position.set(Math.cos(a) * 2, Math.sin(a) * 2, 0);
        spoke.rotation.z = a - Math.PI / 2;
        eye.add(spoke);
        const pod = new THREE.Mesh(new THREE.SphereGeometry(0.28, 8, 6), mat('#bfe3f5'));
        pod.position.set(Math.cos(a) * 4, Math.sin(a) * 4, 0);
        eye.add(pod);
      }
      eye.position.set(-3.5, 4.4, 2.2);
      eye.rotation.y = 0.5;
      eye.userData.spin = true;
      g.add(eye);
      box(g, 0.4, 4.4, 0.4, '#dfe5ea', -3.5, 0, 2.2);
      return 11.5;
    },
    camden(g) {
      plot(g, 12, 9);
      const cols = ['#e63946', '#f4a261', '#2a9d8f', '#e9c46a', '#6c4ab6', '#1d9bf0', '#ff70a6', '#70d6ff'];
      for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) {
        box(g, 1.9, 0.6, 1.7, cols[(r * 4 + c) % cols.length], -4.2 + c * 2.3, 0.05, -2.6 + r * 2.1);
      }
      box(g, 12, 0.08, 1.4, '#5fb0e6', 0, 0.06, 3.6);
      const boat = box(g, 3, 0.6, 0.8, '#2d6a4f', 2, 0.1, 3.6);
      box(g, 1.6, 0.5, 0.6, '#e9c46a', 2.2, 0.7, 3.6);
      void boat;
      return 3;
    },
    kingscross(g) {
      plot(g, 12, 9);
      building(g, 5, 3, 3.6, '#b5533c', -3, -1.6, '#7c3a2a');
      const shed = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.2, 6, 14, 1, false, 0, Math.PI), mat('#c9d3dc'));
      shed.rotation.z = Math.PI / 2; shed.rotation.y = Math.PI / 2;
      shed.position.set(2.8, 0.2, -1.5); g.add(shed);
      box(g, 1.2, 4.2, 1.2, '#d8c49a', 5.4, 0, 1.6);
      cone(g, 0.8, 1.2, '#7f8c6a', 5.4, 4.2, 1.6, 4);
      return 5.5;
    },
    city(g) {
      plot(g, 13, 10);
      // The Gherkin
      const gherkin = new THREE.Mesh(new THREE.SphereGeometry(1.6, 10, 12), mat('#4f7f8f'));
      gherkin.scale.set(1, 3.4, 1); gherkin.position.set(-3, 5.4, -1.5); g.add(gherkin);
      // St Paul's
      building(g, 3.6, 2.4, 3, '#efe8d8', 1.5, 2.2, '#cfc6b2');
      const dome = new THREE.Mesh(new THREE.SphereGeometry(1.2, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), mat('#9fb3b8'));
      dome.position.set(1.5, 2.6, 2.2); g.add(dome);
      cone(g, 0.2, 0.8, '#d4af37', 1.5, 3.7, 2.2, 6);
      // Walkie talkie + towers
      building(g, 2.6, 8, 2.4, '#7a9bb3', 3.5, -2.6);
      building(g, 2.2, 6, 2.2, '#9fb6c8', 0.4, -3);
      building(g, 1.8, 4.5, 1.8, '#c6c2b8', -5, 2.6);
      return 10.5;
    },
    shoreditch(g) {
      plot(g, 11, 9);
      building(g, 4, 2.8, 3, '#9c5a3c', -2.8, -1.8, '#4e2d1e');
      const art = canvasTex(256, 128, (c, w, h) => {
        const cs = ['#ff006e', '#ffbe0b', '#3a86ff', '#8338ec', '#06d6a0'];
        for (let i = 0; i < 18; i++) { c.fillStyle = cs[i % 5]; c.beginPath(); c.arc(Math.random() * w, Math.random() * h, 10 + Math.random() * 26, 0, 7); c.fill(); }
      });
      const wall = new THREE.Mesh(new THREE.PlaneGeometry(4, 2.6), new THREE.MeshBasicMaterial({ map: art }));
      wall.position.set(-2.8, 1.35, -0.29); g.add(wall);
      const cols = ['#111111', '#e63946', '#2a9d8f', '#f4a261'];
      for (let i = 0; i < 4; i++) box(g, 2.4, 1.1, 1.1, cols[i], 2.6, (i % 2) * 1.1, -2.8 + Math.floor(i / 2) * 1.3);
      building(g, 2.6, 3.4, 2.4, '#d8d2c8', 2.6, 2.2);
      return 4;
    },
    stratford(g) {
      plot(g, 14, 10);
      const bowl = new THREE.Mesh(new THREE.CylinderGeometry(4.2, 3.6, 2, 24, 1, true), mat('#eef1f4', { side: THREE.DoubleSide }));
      bowl.scale.set(1.25, 1, 1); bowl.position.set(-2, 1, -0.5); g.add(bowl);
      const pitch = new THREE.Mesh(new THREE.CylinderGeometry(3.4, 3.4, 0.1, 24), mat('#6ab04c'));
      pitch.scale.set(1.25, 1, 1); pitch.position.set(-2, 0.15, -0.5); g.add(pitch);
      const orbit = new THREE.Mesh(new THREE.TorusKnotGeometry(0.9, 0.18, 64, 6, 2, 5), mat('#c0392b'));
      orbit.scale.set(1, 3.4, 1); orbit.position.set(4.4, 4.2, 1.5); g.add(orbit);
      cyl(g, 0.9, 0.9, 0.5, '#7f1d1d', 4.4, 7.4, 1.5, 12);
      return 9;
    },
    canary(g) {
      plot(g, 12, 9);
      building(g, 2.8, 13, 2.8, '#b8c7d4', 0, -1);
      cone(g, 2, 2.2, '#dfe6ec', 0, 13.2, -1, 4);
      building(g, 2.4, 10, 2.4, '#8faabf', -3.5, 1);
      building(g, 2.4, 9, 2.6, '#a9bccb', 3.5, 1.2);
      building(g, 2, 6, 2, '#6f8ea8', 3.6, -2.8);
      return 16;
    },
    woolwich(g) {
      plot(g, 12, 9);
      for (let i = 0; i < 4; i++) {
        const c = ['#c97b5a', '#d9a066', '#b5654b', '#e0b48a'][i];
        building(g, 2.2, 2.4, 2.4, c, -4 + i * 2.4, -2.2, '#6b3f2a');
        cone(g, 1.7, 1, '#6b3f2a', -4 + i * 2.4, 2.4, -2.2, 4);
      }
      box(g, 3, 1.6, 2.2, '#00843d', 2.5, 0, 1.8);
      box(g, 1, 1.6, 2.2, '#ffffff', 4.5, 0, 1.8);
      box(g, 3.4, 0.25, 0.9, '#f4c430', 2.6, 1.6, 0.6);
      tree(g, -4.5, 2.5, 0.9); tree(g, -2, 2.8, 0.8);
      return 4.5;
    },
    peckham(g) {
      plot(g, 12, 9);
      building(g, 6, 3.6, 4, '#8d9196', 2, -1.2, '#6c7075');
      const cols = ['#ff6b6b', '#ffd93d', '#6bcB77', '#4d96ff'];
      for (let i = 0; i < 4; i++) {
        cyl(g, 0.05, 0.05, 1, '#444', -0.2 + i * 1.4, 3.8, -1.2, 4);
        cone(g, 0.7, 0.4, cols[i], -0.2 + i * 1.4, 4.7, -1.2, 8);
      }
      for (let i = 0; i < 3; i++) building(g, 2, 2.6, 2.2, ['#c06c52', '#d4a373', '#a3b18a'][i], -4.4 + i * 2.2, 2.4, '#5c3d2e');
      return 5.5;
    },
    brixton(g) {
      plot(g, 11, 9);
      building(g, 4.6, 3.4, 3, '#e9dcc2', -2.4, -2, '#7c6a4f');
      const cols = ['#009b3a', '#fed100', '#000000', '#e63946', '#2a9d8f', '#f4a261'];
      for (let i = 0; i < 6; i++) box(g, 1.5, 0.7, 1.3, cols[i], -3.6 + (i % 3) * 1.9, 0.05, 1.4 + Math.floor(i / 3) * 1.6);
      building(g, 2.6, 2.8, 3, '#3b3b58', 3.2, -0.8, '#22223b');
      return 4;
    },
    croydon(g) {
      plot(g, 13, 10);
      building(g, 6, 7, 2.6, '#9aa3ab', -2, -2.2, '#6c757d');
      const sign = canvasTex(256, 64, (c, w, h) => { c.fillStyle = '#ffffff'; c.fillRect(0, 0, w, h); c.fillStyle = '#1d3557'; c.font = '800 30px system-ui'; c.textAlign = 'center'; c.fillText('LUNAR HOUSE', w / 2, 42); });
      const s = new THREE.Mesh(new THREE.PlaneGeometry(4, 1), new THREE.MeshBasicMaterial({ map: sign }));
      s.position.set(-2, 1.4, -0.89); g.add(s);
      building(g, 2.6, 9, 2.6, '#c5c9cc', 3.5, -1.5);
      building(g, 2.4, 3.2, 3, '#e6c79c', 3.2, 2.6);
      box(g, 13, 0.06, 0.3, '#78be20', 0, 0.08, 4.4);
      return 10;
    },
  };

  // The Shard and Tower Bridge sit between places as pure scenery.
  function extraLandmarks() {
    const shard = new THREE.Mesh(new THREE.ConeGeometry(2.1, 15, 4), mat('#a7c4d8'));
    shard.position.set(wx(578), 7.5, wz(392)); shard.rotation.y = Math.PI / 4;
    root.add(shard);
    const bx = wx(640), bz = wz(368);
    const bridge = new THREE.Group();
    bridge.position.set(bx, 0, bz); bridge.rotation.y = -0.35;
    box(bridge, 1.6, 0.25, 9, '#5a7fa0', 0, 0.2, 0);
    for (const z of [-2, 2]) {
      box(bridge, 1.4, 4.4, 1.2, '#d8c49a', 0, 0, z);
      for (const x of [-0.5, 0.5]) cone(bridge, 0.25, 0.9, '#5a6b4f', x, 4.4, z, 4);
    }
    box(bridge, 1.6, 0.25, 4, '#5a7fa0', 0, 3.6, 0);
    root.add(bridge);
  }

  // ------------------------------------------------------------ filler city

  function filler() {
    const avoid = Object.values(LOCATIONS).map((p) => [wx(p.x), wz(p.y)]);
    const edgeSegs = EDGES.map(([a, b]) => [wx(LOCATIONS[a].x), wz(LOCATIONS[a].y), wx(LOCATIONS[b].x), wz(LOCATIONS[b].y)]);
    const houses = [], trees = [];
    let seed = 7;
    const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    for (let x = -72; x <= 72; x += 4.6) {
      for (let z = -44; z <= 46; z += 4.6) {
        const jx = x + (rnd() - 0.5) * 0.8, jz = z + (rnd() - 0.5) * 0.8;
        if (riverDist(jx, jz) < RIVER_W / 2 + 1.4) continue;
        if (avoid.some(([ax, az]) => Math.hypot(jx - ax, jz - az) < 8.5)) continue;
        if (edgeSegs.some((s) => distToSeg(jx, jz, ...s) < 1.9)) continue;
        if (Math.hypot(jx - wx(578), jz - wz(392)) < 3 || Math.hypot(jx - wx(640), jz - wz(368)) < 5) continue;
        const r = rnd();
        if (r < 0.3) houses.push([jx, jz, rnd()]);
        else if (r < 0.46) trees.push([jx, jz, rnd()]);
      }
    }
    const palette = ['#d9b38c', '#c98b6b', '#e8dccb', '#b7c4cf', '#d6cfc4', '#a9714f', '#f0e6d2', '#9fb1bf'];
    for (const [x, z, r] of houses) {
      const h = 1.4 + r * (Math.abs(x) < 25 && Math.abs(z) < 15 ? 4.5 : 2.2);
      const w = 2 + r * 0.8;
      building(root, w, h, 2.2, palette[Math.floor(r * 97) % palette.length], x, z, r > 0.6 ? '#6b4f3a' : '#cfcac0');
    }
    for (const [x, z, r] of trees) tree(root, x, z, 0.7 + r * 0.5, r > 0.5 ? '#4a9d4f' : '#3a8a45');
  }

  // ------------------------------------------------------------ billboards

  const ADS = [
    { at: [560, 250], bg: '#ffd400', fg: '#111111', big: 'QuickCash Loans', sub: 'Money in 5 mins. Only 2% a week ❤️' },
    { at: [700, 300], bg: '#1b1340', fg: '#ffffff', big: '$JOLLOF COIN 🚀', sub: 'Guaranteed* to the moon. *not guaranteed' },
    { at: [430, 330], bg: '#7a0019', fg: '#ffffff', big: 'PREST', sub: 'Oat flat white, £4.20. Sorry.' },
    { at: [520, 140], bg: '#00ccbc', fg: '#ffffff', big: 'Delivaroo', sub: 'Ride with us. Rain or rain.' },
    { at: [620, 540], bg: '#c8102e', fg: '#ffffff', big: 'PERI PALACE', sub: 'Extra hot. Extra chips. Extra cheeky.' },
    { at: [470, 580], bg: '#f3f3f3', fg: '#1d3557', big: 'Visa wahala?', sub: 'Lunar House, Croydon. Bring snacks.' },
    { at: [330, 200], bg: '#000000', fg: '#ffffff', big: 'Ubah', sub: 'Surge pricing? Never heard of her.' },
    { at: [830, 470], bg: '#ffb703', fg: '#3d1a00', big: 'OWAMBE SATURDAY', sub: 'Woolwich. Aso-ebi compulsory.' },
    { at: [200, 380], bg: '#2b2d42', fg: '#edf2f4', big: 'MIND THE RENT', sub: 'Landlords love a "market review".' },
  ];
  function billboards() {
    for (const ad of ADS) {
      const tex = canvasTex(512, 256, (c, w, h) => {
        c.fillStyle = ad.bg; c.fillRect(0, 0, w, h);
        c.fillStyle = ad.fg; c.textAlign = 'left';
        c.font = '800 54px "Plus Jakarta Sans", system-ui, sans-serif';
        c.fillText(ad.big, 30, 110);
        c.font = '600 26px "Plus Jakarta Sans", system-ui, sans-serif';
        c.globalAlpha = 0.85; c.fillText(ad.sub, 30, 170); c.globalAlpha = 1;
        c.fillStyle = 'rgba(255,255,255,.9)'; c.fillRect(w - 64, 14, 48, 26);
        c.fillStyle = '#111'; c.font = '700 16px system-ui'; c.fillText('AD', w - 52, 33);
      });
      const g = new THREE.Group();
      const x = wx(ad.at[0]), z = wz(ad.at[1]);
      g.position.set(x, 0, z);
      g.rotation.y = (Math.random() - 0.5) * 0.5;
      box(g, 0.2, 2.2, 0.2, '#333333', -1.6, 0, 0);
      box(g, 0.2, 2.2, 0.2, '#333333', 1.6, 0, 0);
      box(g, 4.6, 2.5, 0.25, '#1a1a1a', 0, 2.1, -0.05);
      const face = new THREE.Mesh(new THREE.PlaneGeometry(4.4, 2.2), new THREE.MeshBasicMaterial({ map: tex }));
      face.position.set(0, 3.35, 0.09);
      g.add(face);
      g.scale.setScalar(1.15);
      root.add(g);
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
    for (let i = 0; i < 26; i++) {
      const mesh = i % 3 === 0 ? cab() : bus();
      const e = EDGES[i % EDGES.length];
      const v = { mesh, from: e[0], to: e[1], t: Math.random(), speed: 0.05 + Math.random() * 0.05, side: Math.random() < 0.5 ? 0.38 : -0.38 };
      root.add(mesh);
      vehicles.push(v);
    }
    // Boats on the Thames
    for (let i = 0; i < 4; i++) {
      const g = new THREE.Group();
      box(g, 0.9, 0.4, 2.6, '#ffffff', 0, 0, 0);
      box(g, 0.7, 0.45, 1.2, '#1d3557', 0, 0.4, -0.2);
      root.add(g);
      boats.push({ mesh: g, t: i / 4, speed: 0.006 + i * 0.002, dir: i % 2 ? 1 : -1 });
    }
  }
  function tickTraffic(dt) {
    for (const v of vehicles) {
      const A = LOCATIONS[v.from], B = LOCATIONS[v.to];
      const len = Math.hypot(B.x - A.x, B.y - A.y) / SCALE;
      v.t += (v.speed * dt * 60) / Math.max(4, len);
      if (v.t >= 1) {
        const opts = [...(ADJ[v.to] || [])].filter((n) => n !== v.from);
        v.from = v.to;
        v.to = opts.length ? opts[Math.floor(Math.random() * opts.length)] : v.from;
        if (v.to === v.from) v.to = [...ADJ[v.from]][0];
        v.t = 0;
        continue;
      }
      const ax = wx(A.x), az = wz(A.y), bx = wx(B.x), bz = wz(B.y);
      const dx = bx - ax, dz = bz - az, l = Math.hypot(dx, dz) || 1;
      const nx = -dz / l, nz = dx / l;
      v.mesh.position.set(ax + dx * v.t + nx * v.side, 0.1, az + dz * v.t + nz * v.side);
      v.mesh.rotation.y = Math.atan2(dx, dz);
      // Hide while passing through a place's plot so traffic doesn't drive through buildings
      v.mesh.visible = v.t > 0.16 && v.t < 0.84;
    }
    for (const b of boats) {
      b.t += b.speed * dt * b.dir;
      if (b.t > 1) b.t -= 1;
      if (b.t < 0) b.t += 1;
      const n = RIVER.length - 1;
      const f = b.t * n, i = Math.min(n - 1, Math.floor(f)), k = f - i;
      const [ax, az] = RIVER[i], [bx, bz] = RIVER[i + 1];
      b.mesh.position.set(ax + (bx - ax) * k, 0.1, az + (bz - az) * k + 0.8 * b.dir);
      b.mesh.rotation.y = Math.atan2(bx - ax, bz - az) + (b.dir < 0 ? Math.PI : 0);
    }
  }

  // ------------------------------------------------------------ avatar

  function makeAvatar(look) {
    const g = new THREE.Group();
    const skin = SKIN[look.skin], hc = HAIR_COLOURS[look.hairColour], out = OUTFITS[look.outfit];
    box(g, 0.22, 0.7, 0.24, '#2d3748', -0.16, 0, 0);
    box(g, 0.22, 0.7, 0.24, '#2d3748', 0.16, 0, 0);
    box(g, 0.62, 0.75, 0.36, out, 0, 0.7, 0);
    box(g, 0.16, 0.6, 0.2, out, -0.42, 0.82, 0);
    box(g, 0.16, 0.6, 0.2, out, 0.42, 0.82, 0);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.3, 12, 10), mat(skin));
    head.position.set(0, 1.75, 0); g.add(head);
    const hm = mat(hc);
    const add = (geo, x, y, z, sx = 1, sy = 1, sz = 1) => { const m = new THREE.Mesh(geo, hm); m.position.set(x, y, z); m.scale.set(sx, sy, sz); g.add(m); };
    const cap = new THREE.SphereGeometry(0.32, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2);
    switch (look.hair) {
      case 'afro': add(new THREE.SphereGeometry(0.42, 12, 10), 0, 1.88, -0.05); break;
      case 'braids': add(cap, 0, 1.78, 0); add(BOX, -0.22, 1.45, -0.12, 0.1, 0.6, 0.1); add(BOX, 0.22, 1.45, -0.12, 0.1, 0.6, 0.1); add(BOX, 0, 1.45, -0.26, 0.3, 0.6, 0.08); break;
      case 'short': add(cap, 0, 1.8, -0.02); break;
      case 'bun': add(cap, 0, 1.8, 0); add(new THREE.SphereGeometry(0.15, 8, 6), 0, 2.12, -0.1); break;
      case 'long': add(cap, 0, 1.79, 0); add(BOX, 0, 1.45, -0.18, 0.62, 0.7, 0.14); break;
      default: break;
    }
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.55, 0.75, 24), new THREE.MeshBasicMaterial({ color: '#20b26b', transparent: true, opacity: 0.85 }));
    ring.rotation.x = -Math.PI / 2; ring.position.y = 0.14; g.add(ring);
    g.scale.setScalar(1.35);
    return g;
  }

  function spotFor(loc) {
    const p = LOCATIONS[loc];
    return new THREE.Vector3(wx(p.x) + 1.2, 0.1, wz(p.y) + 3.6);
  }

  // ------------------------------------------------------------ pins

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
  }

  const tmpV = new THREE.Vector3();
  function placePins() {
    const w = renderer.domElement.clientWidth, h = renderer.domElement.clientHeight;
    for (const [id, el] of Object.entries(pins)) {
      const p = LOCATIONS[id];
      tmpV.set(wx(p.x), (heights[id] || 4) + 1.6, wz(p.y)).project(camera);
      const x = (tmpV.x * 0.5 + 0.5) * w, y = (-tmpV.y * 0.5 + 0.5) * h;
      const off = tmpV.z > 1 || x < -60 || x > w + 60 || y < -60 || y > h + 60;
      el.style.transform = `translate(${x}px, ${y}px)`;
      el.style.visibility = off ? 'hidden' : 'visible';
    }
  }

  // ------------------------------------------------------------ camera & input

  function updateCamera() {
    camera.position.set(target.x, target.y + Math.sin(PITCH) * dist, target.z + Math.cos(PITCH) * dist);
    camera.lookAt(target);
  }
  function clampTarget() {
    target.x = Math.max(-60, Math.min(60, target.x));
    target.z = Math.max(-36, Math.min(40, target.z));
    dist = Math.max(22, Math.min(150, dist));
  }

  function bindInput(el) {
    const ptrs = new Map();
    let moved = 0, downAt = 0, pinchStart = 0, distStart = 0;
    el.addEventListener('pointerdown', (e) => {
      el.setPointerCapture(e.pointerId);
      ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
      moved = 0; downAt = performance.now();
      goalTarget = goalDist = null;
      if (ptrs.size === 2) {
        const [a, b] = [...ptrs.values()];
        pinchStart = Math.hypot(a.x - b.x, a.y - b.y); distStart = dist;
      }
    });
    el.addEventListener('pointermove', (e) => {
      const prev = ptrs.get(e.pointerId);
      if (!prev) {
        // hover cursor over places
        el.style.cursor = pickPlace(e) ? 'pointer' : 'grab';
        return;
      }
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
    const up = (e) => {
      const wasTap = ptrs.size === 1 && moved < 8 && performance.now() - downAt < 450;
      ptrs.delete(e.pointerId);
      if (ptrs.size < 2) pinchStart = 0;
      if (wasTap) {
        const id = pickPlace(e);
        if (id) onSelect(id);
      }
    };
    el.addEventListener('pointerup', up);
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
    const n = 1400;
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { pos[i * 3] = (Math.random() - 0.5) * 120; pos[i * 3 + 1] = Math.random() * 40; pos[i * 3 + 2] = (Math.random() - 0.5) * 90; }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    rain = new THREE.Points(geo, new THREE.PointsMaterial({ color: '#9fb7d6', size: 0.25, transparent: true, opacity: 0.7 }));
    rain.visible = false;
    scene.add(rain);
  }

  const DAY_BG = new THREE.Color('#cfe3c0'), NIGHT_BG = new THREE.Color('#1c2a44');
  function setTime(hourFloat, weather) {
    let light;
    if (hourFloat >= 7 && hourFloat < 18) light = 1;
    else if (hourFloat >= 5 && hourFloat < 7) light = 0.35 + (hourFloat - 5) * 0.325;
    else if (hourFloat >= 18 && hourFloat < 21) light = 1 - (hourFloat - 18) * 0.22;
    else light = 0.32;
    const grey = weather === 'rain' || weather === 'grey' ? 0.85 : 1;
    hemi.intensity = 0.32 + 0.33 * light * grey;
    sun.intensity = 0.12 + 0.5 * light * grey;
    hemi.color.setHSL(0.6, light < 0.6 ? 0.4 : 0.1, 0.9);
    scene.background = NIGHT_BG.clone().lerp(DAY_BG, light);
    rainOn = weather === 'rain';
    if (rain) rain.visible = rainOn;
  }

  // ------------------------------------------------------------ loop

  function frame(now) {
    const dt = Math.min(0.05, (now - lastTime) / 1000);
    lastTime = now;
    if (attract) {
      attractT += dt * 0.05;
      target.x = Math.sin(attractT) * 30;
      target.z = Math.cos(attractT * 0.7) * 10 + 2;
    }
    if (goalTarget) {
      target.lerp(goalTarget, Math.min(1, dt * 4));
      if (target.distanceTo(goalTarget) < 0.05) goalTarget = null;
    }
    if (goalDist) {
      dist += (goalDist - dist) * Math.min(1, dt * 4);
      if (Math.abs(goalDist - dist) < 0.1) goalDist = null;
    }
    updateCamera();
    tickTraffic(dt);
    root.traverse((o) => { if (o.userData.spin) o.rotation.z += dt * 0.08; });
    if (avatar) {
      if (avatarAnim) {
        const k = Math.min(1, (now - avatarAnim.start) / avatarAnim.ms);
        const e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
        avatar.position.lerpVectors(avatarAnim.from, avatarAnim.to, e);
        avatar.position.y = 0.1 + Math.sin(k * Math.PI) * 3;
        if (!goalTarget) target.lerp(new THREE.Vector3(avatar.position.x, 0, avatar.position.z - 2), Math.min(1, dt * 3));
        if (k >= 1) { avatarAnim.done(); avatarAnim = null; }
      } else {
        avatar.position.y = 0.1 + Math.abs(Math.sin(now / 380)) * 0.12;
      }
    }
    if (rainOn && rain) {
      const pos = rain.geometry.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        let y = pos.getY(i) - dt * 40;
        if (y < 0) y += 40;
        pos.setY(i, y);
      }
      pos.needsUpdate = true;
      rain.position.set(target.x, 0, target.z);
    }
    renderer.render(scene, camera);
    placePins();
    requestAnimationFrame(frame);
  }

  function resize() {
    const el = renderer.domElement.parentElement;
    const w = el.clientWidth, h = el.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }

  // ------------------------------------------------------------ public API

  return {
    init(container, pinContainer) {
      pinLayer = pinContainer;
      renderer = new THREE.WebGLRenderer({ antialias: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.domElement.className = 'world-canvas';
      container.appendChild(renderer.domElement);
      scene = new THREE.Scene();
      scene.background = DAY_BG.clone();
      camera = new THREE.PerspectiveCamera(FOV, 1, 1, 600);
      hemi = new THREE.HemisphereLight('#ffffff', '#8aa27a', 0.6);
      sun = new THREE.DirectionalLight('#fff6e8', 0.6);
      sun.position.set(-40, 80, 30);
      scene.add(hemi, sun);
      root = new THREE.Group();
      scene.add(root);

      const ground = new THREE.Mesh(new THREE.PlaneGeometry(400, 300), mat('#bcd59a'));
      ground.rotation.x = -Math.PI / 2;
      root.add(ground);
      ribbon(RIVER, RIVER_W + 1.2, '#e6dcc0', 0.02); // embankment
      ribbon(RIVER, RIVER_W, '#4f9fd8', 0.06);
      buildRoads();
      for (const id of Object.keys(LOCATIONS)) {
        const g = group(id);
        heights[id] = BUILD[id] ? BUILD[id](g) : 3;
        const hit = new THREE.Mesh(new THREE.BoxGeometry(11, Math.max(3, heights[id]), 9), new THREE.MeshBasicMaterial({ visible: false }));
        hit.position.y = Math.max(3, heights[id]) / 2;
        hit.userData.loc = id;
        g.add(hit);
        plots.push({ id, mesh: hit });
      }
      extraLandmarks();
      filler();
      billboards();
      flatLabel('RIVER THAMES', wx(150), wz(457), 2.4, 0.05, 'rgba(255,255,255,.8)');
      flatLabel('WEST END', wx(380), wz(185), 2, 0, 'rgba(90,110,80,.45)');
      flatLabel('EAST LONDON', wx(860), wz(250), 2, 0, 'rgba(90,110,80,.45)');
      flatLabel('SOUTH LONDON', wx(560), wz(445), 2, 0, 'rgba(90,110,80,.45)');
      spawnTraffic();
      makeRain();
      makePins();
      bindInput(renderer.domElement);
      window.addEventListener('resize', resize);
      resize();
      setTime(12, 'sun');
      requestAnimationFrame(frame);
    },
    onSelect(cb) { onSelect = cb; },
    setAttract(on) {
      attract = on;
      if (on) { goalDist = 95; if (avatar) avatar.visible = false; } else if (avatar) avatar.visible = true;
    },
    setAvatar(look, loc) {
      if (avatar) root.remove(avatar);
      avatar = makeAvatar(look);
      avatar.position.copy(spotFor(loc));
      avatarLoc = loc;
      root.add(avatar);
    },
    moveAvatar(loc, ms = 1100) {
      if (!avatar || loc === avatarLoc) return Promise.resolve();
      const from = avatar.position.clone(), to = spotFor(loc);
      avatar.rotation.y = Math.atan2(to.x - from.x, to.z - from.z);
      avatarLoc = loc;
      return new Promise((done) => { avatarAnim = { from, to, ms, start: performance.now(), done }; });
    },
    focus(loc, zoom) {
      const p = LOCATIONS[loc];
      goalTarget = new THREE.Vector3(wx(p.x), 0, wz(p.y) + 1);
      if (zoom) goalDist = zoom;
    },
    setTime,
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
