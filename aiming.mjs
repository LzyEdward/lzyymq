const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));

// Looking and choosing a landing point deliberately use separate inputs.
export function mouseRadiansPerPixel(viewportHeight=900,verticalFov=69,sensitivity=1,viewportWidth=viewportHeight*16/9,axis='x'){
 // Match the angular field shown by one full screen traversal. Directly using
 // 2*tan(FOV/2) over-rotates at screen edges and feels faster than the cursor.
 const vertical=clamp(verticalFov,1,179)*Math.PI/180;
 const aspect=Math.max(1,viewportWidth)/Math.max(1,viewportHeight);
 const horizontal=2*Math.atan(Math.tan(vertical/2)*aspect);
 return (axis==='y'?vertical/Math.max(1,viewportHeight):horizontal/Math.max(1,viewportWidth))*clamp(sensitivity,.25,2);
}
export function freeLook(view,dx,dy,sensitivity=1,viewportHeight=900,verticalFov=69,viewportWidth=viewportHeight*16/9){
 const horizontal=mouseRadiansPerPixel(viewportHeight,verticalFov,sensitivity,viewportWidth,'x');
 const vertical=mouseRadiansPerPixel(viewportHeight,verticalFov,sensitivity,viewportWidth,'y');
 return {yaw:view.yaw-dx*horizontal,pitch:clamp(view.pitch-dy*vertical,-1.42,1.545)};
}
export function normalizeLanding(target){
 return {x:clamp(target.x,-2.48,2.48),z:clamp(target.z,-6.3,-.85)};
}
export function landingFromMap(u,v){
 return normalizeLanding({x:(clamp(u,0,1)-.5)*5.18,z:-6.7+clamp(v,0,1)*6.7});
}
export function moveLanding(target,dx,dy){
 return normalizeLanding({x:target.x+dx*.012,z:target.z+dy*.016});
}
export function landingName(target){
 return `${target.x<-.7?'左':target.x>.7?'右':'中'}${target.z> -3?'前场':'后场'}`;
}
export const LANDING_PRESETS=Object.freeze([
 {x:-1.95,z:-5.65,label:'左后'}, {x:0,z:-5.65,label:'中后'}, {x:1.95,z:-5.65,label:'右后'},
 {x:-1.95,z:-1.65,label:'左前'}, {x:0,z:-1.65,label:'中前'}, {x:1.95,z:-1.65,label:'右前'},
]);
