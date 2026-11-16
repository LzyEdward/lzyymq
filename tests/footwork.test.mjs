import test from 'node:test';
import assert from 'node:assert/strict';
import {FootPlant} from '../footwork.mjs';

test('a planted sole stays fixed while the body travels through a stance',()=>{
 const foot=new FootPlant();const anchor=foot.sample([.2,.076,.3],.02);
 for(let t=.04;t<.5;t+=.02)assert.deepEqual(foot.sample([.2,.076,.3+t],t),anchor);
});
test('a lifted foot blends smoothly and resets safely after a teleport or stop',()=>{
 const foot=new FootPlant();foot.sample([0,0,0],.01);
 assert.ok(foot.sample([.1,.1,.1],.53)[1]>0);
 assert.deepEqual(foot.sample([.2,.1,.3],.8),[.2,.1,.3]);
 assert.deepEqual(foot.sample([6,0,6],.2),[6,0,6]);
 assert.deepEqual(foot.sample([.1,0,.1],.2,false),[.1,0,.1]);
});
