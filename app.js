/* ============ DATA ============
   Exercise library, categories, tiers live in /data/*.js,
   loaded before this file in index.html. Available as globals:
   LIB, CATS, CAT_COLOR, MUSCLES, MUSCLE_COLOR, TEMPLATES.
   ================================ */

/* Tiers + weight equivalences stay here (tied to app logic, not content) */
const TIERS = [
  {n:"Spark",at:0},{n:"Glow",at:25000},{n:"Flux",at:100000},{n:"Surge",at:250000},
  {n:"Pulse",at:500000},{n:"Current",at:1000000},{n:"Plasma",at:2500000},
  {n:"Aurora",at:5000000},{n:"Infinity",at:10000000}
];
// equivalence reference, weights in lb
const EQUIV = [
  ["a house cat",10,"🐈"],["a car tire",25,"🛞"],["a microwave",40,"📦"],["a sack of cement",94,"🧱"],
  ["a baby grand piano",500,"🎹"],["a vending machine",600,"🥤"],["a grand piano",990,"🎹"],
  ["a horse",1000,"🐎"],["a grizzly bear",1300,"🐻"],["a dairy cow",1400,"🐄"],
  ["a small car",2400,"🚗"],["a sedan",3500,"🚙"],["a pickup truck",5000,"🛻"],
  ["a killer whale",8000,"🐳"],["an elephant",12000,"🐘"],["a T. rex",16000,"🦖"],
  ["a school bus",24000,"🚌"],["a semi truck",35000,"🚛"],["a house",150000,"🏠"],
  ["the Statue of Liberty",450000,"🗽"],["a blue whale",300000,"🐋"],["a Boeing 747",400000,"✈️"],
  ["the Eiffel Tower",16000000,"🗼"]
];

/* ============ STATE ============ */
let state = {
  name:"", unit:"lb", anim:true,
  restTimer:true, restDur:90, autoCollapse:true, demo:false,
  workouts:[],      // {id,date,exercises:[{name,cat,tip,sets:[{w,r,done}],collapsed}]}
  active:null       // same shape as a workout, plus startedAt
};
const KEY="moved_v1";
function load(){ try{const r=localStorage.getItem(KEY); if(r) state={...state,...JSON.parse(r)};}catch(e){} }
function save(){ try{localStorage.setItem(KEY,JSON.stringify(state));}catch(e){} }
function applyAnim(){ document.body.classList.toggle("no-anim", state.anim===false); }
load();
applyAnim();

/* ============ HELPERS ============ */
const $=s=>document.querySelector(s);
const inc=()=>state.unit==="kg"?2.5:5;
const fmt=n=>Math.round(n).toLocaleString();
function volume(w){return w.exercises.reduce((t,e)=>t+e.sets.reduce((s,x)=>s+((+x.w||0)*(+x.r||0)),0),0);}
function lifetime(){return state.workouts.reduce((t,w)=>t+volume(w),0);}
function tierFor(v){let cur=TIERS[0],nx=null;for(let i=0;i<TIERS.length;i++){if(v>=TIERS[i].at){cur=TIERS[i];nx=TIERS[i+1]||null;}}return{cur,nx};}
function equivalence(v){
  if(v<=0)return null;
  let best=EQUIV[0];
  for(const e of EQUIV){ if(v/e[1]>=1) best=e; }
  const count=v/best[1];
  const c=count>=10?Math.round(count):count>=2?Math.round(count*10)/10:Math.round(count*10)/10;
  return {emoji:best[2], text:`${c} ${best[0].replace(/^a |^an |^the /,"")}${c>=2?"s":""}`, raw:best[0]};
}
function toast(m){const t=$("#toast");t.textContent=m;t.classList.add("show");clearTimeout(t._t);t._t=setTimeout(()=>t.classList.remove("show"),1800);}
function fmtDur(ms){const m=Math.floor(ms/60000);const h=Math.floor(m/60);return h>0?`${h}h ${m%60}m`:`${m}m`;}
function lastTopSet(name){
  for(let i=state.workouts.length-1;i>=0;i--){
    const e=state.workouts[i].exercises.find(x=>x.name===name);
    if(e&&e.sets.length){ return e.sets.slice().sort((a,b)=>(b.w*1000+b.r)-(a.w*1000+a.r))[0]; }
  }
  return null;
}

/* ============ ROUTER ============ */
let route="home";
function go(r){
  route=r;
  if(r!=="workout")cancelRest();
  document.querySelectorAll(".nav-btn").forEach(b=>b.classList.remove("active"));
  const nb=$("#nav-"+r); if(nb)nb.classList.add("active");
  const sb=$("#btn-stats"); if(sb)sb.classList.toggle("on",r==="stats");
  window.scrollTo(0,0);
  render();
}
function render(){ route==="stats"?renderStats():route==="workout"?renderWorkout():renderHome(); }

