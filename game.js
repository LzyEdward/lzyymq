import * as THREE from './vendor/three/build/three.module.js?v=7.8.0';
import { mergeGeometries } from './vendor/three/addons/utils/BufferGeometryUtils.js?v=7.8.0';
import { COURT, advance, solveShot, predict, winnerOnLanding, clamp, damp, groundCrossing, createGroundMotion, stepGroundMotion } from './physics.mjs?v=7.8.0';
import { FlightRecorder, EagleEyeReview } from './eagle-eye.mjs?v=7.8.0';
import { HitIntent, canContact, receivingTarget, swingWindow } from './controls.mjs?v=7.8.0';
import { JumpMotion, MovementOwnership, keyCommand, pointerCommand } from './interaction.mjs?v=7.8.0';
import { freeLook, landingFromMap, moveLanding, normalizeLanding, landingName, LANDING_PRESETS } from './aiming.mjs?v=7.8.0';
import { createAthlete } from './athlete.mjs?v=7.8.0';
import { movementVector, gradeContact, strokeOutcome, shotTarget, SHOT_DEPTHS, Dash, targetDistance, DRILL_TARGETS, practiceFeed, smartStroke, racketPowerBoost, techniqueTarget } from './gameplay.mjs?v=7.8.0';
import { OPPONENT_LEVELS, LEVEL_DESCRIPTIONS, LEVEL_REFERENCES, opponentLevel, placementSpread, matchFinished, rankName, freshCareer, parseCareer, settleMatch } from './competition.mjs?v=7.8.0';
import {planOpponentStroke,recoveryBase,opponentFootwork,opponentReceiveMissChance,opponentStrokeExecution,opponentServeTarget,opponentContactWindow,opponentReceiveBase} from './opponent-ai.mjs?v=7.8.0';
import { trackAngles, stepTracking, highBallOffset, stepHighBallOffset } from './tracking.mjs?v=7.8.0';
import { loadSurfaceMaps, createEnvironment, CourtPresentation } from './presentation.mjs?v=7.8.0';
import { createViewmodel } from './viewmodel.mjs?v=7.8.0';
import { prepareHands } from './hand-sculpt.mjs?v=7.8.0';
import { RenderBudget, AdaptiveResolution, renderProfile } from './render-budget.mjs?v=7.8.0';
import { createRacketModel, RACKET_PALETTES } from './racket-model.mjs?v=7.8.0';
import { swingPose, moveVelocity, groundedCameraOffset, serveSupportPose } from './motion.mjs?v=7.8.0';
import { dressHall } from './hall-details.mjs?v=7.8.0';
import { hallSurfaces } from './hall-surfaces.mjs?v=7.8.0';
import { roofGeometry } from './roof-structure.mjs?v=7.8.0';
import { createShuttleModel } from './shuttle-model.mjs?v=7.8.0';
import { createCourtNet, NET_HALF_WIDTH } from './court-net.mjs?v=7.8.0';
import { createTechniquePanel } from './technique-panel.mjs?v=7.8.0';
import { PLAYER_STYLES, OPPONENT_STYLES, effectiveOpponentLevel, playerStatsFromInputs, playerStatsForStyle, normalizeSkills } from './player-styles.mjs?v=7.8.0';

const $ = (s) => document.querySelector(s);
const canvas = $('#court');
const params = new URLSearchParams(location.search);
const testing = params.get('test') === '1';
const safeBoot = params.get('safe') === '1';
const boot = detail => window.dispatchEvent(new CustomEvent('court-boot',{detail}));
const coarse = matchMedia('(pointer:coarse)').matches;
const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const clock = new THREE.Clock();
const state = {
  screen: 'menu', mode: 'match', phase: 'serve', difficulty: 'easy',
  score: [0, 0], rally: 0, maxRally: 0, hits: 0, maxSpeed: 0,
  assists: true, sound: true, stamina: 100, shot: 'auto',
  timer: 0, elapsed: 0, serveCount: 0, lastHitter: 'player',
  prediction: null, incomingTime: 0, pointDelay: 0, charge: 0,
  swing: 0, swingContact: false, swingKind: 'clear', feedback: 0,
  hitstop: 0, impact: 0, jump: 0, jumpV: 0, lastMove: -10,
  lastLook: -10, yaw: 0, pitch: 0, sensitivity: 1, finished: false,
  returnDelay: 0, audioInitialized: false, countdown: 0,
  aim: 0, depth: -4.7, comfortable: false, coach: true, cue: '', pace: 1, profile: 'balanced',motion:.35,focus:false,controlsVisible:false,manualLanding:false,shotCueUntil:0,
  targetIndex: -1, target: null, targetArmed: false, targetHits: 0, targetShots: 0, targetStreak: 0, targetBest: 0,
  matchPoints:11,server:'player',matchId:'',ratingDelta:null,smashes:0,winners:0,errors:0,lastShot:null,
  advanced:false,manualOverride:false,tutorial:false,tutorialStage:0,jumpPeak:0,
  aiming:false,aimAlt:false,swingTarget:null,serveTarget:null,serveStyle:'low',lastLanding:null,racketStyle:'attack',racketSkin:'astrox100zz',playerStyle:'linDan08',opponentStyle:'allround',playerStats:playerStatsForStyle('linDan08'),opponentStats:normalizeSkills(),highBallAssist:true,manualPitch:-.03,autoPitchOffset:0,
};
let career=freshCareer();
const CAREER_KEY='feather-court-career-v1';
const keys = new Set();
const hitIntent = new HitIntent();
const dash = new Dash();
const jumping=new JumpMotion(),movementOwner=new MovementOwnership();
const player = { pos: V(.45, 0, 4.45), vel: V(), speed: 0,step:0 };
const opponent = { pos: V(-.6, 0, -4.5), vel: V(), target: V(), swing: 0, step: 0, returns: 0, energy: 100 };
const ball = { pos: V(.4, 1.12, 3.7), vel: V(), active: false, trail: [], flash: 0 };
const flightRecorder = new FlightRecorder();
let eagleEye, lastLineReview = null, reviewReturnScreen = 'play', reviewPending = -1;
let groundMotion = null;
let techniquePanel;

function openLineReview(automatic = false) {
  if (!lastLineReview || !['play', 'pause'].includes(state.screen) || (state.screen === 'play' && !['point', 'serve', 'opponentServe'].includes(state.phase))) return;
  reviewReturnScreen = state.screen; state.screen = 'review'; reviewPending = -1;
  keys.clear(); hitIntent.clear(); pointerDown = false; state.aimAlt = false; touchMove = { x: 0, y: 0 };
  document.exitPointerLock?.();
  eagleEye.open(lastLineReview, automatic);
}
function closeLineReview() {
  state.screen = reviewReturnScreen;
  accumulator = 0; clock.getDelta();
  if (state.screen === 'play') {
    if (!testing && (document.hidden || !document.hasFocus())) { pauseGame(state.finished); return; }
    state.pointDelay = Math.max(state.pointDelay, .9);
    canvas.focus({ preventScroll: true }); requestLock();
  }
}
for(const entity of [player,opponent,ball]){entity.previous=entity.pos.clone();entity.renderPos=entity.pos.clone();}
let renderer, scene, camera, racket, shuttle, bot, landingMarker, targetMarker, aimMarker, shuttleShadow, net, courtScore, presentation, surfaceMaps;
let audio, master, trailLine, shuttleNoise, shuttleFilter, shuttleGain, shuttlePan, lastShuttleSoundUpdate=-1, menuTime = 0, accumulator = 0, fps = 60;
let lastHud = 0, previousCameraPos = V(), pointerDown = false, touchMove = { x: 0, y: 0 };
let previousManual = false;
let gamepadHitHeld = false, gamepadJumpHeld = false, gamepadDashHeld = false;
let inspectDrag=null,frameProbe=null,lastFrameTime=performance.now(),lastEffectsUI=-1;
const renderBudget=new RenderBudget(),adaptiveResolution=new AdaptiveResolution();let qualityMode='auto';
const tmp = V(), tmp2 = V(), cameraGoal = V(), lookGoal = V();
const UP = V(0, 1, 0);
const shuttleSpin = new THREE.Quaternion();
const materials = {};
let rng = 1481;
function random() { rng = (rng * 1664525 + 1013904223) >>> 0; return rng / 4294967296; }
function rand(lo, hi) { return lo + random() * (hi - lo); }
function normalRandom(){return Math.sqrt(-2*Math.log(Math.max(1e-9,random())))*Math.cos(2*Math.PI*random());}

function material(color, roughness = .8, metalness = 0) {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness });
}
function mesh(geo, mat, x = 0, y = 0, z = 0, parent = scene) {
  const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); parent.add(m); return m;
}
function box(w, h, d, mat, x = 0, y = 0, z = 0, parent = scene) { return mesh(new THREE.BoxGeometry(w, h, d), mat, x, y, z, parent); }
function cylinder(a, b, radius, mat, parent = scene, sides = 10) {
  const d = tmp2.copy(b).sub(a), len = d.length();
  const m = mesh(new THREE.CylinderGeometry(radius, radius, len, sides), mat, 0, 0, 0, parent);
  m.position.copy(a).add(b).multiplyScalar(.5);
  m.quaternion.setFromUnitVectors(UP, d.normalize()); return m;
}
function texture(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy()); return tex;
}
function textPanel(text, w = 3, h = 1, options = {}) {
  const tex = texture(1024, 256, (c, width, height) => {
    c.fillStyle = options.bg || '#122f2c'; c.fillRect(0, 0, width, height);
    c.fillStyle = options.color || '#e8f0d7'; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.font = `${options.weight || 500} ${options.size || 90}px "Segoe UI", "Microsoft YaHei", sans-serif`;
    c.fillText(text, width / 2, height / 2);
  });
  return new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false }));
}

function createHall() {
  const architecture=hallSurfaces(THREE);
  scene.background = new THREE.Color('#71827d');
  scene.fog = new THREE.FogExp2('#617874', .007);
  const hemi = new THREE.HemisphereLight('#e4edf1', '#7b7768', .66); scene.add(hemi);
  const sun = new THREE.DirectionalLight('#fff3df', 2.5); sun.position.set(-11, 16, -8); sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024); sun.shadow.camera.left = -18; sun.shadow.camera.right = 18;
  sun.shadow.camera.top = 19; sun.shadow.camera.bottom = -19; sun.shadow.camera.near = .1; sun.shadow.camera.far = 65;
  sun.shadow.normalBias = .018; sun.shadow.bias = -.00012; sun.shadow.radius = 4; scene.add(sun);
  const fill = new THREE.DirectionalLight('#d0e0ec', .65); fill.position.set(10, 10, 4); scene.add(fill);
  const bounce=new THREE.DirectionalLight('#d6ddd2',.38);bounce.position.set(0,3,14);scene.add(bounce);
  const overhead=new THREE.SpotLight('#fff3df',110,23,Math.PI*.37,1,2);overhead.position.set(0,8,1);overhead.target.position.set(0,0,-2);overhead.castShadow=true;overhead.shadow.mapSize.set(512,512);overhead.shadow.normalBias=.018;overhead.shadow.bias=-.0001;scene.add(overhead,overhead.target);
  const floorTex = texture(1024, 1024, (c, w, h) => {
    c.fillStyle = '#a58b61'; c.fillRect(0, 0, w, h);
    for (let j = 0; j < 16; j++) for (let i = -1; i < 5; i++) {
      const x = i * 256 + (j % 2) * 123, y = j * 64;
      const tone = Math.floor(rand(0, 20)); c.fillStyle = `rgb(${158 + tone},${133 + tone},${93 + tone})`;
      c.fillRect(x + 1, y + 1, 254, 62);
      c.strokeStyle = '#554a3020'; c.lineWidth = .6;
      for (let k = 0; k < 7; k++) { c.beginPath(); c.moveTo(x, y + rand(4, 60)); c.lineTo(x + 256, y + rand(4, 60)); c.stroke(); }
    }
  });
  floorTex.wrapS = floorTex.wrapT = THREE.RepeatWrapping; floorTex.repeat.set(6, 8);
  const floor = box(31, .2, 39, new THREE.MeshPhysicalMaterial({ map: surfaceMaps.wood||floorTex, normalMap:surfaceMaps.woodNormal||null,normalScale:new THREE.Vector2(.22,.22),roughnessMap:surfaceMaps.woodRough||null,roughness:.78,clearcoat:.12,clearcoatRoughness:.55 }), 0, -.15, 0); floor.receiveShadow = true;
  if(surfaceMaps.wood)floorTex.dispose();
  const courtTex=architecture.court;
  const mat = box(7.9, .035, 16.2, new THREE.MeshPhysicalMaterial({ map: courtTex, normalMap:surfaceMaps.rubberNormal||null,normalScale:new THREE.Vector2(.12,.12),roughnessMap:surfaceMaps.rubberRough||null,roughness:.82,clearcoat:.09,clearcoatRoughness:.78 }), 0, -.025, 0); mat.receiveShadow = true;
  const runoff = material('#224f48');
  box(.12, .025, 16.2, runoff, -3.97, -.01, 0); box(.12, .025, 16.2, runoff, 3.97, -.01, 0);
  const line = new THREE.MeshStandardMaterial({ color: '#e5e9dc',roughness:.78 });
  const lineAt = (x1, z1, x2, z2, width = .04) => {
    const p = box(Math.abs(x2 - x1) || width, .008, Math.abs(z2 - z1) || width, line, (x1 + x2) / 2, .002, (z1 + z2) / 2);
    p.receiveShadow = true;
  };
  [-3.05, -2.59, 2.59, 3.05].forEach(x => lineAt(x, -6.7, x, 6.7));
  [-6.7, -5.94, -1.98, 1.98, 5.94, 6.7].forEach(z => lineAt(-3.05, z, 3.05, z));
  lineAt(0, -6.7, 0, -1.98); lineAt(0, 1.98, 0, 6.7);
  const wall = material('#91a69b'), lower = material('#557a68'), black = material('#253732'), steel = material('#667b75', .4, .6);
  wall.map=architecture.wall;wall.roughness=.95;lower.map=architecture.wall;lower.roughness=.91;
  box(31, 11, .3, wall, 0, 5.3, -18); box(31, 11, .3, wall, 0, 5.3, 18);
  box(.3, 11, 36, wall, -15, 5.3, 0); box(.3, 11, 36, wall, 15, 5.3, 0);
  box(30, 2.8, .2, lower, 0, 1.4, -17.78); box(30, 2.8, .2, lower, 0, 1.4, 17.78);
  const panelWood = material('#907a58');
  const windowMaterial=new THREE.MeshStandardMaterial({map:architecture.glass,color:'#d5e2df',emissiveMap:architecture.glass,emissive:'#c9d7d0',emissiveIntensity:.3,roughness:.4,metalness:.08});
  for (const side of [-1, 1]) {
    box(.3, 3.1, 36, panelWood, side * 14.7, 1.5, 0);
    for (let z = -17.5; z < 18; z += .32) box(.04, 3.1, .038, black, side * 14.5, 1.5, z);
    for (let z = -15; z <= 15; z += 5) {
      box(.38, 10.6, .38, black, side * 14.4, 5.2, z);
      box(.02, 4.2, 4.5, windowMaterial, side * 14.52, 6.5, z + 2.5);
      for (let yy = 4.4; yy <= 8.7; yy += 1.4) box(.04, .055, 4.6, black, side * 14.47, yy, z + 2.5);
      for (let zz = 0; zz <= 4.6; zz += 1.15) box(.04, 4.3, .045, black, side * 14.46, 6.5, z + .2 + zz);
    }
  }
  const roof = new THREE.MeshStandardMaterial({map:architecture.roof,color:'#a7b8ad',roughness:.86,metalness:.06,emissive:'#52675b',emissiveIntensity:.18});
  mesh(roofGeometry(THREE),roof);
  const diffuserMaterial=new THREE.MeshStandardMaterial({map:architecture.diffuser,color:'#e6ebdf',emissiveMap:architecture.diffuser,emissive:'#eef2e1',emissiveIntensity:.8,roughness:.64});
  const lampRim=material('#d0d6c9',.55,.18);
  for (let z = -15; z <= 15; z += 5) {
    box(29, .26, .24, black, 0, 9.2, z);
    cylinder(V(-14.3, 9.15, z), V(0, 10.4, z), .065, steel);
    cylinder(V(14.3, 9.15, z), V(0, 10.4, z), .065, steel);
    for (let x = -12; x <= 12; x += 3) cylinder(V(x, 9.2, z), V(x + 1.5, 9.9, z), .025, steel);
    for (const x of [-7, 7]) {
      cylinder(V(x, 9.2, z), V(x, 8.55, z), .018, steel);
      box(.7, .1, 1.8, steel, x, 8.55, z);
      box(.63,.024,1.68,lampRim,x,8.493,z);
      box(.56, .014, 1.58, diffuserMaterial, x, 8.473, z);
      for(const dz of [-.86,.86])box(.73,.035,.035,lampRim,x,8.49,z+dz);
    }
  }
  for (const x of [-10, 10]) box(.12, .12, 35, steel, x, 9.3, 0);
  // Long, soft window-shaped patches make the court read as an actual indoor space.
  const lightPatch = new THREE.MeshBasicMaterial({ color: '#fff5c6', transparent: true, opacity: .035, depthWrite: false });
  for (let z = -12; z < 15; z += 5) { const p = mesh(new THREE.PlaneGeometry(6, 2.5), lightPatch, -8, -.038, z); p.rotation.x = -Math.PI / 2; p.rotation.z = .36; }
  const banner = textPanel('FEATHER  /  COURT', 7.4, 1.5, { bg: '#203e3c', color: '#d9e7b8', size: 75 }); banner.position.set(-3.5, 5.3, -17.58); scene.add(banner);
  const no = textPanel('01', 3, 3, { bg: '#203e3c', color: '#a6b5a2', size: 180, weight: 300 }); no.position.set(10.3, 4.2, -17.57); scene.add(no);
  const backBrand = textPanel('MOVE  WITH  THE  MOMENT.', 8, 1, { bg: '#24443e', color: '#93a796', size: 51 }); backBrand.position.set(0, 1.9, -17.6); scene.add(backBrand);
  const sideBrand = textPanel('羽 境  /  FEATHER COURT', 8.5, 1.2, { bg: '#24443e', color: '#9fb49e', size: 58 }); sideBrand.position.set(-14.45, 2.1, -3); sideBrand.rotation.y = Math.PI / 2; scene.add(sideBrand);
  const door = material('#1b302e');
  for (const x of [-10.2, 5.8]) {
    box(1.6, 2.65, .1, steel, x, 1.32, -17.54); box(1.45, 2.5, .12, door, x, 1.25, -17.45);
    box(.06, .3, .06, steel, x + .48, 1.12, -17.34);
    const exit = textPanel('EXIT →', 1.1, .28, { bg: '#2b6e47', color: '#e5f9cf', size: 90 }); exit.position.set(x, 2.95, -17.5); scene.add(exit);
  }
  const benchWood = material('#b6996a', .65), benchMetal = material('#223b35', .4, .5);
  function bench(x, z) {
    for (const xx of [-1.8, 1.8]) { box(.15, .43, .55, benchMetal, x + xx, .22, z); box(.1, .9, .09, benchMetal, x + xx, .58, z - .25); }
    for (let i = 0; i < 4; i++) box(4.4, .06, .14, benchWood, x, .48, z - .24 + i * .15);
    for (let i = 0; i < 3; i++) box(4.4, .13, .055, benchWood, x, .7 + i * .16, z - .3);
  }
  bench(-8.5, -10.5); bench(8.5, -10.5); bench(9.8, 9);
  // A distant second court gives the hall a believable scale.
  const second = box(5.7, .01, 13.6, material('#305b50'), -10, -.033, 0); second.receiveShadow = true;
  const faint = new THREE.MeshBasicMaterial({ color: '#bbc5a0' });
  for (const x of [-12.5, -7.5]) box(.025, .01, 12, faint, x, -.022, 0);
  for (const z of [-6, 0, 6]) box(5, .01, .025, faint, -10, -.022, z);
  createNet();dressHall(THREE,scene);
  courtScore = textPanel('YOU   00  :  00   LIN', 4.2, .9, { bg: '#102823', color: '#def6a3', size: 70 });
  courtScore.position.set(2.5, 4, -17.5); scene.add(courtScore);
}

function createNet() {
  const postMat = material('#183b31', .5, .4), band = material('#e8e9ce', .7);
  for (const x of [-NET_HALF_WIDTH, NET_HALF_WIDTH]) {
    const base = box(.35, .08, .55, postMat, x, .04, 0); base.castShadow = true;
    mesh(new THREE.CylinderGeometry(.14,.16,.035,20),material('#536962',.4,.55),x,.097,0);
    for(const dx of [-.105,.105])for(const dz of [-.16,.16])mesh(new THREE.CylinderGeometry(.012,.012,.012,8),band,x+dx,.12,dz);
    const post = mesh(new THREE.CylinderGeometry(.038, .047, 1.44, 16), postMat, x, .82, 0); post.castShadow = true;
    mesh(new THREE.CylinderGeometry(.049,.049,.035,16),band,x,1.49,0);
    mesh(new THREE.CylinderGeometry(.047,.047,.01,16), band, x, 1.545, 0);
  }
  net = createCourtNet(THREE); scene.add(net);
}

function createRacket(isPlayer=false) {
  return createRacketModel(THREE,{skin:isPlayer?state.racketSkin:'aero-blue',player:isPlayer});
}

function createPlayerRacket() {
  racket = createViewmodel(THREE,createRacket,{skinMap:surfaceMaps?.athleteSkin});camera.add(racket);scene.add(camera);
  camera.add(racket.userData.support);
  racket.position.set(.32,-.42,-.86);racket.rotation.set(.12,-.10,-.10);
}

function applyRacketStyle(style=state.racketStyle){
  if(!['control','attack','aero'].includes(style))style='control';
  state.racketStyle=style;
  const size={control:[1,1],attack:[.94,.97],aero:[1.045,1.035]}[style],model=racket?.userData?.racketModel;
  if(model)model.scale.set(.96*size[0],.96*size[1],.96);
  const select=$('#racket-style');if(select&&select.value!==style)select.value=style;
}
function applyRacketSkin(skin=state.racketSkin){
 const palette=RACKET_PALETTES;
 if(!palette[skin])skin='astrox100zz';state.racketSkin=skin;
 if(racket?.userData?.racketModel){
  const old=racket.userData.racketModel,next=createRacketModel(THREE,{skin,player:true});next.scale.copy(old.scale);racket.remove(old);racket.add(next);racket.userData.racketModel=next;
  old.traverse(o=>{o.geometry?.dispose();for(const m of Array.isArray(o.material)?o.material:o.material?[o.material]:[]){m.map?.dispose();m.dispose();}});
 }
 const select=$('#racket-skin');if(select&&select.value!==skin)select.value=skin;
}

