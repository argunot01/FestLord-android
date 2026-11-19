/* Batyr's Way — compact selectable workout / recovery-day prototype 1.7 */
(function(){
  'use strict';
  const CATS={
    cardio:['♥','Выносливость','#f09483'], strength:['✊','Сила','#e8b861'],
    stability:['⬡','Стойкость','#98c4e1'],mixed:['✦','Баланс','#b9abff']
  };
  const LIB=[
    {name:'Ходьба',category:'cardio',kind:'Секунды',amount:900,sets:1,icon:'🚶'},
    {name:'Бег',category:'cardio',kind:'Секунды',amount:600,sets:1,icon:'🏃'},
    {name:'Велотренажёр',category:'cardio',kind:'Секунды',amount:900,sets:1,icon:'🚴'},
    {name:'Бой с тенью',category:'cardio',kind:'Секунды',amount:600,sets:1,icon:'🥊'},
    {name:'Разминка',category:'mixed',kind:'Секунды',amount:480,sets:1,icon:'☀'},
    {name:'Растяжка',category:'stability',kind:'Секунды',amount:480,sets:1,icon:'🧘'},
    {name:'Скакалка',category:'cardio',kind:'Секунды',amount:300,sets:1,icon:'♧'},
    {name:'Гребной тренажёр',category:'cardio',kind:'Секунды',amount:600,sets:1,icon:'🚣'},
    {name:'Эллипсоид',category:'cardio',kind:'Секунды',amount:900,sets:1,icon:'⬡'},
    {name:'Отжимания',category:'strength',kind:'Повторения',amount:15,sets:2,icon:'✊'},
    {name:'Приседания',category:'strength',kind:'Повторения',amount:20,sets:2,icon:'♜'},
    {name:'Подтягивания',category:'strength',kind:'Повторения',amount:5,sets:2,icon:'⚔'},
    {name:'Жим лёжа',category:'strength',kind:'Повторения',amount:10,sets:3,icon:'▣'},
    {name:'Становая тяга',category:'strength',kind:'Повторения',amount:8,sets:3,icon:'▥'},
    {name:'Выпады',category:'strength',kind:'Повторения',amount:12,sets:2,icon:'♟'},
    {name:'Планка',category:'stability',kind:'Секунды',amount:30,sets:2,icon:'⬡'},
    {name:'Удержание у стены',category:'stability',kind:'Секунды',amount:40,sets:2,icon:'▤'},
    {name:'Круговой комплекс',category:'mixed',kind:'Секунды',amount:300,sets:1,icon:'⚡'},
    {name:'Берпи',category:'mixed',kind:'Повторения',amount:10,sets:2,icon:'⚡'},
    {name:'Бокс на мешке',category:'mixed',kind:'Секунды',amount:180,sets:3,icon:'🥊'}
  ];
  // Recover all previously added exercises. Never remove those existing entries.
  const storeKey='bw17-layout-prototype';
  const old=(()=>{try{return JSON.parse(localStorage.getItem(storeKey)||'{}')}catch{return {}}})();
  const ui={mode:old.mode||'easy',active:Array.isArray(old.active)?old.active:[],
    quickExtra:Array.isArray(old.quickExtra)?old.quickExtra:[],round:old.round||2,cat:'all',query:'',circ:null};
  state.bw17=state.bw17||{daily:{}};
  function persist(){try{localStorage.setItem(storeKey,JSON.stringify({mode:ui.mode,active:ui.active,quickExtra:ui.quickExtra,round:ui.round}))}catch{}save();}
  // Start with a short, approachable day rather than forcing all old sets.
  if(!ui.active.length)ui.active=state.ex.slice(0,3).map(x=>x.id);
  const dkey=()=>today();
  const doneRows=()=>state.bw17.daily[dkey()]||{};
  const logged=name=>Boolean(doneRows()[name]);
  const category=x=>{
    if(x.category&&CATS[x.category])return x.category;
    const t=LIB.find(z=>z.name.toLowerCase()===String(x.name).toLowerCase());
    return t?t.category:(typeof window.BATYR_GET_CATEGORY==='function'?window.BATYR_GET_CATEGORY(x):'mixed');
  };
  const catUI=x=>{const c=CATS[category(x)]||CATS.mixed;return `<span class="bw17-kind" style="--kind:${c[2]}">${c[0]} ${c[1]}</span>`};
  const icon=x=>LIB.find(z=>z.name===x.name)?.icon||CATS[category(x)]?.[0]||'✦';
  const target=x=>x.kind==='Секунды'?Math.round(x.amount/60)+' мин':x.amount+' раз';
  const chosen=()=>state.ex.filter(x=>ui.active.includes(x.id));
  const completed=x=>Array.from({length:Math.max(1,x.sets)},(_,i)=>isDone(x,i+1)).filter(Boolean).length;
  const totalSet=()=>chosen().reduce((n,x)=>n+x.sets,0);
  const doneSet=()=>chosen().reduce((n,x)=>n+completed(x),0);
  const baseGameStats=typeof window.BATYR_GAME_STATS==='function'
    ? window.BATYR_GAME_STATS : (()=>[1,1,1,1]);
  const statFor=()=>{
    const raw=baseGameStats();
    const cap=window.BATYR_STAT_ENGINE?.rankCap?.(level())||[2.9,2.9,1.9,1.9];
    const bonus=[0,0,0,0];
    Object.values(state.bw17.daily||{}).forEach(day=>Object.values(day).forEach(a=>{
      if(!a||!a.category)return;
      const categoryName=a.category;
      const idx={strength:0,cardio:1,stability:2,mixed:3}[categoryName];
      if(idx!==undefined)bonus[idx]+=Math.min(0.07,Math.max(0.01,a.minutes*0.003));
    }));
    return raw.map((v,i)=>Math.min(cap[i],Math.round((Number(v)+bonus[i])*100)/100));
  };
  // Preview stats still respect next-stage caps; light movement tracks activity
  // independently from full XP workouts.
  function logActivity(name,minutes,kind){
    if(logged(name)){badge('Сегодня уже отмечено · '+name);return;}
    minutes=Math.max(1,Math.min(240,Math.round(minutes)));
    state.bw17.daily[dkey()]=state.bw17.daily[dkey()]||{};
    state.bw17.daily[dkey()][name]={minutes,category:kind,at:Date.now()};
    persist();badge(name+' · '+minutes+' мин записано');render();
  }
  function chooseMode(m){ui.mode=m;ui.circ=null;persist();render()}
  function select(id){
    const found=state.ex.find(x=>x.id===id);if(!found)return;
    if(ui.active.includes(id))ui.active=ui.active.filter(x=>x!==id);
    else ui.active.push(id);
    persist();render();
  }
  const pill=(mode,txt)=>`<button class="bw17-chip ${ui.mode===mode?'on':''}" data-action="bw17-mode:${mode}">${txt}</button>`;
  const quick=['Ходьба','Бег','Разминка','Бой с тенью'];
  const quickNames=()=>[...quick,...ui.quickExtra.filter(n=>!quick.includes(n))];
  function quickCard(name){
    const item=LIB.find(x=>x.name===name),isLogged=logged(name);
    return `<button class="bw17-quick ${isLogged?'logged':''}" data-action="bw17-quick:${esc(name)}">
      <span class="bw17-quick-ico">${item.icon}</span><span class="bw17-quick-body"><b>${name}</b><small>${Math.round(item.amount/60)} мин · ${CATS[item.category][1]}</small></span>
      <span class="bw17-checkmark">${isLogged?'✓':'＋'}</span></button>`;
  }
  function workoutCard(x){
    const c=category(x),n=completed(x);
    return `<article class="bw17-ex ${n===x.sets?'complete':''}">
      <button class="bw17-select" data-action="bw17-remove:${x.id}" aria-label="Исключить из плана">✓</button>
      <span class="bw17-ex-ico">${icon(x)}</span><div class="bw17-ex-body"><button class="bw17-edit" data-action="edit:${x.id}" aria-label="Изменить ${esc(x.name)}">${esc(x.name)} ✎</button><div>${catUI(x)}<small>${x.sets}×${target(x)}</small></div></div>
      <div class="bw17-ex-actions"><b>${n}/${x.sets}</b><button data-action="bw17-mark:${x.id}" title="Отметить подход">${n>=x.sets?'✓':'＋'}</button></div>
    </article>`;
  }
  function quickPage(){
    const day=doneRows(),entries=Object.values(day),count=entries.length;
    const mins=entries.reduce((v,a)=>v+(a.minutes||0),0);
    const vals=statFor();
    return `<div class="bw17-panel-head"><b>ДВИЖЕНИЕ КАЖДЫЙ ДЕНЬ</b><span>${count?'✓ '+count+' активности':'Без силовой нагрузки'}</span></div>
      <div class="bw17-quick-grid">${quickNames().map(quickCard).join('')}</div>
      <div class="bw17-day-summary"><span>Сегодня <strong>${mins} мин</strong></span><span>❤️ ${vals[1].toFixed(2)}</span><span>⚡ ${vals[3].toFixed(2)}</span></div>
      <div class="bw17-info">Лёгкая активность учитывается отдельно от полноценной тренировки. Без штрафов за отдых.</div>
      <button class="bw17-action outline" data-action="bw17-library">＋ Выбрать другую активность</button>`;
  }
  function fullPage(){
    const selected=chosen();const count=selected.length;
    const bits=selected.map(workoutCard).join('');
    const c=ui.mode==='circuit';
    const progress=totalSet()?Math.round(doneSet()/totalSet()*100):0;
    return `<div class="bw17-plan-top"><span><b>${c?'Круговая тренировка':'Мой план на сегодня'}</b><small>${count} упр. · ${doneSet()} / ${totalSet()} подходов</small></span>
      <button data-action="bw17-library">＋ Библиотека</button></div>
      ${c?`<div class="bw17-rounds"><span>Раундов</span><button data-action="bw17-round:-1">−</button><b>${ui.round}</b><button data-action="bw17-round:1">＋</button><small>А → Б → В → А</small></div>`:''}
      <div class="bw17-meter"><div style="width:${progress}%"></div></div>
      <div class="bw17-ex-list">${bits||'<div class="bw17-empty">Выбери упражнения в библиотеке</div>'}</div>
      <div class="bw17-footer-actions">
       <button data-action="bw17-library" class="outline">＋ Выбрать</button>
       <button data-action="bw17-start" class="main">▶ ${c?'Начать круг':'Начать'}</button>
       <button data-action="bw17-finish" class="outline">✓ Готово</button></div>`;
  }
  function compactWorkout(){
    return `<div class="bw17-workout">
      <div class="bw17-heading"><div><small>ПУТЬ БАТЫРА · СЕГОДНЯ</small><h1>Тренировка</h1></div><span class="bw17-headicon">⚔</span></div>
      <div class="bw17-modes">${pill('easy','☀ Лёгкий день')}${pill('regular','💪 Силовая')}${pill('circuit','◉ Круговая')}</div>
      ${ui.mode==='easy'?quickPage():fullPage()}
    </div>`;
  }
  workout=compactWorkout;
  window.BATYR_GAME_STATS=statFor;
  const prevHero=mainHero;
  mainHero=function(){
    let html=prevHero();
    const cut=html.indexOf('<section class="v9-quest-strip">');
    if(cut>=0)html=html.slice(0,cut);
    return html;
  };
  function library(){
    ui.cat='all';ui.query='';drawLibrary();
  }
  function drawLibrary(){
    const own=state.ex.filter(x=>!LIB.some(t=>t.name.toLowerCase()===x.name.toLowerCase())).map(x=>({...x,icon:'✦'}));
    const filtered=[...LIB,...own].filter(x=>(ui.cat==='all'||x.category===ui.cat)&&x.name.toLowerCase().includes(ui.query.toLowerCase()));
    const cats=[['all','Все'],['cardio','♥ Кардио'],['strength','✊ Сила'],['stability','⬡ Статика'],['mixed','⚡ Микс']];
    $('modal').innerHTML=`<div class="bw17-modal-shade"><div class="bw17-library">
      <div class="bw17-modal-head"><h2>Библиотека</h2><button data-action="bw17-close">✕</button></div>
      <input id="bw17-search" placeholder="Поиск упражнения" value="${esc(ui.query)}" autocomplete="off">
      <div class="bw17-filter">${cats.map(([k,label])=>`<button class="${ui.cat===k?'active':''}" data-action="bw17-cat:${k}">${label}</button>`).join('')}</div>
      <div class="bw17-library-list">${filtered.map(x=>{
        const existing=state.ex.find(a=>a.name.toLowerCase()===x.name.toLowerCase());
        const present=existing && (ui.mode==='easy' ? (quick.includes(existing.name)||ui.quickExtra.includes(existing.name)) : ui.active.includes(existing.id));
        return `<button class="bw17-libitem" data-action="bw17-add:${esc(x.name)}"><span>${x.icon||icon(x)}</span><span><b>${esc(x.name)}</b><small>${CATS[x.category]?.[1]||'Баланс'} · ${target(x)}</small></span><i>${present?'✓':'＋'}</i></button>`;
      }).join('')||'<p style="text-align:center;padding:16px">Нет совпадений</p>'}</div>
      <button class="bw17-library-done" data-action="bw17-close">Готово</button>
    </div></div>`;
    const search=$('bw17-search');if(search){search.addEventListener('input',()=>{
      ui.query=search.value;
      const caret=search.selectionStart;
      drawLibrary();
      $('bw17-search')?.focus();
      try{$('bw17-search')?.setSelectionRange(caret,caret)}catch{}
    });}
  }
  function addFromLibrary(name){
    const t=LIB.find(v=>v.name===name);
    let item=state.ex.find(x=>x.name.toLowerCase()===name.toLowerCase());
    if(!item && !t)return;
    if(!item){item={id:uid(),name:t.name,kind:t.kind,amount:t.amount,sets:t.sets,weight:0,category:t.category};state.ex.push(item);}
    if(ui.mode==='easy'){
      if(!quick.includes(item.name)){
        if(ui.quickExtra.includes(item.name))ui.quickExtra=ui.quickExtra.filter(v=>v!==item.name);
        else ui.quickExtra.push(item.name);
      }
    }else{
      if(ui.active.includes(item.id))ui.active=ui.active.filter(v=>v!==item.id);
      else ui.active.push(item.id);
    }
    persist();drawLibrary();render();
  }
  function quickModal(name){
    if(logged(name)){badge('Уже записано сегодня');return;}
    const item=LIB.find(x=>x.name===name)||state.ex.find(x=>x.name===name);
    if(!item)return;
    const minutes=Math.max(1,Math.round(item.amount/60));
    $('modal').innerHTML=`<div class="bw17-modal-shade"><div class="bw17-quick-modal"><h2>${esc(name)}</h2><p>${CATS[category(item)][1]} · лёгкая активность</p>
      <div class="bw17-minutes"><button data-action="bw17-qminutes:-5">−</button><strong id="bw17-qvalue">${minutes}</strong><span>мин</span><button data-action="bw17-qminutes:5">＋</button></div>
      <button class="bw17-action" data-action="bw17-log:${esc(name)}">✓ Записать активность</button><button class="bw17-action outline" data-action="bw17-close">Отмена</button>
    </div></div>`;
  }
  function nextCircuitItem(){
    const seq=ui.circ?.seq||[];
    return seq.findIndex(z=>!isDone(state.ex.find(x=>x.id===z.id)||{id:'none'},z.set));
  }
  function circuitBegin(){
    const list=chosen();
    if(!list.length){badge('Выбери упражнения');return;}
    const rounds=ui.mode==='circuit'?ui.round:1;
    if(ui.mode==='circuit'&&list.length<2){badge('Для круговой нужно минимум 2 упражнения');return;}
    if(ui.mode==='circuit')list.forEach(x=>{x.sets=rounds;});
    const seq=[];
    if(ui.mode==='circuit'){
      for(let r=1;r<=rounds;r++)for(const x of list)seq.push({id:x.id,set:r});
    } else {
      for(const x of list)for(let r=1;r<=x.sets;r++)seq.push({id:x.id,set:r});
    }
    ui.circ={seq};
    persist();state.view='session';render();
  }
  const oldSession=sessionScreen;
  sessionScreen=function(){
    if(!ui.circ)return oldSession();
    const at=nextCircuitItem();
    if(at<0){state.view='workout';ui.circ=null;return compactWorkout();}
    const z=ui.circ.seq[at],x=state.ex.find(y=>y.id===z.id);
    if(!x)return compactWorkout();
    const round=z.set,total=ui.circ.seq.length;
    const isTime=x.kind==='Секунды';
    const current=at+1;
    return `<div class="bw17-session">
      <div class="bw17-session-head"><button data-action="bw17-exit">‹</button><span>${ui.mode==='circuit'?'КРУГ '+round+' / '+ui.round:'ТРЕНИРОВКА'}</span><b>${current}/${total}</b></div>
      <div class="bw17-session-prog"><div style="width:${(at/total*100).toFixed(0)}%"></div></div>
      <div class="bw21-session-name"><span>УПРАЖНЕНИЕ</span><h1>${esc(x.name)}</h1></div>
      <div class="bw17-session-goal">${isTime?Math.round(x.amount/60)+' мин':x.amount+' повторений'}</div>
      <p>${CATS[category(x)][0]} Прокачка: ${CATS[category(x)][1]}</p>
      <button data-action="bw17-next" class="bw17-session-go">✓ Выполнено → Далее</button>
      <button class="bw17-session-skip" data-action="bw17-exit">Закончить на сегодня</button>
      <small>Отмечай только реально сделанные подходы.</small></div>`;
  };
  const oldProgress=progressScreen;
  progressScreen=function(){
    const v=statFor();
    const day=Object.values(doneRows()),minutes=day.reduce((n,x)=>n+x.minutes,0);
    return `<div class="bw17-progress"><h2>Мой прогресс</h2><div class="bw17-progress-intro"><strong>Этап ${level()} · ${ranks[level()]}</strong><span>${state.xp} XP</span></div>
      <div class="bw17-progress-stats">${['✊ Сила','♥ Выносливость','⬡ Стойкость','⚡ Энергия'].map((name,i)=>`<div><span>${name}</span><b>${v[i].toFixed(2)}</b></div>`).join('')}</div>
      <div class="bw17-progress-today"><b>Сегодня</b> · ${day.length} активностей · ${minutes} мин</div>
      <button class="bw17-action" data-action="go-workout">＋ Движение и тренировки</button>
      <small>Ходьба, бег и разминка учитываются отдельно. Полная тренировка даёт XP, лёгкая активность — небольшой игровой прогресс навыка.</small></div>`;
  };
  function completePlan(){
    const list=chosen();
    if(!list.length){badge('Выбери упражнения');return;}
    const original=state.ex;
    state.ex=list;
    try {finish();} finally {state.ex=original;save();render();}
  }
  const oldRender=render;
  render=function(){oldRender();document.body.classList.toggle('bw17-workout-page',state.view==='workout');document.body.classList.toggle('bw17-hero-page',state.view==='hero');document.body.classList.toggle('bw17-progress-page',state.view==='progress');document.body.classList.toggle('bw17-session-page',state.view==='session' && Boolean(ui.circ));};
  document.addEventListener('click',e=>{
    const b=e.target.closest('[data-action^="bw17-"]');if(!b)return;
    e.preventDefault();e.stopImmediatePropagation();e.stopPropagation();
    const key=b.dataset.action.slice(5),p=key.indexOf(':'),act=p<0?key:key.slice(0,p),val=p<0?'':key.slice(p+1);
    if(act==='mode')chooseMode(val);
    else if(act==='library')library();
    else if(act==='close'){$('modal').innerHTML='';render();}
    else if(act==='cat'){ui.cat=val;drawLibrary();}
    else if(act==='add')addFromLibrary(val);
    else if(act==='remove')select(val);
    else if(act==='quick')quickModal(val);
    else if(act==='qminutes'){const input=$('bw17-qvalue');if(input)input.textContent=String(Math.max(1,Math.min(240,Number(input.textContent)+Number(val))));}
    else if(act==='log'){
      const minutes=Number($('bw17-qvalue')?.textContent||0);
      const item=LIB.find(x=>x.name===val)||state.ex.find(x=>x.name===val);
      $('modal').innerHTML='';logActivity(val,minutes,category(item||{}));
    }
    else if(act==='mark'){
      const x=state.ex.find(z=>z.id===val);if(!x)return;
      const n=Array.from({length:x.sets},(_,i)=>i+1).find(i=>!isDone(x,i));
      if(n)book(x,n);else {badge('Все подходы отмечены');}
    }
    else if(act==='round'){ui.round=Math.max(1,Math.min(6,ui.round+Number(val)));persist();render();}
    else if(act==='start')circuitBegin();
    else if(act==='next'){
      const at=nextCircuitItem();if(at<0){state.view='workout';render();return;}
      const z=ui.circ.seq[at],x=state.ex.find(y=>y.id===z.id);
      if(x&&!isDone(x,z.set)){state.done[doneKey(x,z.set)]=true;save();}
      if(nextCircuitItem()<0){ui.circ=null;state.view='workout';badge('Раунды выполнены!');}
      render();
    }
    else if(act==='exit'){ui.circ=null;state.view='workout';render();}
    else if(act==='finish')completePlan();
  },true);
  window.BW17={LIB,ui,logActivity,statFor,chosen,mode:chooseMode,library,render,round:()=>ui.round};
  render();
})();