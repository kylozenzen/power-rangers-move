const CACHE='moved-v9';
const SHELL=[
  './','./index.html','./app.css','./active-controls.css','./app.js','./manifest.json',
  './active-controls-core.js','./active-controls-sets.js','./active-controls-exercises.js','./active-controls-render.js',
  './data/exercises.js','./data/tiers.js','./data/workout-templates.js',
  './icons/logo-mark.svg','./icons/logo-mark.png','./icons/icon-32.png','./icons/icon-180.png',
  './icons/icon-192.png','./icons/icon-512.png','./icons/maskable-192.png','./icons/maskable-512.png'
];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET')return;
  const url=new URL(e.request.url);
  if(url.origin===location.origin){
    e.respondWith(caches.match(e.request).then(hit=>hit||fetch(e.request).then(res=>{const copy=res.clone();caches.open(CACHE).then(c=>c.put(e.request,copy));return res;}).catch(()=>caches.match('./index.html'))));
  }else if(url.hostname.includes('fonts.g')){
    e.respondWith(caches.match(e.request).then(hit=>hit||fetch(e.request).then(res=>{const copy=res.clone();caches.open(CACHE).then(c=>c.put(e.request,copy));return res;})));
  }
});