function createOpponent() {
  const athlete = createAthlete(THREE, createRacket,{skinMap:surfaceMaps?.athleteSkin,mergeGeometries});
  scene.add(athlete.root);
  const label = textPanel('林越  /  07', .72, .15, { bg: '#173b35', color: '#f0d2a2', size: 100 });
  label.position.set(0, 2.05, 0); athlete.root.add(label);
  return { ...athlete, label };
}

function createShuttle() {
 const root=createShuttleModel(THREE,mergeGeometries);scene.add(root);return root;
}

function createEffects() {
  shuttle = createShuttle();
  shuttleShadow = mesh(new THREE.CircleGeometry(.15, 24), new THREE.MeshBasicMaterial({ color: '#0c352b', transparent: true, opacity: .25, depthWrite: false })); shuttleShadow.rotation.x = -Math.PI / 2;
  landingMarker = new THREE.Group(); scene.add(landingMarker);
  const ring = mesh(new THREE.RingGeometry(.29, .305, 48), new THREE.MeshBasicMaterial({ color: '#e7f8b5', transparent: true, opacity: .38, side: THREE.DoubleSide, depthWrite: false }), 0, .015, 0, landingMarker); ring.rotation.x = -Math.PI / 2;
  const cross = new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints([V(-.08, .017, 0), V(.08, .017, 0), V(0, .017, -.08), V(0, .017, .08)]), new THREE.LineBasicMaterial({ color: '#e7f8b5', transparent: true, opacity: .35 })); landingMarker.add(cross);
  targetMarker = new THREE.Group();
  const targetMat = new THREE.MeshBasicMaterial({ color: '#dafa95', transparent: true, opacity: .8, side: THREE.DoubleSide, depthWrite: false });
  const targetOuter = mesh(new THREE.RingGeometry(.72, .78, 48), targetMat, 0, .025, 0, targetMarker); targetOuter.rotation.x = -Math.PI / 2;
  const targetInner = mesh(new THREE.RingGeometry(.32, .35, 48), new THREE.MeshBasicMaterial({ color: '#f7ffe5', transparent: true, opacity: .68, side: THREE.DoubleSide, depthWrite: false }), 0, .028, 0, targetMarker); targetInner.rotation.x = -Math.PI / 2;
  const targetDot = mesh(new THREE.CircleGeometry(.055, 20), new THREE.MeshBasicMaterial({ color: '#f7ffe5', transparent: true, opacity: .9, depthWrite: false }), 0, .032, 0, targetMarker); targetDot.rotation.x = -Math.PI / 2;
  targetMarker.visible = false; scene.add(targetMarker);
  aimMarker=new THREE.Group();scene.add(aimMarker);
  const aimMaterial=new THREE.MeshBasicMaterial({color:'#f3f3d9',transparent:true,opacity:.68,depthWrite:false,side:THREE.DoubleSide});
  const aimRing=mesh(new THREE.RingGeometry(.29,.315,48),aimMaterial,0,.014,0,aimMarker);aimRing.rotation.x=-Math.PI/2;
  const aimCross=new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints([V(-.13,.016,0),V(.13,.016,0),V(0,.016,-.13),V(0,.016,.13)]),new THREE.LineBasicMaterial({color:'#f3f3d9',transparent:true,opacity:.72}));aimMarker.add(aimCross);aimMarker.visible=false;
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(30 * 3), 3));
  trailLine = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: '#eef6c9', transparent: true, opacity: .14, depthWrite: false })); trailLine.frustumCulled = false; scene.add(trailLine);
}

function initAudio() {
  if (audio) { if (audio.state === 'suspended') audio.resume().catch(() => {}); return; }
  try {
    audio = new (window.AudioContext || window.webkitAudioContext)();
    master = audio.createGain(); master.gain.value = state.sound ? .5 : 0; master.connect(audio.destination);
    const length = audio.sampleRate * 1.3, impulse = audio.createBuffer(2, length, audio.sampleRate);
    for (let c = 0; c < 2; c++) { const data = impulse.getChannelData(c); for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 2.8) * .15; }
    audio.reverb = audio.createConvolver(); audio.reverb.buffer = impulse; const wet = audio.createGain(); wet.gain.value = .27; audio.reverb.connect(wet); wet.connect(master);
    const air = audio.createBuffer(1, audio.sampleRate, audio.sampleRate), samples = air.getChannelData(0);
    for(let i=0;i<samples.length;i++)samples[i]=Math.random()*2-1;
    shuttleNoise=audio.createBufferSource();shuttleNoise.buffer=air;shuttleNoise.loop=true;
    shuttleFilter=audio.createBiquadFilter();shuttleFilter.type='bandpass';shuttleFilter.frequency.value=850;shuttleFilter.Q.value=.42;
    shuttleGain=audio.createGain();shuttleGain.gain.value=0;shuttlePan=audio.createStereoPanner();
    shuttleNoise.connect(shuttleFilter);shuttleFilter.connect(shuttleGain);shuttleGain.connect(shuttlePan);shuttlePan.connect(master);shuttleNoise.start();
    state.audioInitialized = true;
  } catch { state.sound = false; }
}

function updateShuttleSound(){
  if(!audio||!shuttleGain)return;
  if(audio.currentTime-lastShuttleSoundUpdate<.045)return;
  const speed=ball.vel.length(),distance=camera.position.distanceTo(ball.pos),near=clamp(1-distance/13,0,1);
  const level=state.screen==='play'&&state.sound&&ball.active?Math.pow(near,1.7)*clamp(speed/82,.12,1)*.045:0;
  const pan=clamp((ball.pos.x-camera.position.x)/Math.max(1,distance),-1,1);
  const now=audio.currentTime;
  lastShuttleSoundUpdate=now;
  shuttleGain.gain.setTargetAtTime(level,now,.045);
  shuttleFilter.frequency.setTargetAtTime(620+clamp(speed,0,90)*15,now,.08);
  shuttlePan.pan.setTargetAtTime(pan,now,.05);
}

function haptic(strong=.42,weak=.2,duration=34){
  try{
    const pad=[...(navigator.getGamepads?.()||[])].find(candidate=>candidate?.connected);
    const actuator=pad?.vibrationActuator;
    if(actuator?.playEffect)actuator.playEffect('dual-rumble',{duration,strongMagnitude:strong,weakMagnitude:weak}).catch?.(()=>{});
    else actuator?.pulse?.(Math.max(strong,weak),duration)?.catch?.(()=>{});
  }catch{}
}

function noise(duration, frequency, volume, kind = 'bandpass', pan = 0) {
  if (!audio || !state.sound) return;
  const count = Math.ceil(audio.sampleRate * duration), buf = audio.createBuffer(1, count, audio.sampleRate), data = buf.getChannelData(0);
  for (let i = 0; i < count; i++) data[i] = Math.random() * 2 - 1;
  const s = audio.createBufferSource(); s.buffer = buf;
  const filter = audio.createBiquadFilter(); filter.type = kind; filter.frequency.value = frequency; filter.Q.value = .8;
  const gain = audio.createGain(); gain.gain.setValueAtTime(volume, audio.currentTime); gain.gain.exponentialRampToValueAtTime(.001, audio.currentTime + duration);
  const stereo = audio.createStereoPanner(); stereo.pan.value = clamp(pan, -1, 1);
  s.connect(filter); filter.connect(gain); gain.connect(stereo); stereo.connect(master); gain.connect(audio.reverb); s.start(); s.stop(audio.currentTime + duration);
}
function tone(freq, duration, volume, end = freq) {
  if (!audio || !state.sound) return;
  const o = audio.createOscillator(), g = audio.createGain(); o.type = 'sine'; o.frequency.setValueAtTime(freq, audio.currentTime); o.frequency.exponentialRampToValueAtTime(end, audio.currentTime + duration);
  g.gain.setValueAtTime(volume, audio.currentTime); g.gain.exponentialRampToValueAtTime(.001, audio.currentTime + duration); o.connect(g); g.connect(master); g.connect(audio.reverb); o.start(); o.stop(audio.currentTime + duration);
}
function hitSound(type, isOpponent = false) {
  if(!audio||!state.sound)return;
  const strength=['smash','slicesmash'].includes(type)?1:['drop','slicedrop','net','netcross'].includes(type)?.4:.7,dist=isOpponent?.38:1;
  const pan=isOpponent?clamp((opponent.pos.x-player.pos.x)/7,-.8,.8):.2;
  // A string-bed snap and rapidly damped frame modes, with no pitch sweep.
  noise(.018,3300,.58*strength*dist,'highpass',pan);
  noise(.045,1250,.20*strength*dist,'bandpass',pan);
  for(const [frequency,volume,decay] of [[950,.12,.037],[1870,.055,.018],[420,.035,.05]]){
    const source=audio.createOscillator(),gain=audio.createGain(),stereo=audio.createStereoPanner();
    source.frequency.value=frequency*(type==='smash'?1.04:1);source.type='sine';
    gain.gain.setValueAtTime(volume*strength*dist,audio.currentTime);gain.gain.exponentialRampToValueAtTime(.0001,audio.currentTime+decay);
    stereo.pan.value=pan;source.connect(gain);gain.connect(stereo);stereo.connect(master);gain.connect(audio.reverb);source.start();source.stop(audio.currentTime+decay);
  }
}

function updateCourtScore() {
  const tex = courtScore.material.map, c = tex.image.getContext('2d');
  c.fillStyle = '#102823'; c.fillRect(0, 0, 1024, 256);
  c.fillStyle = '#def6a3'; c.font = '500 72px "Segoe UI"'; c.textAlign = 'center'; c.textBaseline = 'middle';
  const left = state.mode === 'targets' ? state.targetHits : state.score[0];
  const right = state.mode === 'targets' ? state.targetShots : state.score[1];
  c.fillText(`${state.mode === 'targets' ? 'HIT' : 'YOU'}   ${String(left).padStart(2, '0')}  :  ${String(right).padStart(2, '0')}   ${state.mode === 'targets' ? 'TRY' : 'LIN'}`, 512, 128); tex.needsUpdate = true;
}
const SHOT_NAMES={auto:'智能回球',clear:'高远球',drop:'吊球',smash:'杀球',drive:'平抽球',lift:'挑球',net:'网前搓球',push:'推后场',netcross:'勾对角',netkill:'扑球',slicesmash:'劈杀斜线',slicedrop:'劈吊对角'};
function showShotCue(type){
  const input=({auto:'左键 / 1',clear:'2',drop:'3 / E',smash:'右键 / 4 / L',net:'5',push:'6',netcross:'7',slicesmash:'8',slicedrop:'9'})[type]||'左键';
  $('#shot-cue').textContent=`${SHOT_NAMES[type]||SHOT_NAMES.auto} · ${landingName(selectedLanding(type))} · ${input}`;
  state.shotCueUntil=state.timer+1.65;$('#shot-cue').classList.add('visible');
}
function setShot(type) {
  state.shot = type;
  if(!state.manualLanding)state.depth=SHOT_DEPTHS[type]??SHOT_DEPTHS.auto;
  document.querySelectorAll('[data-shot]').forEach(el => el.classList.toggle('active', el.dataset.shot === type));
  const preset=$('#shot-select');if(preset&&preset.value!==type)preset.value=type;
  if(state.screen==='play'&&type!=='auto'){showShotCue(type);feedback(`准备击球 · ${SHOT_NAMES[type]}`,`落点 · ${landingName(selectedLanding(type))}`);}
  if(state.prediction&&state.lastHitter==='opponent')refreshPrediction();
}
function selectedLanding(kind=state.shot){return techniqueTarget({position:ball.pos,aim:state.aim,kind,manual:state.manualLanding?shotTarget({aim:state.aim,depth:state.depth,kind}):null});}
function currentOpponentLevel(){return effectiveOpponentLevel(opponentLevel(state.difficulty),state.opponentStyle,state.opponentStats);}
function applyPlayerStyle(key){
  const stats=playerStatsForStyle(key);state.playerStyle=PLAYER_STYLES[key]?key:'custom';
  for(const [name,value] of Object.entries(stats)){const input=$(`#player-${name}`);if(input){input.value=Math.round(value*100);input.parentElement.querySelector('output').value=`${input.value}%`;input.parentElement.querySelector('output').textContent=`${input.value}%`;}}
  state.playerStats=stats;
  if(racket?.userData.fabric)racket.userData.fabric.color.set(({linDan08:'#ba3533',leeChongWei:'#d9c255',chenLong:'#dce4e8',taufik:'#d4dfce'})[key]||'#dce3df');
  if(techniquePanel)techniquePanel.write('player',stats);
  $('#player-style').value=state.playerStyle;
  document.querySelectorAll('[data-player-style]').forEach(button=>{const active=button.dataset.playerStyle===state.playerStyle;button.classList.toggle('active',active);button.setAttribute('aria-pressed',String(active));});
}
function refreshPlayerStats(){
  state.playerStats=playerStatsFromInputs();
  for(const input of document.querySelectorAll('.player-stat-grid input')){const out=input.parentElement.querySelector('output');if(out){out.value=`${input.value}%`;out.textContent=`${input.value}%`;}}
}
function chooseLanding(target){
  const p=normalizeLanding(target);state.aim=p.x/2.45;state.depth=p.z;state.manualLanding=true;
  updateTactics();
}
function setAimEditor(value){
  state.aiming=Boolean(value);document.body.classList.toggle('choosing-landing',state.aiming);
  $('#aim-edit').setAttribute('aria-pressed',String(state.aiming));
  if(state.aiming){hitIntent.clear();document.exitPointerLock?.();}
  else {canvas.focus({preventScroll:true});requestLock();}
}
function applyMouseLook(dx,dy){
  if(state.aiming||state.aimAlt){chooseLanding(moveLanding(selectedLanding(),dx,dy));return;}
  if(state.comfortable)return;
  const view=freeLook({...state,pitch:state.manualPitch},dx,dy,state.sensitivity,innerHeight,camera?.fov||69,innerWidth);state.yaw=view.yaw;state.manualPitch=view.pitch;state.pitch=clamp(view.pitch+state.autoPitchOffset,-1.42,1.545);state.lastLook=state.timer;
}
function updateTechniqueSummary(){
  if(!techniquePanel)return;
  const level=effectiveOpponentLevel(opponentLevel($('#difficulty').value),$('#opponent-style').value,state.opponentStats);
  $('#player-skill-preset').textContent=state.playerStyle==='custom'?'自定义六项能力':PLAYER_STYLES[state.playerStyle]?.name;
  $('#opponent-skill-preset').textContent=`${opponentLevel($('#difficulty').value).name} · ${OPPONENT_STYLES[$('#opponent-style').value].name}`;
  $('#opponent-skill-summary').textContent=`当前对手：移动 ${level.speed.toFixed(1)} m/s · 反应 ${Math.round(level.reaction*1000)} ms · 覆盖 ${level.reach.toFixed(2)} m · 稳定 ${Math.round(level.accuracy*100)}% · 进攻球速基准 ${Math.round(level.power*3.6)} km/h。球速还取决于站位、触球高度与过网条件。`;
}
function initTechniquePanel(){
  techniquePanel=createTechniquePanel({
    onPlayerChange:()=>{$('#player-style').value='custom';state.playerStyle='custom';refreshPlayerStats();document.querySelectorAll('[data-player-style]').forEach(b=>{b.classList.remove('active');b.setAttribute('aria-pressed','false');});updateTechniqueSummary();savePreferences();},
    onOpponentChange:stats=>{state.opponentStats=stats;updateDifficultyUI();savePreferences();},
    onResetPlayer:()=>{applyPlayerStyle(state.playerStyle==='custom'?'linDan08':state.playerStyle);savePreferences();},
    onResetOpponent:()=>{state.opponentStats=normalizeSkills();updateDifficultyUI();savePreferences();},
    onOpen:updateTechniqueSummary,
  });
}
function updateDifficultyUI(){
  bot?.setKit?.($('#opponent-style').value);renderBudget.invalidate();
  const level=effectiveOpponentLevel(opponentLevel($('#difficulty').value),$('#opponent-style').value,state.opponentStats);
  updateTechniqueSummary();
  const style=OPPONENT_STYLES[$('#opponent-style')?.value||'allround'];
  $('#difficulty-detail').textContent=`参考：${LEVEL_REFERENCES[level.tier]}。${LEVEL_DESCRIPTIONS[level.tier]}。${style.name} · 移动 ${level.speed.toFixed(1)} m/s · 反应 ${(level.reaction*1000).toFixed(0)} ms · 覆盖 ${level.reach.toFixed(2)} m · 稳定 ${Math.round(level.accuracy*100)}%。`;
}
function updateCareerUI(){
  $('#career-rank').textContent=rankName(career.rating);$('#career-rating').textContent=career.rating;
  $('#career-record').textContent=`${career.wins} 胜 / ${career.played-career.wins} 负 · 连胜 ${career.streak}`;
  $('#career-progress').style.width=`${Math.min(100,Math.max(0,(career.rating-700)%200)/2)}%`;
  const history=$('#career-history');history.replaceChildren();
  for(const h of career.history.slice(0,4)){
    const row=document.createElement('li');row.textContent=`${h.score[0]>h.score[1]?'胜':'负'} · ${opponentLevel(h.level).name} ${h.score.join(':')}   ${h.delta>=0?'+':''}${h.delta}`;history.append(row);
  }
  if(!career.history.length){const row=document.createElement('li');row.textContent='完成正式比赛，记录首场战绩';history.append(row);}
}
function commitMatch(){
  if(state.ratingDelta!==null)return;
  const result=settleMatch(career,{id:state.matchId,level:state.difficulty,score:state.score,points:state.matchPoints,mode:state.mode,date:new Date().toISOString()});
  if(!result.applied)return;
  career=result.career;state.ratingDelta=result.delta;
  try{if(!testing)localStorage.setItem(CAREER_KEY,JSON.stringify(career));}catch{}
  updateCareerUI();
}
function assignDrillTarget() {
  state.targetIndex = (state.targetIndex + 1) % DRILL_TARGETS.length;
  state.target = DRILL_TARGETS[state.targetIndex];
  state.targetArmed = false;
  if (targetMarker) targetMarker.position.set(state.target.x, 0, state.target.z);
}
function setAssist(value) {
  state.assists = value;movementOwner.reset();state.manualOverride=false; $('#assist-toggle').checked = value; $('#assist-label').textContent = value ? '辅助跑位' : '自由跑位';
  if (state.screen === 'play') feedback(value ? '辅助跑位已开启' : '自由跑位', value ? '鼠标可完成整局 · 空格 / WASD 可选' : 'WASD 移动 · 鼠标左键智能回球');
}
function feedback(title, subtitle) {
  $('#hit-feedback strong').textContent = title; $('#hit-feedback span').textContent = subtitle || '';
  $('#hit-feedback').style.opacity = 1; state.feedback = 1.5;
}
function startGame(mode = 'match', preserveSettings = false) {
  groundMotion = null; lastLineReview = null; reviewPending = -1; flightRecorder.reset();
  $('#eagle-point-review').classList.add('hidden'); $('#last-line-review').disabled = true;
  initAudio(); state.mode = mode; state.difficulty = $('#difficulty').value;
  state.playerStyle=$('#player-style').value;state.opponentStyle=$('#opponent-style').value;state.playerStats=playerStatsFromInputs();state.highBallAssist=$('#high-ball-toggle').checked;
  bot.setKit(state.opponentStyle);
  Object.assign(state, { screen: 'play', phase: 'serve', score: [0, 0], rally: 0, maxRally: 0, hits: 0, maxSpeed: 0, finished: false, stamina: 100, swing: 0, swingContact: false, swingMissed: false, jump: 0, jumpV: 0, timer: 0, serveCount: 0, yaw: 0, pitch: -.03,manualPitch:-.03,autoPitchOffset:0, aim: 0, countdown: 0, pointDelay: 0, charge: 0, hitstop: 0, lastMove: -10, lastLook: -10, targetIndex: -1, target: null, targetArmed: false, targetHits: 0, targetShots: 0, targetStreak: 0 });
  try { state.targetBest = testing ? 0 : Number(localStorage.getItem('feather-court-2-target-best')) || 0; } catch { state.targetBest = 0; }
  state.depth = -4.7;state.manualLanding=false;state.shotCueUntil=0;state.aiming=false;state.aimAlt=false;state.swingTarget=null;state.serveTarget=null;state.lastLanding=null;document.body.classList.remove('choosing-landing');state.contactFlash=0;state.profile=$('#opponent-profile').value;dash.reset();setControlsVisible(false);
  jumping.reset();movementOwner.reset();state.manualOverride=false;state.tutorial=false;state.jumpPeak=0;state.cameraPeak=1.69;state.handsOn=false;state.inputTrace=[];$('#lesson-card').classList.add('hidden');
  state.matchPoints=Number($('#match-points').value)||11;state.server='player';state.matchId=crypto.randomUUID?.()||`${Date.now()}-${random()}`;state.ratingDelta=null;
  state.smashes=0;state.winners=0;state.errors=0;state.lastShot=null;setShot('auto');
  if (!preserveSettings) {
    const scheme = $('#control-scheme').value;
    state.assists = scheme !== 'manual'; state.comfortable = scheme === 'tracking';
  }
  $('#comfortable-toggle').checked = state.comfortable;
  hitIntent.clear(); pointerDown = false; accumulator = 0; setAssist(state.assists);
  opponent.returns = 0; opponent.energy = 100; opponent.pos.set(-.4, 0, -4.5); opponent.vel.set(0, 0, 0);
  opponent.history=[];opponent.readRally=-1;opponent.readTarget=null;opponent.netLunge=0;opponent.netHold=0;opponent.lastContact=null;opponent.lastTarget=null;opponent.action='';opponent.actionAt=-10;opponent.movementMode='ready';opponent.actionCounts={};opponent.movementCounts={};ball.spin=0;state.lastPlacement=null;
  player.pos.set(.45, 0, 4.45); player.vel.set(0, 0, 0); keys.clear();
  $('#menu').classList.add('hidden'); $('#pause-overlay').classList.add('hidden'); $('#help-overlay').classList.add('hidden'); $('#hud').classList.remove('hidden'); document.body.classList.add('playing');
  const modeNames = { match: '单打比赛', practice: '自由对打', targets: '打点挑战' };
  $('#game-mode').textContent = modeNames[mode] || modeNames.match;
  $('#player-score-name').textContent = mode === 'targets' ? '命中' : '你';
  $('#opponent-score-name').textContent = mode === 'targets' ? '出手' : `${OPPONENT_STYLES[state.opponentStyle].name}`;
  $('#score-status').textContent = mode === 'practice' ? '保持节奏' : mode === 'targets' ? '瞄准场地区域' : `${state.matchPoints} 分制`;
  $('#point-toast').classList.add('hidden'); $('#resume-btn').innerHTML = '继续比赛 <span>→</span>';
  $('#speed-label').textContent='等待发球';
  updateCourtScore(); prepareServe();camera.position.set(player.pos.x,1.69,player.pos.z);camera.rotation.set(state.pitch,state.yaw,0,'YXZ');canvas.focus({preventScroll:true}); requestLock();
  if (mode === 'targets') feedback('六区打点挑战', '选择高远 / 轻吊，再瞄准发光区域');
  else if (mode === 'practice') feedback('鼠标自由看 · Alt + 鼠标调落点', '左键智能回球 · 右键杀球 · WASD / 空格可选');
  else feedback('鼠标看球，左键就能开打', '左键智能发球与回球 · 右键杀球 · 辅助跑位默认开启');
  updateHud();
}
function prepareServe() {
  groundMotion = null; reviewPending = -1; flightRecorder.reset();
  $('#eagle-point-review').classList.add('hidden');
  state.phase = 'serve'; state.rally = 0; ball.active = false; ball.trail.length = 0; state.prediction = null; state.lastHitter = 'player'; state.swing = 0;
  // Rally is a per-point hit count and returns to 1 on every serve.
  opponent.defenseRally = -1;
  // A short-serve receiver starts near the front service line, not at the
  // rear-court rally base. Otherwise every beginner loses before moving.
  if(state.mode!=='targets'&&(state.server==='player'||state.mode==='practice')){
    const base=opponentReceiveBase({serverX:player.pos.x,high:state.serveStyle==='high'});opponent.pos.set(base.x,0,base.z);opponent.vel.set(0,0,0);
  }
  if (state.mode === 'targets') assignDrillTarget();
  ball.pos.set(player.pos.x-.1,1.25,player.pos.z-1.15);ball.vel.set(0,0,0);landingMarker.visible=false;trailLine.visible=false;
  state.lastShot=null;state.lastFault=null;
  movementOwner.reset();state.manualOverride=false;
  if(state.tutorial){state.phase=state.tutorialStage>=2?'serve':'lesson';if(state.tutorialStage>=2)state.countdown=1.0;}
  if(state.mode==='match'&&state.server==='opponent'){
    state.phase='opponentServe';state.countdown=1.55;ball.pos.set(opponent.pos.x,1.15,opponent.pos.z+.65);$('#serve-copy').textContent='接发准备 · 稳住中路，等球到身前';$('#serve-hint').classList.remove('hidden');
  }
  for(const entity of [player,opponent,ball])entity.previous.copy(entity.pos);
  $('#serve-hint').classList.remove('hidden'); $('#point-toast').classList.add('hidden');
}

