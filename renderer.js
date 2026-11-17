const {ipcRenderer}=require('electron'), THREE=require('three');
const cv=document.getElementById('c'),bub=document.getElementById('bub'),inp=document.getElementById('inp');
const R=new THREE.WebGLRenderer({canvas:cv,alpha:true});R.setPixelRatio(devicePixelRatio);R.setSize(340,310,false);
const scene=new THREE.Scene(),cam=new THREE.PerspectiveCamera(35,340/310,.1,50);
cam.position.set(0,1.3,6.6);cam.lookAt(0,.75,0);
scene.add(new THREE.AmbientLight(0xffffff,1.05));const dl=new THREE.DirectionalLight(0xffffff,.45);dl.position.set(2,4,3);scene.add(dl);

// ---- cute face: 16x12 pixel canvas ----
const fc=document.createElement('canvas');fc.width=16;fc.height=12;const x=fc.getContext('2d');
const tex=new THREE.CanvasTexture(fc);tex.magFilter=tex.minFilter=THREE.NearestFilter;tex.colorSpace=THREE.SRGBColorSpace;
const FACE='#ffd1e3',NOSE='#ff8fb8',E='#3a1a4d',BL='#ff8cb8',M='#d94a8c';
const P=(c,a,b,w=1,h=1)=>{x.fillStyle=c;x.fillRect(a,b,w,h)};
let curFace='';
function drawFace(m,blink){
  const k=m+blink;if(k===curFace)return;curFace=k;
  P(FACE,0,0,16,12);P(NOSE,6,5,4,2);P(BL,1,8,3,1);P(BL,12,8,3,1);
  const eye=(lx,y,h,shine=true)=>{P(E,lx,y,2,h);if(shine&&h>=2)P('#fff',lx,y)};
  const arch=o=>{P(E,o,6);P(E,o+1,5);P(E,o+2,6)};
  if(m==='sleep'||blink){P(E,2,6,2);P(E,12,6,2)}
  else if(m==='happy'){arch(1);arch(12);P(M,6,8);P(M,7,9,2);P(M,9,8)}
  else if(m==='cheer'){arch(1);arch(12);P('#c2185b',6,8,4,2);P('#ff7aa8',7,9,2)}
  else if(m==='surprised'){eye(2,3,4);eye(12,3,4);P(M,7,8,2,2)}
  else if(m==='think'){eye(2,4,3);eye(12,5,2);P(M,9,9,3)}
  else if(m==='worried'){eye(2,5,3);eye(12,5,3);P(E,3,3,2);P(E,11,3,2);P(M,6,9);P(M,7,8,2);P(M,9,9)}
  else{eye(2,4,3);eye(12,4,3)}
  tex.needsUpdate=true;
}
// ---- chibi axolotl ----
const L=c=>new THREE.MeshLambertMaterial({color:c});
const box=(w,h,d,c)=>new THREE.Mesh(new THREE.BoxGeometry(w,h,d),L(c));
const root=new THREE.Group();scene.add(root);
const body=box(1.2,.7,1.2,0xffa6c9);body.position.y=.1;root.add(body);
const tail=box(.4,.3,.9,0xf58bc0);tail.position.set(0,.05,-1.05);root.add(tail);
const tip=box(.3,.25,.5,0xf58bc0);tip.position.set(0,.2,-1.6);root.add(tip);
const legs=[[-.4,.45],[.4,.45],[-.4,-.4],[.4,-.4]].map(([lx,lz])=>{
  const g=new THREE.Group();g.position.set(lx,-.2,lz);
  const l=box(.34,.32,.34,0xffd1e3);l.position.y=-.16;g.add(l);
  const f=box(.44,.12,.44,0xffa6c9);f.position.y=-.34;g.add(f);root.add(g);return g});
const head=new THREE.Group();head.position.set(0,1.05,.1);root.add(head);
const hm=[L(0xffa6c9),L(0xffa6c9),L(0xffd1e3),L(0xf47cc8),new THREE.MeshBasicMaterial({map:tex}),L(0xffa6c9)];
head.add(new THREE.Mesh(new THREE.BoxGeometry(2.4,1.8,1.8),hm));
const GC=[0xff4f9a,0xff77b4,0xe8368a];
const gills=[-1,1].map(s=>{const g=new THREE.Group();g.position.set(s*1.2,0,0);
  [.6,.15,-.3].forEach((y,i)=>{for(let k=0;k<3;k++){const b=box(.36,.36,.36,GC[(i+k)%3]);b.position.set(s*(.18+.3*k),y+.16*k,0);g.add(b)}});
  head.add(g);return g});
