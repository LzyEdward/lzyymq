// All buffers are local excerpts. The arena bed shares the game's master volume.
const pools={applause:['claps-a','claps-b'],rally:['cheer-soft','cheer-break'],win:['cheer-win'],clinch:['cheer-title']};
export function createStandAudio(context,master,reverb){
 const bus=context.createGain(),roomSend=context.createGain();bus.connect(master);roomSend.connect(reverb);
 const volume=n=>{bus.gain.setTargetAtTime(n,context.currentTime,.025);roomSend.gain.setTargetAtTime(n,context.currentTime,.025);};
 const buffers=new Map(),last=new Map();
 let voice=null,bed=null,bedPending=false,bedWanted=false,serial=0,riseAt=-1,bedLevel=-1;
 function buffer(key){
  if(!buffers.has(key))buffers.set(key,fetch(new URL('./assets/audio/'+key+'.mp3',import.meta.url)).then(r=>{
   if(!r.ok)throw Error(r.status);return r.arrayBuffer();
  }).then(data=>context.decodeAudioData(data)).catch(()=>{buffers.delete(key);return null;}));
  return buffers.get(key);
 }
 function channel(data,gain,pan=0,loop=false){
  const source=context.createBufferSource(),level=context.createGain(),stereo=context.createStereoPanner();
  source.buffer=data;source.loop=loop;level.gain.value=gain;stereo.pan.value=pan;
  source.connect(level);level.connect(stereo);stereo.connect(bus);if(!loop)stereo.connect(roomSend);
  source.onended=()=>{source.disconnect();level.disconnect();stereo.disconnect();if(voice?.source===source)voice=null;};
  source.start();return {source,level};
 }
 function stopVoice(){serial++;if(voice){voice.source.stop();voice=null;}}
 async function play(key,gain,pan=0){
  stopVoice();const current=serial,options=pools[key]||[key],previous=last.get(key);
  const candidates=options.length>1?options.filter(k=>k!==previous):options;
  const name=candidates[Math.floor(Math.random()*candidates.length)];last.set(key,name);
  const sound=await buffer(name);if(current===serial&&sound)voice=channel(sound,gain,pan);
 }
 function quiet(){bedWanted=false;if(bed){bed.source.stop();bed=null;}bedLevel=-1;}
 function update({playing,rally,phase}){
  if(!playing){quiet();return;}
  bedWanted=true;
  if(!bed&&!bedPending){
   bedPending=true;buffer('stands-room').then(data=>{bedPending=false;if(bedWanted&&data&&!bed){bed=channel(data,0,0,true);bedLevel=-1;}});
  }
  const desired=phase==='serve'||phase==='opponentServe'?.055:phase==='rally'?.065+Math.min(10,rally)*.004:.09;
  if(bed&&bedLevel!==desired){bed.level.gain.setTargetAtTime(desired,context.currentTime,.24);bedLevel=desired;}
 }
 function warm(){for(const key of [...Object.values(pools).flat(),'cheer-rise','stands-room'])buffer(key);}
 function rallyRise(rally,pan){if(rally>=7&&rally%5===2&&context.currentTime-riseAt>4){riseAt=context.currentTime;play('cheer-rise',.17,pan);}}
 return {warm,volume,play,update,rallyRise,stopVoice,quiet};
}