function lunge() {
  if (state.screen !== 'play') return;
  let x = (keys.has('KeyD') ? 1 : 0) - (keys.has('KeyA') ? 1 : 0) + touchMove.x;
  let z = (keys.has('KeyS') ? 1 : 0) - (keys.has('KeyW') ? 1 : 0) + touchMove.y;
  if (Math.hypot(x, z) < .1 && player.speed > .5) { x = player.vel.x; z = player.vel.z; }
  if (Math.hypot(x, z) < .1 && state.lastHitter === 'opponent' && ball.active) {
    x = ball.pos.x - player.pos.x; z = ball.pos.z - player.pos.z;
  }
  if (!dash.start(x, z, state.stamina)) return;
  state.stamina = Math.max(0, state.stamina - 14); state.lastMove = state.timer + .7;
  haptic(.62,.3,48);
  noise(.1, 380, .08, 'highpass');
}
function serve() {
  if (state.screen !== 'play' || state.phase !== 'serve') return;
  ball.spin=0;ball.spinAt=state.timer;
  if(state.tutorial){
    ball.pos.set(0,2.4,-4.8);ball.previous.copy(ball.pos);
    ball.vel.copy(solveShot(ball.pos,{x:player.pos.x,z:clamp(player.pos.z-.6,2.2,5.6)},'clear'));
    ball.active=true;state.phase='rally';state.lastHitter='opponent';state.rally=1;opponent.returns=0;refreshPrediction();return;
  }
  if (state.mode === 'targets') {
    $('#serve-hint').classList.add('hidden');
    const feed = practiceFeed(state.serveCount);
    ball.pos.set(opponent.pos.x, 2.05, -4.55);
    ball.vel.copy(solveShot(ball.pos, { x: feed.x * .7, z: feed.z }, feed.type));
    ball.active = true; state.phase = 'rally'; state.lastHitter = 'opponent'; state.rally = 1;
    state.serveCount++; opponent.swing = .001; state.swing = 0; state.targetArmed = false;
    refreshPrediction(); hitSound(feed.type, true); recordSpeed();
    return;
  }
  $('#serve-hint').classList.remove('hidden');ball.pos.set(player.pos.x-.1,1.16,player.pos.z-1.05);ball.previous.copy(ball.pos);
  state.serveTarget={x:clamp(-Math.sign(player.pos.x||1)*1.25+state.aim*.35,-1.8,1.8),z:state.serveStyle==='high'?-5.45:-2.15};
  state.phase='serving';state.serveElapsed=0;ball.active=false;
  state.swing=.001;state.swingKind='serve';state.swingContact=true;state.contactElapsed=.2;state.contactPoint=ball.pos.clone();
}
function releaseServe(){
  const target = state.serveTarget || selectedLanding('serve');
  ball.spin=0;ball.spinAt=state.timer;
  ball.vel.copy(solveShot(ball.pos, target, 'serve',state.serveStyle==='high'?{up:10}:{})); ball.active = true; state.phase = 'rally'; state.lastHitter = 'player'; state.rally = 1;
  state.serveCount++;state.contactPoint=ball.pos.clone();state.contactElapsed=state.swing;
  $('#serve-hint').classList.add('hidden');opponent.returns = 0; state.returnDelay = state.timer + currentOpponentLevel().reaction; refreshPrediction(); hitSound('serve'); recordSpeed();
}
function refreshPrediction() {
  const level=currentOpponentLevel(),opponentHeight=level.rating>=1350?2.8:2.3;
  state.prediction = predict(ball.pos, ball.vel, state.lastHitter === 'player' ? -1 : 1, state.lastHitter === 'player' ? opponentHeight : ['smash','slicesmash','drop','slicedrop'].includes(state.shot)?2.98:2.05);
}
function recordSpeed() {
  const speed = Math.round(ball.vel.length() * 3.6); state.maxSpeed = Math.max(state.maxSpeed, speed);
  $('#speed-label').textContent = `${speed} KM/H`; return speed;
}
function autoShot() {
  if (state.mode === 'targets' && state.target) return state.target.z > -3 ? 'drop' : 'clear';
  const target=state.manualLanding?selectedLanding():null;
  if(ball.pos.y<1.45&&ball.pos.z>player.pos.z-.4&&ball.pos.z<player.pos.z+.2){
    const netGrade=gradeContact({position:ball.pos,player:player.pos,kind:'net',assisted:state.assists,speed:player.speed,jump:state.jump,stamina:state.stamina});
    if(netGrade.quality>=.5)return 'net';
  }
  if(ball.pos.y>=1.45&&ball.pos.y<=2.3&&player.pos.z<3.35){
    const pushGrade=gradeContact({position:ball.pos,player:player.pos,kind:'push',assisted:state.assists,speed:player.speed,jump:state.jump,stamina:state.stamina});
    if(pushGrade.quality>=.55)return 'push';
  }
  if(ball.pos.y>1.75&&ball.pos.z>player.pos.z-.3&&ball.pos.z<player.pos.z+.35){
    const killGrade=gradeContact({position:ball.pos,player:player.pos,kind:'netkill',assisted:state.assists,speed:player.speed,jump:state.jump,stamina:state.stamina});
    if(killGrade.quality>=.62)return 'netkill';
  }
  return smartStroke({position:ball.pos,player:player.pos,assisted:state.assists,speed:player.speed,jump:state.jump,stamina:state.stamina,aimShort:Boolean(target&&target.z>-2.8)});
}
function beginSwing(override) {
  if (state.screen !== 'play') return;
  initAudio();
  if (state.phase === 'serve') { serve(); return; }
  if (state.phase !== 'rally') return;
  hitIntent.press(state.timer, override || null);
}
function requestJump(){
  if(state.screen!=='play')return;
  if(state.stamina<10){feedback('体能不足', '稍作恢复后再起跳');return;}
  jumping.request();
}
function performControl(command,source){
  if(!command||state.screen!=='play')return;
  if((state.aiming||state.aimAlt)&&command.action==='hit')return;
  if(state.phase==='serve'&&command.kind&&command.kind!=='auto')return;
  if((source==='pointer'||source==='pointer-smash')&&!state.assists)setAssist(true);
  if(testing&&state.handsOn)state.inputTrace.push({source,action:command.action,kind:command.kind??null,time:+state.timer.toFixed(2)});
  if(command.action==='jump'){requestJump();return;}
  if(command.kind)setShot(command.kind);
  hitIntent.press(state.timer,command.kind,source);beginSwing(command.kind);
}
function setControlsVisible(value){
  state.controlsVisible=Boolean(value);document.body.classList.toggle('controls-visible',state.controlsVisible);
  $('#focus-btn').classList.toggle('active',state.controlsVisible);$('#focus-btn').setAttribute('aria-pressed',String(state.controlsVisible));
  $('#focus-btn').innerHTML=`${state.controlsVisible?'收起':'击球'}操作 <kbd>H</kbd>`;
}
function setAdvanced(value){
  state.advanced=Boolean(value);document.body.classList.toggle('advanced-controls',state.advanced);
  $('#advanced-btn').setAttribute('aria-pressed',String(state.advanced));
  $('#advanced-btn').textContent=state.advanced?'收起战术 Tab':'战术面板 Tab';
}
const LESSONS=[
 ['W A S D','先走两步','用 WASD 或方向键移动。W 朝球网，S 后退。'],
 ['SPACE','空格就是起跳','按一下空格，感受升空和落地。Q 也可以。'],
 ['左键','来球时按住左键','稍早按也可以；左键松开后仍会保留这次接球。'],
 ['右键','试试杀球','按住右键等高球。想跳杀，先空格再右键。'],
 ['完成','基础动作完成','鼠标看球，Alt 调落点。左键回球，空格起跳，右键杀球。'],
];
function setLessonStage(stage){
  state.tutorialStage=stage;
  const [key,title,body]=LESSONS[stage];$('#lesson-step').textContent=stage<4?`操作练习 ${stage+1} / 4`:'操作练习完成';
  $('#lesson-key').textContent=key;$('#lesson-title').textContent=title;$('#lesson-body').textContent=body;
  $('#lesson-finish').classList.toggle('hidden',stage<4);
  for(const el of document.querySelectorAll('#lesson-progress i'))el.classList.toggle('done',Number(el.dataset.step)<=stage);
  if(stage===2){setAssist(true);state.phase='serve';state.countdown=1.0;}
  if(stage===3)chooseLanding({x:0,z:-3.8});
  if(stage===3)hitIntent.clear();
  if(stage===4){state.tutorial=false;ball.active=false;state.phase='lesson';hitIntent.clear();}
}
function startLesson(){
  startGame('practice');state.tutorial=true;state.lessonOrigin=player.pos.clone();state.phase='lesson';ball.active=false;setAssist(false);setLessonStage(0);
  $('#serve-hint').classList.add('hidden');
  $('#lesson-card').classList.remove('hidden');$('#hit-feedback').style.opacity=0;
}
function contactReady(preparing = false) {
  return canContact({position:ball.pos,velocity:ball.vel,player:player.pos,active:ball.active,lastHitter:state.lastHitter,assisted:state.assists || dash.remaining > 0,jump:state.jump,yaw:state.yaw,preparing,reachBonus:(state.playerStats.defense-1)*.55});
}
function handleHitIntent() {
  if (!hitIntent.armed(state.timer) || !contactReady(true) || state.swing > 0) return;
  const serveReceive=state.lastShot?.type==='serve'&&state.rally===1,contactDelay=serveReceive?.04:.085;
  state.swingKind = hitIntent.kind==='auto' ? autoShot() : hitIntent.kind || (state.shot === 'auto' ? autoShot() : state.shot);
  const anticipated=swingWindow({position:ball.pos,velocity:ball.vel,player:player.pos,playerVelocity:player.vel,kind:state.swingKind,jump:state.jump,assisted:state.assists||dash.remaining>0,age:state.timer-hitIntent.lastPressAt,pace:ballTimeScale(),lookAhead:contactDelay,active:ball.active,lastHitter:state.lastHitter,yaw:state.yaw});
  if(!anticipated)return;
  state.swing = .001; state.swingContact = false; state.swingMissed = false;state.contactElapsed=contactDelay;state.swingRequestedKind=hitIntent.kind;
  if(state.mode==='targets'&&state.target)state.swingTarget={x:state.target.x,z:state.target.z};
  else state.swingTarget=selectedLanding(state.swingKind);
  state.contactPoint=V(anticipated.x,anticipated.y,anticipated.z);
}
function tryPlayerHit() {
  if (!contactReady()) return false;
  let type = state.swingKind;
  if(ball.pos.y<.85&&!['smash','slicesmash','net','netcross'].includes(type))type=ball.pos.z<2.6?'net':'lift';
  const wasOpponentShot = state.lastHitter === 'opponent';
  const contact = gradeContact({ position: ball.pos, player: player.pos, kind: type, assisted: state.assists,speed:player.speed,jump:state.jump,stamina:state.stamina });
  const target = state.swingTarget || selectedLanding(type);
  const attacking=['smash','slicesmash','netkill'].includes(type);
  const shot=strokeOutcome({position:ball.pos,player:player.pos,kind:type,target,speed:player.speed,jump:state.jump,stamina:state.stamina*(.72+.28*state.playerStats.stamina),assisted:state.assists,qualityBonus:(state.playerStats.control-1)*.30+(['drop','slicedrop','net','netcross','lift'].includes(type)?(state.playerStats.net-1)*.25:0)});
  if(shot.speedMps!==null)shot.speedMps=clamp((shot.speedMps+racketPowerBoost(state.racketStyle,type))*(.4+.6*state.playerStats.attack),16,110);
  state.contactPoint=ball.pos.clone();state.contactElapsed=state.swing;
  ball.vel.copy(solveShot(ball.pos, shot.target, type,{speed:shot.speedMps,touch:state.playerStats.net,quality:shot.quality}));
  if(shot.fault==='net')ball.vel.y-=5.8;
  state.lastTarget = shot.target; state.lastQuality = shot.quality; state.contactFlash = .38;state.lastShot={type,...shot,intended:{...target}};state.lastFault=shot.fault;
  state.lastLanding=predict(ball.pos,ball.vel,-1).landing;state.lastPlacement={intended:{...target},landing:state.lastLanding,fault:shot.fault,reason:shot.reason};ball.spin=['net','netcross','slicedrop','slicesmash'].includes(type)?state.playerStats.net*(type==='netcross'?1.8:1):0;ball.spinAt=state.timer;
  if(['smash','slicesmash'].includes(type))state.smashes++;
  opponent.splitAt=state.timer;
  if (state.mode === 'targets' && wasOpponentShot) state.targetArmed = true;
  state.lastHitter = 'player'; state.rally++; state.hits++; state.swingContact = true; state.charge = 0;
  state.returnDelay = state.timer + currentOpponentLevel().reaction;
  state.impact = (attacking ? .009 : .0035)*state.motion;
  haptic(attacking?.9:contact.rating==='perfect'?.62:.38,attacking?.55:.22,attacking?68:36);
  state.hitstop = 0; state.stamina = Math.max(0, state.stamina - (attacking ? ((shot.heavy?7:4)+(state.racketStyle==='attack'?1.5:0))*(1.25-.25*state.playerStats.stamina) : .5*(1.25-.25*state.playerStats.stamina)));
  const names = { clear: '高远球', drive: '平抽快打', drop: '网前轻吊', smash: '强力杀球', lift: '反手挑球', net:'搓球控网', push:'推压后场', netkill:'网前扑杀',netcross:'网前勾对角',slicesmash:'劈杀大斜线',slicedrop:'劈吊对角' };
  const ratings = { perfect: '甜点击球', clean: '扎实回球', scramble: '救险回球' };
  feedback(`${attacking&&state.jump>.15?'跳杀':shot.heavy?'高点重杀':shot.fault?'击球失误':ratings[shot.rating]} · ${names[type]}`, `${recordSpeed()} KM/H · ${shot.reason}`); hitSound(type); refreshPrediction();
  if(state.tutorial&&state.tutorialStage===2)setLessonStage(3);
  else if(state.tutorial&&state.tutorialStage===3&&type==='smash'&&state.swingRequestedKind==='smash')setLessonStage(4);
  ball.flash = .18; ball.trail.length = 0;
  return true;
}
function opponentHit() {
  const level=currentOpponentLevel(),training=state.mode==='targets'||state.tutorial;
  const feed=practiceFeed(opponent.returns);
  const plan=training?{type:feed.type,target:{x:feed.x,z:feed.z},action:'练习喂球',spin:0}:planOpponentStroke({level,position:ball.pos,player:player.pos,playerVelocity:player.vel,energy:opponent.energy,profile:state.profile,tactic:OPPONENT_STYLES[state.opponentStyle]?.tactic||'balanced',history:opponent.history,random});
  const type=plan.type,shot=training?null:strokeOutcome({position:ball.pos,player:opponent.pos,kind:type,target:plan.target,side:-1,speed:Math.hypot(opponent.vel.x,opponent.vel.z),stamina:opponent.energy,qualityBonus:(level.accuracy-.7)*.18});
  if(shot){
    const execution=opponentStrokeExecution({level,type,target:shot.target,quality:shot.quality,energy:opponent.energy,random});
    shot.target=execution.target;shot.fault=shot.fault||execution.fault;
    const spread=(.035+(1-level.accuracy)*.95)*(1+(1-opponent.energy/100)*.85)+(1-shot.quality)*.35;shot.target.x+=normalRandom()*spread;shot.target.z+=normalRandom()*spread;
  }
  ball.vel.copy(solveShot(ball.pos,shot?.target||plan.target,type,{speed:['smash','slicesmash'].includes(type)?level.power*(type==='slicesmash'?.73:1)+(shot?.heavy?8:0):type==='netkill'?level.power*.65:null,touch:.6+level.netSkill}));
  // Do not rescale a solved trajectory: it changes the called landing and net clearance.
  if(shot?.fault==='net')ball.vel.y-=5.8;
  state.lastShot=null;state.lastFault=null;state.lastHitter='opponent';state.rally++;
  opponent.returns++;opponent.swing=.135;opponent.shot=type;opponent.contactPoint=ball.pos.clone();
  opponent.lastContact={x:ball.pos.x,z:ball.pos.z};opponent.lastTarget={...plan.target};
  opponent.action=(plan.backhand&&['net','netcross','push','netkill'].includes(type)?'反手 · ':'')+plan.action;opponent.actionAt=state.timer;
  opponent.history.push({type,action:plan.action,target:{...plan.target}});opponent.history=opponent.history.slice(-6);
  opponent.actionCounts[plan.action]=(opponent.actionCounts[plan.action]||0)+1;
  if(ball.pos.z>-2.6&&['net','netcross','push','netkill'].includes(type)){opponent.netHold=.48;opponent.netLunge=Math.max(opponent.netLunge,type==='netkill'?.95:.78);}
  ball.spin=plan.spin||(['netcross','slicedrop','slicesmash'].includes(type)?1.2+level.netSkill:0);ball.spinAt=state.timer;
  if(!training)opponent.energy=Math.max(15,opponent.energy-(['smash','slicesmash'].includes(type)?6.5:3.2)/level.stamina);
  hitSound(type,true);refreshPrediction();recordSpeed();ball.trail.length=0;
}
function scorePoint(winner, reason) {
  if (state.phase !== 'rally') return;
  ball.active = false; state.phase = 'point'; state.pointDelay = 2.2; state.prediction = null; state.swing = 0; state.swingContact = false;
  state.maxRally = Math.max(state.maxRally, state.rally);
  landingMarker.visible = false; state.charge = 0; hitIntent.consume();
  const playerWon = winner === 'player';
  if (state.mode === 'match') state.score[playerWon ? 0 : 1]++;
  state.server=winner;
  if(playerWon&&state.lastHitter==='player'&&['smash','slicesmash'].includes(state.lastShot?.type))state.winners++;
  if(!playerWon&&state.lastHitter==='player')state.errors++;
  const finished = state.mode === 'match' && matchFinished(state.score,state.matchPoints);
  state.finished = finished;
  if(finished)commitMatch();
  $('#point-toast').classList.remove('hidden'); $('#point-reason').textContent = reason;
  $('#point-title').textContent = state.mode === 'practice' ? `${state.rally} 拍，继续保持。` : finished ? (playerWon ? '拿下比赛。' : '下一场，再来。') : playerWon ? '漂亮，拿下一分。' : '调整一下，再来。';
  $('#point-subtitle').textContent = state.mode === 'practice' ? '自动开始下一轮练习' : `${String(state.score[0]).padStart(2, '0')}  :  ${String(state.score[1]).padStart(2, '0')}  /  ${state.rally} 拍回合${finished?` · 积分 ${state.ratingDelta>=0?'+':''}${state.ratingDelta}`:''}`;
  if (playerWon) { tone(660, .18, .1); setTimeout(() => tone(880, .25, .08), 100); } else tone(330, .18, .06, 240);
  updateCourtScore();
}

function recordLanding(contact, incomingVelocity) {
  lastLineReview = flightRecorder.finish(contact, incomingVelocity, state.lastHitter);
  groundMotion = createGroundMotion(contact, incomingVelocity);
  state.lastLanding = { ...lastLineReview.position };
  $('#eagle-point-review').classList.remove('hidden'); $('#last-line-review').disabled = false;
  if (lastLineReview.call.nearLine && $('#eagle-auto').checked && !state.tutorial) {
    reviewPending = state.timer + .65;
    state.pointDelay = Math.max(state.pointDelay, 2.5);
  }
}