/* ============ HOME ============ */
function renderHome(){
  const lt=lifetime();
  const {cur,nx}=tierFor(lt);
  const eq=equivalence(lt);
  const now=Date.now();
  const weekVol=state.workouts.filter(w=>now-new Date(w.date).getTime()<7*864e5).reduce((t,w)=>t+volume(w),0);
  const recent=state.workouts.slice().reverse();

  let html="";

  if(state.workouts.length===0 && !state.active){
    html=`
    <p class="greet">${greeting()}${state.name?`, <b>${esc(state.name)}</b>`:""}</p>
    <div class="empty">
      <div class="glyph spectrum-text">∞</div>
      <h3>Nothing logged yet</h3>
      <p>No streaks to protect. No badges to chase. Just open a session, lift, and watch the weight add up.</p>
      <button class="btn btn-primary spectrum-bg" onclick="go('workout')">
        <svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg> Start your first workout
      </button>
      <button class="btn-link" onclick="loadSample()">or load a sample week to look around</button>
    </div>`;
    $("#view").innerHTML=html;
    return;
  }

  // progress ring math
  const prevAt=cur.at, nextAt=nx?nx.at:cur.at;
  const prog=nx?Math.min(1,(lt-prevAt)/(nextAt-prevAt)):1;
  const R=34,C=2*Math.PI*R;

  html+=`<p class="greet">${greeting()}${state.name?`, <b>${esc(state.name)}</b>`:""}</p>`;

  // active workout banner
  if(state.active){
    html+=`<div class="sug" style="border-color:rgba(45,212,255,.3);margin:14px 0" onclick="go('workout')">
      <div class="dot" style="background:var(--ok)"></div>
      <div><div class="t" style="color:var(--ok)">Session in progress</div>
      <p>${state.active.exercises.length} exercise${state.active.exercises.length!==1?"s":""} logged · ${fmt(volume(state.active))} ${state.unit} moved so far. Tap to continue.</p></div>
    </div>`;
  }

  // hero
  html+=`<div class="card hero" style="margin-top:14px">
    <div class="eyebrow">Total weight moved</div>
    <div class="big mono">${fmt(lt)}<span class="unit">${state.unit}</span></div>
    ${eq?`<div class="equiv">${eq.emoji} <span>that's <b>${eq.text}</b></span></div>`:""}
    <div class="tier">
      <div class="ring">
        <svg width="78" height="78" viewBox="0 0 78 78">
          <circle cx="39" cy="39" r="${R}" stroke="rgba(255,255,255,.08)" stroke-width="7" fill="none"/>
          <circle cx="39" cy="39" r="${R}" stroke="url(#sg)" stroke-width="7" fill="none" stroke-linecap="round"
            stroke-dasharray="${C}" stroke-dashoffset="${C*(1-prog)}" style="transition:stroke-dashoffset .8s ease"/>
          <defs><linearGradient id="sg" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stop-color="#ff2d9e"/><stop offset=".5" stop-color="#a855f7"/><stop offset="1" stop-color="#5b8cff"/>
          </linearGradient></defs>
        </svg>
        <div class="label">${Math.round(prog*100)}%</div>
      </div>
      <div class="tier-meta" style="text-align:left">
        <div class="name spectrum-text">${cur.n}</div>
        <div class="sub">Tier ${TIERS.indexOf(cur)+1} of ${TIERS.length}</div>
        ${nx?`<div class="next"><b>${fmt(nextAt-lt)} ${state.unit}</b> to ${nx.n}</div>`:`<div class="next">Max tier reached. Unreal.</div>`}
      </div>
    </div>
  </div>`;

  // quick stats
  html+=`<div class="grid2" style="margin-top:12px">
    <div class="card stat"><div class="k">This week</div><div class="v mono">${fmt(weekVol)}<small> ${state.unit}</small></div></div>
    <div class="card stat"><div class="k">Sessions</div><div class="v mono">${state.workouts.length}</div></div>
  </div>`;

  // suggestion
  const sug=smartSuggestion();
  if(sug){html+=`<div class="section-h"><h2>Smart nudge</h2></div>
    <div class="sug"><div class="dot spectrum-bg"></div><div><div class="t">${sug.tag}</div><p>${sug.text}</p></div></div>`;}

  // trend sparkline
  if(state.workouts.length>=2){
    const last=state.workouts.slice(-8).map(volume);
    html+=`<div class="section-h"><h2>Volume trend</h2><span class="link">last ${last.length}</span></div>
      <div class="card" style="padding:14px 16px">${sparkline(last)}</div>`;
  }

  // recent
  html+=`<div class="section-h"><h2>Recent sessions</h2></div>`;
  recent.slice(0,12).forEach((w,i)=>{
    const d=new Date(w.date);
    const names=w.exercises.map(e=>e.name).join(", ");
    const idx=state.workouts.indexOf(w);
    html+=`<div class="sess" onclick="openDetail(${idx})">
      <div class="date"><div class="d mono">${d.getDate()}</div><div class="m">${d.toLocaleString('en',{month:'short'})}</div></div>
      <div class="info"><div class="ti">${w.exercises.length} exercise${w.exercises.length!==1?"s":""}</div><div class="me">${esc(names)||"—"}</div></div>
      <div class="vol"><div class="n">${fmt(volume(w))}</div><div class="u">${state.unit}</div></div>
    </div>`;
  });

  $("#view").innerHTML=html;
}

function greeting(){const h=new Date().getHours();return h<12?"Good morning":h<18?"Good afternoon":"Good evening";}

function smartSuggestion(){
  if(state.workouts.length===0)return{tag:"Welcome",text:"Log a session and I'll start spotting where you can push for progressive overload."};
  // find an exercise done 2+ times where top set repeated -> suggest bump
  const counts={};
  state.workouts.forEach(w=>w.exercises.forEach(e=>{counts[e.name]=(counts[e.name]||0)+1;}));
  const repeated=Object.keys(counts).filter(k=>counts[k]>=2);
  if(repeated.length){
    const name=repeated[Math.floor(Date.now()/86400000)%repeated.length];
    const top=lastTopSet(name);
    if(top){
      const ex=findEx(name);
      const bump=ex&&ex.cat==="Bodyweight"?`${top.r+2} reps`:`${(+top.w)+inc()} ${state.unit}`;
      return{tag:"Progressive overload",text:`Last <b>${esc(name)}</b> you hit <b>${top.w}${ex&&ex.cat==='Bodyweight'?'':' '+state.unit} × ${top.r}</b>. Next time aim for <b>${bump}</b> — small, repeatable jumps are how it compounds.`};
    }
  }
  return{tag:"Keep it simple",text:"Consistency beats intensity. Same lifts, slightly more each time you see them. That's the whole game."};
}
function findEx(name){return LIB.find(l=>l[0]===name);}

function sparkline(vals){
  const w=320,h=42,max=Math.max(...vals,1),min=Math.min(...vals,0);
  const rng=max-min||1, n=vals.length;
  const pts=vals.map((v,i)=>[i/(n-1)*w,h-((v-min)/rng)*(h-6)-3]);
  const d=pts.map((p,i)=>(i?"L":"M")+p[0].toFixed(1)+" "+p[1].toFixed(1)).join(" ");
  const area=`M0 ${h} `+pts.map(p=>"L"+p[0].toFixed(1)+" "+p[1].toFixed(1)).join(" ")+` L${w} ${h} Z`;
  return `<svg class="spark" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none">
    <defs><linearGradient id="spk" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#ff5cc4"/><stop offset=".5" stop-color="#a855f7"/><stop offset="1" stop-color="#5b8cff"/></linearGradient>
      <linearGradient id="spkf" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="rgba(123,140,255,.2)"/><stop offset="1" stop-color="rgba(123,140,255,0)"/></linearGradient></defs>
    <path d="${area}" fill="url(#spkf)"/>
    <path d="${d}" fill="none" stroke="url(#spk)" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>
    ${pts.map(p=>`<circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="2.4" fill="#fff"/>`).join("")}
  </svg>`;
}

/* ============ ANALYTICS ============ */
function renderStats(){
  if(state.workouts.length===0){
    $("#view").innerHTML=`
    <div class="screen-h"><button class="back" onclick="go('home')"><svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7"/></svg></button><h2>Analytics</h2></div>
    <div class="empty" style="padding-top:46px"><div class="glyph spectrum-text">◢◣</div><h3>No data yet</h3>
      <p>Log a session or two and your trends, volume split, and personal bests all show up here.</p>
      <button class="btn btn-primary spectrum-bg" onclick="go('workout')"><svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg> Start a workout</button>
    </div>`;
    return;
  }
  const lt=lifetime(), {cur,nx}=tierFor(lt), sessions=state.workouts.length;
  let totalSets=0;
  const catVol={}, musVol={}, best={}, freq={};
  state.workouts.forEach(w=>w.exercises.forEach(e=>{
    freq[e.name]=(freq[e.name]||0)+1;
    const mus=e.muscle||(findEx(e.name)||[])[3]||"Other";
    e.sets.forEach(s=>{
      totalSets++;
      const v=(+s.w||0)*(+s.r||0);
      catVol[e.cat]=(catVol[e.cat]||0)+v;
      musVol[mus]=(musVol[mus]||0)+v;
      const b=best[e.name];
      if(!b || +s.w>b.w || (+s.w===b.w && +s.r>b.r)) best[e.name]={cat:e.cat,w:+s.w,r:+s.r};
    });
  }));
  const vols=state.workouts.map(volume);
  const avg=lt/sessions, biggest=Math.max(...vols);
  const recent=vols.slice(-12), vmax=Math.max(...recent,1);
  const bars=recent.map(v=>`<div class="vbar"><div class="vfill" style="height:${Math.max(4,v/vmax*100)}%"></div></div>`).join("");

  const catTotal=Object.values(catVol).reduce((a,b)=>a+b,0)||1;
  const catRows=Object.entries(catVol).filter(([k,v])=>v>0).sort((a,b)=>b[1]-a[1]).map(([k,v])=>{
    const pct=v/catTotal*100, col=CAT_COLOR[k]||"#ff7ad9";
    return `<div class="catbar"><div class="top"><span>${k}</span><span class="amt mono">${fmt(v)} ${state.unit} · ${Math.round(pct)}%</span></div>
      <div class="track"><div class="fill" style="width:${pct}%;background:${col}"></div></div></div>`;
  }).join("");

  const musTotal=Object.values(musVol).reduce((a,b)=>a+b,0)||1;
  const musRows=Object.entries(musVol).filter(([k,v])=>v>0).sort((a,b)=>b[1]-a[1]).map(([k,v])=>{
    const pct=v/musTotal*100, col=MUSCLE_COLOR[k]||"#6f6b82";
    return `<div class="catbar"><div class="top"><span>${k}</span><span class="amt mono">${fmt(v)} ${state.unit} · ${Math.round(pct)}%</span></div>
      <div class="track"><div class="fill" style="width:${pct}%;background:${col}"></div></div></div>`;
  }).join("");

  const lifts=Object.entries(best).map(([n,b])=>({n,...b})).sort((a,b)=>{
    if(a.cat==="Bodyweight"&&b.cat!=="Bodyweight")return 1;
    if(b.cat==="Bodyweight"&&a.cat!=="Bodyweight")return -1;
    if(a.cat==="Bodyweight"&&b.cat==="Bodyweight")return b.r-a.r;
    return b.w-a.w||b.r-a.r;
  }).slice(0,8);
  const liftRows=lifts.map(l=>{
    const col=CAT_COLOR[l.cat]||"#ff7ad9";
    const val=(l.cat==="Bodyweight"&&!l.w)?`${l.r} reps`:`${l.w} ${state.unit} × ${l.r}`;
    return `<div class="lift"><span class="ln"><span class="pill" style="background:${col}22;color:${col}">${l.cat.slice(0,3)}</span><span class="nm">${esc(l.n)}</span></span><span class="lv mono">${val}</span></div>`;
  }).join("");

  const top=Object.entries(freq).sort((a,b)=>b[1]-a[1]).slice(0,5);
  const chips=top.map(([n,c])=>`<span class="chip">${esc(n)} <b>×${c}</b></span>`).join("");

  $("#view").innerHTML=`
  <div class="screen-h"><button class="back" onclick="go('home')"><svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7"/></svg></button><h2>Analytics</h2></div>

  <div class="card hero" style="padding:20px">
    <div class="eyebrow">Lifetime moved</div>
    <div class="big mono" style="font-size:46px">${fmt(lt)}<span class="unit">${state.unit}</span></div>
    <div class="equiv" style="margin-top:11px"><span class="spectrum-text" style="font-weight:800">${cur.n}</span>${nx?`<span style="color:var(--ink3)">·</span> ${fmt(nx.at-lt)} ${state.unit} to ${nx.n}`:`<span style="color:var(--ink3)">·</span> max tier`}</div>
  </div>

  <div class="grid2" style="margin-top:12px">
    <div class="card stat"><div class="k">Sessions</div><div class="v mono">${sessions}</div></div>
    <div class="card stat"><div class="k">Total sets</div><div class="v mono">${totalSets}</div></div>
  </div>
  <div class="grid2" style="margin-top:12px">
    <div class="card stat"><div class="k">Avg / session</div><div class="v mono">${fmt(avg)}<small> ${state.unit}</small></div></div>
    <div class="card stat"><div class="k">Biggest day</div><div class="v mono">${fmt(biggest)}<small> ${state.unit}</small></div></div>
  </div>

  <div class="section-h"><h2>Volume trend</h2><span class="link">last ${recent.length}</span></div>
  <div class="card"><div class="vchart">${bars}</div></div>

  <div class="section-h"><h2>By muscle group</h2></div>
  <div class="card">${musRows}</div>

  <div class="section-h"><h2>By equipment</h2></div>
  <div class="card">${catRows}</div>

  <div class="section-h"><h2>Personal bests</h2></div>
  <div class="card" style="padding:4px 16px">${liftRows}</div>

  ${chips?`<div class="section-h"><h2>Most trained</h2></div><div class="chips">${chips}</div>`:""}
  <div style="height:12px"></div>`;
}

/* ============ WORKOUT ============ */
function renderWorkout(){
  if(!state.active){
    $("#view").innerHTML=`
    <div class="empty" style="padding-top:60px">
      <div class="glyph spectrum-text">⊕</div>
      <h3>Ready when you are</h3>
      <p>Start a session, drop in your exercises, and log sets as you go. Hit finish when you're done — that's it.</p>
      <button class="btn btn-primary spectrum-bg" onclick="startWorkout()">
        <svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg> Start workout
      </button>
    </div>`;
    return;
  }
  const a=state.active;
  let html=`<div class="wk-head">
    <div><div class="eyebrow">Active session</div><div class="wk-timer"><span class="live"></span> started ${new Date(a.startedAt).toLocaleTimeString('en',{hour:'numeric',minute:'2-digit'})}</div></div>
  </div>
  <div class="wk-total"><div class="n mono spectrum-text">${fmt(volume(a))}</div><div class="l">${state.unit} moved this session</div></div>`;

  a.exercises.forEach((e,ei)=>{
    const col=CAT_COLOR[e.cat]||"#ff7ad9";
    const exVol=e.sets.reduce((t,s)=>t+(+s.w||0)*(+s.r||0),0);

    if(e.collapsed){
      html+=`<div class="ex collapsed">
        <div class="ex-h" onclick="toggleCollapse(${ei})">
          <button class="ex-check done spectrum-bg" onclick="event.stopPropagation();toggleCollapse(${ei})"><svg viewBox="0 0 24 24"><path d="M5 13l4 4L19 7"/></svg></button>
          <span class="pill" style="background:${col}22;color:${col}">${e.cat}</span>
          <span class="nm">${esc(e.name)}</span>
          <span class="ex-sum mono">${e.sets.length} set${e.sets.length!==1?'s':''} · ${fmt(exVol)} ${state.unit}</span>
          <button class="x" onclick="event.stopPropagation();removeEx(${ei})">×</button>
        </div>
      </div>`;
      return;
    }

    const top=lastTopSet(e.name);
    html+=`<div class="ex">
      <div class="ex-h">
        <button class="ex-check" onclick="toggleCollapse(${ei})" title="Mark done"><svg viewBox="0 0 24 24"><path d="M5 13l4 4L19 7"/></svg></button>
        <span class="pill" style="background:${col}22;color:${col}">${e.cat}</span>
        <span class="nm">${esc(e.name)}</span>
        <button class="x" onclick="removeEx(${ei})">×</button>
      </div>`;
    if(e.tip)html+=`<div class="form-tip"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 8h.01M11 12h1v4h1"/></svg><span>${esc(e.tip)}</span></div>`;
    if(top){const isbw=e.cat==="Bodyweight";const bump=isbw?`${top.r+2} reps`:`${(+top.w)+inc()} ${state.unit}`;
      html+=`<div class="po">Last time: <b>${top.w}${isbw?'':' '+state.unit} × ${top.r}</b> · try <b>${bump}</b></div>`;}
    html+=`<div class="sets">
      <div class="colhead"><div class="si">#</div><div class="c">${e.cat==='Bodyweight'?'Added '+state.unit:'Weight ('+state.unit+')'}</div><div class="c">${e.cat==='Bodyweight'?'Reps / sec':'Reps'}</div><div class="e"></div><div class="e2"></div></div>`;
    e.sets.forEach((s,si)=>{
      html+=`<div class="set-row">
        <div class="si">${si+1}</div>
        <div class="numwrap">
          <button onclick="stepSet(${ei},${si},'w',-1)">−</button>
          <input type="number" inputmode="decimal" value="${s.w}" onchange="setVal(${ei},${si},'w',this.value)">
          <button onclick="stepSet(${ei},${si},'w',1)">+</button>
        </div>
        <div class="numwrap">
          <button onclick="stepSet(${ei},${si},'r',-1)">−</button>
          <input type="number" inputmode="numeric" value="${s.r}" onchange="setVal(${ei},${si},'r',this.value)">
          <button onclick="stepSet(${ei},${si},'r',1)">+</button>
        </div>
        <button class="set-x" onclick="removeSet(${ei},${si})">×</button>
        <button class="set-done ${s.done?'done spectrum-bg':''}" onclick="toggleDone(${ei},${si})"><svg viewBox="0 0 24 24"><path d="M5 13l4 4L19 7"/></svg></button>
      </div>`;
    });
    html+=`<button class="add-set" onclick="addSet(${ei})"><svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg> Add set</button>
    <button class="ex-done" onclick="toggleCollapse(${ei})"><svg viewBox="0 0 24 24"><path d="M5 13l4 4L19 7"/></svg> Done — collapse</button>
    </div></div>`;
  });

  html+=`<button class="btn btn-ghost" onclick="openPicker()" style="margin-top:4px">
    <svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg> Add exercise</button>
    <div style="height:80px"></div>`;

  html+=`<div class="wk-actions">
    <button class="btn btn-ghost" style="flex:0 0 auto;width:auto;padding:17px 20px" onclick="cancelWorkout()">Discard</button>
    <button class="btn btn-primary spectrum-bg" onclick="finishWorkout()">
      <svg viewBox="0 0 24 24"><path d="M5 13l4 4L19 7"/></svg> Finish</button>
  </div>`;

  $("#view").innerHTML=html;
}

