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
   spawn:(e)=>ents.push(e), clearEnts:()=>{ ents.length=0; },
   rat,vamp,connect,hurtPlayer,setShop,buy,spawnWave,tier,stream,update,render,talkLen,resolveTalk,aggro});
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
  scene('talk channel to completion', ()=>{
    const g=__G(); g.ents.length=0;
    const n=g.npcs.find(q=>!q.talked); if(!n) throw new Error('no npc available');
    g.P.x=n.x; g.P.z=n.z; g.P.conf=100; g.P.drunk=0;
    __key('KeyE',true); __tick(1); __key('KeyE',false);
    __tick(g.talkLen()+20); __draw();
  });
  scene('talk interrupted by a hit', ()=>{
    const g=__G();
    const n=g.npcs.find(q=>!q.talked);
    if(n){ g.P.x=n.x; g.P.z=n.z; g.P.conf=100; g.P.iframes=0;
      __key('KeyE',true); __tick(1); __key('KeyE',false); __tick(30);
      g.P.iframes=0; g.hurtPlayer(9,g.P.x+20); __tick(120); __draw(); }
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
