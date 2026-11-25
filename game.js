import {crowdReaction,createStandAudio} from './stand-audio.mjs';
import {matchKit} from './match-kit.mjs';
import * as THREE from './vendor/three/build/three.module.js';
import { mergeGeometries } from './vendor/three/addons/utils/BufferGeometryUtils.js';
import { COURT, advance, solveShot, predict, winnerOnLanding, clamp, damp, groundCrossing, createGroundMotion, stepGroundMotion } from './physics.mjs';
import { TRAINING_NAMES, TRAINING_REPS, trainingRep, gradeTrainingRep } from './training.mjs';
import { FlightRecorder, EagleEyeReview } from './eagle-eye.mjs';
import { AutoReturnAssist, HitIntent, canContact, defensiveReach, crossesStrings, receivingTarget, receiveIntercept, pursuitSprint, swingWindow, strokeTiming, netKillOpportunity } from './controls.mjs';
import { JumpMotion, MovementOwnership, keyCommand, pointerCommand } from './interaction.mjs';
import { freeLook, landingFromMap, moveLanding, normalizeLanding, landingName, LANDING_PRESETS } from './aiming.mjs';
import { createAthlete } from './athlete.mjs';
import {cameraMode,toggleCameraMode,orbitLook,thirdPersonPose,thirdPersonLift,thirdPersonFov,shuttleScreenCue,THIRD_PERSON_PITCH,avatarObstruction,avatarSwingTime} from './camera-mode.mjs';
import { movementVector, gradeContact, strokeOutcome, shotTarget, SHOT_DEPTHS, Dash, targetDistance, DRILL_TARGETS, practiceFeed, smartStroke, racketPowerBoost, techniqueTarget } from './gameplay.mjs';
import { OPPONENT_LEVELS, LEVEL_DESCRIPTIONS, LEVEL_REFERENCES, opponentLevel, placementSpread, singlesServiceSide, matchFinished, rankName, freshCareer, parseCareer, settleMatch, worldStandings } from './competition.mjs';
import {planOpponentStroke,recoveryBase,opponentFootwork,opponentReceiveMissChance,opponentStrokeExecution,opponentServeTarget,opponentContactWindow,opponentStance,defensiveIntercept,opponentReceiveBase,opponentWeaknessProfile,opponentWeaknessKey} from './opponent-ai.mjs';
import { trackAngles, stepTracking, highBallOffset, stepHighBallOffset, manualLookTakeover, overheadPreparation } from './tracking.mjs';
import { loadSurfaceMaps, createEnvironment, CourtPresentation } from './presentation.mjs';
import { createViewmodel } from './viewmodel.mjs';
import { prepareHands } from './hand-sculpt.mjs';
import {preparePlayerArm} from './player-arm.mjs';
import { RenderBudget, AdaptiveResolution, renderProfile } from './render-budget.mjs';
import {RenderLoop} from './render-loop.mjs';
import { createRacketModel, disposeRacketModel } from './racket-model.mjs';
import { swingPose, moveVelocity, groundedCameraOffset, serveSupportPose, supportHandPose } from './motion.mjs';
import { dressHall } from './hall-details.mjs';
import { hallSurfaces } from './hall-surfaces.mjs';
import {createHallContext} from './hall-context.mjs';
import {ARENA} from './arena-layout.mjs';
import {createArenaBowl} from './arena-bowl.mjs';
import {RACKET_SKINS,racketSkin,firstTitleEvent,canEquipRacket} from './racket-catalog.mjs';
import {createRacketGallery} from './racket-gallery.mjs';
import { roofGeometry } from './roof-structure.mjs';
import { createShuttleModel, shuttleVisualScale } from './shuttle-model.mjs';
import { createCourtNet, NET_HALF_WIDTH } from './court-net.mjs';
import { createTechniquePanel } from './technique-panel.mjs';
import { OPPONENT_STYLES, effectiveOpponentLevel, playerStatsFromInputs, playerStatsForStyle, normalizeSkills } from './player-styles.mjs';
import {OPPONENT_CHARACTERS,matchIntent,characterRecovery,resolveCharacter,strokeSoundProfile} from './match-mind.mjs';
import {matchHighlight,OpponentMemory,MatchTactics,MATCH_OBJECTIVES,TACTICAL_LABELS,movementEnergyRate,directionalTarget,contactPressure} from './tactics.mjs';
import {TOUR_EVENTS,TOUR_STARS,EXHIBITION_ROSTER,FEATURED_STARS,chooseRandomOpponent,event as tourEvent,star as tourStar,freshTour,buildBracket,currentTourMatch,advanceTour,tourStatus} from './tournament.mjs';

const $ = (s) => document.querySelector(s);
const canvas = $('#court');
const params = new URLSearchParams(location.search);
const PLAYER_NAME='林楠';
const testing = params.get('test') === '1';
const safeBoot = params.get('safe') === '1';
const boot = detail => window.dispatchEvent(new CustomEvent('court-boot',{detail}));
const coarse = matchMedia('(pointer:coarse)').matches;
const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const clock = new THREE.Clock();
const state = {
  screen: 'menu', mode: 'match', phase: 'serve', difficulty: 'easy',
  score: [0, 0], rally: 0, maxRally: 0, hits: 0, maxSpeed: 0,
  assists: false, autoReturn: false, sound: true, stamina: 100, shot: 'auto',
  timer: 0, elapsed: 0, serveCount: 0, lastHitter: 'player',
  prediction: null, incomingTime: 0, pointDelay: 0, charge: 0,
  swing: 0, swingContact: false, swingKind: 'clear', feedback: 0,
  hitstop: 0, impact: 0, jump: 0, jumpV: 0, lastMove: -10,
  lastLook: -10, yaw: 0, pitch: 0, sensitivity: 1, finished: false,
  returnDelay: 0, audioInitialized: false, countdown: 0,
  aim: 0, depth: -4.7, comfortable: false, coach: true, cue: '', pace: 1, receivePace:1, sprintAssist:true, profile: 'balanced',motion:.35,focus:false,controlsVisible:false,manualLanding:false,shotCueUntil:0,
  targetIndex: -1, target: null, targetArmed: false, targetHits: 0, targetShots: 0, targetStreak: 0, targetBest: 0,
  matchPoints:11,server:'player',matchId:'',ratingDelta:null,smashes:0,winners:0,errors:0,lastShot:null,
  directionMode:'natural',tacticMessage:'',
  advanced:false,manualOverride:false,tutorial:false,tutorialStage:0,jumpPeak:0,
  aiming:false,aimAlt:false,swingTarget:null,serveTarget:null,serveStyle:'low',lastLanding:null,racketStyle:'attack',racketSkin:'astrox100zz',opponentStyle:'allround',playerStats:normalizeSkills(),opponentStats:normalizeSkills(),highBallAssist:true,manualPitch:-.03,autoPitchOffset:0,
  tournamentId:'',tournamentRound:0,tournamentOpponent:'',tournamentVenue:'',tournamentAccent:'#d8bf74',
  currentOpponentId:'',cameraMode:'first',orbitYaw:0,orbitPitch:THIRD_PERSON_PITCH,thirdFraming:'near',thirdLift:0,avatarFade:0,contactHint:true,ballGuide:true,firstView:null,
};
let career=freshCareer();
const CAREER_KEY='feather-court-career-v1';
const TOUR_KEY='feather-court-tour-v1';
const EXHIBITION_RECENT_KEY='feather-court-exhibition-recent-v1';
let tour=null;
let tourCareer={titles:0,completed:0,active:null,trophies:{},recentOpponents:[]};
function saveTour(){try{if(!testing)localStorage.setItem(TOUR_KEY,JSON.stringify({tour,tourCareer}));}catch{}}
function recentExhibitionOpponents(){try{const ids=JSON.parse(localStorage.getItem(EXHIBITION_RECENT_KEY)||'[]');return Array.isArray(ids)?ids.filter(id=>TOUR_STARS[id]).slice(-12):[];}catch{return[];}}
function rememberOpponent(id){if(!id||!TOUR_STARS[id]||testing)return;if(state.tournamentId){tourCareer.recentOpponents=[...tourCareer.recentOpponents.filter(other=>other!==id),id].slice(-12);saveTour();return;}try{localStorage.setItem(EXHIBITION_RECENT_KEY,JSON.stringify([...recentExhibitionOpponents().filter(other=>other!==id),id].slice(-12)));}catch{}}
function loadTour(){try{const raw=JSON.parse(localStorage.getItem(TOUR_KEY)||'null');if(raw&&('tour'in raw||'tourCareer'in raw)){tour=raw.tour||null;tourCareer={titles:0,completed:0,active:null,trophies:{},recentOpponents:[],...raw.tourCareer};}else{tour=raw;tourCareer={titles:0,completed:0,active:null,trophies:{},recentOpponents:[]};}tourCareer.trophies=tourCareer.trophies&&typeof tourCareer.trophies==='object'?tourCareer.trophies:{};tourCareer.recentOpponents=Array.isArray(tourCareer.recentOpponents)?tourCareer.recentOpponents.filter(id=>TOUR_STARS[id]).slice(-12):[];if(tour){const expected=eventRounds(tour.eventId);if(!tour.bracket||tour.bracket.map(round=>round.length).join(',')!==expected.join(',')){tour.bracket=buildBracket(tourEvent(tour.eventId),Date.parse(tour.startedAt)||2026,tourCareer.recentOpponents);tour.opponentId=tour.bracket[tour.roundIndex]?.[0]?.b||tour.opponentId;saveTour();}}}catch{tour=null;tourCareer={titles:0,completed:0,active:null,trophies:{},recentOpponents:[]};}}
function eventRounds(eventId){return [16,8,4,2,1];}
const keys = new Set();
const hitIntent = new HitIntent();
const trainingBestKey = 'feather-court-training-best-v1';
let trainingMode = 'mixed', training = null;
const autoReturnAssist = new AutoReturnAssist();
const dash = new Dash();
const jumping=new JumpMotion(),movementOwner=new MovementOwnership();
const opponentMemory=new OpponentMemory(),matchTactics=new MatchTactics();
const player = { pos: V(.45, 0, 4.45), vel: V(), speed: 0,step:0 };
const opponent = { pos: V(-.6, 0, -4.5), vel: V(), target: V(), swing: 0, step: 0, returns: 0, energy: 100, weaknesses:{}, exposure:{}, adaptation:{}, lastWeakness:'' };
const ball = { pos: V(.4, 1.12, 3.7), vel: V(), active: false, trail: [], flash: 0 };
const flightRecorder = new FlightRecorder();
let eagleEye, lastLineReview = null, reviewReturnScreen = 'play', reviewPending = -1;
let groundMotion = null;
let techniquePanel,racketGallery,galleryReturnScreen;

function openLineReview(automatic = false) {
  if (!lastLineReview || !['play', 'pause'].includes(state.screen) || (state.screen === 'play' && !['point', 'serve', 'opponentServe'].includes(state.phase))) return;
  standAudio?.quiet();stopStandCheer();reviewReturnScreen = state.screen; state.screen = 'review'; reviewPending = -1;
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
let renderer, scene, camera, racket, shuttle, bot, landingMarker, targetMarker, aimMarker, shuttleShadow, shuttleFootprint, net, courtScore, presentation, surfaceMaps;
let receiveMarker, shuttleHeightLine;
let playerAvatar=null;
let umpire, standReaction=null;
let audienceGroup=null, venueSign=null, venueAccent='#818e93',mainCourtMaterial=null,runoffMaterial=null;
let audio, master, trailLine, shuttleNoise, shuttleFilter, shuttleGain, shuttlePan, lastShuttleSoundUpdate=-1, menuTime = 0, accumulator = 0, fps = 60;
let lastHud = 0, previousCameraPos = V(), pointerDown = false, touchMove = { x: 0, y: 0 };
let previousManual = false;
let gamepadHitHeld = false, gamepadJumpHeld = false, gamepadDashHeld = false;
const inspectCenter=V();
let inspectDrag=null,frameProbe=null,lastFrameTime=performance.now(),lastEffectsUI=-1;
const renderBudget=new RenderBudget(),adaptiveResolution=new AdaptiveResolution();let qualityMode='auto';
const renderLoop=new RenderLoop(animate);let graphicsLost=false,environmentTarget=null;
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

function createAudience(){
  audienceGroup=createArenaBowl(THREE,mergeGeometries);scene.add(audienceGroup);
  audienceGroup.userData.applyVenue({accent:venueAccent});
}

function applyTournamentVenue(spec){
  if(!spec)return;venueAccent=spec.accent||venueAccent;audienceGroup?.userData.applyVenue?.(spec);
  if(mainCourtMaterial&&spec.courtTone)mainCourtMaterial.color.set(spec.courtTone);
  if(runoffMaterial)runoffMaterial.color.set(spec.runoffTone||'#41494a');
  if(venueSign){venueSign.material.map?.dispose?.();venueSign.material.map=texture(1024,256,(c,w,h)=>{c.fillStyle='#251b43';c.fillRect(0,0,w,h);c.fillStyle='#f5edff';c.font='700 64px "Segoe UI","Microsoft YaHei"';c.textAlign='center';c.textBaseline='middle';c.fillText(spec.name+'  ·  '+spec.city,w/2,h/2);});venueSign.material.needsUpdate=true;}
}

function createHall() {
  const architecture=hallSurfaces(THREE);
  scene.background = new THREE.Color('#252835');
  scene.fog = new THREE.FogExp2('#30313b', .003);
  const hemi = new THREE.HemisphereLight('#d9e0e2', '#504d58', .48); scene.add(hemi);
  const sun = new THREE.DirectionalLight('#e8e0d3', 1.55); sun.position.set(-11, 16, -8); sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024); sun.shadow.camera.left = -26; sun.shadow.camera.right = 26;
  sun.shadow.camera.top = 21; sun.shadow.camera.bottom = -21; sun.shadow.camera.near = .1; sun.shadow.camera.far = 82;
  sun.shadow.normalBias = .018; sun.shadow.bias = -.00012; sun.shadow.radius = 4; scene.add(sun);
  const fill = new THREE.DirectionalLight('#d9deeb', .38); fill.position.set(10, 10, 4); scene.add(fill);
  const bounce=new THREE.DirectionalLight('#d8c7ba',.18);bounce.position.set(0,3,14);scene.add(bounce);
  const overhead=new THREE.SpotLight('#fff2d8',72,27,Math.PI*.34,.72,2);overhead.position.set(0,8,1);overhead.target.position.set(0,0,-2);overhead.castShadow=true;overhead.shadow.mapSize.set(512,512);overhead.shadow.normalBias=.018;overhead.shadow.bias=-.0001;scene.add(overhead,overhead.target);
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
  // Physics ground y=0; 4 mm PVC lies directly on wood. Lines are paint, not raised bars.
  const floor = box(ARENA.width, .2, ARENA.length, new THREE.MeshPhysicalMaterial({ color:'#777066',map: surfaceMaps.wood||floorTex, normalMap:surfaceMaps.woodNormal||null,normalScale:new THREE.Vector2(.22,.22),roughnessMap:surfaceMaps.woodRough||null,roughness:.84,clearcoat:.055,clearcoatRoughness:.72 }), 0, -.106, 0); floor.receiveShadow = true;
  if(surfaceMaps.wood)floorTex.dispose();
  const courtTex=architecture.court;
  const mat = box(7.9, .004, 16.2, new THREE.MeshPhysicalMaterial({ map: courtTex, normalMap:architecture.courtNormal,normalScale:new THREE.Vector2(.16,.16),roughness:.88,clearcoat:.04,clearcoatRoughness:.88 }), 0, -.002, 0); mat.receiveShadow = true;mainCourtMaterial=mat.material;
  // Leave a real gap between wood, runoff and the upper playing mat.
  const runoff = material('#41494a',.94);runoffMaterial=runoff;
  const safetyFloor=box(14.7,.004,23.6,runoff,0,-.005,0);
  safetyFloor.receiveShadow=true;
  const line = new THREE.MeshStandardMaterial({ color: '#e5e9dc',roughness:.78 });
  const lineAt = (x1, z1, x2, z2, width = .04) => {
    const p = box(Math.abs(x2 - x1) || width, .0002, Math.abs(z2 - z1) || width, line, (x1 + x2) / 2, .0001, (z1 + z2) / 2);
    p.receiveShadow = true;
  };
  [-3.05, -2.59, 2.59, 3.05].forEach(x => lineAt(x, -6.7, x, 6.7));
  [-6.7, -5.94, -1.98, 1.98, 5.94, 6.7].forEach(z => lineAt(-3.05, z, 3.05, z));
  lineAt(0, -6.7, 0, -1.98); lineAt(0, 1.98, 0, 6.7);
  const wall = material('#535561'), lower = material('#51585b'), black = material('#252833'), steel = material('#7b8291', .4, .6);
  wall.map=architecture.wall;wall.roughness=.95;lower.map=architecture.wall;lower.roughness=.91;
  box(ARENA.width, ARENA.wallHeight, .3, wall, 0, ARENA.wallHeight/2, -ARENA.halfLength); box(ARENA.width, ARENA.wallHeight, .3, wall, 0, ARENA.wallHeight/2, ARENA.halfLength);
  // Open apertures expose real exterior depth instead of wallpaper on the wall.
  for(const side of [-1,1]){
    box(.3,12,ARENA.length-2,wall,side*ARENA.halfWidth,6,0);box(.3,4.8,ARENA.length-2,wall,side*ARENA.halfWidth,17.6,0);
    for(const z of [-30,30])box(.3,11,3,wall,side*ARENA.halfWidth,9.5,z);
  }
  box(ARENA.width-1, 2.8, .2, lower, 0, 1.4, -ARENA.halfLength+.22); box(ARENA.width-1, 2.8, .2, lower, 0, 1.4, ARENA.halfLength-.22);
  const panelWood = material('#907a58');
  const windowMaterial=new THREE.MeshStandardMaterial({color:'#b7c9c4',transparent:true,opacity:.08,depthWrite:false,roughness:.3,metalness:.12,side:THREE.DoubleSide});
  for (const side of [-1, 1]) {
    box(.3, 3.1, ARENA.length-2, panelWood, side * 23.8, 1.5, 0);
    for (let z = -30; z < 30; z += .32) box(.04, 3.1, .038, black, side * 23.6, 1.5, z);
    for (let z = -27.5; z <= 27.5; z += 5) {
      box(.38, 15.8, .38, black, side * 23.4, 10.2, z);
      if(z<27.5){
        const pane=mesh(new THREE.PlaneGeometry(4.5,3.1),windowMaterial,side*24.8,13.6,z+2.5);pane.rotation.y=-side*Math.PI/2;
        for(let yy=12;yy<=15.2;yy+=1.6)box(.08,.055,4.6,black,side*24.7,yy,z+2.5);
        for(let zz=0;zz<=4.6;zz+=1.15)box(.08,3.2,.045,black,side*24.7,13.6,z+.2+zz);
      }
    }
  }
  const roof = new THREE.MeshStandardMaterial({map:architecture.roof,color:'#697079',roughness:.86,metalness:.06,emissive:'#38414a',emissiveIntensity:.32});
  mesh(roofGeometry(THREE),roof);
  const diffuserMaterial=new THREE.MeshStandardMaterial({map:architecture.diffuser,color:'#e6ebdf',emissiveMap:architecture.diffuser,emissive:'#eef2e1',emissiveIntensity:.8,roughness:.64});
  const lampRim=material('#d0d6c9',.55,.18);
  for (let z = -28; z <= 28; z += 7) {
    box(48, .26, .24, black, 0, 17.6, z);
    cylinder(V(-23.4, 17.55, z), V(0, ARENA.roofY, z), .065, steel);
    cylinder(V(23.4, 17.55, z), V(0, ARENA.roofY, z), .065, steel);
    for (let x = -21; x <= 21; x += 3) cylinder(V(x, 17.6, z), V(x + 1.5, 18.3, z), .025, steel);
    for (const x of [-7, 7]) {
      for(const xx of [x-8,x+8]){
        cylinder(V(xx, 17.6, z), V(xx, 16.8, z), .018, steel);
        box(.7, .1, 1.8, steel, xx, 16.8, z);
        box(.63,.024,1.68,lampRim,xx,16.743,z);
        box(.56, .014, 1.58, diffuserMaterial, xx, 16.723, z);
        for(const dz of [-.86,.86])box(.73,.035,.035,lampRim,xx,16.74,z+dz);
      }
    }
  }
  for (const x of [-22, 22]) box(.12, .12, 60, steel, x, 17.8, 0);
  // Long, soft window-shaped patches make the court read as an actual indoor space.
  const lightPatch = new THREE.MeshBasicMaterial({ color: '#fff5c6', transparent: true, opacity: .035, depthWrite: false });
  for (let z = -28; z < 30; z += 7) { const p = mesh(new THREE.PlaneGeometry(7, 2.8), lightPatch, -11, -.0035, z); p.rotation.x = -Math.PI / 2; p.rotation.z = .36; }
  // A restrained event fascia sits above the modeled end stand; the arena has
  // real depth and spectators instead of a flat billboard filling the wall.
  const banner = textPanel('PARIS 2024  ·  BADMINTON', 8, .48, { bg: '#243330', color: '#d7c89d', size: 48, weight: 600 }); banner.position.set(0, 18.2, -31.52); scene.add(banner);venueSign=banner;
  const no = textPanel('01', 3, 3, { bg: '#203e3c', color: '#a6b5a2', size: 180, weight: 300 }); no.position.set(18, 7.2, -31.57); scene.add(no);
  const backBrand = textPanel('MOVE  WITH  THE  MOMENT.', 9, 1, { bg: '#24443e', color: '#93a796', size: 51 }); backBrand.position.set(0, 3.4, -31.6); scene.add(backBrand);
  const sideBrand = textPanel('来拍！  /  LZYYMQ', 9, 1.2, { bg: '#24443e', color: '#9fb49e', size: 58 }); sideBrand.position.set(-23.45, 2.1, -3); sideBrand.rotation.y = Math.PI / 2; scene.add(sideBrand);
  const door = material('#1b302e');
  for (const x of [-18, 18]) {
    box(1.8, 3.1, .1, steel, x, 1.55, -31.54); box(1.65, 3, .12, door, x, 1.5, -31.45);
    box(.06, .3, .06, steel, x + .52, 1.35, -31.34);
    const exit = textPanel('EXIT →', 1.4, .34, { bg: '#2b6e47', color: '#e5f9cf', size: 90 }); exit.position.set(x, 3.35, -31.5); scene.add(exit);
  }
  const benchWood = material('#b6996a', .65), benchMetal = material('#223b35', .4, .5);
  if(surfaceMaps.wood){const benchGrain=surfaceMaps.wood.clone();benchGrain.repeat.set(1.1,.035);benchGrain.needsUpdate=true;benchWood.map=benchGrain;benchWood.color.set('#e2d1af');}
  function bench(x, z) {
    for (const xx of [-1.8, 1.8]) { box(.15, .43, .55, benchMetal, x + xx, .22, z); box(.1, .9, .09, benchMetal, x + xx, .58, z - .25); }
    for (let i = 0; i < 4; i++) box(4.4, .06, .14, benchWood, x, .48, z - .24 + i * .15);
    for (let i = 0; i < 3; i++) box(4.4, .13, .055, benchWood, x, .7 + i * .16, z - .3);
  }
  bench(-5.8, -10.5); bench(5.8, -10.5); bench(5.8, 10.5);
  createAudience();createNet();umpire=dressHall(THREE,scene,mergeGeometries);createHallContext(THREE,scene);
  courtScore = textPanel('林楠   00  :  00   对手', 4.2, .9, { bg: '#102823', color: '#def6a3', size: 70 });
  courtScore.position.set(0, 11.7, -31.5); scene.add(courtScore);
}

function playerFirstTitle(){return firstTitleEvent(tourCareer,career,TOUR_EVENTS);}
function refreshRacketOptions(){
 const select=$('#racket-skin'),title=playerFirstTitle();
 select.replaceChildren();
 for(const [id,spec] of Object.entries(RACKET_SKINS)){
  const locked=!canEquipRacket(id,title);
  const option=new Option(spec.label+(locked?' · 首冠后解锁':''),id);
  option.disabled=locked;select.add(option);
 }
 select.value=state.racketSkin;
}
function initRacketGallery(){
 racketGallery=createRacketGallery(THREE,{getSkin:()=>state.racketSkin,getTitleEvent:playerFirstTitle,
  applySkin:skin=>{if(skin!==state.racketSkin){applyRacketSkin(skin);savePreferences();}},invalidate:()=>renderBudget.invalidate(),
  onOpen:()=>{
   galleryReturnScreen=state.screen;state.screen='racket-inspect';document.exitPointerLock?.();
   racket.visible=false;racket.userData.support.visible=false;shuttle.visible=false;
   for(const id of ['menu','pause-overlay','hud','masthead','test-panel'])$('#'+id)?.classList.add('hidden');
   landingMarker.visible=targetMarker.visible=aimMarker.visible=shuttleShadow.visible=false;
  },onClose:()=>{
   state.screen=galleryReturnScreen;$('#masthead').classList.remove('hidden');
   if(state.screen==='pause'){$('#pause-overlay').classList.remove('hidden');$('#hud').classList.remove('hidden');racket.visible=true;}
   else {state.screen='menu';$('#menu').classList.remove('hidden');}
   if(testing)$('#test-panel').classList.remove('hidden');
   clock.getDelta();renderBudget.invalidate();
  }
 });
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
  return createRacketModel(THREE,{skin:isPlayer?state.racketSkin:'aero-blue',player:isPlayer,titleName:isPlayer?playerFirstTitle()?.name:''});
}

function createPlayerRacket() {
  racket = createViewmodel(THREE,createRacket,{skinMap:surfaceMaps?.athleteSkin,articulated:!safeBoot&&params.get('arm')!=='legacy'});camera.add(racket);scene.add(camera);
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
 if(!canEquipRacket(skin,playerFirstTitle()))skin='astrox100zz';
 state.racketSkin=skin;
 if(racket?.userData?.racketModel&&racket.userData.racketModel.userData.skin!==skin){
  const old=racket.userData.racketModel,next=createRacket(true);next.scale.copy(old.scale);racket.remove(old);racket.add(next);racket.userData.racketModel=next;
  disposeRacketModel(old);
 }
 if(playerAvatar&&playerAvatar.racket.userData.racketModel.userData.skin!==skin){const mount=playerAvatar.racket,old=mount.userData.racketModel;mount.remove(old);disposeRacketModel(old);const next=createRacket(true);mount.add(next);mount.userData.racketModel=next;}
 const select=$('#racket-skin');if(select&&select.value!==skin)select.value=skin;
 const spec=racketSkin(skin);$('#racket-skin-detail').textContent=spec.model+' · '+spec.edition;
 for(const label of document.querySelectorAll('[data-current-racket]'))label.textContent=spec.label+' · '+spec.edition;
 renderBudget.invalidate();
}

function createOpponent() {
  const athlete = createAthlete(THREE, createRacket,{skinMap:surfaceMaps?.athleteSkin,mergeGeometries});
  scene.add(athlete.root);
  const label = textPanel('INTERNATIONAL  /  01', 1.42, .19, { bg: '#173b35', color: '#f0d2a2', size: 72 });
  label.position.set(0, 2.05, 0); athlete.root.add(label);
  const headband=new THREE.Mesh(new THREE.TorusGeometry(.082,.008,5,24),material('#d6c16f',.68));headband.rotation.x=Math.PI/2;headband.position.set(0,.102,.018);headband.visible=false;athlete.bones.head.add(headband);
  return { ...athlete, label, headband };
}

