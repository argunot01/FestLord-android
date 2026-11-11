# Batyr's Way — Путь батыра

Android fitness RPG with a steppe-inspired design: a lean beginner grows into a legendary Turkic warrior.

## v1.3
- Interactive, image-rich game UI matching the approved mobile layout: bright Kazakh-steppe photographs, yurt, mountains, five character chapters, gold-framed navigation, workout cards, focused exercise, and reward screen.
- Five separate full-scene progression illustrations cropped from the approved art. The Legend portrait visibly includes its gray wolf. New vivid scene art is in `app/src/main/assets/scenes/`.
- Restyled interactive hero overview, step-aware workout list and progress, single-exercise session display, and XP reward page. Music library and level qualifications remain in place.
- Five distinct 400×600 original Kazakh warrior illustrations packaged as local WebP assets, including the Legend with a wolf. These replace the placeholder portraits.
- Home screen with character art, selectable progression chapters, rank, XP bar, and game attributes.
- **Skill-specific progression:** strength, endurance, resilience and energy now use logged exercise categories and completed sets, rather than increasing uniformly from XP. Strength from resistance/body-weight exercises; endurance from cardio; resilience from static holds plus small regularity bonus; energy is a small gamified consistency/balance attribute, not a biological measure.
- Automatic exercise classification with explicit override in exercise editor (strength / cardio / stability / mixed); records are snapshotted at workout completion and the reward screen shows real earned skill points. Archived pre-v1.1 workouts without category data are retained but not guessed or retroactively assigned to a category.
- The exercise-category dashboard tracks strength, cardio endurance, stability and mixed sessions separately; rank progression and athletic attributes remain distinct.
- Five real long-term ranks (not 100 micro-levels): 1 Новичок → 2 Боец → 3 Воин → 4 Батыр → 5 Легенда. Later preview remains illustrative; no unlocking via preview.
- Illustrated, lightweight loop animations for pushups, squats, pullups, walks and other exercises (schematics only).
- Seven-day visual activity log and daily workout summary.
- Next-level card shows long-term XP thresholds and real workout forecasts based on the user's plan and workout history, rather than 44% progress after one beginner workout.
- Forecast **qualifying workouts remaining** based on the three stage gates and estimated effort from the planned workout or recorded history. These are NOT consecutive-day instructions; rest and recovery are essential.
- Explain XP: each meaningful completed session gets +30 base XP, +floor(0.7 × workload points) and +5 XP per additional distinct exercise (up to +20 variety XP); max 240 XP/day, no weight-kg multiplier. XP comes from completed workouts, not unchecked plans.
- Stage thresholds in cumulative XP: 1→2 2,400; 2→3 9,600; 3→4 27,600; 4→5 63,600. This corresponds to about 23, 67, 167 and 333 normal 108-XP sessions respectively (rounding may vary), plus qualifying workout-count and load gates.
- Cumulative minimum qualifying sessions for ranks 2–5: 10, 40, 115 and 265. Workout-load gate requires two qualifying sessions among the latest six, based on the user's first three sessions and an incremental rank target. No fixed calendar days; the training count assumes sensible rest.
- Meaningful workout: at least two sets and 12 game workload points, or 10 minutes of cardio (including walking), or two static sets totaling 90 seconds. Up to one XP-granting workout per day. Weights are not used to boost XP for safety.
- New deterministic Node regression tests in `tests/progression.test.js`.
- Unverified pre-v0.7 XP remains stored, but old checkboxes are not automatically treated as qualifying workout history.
- Custom workout editor: user-created exercise name, repetitions or seconds, sets, equipment weight.
- Mark individual sets, count repetitions in focus mode, then earn XP for a meaningful completed workout once per day (no individual checkbox XP).
- Reward screen and direct HTTPS music streams.
- **Full music player:** compact bar displayed throughout the game, tap to expand into track progress slider, elapsed/total time, previous/next, pause/play and stop; automatic next track, repeat-one, repeat-playlist and ordered-once modes. Repeat choice persists after restart. A native Android playback bridge supports duration/time reporting and seeking.
- **SANA-style native music library**: select any supported audio file through Android’s system picker, copy it into app-private storage for offline use, assign a custom title, play/pause/stop and delete it. Imported tracks appear newest first and persist after app restart. Supported audio playback depends on the device codec.
- Audio files stay on device; the app has no access to unrelated files. Deleting a saved track does not delete the original file from the phone.
- Browser preview uses IndexedDB for saving audio; Android uses app-private filesystem via a narrow WebView bridge.
- Keeps data on-device in WebView localStorage; first launch imports previous v0.4 SharedPreferences exercises, XP and goals.

## Current limitations
The characters are five different 2D illustrations with simple animated exercise diagrams, **not** rigged animated 3D models. Further work is needed to harmonize their facial likeness and animation. Training workload is based on self-reported totals; it does **not** medically evaluate ability, technique, or real effort. Increase activity gradually and stop for pain, dizziness, or other concerning symptoms. XP/attributes are gamification feedback, not measurements of physical strength. The artwork is embedded in the APK, so the main interface works without internet, although music streaming requires access.

## Safety
Earlier debug APK files were blocked by Google Play Protect on the user's device. A successful GitHub Actions build or this UI redesign does not prove the APK is safe to install. Do not disable or bypass Play Protect to install a blocked APK. Investigate the security warning, use a standard signed release, and validate on trusted devices or Play testing channels.

The repository remains `FestLord-android`; Android package ID remains `kz.festlord.app` for update continuity, while app display name is Batyr's Way.

See [DESIGN.md](DESIGN.md).

### Long-term progression tuning (v1.3)

| Rank unlocked | Total XP | Minimum distinct qualifying sessions | Moderate (~108 XP/session) | Light (~51 XP/session) | High-volume (240 XP/session) |
|---|---:|---:|---:|---:|---:|
| 2 — Боец | 2,400 | 10 | ~23 total | ~48 total | 10 total |
| 3 — Воин | 9,600 | 40 | ~89 total | ~189 total | 40 total |
| 4 — Батыр | 27,600 | 115 | ~256 total | ~542 total | 115 total |
| 5 — Легенда | 63,600 | 265 | ~589 total | ~1,248 total | 265 total |

Workout totals are cumulative and illustrative, not promises. Actual outcome also depends on the personalised load gate; high-volume sessions must be physically appropriate, and adequate rest is recommended. No body movement is independently verified by the app.
