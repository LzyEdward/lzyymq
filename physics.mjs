// Metres, seconds. Feather drag is proportional to velocity squared.
export const COURT = Object.freeze({ halfWidth: 2.59, halfLength: 6.7, netHeight: 1.524, drag: 0.135, gravity: 9.81 });
export const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
export const damp = (a, b, lambda, dt) => a + (b - a) * (1 - Math.exp(-lambda * dt));
// Court lines are 40 mm wide; the cork, not the feather skirt, touches first.
export const CONTACT_HEIGHT = .03;
export const CORK_RADIUS = .013;
export const LINE_HALF_WIDTH = .02;

export function landingCall(p) {
  const xGap = COURT.halfWidth + LINE_HALF_WIDTH - Math.abs(p.x);
  const zGap = COURT.halfLength + LINE_HALF_WIDTH - Math.abs(p.z);
  const clearance = xGap < 0 && zGap < 0 ? -Math.hypot(xGap, zGap) : Math.min(xGap, zGap);
  const inside = clearance >= -CORK_RADIUS - 1e-9;
  const onLine = inside && clearance <= .04 + CORK_RADIUS;
  return { inside, onLine, clearance, margin: clearance + CORK_RADIUS,
    nearLine: Math.abs(clearance) <= .18,
    line: xGap < zGap ? (p.x < 0 ? '左单打边线' : '右单打边线') : (p.z < 0 ? '对方底线' : '己方底线') };
}

export function groundCrossing(previous, current) {
  if (current.y > CONTACT_HEIGHT) return null;
  const t = clamp((previous.y - CONTACT_HEIGHT) / Math.max(1e-9, previous.y - current.y), 0, 1);
  return { x: previous.x + (current.x - previous.x) * t, y: CONTACT_HEIGHT,
    z: previous.z + (current.z - previous.z) * t, fraction: t };
}

export function createGroundMotion(position, velocity) {
  const speed = Math.hypot(velocity.x, velocity.z);
  const impact = Math.max(0, -velocity.y);
  // Separate cork compression from tangential skid. A hard, steep hit has a
  // visible rebound; a grazing contact keeps more travel along the mat.
  const restitution = .34 / (1 + impact * .023);
  const grazing = speed / Math.max(.001, speed + impact);
  const tangent = .16 + grazing * .48;
  return { pos: { ...position, y: CONTACT_HEIGHT },
    vel: { x: velocity.x * tangent, y: Math.min(3.6, impact * restitution), z: velocity.z * tangent },
    age: 0, bounces: 0, settled: false, tilt: Math.atan2(speed, Math.max(.01, impact)),
    heading: Math.atan2(-velocity.x, -velocity.z), roll: 0,
    spin: Math.min(16, 2 + impact * .35 + speed * .22), impactSpeed: impact, lastImpact: impact };
}

export function stepGroundMotion(body, dt) {
  let impacts = 0;
  for (let remaining = Math.min(Math.max(dt, 0), .1); remaining > 1e-8;) {
    const h = Math.min(remaining, 1 / 240); remaining -= h; body.age += h;
    // Turn over through the rebound, then land on the feather rim. Do not snap
    // from the incoming flight orientation to a vertical, cork-down pose.
    const turnover = body.age < .055 ? 1.5 : body.settled ? 13 : 4.8;
    body.tilt = damp(body.tilt, Math.PI * .50, turnover, h);
    const support = Math.max(CONTACT_HEIGHT, .032 * Math.sin(body.tilt) - .068 * Math.cos(body.tilt) + .003);
    if (!body.settled) {
      const drag = Math.exp(-(1.2 + 2.8 * Math.sin(body.tilt) ** 2) * h);
      body.vel.x *= drag; body.vel.z *= drag; body.vel.y -= COURT.gravity * h;
      body.pos.x += body.vel.x * h; body.pos.y += body.vel.y * h; body.pos.z += body.vel.z * h;
      if (body.pos.y <= support && body.vel.y < 0) {
        body.pos.y = support; body.bounces++; impacts++; body.lastImpact = -body.vel.y;
        const rim = Math.sin(body.tilt) ** 2;
        body.vel.y *= -(.25 - .12 * rim);
        body.vel.x *= .46 - .18 * rim; body.vel.z *= .46 - .18 * rim;
        if (body.vel.y < .18 || body.bounces >= 3) { body.settled = true; body.vel.y = 0; }
      }
    } else {
      const speed = Math.hypot(body.vel.x, body.vel.z);
      const next = Math.max(0, speed - 4.6 * h);
      const scale = speed > 1e-8 ? next / speed : 0;
      body.vel.x *= scale; body.vel.z *= scale;
      body.pos.x += body.vel.x * h; body.pos.z += body.vel.z * h;
    }
    body.spin *= Math.exp(-(body.settled ? 10 : 3) * h); body.roll += body.spin * h;
    // A tipped feather skirt rests on its rim, above the mat rather than through it.
    body.pos.y = Math.max(body.pos.y, support);
  }
  return impacts;
}

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
    if (p.y <= CONTACT_HEIGHT) { Object.assign(p, groundCrossing(previous, p)); break; }
  }
  return { distance: Math.hypot(p.x - origin.x, p.z - origin.z), position: p, netY, time, points };
}

