import {advance} from './physics.mjs';
// Small wrist actions recover sooner than a full overhead stroke.
export function strokeTiming(kind='clear',serveReceive=false){
 const net=['net','netcross','push','netkill','drive','lift'].includes(kind);
 return {contact:serveReceive?.04:net?.045:.07,recovery:kind==='serve'?.46:net?.29:['smash','slicesmash'].includes(kind)?.40:.36};
}
// Input intent is independent of the racket animation. A click may be early;
// holding a button keeps the next return armed without repeated clicks.
export class HitIntent {
  constructor() { this.clear(); }
  clear() { this.sources = new Set(); this.sourceKinds = new Map(); this.pendingUntil = -Infinity; this.lastPressAt = -Infinity; this.kind = null; }
  press(now, kind = null, source = null) {
    if (source) { this.sources.add(source); this.sourceKinds.set(source, kind); }
    this.pendingUntil = now + 4.5;
    this.lastPressAt = now;
    this.kind = kind;
  }
  release(source) { this.sources.delete(source); this.sourceKinds.delete(source); }
  armed(now) { return this.sources.size > 0 || now <= this.pendingUntil; }
  consume() { this.pendingUntil = -Infinity; this.kind = [...this.sourceKinds.values()].at(-1) || null; }
}

// Optional automatic returns are tracked per incoming rally. A manual swing
// takes priority, and disabling the setting cancels any not-yet-started return.
export class AutoReturnAssist {
  constructor() { this.rally = -1; this.pending = false; }
  update({ enabled, phase, active, lastHitter, rally, manualIntent = false, swinging = false }) {
    if (!enabled || phase !== 'rally' || !active || lastHitter !== 'opponent') {
      this.pending = false;
      if (!enabled || phase !== 'rally' || lastHitter === 'player') this.rally = -1;
      return false;
    }
    if (this.rally !== rally) { this.rally = rally; this.pending = true; }
    if (manualIntent || swinging) { this.pending = false; return false; }
    return this.pending;
  }
  consume() { this.pending = false; }
}

export function netKillOpportunity(ball,feet,jump=0){
  const front=feet.z-ball.z;
  return ball.z>=.38&&ball.z<=2.12&&ball.y>=1.78&&ball.y<=2.68+jump&&
    front>=-.06&&front<=1.16&&defensiveReach(ball,feet,jump);
}

export function canContact({ position, velocity, player, active, lastHitter, assisted, jump = 0, yaw = 0, preparing = false, reachBonus = 0 }) {
  if (!active || lastHitter !== 'opponent' || position.z < .38) return false;
  const dx = position.x - player.x, dz = position.z - player.z;
  const reach = (assisted ? (preparing ? 3.05 : 2.55) : (preparing ? 2.15 : 1.85))+Math.max(-.6,Math.min(.6,reachBonus));
  const front = -dx * Math.sin(yaw) - dz * Math.cos(yaw);
  return Math.hypot(dx, dz) <= reach && position.y >= .075 &&
    // A clean standing overhead reaches above 2.95 m. Assistance widens the
    // horizontal catch window, not the player's physical racket height.
    position.y <= 3.15 + jump &&
    front >= (assisted ? -1.05 : -.55) &&
    // Let descending balls come down into the visible hitting zone.
    (!assisted || velocity.y < 1.8 || position.y < 1.75 || netKillOpportunity(position,player,jump));
}

// A low defensive racket can reach only as far as the shoulder, arm and shaft
// together. Getting an input into the preparation window does not make contact.
export function defensiveReach(ball, feet, jump=0, side=1) {
  const height=ball.y-jump;
  const dx=ball.x-feet.x-.16*side, front=(feet.z-ball.z)*side;
  const crouch=Math.max(0,Math.min(.46,(1.32-height)*.52));
  return front>=-.35 && Math.hypot(dx,front-.16,height-(1.42-crouch))<=1.21;
}

