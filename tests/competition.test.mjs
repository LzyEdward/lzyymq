import test from 'node:test';
import assert from 'node:assert/strict';
import {OPPONENT_LEVELS,placementSpread,matchFinished,rankName,freshCareer,parseCareer,settleMatch} from '../competition.mjs';

test('11 and 21 point games require two clear points and enforce their own caps',()=>{
 for(const [points,a,b,expected] of [[11,11,10,false],[11,12,10,true],[11,15,14,true],[21,21,20,false],[21,22,20,true],[21,30,29,true],[21,15,0,false]])assert.equal(matchFinished([a,b],points),expected);
});
test('all ten reference grades increase speed, reaction, placement, reach, net skill, anticipation, and attack',()=>{
 const levels=Object.values(OPPONENT_LEVELS);assert.equal(levels.length,10);
 for(let i=1;i<levels.length;i++){
  for(const k of ['tier','rating','speed','reach','accuracy','attack','power','netSkill','anticipation','acceleration'])assert.ok(levels[i][k]>levels[i-1][k],k);
  assert.ok(levels[i].reaction<levels[i-1].reaction);
 }
});
test('completed ranked wins persist with stronger rewards against stronger opposition',()=>{
 const base=freshCareer(),easy=settleMatch(base,{id:'a',level:'easy',score:[11,4]}),master=settleMatch(base,{id:'b',level:'master',score:[11,9]});
 assert.ok(easy.applied&&master.delta>easy.delta);assert.equal(master.career.played,1);assert.equal(master.career.wins,1);
 const restored=parseCareer(JSON.stringify(master.career));assert.deepEqual(restored,master.career);
 const duplicate=settleMatch(restored,{id:'b',score:[11,9]});assert.equal(duplicate.applied,false);assert.equal(duplicate.career.rating,restored.rating);
 assert.equal(rankName(1700),'大师');
});

test('AI placement precision improves with level and degrades under fatigue or poor contact',()=>{
 const levels=Object.keys(OPPONENT_LEVELS);
 for(let i=1;i<levels.length;i++)assert.ok(placementSpread(levels[i])<placementSpread(levels[i-1]));
 for(const key of levels){
  assert.ok(placementSpread(key,.5,100)>placementSpread(key,1,100));
  assert.ok(placementSpread(key,1,15)>placementSpread(key,1,100));
 }
});
test('practice, unfinished matches and retries cannot farm career points; losses reset the streak',()=>{
 const c=freshCareer();assert.equal(settleMatch(c,{id:'p',mode:'practice',score:[11,0]}).applied,false);
 assert.equal(settleMatch(c,{id:'p',score:[10,2]}).applied,false);
 const win=settleMatch(c,{id:'w',score:[11,2]}).career,loss=settleMatch(win,{id:'l',score:[2,11]});
 assert.ok(loss.delta<0);assert.equal(loss.career.streak,0);assert.equal(loss.career.bestStreak,1);assert.equal(loss.career.played,2);
 assert.deepEqual(parseCareer('bad json'),freshCareer());assert.equal(parseCareer({rating:1e8,played:2,wins:900}).wins,2);
});
test('career trophy counts survive reload and old career saves receive an empty trophy collection',()=>{
 const old=parseCareer({rating:1000,played:0,wins:0,streak:0,bestStreak:0,history:[]});assert.deepEqual(old.trophies,{});
 const withTitle=parseCareer({...old,trophies:{allEngland:2,olympics:1,invalid:'x'}});assert.deepEqual(withTitle.trophies,{allEngland:2,olympics:1});
 assert.deepEqual(parseCareer(JSON.stringify(withTitle)),withTitle);
});
