/*
 * Batyr's Way v0.7 — progressive, attainable, anti-farming rank qualification.
 * XP alone cannot unlock a level; the player also needs real-session history
 * and to meet a personally calibrated training-load benchmark.
 *
 * Workout logs are self-reported: no phone can validate physical movement here.
 */
(function () {
  "use strict";

  ranks.splice(0, ranks.length, "", "Новичок", "Боец", "Воин", "Батыр", "Легенда");

  state.trainingHistory = state.trainingHistory || {};
  state.baselineLoads = Array.isArray(state.baselineLoads) ? state.baselineLoads : [];
  state.lastReward = state.lastReward || null;

  // One unique game character throughout; no separate athlete/anime selection.
  heroIndex = function () {
    const n = state.previewStage || stage();
    return [0, 0, 1, 2, 3, 4][Math.max(1, Math.min(5, n))];
  };

  // Five real hero levels. Inter-stage increments approximate 23, 70, 170,
  // and 340 moderate sessions. These are training estimates, not fixed days.
  const rankXP = [0, 0, 2400, 9600, 27600, 63600];
  const rankSessions = [0, 0, 10, 40, 115, 265];
  const rankFloors = [0, 12, 20, 35, 50, 65];
  const rankFactors = [0, 0, .90, 1.04, 1.14, 1.25];
  const levelXP = n => rankXP[Math.min(5, Math.max(1, Math.floor(n)||1))];
  const requiredSessions = n => rankSessions[Math.min(5, Math.max(1, Math.floor(n)||1))];
  const history = () => Object.entries(state.trainingHistory)
    .filter(([, v]) => v && Number.isFinite(Number(v.load)) && Number(v.load) >= 12)
    .sort((a, b) => b[0].localeCompare(a[0]));
  const completedSessions = () => history().length;
  const baseline = () => {
    const values = state.baselineLoads.slice(0, 3).filter(x => Number.isFinite(x) && x >= 12);
    return values.length
      ? values.reduce((a, b) => a + b, 0) / values.length
      : 12;
  };
  const targetLoad = n => {
    const rank = Math.min(5,Math.max(1,Math.floor(n)||1));
    return rank===1 ? 12 : Math.max(rankFloors[rank],Math.ceil(baseline()*rankFactors[rank]));
  };
  const recentLoads = () => history().slice(0, 6).map(([, v]) => Number(v.load));
  const loadPassCount = n => recentLoads().filter(x => x >= targetLoad(n)).length;
  const qualifiesFor = n => state.xp >= levelXP(n)
    && completedSessions() >= requiredSessions(n)
    && loadPassCount(n) >= 2;

  // Keep legacy XP but don't count unverified legacy checkbox taps as completed workouts.
  level = function () {
    // Once earned, a rank is never taken away because of a rest day,
    // a lighter rehab day or later changes to the last-six-session window.
    let n = Math.max(1,Math.min(5,Math.floor(Number(state.highestRank)||1)));
    while (n < 5 && qualifiesFor(n + 1)) n++;
    if(n>(Number(state.highestRank)||1)) {
      state.highestRank=n;
      save();
    }
    return n;
  };
  stage = function () { return level(); };

  function workoutLoad(check = isDone) {
    let sets = 0, reps = 0, seconds = 0, cardioSeconds = 0, stabilitySeconds = 0;
    const distinctNames = new Set();
    state.ex.forEach(x => {
      for (let n = 1; n <= x.sets; n++) {
        if (!check(x, n)) continue;
        sets++;
        distinctNames.add(String(x.name||"").toLowerCase().trim());
        if (x.kind === "Секунды") {
          seconds += x.amount;
          const className = typeof window !== "undefined" && typeof window.BATYR_GET_CATEGORY === "function"
            ? window.BATYR_GET_CATEGORY(x)
            : /ходь|бег|вел|плаван|эллип|кардио|прогул|шаг|жүру|walking|cycling|run/i.test(x.name)
              ? "cardio" : /планк|удерж|статич|изометр/i.test(x.name) ? "stability" : "other";
          if (className === "cardio") cardioSeconds += x.amount;
          if (className === "stability") stabilitySeconds += x.amount;
        }
        else reps += x.amount;
      }
    });
    // Comparable in-app workload units. No bonus for selecting unsafe heavy weight.
    const load = Math.round((reps + (seconds - stabilitySeconds) / 20 + stabilitySeconds / 7.5) * 10) / 10;
    const exerciseCount = distinctNames.size;
    return {sets, reps, seconds, cardioSeconds, stabilitySeconds, exerciseCount, load};
  }
  function meaningful(w) {
    return (w.sets >= 2 && w.load >= 12) ||
      (w.cardioSeconds >= 600 && w.load >= 12) ||
      (w.sets >= 2 && w.stabilitySeconds >= 90);
  }
  function xpBreakdown(load, exerciseCount = 1) {
    const base=30;
    const effort=Math.max(0,Math.floor(0.70*Math.max(0,Number(load)||0)));
    const variety=Math.min(20,Math.max(0,Math.floor(exerciseCount)-1)*5);
    const earned=Math.min(240,base+effort+variety);
    return {earned,base,effort:Math.min(effort,earned-base),variety:Math.max(0,earned-base-Math.min(effort,earned-base)),limit:240};
  }
  function exam() {
    const next = Math.min(5, level() + 1);
    const recent = recentLoads();
    return {
      next, points: levelXP(next), sessions: requiredSessions(next),
      load: targetLoad(next), recent: recent.length,
      passes: loadPassCount(next), current: level()
    };
  }

  if (typeof window !== "undefined") {
    window.BATYR_LEVEL_ENGINE = {
      levelXP, requiredSessions, history, completedSessions,
      baseline, targetLoad, loadPassCount, workoutLoad, meaningful,
      xpBreakdown, rankXP, rankSessions, earnedForLoad: (load, count=1) => xpBreakdown(load,count).earned
    };
  }

  // Marking a set records the effort. XP is issued only for a meaningful
  // completed session, once a day. This eliminates one-pushup-per-day farming.
  book = function (x, setNumber) {
    if (!x || !Number.isInteger(setNumber) || setNumber < 1 || setNumber > x.sets) return;
    const k = doneKey(x, setNumber);
    state.done[k] = !state.done[k];
    save();
    render();
  };

  finish = function () {
    if (state.ex.length === 0 || setsTotal() === 0 || setsDone() < setsTotal()) {
      badge("Заверши выбранные подходы или сократи план под свои силы.");
      return;
    }
    const date = today();
    if (state.finished[date] || state.trainingHistory[date]) {
      badge("Сегодня полноценная тренировка уже засчитана.");
      return;
    }
    const w = workoutLoad();
    if (!meaningful(w)) {
      badge("Пока разминка: 2 подхода и 12 баллов нагрузки, 90 сек статических удержаний либо 10 минут кардио.");
      return;
    }

    const oldLevel = level();
    const gained = xpBreakdown(w.load,w.exerciseCount).earned;
    const statScore = typeof window !== "undefined" && typeof window.BATYR_SCORE_WORKOUT === "function"
      ? window.BATYR_SCORE_WORKOUT() : null;
    state.trainingHistory[date] = {load: w.load, exerciseCount: w.exerciseCount, sets: w.sets, reps: w.reps,
      seconds: w.seconds, cardioSeconds: w.cardioSeconds, stabilitySeconds: w.stabilitySeconds, earned: gained, savedAt: Date.now(),
      statPoints: statScore ? statScore.points : null,
      statBreakdown: statScore ? statScore.breakdown : null,
      statExercises: statScore ? statScore.exercises : null};
    if (state.baselineLoads.length < 3) state.baselineLoads.push(w.load);
    state.dayXp[date] = gained;
    state.finished[date] = true;
    state.xp += gained;
    const newLevel = level();
    state.lastReward = {
      gained, load: w.load, exerciseCount: w.exerciseCount, xpParts: xpBreakdown(w.load,w.exerciseCount), oldLevel, newLevel, newRank: ranks[stage()],
      sessions: completedSessions(),
      statGains: statScore ? statScore.points : null
    };
    save();
    state.view = "reward";
    render();
  };

  // Help users understand exactly why the level may still be locked.
  const originalHero = mainHero;
  mainHero = function () {
    let html = originalHero();
    // No anime/athlete choice; stages are a single Turkic warrior journey.
    const p = html.indexOf('<div class="card"><div class="caps">ВЫБОР ОБРАЗА</div>');
    if (p >= 0) html = html.slice(0, p);
    const q = exam();
    const remaining = Math.max(0, q.points - state.xp);
    const xpStart = levelXP(level());
    const portion = Math.max(1, q.points - xpStart);
    const percent = Math.min(100, 100 * (state.xp - xpStart) / portion);
    html = html.replace(/\d+ XP · до нового уровня \d+ XP/,
      state.xp + ' XP · до следующего уровня ' + remaining + ' XP');
    // The original XP bar was based on a fixed 200-XP tier; now use per-level target.
    html = html.replace(/(<div class="grow">[\s\S]*?<div class="progress"><div style="width:)[\d.]+(%"><\/div><\/div>)/,
      '$1' + Math.max(0, percent).toFixed(1) + '$2');
    html += '<div class="card"><div class="caps">ИСПЫТАНИЕ НА СЛЕДУЮЩИЙ УРОВЕНЬ</div>' +
      (q.current >= 5 ? '<h2>Ты стал Легендой!</h2>' :
      '<h2>Уровень ' + q.next + ' · проходной балл</h2>' +
      '<div class="pass-row"><span>Очки XP</span><b>' + state.xp + ' / ' + q.points + '</b></div>' +
      '<div class="pass-row"><span>Полноценные тренировки</span><b>' +
        completedSessions() + ' / ' + q.sessions + '</b></div>' +
      '<div class="pass-row"><span>Личная нагрузка</span><b>' +
        q.load + ' баллов · ' + q.passes + '/2</b></div>' +
      '<p>Для повышения уровня нужны все три условия. Последнее: два достижения нагрузки '+
      'среди шести последних полноценных тренировок.</p>') +
      '<div class="small">Нагрузка зависит от выполненных повторений, длительности и количества разных упражнений. Рангов всего пять.</div></div>';
    return html;
  };

  const originalWorkout = workout;
  workout = function () {
    const w = workoutLoad(), qualifies = meaningful(w);
    let html = originalWorkout();
    let hint;
    if (state.finished[today()]) hint = "Тренировка дня уже засчитана. Завтра можно продолжить.";
    else if (qualifies) hint = "Достаточная нагрузка: можно получить XP после завершения всех выбранных подходов.";
    else hint = "Для полного зачёта: хотя бы 2 подхода и 12 баллов нагрузки либо 90 сек статических удержаний в двух подходах, либо 10 минут кардио.";
    const card = '<div class="card pass-card"><div class="caps">РЕАЛЬНАЯ НАГРУЗКА</div>' +
      '<div class="pass-row"><span>Выполнено подходов</span><b>'+w.sets+'</b></div>' +
      '<div class="pass-row"><span>Баллы нагрузки</span><b>'+w.load.toFixed(1)+'</b></div>' +
      '<p>'+hint+'</p><p class="small">1 повторение в день можно записать как начало пути, ' +
      'но оно не даёт полного тренировочного зачёта и не повышает ранг.</p></div>';
    return card + html;
  };

  reward = function () {
    const r = state.lastReward || {gained:0,load:0,oldLevel:level(),newLevel:level(),sessions:completedSessions()};
    return '<div class="reward-page"><div class="reward-symbol">🏆</div>' +
      '<div class="rewardHeader">ТРЕНИРОВКА ЗАСЧИТАНА!</div><div class="rewardXp">+' + r.gained + ' XP</div>' +
      '<div class="card"><div class="pass-row"><span>Нагрузка</span><b>' + r.load + ' баллов</b></div>' +
      '<div class="pass-row"><span>Полноценные тренировки</span><b>' + r.sessions + '</b></div>' +
      '<div class="pass-row"><span>Текущий уровень</span><b>' + r.newLevel + '</b></div></div>' +
      (r.newLevel > r.oldLevel
        ? '<div class="reward-level">⚔ Новый уровень: '+r.newLevel+'! '+esc(r.newRank)+'</div>'
        : '<p>XP записан. Следующий уровень откроется, когда пройдёшь испытание.</p>') +
      btn('Продолжить путь','go-hero') + '</div>';
  };

  // Other screens retain previous mechanics and historical activity display.
  // No physical ability or medical outcome is measured by this honor-system score.
  render();
})();