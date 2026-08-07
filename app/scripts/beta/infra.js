/* MOVED beta reliability — install, offline status, backups, and recovery */
(function(){
  "use strict";

  const APP_VERSION="2.1-beta.1";
  const BACKUP_FORMAT="moved-backup";
  const BACKUP_SCHEMA=2;
  const RECOVERY_KEY="moved_recovery_v1";
  const RECOVERY_STAMP_KEY="moved_recovery_stamp_v1";
  const OFFLINE_READY_KEY="moved_offline_ready_v12";
  const MB=window.MovedBeta={version:APP_VERSION,pendingImport:null,registration:null,offlineReady:false};

  function clone(v){return JSON.parse(JSON.stringify(v));}
  function isStandalone(){return !!(window.matchMedia?.("(display-mode: standalone)").matches||navigator.standalone===true);}
  function platform(){
    const ua=navigator.userAgent||"";
    const ios=/iPad|iPhone|iPod/.test(ua)||(navigator.platform==="MacIntel"&&navigator.maxTouchPoints>1);
    if(ios)return"ios";
    if(/Android/i.test(ua))return"android";
    return"desktop";
  }
  function dateLabel(value){
    const d=new Date(value);return Number.isNaN(d.getTime())?"Unknown":d.toLocaleString([], {month:"short",day:"numeric",year:"numeric",hour:"numeric",minute:"2-digit"});
  }
  function fileDate(){return new Date().toISOString().slice(0,10);}
  function snapshotSummary(data){
    const workouts=Array.isArray(data?.workouts)?data.workouts:[];
    const routines=Array.isArray(data?.customRoutines)?data.customRoutines:[];
    const latest=workouts.reduce((best,w)=>!best||new Date(w.date)>new Date(best)?w.date:best,null);
    return{workouts:workouts.length,routines:routines.length,latest};
  }

  MB.createRecoverySnapshot=function(reason="Automatic safety snapshot",force=false){
    try{
      if(!force){
        const last=+(localStorage.getItem(RECOVERY_STAMP_KEY)||0);
        if(Date.now()-last<24*60*60*1000)return false;
      }
      const payload={format:BACKUP_FORMAT,schemaVersion:BACKUP_SCHEMA,appVersion:APP_VERSION,exportedAt:new Date().toISOString(),reason,data:clone(state)};
      localStorage.setItem(RECOVERY_KEY,JSON.stringify(payload));
      localStorage.setItem(RECOVERY_STAMP_KEY,String(Date.now()));
      return true;
    }catch(err){console.warn("MOVED recovery snapshot failed",err);return false;}
  };

  MB.readRecovery=function(){
    try{const raw=localStorage.getItem(RECOVERY_KEY);return raw?JSON.parse(raw):null;}catch(_){return null;}
  };

  MB.makeBackup=function(){
    return{format:BACKUP_FORMAT,schemaVersion:BACKUP_SCHEMA,appVersion:APP_VERSION,exportedAt:new Date().toISOString(),data:clone(state)};
  };

  MB.normalizeImport=function(raw){
    if(!raw||typeof raw!=="object"||Array.isArray(raw))throw new Error("Backup is not an object");
    const source=raw.format===BACKUP_FORMAT?raw.data:raw;
    if(!source||typeof source!=="object"||Array.isArray(source))throw new Error("Backup does not contain MOVED data");
    if(source.workouts!==undefined&&!Array.isArray(source.workouts))throw new Error("Workout history is invalid");
    if(source.customRoutines!==undefined&&!Array.isArray(source.customRoutines))throw new Error("Saved routines are invalid");
    if(source.unit!==undefined&&!['lb','kg'].includes(source.unit))throw new Error("Weight unit is invalid");
    if(source.distanceUnit!==undefined&&!['mi','km'].includes(source.distanceUnit))throw new Error("Distance unit is invalid");

    const normalized={...clone(DEFAULTS),...clone(source)};
    normalized.workouts=(source.workouts||[]).map(migrateSession);
    normalized.active=source.active?migrateSession(source.active):null;
    normalized.customRoutines=Array.isArray(source.customRoutines)?clone(source.customRoutines):[];
    normalized.unit=source.unit||"lb";
    normalized.distanceUnit=source.distanceUnit||"mi";
    normalized.version=2;
    return normalized;
  };

  function importMeta(raw,data){
    const summary=snapshotSummary(data);
    return{
      exportedAt:raw?.exportedAt||null,
      appVersion:raw?.appVersion||"Older MOVED backup",
      summary,
      canMerge:data.unit===state.unit&&data.distanceUnit===state.distanceUnit
    };
  }

  MB.showImportPreview=function(raw,label="Backup file"){
    try{
      const data=MB.normalizeImport(raw),meta=importMeta(raw,data);
      MB.pendingImport={data,meta,label};
      $("#sheet-title").textContent="Restore MOVED data";
      $("#sheet-body").innerHTML=`
        <div class="beta-import-card">
          <div class="eyebrow">${esc(label)}</div>
          <div class="beta-import-count"><b>${meta.summary.workouts}</b><span>workouts</span><b>${meta.summary.routines}</b><span>routines</span></div>
          <p>${meta.summary.latest?`Latest workout: <b>${esc(dateLabel(meta.summary.latest))}</b>.`:"No saved workouts in this backup."}</p>
          <p>${meta.exportedAt?`Backup created ${esc(dateLabel(meta.exportedAt))}.`:"Legacy MOVED backup detected."}</p>
        </div>
        ${!meta.canMerge?`<div class="beta-warning"><b>Merge unavailable</b><span>This backup uses different weight or distance units. Replace is safer because MOVED stores those values using the app-wide unit setting.</span></div>`:""}
        <div class="beta-restore-actions">
          ${meta.canMerge?`<button class="btn btn-ghost" onclick="betaApplyImport('merge')">Merge history<small>Keep current settings and add missing workouts</small></button>`:""}
          <button class="btn btn-primary spectrum-bg" onclick="betaApplyImport('replace')">Replace with backup<small>Creates a recovery snapshot first</small></button>
          <button class="btn btn-ghost" onclick="openSettings()">Cancel</button>
        </div>`;
      openSheet();
    }catch(err){console.warn(err);toast(err.message||"That does not look like a MOVED backup");}
  };

  MB.mergeData=function(incoming){
    const currentActive=state.active?clone(state.active):null;
    const seen=new Set((state.workouts||[]).map(w=>`${w.id}|${w.date}`));
    const workouts=[...(state.workouts||[]).map(migrateSession)];
    incoming.workouts.forEach(w=>{const key=`${w.id}|${w.date}`;if(!seen.has(key)){seen.add(key);workouts.push(migrateSession(w));}});
    workouts.sort((a,b)=>new Date(a.date)-new Date(b.date));

    const routines=[...(state.customRoutines||[])];
    const routineSeen=new Set(routines.map(r=>JSON.stringify(r)));
    incoming.customRoutines.forEach(r=>{const key=JSON.stringify(r);if(!routineSeen.has(key)){routineSeen.add(key);routines.push(clone(r));}});

    state={...state,workouts,customRoutines:routines,active:currentActive||incoming.active||null};
  };

  MB.applyImport=function(mode){
    const pending=MB.pendingImport;if(!pending)return;
    MB.createRecoverySnapshot("Before data restore",true);
    if(mode==="merge")MB.mergeData(pending.data);
    else state={...clone(DEFAULTS),...clone(pending.data),workouts:pending.data.workouts.map(migrateSession),active:pending.data.active?migrateSession(pending.data.active):null,customRoutines:clone(pending.data.customRoutines||[])};
    save();MB.pendingImport=null;closeSheet();go("home");toast(mode==="merge"?"Backup merged":"Backup restored");
  };

  MB.restoreRecovery=function(){
    const recovery=MB.readRecovery();if(!recovery)return toast("No recovery snapshot yet");
    MB.showImportPreview(recovery,"Recovery snapshot");
  };

  const originalExport=exportData;
  exportData=function(){
    try{
      const blob=new Blob([JSON.stringify(MB.makeBackup(),null,2)],{type:"application/json"});
      const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=`moved-backup-${fileDate()}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),0);toast("Backup downloaded");
    }catch(err){console.warn(err);originalExport();}
  };

  importData=function(input){
    const f=input?.files?.[0];if(!f)return;
    const r=new FileReader();
    r.onload=()=>{try{MB.showImportPreview(JSON.parse(r.result),f.name);}catch(_){toast("Could not read that backup");}};
    r.onerror=()=>toast("Could not read that backup");
    r.readAsText(f);input.value="";
  };

  wipe=function(){
    if(!confirm("Clear every workout and saved routine from this device? MOVED will create a recovery snapshot first."))return;
    MB.createRecoverySnapshot("Before clearing MOVED data",true);
    state={...clone(DEFAULTS),name:state.name,unit:state.unit,distanceUnit:state.distanceUnit};
    save();closeSheet();go("home");toast("Cleared · recovery snapshot saved");
  };

  function installCopy(){
    const p=platform();
    if(isStandalone())return{title:"Installed",copy:"MOVED is already running as an installed app on this device.",button:"Installed"};
    if(p==="ios")return{title:"Install on iPhone / iPad",copy:"Open MOVED in Safari, tap Share, then Add to Home Screen.",button:"Show steps"};
    if(p==="android")return{title:"Install on Android",copy:"Use Install app or Add to Home screen from Chrome. If the install prompt is available, MOVED can open it directly.",button:"Install"};
    return{title:"Install on desktop",copy:"Chrome and Edge can install MOVED from the address bar or browser menu. If available, MOVED can open the install prompt directly.",button:"Install"};
  }

  MB.openInstallHelp=function(){
    const p=platform(),copy=installCopy();
    $("#sheet-title").textContent=copy.title;
    const steps=p==="ios"?["Open this page in Safari.","Tap the Share button.","Choose Add to Home Screen.","Tap Add. MOVED will open without browser chrome and keep working offline after its files are cached."]:
      p==="android"?["Open MOVED in Chrome.","Tap Install when offered, or open the browser menu.","Choose Install app or Add to Home screen.","Launch MOVED from the new home-screen icon."]:
      ["Open MOVED in Chrome or Edge.","Use the install icon in the address bar or the browser menu.","Choose Install MOVED.","Launch it from your apps or dock like any other application."];
    $("#sheet-body").innerHTML=`<div class="beta-install-status ${MB.offlineReady?'ready':''}"><b>${MB.offlineReady?'Offline files ready':'Preparing offline files'}</b><span>${MB.offlineReady?'The core tracker is cached on this device.':'Keep this page open briefly while the app shell finishes caching.'}</span></div><ol class="beta-steps">${steps.map(x=>`<li>${esc(x)}</li>`).join("")}</ol><button class="btn btn-ghost" onclick="openSettings()">Back to Settings</button>`;
    openSheet();
  };

  const originalDoInstall=doInstall;
  doInstall=async function(){
    if(isStandalone())return toast("MOVED is already installed");
    try{
      if(typeof deferredPrompt!=="undefined"&&deferredPrompt){await originalDoInstall();return;}
    }catch(_){}
    MB.openInstallHelp();
  };

  refreshInstallRow=function(){
    const row=$("#install-row");if(!row)return;
    const copy=installCopy(),small=row.querySelector("small"),btn=row.querySelector("button");
    row.classList.remove("hide");
    if(small)small.textContent=isStandalone()?"Running from your home screen":copy.copy;
    if(btn){btn.textContent=copy.button;btn.disabled=isStandalone();}
  };

  function statusText(){
    if(!navigator.onLine)return["Offline","MOVED is running without a network connection."];
    if(MB.offlineReady)return["Ready offline","Core workout files are cached on this device."];
    return["Preparing offline use","The service worker is caching the tracker."];
  }

  MB.enhanceSettings=function(){
    const body=$("#sheet-body");if(!body)return;
    const installRow=$("#install-row");
    if(installRow&&!body.querySelector("#offline-status-row")){
      const [title,copy]=statusText(),row=document.createElement("div");
      row.className="srow";row.id="offline-status-row";
      row.innerHTML=`<div class="lab">${esc(title)}<small>${esc(copy)}</small></div><span class="beta-status-dot ${navigator.onLine&&MB.offlineReady?'ready':navigator.onLine?'working':'offline'}"></span>`;
      installRow.before(row);
    }

    const exportBtn=body.querySelector('button[onclick="exportData()"]');
    if(exportBtn){const lab=exportBtn.closest('.srow')?.querySelector('.lab');if(lab)lab.innerHTML='Backup MOVED<small>Download a versioned copy of workouts, routines, settings, and any active session</small>';exportBtn.textContent='Backup';}
    const importBtn=body.querySelector('button[onclick*="document.getElementById(\'imp\')"]');
    if(importBtn){const lab=importBtn.closest('.srow')?.querySelector('.lab');if(lab)lab.innerHTML='Restore backup<small>Preview first, then merge or replace safely</small>';importBtn.textContent='Restore';}

    const clearBtn=body.querySelector('button[onclick="wipe()"]');
    const recovery=MB.readRecovery();
    if(clearBtn&&recovery&&!body.querySelector('#recovery-row')){
      const summary=snapshotSummary(recovery.data),row=document.createElement('div');
      row.className='srow';row.id='recovery-row';
      row.innerHTML=`<div class="lab">Recovery snapshot<small>${summary.workouts} workouts · ${esc(dateLabel(recovery.exportedAt))}</small></div><button class="btn btn-ghost btn-small" onclick="betaRestoreRecovery()">Review</button>`;
      clearBtn.closest('.srow').before(row);
    }

    const footer=[...body.querySelectorAll('p')].find(p=>p.textContent.includes('MOVED 2.0'));
    if(footer)footer.innerHTML=`MOVED ${APP_VERSION} · beta · local-first<br>Your workout history stays on this device unless you export it.`;
    refreshInstallRow();
  };

  const originalOpenSettings=openSettings;
  openSettings=function(){originalOpenSettings();setTimeout(MB.enhanceSettings,0);};

  function ensureConnectivityBadge(){
    let badge=document.getElementById('moved-offline-badge');
    if(!badge){badge=document.createElement('div');badge.id='moved-offline-badge';badge.className='beta-offline-badge';badge.textContent='Offline · still moving';document.body.appendChild(badge);}
    badge.classList.toggle('show',!navigator.onLine);
  }

  MB.showUpdate=function(reg){
    if(document.getElementById('moved-update'))return;
    const el=document.createElement('div');el.id='moved-update';el.className='beta-update';
    el.innerHTML=`<div><b>MOVED update ready</b><span>Reload when you are between sets.</span></div><button onclick="betaApplyUpdate()">Update</button>`;
    document.body.appendChild(el);MB.registration=reg;
  };

  MB.applyUpdate=function(){
    const waiting=MB.registration?.waiting;if(!waiting)return location.reload();
    MB.reloading=true;waiting.postMessage({type:'SKIP_WAITING'});
  };

  MB.registerServiceWorker=async function(){
    if(!('serviceWorker' in navigator))return;
    try{
      const reg=await navigator.serviceWorker.register('sw.js',{updateViaCache:'none'});MB.registration=reg;
      const ready=await navigator.serviceWorker.ready;MB.offlineReady=true;
      try{if(!localStorage.getItem(OFFLINE_READY_KEY)){localStorage.setItem(OFFLINE_READY_KEY,'1');toast('MOVED is ready offline');}}catch(_){}
      if(reg.waiting&&navigator.serviceWorker.controller)MB.showUpdate(reg);
      reg.addEventListener('updatefound',()=>{
        const worker=reg.installing;if(!worker)return;
        worker.addEventListener('statechange',()=>{if(worker.state==='installed'&&navigator.serviceWorker.controller)MB.showUpdate(reg);});
      });
      ready.update?.().catch(()=>{});
      if(route==='settings')MB.enhanceSettings();
    }catch(err){console.warn('MOVED service worker setup failed',err);}
  };

  window.betaApplyImport=MB.applyImport;
  window.betaRestoreRecovery=MB.restoreRecovery;
  window.betaApplyUpdate=MB.applyUpdate;

  window.addEventListener('online',()=>{ensureConnectivityBadge();if($("#offline-status-row"))openSettings();});
  window.addEventListener('offline',()=>{ensureConnectivityBadge();if($("#offline-status-row"))openSettings();});
  navigator.serviceWorker?.addEventListener('controllerchange',()=>{if(MB.reloading)location.reload();});

  MB.createRecoverySnapshot("Daily automatic safety snapshot");
  ensureConnectivityBadge();
  window.addEventListener('load',MB.registerServiceWorker,{once:true});
})();
