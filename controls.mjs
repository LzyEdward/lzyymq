import {advance} from './physics.mjs?v=7.13.0';
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

export function canContact({ position, velocity, player, active, lastHitter, assisted, jump = 0, yaw = 0, preparing = false, reachBonus = 0 }) {
  if (!active || lastHitter !== 'opponent' || position.z < .38) return false;
  const dx = position.x - player.x, dz = position.z - player.z;
  const reach = (assisted ? (preparing ? 3.05 : 2.55) : (preparing ? 2.15 : 1.85))+Math.max(-.6,Math.min(.6,reachBonus));
  const front = -dx * Math.sin(yaw) - dz * Math.cos(yaw);
  return Math.hypot(dx, dz) <= reach && position.y >= .075 &&
    position.y <= (assisted ? 3.15 : 2.95) + jump &&
    front >= (assisted ? -1.05 : -.55) &&
    // Let descending balls come down into the visible hitting zone.
    (!assisted || velocity.y < 1.8 || position.y < 1.75);
}

export function receivingTarget(prediction, current, preferLanding = false) {
  const p = (preferLanding && prediction?.landing) || prediction?.intercept || prediction?.landing;
  if (!p) return { x: current.x * .3, z: 3.9 };
  const behind = p.z < 2.4 ? .42 : .78;
  return { x: Math.max(-2.7, Math.min(2.7, p.x - .1)), z: Math.max(.85, Math.min(6.75, p.z + behind)) };
}

// Queue a tap until the ball can actually meet the racket after its wind-up.
export function swingWindow({position,velocity,player,playerVelocity={x:0,z:0},kind='clear',jump=0,assisted=true,age=1,pace=1,lookAhead=.075,...contact}){
 const anticipated={...position},v={...velocity};
 for(let i=0;i<9;i++)advance(anticipated,v,lookAhead*pace/9);
 const futurePlayer={x:player.x+playerVelocity.x*lookAhead,z:player.z+playerVelocity.z*lookAhead};
 if(!canContact({...contact,position:anticipated,velocity:v,player:futurePlayer,jump,assisted}))return null;
 const desiredHeight=({clear:2.12,drive:1.9,drop:2.55,slicedrop:2.65,smash:2.98,slicesmash:2.98,lift:1.25,net:1.5,netcross:1.5,push:1.82,netkill:2.15})[kind]??2.1;
 if(age>.22){
  if(anticipated.y>desiredHeight+jump&&v.y<2)return null;
 const shortBall=anticipated.z<2.6||kind==='drop'||kind==='lift';
 const stretchLimit=shortBall?2.35:1.9;
 if(assisted&&Math.hypot(anticipated.x-futurePlayer.x,anticipated.z-futurePlayer.z)>stretchLimit&&anticipated.y>1.2)return null;
 }
 return anticipated;
}
