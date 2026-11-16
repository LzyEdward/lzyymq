import test from 'node:test';
import assert from 'node:assert/strict';
import { movementVector, gradeContact, strokeOutcome, shotTarget, Dash, targetDistance, DRILL_TARGETS, practiceFeed, smartStroke, racketPowerBoost } from '../gameplay.mjs';

test('court movement stays stable even when the player is looking sideways', () => {
  assert.deepEqual(movementVector({ forward: true }), { x: 0, z: 1, magnitude: 1, active: true });
  assert.deepEqual(movementVector({ left: true }), { x: -1, z: 0, magnitude: 1, active: true });
  assert.equal(movementVector({ axisX: .06, axisY: -.08 }).active, false);
});

test('diagonal movement is normalized and controller input combines with keys', () => {
  const diagonal = movementVector({ forward: true, right: true });
  assert.ok(Math.abs(Math.hypot(diagonal.x, diagonal.z) - 1) < 1e-12);
  const blended = movementVector({ forward: true, axisX: .75 });
  assert.ok(blended.x > 0 && blended.z > 0 && Math.hypot(blended.x, blended.z) <= 1.000001);
});

test('sweet-spot contact earns clean power and poor positioning loses quality without an assisted floor', () => {
  const perfect = gradeContact({ position: { x: 0, y: 1.82, z: 4.5 }, player: { x: 0, z: 4.5 }, kind: 'clear' });
  const reach = gradeContact({ position: { x: 2.2, y: .4, z: 4.2 }, player: { x: 0, z: 4.5 }, kind: 'clear' });
  assert.equal(perfect.rating, 'perfect');
  assert.equal(reach.rating, 'scramble');
  assert.ok(reach.quality < .66 && reach.quality < perfect.quality-.3);
});

test('smart return chooses a playable rescue, a placed net shot, and a true high-contact smash',()=>{
 assert.equal(smartStroke({position:{x:0,y:.72,z:4},player:{x:0,z:4.4}}),'lift');
 assert.equal(smartStroke({position:{x:0,y:2,z:1.2},player:{x:0,z:2}}),'drop');
 assert.equal(smartStroke({position:{x:0,y:3,z:3.4},player:{x:0,z:4}}),'smash');
 assert.equal(smartStroke({position:{x:0,y:1.8,z:4.3},player:{x:0,z:4.6}}),'drive');
 assert.equal(smartStroke({position:{x:2.4,y:2.8,z:3.2},player:{x:0,z:4.6}}),'clear');
});

test('extra racket profiles boost both overhead and net kills without boosting touch shots',()=>{
 assert.equal(racketPowerBoost('attack','netkill'),8);
 assert.equal(racketPowerBoost('aero','netkill'),4);
 assert.equal(racketPowerBoost('attack','push'),0);
 const netkill=strokeOutcome({position:{x:.15,y:2.1,z:2.5},player:{x:0,z:2.9},kind:'netkill',target:{x:1,z:-1.7}});
 assert.ok(netkill.speedMps>=28&&netkill.speedMps<=85);
});

test('racket profiles reward power on smashes only, with a stamina tradeoff for the attack frame',()=>{
 assert.equal(racketPowerBoost('control','smash'),0);assert.equal(racketPowerBoost('attack','smash'),8);
 assert.equal(racketPowerBoost('aero','smash'),4);assert.equal(racketPowerBoost('attack','drop'),0);
});

test('target drill provides six court zones and varied feeds', () => {
  assert.equal(DRILL_TARGETS.length, 6);
  assert.notEqual(practiceFeed(0).type, practiceFeed(1).type);
  assert.ok(targetDistance({ x: 0, z: 0 }, { x: 0, z: 1 }) === 1);
});

test('two-dimensional aim reaches corners and preserves chosen depth', () => {
  const near = shotTarget({ aim: -1, depth: -1.3, kind: 'drop', quality: .88 });
  const deep = shotTarget({ aim: 1, depth: -6.1, kind: 'clear', quality: .88 });
  assert.ok(near.x < -2.3 && near.z > -1.5);
  assert.ok(deep.x > 2.3 && deep.z < -6);
  assert.ok(shotTarget({ kind: 'drop' }).z > shotTarget({ kind: 'clear' }).z + 4);
  assert.equal(shotTarget({ kind: 'drop' }).z, -1.15);
});

test('dash distance is independent of frame size and respects cooldown and stamina', () => {
  const dash = new Dash();
  assert.equal(dash.start(1, 0, 13), false);
  assert.equal(dash.start(1, 0), true);
  assert.equal(dash.start(0, 1), false);
  let distance = 0;
  for (let i = 0; i < 120; i++) distance += dash.step(1 / 120).x;
  assert.ok(Math.abs(distance - 1.615) < 1e-8);
  assert.equal(dash.start(0, -1), false);
  dash.step(.2);
  assert.equal(dash.start(0, -1), true);
});
