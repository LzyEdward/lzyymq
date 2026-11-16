// Approximate full-size badminton center-court arena envelope in metres.
export const ARENA = Object.freeze({
 width:50, length:64, halfWidth:25, halfLength:32,
 wallHeight:20, roofY:20.55,
 sideStandRows:18, sideStandSeats:42, endStandRows:18, endStandSeats:74,
});
// Four non-overlapping stands, with real gangways instead of seats through corners.
export function arenaSeats(){
 const seats=[];
 for(const side of [-1,1])for(let row=0;row<ARENA.sideStandRows;row++)for(let i=0;i<42;i++){
  const along=(i-20.5)*.6;
  if([0,7.2,-7.2].some(a=>Math.abs(along-a)<.48))continue;
  seats.push({x:side*(8.8+row*.82),z:along,y:.24+row*.37,yaw:-side*Math.PI/2,row,section:side<0?'W':'E'});
 }
 for(const side of [-1,1])for(let row=0;row<ARENA.sideStandRows;row++){
  const half=Math.min(22,7.5+row*.85),count=Math.floor(half*2/.6);
  for(let i=0;i<count;i++){
   const x=(i-(count-1)/2)*.6;
   if([0,9,-9].some(a=>Math.abs(x-a)<.5))continue;
   seats.push({x,z:side*(14.2+row*.88),y:.24+row*.37,yaw:side<0?0:Math.PI,row,section:side<0?'N':'S'});
  }
 }
 return seats;
}

export const ARENA_AUDIENCE_CAPACITY=arenaSeats().length;
