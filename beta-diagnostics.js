/* MOVED beta diagnostics — verify the app can survive a dead signal */
(function(){
  "use strict";
  const MB=window.MovedBeta;if(!MB)return;
  const REQUIRED=[
    './index.html','./app.css','./app.js','./manifest.json','./beta-infra.css','./beta-infra.js',
    './active-controls.css','./active-controls-set-flow.css','./active-controls-core.js','./active-controls-sets.js',
    './active-controls-exercises.js','./active-controls-render.js','./active-controls-inline-edit.js',
    './data/exercises.js','./data/tiers.js','./data/workout-templates.js','./icons/icon-192.png','./icons/icon-512.png'
  ];

  async function canWriteLocalStorage(){
    try{const key='moved_storage_test';localStorage.setItem(key,'1');localStorage.removeItem(key);return true;}catch(_){return false;}
  }

  MB.verifyOffline=async function(){
    $("#sheet-title").textContent="Offline check";
    $("#sheet-body").innerHTML='<div class="beta-diagnostic-loading">Checking the stuff that matters…</div>';
    openSheet();

    let registration=null,missing=[],storageOk=false,persisted=null;
    try{registration=await navigator.serviceWorker?.getRegistration?.();}catch(_){}
    try{
      if('caches' in window){
        const found=await Promise.all(REQUIRED.map(async url=>({url,hit:!!(await caches.match(url))})));
        missing=found.filter(x=>!x.hit).map(x=>x.url);
      }else missing=[...REQUIRED];
    }catch(_){missing=[...REQUIRED];}
    storageOk=await canWriteLocalStorage();
    try{if(navigator.storage?.persisted)persisted=await navigator.storage.persisted();}catch(_){}

    const swOk=!!registration?.active,cacheOk=missing.length===0;
    const overall=swOk&&cacheOk&&storageOk;
    $("#sheet-body").innerHTML=`
      <div class="beta-diagnostic-hero ${overall?'pass':'warn'}"><b>${overall?'Ready for airplane mode':'Needs one more online refresh'}</b><span>${overall?'The core tracker and local storage checks passed.':'MOVED can still work in the browser, but the offline shell is not fully ready yet.'}</span></div>
      <div class="beta-check-list">
        <div><span class="${swOk?'pass':'fail'}">${swOk?'✓':'!'}</span><p><b>Service worker</b><small>${swOk?'Active and controlling the app shell':'Not active yet'}</small></p></div>
        <div><span class="${cacheOk?'pass':'fail'}">${cacheOk?'✓':'!'}</span><p><b>Core files</b><small>${cacheOk?`${REQUIRED.length} required files cached`:`${missing.length} required file${missing.length===1?'':'s'} missing`}</small></p></div>
        <div><span class="${storageOk?'pass':'fail'}">${storageOk?'✓':'!'}</span><p><b>Workout storage</b><small>${storageOk?'Local storage is writable':'Browser storage is blocked'}</small></p></div>
        <div><span class="${persisted===true?'pass':'neutral'}">${persisted===true?'✓':'•'}</span><p><b>Storage persistence</b><small>${persisted===true?'Browser reports persistent storage':persisted===false?'Browser currently uses best-effort storage':'Not reported by this browser'}</small></p></div>
      </div>
      ${missing.length?`<details class="beta-missing"><summary>Missing cached files</summary><div>${missing.map(x=>`<code>${esc(x)}</code>`).join('')}</div></details>`:''}
      <div class="beta-restore-actions"><button class="btn btn-primary spectrum-bg" onclick="location.reload()">${overall?'Reload anyway':'Reload online and retry'}</button><button class="btn btn-ghost" onclick="openSettings()">Back to Settings</button></div>`;
  };

  const originalEnhance=MB.enhanceSettings;
  MB.enhanceSettings=function(){
    originalEnhance?.();
    const row=$("#offline-status-row");if(!row||row.querySelector('.beta-check-button'))return;
    const existing=row.querySelector('.beta-status-dot');if(existing)existing.remove();
    const button=document.createElement('button');button.className='btn btn-ghost btn-small beta-check-button';button.textContent='Check';button.onclick=MB.verifyOffline;row.appendChild(button);
  };

  window.betaVerifyOffline=MB.verifyOffline;
})();
