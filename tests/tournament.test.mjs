import test from 'node:test';
import assert from 'node:assert/strict';
import {TOUR_EVENTS,TOUR_ROSTER,EXHIBITION_ROSTER,TOUR_STARS,chooseRandomOpponent,freshTour,currentTourMatch,advanceTour,tourStatus} from '../tournament.mjs';

test('six events expose five playable rounds and a 32-player cross-era roster',()=>{
  assert.equal(TOUR_EVENTS.length,6);
  assert.equal(TOUR_ROSTER.length,32);
  assert.ok(TOUR_ROSTER.every(id=>TOUR_STARS[id]?.name&&TOUR_STARS[id]?.signature));
  assert.ok(TOUR_EVENTS.every(item=>item.rounds.length===5&&item.draw.length===32));
});

test('each career save contains a complete 32-slot knockout bracket',()=>{
  const run=freshTour('china');
  assert.deepEqual(run.bracket.map(round=>round.length),[16,8,4,2,1]);
  assert.equal(run.bracket[0].flatMap(match=>[match.a,match.b]).filter(Boolean).length,32);
  assert.equal(run.bracket.flat().filter(match=>match.player).length,5);
  assert.equal(new Set(run.bracket[0].flatMap(match=>[match.a,match.b])).size,32);
});

test('exhibition pool expands beyond the tournament roster and rotates away from recent rivals',()=>{
  assert.equal(EXHIBITION_ROSTER.length,48);
  const sample=chooseRandomOpponent(EXHIBITION_ROSTER,['linDan','leeChongWei'],()=>0);
  assert.notEqual(sample,'linDan');
  assert.notEqual(sample,'leeChongWei');
  assert.ok(TOUR_STARS[sample]);
  assert.ok(TOUR_STARS[chooseRandomOpponent(['linDan'],['linDan'],()=>0)]);
});

test('a tournament win advances opponent and round, then crowns after the final',()=>{
  let run=freshTour('allEngland');
  assert.equal(currentTourMatch(run).round,'32强');
  for(let round=1;round<5;round++){
    run=advanceTour(run,true);
    assert.equal(run.roundIndex,round);
    assert.equal(currentTourMatch(run).round,TOUR_EVENTS[0].rounds[round]);
  }
  run=advanceTour(run,true);
  assert.equal(run.completed,true);
  assert.equal(currentTourMatch(run),null);
  assert.equal(tourStatus(run),'冠军');
});

test('a tournament loss eliminates the run without silently advancing',()=>{
  const first=freshTour('indonesia');
  const eliminated=advanceTour(first,false);
  assert.equal(eliminated.eliminated,true);
  assert.equal(eliminated.roundIndex,0);
  assert.equal(tourStatus(eliminated),'止步淘汰');
});
