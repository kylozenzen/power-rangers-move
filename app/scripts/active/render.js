/* MOVED 2.2 — active-workout render, focused exercise overlay, and lifecycle overrides */
(function(){
  "use strict";
  const FAC=window.MovedActiveControls;
  if(FAC.focusExerciseIndex===undefined)FAC.focusExerciseIndex=null;

  FAC.openExerciseFocus=function(ei){
    const e=state.active?.exercises?.[ei];if(!e)return;
    FAC.focusExerciseIndex=ei;
    state.active.exercises.forEach((x,i)=>x.collapsed=i!==ei);
    save();renderWorkout();
  };
  FAC.closeExerciseFocus=function(){
    if(state.active?.exercises?.[FAC.focusExerciseIndex])state.active.exercises[FAC.focusExerciseIndex].collapsed=true;
    FAC.focusExerciseIndex=null;
    save();renderWorkout();
  };
  FAC.finishExerciseFocus=function(){
    const e=state.active?.exercises?.[FAC.focusExerciseIndex];
    const name=e?.name||"Exercise";
    if(e)e.collapsed=true;
    FAC.focusExerciseIndex=null;
    save();renderWorkout();toast(`${name} finished`);
  };
  FAC.updateFocusRest=function(){
    const panel=$("#fac-focus-rest"),time=$("#fac-focus-rest-time"),fill=$("#fac-focus-rest-fill");
    if(!panel||!time)return;
    const timerAvailable=typeof rest!=="undefined";
    const active=timerAvailable&&rest.endsAt>Date.now();
    panel.classList.toggle("active",active);
    panel.classList.toggle("off",state.restTimer===false);
    if(active){
      const remain=Math.max(0,(rest.endsAt-Date.now())/1000);
      time.textContent=fmtDurSeconds(remain);
      if(fill)fill.style.width=clamp((rest.endsAt-Date.now())/(Math.max(1,rest.dur)*1000)*100,0,100)+"%";
    }else{
      time.textContent=state.restTimer===false?"Off":"Ready";
      if(fill)fill.style.width="0%";
    }
    $$("#fac-focus-rest [data-rest-action]").forEach(button=>button.disabled=!active);
  };

  startLiveTimer=function(){
    clearLiveTimer();if(!state.active)return;
    const tick=()=>{
      const elapsed=$("#wk-elapsed");if(elapsed)elapsed.textContent=fmtDurSeconds(FAC.elapsed());
      (state.active.cardio||[]).forEach((c,i)=>{
        const t=$("#cardio-time-"+i);if(t)t.textContent=fmtDurSeconds(cardioElapsed(c));
        const fill=$("#cardio-fill-"+i);if(fill){const target=(+c.targetMinutes||0)*60;fill.style.width=(target?clamp(cardioElapsed(c)/target*100,0,100):0)+"%";}
        const pace=$("#cardio-pace-"+i);if(pace)pace.textContent=paceText(c);
      });
      updateWorkoutMetrics();FAC.updateFocusRest();
    };
    tick();if(!FAC.isPaused()&&!FAC.isEditing())liveIv=setInterval(tick,1000);
  };

  renderActiveWorkout=function(){
    const a=state.active,type=sessionType(a),editing=FAC.isEditing(),paused=FAC.isPaused(),ctl=FAC.loadControl();
    if(FAC.focusExerciseIndex!==null&&!a.exercises?.[FAC.focusExerciseIndex])FAC.focusExerciseIndex=null;
    if(FAC.focusExerciseIndex===null&&a.exercises?.length){
      const legacyFocus=a.exercises.findIndex(e=>e.collapsed===false);
      if(legacyFocus>=0)FAC.focusExerciseIndex=legacyFocus;
    }
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
    $("#view").innerHTML=html;
    document.body.classList.toggle("fac-focus-open",FAC.focusExerciseIndex!==null);
    startLiveTimer();setTimeout(FAC.bindSetGestures,0);
  };

  function renderExerciseQueueCard(e,ei){
    const col=CAT_COLOR[e.cat]||"#ff83d1",logged=e.sets.filter(s=>s.done),done=logged.length>0,exVol=logged.reduce((t,s)=>t+setVolume(s),0);
    const summary=done?`${logged.length} set${logged.length===1?'':'s'} · ${fmt(exVol)} ${state.unit}`:"Tap to focus";
    return `<div class="ex collapsed fac-queue-ex ${done?'has-work':'pending'}" id="ex-${ei}" onclick="facOpenExerciseFocus(${ei})"><div class="ex-h"><button class="ex-check ${done?'done spectrum-bg':''}" onclick="event.stopPropagation();facOpenExerciseFocus(${ei})" aria-label="Open ${escAttr(e.name)}"><svg viewBox="0 0 24 24"><path d="M5 13l4 4L19 7"/></svg></button><span class="pill" style="background:${col}22;color:${col}">${e.cat}</span><span class="nm">${esc(e.name)}</span><span class="ex-sum ${done?'':'todo'}">${summary}</span>${done?`<button class="fac-undo-mini" onclick="event.stopPropagation();facUndoExercise(${ei})">Undo</button>`:""}<button class="x" onclick="event.stopPropagation();removeEx(${ei})" aria-label="Remove ${escAttr(e.name)}">×</button></div></div>`;
  }

  function renderFocusedExercise(a,ei){
    const e=a.exercises[ei];if(!e)return"";
    if(!e.sets.some(s=>!s.done)){
      const last=e.sets[e.sets.length-1]||{w:0,r:8};
      e.sets.push({w:+last.w||0,r:+last.r||8,done:false,warmup:false});
    }
    const col=CAT_COLOR[e.cat]||"#ff83d1",top=lastTopSet(e.name,a.editingIndex),isbw=e.cat==="Bodyweight";
    const pendingIndex=Math.max(0,e.sets.findIndex(s=>!s.done)),loggedCount=e.sets.filter(s=>s.done).length;
    const currentSet=e.sets[pendingIndex]||e.sets[e.sets.length-1];
    const activeRest=typeof rest!=="undefined"&&rest.endsAt>Date.now();
    const restLabel=activeRest?fmtDurSeconds((rest.endsAt-Date.now())/1000):(state.restTimer===false?"Off":"Ready");
    let html=`<div class="fac-focus-overlay" role="dialog" aria-modal="true" aria-labelledby="fac-focus-title">
      <div class="fac-focus-topbar">
        <button class="fac-focus-back" onclick="facCloseExerciseFocus()"><svg viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6"/></svg><span>Workout</span></button>
        <span class="fac-focus-position">Exercise ${ei+1} of ${a.exercises.length}</span>
        <span class="fac-focus-spacer"></span>
      </div>
      <div class="fac-focus-scroll">
        <section class="fac-focus-hero">
          <div class="fac-focus-kicker"><span class="pill" style="background:${col}22;color:${col}">${e.cat}</span><span>${loggedCount} set${loggedCount===1?'':'s'} logged</span></div>
          <h2 id="fac-focus-title">${esc(e.name)}</h2>
          ${e.tip?`<div class="fac-focus-tip"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 8h.01M11 12h1v4h1"/></svg><span>${esc(e.tip)}</span></div>`:""}
          ${top?`<div class="fac-focus-last"><span>Last time</span><b>${top.w}${isbw?'':' '+state.unit} × ${top.r}</b><small>${isbw?`Try ${top.r+2} reps if it feels good`:`Reasonable next try: ${top.w+inc()} ${state.unit}`}</small></div>`:""}
        </section>
        <div class="fac-ex-tools fac-focus-tools"><button onclick="facOpenQuickNote(${ei})"><span>✎</span>${e.note?'View note':'Quick note'}</button><button onclick="facOpenReplaceExercise(${ei})"><span>↻</span>Replace</button>${FAC.isBarbell(e)?`<button onclick="facOpenPlateCalculator(${ei},${pendingIndex})"><span>◉</span>Plates</button>`:""}</div>
        ${e.note?`<button class="fac-note-preview" onclick="facOpenQuickNote(${ei})">${esc(e.note)}</button>`:""}
        <section class="fac-focus-card">
          <div class="fac-focus-section-h"><div><span class="eyebrow">Sets</span><h3>${currentSet?`Set ${pendingIndex+1} ready`:"All logged"}</h3></div><span>${loggedCount} complete</span></div>
          <div class="sets fac-focus-sets"><div class="colhead fac-colhead"><div>#</div><div>${isbw?'Added '+state.unit:'Weight'}</div><div>${isbw?'Reps / sec':'Reps'}</div><div>WU</div><div></div></div>`;
    e.sets.forEach((s,si)=>{
      if(s.done){
        html+=`<div class="set-row fac-set-row fac-set-logged" data-ei="${ei}" data-si="${si}"><div class="si">${si+1}</div><div class="fac-logged-value mono">${s.w||0}</div><div class="fac-logged-value mono">${s.r||0}</div><button class="warm-btn ${s.warmup?'on':''}" disabled>${s.warmup?'W':'·'}</button><button class="fac-set-more" onclick="facOpenSetMenu(${ei},${si})" aria-label="More set actions">•••</button></div>`;
      }else{
        html+=`<div class="set-row fac-set-row fac-set-current" data-ei="${ei}" data-si="${si}"><div class="si">${si+1}</div><div class="numwrap"><button onclick="stepSet(${ei},${si},'w',-1)">−</button><input type="number" inputmode="decimal" value="${s.w}" onfocus="this.select()" onchange="setVal(${ei},${si},'w',this.value)"><button onclick="stepSet(${ei},${si},'w',1)">+</button></div><div class="numwrap"><button onclick="stepSet(${ei},${si},'r',-1)">−</button><input type="number" inputmode="numeric" value="${s.r}" onfocus="this.select()" onchange="setVal(${ei},${si},'r',this.value)"><button onclick="stepSet(${ei},${si},'r',1)">+</button></div><button class="warm-btn ${s.warmup?'on':''}" onclick="toggleWarmup(${ei},${si})">W</button><button class="fac-set-more" onclick="facOpenSetMenu(${ei},${si})" aria-label="More set actions">•••</button></div>`;
      }
    });
    html+=`</div><button class="add-set fac-log-set fac-focus-log" onclick="facLogAndAddSet(${ei})"><svg viewBox="0 0 24 24"><path d="M5 13l4 4L19 7"/></svg>Log set + add next</button></section>
        <section class="fac-focus-rest" id="fac-focus-rest">
          <div class="fac-focus-rest-fill" id="fac-focus-rest-fill"></div>
          <div class="fac-focus-rest-copy"><span class="eyebrow">Rest timer</span><strong class="mono" id="fac-focus-rest-time">${restLabel}</strong><small>${state.restTimer===false?"Turn it on in settings if you want it.":activeRest?"Recover. Hydrate. Pretend not to check your phone.":"Starts automatically after you log a set."}</small></div>
          <div class="fac-focus-rest-actions"><button data-rest-action onclick="restAdjust(-15);facUpdateFocusRest()">−15</button><button data-rest-action onclick="restAdjust(30);facUpdateFocusRest()">+30</button><button data-rest-action class="fac-rest-skip" onclick="restSkip();facUpdateFocusRest()">Skip</button></div>
        </section>
        <section class="fac-focus-card fac-focus-effort"><div class="fac-focus-section-h"><div><span class="eyebrow">Effort</span><h3>How did it feel?</h3></div></div><div class="fac-focus-effort-grid">${[["More","Had more"],["Right","About right"],["Max","Barely survived"]].map(([v,label])=>`<button class="${e.effort===v?'on':''}" onclick="setEffort(${ei},'${v}')">${label}</button>`).join("")}</div></section>
        <div class="fac-focus-bottom-space"></div>
      </div>
      <div class="fac-focus-footer"><button class="btn btn-primary spectrum-bg" onclick="facFinishExerciseFocus()"><svg viewBox="0 0 24 24"><path d="M5 13l4 4L19 7"/></svg>Finish exercise</button></div>
    </div>`;
    return html;
  }

  renderExercises=function(a){
    let html="";
    a.exercises.forEach((e,ei)=>{
      if(!e.sets.some(s=>!s.done)){
        const last=e.sets[e.sets.length-1]||{w:0,r:8};
        e.sets.push({w:+last.w||0,r:+last.r||8,done:false,warmup:false});
      }
      html+=renderExerciseQueueCard(e,ei);
    });
    if(FAC.focusExerciseIndex!==null)html+=renderFocusedExercise(a,FAC.focusExerciseIndex);
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
    const hadActive=!!state.active;originalCancelWorkout();if(hadActive&&!state.active){FAC.focusExerciseIndex=null;document.body.classList.remove("fac-focus-open");FAC.clearControl();}
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
    state.active=null;FAC.focusExerciseIndex=null;document.body.classList.remove("fac-focus-open");FAC.clearControl();cancelRest();clearLiveTimer();releaseWake();save();resetStartFlow();go("home");showSummary(cleaned,prs,editIndex!==null);
  };

  window.facOpenExerciseFocus=FAC.openExerciseFocus;
  window.facCloseExerciseFocus=FAC.closeExerciseFocus;
  window.facFinishExerciseFocus=FAC.finishExerciseFocus;
  window.facUpdateFocusRest=FAC.updateFocusRest;

  window.addEventListener("storage",e=>{if(e.key===FAC.key&&state.active)renderWorkout();});
  if(state.active){FAC.saveControl(FAC.loadControl());render();}
})();
