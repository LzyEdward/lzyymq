import test from 'node:test';
import assert from 'node:assert/strict';
import {PLAYER_STYLES,OPPONENT_STYLES,effectiveOpponentLevel,playerStatsForStyle} from '../player-styles.mjs';
import {OPPONENT_LEVELS} from '../competition.mjs';

test('player presets expose bounded, distinct game attributes',()=>{
 const keys=Object.keys(PLAYER_STYLES);
 assert.deepEqual(keys,['custom','linDan08','leeChongWei','chenLong','taufik']);
 const presets=keys.map(playerStatsForStyle);
 for(const stats of presets)for(const value of Object.values(stats))assert.ok(value>=.7&&value<=1.4);
 assert.ok(playerStatsForStyle('linDan08').attack>playerStatsForStyle('leeChongWei').attack);
 assert.ok(playerStatsForStyle('leeChongWei').speed>playerStatsForStyle('linDan08').speed);
 assert.ok(playerStatsForStyle('taufik').net>playerStatsForStyle('chenLong').net);
});

test('opponent star styles preserve grade identity while changing on-court traits',()=>{
 const base=OPPONENT_LEVELS.easy;
 for(const key of Object.keys(OPPONENT_STYLES)){
  const level=effectiveOpponentLevel(base,key);
  assert.equal(level.tier,base.tier);
  assert.ok(level.speed>0&&level.reaction>0&&level.power>0);
 }
 assert.ok(effectiveOpponentLevel(base,'leeChongWei').speed>effectiveOpponentLevel(base,'linDan08').speed);
 assert.ok(effectiveOpponentLevel(base,'taufik').netSkill>base.netSkill);
});
