// Racket-local anatomical joint positions in metres; shared by the offline
// skin pose and its attached nail details, so details cannot drift in space.
export function handPaths(open=false){
 return Array.from({length:5},(_,i)=>{
  if(i===4)return open?[[.060,.084,.013],[.043,.122,.018],[.014,.147,.024],[-.01,.153,.028]]:[[.06,.085,.012],[.037,.108,.022],[.011,.113,.026],[-.006,.105,.026]];
  const y=[.116,.092,.069,.048][i],short=i===3?.007:0;
  return open?[[.039,y,-.014],[.006-short,y+.011,-.016],[-.022-short,y+.021,-.012],[-.044+short,y+.026,-.004]]:[[.039,y,-.014],[.008,y-.001,-.025],[-.018+short,y-.004,-.013],[-.019+short,y-.010,.016]];
 });
}
