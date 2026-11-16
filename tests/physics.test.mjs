import test from 'node:test';
import assert from 'node:assert/strict';
import { advance, solveShot, predict, isInCourt, winnerOnLanding, COURT } from '../physics.mjs';

function simulate(origin, velocity) {
  const p = { ...origin }, v = { ...velocity }; let netY = null, apex = p.y, time = 0;
  for (let i = 0; i < 2400 && p.y > .06; i++) {
    const old = { ...p }; advance(p, v, 1 / 120); time += 1 / 120; apex = Math.max(apex, p.y);
    if (old.z * p.z < 0) { const t = old.z / (old.z - p.z); netY = old.y + (p.y - old.y) * t; }
  }
  return { p, v, netY, apex, time };
}

test('quadratic drag slows the shuttle without reversing its direction', () => {
  const p = { x: 0, y: 3, z: 0 }, v = { x: 0, y: 0, z: 70 };
  advance(p, v, .05); assert.ok(v.z < 70 && v.z > 0); assert.ok(v.y < 0);
});
test('a net brush clears the tape and lands at the called front-court zone',()=>{
 for(const target of [{x:-1.9,z:1.4},{x:0,z:1.1},{x:1.9,z:.95}]){
  const origin={x:.25,y:1.18,z:-2.05},velocity=solveShot(origin,target,'net');
  const result=simulate(origin,velocity);
  assert.ok(result.netY>COURT.netHeight&&result.netY<COURT.netHeight+.12,JSON.stringify({target,result}));
  assert.ok(Math.hypot(result.p.x-target.x,result.p.z-target.z)<.045,JSON.stringify({target,landing:result.p}));
 }
});
for (const side of [-1, 1]) for (const shot of ['clear', 'drive', 'drop', 'smash', 'serve', 'lift']) {
  test(`${shot} reaches the ${side === 1 ? 'near' : 'far'} court and clears the net`, () => {
    const origin = { x: -.8, y: shot === 'smash' ? 3.1 : 1.8, z: -side * 4.5 };
    const target = { x: 1.25, z: side * (shot === 'drop' ? 1.15 : 5.5) };
    const result = simulate(origin, solveShot(origin, target, shot));
    assert.ok(result.netY > COURT.netHeight, `${shot}: net ${result.netY}`);
    assert.ok(Math.hypot(result.p.x - target.x, result.p.z - target.z) < .15, `${shot}: target error ${JSON.stringify(result.p)}`);
    assert.ok(result.time < 5); assert.ok(isInCourt(result.p));
  });
}
test('clear and drop have distinct trajectories and flight times', () => {
  const o = { x: 0, y: 2, z: 4 };
  const clear = simulate(o, solveShot(o, { x: 0, z: -5.8 }, 'clear'));
  const drop = simulate(o, solveShot(o, { x: 0, z: -1.2 }, 'drop'));
  assert.ok(clear.apex > drop.apex + 2); assert.ok(clear.time > drop.time);
});
test('a low serve clears the tape by a small margin and reaches the short service area',()=>{
 const origin={x:.45,y:1.16,z:3.4},target={x:-1.25,z:-2.15};
 const result=simulate(origin,solveShot(origin,target,'serve'));
 assert.ok(result.netY>COURT.netHeight&&result.netY<COURT.netHeight+.25,JSON.stringify(result));
 assert.ok(result.apex<2.2,JSON.stringify(result));
 assert.ok(Math.hypot(result.p.x-target.x,result.p.z-target.z)<.15,JSON.stringify(result.p));
});
test('a high singles serve reaches the rear service area with a clear arc',()=>{
 const origin={x:.45,y:1.16,z:3.4},target={x:-1.25,z:-5.45};
 const result=simulate(origin,solveShot(origin,target,'serve',{up:10}));
 assert.ok(result.netY>COURT.netHeight+.35,JSON.stringify(result));
 assert.ok(result.apex>3.4,JSON.stringify(result));
 assert.ok(Math.hypot(result.p.x-target.x,result.p.z-target.z)<.18,JSON.stringify(result.p));
 assert.ok(isInCourt(result.p),JSON.stringify(result.p));
});
test('prediction locates a descending intercept and the landing point', () => {
  const o = { x: -1, y: 2.2, z: -4.8 }, v = solveShot(o, { x: .8, z: 5.6 }, 'clear');
  const result = predict(o, v, 1);
  assert.ok(result.intercept && result.intercept.z > 0); assert.ok(result.intercept.y <= 2.05);
  assert.ok(result.landing && Math.abs(result.landing.z - 5.6) < .15);
  assert.ok(result.intercept.time < result.landing.time);
});
test('singles boundaries and score ownership include line tolerance', () => {
  assert.equal(isInCourt({ x: 2.6, z: 6.7 }), true);
  assert.equal(isInCourt({ x: 2.8, z: 3 }), false);
  assert.equal(winnerOnLanding({ x: 0, z: -4 }, 'player'), 'player');
  assert.equal(winnerOnLanding({ x: 0, z: 4 }, 'opponent'), 'opponent');
  assert.equal(winnerOnLanding({ x: 3.1, z: -4 }, 'player'), 'opponent');
  assert.equal(winnerOnLanding({ x: 0, z: 7 }, 'opponent'), 'player');
});

