// Minimal DOM + canvas stub so the game can actually EXECUTE in node.
// Syntax checks miss load-time ReferenceErrors; this doesn't.
const fs=require('fs');
const html=fs.readFileSync(process.argv[2]||'/home/claude/v3.html','utf8');
const js=html.match(/<script>([\s\S]*)<\/script>/)[1];

// which element ids exist in the markup?
const ids=new Set([...html.matchAll(/id="([^"]+)"/g)].map(m=>m[1]));

const noop=()=>{};
function ctxStub(){
  return new Proxy({
    canvas:{width:640,height:360},
    createLinearGradient:()=>({addColorStop:noop}),
    createRadialGradient:()=>({addColorStop:noop}),
    measureText:()=>({width:12}),
    getImageData:()=>({data:new Uint8ClampedArray(4)}),
    save:noop, restore:noop, drawImage:noop, fillRect:noop, clearRect:noop,
  },{ get(t,k){ if(k in t) return t[k];
      if(typeof k==='string') return noop; return undefined; },
      set(){ return true; } });
}
function el(id){
  const e={ id, style:{}, dataset:{}, children:[],
    classList:{ _s:new Set(), add(c){this._s.add(c)}, remove(c){this._s.delete(c)},
                toggle(c,v){ v===undefined? (this._s.has(c)?this._s.delete(c):this._s.add(c)) : (v?this._s.add(c):this._s.delete(c)); },
                contains(c){return this._s.has(c)} },
    addEventListener:noop, removeEventListener:noop, setPointerCapture:noop,
    getBoundingClientRect:()=>({left:0,top:0,width:100,height:100}),
    getContext:()=>ctxStub(), toDataURL:()=>'data:image/png;base64,AA',
    appendChild:noop, querySelector:()=>null, closest:()=>null,
    focus:noop, blur:noop, click:noop };
  Object.defineProperty(e,'textContent',{get(){return ''},set(){},configurable:true});
  Object.defineProperty(e,'innerHTML',{get(){return ''},set(){},configurable:true});
  return e;
}
const cache={};
const MISSING=[];
global.document={
  head:el('head'), body:el('body'), documentElement:el('html'),
  getElementById(id){ if(!ids.has(id)&&!cache[id]) MISSING.push(id);
    return cache[id]||(cache[id]=el(id)); },
  createElement:(t)=>el('created-'+t),
  querySelector:()=>null, addEventListener:noop,
  fullscreenElement:null,
};
global.navigator={ userAgent:'harness', platform:'x', maxTouchPoints:0,
  getGamepads:()=>[], vibrate:noop, serviceWorker:{register:()=>Promise.reject()} };
global.screen={ orientation:{ lock:()=>Promise.reject(new Error('no')) } };
global.matchMedia=()=>({matches:false, addEventListener:noop});
global.performance={now:()=>Date.now()};
global.URL={ createObjectURL:()=>'blob:x', revokeObjectURL:noop };
global.Blob=class Blob{constructor(){}};
global.innerWidth=844; global.innerHeight=390;
global.location={href:'file:///x.html', protocol:'file:'};
global.AudioContext=class{ constructor(){this.currentTime=0;this.destination={};}
  createOscillator(){return {frequency:{value:0,exponentialRampToValueAtTime:noop},type:'',connect:noop,start:noop,stop:noop};}
  createGain(){return {gain:{value:0,exponentialRampToValueAtTime:noop},connect:noop};} };

let rafQ=[];
global.requestAnimationFrame=(f)=>{ rafQ.push(f); return rafQ.length; };
const listeners={};
global.addEventListener=(k,f)=>{ (listeners[k]=listeners[k]||[]).push(f); };
global.removeEventListener=noop;

let imgOnload=null;
global.Image=class{ constructor(){ this.width=920; this.height=736; }
  set src(v){ imgOnload=()=>this.onload&&this.onload(); }
  get src(){return ''} };

global.window=global;
global.self=global; global.top=global;

global.setTimeout=(f)=>{ try{f();}catch(e){} return 0; };  // waves spawn inline so we can test them
const driver = `
;globalThis.__G=()=>({
   get P(){return P}, get ents(){return ents}, get crowd(){return crowd}, get npcs(){return npcs},
   get drops(){return drops}, get fires(){return fires}, get cans(){return cans},
   get BUILDINGS(){return BUILDINGS}, get GATES(){return GATES}, get U(){return U},
   get UPG(){return UPG}, get COMBO(){return COMBO}, get camX(){return camX},
   get boss(){return boss}, get camLock(){return camLock},
   get date(){return date}, get dateOn(){return dateOn},
   spawn:(e)=>ents.push(e), clearEnts:()=>{ ents.length=0; },
   setCamLock:(v)=>{ camLock=v; camX=v; },
   rat,vamp,connect,hurtPlayer,setShop,buy,spawnWave,tier,stream,update,render,talkLen,resolveTalk,aggro,
   genBoss,spawnBoss,updateBoss,killBoss,startDate,resolveDate});
;globalThis.__key=(k,v)=>{ if(v&&!key[k]) pressed[k]=true; key[k]=v; };
;globalThis.__tick=(n)=>{ for(let i=0;i<n;i++){ update(); } };
;globalThis.__draw=()=>render();
;globalThis.__mode=()=>mode;
;globalThis.__titleTick=()=>titleTick();
;globalThis.__titleRender=()=>titleRender();
;globalThis.__start=()=>startGame();
`;
let err=null;
try{
  (0,eval)(js+driver);
}catch(e){ err=e; console.log('LOAD-TIME THROW:\n  '+e.constructor.name+': '+e.message); }

if(!err){
  console.log('load       OK');
  try{
    imgOnload && imgOnload();       // fire sheet.onload -> flip build, buildManifest, reset()
    console.log('onload     OK  (reset + manifest ran)');
  }catch(e){ console.log('ONLOAD THROW:\n  '+e.constructor.name+': '+e.message+'\n'+(e.stack||'').split('\n').slice(1,4).join('\n')); err=e; }
}
if(!err){
  try{
    let n=0, t0=0;
    while(rafQ.length && n<240){ const f=rafQ.shift(); t0+=16.7; f(t0); n++; }
    console.log('ran        '+n+' frames OK');
  }catch(e){ console.log('RUNTIME THROW after frames:\n  '+e.constructor.name+': '+e.message+'\n'+(e.stack||'').split('\n').slice(1,5).join('\n')); err=e; }
}
if(MISSING.length) console.log('ids requested but NOT in markup: '+[...new Set(MISSING)].join(', '));

// ---------------- scenarios ----------------
function scene(name, fn){
  try{ fn(); console.log('  ok    '+name); }
  catch(e){ console.log('  FAIL  '+name+'\n        '+e.constructor.name+': '+e.message+
    '\n        '+(e.stack||'').split('\n')[1].trim()); err=err||e; }
}
if(!err){
  const G=globalThis.__G();
  console.log('\nscenarios:');
  scene('title screen runs 900 ticks (drink loop, ambient, card)', ()=>{
    if(__mode()!=='title') throw new Error('did not boot to title, got: '+__mode());
    let peak=0;
    for(let i=0;i<900;i++){ __titleTick(); __titleRender(); peak=Math.max(peak,__G().P.drunk); }
    if(peak<70) throw new Error('title never reaches the warp; peak drunk '+peak.toFixed(0));
    console.log('        peak drunk on the loop: '+Math.round(peak));
  });
  scene('PRESS START -> play', ()=>{
    __start();
    if(__mode()!=='play') throw new Error('still on title after start');
    __tick(120);
  });
  scene('walk right 4000 ticks (streaming, gates, waves, AI)', ()=>{
    __key('KeyD',true); __tick(4000); __key('KeyD',false);
  });
  scene('chunks streamed + culled', ()=>{
    const g=__G(); if(!g.BUILDINGS.length) throw new Error('no buildings after walking');
  });
  scene('mash punch 600 ticks (full combo, connects)', ()=>{
    for(let i=0;i<600;i++){ if(i%7===0) __key('KeyJ',true); else __key('KeyJ',false); __tick(1); }
  });
  scene('drink to empty then dry-fire', ()=>{
    const g=__G(); g.P.bottles=3;
    for(let i=0;i<400;i++){ __key('KeyL', i%40===0); __tick(1); }
    if(g.P.bottles>0) throw new Error('bottles not spent: '+g.P.bottles);
  });
  scene('drunk to 100 + render (composite, warp, lean, stumble)', ()=>{
    const g=__G(); g.P.drunk=100; __tick(200); __draw();
  });
  scene('fire rats + big rat', ()=>{
    const g=__G();
    g.clearEnts();                                  // no leftover token holders
    g.spawn(g.rat(g.P.x+70,g.P.z,false,{fire:true}));
    g.spawn(g.rat(g.P.x+110,g.P.z,false,{big:true,fire:true}));
    let peak=0; for(let i=0;i<600;i++){ __tick(1); peak=Math.max(peak,g.fires.length); }
    __draw();
    if(peak===0) throw new Error('fire rats never breathed in 10s');
    console.log('        peak fire particles alive: '+peak);
  });
  scene('elite vamp full lifecycle', ()=>{
    const g=__G(); g.ents.push(g.vamp(g.P.x+40,300,false,true)); __tick(500); __draw();
  });
  scene('take a hit / knockdown', ()=>{
    const g=__G(); g.P.iframes=0; g.hurtPlayer(20,g.P.x+30); __tick(120); __draw();
  });
  scene('date: nail the rhythm flirt → resolves with conf', ()=>{
    const g=__G(); g.ents.length=0;
    const n=g.npcs.find(q=>!q.talked && !q.scammer) || g.npcs[0];
    n.talked=false; n.scammer=false; n.trueTier=7; n.blown=false;
    g.P.x=n.x; g.P.z=n.z; g.P.conf=50; g.P.drunk=0;
    g.startDate(n);                                  // (talk-init calls this; drive it directly for a clean test)
    if(!g.dateOn) throw new Error('startDate did not begin the date');
    const conf0=g.P.conf, KEYS=['KeyJ','KeyK','KeyL','KeyE'];
    let guard=0;
    while(g.dateOn && guard++<3000){
      const d=g.date;
      for(const nt of d.notes){ if(!nt.hit&&!nt.miss && Math.abs(nt.hitT-d.t)<=2) __key(KEYS[nt.lane],true); }
      __tick(1); __draw();
      for(const k of KEYS) __key(k,false);
    }
    if(g.dateOn) throw new Error('date never ended');
    if(!n.talked) throw new Error('date did not resolve');
    if(g.P.conf<=conf0) throw new Error('a nailed date gave no confidence');
    console.log('        nailed date; conf '+conf0+' -> '+Math.round(g.P.conf));
  });
  scene('date: bombing the rhythm blows her off', ()=>{
    const g=__G(); g.ents.length=0;
    const n=g.npcs.find(q=>!q.talked) || g.npcs[0];
    n.talked=false; n.blown=false; n.trueTier=7;
    g.P.x=n.x; g.P.z=n.z; g.P.conf=60; g.P.drunk=0;
    g.startDate(n);
    if(!g.dateOn) throw new Error('startDate did not begin the date');
    let guard=0; while(g.dateOn && guard++<3000){ __tick(1); }   // press nothing → miss everything
    if(!n.talked) throw new Error('bombed date did not resolve');
    if(!n.blown) throw new Error('bombing should blow her off');
    __draw();
  });
  scene('deli boss: henchmen → boot → gun, renders every phase', ()=>{
    const g=__G(); g.clearEnts();
    g.P.hp=g.P.maxhp=1e9; g.P.x=8020; g.P.z=300; g.P.y=0; g.P.vy=0; g.P.state='idle';
    g.setCamLock(Math.max(0,g.P.x-170));
    g.spawnBoss(2,'deli'); const b=g.boss;
    if(!b||b.arch!=='deli') throw new Error('deli did not spawn');
    for(let i=0;i<60;i++){ __tick(1); __draw(); }               // intro + guard
    if(g.ents.filter(e=>e.k==='sammich'&&!e.dead).length<3) throw new Error('deli spawned no henchmen');
    if(b.phase!=='guard') throw new Error('deli not in guard phase');
    for(const e of g.ents) if(e.k==='sammich') e.dead=1;         // beat the sandwiches
    for(let i=0;i<40;i++){ __tick(1); __draw(); }               // boot phase
    if(b.phase!=='boot') throw new Error('deli did not enter boot phase, got '+b.phase);
    b.hp=Math.round(b.maxhp*0.2);                                // trip the gun
    let sawBullet=false;
    for(let i=0;i<200;i++){ __tick(1); __draw(); if(g.fires.some(f=>f.bullet)) sawBullet=true; }
    if(b.phase!=='gun') throw new Error('deli did not pull the gun under 25%');
    if(!sawBullet) throw new Error('gun phase fired no bullets');
    console.log('        deli guard→boot→gun ok; bullets sprayed');
  });
  scene('subway boss: the train sweeps the rail and ends cleanly (no softlock)', ()=>{
    const g=__G(); g.clearEnts();
    g.P.hp=g.P.maxhp=1e9; g.P.x=8020; g.P.z=232; g.P.y=0; g.P.vy=0; g.P.drunk=80; g.P.state='idle';
    g.setCamLock(Math.max(0,g.P.x-170));
    g.spawnBoss(2,'subway'); const b=g.boss;
    if(!b||b.arch!=='subway') throw new Error('subway boss did not spawn');
    for(let i=0;i<50;i++){ __tick(1); __draw(); }
    b.trainCd=1; let sawTrain=false; const hp0=g.P.hp;
    for(let i=0;i<220;i++){ if(g.P.hp>=hp0){ g.P.z=232; g.P.iframes=0; } __tick(1); __draw(); if(b.state==='train') sawTrain=true; }
    if(!sawTrain) throw new Error('the train never swept');
    if(b.state==='train') throw new Error('train never ended — softlock');   // regression guard for the dir bug
    if(!(g.P.hp<hp0)) throw new Error('the train did not hit a player on the rail');
    if(!(g.P.drunk<80)) throw new Error('the train should sober you');
    console.log('        train swept + ended; drunk 80→'+Math.round(g.P.drunk));
  });
  scene('halal boss: throws skewers, ducks behind the cart (shielded)', ()=>{
    const g=__G(); g.clearEnts();
    g.P.hp=g.P.maxhp=1e9; g.P.x=8020; g.P.z=300; g.P.y=0; g.P.vy=0; g.P.state='idle';
    g.setCamLock(Math.max(0,g.P.x-170));
    g.spawnBoss(2,'halal'); const b=g.boss;
    if(!b||b.arch!=='halal') throw new Error('halal boss did not spawn');
    __tick(60);
    let sawSkewer=false;
    for(let i=0;i<220;i++){ __tick(1); __draw(); if(g.fires.some(f=>f.skewer)) sawSkewer=true; }
    if(!sawSkewer) throw new Error('the cart man threw no skewers');
    b.duckCd=1; let ticks=0; while(b.state!=='duck' && ticks++<160){ __tick(1); __draw(); }
    if(b.state!=='duck') throw new Error('cart man never ducked');
    const hp0=b.hp; g.P.x=b.x-24; g.P.face=1; g.P.iframes=0;
    g.connect(b,{dmg:40,stun:10});
    if(b.hp<hp0) throw new Error('ducked cart man took damage through the cart');
    console.log('        skewers thrown; ducked = shielded');
  });
  scene('auteur boss: clapper/tornado + the tidy window is vulnerable', ()=>{
    const g=__G(); g.clearEnts();
    g.P.hp=g.P.maxhp=1e9; g.P.x=8020; g.P.z=300; g.P.y=0; g.P.vy=0; g.P.state='idle';
    g.setCamLock(Math.max(0,g.P.x-170));
    g.spawnBoss(2,'auteur'); const b=g.boss;
    if(!b||b.arch!=='auteur') throw new Error('auteur did not spawn');
    for(let i=0;i<40;i++){ __tick(1); __draw(); }
    b.tidyCd=999;
    const force=(mv,wl,al)=>{ b.state='wind'; b.st=0; b.move=mv; b.windLen=wl; b.atkLen=al;
      for(let i=0;i<wl+al+6;i++){ __tick(1); __draw(); } };
    force('clap',16,22); if(!g.fires.some(f=>f.clap)) throw new Error('no clapperboard');
    force('tornado',26,24); if(!g.fires.some(f=>f.tornado)) throw new Error('no tornado');
    b.tidyCd=1; let ticks=0; while(b.state!=='tidy' && ticks++<200){ __tick(1); __draw(); }
    if(b.state!=='tidy') throw new Error('auteur never tidied');
    const hp0=b.hp; g.P.x=b.x-24; g.P.face=1; g.P.iframes=0;
    g.connect(b,{dmg:30,stun:10});
    if(!(b.hp<hp0)) throw new Error('the tidy window must be vulnerable');
    console.log('        clap + tornado + tidy-window-open ok');
  });
  scene('scam scales with confidence: broke on a 10/10 empties pockets, confident keeps it', ()=>{
    const g=__G(); g.clearEnts(); g.setCamLock(0);     // camLock non-null suppresses the 'her man' boss side-effect
    g.P.z=300; g.P.drunk=0;
    const mk=()=>({x:0,z:0,trueTier:10,scammer:false,talked:false,blown:false,listening:false,laugh:0,tellPh:0,lie:0,lieT:0,revealed:false});
    g.P.conf=0; g.P.money=1000; g.resolveTalk(mk());
    if(g.P.money>60) throw new Error('0-conf 10/10 should empty pockets, left $'+g.P.money);
    g.P.conf=100; g.P.money=1000; g.resolveTalk(mk());
    if(g.P.money<1000) throw new Error('confident player got played, lost $'+(1000-g.P.money));
    console.log('        broke → cleaned out; confident → kept it');
  });
  scene('confidence bleeds over time', ()=>{
    const g=__G(); g.clearEnts();
    g.U.rep=0; g.P.conf=80; g.P.drunk=0; g.P.x=400; g.P.z=300;
    const c0=g.P.conf; __tick(250);
    if(!(g.P.conf<c0-3)) throw new Error('confidence did not bleed: '+c0+'→'+g.P.conf);
    console.log('        conf '+c0+' → '+Math.round(g.P.conf)+' over 250 ticks');
  });
  scene('shop: open, buy every rank of everything', ()=>{
    const g=__G();
    const b=g.BUILDINGS.find(q=>q.kind==='burger');
    if(!b) throw new Error('no burger shop generated in 4000px');
    g.P.money=99999; g.setShop(true,b);
    for(const k in g.UPG) for(let i=0;i<g.UPG[k].max+2;i++) g.buy(k);
    g.P.hp=1; g.buy('burger'); g.buy('burger');
    g.setShop(false);
    for(const k in g.UPG) if(g.U[k]!==g.UPG[k].max) throw new Error(k+' stuck at '+g.U[k]);
  });
  scene('play on with all upgrades maxed', ()=>{
    __key('KeyD',true); __tick(1500); __key('KeyD',false); __draw();
  });
  scene('death does NOT wipe the screen', ()=>{
    const g=__G(); g.clearEnts();
    g.spawn(g.vamp(g.P.x+80,300,false,false));
    g.spawn(g.rat(g.P.x+120,300,false,{big:true}));
    const bigBefore=g.ents.find(e=>e.big); bigBefore.hp=70;   // half-killed big rat
    const before=g.ents.length;
    g.P.hp=1; g.P.iframes=0; g.hurtPlayer(999,g.P.x+10); __tick(2);
    const after=g.ents.filter(e=>!e.dead).length;
    if(after<before) throw new Error('enemies wiped on death: '+before+' -> '+after);
    const big=g.ents.find(e=>e.big);
    if(!big) throw new Error('big rat vanished on death');
    if(big.hp!==70) throw new Error('big rat healed on death: '+big.hp);
    if(g.P.iframes<60) throw new Error('no respawn grace: '+g.P.iframes);
    __tick(200); __draw();
    console.log('        survived: '+after+' enemies, big rat still at '+big.hp+'/'+big.maxhp);
  });
  scene('knocked down in front of her = permanently done', ()=>{
    const g=__G(); g.clearEnts();
    const n=g.npcs.find(q=>!q.talked&&!q.blown);
    if(!n) throw new Error('no fresh npc');
    g.P.x=n.x+20; g.P.z=n.z; g.P.conf=100; g.P.iframes=0; g.P.hp=200; g.P.maxhp=200;
    g.hurtPlayer(30,g.P.x+30); __tick(140);
    if(!n.blown) throw new Error('she did not close off');
    if(!n.talked) throw new Error('blown npc still approachable');
    // and pressing talk gets you nothing
    g.P.x=n.x; g.P.state='idle'; g.P.downT=0;
    __key('KeyE',true); __tick(1); __key('KeyE',false); __tick(5);
    if(g.P.state==='talk') throw new Error('still able to talk to her after she saw it');
    __draw();
    console.log('        conf after: '+Math.round(g.P.conf)+'  (was 100)');
  });
  scene('render every frame for 600 ticks', ()=>{
    for(let i=0;i<600;i++){ __tick(1); __draw(); }
  });
  const g2=__G();
  console.log('\nend state: x='+Math.round(g2.P.x)+'  block '+(g2.tier()+1)+
    '  ents '+g2.ents.length+'  buildings '+g2.BUILDINGS.length+
    '  crowd '+g2.crowd.length+'  drops '+g2.drops.length+'  fires '+g2.fires.length);
}
process.exit(err?1:0);