function completeTargetShot(landing = ball.pos) {
  if (state.mode !== 'targets' || state.phase !== 'rally' || !state.target) return false;
  const error = targetDistance(landing, state.target);
  const inFarCourt = landing.z < 0 && Math.abs(landing.x) <= COURT.halfWidth && Math.abs(landing.z) <= COURT.halfLength;
  const returned = state.targetArmed;
  const success = returned && inFarCourt && error <= .88;
  state.targetShots++;
  if (success) {
    state.targetHits++; state.targetStreak++;
    state.targetBest = Math.max(state.targetBest, state.targetStreak);
    try { if (!testing) localStorage.setItem('feather-court-2-target-best', String(state.targetBest)); } catch {}
    tone(740 + Math.min(state.targetStreak, 8) * 35, .18, .13);
  } else {
    state.targetStreak = 0;
    tone(260, .16, .08, 180);
  }
  state.targetArmed = false; state.phase = 'point'; state.pointDelay = 1.05; state.prediction = null;
  state.maxRally = Math.max(state.maxRally, state.rally); state.swing = 0; state.swingContact = false;
  ball.active = false; landingMarker.visible = false; hitIntent.consume();
  $('#point-toast').classList.remove('hidden');
  $('#point-title').textContent = success ? '正中靶心！' : returned ? '落点偏了' : '来球落地了';
  $('#point-reason').textContent = `${state.target.name} · ${error.toFixed(1)} 米偏差`;
  $('#point-subtitle').textContent = `${state.targetHits} 次命中 / ${state.targetShots} 次出手 · 连中 ${state.targetStreak} · 最佳 ${state.targetBest}`;
  updateHud(); updateCourtScore();
  return true;
}

function moveCharacter(character, target, speed, dt, isPlayer = false) {
  const dx = target.x - character.pos.x, dz = target.z - character.pos.z, dist = Math.hypot(dx, dz);
  const desired = Math.min(speed, dist * 7);
  character.vel.x = damp(character.vel.x, dist > .025 ? dx / dist * desired : 0, 12, dt);
  character.vel.z = damp(character.vel.z, dist > .025 ? dz / dist * desired : 0, 12, dt);
  character.pos.x += character.vel.x * dt; character.pos.z += character.vel.z * dt;
  character.pos.x = clamp(character.pos.x, -3.35, 3.35);
  character.pos.z = isPlayer ? clamp(character.pos.z, .65, 7.35) : clamp(character.pos.z, -7.2, -.65);
}

function updatePlayer(dt, pad = null) {
  const movement = movementVector({
    left: keys.has('KeyA') || keys.has('ArrowLeft'), right: keys.has('KeyD') || keys.has('ArrowRight'),
    forward: keys.has('KeyW') || keys.has('ArrowUp'), back: keys.has('KeyS') || keys.has('ArrowDown'),
    axisX: (touchMove.x || 0) + (pad?.axes?.[0] || 0), axisY: -(touchMove.y || 0) - (pad?.axes?.[1] || 0),
  });
  let { x: mx, z: mz } = movement;
  const manual = movement.active;
  state.manualOverride=movementOwner.step({active:manual,rally:state.rally,lastHitter:state.lastHitter,phase:state.phase});
  const sprint = (keys.has('ShiftLeft')||keys.has('ShiftRight')) && state.stamina > 8;
  const speed = (sprint ? 7.1 : 5.25) * state.playerStats.speed;
  if (manual) {
    // The doubles court is the compass: forward is always toward the net.
    const vx = mx * speed * movement.magnitude, vz = -mz * speed * movement.magnitude;
    player.vel.x = moveVelocity(player.vel.x, vx, dt); player.vel.z = moveVelocity(player.vel.z, vz, dt);
    player.pos.addScaledVector(player.vel, dt); state.lastMove = state.timer + .55;
    player.pos.x = clamp(player.pos.x, -3.4, 3.4); player.pos.z = clamp(player.pos.z, .65, 7.35);
    if (sprint) state.stamina = Math.max(0, state.stamina - 18 * (1.2-.2*state.playerStats.stamina) * dt);
  } else if (state.assists && !state.manualOverride && state.jump===0 && state.timer - state.lastMove > .13 && state.phase === 'rally') {
    const intercept = state.prediction?.intercept;
    const incoming = state.lastHitter === 'opponent' && intercept;
    const receivingServe=state.lastShot?.type==='serve'&&state.rally===1;
    const receive = receivingTarget(state.prediction, player.pos, receivingServe);
    const target = incoming ? V(receive.x, 0, receive.z) : V(player.pos.x * .3, 0, 4.0);
    moveCharacter(player, target, (incoming ? 6.6 * state.playerStats.defense * state.playerStats.speed : 2.6 * state.playerStats.speed), dt, true);
  } else {
    player.vel.x=moveVelocity(player.vel.x,0,dt);player.vel.z=moveVelocity(player.vel.z,0,dt);player.pos.addScaledVector(player.vel,dt);
  }
  state.stamina = Math.min(100, state.stamina + (manual ? 3.5 : 9) * (.75+.25*state.playerStats.stamina) * dt);
  player.speed = Math.hypot(player.vel.x, player.vel.z);
  const jumpFrame=jumping.step(dt,state.stamina);state.jump=jumpFrame.height;state.jumpV=jumpFrame.velocity;state.stamina-=jumpFrame.cost;state.jumpPeak=Math.max(state.jumpPeak,state.jump);
  if(jumpFrame.launched){noise(.045,420,.04,'highpass');haptic(.18,.05,24);}
  if(jumpFrame.landed){noise(.09,170,.095);haptic(.25,.12,28);if(state.tutorial&&state.tutorialStage===1)setLessonStage(2);}
  if(state.tutorial&&state.tutorialStage===0&&player.pos.distanceTo(state.lessonOrigin)>.9)setLessonStage(1);
  if(pad){const dx=(pad.axes?.[2]||0),dy=(pad.axes?.[3]||0);if(Math.hypot(dx,dy)>.15){if(pad.buttons[4]?.pressed)chooseLanding(moveLanding(selectedLanding(),dx*dt*160,dy*dt*160));else if(!state.comfortable){const view=freeLook({...state,pitch:state.manualPitch},dx*dt*850,dy*dt*850);state.yaw=view.yaw;state.manualPitch=view.pitch;state.pitch=state.manualPitch+state.autoPitchOffset;}}}
  const dashStep = dash.step(dt);
  player.pos.x = clamp(player.pos.x + dashStep.x, -3.4, 3.4);
  player.pos.z = clamp(player.pos.z + dashStep.z, .65, 7.35);
  if (state.comfortable) {
    const tracking = state.phase === 'rally';
    const goal=tracking?trackAngles({x:player.pos.x,y:1.69+state.jump,z:player.pos.z},ball.pos,ball.vel,state.yaw):{yaw:0,pitch:-.04};
    const angles=stepTracking(state,goal,dt);state.yaw=angles.yaw;state.pitch=angles.pitch;
  }
  const previousStep=player.step;player.step+=player.speed*dt;
  if(player.speed>.7&&state.jump===0&&Math.floor(player.step/.95)!==Math.floor(previousStep/.95)){noise(.055,210,.035+player.speed*.004,'lowpass',Math.sin(player.step*3)*.18);noise(.022,1200,.015,'bandpass');}
  previousManual = manual;
}

function updateOpponent(dt) {
  const level=currentOpponentLevel(),training=state.mode==='targets'||state.tutorial;
  const incoming=state.lastHitter==='player'&&state.phase==='rally',intercept=state.prediction?.intercept;
  const base=recoveryBase({lastContact:opponent.lastContact,lastTarget:opponent.lastTarget,level});
  const moveStart=state.returnDelay;
  let target={...base};
  if(state.phase==='serve'||state.phase==='serving')target={x:opponent.pos.x,z:opponent.pos.z};
  if(state.mode==='targets')target={x:-.35,z:-4.5};
  else if(incoming&&intercept){
    if(opponent.readRally!==state.rally||state.timer>(opponent.readAgain||0)){
      const error=training?0:(1-level.accuracy)*.38;
      opponent.readTarget={x:clamp(intercept.x-.1+rand(-error,error),-2.9,2.9),z:clamp(intercept.z-(intercept.z> -2.4?.58:.7),-6.9,-.75)};
      opponent.readRally=state.rally;opponent.readAgain=state.timer+.23-level.anticipation*.14;
    }
    target=opponent.readTarget||target;
  }
  const waiting=incoming&&state.timer<=moveStart;
  const locomotion=opponentFootwork({position:opponent.pos,velocity:opponent.vel,target,level:training?{...level,speed:5.9,acceleration:20}:level,energy:opponent.energy,waiting},dt);
  opponent.pos.set(locomotion.position.x,0,locomotion.position.z);opponent.vel.set(locomotion.velocity.x,0,locomotion.velocity.z);
  opponent.movementMode=incoming?locomotion.mode:Math.hypot(target.x-opponent.pos.x,target.z-opponent.pos.z)>.35?'recover':'ready';
  opponent.movementCounts[opponent.movementMode]=(opponent.movementCounts[opponent.movementMode]||0)+1;
  const dist=Math.hypot(ball.pos.x-opponent.pos.x,ball.pos.z-opponent.pos.z),reach=training?1.25:level.reach;
  opponent.netHold=Math.max(0,opponent.netHold-dt);
  const netReach=incoming&&ball.active&&ball.pos.z>-2.6&&ball.pos.y<2.3&&dist<1.65;
  opponent.netLunge=damp(opponent.netLunge,netReach?.9:opponent.netHold>0?.72:0,netReach?15:8,dt);
  if(incoming&&ball.vel.y<0&&ball.pos.y<3.45&&dist<2&&opponent.swing===0){opponent.swing=.001;opponent.shot=ball.pos.z>-2.6?'net':ball.pos.y>2?'clear':'drive';}
  if(state.mode!=='targets'&&incoming&&ball.active&&state.timer>state.returnDelay&&opponentContactWindow({ball:ball.pos,position:opponent.pos,level,training})&&ball.vel.y<1&&opponent.defenseRally!==state.rally){
    opponent.defenseRally=state.rally;
    const incomingShot=state.lastShot?.type||'serve';
    if(random()<opponentReceiveMissChance({level,shot:incomingShot,position:ball.pos,distance:dist,reach,energy:opponent.energy})){
      opponent.swing=.001;opponent.shot='miss';opponent.action='接球失误';opponent.actionAt=state.timer;
    }else opponentHit();
  }
  const speed=Math.hypot(opponent.vel.x,opponent.vel.z);
  if(!training)opponent.energy=clamp(opponent.energy+(state.phase!=='rally'?16*level.stamina:speed>2?-speed*1.25/level.stamina:7*level.stamina)*dt,15,100);
  const before=opponent.step;opponent.step+=dt*speed*2.7;
  if(speed>.95&&Math.floor(before*1.55)!==Math.floor(opponent.step*1.55))noise(.045,210,.024,'lowpass',clamp((opponent.pos.x-player.pos.x)/5,-.9,.9));
  const angle=incoming?Math.atan2(ball.pos.x-opponent.pos.x,ball.pos.z-opponent.pos.z):Math.atan2(player.pos.x-opponent.pos.x,player.pos.z-opponent.pos.z);
  opponent.facing=damp(opponent.facing||0,clamp(angle,-1.4,1.4),7,dt);
  if(opponent.swing>0){opponent.swing+=dt;if(opponent.swing>.55)opponent.swing=0;}
}
function updateBall(dt) {
  if (!ball.active) {
    if (groundMotion) {
      const impacts = stepGroundMotion(groundMotion, dt);
      ball.pos.set(groundMotion.pos.x, groundMotion.pos.y, groundMotion.pos.z);
      ball.vel.set(groundMotion.vel.x, groundMotion.vel.y, groundMotion.vel.z);
      if (impacts && groundMotion.age < .8) noise(.025, 650, clamp(groundMotion.lastImpact*.013,.006,.05), 'lowpass');
    }
    return;
  }
  const flightKey = `${state.serveCount}:${state.rally}:${state.lastHitter}`;
  const previous = { x: ball.pos.x, y: ball.pos.y, z: ball.pos.z };
  if (flightRecorder.key !== flightKey) flightRecorder.record(flightKey, previous);
  const previousZ = ball.pos.z, previousY = ball.pos.y;
  advance(ball.pos, ball.vel, dt);
  const contact = groundCrossing(previous, ball.pos);
  flightRecorder.record(flightKey, contact || ball.pos, dt * (contact?.fraction ?? 1));
  if (previousZ * ball.pos.z < 0 && Math.abs(ball.pos.x) < 3.13) {
    const t = previousZ / (previousZ - ball.pos.z), netY = previousY + (ball.pos.y - previousY) * t;
    if (netY < COURT.netHeight + .035) {
      net.userData.hit({x:previous.x+(ball.pos.x-previous.x)*t,y:netY},clamp(ball.vel.z/14,-1.5,1.5));
      ball.vel.z *= -.12; ball.vel.x *= .4; ball.vel.y = -Math.abs(ball.vel.y) * .15; ball.pos.z = Math.sign(previousZ) * .055;
      noise(.13, 1600, .12);
      if (completeTargetShot(ball.pos)) return;
      scorePoint(state.lastHitter === 'player' ? 'opponent' : 'player', '触网');
      // A dead shuttle still falls away from the net and settles on the mat.
      groundMotion = createGroundMotion(ball.pos, ball.vel);
      Object.assign(groundMotion.pos, { x: ball.pos.x, y: ball.pos.y, z: ball.pos.z });
      Object.assign(groundMotion.vel, { x: ball.vel.x, y: ball.vel.y, z: ball.vel.z });
      return;
    }
  }
  if (contact) {
    ball.pos.set(contact.x, contact.y, contact.z);
    const incomingVelocity = { x: ball.vel.x, y: ball.vel.y, z: ball.vel.z };
    noise(.045, 780, clamp(Math.abs(ball.vel.y) * .009, .025, .15), 'lowpass');
    const winner = winnerOnLanding(contact, state.lastHitter);
    if (!completeTargetShot(contact)) {
      const call = flightRecorder.finish(contact, incomingVelocity, state.lastHitter).call;
      scorePoint(winner, !call.inside ? '界外球' : call.onLine ? '压线 · 界内球' : contact.z > 0 ? '落地 · 对手得分' : '落地 · 你的得分');
    }
    recordLanding(contact, incomingVelocity);
    return;
  }
  if (Math.abs(ball.pos.x) > 12 || Math.abs(ball.pos.z) > 18 || ball.pos.y > 30) {
    if (completeTargetShot(ball.pos)) return;
    scorePoint(state.lastHitter === 'player' ? 'opponent' : 'player', '界外球');
  }
}

function updateSwing(dt) {
  if (state.swing <= 0) return;
  state.swing += dt;
  // A short, visible wind-up makes the racket contact land in the swing animation.
  const contactDelay=state.lastShot?.type==='serve'&&state.rally===1?.04:.085;
  if (!state.swingContact && !state.swingMissed && state.swing >= contactDelay) {
    if (tryPlayerHit()) hitIntent.consume();
    else if (state.swing >= .215) {
      state.swingMissed = true; hitIntent.consume();
      noise(.07, 420, .035, 'highpass');
      feedback('挥空了', '挥拍稍早或站得太远 · 跟球移动，再提前按下');
    }
  }
  if (state.swing > .46) { state.swing = 0; state.charge = 0; }
}

function positionServeHand(cork,pose){
  const hand=racket.userData.support;if(!hand)return;
  hand.visible=Boolean(pose);if(!pose)return;
  hand.rotation.fromArray([...pose.rotation,'XYZ']);
  const pinch=V(-.023,.137,.018).multiply(hand.scale).applyQuaternion(hand.quaternion);
  hand.position.copy(cork).add(V(...pose.offset)).sub(pinch);
}
function updateCamera(dt) {
  const ballInFront=ball.active&&state.lastHitter==='opponent'&&state.highBallAssist;
  const gait=groundedCameraOffset({speed:player.speed,lateral:player.vel.x,forward:player.vel.z,phase:player.step*6.6,intensity:state.motion});
  cameraGoal.set(player.renderPos.x+gait.x,1.69+state.jump-jumping.landing*.055+(state.jump>0?0:gait.y),player.renderPos.z+gait.z);
  camera.position.x=damp(camera.position.x,cameraGoal.x,27,dt);camera.position.y=damp(camera.position.y,cameraGoal.y,27,dt);camera.position.z=damp(camera.position.z,cameraGoal.z,27,dt);
  const wantedAuto=highBallOffset({eye:camera.position,ball:ball.renderPos,yaw:state.yaw,manualPitch:state.manualPitch,fov:camera.fov,enabled:ballInFront&&!state.comfortable});
  state.autoPitchOffset=stepHighBallOffset(state.autoPitchOffset,wantedAuto,dt);
  if(!state.comfortable)state.pitch=clamp(state.manualPitch+state.autoPitchOffset,-1.42,1.545);
  state.impact*=Math.exp(-18*dt);camera.rotation.order='YXZ';camera.rotation.y=state.yaw;camera.rotation.x=state.pitch+Math.sin(state.timer*85)*state.impact;
  camera.rotation.z=damp(camera.rotation.z,gait.roll,16,dt);
  state.cameraPeak=Math.max(state.cameraPeak||0,camera.position.y);
  const fov=69+(keys.has('ShiftLeft')&&player.speed>4.5?1.5:0)+(dash.remaining>0?1.5:0);
  camera.fov=damp(camera.fov,fov,9,dt);camera.updateProjectionMatrix();camera.updateMatrixWorld(true);
  let contact=null;if(state.swing>0&&state.contactPoint){const p=camera.worldToLocal(state.contactPoint.clone());if(p.z<-.12)contact=p.toArray();}
  const pose=swingPose({elapsed:state.swing,kind:state.swingKind,contact,contactTime:state.contactElapsed||.095,armed:hitIntent.armed(state.timer),time:state.timer,speed:player.speed,power:state.lastShot?.heavy?1:0});
  if(state.swing===0&&camera.aspect<1)pose.position[0]*=Math.max(.38,camera.aspect);
  racket.position.fromArray(pose.position);racket.rotation.fromArray([...pose.rotation,'XYZ']);
  if(racket.userData.support){
    const supportPose=serveSupportPose({phase:state.phase,elapsed:state.serveElapsed,swing:state.swingKind==='serve'?state.swing:0});
    positionServeHand(supportPose?camera.worldToLocal((state.phase==='rally'?state.contactPoint:ball.renderPos).clone()):null,supportPose);
  }
}
function updateOpponentModel(dt) {
 bot.root.position.copy(opponent.renderPos);bot.root.rotation.y=opponent.facing||0;
 const receiving=state.lastHitter==='player'&&state.phase==='rally',near=receiving?Math.max(0,1-Math.hypot(ball.pos.x-opponent.pos.x,ball.pos.z-opponent.pos.z)/4):0;
 bot.root.updateMatrixWorld(true);const strike=receiving?ball.pos:opponent.contactPoint;
 const contact=strike?bot.root.worldToLocal(strike.clone()).toArray():null;
 bot.update({speed:Math.hypot(opponent.vel.x,opponent.vel.z),dt,time:state.timer,swing:opponent.swing,lateral:opponent.vel.x,forward:opponent.vel.z,shot:opponent.shot||'clear',anticipation:near,lookY:ball.pos.y,lookX:ball.pos.x-opponent.pos.x,split:Math.max(0,1-(state.timer-(opponent.splitAt??-10))/.25),crossover:opponent.movementMode==='crossover',lunge:opponent.netLunge,netVariant:opponent.action,contact});
 bot.label.visible=!state.focus;bot.label.quaternion.copy(camera.quaternion);bot.label.rotation.x=0;bot.label.rotation.z=0;
}

