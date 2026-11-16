import test from 'node:test';
import assert from 'node:assert/strict';
import { landingCall, winnerOnLanding, groundCrossing, createGroundMotion, stepGroundMotion, CONTACT_HEIGHT, CORK_RADIUS, COURT } from '../physics.mjs';
import { FlightRecorder, replaySample } from '../eagle-eye.mjs';

test('cork touching a 40 mm singles line is in; feather skirt outside cannot change a call', () => {
  for (const sign of [-1, 1]) {
    assert.equal(landingCall({ x: sign * 2.62, z: -4 }).inside, true);
    assert.equal(landingCall({ x: sign * 2.62, z: -4 }).onLine, true);
    assert.equal(landingCall({ x: sign * 2.624, z: -4 }).inside, false);
    assert.equal(landingCall({ x: 0, z: sign * 6.732 }).inside, true);
    assert.equal(landingCall({ x: 0, z: sign * 6.734 }).inside, false);
  }
  assert.equal(landingCall({ x: 3.0, z: -4 }).inside, false, 'singles sidelines, not doubles');
  assert.equal(landingCall({ x: 0, z: -3 }).onLine, false);
  assert.equal(winnerOnLanding({ x: 2.62, z: -4 }, 'player'), 'player');
  assert.equal(winnerOnLanding({ x: 2.624, z: -4 }, 'player'), 'opponent');
});

test('corner calls use circular cork contact instead of a rectangular tolerance', () => {
  const x = COURT.halfWidth + .02, z = COURT.halfLength + .02;
  assert.equal(landingCall({ x: x + .008, z: z + .008 }).inside, true);
  assert.equal(landingCall({ x: x + .01, z: z + .01 }).inside, false);
  assert.equal(landingCall({ x: x + CORK_RADIUS, z }).inside, true);
});

test('substep crossing judges the first contact, not the overshot endpoint', () => {
  const p = groundCrossing({ x: 2.60, y: .06, z: -4 }, { x: 2.68, y: 0, z: -4.1 });
  assert.equal(p.fraction, .5); assert.ok(Math.abs(p.x - 2.64) < 1e-10);
  assert.equal(p.y, CONTACT_HEIGHT); assert.equal(landingCall(p).inside, false);
  assert.equal(groundCrossing({ x: 0, y: 2, z: 0 }, { x: 0, y: 1, z: 0 }), null);
});

test('shuttle rebounds briefly, loses energy, tips onto its feathers and comes to rest', () => {
  for (const speed of [1.5, 7, 25]) {
    const body = createGroundMotion({ x: 0, y: CONTACT_HEIGHT, z: -4 }, { x: 3, y: -speed, z: -5 });
    let apex = body.pos.y;
    for (let i = 0; i < 360; i++) {
      stepGroundMotion(body, 1 / 120); apex = Math.max(apex, body.pos.y);
      assert.ok(body.pos.y >= CONTACT_HEIGHT); assert.ok(Number.isFinite(body.pos.x + body.pos.y + body.roll));
    }
    assert.ok(apex < .75, `exaggerated bounce ${apex}`);
    if (speed > 5) assert.ok(apex > .065);
    assert.ok(body.settled); assert.ok(Math.hypot(body.vel.x, body.vel.y, body.vel.z) < 1e-8);
    assert.ok(body.tilt > 1.50); assert.ok(body.bounces <= 3);
    assert.ok(Math.hypot(body.pos.x, body.pos.z + 4) < 1);
  }
});

test('ground animation remains stable at 30, 60 and 120 fps', () => {
  const results = [30, 60, 120].map(fps => {
    const body = createGroundMotion({ x: 0, y: .03, z: 0 }, { x: 2, y: -12, z: -6 });
    for (let i = 0; i < fps * 2; i++) stepGroundMotion(body, 1 / fps);
    return body;
  });
  for (const body of results) { assert.ok(body.settled); assert.ok(Math.abs(body.pos.x - results[0].pos.x) < .01); assert.ok(Math.abs(body.pos.z - results[0].pos.z) < .01); }
});

test('recorded first contact and replay are immutable after ball bounces or a new rally starts', () => {
  const r = new FlightRecorder(), p = { x: 2.62, y: .03, z: -4 }, v = { x: 1, y: -8, z: -1 };
  r.record('1', { x: 2.5, y: 1, z: -3.5 }); r.record('1', p, .2);
  const record = r.finish(p, v, 'player');
  const frozen = JSON.stringify(record); p.x = 4; v.y = 3;
  r.record('2', { x: 0, y: 2, z: 3 });
  assert.equal(JSON.stringify(record), frozen); assert.equal(record.call.inside, true); assert.equal(r.samples.length, 1);
  const mid = replaySample(record.samples, .1);
  assert.ok(Math.abs(mid.x - 2.56) < 1e-8); assert.ok(Math.abs(mid.y - .515) < 1e-8);
  assert.equal(replaySample(record.samples, 99).x, 2.62); assert.equal(replaySample([], 0), null);
});
