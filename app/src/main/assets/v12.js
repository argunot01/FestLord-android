/* Batyr's Way 1.2 — transparent XP, qualification requirements, workout forecast. */
(function(){
  'use strict';
  const engine=window.BATYR_LEVEL_ENGINE;
  if(!engine)return;
  const upper=(x,min,max)=>Math.max(min,Math.min(max,Number(x)||0));
  const nice=n=>Math.floor(Number(n)||0).toLocaleString('ru-RU');
  const bar=p=>'<div class="xp12-meter"><div style="width:'+upper(p,0,100).toFixed(1)+'%"></div></div>';
  const mark=ok=>'<span class="xp12-mark '+(ok?'ready':'pending')+'">'+(ok?'✓':'•')+'</span>';
  const icons=['⭐','📅','⚔'];
  function getModel(){
    const lvl=level(),maxLevel=lvl>=100;
    const next=maxLevel?100:lvl+1;
    const xpNeeded=engine.levelXP(next);
    const sessionsNeeded=engine.requiredSessions(next);
    const sessions=engine.completedSessions();
    const loadTarget=engine.targetLoad(next);
    const passes=engine.loadPassCount(next);
    const missingXP=Math.max(0,xpNeeded-state.xp);
    const missingSessions=Math.max(0,sessionsNeeded-sessions);
    const missingPasses=Math.max(0,2-passes);
    const validLoads=engine.history().slice(0,6).map(([,record])=>Number(record.load)>=loadTarget).reverse();
    const recentRewards=engine.history().slice(0,5).map(([,record])=>Number(record.earned)).filter(v=>Number.isFinite(v)&&v>0);
    const expectedAtTarget=engine.earnedForLoad(loadTarget);
    const typicalXP=recentRewards.length
      ?Math.max(expectedAtTarget,Math.round(recentRewards.reduce((a,b)=>a+b,0)/recentRewards.length))
      :expectedAtTarget;
    // Estimate by simulating future QUALIFIED workouts which reach the current
    // threshold, with one XP reward per calendar day. This is NOT a promise.
    let forecast=0,simXP=state.xp,simSessions=sessions,simLoad=validLoads.slice();
    while(!maxLevel && forecast<500 && !(simXP>=xpNeeded && simSessions>=sessionsNeeded
       && simLoad.filter(Boolean).length>=2)){
      forecast++;
      simXP+=typicalXP;
      simSessions++;
      simLoad.push(true);
      if(simLoad.length>6)simLoad.shift();
    }
    return {lvl,next,maxLevel,xpNeeded,sessionsNeeded,sessions,loadTarget,passes,
      missingXP,missingSessions,missingPasses,typicalXP,forecast,
      xpOK:state.xp>=xpNeeded,sessionsOK:sessions>=sessionsNeeded,loadOK:passes>=2,
      xpProgress:next===lvl?100:upper(
        (state.xp-engine.levelXP(lvl))/
        Math.max(1,xpNeeded-engine.levelXP(lvl))*100,0,100)
    };
  }
  function gate(name,value,missing,isComplete,explanation){
    return '<div class="xp12-gate">'+
      '<div class="xp12-gate-title">'+mark(isComplete)+'<div><strong>'+name+'</strong>'+
      '<span>'+explanation+'</span></div><b>'+value+'</b></div>'+
      '<div class="xp12-gate-footer">'+(isComplete?'Условие выполнено':missing)+'</div></div>';
  }
  function card() {
    const p=getModel();
    if(p.maxLevel)return '<section class="xp12-card"><div class="xp12-kicker">ПУТЬ БАТЫРА</div>'+
      '<h2>🏆 Уровень 100 достигнут!</h2><p>Легендарный уровень открыт. Продолжай тренироваться в своём темпе.</p></section>';
    const steps=[
      gate('Опыт XP',nice(state.xp)+' / '+nice(p.xpNeeded),
        'Осталось '+nice(p.missingXP)+' XP',p.xpOK,'XP за полноценные тренировки'),
      gate('Полноценные тренировки',nice(p.sessions)+' / '+nice(p.sessionsNeeded),
        'Осталось '+nice(p.missingSessions),p.sessionsOK,'За один день учитывается одна тренировка'),
      gate('Личная нагрузка',p.passes+' / 2',
        'Ещё '+nice(p.missingPasses)+' раза(раз) достигнуть нормы',p.loadOK,
        'Норма: '+nice(p.loadTarget)+' баллов, 2 раза из последних 6')
    ].join("");
    return '<section class="xp12-card" id="xp12-guide">'+
      '<div class="xp12-kicker">ТВОЁ СЛЕДУЮЩЕЕ ИСПЫТАНИЕ</div>'+
      '<div class="xp12-title-row"><h2>До уровня '+p.next+'</h2><b>'+p.xpProgress.toFixed(0)+'% XP</b></div>'+
      bar(p.xpProgress)+
      '<div class="xp12-forecast"><span class="xp12-forecast-symbol">⚔</span><div>'+
      '<strong>Ориентировочно ещё '+nice(p.forecast)+' '+(p.forecast===1?'тренировка':(p.forecast%10>=2&&p.forecast%10<=4&&p.forecast%100!==12&&p.forecast%100!==13&&p.forecast%100!==14?'тренировки':'тренировок'))+'</strong>'+
      '<small>Если каждая следующая тренировка полноценная, нагрузка достигает '+nice(p.loadTarget)+
      ' баллов и приносит около +'+p.typicalXP+' XP. Это прогноз, не обязательный график.</small></div></div>'+
      '<div class="xp12-gates">'+steps+'</div>'+
      '<button class="xp12-why" data-action="xp12-explain">❔ Как начисляются баллы и открываются уровни?</button>'+
      '<p class="xp12-fine">Нужны все три условия одновременно. Дни отдыха не штрафуются. Нажатия на галочки сами по себе XP не дают.</p>'+
      '</section>';
  }
  function formulaText(load){
    const earned=engine.earnedForLoad(load);
    const bonus=Math.max(0,earned-24);
    return {earned,bonus};
  }
  function makeWorkoutHint(){
    const planned=engine.workoutLoad(()=>true);
    const completed=engine.workoutLoad();
    const qualified=engine.meaningful(planned);
    const fullDone=state.ex.length>0 && setsTotal()===setsDone();
    const already=Boolean(state.finished[today()]||state.trainingHistory[today()]);
    const reward=formulaText(planned.load);
    const p=getModel();
    const warn=already?'Сегодня полноценная тренировка уже засчитана.':
      !state.ex.length?'Добавь упражнения, чтобы увидеть ожидаемую награду.':
      !qualified?'План пока слишком короткий для XP. Увеличь посильную нагрузку или добавь подходы.':
      !fullDone?'Выполни и отметь все подходы, затем заверши тренировку.':
      'Все условия выполнены. Нажми «Завершить тренировку» для начисления XP.';
    return '<section class="xp12-workout"><div class="xp12-kicker">НАГРАДА ЗА ТВОЙ ПЛАН</div>'+
      '<div class="xp12-estimate"><strong>'+(already||!qualified?'0':'+'+nice(reward.earned))+
      ' XP</strong><span>'+(already?'Уже начислено сегодня':qualified?'За полное выполнение':'Нужна полноценная тренировка')+'</span></div>'+
      '<div class="xp12-workout-row"><span>24 XP за тренировку</span><b>'+(qualified?'+24':'—')+'</b></div>'+
      '<div class="xp12-workout-row"><span>Бонус за нагрузку ('+planned.load.toFixed(1)+' балла)</span><b>'+(qualified?'+'+reward.bonus:'—')+'</b></div>'+
      '<div class="xp12-workout-row"><span>Сделано сейчас</span><b>'+completed.load.toFixed(1)+' балла</b></div>'+
      '<p>'+warn+'</p>'+
      '<button class="xp12-why" data-action="xp12-explain">Почему именно столько XP?</button>'+
      '<small>Следующий уровень '+p.next+': нужно ещё '+nice(p.missingXP)+' XP, '+nice(p.missingSessions)+
      ' тренировок и '+nice(p.missingPasses)+' выполнения нормы.</small></section>';
  }
  function explain() {
    document.getElementById("modal").innerHTML='<div class="overlay" id="overlay">'+
      '<div class="dialog xp12-dialog"><div class="xp12-kicker">ПРАВИЛА BATYR’S WAY</div>'+
      '<h2>Как начисляются XP?</h2>'+
      '<p><b>+24 XP</b> — за полноценную завершённую тренировку.</p>'+
      '<p><b>+1 XP</b> — за каждые 10 полных баллов нагрузки, но не более +14 XP бонуса.</p>'+
      '<p><b>Максимум +38 XP за день</b>. За галочки и отдельные упражнения XP не начисляются.</p>'+
      '<h3>Как считаются баллы нагрузки?</h3>'+
      '<div class="xp12-examples"><div>Отжимания, жим и другие повторения <b>1 повтор = 1 балл</b></div>'+
      '<div>Ходьба и кардио <b>30 секунд = 1 балл</b></div>'+
      '<div>Планка и статические удержания <b>7,5 секунд = 1 балл</b></div></div>'+
      '<p class="small">Пример: 3 × 10 отжиманий = 30 баллов нагрузки, значит +24 базовых XP +3 бонусных = <b>27 XP</b>.</p>'+
      '<h3>Когда растёт уровень?</h3>'+
      '<p>Нужно одновременно накопить XP, пройти установленное количество полноценных занятий и минимум дважды достигнуть личного норматива среди шести последних тренировок.</p>'+
      '<p class="small">Индивидуальную норму приложение определяет по первым трём полноценным занятиям с постепенным увеличением. Дни отдыха не обнуляют прогресс. Не повышай нагрузку ради игры в ущерб самочувствию.</p>'+
      '<button class="btn" data-action="xp12-close">Понятно</button></div></div>';
  }
  const oldHero=mainHero;
  mainHero=function(){
    const html=oldHero();
    const position=html.indexOf('<section class="v9-panel v9-next-rank">');
    if(position<0)return html+card();
    return html.slice(0,position)+card()+html.slice(position);
  };
  const oldWorkout=workout;
  workout=function(){
    const html=oldWorkout();
    const position=html.indexOf('<div class="v9-exercises">');
    if(position<0)return makeWorkoutHint()+html;
    return html.slice(0,position)+makeWorkoutHint()+html.slice(position);
  };
  const oldProgress=progressScreen;
  progressScreen=function(){
    return card()+oldProgress();
  };
  const oldReward=reward;
  reward=function(){
    const html=oldReward();
    const r=state.lastReward;
    if(!r)return html;
    const bonus=Math.max(0,r.gained-24);
    const content='<div class="xp12-reward-detail">'+
      '<div>Награда за полноценную тренировку <b>+24 XP</b></div>'+
      '<div>Бонус за '+Number(r.load||0).toFixed(1)+' балла нагрузки <b>+'+bonus+' XP</b></div>'+
      '<p>Чтобы получить новый уровень, также проверь условия в разделе «Прогресс».</p></div>';
    const at=html.indexOf('<div class="v9-reward-progress">');
    return at<0?html+content:html.slice(0,at)+content+html.slice(at);
  };
  document.addEventListener('click',e=>{
    const b=e.target.closest('[data-action^="xp12-"]');
    if(!b)return;
    e.preventDefault();e.stopPropagation();
    if(b.dataset.action==="xp12-explain")explain();
    else if(b.dataset.action==="xp12-close")document.getElementById("modal").innerHTML="";
  },true);
  window.BATYR_XP_GUIDE={getModel,card,makeWorkoutHint,formulaText};
  render();
})();