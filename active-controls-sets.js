/* MOVED 2.1 — set shortcuts, undo, deletion, and plate math */
(function(){
  "use strict";
  const FAC=window.MovedActiveControls;

  FAC.openSetMenu=function(ei,si){
    const e=state.active?.exercises?.[ei],s=e?.sets?.[si];if(!e||!s)return;
    const previousLabel=si>0?"Copy previous set":"Copy last workout";
    $("#sheet-title").textContent=`Set ${si+1} · ${e.name}`;
    $("#sheet-body").innerHTML=`
      <div class="fac-set-summary"><b>${s.w||0}${e.cat==='Bodyweight'?' added':' '+state.unit} × ${s.r||0}</b><span>${s.done?'Completed':'Not completed'}${s.warmup?' · warm-up':''}</span></div>
      <div class="fac-action-list">
        <button onclick="facCopyPreviousSet(${ei},${si})"><span>↶</span><b>${previousLabel}</b><small>Reuse weight and reps</small></button>
        <button onclick="facDuplicateSet(${ei},${si})"><span>⧉</span><b>Duplicate set</b><small>Add a matching set below</small></button>
        <button onclick="facApplyWeight(${ei},${si})"><span>↓</span><b>Apply weight to remaining sets</b><small>Completed sets stay untouched</small></button>
        ${FAC.isBarbell(e)?`<button onclick="facOpenPlateCalculator(${ei},${si})"><span>◉</span><b>Plate calculator</b><small>What goes on each side</small></button>`:""}
        <button onclick="facToggleSetDoneFromMenu(${ei},${si})"><span>${s.done?'↩':'✓'}</span><b>${s.done?'Undo “Done”':'Mark set done'}</b><small>${s.done?'Return it to the workout':'Log it without leaving the menu'}</small></button>
        <button class="danger" onclick="facDeleteSet(${ei},${si})"><span>×</span><b>Delete set</b><small>Remove this row</small></button>
      </div>`;
    openSheet();
  };
  FAC.copyPreviousSet=function(ei,si){
    const e=state.active.exercises[ei],s=e.sets[si];let source=null;
    if(si>0)source=e.sets[si-1];
    else{const top=lastTopSet(e.name,state.active.editingIndex);if(top)source={w:top.w,r:top.r,warmup:false};}
    if(!source)return toast("No previous set to copy yet");
    s.w=+source.w||0;s.r=+source.r||0;s.warmup=!!source.warmup;s.done=false;
    closeSheet();FAC.saveAndRender("Previous set copied");
  };
  FAC.duplicateSet=function(ei,si){
    const sets=state.active.exercises[ei].sets,s=sets[si];sets.splice(si+1,0,{w:+s.w||0,r:+s.r||0,done:false,warmup:!!s.warmup});
    closeSheet();FAC.saveAndRender("Set duplicated");
  };
  FAC.applyWeight=function(ei,si){
    const sets=state.active.exercises[ei].sets,weight=+sets[si].w||0;let changed=0;
    sets.forEach((s,i)=>{if(i>si&&!s.done){s.w=weight;changed++;}});
    closeSheet();if(!changed)return toast("No unfinished sets below this one");FAC.saveAndRender(`Weight applied to ${changed} set${changed===1?'':'s'}`);
  };
  FAC.toggleSetDoneFromMenu=function(ei,si){closeSheet();toggleDone(ei,si);};
  FAC.deleteSet=function(ei,si){
    const e=state.active.exercises[ei];if(e.sets.length<=1)return toast("Keep one set, even if it is aspirational");
    if(!confirm(`Delete set ${si+1} from ${e.name}?`))return;
    e.sets.splice(si,1);closeSheet();FAC.saveAndRender("Set deleted");
  };
  FAC.undoLastDone=function(){
    if(!state.active)return;
    for(let ei=state.active.exercises.length-1;ei>=0;ei--){
      const e=state.active.exercises[ei];
      for(let si=e.sets.length-1;si>=0;si--){
        if(e.sets[si].done){
          e.sets[si].done=false;e.collapsed=false;
          state.active.exercises.forEach((x,i)=>{if(i!==ei)x.collapsed=true;});
          cancelRest();FAC.saveAndRender("Last completed set restored");return;
        }
      }
    }
    toast("No completed set to undo");
  };
  FAC.undoExercise=function(ei){
    const e=state.active?.exercises?.[ei];if(!e)return;
    for(let si=e.sets.length-1;si>=0;si--){if(e.sets[si].done){e.sets[si].done=false;e.collapsed=false;cancelRest();FAC.saveAndRender("Set restored");return;}}
  };

  FAC.calculatePlates=function(target,bar,unit){
    const options=unit==="kg"?[25,20,15,10,5,2.5,1.25]:[45,35,25,10,5,2.5];
    const perSide=Math.max(0,(target-bar)/2);let remaining=perSide;const plates=[];
    options.forEach(p=>{const count=Math.floor((remaining+1e-7)/p);if(count){plates.push([p,count]);remaining-=p*count;}});
    const loaded=plates.reduce((t,[p,c])=>t+p*c,0);return{plates,actual:bar+loaded*2,remainder:Math.max(0,remaining)};
  };
  FAC.openPlateCalculator=function(ei,si){
    const e=state.active?.exercises?.[ei],s=e?.sets?.[si];if(!e||!s)return;
    FAC.plateContext={ei,si,target:+s.w||lastTopSet(e.name,state.active.editingIndex)?.w||(state.unit==="kg"?60:135),bar:state.unit==="kg"?20:45};
    $("#sheet-title").textContent=`Plate math · ${e.name}`;FAC.renderPlateCalculator();openSheet();
  };
  FAC.setPlateValue=function(key,value){if(!FAC.plateContext)return;FAC.plateContext[key]=Math.max(0,parseFloat(value)||0);FAC.renderPlateCalculator();};
  FAC.renderPlateCalculator=function(){
    if(!FAC.plateContext)return;
    const {target,bar}=FAC.plateContext,result=FAC.calculatePlates(target,bar,state.unit);
    const plateText=result.plates.length?result.plates.map(([p,c])=>`<span><b>${c}×</b> ${p} ${state.unit}</span>`).join(""):"<span>Bar only</span>";
    $("#sheet-body").innerHTML=`
      <div class="fac-plate-inputs">
        <label class="fac-field"><span>Target weight</span><input type="number" inputmode="decimal" value="${target}" onchange="facSetPlateValue('target',this.value)"></label>
        <label class="fac-field"><span>Bar weight</span><input type="number" inputmode="decimal" value="${bar}" onchange="facSetPlateValue('bar',this.value)"></label>
      </div>
      <div class="fac-chip-row">${(state.unit==="kg"?[20,15,10]:[45,35,15]).map(n=>`<button onclick="facSetPlateValue('bar',${n})">${n} ${state.unit} bar</button>`).join("")}</div>
      <div class="fac-plate-result"><div class="eyebrow">Each side</div><div class="fac-plate-stack">${plateText}</div><div class="fac-loaded">Loaded total: <b>${result.actual} ${state.unit}</b>${result.remainder>.01?` · ${result.remainder.toFixed(2)} ${state.unit} per side short with common plates`:""}</div></div>
      <button class="btn btn-primary spectrum-bg" onclick="closeSheet()">Done</button>`;
  };

  window.facOpenSetMenu=FAC.openSetMenu;
  window.facCopyPreviousSet=FAC.copyPreviousSet;
  window.facDuplicateSet=FAC.duplicateSet;
  window.facApplyWeight=FAC.applyWeight;
  window.facToggleSetDoneFromMenu=FAC.toggleSetDoneFromMenu;
  window.facDeleteSet=FAC.deleteSet;
  window.facUndoLastDone=FAC.undoLastDone;
  window.facUndoExercise=FAC.undoExercise;
  window.facOpenPlateCalculator=FAC.openPlateCalculator;
  window.facSetPlateValue=FAC.setPlateValue;
})();