root.rotation.y=.4;

// ---- state ----
let mood='idle',mode='awake',t=0,moodTimer=null,pokeT=0,lastSay=Date.now();
const lerp=(o,k,v,s=.1)=>o[k]+=(v-o[k])*s;
function setMood(m,ms){mood=m;clearTimeout(moodTimer);if(ms)moodTimer=setTimeout(()=>mood='idle',ms)}
(function tick(){requestAnimationFrame(tick);t+=.016;
  const sl=mode==='sleep',wa=mode==='watching';
  drawFace(sl?'sleep':wa?'idle':mood,(!sl&&(t%3.6)<.12)?'b':'');
  lerp(root.rotation,'y',wa?-.6:.4);
  root.position.y=Math.sin(t*(sl?1:2.5))*(sl?.03:.06);
  lerp(head.rotation,'x',sl?.45:0);lerp(head.position,'y',sl?.85:1.05);
  lerp(head.rotation,'z',mood==='think'&&!sl?.2:Math.sin(t*1.3)*.04);
  if(pokeT>0){pokeT-=.016;head.scale.y=1+Math.sin(pokeT*18)*.08*pokeT*4}else head.scale.y=1;
  gills.forEach((g,i)=>g.rotation.z=(i?-1:1)*Math.sin(t*(sl?1:4))*(sl?.05:.16));
  tip.rotation.y=Math.sin(t*3)*.4;
  legs.forEach((l,i)=>l.rotation.x=sl?0:Math.sin(t*(wa?3:2)+i*1.5)*(wa?.35:.2));
  R.render(scene,cam);
})();

// ---- white minecraft-style dialogue ----
let typer,hider;
function speak(text){clearInterval(typer);clearTimeout(hider);if(!text){bub.style.display='none';return}
  lastSay=Date.now();bub.style.display='block';let i=0;
  const tag='<b>Axo:</b> ',esc=s=>s.replace(/</g,'&lt;');
  typer=setInterval(()=>{bub.innerHTML=tag+esc(text.slice(0,++i));
    if(i>=text.length){clearInterval(typer);hider=setTimeout(()=>bub.style.display='none',6000+text.length*70)}},28)}
function apply(r){
  if(r.activity==='video'){mode='watching';mood='idle'}
  else{if(mode!=='awake')mode='awake';setMood(r.mood||'idle',9000)}
  if(r.say)speak(r.say);
}
ipcRenderer.on('reply',(e,r)=>apply(r));
ipcRenderer.on('state',(e,s)=>{if(s==='sleep'){mode='sleep';speak('Zzz...')}
  else{mode='awake';setMood('surprised',2500);speak('Oh! You are back!')}});

// ---- own little thoughts (no API needed) ----
const chatter=[['happy','*splish splash*'],['happy','Blub blub!'],['think','Have you had water lately?'],
 ['cheer','You are doing great!'],['happy','Want to hear a joke? Ask me!'],['think','Do creepers like swimming?'],
 ['happy','Stretch your back for me?'],['cheer','Axolotl dance!']];
setInterval(()=>{ if(mode==='awake'&&bub.style.display==='none'&&Date.now()-lastSay>90000){
  const [m,s]=chatter[Math.random()*chatter.length|0];setMood(m,3000);speak(s)}},15000);

// ---- drag / click / chat ----
let drag=null;
cv.addEventListener('mousedown',e=>{if(e.button===0)drag={ox:e.clientX,oy:e.clientY,moved:false}});
addEventListener('mousemove',e=>{if(!drag)return;
  if(Math.abs(e.clientX-drag.ox)+Math.abs(e.clientY-drag.oy)>3)drag.moved=true;
  if(drag.moved)ipcRenderer.send('move',{x:e.screenX-drag.ox,y:e.screenY-drag.oy})});
addEventListener('mouseup',()=>{if(drag&&!drag.moved){
  if(mode==='sleep')mode='awake';pokeT=.6;
  setMood('happy',2000);speak(['Blub!','*wiggles gills*','Hehe, that tickles!','Hi hi!'][Math.random()*4|0])}
  drag=null});
cv.addEventListener('dblclick',()=>{inp.style.display='block';inp.focus()});
cv.addEventListener('contextmenu',()=>ipcRenderer.send('ctx'));
inp.addEventListener('keydown',async e=>{
  if(e.key==='Escape'){inp.style.display='none'}
  if(e.key==='Enter'&&inp.value.trim()){const v=inp.value;inp.value='';inp.style.display='none';
    setMood('think');speak('Hmm...');apply(await ipcRenderer.invoke('ask',v))}});
