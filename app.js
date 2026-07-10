/* MOVED 2.0 — local-first strength + cardio tracker */

/* ============ STATE + MIGRATION ============ */
const KEY = "moved_v2";
const LEGACY_KEY = "moved_v1";
const DEFAULTS = {
  version:2,
  name:"",
  unit:"lb",
  distanceUnit:"mi",
  anim:true,
  restTimer:true,
  restDur:90,
  autoCollapse:true,
  demo:false,
  workouts:[],
  active:null,
  customRoutines:[]
};
let state = structuredCloneSafe(DEFAULTS);

function structuredCloneSafe(value){
  return JSON.parse(JSON.stringify(value));
}
function migrateSet(s={}){
  return {w:+s.w||0,r:+s.r||0,done:s.done!==false,warmup:!!s.warmup};
}
function migrateExercise(e={}){
  const row=findEx(e.name)||[];
  return {
    name:e.name||"Exercise",
    cat:e.cat||row[1]||"Custom",
    tip:e.tip??row[2]??"",
    muscle:e.muscle||row[3]||"Other",
    note:e.note||"",
    effort:e.effort||"",
    collapsed:e.collapsed!==false,
    sets:(e.sets||[]).map(migrateSet)
  };
}
function migrateCardio(c={}){
  return {
    id:c.id||Date.now()+Math.random(),
    activity:c.activity||"Walk",
    targetMinutes:+c.targetMinutes||0,
    durationSec:+c.durationSec||0,
    distance:+c.distance||0,
    distanceUnit:c.distanceUnit||state.distanceUnit||"mi",
    effort:c.effort||"Steady",
    incline:c.incline??"",
    resistance:c.resistance??"",
    notes:c.notes||"",
    running:false,
    startedAt:null
  };
}
function migrateSession(w={}){
  const exercises=(w.exercises||[]).map(migrateExercise);
  const cardio=(w.cardio||w.cardioBlocks||[]).map(migrateCardio);
  let type=w.type;
  if(!type) type=cardio.length&&exercises.length?"mixed":cardio.length?"cardio":"strength";
  return {
    id:w.id||Date.now()+Math.random(),
    date:w.date||new Date().toISOString(),
    endedAt:w.endedAt||null,
    durationSec:+w.durationSec||0,
    type,
    title:w.title||"",
    notes:w.notes||"",
    exercises,
    cardio,
    startedAt:w.startedAt||null,
    editingIndex:Number.isInteger(w.editingIndex)?w.editingIndex:null,
    originalDurationSec:+w.originalDurationSec||0
  };
}
function load(){
  try{
    const raw=localStorage.getItem(KEY)||localStorage.getItem(LEGACY_KEY);
    if(!raw)return;
    const parsed=JSON.parse(raw);
    state={...structuredCloneSafe(DEFAULTS),...parsed};
    state.workouts=(parsed.workouts||[]).map(migrateSession);
    state.active=parsed.active?migrateSession(parsed.active):null;
    state.customRoutines=Array.isArray(parsed.customRoutines)?parsed.customRoutines:[];
    state.version=2;
    save();
  }catch(err){ console.warn("MOVED could not load local data",err); }
}
function save(){
  try{localStorage.setItem(KEY,JSON.stringify(state));}catch(err){console.warn("MOVED could not save",err);}
}
load();

