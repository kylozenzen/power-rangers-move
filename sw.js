const CACHE='moved-v15';
const SHELL=[
  './','./index.html','./app.css','./active-controls.css','./active-controls-set-flow.css','./beta-infra.css','./beta-diagnostics.css','./app.js','./manifest.json',
  './active-controls-core.js','./active-controls-sets.js','./active-controls-exercises.js','./active-controls-render.js','./active-controls-inline-edit.js','./beta-infra.js','./beta-diagnostics.js',
  './data/exercises.js','./data/tiers.js','./data/workout-templates.js',
  './icons/logo-mark.svg','./icons/logo-mark.png','./icons/icon-32.png','./icons/icon-180.png',
  './icons/icon-192.png','./icons/icon-512.png','./icons/maskable-192.png','./icons/maskable-512.png'
];

self.addEventListener('install',event=>{
  event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(SHELL.map(url=>new Request(url,{cache:'reload'})))));
});

self.addEventListener('activate',event=>{
  event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim()));
});

self.addEventListener('message',event=>{
  if(event.data?.type==='SKIP_WAITING')self.skipWaiting();
});

async function cachedNavigation(cache,request){
  return (await cache.match(request))||(await cache.match('./index.html'))||(await cache.match('./'));
}

async function navigationResponse(request){
  const cache=await caches.open(CACHE);

  // When the browser already knows there is no connection, do not make a
  // network request first. This keeps installed/offline launches quiet and
  // avoids needlessly poking the OS connectivity layer in airplane mode.
  if(self.navigator?.onLine===false){
    const cached=await cachedNavigation(cache,request);
    if(cached)return cached;
  }

  try{
    const response=await fetch(request);
    if(response&&response.ok)cache.put('./index.html',response.clone());
    return response;
  }catch(_){
    return cachedNavigation(cache,request);
  }
}

async function shellResponse(request){
  const cache=await caches.open(CACHE);
  const cached=await cache.match(request);
  if(cached)return cached;
  try{
    const response=await fetch(request);
    if(response&&response.ok)cache.put(request,response.clone());
    return response;
  }catch(_){
    return Response.error();
  }
}

async function externalResponse(request){
  const cache=await caches.open(CACHE);
  const cached=await cache.match(request);
  if(cached)return cached;
  const response=await fetch(request);
  if(response&&response.ok)cache.put(request,response.clone());
  return response;
}

self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET')return;
  const url=new URL(event.request.url);
  if(event.request.mode==='navigate'&&url.origin===location.origin){
    event.respondWith(navigationResponse(event.request));
    return;
  }
  if(url.origin===location.origin){
    event.respondWith(shellResponse(event.request));
    return;
  }
  if(url.hostname.includes('fonts.g'))event.respondWith(externalResponse(event.request));
});
