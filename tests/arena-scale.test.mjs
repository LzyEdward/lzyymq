import test from 'node:test';
import assert from 'node:assert/strict';
import {ARENA,ARENA_AUDIENCE_CAPACITY} from '../arena-layout.mjs';

test('competition venue spans a full-size arena with a tall roof and thousands of modeled seats',()=>{
 assert.ok(ARENA.width>=48&&ARENA.length>=60);
 assert.ok(ARENA.wallHeight>=18&&ARENA.roofY>ARENA.wallHeight);
 assert.ok(ARENA_AUDIENCE_CAPACITY>=2500);
});