// Intersect the cork's swept segment with a string bed in racket-local metres.
// Expanding by the cork radius catches a legitimate graze between fixed ticks.
export function crossesStrings(a,b,centerY=.51){
  let lo=0,hi=1;
  const dz=b.z-a.z, thickness=.025;
  if(Math.abs(dz)<1e-8){if(Math.abs(a.z)>thickness)return false;}
  else{
    const s=(-thickness-a.z)/dz,t=(thickness-a.z)/dz;
    lo=Math.max(lo,Math.min(s,t));hi=Math.min(hi,Math.max(s,t));
    if(lo>hi)return false;
  }
  const x=a.x/.111,y=(a.y-centerY)/.151,dx=(b.x-a.x)/.111,dy=(b.y-a.y)/.151;
  const u=Math.max(lo,Math.min(hi,-(x*dx+y*dy)/(dx*dx+dy*dy||1)));
  return (x+u*dx)**2+(y+u*dy)**2<=1;
}

export function receivingTarget(prediction, current, preferLanding = false) {
  const p = (preferLanding && prediction?.landing) || prediction?.intercept || prediction?.landing;
  if (!p) return { x: current.x * .3, z: 3.9 };
  const behind = p.z < 2.4 ? .42 : .78;
  return { x: Math.max(-2.7, Math.min(2.7, p.x - .1)), z: Math.max(.85, Math.min(6.75, p.z + behind)) };
}

// During fast flat rallies the first intercept can be at the net, several
// metres before the shuttle reaches the receiver. Pick a reachable stance
// along this flight and allow a little time to plant before swinging.
export function receiveIntercept(position, velocity, player, pace, speed, height=1.75,attackNet=false){
 const p={...position},v={...velocity},step=1/120;
 let best=null,bestCost=Infinity;
 for(let i=1;i<=600;i++){
  advance(p,v,step*pace);
  if(p.y<.20)break;
  if(i%3||p.z<.55||p.z>7)continue;
  const stance=receivingTarget({intercept:p},player);
  const distance=Math.hypot(stance.x-player.x,stance.z-player.z);
  const time=i*step,travel=time-.09-distance/Math.max(speed,1);
  if(attackNet&&travel>=0&&netKillOpportunity(p,stance))return {...p,time:time*pace};
  if(p.y>height+.20||v.y>1.4)continue;
  const cost=Math.max(0,-travel)*8+Math.abs(p.y-height)*.42+distance*.14+time*.10;
  if(cost<bestCost){bestCost=cost;best={...p,time:time*pace};}
 }
 return best;
}

// Boost only an intentional, full movement input towards a distant return.
export function pursuitSprint(movement,player,stance){
 if(!stance||movement.magnitude<.76)return 0;
 const dx=stance.x-player.x,dz=stance.z-player.z,distance=Math.hypot(dx,dz);
 if(distance<.55)return 0;
 const alignment=(movement.x*dx-movement.z*dz)/distance;
 return Math.max(0,Math.min(1,(alignment-.38)/.44))*Math.min(1,(distance-.55)/1.15);
}

// Queue a tap until the ball can actually meet the racket after its wind-up.
export function swingWindow({position,velocity,player,playerVelocity={x:0,z:0},kind='clear',jump=0,assisted=true,age=1,pace=1,lookAhead=.075,...contact}){
 const anticipated={...position},v={...velocity};
 for(let i=0;i<9;i++)advance(anticipated,v,lookAhead*pace/9);
 const futurePlayer={x:player.x+playerVelocity.x*lookAhead,z:player.z+playerVelocity.z*lookAhead};
 if(!canContact({...contact,position:anticipated,velocity:v,player:futurePlayer,jump,assisted}))return null;
 if(kind==='netkill'&&!netKillOpportunity(anticipated,futurePlayer,jump))return null;
 if(anticipated.y-jump<2.30&&!defensiveReach(anticipated,futurePlayer,jump))return null;
 const desiredHeight=({clear:2.12,drive:1.9,drop:2.55,slicedrop:2.65,smash:2.98,slicesmash:2.98,lift:1.25,net:1.5,netcross:1.5,push:1.82,netkill:2.15})[kind]??2.1;
 if(age>.22){
  if(anticipated.y>desiredHeight+jump&&v.y<2)return null;
 const shortBall=anticipated.z<2.6||kind==='drop'||kind==='lift';
 const stretchLimit=shortBall?2.35:1.9;
 if(assisted&&Math.hypot(anticipated.x-futurePlayer.x,anticipated.z-futurePlayer.z)>stretchLimit&&anticipated.y>1.2)return null;
 }
 return anticipated;
}
