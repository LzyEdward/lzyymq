// Metres, seconds. Feather drag is proportional to velocity squared.
export const COURT = Object.freeze({ halfWidth: 2.59, halfLength: 6.7, netHeight: 1.524, drag: 0.135, gravity: 9.81 });
export const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
export const damp = (a, b, lambda, dt) => a + (b - a) * (1 - Math.exp(-lambda * dt));

export function advance(p, v, dt) {
  const speed = Math.hypot(v.x, v.y, v.z);
  const drag = 1 / (1 + COURT.drag * speed * dt);
  v.x *= drag;
  v.z *= drag;
  v.y = v.y * drag - COURT.gravity * dt;
  p.x += v.x * dt;
  p.y += v.y * dt;
  p.z += v.z * dt;
  return p;
}

function flight(origin, horizontal, up, dx, dz, record = false) {
  const p = { ...origin }, v = { x: dx * horizontal, y: up, z: dz * horizontal };
  let netY = Infinity, previous = { ...p }, time = 0;
  const points = [];
  for (let i = 0; i < 900; i++) {
    previous = { ...p };
    advance(p, v, 1 / 180);
    time += 1 / 180;
    if (previous.z * p.z <= 0 && previous.z !== p.z) {
      const t = previous.z / (previous.z - p.z);
      netY = previous.y + (p.y - previous.y) * t;
    }
    if (record && i % 6 === 0) points.push({ ...p, t: time, vy: v.y });
    if (p.y <= 0.06) break;
  }
  return { distance: Math.hypot(p.x - origin.x, p.z - origin.z), position: p, netY, time, points };
}

export function solveShot(origin, target, type = 'clear',options={}) {
  const distance = Math.hypot(target.x - origin.x, target.z - origin.z);
  const dx = (target.x - origin.x) / Math.max(distance, 0.01);
  const dz = (target.z - origin.z) / Math.max(distance, 0.01);
  if(type==='net'||type==='netcross'){
    // Solve both range and net height so a net shot skims the tape instead of
    // inheriting the tall arc of a rear-court drop.
    let lowUp=-5,highUp=16,up=0,horizontal=0;
    for(let pass=0;pass<22;pass++){
      up=(lowUp+highUp)/2;let low=.1,high=100;
      for(let i=0;i<22;i++){horizontal=(low+high)/2;const f=flight(origin,horizontal,up,dx,dz);if(f.distance<distance)low=horizontal;else high=horizontal;}
      const result=flight(origin,horizontal,up,dx,dz);
      if(result.netY<COURT.netHeight+.085)lowUp=up;else highUp=up;
    }
    return {x:dx*horizontal,y:up,z:dz*horizontal};
  }
  if((type==='smash'||type==='netkill')&&Number.isFinite(options.speed)){
    const horizontal=clamp(options.speed,18,85);let lo=-65,hi=35,up=0,result;
    for(let i=0;i<28;i++){up=(lo+hi)/2;result=flight(origin,horizontal,up,dx,dz);if(result.distance<distance)lo=up;else hi=up;}
    result=flight(origin,horizontal,up,dx,dz);
    if(result.netY>=COURT.netHeight+.065)return {x:dx*horizontal,y:up,z:dz*horizontal};
  }
  let up = ({ clear: 15.8, drive: 5.1, push:4.1,netkill:-3.8,drop: 6.1, smash: -6.5, serve: 3.6, lift: 18 })[type] ?? 12;
  if(type==='serve'&&Number.isFinite(options.up))up=clamp(options.up,3.6,10);
  if (type === 'smash' && origin.y < 2.65) up = 1.5;
  let horizontal = 10, result;
  for (let attempt = 0; attempt < 13; attempt++) {
    let lo = 0.5, hi = 155;
    for (let i = 0; i < 20; i++) {
      horizontal = (lo + hi) / 2;
      result = flight(origin, horizontal, up, dx, dz);
      if (result.distance < distance) lo = horizontal;
      else hi = horizontal;
    }
    result = flight(origin, horizontal, up, dx, dz);
    if (result.netY >= COURT.netHeight + (type === 'clear' ? 0.55 : type==='serve'?.045:.12)) break;
    up += type==='serve' ? .35 : 2.2;
  }
  return { x: dx * horizontal, y: up, z: dz * horizontal };
}

export function predict(origin, velocity, side = 1, height = 2.05) {
  const p = { ...origin }, v = { ...velocity };
  let intercept = null, landing = null;
  for (let i = 0; i < 720; i++) {
    advance(p, v, 1 / 120);
    if (!intercept && p.z * side > 0.65 && v.y < 0 && p.y <= height && p.y > 0.12) {
      intercept = { ...p, time: (i + 1) / 120 };
    }
    if (p.y <= 0.06) { landing = { ...p, time: (i + 1) / 120 }; break; }
  }
  return { intercept, landing };
}

export function isInCourt(p) {
  return Math.abs(p.x) <= COURT.halfWidth + 0.025 && Math.abs(p.z) <= COURT.halfLength + 0.025;
}

export function winnerOnLanding(p, lastHitter) {
  if (!isInCourt(p)) return lastHitter === 'player' ? 'opponent' : 'player';
  return p.z > 0 ? 'opponent' : 'player';
}
