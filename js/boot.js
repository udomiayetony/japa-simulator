// Loads Three.js (ES module build) and the rendering add-ons, exposes them as
// globals for the game scripts, then runs those scripts in order.
import * as THREE_NS from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

window.THREE = { ...THREE_NS };
window.FX = { EffectComposer, RenderPass, GTAOPass, UnrealBloomPass, OutputPass, RoomEnvironment };

// Supabase powers Live London. It loads alongside the game instead of before it, so the
// city appears straight away; Online.init waits for it. Offline play works without it.
window.SupabaseReady = import('@supabase/supabase-js')
  .then((m) => { window.SupabaseLib = m; })
  .catch((e) => console.warn('Live London unavailable, playing offline.', e));

// Fetch every game script at once but run them in order.
const SCRIPTS = ['js/config.js', 'js/data.js', 'js/avatar.js', 'js/online.js', 'js/game.js', 'js/coach.js', 'js/home.js', 'js/onboard.js', 'js/music.js', 'js/live-ui.js', 'js/world.js'];
await Promise.all(SCRIPTS.map((src) => new Promise((resolve, reject) => {
  const s = document.createElement('script');
  s.src = src;
  s.async = false;
  s.onload = resolve;
  s.onerror = () => reject(new Error(`Could not load ${src}`));
  document.body.appendChild(s);
})));
window.startLondonHustle();
