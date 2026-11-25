import test from 'node:test';
import assert from 'node:assert/strict';
import {COURT_PALETTES,recolorCourtPixels} from '../court-palette.mjs';

const channels=hex=>[1,3,5].map(i=>Number.parseInt(hex.slice(i,i+2),16));
const hue=c=>Math.atan2(Math.sqrt(3)*(c[1]-c[2]),2*c[0]-c[1]-c[2]);

test('gallery provides pink and vivid green with distinct coordinated runoff colors',()=>{
 assert.equal(COURT_PALETTES.pink.court,'#e36aae');
 assert.equal(COURT_PALETTES.vivid.court,'#20d44b');
 assert.notEqual(COURT_PALETTES.pink.runoff,COURT_PALETTES.vivid.runoff);
});

test('palette recoloring preserves mat grain, wear, transparency and its reusable source',()=>{
 const source=new Uint8ClampedArray([52,120,108,255,75,145,129,255,36,88,79,255,60,133,116,92]);
 const original=source.slice(),pink=recolorCourtPixels(source,COURT_PALETTES.pink.court),green=recolorCourtPixels(source,COURT_PALETTES.vivid.court);
 assert.deepEqual(source,original);
 assert.equal(pink[3],255);assert.equal(pink[15],92);
 assert.ok(pink[0]>pink[2]&&pink[2]>pink[1]);
 assert.ok(green[1]>green[0]&&green[1]>green[2]);
 assert.notDeepEqual([...pink.slice(0,3)],[...pink.slice(4,7)]);
 assert.notDeepEqual([...green.slice(0,3)],[...green.slice(8,11)]);
 assert.ok(Math.abs(hue([...pink.slice(0,3)])-hue(channels(COURT_PALETTES.pink.court)))<.04);
 assert.ok(Math.abs(hue([...green.slice(0,3)])-hue(channels(COURT_PALETTES.vivid.court)))<.04);
});

test('palette recoloring rejects incomplete source pixels instead of misaligning RGBA channels',()=>{
 assert.throws(()=>recolorCourtPixels(new Uint8ClampedArray([1,2,3]),'#ffffff'),TypeError);
 assert.throws(()=>recolorCourtPixels(new Uint8Array([1,2,3,4]),'#ffffff'),TypeError);
});
