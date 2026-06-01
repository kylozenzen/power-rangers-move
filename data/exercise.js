/* ============================================================
   MOVED — exercise library
   Format: [ name, equipment, formTip, muscleGroup ]
   equipment: Barbell | Dumbbell | Machine | Bodyweight
   muscle:    Chest | Back | Shoulders | Arms | Legs | Core
   Edit freely — this file is pure content, no logic.
   ============================================================ */
window.LIB = [
  // --- Barbell ---
  ["Barbell Bench Press","Barbell","Squeeze shoulder blades together, lower bar to mid-chest, drive feet into floor.","Chest"],
  ["Back Squat","Barbell","Brace your core, sit back and down, keep knees tracking over toes.","Legs"],
  ["Deadlift","Barbell","Bar over mid-foot, flat back, push the floor away. Don't yank it.","Back"],
  ["Overhead Press","Barbell","Squeeze glutes, bar travels straight up past your nose, finish overhead.","Shoulders"],
  ["Barbell Row","Barbell","Hinge ~45°, pull to lower ribs, control the lowering.","Back"],
  ["Romanian Deadlift","Barbell","Soft knees, push hips back, feel the hamstring stretch, flat back.","Legs"],
  ["Front Squat","Barbell","Elbows high, upright torso, drive up through mid-foot.","Legs"],
  ["Barbell Curl","Barbell","Elbows pinned to sides, no swinging, control the lowering.","Arms"],
  ["Close-Grip Bench Press","Barbell","Hands ~shoulder width, elbows tucked, press through the triceps.","Arms"],
  ["Hip Thrust","Barbell","Shoulders on bench, drive hips up, squeeze glutes hard at the top.","Legs"],

  // --- Dumbbell ---
  ["Dumbbell Bench Press","Dumbbell","Lower deep for stretch, press up and slightly together at the top.","Chest"],
  ["Dumbbell Shoulder Press","Dumbbell","Press up without flaring elbows too wide, control the descent.","Shoulders"],
  ["Dumbbell Curl","Dumbbell","Keep elbows pinned, no swinging, squeeze at the top.","Arms"],
  ["Dumbbell Row","Dumbbell","Flat back, pull elbow past your ribs, slow on the way down.","Back"],
  ["Lateral Raise","Dumbbell","Lead with elbows, raise to shoulder height, light weight wins here.","Shoulders"],
  ["Dumbbell Lunge","Dumbbell","Step into a tall lunge, back knee toward floor, drive through front heel.","Legs"],
  ["Incline Dumbbell Press","Dumbbell","30-45° bench, lower under control, press without locking hard.","Chest"],
  ["Hammer Curl","Dumbbell","Neutral grip, elbows fixed, controlled tempo both directions.","Arms"],
  ["Goblet Squat","Dumbbell","Hold one bell at your chest, sit straight down, elbows inside knees.","Legs"],
  ["Dumbbell Fly","Dumbbell","Slight elbow bend, wide arc, stretch the chest, squeeze back together.","Chest"],
  ["Rear Delt Fly","Dumbbell","Hinge forward, raise out to the sides, lead with the elbows.","Shoulders"],
  ["Overhead Tricep Extension","Dumbbell","Elbows by your ears, lower behind the head, extend fully.","Arms"],

  // --- Machine ---
  ["Leg Press","Machine","Feet shoulder-width, don't lock knees at top, control the negative.","Legs"],
  ["Lat Pulldown","Machine","Pull bar to upper chest, drive elbows down, don't lean back too far.","Back"],
  ["Seated Cable Row","Machine","Chest up, pull to your stomach, squeeze, slow return.","Back"],
  ["Leg Curl","Machine","Full range, squeeze hamstrings at the top, no jerking.","Legs"],
  ["Leg Extension","Machine","Pause at the top, control down, don't slam the stack.","Legs"],
  ["Chest Press Machine","Machine","Set seat so handles align mid-chest, press without shrugging.","Chest"],
  ["Pec Deck","Machine","Slight elbow bend, squeeze chest, smooth arc both ways.","Chest"],
  ["Cable Tricep Pushdown","Machine","Elbows glued to sides, full extension, control back up.","Arms"],
  ["Cable Bicep Curl","Machine","Elbows steady, curl with the cable's constant tension, squeeze.","Arms"],
  ["Seated Calf Raise","Machine","Full stretch at the bottom, rise high onto the toes, pause.","Legs"],
  ["Cable Lateral Raise","Machine","Constant tension, lead with the elbow to shoulder height.","Shoulders"],
  ["Face Pull","Machine","Pull rope to your face, elbows high, squeeze the rear delts.","Shoulders"],
  ["Cable Crunch","Machine","Kneel, round the spine down, crunch with the abs not the hips.","Core"],

  // --- Bodyweight ---
  ["Pull-up","Bodyweight","Dead hang start, pull chest to bar, control the lowering.","Back"],
  ["Push-up","Bodyweight","Body in a straight line, elbows ~45°, full range each rep.","Chest"],
  ["Dip","Bodyweight","Lean slightly forward, lower until shoulders ~parallel, press up.","Chest"],
  ["Plank","Bodyweight","Straight line head to heels, brace, breathe. Log seconds in reps.","Core"],
  ["Bodyweight Squat","Bodyweight","Sit back and down, chest up, full depth, control the rise.","Legs"],
  ["Chin-up","Bodyweight","Underhand grip, pull till chin clears bar, slow negative.","Back"],
  ["Hanging Leg Raise","Bodyweight","Dead hang, raise legs with control, no swinging.","Core"],
  ["Bulgarian Split Squat","Bodyweight","Rear foot elevated, drop straight down, drive through the front heel.","Legs"],
  ["Pike Push-up","Bodyweight","Hips high, head between hands, press like a vertical push.","Shoulders"],
  ["Russian Twist","Bodyweight","Lean back, rotate side to side, keep the core braced.","Core"]
];

/* Equipment categories + their accent colors (used by picker + analytics) */
window.CATS = ["All","Barbell","Dumbbell","Machine","Bodyweight"];
window.CAT_COLOR = {Barbell:"#ff3da6",Dumbbell:"#2dd4ff",Machine:"#a855f7",Bodyweight:"#5b8cff",Custom:"#ff7ad9"};

/* Muscle groups + their colors (used by the muscle filter + muscle analytics) */
window.MUSCLES = ["Chest","Back","Shoulders","Arms","Legs","Core"];
window.MUSCLE_COLOR = {Chest:"#ff3da6",Back:"#5b8cff",Shoulders:"#2dd4ff",Arms:"#ff7ad9",Legs:"#a855f7",Core:"#c14bff",Other:"#6f6b82"};
