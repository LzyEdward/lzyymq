import test from 'node:test';
import assert from 'node:assert/strict';
import { COURT, advance, groundCrossing, landingCall } from '../physics.mjs';
import { TRAINING_NAMES, TRAINING_REPS, trainingRep, gradeTrainingRep } from '../training.mjs';

test('all training feeds clear the tape and land in the chosen receiving lane', () => {
  for (const mode of Object.keys(TRAINING_NAMES)) {
    const kinds = new Set();
    for (let i = 0; i < TRAINING_REPS; i++) {
      const rep = trainingRep(mode, i);
      const position = { ...rep.origin }, velocity = { ...rep.velocity };
      let crossing, landing;
      for (let step = 0; step < 480 && !landing; step++) {
        const previous = { ...position };
        advance(position, velocity, 1 / 120);
        if (previous.z < 0 && position.z >= 0) {
          crossing = previous.y + (position.y - previous.y) * previous.z / (previous.z - position.z);
        }
        landing = groundCrossing(previous, position);
      }
      kinds.add(rep.kind);
      assert.ok(crossing > COURT.netHeight + .035, `${mode} ball ${i + 1} hit the tape`);
      assert.ok(landingCall(landing).inside && landing.z > 0);
      assert.ok(Math.hypot(landing.x - rep.target.x, landing.z - rep.target.z) < .08);
      assert.equal(Math.sign(landing.x), i % 2 ? 1 : -1);
    }
    assert.equal(kinds.size, mode === 'mixed' ? 3 : 1);
  }
});

test('a drill scores the actual shot and landing independently of the selected stroke', () => {
  const landing = { x: 2, z: -1.1 };
  assert.equal(gradeTrainingRep('net', { shot: { type:'netcross' }, landing }).success, true);
  assert.equal(gradeTrainingRep('net', { shot: { type:'clear' }, landing }).success, false);
  assert.equal(gradeTrainingRep('net', { shot: { type:'net' }, landing: { x:2,z:-3.0 } }).success, false);
  const smash = { type:'smash', kmh:219, launchY:-5 };
  assert.equal(gradeTrainingRep('attack', { shot:smash, landing }).success, true);
  assert.equal(gradeTrainingRep('attack', { shot:{ ...smash, launchY:1 }, landing }).success, false);
  assert.equal(gradeTrainingRep('attack', { shot:{ ...smash, kmh:70 }, landing }).success, false);
  assert.equal(gradeTrainingRep('attack', { shot:smash, landing:{ x:3,z:-2 } }).success, false);
  assert.equal(gradeTrainingRep('receive', { shot:{ type:'clear' }, landing }).success, true);
  assert.equal(gradeTrainingRep('receive', { shot:smash, outcome:'net' }).success, false);
  assert.match(gradeTrainingRep('receive', { missed:true }).reason, /挥空/);
});
