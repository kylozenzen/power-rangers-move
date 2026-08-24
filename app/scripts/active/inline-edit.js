/* MOVED 2.1 — keep logged sets editable without shifting the workout */
(function(){
  "use strict";
  const FAC=window.MovedActiveControls;
  if(!FAC||FAC.inlineEditingInstalled)return;
  FAC.inlineEditingInstalled=true;

  FAC.unlockLoggedRows=function(){
    let unlocked=0;
    $$(".fac-set-logged").forEach(row=>{
      if(row.dataset.editable==="true")return;
      const ei=+row.dataset.ei,si=+row.dataset.si;
      const e=state.active?.exercises?.[ei],s=e?.sets?.[si];
      if(!e||!s||!s.done)return;
      row.dataset.editable="true";unlocked++;
      row.classList.add("fac-set-editable");
      row.innerHTML=`
        <div class="si">${si+1}<span class="fac-logged-tick">✓</span></div>
        <div class="numwrap"><button data-focus-key="w-${ei}-${si}-down" onclick="stepSet(${ei},${si},'w',-1)">−</button><input data-focus-key="w-${ei}-${si}-input" type="number" inputmode="decimal" value="${s.w}" onfocus="this.select()" onchange="setVal(${ei},${si},'w',this.value)"><button data-focus-key="w-${ei}-${si}-up" onclick="stepSet(${ei},${si},'w',1)">+</button></div>
        <div class="numwrap"><button data-focus-key="r-${ei}-${si}-down" onclick="stepSet(${ei},${si},'r',-1)">−</button><input data-focus-key="r-${ei}-${si}-input" type="number" inputmode="numeric" value="${s.r}" onfocus="this.select()" onchange="setVal(${ei},${si},'r',this.value)"><button data-focus-key="r-${ei}-${si}-up" onclick="stepSet(${ei},${si},'r',1)">+</button></div>
        <button class="warm-btn ${s.warmup?'on':''}" data-focus-key="wu-${ei}-${si}" onclick="toggleWarmup(${ei},${si})">W</button>
        <button class="fac-set-more" data-focus-key="more-${ei}-${si}" onclick="facOpenSetMenu(${ei},${si})" aria-label="More set actions">•••</button>`;
    });
    if(unlocked)FAC.restoreFocusState?.();
  };

  const baseRenderWorkout=renderWorkout;
  renderWorkout=function(){
    baseRenderWorkout();
    if(state.active)FAC.unlockLoggedRows();
  };

  const baseBindSetGestures=FAC.bindSetGestures;
  FAC.bindSetGestures=function(){
    FAC.unlockLoggedRows();
    baseBindSetGestures?.();
  };

  FAC.logAndAddSet=function(ei){
    const e=state.active?.exercises?.[ei];if(!e)return;
    let si=e.sets.findIndex(s=>!s.done);
    if(si<0){
      const last=e.sets[e.sets.length-1]||{w:0,r:8};
      e.sets.push({w:+last.w||0,r:+last.r||8,done:false,warmup:false});
      si=e.sets.length-1;
    }
    const s=e.sets[si];
    if((+s.r||0)<=0)return toast("Add reps before logging this set");

    s.done=true;haptic();startRest();
    let nextIndex=e.sets.findIndex((x,i)=>i>si&&!x.done);
    if(nextIndex<0){
      e.sets.splice(si+1,0,{w:+s.w||0,r:+s.r||0,done:false,warmup:false});
      nextIndex=si+1;
    }

    /* Focus stays on the Log button: focusing the new weight input would pop the
       mobile keyboard mid-workout. The next row is brought to the eye instead. */
    FAC.pendingFocus=`log-${ei}`;
    save();renderWorkout();

    const current=$(`.fac-set-current[data-ei="${ei}"][data-si="${nextIndex}"]`)||$(`.fac-set-current[data-ei="${ei}"]`);
    current?.scrollIntoView({block:"center",behavior:state.anim===false?"auto":"smooth"});
    toast(`Set ${si+1} logged · next one ready`);
  };

  window.facLogAndAddSet=FAC.logAndAddSet;
  if(state.active)FAC.unlockLoggedRows();
})();
