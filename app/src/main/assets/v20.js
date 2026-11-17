/* Batyr's Way 2.0 — Android step sensor dashboard, local history. */
(function () {
  "use strict";
  const native = typeof NativeSteps !== "undefined" &&
    NativeSteps && typeof NativeSteps.getSnapshot === "function";
  const goalDefault=7000;
  const safe=(s)=>esc(String(s));
  const count=n=>Math.floor(Math.max(0,Number(n)||0)).toLocaleString('ru-RU');
  function emptySnapshot() {
    const week=[];
    for(let days=6;days>=0;days--){
      const d=new Date();d.setDate(d.getDate()-days);
      week.push({date:d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'),steps:0});
    }
    let goal=goalDefault;
    try{goal=Number(localStorage.getItem("batyr-steps-goal-preview"))||goalDefault;}catch(_){}
    return {supported:false,granted:false,active:false,today:0,goal,week,started:false,lastUpdated:0};
  }
  function read() {
    if(!native)return emptySnapshot();
    try { const d=JSON.parse(NativeSteps.getSnapshot());
      return d&&Array.isArray(d.week)?d:emptySnapshot();
    }catch(_){return emptySnapshot();}
  }
  let snapshot=read();
  const percent=()=>Math.min(100,Math.round((Number(snapshot.today)||0)/Math.max(1,Number(snapshot.goal)||goalDefault)*100));
  function currentNote(){
    if(!native)return 'Датчик шагов доступен только в Android-приложении, не в HTML-превью.';
    if(!snapshot.supported)return 'На этом телефоне недоступны датчики движения для подсчёта шагов. Цифры не будут выдуманы.';
    if(!snapshot.granted)return 'Разреши приложению считывать физическую активность, чтобы начать подсчёт.';
    if(!snapshot.started)return 'Шагомер включён. Пройди несколько шагов с телефоном в кармане, чтобы начался подсчёт.';
    const estimate=snapshot.source==='accelerometer';
    return snapshot.active
      ?(estimate
        ?'На этом телефоне шаги приблизительно определяются по акселерометру. Точность зависит от положения телефона и темпа ходьбы.'
        :'Шаги считываются с системного шагомера телефона.')
      :'Сейчас приложение не получает новые показания. Открой его, чтобы возобновить считывание.';
  }
  function miniCard(){
    return '<section class="bw20-short" data-action="go-steps" role="button" tabindex="0" aria-label="Открыть шагомер">'+
      '<div class="bw20-mini-icon">👣</div><div class="bw20-mini-content">'+
      '<b>Шаги сегодня</b><span><strong>'+count(snapshot.today)+'</strong> / '+count(snapshot.goal)+
      '</span></div><div class="bw20-mini-pct">'+percent()+'% <b>›</b></div>'+
      '<div class="bw20-mini-bar"><div style="width:'+percent()+'%"></div></div></section>';
  }
  function weekly(){
    const highest=Math.max(snapshot.goal||goalDefault,...snapshot.week.map(x=>Number(x.steps)||0),1);
    const names=['вс','пн','вт','ср','чт','пт','сб'];
    return snapshot.week.map(x=>{
      const date=new Date(String(x.date)+'T12:00:00');
      const label=names[date.getDay()]||'?';
      const height=Math.max(3,Math.round(100*Math.max(0,Number(x.steps)||0)/highest));
      const reached=(Number(x.steps)||0)>=(snapshot.goal||goalDefault);
      return '<div class="bw20-day"><b>'+count(x.steps)+'</b>'+
        '<div class="bw20-barholder"><div class="'+(reached?'reached':'')+'" style="height:'+height+'%"></div></div>'+
        '<small>'+safe(label)+'</small></div>';
    }).join('');
  }
  function dashboard(){
    const total=snapshot.week.reduce((sum,d)=>sum+(Number(d.steps)||0),0);
    return '<div class="bw20-head"><div><span>ПУТЬ БАТЫРА</span><h1>👣 Мой шагомер</h1></div><b>ШАГИ</b></div>'+
      '<section class="bw20-hero"><div class="bw20-hero-bg"></div>'+
      '<div class="bw20-today">СЕГОДНЯ'+(snapshot.approximate?' · ПРИБЛИЗИТЕЛЬНО':'')+'</div><div class="bw20-big">'+count(snapshot.today)+'</div>'+
      '<p>из '+count(snapshot.goal)+' шагов</p>'+
      '<div class="bw20-progress"><div style="width:'+percent()+'%"></div></div>'+
      '<div class="bw20-today-bottom"><span>Выполнено <b>'+percent()+'%</b></span><span>Осталось <b>'+count(Math.max(0,snapshot.goal-snapshot.today))+'</b></span></div>'+
      '</section>'+
      '<section class="card bw20-card"><h2>Моя цель на день</h2><p>Установи удобную цель. Её можно изменить в любой момент.</p>'+
      '<div class="bw20-goalrow"><input type="number" id="bw20-goal" class="field" min="500" max="30000" step="500" value="'+snapshot.goal+'">'+
      '<button class="btn" data-action="bw20-setgoal">Сохранить</button></div>'+
      '<p class="bw20-error" id="bw20-status"></p></section>'+
      '<section class="card bw20-card"><div class="bw20-rows-title"><h2>Последние 7 дней</h2><span>Всего '+count(total)+'</span></div>'+
      '<div class="bw20-chart">'+weekly()+'</div></section>'+
      '<section class="card bw20-card"><h2>Доступ к шагам</h2><p>'+safe(currentNote())+'</p>'+
      (native&&snapshot.supported&&!snapshot.granted
        ?'<button class="btn" data-action="bw20-permission">Разрешить подсчёт шагов</button>':
        native&&snapshot.supported?'<button class="btn secondary" data-action="bw20-refresh">Обновить</button>':'')+
      '<p class="small bw20-disclaimer">Учёт начинается только после включения шагомера. В этой версии подсчёт ведётся при открытом приложении. '+
      'Системный датчик может передать суммарное изменение после повторного открытия в тот же день; '+
      'если приложение не было активно во время смены даты, часть шагов может не попасть в статистику. '+
      'Постоянный надёжный фоновый подсчёт потребует отдельного режима или синхронизации с фитнес-службой.</p></section>'+
      '<section class="card bw20-card"><h2>❤️ Шаги и развитие героя</h2>'+
      '<p>Ходьба помогает выносливости, но <b>шаги автоматически не дают XP</b> — чтобы одна прогулка не была засчитана дважды вместе с тренировкой.</p>'+
      '<p>Позже сможем подключить награды за реальные цели и объединить с учётом кардио-тренировок.</p></section>';
  }
  function paint(){
    snapshot=read();
    const mini=document.getElementById('bw20-mini-host');
    if(mini)mini.innerHTML=miniCard();
    if(state.view==='steps') {
      const main=document.getElementById('main');
      if(main)main.innerHTML=dashboard();
    }
  }
  const oldHero=mainHero;
  mainHero=function(){
    const html=oldHero();
    const insertion='<div id="bw20-mini-host">'+miniCard()+'</div>';
    const marker='<section class="v9-quest-strip">';
    return html.includes(marker)?html.replace(marker,insertion+marker):html+insertion;
  };
  const oldProgress=progressScreen;
  progressScreen=function(){
    return '<div id="bw20-mini-host">'+miniCard()+'</div>'+oldProgress();
  };
  const oldRender=render;
  render=function(){
    oldRender();
    if(state.view==='steps'){
      const main=document.getElementById('main');
      if(main)main.innerHTML=dashboard();
    }
  };
  function updateGoal(){
    const val=Math.floor(Number(document.getElementById('bw20-goal')?.value));
    const status=document.getElementById('bw20-status');
    if(!Number.isFinite(val)||val<500||val>30000){
      if(status)status.textContent='Выбери цель от 500 до 30 000 шагов.';
      return;
    }
    if(native)NativeSteps.setGoal(val);
    else try{localStorage.setItem('batyr-steps-goal-preview',String(val));}catch(_){}
    paint();
  }
  document.addEventListener('click',e=>{
    const b=e.target.closest('[data-action]');
    if(!b)return;
    const key=b.dataset.action;
    if(!['go-steps','bw20-permission','bw20-setgoal','bw20-refresh'].includes(key))return;
    e.preventDefault();e.stopImmediatePropagation();
    if(key==='go-steps'){state.view='steps';render();}
    if(key==='bw20-permission'){if(native)NativeSteps.requestAccess();else paint();}
    if(key==='bw20-refresh')paint();
    if(key==='bw20-setgoal')updateGoal();
  },true);
  // Sensor is native; no fake browser step count.
  window.BatyrStepsApp={
    screen:dashboard,
    refresh:paint,
    snapshot:()=>read(),
    onNativeEvent:()=>{paint();}
  };
  render();
})();