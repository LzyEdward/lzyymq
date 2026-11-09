// Court-relative movement and forgiving, readable shot-quality rules.
const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

function shapeAxis(value) {
  const magnitude = Math.abs(value);
  if (magnitude <= .14) return 0;
  return Math.sign(value) * Math.min(1, (magnitude - .14) / .86);
}

/** W/S always mean forward/back on court, regardless of where the camera looks. */
export function movementVector({ left = false, right = false, forward = false, back = false, axisX = 0, axisY = 0 } = {}) {
  let x = Number(right) - Number(left) + shapeAxis(axisX);
  let z = Number(forward) - Number(back) + shapeAxis(axisY);
  const length = Math.hypot(x, z);
  const magnitude = Math.min(1, length);
  if (length > 0) { x /= length; z /= length; }
  return { x, z, magnitude, active: length > .1 };
}

const SWEET_HEIGHT = Object.freeze({ clear: 1.82, drive: 1.55, drop: 2.02, smash: 2.48, lift: .94, serve: 1.25, net: 1.18, netcross: 1.18, push: 1.72, netkill: 1.92 });

export function gradeContact({ position, player, kind = 'clear', assisted = true,side=1,speed=0,jump=0,stamina=100 }) {
  const smash=kind==='smash',sweetHeight=smash?2.95+jump*.35:SWEET_HEIGHT[kind]??1.75;
  const lateral=Math.abs(position.x-player.x),front=(player.z-position.z)*side;
  const distance=Math.hypot(lateral,front),reach=assisted?2.2:1.85;
  const heightFit=smash?clamp((position.y-1.65)/1.15,0,1):clamp(1-Math.abs(position.y-sweetHeight)/1.5,0,1);
  const spacingFit=clamp(1-Math.max(0,distance-1.05)/(reach-1.05),0,1);
  const frontFit=clamp(1-Math.max(0,.18-front)/.85,0,1);
  const balance=clamp(1-Math.max(0,speed-2.4)/(smash?6.3:10),.3,1),energy=.78+.22*clamp(stamina/35,0,1);
  const quality=clamp((heightFit*.32+spacingFit*.26+frontFit*.28+balance*.14)*energy,0,1);
  const heavy=smash&&quality>=.86&&position.y>=2.55&&front>=.15&&lateral<=.9&&stamina>=20&&balance>=.82;
  const rating=quality>=.9?'perfect':quality>=.73?'clean':'scramble';
  const reason=smash&&position.y<2.25?'击球点太低':front<-.08?'球落在身后':lateral>1.25||distance>1.85?'距离太远':balance<.75?'移动中失衡':stamina<20?'体能不足':heavy?'高点击球 · 重杀机会':'站位扎实';
  return {quality,rating,heavy,reason,front,lateral,balance,heightFit};
}

/** Choose a playable stroke for the one-button, mouse-only return. */
export function smartStroke({position,player,assisted=true,speed=0,jump=0,stamina=100,aimShort=false}={}) {
 const common={position,player,assisted,speed,jump,stamina};
 if(position.y<.92)return 'lift';
 const net=gradeContact({...common,kind:'net'});
 if(position.y<=1.45&&position.z<player.z-.15&&net.quality>=.50)return 'net';
 const smash=gradeContact({...common,kind:'smash'});
 if(position.y>=2.55&&smash.heavy)return 'smash';
 const drop=gradeContact({...common,kind:'drop'});
 if(position.y>=1.45&&(aimShort||player.z<2.65)&&drop.quality>=.58)return 'drop';
 const drive=gradeContact({...common,kind:'drive'});
 const push=gradeContact({...common,kind:'push'});
 if(position.y>=1.45&&position.y<=2.35&&push.quality>=.56&&player.z<3.15)return 'push';
 if(position.y>=1.25&&position.y<=2.45&&drive.quality>=.56)return 'drive';
 if(position.y<1.48)return 'lift';
 return 'clear';
}

