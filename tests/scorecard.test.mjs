import test from 'node:test';
import assert from 'node:assert/strict';
import {drawPlayerCard,drawScorecard} from '../scorecard.mjs';

function recordingContext(){
 const text=[];
 const context={
  text,
  save(){},restore(){},beginPath(){},arc(){},fill(){},fillRect(){},roundRect(){},
  createLinearGradient(){return{addColorStop(){}}},
  measureText(value){return{width:[...value].length*19};},
  fillText(value){text.push(String(value));},
 };
 return context;
}

test('shareable match card carries the played score, opponent, event and highlight',()=>{
 const context=recordingContext();
 drawScorecard(context,1080,1350,{player:'林楠',opponent:'石宇奇',score:[21,18],event:'奥运会 · 决赛',won:true,champion:true,rank:7,speed:389,winners:12,rally:27,highlight:'一记劈杀斜线拿下冠军！'});
 assert.ok(context.text.includes('冠军到手！'));
 assert.ok(context.text.includes('林楠'));
 assert.ok(context.text.includes('石宇奇'));
 assert.ok(context.text.includes('21 : 18'));
 assert.ok(context.text.includes('奥运会 · 决赛'));
 assert.ok(context.text.some(line=>line.includes('一记劈杀斜线拿下冠军！')));
});

test('player card reflects current costume and career milestones',()=>{
 const context=recordingContext();
 drawPlayerCard(context,1080,1350,{emoji:'🦆',costume:'鸭鸭队长',rank:24,rating:1480,wins:18,bestStreak:7,titles:2});
 assert.ok(context.text.includes('鸭鸭队长'));
 assert.ok(context.text.includes('#24'));
 assert.ok(context.text.includes('18 场'));
 assert.ok(context.text.includes('7 场'));
 assert.ok(context.text.includes('2 座'));
});