function startWorkout(){state.active={id:Date.now(),date:new Date().toISOString(),startedAt:Date.now(),exercises:[]};save();requestWake();openPicker();renderWorkout();}
function cancelWorkout(){if(confirm("Discard this session? Nothing will be saved.")){cancelRest();releaseWake();state.active=null;save();renderWorkout();}}
function removeEx(i){state.active.exercises.splice(i,1);save();renderWorkout();}
function addSet(ei){const sets=state.active.exercises[ei].sets;const last=sets[sets.length-1];sets.push(last?{w:last.w,r:last.r,done:false}:{w:0,r:8,done:false});save();renderWorkout();}
function removeSet(ei,si){state.active.exercises[ei].sets.splice(si,1);save();renderWorkout();}
function setVal(ei,si,k,v){state.active.exercises[ei].sets[si][k]=Math.max(0,parseFloat(v)||0);save();renderWorkout();}
function stepSet(ei,si,k,dir){const s=state.active.exercises[ei].sets[si];const step=k==='w'?inc():1;s[k]=Math.max(0,(+s[k]||0)+dir*step);save();renderWorkout();}
function toggleDone(ei,si){
  const ex=state.active.exercises[ei]; const s=ex.sets[si];
  s.done=!s.done;
  if(s.done){
    haptic();
    startRest();
    if(state.autoCollapse!==false && ex.sets.length && ex.sets.every(x=>x.done)) ex.collapsed=true;
  }
  save(); renderWorkout();
}
function toggleCollapse(ei){const e=state.active.exercises[ei];e.collapsed=!e.collapsed;if(e.collapsed)haptic();save();renderWorkout();}
function haptic(){try{navigator.vibrate&&navigator.vibrate(10);}catch(e){}}

