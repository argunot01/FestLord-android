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
    return [0, 0, 1, 3, 3, 3][Math.max(1, Math.min(5, n))];
  };

  const levelXP = n => {
    if (n <= 1) return 0;
    const s = n - 1;
    return Math.ceil(65 * s + 0.5 * s * s);
  };
  const requiredSessions = n => {
    if (n <= 1) return 0;
    const s = n - 1;
    return Math.ceil(s * 1.5 + s * s * 0.012);
  };
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
  const stageFloor = n => n <= 10 ? 12 : n <= 25 ? 20 : n <= 50 ? 30 : n <= 75 ? 45 : 60;
  const targetLoad = n => n <= 1 ? 12 : Math.max(stageFloor(n), Math.ceil(baseline() * (1 + 0.006 * (n - 1))));
  const recentLoads = () => history().slice(0, 6).map(([, v]) => Number(v.load));
  const loadPassCount = n => recentLoads().filter(x => x >= targetLoad(n)).length;
  const qualifiesFor = n => state.xp >= levelXP(n)
    && completedSessions() >= requiredSessions(n)
    && loadPassCount(n) >= 2;

  // Keep legacy XP but don't count unverified legacy checkbox taps as completed workouts.
  level = function () {
    let n = 1;
    while (n < 100 && qualifiesFor(n + 1)) n++;
    return n;
  };
  stage = function () {
    const n = level();
    return n <= 10 ? 1 : n <= 25 ? 2 : n <= 50 ? 3 : n <= 75 ? 4 : 5;
  };

  function workoutLoad() {
    let sets = 0, reps = 0, seconds = 0, cardioSeconds = 0;
    state.ex.forEach(x => {
      for (let n = 1; n <= x.sets; n++) {
        if (!isDone(x, n)) continue;
        sets++;
        if (x.kind === "Секунды") {
          seconds += x.amount;
          if (/ходь|бег|вел|плаван|эллип|кардио|прогул|шаг|жүру|walking|cycling|run/i.test(x.name)) cardioSeconds += x.amount;
        }
        else reps += x.amount;
      }
    });
    // Comparable in-app workload units. No bonus for selecting unsafe heavy weight.
    const load = Math.round((reps + seconds / 30) * 10) / 10;
    return {sets, reps, seconds, cardioSeconds, load};
  }
  function meaningful(w) {
    return (w.sets >= 2 && w.load >= 12) || (w.cardioSeconds >= 600 && w.load >= 12);
  }
  function exam() {
    const next = Math.min(100, level() + 1);
    const recent = recentLoads();
    return {
      next, points: levelXP(next), sessions: requiredSessions(next),
      load: targetLoad(next), recent: recent.length,
      passes: loadPassCount(next), current: level()
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
      badge("Пока разминка: нужно 2 подхода и 12 баллов нагрузки или 10 минут кардио.");
      return;
    }

    const oldLevel = level();
    const gained = Math.min(38, 24 + Math.floor(w.load / 10));
    state.trainingHistory[date] = {load: w.load, sets: w.sets, reps: w.reps,
      seconds: w.seconds, cardioSeconds: w.cardioSeconds, earned: gained, savedAt: Date.now()};
    if (state.baselineLoads.length < 3) state.baselineLoads.push(w.load);
    state.dayXp[date] = gained;
    state.finished[date] = true;
    state.xp += gained;
    const newLevel = level();
    state.lastReward = {
      gained, load: w.load, oldLevel, newLevel, newRank: ranks[stage()],
      sessions: completedSessions()
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
      (q.current >= 100 ? '<h2>Достигнут 100-й уровень!</h2>' :
      '<h2>Уровень ' + q.next + ' · проходной балл</h2>' +
      '<div class="pass-row"><span>Очки XP</span><b>' + state.xp + ' / ' + q.points + '</b></div>' +
      '<div class="pass-row"><span>Полноценные тренировки</span><b>' +
        completedSessions() + ' / ' + q.sessions + '</b></div>' +
      '<div class="pass-row"><span>Личная нагрузка</span><b>' +
        q.load + ' баллов · ' + q.passes + '/2</b></div>' +
      '<p>Для повышения уровня нужны все три условия. Последнее: два достижения нагрузки '+
      'среди шести последних полноценных тренировок.</p>') +
      '<div class="small">Нагрузка рассчитывается из выполненных повторений и секунд, '+
      'а не из выбранного названия упражнения.</div></div>';
    return html;
  };

  const originalWorkout = workout;
  workout = function () {
    const w = workoutLoad(), qualifies = meaningful(w);
    let html = originalWorkout();
    let hint;
    if (state.finished[today()]) hint = "Тренировка дня уже засчитана. Завтра можно продолжить.";
    else if (qualifies) hint = "Достаточная нагрузка: можно получить XP после завершения всех выбранных подходов.";
    else hint = "Для полного зачёта: хотя бы 2 подхода и 12 баллов нагрузки либо 10 минут ходьбы или другого кардио.";
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