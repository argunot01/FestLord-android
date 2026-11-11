# Batyr's Way — Путь батыра

Android fitness RPG with a steppe-inspired design: a lean beginner grows into a legendary Turkic warrior.

## v0.6
- Redesigned game-style UI: five progression chapters, atmospheric mountains, yurt, wolf, black-and-gold interface.
- Five embedded character art assets, available offline within the Android APK.
- Home screen with character art, selectable progression chapters, rank, XP bar, and game attributes.
- Stage gallery with preview-only character images (does not grant levels).
- Illustrated, lightweight loop animations for pushups, squats, pullups, walks and other exercises (schematics only).
- Seven-day visual activity log and daily workout summary.
- Custom workout editor: user-created exercise name, repetitions or seconds, sets, equipment weight.
- Mark individual sets, count repetitions in focus mode, earn XP once per set, and finish a daily workout for a bonus.
- Reward screen and optional local audio file playback, plus direct HTTPS music streams.
- Keeps data on-device in WebView localStorage; first launch imports previous v0.4 SharedPreferences exercises, XP and goals.

## Current limitations
The character views are 2D illustrations with simple animated exercise diagrams, **not** rigged animated 3D models. XP/attributes are gamification feedback, not measurements of physical strength. The artwork is embedded in the APK, so the main interface works without internet, although music streaming requires access.

## Safety
Earlier debug APK files were blocked by Google Play Protect on the user's device. A successful GitHub Actions build or this UI redesign does not prove the APK is safe to install. Do not disable or bypass Play Protect to install a blocked APK. Investigate the security warning, use a standard signed release, and validate on trusted devices or Play testing channels.

The repository remains `FestLord-android`; Android package ID remains `kz.festlord.app` for update continuity, while app display name is Batyr's Way.

See [DESIGN.md](DESIGN.md).