/* ---- rest timer ---- */
let rest={endsAt:0,dur:90,iv:null};
function startRest(){
  if(state.restTimer===false) return;
  rest.dur=state.restDur||90;
  rest.endsAt=Date.now()+rest.dur*1000;
  $("#rest").classList.add("show");
  if(rest.iv)clearInterval(rest.iv);
  tickRest(); rest.iv=setInterval(tickRest,250);
}
function tickRest(){
  const ms=rest.endsAt-Date.now();
  if(ms<=0){haptic();cancelRest();return;}
  const s=Math.ceil(ms/1000), m=Math.floor(s/60), ss=String(s%60).padStart(2,"0");
  const t=$("#rest-time"); if(t)t.textContent=`${m}:${ss}`;
  const f=$("#rest-fill"); if(f)f.style.width=Math.max(0,Math.min(1,ms/(rest.dur*1000)))*100+"%";
}
function restAdjust(d){ if(!rest.endsAt)return; rest.endsAt+=d*1000; if(d>0)rest.dur+=d; tickRest(); }
function restSkip(){ cancelRest(); }
function cancelRest(){ if(rest.iv)clearInterval(rest.iv); rest.iv=null; rest.endsAt=0; const r=$("#rest"); if(r)r.classList.remove("show"); }

function finishWorkout(){
  const a=state.active;
  if(a.exercises.length===0||volume(a)===0){toast("Log at least one set first");return;}
  cancelRest();
  releaseWake();
  // clean empty sets
  a.exercises.forEach(e=>e.sets=e.sets.filter(s=>(+s.w>0||e.cat==='Bodyweight')&&+s.r>0));
  a.exercises=a.exercises.filter(e=>e.sets.length);
  const prs=detectPRs(a);
  const vol=volume(a);
  delete a.startedAt;
  state.workouts.push(a);
  state.active=null;
  save();
  showSummary(vol,prs);
  go('home');
}