export function solveShot(origin, target, type = 'clear',options={}) {
  const distance = Math.hypot(target.x - origin.x, target.z - origin.z);
  const dx = (target.x - origin.x) / Math.max(distance, 0.01);
  const dz = (target.z - origin.z) / Math.max(distance, 0.01);
  if(['net','netcross','drop','slicedrop'].includes(type)){
    // Solve both range and net height so a net shot skims the tape instead of
    // inheriting the tall arc of a rear-court drop.
    const touch = clamp(options.touch ?? 1, .2, 1.6);
    const clearance = type==='net' ? .065 + (1.4-touch)*.04 : type==='netcross' ? .09 + (1.4-touch)*.035 : type==='slicedrop' ? .12 + (1.4-touch)*.055 : .18 + (1.4-touch)*.065;
    let lowUp=-16,highUp=24,up=0,horizontal=0;
    for(let pass=0;pass<22;pass++){
      up=(lowUp+highUp)/2;let low=.1,high=100;
      for(let i=0;i<22;i++){horizontal=(low+high)/2;const f=flight(origin,horizontal,up,dx,dz);if(f.distance<distance)low=horizontal;else high=horizontal;}
      const result=flight(origin,horizontal,up,dx,dz);
      if(result.netY<COURT.netHeight+clearance)lowUp=up;else highUp=up;
    }
    return {x:dx*horizontal,y:up,z:dz*horizontal};
  }
  if((type==='smash'||type==='slicesmash'||type==='netkill')&&Number.isFinite(options.speed)){
    const horizontal=clamp(options.speed,12,110);let lo=-85,hi=35,up=0,result;
    for(let i=0;i<28;i++){up=(lo+hi)/2;result=flight(origin,horizontal,up,dx,dz);if(result.distance<distance)lo=up;else hi=up;}
    result=flight(origin,horizontal,up,dx,dz);
    if(result.netY>=COURT.netHeight+.065)return {x:dx*horizontal,y:up,z:dz*horizontal};
  }
  let up = ({ clear: 15.8, drive: 5.1, push:4.1,netkill:-3.8,drop: 6.1, smash: -6.5, slicesmash:-4.8, serve: 3.6, lift: 18 })[type] ?? 12;
  if(type==='serve'&&Number.isFinite(options.up))up=clamp(options.up,3.6,10);
  if (['smash','slicesmash'].includes(type) && origin.y < 2.65) up = 1.5;
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
    if (p.y <= CONTACT_HEIGHT) { landing = { ...p, time: (i + 1) / 120 }; break; }
  }
  return { intercept, landing };
}

export function isInCourt(p) {
  return landingCall(p).inside;
}

export function winnerOnLanding(p, lastHitter) {
  if (!isInCourt(p)) return lastHitter === 'player' ? 'opponent' : 'player';
  return p.z > 0 ? 'opponent' : 'player';
}
