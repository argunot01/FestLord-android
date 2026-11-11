# Batyr's Way — Путь батыра

Android fitness RPG with a steppe-inspired design: a lean beginner grows into a legendary Turkic warrior.

## v0.8
- Redesigned game-style UI: five progression chapters, atmospheric mountains, yurt, wolf, black-and-gold interface.
- Five distinct 400×600 original Kazakh warrior illustrations packaged as local WebP assets, including the Legend with a wolf. These replace the placeholder portraits.
- Home screen with character art, selectable progression chapters, rank, XP bar, and game attributes.
- Five approved chapters: Новичок (1–10), Боец (11–25), Воин (26–50), Батыр (51–75), Легенда (76–100). Athlete and anime character selection is removed; five fully original, cohesive Turkic-hero artworks are still planned.
- Illustrated, lightweight loop animations for pushups, squats, pullups, walks and other exercises (schematics only).
- Seven-day visual activity log and daily workout summary.
- Level-specific passing score: XP threshold, number of **meaningful sessions**, and repeated personal workload target.
- Progressive level checks are tied to a 3-session baseline (repeatable strength/endurance effort), with a gentle 0.6% relative workload increase per level plus minimum load by rank (12/20/30/45/60); no level unlock from one push-up per day.
- Meaningful workout: at least two sets and at least 12 workout-load points, or at least 10 minutes of cardio (including walking). Only one qualified training session can grant XP per day.
- New deterministic Node regression tests in `tests/progression.test.js`.
- Unverified pre-v0.7 XP remains stored, but old checkboxes are not automatically treated as qualifying workout history.
- Custom workout editor: user-created exercise name, repetitions or seconds, sets, equipment weight.
- Mark individual sets, count repetitions in focus mode, then earn XP for a meaningful completed workout once per day (no individual checkbox XP).
- Reward screen and direct HTTPS music streams.
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