function detectPRs(a){
  const prs=[];
  a.exercises.forEach(e=>{
    const topNow=Math.max(...e.sets.map(s=>+s.w));
    let prevMax=0;
    state.workouts.forEach(w=>w.exercises.filter(x=>x.name===e.name).forEach(x=>x.sets.forEach(s=>{if(+s.w>prevMax)prevMax=+s.w;})));
    if(topNow>prevMax&&e.cat!=="Bodyweight"){prs.push({name:e.name,val:`${topNow} ${state.unit}`});}
    else if(e.cat==="Bodyweight"){const topR=Math.max(...e.sets.map(s=>+s.r));let pr=0;state.workouts.forEach(w=>w.exercises.filter(x=>x.name===e.name).forEach(x=>x.sets.forEach(s=>{if(+s.r>pr)pr=+s.r;})));if(topR>pr)prs.push({name:e.name,val:`${topR} reps`});}
  });
  return prs;
}

/* ============ PICKER ============ */
let pickerCat="All", pickerMuscle="All", pickerQ="", pickerList=[];
function openPicker(){
  if(!state.active)startWorkout();
  pickerCat="All";pickerMuscle="All";pickerQ="";
  $("#sheet-title").textContent="Add exercise";
  renderPicker();
  openSheet();
}
function renderPicker(){
  const q=pickerQ.toLowerCase();
  pickerList=LIB.filter(l=>
    (pickerCat==="All"||l[1]===pickerCat) &&
    (pickerMuscle==="All"||l[3]===pickerMuscle) &&
    l[0].toLowerCase().includes(q)
  );
  const muscleChips=["All",...MUSCLES];
  let html=`<div class="search"><svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4-4"/></svg>
    <input id="pq" placeholder="Search or type a custom name…" value="${esc(pickerQ)}" oninput="pickerQ=this.value;renderPicker();reFocus()"></div>
    <div class="filt-label">Equipment</div>
    <div class="cats">${CATS.map(c=>`<button class="cat ${c===pickerCat?'active spectrum-bg':''}" onclick="pickerCat='${c}';renderPicker()">${c}</button>`).join("")}</div>
    <div class="filt-label">Muscle group</div>
    <div class="cats">${muscleChips.map(m=>{const mc=MUSCLE_COLOR[m]; const active=m===pickerMuscle;
      return `<button class="cat ${active?'active':''}" style="${active?`background:${m==='All'?'':mc};border-color:transparent;color:#0a0a0d`:''}" onclick="pickerMuscle='${m}';renderPicker()">${m}</button>`;}).join("")}</div>
    <div class="exlist">`;
  pickerList.forEach((l,i)=>{
    const col=CAT_COLOR[l[1]];const mcol=MUSCLE_COLOR[l[3]]||"#6f6b82";const top=lastTopSet(l[0]);
    html+=`<div class="item" onclick="addByIndex(${i})">
      <span class="pill" style="background:${col}22;color:${col}">${l[1].slice(0,3)}</span>
      <span class="nm">${esc(l[0])}<span class="mtag" style="color:${mcol}">${l[3]||""}</span></span>
      ${top?`<span class="last">${top.w}×${top.r}</span>`:""}
      <span class="plus">+</span></div>`;
  });
  if(!pickerList.length && !pickerQ.trim()){
    html+=`<div class="picker-empty">No exercises match those filters.</div>`;
  }
  if(pickerQ.trim() && !LIB.some(l=>l[0].toLowerCase()===q)){
    html+=`<div class="item" onclick="addCustom()" style="border-top:1px solid var(--line2)">
      <span class="pill" style="background:#ff7ad922;color:#ff7ad9">NEW</span>
      <span class="nm">Add "${esc(pickerQ.trim())}"</span><span class="plus">+</span></div>`;
  }
  html+=`</div>`;
  $("#sheet-body").innerHTML=html;
}
function reFocus(){const el=$("#pq");if(el){el.focus();el.setSelectionRange(el.value.length,el.value.length);}}
function addByIndex(i){const l=pickerList[i];if(l)addExercise(l[0],l[1],l[2],l[3]);}
function addCustom(){const n=pickerQ.trim();if(n)addExercise(n,"Custom","",pickerMuscle!=="All"?pickerMuscle:"Other");}
function addExercise(name,cat,tip,muscle){
  state.active.exercises.push({name,cat,tip,muscle:muscle||"Other",sets:[{w:0,r:cat==="Bodyweight"?8:0,done:false}]});
  // prefill from history
  const top=lastTopSet(name);
  if(top){state.active.exercises[state.active.exercises.length-1].sets=[{w:top.w,r:top.r,done:false}];}
  save();closeSheet();renderWorkout();toast(name+" added");
}

