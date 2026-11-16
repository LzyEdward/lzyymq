import test from 'node:test';
import assert from 'node:assert/strict';
import {RenderLoop} from '../render-loop.mjs';

function harness(frame){let id=0;const tasks=new Map(),cancelled=[];return {tasks,cancelled,loop:new RenderLoop(frame,{request:f=>{tasks.set(++id,f);return id;},cancel:n=>{cancelled.push(n);tasks.delete(n);}}),step(time){const [n,f]=tasks.entries().next().value;tasks.delete(n);f(time);}};}
test('context recovery has one frame chain and never advances while stopped',()=>{
 let count=0;const h=harness(()=>count++);
 h.loop.start();h.loop.start();assert.equal(h.tasks.size,1);h.step(10);assert.equal(count,1);
 h.loop.stop();assert.equal(h.tasks.size,0);assert.equal(h.cancelled.length,1);
 h.loop.start();h.loop.start();assert.equal(h.tasks.size,1);h.step(50000);assert.equal(count,2);assert.equal(h.tasks.size,1);
});
test('stopping inside a frame prevents scheduling and id zero is cancellable',()=>{
 let h;h=harness(()=>h.loop.stop());h.loop.start();h.step(1);assert.equal(h.tasks.size,0);assert.equal(h.loop.running,false);
 let cancelled;const loop=new RenderLoop(()=>{},{request:()=>0,cancel:id=>cancelled=id});loop.start();loop.stop();assert.equal(cancelled,0);
});
test('a refused scheduler does not leave a falsely running loop',()=>{
 const loop=new RenderLoop(()=>{},{request:()=>{throw Error('unavailable');}});assert.throws(()=>loop.start());assert.equal(loop.running,false);assert.equal(loop.pending,null);
});