function applyOpponentIdentity(id){
  if(!bot)return;const rival=id?tourStar(id):null;
  if(!rival){bot.setKit(state.opponentStyle);bot.root.scale.set(1,1,1);bot.headband.visible=false;for(const side of [0,1])bot.setWristband(side,false,'#a1c5bd');return;}
  const {accent,build}=matchKit(rival);bot.setKit(rival);
  const width=.94+(rival.seed%7)*.018,height=.955+(rival.seed%8)*.013,depth=.96+((rival.seed*3)%6)*.016;
  if(build.some(n=>n!==1))bot.root.scale.fromArray(build);else bot.root.scale.set(width,height,depth);
  bot.headband.visible=[4,9,13,18,24,27,34,39,43].includes(rival.seed);bot.headband.material.color.set(accent);for(const i of [0,1])bot.setWristband(i,(rival.seed+i)%3!==0,(rival.seed+i)%4===0?accent:'#e7e8de');
  const ctx=bot.label.material.map.image.getContext('2d');ctx.clearRect(0,0,1024,256);ctx.fillStyle='#142c28';ctx.fillRect(0,0,1024,256);ctx.fillStyle=accent;ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='700 94px "Segoe UI","Microsoft YaHei"';ctx.fillText(rival.name,512,106);ctx.font='42px "Segoe UI",sans-serif';ctx.fillText(rival.latin.toUpperCase(),512,193);bot.label.material.map.needsUpdate=true;
}

function resolveTournamentPoint(won){
  if(!state.tournamentId||!tour||tour.eventId!==state.tournamentId||tour.completed||tour.eliminated)return;
  tour=advanceTour(tour,won);
  if(won&&!tour.completed)celebrateVictory(tour.eventId);
  if(tour.completed){
   const previousTitle=playerFirstTitle();
   tourCareer.completed++;tourCareer.active=null;
   if(!tour.titleAwarded){
    tour.titleAwarded=true;tourCareer.titles++;
    tourCareer.firstTitleEvent=previousTitle?.id||tour.eventId;
    tourCareer.trophies[tour.eventId]=(Number(tourCareer.trophies[tour.eventId])||0)+1;
    career.trophies[tour.eventId]=(Number(career.trophies?.[tour.eventId])||0)+1;
    saveTour();
    try{if(!testing)localStorage.setItem(CAREER_KEY,JSON.stringify(career));}catch{}
    refreshRacketOptions();updateCareerUI();celebrateVictory(tour.eventId);
   }
   $('#point-title').textContent='冠军属于你。';
   $('#point-subtitle').textContent=tourEvent(tour.eventId).name+' 冠军 · '+(previousTitle?'奖杯 × '+tourCareer.trophies[tour.eventId]:'首冠纪念拍已解锁');
  }
  else if(tour.eliminated){tourCareer.completed++;tourCareer.active=null;saveTour();$('#point-title').textContent=`止步${tourEvent(tour.eventId).rounds[state.tournamentRound]}`;$('#point-subtitle').textContent=`本届 ${tour.wins} 胜 · 下一站再战`;
  }else{saveTour();$('#point-title').textContent=`赢下${tourEvent(tour.eventId).rounds[state.tournamentRound]}`;$('#point-subtitle').textContent=`晋级${tourEvent(tour.eventId).rounds[tour.roundIndex]} · 下一场对阵${currentTourMatch(tour).opponent.name}`;}
  renderTourHub();updateCareerUI();
}

let celebrationTimer=0;
function celebrateVictory(eventId){
 const layer=$('#celebration-layer');if(!layer)return;layer.replaceChildren();layer.classList.remove('hidden');
 const palette=['#e8cf76','#ffffff','#79c6a5','#e67f6c','#9abde0'];
 for(let i=0;i<54;i++){const piece=document.createElement('i');piece.style.left=`${random()*100}%`;piece.style.setProperty('--fall',`${2.1+random()*2.3}s`);piece.style.setProperty('--delay',`${random()*.9}s`);piece.style.setProperty('--spin',`${180+Math.floor(random()*900)}deg`);piece.style.setProperty('--confetti',palette[i%palette.length]);layer.append(piece);}
 layer.dataset.event=eventId;window.clearTimeout(celebrationTimer);celebrationTimer=window.setTimeout(()=>layer.classList.add('hidden'),4400);
 tone(523,.16,.08);setTimeout(()=>tone(659,.2,.08),120);setTimeout(()=>tone(784,.28,.09),260);
}
function openTrophyGallery(){
 loadTour();const grid=$('#trophy-grid');grid.replaceChildren();let total=0;
 for(const e of TOUR_EVENTS){const count=Number(tourCareer.trophies[e.id])||0;total+=count;const card=document.createElement('article');card.className='trophy-card'+(count?' earned':'');card.innerHTML=`<span>${count?'🏆':'◇'}</span><b>${e.name}</b><small>${e.city} · ${e.venue}</small><strong>${count?`冠军 × ${count}`:'尚未夺冠'}</strong>`;grid.append(card);}
 $('#trophy-total').textContent=`${total} / ${TOUR_EVENTS.length} 项赛事 · ${tourCareer.titles||total} 次冠军`;$('#trophy-gallery').classList.remove('hidden');
}

function createShuttle() {
 const root=createShuttleModel(THREE,mergeGeometries);scene.add(root);return root;
}

function createEffects() {
  shuttle = createShuttle();
  const shadowMap=texture(64,64,ctx=>{
    const falloff=ctx.createRadialGradient(32,32,0,32,32,32);
    falloff.addColorStop(0,'#102c24');
    falloff.addColorStop(.45,'#102c2499');
    falloff.addColorStop(1,'#102c2400');
    ctx.fillStyle=falloff;ctx.fillRect(0,0,64,64);
  });
  shuttleShadow=mesh(new THREE.PlaneGeometry(.26,.26),new THREE.MeshBasicMaterial({map:shadowMap,transparent:true,depthWrite:false}));
  shuttleShadow.rotation.x=-Math.PI/2;
  shuttleFootprint=mesh(new THREE.RingGeometry(.115,.155,24),new THREE.MeshBasicMaterial({color:'#f5e6ab',transparent:true,opacity:.42,depthWrite:false,toneMapped:false}));
  shuttleFootprint.rotation.x=-Math.PI/2;shuttleFootprint.visible=false;
  receiveMarker=mesh(new THREE.RingGeometry(.21,.25,32,1,Math.PI*.16,Math.PI*1.68),new THREE.MeshBasicMaterial({color:'#89ebdf',transparent:true,opacity:.76,depthWrite:false,toneMapped:false}));
  receiveMarker.rotation.x=-Math.PI/2;receiveMarker.visible=false;
  const heightGeometry=new THREE.BufferGeometry().setFromPoints([V(),V(0,1,0)]);
  shuttleHeightLine=new THREE.Line(heightGeometry,new THREE.LineDashedMaterial({color:'#f1ecd1',transparent:true,opacity:.22,depthWrite:false,toneMapped:false,dashSize:.12,gapSize:.18}));
  shuttleHeightLine.computeLineDistances();shuttleHeightLine.visible=false;scene.add(shuttleHeightLine);
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

let standAudio=null;
function stopStandCheer(){standAudio?.stopVoice();}
function playStandCheer(key,volume){
 if(!state.sound||state.screen!=='play')return;
 standAudio?.play(key,volume*.68,Math.max(-.52,Math.min(.52,(ball.pos.x||.7)*.19)));
}
function reactToReturn(fault,type,stretched,pressure,feet){
 if(state.mode!=='match'||!state.sound||fault)return;
 const gain=crowdReaction({height:ball.pos.y,reach:Math.hypot(ball.pos.x-feet.x,ball.pos.z-feet.z),stretched,pressure,stroke:type,rally:state.rally+1,close:Math.abs(state.score[0]-state.score[1])<=1&&Math.max(...state.score)>=state.matchPoints-2});
 if(gain)standAudio?.rallyRise(gain,clamp(ball.pos.x*.2,-.45,.45));
}
function waveAmount(){
  return pointGesture('wave');
}
function pointGesture(kind){
  if(state.phase!=='point'||standReaction?.gesture!==kind)return 0;
  const age=state.timer-standReaction.start;
  if(kind==='fist')return THREE.MathUtils.smoothstep(age,.08,.28)*(1-THREE.MathUtils.smoothstep(age,.44,.82));
  return THREE.MathUtils.smoothstep(age,.08,.46)*(1-THREE.MathUtils.smoothstep(age,1.33,1.93));
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
    standAudio=createStandAudio(audio,master,audio.reverb);standAudio.volume(state.standVolume??.75);
    state.audioInitialized = true;
  } catch { state.sound = false; }
}

