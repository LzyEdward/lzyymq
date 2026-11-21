// Start server.mjs, then run with PLAYWRIGHT_MODULE and BROWSER_EXE set if needed.
// The fixture runs inside the local test page so it uses the live AI and scoring.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const fs = require('node:fs/promises');

function sample(kind, difficulty, attempts) {
  $('#difficulty').value = difficulty;
  $('#opponent-style').value = 'allround';
  $('#eagle-auto').checked = false;
  const front = ['net', 'netcross', 'netkill', 'push'].includes(kind);
  const heights = { clear: 2.61, smash: 2.78, slicesmash: 2.72, drop: 2.57, slicedrop: 2.55, net: 1.31, netcross: 1.33, push: 1.83, lift: 1.01, netkill: 1.94, drive: 1.62 };
  const result = { kind, difficulty, attempts, winners: 0, replyErrors: 0, misses: 0, playerFaults: 0, returned: 0, speed: 0 };
  for (let i = 0; i < attempts; i++) {
    state.currentOpponentId = 'linDan';
    const serving=kind==='shortServe'||kind==='highServe';
    state.serveStyle=kind==='highServe'?'high':'short';
    startGame('match');
    state.sound = state.autoReturn = state.assists = false;
    rng = ((i + 1) * 2654435761) >>> 0;
    const side = i % 2 ? -1 : 1;
    const x = side * (.25 + random() * 1.50);
    const lane = kind === 'auto' ? ['push','drive','clear','net','smash','lift'][i % 6] : kind;
    const z = front || ['push','net'].includes(lane) ? 1.15 + random() * .9 : 2.6 + random() * 2.35;
    const y = heights[lane] + (random() - .5) * .50;
    if(serving){
      player.pos.x=side*.45;
      const base=opponentReceiveBase({serverX:player.pos.x,high:kind==='highServe'});
      opponent.pos.set(base.x+(random()-.5)*.6,0,base.z+(random()-.5)*.45);
      state.aim=(random()-.5)*1.4;
      beginSwing('auto');
      for(let n=0;n<36&&state.phase!=='rally';n++)fixedUpdate(1/120);
      hitIntent.clear();
    }else{
      player.pos.set(x + (random() - .5) * .55, 0, z + .36 + random() * .36);
      player.vel.set(0,0,0);
      opponent.pos.set((random() - .5) * 3.4, 0, -1.65 - random() * 3.9);
      opponent.vel.set(0,0,0);
      opponent.facing = 0;
      opponent.swing = 0;
      opponent.defenseRally = -1;
      state.phase = 'rally';
      state.lastHitter = 'opponent';
      state.rally = 4;
      ball.pos.set(x,y,z);
      ball.vel.set(0,-.3,.55);
      ball.active = true;
      state.prediction = null;
      state.swingKind = kind === 'auto' ? autoShot() : kind;
      const target = techniqueTarget({position:ball.pos,kind:state.swingKind,aim:side * (.15 + random() * .67)});
      chooseLanding(target);
      beginSwing(kind);
      for(let n=0;n<38 && state.lastHitter==='opponent' && state.phase==='rally';n++) fixedUpdate(1/120);
      hitIntent.clear();
      if(!state.hits){result.misses++;continue;}
    }
    result.speed += ball.vel.length()*3.6;
    for(let n=0;n<1100 && state.phase==='rally';n++) fixedUpdate(1/120);
    if(state.phase!=='point') throw Error('Unresolved flight '+kind+' '+i);
    if(state.score[0]) {
      if(state.lastHitter==='player')result.winners++;
      else result.replyErrors++;
    } else if(state.lastHitter==='player')result.playerFaults++;
    else result.returned++;
  }
  result.speed = Math.round(result.speed / Math.max(1,attempts-result.misses));
  return result;
}

(async()=>{
  const browser = await chromium.launch({executablePath:process.env.BROWSER_EXE,headless:true,args:['--enable-unsafe-swiftshader']});
  try{
    const page = await browser.newPage();
    await page.route(/\/game\.js(?:\?|$)/,async route=>{
      const response = await route.fetch();
      await route.fulfill({response,body:(await response.text())+'\nif(testing) window.sampleStrokes = '+sample.toString()+';'});
    });
    await page.goto((process.env.COURT_URL || 'http://127.0.0.1:5173/')+'?test=1&safe=1');
    await page.waitForSelector('body[data-boot=ready]');
    const rows = [];
    for(const difficulty of ['normal','hard','master','national']){
      for(const kind of ['auto','clear','drop','smash','net','push','netcross','slicesmash','slicedrop','drive','lift','netkill','shortServe','highServe']){
        const row=await page.evaluate(([k,d,n])=>window.sampleStrokes(k,d,n),[kind,difficulty,Number(process.env.SAMPLES || 64)]);
        rows.push(row);
      }
      console.log(difficulty,rows.filter(r=>r.difficulty===difficulty).map(r=>r.kind+' '+(r.winners+r.replyErrors)+'/'+r.attempts).join(', '));
    }
    if(process.argv[2])await fs.writeFile(process.argv[2],JSON.stringify(rows,null,2));
  } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
