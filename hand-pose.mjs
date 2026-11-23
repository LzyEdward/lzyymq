// Racket-local anatomical joint positions in metres; shared by the offline
// skin pose and its attached nail details, so details cannot drift in space.
export function handPaths(open=false){
 // A forehand V grip: the index leads on the bevel, the last three fingers
 // curl progressively around the handle and the thumb opposes the middle finger.
 if(!open)return [
  [[.031,.110,-.014],[.001,.119,-.022],[-.021,.116,-.009],[-.017,.104,.015]],
  [[.028,.090,-.014],[.001,.094,-.023],[-.020,.089,-.009],[-.011,.083,.020]],
  [[.026,.073,-.013],[.001,.075,-.022],[-.020,.070,-.007],[-.009,.065,.019]],
  [[.025,.057,-.010],[.004,.058,-.020],[-.017,.053,-.009],[-.013,.048,.014]],
  [[.054,.084,.011],[.032,.104,.021],[.012,.103,.023],[-.006,.093,.021]]
 ];
 return Array.from({length:5},(_,i)=>{
  if(i===4)return [[.060,.084,.013],[.038,.116,.018],[.009,.137,.021],[-.020,.139,.022]];
  const y=[.116,.092,.069,.048][i],short=i===3?.007:0;
  return i===0?[[.039,y,-.014],[.003,y+.012,-.016],[-.021,y+.024,-.008],[-.026,y+.02,.014]]:[[.039,y,-.014],[.007,y-.001,-.024],[-.016+short,y-.005,-.014],[-.016+short,y-.011,.015]];
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