/* ============ DETAIL ============ */
function openDetail(idx){
  const w=state.workouts[idx];
  $("#sheet-title").textContent=new Date(w.date).toLocaleDateString('en',{weekday:'short',month:'long',day:'numeric'});
  let html=`<div class="card hero" style="padding:18px;margin-bottom:16px">
    <div class="eyebrow">Session total</div>
    <div class="big mono" style="font-size:40px">${fmt(volume(w))}<span class="unit">${state.unit}</span></div>
  </div>`;
  w.exercises.forEach(e=>{
    const col=CAT_COLOR[e.cat]||"#ff7ad9";
    html+=`<div class="detail-ex"><div class="nm"><span><span class="pill" style="background:${col}22;color:${col};font-size:9px;padding:2px 7px;border-radius:5px;margin-right:7px">${e.cat}</span>${esc(e.name)}</span><span class="v">${fmt(e.sets.reduce((t,s)=>t+s.w*s.r,0))} ${state.unit}</span></div>
      <div class="sets-mini">${e.sets.map(s=>`<span>${e.cat==='Bodyweight'&&!s.w?'':s.w+'×'}${e.cat==='Bodyweight'&&!s.w?s.r+' reps':s.r}</span>`).join("")}</div></div>`;
  });
  html+=`<button class="btn btn-ghost" style="margin-top:18px" onclick="deleteSession(${idx})"><svg viewBox="0 0 24 24"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/></svg> Delete session</button>`;
  $("#sheet-body").innerHTML=html;openSheet();
}
function deleteSession(idx){if(confirm("Delete this session permanently?")){state.workouts.splice(idx,1);save();closeSheet();renderHome();}}

