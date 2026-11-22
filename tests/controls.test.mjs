import test from 'node:test';
import assert from 'node:assert/strict';
import {AutoReturnAssist,HitIntent,canContact,receivingTarget,pursuitSprint,receiveIntercept,swingWindow} from '../controls.mjs';
import {advance,solveShot} from '../physics.mjs';

test('an early tap survives release and waits for the incoming shuttle',()=>{
  const input=new HitIntent();input.press(10,null,'pointer');input.release('pointer');
  assert.equal(input.armed(12.8),true);assert.equal(input.armed(14.51),false);
});
test('automatic return is opt-in, triggers once per incoming shot, and yields to manual input',()=>{
 const assist=new AutoReturnAssist(),incoming={enabled:true,phase:'rally',active:true,lastHitter:'opponent',rally:4};
 assert.equal(assist.update({...incoming,enabled:false}),false);
 assert.equal(assist.update(incoming),true);
 assert.equal(assist.update({...incoming,manualIntent:true}),false,'manual swing takes priority');
 assert.equal(assist.update(incoming),false,'the same incoming shuttle is not auto-swung twice');
 assert.equal(assist.update({...incoming,rally:5}),true,'the next incoming shot may trigger');
 assert.equal(assist.update({...incoming,rally:5,swinging:true}),false);
 assert.equal(assist.update({...incoming,rally:6,enabled:false}),false,'turning the setting off cancels automation');
});
test('holding one button covers multiple returns without repeated clicks',()=>{
  const input=new HitIntent();input.press(0,null,'Space');
  for(const time of [3,12,25,60]){assert.equal(input.armed(time),true);input.consume();}
  input.release('Space');assert.equal(input.armed(61),false);
});
test('releasing a touch button cannot cancel a held keyboard input',()=>{
  const input=new HitIntent();input.press(0,null,'Space');input.press(1,'drop','mobile-hit');input.release('mobile-hit');input.consume();
  assert.equal(input.armed(30),true);input.clear();assert.equal(input.armed(30),false);
});
test('holding does not hit on the other side of the net or hit our own shot twice',()=>{
  const base={position:{x:0,y:2,z:1},velocity:{x:0,y:-3,z:5},player:{x:0,z:2},active:true,lastHitter:'opponent',assisted:true};
  assert.equal(canContact(base),true);assert.equal(canContact({...base,lastHitter:'player'}),false);
  assert.equal(canContact({...base,position:{x:0,y:2,z:-.2}}),false);
  assert.equal(canContact({...base,position:{x:0,y:.05,z:1}}),false);
});
test('assisted contact accepts imperfect positioning and does not require precise aiming',()=>{
  const base={position:{x:1.8,y:1.7,z:3.7},velocity:{x:1,y:-5,z:3},player:{x:0,z:4.5},active:true,lastHitter:'opponent',assisted:true,yaw:-.4};
  assert.equal(canContact(base),true);assert.equal(canContact({...base,assisted:false}),false);
  assert.equal(canContact({...base,position:{x:0,y:8,z:3.7}}),false);
});
test('a standing racket can reach a high smash contact without enabling movement assistance',()=>{
 const overhead={position:{x:.2,y:3,z:3.2},velocity:{x:0,y:-.4,z:.1},player:{x:0,z:4},active:true,lastHitter:'opponent',assisted:false,yaw:0};
 assert.equal(canContact(overhead),true);
 assert.equal(canContact({...overhead,position:{...overhead.position,y:3.3}}),false);
});
test('receiving target stays behind the shuttle and inside reachable court limits',()=>{
  assert.deepEqual(receivingTarget({intercept:{x:1,z:4}},{x:0,z:4}),{x:.9,z:4.78});
  assert.deepEqual(receivingTarget({intercept:{x:-1,z:1.5}},{x:0,z:4}),{x:-1.1,z:1.92});
  assert.deepEqual(receivingTarget({landing:{x:10,z:9}},{x:0,z:4}),{x:2.7,z:6.75});
});

test('serve receive positioning follows the landing so the player stays behind the shuttle',()=>{
 const prediction={intercept:{x:-.1,z:1.3},landing:{x:.1,z:3.55}};
 const receive=receivingTarget(prediction,{x:.45,z:4.45},true);
 assert.ok(receive.z>prediction.landing.z,'the receiving stance must stay behind the landing');
 assert.ok(Math.abs(receive.z-4.33)<.01,'serve receive should use the landing lane');
});

test('a held input can start the racket motion before the actual contact window',()=>{
  const base={position:{x:0,y:1.8,z:1.8},velocity:{x:0,y:-2,z:4},player:{x:0,z:4.5},active:true,lastHitter:'opponent',assisted:true};
  assert.equal(canContact(base),false);
  assert.equal(canContact({...base,preparing:true}),true);
});

test('a grounded player can return the later, arcing opponent serve before it lands',()=>{
 const origin={x:0,y:1.15,z:-3.85},velocity=solveShot(origin,{x:0,z:3.55},'serve',{up:6});
 const position={...origin},incoming={...velocity};
 for(let i=0;i<114;i++)advance(position,incoming,1/120); // 0.95 s into the serve
 const context={position,velocity:incoming,player:{x:0,z:4.45},playerVelocity:{x:0,z:0},active:true,lastHitter:'opponent',assisted:false,yaw:0,kind:'clear',jump:0,age:.5,pace:1};
 assert.equal(canContact({...context,preparing:true}),true,'the shuttle must enter the swing-start window');
 assert.equal(swingWindow({...context,lookAhead:.04}),null,'an early press waits while the serve is beyond the strings');
 for(let i=0;i<17;i++)advance(position,incoming,1/120);
 const future=swingWindow({...context,lookAhead:.04});
 assert.ok(future,'serve contact prediction should match the faster serve swing');
 const hit={...position},hitVelocity={...incoming};
 for(let i=0;i<5;i++)advance(hit,hitVelocity,1/120);
 assert.equal(canContact({...context,position:hit,velocity:hitVelocity}),true,'the racket reaches the shuttle before it drops');
});

test('holding a dedicated shot input preserves its shot type across rallies',()=>{
  const input=new HitIntent();input.press(0,'clear','KeyK');
  for(const time of [3,8,16]){assert.equal(input.armed(time),true);input.consume();assert.equal(input.kind,'clear');}
  input.release('KeyK');input.consume();assert.equal(input.kind,null);
});

test('pursuit sprint supports purposeful input and eases off near a return',()=>{
 const feet={x:0,z:4},stance={x:2,z:4},move={x:1,z:0,magnitude:1};
 assert.equal(pursuitSprint(move,feet,stance),1);
 assert.equal(pursuitSprint({...move,x:-1},feet,stance),0);
 assert.equal(pursuitSprint({...move,magnitude:.4},feet,stance),0);
 assert.equal(pursuitSprint(move,{x:1.7,z:4},stance),0);
 assert.equal(pursuitSprint(move,feet,null),0);
});

test('a flat diagonal is intercepted on the playable part of the receiving court',()=>{
 const origin={x:-1,y:1.93,z:-2.4},velocity=solveShot(origin,{x:2.2,z:5.7},'push');
 const spot=receiveIntercept(origin,velocity,{x:0,z:4.5},.74,7);
 assert.ok(spot.z>2.0&&spot.z<5.8&&spot.y>.3);
});