function updateEffects(dt) {
  shuttle.position.copy(ball.renderPos);
  if (groundMotion) {
    const q = new THREE.Quaternion().setFromAxisAngle(V(Math.cos(groundMotion.heading), 0, -Math.sin(groundMotion.heading)), groundMotion.tilt);
    const roll = new THREE.Quaternion().setFromAxisAngle(UP, groundMotion.roll); q.multiply(roll);
    shuttle.quaternion.copy(q);
  } else if (ball.vel.lengthSq() > .05 && ball.active) {
    tmp.copy(ball.vel).normalize().negate();
    const q = new THREE.Quaternion().setFromUnitVectors(UP, tmp);
    // Brushed net shots visibly roll around their flight axis for a short
    // distance; the shuttle still follows the same drag-and-gravity model.
    const spinAge=Math.max(0,state.timer-(ball.spinAt??state.timer));
    if(ball.spin>0){shuttleSpin.setFromAxisAngle(UP,Math.min(18,ball.spin*9*spinAge));q.multiply(shuttleSpin);}
    shuttle.quaternion.slerp(q, 1 - Math.exp(-25 * dt));
  } else shuttle.rotation.set(0, state.timer * .6, .2);
  const d = camera.position.distanceTo(ball.pos);
  // Preserve a readable feather silhouette at distance without changing physics.
  const readableScale=d*2*Math.tan(camera.fov*Math.PI/360)*9/Math.max(1,innerHeight)/.064;
  shuttle.scale.setScalar(groundMotion ? 1 : clamp(Math.max(1+d*.025,readableScale),1,2.2));
  shuttleShadow.position.set(ball.renderPos.x, .016, ball.renderPos.z); shuttleShadow.scale.setScalar(.7 + ball.pos.y * .18); shuttleShadow.material.opacity = clamp(.28 - ball.pos.y * .022, .04, .26);
  if (ball.active) {
    ball.trail.unshift(ball.renderPos.clone()); if (ball.trail.length > (state.focus?5:9)) ball.trail.pop();
    const count = ball.trail.length, positions = trailLine.geometry.attributes.position.array;
    for (let i = 0; i < count; i++) ball.trail[i].toArray(positions, i * 3);
    trailLine.geometry.setDrawRange(0, count); trailLine.geometry.attributes.position.needsUpdate = true; trailLine.visible = true;
    trailLine.material.opacity = state.focus?.075:.16;
  } else trailLine.visible = false;
  const land = state.prediction?.landing;
  landingMarker.visible = state.screen === 'play' && state.assists && !state.focus && state.lastHitter === 'opponent' && ball.active && land?.z > 0;
  if (landingMarker.visible) { landingMarker.position.set(clamp(land.x, -3.6, 3.6), 0, clamp(land.z, .2, 7.5)); landingMarker.scale.setScalar(1 + Math.sin(state.timer * 6) * .06); }
  targetMarker.visible = state.screen === 'play' && state.mode === 'targets' && Boolean(state.target);
  if (targetMarker.visible) targetMarker.scale.setScalar(1 + Math.sin(state.timer * 4.5) * .045);
  net.userData.update(dt);
  if (state.feedback > 0) { state.feedback -= dt; if (state.feedback <= .3) $('#hit-feedback').style.opacity = Math.max(0, state.feedback / .3); }
  state.contactFlash = Math.max(0, (state.contactFlash || 0) - dt);
  // World, racket and feather motion remain at the full render rate. Small
  // DOM indicators only need 30 Hz; avoid styling hidden tactical widgets 60×/s.
  if(state.timer>=lastEffectsUI&&state.timer-lastEffectsUI<1/30)return;
  lastEffectsUI=state.timer;
  if (state.screen === 'play' && ball.active) {
    const rel = tmp.copy(ball.pos).project(camera);
    const inFront = tmp2.copy(ball.pos).sub(camera.position).dot(camera.getWorldDirection(V())) > 0;
    const offscreen = Math.abs(rel.x) > .92 || Math.abs(rel.y) > .83 || !inFront;
    $('#shuttle-indicator').classList.toggle('hidden', !offscreen);
    if (offscreen) {
      $('#shuttle-indicator').style.left = `${clamp((rel.x * .5 + .5) * 100, 8, 92)}%`;
      $('#shuttle-indicator').style.top = `${inFront ? clamp((-rel.y * .5 + .5) * 100, 18, 78) : 78}%`;
      if(ball.pos.y>camera.position.y+2){$('#shuttle-indicator span').textContent='↑ 高球在头顶 · V 跟球';$('#shuttle-indicator').style.top='19%';}
      else $('#shuttle-indicator span').textContent=inFront?'来球':'身后来球 · 后退';
    }
  } else $('#shuttle-indicator').classList.add('hidden');
  const ready = contactReady();
  $('#reticle').classList.toggle('ready', ready); $('#reticle').classList.toggle('charging', hitIntent.armed(state.timer) && state.phase === 'rally');
  const armed = hitIntent.armed(state.timer), receiving = ball.active && state.lastHitter==='opponent';
  const lessonCue=state.tutorial&&state.tutorialStage<2?(state.tutorialStage===0?'先用 WASD 走两步':'按一下空格，跳起来'):state.phase==='lesson'?'练习完成 · 可以开始比赛':null;
  const cue = lessonCue || (state.phase==='serve' ? '左键发球 · 空格起跳' : state.phase==='point' ? '稍作休息，下一分马上开始' : armed ? `${hitIntent.kind==='smash'?'杀球':hitIntent.kind==='auto'?'智能回球':'回球'}已预备 · 到位自动挥拍` : ready ? '现在左键智能回球 · 右键杀球' : receiving ? '来球了 · 左键智能接球' : '左键智能回球，按住也会持续接球');
  if(cue!==state.cue){state.cue=cue;$('#easy-cue-text').textContent=cue;}
  $('#easy-cue').classList.toggle('armed',armed);$('#easy-cue').classList.toggle('ready',ready);
  $('#aim-direction').textContent=state.mode==='targets'&&state.target?`目标 · ${state.target.name}`:state.aim<-.28?'左侧空当':state.aim>.28?'右侧空当':'回到中路';
  $('#aim-marker').style.left = `${((state.aim + 1) / 2) * 100}%`;
  $('#contact-halo').classList.toggle('hidden',!receiving||state.focus);
  $('#contact-halo').dataset.high=String(receiving&&ball.pos.y>camera.position.y+2);
  if(receiving){const p=tmp.copy(ball.pos).project(camera);$('#contact-halo').style.left=`${(p.x*.5+.5)*100}%`;$('#contact-halo').style.top=`${(-p.y*.5+.5)*100}%`;$('#contact-halo').classList.toggle('ready',ready);}
  const pulse = $('#impact-pulse');
  pulse.style.opacity = String(state.contactFlash / .38 * .8);
  pulse.style.transform = `translate(-50%,-50%) scale(${1 + (1 - state.contactFlash / .38) * 1.3})`;
  $('#dash-ready').style.width = `${(1 - dash.cooldown / 1.15) * 100}%`;
  $('#dash-btn').classList.toggle('cooling', dash.cooldown > 0);
  updateTactics();
}

function updateTactics() {
  const kind = state.shot === 'auto' ? autoShot() : state.shot;
  const aim = state.aim;
  const locked=state.phase==='serving'?state.serveTarget:state.swing>0&&!state.swingContact?state.swingTarget:null;
  const target = locked || shotTarget({ aim, depth: state.depth, kind });
  aimMarker.visible=state.screen==='play'&&state.mode!=='targets';
  if(aimMarker.visible)aimMarker.position.set(target.x,0,target.z);
  const dots = [['#map-player', player.pos], ['#map-bot', opponent.pos], ['#map-ball', ball.pos], ['#map-aim', target]];
  if (state.target) dots.push(['#map-target', state.target]);
  for (const [id, position] of dots) {
    const dot = $(id);
    dot.style.left = `${clamp(50 + position.x / 3.05 * 47, 3, 97)}%`;
    dot.style.top = `${clamp(50 + position.z / 6.7 * 47, 3, 97)}%`;
  }
  $('#map-target').classList.toggle('hidden', state.mode !== 'targets');
  $('#map-ball').classList.toggle('hidden', !ball.active);
  const names = { clear: '高远', drop: '轻吊', smash: '杀球', drive: '平抽', lift: '挑球', net:'搓球', push:'推后场', netcross:'勾对角',slicesmash:'劈杀斜线',slicedrop:'劈吊对角' };
  $('#depth-label').textContent = `${names[kind] || '智能'} · ${Math.abs(target.z).toFixed(1)}m`;
  $('#landing-name').textContent=`${locked?'已锁定 · ':''}${landingName(target)}`;
  $('#landing-dot').style.left=`${(target.x/5.18+.5)*100}%`;$('#landing-dot').style.top=`${(target.z+6.7)/6.7*100}%`;
  $('#landing-control').classList.toggle('editing',state.aiming||state.aimAlt);
  $('#aim-edit').textContent=state.aiming?'T 返回视角':'T 鼠标选点';
  $('#view-status').textContent=state.aiming?'调落点中 · T 返回视角':state.aimAlt?'Alt 调落点中':state.comfortable?'跟球辅助 · V 关闭':document.pointerLockElement===canvas?'鼠标自由视角 · Esc 暂停':'鼠标自由视角 · 点击球场锁定鼠标';
  const steps={'split':'分腿启动','net-approach':'蹬跨上网','crossover':'交叉后退','chasse':'并步侧移','ready':'持拍准备','recover':'回动守中'};
  const activity=state.timer-(opponent.actionAt??-10)<1.25&&opponent.action?opponent.action:steps[opponent.movementMode]||'持拍准备';
  $('#opponent-action').textContent=currentOpponentLevel().name+' · '+activity;
  const last=state.lastPlacement?.landing;$('#landing-last').classList.toggle('hidden',!last);
  if(last){$('#landing-last').style.left=`${clamp((last.x/5.18+.5)*100,1,99)}%`;$('#landing-last').style.top=`${clamp((last.z+6.7)/6.7*100,1,99)}%`;}
  const intended=state.lastPlacement?.intended;
  $('#landing-result').textContent=state.lastPlacement?.fault?`失误：${state.lastPlacement.fault==='net'?'下网':'出界'} · ${state.lastPlacement.reason}`:last&&intended?`上拍偏差 ${Math.hypot(last.x-intended.x,last.z-intended.z).toFixed(2)} m`:'青点是目标 · 白点是上拍预计落地';
  for(const button of document.querySelectorAll('[data-landing]')){const p=LANDING_PRESETS[Number(button.dataset.landing)];button.setAttribute('aria-pressed',String(Math.hypot(target.x-p.x,target.z-p.z)<.2));}
}

function updateHud() {
  document.body.classList.toggle('serving',state.screen==='play'&&['serve','serving','opponentServe'].includes(state.phase));
  $('#shot-cue').classList.toggle('visible',state.screen==='play'&&state.timer<state.shotCueUntil);
  if(state.phase==='serving')$('#serve-copy').textContent='轻抛后向前送拍 · 发球中';
  else if(state.phase==='serve')$('#serve-copy').textContent=state.serveStyle==='high'?'高远发球已选 · G 切回低发球，左键发球':'左键发球 · G 切换高远发球';
  if (state.mode === 'targets') {
    $('#player-score').textContent = String(state.targetHits).padStart(2, '0');
    $('#opponent-score').textContent = String(state.targetShots).padStart(2, '0');
    $('#score-status').textContent = `连中 ${state.targetStreak} · 最佳 ${state.targetBest}`;
  } else {
    $('#player-score').textContent = String(state.score[0]).padStart(2, '0'); $('#opponent-score').textContent = String(state.score[1]).padStart(2, '0');
    if(state.mode==='match')$('#score-status').textContent=`${state.matchPoints} 分制 · ${state.server==='player'?'我方':'对方'}发球`;
  }
  const next=gradeContact({position:ball.pos,player:player.pos,kind:state.shot==='auto'?autoShot():state.shot,speed:player.speed,stamina:state.stamina,jump:state.jump});
  const incoming=state.phase==='rally'&&state.lastHitter==='opponent';
  $('#stance-readout').classList.toggle('hidden',!incoming);
  $('#stance-readout').dataset.grade=next.heavy?'heavy':next.quality<.65?'poor':'good';
  $('#stance-text').textContent=ball.pos.y>3.7?'跟住高球 · 移到球后方':next.reason;
  $('#stance-meter').style.width=`${Math.round(next.quality*100)}%`;
  $('#assist-label').textContent=state.manualOverride?'手动接管':state.assists?'辅助跑位':'自由跑位';
  const airborne=state.jump>.025;
  $('#jump-btn').dataset.airborne=String(airborne);$('#jump-label').textContent=airborne?`腾空 ${state.jump.toFixed(1)} m`:'起跳';
  $('#jump-height').style.height=`${Math.min(100,state.jump/.95*100)}%`;
  $('#jump-btn').setAttribute('aria-label',airborne?`腾空 ${state.jump.toFixed(1)} 米`:'起跳 空格');
  $('#jump-readout').textContent=airborne?(state.jumpV>0?'起跳上升':'下落准备着地'):jumping.landing>.08?'落地':'空格起跳 · 可接跳杀';
  $('#jump-btn').disabled=state.stamina<10&&!airborne;
  $('#rally-count').textContent = state.rally; $('#stamina-fill').style.width = `${state.stamina}%`; $('#stamina-label').textContent = `${Math.round(state.stamina)}%`;
  if(testing&&state.handsOn)$('#test-result').textContent=JSON.stringify({live:true,inputs:state.inputTrace.slice(-12),jumps:jumping.count,jumpPeak:+state.jumpPeak.toFixed(3),cameraPeak:+state.cameraPeak.toFixed(3),hits:state.hits,shot:state.lastShot?.type??null,phase:state.phase,manualOverride:state.manualOverride,position:player.pos.toArray().map(n=>+n.toFixed(2)),freeLook:!state.comfortable,yaw:+state.yaw.toFixed(3),pitch:+state.pitch.toFixed(3),target:selectedLanding(),intended:state.lastShot?.intended,landing:state.lastLanding&&{x:state.lastLanding.x,z:state.lastLanding.z}},null,2);
}

function pollGamepad() {
  const pads = navigator.getGamepads?.();
  const pad = pads ? [...pads].find(candidate => candidate?.connected) : null;
  const hit = Boolean(pad && ((pad.buttons[7]?.value || 0) > .35 || pad.buttons[1]?.pressed));
  if (hit && !gamepadHitHeld) { hitIntent.press(state.timer, null, 'gamepad'); if (state.phase === 'serve') serve(); }
  if (!hit && gamepadHitHeld) hitIntent.release('gamepad');
  gamepadHitHeld = hit;
  const jump = Boolean(pad?.buttons[0]?.pressed);
  if (jump && !gamepadJumpHeld) requestJump();
  gamepadJumpHeld = jump;
  const dashPressed = Boolean(pad?.buttons[2]?.pressed);
  if (dashPressed && !gamepadDashHeld) lunge();
  gamepadDashHeld = dashPressed;
  return pad;
}

function ballTimeScale(){return state.pace*(state.comfortable&&state.difficulty==='easy'?.92:1);}
function fixedUpdate(dt) {
  if (state.screen !== 'play') return;
  for(const entity of [player,opponent,ball])entity.previous.copy(entity.pos);
  state.timer += dt;
  if (state.hitstop > 0) { state.hitstop -= dt; return; }
  if (state.phase==='serve' && hitIntent.sources.size>0) serve();
  const pad = pollGamepad();
  updatePlayer(dt, pad); updateOpponent(dt); updateSwing(dt); handleHitIntent(); updateBall(dt*ballTimeScale());
  if (reviewPending >= 0 && state.timer >= reviewPending && state.phase === 'point') { openLineReview(true); return; }
  if(state.phase==='serving'){state.serveElapsed+=dt;const t=clamp(state.serveElapsed/.2,0,1);ball.pos.set(player.pos.x-.1,1.16+Math.sin(t*Math.PI)*.25-t*.035,player.pos.z-1.05);state.contactPoint=ball.pos.clone();if(state.serveElapsed>=.2)releaseServe();}
  if(state.phase==='serve')ball.pos.set(player.pos.x-.1,1.16+Math.sin(state.timer*2.5)*.018,player.pos.z-1.05);
  if (state.phase === 'point') {
    state.pointDelay -= dt;
    if (state.pointDelay <= 0) {
      if (state.finished) pauseGame(true);
      else { player.pos.z = damp(player.pos.z, 4.45, 2, dt); prepareServe(); if (state.mode === 'practice' || state.mode === 'targets') state.countdown = 1.15; }
    }
  }
  if (state.countdown > 0 && state.phase === 'serve') { state.countdown -= dt; if (state.countdown <= 0) serve(); }
  if(state.phase==='opponentServe'){
    state.countdown-=dt;ball.pos.set(opponent.pos.x,1.15,opponent.pos.z+.65);
    if(state.countdown<.3&&opponent.swing===0){opponent.swing=.001;opponent.shot='serve';opponent.contactPoint=ball.pos.clone();}
    if(state.countdown<=0){state.phase='rally';ball.active=true;state.lastHitter='opponent';state.rally=1;state.serveCount++;opponent.returns=0;opponent.swing=.24;opponent.shot='serve';opponent.contactPoint=ball.pos.clone();ball.spin=0;ball.spinAt=state.timer;const target=opponentServeTarget({level:currentOpponentLevel(),random});state.lastShot={type:'serve',intended:{...target}};ball.vel.copy(solveShot(ball.pos,target,'serve',{up:6}));ball.previous.copy(ball.pos);refreshPrediction();hitSound('serve',true);}
  }
}

function animate() {
  requestAnimationFrame(animate);
  const frameNow=performance.now(),rawFrameMs=renderBudget.take(frameNow,{screen:state.screen,hidden:document.hidden});
  if(rawFrameMs===null)return;
  lastFrameTime=frameNow;
  if(state.screen==='play'&&qualityMode==='auto'&&adaptiveResolution.sample(rawFrameMs,frameNow))applyRenderProfile();
  if(frameProbe){if(frameProbe.warmup-->0){}else frameProbe.samples.push(rawFrameMs);if(frameProbe.samples.length>=180){const times=frameProbe.samples.sort((a,b)=>a-b),mean=times.reduce((a,b)=>a+b,0)/times.length;$('#test-result').textContent=JSON.stringify({type:'real animation frames',frames:times.length,averageFps:Math.round(10000/mean)/10,medianMs:Math.round(times[90]*10)/10,p95Ms:Math.round(times[171]*10)/10,viewport:[innerWidth,innerHeight],pixelRatio:renderer.getPixelRatio(),quality:presentation.quality,drawCalls:presentation.sceneInfo.calls,triangles:presentation.sceneInfo.triangles},null,2);frameProbe=null;pauseGame();}}
  const dt = Math.min(rawFrameMs/1000, .06); state.elapsed += dt; fps = damp(fps, 1 / Math.max(dt, .001), 1, dt);
  if(state.screen!=='hand-inspect')shuttle.visible=!['inspect','equipment-inspect'].includes(state.screen);
  if (state.screen === 'menu') {
    menuTime += dt; camera.position.set(10.4 + Math.sin(menuTime * .1) * .5, 5.1 + Math.sin(menuTime * .13) * .1, 11.8); camera.lookAt(-.4, .85, -.8); camera.fov = 51; camera.updateProjectionMatrix();
    bot.root.position.set(-.6,0,-4.3);bot.root.rotation.y=0;bot.label.visible=true;bot.update({time:menuTime,dt});
    shuttle.position.set(.3, 1.3 + Math.sin(menuTime * 1.7) * .08, 4.2); shuttle.rotation.set(.2, menuTime * .25, -.3); shuttleShadow.position.set(.3, .012, 4.2); shuttleShadow.scale.setScalar(1); landingMarker.visible = false; targetMarker.visible = false;aimMarker.visible=false; racket.visible = false;
  } else if(state.screen==='inspect'){
    state.inspectTime=(state.inspectTime||0)+dt;const time=state.inspectTime,pose=state.inspectPose||'idle';
    bot.root.position.set(0,0,2.8);bot.root.rotation.y=0;bot.label.visible=false;
    bot.update({time,dt,speed:pose==='run'?3.5:0,swing:pose==='swing'&&time%1.4<.55?Math.max(.001,time%1.4):0,shot:'clear'});
    const yaw=state.inspectYaw??.30,distance=state.inspectDistance||3.1,pitch=state.inspectPitch||.12;
    camera.position.set(Math.sin(yaw)*distance,1.10+pitch*distance,2.8+Math.cos(yaw)*distance);camera.fov=42;camera.lookAt(-.28,1.02,2.8);camera.updateProjectionMatrix();
    racket.visible=false;if(racket.userData.support)racket.userData.support.visible=false;landingMarker.visible=targetMarker.visible=aimMarker.visible=false;shuttleShadow.visible=false;
  } else if(state.screen==='hand-inspect'){
    racket.visible=true;bot.label.visible=false;landingMarker.visible=targetMarker.visible=aimMarker.visible=shuttleShadow.visible=false;
  } else if(state.screen==='net-inspect'){
    state.inspectTime=(state.inspectTime||0)+dt;
    if(state.inspectTime>=2){state.inspectTime=0;net.userData.hit({x:1.85,y:1.38},1.4);}
    net.userData.update(dt);
  } else if(state.screen==='swing-inspect'){
    state.inspectTime=(state.inspectTime||0)+dt;
    const elapsed=state.inspectTime%1.4,pose=swingPose({elapsed:elapsed<.6?elapsed:0,kind:state.inspectStroke,contact:[.28,.05,-1.12]});
    racket.position.fromArray(pose.position);racket.rotation.fromArray([...pose.rotation,'XYZ']);
  } else if (state.screen === 'play') {
    shuttleShadow.visible=true;
    accumulator += dt;
    for (let n = 0; accumulator >= 1 / 120 && n < 8; n++) { fixedUpdate(1 / 120); accumulator -= 1 / 120; }
    for(const entity of [player,opponent,ball])entity.renderPos.lerpVectors(entity.previous,entity.pos,clamp(accumulator*120,0,1));
    updateCamera(dt);updateOpponentModel(dt); updateEffects(dt); racket.visible = true;
    if (state.elapsed - lastHud > .075) { updateHud(); lastHud = state.elapsed; }
  }
  if (state.screen === 'review') eagleEye.update(dt);
  if(state.screen==='menu'&&racket.userData.support)racket.userData.support.visible=false;
  updateShuttleSound();
  presentation.render(scene,camera);
}

function requestLock() {
  if (coarse || testing || state.comfortable) return;
  try {
    // Keep the browser's normal, OS-adjusted pointer-lock path. This makes
    // the game's 1.00x setting follow the same Windows mouse-speed curve as
    // the desktop cursor. Raw input would deliberately bypass that setting.
    const p=canvas.requestPointerLock?.();
    p?.catch?.(()=>{});
  } catch {}
}
function pauseGame(finished = false) {
  if (state.screen !== 'play') return;
  state.screen = 'pause'; keys.clear();state.aiming=false;state.aimAlt=false;document.body.classList.remove('choosing-landing'); pointerDown = false; gamepadHitHeld = false; gamepadJumpHeld = false; hitIntent.clear();jumping.cancelBuffer(); touchMove.x = touchMove.y = 0;
  // Release capture before showing the modal so the OS cursor is usable in
  // the settings panel and can move to other windows while paused.
  document.exitPointerLock?.();
  $('#pause-title').textContent = finished ? (state.score[0] > state.score[1] ? '这一场，属于你。' : '下一次，打得更好。') : '休息一下。';
  $('#pause-description').textContent = finished ? `最终比分 ${state.score[0]} : ${state.score[1]} · ${opponentLevel(state.difficulty).name}对手` : '鼠标已交还桌面，可操作其他窗口；继续比赛时重新锁定。';
  $('#match-result').classList.toggle('hidden',!finished);
  if(finished){$('#result-rating').textContent=`${rankName(career.rating)} ${career.rating} · ${state.ratingDelta>=0?'+':''}${state.ratingDelta} 积分`;$('#result-detail').textContent=`杀球 ${state.smashes} · 杀球得分 ${state.winners} · 回球失误 ${state.errors} · ${career.wins} 胜 ${career.played-career.wins} 负`;}
  $('#stat-rally').textContent = Math.max(state.maxRally, state.rally); $('#stat-hits').textContent = state.hits; $('#stat-speed').textContent = state.maxSpeed;
  $('#resume-btn').innerHTML = finished ? '再来一场 <span>↗</span>' : '继续比赛 <span>→</span>'; $('#pause-overlay').classList.remove('hidden');
  updateHud();
}
function resumeGame() {
  if (state.finished) { startGame(state.mode, true); return; }
  state.screen = 'play'; $('#pause-overlay').classList.add('hidden'); $('#help-overlay').classList.add('hidden'); accumulator = 0; clock.getDelta();canvas.focus({preventScroll:true}); requestLock(); initAudio();
}
function exitGame() {
  state.screen = 'menu'; ball.active = false; keys.clear(); pointerDown = false;hitIntent.clear();
  document.exitPointerLock?.(); document.body.classList.remove('playing'); $('#pause-overlay').classList.add('hidden'); $('#help-overlay').classList.add('hidden'); $('#hud').classList.add('hidden'); $('#menu').classList.remove('hidden');
  $('#showroom').classList.add('hidden');shuttleShadow.visible=true;
}
function showHelp() {
  if (state.screen === 'play') pauseGame();
  $('#help-overlay').classList.remove('hidden');
}
function hideHelp() { $('#help-overlay').classList.add('hidden'); }

