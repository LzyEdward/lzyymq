import test from 'node:test';
import assert from 'node:assert/strict';
import {RenderBudget,renderProfile,AdaptiveResolution} from '../render-budget.mjs';

test('high-refresh displays render at most 60 game frames per second',()=>{
 for(const refresh of [60,90,120,144,165,240]){
  const budget=new RenderBudget();let frames=0,time=0;
  for(let i=0;i<refresh*10;i++){const dt=budget.take(i*1000/refresh,{screen:'play'});if(dt!==null){frames++;time+=dt;}}
  assert.ok(frames>=590&&frames<=601,`${refresh} Hz produced ${frames} frames`);
  assert.ok(Math.abs(time-10000)<40,'frame cap must preserve elapsed time and game speed');
 }
});
test('pause stops redrawing and hiding stops rendering; resuming discards hidden time',()=>{
 const b=new RenderBudget();assert.ok(b.take(0,{screen:'play'})!==null);
 assert.ok(b.take(16.67,{screen:'pause'})!==null);
 for(let t=33;t<1000;t+=17)assert.equal(b.take(t,{screen:'pause'}),null);
 b.invalidate();assert.ok(b.take(1000,{screen:'pause'})!==null);
 assert.equal(b.take(1017,{screen:'pause'}),null);
 for(let t=2000;t<3000;t+=17)assert.equal(b.take(t,{screen:'play',hidden:true}),null);
 assert.ok(b.take(30000,{screen:'play'})<17,'returning must not fast-forward the rally');
});
test('menu runs at 15 FPS and same-screen static inspector invalidation draws once',()=>{
 const b=new RenderBudget();let frames=0;for(let i=0;i<600;i++)if(b.take(i*1000/60,{screen:'menu'})!==null)frames++;
 assert.ok(frames<=151&&frames>=149);
 assert.ok(b.take(11000,{screen:'hand-inspect'})!==null);assert.equal(b.take(12000,{screen:'hand-inspect'}),null);b.invalidate();assert.ok(b.take(12001,{screen:'hand-inspect'})!==null);
});
test('automatic rendering has bounded pixels even on 4K retina displays',()=>{
 for(const [w,h,dpr] of [[1280,720,1],[1920,1080,2],[3840,2160,2],[800,600,1]]){
  const p=renderProfile('auto',1,w,h,dpr);assert.ok(w*h*p.ratio*p.ratio<=921601);assert.equal(p.quality,'balanced');assert.equal(p.shadows,false);assert.equal(p.samples,0);
 }
 assert.ok(renderProfile('auto',.7).ratio<renderProfile('auto',1).ratio);
 for(const [w,h] of [[1920,1080],[3840,2160]])assert.ok(renderProfile('auto',.65,w,h,2).ratio<renderProfile('auto',1,w,h,2).ratio*.7,'adaptation must reduce 4K pixel budgets too');
 assert.equal(renderProfile('high').shadows,true);
 const low=renderProfile('balanced',1,1920,1080,2),auto=renderProfile('auto',1,1920,1080,2);
 assert.ok(low.ratio<auto.ratio*.85,'low load must actually reduce pixels on a full HD display');
 assert.ok(1920*1080*low.ratio**2<=640001);
});
test('resolution adapts to sustained slow frames, ignores isolated spikes and never oscillates up',()=>{
 const a=new AdaptiveResolution();a.reset();for(let i=0;i<600;i++)a.sample(i===290?90:16.67,i*16.67);assert.equal(a.scale,1);
 let lowered=0;for(let i=0;i<1200;i++)if(a.sample(33.33,12000+i*33.33))lowered++;
 assert.ok(lowered>1);assert.equal(a.scale,.65);
 for(let i=0;i<600;i++)a.sample(16.67,60000+i*16.67);assert.equal(a.scale,.65);
});
