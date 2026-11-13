// A single continuous terry-cloth strip: on the bench, over a rounded edge,
// then under gravity. Centimetre-scale folds replace two intersecting boxes.
export function towelPoint(u,v){
 const x=(u-.5)*.37,fold=Math.sin(u*Math.PI*7+.4)*.0015;
 let y,z;
 if(v<.56){const t=v/.56;y=.514+fold;z=-.19+t*.42;}
 else if(v<.67){const a=(v-.56)/.11*Math.PI/2;y=.489+.025*Math.cos(a)+fold;z=.23+.025*Math.sin(a);}
 else {const t=(v-.67)/.33;y=.489-t*.25+fold*(1-t*.3);z=.255+Math.sin(t*Math.PI*.8)*(.008+Math.cos(u*19)*.004);}
 const hanging=Math.max(0,(v-.56)/.44);
 z+=Math.sin(u*21+v*3)*.003*hanging;
 return [x,y,z];
}
export function createSportsTowel(T,material){
 const position=[],uv=[],index=[],columns=32,rows=64;
 for(let j=0;j<=rows;j++)for(let i=0;i<=columns;i++){position.push(...towelPoint(i/columns,j/rows));uv.push(i/columns,j/rows);}
 for(let j=0;j<rows;j++)for(let i=0;i<columns;i++){const a=j*(columns+1)+i,b=a+columns+1;index.push(a,b,a+1,a+1,b,b+1);}
 const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(position,3));geometry.setAttribute('uv',new T.Float32BufferAttribute(uv,2));geometry.setIndex(index);geometry.computeVertexNormals();
 const mesh=new T.Mesh(geometry,material);mesh.name='Continuous draped terry towel';mesh.castShadow=mesh.receiveShadow=true;return mesh;
}
