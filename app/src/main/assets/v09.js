/* Batyr's Way 0.9 — interactive design closer to the approved mobile RPG mockup. */
(function () {
  'use strict';
  const chapters = [
    {name:'Новичок',range:'1',file:'novice'},
    {name:'Боец',range:'2',file:'fighter'},
    {name:'Воин',range:'3',file:'warrior'},
    {name:'Батыр',range:'4',file:'batyr'},
    {name:'Легенда',range:'5',file:'legend'}
  ];
  const icon = { push:'✊',squat:'♜',pull:'⚔',plank:'◈',run:'♞',other:'✦' };
  const stageArt = n => (window.BATYR_STAGE_SCENES && window.BATYR_STAGE_SCENES[n-1]) || ('scenes/'+chapters[n-1].file+'.webp');
  const floor = x => Math.max(0,Math.min(100,x));
  const stageLevel = n => n;
  // Game attributes represent the development of the same hero, NOT medical
  // measurement. Later stages have higher baseline values.
  const statSteps=[
    {lvl:1,s:[1,1,1,1]},
    {lvl:2,s:[3,3,2,2]},
    {lvl:3,s:[5,4,4,3]},
    {lvl:4,s:[7,6,6,5]},
    {lvl:5,s:[10,9,8,7]},
    {lvl:6,s:[10,9,8,7]}
  ];
  const strengthAt=lvl=>{
    const l=Math.max(1,Math.min(5,Number(lvl)||1));
    let i=0;while(i<statSteps.length-2 && statSteps[i+1].lvl<=l)i++;
    const a=statSteps[i],b=statSteps[i+1],t=Math.min(1,(l-a.lvl)/(b.lvl-a.lvl));
    return a.s.map((v,k)=>Math.max(v,Math.floor(v+(b.s[k]-v)*t+0.0001)));
  };
  window.BATYR_STAGE_STATS=strengthAt;
  const statMarkup=s=>stat('💪','Сила',s[0])+stat('♥','Выносливость',s[1])+stat('🛡','Стойкость',s[2])+stat('ϟ','Энергия',s[3]);

  const gameXP = n => window.BATYR_LEVEL_ENGINE.levelXP(n);
  const nextXp = () => level()>=5? gameXP(5):gameXP(level()+1);
  function pct(){const cur=gameXP(level()),next=nextXp();return floor((state.xp-cur)/Math.max(1,next-cur)*100);}
  const bar = percent=>'<div class="v9-meter"><div style="width:'+floor(percent)+'%"></div></div>';
  const stat=(mark,name,value)=>'<div class="v9-stat"><span class="v9-stat-icon">'+mark+'</span><span>'+name+'</span><b>'+value+'</b></div>';
  const buttons=[['go-workout','⚒','Тренировка'],['go-quests','▤','Задания'],['go-progress','▥','Прогресс'],['v9-inventory','⚿','Инвентарь']];
  function taskProgress(){const total=setsTotal();return total ? Math.round(setsDone()/total*100):0;}
  function navTiles(){return '<div class="v9-action-grid">'+buttons.map(([action,emoji,label],i)=>'<button class="v9-action '+(i===0?'chosen':'')+'" data-action="'+action+'"><span>'+emoji+'</span><small>'+label+'</small></button>').join('')+'</div>';}
  function chaptersPanel(){
    const current=stage(),chosen=state.previewStage||current;
    return '<div class="v9-chapters-heading"><span>ПУТЬ БАТЫРА</span><span>УРОВЕНЬ '+level()+' / 5</span></div>'+ 
      '<div class="v9-chapters">'+chapters.map((x,i)=>{
        const n=i+1;
        return '<button data-action="preview:'+n+'" class="v9-chapter '+(chosen===n?'current ':'')+(n>current?'future':'unlocked')+'"><span class="v9-stage-index">'+(n>current?'◆':n)+'</span><b>'+x.name+'</b></button>';
      }).join('')+'</div>';
  }
  function createHero(){
    const current=stage(),shown=state.previewStage||current,chapter=chapters[shown-1];
    const lvl=level(),future=shown>current,preview=shown!==current,
      stepNotice=future?'ПРЕДПРОСМОТР · ОТКРОЕТСЯ С УРОВНЯ '+stageLevel(shown):
        preview?'ПРЕДПРОСМОТР ЭТАПА '+shown:'ТВОЙ ТЕКУЩИЙ ЭТАП';
    const showAt=preview?stageLevel(shown):lvl;
    const shownStats=preview?strengthAt(showAt):
      (typeof window.BATYR_GAME_STATS==="function"?window.BATYR_GAME_STATS():strengthAt(lvl));
    const stageImg=stageArt(shown);
    return chaptersPanel()+
      '<section class="v9-hero-stage">'+
        '<div class="v9-stage-back" style="background-image:url(\''+stageImg+'\')"></div>'+ 
        '<img class="v9-stage-art" src="'+stageImg+'" alt="'+esc(chapter.name)+' — казахский степной герой" loading="eager">'+
        '<div class="v9-stage-topline"><span class="v9-stage-ribbon">ЭТАП '+shown+' · '+chapter.name+'</span></div>'+ 
        '<div class="v9-hero-level"><b>'+(future?'ЭТАП '+shown:'УР. '+lvl)+'</b><span>'+(future?'Уровень '+chapter.range:'XP '+state.xp+' / '+nextXp())+'</span>'+bar(future?0:pct())+
          (future?'<small class="v10-current-lvl">Твой уровень: '+lvl+'</small>':'')+'</div>'+
        '<div class="v9-hero-stats"><div class="v10-stat-caption">'+(preview?'ОРИЕНТИР ЭТАПА '+shown:'ТВОИ ИГРОВЫЕ ПОКАЗАТЕЛИ')+'</div>'+statMarkup(shownStats)+'</div>'+ 
        '<div class="v9-landscape-label"><b>'+chapter.name+'</b><span>'+stepNotice+'</span></div>'+ 
        '<div class="v9-action-underlay">'+navTiles()+'</div>'+ 
      '</section>'+ 
      '<section class="v9-quest-strip"><span class="v9-quest-mark">⚔</span><div><b>Сегодняшнее испытание</b><small>'+setsDone()+' из '+setsTotal()+' подходов выполнено</small></div><button data-action="go-workout">Начать</button></section>'+ 
      '<section class="v9-panel v9-next-rank"><div class="v9-panel-heading">✦ Путь к следующему уровню</div>'+ 
        '<div class="v9-space-between"><span>Уровень '+lvl+'</span><strong>'+state.xp+' XP</strong><span>Уровень '+Math.min(5,lvl+1)+'</span></div>'+bar(pct())+ 
        '<p>Для развития нужны XP, регулярные полноценные тренировки и твоя индивидуальная нагрузка.</p></section>'+ 
      '<section class="v9-panel v9-stage-gallery"><div class="v9-panel-heading">5 ступеней батыра</div>'+ 
        '<div class="v9-portrait-gallery">'+chapters.map((x,i)=>'<button data-action="preview:'+(i+1)+'" class="'+((i+1)===shown?'selected':'')+'"><img src="'+stageArt(i+1)+'" alt=""><b>'+x.name+'</b><small>Этап '+(i+1)+'</small><small>Ур. '+x.range+'</small></button>').join('')+'</div></section>';
  }
  mainHero=createHero;

  function exIcon(name){
    const n=String(name).toLowerCase();
    if(n.includes('отжим'))return 'push';
    if(n.includes('присед'))return 'squat';
    if(n.includes('подтяг'))return 'pull';
    if(n.includes('планк'))return 'plank';
    if(n.includes('бег')||n.includes('ходьб')||n.includes('вело'))return 'run';
    return 'other';
  }
  function workoutCard(x,idx){
    const kind=exIcon(x.name),isTime=x.kind==='Секунды';
    const label=isTime?'сек':'раз';
    const steps=Array.from({length:x.sets},(_,i)=>{
      const done=isDone(x,i+1);
      return '<label class="v9-set-check"><span>Подход '+(i+1)+'</span><input type="checkbox" data-action="check:'+x.id+':'+(i+1)+'" '+(done?'checked':'')+'></label>';
    }).join('');
    return '<article class="v9-exercise"><div class="v9-ex-main">'+
      '<div class="v9-ex-visual '+kind+'"><span>'+icon[kind]+'</span></div>'+ 
      '<div class="v9-ex-text"><strong>'+esc(x.name)+'</strong><small>'+x.sets+' подхода · '+(x.weight?x.weight+' кг · ':'')+(isTime?'на время':'повторения')+'</small></div>'+ 
      '<button class="v9-amount-adjust" data-action="v9-dec:'+x.id+'" title="Уменьшить">−</button>'+ 
      '<span class="v9-reps">'+x.amount+'<small>'+label+'</small></span>'+ 
      '<button class="v9-amount-adjust" data-action="v9-inc:'+x.id+'" title="Увеличить">+</button>'+ 
      '</div><div class="v9-ex-footer"><div class="v9-sets">'+steps+'</div><button data-action="edit:'+x.id+'">Изменить</button></div></article>';
  }
  workout=function(){
    const done=setsDone(),total=setsTotal();
    return '<div class="v9-page-head"><button data-action="go-hero">‹</button><h1>Настройка тренировки</h1><span>⚔</span></div>'+ 
      '<div class="v9-tabs"><button class="selected" data-action="go-workout">Мои упражнения</button><button data-action="presets">Библиотека</button></div>'+ 
      '<div class="v9-workout-progress"><div><b>Твой тренировочный путь</b><span>'+done+' / '+total+' подходов</span></div>'+bar(taskProgress())+'</div>'+ 
      '<div class="v9-exercises">'+(state.ex.length?state.ex.map(workoutCard).join(''):'<div class="v9-empty">Добавь первое упражнение, например, отжимания — 15 раз.</div>')+'</div>'+ 
      '<button class="v9-add-ex" data-action="add">＋ Добавить упражнение</button>'+ 
      '<button class="v9-primary-cta" data-action="v9-start-plan">▶ Начать тренировку</button>'+ 
      '<button class="v9-primary-secondary" data-action="finish">🏆 Завершить тренировку и получить XP</button>'+ 
      '<p class="v9-guidance">Очки выдаются за полноценную тренировку, а не за отдельные нажатия на галочки. Начинай с посильной нагрузки.</p>';
  };
  function plannedSessions(){let a=[];state.ex.forEach(x=>{for(let n=1;n<=x.sets;n++)if(!isDone(x,n))a.push({x,n});});return a;}
  function beginSession(){let list=plannedSessions();if(!list.length){badge('Сначала добавь упражнение или сбрось выполненные подходы');return;}session={id:list[0].x.id,set:list[0].n,counter:0};state.view='session';render();}
  let paused=false;
  sessionScreen=function(){
    const x=state.ex.find(t=>t.id===session?.id);
    if(!x)return '<div class="v9-panel">Упражнение не найдено</div>';
    const total=setsTotal(),done=setsDone(),step=Math.min(total,done+1);
    const isPush=exIcon(x.name)==='push';
    const display=isPush?'<img class="v9-action-illustration" src="'+((window.BATYR_EXERCISE_ART)||'scenes/pushup.webp')+'" alt="Пример отжимания">' :
     '<div class="v9-exercise-icon"><span>'+icon[exIcon(x.name)]+'</span><small>Техника выполнения · следи за самочувствием</small></div>';
    return '<div class="v9-page-head"><button data-action="go-workout">‹</button><h1>Тренировка '+step+' / '+total+'</h1><span>⚔</span></div>'+ 
      '<div class="v9-session-steps">'+[1,2,3].map(i=>'<span class="'+(i<=Math.ceil(step/Math.max(1,total)*3)?'active':'')+'"></span>').join('')+'</div>'+ 
      '<div class="v9-session-main"><p class="v9-session-meta">ПОДХОД '+session.set+' ИЗ '+x.sets+'</p>'+ 
      '<h2>'+esc(x.name)+'</h2><p class="v9-session-target">'+x.amount+' '+(x.kind==='Секунды'?'секунд':'повторений')+'</p>'+ 
      '<div class="v9-session-figure">'+display+'</div>'+ 
      '<div class="v9-session-counter">'+session.counter+' <span>/ '+x.amount+'</span></div>'+ 
      bar((session.counter/x.amount)*100)+ 
      '<div class="v9-counter-actions"><button data-action="plus">＋ 1</button><button data-action="all">Я выполнил цель</button></div>'+ 
      '<div class="v9-session-controls"><button data-action="v9-pause" class="v9-pause">'+(paused?'▶':'Ⅱ')+'<small>'+(paused?'Продолжить':'Пауза')+'</small></button>'+ 
      '<button data-action="v9-complete" class="v9-done">✓<small>Выполнено</small></button>'+ 
      '<button data-action="v9-skip" class="v9-next">➜<small>Далее</small></button></div>'+ 
      '<p class="v9-guidance">Нажимай «Выполнено» только после реального подхода. Это запись, а не автоматический подсчёт повторений.</p></div>';
  };
  reward=function(){
    const r=state.lastReward||{gained:0,newLevel:level(),load:0,sessions:0,oldLevel:level()};
    const totals=typeof window.BATYR_GAME_STATS==="function"?window.BATYR_GAME_STATS():strengthAt(level());
    const points=r.statGainsApplied ||
      (typeof window.BATYR_NORMALIZE_GAIN==="function"
        ? window.BATYR_NORMALIZE_GAIN(r.statGains||{},r.statVersion||1)
        : r.statGains||{});
    const displayPoint=k=>'+'+Number(points[k]||0).toLocaleString('ru-RU',{minimumFractionDigits:2,maximumFractionDigits:2});
    const gainRows=statMarkup(['strength','endurance','resilience','energy'].map(displayPoint));
    return '<div class="v9-reward"><div class="v9-reward-head">Тренировка завершена!</div>'+ 
       '<div class="v9-laurels">❧ <b>+'+r.gained+' XP</b> ❧</div>'+ 
       '<div class="v9-panel"><h3>Прокачка за эту тренировку</h3>'+gainRows+
       '<h3>Текущие показатели героя</h3>'+statMarkup(totals)+
       '<p class="v10-attrs-note">Разные упражнения прокачивают разные навыки. Это игровые баллы, а не медицинский показатель физической формы.</p></div>'+ 
       '<div class="v9-reward-progress"><div class="v9-space-between"><span>Уровень '+level()+'</span><b>'+state.xp+' XP</b><span>Уровень '+Math.min(5,level()+1)+'</span></div>'+bar(pct())+'</div>'+ 
       (r.newLevel>r.oldLevel?'<h3 class="v9-promotion">⚔ Новый уровень '+r.newLevel+'!</h3>':'<p class="v9-reward-note">Ты приблизился к следующему уровню.</p>')+
       '<div class="v9-loot-label">Награда за дисциплину</div><div class="v9-loot"><div>💧 <b>Энергия</b><small>Игровой бонус</small></div><div>🏅 <b>Опыт</b><small>+'+r.gained+' XP</small></div></div>'+ 
       '<button class="v9-primary-cta" data-action="go-hero">Продолжить путь</button></div>';
  };
  const keepRender=render;
  render=function(){keepRender();const nav=document.getElementById('nav');if(nav)nav.style.display=(state.view==='session'||state.view==='reward')?'none':'';if(state.view==='hero'){
    const h=document.querySelector('.brand'); if(h)h.innerHTML='<span class="v9-brand-mark">❖</span><span>Batyr’s Way</span>';
  }};
  document.addEventListener('click', function(event){
    const b=event.target.closest('[data-action]');if(!b)return;
    const action=b.dataset.action;
    if(!/^v9-/.test(action))return;
    event.preventDefault();event.stopPropagation();
    const [kind,id]=action.split(':');
    if(kind==='v9-inventory'){
      document.getElementById('modal').innerHTML='<div class="overlay"><div class="dialog"><h2>⚔ Инвентарь</h2><p>Снаряжение и награды твоего батыра появятся в следующем обновлении.</p><button class="btn" data-action="close">Закрыть</button></div></div>';
    } else if(kind==='v9-start-plan')beginSession();
    else if(kind==='v9-inc'||kind==='v9-dec'){
      const x=state.ex.find(v=>v.id===id);if(!x)return;
      x.amount=Math.max(1,Math.min(10000,x.amount+(kind==='v9-inc'?1:-1)));save();render();
    }else if(kind==='v9-complete'){
      if(paused){badge('Сначала продолжи тренировку');return;}
      const x=state.ex.find(v=>v.id===session?.id);if(!x)return;
      if(!isDone(x,session.set))book(x,session.set);
      const remaining=plannedSessions();
      if(remaining.length){session={id:remaining[0].x.id,set:remaining[0].n,counter:0};state.view='session';}
      else{state.view='workout';badge('Все подходы выполнены. Заверши тренировку для XP.');}
      render();
    }else if(kind==='v9-skip'){
      const list=plannedSessions(); const at=list.findIndex(z=>z.x.id===session?.id&&z.n===session?.set);
      const nx=list[at+1];if(nx){session={id:nx.x.id,set:nx.n,counter:0};render();}else {state.view='workout';render();}
    }else if(kind==='v9-pause'){paused=!paused;render();}
  },true);
  render();
})();