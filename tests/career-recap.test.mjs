import test from 'node:test';
import assert from 'node:assert/strict';
import {freshCareer,settleMatch,parseCareer} from '../competition.mjs';
import {matchHighlight} from '../tactics.mjs';
test('a migrated career retains a rivalry and quarterfinal progress after reload',()=>{
 const c=parseCareer({rating:1010,played:0,wins:0,history:[]});
 const match={id:'draw',eventId:'china',round:1,opponentId:'ginting',score:[11,8],highlight:'10 比 8 时，你用吊球拿下这一分。'};
 const {career}=settleMatch(c,match);
 assert.deepEqual(parseCareer(JSON.stringify(career)),career);
 assert.deepEqual(career.rivals.ginting,{wins:1,losses:0,lastWon:true,firstWin:{match:1,score:[11,8]}});
 assert.equal(career.bestRounds.china,2);assert.equal(career.history[0].highlight,match.highlight);
 assert.equal(settleMatch(career,match).applied,false);
 const lost=settleMatch(career,{...match,id:'loss',round:2,score:[3,11]}).career;
 assert.deepEqual(lost.rivals.ginting,{wins:1,losses:1,lastWon:false,firstWin:{match:1,score:[11,8]}});assert.equal(lost.bestRounds.china,2);
 assert.deepEqual(settleMatch(lost,{...match,id:'later',score:[11,3]}).career.rivals.ginting.firstWin,career.rivals.ginting.firstWin);
 assert.deepEqual(freshCareer().rivals,{});
});
test('a scorecard quotes the earned combination and its actual pre-point score',()=>{
 const win={playerWon:true,scoreBefore:[9,9],goal:11,construction:'shortAttack',method:'netkill',rallyLength:8};
 const loss={playerWon:false,scoreBefore:[10,11],goal:11,rallyLength:12};
 assert.match(matchHighlight([win,loss]),/^9 平时，你逼出短球，随后网前扑杀得分/);
 assert.match(matchHighlight([loss]),/周旋到第 12 拍/);assert.match(matchHighlight([{...loss,construction:'shortAttack',rallyLength:1}]),/对手拿下这一分/);assert.equal(matchHighlight([]),'');
});
