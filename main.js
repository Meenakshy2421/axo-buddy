const {app,BrowserWindow,ipcMain,desktopCapturer,screen,powerMonitor,Menu}=require('electron');
const fs=require('fs'),path=require('path');
let cfg={model:'gemini-3.5-flash-lite',intervalSec:40,sleepAfterSec:180};
try{Object.assign(cfg,JSON.parse(fs.readFileSync(path.join(__dirname,'config.json'))))}catch{}
const KEY=process.env.GEMINI_API_KEY||cfg.geminiKey;
let win,paused=false,history=[],lastSig=null,busy=false,last=0,sleeping=false,activity='other',warned=false,lastSpoke=0;

const SYSTEM=`You are Axo, a cute, chatty Minecraft axolotl living on the user's desktop. You can see their screen (you may see yourself; ignore that). You are a friend first, a coding coach second.
- On every glance, react to what you see like a curious friend: comment, joke, ask a tiny question, cheer them on, notice videos, games, websites, chats. Be specific to what is on screen. Sometimes remind them to drink water or rest their eyes. Never repeat an earlier comment.
- If it is LeetCode or coding: give progressive HINTS, never a full solution unless asked, and gently point out bugs (off-by-one, edge cases, complexity) and where.
- If a video is playing: set activity "video" and mostly say "" with an occasional tiny reaction.
- Warm, playful, lightly Minecraft-flavoured, no emoji. "say" is max 2 short sentences (under 140 chars).
Reply with ONLY JSON: {"mood":"idle|happy|cheer|think|worried|surprised","say":"...","activity":"coding|video|other"}`;

function createWindow(){
  const {width,height}=screen.getPrimaryDisplay().workAreaSize;
  win=new BrowserWindow({width:340,height:460,x:width-360,y:height-470,transparent:true,frame:false,
    alwaysOnTop:true,skipTaskbar:true,hasShadow:false,resizable:false,
    webPreferences:{nodeIntegration:true,contextIsolation:false}});
  win.setAlwaysOnTop(true,'screen-saver');
  win.loadFile('index.html');
}
async function capture(){
  const {width,height}=screen.getPrimaryDisplay().size;
  const [s]=await desktopCapturer.getSources({types:['screen'],thumbnailSize:{width:1600,height:Math.round(1600*height/width)}});
  return s.thumbnail;
}
function changed(img){
  const b=img.resize({width:32,height:18}).toBitmap();
  const old=lastSig; lastSig=b; if(!old) return true;
  let d=0; for(let i=0;i<b.length;i++) d+=Math.abs(b[i]-old[i]);
  return d/b.length>5;
}
async function ask(text,img){
  busy=true;
  try{
    const data=img.toJPEG(75).toString('base64');
    const contents=[...history.map(h=>({role:h.role==='assistant'?'model':'user',parts:[{text:h.content}]})),
      {role:'user',parts:[{inlineData:{mimeType:'image/jpeg',data}},
        {text:text||'(auto glance) React to my screen like a friendly buddy.'}]}];
    const r=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${cfg.model}:generateContent?key=${KEY}`,
      {method:'POST',headers:{'content-type':'application/json'},
       body:JSON.stringify({systemInstruction:{parts:[{text:SYSTEM}]},contents,
         generationConfig:{responseMimeType:'application/json',maxOutputTokens:300}})});
    const j=await r.json();
    if(j.error) return {mood:'worried',say:'API: '+String(j.error.message).slice(0,90),activity};
    const t=j.candidates?.[0]?.content?.parts?.[0]?.text||'';
    history.push({role:'user',content:text||'(auto glance)'},{role:'assistant',content:t});
    history=history.slice(-8);
    try{return JSON.parse(t.match(/\{[\s\S]*\}/)[0])}catch{return {mood:'idle',say:t.slice(0,160),activity}}
  }catch(e){return {mood:'worried',say:'Connection problem... bubbles!',activity}}
  finally{busy=false}
}
async function check(force){
  if(!KEY){ if(!warned){warned=true;win.webContents.send('reply',{mood:'worried',say:'Add your key in config.json, then restart me!'})} return; }
  const img=await capture();
  const ch=changed(img);
  if(!force&&!ch&&Date.now()-lastSpoke<90000) return; // static screen: still chat every ~90s
  const r=await ask(null,img); activity=r.activity||'other';
  if(r.say) lastSpoke=Date.now();
  win.webContents.send('reply',r);
}
ipcMain.on('move',(e,{x,y})=>win.setPosition(Math.round(x),Math.round(y)));
ipcMain.handle('ask',async(e,text)=>{
  if(!KEY) return {mood:'worried',say:'I need a key in config.json first!'};
  last=Date.now(); const r=await ask(text,await capture()); activity=r.activity||'other'; lastSpoke=Date.now(); return r;
});
ipcMain.on('ctx',()=>Menu.buildFromTemplate([
  {label:paused?'Resume watching':'Pause watching',click:()=>{paused=!paused}},
  {label:'Glance at screen now',click:()=>check(true)},
  {type:'separator'},{label:'Quit',role:'quit'}]).popup());

app.whenReady().then(()=>{
  createWindow();
  setInterval(async()=>{
    if(!win||paused||busy) return;
    const idle=powerMonitor.getSystemIdleTime();
    const shouldSleep=idle>=cfg.sleepAfterSec&&activity!=='video';
    if(shouldSleep&&!sleeping){sleeping=true;win.webContents.send('state','sleep')}
    else if(!shouldSleep&&sleeping){sleeping=false;win.webContents.send('state','wake')}
    if(sleeping) return;
    const gap=(activity==='video'?60:cfg.intervalSec)*1000;
    if(Date.now()-last<gap) return;
    last=Date.now(); await check(false);
  },3000);
});
app.on('window-all-closed',()=>app.quit());
