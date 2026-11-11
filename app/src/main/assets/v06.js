/* Batyr's Way v0.6 visual and workout UX extension — standalone and offline. */
(function(){
  'use strict';
  const stageNames=['','Новичок','Боец','Воин','Батыр','Легенда'];
  const stageRanges=['','1–10','11–25','26–50','51–75','76–100'];
  const stagePics=[0,1,2,3,4];

  function artFor(n) { return HERO_IMAGES[stagePics[n-1]]; }
  function milestones() {
    const current=stage(), preview=state.previewStage||current;
    return '<div class="rpg-heading"><span>ПУТЬ СТАНОВЛЕНИЯ БАТЫРА</span><span>'+level()+' / 100</span></div>'+
      '<div class="rpg-chapters">'+stageNames.slice(1).map((name,i)=>{
        const n=i+1,active=n===preview,unlocked=n<=current;
        return '<button type="button" class="rpg-chapter '+(active?'selected ':'')+(unlocked?'unlocked':'locked')+
          '" data-action="preview:'+n+'" aria-label="Показать этап '+n+', '+name+'">'+
          '<b>'+n+'</b><span>'+name+'</span></button>';
      }).join('')+'</div>';
  }
  const originalHero=mainHero;
  mainHero=function(){
    let html=originalHero();
    html=html.replace(/<div class="stageLine">[\s\S]*?<\/div>/,milestones());
    html=html.replace('<div class="heroScene">','<div class="heroScene rpg-scene">'+
      '<div class="rpg-stars" aria-hidden="true"></div><div class="rpg-sun" aria-hidden="true"></div>');
    const preview=state.previewStage||stage();
    const copy=preview>stage()
      ?'<div class="chapter-notice">Будущий облик · открывается на '+stageRanges[preview]+' уровнях</div>'
      :'<div class="chapter-notice live">Твой текущий путь · этап '+stage()+'</div>';
    html=html.replace('<div class="heroStats">',copy+'<div class="heroStats">');
    html=html.replace('Сегодня выполнено','Сегодня пройдено');
    return html;
  };

  function gallery(){
    const current=stage();
    return '<section class="card rpg-gallery"><div class="caps">ЗАЛ СЛАВЫ</div>'+
      '<h2>Пять обликов героя</h2><p>Тренируйся в жизни, чтобы открывать новые этапы. Предпросмотр не добавляет XP.</p>'+
      '<div class="rpg-gallery-grid">'+stageNames.slice(1).map((name,i)=>{
        const n=i+1;
        const locked=n>current;
        return '<button type="button" class="gallery-item '+(locked?'locked':'unlocked')+
          '" data-action="preview:'+n+'" aria-label="Открыть предпросмотр '+name+'">'+
          '<div class="gallery-picture"><img loading="lazy" src="'+artFor(n)+'" alt=""></div>'+
          '<strong>'+(locked?'🔒 ':'')+name+'</strong><small>Уровни '+stageRanges[n]+'</small></button>';
      }).join('')+'</div></section>';
  }

  const originalProgress=progressScreen;
  progressScreen=function(){
    const date=new Date(), days=[];
    for(let d=6;d>=0;d--){
      const x=new Date(date.getFullYear(),date.getMonth(),date.getDate()-d);
      const key=x.getFullYear()+'-'+String(x.getMonth()+1).padStart(2,'0')+'-'+String(x.getDate()).padStart(2,'0');
      const finished=Boolean(state.finished[key]);
      const earned=state.dayXp[key]||0;
      days.push('<div class="rpg-day '+(finished?'done':'')+'"><span>'+x.toLocaleDateString('ru-RU',{weekday:'short'})+
        '</span><b>'+(finished?'✓':earned?'⚔':'·')+'</b><small>'+earned+' XP</small></div>');
    }
    return '<div class="rpg-heading">МОЙ ПУТЬ</div>'+
      '<div class="card"><h2>Последние 7 дней</h2><div class="rpg-week">'+days.join('')+'</div>'+
      '<p class="small">✓ — тренировка завершена. Пропущенный день не обнуляет твой опыт.</p></div>'+
      gallery()+originalProgress();
  };

  function motionKind(name){
    const n=name.toLowerCase();
    if(n.includes('отжим')||n.includes('жим от пола')) return 'pushup';
    if(n.includes('присед')) return 'squat';
    if(n.includes('подтяг')) return 'pullup';
    if(n.includes('планк')) return 'plank';
    if(n.includes('бег')||n.includes('ходьб')||n.includes('вело')) return 'walk';
    return 'strength';
  }
  function motionSvg(ex) {
    const kind=motionKind(ex.name);
    let drawing='';
    const line=(x1,y1,x2,y2)=>'<line x1="'+x1+'" y1="'+y1+'" x2="'+x2+'" y2="'+y2+'" />';
    const dot=(x,y,r)=>'<circle cx="'+x+'" cy="'+y+'" r="'+r+'"/>';
    if(kind==='pushup'||kind==='plank'){
      drawing='<g class="rpg-moving">'+
      '<path d="M105 108 L200 104 L253 142 M105 108 L66 163 M200 104 L226 158" />'+
      '<path d="M253 142 L268 170 M226 158 L210 173" />'+
      '<circle cx="88" cy="103" r="16"/>'+
      '</g>';
    } else if(kind==='squat'){
      drawing='<g class="rpg-moving">'+
      '<circle cx="180" cy="43" r="17"/><path d="M179 63 L178 116 M179 75 L140 112 M179 75 L217 112 M179 116 L157 150 L176 173 M179 116 L202 150 L222 174"/>'+
      '</g>';
    } else if(kind==='pullup'){
      drawing='<path class="rpg-bar" d="M70 34 H290"/>'+
      '<g class="rpg-moving"><circle cx="181" cy="86" r="15"/>'+
      '<path d="M181 101 L181 143 M180 109 L129 34 M180 109 L232 34 M181 142 L164 175 M181 142 L201 175"/></g>';
    } else if(kind==='walk'){
      drawing='<g class="rpg-moving"><circle cx="177" cy="47" r="17"/>'+
      '<path d="M178 67 L178 126 M178 84 L142 111 M178 84 L212 109 M178 124 L143 174 M178 124 L220 174"/></g>';
    } else {
      drawing='<g class="rpg-moving"><circle cx="180" cy="52" r="17"/>'+
      '<path d="M179 70 L179 126 M178 90 L137 78 M178 90 L222 78 M180 125 L153 171 M180 125 L207 171"/></g>'+
      '<path class="rpg-bar" d="M112 74 H248 M115 61 V87 M244 61 V87"/>';
    }
    return '<svg class="rpg-movement '+kind+'" viewBox="0 0 360 210" role="img" aria-label="Схематичная анимация упражнения '+esc(ex.name)+'">'+
      '<defs><radialGradient id="rpgSpot"><stop stop-color="#e4af50" stop-opacity=".22"/><stop offset="1" stop-color="#e4af50" stop-opacity="0"/></radialGradient></defs>'+
      '<ellipse cx="180" cy="115" rx="165" ry="101" fill="url(#rpgSpot)"/>'+
      '<path class="rpg-floor" d="M16 180 H344"/>'+
      '<g class="rpg-figure">'+drawing+'</g></svg>';
  }

  const originalSession=sessionScreen;
  sessionScreen=function(){
    const ex=state.ex.find(x=>x.id===session?.id);
    const html=originalSession();
    if(!ex) return html;
    return html.replace(/<figure>[\s\S]*?<\/figure>/,
      '<figure class="rpg-demo">'+motionSvg(ex)+
      '<figcaption>Анимация движения · не счётчик повторений</figcaption></figure>');
  };

  const originalWorkout=workout;
  workout=function(){
    let html=originalWorkout();
    const tally=state.ex.filter(x=>x.sets>0).length;
    html=html.replace('<div class="title">⚔ Мои тренировки</div>',
      '<div class="title">⚔ Мои тренировки</div>'+
      '<div class="rpg-workout-summary"><div><strong>'+tally+'</strong><small>упражнений</small></div>'+
      '<div><strong>'+setsDone()+'/'+setsTotal()+'</strong><small>подходов</small></div>'+
      '<div><strong>'+Math.max(0,120-(state.dayXp[today()]||0))+'</strong><small>XP доступно</small></div></div>');
    return html;
  };

  document.addEventListener('click',function(e){
    const b=e.target.closest('[data-action^="preview:"]');
    if(!b) return;
    e.stopPropagation();
    e.preventDefault();
    const n=Number(b.dataset.action.split(':')[1]);
    if(!Number.isInteger(n)||n<1||n>5)return;
    state.previewStage=n;
    state.view='hero';
    render();
    window.scrollTo({top:0,behavior:'smooth'});
  },true);
})();