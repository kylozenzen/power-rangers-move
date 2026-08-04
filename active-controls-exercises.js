/* MOVED 2.1 — quick notes and in-workout exercise replacement */
(function(){
  "use strict";
  const FAC=window.MovedActiveControls;
  const noteChips=["Felt good","Increase next time","Keep this weight","Form needs work","Pain / discomfort","Equipment busy"];

  FAC.openQuickNote=function(ei){
    const e=state.active?.exercises?.[ei];if(!e)return;
    $("#sheet-title").textContent=`Quick note · ${e.name}`;
    $("#sheet-body").innerHTML=`
      <div class="fac-sheet-copy">Tap a note and keep moving. The keyboard stays out of this unless invited.</div>
      <div class="fac-note-chips">${noteChips.map((x,i)=>`<button onclick="facChooseQuickNote(${ei},${i})">${x}</button>`).join("")}</div>
      <label class="fac-field"><span>Custom note</span><textarea id="fac-note-text" rows="4" placeholder="Anything worth remembering?">${esc(e.note||"")}</textarea></label>
      <button class="btn btn-primary spectrum-bg" onclick="facSaveCustomNote(${ei})">Save note</button>`;
    openSheet();
  };
  FAC.chooseQuickNote=function(ei,index){
    const e=state.active.exercises[ei],note=noteChips[index];if(!note)return;
    e.note=e.note&&e.note!==note?`${e.note} · ${note}`:note;closeSheet();FAC.saveAndRender("Quick note added");
  };
  FAC.saveCustomNote=function(ei){
    const e=state.active.exercises[ei],input=$("#fac-note-text");e.note=input?.value?.trim()||"";closeSheet();FAC.saveAndRender(e.note?"Note saved":"Note cleared");
  };

  FAC.openReplaceExercise=function(ei){
    FAC.replaceTargetIndex=ei;FAC.replaceQuery="";$("#sheet-title").textContent=`Replace ${state.active.exercises[ei].name}`;FAC.renderReplacePicker();openSheet();
  };
  FAC.setReplaceQuery=function(value){
    FAC.replaceQuery=value;FAC.renderReplacePicker();
    setTimeout(()=>{const q=$("#fac-replace-q");q?.focus();q?.setSelectionRange(q.value.length,q.value.length);},0);
  };
  FAC.renderReplacePicker=function(){
    const index=FAC.replaceTargetIndex;if(index===null)return;
    const q=FAC.replaceQuery.trim().toLowerCase();
    const list=LIB.filter(row=>!q||`${row[0]} ${row[1]} ${row[3]}`.toLowerCase().includes(q)).filter(row=>row[0]!==state.active.exercises[index].name).slice(0,60);
    const custom=FAC.replaceQuery.trim()&&!LIB.some(row=>row[0].toLowerCase()===q);
    $("#sheet-body").innerHTML=`
      <div class="fac-sheet-copy">The set rows stay in place. Completed states reset so the replacement does not inherit accidental glory.</div>
      <div class="search"><svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4-4"/></svg><input id="fac-replace-q" placeholder="Search exercises…" value="${esc(FAC.replaceQuery)}" oninput="facSetReplaceQuery(this.value)"></div>
      <div class="fac-replace-list">
        ${custom?`<button onclick="facCommitReplace('${escAttr(FAC.replaceQuery.trim())}')"><span class="pill">NEW</span><b>Add “${esc(FAC.replaceQuery.trim())}”</b><small>Custom exercise</small></button>`:""}
        ${list.map(row=>`<button onclick="facCommitReplace('${escAttr(row[0])}')"><span class="pill">${row[1].slice(0,3)}</span><b>${esc(row[0])}</b><small>${row[3]} · ${row[1]}</small></button>`).join("")}
        ${!list.length&&!custom?`<div class="picker-empty">No replacement found.</div>`:""}
      </div>`;
  };
  FAC.commitReplace=function(name){
    const index=FAC.replaceTargetIndex,old=state.active?.exercises?.[index];if(index===null||!old)return;
    const row=findEx(name)||[],top=lastTopSet(name,state.active.editingIndex);
    const sets=(old.sets.length?old.sets:[{w:0,r:8,warmup:false}]).map(s=>({w:top?.w||0,r:top?.r||s.r||8,done:false,warmup:!!s.warmup}));
    state.active.exercises[index]={name,cat:row[1]||"Custom",tip:row[2]||"",muscle:row[3]||"Other",note:"",effort:"",collapsed:false,sets};
    state.active.exercises.forEach((e,i)=>{if(i!==index)e.collapsed=true;});
    FAC.replaceTargetIndex=null;FAC.replaceQuery="";closeSheet();FAC.saveAndRender(`${name} swapped in`);
  };

  window.facOpenQuickNote=FAC.openQuickNote;
  window.facChooseQuickNote=FAC.chooseQuickNote;
  window.facSaveCustomNote=FAC.saveCustomNote;
  window.facOpenReplaceExercise=FAC.openReplaceExercise;
  window.facSetReplaceQuery=FAC.setReplaceQuery;
  window.facCommitReplace=FAC.commitReplace;
})();
