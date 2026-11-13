import {boundedAsset} from './asset-loading.mjs?v=7.3.0';
// Local PBR surfaces and a restrained depth-based contact-occlusion pass.
export async function loadSurfaceMaps(THREE,renderer,{safe=false,onWarning=()=>{}}={}){
 if(safe)return {};
 const loader=new THREE.TextureLoader(),anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());
 async function map(file,repeat,color=false){let expired=false;const result=await boundedAsset(async()=>{const t=await loader.loadAsync('./assets/textures/'+file);if(expired){t.dispose();return null;}t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(...repeat);t.anisotropy=anisotropy;if(color)t.colorSpace=THREE.SRGBColorSpace;return t;},{timeout:8000,label:file,onWarning:warning=>{expired=true;onWarning(warning);}});return result;}
 const [wood,woodNormal,woodRough,rubberNormal,rubberRough,athleteSkin]=await Promise.all([
  map('wooden_floor_02_Diffuse.jpg',[7.5,9.5],true),map('wooden_floor_02_nor_gl.jpg',[7.5,9.5]),map('wooden_floor_02_Rough.jpg',[7.5,9.5]),
  map('rubber_tiles_nor_gl.jpg',[8,16]),map('rubber_tiles_Rough.jpg',[8,16]),
  map('athlete-skin.jpg',[1,1],true),
 ]);return {wood,woodNormal,woodRough,rubberNormal,rubberRough,athleteSkin};
}

export function createEnvironment(THREE,renderer,scene){
 const room=new THREE.Scene();room.background=new THREE.Color('#b8c2c3');
 const material=new THREE.MeshBasicMaterial({color:'#3c4746',side:THREE.BackSide}),box=new THREE.Mesh(new THREE.BoxGeometry(24,12,32),material);room.add(box);
 const lampMat=new THREE.MeshBasicMaterial({color:new THREE.Color(4.2,4.1,3.8)});
 function panel(w,h,x,y,z,rx=0,ry=0){const p=new THREE.Mesh(new THREE.PlaneGeometry(w,h),lampMat);p.position.set(x,y,z);p.rotation.set(rx,ry,0);room.add(p);}
 for(const x of [-5,5])for(const z of [-9,0,9])panel(1.5,4,x,5.8,z,Math.PI/2);
 panel(18,4,-11.8,2,0,0,Math.PI/2);panel(18,4,11.8,2,0,0,-Math.PI/2);
 const generator=new THREE.PMREMGenerator(renderer),target=generator.fromScene(room,0,.1,60);scene.environment=target.texture;scene.environmentIntensity=.48;
 room.traverse(o=>{o.geometry?.dispose();});material.dispose();lampMat.dispose();generator.dispose();return target;
}

export class CourtPresentation {
 constructor(THREE,renderer){
 this.THREE=THREE;this.renderer=renderer;this.quality='balanced';this.sceneInfo={};
  this.target=new THREE.WebGLRenderTarget(1,1,{type:renderer.extensions.has('EXT_color_buffer_float')?THREE.HalfFloatType:THREE.UnsignedByteType,minFilter:THREE.LinearFilter,magFilter:THREE.LinearFilter,depthBuffer:true,samples:0});
  this.target.depthTexture=new THREE.DepthTexture(1,1,THREE.UnsignedIntType);
  this.uniforms={tColor:{value:this.target.texture},tDepth:{value:this.target.depthTexture},inverseProjection:{value:new THREE.Matrix4()},resolution:{value:new THREE.Vector2(1,1)},occlusion:{value:.7},exposure:{value:1}};
  this.material=new THREE.ShaderMaterial({uniforms:this.uniforms,depthTest:false,depthWrite:false,
   vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}',
   fragmentShader:[
    'uniform sampler2D tColor;uniform sampler2D tDepth;uniform mat4 inverseProjection;uniform vec2 resolution;uniform float occlusion;varying vec2 vUv;',
    'vec3 positionAt(vec2 uv){float d=texture2D(tDepth,uv).x;vec4 p=inverseProjection*vec4(uv*2.-1.,d*2.-1.,1.);return p.xyz/p.w;}',
    'void main(){vec3 color=texture2D(tColor,vUv).rgb;float depth=texture2D(tDepth,vUv).x;float ao=0.;',
    'if(occlusion>0.&&depth<.99999){vec3 p=positionAt(vUv);vec3 normal=normalize(cross(dFdx(p),dFdy(p)));float radius=clamp(resolution.y*.22/max(.5,-p.z),3.,22.);',
    'for(int i=0;i<8;i++){float angle=float(i)*.785398+mod(gl_FragCoord.x+gl_FragCoord.y,2.)*.21;vec2 direction=vec2(cos(angle),sin(angle));',
    'for(int j=1;j<=2;j++){vec2 uv=vUv+direction*radius*(float(j)/2.)/resolution;vec3 delta=positionAt(uv)-p;float dist=length(delta);float facing=max(0.,dot(normal,delta/max(dist,.001))-.16);ao+=facing*(1.-smoothstep(.06,.65,dist))*smoothstep(.006,.045,dist);}}}',
    'color*=1.-min(.36,ao/16.*occlusion*2.4);float edge=dot(vUv-.5,vUv-.5);color*=1.-edge*.15;',
    'gl_FragColor=vec4(color,1.);',
    '#include <tonemapping_fragment>',
    '#include <colorspace_fragment>',
    '}',
   ].join('\n')});
  this.scene=new THREE.Scene();this.camera=new THREE.Camera();this.scene.add(new THREE.Mesh(new THREE.PlaneGeometry(2,2),this.material));
 }
 setSize(width,height){this.width=width;this.height=height;const ratio=this.renderer.getPixelRatio(),active=this.quality!=='balanced';this.target.setSize(active?Math.round(width*ratio):1,active?Math.round(height*ratio):1);this.uniforms.resolution.value.set(this.target.width,this.target.height);}
 setQuality(quality){this.quality=quality;this.uniforms.occlusion.value=quality==='balanced'?0:.7;const samples=quality==='ultra'?2:0;if(this.target.samples!==samples){this.target.dispose();this.target.samples=samples;}this.setSize(this.width||1,this.height||1);}
 render(scene,camera){
  const r=this.renderer;
  if(this.quality==='balanced'){r.setRenderTarget(null);r.render(scene,camera);this.sceneInfo={...r.info.render};return;}
  this.uniforms.inverseProjection.value.copy(camera.projectionMatrixInverse);
  r.setRenderTarget(this.target);r.render(scene,camera);this.sceneInfo={...r.info.render};r.setRenderTarget(null);r.render(this.scene,this.camera);
 }
 dispose(){this.target.dispose();this.material.dispose();}
}
