# Batyr's Way — Путь батыра

Android fitness RPG prototype. Original steppe-inspired theme: mountains, wolf, yurt, gold-and-charcoal palette, and a low-poly 3D hero who begins very thin and gains bulk and armor with levels.

## Working features (v0.4)
- Create your own exercises and choose repetitions or seconds, number of sets, and optional equipment weight.
- Start a focused workout step, count repetitions, confirm completion and mark sets.
- Local exercise plan persistence through SharedPreferences (no account required).
- XP for each set once per day (daily XP cap) and bonus for a finished workout, with levels and five stages.
- Music from the phone and direct HTTPS audio streams.
- Manually save body weight and target weight.

## To develop next
- High-detail original 3D hero artwork (the current OpenGL model is basic geometry).
- Richer animations and editable daily plans.
- Workout history charts and a more complete music library.
- Stable signing and Play Protect classification review.

## Safety
Earlier test APKs were explicitly blocked by Google Play Protect. A new build alone does **not** establish safety or remove the warning. Do not bypass Google Play Protect to install flagged binaries. The source is available for inspection and builds run in GitHub Actions.

## Internal naming
The repository remains `FestLord-android` and the Android package id remains `kz.festlord.app` for continuity, while display name is **Batyr's Way**.
