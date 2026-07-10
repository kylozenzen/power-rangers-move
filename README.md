# MOVED 2.0

A full three-pass upgrade of MOVED: strength, cardio, mixed sessions, smarter planning, visual polish, and a new identity.

## What changed

### Pass 1 — Functionality
- Strength / Cardio / Both start flow
- Muscle-first workout builder with up to three muscle groups
- Full-body conversion after three selections
- 15 / 25 / 40 / 60-minute generated sessions
- Reorder, swap, and shuffle the suggested plan
- Cardio timer with distance, pace, effort, incline, resistance, and notes
- Mixed strength + cardio sessions
- Warm-up sets excluded from volume and PR calculations
- Exercise notes and effort feedback
- Edit completed sessions
- Save sessions as custom routines
- Backward-compatible import of MOVED v1 local data

### Pass 2 — Visual system
- New “shifted tile” MOVED logo and complete PWA icon pack
- Animated launch screen
- Rebuilt home movement cockpit
- New Strength / Both / Cardio launch cards
- Three-tab mobile navigation
- Refined hierarchy, surfaces, gradients, typography, and microinteractions
- New session cards and cardio interface
- More of MOVED's low-pressure voice throughout

### Pass 3 — Quiet intelligence
- Weight, rep, set-volume, estimated-strength, cardio-length, and pace PRs
- Weekly recap without streaks or guilt
- Training-balance insights
- Suggestions informed by recent muscle use, cardio balance, and “Had more” feedback
- 15-minute full-body generator and 10-minute easy-cardio shortcut
- Strength, cardio, equipment, and muscle analytics

## Deploy
Upload the entire folder to Netlify, or replace the corresponding files in the existing site while keeping the folder structure intact.

The service-worker cache was bumped to `moved-v8`, so installed copies will refresh to the new shell.