/* ============ SUMMARY ============ */
function showSummary(vol,prs){
  const eq=equivalence(vol);
  const lt=lifetime();const{cur,nx}=tierFor(lt);
  $("#sheet-title").textContent="Session complete";
  let html=`<div class="summary">
    <div class="crown">${prs.length?"🏆":"✦"}</div>
    <h3>You moved</h3>
    <div class="big spectrum-text mono">${fmt(vol)}</div>
    <div class="eq">${state.unit}${eq?` — about ${eq.emoji} ${eq.text}`:""}</div>`;
  if(prs.length){html+=`<div class="prs">`+prs.map(p=>`<div class="pr"><span class="star">⭐</span><span class="nm">New best · ${esc(p.name)}</span><span class="val">${p.val}</span></div>`).join("")+`</div>`;}
  html+=`<div class="card" style="text-align:left;margin-top:6px"><div class="eyebrow">Current tier</div>
    <div style="display:flex;align-items:center;justify-content:space-between;margin-top:6px">
    <div class="name spectrum-text" style="font-size:22px;font-weight:800;font-family:'Bricolage Grotesque'">${cur.n}</div>
    ${nx?`<div style="font-size:12px;color:var(--ink2);text-align:right">${fmt(nx.at-lt)} ${state.unit}<br>to ${nx.n}</div>`:`<div style="font-size:12px;color:var(--ink2)">max tier</div>`}</div></div>
    <button class="btn btn-primary spectrum-bg" style="margin-top:20px" onclick="closeSheet()">Done</button>
  </div>`;
  $("#sheet-body").innerHTML=html;openSheet();
}

/* ============ SETTINGS ============ */
function openSettings(){
  $("#sheet-title").textContent="Settings";
  const html=`
  <div class="srow"><div class="lab">Your name<small>Shown on your home screen</small></div>
    <input class="txtin" value="${esc(state.name)}" placeholder="optional" onchange="state.name=this.value;save()"></div>
  <div class="srow"><div class="lab">Units</div>
    <div class="toggle">
      <button class="${state.unit==='lb'?'on spectrum-bg':''}" onclick="setUnit('lb')">lb</button>
      <button class="${state.unit==='kg'?'on spectrum-bg':''}" onclick="setUnit('kg')">kg</button>
    </div></div>
  <div class="srow"><div class="lab">Animated spectrum<small>Turn off to save battery</small></div>
    <div class="toggle">
      <button class="${state.anim!==false?'on spectrum-bg':''}" onclick="setAnim(true)">On</button>
      <button class="${state.anim===false?'on spectrum-bg':''}" onclick="setAnim(false)">Off</button>
    </div></div>
  <div class="srow"><div class="lab">Rest timer<small>Starts a countdown when you finish a set</small></div>
    <div class="toggle">
      <button class="${state.restTimer!==false?'on spectrum-bg':''}" onclick="setBool('restTimer',true)">On</button>
      <button class="${state.restTimer===false?'on spectrum-bg':''}" onclick="setBool('restTimer',false)">Off</button>
    </div></div>
  <div class="srow"><div class="lab">Auto-collapse<small>Folds an exercise once every set is done</small></div>
    <div class="toggle">
      <button class="${state.autoCollapse!==false?'on spectrum-bg':''}" onclick="setBool('autoCollapse',true)">On</button>
      <button class="${state.autoCollapse===false?'on spectrum-bg':''}" onclick="setBool('autoCollapse',false)">Off</button>
    </div></div>
  <div class="srow"><div class="lab">Demo data<small>Loads a sample week (replaces current data)</small></div>
    <div class="toggle">
      <button class="${state.demo?'on spectrum-bg':''}" onclick="setDemo(true)">On</button>
      <button class="${!state.demo?'on spectrum-bg':''}" onclick="setDemo(false)">Off</button>
    </div></div>
  <div class="srow" id="install-row"><div class="lab">Install app<small>Add MOVED to your home screen</small></div>
    <button class="btn-ghost" style="padding:9px 16px;border-radius:10px;font-size:13px;font-weight:700" onclick="doInstall()">Install</button></div>
  <div class="srow"><div class="lab">Export data<small>Download your full history as JSON</small></div>
    <button class="btn-ghost" style="padding:9px 16px;border-radius:10px;font-size:13px;font-weight:700" onclick="exportData()">Export</button></div>
  <div class="srow"><div class="lab">Import data</div>
    <button class="btn-ghost" style="padding:9px 16px;border-radius:10px;font-size:13px;font-weight:700" onclick="document.getElementById('imp').click()">Import</button>
    <input type="file" id="imp" accept="application/json" class="hide" onchange="importData(this)"></div>
  <div class="srow" style="border:none"><div class="lab" style="color:#ff5cc4">Clear everything<small>Deletes all sessions. Can't be undone.</small></div>
    <button class="btn-ghost" style="padding:9px 16px;border-radius:10px;font-size:13px;font-weight:700;color:#ff5cc4;border-color:rgba(255,92,196,.3)" onclick="wipe()">Clear</button></div>
  <p style="text-align:center;color:var(--ink3);font-size:12px;margin-top:24px;line-height:1.6">MOVED · the anti fitness app<br>No accounts. No nags. Your data stays on your device.<br><span class="mono">∞</span></p>`;
  $("#sheet-body").innerHTML=html;refreshInstallRow();openSheet();
}
function refreshInstallRow(){
  const row=$("#install-row"); if(!row)return;
  const installed=window.matchMedia('(display-mode: standalone)').matches||navigator.standalone;
  const isIOS=/iphone|ipad|ipod/i.test(navigator.userAgent);
  if(installed){ row.classList.add("hide"); return; }
  row.classList.remove("hide");
  const sub=row.querySelector("small");
  if(sub) sub.textContent=isIOS?"Tap Share, then Add to Home Screen":"Add MOVED to your home screen";
}
function setUnit(u){state.unit=u;save();openSettings();render();}
function setAnim(v){state.anim=v;save();applyAnim();openSettings();}
function setBool(k,v){state[k]=v;if(k==="restTimer"&&!v)cancelRest();save();openSettings();}
function setDemo(v){
  if(v){loadSampleData();state.demo=true;}
  else{state.workouts=[];state.demo=false;}
  state.active=null;cancelRest();save();closeSheet();go('home');
  toast(v?"Demo data loaded":"Demo data cleared");
}
function exportData(){const blob=new Blob([JSON.stringify(state,null,2)],{type:"application/json"});const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="moved-data.json";a.click();toast("Exported");}
function importData(input){const f=input.files[0];if(!f)return;const r=new FileReader();r.onload=()=>{try{const d=JSON.parse(r.result);state={...state,...d,active:null};save();closeSheet();render();toast("Imported");}catch(e){toast("Couldn't read that file");}};r.readAsText(f);}
function wipe(){if(confirm("Delete ALL sessions and reset MOVED? This can't be undone.")){state={name:state.name,unit:state.unit,workouts:[],active:null};save();closeSheet();go('home');}}

