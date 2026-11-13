// Racket-local anatomical joint positions in metres; shared by the offline
// skin pose and its attached nail details, so details cannot drift in space.
export function handPaths(open=false){
 return Array.from({length:5},(_,i)=>{
  if(i===4)return open?[[.060,.084,.013],[.038,.116,.018],[.009,.137,.021],[-.020,.139,.022]]:[[.06,.085,.012],[.037,.108,.022],[.011,.113,.026],[-.006,.105,.026]];
  const y=[.116,.092,.069,.048][i],short=i===3?.007:0;
  if(open)return i===0?[[.039,y,-.014],[.003,y+.012,-.016],[-.021,y+.024,-.008],[-.026,y+.02,.014]]:[[.039,y,-.014],[.007,y-.001,-.024],[-.016+short,y-.005,-.014],[-.016+short,y-.011,.015]];
  return [[.039,y,-.014],[.008,y-.001,-.025],[-.018+short,y-.004,-.013],[-.019+short,y-.010,.016]];
 });
}

// The serve pinch and a loose balancing hand share roots and phalanx lengths.
// Only joint directions change, so releasing the shuttle doesn't grow fingers.
export function supportFingerPaths(relaxation=0){
 const amount=Math.max(0,Math.min(1,Number.isFinite(relaxation)?relaxation:0));
 const pinch=handPaths(true);
 if(amount===0)return pinch;
 return pinch.map((path,f)=>{
  const result=[path[0].slice()];
  const targets=f===4?[[ -.32,.72,.52],[-.52,.77,.25],[-.73,.66,.05]]:
   [[-1,(1.5-f)*.12,-.16],[-.96,(1.5-f)*.10,.25],[-.62,(1.5-f)*.06,.78]];
  for(let k=0;k<3;k++){
   const original=path[k+1].map((n,i)=>n-path[k][i]),length=Math.hypot(...original);
   const target=targets[k],targetLength=Math.hypot(...target);
   const direction=original.map((n,i)=>n/length*(1-amount)+target[i]/targetLength*amount),norm=Math.hypot(...direction);
   result.push(result[k].map((n,i)=>n+direction[i]/norm*length));
  }
  return result;
 });
}
