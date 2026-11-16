import test from 'node:test';
import assert from 'node:assert/strict';
import {hairlineHeight,shortHairProfile} from '../hair-surface.mjs';
test('hair fades into the forehead, tapers at temples and leaves eyebrows uncovered',()=>{
 for(let x=-.09;x<=.09;x+=.003){
  const edge=hairlineHeight(x,.13);
  assert.equal(shortHairProfile(x,edge-.00001,.13).covered,false);
  const root=shortHairProfile(x,edge,.13);assert.equal(root.length,0);assert.equal(root.shell,0);
  assert.equal(shortHairProfile(x,1.715,.13).covered,false);
 }
 assert.equal(shortHairProfile(.085,1.69,.05).covered,false);
 assert.ok(shortHairProfile(0,1.81,0).length>shortHairProfile(.09,1.72,0).length*3);
});
test('hair displacement stays short and continuous instead of a uniform helmet shell',()=>{
 let previous=null;
 for(let y=1.67;y<1.83;y+=.0001){const p=shortHairProfile(0,y,.13);assert.ok(p.length>=0&&p.length<=.010801);assert.ok(p.shell>=0&&p.shell<=.003801);if(previous){assert.ok(Math.abs(p.length-previous.length)<.0002);assert.ok(Math.abs(p.shell-previous.shell)<.0001);}previous=p;}
});
