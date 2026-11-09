// Integrate the periodic thread over the pixel footprint. Unlike a tiny tiled
// alpha texture this also converges to the correct coverage below one pixel.
export function createNetMaterial(THREE){
 return new THREE.ShaderMaterial({
  transparent:true,depthWrite:false,side:THREE.DoubleSide,
  uniforms:{threadColor:{value:new THREE.Color('#283329')},opacity:{value:.82}},
  vertexShader:'varying vec2 vGrid;void main(){vGrid=uv*vec2(326.,40.);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
  fragmentShader:`
   uniform vec3 threadColor;uniform float opacity;varying vec2 vGrid;
   float integral(float x){return floor(x)*.055+min(fract(x),.055);}
   float thread(float x){float w=max(fwidth(x),.00001);return clamp((integral(x+w*.5)-integral(x-w*.5))/w,0.,1.);}
   void main(){float x=thread(vGrid.x),y=thread(vGrid.y);gl_FragColor=vec4(threadColor,(x+y-x*y)*opacity);}`,
 });
}
