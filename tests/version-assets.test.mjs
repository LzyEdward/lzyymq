import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {versionLocalAssets} from '../tools/version-assets.mjs';

test('stable core URLs survive releases while changed descendants invalidate parents and matching preloads',async()=>{
 const root=await mkdtemp(path.join(tmpdir(),'court-cache-'));
 const write=async(text='export const value=1')=>{
  for(const [file,body]of Object.entries({'core.js':'export const engine=1','detail.mjs':text,'game.js':"import './core.js';import {value} from './detail.mjs';",'bootstrap.js':"import('./game.js')",'style.css':'body{color:green}','index.html':'<link rel="modulepreload" href="./core.js"><link href="./style.css"><script>import("./game.js")</script>'}))await writeFile(path.join(root,file),body);
 };
 try{
  await write();const a=await versionLocalAssets(root),html=await readFile(path.join(root,'index.html'),'utf8');
  assert.ok(html.includes(`core.js?v=${a.get('core.js')}`));assert.ok(html.includes(`game.js?v=${a.get('game.js')}`));assert.ok(html.includes(`style.css?v=${a.get('style.css')}`));
  await write();const b=await versionLocalAssets(root);assert.deepEqual([...a],[...b]);
  await write('export const value=2');const c=await versionLocalAssets(root);
  assert.equal(c.get('core.js'),a.get('core.js'));assert.equal(c.get('style.css'),a.get('style.css'));
  for(const file of ['detail.mjs','game.js','bootstrap.js'])assert.notEqual(c.get(file),a.get(file));
 }finally{await rm(root,{recursive:true,force:true});}
});
test('circular imports terminate and missing local modules fail the build',async()=>{
 const root=await mkdtemp(path.join(tmpdir(),'court-cycle-'));
 try{
  await writeFile(path.join(root,'a.mjs'),"import './b.mjs';");await writeFile(path.join(root,'b.mjs'),"import './a.mjs';");
  const versions=await versionLocalAssets(root);assert.equal(versions.size,2);
  await writeFile(path.join(root,'a.mjs'),"import './missing.mjs';");await assert.rejects(()=>versionLocalAssets(root),/Missing local import/);
 }finally{await rm(root,{recursive:true,force:true});}
});