/* ============ SAMPLE ============ */
function loadSample(){ setDemo(true); }
function loadSampleData(){
  const mk=(daysAgo,exs)=>({id:Date.now()-daysAgo*1e6,date:new Date(Date.now()-daysAgo*864e5).toISOString(),exercises:exs});
  const e=(name,cat,sets)=>{const row=findEx(name)||[];return{name,cat,tip:row[2]||"",muscle:row[3]||"Other",sets:sets.map(([w,r])=>({w,r,done:true}))};};
  state.workouts=[
    mk(14,[e("Barbell Bench Press","Barbell",[[95,8],[115,6],[115,5]]),e("Barbell Row","Barbell",[[95,8],[95,8]]),e("Dumbbell Curl","Dumbbell",[[25,10],[25,9]])]),
    mk(10,[e("Back Squat","Barbell",[[135,5],[155,5],[155,4]]),e("Leg Press","Machine",[[270,10],[270,10]]),e("Leg Curl","Machine",[[70,12]])]),
    mk(6,[e("Barbell Bench Press","Barbell",[[105,8],[120,6],[120,5]]),e("Overhead Press","Barbell",[[65,8],[65,7]]),e("Lat Pulldown","Machine",[[120,10],[120,10]])]),
    mk(2,[e("Back Squat","Barbell",[[145,5],[165,5],[165,4]]),e("Romanian Deadlift","Barbell",[[135,8],[135,8]]),e("Pull-up","Bodyweight",[[0,8],[0,7]])]),
  ];
}

/* ============ SHEET ============ */
function openSheet(){$("#scrim").classList.add("open");$("#sheet").classList.add("open");}
function closeSheet(){$("#scrim").classList.remove("open");$("#sheet").classList.remove("open");}

function esc(s){return String(s||"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}

/* ---- wake lock: keep screen on during a workout ---- */
let wakeLock=null;
async function requestWake(){
  try{ if('wakeLock' in navigator){ wakeLock=await navigator.wakeLock.request('screen'); } }catch(e){}
}
function releaseWake(){ try{ if(wakeLock){ wakeLock.release(); wakeLock=null; } }catch(e){} }
// re-acquire if the screen was locked then reopened mid-session
document.addEventListener('visibilitychange',()=>{
  if(document.visibilityState==='visible' && state.active && !wakeLock) requestWake();
});

/* ---- install prompt (Android/Chrome) ---- */
let deferredPrompt=null;
window.addEventListener('beforeinstallprompt',e=>{ e.preventDefault(); deferredPrompt=e; if(typeof refreshInstallRow==='function')refreshInstallRow(); });
window.addEventListener('appinstalled',()=>{ deferredPrompt=null; toast("Installed — find MOVED on your home screen"); });
function canInstall(){ return !!deferredPrompt; }
async function doInstall(){
  if(!deferredPrompt){ toast("On iPhone: Share → Add to Home Screen"); return; }
  deferredPrompt.prompt();
  try{ await deferredPrompt.userChoice; }catch(e){}
  deferredPrompt=null;
  if(typeof refreshInstallRow==='function')refreshInstallRow();
}

/* ---- service worker ---- */
if('serviceWorker' in navigator){
  window.addEventListener('load',()=>{ navigator.serviceWorker.register('sw.js').catch(()=>{}); });
}

/* boot */
render();