function updateShuttleSound(){
  if(!audio||!shuttleGain)return;
  if(audio.currentTime-lastShuttleSoundUpdate<.045)return;
  standAudio?.update({playing:state.screen==='play'&&state.mode==='match'&&state.sound,rally:state.rally,phase:state.phase});
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
function currentMatchIntent(){return matchIntent({opponentId:state.mode==='match'?state.currentOpponentId:'',profile:state.profile,style:state.opponentStyle,score:state.score,points:state.matchPoints,energy:opponent.energy,recent:matchTactics.points});}
function selectedRival(){return TOUR_STARS[$('#opponent-star').value];}
function matchDifficulty(rival,tournament=false){
  const key=$('#difficulty').value;
  return tournament||key==='auto' ? rival?.difficulty||'master' : key;
}
function exhibitionOpponent(){
  const selected=$('#opponent-star').value;
  if(TOUR_STARS[selected])return selected;
  return chooseRandomOpponent(selected==='allRandom'?EXHIBITION_ROSTER:FEATURED_STARS,recentExhibitionOpponents());
}
function updateCharacterPreview(){
  const rival=selectedRival(),all=$('#opponent-star').value==='allRandom';
  $('#character-preview').textContent=rival ? `${rival.name} · ${rival.country} · ${rival.signature}` :
    `${all?'全阵容':'知名球星'}随机 · ${all?EXHIBITION_ROSTER.length:FEATURED_STARS.length} 位轮换，优先避开近期交手的球员`;
}
function renderTourHub(){
  const list=$('#tour-event-list');if(!list)return;const chosen=list.dataset.selected||tour?.eventId||TOUR_EVENTS[0].id;list.replaceChildren();
  for(const item of TOUR_EVENTS){const button=document.createElement('button');button.type='button';button.className='tour-event';button.dataset.event=item.id;button.style.setProperty('--event-accent',item.accent);button.setAttribute('aria-selected',String(item.id===chosen));button.innerHTML=`<i></i><span><strong>${item.name}</strong><small>${item.city} · ${item.venue}</small></span><em>${item.rounds.length} 轮</em>`;button.addEventListener('click',()=>{list.dataset.selected=item.id;renderTourHub();});list.append(button);}
  $('#tour-enter').textContent=tour?.eventId===chosen&&!tour.completed&&!tour.eliminated?'继续本届赛事 →':'报名参赛 →';
  list.dataset.selected=chosen;const selected=tourEvent(chosen),current=tour&&tour.eventId===chosen?currentTourMatch(tour):null;const info=$('#tour-selected-info');info.style.setProperty('--event-accent',selected.accent);info.innerHTML=`<b>${selected.name} · ${selected.english}</b><span>${selected.city} · ${selected.venue} · ${selected.surface} · ${selected.crowd}</span><span>${current?`当前：${tourStatus(tour)}`:'报名后从 32 强开打，五场胜利夺冠。'}</span>`;$('#tour-career-record').textContent=tour?`${selected.name}：${tour.wins||0} 胜 · ${tour.completed?'已夺冠':tour.eliminated?'本届已出局':'正在征战 '+(current?.round||'')}`:'选择赛事后报名，赛事进度会保存在本机。';
  const bracket=$('#tour-bracket');if(bracket){bracket.replaceChildren();const draw=tour&&tour.eventId===chosen&&tour.bracket?tour.bracket:buildBracket(selected,TOUR_EVENTS.indexOf(selected)+2026);const title=document.createElement('b');title.textContent=tour&&tour.eventId===chosen?'完整淘汰签表 · 其余比赛已按种子模拟':'32 强签表预览 · 玩家占 1 号种子';bracket.append(title);const grid=document.createElement('div');grid.className='tour-bracket-grid';draw.forEach((round,index)=>{const col=document.createElement('div');col.className='tour-round';const heading=document.createElement('strong');heading.textContent=selected.rounds[index];col.append(heading);round.forEach(match=>{const card=document.createElement('div');card.className='tour-bracket-match'+(match.player?' is-player':'');const pending=match.player&&index>(tour?.eventId===chosen?tour.roundIndex:0);const a=document.createElement('span');a.textContent=pending?'待晋级':(match.winner===match.a?'✓ ':'')+(match.a==='player'?PLAYER_NAME:tourStar(match.a)?.name||'待定');const b=document.createElement('span');b.textContent=pending?'待定':(match.winner===match.b?'✓ ':'')+(match.b==='player'?PLAYER_NAME:tourStar(match.b)?.name||'待定');card.append(a,b);col.append(card);});grid.append(col);});bracket.append(grid);}
}
function openTourHub(){loadTour();const list=$('#tour-event-list');if(!list.dataset.selected)list.dataset.selected=tour?.eventId||TOUR_EVENTS[0].id;$('#tournament-hub').classList.remove('hidden');renderTourHub();}
function closeTourHub(){$('#tournament-hub').classList.add('hidden');}
function enterTournament(){
  const id=$('#tour-event-list').dataset.selected||TOUR_EVENTS[0].id;
  if(!tour||tour.eventId!==id||tour.completed||tour.eliminated){tour=freshTour(id,{recentOpponents:tourCareer.recentOpponents});tourCareer.active=id;saveTour();}
  closeTourHub();launchMatch('tournament');
}
function configureTournamentMatch(){
  const current=currentTourMatch(tour);if(!current)return false;const rival=current.opponent;state.tournamentId=tour.eventId;state.tournamentRound=tour.roundIndex;state.tournamentOpponent=rival.id;state.currentOpponentId=rival.id;state.tournamentVenue=current.event.venue;state.tournamentAccent=current.event.accent;applyTournamentVenue(current.event);return true;
}
function populateOpponentStars(){
  const select=$('#opponent-star');
  select.add(new Option('全阵容随机 · '+EXHIBITION_ROSTER.length+' 位','allRandom'));
  for(const [label,ids] of [['知名球星',FEATURED_STARS],['其他选手',EXHIBITION_ROSTER.filter(id=>!FEATURED_STARS.includes(id))]]){
    const group=document.createElement('optgroup');group.label=label;
    for(const id of ids){const rival=tourStar(id);group.append(new Option(rival.name+' · '+rival.country,id));}
    select.append(group);
  }
  select.addEventListener('change',()=>{updateCharacterPreview();updateDifficultyUI();});
}
function showMatchIntro(mode='match'){
  const current=mode==='tournament'?currentTourMatch(tour):null,rival=current?.opponent||tourStar(state.currentOpponentId||'peterGade'),e=current?.event||tourEvent('olympics');
  const playerName=PLAYER_NAME;
  $('#intro-rival-portrait').src=new URL('./assets/lineup/'+rival.id+'.webp',import.meta.url).href;
  $('#intro-rival-portrait').alt=rival.name+'的游戏形象';
  $('#first-controls').hidden=state.controlsChosen===true;
  $('#intro-kicker').textContent=current?`WORLD TOUR · ${current.round}`:'OLYMPIC CENTER COURT · EXHIBITION';$('#intro-event-name').textContent=current?e.name:'巴黎奥运会羽毛球赛';$('#intro-venue').textContent=`${e.city} · ${e.venue}`;$('#intro-player-name').textContent=playerName;$('#intro-player-style').textContent='单打选手';$('#intro-rival-name').textContent=rival.name;$('#intro-rival-rank').textContent=`SEED ${String(rival.seed).padStart(2,'0')}`;$('#intro-rival-meta').textContent=`${rival.country} · ${opponentLevel(matchDifficulty(rival,!!current)).tier} 级 · ${rival.signature}`;$('#intro-rival-signature').textContent=`${rival.latin} · ${rival.era}`;$('#intro-round').textContent=current?.round||'单场挑战';$('#intro-surface').textContent=e.surface;$('#intro-crowd').textContent=e.crowd;$('#intro-story').textContent=current?'巨幅赛场屏亮起，满场观众迎来登场。签表对手已经就位，把这一轮打下来。':'巴黎奥运主赛场灯光全开，满场观众正在等你登场。';$('#match-intro-overlay').classList.remove('hidden');pendingMatchMode=mode;}
let pendingMatchMode='match',introPreviousMatch=null;
function launchMatch(mode='match',rivalId=null){
  stopStandCheer();standAudio?.quiet();
  introPreviousMatch={currentOpponentId:state.currentOpponentId,tournamentId:state.tournamentId,tournamentRound:state.tournamentRound,tournamentOpponent:state.tournamentOpponent,tournamentVenue:state.tournamentVenue,tournamentAccent:state.tournamentAccent};
  if(mode==='tournament'&&!configureTournamentMatch())return;
  if(mode==='match'){
    state.tournamentId='';state.tournamentRound=0;state.tournamentOpponent='';
    applyTournamentVenue(tourEvent('olympics'));
    state.currentOpponentId=TOUR_STARS[rivalId]?rivalId:exhibitionOpponent();
  }
  showMatchIntro(mode);
}
function hitSound(type, isOpponent = false) {
  if(!audio||!state.sound)return;
  const sound=strokeSoundProfile(type),strength=sound.volume,dist=isOpponent?.38:1;
  const pan=isOpponent?clamp((opponent.pos.x-player.pos.x)/7,-.8,.8):.2;
  // A string-bed snap and rapidly damped frame modes, with no pitch sweep.
  noise(.018,3300,.58*strength*dist,'highpass',pan);
  noise(.045*sound.tail,1250*sound.brightness,.20*strength*dist,'bandpass',pan);
  for(const [frequency,volume,decay] of [[950,.12,.037],[1870,.055,.018],[420,.035,.05]]){
    const source=audio.createOscillator(),gain=audio.createGain(),stereo=audio.createStereoPanner();
    source.frequency.value=frequency*sound.brightness;source.type='sine';
    gain.gain.setValueAtTime(volume*strength*dist,audio.currentTime);gain.gain.exponentialRampToValueAtTime(.0001,audio.currentTime+decay*sound.tail);
    stereo.pan.value=pan;source.connect(gain);gain.connect(stereo);stereo.connect(master);gain.connect(audio.reverb);source.start();source.stop(audio.currentTime+decay*sound.tail);
  }
}

function updateCourtScore() {
  const tex = courtScore.material.map, c = tex.image.getContext('2d');
  c.fillStyle = '#102823'; c.fillRect(0, 0, 1024, 256);
  c.fillStyle = '#def6a3'; c.font = '500 72px "Segoe UI"'; c.textAlign = 'center'; c.textBaseline = 'middle';
  const drill = training || state.mode === 'targets';
  const left = training ? training.completed.filter(rep => rep.success).length : drill ? state.targetHits : state.score[0];
  const right = training ? training.completed.length : drill ? state.targetShots : state.score[1];
  c.fillText(`${drill ? 'HIT' : PLAYER_NAME}   ${String(left).padStart(2, '0')}  :  ${String(right).padStart(2, '0')}   ${drill ? 'TRY' : (tourStar(state.currentOpponentId)?.latin?.split(' ').filter(Boolean).pop()?.toUpperCase()||'RIVAL')}`, 512, 128); tex.needsUpdate = true;
}
const SHOT_NAMES={auto:'智能回球',clear:'高远球',drop:'吊球',smash:'杀球',drive:'平抽球',lift:'挑球',net:'网前搓球',push:'推后场',netcross:'勾对角',netkill:'扑球',slicesmash:'劈杀斜线',slicedrop:'劈吊对角'};
function showShotCue(type){
  const input=({auto:'左键 / 1',clear:'2',drop:'3 / E',smash:'右键 / 4 / L',net:'5',push:'6',netcross:'7',slicesmash:'8',slicedrop:'9'})[type]||'左键';
  const direction=usesManualLanding(type)?'手动落点':state.directionMode==='natural'&&type==='auto'?'寻找空当':({natural:'球路默认',straight:'直线',cross:'斜线'})[state.directionMode];
  $('#shot-cue').textContent=`${SHOT_NAMES[type]||SHOT_NAMES.auto} · ${direction} · ${landingName(selectedLanding(type))} · ${input}`;
  state.shotCueUntil=state.timer+1.65;$('#shot-cue').classList.add('visible');
}
function setShot(type) {
  const previousShot=state.shot;
  state.shot = type;
  if(!state.manualLanding)state.depth=SHOT_DEPTHS[type]??SHOT_DEPTHS.auto;
  document.querySelectorAll('[data-shot]').forEach(el => el.classList.toggle('active', el.dataset.shot === type));
  const preset=$('#shot-select');if(preset&&preset.value!==type)preset.value=type;
  if(state.screen==='play'&&type!=='auto'){showShotCue(type);feedback(`准备击球 · ${SHOT_NAMES[type]}`,`落点 · ${landingName(selectedLanding(type))}`);}
  if(previousShot!==type&&state.prediction&&state.lastHitter==='opponent')refreshPrediction();
}
function usesManualLanding(kind){
  if(!state.manualLanding)return false;
  const attack=kind==='smash'||kind==='slicesmash';
  return !attack||state.depth<=-2.6||!state.landingKind||['auto','smash','slicesmash'].includes(state.landingKind);
}
function selectedLanding(kind=state.shot,position=ball.pos){
  const manual=usesManualLanding(kind);
  const natural=techniqueTarget({position,aim:manual||!state.manualLanding?state.aim:0,kind,manual:manual?shotTarget({aim:state.aim,depth:state.depth,kind}):null});
  const mode=state.shot==='auto'&&state.directionMode==='natural'?'open':state.directionMode;
  return manual?natural:directionalTarget({position,kind,mode,natural,opponent:opponent.pos});
}
function cycleShotDirection(){
  const modes=['natural','straight','cross'];state.directionMode=modes[(modes.indexOf(state.directionMode)+1)%modes.length];
  state.manualLanding=false;state.aim=0;state.depth=SHOT_DEPTHS[state.shot]??SHOT_DEPTHS.auto;
  showShotCue(state.shot);updateTactics();
}
function currentOpponentLevel(){return effectiveOpponentLevel(opponentLevel(state.difficulty),state.opponentStyle,state.opponentStats);}
function refreshPlayerStats(){state.playerStats=playerStatsFromInputs();}
function chooseLanding(target){
  const p=normalizeLanding(target);state.aim=p.x/2.45;state.depth=p.z;state.manualLanding=true;state.landingKind=state.shot;
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
  if(state.cameraMode==='third'){
    const view=orbitLook(freeLook({yaw:state.orbitYaw,pitch:state.orbitPitch},dx,dy,state.sensitivity,innerHeight,camera?.fov||73,innerWidth));
    state.orbitYaw=view.yaw;state.orbitPitch=view.pitch;state.manualLookUntil=state.timer+1.1;state.lastLook=state.timer;return;
  }
  // Take over from the currently displayed angle; the lift must not fight a
  // player's downward mouse movement or reapply an invisible old offset.
  Object.assign(state,manualLookTakeover(state,dy,state.timer));
  const view=freeLook({...state,pitch:state.manualPitch},dx,dy,state.sensitivity,innerHeight,camera?.fov||69,innerWidth);state.yaw=view.yaw;state.manualPitch=view.pitch;state.pitch=clamp(view.pitch+state.autoPitchOffset,-1.42,1.545);state.lastLook=state.timer;
}
function previewOpponentLevel(){
  if(state.screen==='play'||state.screen==='pause')return currentOpponentLevel();
  const rival=selectedRival();
  const style=rival?.style;
  return effectiveOpponentLevel(opponentLevel(matchDifficulty(rival)),style||'allround',state.opponentStats);
}
function updateTechniqueSummary(){
  if(!techniquePanel)return;
  const level=previewOpponentLevel();
  const randomPeak=state.screen==='menu'&&$('#difficulty').value==='auto'&&!selectedRival();
  $('#opponent-skill-preset').textContent=randomPeak?'100% 为抽中球员的基础实力':`基础等级 · ${level.tier} 级`;

}
function initTechniquePanel(){
  techniquePanel=createTechniquePanel({
    onPlayerChange:stats=>{state.playerStats=stats;savePreferences();},
    onOpponentChange:stats=>{state.opponentStats=stats;updateDifficultyUI();savePreferences();},
    onResetPlayer:()=>{techniquePanel.write('player',{});refreshPlayerStats();savePreferences();},
    onResetOpponent:()=>{state.opponentStats=normalizeSkills();updateDifficultyUI();savePreferences();},
    onOpen:updateTechniqueSummary,
  });
}
function updateDifficultyUI(){
  if(state.screen==='menu')bot?.setKit?.(selectedRival()||'allround');renderBudget.invalidate();
  const level=previewOpponentLevel();
  updateTechniqueSummary();

  if($('#difficulty').value==='auto'&&!selectedRival()&&state.screen==='menu'){$('#difficulty-detail').textContent='单场挑战按抽到的球星取巅峰等级，开场显示实际级别。自由对打默认 5 级。';return;}
  $('#difficulty-detail').textContent=`参考：${LEVEL_REFERENCES[level.tier]}。${LEVEL_DESCRIPTIONS[level.tier]}。移动 ${level.speed.toFixed(1)} m/s · 反应 ${(level.reaction*1000).toFixed(0)} ms · 覆盖 ${level.reach.toFixed(2)} m · 稳定 ${Math.round(level.accuracy*100)}%。`;
}
function rankTarget({player,next,rows}) {
  if(next)return `距${next.name}还差 ${next.points-player.points} 分`;
  return rows[1].rank===1?'并列榜首':`领先第 2 名 ${player.points-rows[1].points} 分`;
}
function openWorldBoard() {
  const standings=worldStandings(career,PLAYER_NAME);
  $('#world-place').textContent='第 '+standings.player.rank+' 名';
  $('#world-points').textContent=standings.player.points+' 分';
  $('#world-target').textContent=rankTarget(standings);
  const table=$('#world-rows');
  table.replaceChildren(...standings.rows.map(row=>{
    const tr=document.createElement('tr');
    if(row.id==='player')tr.className='world-player';
    for(const value of [row.rank,row.name,row.points])tr.insertCell().textContent=value;
    return tr;
  }));
  $('#world-board').showModal();
  $('#world-board .world-scroll').scrollTop=0;
}
function updateCareerUI(){
  const current=tour&&!tour.completed&&!tour.eliminated?currentTourMatch(tour):null;
  $('#tour-home-title').textContent=current?current.event.name:'赛事生涯';
  $('#tour-home-detail').textContent=current?'继续'+current.round+' · 对阵'+current.opponent.name:'从 32 强打到决赛';
  const recentLoss=career.history.find(h=>TOUR_STARS[h.opponentId]&&career.rivals?.[h.opponentId]?.lastWon===false);
  const rematch=$('#career-rematch');rematch.hidden=!recentLoss;rematch.dataset.rival=recentLoss?.opponentId||'';
  if(recentLoss)rematch.textContent='再战'+TOUR_STARS[recentLoss.opponentId].name+' ↗';
  const milestone=$('#career-milestone');
  const wins=Object.entries(career.rivals||{}).filter(([id,r])=>TOUR_STARS[id]&&r.wins>0).sort((a,b)=>(b[1].firstWin?.match||0)-(a[1].firstWin?.match||0));
  const earned=Object.entries(career.bestRounds||{}).filter(([id,r])=>r>=2&&TOUR_EVENTS.some(e=>e.id===id)).sort((a,b)=>b[1]-a[1])[0];
  const latest=wins[0];
  const first=latest?.[1].firstWin?'首次战胜'+TOUR_STARS[latest[0]].name+' · '+latest[1].firstWin.score.join(' 比 '):'';
  milestone.textContent=[first,earned?tourEvent(earned[0]).name+' · '+(['32强','16强','8强','半决赛','决赛','冠军'][earned[1]]):''].filter(Boolean).join('　');
  milestone.hidden=!milestone.textContent;
  $('#tour-browse').hidden=!current;
  $('#career-head-to-head').hidden=!wins.length;
  $('#career-opponents').replaceChildren(...wins.map(([id,r])=>{const li=document.createElement('li');li.textContent=TOUR_STARS[id].name+' · '+r.wins+' 胜 '+r.losses+' 负'+(r.firstWin?'　首胜 '+r.firstWin.score.join('∶'):'');return li;}));
  $('#career-rank').textContent=rankName(career.rating);$('#career-rating').textContent=career.rating;
  const trophyCount=Object.values(tourCareer.trophies||{}).reduce((sum,n)=>sum+(Number(n)||0),0);
  $('#career-record').textContent=`${career.wins} 胜 / ${career.played-career.wins} 负 · 连胜 ${career.streak} · 冠军 ${trophyCount}`;
  const trophyLabel=$('#career-trophies');if(trophyLabel)trophyLabel.textContent=`🏆 ${trophyCount} 座赛事冠军`;
  $('#career-progress').style.width=`${Math.min(100,Math.max(0,(career.rating-700)%200)/2)}%`;
  const history=$('#career-history');history.replaceChildren();
  for(const h of career.history.slice(0,4)){
    const row=document.createElement('li');row.textContent=`${h.score[0]>h.score[1]?'胜':'负'} · ${TOUR_STARS[h.opponentId]?.name||opponentLevel(h.level).name} ${h.score.join(':')}   ${h.delta>=0?'+':''}${h.delta}`;history.append(row);
  }
  if(!career.history.length){const row=document.createElement('li');row.textContent='完成正式比赛，记录首场战绩';history.append(row);}
}
function commitMatch(){
  if(state.ratingDelta!==null)return;
  const result=settleMatch(career,{id:state.matchId,level:state.difficulty,score:state.score,points:state.matchPoints,mode:state.mode,date:new Date().toISOString(),opponentId:state.currentOpponentId,eventId:state.tournamentId,round:state.tournamentRound,highlight:matchHighlight(matchTactics.points)});
  if(!result.applied)return;
  state.worldRankBefore=worldStandings(career,PLAYER_NAME).player.rank;
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
function syncControlScheme(){const select=$('#control-scheme');if(select)select.value=state.comfortable?'tracking':state.assists?'assisted':'manual';}
function setAssist(value) {
  state.assists = value;movementOwner.reset();state.manualOverride=false; $('#assist-toggle').checked = value; $('#assist-label').textContent = value ? '辅助跑位' : '自由跑位';syncControlScheme();
  if (state.screen === 'play') feedback(value ? '辅助跑位已开启' : '自由跑位', value ? '鼠标可完成整局 · 空格 / WASD 可选' : 'WASD 移动 · 鼠标左键智能回球');
}
function feedback(title, subtitle) {
  $('#hit-feedback strong').textContent = title; $('#hit-feedback span').textContent = subtitle || '';
  $('#hit-feedback').style.opacity = 1; state.feedback = 1.5;
}
function opponentWeaknessForShot(type,target){
  const key=opponentWeaknessKey({position:{x:target?.x||0,y:2.1,z:target?.z||-3},shot:type});
  opponent.lastWeakness=key;opponent.exposure[key]=(opponent.exposure[key]||0)+1;
  for(const lane of Object.keys(opponent.adaptation))if(lane!==key)opponent.adaptation[lane]*=.72;
  opponent.adaptation[key]=clamp((opponent.adaptation[key]||0)+(opponent.exposure[key]>2?.14:0),0,.78);
  return key;
}
function startGame(mode = 'match', preserveSettings = false) {
  groundMotion = null; lastLineReview = null; reviewPending = -1; flightRecorder.reset();
  $('#eagle-point-review').classList.add('hidden'); $('#last-line-review').disabled = true;
  initAudio(); state.mode = mode;
  training = mode === 'training' ? { mode: trainingMode, completed: [], best: trainingBest(trainingMode), newBest: false } : null;
  standReaction=null;stopStandCheer();
  if(mode==='match'&&state.sound)standAudio?.warm();
  state.receiveStarted = -10;
  state.receiveRally = null;
  document.body.classList.toggle('training-mode', Boolean(training));
  if(mode==='match'&&!state.currentOpponentId)state.currentOpponentId=exhibitionOpponent();
  const tournament=mode==='match'&&Boolean(state.tournamentId);
  const rival=mode==='match'?tourStar(state.currentOpponentId):selectedRival();
  state.difficulty=matchDifficulty(rival,tournament);
  state.opponentStyle=rival?.style||'allround';
  state.profile=rival?.profile||'balanced';
  if(mode==='match')rememberOpponent(state.currentOpponentId);
  state.playerStats=playerStatsFromInputs();state.highBallAssist=$('#high-ball-toggle').checked;
  applyOpponentIdentity(mode==='match'?state.currentOpponentId:'');
  document.body.classList.remove('match-finished','match-victory','match-champion','tournament-finished');
  Object.assign(state, { screen: 'play', phase: 'serve', score: [0, 0], rally: 0, maxRally: 0, hits: 0, maxSpeed: 0, finished: false, stamina: 100, swing: 0, swingContact: false, swingMissed: false, jump: 0, jumpV: 0, timer: 0, serveCount: 0, returnDelay: 0, receiveStarted: -10, receiveRally: null, yaw: 0, pitch: -.03,manualPitch:-.03,autoPitchOffset:0, aim: 0, countdown: 0, pointDelay: 0, charge: 0, hitstop: 0, lastMove: -10, lastLook: -10, targetIndex: -1, target: null, targetArmed: false, targetHits: 0, targetShots: 0, targetStreak: 0, directionMode:'natural',tacticMessage:'' });
  updateCourtScore();
  opponentMemory.reset();matchTactics.reset();
  try { state.targetBest = testing ? 0 : Number(localStorage.getItem('feather-court-2-target-best')) || 0; } catch { state.targetBest = 0; }
  state.depth = -4.7;state.manualLanding=false;state.landingKind=null;state.shotCueUntil=0;state.aiming=false;state.aimAlt=false;state.swingTarget=null;state.serveTarget=null;state.lastLanding=null;document.body.classList.remove('choosing-landing');state.contactFlash=0;dash.reset();setControlsVisible(false);
  jumping.reset();movementOwner.reset();state.manualOverride=false;state.tutorial=false;state.jumpPeak=0;state.cameraPeak=1.69;state.handsOn=false;state.inputTrace=[];$('#lesson-card').classList.add('hidden');
  state.matchPoints=Number($('#match-points').value)||11;state.server='player';state.matchId=crypto.randomUUID?.()||`${Date.now()}-${random()}`;state.ratingDelta=null;state.worldRankBefore=null;
  state.smashes=0;state.winners=0;state.errors=0;state.lastShot=null;setShot('auto');
  if (!preserveSettings) {
    state.assists = $('#assist-toggle').checked; state.comfortable = $('#comfortable-toggle').checked;
  }
  $('#comfortable-toggle').checked = state.comfortable;
  hitIntent.clear(); pointerDown = false; state.manualLookUntil=0; accumulator = 0; setAssist(state.assists);
  opponent.returns = 0; opponent.energy = 100; opponent.pos.set(-.4, 0, -4.5); opponent.vel.set(0, 0, 0);
  opponent.history=[];opponent.readRally=-1;opponent.readTarget=null;opponent.netLunge=0;opponent.netHold=0;opponent.lastContact=null;opponent.lastTarget=null;opponent.action='';opponent.actionAt=-10;opponent.movementMode='ready';opponent.actionCounts={};opponent.movementCounts={};opponent.weaknesses=opponentWeaknessProfile({level:currentOpponentLevel(),style:state.opponentStyle,profile:state.profile});opponent.exposure={};opponent.adaptation={};opponent.lastWeakness='';ball.spin=0;state.lastPlacement=null;
  player.pos.set(.45, 0, 4.45); player.vel.set(0, 0, 0);player.renderPos.copy(player.pos);player.previous.copy(player.pos);playerAvatar?.resetFeet();state.firstView=null;state.thirdLift=0;state.avatarFade=0; keys.clear();
  $('#menu').classList.add('hidden'); $('#pause-overlay').classList.add('hidden'); $('#help-overlay').classList.add('hidden'); $('#hud').classList.remove('hidden'); document.body.classList.add('playing');
  const modeNames = { match: '单打比赛', practice: '自由对打', targets: '打点挑战', training: '专项训练' };
  $('#game-mode').textContent = modeNames[mode] || modeNames.match;
  $('#player-score-name').textContent = training ? '达标' : mode === 'targets' ? '命中' : PLAYER_NAME;
  $('#opponent-score-name').textContent = training ? '已练' : mode === 'targets' ? '出手' : (mode==='match'?tourStar(state.currentOpponentId).name:OPPONENT_STYLES[state.opponentStyle].name);
  $('#score-status').textContent = training ? '达标 / 已练' : mode === 'practice' ? '保持节奏' : mode === 'targets' ? '瞄准场地区域' : `${state.matchPoints} 分制`;
  $('#point-toast').classList.add('hidden'); $('#resume-btn').innerHTML = '继续比赛 <span>→</span>';
  $('#speed-label').textContent='等待发球';
  updateCourtScore(); prepareServe();camera.fov=69;camera.rotation.set(state.pitch,state.yaw,0,'YXZ');canvas.focus({preventScroll:true});requestLock();updateCamera(0);syncPlayerVisibility();
  if (mode === 'targets') feedback('六区打点挑战', '选择高远 / 轻吊，再瞄准发光区域');
  else if (training) feedback(TRAINING_NAMES[training.mode], training.rep.hint);
  else if (mode === 'practice') feedback('鼠标自由看 · Alt + 鼠标调落点', '左键智能回球 · 右键杀球 · WASD / 空格可选');
  else feedback('鼠标看球，左键就能开打', '左键智能发球与回球 · 右键杀球 · 自动辅助在暂停设置管理');
  updateHud();
}
function prepareServe() {
  standReaction=null;stopStandCheer();
  opponent.splitTarget=null;opponent.readTarget=null;opponent.readRally=-1;
  state.overheadReady=0;state.overheadTurn=0;
  matchTactics.newRally();state.tacticMessage='';opponent.pressure=null;
  state.impactFrame=null;groundMotion = null; reviewPending = -1; flightRecorder.reset();
  $('#eagle-point-review').classList.add('hidden');
  state.phase = 'serve'; state.rally = 0; ball.active = false; ball.trail.length = 0; state.prediction = null; state.lastHitter = 'player'; state.swing = 0;
  if (training) {
    prepareTrainingRep();
    return;
  }
  // Rally is a per-point hit count and returns to 1 on every serve.
  opponent.defenseRally = -1;opponent.strikePlan=null;opponent.jumpPeakAt=-10;opponent.jumpUntil=0;opponent.jumpAmplitude=0;opponent.startFoot=null;
  // A short-serve receiver starts near the front service line, not at the
  // rear-court rally base. Otherwise every beginner loses before moving.
  if(state.mode==='match'&&!state.tutorial){
    const side=singlesServiceSide(state.server,state.score);
    const nearServes=state.server==='player';
    player.pos.set(nearServes?side*.7:-side*.7,0,nearServes?4.1:4.15);
    player.vel.set(0,0,0);player.speed=0;playerAvatar?.resetFeet();
    const far=nearServes?opponentReceiveBase({serverX:player.pos.x,high:state.serveStyle==='high'}):{x:side*.7,z:-3.65};
    opponent.pos.set(far.x,0,far.z);opponent.vel.set(0,0,0);
  }else if(state.mode!=='targets'&&(state.server==='player'||state.mode==='practice')){
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

function trainingBest(mode, score) {
  if (testing) return 0;
  try {
    const saved = JSON.parse(localStorage.getItem(trainingBestKey) || '{}') || {};
    const best = clamp(Math.floor(Number(saved[mode])) || 0, 0, TRAINING_REPS);
    if (score > best) localStorage.setItem(trainingBestKey, JSON.stringify({ ...saved, [mode]: score }));
    return best;
  } catch { return 0; }
}

function prepareTrainingRep() {
  const rep = trainingRep(training.mode, training.completed.length);
  training.rep = rep;
  training.shot = null;
  state.phase = 'feed';
  state.countdown = 1.15;
  state.stamina = 100;
  state.lastShot = state.lastFault = state.contactPoint = null;
  state.swingMissed = state.swingContact = false;
  hitIntent.consume();
  movementOwner.reset();
  jumping.reset();
  dash.reset();
  state.jump = state.jumpV = 0;
  state.lastMove = -10;
  player.pos.set(0, 0, rep.startZ);
  player.vel.set(0, 0, 0);
  player.dashVX = player.dashVZ = 0;
  player.speed = 0;
  playerAvatar?.resetFeet();
  opponent.pos.set(rep.origin.x, 0, rep.origin.z - .60);
  opponent.vel.set(0, 0, 0);
  opponent.swing = 0;
  opponent.contactPoint = null;
  ball.pos.set(rep.origin.x, rep.origin.y, rep.origin.z);
  ball.vel.set(0, 0, 0);
  for (const entity of [player, opponent, ball]) {
    entity.previous.copy(entity.pos);
    entity.renderPos.copy(entity.pos);
  }
  $('#serve-hint').classList.add('hidden');
  $('#point-toast').classList.add('hidden');
}

function releaseTrainingRep() {
  const { velocity, feedType, target } = training.rep;
  state.phase = 'rally';
  state.lastHitter = 'opponent';
  state.rally = 1;
  state.serveCount++;
  state.lastShot = { type: feedType, intended: target };
  ball.active = true;
  ball.spin = 0;
  ball.vel.set(velocity.x, velocity.y, velocity.z);
  opponent.swing = .135;
  opponent.shot = feedType;
  opponent.contactPoint = ball.pos.clone();
  refreshPrediction();
  hitSound(feedType, true);
}

function completeTrainingRep(landing, outcome) {
  const result = gradeTrainingRep(training.rep.kind, { shot: training.shot, landing, outcome, missed: state.swingMissed });
  training.completed.push({ ...result, name: training.rep.name, kmh: training.shot?.kmh || 0 });
  if (result.success) tone(630 + training.completed.filter(rep => rep.success).length*35, .11, .08);
  if (training.completed.length === TRAINING_REPS) {
    const score = training.completed.filter(rep => rep.success).length;
    training.newBest = score > training.best;
    trainingBest(training.mode, score);
    training.best = Math.max(score, training.best);
  }
  state.phase = 'point';
  state.pointDelay = 1;
  state.prediction = null;
  state.swing = 0;
  ball.active = false;
  hitIntent.consume();
  updateCourtScore();
  updateHud();
}

function updateTrainingResult() {
  const result = $('#training-result');
  const complete = training?.completed.length === TRAINING_REPS;
  result.classList.toggle('hidden', !complete);
  if (!complete) return false;
  const passed = training.completed.filter(rep => rep.success).length;
  $('#training-result-score').textContent = `${passed} / ${TRAINING_REPS}`;
  $('#training-result-best').textContent = `${training.newBest ? '刷新纪录 · ' : ''}最佳 ${training.best} / ${TRAINING_REPS}`;
  $('#training-result-list').replaceChildren(...training.completed.map(rep => {
    const row = document.createElement('li');
    const label = document.createElement('b');
    label.textContent = rep.name;
    const detail = document.createElement('span');
    detail.textContent = rep.reason;
    row.dataset.success = String(rep.success);
    row.append(label, detail);
    return row;
  }));
  return true;
}

function lunge() {
  if (state.screen !== 'play') return;
  const move=movementVector({
    left:keys.has('KeyA')||keys.has('ArrowLeft'),right:keys.has('KeyD')||keys.has('ArrowRight'),
    forward:keys.has('KeyW')||keys.has('ArrowUp'),back:keys.has('KeyS')||keys.has('ArrowDown'),
    axisX:touchMove.x,axisY:-touchMove.y
  });
  let x=move.x,z=-move.z,maxDistance=Infinity;
  if(!move.active&&state.lastHitter==='opponent'&&ball.active&&state.prediction?.intercept){
    const stance=receivingTarget(state.prediction,player.pos);
    x=stance.x-player.pos.x;z=stance.z-player.pos.z;maxDistance=Math.hypot(x,z);
    if(maxDistance<.24)return;
  }else if(!move.active&&player.speed>.5){x=player.vel.x;z=player.vel.z;}
  if (!dash.start(x, z, state.stamina,maxDistance)) return;
  state.stamina = Math.max(0, state.stamina - 14); state.lastMove = state.timer + .7;
  haptic(.62,.3,48);
  noise(.1, 380, .08, 'highpass');
}
function toggleServeStyle() {
  if (state.screen !== 'play' || state.phase !== 'serve' || training || state.tutorial || state.mode === 'targets') return;
  state.serveStyle = state.serveStyle === 'high' ? 'low' : 'high';
  updateHud();
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
  ball.vel.copy(solveShot(ball.pos, target, 'serve',{up:state.serveStyle==='high'?10:3.6,step:state.pace/120})); ball.active = true; state.phase = 'rally'; state.lastHitter = 'player'; state.rally = 1;
  state.lastPlacement={intended:{...target},landing:null,status:'flying'};
  state.serveCount++;state.contactPoint=ball.pos.clone();state.contactElapsed=state.swing;
  $('#serve-hint').classList.add('hidden');opponent.returns = 0; state.returnDelay = state.timer + currentOpponentLevel().reaction; refreshPrediction(); hitSound('serve'); recordSpeed();
}
function refreshPrediction() {
  const level=currentOpponentLevel(),opponentHeight=level.rating>=1350?2.8:2.3;
  state.prediction = predict(ball.pos, ball.vel, state.lastHitter === 'player' ? -1 : 1, state.lastHitter === 'player' ? opponentHeight : 2.85,ballTimeScale());
  if(state.lastHitter==='player'&&state.lastPlacement?.status==='flying'){
    state.lastPlacement.landing=state.prediction.landing;state.lastLanding=state.prediction.landing;
  }
  if(state.lastHitter==='opponent'){
    state.prediction.overhead=state.prediction.intercept;
    const attackNet=state.rally>1&&['auto','smash'].includes(state.shot);
    const overhead=['smash','slicesmash','drop','slicedrop'].includes(state.shot)||(state.shot==='auto'&&state.rally>1);
    const height=overhead?2.78:1.78;
    const spot=receiveIntercept(ball.pos,ball.vel,player.pos,ballTimeScale(),7*state.playerStats.speed,height,attackNet);
    if(spot)state.prediction.intercept=spot;
  }
  if(state.lastHitter==='player'&&!training&&state.mode!=='targets'){
    const lane=defensiveIntercept(ball.pos,ball.vel,opponent.pos,level,ballTimeScale());
    if(lane){
      state.prediction.intercept=lane;
      // Time a small scissor jump only for an overhead the feet can reach.
      const stance=opponentStance(lane);
      const gap=Math.hypot(stance.x-opponent.pos.x,stance.z-opponent.pos.z);
      if(lane.y>2.38&&lane.time>.31&&gap<level.speed*(lane.time-.15)&&state.timer>=(opponent.jumpUntil||0)){
        opponent.jumpPeakAt=state.timer+lane.time;
        opponent.jumpAmplitude=clamp((lane.y-2.28)*.82,0,.34);
        opponent.jumpUntil=opponent.jumpPeakAt+.23;
      }
    }
  }

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
  return smartStroke({position:ball.pos,player:player.pos,assisted:state.assists,speed:player.speed,jump:state.jump,stamina:state.stamina,aimShort:Boolean(target&&target.z>-2.8)});
}
function beginSwing(override,source=null) {
  if (state.screen !== 'play') return;
  initAudio();
  if (!['rally','opponentServe','point','serve','feed'].includes(state.phase)) return;
  hitIntent.press(state.timer, override || null,source);
  if((override==='smash'||override==='slicesmash')&&state.swing>0&&!state.swingContact&&!state.swingMissed&&
     state.swingRequestedKind!==override&&state.swingKind!==override)state.swing=0;
  if (state.phase === 'serve') serve();
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
  if(testing&&state.handsOn)state.inputTrace.push({source,action:command.action,kind:command.kind??null,time:+state.timer.toFixed(2)});
  if(command.action==='jump'){requestJump();return;}
  if(command.kind)setShot(command.kind);
  beginSwing(command.kind,source);
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
  // The player's stance faces the court while the mouse moves only the view.
  return canContact({position:ball.pos,velocity:ball.vel,player:player.pos,active:ball.active,lastHitter:state.lastHitter,assisted:state.assists || dash.remaining > 0,jump:state.jump,preparing,reachBonus:(state.playerStats.defense-1)*.55});
}
function selectedSwingKind(request){
 const kind=request||state.shot;
 if((kind==='auto'||kind==='smash')&&state.mode!=='targets'&&state.rally>1){
  const time=playerContactDelay('netkill');
  const contact=ball.pos.clone(),v=ball.vel.clone();
  for(let i=0;i<3;i++)advance(contact,v,time*ballTimeScale()/3);
  const feet=player.pos.clone().addScaledVector(player.vel,time);
  if(netKillOpportunity(contact,feet,state.jump))return 'netkill';
 }
 return kind==='auto'?autoShot():kind;
}
function playerSwingWindow(kind,age,contactDelay){
 return swingWindow({position:ball.pos,velocity:ball.vel,player:player.pos,playerVelocity:player.vel,kind,jump:state.jump,assisted:state.assists||dash.remaining>0,age,pace:ballTimeScale(),lookAhead:contactDelay,active:ball.active,lastHitter:state.lastHitter,reachBonus:(state.playerStats.defense-1)*.55});
}
function playerContactDelay(kind){
 return strokeTiming(kind,state.lastShot?.type==='serve'&&state.rally===1).contact;
}
function handleHitIntent() {
  const manualIntent=hitIntent.armed(state.timer);
  const automatic=autoReturnAssist.update({enabled:state.autoReturn,phase:state.phase,active:ball.active,lastHitter:state.lastHitter,rally:state.rally,manualIntent,swinging:state.swing>0});
  if ((!manualIntent&&!automatic) || !contactReady(true) || state.swing > 0) return;
  state.swingKind=selectedSwingKind(automatic?null:hitIntent.kind);
  const contactDelay=playerContactDelay(state.swingKind);
  const anticipated=playerSwingWindow(state.swingKind,automatic?0:state.timer-hitIntent.lastPressAt,contactDelay);
  if(!anticipated)return;
  if(automatic)autoReturnAssist.consume();
  state.swing = .001; state.swingContact = false; state.swingMissed = false;state.contactElapsed=contactDelay;state.swingRequestedKind=automatic?null:hitIntent.kind;
  if(state.mode==='targets'&&state.target)state.swingTarget={x:state.target.x,z:state.target.z};
  else state.swingTarget=selectedLanding(state.swingKind,anticipated);
  state.contactPoint=V(anticipated.x,anticipated.y,anticipated.z);
}
function nextCork(){
  const next=ball.pos.clone(),v=ball.vel.clone();advance(next,v,ballTimeScale()/120);return next;
}
function tryPlayerHit() {
  if (!contactReady()||!state.contactPoint) return false;
  if(ball.pos.y-state.jump<2.30&&!defensiveReach(ball.pos,player.pos,state.jump))return false;
  const step=ballTimeScale()/120;
  const start=ball.pos.clone().addScaledVector(ball.vel,-step),end=nextCork();
  if(state.cameraMode==='third'&&ball.pos.y-state.jump<2.30){
    updatePlayerAvatar(0,true);
    if(!crossesStrings(playerAvatar.racket.worldToLocal(start),playerAvatar.racket.worldToLocal(end)))return false;
  }else{
    const aim=camera.worldToLocal(state.contactPoint.clone()).toArray();
    const delay=state.contactElapsed||playerContactDelay(state.swingKind);
    const pose=swingPose({elapsed:delay,kind:state.swingKind,contact:aim,contactTime:delay});
    const rotation=new THREE.Quaternion().setFromEuler(new THREE.Euler(...pose.rotation)).invert();
    const origin=V(...pose.position);
    const local=p=>camera.worldToLocal(p).sub(origin).applyQuaternion(rotation).divideScalar(.96);
    if(!crossesStrings(local(start),local(end)))return false;
  }
  let type = state.swingKind;
  if(ball.pos.y<.85&&!['smash','slicesmash','net','netcross'].includes(type))type=ball.pos.z<2.6?'net':'lift';
  const wasOpponentShot = state.lastHitter === 'opponent';
  const contact = gradeContact({ position: ball.pos, player: player.pos, kind: type, assisted: state.assists,speed:player.speed,jump:state.jump,stamina:state.stamina });
  const target = state.swingTarget || selectedLanding(type);
  const attacking=['smash','slicesmash','netkill'].includes(type);
  const shot=strokeOutcome({position:ball.pos,player:player.pos,kind:type,target,speed:player.speed,jump:state.jump,stamina:state.stamina*(.72+.28*state.playerStats.stamina),assisted:state.assists,attackBonus:Math.max(0,state.playerStats.attack-1),qualityBonus:(state.playerStats.control-1)*.30+(['drop','slicedrop','net','netcross','lift'].includes(type)?(state.playerStats.net-1)*.25:0)});
  if(shot.speedMps!==null)shot.speedMps=clamp((shot.speedMps+racketPowerBoost(state.racketStyle,type))*(.4+.6*state.playerStats.attack),16,110);
  state.contactPoint=ball.pos.clone();state.contactElapsed=state.swing;state.impactFrame='player';
  ball.vel.copy(solveShot(ball.pos, shot.target, type,{speed:shot.speedMps,touch:state.playerStats.net,quality:shot.quality,step:ballTimeScale('player')/120}));
  if(shot.fault==='net')ball.vel.y-=5.8;
  if(training)training.shot={type,kmh:Math.round(ball.vel.length()*3.6),launchY:ball.vel.y};
  if(attacking){
   const horizontalSpeed=Math.hypot(ball.vel.x,ball.vel.z);
   shot.heavy=shot.heavy&&horizontalSpeed>=(type==='slicesmash'?28:35)&&ball.vel.y<0;
   shot.attackPressure*=clamp(horizontalSpeed/(type==='slicesmash'?38:48),.15,1);
  }
  state.lastTarget = shot.target; state.lastQuality = shot.quality; state.contactFlash = .38;state.lastShot={type,...shot,intended:{...target}};state.lastFault=shot.fault;
  if(!shot.fault)opponentWeaknessForShot(type,shot.target);
  const prior=opponentMemory.shots.at(-1)?.target;
  opponent.splitTarget=prior?{x:prior.x,z:clamp(prior.z-.45,-7.05,-.7)}:{x:opponent.pos.x,z:opponent.pos.z};
  const pressure=opponentMemory.observe({type,target:shot.target,position:opponent.pos,velocity:opponent.vel,quality:shot.quality,fault:shot.fault,energy:opponent.energy,level:currentOpponentLevel()});
  opponent.pressure=pressure;
  reactToReturn(shot.fault,type,shot.rating==='scramble',1-shot.quality,player.pos);
  state.tacticMessage=pressure.key&&pressure.strength>.28?TACTICAL_LABELS[pressure.key]:'';
  matchTactics.stroke({hitter:'player',type,target:shot.target,quality:shot.quality,fault:shot.fault,pressure,position:{x:ball.pos.x,y:ball.pos.y,z:ball.pos.z},contactReason:shot.reason});
  state.lastPlacement={intended:{...target},landing:null,status:'flying'};ball.spin=['net','netcross','slicedrop','slicesmash'].includes(type)?state.playerStats.net*(type==='netcross'?1.8:1):0;ball.spinAt=state.timer;
  if(['smash','slicesmash'].includes(type))state.smashes++;
  opponent.splitAt=state.timer;opponent.startFoot={x:opponent.pos.x,z:opponent.pos.z};
  if (state.mode === 'targets' && wasOpponentShot) state.targetArmed = true;
  state.lastHitter = 'player'; state.rally++; state.hits++; state.swingContact = true; state.charge = 0;
  state.returnDelay = state.timer + currentOpponentLevel().reaction * .56 + pressure.delay*.64;
  state.impact = (attacking ? .009 : .0035)*state.motion;
  haptic(attacking?.9:contact.rating==='perfect'?.62:.38,attacking?.55:.22,attacking?68:36);
  state.hitstop = 0; state.stamina = Math.max(0, state.stamina - (attacking ? ((shot.heavy?7:4)+(state.racketStyle==='attack'?1.5:0))*(1.25-.25*state.playerStats.stamina) : .5*(1.25-.25*state.playerStats.stamina)));
  const names = { clear: '高远球', drive: '平抽快打', drop: '网前轻吊', smash: '强力杀球', lift: '反手挑球', net:'搓球控网', push:'推压后场', netkill:'网前扑杀',netcross:'网前勾对角',slicesmash:'劈杀大斜线',slicedrop:'劈吊对角' };
  const ratings = { perfect: '甜点击球', clean: '扎实回球', scramble: '救险回球' };
  const strike=shot.fault?'击球失误':attacking&&state.jump>.15?'跳杀':shot.heavy?'高点重杀':ratings[shot.rating];
  const reason=attacking&&!shot.heavy&&shot.reason==='高点击球 · 重杀机会'?'短落点限制出球速度':shot.reason;
  feedback(`${strike} · ${names[type]}`, `${recordSpeed()} KM/H · ${reason}`); hitSound(type); refreshPrediction();
  if(state.tutorial&&state.tutorialStage===2)setLessonStage(3);
  else if(state.tutorial&&state.tutorialStage===3&&type==='smash'&&state.swingRequestedKind==='smash')setLessonStage(4);
  ball.flash = .18; ball.trail.length = 0;
  return true;
}
function opponentHit() {
  if(state.lastPlacement?.status==='flying')state.lastPlacement.status='returned';
  const level=currentOpponentLevel(),training=state.mode==='targets'||state.tutorial;
  const feed=practiceFeed(opponent.returns);
  const chased=opponent.startFoot?Math.hypot(opponent.pos.x-opponent.startFoot.x,opponent.pos.z-opponent.startFoot.z):0;
  const pressure=contactPressure({initial:opponent.pressure?.strength||0,distance:Math.hypot(ball.pos.x-opponent.pos.x,ball.pos.z-opponent.pos.z),reach:level.reach,height:ball.pos.y,speed:Math.hypot(opponent.vel.x,opponent.vel.z),energy:opponent.energy,chased});
  const plan=training?{type:feed.type,target:{x:feed.x,z:feed.z},action:'练习喂球',spin:0}:planOpponentStroke({level,position:ball.pos,player:player.pos,playerVelocity:player.vel,energy:opponent.energy,profile:currentMatchIntent().character,match:{opponentId:state.mode==='match'?state.currentOpponentId:'',style:state.opponentStyle,score:state.score,points:state.matchPoints,recent:matchTactics.points},tactic:OPPONENT_STYLES[state.opponentStyle]?.tactic||'balanced',history:opponent.history,pressure,random});
  const type=plan.type,shot=training?null:strokeOutcome({position:ball.pos,player:opponent.pos,kind:type,target:plan.target,side:-1,speed:Math.hypot(opponent.vel.x,opponent.vel.z),stamina:opponent.energy,qualityBonus:(level.accuracy-.7)*.18});
  if(shot){
    shot.quality=Math.max(.2,shot.quality-pressure*(1-level.anticipation*.68)*.24);
    const execution=opponentStrokeExecution({level,type,target:shot.target,quality:shot.quality,energy:opponent.energy,pressure,height:ball.pos.y,random});
    shot.target=execution.target;shot.fault=shot.fault||execution.fault;shot.up=execution.up;
    const spread=(.035+(1-level.accuracy)*.95)*(1+(1-opponent.energy/100)*.85)+(1-shot.quality)*.35;shot.target.x+=normalRandom()*spread;shot.target.z+=normalRandom()*spread;
  }
  ball.vel.copy(solveShot(ball.pos,shot?.target||plan.target,type,{up:shot?.up,speed:['smash','slicesmash'].includes(type)?level.power*(type==='slicesmash'?.73:1)+(shot?.heavy?8:0):type==='netkill'?level.power*.65:null,touch:.6+level.netSkill,quality:shot?.quality??1,step:ballTimeScale('opponent')/120}));
  // Do not rescale a solved trajectory: it changes the called landing and net clearance.
  if(shot?.fault==='net')ball.vel.y-=5.8;
  reactToReturn(shot?.fault,type,chased>2.3&&pressure>.28,pressure,opponent.pos);
  state.lastShot=null;state.lastFault=null;state.lastHitter='opponent';state.rally++;
  matchTactics.stroke({hitter:'opponent',type,target:shot?.target||plan.target,quality:shot?.quality??1,fault:shot?.fault||null,pressureStrength:pressure,action:plan.action,position:{x:ball.pos.x,y:ball.pos.y,z:ball.pos.z}});
  opponent.returns++;state.impactFrame='opponent';opponent.swing=.135;opponent.shot=type;opponent.contactPoint=ball.pos.clone();
  opponent.lastContact={x:ball.pos.x,z:ball.pos.z};opponent.lastTarget={...plan.target};
  opponent.action=(plan.backhand&&['net','netcross','push','netkill'].includes(type)?'反手 · ':'')+plan.action;opponent.actionAt=state.timer;
  opponent.history.push({type,action:plan.action,target:{...plan.target},executedTarget:{...(shot?.target||plan.target)},fault:shot?.fault||null});opponent.history=opponent.history.slice(-6);
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
  if(!playerWon&&state.lastHitter==='player')state.errors++;
  const finished = state.mode === 'match' && matchFinished(state.score,state.matchPoints);
  state.finished = finished;
  const result=matchTactics.finish({playerWon,lastHitter:state.lastHitter,reason,opponentEnergy:opponent.energy,playerPosition:{x:player.pos.x,z:player.pos.z}});
  if(result.scoring==='winner')state.winners++;
  result.scoreBefore=state.score.map((n,i)=>n-Number(i===(playerWon?0:1)));result.rallyLength=state.rally;result.goal=state.matchPoints;
  if(finished)commitMatch();
  $('#point-toast').classList.remove('hidden'); $('#point-reason').textContent = `${result.label} · ${result.detail}`;
  $('#point-title').textContent = state.mode === 'practice' ? `${state.rally} 拍，继续保持。` : finished ? (playerWon ? '拿下比赛。' : '下一场，再来。') : playerWon ? '漂亮，拿下一分。' : '调整一下，再来。';
  $('#point-subtitle').textContent = state.mode === 'practice' ? '自动开始下一轮练习' : `${String(state.score[0]).padStart(2, '0')}  :  ${String(state.score[1]).padStart(2, '0')}  /  ${state.rally} 拍回合${finished?` · 积分 ${state.ratingDelta>=0?'+':''}${state.ratingDelta}`:''}`;
  if (playerWon) { tone(660, .18, .1); setTimeout(() => tone(880, .25, .08), 100); } else tone(330, .18, .06, 240);
  const earned=result.unlocked.map(key=>MATCH_OBJECTIVES.find(o=>o.key===key).name);
  if(earned.length)$('#point-subtitle').textContent+=` · 达成 ${earned.join(' / ')}`;
  state.tacticMessage='';
  updateCourtScore();
  if(state.mode==='match'){
    const close=Math.max(...state.score)>=state.matchPoints-2&&Math.abs(state.score[0]-state.score[1])<=2;
    const highlight=state.rally>=8||close;
    const power=finished?1:highlight?.84:playerWon?.48:.32;
    standReaction={start:state.timer,gesture:playerWon?(finished?'wave':'fist'):null,power,side:Math.sign(ball.pos.x)};
    if(finished)state.pointDelay=2.8;
    const cheer=finished&&playerWon?(state.tournamentId&&state.tournamentRound===4?'clinch':'win'):highlight||finished?'rally':'applause';
    playStandCheer(cheer,power);
  }
  if(finished&&state.tournamentId)resolveTournamentPoint(playerWon);
  else if(finished&&playerWon)celebrateVictory('exhibition');
}

function recordLanding(contact, incomingVelocity, review) {
  lastLineReview = review;
  groundMotion = createGroundMotion(contact, incomingVelocity);
  state.lastLanding = { ...lastLineReview.position };
  if(state.lastHitter==='player'&&state.lastPlacement?.status==='flying'){
    state.lastPlacement.landing=state.lastLanding;state.lastPlacement.status=lastLineReview.call.inside?'landed':'out';
  }
  $('#eagle-point-review').classList.remove('hidden'); $('#last-line-review').disabled = false;
  if (lastLineReview.call.nearLine && $('#eagle-auto').checked && !state.tutorial && !training) {
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
  const incoming=ball.active&&state.phase==='rally'&&state.lastHitter==='opponent'&&state.prediction?.intercept;
  const receive=incoming?receivingTarget(state.prediction,player.pos):null;
  const heldSprint=keys.has('ShiftLeft')||keys.has('ShiftRight');
  const chase=state.sprintAssist?pursuitSprint(movement,player.pos,receive):0;
  const sprint=state.stamina>8?(heldSprint?1:chase):0;
  const energyFactor=.80+.20*clamp(state.stamina/35,0,1);
  const speed=(5.65+2.65*sprint)*state.playerStats.speed*energyFactor;
  if (state.phase==='serving' && state.mode==='match') {
    player.vel.set(0,0,0);
  } else if (manual) {
    // The doubles court is the compass: forward is always toward the net.
    const vx = mx * speed * movement.magnitude, vz = -mz * speed * movement.magnitude;
    player.vel.x = moveVelocity(player.vel.x, vx, dt); player.vel.z = moveVelocity(player.vel.z, vz, dt);
    player.pos.addScaledVector(player.vel, dt); state.lastMove = state.timer + .55;
    player.pos.x = clamp(player.pos.x, -3.4, 3.4); player.pos.z = clamp(player.pos.z, .65, 7.35);
  } else if (state.assists && !state.manualOverride && state.jump===0 && state.timer - state.lastMove > .13 && state.phase === 'rally') {
    const followDrop=!incoming&&state.lastHitter==='player'&&!state.lastFault&&
      ['drop','slicedrop','net','netcross'].includes(state.lastShot?.type)&&state.lastShot.target?.z>-2.2;
    const target = incoming ? V(receive.x, 0, receive.z) : followDrop ?
      V(state.lastShot.target.x*.32,0,2.68) : V(player.pos.x*.3,0,4);
    moveCharacter(player, target, (incoming ? (state.sprintAssist?8.0:6.6) * state.playerStats.defense * state.playerStats.speed : 2.6 * state.playerStats.speed)*energyFactor, dt, true);
  } else {
    player.vel.x=moveVelocity(player.vel.x,0,dt);player.vel.z=moveVelocity(player.vel.z,0,dt);player.pos.addScaledVector(player.vel,dt);
  }
  if(state.mode==='match'&&!training&&!state.tutorial&&['serve','serving','opponentServe'].includes(state.phase)){
    const serverSide=singlesServiceSide(state.server,state.score);
    const side=state.server==='player'?serverSide:-serverSide;
    const x=side*clamp(player.pos.x*side,.21,COURT.halfWidth-.12);
    const z=clamp(player.pos.z,2.19,COURT.halfLength-.16);
    if(x!==player.pos.x)player.vel.x=0;
    if(z!==player.pos.z)player.vel.z=0;
    player.pos.set(x,0,z);
  }
  player.speed = Math.hypot(player.vel.x, player.vel.z);
  state.stamina=clamp(state.stamina+movementEnergyRate({speed:player.speed,sprinting:manual&&sprint>.55,staminaSkill:state.playerStats.stamina,resting:state.phase!=='rally'})*dt,0,100);
  const jumpFrame=jumping.step(dt,state.stamina);state.jump=jumpFrame.height;state.jumpV=jumpFrame.velocity;state.stamina-=jumpFrame.cost;state.jumpPeak=Math.max(state.jumpPeak,state.jump);
  if(jumpFrame.launched){noise(.045,420,.04,'highpass');haptic(.18,.05,24);}
  if(jumpFrame.landed){noise(.09,170,.095);haptic(.25,.12,28);if(state.tutorial&&state.tutorialStage===1)setLessonStage(2);}
  if(state.tutorial&&state.tutorialStage===0&&player.pos.distanceTo(state.lessonOrigin)>.9)setLessonStage(1);
  if(pad){const dx=(pad.axes?.[2]||0),dy=(pad.axes?.[3]||0);if(Math.hypot(dx,dy)>.15){if(pad.buttons[4]?.pressed)chooseLanding(moveLanding(selectedLanding(),dx*dt*160,dy*dt*160));else if(!state.comfortable){applyMouseLook(dx*dt*850,dy*dt*850);}}}
  const dashStep = dash.step(dt);
  player.pos.x = clamp(player.pos.x + dashStep.x, -3.4, 3.4);
  player.pos.z = clamp(player.pos.z + dashStep.z, .65, 7.35);
  player.dashVX = dashStep.x/dt;
  player.dashVZ = dashStep.z/dt;
  if (state.phase==='rally' && ball.active && state.lastHitter==='opponent' && state.receiveRally !== state.rally) {
    state.receiveStarted = state.timer;
    state.receiveRally = state.rally;
  } else if (state.lastHitter!=='opponent' || state.phase!=='rally') {
    state.receiveRally = null;
  }
  if(state.cameraMode==='third'){
    const incoming=ball.active&&state.lastHitter==='opponent';
    const goal=ball.active?trackAngles({x:player.pos.x,y:1.69+state.jump,z:player.pos.z},ball.pos,ball.vel,state.yaw):{yaw:0,pitch:-.03};
    // Keep the stance facing play if an already missed shuttle travels past.
    const facing=incoming&&ball.pos.z<=player.pos.z+.35 ? clamp(goal.yaw,-1.05,1.05) : 0;
    state.yaw=damp(state.yaw,facing,18,dt);
    if(state.comfortable)state.orbitYaw=damp(state.orbitYaw,clamp(goal.yaw,-.55,.55),3,dt);
  } else if (state.comfortable) {
    const tracking = state.phase === 'rally';
    const goal=tracking?trackAngles({x:player.pos.x,y:1.69+state.jump,z:player.pos.z},ball.pos,ball.vel,state.yaw):{yaw:0,pitch:-.04};
    // Follow the shuttle in both axes. A damped response keeps head-high balls
    // in frame while avoiding the old instant, nausea-inducing camera snap.
    const angles=stepTracking(state,goal,dt,8,8);state.yaw=angles.yaw;state.pitch=angles.pitch;
  }
  const previousStep=player.step;player.step+=player.speed*dt;
  if(player.speed>.7&&state.jump===0&&Math.floor(player.step/.95)!==Math.floor(previousStep/.95)){noise(.055,210,.035+player.speed*.004,'lowpass',Math.sin(player.step*3)*.18);noise(.022,1200,.015,'bandpass');}
  previousManual = manual;
}

function opponentJump(time){
  const phase=(time-(opponent.jumpPeakAt??-10))/.23;
  return Math.max(0,1-phase*phase)*(opponent.jumpAmplitude||0);
}
function updateOpponent(dt) {
  if (training) {
    opponent.facing=damp(opponent.facing||0,Math.atan2(-opponent.pos.x,4-opponent.pos.z),8,dt);
    if (opponent.swing>0) opponent.swing=opponent.swing+dt<.55?opponent.swing+dt:0;
    return;
  }
  const level=currentOpponentLevel(),scriptedOpponent=state.mode==='targets'||state.tutorial;
  const incoming=state.lastHitter==='player'&&state.phase==='rally',intercept=state.prediction?.intercept;
  const base=opponentMemory.base(characterRecovery(recoveryBase({lastContact:opponent.lastContact,lastTarget:opponent.lastTarget,level}),currentMatchIntent(),opponent.history.at(-1)?.type),level);
  const moveStart=state.returnDelay;
  const waiting=incoming&&state.timer<=moveStart;
  let target={...base};
  if(state.phase==='serve'||state.phase==='serving'||state.phase==='opponentServe')target={x:opponent.pos.x,z:opponent.pos.z};
  if(state.mode==='targets')target={x:-.35,z:-4.5};
  else if(waiting&&!scriptedOpponent&&state.rally>1){
    target=opponent.splitTarget||opponent.pos;
  }else if(incoming&&intercept){
    if(opponent.readRally!==state.rally||state.timer>(opponent.readAgain||0)){
      const error=scriptedOpponent?0:(1-level.accuracy)*.38;
      const stance=opponentStance(intercept);
      opponent.readTarget={x:clamp(stance.x+rand(-error,error),-3.1,3.1),z:stance.z};
      opponent.readRally=state.rally;opponent.readAgain=state.timer+.23-level.anticipation*.14;
    }
    target=opponent.readTarget||target;
  }
  const moveLevel=scriptedOpponent?{...level,speed:5.9,acceleration:20}:incoming?{...level,speed:level.speed*(opponent.pressure?.speedFactor||1)}:level;
  const locomotion=opponentFootwork({position:opponent.pos,velocity:opponent.vel,target,level:moveLevel,energy:opponent.energy,waiting},dt);
  opponent.pos.set(locomotion.position.x,0,locomotion.position.z);opponent.vel.set(locomotion.velocity.x,0,locomotion.velocity.z);
  opponent.movementMode=incoming?locomotion.mode:Math.hypot(target.x-opponent.pos.x,target.z-opponent.pos.z)>.35?'recover':'ready';
  opponent.movementCounts[opponent.movementMode]=(opponent.movementCounts[opponent.movementMode]||0)+1;
  const dist=Math.hypot(ball.pos.x-opponent.pos.x,ball.pos.z-opponent.pos.z),reach=scriptedOpponent?1.25:level.reach;
  opponent.netHold=Math.max(0,opponent.netHold-dt);
  const netReach=incoming&&ball.active&&ball.pos.z>-2.6&&ball.pos.y<1.75&&dist<1.65;
  opponent.netLunge=damp(opponent.netLunge,netReach?.9:opponent.netHold>0?.72:0,netReach?15:8,dt);
  if(incoming&&ball.active&&state.mode!=='targets'&&opponent.defenseRally!==state.rally){
    const lead=5/120;
    if(!opponent.strikePlan&&state.timer+lead>=state.returnDelay&&dist<3&&ball.pos.y<3.5){
      const point=ball.pos.clone(),v=ball.vel.clone();
      for(let i=0;i<5;i++)advance(point,v,dt*ballTimeScale());
      const feet=opponent.pos.clone().addScaledVector(opponent.vel,lead);
      const lift=opponentJump(state.timer+lead);
      const shoulderY=1.34+lift-opponent.netLunge*.14;
      const overheadWindow=point.y<2.10||Math.hypot(point.x-feet.x+.14,point.z-feet.z-.15,point.y-shoulderY)<1.09;
      if(overheadWindow&&v.y<1&&opponentContactWindow({ball:point,position:feet,level,training:scriptedOpponent})&&
         defensiveReach(point,feet,lift,-1)){
        opponent.strikePlan={point,at:state.timer+lead};
        opponent.contactPoint=point;opponent.swing=.135-lead;
        opponent.shot=point.y<1.46?'lift':point.y>2.1?'clear':'drive';
      }
    }
  }
  if(incoming&&opponent.strikePlan&&state.timer+1e-6>=opponent.strikePlan.at){
    opponent.swing=.135;updateOpponentModel(0,true);
    const end=bot.racket.worldToLocal(nextCork()),start=bot.racket.worldToLocal(ball.pos.clone());
    const touched=crossesStrings(start,end);
    opponent.defenseRally=state.rally;opponent.strikePlan=null;
    const incomingShot=state.lastShot?.type||'serve';
    const weaknessKey=opponentWeaknessKey({position:ball.pos,shot:incomingShot});
    if(!touched||random()<opponentReceiveMissChance({level,shot:incomingShot,position:ball.pos,distance:dist,reach,energy:opponent.energy,weaknesses:opponent.weaknesses,weaknessKey,adaptation:opponent.adaptation[weaknessKey]||0,attackPressure:state.lastShot?.attackPressure||0,incomingSpeed:ball.vel.length(),footSpeed:Math.hypot(opponent.vel.x,opponent.vel.z),chased:opponent.startFoot?Math.hypot(opponent.pos.x-opponent.startFoot.x,opponent.pos.z-opponent.startFoot.z):0})){
      opponent.swing=.001;opponent.shot='miss';opponent.action='接球失误';opponent.actionAt=state.timer;
    }else opponentHit();
  }
  const speed=Math.hypot(opponent.vel.x,opponent.vel.z);
  if(!scriptedOpponent)opponent.energy=clamp(opponent.energy+(state.phase!=='rally'?16*level.stamina:speed>2?-speed*1.25/level.stamina:7*level.stamina)*dt,15,100);
  const before=opponent.step;opponent.step+=dt*speed*2.7;
  if(speed>.95&&Math.floor(before*1.55)!==Math.floor(opponent.step*1.55))noise(.045,210,.024,'lowpass',clamp((opponent.pos.x-player.pos.x)/5,-.9,.9));
  const angle=incoming?Math.atan2(ball.pos.x-opponent.pos.x,Math.max(.6,ball.pos.z-opponent.pos.z)):Math.atan2(player.pos.x-opponent.pos.x,player.pos.z-opponent.pos.z);
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
      if(state.lastHitter==='player'&&state.lastPlacement?.status==='flying'){
        state.lastPlacement.status='net';state.lastPlacement.landing=null;state.lastLanding=null;
      }
      noise(.13, 1600, .12);
      if (training) completeTrainingRep(null, 'net');
      else {
        if (completeTargetShot(ball.pos)) return;
        scorePoint(state.lastHitter === 'player' ? 'opponent' : 'player', '触网');
      }
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
    const review = flightRecorder.finish(contact, incomingVelocity, state.lastHitter);
    if (training) completeTrainingRep(contact, 'land');
    else if (!completeTargetShot(contact)) {
      const call = review.call;
      scorePoint(winner, !call.inside ? '界外球' : call.onLine ? '压线 · 界内球' : contact.z > 0 ? '落地 · 对手得分' : '落地 · 你的得分');
    }
    recordLanding(contact, incomingVelocity, review);
    return;
  }
  if (Math.abs(ball.pos.x) > 12 || Math.abs(ball.pos.z) > 18 || ball.pos.y > 30) {
    if(state.lastHitter==='player'&&state.lastPlacement?.status==='flying'){
      state.lastPlacement.status='out';state.lastPlacement.landing=null;state.lastLanding=null;
    }
    if (training) { completeTrainingRep(null, 'out'); return; }
    if (completeTargetShot(ball.pos)) return;
    scorePoint(state.lastHitter === 'player' ? 'opponent' : 'player', '界外球');
  }
}

function updateSwing(dt) {
  if (state.swing <= 0) return;
  state.swing += dt;
  // A short, visible wind-up makes the racket contact land in the swing animation.
  const contactDelay=state.contactElapsed||.085;
  if (!state.swingContact && !state.swingMissed && state.swing >= contactDelay) {
    if (tryPlayerHit()) hitIntent.consume();
    else if (state.swing >= contactDelay+.018) {
      state.swingMissed = true; hitIntent.consume();
      noise(.07, 420, .035, 'highpass');
      feedback('挥空了', '挥拍稍早或站得太远 · 跟球移动，再提前按下');
    }
  }
  const recovery=strokeTiming(state.swingKind).recovery;
  if (state.swing > Math.max(recovery,contactDelay+.15)) { state.swing = 0; state.charge = 0; }
}

function positionServeHand(cork,pose){
  const hand=racket.userData.support;if(!hand)return;
  hand.visible=Boolean(pose);if(!pose)return;
  hand.userData.relaxation=pose.relaxation??0;
  hand.userData.fist=pose.fist??0;
  hand.rotation.fromArray([...pose.rotation,'XYZ']);
  if(pose.position){hand.position.fromArray(pose.position);return;}
  const pinch=V(-.023,.137,.018).multiply(hand.scale).applyQuaternion(hand.quaternion);
  hand.position.copy(cork).add(V(...pose.offset)).sub(pinch);
}
function ensurePlayerAvatar(){
 if(playerAvatar)return playerAvatar;
 const portraitMap=new THREE.TextureLoader().load(new URL('./assets/lin-nan-head.webp',import.meta.url).href,()=>renderBudget.invalidate());
 const uniformMap=new THREE.TextureLoader().load(new URL('./assets/textures/shenzhen-polo.webp',import.meta.url).href,()=>renderBudget.invalidate());
 playerAvatar=createAthlete(THREE,()=>{const mount=new THREE.Group(),model=createRacket(true);mount.add(model);mount.userData.racketModel=model;return mount;},{skinMap:surfaceMaps?.athleteSkin,mergeGeometries,portraitMap,uniformMap});
 // Dither coverage in the opaque pass to keep normal depth sorting.
 const fadeMaterials=new Map();
 playerAvatar.body.traverse(object=>{
  if(!object.isMesh||playerAvatar.racket.getObjectById(object.id))return;
  for(const material of (Array.isArray(object.material)?object.material:[object.material])){
   if(!material.transparent)material.alphaHash=true;
   fadeMaterials.set(material,material.opacity);
  }
 });
 playerAvatar.fadeMaterials=fadeMaterials;
 playerAvatar.root.name='Player · third person';playerAvatar.root.visible=false;playerAvatar.setKit('linNan');scene.add(playerAvatar.root);
 return playerAvatar;
}
function setCameraMode(value){
 const mode=cameraMode(value),changed=mode!==state.cameraMode;
 if(changed){
  if(mode==='third'){
   state.firstView={yaw:state.yaw,pitch:state.pitch,manualPitch:state.manualPitch,autoPitchOffset:state.autoPitchOffset,manualLookUntil:state.manualLookUntil};
   state.yaw=0;state.pitch=state.manualPitch=-.03;state.autoPitchOffset=0;state.thirdLift=0;state.avatarFade=0;
  }else{
   Object.assign(state,state.firstView||{yaw:0,pitch:-.03,manualPitch:-.03,autoPitchOffset:0,manualLookUntil:0});
   state.firstView=null;
   camera.fov=69;camera.rotation.z=0;
  }
  state.cameraMode=mode;playerAvatar?.resetFeet();
 }
 for(const select of document.querySelectorAll('[data-camera-mode]'))select.value=mode;
 document.body.classList.toggle('third-person',mode==='third');
 if(['play','pause'].includes(state.screen)){
  updateCamera(0);syncPlayerVisibility();updateContactHint();updateTactics();renderBudget.invalidate();
 }
}
function syncPlayerVisibility(){
 const third=state.cameraMode==='third'&&['play','pause','overhead-preview'].includes(state.screen);
 if(playerAvatar)playerAvatar.root.visible=third||state.screen==='inspect';
 if(third){racket.visible=false;if(racket.userData.support)racket.userData.support.visible=false;}
}
function updatePlayerAvatar(dt,impactOnly=false){
 const avatar=ensurePlayerAvatar();avatar.root.position.copy(impactOnly?player.pos:player.renderPos);avatar.root.position.y=state.jump;avatar.root.rotation.y=Math.PI+state.yaw;
 avatar.root.updateMatrixWorld(true);
 const point=state.swing>0&&state.contactPoint?avatar.root.worldToLocal(state.contactPoint.clone()):null;
 const contact=point&&Math.hypot(point.x,point.z)<2.2&&point.y<3.5?point.toArray():null;
 const kind=state.swing>0?state.swingKind:state.shot,netShot=['net','netcross','push','netkill'].includes(kind);
 const holding=['serve','serving'].includes(state.phase);
 const support=holding?avatar.root.worldToLocal(ball.renderPos.clone()).toArray():null;
 const receiving=ball.active&&state.lastHitter==='opponent';
 const readiness=receiving?clamp((9-Math.hypot(ball.pos.x-player.pos.x,ball.pos.z-player.pos.z))/8,.25,.9):.12;
 const vx=player.vel.x+(player.dashVX||0),vz=player.vel.z+(player.dashVZ||0),strideSpeed=Math.hypot(vx,vz);
 const split=receiving&&strideSpeed<2.1&&state.jump===0?Math.max(0,1-(state.timer-state.receiveStarted)/.24):0;
 const netLunge=netShot&&state.swing>0?Math.sin(Math.min(1,state.swing/.35)*Math.PI)*.45:0;
 const dashLunge=dash.remaining>0&&vz<-2 ? .7*Math.sin(Math.PI*(1-dash.remaining/.19)) : 0;
 avatar.update({dt,time:state.timer,speed:strideSpeed,swing:impactOnly||state.impactFrame==='player'?.135:avatarSwingTime(state.swing,state.contactElapsed||.07,Math.max(strokeTiming(kind).recovery,(state.contactElapsed||.07)+.15)),
  lateral:vx,forward:vz,shot:kind,contact,supportContact:support,jumpHeight:state.jump,
  lookY:ball.pos.y,lookX:Math.cos(avatar.root.rotation.y)*(ball.pos.x-player.pos.x)-Math.sin(avatar.root.rotation.y)*(ball.pos.z-player.pos.z),anticipation:holding?0:readiness,
  split,crossover:Math.abs(vx)>1.9&&vz>.7,lunge:Math.max(netLunge,dashLunge),
  netVariant:kind==='netcross'?'勾对角':kind==='net'?'搓网':kind==='netkill'?'扑球':kind==='push'?'推后场':'',
  overheadReady:state.swing?0:state.overheadReady,overheadTurn:state.swing?0:state.overheadTurn,
  landing:jumping.landing,celebration:waveAmount(),fist:pointGesture('fist'),impactOnly});
}
function updateAvatarOcclusion(dt){
 const receiving=state.phase==='rally'&&ball.active&&state.lastHitter==='opponent';
 const incoming=ball.renderPos;
 const close=receiving&&Math.hypot(incoming.x-player.renderPos.x,incoming.z-player.renderPos.z)<3.2;
 const obstruction=close?avatarObstruction(camera.position,incoming,player.renderPos,state.jump):0;
 state.avatarFade=dt===0?obstruction:damp(state.avatarFade,obstruction,obstruction>state.avatarFade?30:10,dt);
 const opacity=state.avatarFade<.005?1:1-.82*state.avatarFade;
 if(opacity===playerAvatar.coverage)return;
 playerAvatar.coverage=opacity;
 for(const [material,original] of playerAvatar.fadeMaterials)material.opacity=original*opacity;
}
function updateCamera(dt) {
 const incoming=ball.active&&state.phase==='rally'&&state.lastHitter==='opponent';
 const prep=overheadPreparation(ball.renderPos,player.renderPos,incoming?(state.prediction?.overhead??state.prediction?.intercept):null);
 state.overheadReady=damp(state.overheadReady||0,prep.ready,11,dt);
 state.overheadTurn=damp(state.overheadTurn||0,prep.turn,11,dt);
 if(state.cameraMode==='third'){
  const enabled=state.highBallAssist&&ball.active&&state.timer>=(state.manualLookUntil||0);
  const desiredLift=thirdPersonLift({player:player.renderPos,ball:ball.renderPos,enabled});
  state.thirdLift=damp(state.thirdLift,desiredLift,desiredLift>state.thirdLift?8:5,dt);
  const pose=thirdPersonPose({player:player.renderPos,jump:state.jump,yaw:state.orbitYaw,pitch:state.orbitPitch,lift:state.thirdLift,framing:state.thirdFraming});
  camera.position.set(pose.position.x,pose.position.y,pose.position.z);camera.lookAt(pose.target.x,pose.target.y,pose.target.z);
  camera.fov=thirdPersonFov(state.thirdLift);camera.updateProjectionMatrix();camera.updateMatrixWorld(true);updatePlayerAvatar(dt);updateAvatarOcclusion(dt);syncPlayerVisibility();return;
 }
 if(playerAvatar)playerAvatar.root.visible=false;
 racket.visible=true;
  const ballInFront=ball.active&&state.lastHitter==='opponent'&&state.highBallAssist&&state.timer>=(state.manualLookUntil||0);
  const gait=groundedCameraOffset({speed:player.speed,lateral:player.vel.x,forward:player.vel.z,phase:player.step*6.6,intensity:state.motion});
  cameraGoal.set(player.renderPos.x+gait.x,1.69+state.jump-jumping.landing*.055+(state.jump>0?0:gait.y),player.renderPos.z+gait.z);
  // renderPos already interpolates the 120 Hz simulation. A second camera
  // low-pass filter adds a visible trailing motion after releasing WASD.
  camera.position.copy(cameraGoal);
  const wantedAuto=highBallOffset({eye:camera.position,ball:ball.renderPos,yaw:state.yaw,manualPitch:state.manualPitch,fov:camera.fov,enabled:ballInFront&&!state.comfortable});
  state.autoPitchOffset=stepHighBallOffset(state.autoPitchOffset,wantedAuto,dt);
  if(!state.comfortable)state.pitch=clamp(state.manualPitch+state.autoPitchOffset,-1.42,1.545);
  state.impact*=Math.exp(-18*dt);camera.rotation.order='YXZ';camera.rotation.y=state.yaw;camera.rotation.x=state.pitch+Math.sin(state.timer*85)*state.impact;
  camera.rotation.z=damp(camera.rotation.z,gait.roll,16,dt);
  state.cameraPeak=Math.max(state.cameraPeak||0,camera.position.y);
  const fov=69;
  camera.fov=damp(camera.fov,fov,9,dt);camera.updateProjectionMatrix();camera.updateMatrixWorld(true);
  let contact=null;if(state.swing>0&&state.contactPoint){const p=camera.worldToLocal(state.contactPoint.clone());contact=p.toArray();}
  const pose=swingPose({elapsed:state.impactFrame==='player'?state.contactElapsed:state.swing,kind:state.swingKind,contact,contactTime:state.contactElapsed||.095,armed:hitIntent.armed(state.timer),time:state.timer,speed:player.speed,power:state.lastShot?.heavy?1:0});
  if(state.swing===0&&camera.aspect<1)pose.position[0]*=Math.max(.38,camera.aspect);
  if(incoming&&state.swing===0){
    pose.position[1]+=.14*state.overheadReady;
    pose.position[0]+=.055*state.overheadTurn;
    pose.rotation[2]+=.19*state.overheadReady-.13*state.overheadTurn;
  }
  racket.position.fromArray(pose.position);racket.rotation.fromArray([...pose.rotation,'XYZ']);
  if(racket.userData.support){
    const cork=camera.worldToLocal((state.phase==='rally'&&state.contactPoint?state.contactPoint:ball.renderPos).clone()).toArray();
    const support=supportHandPose({phase:state.phase,elapsed:state.serveElapsed,swing:state.swing,kind:state.swingKind,cork,speed:player.speed,time:state.timer,lateral:player.vel.x});
    const fist=pointGesture('fist');
    support.position[1]+=.30*fist;
    support.position[0]+=.045*fist;
    support.fist=fist;
    const wave=waveAmount();
    if(wave){
      const beat=Math.sin((state.timer-standReaction.start)*9);
      support.position[0]+=wave*(.018+.058*beat);
      support.position[1]+=.78*wave;support.position[2]-=.08*wave;
      support.rotation[2]+=wave*(.13+.32*beat);
    }
    positionServeHand(null,support);
  }
}
function updateOpponentModel(dt,impactOnly=false) {
 bot.root.position.copy(impactOnly?opponent.pos:opponent.renderPos);bot.root.rotation.y=opponent.facing||0;
 const jump=opponentJump(state.timer);bot.root.position.y+=jump;
 const receiving=state.lastHitter==='player'&&state.phase==='rally',near=receiving?Math.max(0,1-Math.hypot(ball.pos.x-opponent.pos.x,ball.pos.z-opponent.pos.z)/4):0;
 bot.root.updateMatrixWorld(true);const strike=opponent.strikePlan?.point||opponent.contactPoint;
 const contact=strike?bot.root.worldToLocal(strike.clone()).toArray():null;
 bot.update({speed:Math.hypot(opponent.vel.x,opponent.vel.z),dt,time:state.timer,swing:state.impactFrame==='opponent'?.135:opponent.swing,lateral:opponent.vel.x,forward:opponent.vel.z,shot:opponent.shot||'clear',jumpHeight:jump,anticipation:near,lookY:ball.pos.y,lookX:Math.cos(bot.root.rotation.y)*(ball.pos.x-opponent.pos.x)-Math.sin(bot.root.rotation.y)*(ball.pos.z-opponent.pos.z),split:Math.max(0,1-(state.timer-(opponent.splitAt??-10))/.25),crossover:opponent.movementMode==='crossover',lunge:opponent.netLunge,netVariant:opponent.action,contact,impactOnly});
 if(impactOnly)return;
 bot.label.visible=state.controlsVisible&&!state.focus;bot.label.quaternion.copy(camera.quaternion);bot.label.rotation.x=0;bot.label.rotation.z=0;
}

function updateContactHint(){
 const halo=$('#contact-halo'),edge=$('#shuttle-indicator'),depthCue=$('#receive-cue');
 const playing=state.screen==='play'&&!state.focus;
 const thirdPerson=state.cameraMode==='third';
 const live=playing&&ball.active&&state.phase==='rally';
 const located=playing&&(live||['serve','serving','opponentServe'].includes(state.phase));
 const guide=located&&state.ballGuide;
 const receiving=live&&state.lastHitter==='opponent'&&ball.pos.z>=.38;
 const timingEnabled=thirdPerson&&receiving&&state.contactHint&&!state.aiming&&!state.aimAlt;
 const near=timingEnabled&&Math.hypot(ball.pos.x-player.pos.x,ball.pos.z-player.pos.z)<3.15&&ball.pos.y<3.7+state.jump;
 shuttleFootprint.visible=guide&&live&&ball.renderPos.y>.16&&Math.abs(ball.renderPos.x)<24&&Math.abs(ball.renderPos.z)<31;
 if(shuttleFootprint.visible){
  const height=clamp(ball.renderPos.y,0,9);
  shuttleFootprint.position.set(ball.renderPos.x,.014,ball.renderPos.z);
  shuttleFootprint.scale.setScalar(1+height*.105);
  shuttleFootprint.material.opacity=.42+height*.008;
 }
 shuttleHeightLine.visible=shuttleFootprint.visible&&receiving&&ball.renderPos.y>.65;
 if(shuttleHeightLine.visible){
  shuttleHeightLine.position.set(ball.renderPos.x,.018,ball.renderPos.z);
  shuttleHeightLine.scale.y=ball.renderPos.y-.06;
  shuttleHeightLine.material.scale=shuttleHeightLine.scale.y;
 }
 const intercept=state.prediction?.intercept;
 receiveMarker.visible=Boolean(guide&&live&&state.lastHitter==='opponent'&&intercept&&Math.abs(intercept.x)<3.1&&intercept.z<7.1&&
   ball.pos.y>intercept.y-.12&&ball.pos.z<=intercept.z+.15);
 if(receiveMarker.visible){
  const stance=receivingTarget(state.prediction,player.pos);
  receiveMarker.position.set(stance.x,.022,stance.z);
  const depth=stance.z-player.pos.z;
  const projected=tmp.set(stance.x,.02,stance.z).project(camera);
  const visible=projected.z>=-1&&projected.z<=1&&Math.abs(projected.x)<.86&&Math.abs(projected.y)<.79;
  depthCue.classList.toggle('hidden',Math.abs(depth)<.55);
  if(Math.abs(depth)>=.55){
   depthCue.style.left=visible?(projected.x*.5+.5)*100+'%':'50%';
   depthCue.style.top=visible?(-projected.y*.5+.5)*100+'%':'77%';
   depthCue.textContent=`${depth>0?'↓ 后退':'↑ 上前'} ${Math.abs(depth).toFixed(1)} m`;
  }
 }else depthCue.classList.add('hidden');
 if(!live||(!guide&&!near)){
  halo.classList.add('hidden');edge.classList.add('hidden');return;
 }
 const cue=shuttleScreenCue(tmp.copy(ball.renderPos).applyMatrix4(camera.matrixWorldInverse),camera.fov,camera.aspect);
 edge.classList.toggle('hidden',!guide||!cue.edge);
 if(guide&&cue.edge){
  edge.style.left=(cue.x*.5+.5)*100+'%';edge.style.top=(-cue.y*.5+.5)*100+'%';
  edge.style.setProperty('--shuttle-arrow',cue.angle+'deg');
 }
 if(!near||cue.edge){halo.classList.add('hidden');return;}
 const queued=near&&(hitIntent.armed(state.timer)||(state.swing>0&&!state.swingMissed&&!state.swingContact));
 let ready=false;
 if(near&&!queued&&state.swing===0&&contactReady(true)){
  const kind=selectedSwingKind('auto');
  ready=!!playerSwingWindow(kind,0,playerContactDelay(kind));
 }
 const timing=queued?'queued':ready?'ready':'near';
 if(halo.dataset.timing!==timing)halo.dataset.timing=timing;
 halo.style.left=(cue.x*.5+.5)*100+'%';halo.style.top=(-cue.y*.5+.5)*100+'%';
 halo.classList.remove('hidden');
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
  const depth=-tmp.copy(ball.renderPos).applyMatrix4(camera.matrixWorldInverse).z;
  shuttle.scale.setScalar(groundMotion?1:shuttleVisualScale(depth));
  const height=clamp(ball.renderPos.y,0,10);
  shuttleShadow.position.set(ball.renderPos.x,.016,ball.renderPos.z);
  shuttleShadow.scale.setScalar(.69+Math.sqrt(height)*.30);
  shuttleShadow.material.opacity=.50/(1+height*.19);
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
  updateContactHint();
  // World, racket and feather motion remain at the full render rate. Small
  // DOM indicators only need 30 Hz; avoid styling hidden tactical widgets 60×/s.
  if(state.timer>=lastEffectsUI&&state.timer-lastEffectsUI<1/30)return;
  lastEffectsUI=state.timer;
  const ready = contactReady();
  $('#reticle').classList.toggle('ready', ready); $('#reticle').classList.toggle('charging', hitIntent.armed(state.timer) && state.phase === 'rally');
  const armed = hitIntent.armed(state.timer), receiving = ball.active && state.lastHitter==='opponent';
  const lessonCue=state.tutorial&&state.tutorialStage<2?(state.tutorialStage===0?'先用 WASD 走两步':'按一下空格，跳起来'):state.phase==='lesson'?'练习完成 · 可以开始比赛':null;
  const cue = lessonCue || (state.phase==='serve' ? '左键发球 · 空格起跳' : state.phase==='point' ? '稍作休息，下一分马上开始' : armed ? `${hitIntent.kind==='smash'?'杀球':hitIntent.kind==='auto'?'智能回球':'回球'}已预备 · 到位自动挥拍` : ready ? '现在左键智能回球 · 右键杀球' : receiving ? '来球了 · 左键智能接球' : '左键智能回球，按住也会持续接球');
  if(cue!==state.cue){state.cue=cue;$('#easy-cue-text').textContent=cue;}
  $('#easy-cue').classList.toggle('armed',armed);$('#easy-cue').classList.toggle('ready',ready);
  $('#aim-direction').textContent=state.mode==='targets'&&state.target?`目标 · ${state.target.name}`:state.aim<-.28?'左侧空当':state.aim>.28?'右侧空当':'回到中路';
  $('#aim-marker').style.left = `${((state.aim + 1) / 2) * 100}%`;
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
  const target = locked || selectedLanding(kind);
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
  $('#view-status').textContent=(state.cameraMode==='third'?'第三人称 · F2 切换 · Y 镜头归正 · ':'第一人称 · F2 切换 · ')+(state.aiming?'调落点中 · T 返回视角':state.aimAlt?'Alt 调落点中':state.comfortable?'跟球辅助 · V 关闭':document.pointerLockElement===canvas?'鼠标自由视角 · Esc 暂停':'鼠标自由视角 · 点击球场锁定鼠标');
  const steps={'split':'分腿启动','net-approach':'蹬跨上网','crossover':'交叉后退','chasse':'并步侧移','ready':'持拍准备','recover':'回动守中'};
  const activity=state.timer-(opponent.actionAt??-10)<1.25&&opponent.action?opponent.action:steps[opponent.movementMode]||'持拍准备';
  const weaknessLabel={backhand:'反手位',rear:'后退',net:'网前',body:'追身',recovery:'回位'}[opponent.lastWeakness];
  const observed=weaknessLabel&&opponent.exposure[opponent.lastWeakness]>=2;
  const adjusted=(opponent.adaptation[opponent.lastWeakness]||0)>.35;
  const weakValue=opponent.weaknesses[opponent.lastWeakness]||0;
  const weakThreshold=Math.max(...Object.values(opponent.weaknesses))*.85;
  const observation=observed?(adjusted?` · 已加强${weaknessLabel}`:weakValue>=weakThreshold?` · 可尝试${weaknessLabel}`:` · ${weaknessLabel}防守较稳`):'';
  $('#opponent-action').textContent=currentOpponentLevel().name+' · '+currentMatchIntent().name+' · '+activity+observation;
  const tacticReadout=$('#tactic-readout');if(tacticReadout)tacticReadout.textContent=state.tacticMessage||'观察对手回位，下一拍换线';
  const last=state.lastPlacement?.landing;$('#landing-last').classList.toggle('hidden',!last);
  if(last){$('#landing-last').style.left=`${clamp((last.x/5.18+.5)*100,1,99)}%`;$('#landing-last').style.top=`${clamp((last.z+6.7)/6.7*100,1,99)}%`;}
  const intended=state.lastPlacement?.intended;
  const status=state.lastPlacement?.status;
  let caption='青点是目标 · 白点是预计落点';
  if(status==='net')caption='上拍下网';
  else if(status==='out'&&!last)caption='上拍飞出场外';
  else if(status==='returned')caption='对手已接回 · 白点是原预计落点';
  else if(last&&intended){
    const distance=Math.hypot(last.x-intended.x,last.z-intended.z).toFixed(2);
    caption=(status==='flying'?'预计落点':status==='out'?'实际落点 · 出界':'实际落点')+' · 距目标 '+distance+' m';
  }
  $('#landing-result').textContent=caption;
  for(const button of document.querySelectorAll('[data-landing]')){const p=LANDING_PRESETS[Number(button.dataset.landing)];button.setAttribute('aria-pressed',String(Math.hypot(target.x-p.x,target.z-p.z)<.2));}
}

function updateHud() {
  document.body.classList.toggle('serving',state.screen==='play'&&['serve','serving','opponentServe'].includes(state.phase));
  $('#shot-cue').classList.toggle('visible',state.screen==='play'&&state.timer<state.shotCueUntil);
  const cue=$('#placement-cue');cue.classList.toggle('hidden',state.screen!=='play'||!$('#placement-hint').checked||state.phase!=='rally');
  if(!cue.classList.contains('hidden')){const locked=state.swing>0&&!state.swingContact&&state.swingTarget,target=locked||selectedLanding();cue.textContent=`${locked?'起拍已锁定':'下一拍'} · ${landingName(target)} · ${Math.abs(target.x).toFixed(1)}m / ${Math.abs(target.z).toFixed(1)}m`;}
  $('#serve-key').textContent=state.phase==='opponentServe'?'接发':coarse?'智能回球':'左键';
  const serveSwitch=$('#switch-serve');
  serveSwitch.hidden=!(coarse&&state.phase==='serve'&&state.screen==='play'&&!training&&!state.tutorial&&state.mode!=='targets');
  if(state.phase==='serving')$('#serve-copy').textContent='轻抛后向前送拍 · 发球中';
  else if(state.phase==='serve'){
    const court=state.mode==='match'&&!training&&!state.tutorial?(singlesServiceSide('player',state.score)>0?'右区 · ':'左区 · '):'';
    const high=state.serveStyle==='high';
    const switchLabel=high?'改发低手':'改发高远';
    if(!serveSwitch.hidden)serveSwitch.textContent=switchLabel;
    $('#serve-copy').textContent=state.mode==='targets'?'开始喂球':court+(high?'高远发球':'低手发球')+(coarse?'':' · G '+switchLabel);
  }
  const trainingHud = $('#training-hud');
  trainingHud.classList.toggle('hidden', !training || state.screen !== 'play');
  if (training) {
    const { completed, rep } = training;
    const last = completed.at(-1);
    const index = Math.min(TRAINING_REPS, completed.length + (state.phase === 'point' ? 0 : 1));
    $('#game-mode').textContent = `${rep.name} · ${index}/${TRAINING_REPS}`;
    $('#player-score').textContent = String(completed.filter(row => row.success).length).padStart(2,'0');
    $('#opponent-score').textContent = String(completed.length).padStart(2,'0');
    const cue = state.phase === 'point' ? last.reason : state.phase === 'feed' ? `准备接球 · ${rep.hint}` : rep.hint;
    if (trainingHud.textContent !== cue) trainingHud.textContent = cue;
    trainingHud.dataset.result = state.phase === 'point' ? String(last.success) : '';
  } else if (state.mode === 'targets') {
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

function ballTimeScale(hitter=state.lastHitter){
 const tempo=state.pace;
 return hitter==='opponent'&&state.phase==='rally'?tempo*state.receivePace:tempo;
}
function fixedUpdate(dt) {
  if (state.screen !== 'play') return;
  for(const entity of [player,opponent,ball])entity.previous.copy(entity.pos);
  state.timer += dt;
  if (state.hitstop > 0) { state.hitstop -= dt; return; }
  if (state.phase==='serve' && hitIntent.sources.size>0) serve();
  const pad = pollGamepad();
  updatePlayer(dt, pad); updateOpponent(dt); updateSwing(dt); handleHitIntent(); updateBall(dt*ballTimeScale());
  if (state.phase === 'feed') {
    state.countdown -= dt;
    if (state.countdown <= 0) releaseTrainingRep();
  }
  if (reviewPending >= 0 && state.timer >= reviewPending && state.phase === 'point') { openLineReview(true); return; }
  if(state.phase==='serving'){state.serveElapsed+=dt;const t=clamp(state.serveElapsed/.2,0,1);ball.pos.set(player.pos.x-.1,1.16+Math.sin(t*Math.PI)*.25-t*.035,player.pos.z-1.05);state.contactPoint=ball.pos.clone();if(state.serveElapsed>=.2)releaseServe();}
  if(state.phase==='serve')ball.pos.set(player.pos.x-.1,1.16+Math.sin(state.timer*2.5)*.018,player.pos.z-1.05);
  if (state.phase === 'point') {
    state.pointDelay -= dt;
    if (state.pointDelay <= 0) {
      if (training?.completed.length === TRAINING_REPS) pauseGame();
      else if (state.finished) pauseGame(true);
      else { player.pos.z = damp(player.pos.z, 4.45, 2, dt); prepareServe(); if (state.mode === 'practice' || state.mode === 'targets') state.countdown = 1.15; }
    }
  }
  if (state.countdown > 0 && state.phase === 'serve') { state.countdown -= dt; if (state.countdown <= 0) serve(); }
  if(state.phase==='opponentServe'){
    state.countdown-=dt;ball.pos.set(opponent.pos.x,1.15,opponent.pos.z+.65);
    if(state.countdown<.3&&opponent.swing===0){opponent.swing=.001;opponent.shot='serve';opponent.contactPoint=ball.pos.clone();}
    if(state.countdown<=0){state.phase='rally';ball.active=true;state.lastHitter='opponent';state.rally=1;state.serveCount++;opponent.returns=0;opponent.swing=.24;opponent.shot='serve';opponent.contactPoint=ball.pos.clone();ball.spin=0;ball.spinAt=state.timer;const target=opponentServeTarget({level:currentOpponentLevel(),serverSide:singlesServiceSide('opponent',state.score),random});state.lastShot={type:'serve',intended:{...target}};ball.vel.copy(solveShot(ball.pos,target,'serve',{up:6,step:ballTimeScale('opponent')/120}));ball.previous.copy(ball.pos);refreshPrediction();hitSound('serve',true);}
  }
}

function animate() {
  if(graphicsLost)return;
  const frameNow=performance.now(),rawFrameMs=renderBudget.take(frameNow,{screen:state.screen,hidden:document.hidden});
  if(rawFrameMs===null)return;
  lastFrameTime=frameNow;
  if(state.screen==='racket-inspect'){racketGallery.render(renderer);return;}
  if(state.screen==='play'&&qualityMode==='auto'&&adaptiveResolution.sample(rawFrameMs,frameNow))applyRenderProfile();
  if(frameProbe){
    if(frameProbe.warmup-->0){}else {frameProbe.started??=frameNow;frameProbe.memoryStart??={...renderer.info.memory};frameProbe.samples.push(rawFrameMs);}
    const duration=frameNow-(frameProbe.started??frameNow),done=frameProbe.durationMs?duration>=frameProbe.durationMs:frameProbe.samples.length>=180;
    if(done){
      const raw=frameProbe.samples,times=[...raw].sort((a,b)=>a-b),mean=raw.reduce((a,b)=>a+b,0)/raw.length;
      const segmentFps=a=>Math.round(10000/(a.reduce((x,y)=>x+y,0)/a.length))/10;
      $('#test-result').textContent=JSON.stringify({type:'real animation frames',frames:times.length,durationSeconds:Math.round(duration/100)/10,averageFps:Math.round(10000/mean)/10,medianMs:Math.round(times[Math.floor(times.length*.5)]*10)/10,p95Ms:Math.round(times[Math.floor(times.length*.95)]*10)/10,first300Fps:segmentFps(raw.slice(0,300)),last300Fps:segmentFps(raw.slice(-300)),memoryStart:frameProbe.memoryStart,memoryEnd:{...renderer.info.memory},viewport:[innerWidth,innerHeight],pixelRatio:renderer.getPixelRatio(),quality:presentation.quality,drawCalls:presentation.sceneInfo.calls,triangles:presentation.sceneInfo.triangles,hits:state.hits,points:state.score},null,2);
      frameProbe=null;pauseGame();
    }
  }
  const dt = Math.min(rawFrameMs/1000, .06); state.elapsed += dt; fps = damp(fps, 1 / Math.max(dt, .001), 1, dt);
  if(state.screen!=='hand-inspect')shuttle.visible=!['inspect','equipment-inspect','racket-inspect'].includes(state.screen);
  if (state.screen === 'menu') {
    menuTime += dt; camera.position.set(10.4 + Math.sin(menuTime * .1) * .5, 5.1 + Math.sin(menuTime * .13) * .1, 11.8); camera.lookAt(-.4, .85, -.8); camera.fov = 51; camera.updateProjectionMatrix();
    bot.root.position.set(-.6,0,-4.3);bot.root.rotation.y=0;bot.label.visible=true;bot.update({time:menuTime,dt});
    shuttle.position.set(.3, 1.3 + Math.sin(menuTime * 1.7) * .08, 4.2); shuttle.rotation.set(.2, menuTime * .25, -.3); shuttleShadow.position.set(.3, .012, 4.2); shuttleShadow.scale.setScalar(1); landingMarker.visible = false; targetMarker.visible = false;aimMarker.visible=false; racket.visible = false;
  } else if(state.screen==='inspect'){
    state.inspectTime=(state.inspectTime||0)+dt;const time=state.inspectTime,pose=state.inspectPose||'idle';
    const avatar=ensurePlayerAvatar();avatar.root.position.set(0,0,2.8);avatar.root.rotation.y=0;
    avatar.update({time,dt,speed:pose==='run'?3.5:0,swing:pose==='swing'&&time%1.4<.55?Math.max(.001,time%1.4):0,shot:'clear'});
    const yaw=state.inspectYaw??.30,distance=state.inspectDistance||3.1,pitch=state.inspectPitch||.12;
    const focus=avatar.head.getWorldPosition(inspectCenter);
    const wide=clamp((distance-1)/2.6,0,1);
    focus.lerp(avatar.root.position,wide*.47);
    camera.position.set(focus.x+Math.sin(yaw)*distance,focus.y+pitch*distance,focus.z+Math.cos(yaw)*distance);
    camera.fov=42;camera.lookAt(focus);camera.updateProjectionMatrix();
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
    positionServeHand(null,supportHandPose({swing:elapsed<.6?elapsed:0,kind:state.inspectStroke,time:state.inspectTime}));
  } else if (state.screen === 'play') {
    shuttleShadow.visible=true;
    // Catch up ordinary frame drops without accumulating a backlog after a stall.
    accumulator += Math.min(rawFrameMs/1000,.1);
    for (let n = 0; accumulator >= 1 / 120 && n < 12; n++) { fixedUpdate(1 / 120); accumulator -= 1 / 120; }
    for(const entity of [player,opponent,ball])entity.renderPos.lerpVectors(entity.previous,entity.pos,clamp(accumulator*120,0,1));
    if(state.impactFrame&&ball.active)ball.renderPos.copy(state.impactFrame==='player'?state.contactPoint:opponent.contactPoint);
    const pointAge=standReaction&&state.phase==='point'?state.timer-standReaction.start:-1;
    audienceGroup.userData.updateCrowd(state.timer,pointAge,standReaction?.power||0,state.phase==='rally'?clamp((state.rally-4)/7,0,1):0,standReaction?.side||0);
    const courtTarget=state.phase==='rally'?ball.renderPos:state.server==='player'?player.renderPos:opponent.renderPos;
    const gaze=clamp(Math.atan2(courtTarget.x-umpire.root.position.x,courtTarget.z-umpire.root.position.z)-umpire.root.rotation.y,-.75,.64);
    umpire.pivot.rotation.y=damp(umpire.pivot.rotation.y,gaze,4,dt);
    umpire.pivot.rotation.x=damp(umpire.pivot.rotation.x,state.phase==='point'?.22:clamp((2.4-courtTarget.y)*.09,-.2,.14),5,dt);
    updateCamera(dt);updateOpponentModel(dt);updateEffects(dt);state.impactFrame=null; racket.visible = state.cameraMode==='first';
    if (state.elapsed - lastHud > .075) { updateHud(); lastHud = state.elapsed; }
  }
  if(state.screen!=='play'&&state.screen!=='overhead-preview')shuttleFootprint.visible=receiveMarker.visible=shuttleHeightLine.visible=false;
  if (state.screen === 'review') eagleEye.update(dt);
  if(state.screen==='menu'&&racket.userData.support)racket.userData.support.visible=false;
  syncPlayerVisibility();
  updateShuttleSound();
  if(racket.userData.updateArm&&racket.visible)racket.userData.updateArm();
  presentation.render(scene,camera);
}

function requestLock() {
  if (document.pointerLockElement===canvas || coarse || testing || state.comfortable || graphicsLost) return;
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
  finished=finished||state.finished;
  standAudio?.quiet();if(!finished)stopStandCheer();
  $('#contact-halo').classList.add('hidden');$('#shuttle-indicator').classList.add('hidden');$('#receive-cue').classList.add('hidden');
  shuttleFootprint.visible=receiveMarker.visible=shuttleHeightLine.visible=false;
  state.screen = 'pause'; keys.clear();state.aiming=false;state.aimAlt=false;document.body.classList.remove('choosing-landing'); pointerDown = false; gamepadHitHeld = false; gamepadJumpHeld = false; hitIntent.clear();jumping.cancelBuffer(); touchMove.x = touchMove.y = 0;
  // Release capture before showing the modal so the OS cursor is usable in
  // the settings panel and can move to other windows while paused.
  document.exitPointerLock?.();
  const won=state.score[0]>state.score[1],champion=Boolean(finished&&won&&state.tournamentId&&tour?.completed),opponentName=tourStar(state.currentOpponentId)?.name||'对手';
  document.body.classList.toggle('match-finished',finished);document.body.classList.toggle('match-victory',finished&&won);document.body.classList.toggle('match-champion',champion);
  $('#pause-title').textContent = finished ? (champion?'冠军属于你。':won?'这一场，属于你。':'下一场，再把它赢回来。') : '休息一下。';
  $('#pause-description').textContent = finished ? `${opponentName} · 最终比分 ${state.score[0]} : ${state.score[1]} · ${opponentLevel(state.difficulty).name}` : '鼠标已交还桌面，可操作其他窗口；继续比赛时重新锁定。';
  $('#match-result').classList.toggle('hidden',!finished);
  $('#match-result').dataset.outcome=champion?'champion':won?'win':'loss';
  if(finished){
    $('#result-more').open=false;$('#result-highlight').textContent=career.history.find(h=>h.id===state.matchId)?.highlight||matchHighlight(matchTactics.points);
    $('#result-cup-label').textContent=state.tournamentId?tourEvent(state.tournamentId).name+' · '+tourEvent(state.tournamentId).rounds[state.tournamentRound]:'单打挑战';
    $('#result-outcome').textContent=champion?'捧起冠军奖杯！':won?'拿下这场！':'本场惜败';
    $('#result-player-name').textContent=PLAYER_NAME;$('#result-opponent-name').textContent=opponentName;
    $('#result-mine').textContent=state.score[0];$('#result-theirs').textContent=state.score[1];
    const standings=worldStandings(career,PLAYER_NAME);
    const moved=(state.worldRankBefore??standings.player.rank)-standings.player.rank;
    const change=moved>0?'上升 '+moved+' 位':moved<0?'下降 '+(-moved)+' 位':'持平';
    $('#result-world').textContent=`世界第 ${standings.player.rank} 名 · ${change}　↗`;
    $('#result-world-target').textContent=rankTarget(standings);
    $('#result-rating').textContent=`${state.ratingDelta>=0?'+':''}${state.ratingDelta}`;
    $('#result-smashes').textContent=String(state.winners);$('#result-forced').textContent=String(matchTactics.points.filter(p=>p.scoring==='forced').length);$('#result-hits').textContent=String(state.hits);$('#result-errors').textContent=String(state.errors);
    $('#result-rally').textContent=String(Math.max(state.maxRally,state.rally));$('#result-speed').textContent=String(state.maxSpeed);
    $('#result-detail').textContent=`生涯 ${career.wins} 胜 ${career.played-career.wins} 负 · 最长连胜 ${career.bestStreak}`;
  }
  const next=$('#tour-next');if(next){const tournamentMatch=Boolean(state.tournamentId);next.classList.toggle('hidden',!finished||!tournamentMatch);document.body.classList.toggle('tournament-finished',finished&&tournamentMatch);next.textContent=tour?.completed?'返回赛事中心':tour?.eliminated?'重新报名':currentTourMatch(tour)?'进入'+currentTourMatch(tour).round+' · 对阵'+currentTourMatch(tour).opponent.name:'进入下一轮';}
  $('#stat-rally').textContent = Math.max(state.maxRally, state.rally); $('#stat-hits').textContent = state.hits; $('#stat-speed').textContent = state.maxSpeed;
  const trainingComplete = updateTrainingResult();
  const tactical = $('#tactical-report');
  if (training) {
    tactical?.classList.add('hidden');
    $('#pause-title').textContent = trainingComplete ? '八球训练完成' : '训练已暂停';
    $('#pause-description').textContent = TRAINING_NAMES[training.mode];
  } else {
    updateTacticalReport();
    $('#tactical-report').classList.remove('hidden');
  }
  $('#result-rematch').hidden=!(finished&&!won&&!state.tournamentId);
  $('#resume-btn').innerHTML = trainingComplete ? '再练一组 <span>↗</span>' : training ? '继续训练 <span>→</span>' : finished ? '再来一场 <span>↗</span>' : '继续比赛 <span>→</span>';
  $('#resume-btn').classList.toggle('hidden', trainingComplete || (finished && Boolean(state.tournamentId)));
  $('#restart-btn').classList.toggle('hidden', trainingComplete);
  $('#pause-overlay').classList.remove('hidden');
  if (trainingComplete||finished) $('.pause-modal').scrollTop = 0;
  updateHud();
}
function updateTacticalReport(){
  let panel=$('#tactical-report');
  if(!panel){panel=document.createElement('section');panel.id='tactical-report';panel.setAttribute('aria-label','本场战术与挑战');$('.pause-stats').after(panel);}
  const names={clear:'高远',drop:'吊球',slicedrop:'劈吊',net:'搓球',netcross:'勾对角',push:'推后场',drive:'平抽',lift:'挑球',smash:'杀球',slicesmash:'劈杀',netkill:'扑球'};
  panel.replaceChildren();
  const heading=document.createElement('h3');heading.textContent='本场战术';panel.append(heading);
  const intent=currentMatchIntent(),identity=document.createElement('p');identity.textContent=`对手：${intent.name} · ${intent.label}`;panel.append(identity);
  const methods=document.createElement('p');methods.textContent=Object.entries(matchTactics.methods).map(([key,count])=>`${names[key]||key} ${count} 分`).join(' · ')||'还没有制胜球。试试先拉后场，再吊网前。';panel.append(methods);
  const weak=document.createElement('p');const labels={backhand:'反手位',rear:'后退',net:'网前',body:'追身',recovery:'回位'};
  const entries=Object.entries(opponent.weaknesses).sort((a,b)=>b[1]-a[1]).slice(0,2);
  weak.textContent=`对手观察：${entries.map(([key])=>`${labels[key]}${(opponent.adaptation[key]||0)>.35?'已加强防守':'可尝试调动'}`).join(' · ')}。连续打同一区域后，突然变线。`;panel.append(weak);
  const latest=matchTactics.lastResult;if(latest){const review=document.createElement('div');review.className='point-analysis';const title=document.createElement('b');title.textContent=`上一分 · ${latest.detail}`;const tip=document.createElement('p');tip.textContent=latest.tip;review.append(title,tip);panel.append(review);}
  for(const objective of MATCH_OBJECTIVES){
    const progress=Math.min(objective.goal,matchTactics.counts[objective.key]),row=document.createElement('div');row.className='tactical-objective';row.dataset.complete=String(progress>=objective.goal);
    const label=document.createElement('span');label.textContent=`${progress>=objective.goal?'✓ ':''}${objective.name}`;
    const value=document.createElement('b');value.textContent=`${progress} / ${objective.goal}`;
    const text=document.createElement('small');text.textContent=objective.description;
    row.append(label,value,text);panel.append(row);
  }
}
function resumeGame() {
  if (training?.completed.length === TRAINING_REPS) { startGame('training', true); return; }
  if (state.finished) { if(state.tournamentId){$('#pause-overlay').classList.add('hidden');openTourHub();return;}launchMatch('match');$('#pause-overlay').classList.add('hidden');return; }
  state.screen = 'play'; $('#pause-overlay').classList.add('hidden'); $('#help-overlay').classList.add('hidden'); accumulator = 0; clock.getDelta();canvas.focus({preventScroll:true}); requestLock(); initAudio();
}
function exitGame() {
  standReaction=null;stopStandCheer();standAudio?.quiet();
  if(bot)bot.root.visible=true;
  state.screen = 'menu'; training = null; ball.active = false; keys.clear(); pointerDown = false;hitIntent.clear();
  $('#placement-cue').classList.add('hidden');$('#shot-cue').classList.remove('visible');
  document.exitPointerLock?.(); document.body.classList.remove('playing','training-mode'); $('#pause-overlay').classList.add('hidden'); $('#help-overlay').classList.add('hidden'); $('#hud').classList.add('hidden'); $('#menu').classList.remove('hidden');
  $('#showroom').classList.add('hidden');shuttleShadow.visible=true;
}
function showHelp() {
  if (state.screen === 'play') pauseGame();
  $('#help-overlay').classList.remove('hidden');
}
function hideHelp() { $('#help-overlay').classList.add('hidden'); }

function setFocus(value){state.focus=Boolean(value);document.body.classList.toggle('focus',state.focus);$('#focus-toggle').checked=state.focus;$('#focus-btn').classList.toggle('active',state.focus);$('#focus-btn').setAttribute('aria-pressed',String(state.focus));}
function setComfortable(value){
 if(state.cameraMode==='first'&&state.comfortable&&!value){state.manualPitch=state.pitch;state.autoPitchOffset=0;}
 state.comfortable=Boolean(value);$('#comfortable-toggle').checked=state.comfortable;
 syncControlScheme();
 if(state.comfortable)document.exitPointerLock?.();
}
function applyRenderProfile(){
 const width=innerWidth,height=innerHeight;
 camera.aspect=width/height;camera.updateProjectionMatrix();
 const profile=renderProfile(qualityMode,adaptiveResolution.scale,width,height,devicePixelRatio);
 renderer.setPixelRatio(profile.ratio);renderer.setSize(width,height);renderer.shadowMap.enabled=profile.shadows;renderer.shadowMap.needsUpdate=true;
 presentation.setQuality(profile.quality);presentation.setSize(width,height);renderBudget.invalidate();
}
function applyQuality(quality){qualityMode=['auto','balanced','high','ultra'].includes(quality)?quality:'auto';adaptiveResolution.reset(performance.now());applyRenderProfile();}
function savePreferences(){if(testing)return;try{localStorage.setItem('feather-court-3-settings',JSON.stringify({contactHint:state.contactHint,ballGuide:state.ballGuide,thirdFraming:state.thirdFraming,cameraMode:state.cameraMode,orbitYaw:state.orbitYaw,orbitPitch:state.orbitPitch,standVolume:state.standVolume,controlsChosen:state.controlsChosen,assistSettingsVersion:1,assists:$('#assist-toggle').checked,autoReturn:$('#auto-return-toggle').checked,comfortable:$('#comfortable-toggle').checked,difficulty:$('#difficulty').value,scheme:$('#control-scheme').value,points:$('#match-points').value,quality:$('#quality').value,performanceVersion:1,focus:state.focus,motion:state.motion,sensitivity:state.sensitivity,lookSyncVersion:2,pace:state.pace,receivePaceVersion:2,receivePace:state.receivePace,sprintAssist:state.sprintAssist,sound:state.sound,racketStyle:state.racketStyle,racketSkin:state.racketSkin,playerStats:playerStatsFromInputs(),opponentStats:state.opponentStats,highBallAssist:$('#high-ball-toggle').checked,placementHint:$('#placement-hint').checked,eagleAuto:$('#eagle-auto').checked}));}catch{}}
function restorePreferences(){
  try { const settings=JSON.parse(localStorage.getItem('feather-court-3-settings')||'{}');$('#eagle-auto').checked=settings.eagleAuto!==false; } catch {}
  $('#eagle-auto').addEventListener('change',savePreferences);
  try{if(!testing)career=parseCareer(localStorage.getItem(CAREER_KEY));}catch{}loadTour();updateCareerUI();let prefs={};
  try{if(!testing)prefs=JSON.parse(localStorage.getItem('feather-court-3-settings')||'{}');}catch{}
  state.standVolume=Number.isFinite(prefs.standVolume)?clamp(prefs.standVolume,0,1):.75;
  $('#stand-volume').value=Math.round(state.standVolume*100);
  $('#stand-volume').addEventListener('input',e=>{state.standVolume=Number(e.target.value)/100;standAudio?.volume(state.standVolume);savePreferences();});
  state.controlsChosen=prefs.controlsChosen??(prefs.assistSettingsVersion===1);
  if(prefs.assistSettingsVersion!==1){prefs.assists=false;prefs.comfortable=false;prefs.highBallAssist=true;prefs.scheme='manual';$('#control-scheme').value='manual';}
  for(const [key,id] of [['points','match-points'],['difficulty','difficulty'],['scheme','control-scheme'],['quality','quality']])if(prefs[key]&&[...$('#'+id).options].some(o=>o.value===prefs[key]))$('#'+id).value=prefs[key];
  if(prefs.performanceVersion!==1)$('#quality').value='auto';
  setFocus(prefs.focus||false);state.motion=Number.isFinite(prefs.motion)?clamp(prefs.motion,0,1):.35;$('#motion').value=state.motion;
  const oldSensitivity=Number.isFinite(prefs.sensitivity)?clamp(prefs.sensitivity,.25,2):1;state.sensitivity=prefs.lookSyncVersion===2?oldSensitivity:clamp(oldSensitivity*1.35,.25,2);$('#sensitivity').value=state.sensitivity;
  if(prefs.lookSyncVersion!==2&&!testing){prefs.sensitivity=state.sensitivity;prefs.lookSyncVersion=2;try{localStorage.setItem('feather-court-3-settings',JSON.stringify(prefs));}catch{}}
  state.pace=[.8,1,1.2].includes(prefs.pace)?prefs.pace:1;$('#pace').value=state.pace;if(typeof prefs.sound==='boolean')state.sound=prefs.sound;
  state.receivePace=prefs.receivePace===.6||prefs.receivePaceVersion===2&&prefs.receivePace===.74?prefs.receivePace:1;
  $('#receive-pace').value=state.receivePace;
  state.sprintAssist=$('#sprint-assist').checked=prefs.sprintAssist!==false;
  refreshRacketOptions();applyRacketStyle(prefs.racketStyle||'attack');applyRacketSkin(prefs.racketSkin||'astrox100zz');
  const savedPlayer=prefs.playerStats||(prefs.playerStyle?playerStatsForStyle(prefs.playerStyle):normalizeSkills());
  techniquePanel.write('player',savedPlayer);refreshPlayerStats();
  state.opponentStats=normalizeSkills(prefs.opponentStats);techniquePanel.write('opponent',state.opponentStats);
  $('#placement-hint').checked=prefs.placementHint===true;
  state.assists=$('#assist-toggle').checked=prefs.assists===true;
  state.autoReturn=$('#auto-return-toggle').checked=prefs.autoReturn===true;
  state.comfortable=$('#comfortable-toggle').checked=prefs.comfortable===true;
  if(typeof prefs.highBallAssist==='boolean')state.highBallAssist=$('#high-ball-toggle').checked=prefs.highBallAssist;
  else state.highBallAssist=$('#high-ball-toggle').checked;
  state.contactHint=$('#contact-hint-toggle').checked=prefs.contactHint!==false;
  state.ballGuide=$('#ball-guide-toggle').checked=prefs.ballGuide!==false;
  state.thirdFraming=$('#third-framing').value=prefs.thirdFraming==='wide'?'wide':'near';
  const orbit=orbitLook({yaw:Number.isFinite(prefs.orbitYaw)?prefs.orbitYaw:0,pitch:Number.isFinite(prefs.orbitPitch)?prefs.orbitPitch:THIRD_PERSON_PITCH});state.orbitYaw=orbit.yaw;state.orbitPitch=orbit.pitch;setCameraMode(testing?'first':prefs.cameraMode);
  if(prefs.assistSettingsVersion!==1)savePreferences();
  applyQuality($('#quality').value);updateDifficultyUI();updateCharacterPreview();
}
function showPlayer(){const avatar=ensurePlayerAvatar();for(const [material,original] of avatar.fadeMaterials)material.opacity=original;avatar.coverage=1;avatar.resetFeet();bot.root.visible=false;state.screen='inspect';state.inspectYaw=.08;state.inspectDistance=.83;$('#showroom-framing').textContent='看全身';state.inspectPitch=.035;state.inspectPose='idle';state.inspectTime=0;keys.clear();hitIntent.clear();document.exitPointerLock?.();$('#menu').classList.add('hidden');$('#hud').classList.add('hidden');$('#showroom').classList.remove('hidden');$('#pause-overlay').classList.add('hidden');document.body.classList.remove('playing');}

function bindEvents() {
  for(const button of document.querySelectorAll('[data-world-table]'))button.addEventListener('click',openWorldBoard);
  $('#switch-serve').addEventListener('click',toggleServeStyle);
  for(const button of document.querySelectorAll('[data-home-open]')){
    button.addEventListener('click',()=>document.getElementById(button.dataset.homeOpen).showModal());
  }
  for(const dialog of document.querySelectorAll('.lobby-dialog')){
    // Close before launching a second modal or entering the court.
    dialog.addEventListener('click',e=>{if(e.target.closest('button'))dialog.close();},true);
    dialog.addEventListener('keydown',e=>e.stopPropagation());
  }

  $('#placement-hint').addEventListener('change',savePreferences);

  updateCharacterPreview();
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
  for(const button of document.querySelectorAll('[data-open-rackets]'))button.addEventListener('click',()=>racketGallery.open());
  $('#showroom-framing').onclick=()=>{
    const full=state.inspectDistance<2;state.inspectDistance=full?3.2:.83;
    $('#showroom-framing').textContent=full?'看正脸':'看全身';
  };
  $('#showroom-btn').addEventListener('click',showPlayer);$('#showroom-close').addEventListener('click',exitGame);
  $('#photo-btn').addEventListener('click',()=>{presentation.render(scene,camera);const link=document.createElement('a');link.download='feather-court-5-photo.jpg';link.href=canvas.toDataURL('image/jpeg',.94);link.click();});
  for(const pose of ['idle','run','swing'])$('#pose-'+pose).addEventListener('click',()=>{state.inspectPose=pose;state.inspectTime=0;for(const name of ['idle','run','swing'])$('#pose-'+name).classList.toggle('active',name===pose);});
  $('#focus-btn').addEventListener('click',()=>setControlsVisible(!state.controlsVisible));$('#focus-toggle').addEventListener('change',e=>setFocus(e.target.checked));$('#motion').addEventListener('input',e=>state.motion=Number(e.target.value));
  for(const id of ['difficulty','match-points','quality','focus-toggle','motion','sensitivity','pace','assist-toggle','auto-return-toggle','comfortable-toggle'])$('#'+id).addEventListener('change',()=>savePreferences());
  $('#control-scheme').addEventListener('change',e=>{setAssist(e.target.value==='assisted');setComfortable(e.target.value==='tracking');savePreferences();});
  $('#shot-select').addEventListener('change',e=>{setShot(e.target.value);savePreferences();});$('#racket-style').addEventListener('change',e=>{applyRacketStyle(e.target.value);savePreferences();});$('#racket-skin').addEventListener('change',e=>{applyRacketSkin(e.target.value);savePreferences();});$('#high-ball-toggle').addEventListener('change',e=>{state.highBallAssist=e.target.checked;savePreferences();});
  $('#play-btn').addEventListener('click', () => launchMatch('match')); $('#practice-btn').addEventListener('click', () => startGame('practice')); $('#drill-btn').addEventListener('click', () => startGame('targets'));
  const trainingPicker = $('#training-picker');
  $('#training-btn').addEventListener('click', () => trainingPicker.showModal());
  $('#training-repeat').addEventListener('click', resumeGame);
  $('#training-change').addEventListener('click', () => { exitGame(); trainingPicker.showModal(); });
  for (const button of trainingPicker.querySelectorAll('[data-training]')) {
    button.addEventListener('click', () => {
      trainingMode = button.dataset.training;
      trainingPicker.close();
      startGame('training');
    });
  }
  populateOpponentStars();
  $('#assist-toggle').addEventListener('change',()=>{state.controlsChosen=true;savePreferences();});
  $('#open-tour-hub').addEventListener('click',()=>{if(tour&&!tour.eliminated&&!tour.completed)launchMatch('tournament');else openTourHub();});
  $('#tour-browse').addEventListener('click',openTourHub);
  $('#result-rematch').addEventListener('click',()=>{const id=state.currentOpponentId;$('#pause-overlay').classList.add('hidden');launchMatch('match',id);});
  $('#career-rematch').addEventListener('click',()=>{const id=$('#career-rematch').dataset.rival;if(TOUR_STARS[id]){document.querySelector('#player-locker [data-home-close]')?.click();launchMatch('match',id);}});$('#tour-close').addEventListener('click',closeTourHub);$('#tour-cancel').addEventListener('click',closeTourHub);$('#tour-enter').addEventListener('click',enterTournament);
  $('#open-trophies').addEventListener('click',openTrophyGallery);$('#trophy-close').addEventListener('click',()=>$('#trophy-gallery').classList.add('hidden'));
  $('#intro-close').addEventListener('click',()=>{
    $('#match-intro-overlay').classList.add('hidden');
    if(introPreviousMatch){Object.assign(state,introPreviousMatch);introPreviousMatch=null;}
    if(state.screen==='pause'){
      applyTournamentVenue(tourEvent(state.tournamentId||'olympics'));
      $('#pause-overlay').classList.remove('hidden');
    }else if(pendingMatchMode==='tournament'){updateCareerUI();openTourHub();}
  });
  $('#intro-enter').addEventListener('click',()=>{
    if(!$('#first-controls').hidden){state.controlsChosen=true;setAssist($('input[name="first-run"]:checked').value==='mouse');savePreferences();}
    introPreviousMatch=null;$('#match-intro-overlay').classList.add('hidden');startGame('match');
  });
  $('#tour-next').addEventListener('click',()=>{if(tour?.completed||tour?.eliminated){exitGame();openTourHub();return;}$('#pause-overlay').classList.add('hidden');launchMatch('tournament');});
  $('#pause-btn').addEventListener('click', () => pauseGame()); $('#resume-btn').addEventListener('click', resumeGame);
  $('#restart-btn').addEventListener('click', () => training ? startGame('training', true) : state.tournamentId?launchMatch('tournament'):launchMatch('match')); $('#exit-btn').addEventListener('click', exitGame);
  $('#brand-home').addEventListener('click',e=>{e.preventDefault();if(state.screen==='inspect')exitGame();else if(state.screen!=='menu')pauseGame();});
  $('#help-btn').addEventListener('click', showHelp); $('#close-help').addEventListener('click', hideHelp); $('#got-it').addEventListener('click', () => { hideHelp(); if (state.screen === 'pause') resumeGame(); });
  $('#sound-btn').addEventListener('click', () => { initAudio(); state.sound = !state.sound; if (master) master.gain.value = state.sound ? .5 : 0; $('#sound-btn').style.opacity = state.sound ? 1 : .4; $('#sound-btn').textContent = state.sound ? '♪' : '♩';savePreferences(); });
  $('#assist-toggle').addEventListener('change', e => setAssist(e.target.checked)); $('#sensitivity').addEventListener('input', e => state.sensitivity = Number(e.target.value));
  $('#auto-return-toggle').addEventListener('change',e=>{state.autoReturn=e.target.checked;});
  $('#comfortable-toggle').addEventListener('change', e => setComfortable(e.target.checked));
  $('#aim-left').addEventListener('click', () => state.aim = clamp(state.aim - .32, -1, 1));
  $('#aim-right').addEventListener('click', () => state.aim = clamp(state.aim + .32, -1, 1));
  $('#receive-pace').addEventListener('change',e=>{state.receivePace=Number(e.target.value);if(ball.active)refreshPrediction();savePreferences();});
  $('#sprint-assist').addEventListener('change',e=>{state.sprintAssist=e.target.checked;savePreferences();});
  $('#dash-btn').addEventListener('click', lunge);
  $('#pace').addEventListener('change', event=>{state.pace=Number(event.target.value);if(ball.active)refreshPrediction();savePreferences();});
  const aimCourt = $('#court-aim');
  const aimOnMap = event => {
    const bounds = aimCourt.getBoundingClientRect();
    chooseLanding(landingFromMap((event.clientX-bounds.left)/bounds.width,(event.clientY-bounds.top)/bounds.height*2));
  };
  aimCourt.addEventListener('pointerdown', event => { event.preventDefault(); aimCourt.setPointerCapture(event.pointerId); aimOnMap(event); });
  aimCourt.addEventListener('pointermove', event => { if (aimCourt.hasPointerCapture(event.pointerId)) aimOnMap(event); });
  $('#third-framing').addEventListener('change',e=>{state.thirdFraming=e.target.value;if(state.screen==='pause')updateCamera(0);renderBudget.invalidate();savePreferences();});
  $('#ball-guide-toggle').addEventListener('change',e=>{state.ballGuide=e.target.checked;updateContactHint();savePreferences();});
  $('#contact-hint-toggle').addEventListener('change',e=>{state.contactHint=e.target.checked;updateContactHint();savePreferences();});
  document.querySelectorAll('[data-camera-mode]').forEach(select=>select.addEventListener('change',e=>{setCameraMode(e.target.value);savePreferences();}));
  $('#quality').addEventListener('change',e=>{applyQuality(e.target.value);savePreferences();});
  document.querySelectorAll('[data-shot]').forEach(el => el.addEventListener('click', () => { setShot(el.dataset.shot);canvas.focus({preventScroll:true}); requestLock(); }));
  window.addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();applyRenderProfile();});
  window.addEventListener('contextmenu', e => { if (state.screen === 'play') e.preventDefault(); });
  window.addEventListener('keydown', e => {
    if(techniquePanel?.dialog.open||racketGallery?.dialog.open||trainingPicker.open)return;
    if (state.screen === 'review') {
      if (e.code === 'Escape' || e.code === 'KeyB') { e.preventDefault(); eagleEye.close(); }
      return;
    }
    if(e.code==='F2'&&['play','pause','menu'].includes(state.screen)){e.preventDefault();setCameraMode(toggleCameraMode(state.cameraMode));savePreferences();if(state.screen==='play')feedback(state.cameraMode==='third'?'第三人称':'第一人称','F2 切换视角 · WASD 跑位，鼠标转动，原有击球键不变');return;}
    const editing=/^(INPUT|SELECT|TEXTAREA)$/.test(e.target.tagName)||e.target.isContentEditable;
    if(editing&&e.code!=='Escape')return;
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(e.code) && state.screen === 'play') e.preventDefault();
    if (e.repeat) return;
    if (e.code === 'KeyB') { openLineReview(); return; }
    if (e.code === 'Escape' || e.code === 'KeyP') { if(['inspect','hand-inspect','shuttle-inspect','equipment-inspect','net-inspect','swing-inspect','overhead-preview'].includes(state.screen)){exitGame();$('#test-panel')?.classList.remove('hidden');$('#masthead')?.classList.remove('hidden');}else if (state.screen === 'play') pauseGame(); else if (state.screen === 'pause') resumeGame(); return; }
    if (state.screen !== 'play') return;
    if(['AltLeft','AltRight'].includes(e.code)){e.preventDefault();state.aimAlt=true;hitIntent.clear();}
    keys.add(e.code);
    performControl(keyCommand(e.code),e.code);
    if(e.code==='KeyY'&&state.cameraMode==='third'){
      state.orbitYaw=0;state.orbitPitch=THIRD_PERSON_PITCH;state.manualLookUntil=0;
    }
    if(e.code==='Tab')setAdvanced(!state.advanced);
    if(e.code==='KeyT')setAimEditor(!state.aiming);
    if (e.code === 'KeyF') setAssist(!state.assists);
    if(e.code==='KeyH')setControlsVisible(!state.controlsVisible);
    if (e.code === 'KeyV') {
      setComfortable(!state.comfortable);
      if (state.comfortable) document.exitPointerLock?.(); else requestLock();
      feedback(state.comfortable ? '跟球镜头' : '自由镜头', 'V 随时切换 · 跑位方向不受镜头影响');
    }
    if(e.code==='KeyG'){toggleServeStyle();return;}
    if (e.code === 'KeyR') { if (state.phase === 'serve') serve(); else lunge(); }
    if (e.code === 'ControlLeft' || e.code === 'ControlRight') { e.preventDefault(); lunge(); }
    if (e.code === 'KeyZ'||e.code==='KeyC') {chooseLanding({...selectedLanding(),x:selectedLanding().x+(e.code==='KeyZ'?-.65:.65)});showShotCue(state.shot);}
    if(e.code==='KeyX'){state.manualLanding=false;state.directionMode='natural';state.aim=0;state.depth=SHOT_DEPTHS[state.shot]??SHOT_DEPTHS.auto;updateTactics();showShotCue(state.shot);}
  });
  window.addEventListener('keyup', e => {keys.delete(e.code);hitIntent.release(e.code);if(['AltLeft','AltRight'].includes(e.code)){e.preventDefault();state.aimAlt=keys.has('AltLeft')||keys.has('AltRight');}});
  window.addEventListener('blur', () => { keys.clear();state.aimAlt=false; if (state.screen === 'play' && !testing) pauseGame(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden && state.screen === 'play' && !testing) pauseGame();renderBudget.invalidate(); });
  document.addEventListener('pointerlockchange', () => { if (!document.pointerLockElement && state.screen === 'play' && !state.aiming && !state.comfortable && !testing && !coarse) pauseGame(); });
  canvas.addEventListener('pointerdown', e => {
    if(state.screen==='inspect'){inspectDrag={x:e.clientX,y:e.clientY};canvas.setPointerCapture(e.pointerId);return;}
    if (state.screen !== 'play' || e.pointerType === 'touch') return;
    e.preventDefault();canvas.focus({preventScroll:true});
    if(!document.pointerLockElement)canvas.setPointerCapture(e.pointerId);
    if(state.aiming){setAimEditor(false);return;}requestLock();
    if(e.button===1){cycleShotDirection();return;}
    if(e.button===0)pointerDown=true;
    performControl(pointerCommand(e.button),e.button===2?'pointer-smash':'pointer');
  });
  canvas.addEventListener('auxclick',e=>{if(state.screen==='play')e.preventDefault();});
  window.addEventListener('pointerup', e => {if(e.button===0){pointerDown=false;hitIntent.release('pointer');}if(e.button===2)hitIntent.release('pointer-smash');});
  window.addEventListener('pointerup',()=>inspectDrag=null);
  canvas.addEventListener('wheel',e=>{if(state.screen==='inspect'){e.preventDefault();state.inspectDistance=clamp((state.inspectDistance||3.1)+e.deltaY*.003,.52,5);}else if(state.screen==='play'){e.preventDefault();chooseLanding({...selectedLanding(),z:selectedLanding().z+Math.sign(e.deltaY)*.4});}},{passive:false});
  window.addEventListener('pointercancel',()=>{inspectDrag=null;pointerDown=false;hitIntent.release('pointer');hitIntent.release('pointer-smash');});
  canvas.addEventListener('pointermove',e=>{
    if(state.screen!=='inspect'||!inspectDrag)return;
    state.inspectYaw-=(e.clientX-inspectDrag.x)*.007;
    state.inspectPitch=clamp((state.inspectPitch??.035)+(e.clientY-inspectDrag.y)*.002,-.15,.6);
    inspectDrag={x:e.clientX,y:e.clientY};
  });
  canvas.addEventListener('mousemove', e => {
    if (state.screen !== 'play') return;
    if(!coarse)applyMouseLook(e.movementX||0,e.movementY||0);
  });
  for(const button of [$('#mobile-hit'),$('#quick-hit'),$('#drop-btn'),$('#smash-btn'),$('#slice-smash-btn'),$('#slice-drop-btn'),...document.querySelectorAll('[data-training-shot]')]){
    const kind=button.dataset.trainingShot??({ 'slice-smash-btn':'slicesmash', 'slice-drop-btn':'slicedrop', 'smash-btn':'smash', 'drop-btn':'drop' })[button.id]??'auto';
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
    renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = .82;
    scene = new THREE.Scene(); camera = new THREE.PerspectiveCamera(68, innerWidth / innerHeight, .045, 100);
    bootStage='assets';boot({stage:'准备人物与球馆材质',percent:40});
    const onWarning=warning=>{console.warn('Optional court asset:',JSON.stringify(warning));boot({warning:true,label:warning.label,message:warning.message});};
    const legacyArm=params.get('arm')==='legacy';
    const [,maps]=await Promise.all([prepareHands(THREE,{safe:safeBoot||!legacyArm,onWarning}),loadSurfaceMaps(THREE,renderer,{safe:safeBoot,onWarning}),!legacyArm?preparePlayerArm(THREE,{safe:safeBoot,onWarning}):null]);surfaceMaps=maps;
    if(!safeBoot){try{environmentTarget=createEnvironment(THREE,renderer,scene);}catch(error){onWarning({label:'球馆反射',message:error.message});}}
    presentation=new CourtPresentation(THREE,renderer);presentation.setSize(innerWidth,innerHeight);
    eagleEye = new EagleEyeReview(closeLineReview);
    bootStage='scene';boot({stage:'布置球场与校准操作',percent:75});
    createHall(); batchHall(); createPlayerRacket(); bot = createOpponent(); createEffects();initTechniquePanel();bindEvents();restorePreferences();initRacketGallery();if(safeBoot){$('#quality').value='balanced';applyQuality('balanced');}updateDifficultyUI();
    canvas.addEventListener('webglcontextlost',event=>{
      event.preventDefault();graphicsLost=true;renderLoop.stop();pauseGame();
      if(state.screen==='review'){reviewReturnScreen='play';eagleEye.close();pauseGame();}
      keys.clear();hitIntent.clear();pointerDown=false;accumulator=0;document.exitPointerLock?.();
      $('#error-panel').classList.remove('hidden');$('#error-message').textContent='浏览器图形连接暂时中断，比赛已暂停并保留比分。正在等待恢复；也可选择重新加载或低负载启动。';
    });
    canvas.addEventListener('webglcontextrestored',()=>{
      graphicsLost=false;accumulator=0;clock.getDelta();adaptiveResolution.reset(performance.now());
      // Render-target contents do not survive a context reset. Recreate the
      // room reflection; retained mesh/texture sources are reuploaded by Three.
      if(!safeBoot){environmentTarget?.dispose();try{environmentTarget=createEnvironment(THREE,renderer,scene);}catch{scene.environment=null;}}
      applyRenderProfile();renderBudget.invalidate();$('#error-panel').classList.add('hidden');
      if(state.screen==='pause')$('#pause-description').textContent='图形连接已恢复，比分已保留。点击继续比赛。';
      renderLoop.start();
    });
    if (testing) {
      window.__game = {
        state, player, opponent, ball,
        start: startGame, serve, swing: beginSwing, pause: pauseGame, resume: resumeGame, setAssist, setShot,
        renderSurface:()=>({viewport:[innerWidth,innerHeight],cameraAspect:camera.aspect,drawingBuffer:renderer.getDrawingBufferSize(new THREE.Vector2()).toArray(),postprocess:[presentation.target.width,presentation.target.height],quality:presentation.quality,pixelRatio:renderer.getPixelRatio()}),
        snapshot: () => ({ screen: state.screen, phase: state.phase, mode: state.mode, score: [...state.score], rally: state.rally, hits: state.hits, maxRally: state.maxRally, target: state.target, targetHits: state.targetHits, targetShots: state.targetShots, targetStreak: state.targetStreak, aim: state.aim, lastHitter: state.lastHitter, ball: ball.pos.toArray(), velocity: ball.vel.toArray(), player: player.pos.toArray(), opponent: opponent.pos.toArray(), prediction: state.prediction, fps: Math.round(fps), render: renderer.info.render }),
        placeIncoming: (pos, vel) => { state.screen = 'play'; state.phase = 'rally'; state.lastHitter = 'opponent'; ball.pos.fromArray(pos); ball.vel.fromArray(vel); ball.active = true; state.swing = 0; refreshPrediction(); },
      };
      const panel=document.createElement('div');panel.id='test-panel';panel.style.cssText='position:fixed;left:20px;top:115px;z-index:50;background:#12382f;padding:12px;max-width:350px;font:12px sans-serif;border:1px solid #dcf49a';
      panel.innerHTML='<button id="run-play-test">运行长按 60 秒对打测试</button><button id="run-input-suite">验证左右球路与提前点击</button><button id="run-target-test">验证打点挑战</button><button id="run-v2-test">验证手动操作与比赛</button><button id="inspect-model">查看人物近景</button><button id="run-perf-test">测量 180 帧实际表现</button><button id="run-scene-test">检查当前场景坐标</button><pre id="test-result">等待测试</pre>';document.body.append(panel);
      panel.style.zIndex = '45';
      const tacticsProof=document.createElement('button');tacticsProof.id='run-tactics-test';tacticsProof.textContent='验证战术球实飞、鼠标方向与辅助接管';panel.prepend(tacticsProof);
      tacticsProof.onclick=()=>{
        const checks=[],savedLevel=$('#difficulty').value,savedAuto=$('#eagle-auto').checked,careerBefore=career;
        const cases=[
          {type:'drop',ball:[1.2,2.7,4],opponent:[-1.7,0,-5.7],target:{x:1.96,z:-1.1}},
          {type:'slicedrop',ball:[1.2,2.7,4],opponent:[1.8,0,-5.7],target:{x:-2.05,z:-1.1}},
          {type:'net',ball:[1.5,1.22,1.4],opponent:[-1.6,0,-5.8],target:{x:1.96,z:-.88}},
          {type:'netcross',ball:[1.5,1.25,1.4],opponent:[1.9,0,-2.5],target:{x:-2.05,z:-.92}},
          {type:'push',ball:[.3,1.9,1.8],opponent:[-1.6,0,-1.8],target:{x:2.05,z:-5.8}},
          {type:'clear',ball:[-1,2.7,3],opponent:[1.9,0,-1.8],target:{x:-2.05,z:-6.1}},
        ];
        try{
          $('#eagle-auto').checked=false;
          for(const scenario of cases){
            let won=0,legal=0,contacts=0,returned=0,qualitySum=0;
            for(let seed=0;seed<12;seed++){
              $('#difficulty').value='hard';startGame('match');state.sound=false;rng=9029+seed*367;state.phase='rally';state.lastHitter='opponent';state.rally=4;
              ball.pos.fromArray(scenario.ball);ball.vel.set(0,-.2,.3);ball.active=true;player.pos.set(scenario.ball[0],0,scenario.ball[2]+.75);player.vel.set(0,0,0);player.speed=0;
              opponent.pos.fromArray(scenario.opponent);opponent.vel.set(0,0,0);chooseLanding(scenario.target);state.swingKind=scenario.type;
              state.contactPoint=ball.pos.clone();const hit=tryPlayerHit(),shot=state.lastShot;contacts+=Number(hit);qualitySum+=shot?.quality||0;if(hit&&!shot.fault)legal++;
              for(let n=0;n<600&&state.phase==='rally'&&state.lastHitter==='player';n++)fixedUpdate(1/120);
              if(state.score[0]===1)won++;if(state.lastHitter==='opponent')returned++;
            }
            // A high clear gives the receiver recovery time. Verify that it can
            // punish displacement and can also be returned, rather than
            // requiring random receiver errors in a majority of the seeds.
            const outcome=scenario.type==='clear'?won>0&&returned>0&&won+returned===12:won>=5;
            checks.push({name:`physical-winner-${scenario.type}`,pass:contacts===12&&legal>=10&&outcome,wins:won,returns:returned,contacts,legal,meanQuality:qualitySum/12});
          }
          startGame('practice');state.sound=false;setAssist(false);performControl(pointerCommand(0),'pointer');
          checks.push({name:'left-mouse-preserves-manual-movement',pass:!state.assists});
          performControl(pointerCommand(2),'pointer-smash');checks.push({name:'right-mouse-preserves-manual-movement',pass:!state.assists});
          state.phase='rally';state.lastHitter='opponent';ball.pos.set(1.2,2.6,3.2);setShot('drop');cycleShotDirection();const straight=selectedLanding('drop');cycleShotDirection();const diagonal=selectedLanding('drop');
          checks.push({name:'middle-button-line-control',pass:straight.x>0&&diagonal.x<0&&straight.z===diagonal.z,straight,diagonal});
          chooseLanding({x:1.8,z:-5.7});state.swingKind='clear';updateTactics();
          checks.push({name:'landing-marker-agrees-with-selected-target',pass:Math.abs(aimMarker.position.x-selectedLanding('clear').x)<.001&&Math.abs(aimMarker.position.z-selectedLanding('clear').z)<.001});
        }finally{$('#difficulty').value=savedLevel;$('#eagle-auto').checked=savedAuto;career=careerBefore;updateCareerUI();}
        $('#test-result').textContent=JSON.stringify({type:'tactical flight integration',pass:checks.every(c=>c.pass),checks},null,2);pauseGame();
      };
      const tacticsMatch=document.createElement('button');tacticsMatch.id='run-tactics-matches';tacticsMatch.textContent='验证五档完整比赛与多种制胜球';panel.prepend(tacticsMatch);
      const characterProof=document.createElement('button');characterProof.id='run-character-matches';characterProof.textContent='验证五种对手打法整局比赛';panel.prepend(characterProof);
      characterProof.onclick=()=>{
        const saved={level:$('#difficulty').value,points:$('#match-points').value,eagle:$('#eagle-auto').checked},results=[],careerBefore=career;
        try{
          $('#difficulty').value='master';$('#match-points').value='11';$('#eagle-auto').checked=false;
          for(const profile of ['balanced','attack','netpress','defend','counter']){
            startGame('match');state.profile=profile;state.sound=false;rng=8291;hitIntent.press(state.timer,null,'character-proof');
            let incomingBefore=false;
            for(let n=0;n<86400&&!state.finished;n++){
              const incoming=state.lastHitter==='opponent'&&state.phase==='rally';
              if(incoming&&!incomingBefore){const kind=opponent.pos.z<-3.9?'drop':opponent.pos.z>-2.7?'push':'clear';setShot(kind);chooseLanding({x:opponent.pos.x>.1?-2.02:2.02,z:SHOT_DEPTHS[kind]});}
              incomingBefore=incoming;fixedUpdate(1/120);
            }
            results.push({profile,finished:state.finished,score:[...state.score],hits:state.hits,actions:{...opponent.actionCounts},methods:{...matchTactics.methods},intent:currentMatchIntent().phase,review:matchTactics.lastResult,geometry:renderer.info.memory.geometries});
          }
        }finally{$('#difficulty').value=saved.level;$('#match-points').value=saved.points;$('#eagle-auto').checked=saved.eagle;career=careerBefore;updateCareerUI();updateCharacterPreview();}
        $('#test-result').textContent=JSON.stringify({pass:results.every(r=>r.finished&&Object.keys(r.actions).length>=4&&r.review?.tip),results},null,2);pauseGame();
      };
      tacticsMatch.onclick=()=>{
        const savedLevel=$('#difficulty').value,savedPoints=$('#match-points').value,savedAuto=$('#eagle-auto').checked,savedAssist=$('#assist-toggle').checked,careerBefore=career,results=[];
        try{
          $('#eagle-auto').checked=false;$('#match-points').value='11';$('#assist-toggle').checked=true;setAssist(true);
          for(const difficulty of ['easy','hard','master','pro','legend']){
            $('#difficulty').value=difficulty;startGame('match');state.sound=false;rng=101+opponentLevel(difficulty).tier*97;hitIntent.press(state.timer,null,'match-proof');
            const used=new Set();let wasIncoming=false;
            for(let n=0;n<86400&&!state.finished;n++){
              const incoming=state.lastHitter==='opponent'&&state.phase==='rally';
              if(incoming&&!wasIncoming){
                const kind=opponent.pos.z<-3.9?(state.hits%3===0?'slicedrop':'drop'):opponent.pos.z>-2.7?(state.hits%2?'push':'clear'):state.hits%3===0?'netcross':'clear';
                setShot(kind);chooseLanding({x:opponent.pos.x>.1?-2.02:2.02,z:SHOT_DEPTHS[kind]});used.add(kind);
              }
              wasIncoming=incoming;fixedUpdate(1/120);
            }
            results.push({difficulty,finished:state.finished,score:[...state.score],hits:state.hits,seconds:state.timer,methods:{...matchTactics.methods},opponentActions:{...opponent.actionCounts},playerShots:[...used],energy:state.stamina});
          }
        }finally{$('#difficulty').value=savedLevel;$('#match-points').value=savedPoints;$('#eagle-auto').checked=savedAuto;$('#assist-toggle').checked=savedAssist;setAssist(savedAssist);career=careerBefore;updateCareerUI();}
        const variety=new Set(results.flatMap(r=>Object.keys(r.methods)));
        $('#test-result').textContent=JSON.stringify({type:'five complete tactical matches',pass:results.every(r=>r.finished)&&variety.size>=3,distinctWinningShots:[...variety],results},null,2);pauseGame();
      };
      const contextProof=document.createElement('button');contextProof.id='run-context-test';contextProof.textContent='验证图形中断恢复与比分保留';panel.prepend(contextProof);
      contextProof.onclick=()=>{
        const ext=renderer.getContext().getExtension('WEBGL_lose_context');
        if(!ext){$('#test-result').textContent=JSON.stringify({type:'context recovery',supported:false});return;}
        startGame('practice');state.score=[3,2];updateHud();
        const before={score:[...state.score],timer:state.timer,hits:state.hits};let frozen;
        canvas.addEventListener('webglcontextlost',()=>{
          frozen={timer:state.timer,hits:state.hits,loopStopped:!renderLoop.running,frames:renderLoop.frames};
          setTimeout(()=>ext.restoreContext(),250);
        },{once:true});
        canvas.addEventListener('webglcontextrestored',()=>setTimeout(()=>{
          $('#test-result').textContent=JSON.stringify({type:'context recovery',before,frozen,after:{score:[...state.score],timer:state.timer,hits:state.hits,screen:state.screen,loopRunning:renderLoop.running,frames:renderLoop.frames},passed:state.screen==='pause'&&state.score.join()===before.score.join()&&state.timer===frozen.timer&&frozen.loopStopped&&renderLoop.running&&renderLoop.frames>frozen.frames},null,2);
        },100),{once:true});ext.loseContext();
      };
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
      const hallProof=document.createElement('button');hallProof.id='inspect-hall-context';hallProof.textContent='检查四面看台与比赛主场 · Esc返回';panel.prepend(hallProof);
      hallProof.onclick=()=>{
       state.screen='equipment-inspect';renderBudget.invalidate();document.exitPointerLock?.();
       for(const id of ['menu','hud','pause-overlay','masthead','test-panel'])$('#'+id).classList.add('hidden');
       racket.visible=false;racket.userData.support.visible=false;shuttle.visible=false;bot.label.visible=false;
       landingMarker.visible=targetMarker.visible=aimMarker.visible=shuttleShadow.visible=false;
       camera.position.set(6.7,3.1,10.5);camera.fov=73;camera.lookAt(-1.4,2.8,-8);camera.updateProjectionMatrix();
      };
      const equipmentProof=document.createElement('button');equipmentProof.id='inspect-equipment';equipmentProof.textContent='检查球包与场边器材 · Esc返回';panel.prepend(equipmentProof);
      equipmentProof.onclick=()=>{
        state.screen='equipment-inspect';renderBudget.invalidate();document.exitPointerLock?.();
        for(const id of ['menu','hud','pause-overlay','masthead','test-panel'])$('#'+id).classList.add('hidden');
        racket.visible=false;racket.userData.support.visible=false;shuttle.visible=false;landingMarker.visible=targetMarker.visible=aimMarker.visible=shuttleShadow.visible=false;
        camera.position.set(5.9,1.15,-8.9);camera.fov=44;camera.lookAt(6.2,.73,-10.4);camera.updateProjectionMatrix();
      };
      const shuttleProof=document.createElement('button');shuttleProof.id='inspect-shuttle';shuttleProof.textContent='检查16羽毛球近景 · Esc返回';panel.prepend(shuttleProof);
      shuttleProof.onclick=()=>{
        state.screen='shuttle-inspect';renderBudget.invalidate();document.exitPointerLock?.();
        for(const id of ['menu','hud','pause-overlay','masthead','test-panel'])$('#'+id).classList.add('hidden');
        racket.visible=false;racket.userData.support.visible=false;shuttle.visible=true;shuttle.position.set(0,1.3,3.95);shuttle.rotation.set(.18,.4,-.22);shuttle.scale.setScalar(1);
        camera.position.set(.04,1.33,4.24);camera.fov=42;camera.lookAt(0,1.32,3.95);camera.updateProjectionMatrix();
        landingMarker.visible=targetMarker.visible=aimMarker.visible=shuttleShadow.visible=false;
      };
      const skinPreview=document.createElement('select');skinPreview.id='inspect-racket-skin';skinPreview.setAttribute('aria-label','检查球拍涂装');for(const [id,spec] of Object.entries(RACKET_SKINS))skinPreview.add(new Option(spec.label,id));skinPreview.onchange=()=>applyRacketSkin(skinPreview.value);panel.prepend(skinPreview);
      const handViews=document.createElement('select');handViews.id='hand-inspect-view';handViews.setAttribute('aria-label','手部检查视角');
      handViews.add(new Option('左手捏羽近景','support-pinch'));handViews.add(new Option('左手自然张开近景','support-ready'));
      for(const [value,label] of [['grip','握拍近景'],['palm','掌侧近景'],['back','手背近景'],['racket','整拍与握拍'],['idle','实战待机'],['prep','高远准备'],['contact','高远触球'],['high','高位伸展触球'],['backhand','反手伸展触球'],['follow','杀球收拍'],['net','网前搓球'],['serve','发球准备'],['serve-hold','左手捏球'],['serve-release','松手送球'],['serve-follow','发球收手']])handViews.add(new Option(label,value));
      const inspectHand=()=>{
        renderBudget.invalidate();
        state.screen='hand-inspect';state.handsOn=false;document.exitPointerLock?.();
        for(const id of ['menu','hud','pause-overlay'])$('#'+id).classList.add('hidden');
        camera.position.set(0,1.69,4.5);camera.rotation.set(0,0,0);camera.fov=['grip','palm','back','racket','support-pinch','support-ready'].includes(handViews.value)?50:69;camera.updateProjectionMatrix();
        const view=handViews.value;racket.visible=true;positionServeHand(null,null);shuttle.visible=false;
        if(view.startsWith('support-')){
          racket.position.set(.9,-1.2,-2);racket.rotation.set(0,0,0);
          positionServeHand(null,{position:[-.03,-.10,-.40],rotation:[0,.4,.1],relaxation:view==='support-ready'?1:0});
        }
        else if(view.startsWith('serve-')){
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
        const checks=[],savedStats={...state.playerStats},savedOpponent={...state.opponentStats};
        for(const [kind,position] of [['netcross',[1.8,1.4,1.2]],['netcross',[-1.8,1.4,1.2]],['slicesmash',[1.8,3.05,3.6]],['slicedrop',[1.8,2.8,4.8]],['drop',[1.8,2.8,4.8]]]){
          startGame('practice');state.sound=false;state.manualLanding=false;state.aim=0;setShot(kind);state.swingKind=kind;
          ball.pos.fromArray(position);ball.vel.set(0,-1,.1);ball.active=true;state.lastHitter='opponent';state.phase='rally';player.pos.set(position[0],0,position[2]+.65);player.vel.set(0,0,0);player.speed=0;
          state.swingTarget=selectedLanding(kind);
          state.contactPoint=ball.pos.clone();const hit=tryPlayerHit(),p={...ball.pos},v={...ball.vel};let netY=0,apex=p.y,flightTime=0;
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
        techniquePanel.write('player',savedStats);state.playerStats=savedStats;state.opponentStats=savedOpponent;exitGame();
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
        const beforeAlt=selectedLanding(),expectedAlt=moveLanding(beforeAlt,-100,80);
        state.aimAlt=true;applyMouseLook(-100,80);state.aimAlt=false;
        const afterAlt=selectedLanding();
        checks.push({name:'alt-mouse-changes-landing-without-turning',pass:Math.abs(afterAlt.x-expectedAlt.x)<1e-8&&Math.abs(afterAlt.z-expectedAlt.z)<1e-8&&afterAlt.x<beforeAlt.x&&state.yaw===looked.yaw&&state.pitch===looked.pitch,requested:expectedAlt,actual:afterAlt});
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
        const counts={};let allLegal=true,netContacts=0,lungePeak=0;const invalidShots=[];
        for(let i=0;i<160;i++){
          const close=i<100,x=i%2?-1.1:1.1,y=close?(i%5===0?.65:i%7===0?2.15:1.3):2.65,z=close?-1.45:-4.6;
          state.phase='rally';state.lastHitter='player';state.rally=2;state.timer+=.5;
          player.pos.set(i%3===0?1.7:-1.7,0,i%4<2?5.7:2.1);player.vel.set(i%2?1:-1,0,i%3?-.5:.5);
          opponent.pos.set(x,0,z-.72);opponent.vel.set(0,0,0);opponent.energy=100;
          ball.pos.set(x,y,z);ball.active=true;opponentHit();
          const action=opponent.history.at(-1);counts[action.action]=(counts[action.action]||0)+1;
          const end=predict(ball.pos,ball.vel,1).landing;
          const legal=Boolean(ball.vel.toArray().every(Number.isFinite)&&(action.fault||end?.z>0&&Number.isFinite(end.x)));
          if(!legal)invalidShots.push({index:i,type:action.type,fault:action.fault||null,pos:ball.pos.toArray(),velocity:ball.vel.toArray(),target:action.executedTarget||action.target,landing:end});
          allLegal&&=legal;
          if(action.type==='net'){netContacts++;lungePeak=Math.max(lungePeak,opponent.netLunge);}
        }
        checks.push({name:'engine-uses-varied-court-and-net-strokes',pass:Object.keys(counts).length>=9,counts});
        checks.push({name:'net-contact-activates-lunge',pass:netContacts>12&&lungePeak>.7,netContacts,lungePeak});
        checks.push({name:'all-engine-shots-have-finite-trajectories-to-receiving-side',pass:allLegal,expectedFaults:invalidShots.filter(shot=>shot.fault).length,invalid:invalidShots.filter(shot=>!shot.fault).slice(0,4)});
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
          setCameraMode('first');startGame('practice');state.sound=false;state.comfortable=true;state.lastMove=100;ball.pos.set(.05,7,3.85);ball.vel.set(0,0,0);ball.active=true;state.phase='rally';state.lastHitter='opponent';player.pos.set(0,0,4);player.vel.set(0,0,0);
          for(let i=0;i<90;i++)updatePlayer(1/120);player.renderPos.copy(player.pos);ball.renderPos.copy(ball.pos);updateCamera(.05);
          updateEffects(.02);const projected=shuttle.position.clone().project(camera);checks.push({name:'overhead-shuttle-visible',pass:Math.abs(projected.y)<.25&&Math.abs(projected.x)<.25,pitchDegrees:Math.round(state.pitch*180/Math.PI),screen:projected.toArray().map(n=>+n.toFixed(3))});
          const savedAssist=state.assists;
          for(const scenario of [{name:'heavy-smash-winner',p:[.2,3,3.2],heavy:true,winner:0},{name:'low-smash-net',p:[.2,1.7,3.2],fault:'net',winner:1},{name:'stretched-smash-out',p:[2,2.6,3.4],fault:'out',winner:1,assist:true}]){
            $('#difficulty').value='easy';startGame('match');state.sound=false;player.pos.set(0,0,4);player.vel.set(0,0,0);player.speed=0;state.lastMove=100;
            setAssist(scenario.assist??false);setShot('smash');
            opponent.pos.set(-2.4,0,-5.8);opponent.vel.set(0,0,0);state.aim=.8;state.depth=-4.7;state.phase='rally';state.lastHitter='opponent';state.swing=.095;state.swingKind='smash';ball.pos.fromArray(scenario.p);ball.vel.set(0,-.1,1);ball.active=true;state.yaw=0;
            state.contactPoint=ball.pos.clone();const hit=tryPlayerHit(),shot=state.lastShot,speed=Math.round(ball.vel.length()*3.6);
            for(let i=0;i<720&&state.phase==='rally';i++)fixedUpdate(1/120);
            checks.push({name:scenario.name,pass:hit&&(scenario.heavy?shot.heavy:shot.fault===scenario.fault)&&state.score[scenario.winner]===1,heavy:shot?.heavy,fault:shot?.fault,speed,score:[...state.score]});
          }
          setAssist(savedAssist);
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
              startGame('practice');state.sound=false;setAssist(true);setShot('clear');state.aim=scenario.aim;state.manualLanding=true;state.depth=-5.2;
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
        const checks=[],savedAutoEagle=$('#eagle-auto').checked;
        setCameraMode('first');
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
        $('#eagle-auto').checked=false;
        startGame('match');state.sound=false;state.assists=true;hitIntent.press(0,null,'selftest');
        const matchTrace=[];
        for(let i=0;i<86400&&state.screen==='play';i++){
          state.aim=opponent.pos.x>.1?-1:1;
          setShot(opponent.pos.z < -3.1 ? 'drop' : 'clear');
          fixedUpdate(1/120);
          if(i>0&&i%12000===0)matchTrace.push({step:i,seconds:+state.timer.toFixed(1),score:[...state.score],phase:state.phase,rally:state.rally,lastHitter:state.lastHitter,ballActive:ball.active,ball:ball.pos.toArray().map(n=>+n.toFixed(2)),player:player.pos.toArray().map(n=>+n.toFixed(2)),opponent:opponent.pos.toArray().map(n=>+n.toFixed(2)),shot:state.lastShot?.type||null,returnDelay:+(state.returnDelay-state.timer).toFixed(2)});
        }
        checks.push({name:'complete-match',pass:state.finished&&Math.max(...state.score)>=11,screen:state.screen,score:[...state.score],hits:state.hits,finished:state.finished,phase:state.phase,rally:state.rally,lastHitter:state.lastHitter,timer:+state.timer.toFixed(2),matchPoints:state.matchPoints,trace:matchTrace});
        $('#eagle-auto').checked=savedAutoEagle;
        $('#test-result').textContent=JSON.stringify({pass:checks.every(check=>check.pass),checks},null,2);pauseGame();
      });
      const cameraPreview=document.createElement('button');cameraPreview.id='preview-third-person';cameraPreview.textContent='查看第三人称全身实景 · Esc 返回';panel.prepend(cameraPreview);
      cameraPreview.onclick=()=>{
       startGame('practice');state.sound=false;setCameraMode('third');state.orbitYaw=0;state.orbitPitch=THIRD_PERSON_PITCH;state.thirdLift=0;
       ball.renderPos.copy(ball.pos);updateCamera(1/60);updateOpponentModel(1/60);updateEffects(1/60);
       state.screen='overhead-preview';for(const id of ['test-panel','masthead','pause-overlay'])$('#'+id).classList.add('hidden');renderBudget.invalidate();
      };
      const cameraTest=document.createElement('button');cameraTest.id='run-camera-test';cameraTest.textContent='验证双视角、全身动作与高球构图';panel.prepend(cameraTest);
      cameraTest.onclick=()=>{
       const checks=[];setCameraMode('first');startGame('practice');state.sound=false;setAssist(false);
       state.yaw=.19;state.pitch=.12;state.manualPitch=.12;state.autoPitchOffset=0;
       chooseLanding({x:1.8,z:-5.4});const first={yaw:state.yaw,pitch:state.pitch};
       const nearPose=thirdPersonPose({player:player.pos,framing:'near'});
       const widePose=thirdPersonPose({player:player.pos,framing:'wide'});
       const cameraDistance=pose=>Math.hypot(pose.position.x-player.pos.x,pose.position.y-player.pos.y,pose.position.z-player.pos.z);
       checks.push({name:'near-camera-is-closer-than-wide-camera',pass:cameraDistance(nearPose)<cameraDistance(widePose),near:cameraDistance(nearPose),wide:cameraDistance(widePose)});
       checks.push({name:'competition-runoff-is-neutral',pass:runoffMaterial.color.getHexString()==='41494a'});
       state.phase='rally';state.lastHitter='opponent';state.rally=3;state.score=[5,4];ball.active=true;
       ball.pos.set(.2,2.85,3.75);ball.vel.set(0,-.2,.1);player.pos.set(0,0,4.4);player.renderPos.copy(player.pos);ball.renderPos.copy(ball.pos);
       const before={score:[...state.score],rally:state.rally,ball:ball.pos.toArray(),target:selectedLanding(),stamina:state.stamina,assists:state.assists,autoReturn:state.autoReturn};
       setCameraMode('third');updateCamera(1/60);
       applyMouseLook(120,40);
       checks.push({name:'orbit-does-not-change-contact-facing',pass:state.yaw===0&&state.orbitYaw!==0});
       const after={score:[...state.score],rally:state.rally,ball:ball.pos.toArray(),target:selectedLanding(),stamina:state.stamina,assists:state.assists,autoReturn:state.autoReturn};
       checks.push({name:'switch-preserves-match-and-assists',pass:JSON.stringify(before)===JSON.stringify(after),before,after});
       checks.push({name:'third-person-full-body-without-duplicate-arms',pass:playerAvatar.root.visible&&!racket.visible&&!racket.userData.support.visible&&playerAvatar.skeleton.bones.length===48});
       setCameraMode('first');
       checks.push({name:'first-person-restores-manual-view',pass:state.yaw===first.yaw&&state.manualPitch===first.pitch&&Math.abs(state.pitch-first.pitch)<1e-8&&camera.fov===69&&racket.visible&&!playerAvatar.root.visible});
       setCameraMode('third');state.orbitYaw=0;state.orbitPitch=THIRD_PERSON_PITCH;state.manualLookUntil=0;
       hitIntent.press(state.timer,'smash','selftest');handleHitIntent();for(let i=0;i<20&&state.hits===0;i++)fixedUpdate(1/120);
       checks.push({name:'third-person-actual-smash-contact',pass:state.hits===1&&state.lastShot?.type==='smash',hits:state.hits,shot:state.lastShot?.type});hitIntent.clear();
       state.swing=0;state.lastHitter='opponent';state.yaw=0;
       updateCamera(0);
       const torso=player.renderPos.clone().add(V(0,1.21,0));
       ball.pos.copy(torso).lerp(camera.position,-.15);ball.renderPos.copy(ball.pos);ball.vel.set(0,-.2,1);
       updateCamera(1/60);updateContactHint();
       const halo=$('#contact-halo'),faded=playerAvatar.coverage;
       checks.push({name:'blocked-incoming-shuttle-fades-avatar-and-shows-ready-cue',pass:faded<.8&&!halo.classList.contains('hidden')&&halo.dataset.timing==='ready',faded,timing:halo.dataset.timing});
       hitIntent.press(state.timer,'auto','selftest');updateContactHint();
       checks.push({name:'armed-input-shows-queued-cue',pass:halo.dataset.timing==='queued'});hitIntent.clear();
       const savedHint=state.contactHint;state.contactHint=false;updateContactHint();
       checks.push({name:'contact-cue-can-be-disabled',pass:halo.classList.contains('hidden')});state.contactHint=savedHint;
       ball.pos.x=player.pos.x+2.5;ball.renderPos.copy(ball.pos);for(let i=0;i<60;i++)updateCamera(1/60);updateContactHint();
       checks.push({name:'avatar-recovers-and-out-of-reach-ball-is-not-ready',pass:playerAvatar.coverage===1&&halo.dataset.timing==='near'});
       for(const kind of ['clear','drop','smash','net','push','netcross','slicesmash','slicedrop','serve']){
        state.swingKind=kind;state.swing=.05;state.contactElapsed=.05;state.contactPoint=player.pos.clone().add(V(.2,kind==='net'?1.1:2.4,-.65));state.jump=.65;
        updatePlayerAvatar(1/60);playerAvatar.root.updateMatrixWorld(true);
        checks.push({name:'avatar-'+kind,pass:playerAvatar.root.position.y===.65&&playerAvatar.skeleton.boneMatrices.every(Number.isFinite)});
       }
       state.jump=0;state.swing=0;state.contactPoint=null;state.phase='rally';ball.active=true;ball.pos.set(.2,9,player.pos.z-.5);ball.renderPos.copy(ball.pos);state.highBallAssist=true;
       for(let i=0;i<120;i++)updateCamera(1/60);
       const high=ball.renderPos.clone().project(camera),foot=player.renderPos.clone().project(camera);
       checks.push({name:'overhead-shuttle-and-feet-visible',pass:Math.abs(high.y)<1&&Math.abs(high.x)<1&&Math.abs(foot.y)<1,shuttle:high.toArray(),feet:foot.toArray()});
       state.phase='rally';state.lastHitter='opponent';state.swing=0;state.contactHint=true;state.ballGuide=true;
       ball.active=true;ball.vel.set(0,-.2,.9);state.thirdLift=0;state.orbitYaw=0;state.orbitPitch=THIRD_PERSON_PITCH;
       updateCamera(0);ball.pos.copy(camera.localToWorld(V(0,1,-4.7)));ball.renderPos.copy(ball.pos);updateContactHint();
       const nearCue=$('#contact-halo');
       checks.push({name:'incoming-shuttle-gets-a-visible-timing-cue',pass:!nearCue.classList.contains('hidden')&&['near','ready'].includes(nearCue.dataset.timing),timing:nearCue.dataset.timing});
       ball.pos.copy(camera.localToWorld(V(5,1,-3)));ball.renderPos.copy(ball.pos);updateContactHint();
       const edgeIndicator=$('#shuttle-indicator');
       const edgeAngle=edgeIndicator.style.getPropertyValue('--shuttle-arrow');
       checks.push({name:'offscreen-shuttle-gets-a-direction-arrow',pass:edgeIndicator.getClientRects().length>0&&Number.isFinite(Number.parseFloat(edgeAngle)),left:edgeIndicator.style.left,angle:edgeAngle});
       const guideRing=shuttleFootprint.visible,guidePoint=[shuttleFootprint.position.x,shuttleFootprint.position.z];
       checks.push({name:'ground-footprint-follows-the-shuttle-coordinate',pass:guideRing&&Math.hypot(guidePoint[0]-ball.renderPos.x,guidePoint[1]-ball.renderPos.z)<.001,guidePoint});
       ball.pos.set(.2,3.4,2.3);ball.renderPos.copy(ball.pos);state.prediction={intercept:{x:.6,y:2,z:3.1}};
       updateContactHint();
       checks.push({name:'estimated-contact-is-distinct-from-the-live-shuttle-shadow',pass:receiveMarker.visible&&shuttleHeightLine.visible&&receiveMarker.position.z===receivingTarget(state.prediction,player.pos).z&&shuttleFootprint.position.z===2.3});
        setCameraMode('first');updateCamera(0);updateContactHint();
        checks.push({name:'first-person-also-shows-shuttle-depth-guides',pass:shuttleFootprint.visible&&shuttleHeightLine.visible&&receiveMarker.visible&&halo.classList.contains('hidden')});
        setCameraMode('third');updateCamera(0);updateContactHint();
       state.ballGuide=false;updateContactHint();
       checks.push({name:'all-shuttle-depth-guides-can-be-disabled',pass:!shuttleFootprint.visible&&!receiveMarker.visible&&!shuttleHeightLine.visible&&$('#receive-cue').classList.contains('hidden')&&$('#shuttle-indicator').classList.contains('hidden')});
       state.ballGuide=true;state.phase='serve';ball.active=false;ball.pos.set(.2,1.2,3.8);ball.renderPos.copy(ball.pos);updateContactHint();
       const oldSkin=state.racketSkin,nextSkin=oldSkin==='astrox88dpro'?'astrox100zz':'astrox88dpro';applyRacketSkin(nextSkin);
       checks.push({name:'avatar-racket-skin-synchronized',pass:playerAvatar.racket.userData.racketModel.userData.skin===racket.userData.racketModel.userData.skin});applyRacketSkin(oldSkin);
       state.thirdLift=0;ball.pos.set(.2,1.2,3.8);ball.renderPos.copy(ball.pos);state.phase='serve';ball.active=false;updateCamera(1/60);updateEffects(1/60);updateOpponentModel(1/60);
       $('#test-result').textContent=JSON.stringify({pass:checks.every(c=>c.pass),checks},null,2);pauseGame();
      };
      const feelCheck=document.createElement('button');feelCheck.id='run-feel-test';feelCheck.textContent='验证出手时机、杀球实飞与鼠标接管';panel.insertBefore(feelCheck,$('#test-result'));
      feelCheck.onclick=()=>{
       const checks=[];setCameraMode('first');
       for(const kind of ['net','netcross','push','clear','drop','smash']){
        startGame('practice');state.sound=false;setAssist(false);setShot(kind);state.phase='rally';state.lastHitter='opponent';state.rally=2;
        const low=['net','netcross','push'].includes(kind),height=low?1.55:2.85;
        player.pos.set(0,0,low?1.8:4.4);player.vel.set(0,0,0);player.speed=0;
        ball.pos.set(.20,height,player.pos.z-.65);ball.vel.set(0,-.2,.1);ball.active=true;state.lastMove=100;state.prediction=null;
        hitIntent.press(state.timer,kind,'selftest');handleHitIntent();const started=state.swing>0,at=state.timer;
        for(let i=0;i<20&&state.hits===0;i++)fixedUpdate(1/120);
        const latency=state.timer-at,hit=state.hits===1,actual=state.lastShot?.type;
        hitIntent.release('selftest');for(let i=0;i<60&&state.swing>0;i++)updateSwing(1/120);
        checks.push({name:kind,pass:started&&hit&&actual===kind&&latency<.09&&state.swing===0,contactMs:Math.round(latency*1000),recoveryMs:strokeTiming(kind).recovery*1000});
       }
       const flyAttack=({view='first',dropAim=false,manualAim=false,slice=false,replace=false,height=2.96,depth=3.6}={})=>{
        setCameraMode(view==='starts-third'?'third':'first');startGame('practice');
        state.sound=false;setAssist(false);state.phase='rally';state.lastHitter='opponent';state.rally=2;
        state.lastMove=100;state.returnDelay=Infinity;state.highBallAssist=true;
        const x=slice?1.8:.2;
        player.pos.set(x-.2,0,depth+.65);player.renderPos.copy(player.pos);
        ball.pos.set(x,height,depth);ball.renderPos.copy(ball.pos);ball.vel.set(0,-.2,.1);ball.active=true;
        if(view==='round-trip'){setCameraMode('third');applyMouseLook(100,70);updatePlayer(1/60);setCameraMode('first');}
        if(view==='starts-third')setCameraMode('first');
        if(view==='third')setCameraMode('third');
        if(dropAim){setShot('drop');chooseLanding({x:.9,z:-1.15});}
        if(manualAim){setShot('smash');chooseLanding({x:-1.25,z:-2.2});}
        if(replace){performControl(keyCommand('Digit3'),'Digit3');handleHitIntent();}
        performControl(slice?keyCommand('Numpad8'):pointerCommand(2),slice?'Numpad8':'pointer-smash');
        for(let i=0;i<24&&state.hits===0;i++)fixedUpdate(1/120);
        const shot=state.lastShot,speed=state.maxSpeed,fov=camera.fov;
        for(let i=0;i<300&&ball.active;i++)updateBall(ballTimeScale()/120);
        const landing=state.lastLanding;
        return {hits:state.hits,type:shot?.type,heavy:shot?.heavy??false,fault:shot?.fault??null,speed,fov,
          target:shot?.intended,landing:groundMotion&&landing&&ball.pos.z<0?{x:landing.x,z:landing.z}:null};
       };
       const first=flyAttack(),switched=flyAttack({view:'round-trip'}),startsThird=flyAttack({view:'starts-third'}),third=flyAttack({view:'third'});
       const legal=(a,min)=>a.hits===1&&a.type==='smash'&&a.heavy&&a.speed>min&&a.landing?.z<-3.4&&Math.hypot(a.landing.x-a.target.x,a.landing.z-a.target.z)<.15;
       checks.push({name:'same-fast-smash-from-both-views-and-after-f2',pass:[first,switched,startsThird,third].every(a=>legal(a,135)&&Math.abs(a.speed-first.speed)<=1)&&[first,switched,startsThird].every(a=>a.fov===69),first,switched,startsThird,third});
       const afterDrop=flyAttack({dropAim:true,replace:true});
       checks.push({name:'right-click-overrides-unplayed-drop-and-does-not-inherit-short-aim',pass:legal(afterDrop,135),afterDrop});
       const chosen=flyAttack({manualAim:true});
       checks.push({name:'explicit-smash-landing-stays-selected',pass:chosen.type==='smash'&&Math.hypot(chosen.landing?.x+1.25,chosen.landing?.z+2.2)<.15,chosen});
       const rear=flyAttack({depth:5.5}),low=flyAttack({height:1.78}),slice=flyAttack({slice:true,depth:4.2});
       checks.push({name:'rear-court-smash-lands-deep-with-pace',pass:legal(rear,155)&&rear.landing.z<-4.5,rear});
       checks.push({name:'low-smash-still-hits-net',pass:low.hits===1&&low.fault==='net'&&!low.landing,low});
       checks.push({name:'numpad-eight-flies-cross-court-with-pace',pass:slice.type==='slicesmash'&&slice.speed>120&&slice.landing?.x<-1.8&&slice.landing?.z<-3.5,slice});
       setCameraMode('first');
       state.comfortable=false;state.yaw=.2;state.pitch=1.1;state.manualPitch=-.03;state.autoPitchOffset=1.13;
       const expected=freeLook({yaw:.2,pitch:1.1},0,40,state.sensitivity,innerHeight,camera.fov,innerWidth);
       applyMouseLook(0,40);checks.push({name:'mouse-takes-over-lifted-angle',pass:Math.abs(state.pitch-expected.pitch)<1e-8&&state.autoPitchOffset===0&&state.manualLookUntil>state.timer});
       player.renderPos.copy(player.pos);updateCamera(1/60);
       checks.push({name:'camera-has-no-second-position-lag',pass:camera.position.distanceTo(cameraGoal)<1e-8});
       $('#test-result').textContent=JSON.stringify({pass:checks.every(c=>c.pass),checks},null,2);pauseGame();
      };
      $('#run-perf-test').addEventListener('click',()=>{startGame('practice');state.sound=false;hitIntent.press(0,null,'selftest');frameProbe={warmup:30,samples:[]};$('#test-result').textContent='正在采样真实动画帧，完成后自动暂停…';});
      const endurance=document.createElement('button');endurance.id='run-endurance-test';endurance.textContent='实际连续对打 120 秒 · 完成自动暂停';panel.prepend(endurance);
      endurance.onclick=()=>{startGame('practice');state.sound=false;hitIntent.press(0,null,'selftest');frameProbe={warmup:120,samples:[],durationMs:120000};$('#test-result').textContent='正在连续对打采样 120 秒，完成自动暂停…';};
      const sustained=document.createElement('button');sustained.id='run-sustained-test';sustained.textContent='实际对打 10 分钟 · 检查首尾帧率';panel.prepend(sustained);
      sustained.onclick=()=>{startGame('practice');state.sound=false;hitIntent.press(0,null,'selftest');frameProbe={warmup:120,samples:[],durationMs:600000};$('#test-result').textContent='正在连续对打采样 10 分钟，完成自动暂停…';};
      $('#inspect-model').addEventListener('click',()=>{
        state.screen='inspect';$('#menu').classList.add('hidden');$('#hud').classList.add('hidden');$('#pause-overlay').classList.add('hidden');
        bot.root.position.set(0,0,0);bot.root.rotation.set(0,0,0);bot.update({time:0});bot.label.visible=false;racket.visible=false;shuttle.visible=false;
        camera.position.set(1.45,1.45,3.1);camera.fov=41;camera.lookAt(0,1.08,0);camera.updateProjectionMatrix();
        $('#test-result').textContent='人物近景：肩胯比例 / 五官 / 衣料 / 肘膝关节';
      });
    }
    bootStage='frame';boot({stage:'绘制第一帧',percent:95});animate();renderLoop.start();boot({ready:true});
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