/* ============ HELPERS ============ */
const $=s=>document.querySelector(s);
const $$=s=>[...document.querySelectorAll(s)];
const inc=()=>state.unit==="kg"?2.5:5;
const fmt=n=>Math.round(Number(n)||0).toLocaleString();
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
function esc(s){return String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
function escAttr(s){return String(s??"").replace(/\\/g,"\\\\").replace(/'/g,"\\'").replace(/"/g,"&quot;");}
function findEx(name){return (window.LIB||[]).find(l=>l[0]===name);}
function setVolume(s){return s.warmup?0:(+s.w||0)*(+s.r||0);}
function volume(w){return (w.exercises||[]).reduce((t,e)=>t+(e.sets||[]).reduce((a,s)=>a+setVolume(s),0),0);}
function loggedVolume(w){return (w.exercises||[]).reduce((t,e)=>t+(e.sets||[]).reduce((a,s)=>a+(s.done?setVolume(s):0),0),0);}
function cardioElapsed(c){return Math.max(0,(+c.durationSec||0)+(c.running&&c.startedAt?(Date.now()-c.startedAt)/1000:0));}
function cardioSeconds(w){return (w.cardio||[]).reduce((t,c)=>t+cardioElapsed(c),0);}
function lifetime(){return state.workouts.reduce((t,w)=>t+volume(w),0);}
function lifetimeCardio(){return state.workouts.reduce((t,w)=>t+cardioSeconds(w),0);}
function fmtDurSeconds(sec){
  const total=Math.max(0,Math.floor(sec||0));
  const h=Math.floor(total/3600),m=Math.floor((total%3600)/60),s=String(total%60).padStart(2,"0");
  return h?`${h}:${String(m).padStart(2,"0")}:${s}`:`${m}:${s}`;
}
function fmtMinutes(sec){return Math.round((sec||0)/60);}
function sessionType(w){return w.type||(w.cardio?.length&&w.exercises?.length?"mixed":w.cardio?.length?"cardio":"strength");}
function typeIcon(type){return type==="cardio"?"🏃":type==="mixed"?"⚡":"🏋️";}
function sessionTitle(w){
  if(w.title)return w.title;
  if(sessionType(w)==="cardio")return w.cardio?.[0]?.activity||"Cardio";
  if(sessionType(w)==="mixed")return "Strength + cardio";
  return "Strength session";
}
function sessionSubtitle(w){
  const names=(w.exercises||[]).map(e=>e.name).slice(0,3);
  const cardio=(w.cardio||[]).map(c=>c.activity);
  return [...names,...cardio].join(" · ")||"Something happened.";
}
function tierFor(v){let cur=TIERS[0],nx=null;for(let i=0;i<TIERS.length;i++){if(v>=TIERS[i].at){cur=TIERS[i];nx=TIERS[i+1]||null;}}return{cur,nx};}
function equivalence(v){
  if(v<=0)return null;
  let best=EQUIV[0];
  for(const e of EQUIV){if(v/e[1]>=1)best=e;}
  const raw=v/best[1];
  const count=raw>=10?Math.round(raw):Math.round(raw*10)/10;
  return{emoji:best[2],text:`${count} ${best[0].replace(/^a |^an |^the /,"")}${count>=2?"s":""}`};
}
function toast(message){
  const el=$("#toast");if(!el)return;
  el.textContent=message;el.classList.add("show");clearTimeout(el._timer);el._timer=setTimeout(()=>el.classList.remove("show"),1900);
}
function haptic(pattern=10){try{navigator.vibrate?.(pattern);}catch(_){}}
function greeting(){const h=new Date().getHours();return h<12?"Good morning":h<18?"Good afternoon":"Good evening";}
function applyAnim(){document.body.classList.toggle("no-anim",state.anim===false);}
applyAnim();
function lastTopSet(name,excludeIndex=null){
  let best=null;
  state.workouts.forEach((w,wi)=>{
    if(wi===excludeIndex)return;
    (w.exercises||[]).filter(e=>e.name===name).forEach(e=>(e.sets||[]).filter(s=>!s.warmup).forEach(s=>{
      if(!best||(+s.w||0)>best.w||((+s.w||0)===best.w&&(+s.r||0)>best.r))best={w:+s.w||0,r:+s.r||0};
    }));
  });
  return best;
}
function weekBounds(offset=0){
  const now=new Date();const day=(now.getDay()+6)%7;
  const start=new Date(now);start.setHours(0,0,0,0);start.setDate(now.getDate()-day+(offset*7));
  const end=new Date(start);end.setDate(start.getDate()+7);return[start,end];
}
function sessionsInWeek(offset=0){const[start,end]=weekBounds(offset);return state.workouts.filter(w=>{const d=new Date(w.date);return d>=start&&d<end;});}
function paceText(c){
  const sec=cardioElapsed(c),dist=+c.distance||0;if(!sec||!dist)return"Add distance to see pace";
  const per=sec/dist;const m=Math.floor(per/60),s=String(Math.round(per%60)).padStart(2,"0");
  return `${m}:${s} / ${c.distanceUnit||state.distanceUnit}`;
}
function exerciseUsage(){
  const map={};state.workouts.forEach((w,wi)=>(w.exercises||[]).forEach(e=>{const x=map[e.name]||(map[e.name]={count:0,last:-1});x.count++;x.last=Math.max(x.last,wi);}));return map;
}

/* ============ ROUTING + TIMERS ============ */
let route="home";
let liveIv=null;
function go(r){
  route=r;
  if(r!=="workout"){cancelRest();clearLiveTimer();}
  $$(".nav-btn").forEach(b=>b.classList.remove("active"));
  $("#nav-"+r)?.classList.add("active");
  window.scrollTo(0,0);render();
}
function render(){route==="stats"?renderStats():route==="workout"?renderWorkout():renderHome();}
function clearLiveTimer(){if(liveIv)clearInterval(liveIv);liveIv=null;}
function startLiveTimer(){
  clearLiveTimer();if(!state.active)return;
  const tick=()=>{
    const elapsed=$("#wk-elapsed");if(elapsed)elapsed.textContent=fmtDurSeconds((Date.now()-(state.active.startedAt||Date.now()))/1000);
    (state.active.cardio||[]).forEach((c,i)=>{
      const t=$("#cardio-time-"+i);if(t)t.textContent=fmtDurSeconds(cardioElapsed(c));
      const fill=$("#cardio-fill-"+i);if(fill){const target=(+c.targetMinutes||0)*60;fill.style.width=(target?clamp(cardioElapsed(c)/target*100,0,100):0)+"%";}
      const pace=$("#cardio-pace-"+i);if(pace)pace.textContent=paceText(c);
    });
    updateWorkoutMetrics();
  };
  tick();liveIv=setInterval(tick,1000);
}
function updateWorkoutMetrics(){
  if(!state.active)return;
  const vol=$("#live-strength");if(vol)vol.textContent=fmt(loggedVolume(state.active));
  const mins=$("#live-cardio");if(mins)mins.textContent=fmtMinutes(cardioSeconds(state.active));
}

/* ============ HOME ============ */
function renderHome(){
  const sessions=state.workouts;
  const week=sessionsInWeek(0);
  const weekVol=week.reduce((t,w)=>t+volume(w),0);
  const weekCardio=week.reduce((t,w)=>t+cardioSeconds(w),0);
  const lt=lifetime();const eq=equivalence(lt);const{cur,nx}=tierFor(lt);
  const R=32,C=2*Math.PI*R,prog=nx?clamp((lt-cur.at)/(nx.at-cur.at),0,1):1;
  let html=`<p class="greet">${greeting()}${state.name?`, <b>${esc(state.name)}</b>`:""}.</p>`;

  if(state.active){
    html+=`<button class="active-banner" onclick="go('workout')"><span class="live-dot"></span><span><b>${state.active.editingIndex!==null?"Editing a session":"Session in progress"}</b><p>${sessionTitle(state.active)} · ${fmt(loggedVolume(state.active))} ${state.unit} · ${fmtMinutes(cardioSeconds(state.active))} cardio min</p></span><span class="chev">›</span></button>`;
  }

  html+=`<section class="launch-shell">
    <h2>What are we moving today?</h2>
    <p>Pick a lane. Or pick both. MOVED is not your supervisor.</p>
    <div class="move-grid">
      <button class="move-choice" onclick="launchMode('strength')"><span class="mi">🏋️</span><b>Strength</b><small>Lift things</small></button>
      <button class="move-choice featured" onclick="launchMode('mixed')"><span class="mi">⚡</span><b>Both</b><small>Combo move</small></button>
      <button class="move-choice" onclick="launchMode('cardio')"><span class="mi">🏃</span><b>Cardio</b><small>Go-ish</small></button>
    </div>
  </section>`;

  html+=`<div class="week-strip">
    <div class="mini-stat"><div class="k">Sessions</div><div class="v mono">${week.length}</div></div>
    <div class="mini-stat"><div class="k">Strength</div><div class="v mono">${fmt(weekVol)}<small> ${state.unit}</small></div></div>
    <div class="mini-stat"><div class="k">Cardio</div><div class="v mono">${fmtMinutes(weekCardio)}<small> min</small></div></div>
  </div>`;

  if(!sessions.length){
    html+=`<div class="section-h"><h2>Welcome to the anti fitness app</h2></div>
      <div class="nudge"><div class="dot spectrum-bg"></div><div><div class="t">No streaks. No shame.</div><p>Do something, log it, and leave. Strength, cardio, twelve chaotic minutes — it all still happened.</p><button class="mini-action" onclick="loadSample()">Load a sample week to look around →</button></div></div>`;
    $("#view").innerHTML=html;return;
  }

  html+=`<div class="section-h"><h2>Lifetime movement</h2></div>
  <div class="card hero">
    <div class="eyebrow">Total weight moved</div>
    <div class="big mono">${fmt(lt)}<span class="unit">${state.unit}</span></div>
    ${eq?`<div class="equiv">${eq.emoji}<span>roughly <b>${eq.text}</b></span></div>`:"<div class=\"equiv\">Strength totals begin with your first completed set.</div>"}
    <div class="tier">
      <div class="ring"><svg width="74" height="74" viewBox="0 0 74 74"><circle cx="37" cy="37" r="${R}" stroke="rgba(255,255,255,.07)" stroke-width="6" fill="none"/><circle cx="37" cy="37" r="${R}" stroke="url(#tierg)" stroke-width="6" fill="none" stroke-linecap="round" stroke-dasharray="${C}" stroke-dashoffset="${C*(1-prog)}"/><defs><linearGradient id="tierg"><stop stop-color="#ff3ca6"/><stop offset=".5" stop-color="#a855f7"/><stop offset="1" stop-color="#2dd4ff"/></linearGradient></defs></svg><div class="label">${Math.round(prog*100)}%</div></div>
      <div class="tier-meta"><div class="name spectrum-text">${cur.n}</div><div class="sub">Tier ${TIERS.indexOf(cur)+1} of ${TIERS.length}</div>${nx?`<div class="next"><b>${fmt(nx.at-lt)} ${state.unit}</b> to ${nx.n}</div>`:`<div class="next">Maximum nonsense achieved.</div>`}</div>
    </div>
  </div>`;

  const nudge=smartSuggestion();
  html+=`<div class="section-h"><h2>Next reasonable move</h2></div><div class="nudge"><div class="dot spectrum-bg"></div><div><div class="t">${nudge.tag}</div><p>${nudge.text}</p>${nudge.action?`<button class="mini-action" onclick="${nudge.action}">${nudge.actionText||"Start it →"}</button>`:""}</div></div>`;

  const recap=weeklyRecap();
  html+=`<div class="section-h"><h2>This week, apparently</h2></div><div class="card recap"><div><div class="bigline">${recap.headline}</div><p>${recap.copy}</p></div><div class="badge">${recap.emoji}</div></div>`;

  const trend=sessions.filter(w=>volume(w)>0).slice(-8).map(volume);
  if(trend.length>=2)html+=`<div class="section-h"><h2>Strength trend</h2><span class="link">last ${trend.length}</span></div><div class="card" style="padding:13px 15px">${sparkline(trend)}</div>`;

  html+=`<div class="section-h"><h2>Recent sessions</h2><button class="link" onclick="go('stats')">See insights</button></div>`;
  sessions.slice().reverse().slice(0,12).forEach(w=>{const idx=state.workouts.indexOf(w);html+=sessionRow(w,idx);});
  $("#view").innerHTML=html;
}
function sessionRow(w,idx){
  const d=new Date(w.date),type=sessionType(w),vol=volume(w),mins=fmtMinutes(cardioSeconds(w));
  let metric=type==="cardio"?`${mins}`:type==="mixed"?`${fmt(vol)}`:`${fmt(vol)}`;
  let unit=type==="cardio"?"minutes":type==="mixed"?`${state.unit} + ${mins}m`:state.unit;
  return `<button class="session-row" onclick="openDetail(${idx})"><span class="session-icon">${typeIcon(type)}</span><span class="session-main"><span class="ti">${esc(sessionTitle(w))}</span><span class="me">${d.toLocaleDateString('en',{month:'short',day:'numeric'})} · ${esc(sessionSubtitle(w))}</span></span><span class="session-metric"><span class="n">${metric}</span><span class="u">${unit}</span></span></button>`;
}
function smartSuggestion(){
  if(!state.workouts.length)return{tag:"Begin anywhere",text:"Twelve minutes still happened. Pick the version of movement with the lowest negotiation cost.",action:"launchShort()",actionText:"Build a 15-minute session →"};
  const recent7=state.workouts.filter(w=>Date.now()-new Date(w.date).getTime()<7*864e5);
  const cardio7=recent7.reduce((t,w)=>t+cardioSeconds(w),0);
  const muscleDates={};
  state.workouts.forEach(w=>(w.exercises||[]).forEach(e=>{muscleDates[e.muscle]=Math.max(muscleDates[e.muscle]||0,new Date(w.date).getTime());}));
  const core=["Chest","Back","Legs","Glutes","Core"];
  const oldest=core.sort((a,b)=>(muscleDates[a]||0)-(muscleDates[b]||0))[0];
  if(recent7.filter(w=>volume(w)>0).length>=2&&cardio7<600)return{tag:"Balance, not punishment",text:"You have strength work this week and less than ten minutes of cardio. A short walk or bike finisher would round things out without becoming a whole production.",action:"launchQuickCardio()",actionText:"Start 10 easy minutes →"};
  const latestEffort=[...state.workouts].reverse().flatMap(w=>[...(w.exercises||[])].reverse()).find(e=>e.effort==="More");
  if(latestEffort){const top=lastTopSet(latestEffort.name);const ex=findEx(latestEffort.name);if(top)return{tag:"You said you had more",text:`Your last <b>${esc(latestEffort.name)}</b> felt comfortable. Try ${ex?.[1]==="Bodyweight"?top.r+2+" reps":top.w+inc()+" "+state.unit}, or keep the load and make the reps prettier.`};}
  if(oldest)return{tag:"Training balance",text:`<b>${oldest}</b> has been waiting the longest. Not a guilt trip — just the least recently invited muscle group.`,action:`launchMuscle('${oldest}')`,actionText:`Build ${oldest.toLowerCase()} session →`};
  const counts={};state.workouts.forEach(w=>(w.exercises||[]).forEach(e=>counts[e.name]=(counts[e.name]||0)+1));
  const repeated=Object.keys(counts).find(n=>counts[n]>=2);
  if(repeated){const top=lastTopSet(repeated);const ex=findEx(repeated);if(top)return{tag:"Progressive-ish overload",text:`Last <b>${esc(repeated)}</b>: <b>${top.w}${ex?.[1]==="Bodyweight"?"":" "+state.unit} × ${top.r}</b>. Try ${ex?.[1]==="Bodyweight"?top.r+2+" reps":top.w+inc()+" "+state.unit} — or repeat it cleaner. Both count.`};}
  return{tag:"Keep it ordinary",text:"The boring session you actually do remains undefeated."};
}
function weeklyRecap(){
  const now=sessionsInWeek(0),prev=sessionsInWeek(-1);const vol=now.reduce((t,w)=>t+volume(w),0),mins=fmtMinutes(now.reduce((t,w)=>t+cardioSeconds(w),0));
  if(!now.length)return{headline:"A blank week is not a broken week.",copy:"The app will be here when movement fits back into the plot.",emoji:"🌙"};
  const muscle={};now.forEach(w=>(w.exercises||[]).forEach(e=>muscle[e.muscle]=(muscle[e.muscle]||0)+e.sets.filter(s=>!s.warmup).length));
  const top=Object.entries(muscle).sort((a,b)=>b[1]-a[1])[0]?.[0];
  const delta=now.length-prev.length;
  const compare=prev.length?delta===0?" · same number of sessions as last week":` · ${Math.abs(delta)} ${delta>0?"more":"fewer"} session${Math.abs(delta)!==1?"s":""} than last week`:"";
  return{headline:`${now.length} session${now.length!==1?"s":""}. ${mins} cardio min.`,copy:`${fmt(vol)} ${state.unit} moved${top?` · ${top} got the most attention`:""}${compare}.`,emoji:delta>0?"📈":"✨"};
}
function sparkline(vals){
  const w=320,h=44,max=Math.max(...vals,1),min=Math.min(...vals,0),rng=max-min||1,n=vals.length;
  const pts=vals.map((v,i)=>[i/(n-1)*w,h-((v-min)/rng)*(h-7)-3]);
  const line=pts.map((p,i)=>(i?"L":"M")+p[0].toFixed(1)+" "+p[1].toFixed(1)).join(" ");
  const area=`M0 ${h} `+pts.map(p=>`L${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(" ")+` L${w} ${h} Z`;
  return `<svg class="spark" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none"><defs><linearGradient id="sp-line"><stop stop-color="#ff3ca6"/><stop offset=".5" stop-color="#a855f7"/><stop offset="1" stop-color="#2dd4ff"/></linearGradient><linearGradient id="sp-fill" x1="0" y1="0" x2="0" y2="1"><stop stop-color="rgba(168,85,247,.2)"/><stop offset="1" stop-color="rgba(168,85,247,0)"/></linearGradient></defs><path d="${area}" fill="url(#sp-fill)"/><path d="${line}" fill="none" stroke="url(#sp-line)" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>${pts.map(p=>`<circle cx="${p[0]}" cy="${p[1]}" r="2.2" fill="#fff"/>`).join("")}</svg>`;
}

/* ============ START FLOW ============ */
const CARDIO_ACTIVITIES=[
  ["Walk","🚶"],["Treadmill","🏃"],["Bike","🚲"],["Elliptical","⭕"],["Rower","🚣"],["Stair Climber","🪜"],["Swim","🏊"],["Other","✨"]
];
const MUSCLE_ICONS={Chest:"◢",Back:"◣",Shoulders:"◆",Arms:"⌁",Legs:"▰",Glutes:"●",Core:"◎"};
let startFlow={mode:null,muscles:[],fullBody:false,minutes:25,preview:[],seed:0,activity:"Walk",cardioMinutes:15,effort:"Steady"};
function resetStartFlow(){startFlow={mode:null,muscles:[],fullBody:false,minutes:25,preview:[],seed:0,activity:"Walk",cardioMinutes:15,effort:"Steady"};}
function launchMode(mode){resetStartFlow();startFlow.mode=mode;go("workout");}
function launchMuscle(m){resetStartFlow();startFlow.mode="strength";startFlow.muscles=[m];rebuildPreview();go("workout");}
function launchShort(){resetStartFlow();startFlow.mode="strength";startFlow.minutes=15;startFlow.fullBody=true;rebuildPreview();go("workout");}
function launchQuickCardio(){resetStartFlow();startFlow.mode="cardio";startFlow.cardioMinutes=10;startFlow.effort="Easy";go("workout");}
function renderWorkout(){
  if(state.active)return renderActiveWorkout();
  if(!startFlow.mode)return renderModeChooser();
  if(startFlow.mode==="cardio")return renderCardioBuilder();
  renderStrengthBuilder();
}
function renderModeChooser(){
  const last=state.workouts[state.workouts.length-1];
  let html=`<div class="mode-hero"><div class="glyph">↗</div><h2>Move something.</h2><p>Choose the kind of session. No rings will be disappointed by your decision.</p></div><div class="mode-list">
    <button class="mode-card" onclick="chooseMode('strength')"><span class="icon">🏋️</span><span><h3>Strength</h3><p>Pick muscles and let MOVED assemble a reasonable plan.</p></span><span class="arrow">›</span></button>
    <button class="mode-card" onclick="chooseMode('cardio')"><span class="icon">🏃</span><span><h3>Cardio</h3><p>Walk, pedal, climb, row, or aggressively go nowhere.</p></span><span class="arrow">›</span></button>
    <button class="mode-card" onclick="chooseMode('mixed')"><span class="icon">⚡</span><span><h3>Both</h3><p>Strength first, cardio finisher, dramatic soundtrack optional.</p></span><span class="arrow">›</span></button>
  </div>`;
  if(last){html+=`<div class="section-h"><h2>Quick return</h2></div><button class="quick-card" onclick="repeatLast()"><span class="qicon">↻</span><span class="qcopy"><b>Repeat last session</b><small>${esc(sessionSubtitle(last))}</small></span><span class="qact">LOAD</span></button>`;}
  if(state.customRoutines.length){html+=`<div class="section-h"><h2>Your routines</h2></div>`+state.customRoutines.map(r=>`<div class="quick-card"><button class="qicon" onclick="startFromRoutine('${r.id}')">★</button><button class="qcopy" onclick="startFromRoutine('${r.id}')"><b>${esc(r.name)}</b><small>${(r.exercises||[]).length} exercises${r.cardio?` · ${r.cardio.activity}`:""}</small></button><button class="delete-mini" onclick="deleteRoutine('${r.id}')" aria-label="Delete routine">×</button></div>`).join("");}
  html+=`<div class="section-h"><h2>Starter routines</h2></div><div class="preview-list">`+TEMPLATES.map(t=>`<button class="quick-card" onclick="startFromTemplate('${t.id}')"><span class="qicon">▦</span><span class="qcopy"><b>${esc(t.name)}</b><small>${esc(t.tag)}</small></span><span class="qact">${t.exercises.length} MOVES</span></button>`).join("")+`</div><button class="btn btn-quiet" style="margin-top:12px" onclick="startEmptyStrength()">Start completely empty</button>`;
  $("#view").innerHTML=html;
}
function chooseMode(mode){startFlow.mode=mode;renderWorkout();}
function renderStrengthBuilder(){
  const both=startFlow.mode==="mixed";
  if(startFlow.muscles.length&&!startFlow.preview.length)rebuildPreview();
  let html=`<div class="builder-top"><div><h2>${both?"Build both":"Build strength"}</h2><p>${both?"Strength plus a cardio finisher.":"Pick up to three muscle groups. MOVED handles the awkward first draft."}</p></div><button class="builder-back" onclick="resetStartFlow();renderWorkout()"><svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7"/></svg></button></div>`;
  html+=`<div class="builder-section"><div class="builder-label"><b>Muscle groups</b><span>${startFlow.fullBody?"Full body":startFlow.muscles.length+" of 3"}</span></div><div class="muscle-grid">`;
  MUSCLES.forEach(m=>{
    const on=startFlow.muscles.includes(m)&&!startFlow.fullBody,col=MUSCLE_COLOR[m]||"#777";
    html+=`<button class="muscle-chip ${on?'on spectrum-bg':''}" ${!on&&!startFlow.fullBody&&startFlow.muscles.length>=3?'disabled':''} onclick="toggleMuscle('${m}')"><span class="dot" style="background:${on?'#09080f':col}"></span><span>${MUSCLE_ICONS[m]||'•'} ${m}</span></button>`;
  });
  if(startFlow.muscles.length===3||startFlow.fullBody)html+=`<button class="muscle-chip full ${startFlow.fullBody?'on spectrum-bg':''}" onclick="toggleFullBody()">✦ ${startFlow.fullBody?'Full body selected':'Turn this into full body'}</button>`;
  html+=`</div></div>`;
  html+=`<div class="builder-section"><div class="builder-label"><b>Time available</b><span>approximate, not legally binding</span></div><div class="choice-chips">${[15,25,40,60].map(n=>`<button class="choice-chip ${startFlow.minutes===n?'on spectrum-bg':''}" onclick="setBuildMinutes(${n})">${n} min</button>`).join("")}</div></div>`;
  html+=`<div class="builder-section"><div class="builder-label"><b>Suggested plan</b><span>${startFlow.preview.length?startFlow.preview.length+" exercises":"choose muscles"}</span></div>`;
  if(startFlow.preview.length){
    html+=`<div class="preview-list">`+startFlow.preview.map((name,i)=>{const row=findEx(name)||[];return`<div class="preview-item"><span class="preview-num">${i+1}</span><span><b>${esc(name)}</b><small>${row[3]||"Other"} · ${row[1]||"Custom"}</small></span><span class="preview-actions"><button onclick="movePreview(${i},-1)" aria-label="Move up">↑</button><button onclick="replacePreview(${i})" aria-label="Swap">↻</button><button onclick="movePreview(${i},1)" aria-label="Move down">↓</button></span></div>`;}).join("")+`</div><div class="preview-toolbar"><button class="btn btn-quiet" onclick="shufflePreview()">Shuffle plan</button><button class="btn btn-quiet" onclick="clearPreview()">Choose myself</button></div>`;
  }else html+=`<div class="nudge"><div class="dot spectrum-bg"></div><div><div class="t">Waiting politely</div><p>Choose at least one muscle group, or start empty and browse the full exercise library.</p></div></div>`;
  html+=`</div>`;
  if(both)html+=cardioBuilderMarkup(true);
  const canStart=startFlow.preview.length||(!startFlow.muscles.length&&!startFlow.fullBody);
  html+=`<div class="builder-summary"><div class="row"><span>Strength</span><b>${startFlow.preview.length?startFlow.preview.length+" exercises":"empty session"}</b></div>${both?`<div class="row"><span>Cardio finisher</span><b>${startFlow.activity} · ${startFlow.cardioMinutes} min · ${startFlow.effort}</b></div>`:""}</div><button class="btn btn-primary spectrum-bg" style="margin-top:12px" ${canStart?'':'disabled'} onclick="startBuiltWorkout()">${both?'Start combo session':'Start strength session'}</button>`;
  $("#view").innerHTML=html;
}
function cardioBuilderMarkup(compact=false){
  return `<div class="builder-section"><div class="builder-label"><b>${compact?"Cardio finisher":"Activity"}</b><span>${compact?"it can be short":"pick your machine or lack thereof"}</span></div><div class="activity-grid">${CARDIO_ACTIVITIES.map(([name,icon])=>`<button class="activity-card ${startFlow.activity===name?'on':''}" onclick="setActivity('${name}')"><span class="ai">${icon}</span><b>${name}</b></button>`).join("")}</div></div>
  <div class="builder-section"><div class="builder-label"><b>Target time</b><span>you may stop early and remain a person</span></div><div class="choice-chips">${[10,15,20,30,45,60].map(n=>`<button class="choice-chip ${startFlow.cardioMinutes===n?'on spectrum-bg':''}" onclick="setCardioMinutes(${n})">${n} min</button>`).join("")}</div></div>
  <div class="builder-section"><div class="builder-label"><b>Effort</b></div><div class="choice-chips">${["Easy","Steady","Hard"].map(n=>`<button class="choice-chip ${startFlow.effort===n?'on spectrum-bg':''}" onclick="setBuildEffort('${n}')">${n}</button>`).join("")}</div></div>`;
}
function renderCardioBuilder(){
  const html=`<div class="builder-top"><div><h2>Start cardio</h2><p>Move through space or remain heroically stationary on a machine.</p></div><button class="builder-back" onclick="resetStartFlow();renderWorkout()"><svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7"/></svg></button></div>${cardioBuilderMarkup(false)}<div class="builder-summary"><div class="row"><span>Plan</span><b>${startFlow.activity}</b></div><div class="row"><span>Target</span><b>${startFlow.cardioMinutes} min · ${startFlow.effort}</b></div></div><button class="btn btn-primary spectrum-bg" style="margin-top:12px" onclick="startBuiltWorkout()">Start ${esc(startFlow.activity.toLowerCase())}</button>`;
  $("#view").innerHTML=html;
}
function toggleMuscle(m){
  startFlow.fullBody=false;const i=startFlow.muscles.indexOf(m);if(i>=0)startFlow.muscles.splice(i,1);else if(startFlow.muscles.length<3)startFlow.muscles.push(m);rebuildPreview();renderWorkout();
}
function toggleFullBody(){startFlow.fullBody=!startFlow.fullBody;if(startFlow.fullBody)startFlow.muscles=[];rebuildPreview();renderWorkout();}
function setBuildMinutes(n){startFlow.minutes=n;rebuildPreview();renderWorkout();}
function setActivity(n){startFlow.activity=n;renderWorkout();}
function setCardioMinutes(n){startFlow.cardioMinutes=n;renderWorkout();}
function setBuildEffort(n){startFlow.effort=n;renderWorkout();}
function desiredExerciseCount(){return startFlow.minutes<=15?3:startFlow.minutes<=25?4:startFlow.minutes<=40?5:6;}
function selectedMuscles(){return startFlow.fullBody?["Chest","Back","Legs","Glutes","Shoulders","Core"]:startFlow.muscles;}
function musclePool(m){
  return LIB.filter(row=>row[3]===m).map(row=>row[0]);
}
function rebuildPreview(){
  const muscles=selectedMuscles();if(!muscles.length){startFlow.preview=[];return;}
  const usage=exerciseUsage(),count=desiredExerciseCount(),picked=[];
  const sortedPool=m=>musclePool(m).sort((a,b)=>(usage[b]?.count||0)-(usage[a]?.count||0)||LIB.findIndex(x=>x[0]===a)-LIB.findIndex(x=>x[0]===b));
  muscles.forEach((m,mi)=>{const pool=sortedPool(m);if(pool.length){const pick=pool[(startFlow.seed+mi)%Math.min(pool.length,3)];if(!picked.includes(pick))picked.push(pick);}});
  const all=muscles.flatMap(sortedPool).filter((n,i,a)=>a.indexOf(n)===i&&!picked.includes(n));
  for(let i=0;picked.length<count&&i<all.length;i++)picked.push(all[(i+startFlow.seed)%all.length]);
  startFlow.preview=picked.slice(0,count);
}
function shufflePreview(){startFlow.seed++;rebuildPreview();renderWorkout();haptic();}
function clearPreview(){startFlow.preview=[];startFlow.muscles=[];startFlow.fullBody=false;renderWorkout();}
function replacePreview(i){
  const muscles=selectedMuscles(),pool=muscles.flatMap(musclePool).filter(n=>!startFlow.preview.includes(n));if(!pool.length)return toast("No more swaps in this pool");startFlow.seed++;startFlow.preview[i]=pool[startFlow.seed%pool.length];renderWorkout();
}
function movePreview(i,d){const j=i+d;if(j<0||j>=startFlow.preview.length)return;[startFlow.preview[i],startFlow.preview[j]]=[startFlow.preview[j],startFlow.preview[i]];renderWorkout();}
function blankSession(type="strength"){
  return{id:Date.now(),date:new Date().toISOString(),startedAt:Date.now(),endedAt:null,durationSec:0,type,title:"",notes:"",exercises:[],cardio:[],editingIndex:null,originalDurationSec:0};
}
function addExFromName(name,session=state.active){
  const row=findEx(name)||[];const cat=row[1]||"Custom";const top=lastTopSet(name,session.editingIndex);
  const ex={name,cat,tip:row[2]||"",muscle:row[3]||"Other",note:"",effort:"",collapsed:true,sets:[{w:top?.w||0,r:top?.r||(cat==="Bodyweight"?8:8),done:false,warmup:false}]};
  session.exercises.push(ex);return ex;
}
function makeCardio(activity,targetMinutes,effort,running=false){return{id:Date.now()+Math.random(),activity,targetMinutes,durationSec:0,distance:0,distanceUnit:state.distanceUnit,effort,incline:"",resistance:"",notes:"",running,startedAt:running?Date.now():null};}
function startBuiltWorkout(){
  const type=startFlow.mode||"strength";const a=blankSession(type);const muscles=selectedMuscles();
  if(type!=="cardio")startFlow.preview.forEach(n=>addExFromName(n,a));
  if(a.exercises.length)a.exercises[0].collapsed=false;
  if(type!=="strength")a.cardio.push(makeCardio(startFlow.activity,startFlow.cardioMinutes,startFlow.effort,type==="cardio"));
  if(type==="strength"&&muscles.length)a.title=startFlow.fullBody?"Full Body":muscles.join(" + ");
  if(type==="mixed")a.title=`${startFlow.fullBody?"Full Body":muscles.join(" + ")||"Strength"} + ${startFlow.activity}`;
  state.active=a;save();requestWake();resetStartFlow();renderWorkout();
  if(type==="strength"&&!a.exercises.length)setTimeout(openPicker,80);
}
function startEmptyStrength(){state.active=blankSession("strength");save();requestWake();renderWorkout();setTimeout(openPicker,70);}
function repeatLast(){const last=state.workouts[state.workouts.length-1];if(!last)return;startFromSession(last);toast("Loaded your last session");}
function startFromSession(source){
  const a=blankSession(sessionType(source));(source.exercises||[]).forEach(e=>addExFromName(e.name,a));if(a.exercises.length)a.exercises[0].collapsed=false;
  a.cardio=(source.cardio||[]).map(c=>makeCardio(c.activity,Math.max(5,Math.round(cardioElapsed(c)/60)||c.targetMinutes||15),c.effort||"Steady",sessionType(source)==="cardio"));
  state.active=a;save();requestWake();resetStartFlow();go("workout");
}
function startFromTemplate(id){const t=TEMPLATES.find(x=>x.id===id);if(!t)return;const a=blankSession("strength");a.title=t.name;t.exercises.forEach(n=>addExFromName(n,a));if(a.exercises.length)a.exercises[0].collapsed=false;state.active=a;save();requestWake();resetStartFlow();go("workout");toast(t.name+" loaded");}
function startFromRoutine(id){const r=state.customRoutines.find(x=>x.id===id);if(!r)return;const a=blankSession(r.cardio&&(r.exercises||[]).length?"mixed":r.cardio?"cardio":"strength");a.title=r.name;(r.exercises||[]).forEach(n=>addExFromName(n,a));if(a.exercises.length)a.exercises[0].collapsed=false;if(r.cardio)a.cardio=[makeCardio(r.cardio.activity,r.cardio.targetMinutes,r.cardio.effort,a.type==="cardio")];state.active=a;save();requestWake();go("workout");toast(r.name+" loaded");}
function deleteRoutine(id){if(!confirm("Delete this saved routine?"))return;state.customRoutines=state.customRoutines.filter(r=>r.id!==id);save();renderWorkout();}

/* ============ ACTIVE WORKOUT ============ */
function renderActiveWorkout(){
  const a=state.active,type=sessionType(a),editing=a.editingIndex!==null;
  let html=`<div class="wk-head"><div><div class="eyebrow">${editing?"Editing saved session":"Active session"}</div><div class="wk-title">${esc(sessionTitle(a))}</div><div class="live-row"><span class="live-dot"></span><span id="wk-elapsed">${fmtDurSeconds((Date.now()-(a.startedAt||Date.now()))/1000)}</span></div></div><div class="wk-head-actions"><button onclick="saveActiveRoutine()" title="Save routine"><svg viewBox="0 0 24 24"><path d="M12 3l2.8 5.7 6.2.9-4.5 4.4 1.1 6.2L12 17.3 6.4 20l1.1-6.2L3 9.6l6.2-.9z"/></svg></button></div></div>`;
  html+=`<div class="wk-total"><div class="metric"><div class="n mono spectrum-text" id="live-strength">${fmt(loggedVolume(a))}</div><div class="l">${state.unit} strength</div></div><div class="divider"></div><div class="metric"><div class="n mono spectrum-text" id="live-cardio">${fmtMinutes(cardioSeconds(a))}</div><div class="l">cardio minutes</div></div></div>`;
  if(type!=="cardio")html+=renderExercises(a);
  if(type!=="strength")html+=(a.cardio||[]).map((c,i)=>renderCardioBlock(c,i)).join("");
  if(type!=="cardio")html+=`<button class="btn btn-ghost" onclick="openPicker()" style="margin-top:3px"><svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>Add exercise</button>`;
  html+=`<div style="height:93px"></div><div class="wk-actions"><button class="btn btn-ghost" style="width:auto" onclick="cancelWorkout()">${editing?"Cancel":"Discard"}</button><button class="btn btn-primary spectrum-bg" onclick="finishWorkout()"><svg viewBox="0 0 24 24"><path d="M5 13l4 4L19 7"/></svg>${editing?"Save changes":"Finish"}</button></div>`;
  $("#view").innerHTML=html;startLiveTimer();
}
function renderExercises(a){
  const expanded=a.exercises.findIndex(e=>!e.collapsed);let html="";
  a.exercises.forEach((e,ei)=>{
    const col=CAT_COLOR[e.cat]||"#ff83d1";const done=e.sets.some(s=>s.done);const exVol=e.sets.reduce((t,s)=>t+(s.done?setVolume(s):0),0);
    if(e.collapsed||(expanded!==-1&&ei!==expanded)){
      html+=`<div class="ex collapsed ${done?'':'pending'} ${expanded!==-1&&ei!==expanded?'focus-hidden':''}" id="ex-${ei}"><div class="ex-h" onclick="toggleCollapse(${ei})"><button class="ex-check ${done?'done spectrum-bg':''}"><svg viewBox="0 0 24 24"><path d="M5 13l4 4L19 7"/></svg></button><span class="pill" style="background:${col}22;color:${col}">${e.cat}</span><span class="nm">${esc(e.name)}</span><span class="ex-sum ${done?'':'todo'}">${done?`${e.sets.filter(s=>s.done).length} sets · ${fmt(exVol)} ${state.unit}`:"tap to log"}</span><button class="x" onclick="event.stopPropagation();removeEx(${ei})">×</button></div></div>`;return;
    }
    const top=lastTopSet(e.name,a.editingIndex),isbw=e.cat==="Bodyweight";
    html+=`<div class="ex" id="ex-${ei}"><div class="ex-h"><button class="ex-check" onclick="toggleCollapse(${ei})"><svg viewBox="0 0 24 24"><path d="M5 13l4 4L19 7"/></svg></button><span class="pill" style="background:${col}22;color:${col}">${e.cat}</span><span class="nm">${esc(e.name)}</span><button class="icon-mini" onclick="moveExercise(${ei},-1)" title="Move up"><svg viewBox="0 0 24 24"><path d="M7 15l5-5 5 5"/></svg></button><button class="icon-mini" onclick="moveExercise(${ei},1)" title="Move down"><svg viewBox="0 0 24 24"><path d="M7 9l5 5 5-5"/></svg></button><button class="x" onclick="removeEx(${ei})">×</button></div>`;
    if(e.tip)html+=`<div class="form-tip"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 8h.01M11 12h1v4h1"/></svg><span>${esc(e.tip)}</span></div>`;
    if(top)html+=`<div class="po">Last time: <b>${top.w}${isbw?'':' '+state.unit} × ${top.r}</b> · reasonable next try: <b>${isbw?top.r+2+' reps':top.w+inc()+' '+state.unit}</b></div>`;
    html+=`<input class="exercise-note" value="${esc(e.note)}" placeholder="Note to future you (optional)" onchange="setExerciseNote(${ei},this.value)"><div class="sets"><div class="colhead"><div>#</div><div>${isbw?'Added '+state.unit:'Weight'}</div><div>${isbw?'Reps / sec':'Reps'}</div><div>WU</div><div>Done</div></div>`;
    e.sets.forEach((s,si)=>{
      html+=`<div class="set-row"><div class="si">${si+1}</div><div class="numwrap"><button onclick="stepSet(${ei},${si},'w',-1)">−</button><input type="number" inputmode="decimal" value="${s.w}" onfocus="this.select()" onchange="setVal(${ei},${si},'w',this.value)"><button onclick="stepSet(${ei},${si},'w',1)">+</button></div><div class="numwrap"><button onclick="stepSet(${ei},${si},'r',-1)">−</button><input type="number" inputmode="numeric" value="${s.r}" onfocus="this.select()" onchange="setVal(${ei},${si},'r',this.value)"><button onclick="stepSet(${ei},${si},'r',1)">+</button></div><button class="warm-btn ${s.warmup?'on':''}" onclick="toggleWarmup(${ei},${si})">W</button><button class="set-done ${s.done?'done spectrum-bg':''}" onclick="toggleDone(${ei},${si})"><svg viewBox="0 0 24 24"><path d="M5 13l4 4L19 7"/></svg></button></div>`;
    });
    html+=`</div><button class="add-set" onclick="addSet(${ei})"><svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>Add set</button><div class="effort-row"><span>How did it feel?</span>${[["More","Had more"],["Right","About right"],["Max","Barely survived"]].map(([v,label])=>`<button class="${e.effort===v?'on':''}" onclick="setEffort(${ei},'${v}')">${label}</button>`).join("")}</div><button class="ex-done" onclick="toggleCollapse(${ei})"><svg viewBox="0 0 24 24"><path d="M5 13l4 4L19 7"/></svg>Done — collapse</button></div>`;
  });
  return html;
}
function renderCardioBlock(c,i){
  const icon=CARDIO_ACTIVITIES.find(x=>x[0]===c.activity)?.[1]||"✨";const target=(+c.targetMinutes||0)*60,pct=target?clamp(cardioElapsed(c)/target*100,0,100):0;
  return `<div class="cardio-card"><div class="cardio-top"><div class="cardio-icon">${icon}</div><div><h3>${esc(c.activity)}</h3><p>${esc(c.effort)} effort${c.targetMinutes?` · ${c.targetMinutes} minute target`:""}</p></div></div><div class="cardio-timer"><div class="cardio-time mono" id="cardio-time-${i}">${fmtDurSeconds(cardioElapsed(c))}</div><div class="cardio-target">${c.running?"Currently moving":"Timer paused"}</div><div class="cardio-progress"><div class="fill spectrum-bg" id="cardio-fill-${i}" style="width:${pct}%"></div></div></div><div class="cardio-controls"><button class="btn ${c.running?'btn-ghost':'btn-primary spectrum-bg'}" onclick="toggleCardio(${i})">${c.running?'Pause':'Start / resume'}</button><button class="round-control" onclick="adjustCardioTime(${i},-60)">−1m</button><button class="round-control" onclick="adjustCardioTime(${i},60)">+1m</button></div><div class="cardio-fields"><div class="field"><label>Distance</label><input type="number" inputmode="decimal" value="${c.distance||''}" placeholder="optional" onchange="setCardioField(${i},'distance',this.value)"></div><div class="field"><label>Distance unit</label><select onchange="setCardioField(${i},'distanceUnit',this.value)"><option ${c.distanceUnit==='mi'?'selected':''}>mi</option><option ${c.distanceUnit==='km'?'selected':''}>km</option></select></div><div class="field"><label>Incline</label><input value="${esc(c.incline)}" placeholder="optional" onchange="setCardioField(${i},'incline',this.value)"></div><div class="field"><label>Resistance</label><input value="${esc(c.resistance)}" placeholder="optional" onchange="setCardioField(${i},'resistance',this.value)"></div><div class="field full"><label>Notes</label><textarea placeholder="Anything worth remembering?" onchange="setCardioField(${i},'notes',this.value)">${esc(c.notes)}</textarea></div></div><div class="pace-line"><span>Pace</span><b id="cardio-pace-${i}">${paceText(c)}</b></div></div>`;
}
function pauseCardio(c){if(!c.running)return;c.durationSec=cardioElapsed(c);c.running=false;c.startedAt=null;}
function toggleCardio(i){const c=state.active.cardio[i];if(c.running)pauseCardio(c);else{c.running=true;c.startedAt=Date.now();}save();renderWorkout();haptic();}
function adjustCardioTime(i,delta){const c=state.active.cardio[i];if(c.running)pauseCardio(c);c.durationSec=Math.max(0,(+c.durationSec||0)+delta);save();renderWorkout();}
function setCardioField(i,key,value){const c=state.active.cardio[i];c[key]=["distance"].includes(key)?Math.max(0,parseFloat(value)||0):value;save();const p=$("#cardio-pace-"+i);if(p)p.textContent=paceText(c);}
function cancelWorkout(){
  if(!confirm(state.active.editingIndex!==null?"Discard these edits? The saved session will stay unchanged.":"Discard this session? Nothing will be saved."))return;
  cancelRest();clearLiveTimer();releaseWake();state.active=null;save();resetStartFlow();renderWorkout();
}
function addSet(ei){const sets=state.active.exercises[ei].sets,last=sets[sets.length-1];sets.push(last?{w:last.w,r:last.r,done:false,warmup:false}:{w:0,r:8,done:false,warmup:false});save();renderWorkout();}
function removeEx(i){state.active.exercises.splice(i,1);save();renderWorkout();}
function moveExercise(i,d){const j=i+d;if(j<0||j>=state.active.exercises.length)return;[state.active.exercises[i],state.active.exercises[j]]=[state.active.exercises[j],state.active.exercises[i]];save();renderWorkout();}
function setVal(ei,si,k,v){state.active.exercises[ei].sets[si][k]=Math.max(0,parseFloat(v)||0);save();updateWorkoutMetrics();}
function stepSet(ei,si,k,d){const s=state.active.exercises[ei].sets[si];s[k]=Math.max(0,(+s[k]||0)+d*(k==="w"?inc():1));save();renderWorkout();}
function toggleWarmup(ei,si){state.active.exercises[ei].sets[si].warmup=!state.active.exercises[ei].sets[si].warmup;save();renderWorkout();}
function toggleDone(ei,si){
  const ex=state.active.exercises[ei],s=ex.sets[si];s.done=!s.done;
  if(s.done){haptic();startRest();if(state.autoCollapse!==false&&ex.sets.length&&ex.sets.every(x=>x.done))ex.collapsed=true;}
  save();renderWorkout();setTimeout(()=>$("#ex-"+ei)?.classList.add("just-done"),0);
}
function toggleCollapse(ei){const e=state.active.exercises[ei],opening=e.collapsed;e.collapsed=!e.collapsed;if(opening)state.active.exercises.forEach((x,i)=>{if(i!==ei)x.collapsed=true;});save();renderWorkout();}
function setExerciseNote(i,v){state.active.exercises[i].note=v;save();}
function setEffort(i,v){state.active.exercises[i].effort=state.active.exercises[i].effort===v?"":v;save();renderWorkout();}
function saveActiveRoutine(){
  const a=state.active;if(!a)return;const name=prompt("Name this routine",sessionTitle(a));if(!name)return;
  state.customRoutines.push({id:String(Date.now()),name:name.trim(),exercises:a.exercises.map(e=>e.name),cardio:a.cardio[0]?{activity:a.cardio[0].activity,targetMinutes:a.cardio[0].targetMinutes||15,effort:a.cardio[0].effort}:null});save();toast("Routine saved");
}
function finishWorkout(){
  const a=state.active;if(!a)return;(a.cardio||[]).forEach(pauseCardio);
  const cleaned={...structuredCloneSafe(a),exercises:a.exercises.map(e=>({...structuredCloneSafe(e),collapsed:true,sets:e.sets.filter(s=>s.done&&+s.r>0)})).filter(e=>e.sets.length),cardio:a.cardio.map(c=>({...structuredCloneSafe(c),durationSec:cardioElapsed(c),running:false,startedAt:null})).filter(c=>c.durationSec>=10||c.distance>0)};
  if(!cleaned.exercises.length&&!cleaned.cardio.length){toast("Complete a set or log some cardio first");return;}
  cleaned.type=cleaned.exercises.length&&cleaned.cardio.length?"mixed":cleaned.cardio.length?"cardio":"strength";
  cleaned.durationSec=cleaned.editingIndex!==null?(cleaned.originalDurationSec||cleaned.durationSec):Math.max(0,(Date.now()-(a.startedAt||Date.now()))/1000);
  cleaned.endedAt=new Date().toISOString();delete cleaned.startedAt;delete cleaned.originalDurationSec;
  const editIndex=cleaned.editingIndex;const prs=detectPRs(cleaned,editIndex);delete cleaned.editingIndex;
  if(editIndex!==null)state.workouts[editIndex]=cleaned;else state.workouts.push(cleaned);
  state.active=null;cancelRest();clearLiveTimer();releaseWake();save();resetStartFlow();go("home");showSummary(cleaned,prs,editIndex!==null);
}

/* ============ REST TIMER ============ */
let rest={endsAt:0,dur:90,iv:null};
function startRest(){if(state.restTimer===false)return;rest.dur=state.restDur||90;rest.endsAt=Date.now()+rest.dur*1000;$("#rest")?.classList.add("show");clearInterval(rest.iv);tickRest();rest.iv=setInterval(tickRest,250);}
function tickRest(){const ms=rest.endsAt-Date.now();if(ms<=0){haptic([20,50,20]);cancelRest();return;}const s=Math.ceil(ms/1000),m=Math.floor(s/60),ss=String(s%60).padStart(2,"0");if($("#rest-time"))$("#rest-time").textContent=`${m}:${ss}`;if($("#rest-fill"))$("#rest-fill").style.width=clamp(ms/(rest.dur*1000)*100,0,100)+"%";}
function restAdjust(d){if(!rest.endsAt)return;rest.endsAt+=d*1000;if(d>0)rest.dur+=d;tickRest();}
function restSkip(){cancelRest();}
function cancelRest(){clearInterval(rest.iv);rest.iv=null;rest.endsAt=0;$("#rest")?.classList.remove("show");}

/* ============ PICKER ============ */
let pickerCat="All",pickerMuscle="All",pickerQ="",pickerSel=[];
function openPicker(){if(!state.active)return;pickerCat="All";pickerMuscle="All";pickerQ="";pickerSel=[];$("#sheet-title").textContent="Add exercises";renderPicker();openSheet();}
function renderPicker(){
  const q=pickerQ.toLowerCase();const list=LIB.filter(l=>(pickerCat==="All"||l[1]===pickerCat)&&(pickerMuscle==="All"||l[3]===pickerMuscle)&&l[0].toLowerCase().includes(q));
  let html=`<div class="search"><svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4-4"/></svg><input id="pq" placeholder="Search or type a custom name…" value="${esc(pickerQ)}" oninput="pickerQ=this.value;renderPicker();reFocus()"></div><div class="filt-label">Equipment</div><div class="cats">${CATS.map(c=>`<button class="cat ${c===pickerCat?'active spectrum-bg':''}" onclick="pickerCat='${c}';renderPicker()">${c}</button>`).join("")}</div><div class="filt-label">Muscle group</div><div class="cats">${["All",...MUSCLES].map(m=>`<button class="cat ${m===pickerMuscle?'active spectrum-bg':''}" onclick="pickerMuscle='${m}';renderPicker()">${m}</button>`).join("")}</div><div class="exlist">`;
  list.forEach(l=>{const col=CAT_COLOR[l[1]]||"#ff83d1",mcol=MUSCLE_COLOR[l[3]]||"#777",top=lastTopSet(l[0],state.active.editingIndex),on=pickerSel.includes(l[0]);html+=`<button class="item ${on?'sel':''}" onclick="toggleSel('${escAttr(l[0])}')"><span class="checkbox ${on?'on spectrum-bg':''}"><svg viewBox="0 0 24 24"><path d="M5 13l4 4L19 7"/></svg></span><span class="pill" style="background:${col}22;color:${col}">${l[1].slice(0,3)}</span><span class="nm">${esc(l[0])}<span class="mtag" style="color:${mcol}">${l[3]}</span></span>${top?`<span class="last">${top.w}×${top.r}</span>`:""}</button>`;});
  if(!list.length&&!pickerQ.trim())html+=`<div class="picker-empty">No exercises match those filters.</div>`;
  if(pickerQ.trim()&&!LIB.some(l=>l[0].toLowerCase()===q)){const n=pickerQ.trim(),on=pickerSel.includes(n);html+=`<button class="item ${on?'sel':''}" onclick="toggleSel('${escAttr(n)}')"><span class="checkbox ${on?'on spectrum-bg':''}"><svg viewBox="0 0 24 24"><path d="M5 13l4 4L19 7"/></svg></span><span class="pill" style="background:#ff83d122;color:#ff83d1">NEW</span><span class="nm">Add “${esc(n)}”</span></button>`;}
  html+=`</div><div style="height:80px"></div>`;$("#sheet-body").innerHTML=html;renderPickerFooter();
}
function renderPickerFooter(){let f=$("#picker-footer");if(!f){f=document.createElement("div");f.id="picker-footer";f.className="picker-footer";$("#sheet").appendChild(f);}const n=pickerSel.length;f.innerHTML=`<button class="btn btn-primary spectrum-bg" ${n?'':'disabled'} onclick="commitPicker()">${n?`Add ${n} exercise${n!==1?'s':''}`:'Select exercises to add'}</button>`;f.classList.toggle("show",n>0);}
function toggleSel(name){const i=pickerSel.indexOf(name);if(i>=0)pickerSel.splice(i,1);else{pickerSel.push(name);haptic();}renderPicker();}
function reFocus(){const el=$("#pq");if(el){el.focus();el.setSelectionRange(el.value.length,el.value.length);}}
function commitPicker(){if(!pickerSel.length)return;pickerSel.forEach(name=>{const row=findEx(name);if(row)addExFromName(name);else state.active.exercises.push({name,cat:"Custom",tip:"",muscle:pickerMuscle!=="All"?pickerMuscle:"Other",note:"",effort:"",collapsed:true,sets:[{w:0,r:8,done:false,warmup:false}]});});if(state.active.exercises.length===pickerSel.length)state.active.exercises[0].collapsed=false;const n=pickerSel.length;save();pickerSel=[];removePickerFooter();closeSheet();renderWorkout();toast(`${n} exercise${n!==1?'s':''} added`);}
function removePickerFooter(){$("#picker-footer")?.remove();}

/* ============ RECORDS + SUMMARY ============ */
function detectPRs(session,excludeIndex=null){
  const prs=[];
  session.exercises.forEach(e=>{
    const sets=e.sets.filter(s=>!s.warmup);if(!sets.length)return;
    let prev={weight:0,reps:0,setVol:0,e1rm:0};
    state.workouts.forEach((w,wi)=>{if(wi===excludeIndex)return;(w.exercises||[]).filter(x=>x.name===e.name).forEach(x=>x.sets.filter(s=>!s.warmup).forEach(s=>{prev.weight=Math.max(prev.weight,+s.w||0);prev.reps=Math.max(prev.reps,+s.r||0);prev.setVol=Math.max(prev.setVol,(+s.w||0)*(+s.r||0));prev.e1rm=Math.max(prev.e1rm,(+s.w||0)*(1+(+s.r||0)/30));}));});
    const now={weight:Math.max(...sets.map(s=>+s.w||0)),reps:Math.max(...sets.map(s=>+s.r||0)),setVol:Math.max(...sets.map(s=>(+s.w||0)*(+s.r||0))),e1rm:Math.max(...sets.map(s=>(+s.w||0)*(1+(+s.r||0)/30)))};
    if(e.cat==="Bodyweight"&&now.reps>prev.reps)prs.push({name:e.name,type:"Rep PR",val:`${now.reps} reps`});
    else{
      if(now.weight>prev.weight)prs.push({name:e.name,type:"Weight PR",val:`${now.weight} ${state.unit}`});
      else if(now.reps>prev.reps)prs.push({name:e.name,type:"Rep PR",val:`${now.reps} reps`});
      else if(now.setVol>prev.setVol)prs.push({name:e.name,type:"Set-volume PR",val:`${fmt(now.setVol)} ${state.unit}`});
      else if(now.e1rm>prev.e1rm&&now.weight>0)prs.push({name:e.name,type:"Estimated strength PR",val:`${Math.round(now.e1rm)} ${state.unit}`});
    }
  });
  session.cardio.forEach(c=>{
    let longest=0,fastest=Infinity;state.workouts.forEach((w,wi)=>{if(wi===excludeIndex)return;(w.cardio||[]).filter(x=>x.activity===c.activity).forEach(x=>{longest=Math.max(longest,cardioElapsed(x));if(x.distance>0)fastest=Math.min(fastest,cardioElapsed(x)/x.distance);});});
    if(cardioElapsed(c)>longest)prs.push({name:c.activity,type:"Longest session",val:`${fmtMinutes(cardioElapsed(c))} min`});
    else if(c.distance>0&&cardioElapsed(c)/c.distance<fastest)prs.push({name:c.activity,type:"Fastest pace",val:paceText(c)});
  });
  return prs.slice(0,8);
}
function showSummary(session,prs,edited=false){
  const type=sessionType(session),vol=volume(session),mins=fmtMinutes(cardioSeconds(session)),eq=equivalence(vol);
  $("#sheet-title").textContent=edited?"Session updated":"Session complete";
  const headline=type==="cardio"?"You cardioed":type==="mixed"?"You did both":"You moved";
  const big=type==="cardio"?`${mins}<span style="font-size:.32em;margin-left:5px">min</span>`:`${fmt(vol)}<span style="font-size:.32em;margin-left:5px">${state.unit}</span>`;
  let html=`<div class="summary"><div class="crown">${prs.length?"🏆":type==="cardio"?"🏃":"✦"}</div><h3>${headline}</h3><div class="big spectrum-text mono">${big}</div><div class="eq">${type==="mixed"?`${mins} cardio minutes · `:""}${eq?`about ${eq.emoji} ${eq.text}`:type==="cardio"?"You went somewhere. Possibly in place.":"You moved. MOVED has no further complaints."}</div>`;
  if(prs.length)html+=`<div class="prs">${prs.map(p=>`<div class="pr"><span class="star">⭐</span><span class="nm">${esc(p.type)} · ${esc(p.name)}</span><span class="val">${esc(p.val)}</span></div>`).join("")}</div>`;
  html+=`<button class="btn btn-primary spectrum-bg" style="margin-top:17px" onclick="closeSheet()">Done</button></div>`;$("#sheet-body").innerHTML=html;openSheet();
}

/* ============ DETAIL + EDIT ============ */
function openDetail(idx){
  const w=state.workouts[idx],type=sessionType(w),vol=volume(w),mins=fmtMinutes(cardioSeconds(w));$("#sheet-title").textContent=new Date(w.date).toLocaleDateString('en',{weekday:'short',month:'long',day:'numeric'});
  let html=`<div class="card detail-hero"><div class="eyebrow">${esc(sessionTitle(w))}</div><div class="metric spectrum-text mono">${type==="cardio"?mins:fmt(vol)}<span style="font-size:.3em;margin-left:5px">${type==="cardio"?'min':state.unit}</span></div><div class="sub">${type==="mixed"?`${mins} cardio min · `:""}${w.durationSec?fmtDurSeconds(w.durationSec)+" total session":"Logged session"}</div></div>`;
  (w.exercises||[]).forEach(e=>{const col=CAT_COLOR[e.cat]||"#ff83d1";html+=`<div class="detail-ex"><div class="nm"><span><span class="pill" style="background:${col}22;color:${col};margin-right:6px">${e.cat}</span>${esc(e.name)}</span><span class="v">${fmt(e.sets.reduce((t,s)=>t+setVolume(s),0))} ${state.unit}</span></div><div class="sets-mini">${e.sets.map(s=>`<span>${s.warmup?'WU · ':''}${e.cat==='Bodyweight'&&!s.w?'':s.w+'×'}${e.cat==='Bodyweight'&&!s.w?s.r+' reps':s.r}</span>`).join("")}</div>${e.note?`<div style="font-size:10px;color:var(--ink3);margin-top:6px">${esc(e.note)}</div>`:""}</div>`;});
  (w.cardio||[]).forEach(c=>{html+=`<div class="detail-ex"><div class="nm"><span>🏃 ${esc(c.activity)}</span><span class="v">${fmtMinutes(cardioElapsed(c))} min</span></div><div class="sets-mini"><span>${esc(c.effort)}</span>${c.distance?`<span>${c.distance} ${c.distanceUnit}</span><span>${paceText(c)}</span>`:""}${c.incline?`<span>Incline ${esc(c.incline)}</span>`:""}${c.resistance?`<span>Resistance ${esc(c.resistance)}</span>`:""}</div>${c.notes?`<div style="font-size:10px;color:var(--ink3);margin-top:6px">${esc(c.notes)}</div>`:""}</div>`;});
  html+=`<div class="detail-actions"><button class="btn btn-ghost" onclick="editSession(${idx})">Edit session</button><button class="btn btn-ghost" onclick="saveSessionRoutine(${idx})">Save routine</button></div><button class="btn btn-danger" style="margin-top:8px" onclick="deleteSession(${idx})">Delete session</button>`;$("#sheet-body").innerHTML=html;openSheet();
}
function editSession(idx){const w=structuredCloneSafe(state.workouts[idx]);w.editingIndex=idx;w.originalDurationSec=w.durationSec;w.startedAt=Date.now();w.cardio=(w.cardio||[]).map(c=>({...c,running:false,startedAt:null}));if(w.exercises.length)w.exercises.forEach((e,i)=>e.collapsed=i!==0);state.active=migrateSession(w);save();closeSheet();go("workout");}
function deleteSession(idx){if(!confirm("Delete this session permanently?"))return;state.workouts.splice(idx,1);save();closeSheet();renderHome();}
function saveSessionRoutine(idx){const w=state.workouts[idx],name=prompt("Name this routine",sessionTitle(w));if(!name)return;state.customRoutines.push({id:String(Date.now()),name:name.trim(),exercises:w.exercises.map(e=>e.name),cardio:w.cardio[0]?{activity:w.cardio[0].activity,targetMinutes:Math.max(5,fmtMinutes(cardioElapsed(w.cardio[0]))),effort:w.cardio[0].effort}:null});save();closeSheet();toast("Routine saved");}

/* ============ ANALYTICS ============ */
function renderStats(){
  if(!state.workouts.length){$("#view").innerHTML=`<div class="screen-h"><h2>Insights</h2></div><div class="empty"><div class="glyph spectrum-text">◢◣</div><h3>No movement data yet</h3><p>Log a session and MOVED will quietly do the math without becoming your life coach.</p><button class="btn btn-primary spectrum-bg" onclick="go('workout')">Start moving</button></div>`;return;}
  const sessions=state.workouts,lt=lifetime(),card=lifetimeCardio(),strength=sessions.filter(w=>volume(w)>0),cardSessions=sessions.filter(w=>cardioSeconds(w)>0);
  let totalSets=0;const musVol={},catVol={},activitySec={},best={};
  sessions.forEach((w,wi)=>{
    (w.exercises||[]).forEach(e=>{e.sets.filter(s=>!s.warmup).forEach(s=>{totalSets++;const v=setVolume(s);musVol[e.muscle]=(musVol[e.muscle]||0)+v;catVol[e.cat]=(catVol[e.cat]||0)+v;const b=best[e.name]||(best[e.name]={cat:e.cat,weight:0,reps:0,e1rm:0});b.weight=Math.max(b.weight,+s.w||0);b.reps=Math.max(b.reps,+s.r||0);b.e1rm=Math.max(b.e1rm,(+s.w||0)*(1+(+s.r||0)/30));});});
    (w.cardio||[]).forEach(c=>activitySec[c.activity]=(activitySec[c.activity]||0)+cardioElapsed(c));
  });
  const vols=strength.slice(-12).map(volume),vmax=Math.max(...vols,1);const bars=vols.map(v=>`<div class="vbar"><div class="vfill" style="height:${Math.max(4,v/vmax*100)}%"></div></div>`).join("");
  const musRows=barRows(musVol,MUSCLE_COLOR,state.unit);const catRows=barRows(catVol,CAT_COLOR,state.unit);const actRows=barRows(activitySec,Object.fromEntries(CARDIO_ACTIVITIES.map((a,i)=>[a[0],["#2dd4ff","#6d8dff","#a855f7","#ff3ca6"][i%4]])),"sec",true);
  const records=Object.entries(best).map(([name,b])=>({name,...b})).sort((a,b)=>b.e1rm-a.e1rm||b.reps-a.reps).slice(0,10);
  const balance=balanceInsight();
  $("#view").innerHTML=`<div class="screen-h"><h2>Insights</h2></div><div class="card hero" style="padding:20px"><div class="eyebrow">Lifetime strength</div><div class="big mono" style="font-size:48px">${fmt(lt)}<span class="unit">${state.unit}</span></div><div class="equiv">🏃 <b>${fmtMinutes(card)}</b> cardio minutes alongside it</div></div>
  <div class="stat-grid" style="margin-top:10px"><div class="stat-card"><div class="k">Sessions</div><div class="v mono">${sessions.length}</div></div><div class="stat-card"><div class="k">Completed sets</div><div class="v mono">${totalSets}</div></div><div class="stat-card"><div class="k">Strength days</div><div class="v mono">${strength.length}</div></div><div class="stat-card"><div class="k">Cardio days</div><div class="v mono">${cardSessions.length}</div></div></div>
  <div class="section-h"><h2>Movement balance</h2></div><div class="insight-card"><h3>${balance.title}</h3><p>${balance.copy}</p></div>
  ${bars?`<div class="section-h"><h2>Strength volume</h2><span class="link">last ${vols.length}</span></div><div class="card"><div class="vchart">${bars}</div></div>`:""}
  ${musRows?`<div class="section-h"><h2>By muscle group</h2></div><div class="card">${musRows}</div>`:""}
  ${actRows?`<div class="section-h"><h2>Cardio mix</h2></div><div class="card">${actRows}</div>`:""}
  ${catRows?`<div class="section-h"><h2>By equipment</h2></div><div class="card">${catRows}</div>`:""}
  <div class="section-h"><h2>Strength records</h2></div><div class="card" style="padding:3px 15px">${records.map(r=>`<div class="lift"><span class="ln"><span class="pill" style="background:${(CAT_COLOR[r.cat]||'#777')}22;color:${CAT_COLOR[r.cat]||'#aaa'}">${r.cat.slice(0,3)}</span><span class="nm">${esc(r.name)}</span></span><span class="lv">${r.cat==='Bodyweight'?r.reps+' reps':r.weight+' '+state.unit+' · e1RM '+Math.round(r.e1rm)}</span></div>`).join("")}</div><div style="height:15px"></div>`;
}
function barRows(obj,colors,unit,seconds=false){const entries=Object.entries(obj).filter(([,v])=>v>0).sort((a,b)=>b[1]-a[1]);if(!entries.length)return"";const total=entries.reduce((t,[,v])=>t+v,0)||1;return entries.map(([k,v])=>{const pct=v/total*100,col=colors[k]||"#777";return`<div class="catbar"><div class="top"><span>${esc(k)}</span><span class="amt">${seconds?fmtMinutes(v)+' min':fmt(v)+' '+unit} · ${Math.round(pct)}%</span></div><div class="track"><div class="fill" style="width:${pct}%;background:${col}"></div></div></div>`;}).join("");}
function balanceInsight(){
  const recent=state.workouts.filter(w=>Date.now()-new Date(w.date).getTime()<21*864e5),mus={};recent.forEach(w=>w.exercises.forEach(e=>mus[e.muscle]=(mus[e.muscle]||0)+e.sets.filter(s=>!s.warmup).length));const mins=fmtMinutes(recent.reduce((t,w)=>t+cardioSeconds(w),0));
  if(!recent.length)return{title:"No recent data. Also no emergency.",copy:"Your history is intact. Start wherever the friction is lowest."};
  const sorted=MUSCLES.map(m=>[m,mus[m]||0]).sort((a,b)=>a[1]-b[1]);const low=sorted[0],high=sorted[sorted.length-1];
  if(high[1]>=low[1]*3&&high[1]>3)return{title:`${high[0]} is carrying the group project.`,copy:`${low[0]} has the least recent work. Consider inviting it next time, or ignore this because your plan has context the app does not.`};
  if(mins<20&&recent.filter(w=>volume(w)>0).length>=3)return{title:"Strength-forward, cardio-light.",copy:"That is not morally wrong. Ten easy minutes could improve the balance without turning the workout into an expedition."};
  return{title:"Pretty balanced, suspiciously enough.",copy:`Across the last 21 days, your muscle groups and ${mins} cardio minutes are sharing the workload without one category completely taking over.`};
}

/* ============ SETTINGS + DATA ============ */
function openSettings(){
  $("#sheet-title").textContent="Settings";$("#sheet-body").innerHTML=`
  <div class="srow"><div class="lab">Your name<small>Shown on the home screen</small></div><input class="txtin" value="${esc(state.name)}" placeholder="optional" onchange="state.name=this.value;save()"></div>
  <div class="srow"><div class="lab">Weight units</div><div class="toggle"><button class="${state.unit==='lb'?'on spectrum-bg':''}" onclick="setUnit('lb')">lb</button><button class="${state.unit==='kg'?'on spectrum-bg':''}" onclick="setUnit('kg')">kg</button></div></div>
  <div class="srow"><div class="lab">Distance units</div><div class="toggle"><button class="${state.distanceUnit==='mi'?'on spectrum-bg':''}" onclick="setDistance('mi')">mi</button><button class="${state.distanceUnit==='km'?'on spectrum-bg':''}" onclick="setDistance('km')">km</button></div></div>
  <div class="srow"><div class="lab">Animated spectrum<small>Turn off to save battery</small></div><div class="toggle"><button class="${state.anim!==false?'on spectrum-bg':''}" onclick="setAnim(true)">On</button><button class="${state.anim===false?'on spectrum-bg':''}" onclick="setAnim(false)">Off</button></div></div>
  <div class="srow"><div class="lab">Rest timer<small>Strategic doing nothing</small></div><div class="toggle"><button class="${state.restTimer!==false?'on spectrum-bg':''}" onclick="setBool('restTimer',true)">On</button><button class="${state.restTimer===false?'on spectrum-bg':''}" onclick="setBool('restTimer',false)">Off</button></div></div>
  <div class="srow"><div class="lab">Rest length</div><div class="toggle">${[60,90,120].map(n=>`<button class="${state.restDur===n?'on spectrum-bg':''}" onclick="setRest(${n})">${n}s</button>`).join("")}</div></div>
  <div class="srow"><div class="lab">Auto-collapse<small>Fold an exercise when every set is done</small></div><div class="toggle"><button class="${state.autoCollapse!==false?'on spectrum-bg':''}" onclick="setBool('autoCollapse',true)">On</button><button class="${state.autoCollapse===false?'on spectrum-bg':''}" onclick="setBool('autoCollapse',false)">Off</button></div></div>
  <div class="srow" id="install-row"><div class="lab">Install app<small>Add MOVED to your home screen</small></div><button class="btn btn-ghost btn-small" onclick="doInstall()">Install</button></div>
  <div class="srow"><div class="lab">Demo data<small>Replaces current sessions</small></div><button class="btn btn-ghost btn-small" onclick="setDemo()">Load</button></div>
  <div class="srow"><div class="lab">Export data<small>Download history and routines</small></div><button class="btn btn-ghost btn-small" onclick="exportData()">Export</button></div>
  <div class="srow"><div class="lab">Import data</div><button class="btn btn-ghost btn-small" onclick="document.getElementById('imp').click()">Import</button><input type="file" id="imp" accept="application/json" class="hide" onchange="importData(this)"></div>
  <div class="srow" style="border:0"><div class="lab" style="color:#ff82c8">Clear everything<small>Deletes sessions and routines</small></div><button class="btn btn-danger btn-small" onclick="wipe()">Clear</button></div>
  <p style="text-align:center;color:var(--ink3);font-size:10px;margin-top:22px;line-height:1.7">MOVED 2.0 · no accounts · no nags<br>Your data stays on your device.</p>`;refreshInstallRow();openSheet();
}
function setUnit(v){state.unit=v;save();openSettings();render();}
function setDistance(v){state.distanceUnit=v;save();openSettings();}
function setAnim(v){state.anim=v;save();applyAnim();openSettings();}
function setBool(k,v){state[k]=v;if(k==="restTimer"&&!v)cancelRest();save();openSettings();}
function setRest(n){state.restDur=n;save();openSettings();}
function setDemo(){if(!confirm("Replace current sessions with a sample week?"))return;loadSampleData();state.demo=true;state.active=null;save();closeSheet();go("home");toast("Sample week loaded");}
function exportData(){const blob=new Blob([JSON.stringify(state,null,2)],{type:"application/json"}),a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="moved-2-data.json";a.click();URL.revokeObjectURL(a.href);toast("Exported");}
function importData(input){const f=input.files[0];if(!f)return;const r=new FileReader();r.onload=()=>{try{const d=JSON.parse(r.result);state={...structuredCloneSafe(DEFAULTS),...d,workouts:(d.workouts||[]).map(migrateSession),active:null};save();closeSheet();render();toast("Imported");}catch(_){toast("Could not read that file");}};r.readAsText(f);}
function wipe(){if(!confirm("Delete every session and saved routine? This cannot be undone."))return;state={...structuredCloneSafe(DEFAULTS),name:state.name,unit:state.unit,distanceUnit:state.distanceUnit};save();closeSheet();go("home");}
function loadSample(){loadSampleData();state.demo=true;save();go("home");toast("Sample week loaded");}
function loadSampleData(){
  const mk=(days,type,exercises=[],cardio=[])=>({id:Date.now()-days*1e6,date:new Date(Date.now()-days*864e5).toISOString(),endedAt:null,durationSec:2700,type,title:"",notes:"",exercises,cardio});
  const e=(name,sets,effort="Right")=>{const row=findEx(name)||[];return{name,cat:row[1]||"Custom",tip:row[2]||"",muscle:row[3]||"Other",note:"",effort,collapsed:true,sets:sets.map(([w,r,warmup=false])=>({w,r,warmup,done:true}))};};
  const c=(activity,min,distance=0,effort="Steady")=>({id:Date.now()+Math.random(),activity,targetMinutes:min,durationSec:min*60,distance,distanceUnit:state.distanceUnit,effort,incline:"",resistance:"",notes:"",running:false,startedAt:null});
  state.workouts=[
    mk(13,"strength",[e("Dumbbell Bench Press",[[30,10],[35,8],[35,8]]),e("Dumbbell Row",[[35,10],[35,10]]),e("Dumbbell Curl",[[20,12],[20,10]])]),
    mk(9,"cardio",[],[c("Walk",28,1.4,"Easy")]),
    mk(6,"mixed",[e("Goblet Squat",[[35,10],[40,10],[40,8]]),e("Romanian Deadlift",[[65,8],[65,8]]),e("Plank",[[0,35],[0,30]])],[c("Bike",12,3.2,"Steady")]),
    mk(2,"strength",[e("Dumbbell Bench Press",[[35,10],[40,8],[40,8]],"More"),e("Dumbbell Row",[[40,10],[40,9]]),e("Hip Thrust",[[95,10],[115,8],[115,8]])])
  ];
}

/* ============ SHEETS + DEVICE ============ */
function openSheet(){$("#scrim").classList.add("open");$("#sheet").classList.add("open");}
function closeSheet(){$("#scrim").classList.remove("open");$("#sheet").classList.remove("open");removePickerFooter();}
let wakeLock=null;
async function requestWake(){try{if("wakeLock" in navigator)wakeLock=await navigator.wakeLock.request("screen");}catch(_){}}
function releaseWake(){try{wakeLock?.release();wakeLock=null;}catch(_){}}
document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="visible"&&state.active&&!wakeLock)requestWake();});
let deferredPrompt=null;
window.addEventListener("beforeinstallprompt",e=>{e.preventDefault();deferredPrompt=e;refreshInstallRow();});
window.addEventListener("appinstalled",()=>{deferredPrompt=null;toast("MOVED installed");});
function refreshInstallRow(){const row=$("#install-row");if(!row)return;const installed=matchMedia("(display-mode: standalone)").matches||navigator.standalone;if(installed)row.classList.add("hide");else{row.classList.remove("hide");const small=row.querySelector("small");if(small&&/iphone|ipad|ipod/i.test(navigator.userAgent))small.textContent="Tap Share, then Add to Home Screen";}}
async function doInstall(){if(!deferredPrompt){toast("On iPhone: Share → Add to Home Screen");return;}deferredPrompt.prompt();try{await deferredPrompt.userChoice;}catch(_){}deferredPrompt=null;refreshInstallRow();}
if("serviceWorker" in navigator)window.addEventListener("load",()=>navigator.serviceWorker.register("sw.js").catch(()=>{}));

/* boot */
window.addEventListener("load",()=>setTimeout(()=>$("#splash")?.classList.add("out"),650));
setTimeout(()=>$("#splash")?.classList.add("out"),1200);
render();
