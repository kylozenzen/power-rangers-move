/* MOVED 2.1 — active-workout render and lifecycle overrides */
(function(){
  "use strict";
  const FAC=window.MovedActiveControls;

  startLiveTimer=function(){
    clearLiveTimer();if(!state.active)return;
    const tick=()=>{
      const elapsed=$("#wk-elapsed");if(elapsed)elapsed.textContent=fmtDurSeconds(FAC.elapsed());
      (state.active.cardio||[]).forEach((c,i)=>{
        const t=$("#cardio-time-"+i);if(t)t.textContent=fmtDurSeconds(cardioElapsed(c));
        const fill=$("#cardio-fill-"+i);if(fill){const target=(+c.targetMinutes||0)*60;fill.style.width=(target?clamp(cardioElapsed(c)/target*100,0,100):0)+"%";}
        const pace=$("#cardio-pace-"+i);if(pace)pace.textContent=paceText(c);
      });
      updateWorkoutMetrics();
    };
    tick();if(!FAC.isPaused()&&!FAC.isEditing())liveIv=setInterval(tick,1000);
  };

  renderActiveWorkout=function(){
    const a=state.active,type=sessionType(a),editing=FAC.isEditing(),paused=FAC.isPaused(),ctl=FAC.loadControl();
    const fixed=ctl.manualDurationSec!==null&&ctl.manualDurationSec!==undefined;
    let html=`<div class="wk-head"><div><div class="eyebrow">${editing?"Editing saved session":paused?"Session paused":"Active session"}</div><div class="wk-title">${esc(sessionTitle(a))}</div><div class="live-row ${paused?'fac-live-paused':''}"><span class="live-dot"></span><span id="wk-elapsed">${fmtDurSeconds(FAC.elapsed(a))}</span>${fixed?`<span class="fac-fixed">fixed</span>`:""}</div></div><div class="wk-head-actions">
      ${!editing?`<button class="${paused?'fac-active-control':''}" onclick="facToggleSessionPause()" title="${paused?'Resume session':'Pause session'}"><svg viewBox="0 0 24 24">${paused?'<path d="M8 5l11 7-11 7z"/>':'<path d="M8 5v14M16 5v14"/>'}</svg></button>`:""}
      <button onclick="facOpenSessionTime()" title="Edit session time"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg></button>
      <button onclick="saveActiveRoutine()" title="Save routine"><svg viewBox="0 0 24 24"><path d="M12 3l2.8 5.7 6.2.9-4.5 4.4 1.1 6.2L12 17.3 6.4 20l1.1-6.2L3 9.6l6.2-.9z"/></svg></button>
    </div></div>`;
    html+=`<div class="fac-session-tools"><button ${FAC.hasDoneSet()?'':'disabled'} onclick="facUndoLastDone()"><span>↶</span> Undo last set</button><button onclick="facOpenSessionTime()"><span>◷</span> ${editing?'Logged time':'Start time'}</button>${paused?`<span class="fac-pause-copy">Paused. The clock is behaving.</span>`:""}</div>`;
    html+=`<div class="wk-total"><div class="metric"><div class="n mono spectrum-text" id="live-strength">${fmt(loggedVolume(a))}</div><div class="l">${state.unit} strength</div></div><div class="divider"></div><div class="metric"><div class="n mono spectrum-text" id="live-cardio">${fmtMinutes(cardioSeconds(a))}</div><div class="l">cardio minutes</div></div></div>`;
    if(type!=="cardio")html+=renderExercises(a);
    if(type!=="strength")html+=(a.cardio||[]).map((c,i)=>renderCardioBlock(c,i)).join("");
    if(type!=="cardio")html+=`<button class="btn btn-ghost" onclick="openPicker()" style="margin-top:3px"><svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>Add exercise</button>`;
    html+=`<div style="height:93px"></div><div class="wk-actions"><button class="btn btn-ghost" style="width:auto" onclick="cancelWorkout()">${editing?"Cancel":"Discard"}</button><button class="btn btn-primary spectrum-bg" onclick="finishWorkout()"><svg viewBox="0 0 24 24"><path d="M5 13l4 4L19 7"/></svg>${editing?"Save changes":"Finish"}</button></div>`;
    $("#view").innerHTML=html;startLiveTimer();setTimeout(FAC.bindSetGestures,0);
  };

  renderExercises=function(a){
    const expanded=a.exercises.findIndex(e=>!e.collapsed);let html="";
    a.exercises.forEach((e,ei)=>{
      const col=CAT_COLOR[e.cat]||"#ff83d1",done=e.sets.some(s=>s.done),exVol=e.sets.reduce((t,s)=>t+(s.done?setVolume(s):0),0);
      if(e.collapsed||(expanded!==-1&&ei!==expanded)){
        html+=`<div class="ex collapsed ${done?'':'pending'} ${expanded!==-1&&ei!==expanded?'focus-hidden':''}" id="ex-${ei}"><div class="ex-h" onclick="toggleCollapse(${ei})"><button class="ex-check ${done?'done spectrum-bg':''}"><svg viewBox="0 0 24 24"><path d="M5 13l4 4L19 7"/></svg></button><span class="pill" style="background:${col}22;color:${col}">${e.cat}</span><span class="nm">${esc(e.name)}</span><span class="ex-sum ${done?'':'todo'}">${done?`${e.sets.filter(s=>s.done).length} sets · ${fmt(exVol)} ${state.unit}`:"tap to log"}</span>${done?`<button class="fac-undo-mini" onclick="event.stopPropagation();facUndoExercise(${ei})">Undo</button>`:""}<button class="x" onclick="event.stopPropagation();removeEx(${ei})">×</button></div></div>`;return;
      }
      const top=lastTopSet(e.name,a.editingIndex),isbw=e.cat==="Bodyweight";
      html+=`<div class="ex" id="ex-${ei}"><div class="ex-h"><button class="ex-check" onclick="toggleCollapse(${ei})"><svg viewBox="0 0 24 24"><path d="M5 13l4 4L19 7"/></svg></button><span class="pill" style="background:${col}22;color:${col}">${e.cat}</span><span class="nm">${esc(e.name)}</span><button class="icon-mini" onclick="moveExercise(${ei},-1)" title="Move up"><svg viewBox="0 0 24 24"><path d="M7 15l5-5 5 5"/></svg></button><button class="icon-mini" onclick="moveExercise(${ei},1)" title="Move down"><svg viewBox="0 0 24 24"><path d="M7 9l5 5 5-5"/></svg></button><button class="x" onclick="removeEx(${ei})">×</button></div>`;
      if(e.tip)html+=`<div class="form-tip"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 8h.01M11 12h1v4h1"/></svg><span>${esc(e.tip)}</span></div>`;
      if(top)html+=`<div class="po">Last time: <b>${top.w}${isbw?'':' '+state.unit} × ${top.r}</b> · reasonable next try: <b>${isbw?top.r+2+' reps':top.w+inc()+' '+state.unit}</b></div>`;
      html+=`<div class="fac-ex-tools"><button onclick="facOpenQuickNote(${ei})"><span>✎</span>${e.note?'View note':'Quick note'}</button><button onclick="facOpenReplaceExercise(${ei})"><span>↻</span>Replace</button>${FAC.isBarbell(e)?`<button onclick="facOpenPlateCalculator(${ei},${Math.max(0,e.sets.findIndex(s=>!s.done))})"><span>◉</span>Plates</button>`:""}</div>${e.note?`<button class="fac-note-preview" onclick="facOpenQuickNote(${ei})">${esc(e.note)}</button>`:""}<div class="sets"><div class="colhead fac-colhead"><div>#</div><div>${isbw?'Added '+state.unit:'Weight'}</div><div>${isbw?'Reps / sec':'Reps'}</div><div>WU</div><div>Done</div><div></div></div>`;
      e.sets.forEach((s,si)=>{
        html+=`<div class="set-row fac-set-row" data-ei="${ei}" data-si="${si}"><div class="si">${si+1}</div><div class="numwrap"><button onclick="stepSet(${ei},${si},'w',-1)">−</button><input type="number" inputmode="decimal" value="${s.w}" onfocus="this.select()" onchange="setVal(${ei},${si},'w',this.value)"><button onclick="stepSet(${ei},${si},'w',1)">+</button></div><div class="numwrap"><button onclick="stepSet(${ei},${si},'r',-1)">−</button><input type="number" inputmode="numeric" value="${s.r}" onfocus="this.select()" onchange="setVal(${ei},${si},'r',this.value)"><button onclick="stepSet(${ei},${si},'r',1)">+</button></div><button class="warm-btn ${s.warmup?'on':''}" onclick="toggleWarmup(${ei},${si})">W</button><button class="set-done ${s.done?'done spectrum-bg':''}" onclick="toggleDone(${ei},${si})" aria-label="${s.done?'Undo completed set':'Complete set'}"><svg viewBox="0 0 24 24"><path d="M5 13l4 4L19 7"/></svg></button><button class="fac-set-more" onclick="facOpenSetMenu(${ei},${si})" aria-label="More set actions">•••</button></div>`;
      });
      html+=`</div><button class="add-set" onclick="addSet(${ei})"><svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>Add set</button><div class="effort-row"><span>How did it feel?</span>${[["More","Had more"],["Right","About right"],["Max","Barely survived"]].map(([v,label])=>`<button class="${e.effort===v?'on':''}" onclick="setEffort(${ei},'${v}')">${label}</button>`).join("")}</div><button class="ex-done" onclick="toggleCollapse(${ei})"><svg viewBox="0 0 24 24"><path d="M5 13l4 4L19 7"/></svg>Done — collapse</button></div>`;
    });
    return html;
  };

  FAC.bindSetGestures=function(){
    $$(".fac-set-row").forEach(row=>{
      let startX=0,startY=0;
      row.addEventListener("touchstart",e=>{const t=e.touches[0];startX=t.clientX;startY=t.clientY;},{passive:true});
      row.addEventListener("touchend",e=>{const t=e.changedTouches[0],dx=t.clientX-startX,dy=t.clientY-startY;if(dx<-65&&Math.abs(dy)<45)FAC.openSetMenu(+row.dataset.ei,+row.dataset.si);},{passive:true});
    });
  };

  const originalToggleDone=toggleDone;
  toggleDone=function(ei,si){
    const wasDone=!!state.active?.exercises?.[ei]?.sets?.[si]?.done;
    originalToggleDone(ei,si);if(wasDone)cancelRest();
  };
  const originalCancelWorkout=cancelWorkout;
  cancelWorkout=function(){
    const hadActive=!!state.active;originalCancelWorkout();if(hadActive&&!state.active)FAC.clearControl();
  };
  finishWorkout=function(){
    const a=state.active;if(!a)return;(a.cardio||[]).forEach(pauseCardio);
    const cleaned={...structuredCloneSafe(a),exercises:a.exercises.map(e=>({...structuredCloneSafe(e),collapsed:true,sets:e.sets.filter(s=>s.done&&+s.r>0)})).filter(e=>e.sets.length),cardio:a.cardio.map(c=>({...structuredCloneSafe(c),durationSec:cardioElapsed(c),running:false,startedAt:null})).filter(c=>c.durationSec>=10||c.distance>0)};
    if(!cleaned.exercises.length&&!cleaned.cardio.length){toast("Complete a set or log some cardio first");return;}
    cleaned.type=cleaned.exercises.length&&cleaned.cardio.length?"mixed":cleaned.cardio.length?"cardio":"strength";
    const ctl=FAC.loadControl(),hasFixed=ctl.manualDurationSec!==null&&ctl.manualDurationSec!==undefined;
    cleaned.durationSec=cleaned.editingIndex!==null&&!hasFixed?(cleaned.originalDurationSec||cleaned.durationSec):FAC.elapsed(a);
    cleaned.endedAt=hasFixed?new Date((new Date(cleaned.date).getTime()||Date.now())+cleaned.durationSec*1000).toISOString():new Date().toISOString();
    delete cleaned.startedAt;delete cleaned.originalDurationSec;
    const editIndex=cleaned.editingIndex,prs=detectPRs(cleaned,editIndex);delete cleaned.editingIndex;
    if(editIndex!==null)state.workouts[editIndex]=cleaned;else state.workouts.push(cleaned);
    state.active=null;FAC.clearControl();cancelRest();clearLiveTimer();releaseWake();save();resetStartFlow();go("home");showSummary(cleaned,prs,editIndex!==null);
  };

  window.addEventListener("storage",e=>{if(e.key===FAC.key&&state.active)renderWorkout();});
  if(state.active){FAC.saveControl(FAC.loadControl());render();}
})();
