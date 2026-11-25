import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {freshCareer} from '../competition.mjs';
import {createPlayerCosmetics,PLAYER_COSMETICS,playerCosmeticOptions,playerCosmeticStatus} from '../player-cosmetics.mjs';

test('Lin Nan starts with immediately wearable comic outfits',()=>{
 const career=freshCareer(),tourCareer={titles:0};
 for(const id of ['linNan','duckCaptain','wideLens'])assert.equal(playerCosmeticStatus(career,tourCareer,id).unlocked,true);
 assert.equal(playerCosmeticOptions(career,tourCareer).length,6);
});

test('career milestones unlock outfits permanently through cumulative wins and titles',()=>{
 const tourCareer={titles:0};
 assert.equal(playerCosmeticStatus({wins:2},tourCareer,'bunny').unlocked,false);
 assert.equal(playerCosmeticStatus({wins:3},tourCareer,'bunny').unlocked,true);
 assert.equal(playerCosmeticStatus({wins:5},tourCareer,'rooster').unlocked,false);
 assert.equal(playerCosmeticStatus({wins:6},tourCareer,'rooster').unlocked,true);
 assert.equal(playerCosmeticStatus({wins:99},tourCareer,'shuttle').unlocked,false);
 assert.equal(playerCosmeticStatus({wins:0},{titles:1},'shuttle').unlocked,true);
 assert.deepEqual(PLAYER_COSMETICS.map(item=>item.id),['linNan','duckCaptain','wideLens','bunny','rooster','shuttle']);
});

test('comic accessories attach to the head rig and can be toggled without replacing the model',()=>{
 const athlete={head:new THREE.Group(),bind:{head:new THREE.Vector3(0,1.64,.052)}};
 const cosmetics=createPlayerCosmetics(THREE,athlete);
 assert.equal(athlete.head.children[0],cosmetics.root);
 assert.equal(cosmetics.select('duck'),'duck');
 const duck=cosmetics.root.children.find(item=>item.name==='Cosmetic · duck');
 const glasses=cosmetics.root.children.find(item=>item.name==='Cosmetic · glasses');
 assert.equal(duck.visible,true);assert.equal(glasses.visible,false);
 assert.equal(cosmetics.select('glasses'),'glasses');
 assert.equal(duck.visible,false);assert.equal(glasses.visible,true);
 assert.equal(cosmetics.select('missing'),'linNan');
 assert.ok(cosmetics.root.children.every(item=>!item.visible));
});
