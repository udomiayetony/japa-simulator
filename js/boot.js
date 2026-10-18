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

const SCRIPTS = ['js/data.js', 'js/avatar.js', 'js/game.js', 'js/world.js'];
for (const src of SCRIPTS) {
  await new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = src;
    s.onload = resolve;
    s.onerror = () => reject(new Error(`Could not load ${src}`));
    document.body.appendChild(s);
  });
}
window.startLondonHustle();