function setFocus(value){state.focus=Boolean(value);document.body.classList.toggle('focus',state.focus);$('#focus-toggle').checked=state.focus;$('#focus-btn').classList.toggle('active',state.focus);$('#focus-btn').setAttribute('aria-pressed',String(state.focus));}
function setComfortable(value){
 if(state.comfortable&&!value){state.manualPitch=state.pitch;state.autoPitchOffset=0;}
 state.comfortable=Boolean(value);$('#comfortable-toggle').checked=state.comfortable;
 if(state.comfortable)document.exitPointerLock?.();
}
function applyRenderProfile(){
 const profile=renderProfile(qualityMode,adaptiveResolution.scale,innerWidth,innerHeight,devicePixelRatio);
 renderer.setPixelRatio(profile.ratio);renderer.setSize(innerWidth,innerHeight);renderer.shadowMap.enabled=profile.shadows;renderer.shadowMap.needsUpdate=true;
 presentation.setQuality(profile.quality);renderBudget.invalidate();
}
function applyQuality(quality){qualityMode=['auto','balanced','high','ultra'].includes(quality)?quality:'auto';adaptiveResolution.reset(performance.now());applyRenderProfile();}
function savePreferences(){if(testing)return;try{localStorage.setItem('feather-court-3-settings',JSON.stringify({difficulty:$('#difficulty').value,scheme:$('#control-scheme').value,profile:$('#opponent-profile').value,points:$('#match-points').value,quality:$('#quality').value,performanceVersion:1,focus:state.focus,motion:state.motion,sensitivity:state.sensitivity,lookSyncVersion:2,pace:state.pace,sound:state.sound,racketStyle:state.racketStyle,racketSkin:state.racketSkin,playerStyle:$('#player-style').value,opponentStyle:$('#opponent-style').value,playerStats:playerStatsFromInputs(),opponentStats:state.opponentStats,highBallAssist:$('#high-ball-toggle').checked,eagleAuto:$('#eagle-auto').checked}));}catch{}}
function restorePreferences(){
  try { const settings=JSON.parse(localStorage.getItem('feather-court-3-settings')||'{}');$('#eagle-auto').checked=settings.eagleAuto!==false; } catch {}
  $('#eagle-auto').addEventListener('change',savePreferences);
  try{if(!testing)career=parseCareer(localStorage.getItem(CAREER_KEY));}catch{}updateCareerUI();let prefs={};
  try{if(!testing)prefs=JSON.parse(localStorage.getItem('feather-court-3-settings')||'{}');}catch{}
  for(const [key,id] of [['points','match-points'],['difficulty','difficulty'],['scheme','control-scheme'],['profile','opponent-profile'],['quality','quality'],['playerStyle','player-style'],['opponentStyle','opponent-style']])if(prefs[key]&&[...$('#'+id).options].some(o=>o.value===prefs[key]))$('#'+id).value=prefs[key];
  if(prefs.performanceVersion!==1)$('#quality').value='auto';
  setFocus(prefs.focus||false);state.motion=Number.isFinite(prefs.motion)?clamp(prefs.motion,0,1):.35;$('#motion').value=state.motion;
  const oldSensitivity=Number.isFinite(prefs.sensitivity)?clamp(prefs.sensitivity,.25,2):1;state.sensitivity=prefs.lookSyncVersion===2?oldSensitivity:clamp(oldSensitivity*1.35,.25,2);$('#sensitivity').value=state.sensitivity;
  if(prefs.lookSyncVersion!==2&&!testing){prefs.sensitivity=state.sensitivity;prefs.lookSyncVersion=2;try{localStorage.setItem('feather-court-3-settings',JSON.stringify(prefs));}catch{}}
  state.pace=[.8,1,1.2].includes(prefs.pace)?prefs.pace:1;$('#pace').value=state.pace;if(typeof prefs.sound==='boolean')state.sound=prefs.sound;
  applyRacketStyle(prefs.racketStyle||'attack');applyRacketSkin(prefs.racketSkin||'astrox100zz');
  if(prefs.playerStats&&prefs.playerStyle==='custom')for(const key of ['attack','speed','defense','net','control','stamina']){const n=Number(prefs.playerStats[key]);if(Number.isFinite(n))$('#player-'+key).value=Math.round(clamp(n*100,40,160));}
  const restoredCustom=playerStatsFromInputs();applyPlayerStyle($('#player-style').value);if(prefs.playerStyle==='custom'){techniquePanel.write('player',restoredCustom);refreshPlayerStats();}
  state.opponentStats=normalizeSkills(prefs.opponentStats);techniquePanel.write('opponent',state.opponentStats);
  if(typeof prefs.highBallAssist==='boolean')state.highBallAssist=$('#high-ball-toggle').checked=prefs.highBallAssist;
  else state.highBallAssist=$('#high-ball-toggle').checked;
  applyQuality($('#quality').value);updateDifficultyUI();
}
function showPlayer(){state.screen='inspect';state.inspectYaw=.30;state.inspectDistance=3.1;state.inspectPitch=.12;state.inspectPose='idle';state.inspectTime=0;keys.clear();hitIntent.clear();document.exitPointerLock?.();$('#menu').classList.add('hidden');$('#hud').classList.add('hidden');$('#showroom').classList.remove('hidden');$('#pause-overlay').classList.add('hidden');document.body.classList.remove('playing');}

function bindEvents() {
  $('#eagle-point-review').addEventListener('click', () => openLineReview());
  $('#last-line-review').addEventListener('click', () => openLineReview());
  $('#aim-edit').addEventListener('click',()=>setAimEditor(!state.aiming));
  $('#difficulty').addEventListener('change',updateDifficultyUI);
  document.querySelectorAll('[data-landing]').forEach(button=>button.addEventListener('click',()=>{chooseLanding(LANDING_PRESETS[Number(button.dataset.landing)]);canvas.focus({preventScroll:true});}));
  const landingMap=$('#landing-map');
  const mapLanding=e=>{const b=landingMap.getBoundingClientRect();chooseLanding(landingFromMap((e.clientX-b.left)/b.width,(e.clientY-b.top)/b.height));};
  landingMap.addEventListener('pointerdown',e=>{e.preventDefault();landingMap.setPointerCapture(e.pointerId);mapLanding(e);});
  landingMap.addEventListener('pointermove',e=>{if(landingMap.hasPointerCapture(e.pointerId))mapLanding(e);});
  $('#learn-btn').addEventListener('click',startLesson);
  $('#lesson-exit').addEventListener('click',()=>{state.tutorial=false;$('#lesson-card').classList.add('hidden');exitGame();});
  $('#lesson-match').addEventListener('click',()=>startGame('match'));
  $('#lesson-practice').addEventListener('click',()=>startGame('practice'));
  $('#advanced-btn').addEventListener('click',()=>{setAdvanced(!state.advanced);canvas.focus({preventScroll:true});});
  $('#jump-btn').addEventListener('pointerdown',e=>{e.preventDefault();requestJump();canvas.focus({preventScroll:true});});
  $('#jump-btn').addEventListener('click',e=>{if(e.detail===0)requestJump();});
  $('#showroom-btn').addEventListener('click',showPlayer);$('#showroom-close').addEventListener('click',exitGame);
  $('#photo-btn').addEventListener('click',()=>{presentation.render(scene,camera);const link=document.createElement('a');link.download='feather-court-5-photo.jpg';link.href=canvas.toDataURL('image/jpeg',.94);link.click();});
  for(const pose of ['idle','run','swing'])$('#pose-'+pose).addEventListener('click',()=>{state.inspectPose=pose;state.inspectTime=0;for(const name of ['idle','run','swing'])$('#pose-'+name).classList.toggle('active',name===pose);});
  $('#focus-btn').addEventListener('click',()=>setControlsVisible(!state.controlsVisible));$('#focus-toggle').addEventListener('change',e=>setFocus(e.target.checked));$('#motion').addEventListener('input',e=>state.motion=Number(e.target.value));
  for(const id of ['difficulty','match-points','control-scheme','opponent-profile','quality','focus-toggle','motion','sensitivity','pace','assist-toggle','comfortable-toggle'])$('#'+id).addEventListener('change',()=>savePreferences());
  $('#shot-select').addEventListener('change',e=>{setShot(e.target.value);savePreferences();});$('#racket-style').addEventListener('change',e=>{applyRacketStyle(e.target.value);savePreferences();});$('#racket-skin').addEventListener('change',e=>{applyRacketSkin(e.target.value);savePreferences();});$('#player-style').addEventListener('change',e=>{applyPlayerStyle(e.target.value);savePreferences();});$('#opponent-style').addEventListener('change',()=>{updateDifficultyUI();savePreferences();});$('#high-ball-toggle').addEventListener('change',e=>{state.highBallAssist=e.target.checked;savePreferences();});
  document.querySelectorAll('[data-player-style]').forEach(button=>button.addEventListener('click',()=>{applyPlayerStyle(button.dataset.playerStyle);savePreferences();}));
  $('#play-btn').addEventListener('click', () => startGame('match')); $('#practice-btn').addEventListener('click', () => startGame('practice')); $('#drill-btn').addEventListener('click', () => startGame('targets'));
  $('#pause-btn').addEventListener('click', () => pauseGame()); $('#resume-btn').addEventListener('click', resumeGame);
  $('#restart-btn').addEventListener('click', () => startGame(state.mode, true)); $('#exit-btn').addEventListener('click', exitGame);
  $('#brand-home').addEventListener('click',e=>{e.preventDefault();if(state.screen==='inspect')exitGame();else if(state.screen!=='menu')pauseGame();});
  $('#help-btn').addEventListener('click', showHelp); $('#close-help').addEventListener('click', hideHelp); $('#got-it').addEventListener('click', () => { hideHelp(); if (state.screen === 'pause') resumeGame(); });
  $('#sound-btn').addEventListener('click', () => { initAudio(); state.sound = !state.sound; if (master) master.gain.value = state.sound ? .5 : 0; $('#sound-btn').style.opacity = state.sound ? 1 : .4; $('#sound-btn').textContent = state.sound ? '♪' : '♩';savePreferences(); });
  $('#assist-toggle').addEventListener('change', e => setAssist(e.target.checked)); $('#sensitivity').addEventListener('input', e => state.sensitivity = Number(e.target.value));
  $('#comfortable-toggle').addEventListener('change', e => setComfortable(e.target.checked));
  $('#aim-left').addEventListener('click', () => state.aim = clamp(state.aim - .32, -1, 1));
  $('#aim-right').addEventListener('click', () => state.aim = clamp(state.aim + .32, -1, 1));
  $('#dash-btn').addEventListener('click', lunge);
  $('#pace').addEventListener('change', event => state.pace = Number(event.target.value));
  const aimCourt = $('#court-aim');
  const aimOnMap = event => {
    const bounds = aimCourt.getBoundingClientRect();
    chooseLanding(landingFromMap((event.clientX-bounds.left)/bounds.width,(event.clientY-bounds.top)/bounds.height*2));
  };
  aimCourt.addEventListener('pointerdown', event => { event.preventDefault(); aimCourt.setPointerCapture(event.pointerId); aimOnMap(event); });
  aimCourt.addEventListener('pointermove', event => { if (aimCourt.hasPointerCapture(event.pointerId)) aimOnMap(event); });
  $('#quality').addEventListener('change',e=>{applyQuality(e.target.value);savePreferences();});
  document.querySelectorAll('[data-shot]').forEach(el => el.addEventListener('click', () => { setShot(el.dataset.shot);canvas.focus({preventScroll:true}); requestLock(); }));
  window.addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();applyRenderProfile();});
  window.addEventListener('contextmenu', e => { if (state.screen === 'play') e.preventDefault(); });
  window.addEventListener('keydown', e => {
    if(techniquePanel?.dialog.open)return;
    if (state.screen === 'review') {
      if (e.code === 'Escape' || e.code === 'KeyB') { e.preventDefault(); eagleEye.close(); }
      return;
    }
    const editing=/^(INPUT|SELECT|TEXTAREA)$/.test(e.target.tagName)||e.target.isContentEditable;
    if(editing&&e.code!=='Escape')return;
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(e.code) && state.screen === 'play') e.preventDefault();
    if (e.repeat) return;
    if (e.code === 'KeyB') { openLineReview(); return; }
    if (e.code === 'Escape' || e.code === 'KeyP') { if(['inspect','hand-inspect','shuttle-inspect','equipment-inspect','net-inspect','swing-inspect'].includes(state.screen)){exitGame();$('#test-panel')?.classList.remove('hidden');$('#masthead')?.classList.remove('hidden');}else if (state.screen === 'play') pauseGame(); else if (state.screen === 'pause') resumeGame(); return; }
    if (state.screen !== 'play') return;
    if(['AltLeft','AltRight'].includes(e.code)){e.preventDefault();state.aimAlt=true;hitIntent.clear();}
    keys.add(e.code);
    performControl(keyCommand(e.code),e.code);
    if(e.code==='Tab')setAdvanced(!state.advanced);
    if(e.code==='KeyT')setAimEditor(!state.aiming);
    if (e.code === 'KeyF') setAssist(!state.assists);
    if(e.code==='KeyH')setControlsVisible(!state.controlsVisible);
    if (e.code === 'KeyV') {
      setComfortable(!state.comfortable);
      if (state.comfortable) document.exitPointerLock?.(); else requestLock();
      feedback(state.comfortable ? '跟球镜头' : '自由镜头', 'V 随时切换 · 跑位方向不受镜头影响');
    }
    if(e.code==='KeyG'&&state.phase==='serve'){state.serveStyle=state.serveStyle==='high'?'low':'high';$('#serve-copy').textContent=state.serveStyle==='high'?'高远发球已选 · G 切回低发球，左键发球':'低发球已选 · G 切换高远发球，左键发球';feedback(state.serveStyle==='high'?'高远发球':'低发球',state.serveStyle==='high'?'发向后场，争取压后场':'发向前发球线，争取抢攻');return;}
    if (e.code === 'KeyR') { if (state.phase === 'serve') serve(); else lunge(); }
    if (e.code === 'ControlLeft' || e.code === 'ControlRight') { e.preventDefault(); lunge(); }
    if (e.code === 'KeyZ') state.aim = clamp(state.aim - .28, -1, 1);
    if (e.code === 'KeyC') state.aim = clamp(state.aim + .28, -1, 1);
    if(e.code==='KeyX'){state.manualLanding=false;state.aim=0;state.depth=SHOT_DEPTHS[state.shot]??SHOT_DEPTHS.auto;updateTactics();showShotCue(state.shot);}
  });
  window.addEventListener('keyup', e => {keys.delete(e.code);hitIntent.release(e.code);if(['AltLeft','AltRight'].includes(e.code)){e.preventDefault();state.aimAlt=keys.has('AltLeft')||keys.has('AltRight');}});
  window.addEventListener('blur', () => { keys.clear();state.aimAlt=false; if (state.screen === 'play' && !testing) pauseGame(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden && state.screen === 'play' && !testing) pauseGame();renderBudget.invalidate(); });
  document.addEventListener('pointerlockchange', () => { if (!document.pointerLockElement && state.screen === 'play' && !state.aiming && !state.comfortable && !testing && !coarse) pauseGame(); });
  canvas.addEventListener('pointerdown', e => {
    if(state.screen==='inspect'){inspectDrag={x:e.clientX,y:e.clientY};canvas.setPointerCapture(e.pointerId);return;}
    if (state.screen !== 'play' || e.pointerType === 'touch') return;
    e.preventDefault();canvas.focus({preventScroll:true});canvas.setPointerCapture(e.pointerId);
    if(state.aiming){setAimEditor(false);return;}requestLock();
    if(e.button===0)pointerDown=true;
    performControl(pointerCommand(e.button),e.button===2?'pointer-smash':'pointer');
  });
  window.addEventListener('pointerup', e => {if(e.button===0){pointerDown=false;hitIntent.release('pointer');}if(e.button===2)hitIntent.release('pointer-smash');});
  window.addEventListener('pointerup',()=>inspectDrag=null);
  canvas.addEventListener('wheel',e=>{if(state.screen==='inspect'){e.preventDefault();state.inspectDistance=clamp((state.inspectDistance||3.1)+e.deltaY*.003,1.2,5);}else if(state.screen==='play'){e.preventDefault();chooseLanding({...selectedLanding(),z:selectedLanding().z+Math.sign(e.deltaY)*.4});}},{passive:false});
  window.addEventListener('pointercancel',()=>{pointerDown=false;hitIntent.release('pointer');hitIntent.release('pointer-smash');});
  canvas.addEventListener('mousemove', e => {
    if(state.screen==='inspect'&&inspectDrag){state.inspectYaw-=(e.clientX-inspectDrag.x)*.007;state.inspectPitch=clamp((state.inspectPitch||.12)+(e.clientY-inspectDrag.y)*.002,-.15,.6);inspectDrag={x:e.clientX,y:e.clientY};return;}
    if (state.screen !== 'play') return;
    if(!coarse)applyMouseLook(e.movementX||0,e.movementY||0);
  });
  for(const button of [$('#mobile-hit'),$('#quick-hit'),$('#drop-btn'),$('#smash-btn'),$('#slice-smash-btn'),$('#slice-drop-btn')]){
    const kind=button.id==='slice-smash-btn'?'slicesmash':button.id==='slice-drop-btn'?'slicedrop':button.id==='smash-btn'?'smash':button.id==='drop-btn'?'drop':'auto';
    button.addEventListener('pointerdown',e=>{e.preventDefault();button.setPointerCapture(e.pointerId);performControl({action:'hit',kind},button.id);});
    for(const name of ['pointerup','pointercancel','lostpointercapture'])button.addEventListener(name,()=>hitIntent.release(button.id));
    button.addEventListener('click',e=>{if(e.detail===0)performControl({action:'hit',kind},null);});
  }
  $('#mobile-jump').addEventListener('pointerdown', e => { e.preventDefault();requestJump(); });
  const joy = $('#joystick');
  function moveJoy(e) { const r = joy.getBoundingClientRect(), x = clamp((e.clientX - r.left - r.width / 2) / 40, -1, 1), y = clamp((e.clientY - r.top - r.height / 2) / 40, -1, 1); touchMove = { x, y }; joy.firstElementChild.style.transform = `translate(${x * 25}px,${y * 25}px)`; }
  joy.addEventListener('pointerdown', e => { joy.setPointerCapture(e.pointerId); moveJoy(e); }); joy.addEventListener('pointermove', e => { if (joy.hasPointerCapture(e.pointerId)) moveJoy(e); });
  for (const name of ['pointerup', 'pointercancel']) joy.addEventListener(name, () => { touchMove = { x: 0, y: 0 }; joy.firstElementChild.style.transform = ''; });
  let touchLook = null;
  canvas.addEventListener('touchstart', e => { if (state.screen === 'play' && e.touches.length === 1) touchLook = { x: e.touches[0].clientX, y: e.touches[0].clientY }; }, { passive: true });
  canvas.addEventListener('touchmove', e => { if (!touchLook || state.screen !== 'play') return; const t=e.touches[0];applyMouseLook((t.clientX-touchLook.x)*1.8,(t.clientY-touchLook.y)*1.8);touchLook={x:t.clientX,y:t.clientY};e.preventDefault(); }, { passive: false });
  canvas.addEventListener('touchend', () => touchLook = null);
}

