/* MOVED 2.1 — active-workout control state and session timing */
(function(){
  "use strict";
  const FAC=window.MovedActiveControls={
    key:"moved_active_controls_v1",
    replaceTargetIndex:null,
    replaceQuery:"",
    plateContext:null
  };

  FAC.controlDefaults=()=>({sessionId:state.active?.id??null,pausedAt:null,pausedTotalSec:0,manualDurationSec:null});
  FAC.loadControl=function(){
    const fallback=FAC.controlDefaults();
    if(!state.active)return fallback;
    try{
      const parsed=JSON.parse(localStorage.getItem(FAC.key)||"null");
      if(!parsed||String(parsed.sessionId)!==String(state.active.id))return fallback;
      return {...fallback,...parsed};
    }catch(_){return fallback;}
  };
  FAC.saveControl=function(next){
    if(!state.active)return;
    localStorage.setItem(FAC.key,JSON.stringify({...FAC.controlDefaults(),...next,sessionId:state.active.id}));
  };
  FAC.clearControl=()=>localStorage.removeItem(FAC.key);
  FAC.isEditing=()=>state.active?.editingIndex!==null&&state.active?.editingIndex!==undefined;
  FAC.isPaused=()=>!!FAC.loadControl().pausedAt;
  FAC.elapsed=function(session=state.active){
    if(!session)return 0;
    const ctl=FAC.loadControl();
    if(ctl.manualDurationSec!==null&&ctl.manualDurationSec!==undefined)return Math.max(0,+ctl.manualDurationSec||0);
    if(FAC.isEditing())return +session.originalDurationSec||+session.durationSec||0;
    const end=ctl.pausedAt||Date.now();
    return Math.max(0,(end-(session.startedAt||end))/1000-(+ctl.pausedTotalSec||0));
  };
  FAC.hasDoneSet=()=>!!state.active?.exercises?.some(e=>e.sets?.some(s=>s.done));
  FAC.isBarbell=e=>e?.cat==="Barbell"||/barbell|bench press|deadlift|back squat|front squat|overhead press/i.test(e?.name||"");
  FAC.saveAndRender=function(message){save();renderWorkout();if(message)toast(message);};
  FAC.localDateTimeValue=function(ms){
    const d=new Date(ms||Date.now());
    return new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,16);
  };

  FAC.toggleSessionPause=function(){
    if(!state.active||FAC.isEditing())return;
    const ctl=FAC.loadControl();
    if(ctl.manualDurationSec!==null&&ctl.manualDurationSec!==undefined){toast("Clear the logged duration to use the live timer");return;}
    if(ctl.pausedAt){
      ctl.pausedTotalSec=(+ctl.pausedTotalSec||0)+(Date.now()-ctl.pausedAt)/1000;
      ctl.pausedAt=null;FAC.saveControl(ctl);requestWake();renderWorkout();toast("Session resumed");
    }else{
      (state.active.cardio||[]).forEach(pauseCardio);
      cancelRest();ctl.pausedAt=Date.now();FAC.saveControl(ctl);save();releaseWake();renderWorkout();toast("Session paused");
    }
  };
  FAC.openSessionTime=function(){
    if(!state.active)return;
    const ctl=FAC.loadControl();
    const start=state.active.startedAt||new Date(state.active.date||Date.now()).getTime();
    const duration=Math.round(FAC.elapsed()/60);
    $("#sheet-title").textContent=FAC.isEditing()?"Edit logged time":"Session time";
    $("#sheet-body").innerHTML=`
      <div class="fac-sheet-copy">Change when this session started, or set a fixed duration when logging it afterward.</div>
      <label class="fac-field"><span>Started</span><input id="fac-start-time" type="datetime-local" value="${FAC.localDateTimeValue(start)}" onchange="facSetSessionStart(this.value)"></label>
      <div class="fac-chip-row">${[15,30,45,60].map(n=>`<button onclick="facSetStartOffset(${n})">${n} min ago</button>`).join("")}</div>
      <label class="fac-field"><span>Fixed duration in minutes <small>optional</small></span><input id="fac-duration" type="number" inputmode="numeric" min="1" step="1" value="${ctl.manualDurationSec!==null&&ctl.manualDurationSec!==undefined?Math.round(ctl.manualDurationSec/60):''}" placeholder="Live timer: ${duration} min" onchange="facSetManualDuration(this.value)"></label>
      <div class="fac-chip-row">${[15,30,45,60].map(n=>`<button onclick="facSetManualDuration(${n})">${n} min</button>`).join("")}</div>
      <button class="btn btn-ghost" onclick="facClearManualDuration()">Use live timer</button>
      <button class="btn btn-primary spectrum-bg" style="margin-top:9px" onclick="closeSheet()">Done</button>`;
    openSheet();
  };
  FAC.setSessionStart=function(value){
    if(!state.active)return;
    const ms=new Date(value).getTime();if(!Number.isFinite(ms))return toast("That time did not parse");
    state.active.startedAt=ms;state.active.date=new Date(ms).toISOString();save();renderWorkout();
  };
  FAC.setStartOffset=function(minutes){
    if(!state.active)return;
    const ms=Date.now()-minutes*60000;
    state.active.startedAt=ms;state.active.date=new Date(ms).toISOString();
    const ctl=FAC.loadControl();ctl.pausedAt=null;ctl.pausedTotalSec=0;ctl.manualDurationSec=null;FAC.saveControl(ctl);save();
    const input=$("#fac-start-time");if(input)input.value=FAC.localDateTimeValue(ms);
    renderWorkout();toast(`Started ${minutes} minutes ago`);
  };
  FAC.setManualDuration=function(value){
    if(!state.active)return;
    const minutes=Math.max(0,parseFloat(value)||0),ctl=FAC.loadControl();
    ctl.manualDurationSec=minutes?minutes*60:null;ctl.pausedAt=null;FAC.saveControl(ctl);save();renderWorkout();
    const input=$("#fac-duration");if(input)input.value=minutes||"";
  };
  FAC.clearManualDuration=function(){
    const ctl=FAC.loadControl();ctl.manualDurationSec=null;ctl.pausedAt=null;ctl.pausedTotalSec=0;FAC.saveControl(ctl);
    save();closeSheet();renderWorkout();toast("Live timer restored");
  };

  window.facToggleSessionPause=FAC.toggleSessionPause;
  window.facOpenSessionTime=FAC.openSessionTime;
  window.facSetSessionStart=FAC.setSessionStart;
  window.facSetStartOffset=FAC.setStartOffset;
  window.facSetManualDuration=FAC.setManualDuration;
  window.facClearManualDuration=FAC.clearManualDuration;
})();