export function strokeOutcome({position,player,kind='clear',target,side=1,speed=0,jump=0,stamina=100,assisted=true,qualityBonus=0}){
 const grade=gradeContact({position,player,kind,side,speed,jump,stamina,assisted});
 const effectiveQuality=clamp(grade.quality+qualityBonus,0,1),effectiveRating=effectiveQuality>=.9?'perfect':effectiveQuality>=.73?'clean':'scramble';
 let fault=null;
 if((kind==='smash'&&(position.y<1.95||grade.front<-.25))||(kind==='netkill'&&(position.y<1.4||grade.front<-.35)))fault='net';
 else if((['smash','netkill'].includes(kind)&&grade.lateral>(kind==='smash'?1.72:1.9))||(effectiveQuality<.60&&(grade.lateral>1.55||grade.front<-.15)))fault='out';
 const drift=(1-effectiveQuality)**2;
 const intended={...target};
 if(fault==='out')intended.x=(position.x-player.x>=0?1:-1)*(2.92+drift*.6);
 else {intended.x+=Math.sign(position.x-player.x||1)*drift*.45;intended.z+=side*drift*.65;}
 // A badly positioned smash remains a smash: it can hit the tape or fly out.
 // The caller simulates the entire faulty trajectory and scores on collision.
 const speedMps=kind==='smash'?(grade.heavy?65+grade.quality*12:26+grade.quality*18):kind==='netkill'?(grade.heavy?52+grade.quality*8:28+grade.quality*12):null;
 return {...grade,quality:effectiveQuality,rating:effectiveRating,target:intended,fault,speedMps};
}

export function targetDistance(landing, target) {
  return Math.hypot(landing.x - target.x, landing.z - target.z);
}

export const SHOT_DEPTHS = Object.freeze({ clear: -5.85, drive: -4.7, drop: -1.4, smash: -3.8, lift: -5.5, net: -.92, netcross: -.92, push: -4.85, netkill: -1.75, auto: -5.45 });

export function racketPowerBoost(style='control',kind='smash'){
 if(!['smash','netkill'].includes(kind))return 0;
 return ({control:0,attack:8,aero:4})[style]??0;
}

export function shotTarget({ aim = 0, depth = null, kind = 'clear' } = {}) {
  const requestedDepth = Number.isFinite(depth) ? depth : (SHOT_DEPTHS[kind] ?? -5.5);
  return {
    x: clamp(aim * 2.45, -2.48, 2.48),
    z: clamp(requestedDepth, -6.3, -.85),
  };
}

export class Dash {
  constructor() { this.reset(); }
  reset() { this.remaining = 0; this.cooldown = 0; this.x = 0; this.z = 0; }
  start(x, z, stamina = 100) {
    if (this.cooldown > 0 || stamina < 14) return false;
    const length = Math.hypot(x, z);
    if (length < .01) { x = 0; z = -1; }
    else { x /= length; z /= length; }
    this.x = x; this.z = z; this.remaining = .19; this.cooldown = 1.15;
    return true;
  }
  step(dt) {
    const active = Math.min(Math.max(0, dt), this.remaining);
    this.remaining = Math.max(0, this.remaining - dt);
    this.cooldown = Math.max(0, this.cooldown - dt);
    return { x: this.x * 8.5 * active, z: this.z * 8.5 * active };
  }
}

export const DRILL_TARGETS = Object.freeze([
  Object.freeze({ x: -2.03, z: -5.42, name: '左后场' }),
  Object.freeze({ x: 2.03, z: -5.42, name: '右后场' }),
  Object.freeze({ x: -2.03, z: -1.72, name: '左前场' }),
  Object.freeze({ x: 2.03, z: -1.72, name: '右前场' }),
  Object.freeze({ x: 0, z: -5.55, name: '中路深区' }),
  Object.freeze({ x: 0, z: -1.62, name: '网前中路' }),
]);

export function practiceFeed(index) {
  const feeds = [
    { type: 'clear', x: -2.08, z: 5.68 },
    { type: 'drive', x: 1.88, z: 4.62 },
    { type: 'drop', x: -.82, z: 1.42 },
    { type: 'lift', x: 2.12, z: 6.02 },
    { type: 'clear', x: 1.48, z: 5.94 },
    { type: 'drop', x: 1.15, z: 1.18 },
    { type: 'drive', x: -1.78, z: 4.42 },
    { type: 'lift', x: -2.18, z: 5.92 },
  ];
  return feeds[((index % feeds.length) + feeds.length) % feeds.length];
}