async function init() {
  let bootStage='renderer';
  try {
    boot({stage:'初始化图形设备',percent:20});
    renderer = new THREE.WebGLRenderer({ canvas, antialias: !safeBoot, powerPreference: 'default' });
    renderer.setSize(innerWidth, innerHeight); renderer.setPixelRatio(renderProfile('auto',1,innerWidth,innerHeight,devicePixelRatio).ratio);
    renderer.shadowMap.enabled = false; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.02;
    scene = new THREE.Scene(); camera = new THREE.PerspectiveCamera(68, innerWidth / innerHeight, .045, 100);
    bootStage='assets';boot({stage:'准备人物与球馆材质',percent:40});
    const onWarning=warning=>{console.warn('Optional court asset:',warning);boot({warning:true});};
    const [,maps]=await Promise.all([prepareHands(THREE,{safe:safeBoot,onWarning}),loadSurfaceMaps(THREE,renderer,{safe:safeBoot,onWarning})]);surfaceMaps=maps;
    if(!safeBoot){try{createEnvironment(THREE,renderer,scene);}catch(error){onWarning({label:'球馆反射',message:error.message});}}
    presentation=new CourtPresentation(THREE,renderer);presentation.setSize(innerWidth,innerHeight);
    eagleEye = new EagleEyeReview(closeLineReview);
    bootStage='scene';boot({stage:'布置球场与校准操作',percent:75});
    createHall(); batchHall(); createPlayerRacket(); bot = createOpponent(); createEffects();initTechniquePanel();bindEvents();restorePreferences();if(safeBoot){$('#quality').value='balanced';applyQuality('balanced');}updateDifficultyUI();
    canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();pauseGame();$('#error-panel').classList.remove('hidden');$('#error-message').textContent='浏览器图形上下文中断。可能是显存不足、浏览器回收或驱动重置。请使用低负载启动恢复。';});
    canvas.addEventListener('webglcontextrestored',()=>location.reload());
    if (testing) {
      window.__game = {
        state, player, opponent, ball,
        start: startGame, serve, swing: beginSwing, pause: pauseGame, resume: resumeGame, setAssist, setShot,
        snapshot: () => ({ screen: state.screen, phase: state.phase, mode: state.mode, score: [...state.score], rally: state.rally, hits: state.hits, maxRally: state.maxRally, target: state.target, targetHits: state.targetHits, targetShots: state.targetShots, targetStreak: state.targetStreak, aim: state.aim, lastHitter: state.lastHitter, ball: ball.pos.toArray(), velocity: ball.vel.toArray(), player: player.pos.toArray(), opponent: opponent.pos.toArray(), prediction: state.prediction, fps: Math.round(fps), render: renderer.info.render }),
        placeIncoming: (pos, vel) => { state.screen = 'play'; state.phase = 'rally'; state.lastHitter = 'opponent'; ball.pos.fromArray(pos); ball.vel.fromArray(vel); ball.active = true; state.swing = 0; refreshPrediction(); },
      };
      const panel=document.createElement('div');panel.id='test-panel';panel.style.cssText='position:fixed;left:20px;top:115px;z-index:50;background:#12382f;padding:12px;max-width:350px;font:12px sans-serif;border:1px solid #dcf49a';
      panel.innerHTML='<button id="run-play-test">运行长按 60 秒对打测试</button><button id="run-input-suite">验证左右球路与提前点击</button><button id="run-target-test">验证打点挑战</button><button id="run-v2-test">验证手动操作与比赛</button><button id="inspect-model">查看人物近景</button><button id="run-perf-test">测量 180 帧实际表现</button><button id="run-scene-test">检查当前场景坐标</button><pre id="test-result">等待测试</pre>';document.body.append(panel);
      panel.style.zIndex = '45';
      const netProof=document.createElement('button');netProof.id='inspect-net';netProof.textContent='检查网带与局部触网波动 · Esc返回';panel.prepend(netProof);
      netProof.onclick=()=>{
        state.screen='net-inspect';state.inspectTime=2;renderBudget.invalidate();document.exitPointerLock?.();
        for(const id of ['menu','hud','pause-overlay','masthead','test-panel'])$('#'+id).classList.add('hidden');
        racket.visible=false;racket.userData.support.visible=false;bot.label.visible=false;
        landingMarker.visible=targetMarker.visible=aimMarker.visible=shuttleShadow.visible=false;
        camera.position.set(2.72,1.6,1.45);camera.fov=43;camera.lookAt(2.05,1.26,0);camera.updateProjectionMatrix();
      };
      const swingPreview=document.createElement('select');swingPreview.id='inspect-stroke';swingPreview.setAttribute('aria-label','挥拍动作检查');
      for(const [value,label] of [['smash','杀球连续动作'],['clear','高远连续动作'],['drop','吊球连续动作'],['net','搓球连续动作'],['netcross','勾对角连续动作'],['slicesmash','劈杀连续动作']])swingPreview.add(new Option(label,value));
      const swingProof=document.createElement('button');swingProof.id='inspect-swing';swingProof.textContent='实看连续挥拍 · Esc返回';
      swingProof.onclick=()=>{
        state.screen='swing-inspect';state.inspectTime=0;state.inspectStroke=swingPreview.value;renderBudget.invalidate();document.exitPointerLock?.();
        for(const id of ['menu','hud','pause-overlay','masthead','test-panel'])$('#'+id).classList.add('hidden');
        racket.visible=true;racket.userData.support.visible=false;bot.label.visible=false;
        landingMarker.visible=targetMarker.visible=aimMarker.visible=shuttleShadow.visible=false;
        camera.position.set(0,1.69,4.5);camera.rotation.set(0,0,0);camera.fov=70;camera.updateProjectionMatrix();
      };panel.prepend(swingProof,swingPreview);
      for(const [part,label] of [['head','检查面部与发型 · Esc返回'],['shoe','检查运动鞋 · Esc返回']]){
        const proof=document.createElement('button');proof.id='inspect-'+part;proof.textContent=label;panel.prepend(proof);
        proof.onclick=()=>{
          state.screen='equipment-inspect';renderBudget.invalidate();document.exitPointerLock?.();
          for(const id of ['menu','hud','pause-overlay','masthead','test-panel'])$('#'+id).classList.add('hidden');
          racket.visible=false;racket.userData.support.visible=false;shuttle.visible=false;landingMarker.visible=targetMarker.visible=aimMarker.visible=shuttleShadow.visible=false;
          bot.root.position.set(0,0,0);bot.root.rotation.set(0,0,0);bot.update({time:1});bot.label.visible=false;
          if(part==='head'){camera.position.set(.28,1.67,.85);camera.fov=34;camera.lookAt(0,1.64,.10);}
          else {camera.position.set(.46,.25,.68);camera.fov=37;camera.lookAt(.12,.105,.08);}
          camera.updateProjectionMatrix();
        };
      }
      const equipmentProof=document.createElement('button');equipmentProof.id='inspect-equipment';equipmentProof.textContent='检查球包与场边器材 · Esc返回';panel.prepend(equipmentProof);
      equipmentProof.onclick=()=>{
        state.screen='equipment-inspect';renderBudget.invalidate();document.exitPointerLock?.();
        for(const id of ['menu','hud','pause-overlay','masthead','test-panel'])$('#'+id).classList.add('hidden');
        racket.visible=false;racket.userData.support.visible=false;shuttle.visible=false;landingMarker.visible=targetMarker.visible=aimMarker.visible=shuttleShadow.visible=false;
        camera.position.set(8.6,1.15,-8.9);camera.fov=44;camera.lookAt(8.9,.73,-10.4);camera.updateProjectionMatrix();
      };
      const shuttleProof=document.createElement('button');shuttleProof.id='inspect-shuttle';shuttleProof.textContent='检查16羽毛球近景 · Esc返回';panel.prepend(shuttleProof);
      shuttleProof.onclick=()=>{
        state.screen='shuttle-inspect';renderBudget.invalidate();document.exitPointerLock?.();
        for(const id of ['menu','hud','pause-overlay','masthead','test-panel'])$('#'+id).classList.add('hidden');
        racket.visible=false;racket.userData.support.visible=false;shuttle.visible=true;shuttle.position.set(0,1.3,3.95);shuttle.rotation.set(.18,.4,-.22);shuttle.scale.setScalar(1);
        camera.position.set(.04,1.33,4.24);camera.fov=42;camera.lookAt(0,1.32,3.95);camera.updateProjectionMatrix();
        landingMarker.visible=targetMarker.visible=aimMarker.visible=shuttleShadow.visible=false;
      };
      const handViews=document.createElement('select');handViews.id='hand-inspect-view';handViews.setAttribute('aria-label','手部检查视角');
      for(const [value,label] of [['grip','握拍近景'],['palm','掌侧近景'],['back','手背近景'],['racket','整拍与握拍'],['idle','实战待机'],['prep','高远准备'],['contact','高远触球'],['high','高位伸展触球'],['backhand','反手伸展触球'],['follow','杀球收拍'],['net','网前搓球'],['serve','发球准备'],['serve-hold','左手捏球'],['serve-release','松手送球'],['serve-follow','发球收手']])handViews.add(new Option(label,value));
      const inspectHand=()=>{
        renderBudget.invalidate();
        state.screen='hand-inspect';state.handsOn=false;document.exitPointerLock?.();
        for(const id of ['menu','hud','pause-overlay'])$('#'+id).classList.add('hidden');
        camera.position.set(0,1.69,4.5);camera.rotation.set(0,0,0);camera.fov=50;camera.updateProjectionMatrix();
        const view=handViews.value;racket.visible=true;positionServeHand(null,null);shuttle.visible=false;
        if(view.startsWith('serve-')){
          const elapsed={'serve-hold':0,'serve-release':.10,'serve-follow':.26}[view],phase=elapsed===0?'serve':elapsed<.2?'serving':'rally';
          const cork=V(-.1,-.44+Math.sin(Math.min(1,elapsed/.2)*Math.PI)*.25,-1.15);
          const pose=swingPose({elapsed,kind:'serve',contact:cork.toArray(),contactTime:.2});racket.position.fromArray(pose.position);racket.rotation.fromArray([...pose.rotation,'XYZ']);
          positionServeHand(cork,serveSupportPose({phase,elapsed,swing:elapsed}));
          shuttle.visible=true;shuttle.position.copy(camera.localToWorld(cork.clone()));shuttle.rotation.set(0,0,0);shuttle.scale.setScalar(1);
        }
        else if(view==='racket'){racket.position.set(-.10,-.26,-1.02);racket.rotation.set(.03,.16,-.25);}
        else if(['grip','palm','back'].includes(view)){racket.position.set(-.02,-.05,-.48);racket.rotation.set(.08,view==='palm'?1.2:view==='back'?-1.2:0,-.22);}
        else {const spec={idle:[0,'clear'],prep:[.048,'clear'],contact:[.095,'clear'],high:[.095,'smash',[.45,.7,-.95]],backhand:[.095,'clear',[-.65,.4,-1.05]],follow:[.255,'smash'],net:[.095,'net'],serve:[.048,'serve']}[view],pose=swingPose({elapsed:spec[0],kind:spec[1],contact:spec[2]});racket.position.fromArray(pose.position);racket.rotation.fromArray([...pose.rotation,'XYZ']);}
        $('#test-result').textContent=JSON.stringify({view,hand:racket.userData.hand.geometry.attributes.position.count,grip:racket.userData.gripReport??null},null,2);
      };
      const handInspect=document.createElement('button');handInspect.id='inspect-grip';handInspect.textContent='检查第一人称握拍';handInspect.onclick=inspectHand;handViews.onchange=inspectHand;panel.prepend(handInspect,handViews);
      const handProof=document.createElement('button');handProof.id='hand-proof';handProof.textContent='隐藏面板查看当前视角 · Esc 返回';handProof.onclick=()=>{inspectHand();panel.classList.add('hidden');$('#masthead').classList.add('hidden');};panel.prepend(handProof);
      const techniqueTest=document.createElement('button');techniqueTest.id='run-technique-test';techniqueTest.textContent='验证6.5球路与双方实力';panel.prepend(techniqueTest);
      techniqueTest.onclick=()=>{
        const checks=[],savedStats={...state.playerStats},savedOpponent={...state.opponentStats},savedStyle=$('#player-style').value;
        for(const [kind,position] of [['netcross',[1.8,1.4,1.2]],['netcross',[-1.8,1.4,1.2]],['slicesmash',[1.8,3.05,3.6]],['slicedrop',[1.8,2.8,4.8]],['drop',[1.8,2.8,4.8]]]){
          startGame('practice');state.sound=false;state.manualLanding=false;state.aim=0;setShot(kind);state.swingKind=kind;
          ball.pos.fromArray(position);ball.vel.set(0,-1,.1);ball.active=true;state.lastHitter='opponent';state.phase='rally';player.pos.set(position[0],0,position[2]+.65);player.vel.set(0,0,0);player.speed=0;
          state.swingTarget=selectedLanding(kind);
          const hit=tryPlayerHit(),p={...ball.pos},v={...ball.vel};let netY=0,apex=p.y,flightTime=0;
          for(let i=0;i<1200;i++){const prev={...p};advance(p,v,1/240);apex=Math.max(apex,p.y);flightTime+=1/240;if(prev.z*p.z<=0)netY=prev.y+(p.y-prev.y)*prev.z/(prev.z-p.z);const crossed=groundCrossing(prev,p);if(crossed){Object.assign(p,crossed);break;}}
          const target=state.lastShot?.intended,error=target?Math.hypot(p.x-target.x,p.z-target.z):99,cross=['netcross','slicesmash','slicedrop'].includes(kind);
          checks.push({name:`actual-hit-${kind}-${position[0]}`,pass:hit&&state.lastShot?.type===kind&&netY>COURT.netHeight&&error<.15&&(!cross||Math.sign(p.x)===-Math.sign(position[0])),landing:{x:p.x,z:p.z},target,netY,apex,flightTime,error});
        }
        const base=opponentLevel('master'),low=effectiveOpponentLevel(base,'allround',{attack:.4,defense:.4,control:.4,net:.4,speed:.4,stamina:.4}),high=effectiveOpponentLevel(base,'allround',{attack:1.6,defense:1.6,control:1.6,net:1.6,speed:1.6,stamina:1.6});
        checks.push({name:'opponent-sliders-change-simulation',pass:high.power>low.power&&high.reaction<low.reaction&&high.reach>low.reach&&high.accuracy>low.accuracy&&high.netSkill>low.netSkill&&high.speed>low.speed&&high.stamina>low.stamina,low,high});
        techniquePanel.write('player',{attack:1.6,defense:.4,control:1.5,net:1.4,speed:.5,stamina:1.2});refreshPlayerStats();
        checks.push({name:'player-sliders-feed-actual-stats',pass:state.playerStats.attack===1.6&&state.playerStats.defense===.4&&state.playerStats.speed===.5,stats:{...state.playerStats}});
        const soft=createGroundMotion({x:0,y:.03,z:0},{x:1,y:-2,z:-2}),hard=createGroundMotion({x:0,y:.03,z:0},{x:1,y:-18,z:-5});let softApex=0,hardApex=0;
        for(let i=0;i<360;i++){stepGroundMotion(soft,1/120);stepGroundMotion(hard,1/120);softApex=Math.max(softApex,soft.pos.y);hardApex=Math.max(hardApex,hard.pos.y);}
        checks.push({name:'energy-dependent-rebound-and-rest',pass:hardApex>softApex+.3&&hard.settled&&soft.settled,hardApex,softApex});
        techniquePanel.write('player',savedStats);state.playerStats=savedStats;$('#player-style').value=savedStyle;state.playerStyle=savedStyle;state.opponentStats=savedOpponent;exitGame();
        $('#test-result').textContent=JSON.stringify({pass:checks.every(c=>c.pass),checks},null,2);
      };
      const eagleTest = document.createElement('button'); eagleTest.id = 'run-eagle-test'; eagleTest.textContent = '验证鹰眼与落地弹跳'; panel.prepend(eagleTest);
      eagleTest.onclick = () => {
        const checks = []; startGame('match'); state.sound = false; const auto = $('#eagle-auto').checked; $('#eagle-auto').checked = false;
        for (const scenario of [{ x: 2.619, in: true, line: true }, { x: 2.645, in: false, line: false }, { x: .5, in: true, line: false }]) {
          state.phase = 'rally'; state.lastHitter = 'player'; state.rally++; ball.active = true;
          ball.pos.set(scenario.x, 1, -5); ball.vel.set(0, -9, -1); groundMotion = null; flightRecorder.reset();
          const before = [...state.score];
          for (let i = 0; i < 100 && ball.active; i++) updateBall(1 / 120);
          const recorded = JSON.stringify(lastLineReview.position), score = [...state.score]; let maxHeight = ball.pos.y;
          checks.push({ name: `first-contact-${scenario.x}`, pass: lastLineReview.call.inside === scenario.in && lastLineReview.call.onLine === scenario.line && state.score[scenario.in ? 0 : 1] === before[scenario.in ? 0 : 1] + 1 });
          for (let i = 0; i < 240; i++) { updateBall(1 / 120); maxHeight = Math.max(maxHeight, ball.pos.y); }
          checks.push({ name: `rebound-settles-${scenario.x}`, pass: groundMotion.settled && maxHeight > .07 && maxHeight < .8 && ball.vel.length() < .001 && JSON.stringify(lastLineReview.position) === recorded && JSON.stringify(state.score) === JSON.stringify(score), maxHeight });
        }
        // Leave a real simulated line contact ready for interactive playback.
        state.phase = 'rally'; state.lastHitter = 'player'; state.rally++; ball.active = true; groundMotion = null; flightRecorder.reset();
        ball.pos.set(2.618, 2.2, -4.3); ball.vel.set(0, -5, -3);
        for (let i = 0; i < 120 && ball.active; i++) updateBall(1 / 120);
        const score = JSON.stringify(state.score); openLineReview();
        checks.push({ name: 'review-stops-match', pass: state.screen === 'review' && !ball.active });
        fixedUpdate(1 / 120); eagleEye.close();
        checks.push({ name: 'review-does-not-rescore', pass: state.screen === 'play' && score === JSON.stringify(state.score) });
        const heldScore = JSON.stringify(state.score);
        $('#eagle-auto').checked = true; state.pointDelay = 2.5; reviewPending = state.timer + .65;
        for (let i = 0; i < 120 && state.screen === 'play'; i++) fixedUpdate(1 / 120);
        const frozenTimer = state.timer;
        checks.push({ name: 'near-line-auto-review', pass: state.screen === 'review' });
        for (let i = 0; i < 30; i++) fixedUpdate(1 / 120);
        checks.push({ name: 'review-freezes-countdown', pass: state.timer === frozenTimer });
        for (let i = 0; i < 1200 && eagleEye.active; i++) eagleEye.update(1 / 120);
        checks.push({ name: 'automatic-review-resumes-once', pass: state.screen === 'play' && state.phase === 'point' && heldScore === JSON.stringify(state.score) });
        $('#eagle-auto').checked = auto;
        $('#test-result').textContent = JSON.stringify({ pass: checks.every(c => c.pass), checks }, null, 2);
        openLineReview();
      };
      $('#run-scene-test').addEventListener('click',()=>{const projected=shuttle.position.clone().project(camera);$('#test-result').textContent=JSON.stringify({phase:state.phase,ball:ball.pos.toArray(),shuttle:shuttle.position.toArray(),projected:projected.toArray(),camera:camera.position.toArray(),pitch:state.pitch,render:ball.renderPos.toArray(),racket:racket.position.toArray()},null,2);});
      const v5=document.createElement('button');v5.id='run-v5-test';v5.textContent='验证高球、重杀失误、分级与积分';panel.insertBefore(v5,$('#test-result'));
      const v52=document.createElement('button');v52.id='run-v52-test';v52.textContent='验证自由视角、落点锁定与难度';panel.insertBefore(v52,$('#run-play-test'));
      v52.addEventListener('click',()=>{
        const checks=[];startGame('practice');state.sound=false;
        checks.push({name:'free-camera-is-default',pass:!state.comfortable});
        const initial=selectedLanding();applyMouseLook(80,-80);const looked={yaw:state.yaw,pitch:state.pitch};
        checks.push({name:'mouse-look-does-not-change-landing',pass:state.yaw<0&&state.pitch>0&&JSON.stringify(selectedLanding())===JSON.stringify(initial)});
        state.phase='rally';ball.active=false;state.prediction=null;for(let i=0;i<240;i++)updatePlayer(1/120);
        checks.push({name:'camera-does-not-track-or-recenter',pass:state.yaw===looked.yaw&&state.pitch===looked.pitch});
        state.aimAlt=true;applyMouseLook(-100,80);state.aimAlt=false;
        checks.push({name:'alt-mouse-changes-landing-without-turning',pass:selectedLanding().x<0&&selectedLanding().z>initial.z&&state.yaw===looked.yaw&&state.pitch===looked.pitch});
        const chosen=selectedLanding();for(const kind of ['clear','smash','drop','auto'])setShot(kind);
        checks.push({name:'shot-type-preserves-selected-depth',pass:JSON.stringify(selectedLanding())===JSON.stringify(chosen)});
        startGame('practice');state.sound=false;player.pos.set(0,0,4);player.vel.set(0,0,0);state.lastMove=100;
        state.phase='rally';state.lastHitter='opponent';state.rally=2;ball.active=true;ball.pos.set(.1,2.05,3.1);ball.vel.set(0,-.2,.1);state.prediction=null;
        chooseLanding(LANDING_PRESETS[0]);hitIntent.press(state.timer,'clear','selftest');handleHitIntent();const latched=state.swingTarget;
        chooseLanding(LANDING_PRESETS[2]);for(let i=0;i<20&&state.hits===0;i++)fixedUpdate(1/120);
        checks.push({name:'windup-lock-keeps-left-shot-left',pass:state.hits===1&&latched?.x<0&&state.lastShot?.intended.x===latched.x&&state.lastLanding?.x<0,requested:latched,actual:state.lastLanding&&{x:state.lastLanding.x,z:state.lastLanding.z}});
        const zones=[];
        for(const p of LANDING_PRESETS){
          startGame('practice');state.sound=false;player.pos.set(0,0,4);player.vel.set(0,0,0);state.lastMove=100;
          state.phase='rally';state.lastHitter='opponent';state.rally=2;ball.active=true;ball.pos.set(.1,2.1,3.1);ball.vel.set(0,-.1,.1);state.prediction=null;chooseLanding(p);
          performControl({action:'hit',kind:p.z>-3?'drop':'clear'},'selftest');for(let i=0;i<30&&state.hits===0;i++)fixedUpdate(1/120);
          const end=state.lastLanding,error=end?Math.hypot(end.x-p.x,end.z-p.z):Infinity;
          zones.push({name:p.label,pass:state.hits===1&&error<.26,error:+error.toFixed(3)});
        }
        checks.push({name:'six-actual-shot-zones',pass:zones.every(z=>z.pass),zones});
        const saved=$('#difficulty').value,levels=[];
        for(const key of Object.keys(OPPONENT_LEVELS)){
          $('#difficulty').value=key;startGame('practice');state.sound=false;state.phase='rally';state.lastHitter='player';state.timer=.01;state.returnDelay=0;ball.active=false;state.prediction={intercept:{x:2,z:-5.8}};opponent.pos.set(-2,0,-4.2);opponent.vel.set(0,0,0);const before=opponent.pos.clone();
          for(let i=0;i<30;i++)updateOpponent(1/120);levels.push({key,distance:+opponent.pos.distanceTo(before).toFixed(3)});
        }
        $('#difficulty').value=saved;updateDifficultyUI();checks.push({name:'ten-levels-also-affect-free-practice',pass:levels.every((n,i)=>i===0||n.distance>levels[i-1].distance),levels});
        $('#test-result').textContent=JSON.stringify({pass:checks.every(c=>c.pass),checks},null,2);pauseGame();
      });
      const ai52=document.createElement('button');ai52.id='run-ai52-test';ai52.textContent='验证战术回球与网前实际触球';panel.insertBefore(ai52,$('#test-result'));
      ai52.addEventListener('click',()=>{
        const saved=$('#difficulty').value,checks=[];$('#difficulty').value='expert';startGame('practice');state.sound=false;
        const counts={};let allLegal=true,netContacts=0,lungePeak=0;
        for(let i=0;i<160;i++){
          const close=i<100,x=i%2?-1.1:1.1,y=close?(i%5===0?.65:i%7===0?2.15:1.3):2.65,z=close?-1.45:-4.6;
          state.phase='rally';state.lastHitter='player';state.rally=2;state.timer+=.5;
          player.pos.set(i%3===0?1.7:-1.7,0,i%4<2?5.7:2.1);player.vel.set(i%2?1:-1,0,i%3?-.5:.5);
          opponent.pos.set(x,0,z-.72);opponent.vel.set(0,0,0);opponent.energy=100;
          ball.pos.set(x,y,z);ball.active=true;opponentHit();
          const action=opponent.history.at(-1);counts[action.action]=(counts[action.action]||0)+1;
          const end=predict(ball.pos,ball.vel,1).landing;
          allLegal&&=ball.vel.toArray().every(Number.isFinite)&&end?.z>0&&Number.isFinite(end.x);
          if(action.type==='net'){netContacts++;lungePeak=Math.max(lungePeak,opponent.netLunge);}
        }
        checks.push({name:'engine-uses-varied-court-and-net-strokes',pass:Object.keys(counts).length>=9,counts});
        checks.push({name:'net-contact-activates-lunge',pass:netContacts>12&&lungePeak>.7,netContacts,lungePeak});
        checks.push({name:'all-engine-shots-have-finite-trajectories-to-receiving-side',pass:allLegal});
        $('#difficulty').value=saved;updateDifficultyUI();$('#test-result').textContent=JSON.stringify({pass:checks.every(c=>c.pass),checks},null,2);pauseGame();
      });
      const hands=document.createElement('button');hands.id='hands-on-test';hands.textContent='真实按键试玩：空格 / 左右键 / WASD';panel.insertBefore(hands,$('#run-play-test'));
      hands.addEventListener('click',()=>{startGame('practice');state.sound=false;state.handsOn=true;updateHud();});
      const controls51=document.createElement('button');controls51.id='run-v51-test';controls51.textContent='验证起跳、接管和新版控制';panel.insertBefore(controls51,$('#run-play-test'));
      controls51.addEventListener('click',()=>{
        const checks=[];startGame('practice');state.sound=false;
        performControl(keyCommand('Space'),'Space');let peak=0;
        for(let i=0;i<100;i++){fixedUpdate(1/120);peak=Math.max(peak,state.jump);}
        checks.push({name:'space-jumps-without-serving',pass:peak>.94&&state.hits===0&&state.phase==='serve'&&jumping.count===1,peak});
        state.phase='rally';state.lastHitter='opponent';state.rally=2;ball.active=false;state.prediction={intercept:{x:-2,z:2}};
        keys.add('KeyD');for(let i=0;i<30;i++)fixedUpdate(1/120);keys.clear();for(let i=0;i<50;i++)fixedUpdate(1/120);
        const chosen=player.pos.clone();for(let i=0;i<180;i++)fixedUpdate(1/120);
        checks.push({name:'manual-placement-does-not-snap-back',pass:player.pos.distanceTo(chosen)<.01&&state.manualOverride,drift:+player.pos.distanceTo(chosen).toFixed(4)});
        startGame('practice');state.sound=false;performControl(pointerCommand(2),'pointer-smash');for(let i=0;i<30;i++)fixedUpdate(1/120);
        // Since 6.3 only the smart/left button starts a serve; right is always a smash.
        checks.push({name:'right-click-does-not-accidentally-serve',pass:state.phase==='serve'&&!ball.active});
        performControl(pointerCommand(0),'pointer');for(let i=0;i<30;i++)fixedUpdate(1/120);
        performControl(pointerCommand(2),'pointer-smash');
        checks.push({name:'left-click-serves-and-right-click-arms-smash',pass:state.phase==='rally'&&hitIntent.kind==='smash'&&hitIntent.armed(state.timer)});
        startLesson();state.sound=false;keys.add('KeyW');for(let i=0;i<30;i++)fixedUpdate(1/120);keys.clear();
        checks.push({name:'lesson-movement-progresses',pass:state.tutorialStage===1});
        performControl(keyCommand('Space'),'Space');for(let i=0;i<100;i++)fixedUpdate(1/120);
        checks.push({name:'lesson-jump-progresses',pass:state.tutorialStage===2});
        for(let i=0;i<2200&&state.tutorialStage<3;i++){if(!hitIntent.armed(state.timer))performControl(pointerCommand(0),'pointer');fixedUpdate(1/120);}
        checks.push({name:'lesson-return-progresses',pass:state.tutorialStage===3});
        for(let i=0;i<1700;i++){if(!hitIntent.armed(state.timer))performControl(pointerCommand(0),'pointer');fixedUpdate(1/120);}
        checks.push({name:'lesson-requires-explicit-smash-input',pass:state.tutorialStage===3});
        hitIntent.clear();
        for(let i=0;i<3000&&state.tutorialStage<4;i++){if(!hitIntent.armed(state.timer))performControl(pointerCommand(2),'pointer-smash');fixedUpdate(1/120);}
        checks.push({name:'lesson-smash-completes',pass:state.tutorialStage===4});
        startGame('practice');state.sound=false;state.assists=false;player.pos.set(0,0,4.4);player.vel.set(0,0,0);state.lastMove=100;
        performControl(keyCommand('Space'),'Space');for(let i=0;i<30;i++)fixedUpdate(1/120);
        state.phase='rally';state.lastHitter='opponent';state.rally=2;state.prediction=null;state.yaw=0;state.pitch=.8;
        ball.pos.set(.15,3.75,3.65);ball.vel.set(0,-.1,.2);ball.active=true;performControl(pointerCommand(2),'pointer-smash');
        for(let i=0;i<24&&state.hits===0;i++)fixedUpdate(1/120);
        checks.push({name:'airborne-smash-hits-above-standing-reach',pass:state.hits===1&&['smash','slicesmash'].includes(state.lastShot?.type)&&state.jump>.5&&state.contactPoint.y>3.15,height:+state.contactPoint.y.toFixed(3),jump:+state.jump.toFixed(3)});
        $('#test-result').textContent=JSON.stringify({pass:checks.every(c=>c.pass),checks},null,2);pauseGame();
      });
      const league=document.createElement('button');league.id='run-league-test';league.textContent='验证十档比赛回球与对手发球';panel.insertBefore(league,$('#test-result'));
      league.addEventListener('click',()=>{
        const results=[],savedLevel=$('#difficulty').value,savedPoints=$('#match-points').value,careerBefore=career;
        try{
          $('#match-points').value='11';
          for(const [index,key] of Object.keys(OPPONENT_LEVELS).entries()){
            $('#difficulty').value=key;startGame('match');state.sound=false;state.assists=true;
            const near=index%2===0,x=(index%3-1)*.55,y=near?(index%4===0?.72:index%4===1?1.25:1.72):2.65,z=near?-1.35:-4.55;
            state.phase='rally';state.lastHitter='player';state.rally=2;state.timer=.03;state.returnDelay=0;
            player.pos.set(index%3===0?1.7:-1.55,0,index%2?5.4:3.5);player.vel.set(index%2?.8:-.7,0,index%3?-.5:.4);
            opponent.pos.set(x,0,z-.65);opponent.vel.set(0,0,0);opponent.energy=100;
            ball.pos.set(x,y,z);ball.vel.set(.2,-.3,1);ball.active=true;opponentHit();
            const landing=state.prediction?.landing;
            const pass=opponent.returns===1&&state.lastHitter==='opponent'&&ball.vel.toArray().every(Number.isFinite)&&landing?.z>0&&Number.isFinite(landing.x);
            results.push({level:key,pass,stroke:opponent.action,landing:landing&&{x:+landing.x.toFixed(2),z:+landing.z.toFixed(2)}});
          }
          $('#difficulty').value='normal';startGame('match');state.sound=false;state.phase='rally';state.lastHitter='player';scorePoint('opponent','发球回归');
          for(let i=0;i<600&&state.phase!=='rally';i++)fixedUpdate(1/120);
          results.push({name:'opponent-serve-enters-rally',pass:state.phase==='rally'&&state.lastHitter==='opponent'&&ball.vel.z>0&&state.server==='opponent'});
        }finally{$('#difficulty').value=savedLevel;$('#match-points').value=savedPoints;career=careerBefore;updateCareerUI();}
        $('#test-result').textContent=JSON.stringify({pass:results.every(r=>r.pass),results},null,2);pauseGame();
      });
      const overhead=document.createElement('button');overhead.id='show-overhead';overhead.textContent='实看头顶高球';panel.insertBefore(overhead,$('#test-result'));
      overhead.addEventListener('click',()=>{
        startGame('practice');state.sound=false;state.lastHitter='opponent';state.phase='rally';state.comfortable=false;state.highBallAssist=true;
        player.pos.set(0,0,4);player.previous.copy(player.pos);player.renderPos.copy(player.pos);
        ball.pos.set(.05,7,3.85);ball.previous.copy(ball.pos);ball.renderPos.copy(ball.pos);ball.vel.set(0,-.2,0);ball.active=true;state.lastMove=100;state.prediction=null;
        for(let i=0;i<60;i++)updateCamera(1/120);
        updateOpponentModel(.02);updateEffects(.02);updateHud();racket.visible=true;
        state.screen='overhead-preview';$('#test-result').textContent='已固定头顶高球实景 · 仰角 '+Math.round(state.pitch*180/Math.PI)+'° · 球在准星附近';
        panel.classList.add('hidden');$('#masthead').classList.add('hidden');
      });
      const highBallTest=document.createElement('button');highBallTest.id='run-highball-test';highBallTest.textContent='验证自由视角头顶球与跳跃眼高';panel.insertBefore(highBallTest,$('#test-result'));
      highBallTest.onclick=()=>{
        const saved={comfortable:state.comfortable,highBallAssist:state.highBallAssist,sound:state.sound},checks=[];
        for(const scenario of [{name:'overhead',ball:[.05,7,3.85],jump:0},{name:'jumped-eye',ball:[.1,4.2,2.8],jump:.9},{name:'distant-clear',ball:[-.4,8,-2],jump:0}]){
          startGame('practice');state.sound=false;state.comfortable=false;state.highBallAssist=true;state.lastHitter='opponent';state.phase='rally';state.manualPitch=-.03;state.autoPitchOffset=0;state.yaw=0;
          player.pos.set(0,0,4);player.renderPos.copy(player.pos);player.vel.set(0,0,0);player.speed=0;state.jump=scenario.jump;
          ball.pos.fromArray(scenario.ball);ball.renderPos.copy(ball.pos);ball.active=true;
          for(let i=0;i<60;i++)updateCamera(1/120);
          updateEffects(.02);const projected=shuttle.position.clone().project(camera);
          checks.push({name:scenario.name,pass:Math.abs(projected.x)<.2&&projected.y>.1&&projected.y<.65&&state.yaw===0,screen:projected.toArray().map(n=>+n.toFixed(3)),eye:+camera.position.y.toFixed(3),pitchDegrees:Math.round(state.pitch*180/Math.PI)});
        }
        Object.assign(state,saved);state.jump=0;$('#test-result').textContent=JSON.stringify({pass:checks.every(c=>c.pass),checks},null,2);pauseGame();
      };
      v5.addEventListener('click',()=>{
        const checks=[],savedLevel=$('#difficulty').value,savedPoints=$('#match-points').value,careerBefore=career;
        try{
          startGame('practice');state.sound=false;state.comfortable=true;state.lastMove=100;ball.pos.set(.05,7,3.85);ball.vel.set(0,0,0);ball.active=true;state.phase='rally';state.lastHitter='opponent';player.pos.set(0,0,4);player.vel.set(0,0,0);
          for(let i=0;i<90;i++)updatePlayer(1/120);player.renderPos.copy(player.pos);ball.renderPos.copy(ball.pos);updateCamera(.05);
          updateEffects(.02);const projected=shuttle.position.clone().project(camera);checks.push({name:'overhead-shuttle-visible',pass:Math.abs(projected.y)<.25&&Math.abs(projected.x)<.25,pitchDegrees:Math.round(state.pitch*180/Math.PI),screen:projected.toArray().map(n=>+n.toFixed(3))});
          for(const scenario of [{name:'heavy-smash-winner',p:[.2,3,3.2],heavy:true,winner:0},{name:'low-smash-net',p:[.2,1.7,3.2],fault:'net',winner:1},{name:'stretched-smash-out',p:[2,2.6,3.4],fault:'out',winner:1}]){
            $('#difficulty').value='easy';startGame('match');state.sound=false;player.pos.set(0,0,4);player.vel.set(0,0,0);player.speed=0;state.lastMove=100;
            opponent.pos.set(-2.4,0,-5.8);opponent.vel.set(0,0,0);state.aim=.8;state.depth=-4.7;state.phase='rally';state.lastHitter='opponent';state.swing=.095;state.swingKind='smash';ball.pos.fromArray(scenario.p);ball.vel.set(0,-.1,1);ball.active=true;state.yaw=0;
            const hit=tryPlayerHit(),shot=state.lastShot,speed=Math.round(ball.vel.length()*3.6);
            for(let i=0;i<720&&state.phase==='rally';i++)fixedUpdate(1/120);
            checks.push({name:scenario.name,pass:hit&&(scenario.heavy?shot.heavy:shot.fault===scenario.fault)&&state.score[scenario.winner]===1,heavy:shot?.heavy,fault:shot?.fault,speed,score:[...state.score]});
          }
          const levels=[];
          for(const key of Object.keys(OPPONENT_LEVELS)){
            $('#difficulty').value=key;startGame('match');state.sound=false;state.phase='rally';state.lastHitter='player';state.timer=.01;state.returnDelay=0;ball.active=false;state.prediction={intercept:{x:2,z:-5.8}};opponent.pos.set(-2,0,-4.2);opponent.vel.set(0,0,0);let travelled=0;
            for(let i=0;i<30;i++){const before=opponent.pos.clone();updateOpponent(1/120);travelled+=opponent.pos.distanceTo(before);}
            levels.push({level:key,movement:+travelled.toFixed(3),reaction:opponentLevel(key).reaction});
          }
          checks.push({name:'ten-levels-have-distinct-movement',pass:levels.every((v,i)=>i===0||v.movement>levels[i-1].movement),levels});
          for(const points of [11,21]){
            $('#match-points').value=String(points);$('#difficulty').value='easy';startGame('match');state.sound=false;state.score=[points-1,4];state.phase='rally';state.lastHitter='player';scorePoint('player','测试结束球');const once=career.played;commitMatch();
            checks.push({name:`${points}-point-rating-settles-once`,pass:state.finished&&career.played===once&&state.ratingDelta!==null,score:[...state.score],delta:state.ratingDelta});
          }
        }finally{$('#difficulty').value=savedLevel;$('#match-points').value=savedPoints;career=careerBefore;updateCareerUI();}
        $('#test-result').textContent=JSON.stringify({pass:checks.every(c=>c.pass),checks},null,2);pauseGame();
      });
      $('#run-play-test').addEventListener('click',()=>{
        startGame('practice');state.sound=false;setShot('clear');hitIntent.press(state.timer,null,'selftest');
        let longest=0;const started=performance.now();
        for(let i=0;i<7200;i++){fixedUpdate(1/120);longest=Math.max(longest,state.rally);if(state.screen!=='play')break;}
        updateHud();const result={pass:state.hits>=8&&longest>=3,simulationSeconds:state.timer,hits:state.hits,longestRally:longest,screen:state.screen,phase:state.phase,reason:$('#point-reason').textContent,ball:ball.pos.toArray(),opponent:opponent.pos.toArray(),serveCount:state.serveCount,heldInputs:hitIntent.sources.size,movementInputs:0,cpuMs:Math.round(performance.now()-started)};
        $('#test-result').textContent=JSON.stringify(result,null,2);pauseGame();
      });
      $('#run-input-suite').addEventListener('click',()=>{
        const results=[],savedAuto=$('#eagle-auto').checked;$('#eagle-auto').checked=false;
        // Isolate queued input and placement from random opponent errors and
        // automatic review. A new ball receives a new tap, even at rally #2.
        try{
          for(const scenario of [{name:'left',aim:-.8},{name:'right',aim:.8},{name:'early-taps',aim:0,taps:true}]){
            const contacts=[];
            for(const lane of [-.85,.7,-.3,.35,0,.9]){
              startGame('practice');state.sound=false;setShot('clear');state.aim=scenario.aim;state.manualLanding=true;state.depth=-5.2;
              state.phase='rally';state.lastHitter='opponent';state.rally=2;state.yaw=0;state.lastMove=-10;ball.active=true;
              ball.pos.set(lane,4.4,3);ball.vel.set(0,-1,1.2);refreshPrediction();
              const at=state.timer;hitIntent.press(at,'clear','selftest-input');if(scenario.taps)hitIntent.release('selftest-input');
              const queued=hitIntent.armed(at)&&(!scenario.taps||hitIntent.sources.size===0);
              for(let i=0;i<360&&state.hits===0&&state.phase==='rally';i++)fixedUpdate(1/120);
              const landed=state.lastLanding,target=state.lastShot?.intended,error=landed&&target?Math.hypot(landed.x-target.x,landed.z-target.z):99;
              const direction=landed&&(scenario.aim<0?landed.x<-.5:scenario.aim>0?landed.x>.5:Math.abs(landed.x)<.5);
              contacts.push({lane,pass:queued&&state.hits===1&&!state.lastShot?.fault&&direction&&error<.2&&(!scenario.taps||state.timer-at>.12),hits:state.hits,delay:+(state.timer-at).toFixed(3),error:+error.toFixed(3),fault:state.lastShot?.fault??null});
            }
            results.push({name:scenario.name,pass:contacts.every(c=>c.pass),contacts});
          }
        }finally{$('#eagle-auto').checked=savedAuto;}
        $('#test-result').textContent=JSON.stringify({pass:results.every(r=>r.pass),results},null,2);pauseGame();
      });
      $('#run-target-test').addEventListener('click',()=>{
        startGame('targets');state.sound=false;hitIntent.press(0,null,'selftest');let previous=-1;
        for(let i=0;i<7200;i++){
          if(state.target&&state.targetIndex!==previous){previous=state.targetIndex;chooseLanding(state.target);setShot(state.target.z>-3?'drop':'clear');}
          fixedUpdate(1/120);
        }
        const result={pass:state.targetShots>=3&&state.targetHits>=1,simulationSeconds:60,hits:state.targetHits,shots:state.targetShots,bestStreak:state.targetBest,aimedZones:DRILL_TARGETS.length};
        $('#test-result').textContent=JSON.stringify(result,null,2);pauseGame();
      });
      $('#run-v2-test').addEventListener('click',()=>{
        const checks=[];
        startGame('practice');state.sound=false;setAssist(false);state.comfortable=false;state.yaw=1.1;
        const initial=player.pos.clone();keys.add('KeyW');
        for(let i=0;i<60;i++)fixedUpdate(1/120);
        keys.clear();checks.push({name:'court-relative-W',pass:Math.abs(player.pos.x-initial.x)<.01&&initial.z-player.pos.z>1.7});
        state.assists=true;state.yaw=2.7;state.lastLook=-10;
        for(let i=0;i<120;i++)fixedUpdate(1/120);
        checks.push({name:'free-camera-stays-free',pass:Math.abs(state.yaw-2.7)<.001});state.assists=false;
        player.pos.set(0,0,4.5);player.vel.set(0,0,0);player.speed=0;const beforeDash=player.pos.clone();lunge();
        for(let i=0;i<24;i++)fixedUpdate(1/120);
        const dashDistance=player.pos.distanceTo(beforeDash);
        checks.push({name:'lunge-and-cooldown',pass:dashDistance>1.5&&dashDistance<1.7&&dash.cooldown>0,distance:Math.round(dashDistance*100)/100});
        for(const kind of ['clear','drop','smash','drive','lift','net','netcross','slicesmash','slicedrop','push','netkill']){
          startGame('practice');state.sound=false;setShot(kind);state.assists=true;player.pos.set(0,0,5);
          ball.pos.set(.1,kind==='smash'?2.9:kind==='lift'?.8:2.05,4);ball.vel.set(0,-.2,1);ball.active=true;state.phase='rally';state.lastHitter='opponent';
          state.prediction=null;hitIntent.press(0,null,'selftest');
          fixedUpdate(1/120);const waited=state.lastHitter==='opponent';
          for(let i=0;i<17;i++)fixedUpdate(1/120);
          checks.push({name:`swing-${kind}`,pass:waited&&state.lastHitter==='player'&&state.hits===1});
        }
        startGame('match');state.sound=false;state.assists=true;hitIntent.press(0,null,'selftest');
        for(let i=0;i<86400&&state.screen==='play';i++){
          state.aim=opponent.pos.x>.1?-1:1;
          setShot(opponent.pos.z < -3.1 ? 'drop' : 'clear');
          fixedUpdate(1/120);
        }
        checks.push({name:'complete-match',pass:state.finished&&Math.max(...state.score)>=11,score:[...state.score],hits:state.hits,finished:state.finished});
        $('#test-result').textContent=JSON.stringify({pass:checks.every(check=>check.pass),checks},null,2);pauseGame();
      });
      $('#run-perf-test').addEventListener('click',()=>{startGame('practice');state.sound=false;hitIntent.press(0,null,'selftest');frameProbe={warmup:30,samples:[]};$('#test-result').textContent='正在采样真实动画帧，完成后自动暂停…';});
      $('#inspect-model').addEventListener('click',()=>{
        state.screen='inspect';$('#menu').classList.add('hidden');$('#hud').classList.add('hidden');$('#pause-overlay').classList.add('hidden');
        bot.root.position.set(0,0,0);bot.root.rotation.set(0,0,0);bot.update({time:0});bot.label.visible=false;racket.visible=false;shuttle.visible=false;
        camera.position.set(1.45,1.45,3.1);camera.fov=41;camera.lookAt(0,1.08,0);camera.updateProjectionMatrix();
        $('#test-result').textContent='人物近景：肩胯比例 / 五官 / 衣料 / 肘膝关节';
      });
    }
    bootStage='frame';boot({stage:'绘制第一帧',percent:95});animate();boot({ready:true});
  } catch (e) {
    console.error(e);boot({error:bootStage==='renderer'?`浏览器未能创建 WebGL 图形环境：${e.message}。可尝试低负载启动，并确认 Chrome / Edge 的图形加速可用。`:`游戏在${bootStage==='assets'?'资源准备':'场景绘制'}时出错：${e.message}。请重试或选择低负载启动。`});
  }
}
function batchHall() {
  // The hall never moves. Merge it by material to keep draw calls low.
  scene.updateMatrixWorld(true);
  const groups = new Map();
  for (const object of [...scene.children]) {
    if (!object.isMesh || Array.isArray(object.material) || object === courtScore) continue;
    const key = `${object.material.uuid}/${object.castShadow}/${object.receiveShadow}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(object);
  }
  for (const objects of groups.values()) {
    if (objects.length < 2) continue;
    const geometries = objects.map(o => o.geometry.clone().applyMatrix4(o.matrixWorld));
    const geometry = mergeGeometries(geometries, false);
    if (geometry) {
      const merged = new THREE.Mesh(geometry, objects[0].material);
      merged.castShadow = objects[0].castShadow; merged.receiveShadow = objects[0].receiveShadow;
      scene.add(merged); objects.forEach(o => { scene.remove(o); o.geometry.dispose(); });
    }
    geometries.forEach(g => g.dispose());
  }
}
init();

