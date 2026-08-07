/* ============================================================
   MOVED — progress tiers + weight equivalences
   Pure content. Edit the names, thresholds, and reference
   objects freely. Both are used by Home + Analytics.
   ============================================================ */

/* Tiers: name + the lifetime weight (in lb) where it unlocks.
   Keep them sorted ascending by `at`. */
window.TIERS = [
  {n:"Spark",     at:0},
  {n:"Glow",      at:25000},
  {n:"Flux",      at:100000},
  {n:"Surge",     at:250000},
  {n:"Pulse",     at:500000},
  {n:"Current",   at:1000000},
  {n:"Plasma",    at:2500000},
  {n:"Aurora",    at:5000000},
  {n:"Infinity",  at:10000000}
];

/* Weight equivalences for the "that's X" fun-fact.
   Format: [ label, weightInLb, emoji ]. Sorted-ish by weight. */
window.EQUIV = [
  ["a house cat",10,"🐈"],["a car tire",25,"🛞"],["a microwave",40,"📦"],["a sack of cement",94,"🧱"],
  ["a baby grand piano",500,"🎹"],["a vending machine",600,"🥤"],["a grand piano",990,"🎹"],
  ["a horse",1000,"🐎"],["a grizzly bear",1300,"🐻"],["a dairy cow",1400,"🐄"],
  ["a small car",2400,"🚗"],["a sedan",3500,"🚙"],["a pickup truck",5000,"🛻"],
  ["a killer whale",8000,"🐳"],["an elephant",12000,"🐘"],["a T. rex",16000,"🦖"],
  ["a school bus",24000,"🚌"],["a semi truck",35000,"🚛"],["a house",150000,"🏠"],
  ["a blue whale",300000,"🐋"],["a Boeing 747",400000,"✈️"],["the Statue of Liberty",450000,"🗽"],
  ["the Eiffel Tower",16000000,"🗼"]
];
