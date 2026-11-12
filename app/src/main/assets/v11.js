/* Batyr's Way v1.1: category-based, self-reported RPG attributes. */
(function () {
  "use strict";
  const labels={
    strength:{name:"Силовая",icon:"💪",focus:"Сила",tip:"Жим, тяги, приседания, отжимания"},
    cardio:{name:"Кардио",icon:"❤️",focus:"Выносливость",tip:"Бег, ходьба, велосипед, плавание"},
    stability:{name:"Статическая",icon:"🛡",focus:"Стойкость",tip:"Планка, удержания, изометрия"},
    mixed:{name:"Смешанная",icon:"⚡",focus:"Баланс",tip:"Круговая и функциональная тренировка"}
  };
  const names=["Сила","Выносливость","Стойкость","Энергия"];
  const statKeys=["strength","endurance","resilience","energy"];
  const weights={
    strength:[1,.04,.28,.08],
    cardio:[.04,1,.12,.25],
    stability:[.18,.12,1,.12],
    mixed:[.55,.55,.45,.23]
  };
  const units={
    strength:{reps:25,seconds:120},
    cardio:{reps:50,seconds:600},
    stability:{reps:40,seconds:120},
    mixed:{reps:35,seconds:300}
  };
  const clamp=(n,lower,upper)=>Math.min(upper,Math.max(lower,Number(n)||0));
  const round=(n,precision=2)=>Number(n.toFixed(precision));
  // v1.1 awarded 0–5 skill points per session and could make a newbie
  // stronger than the fighter preview immediately. v1.6 reduces skill gains
  // without deleting older workout records.
  const SKILL_SCALE=.05;
  const STAGE_TEMPLATES=[
    [1,1,1,1],   // 1 Novice
    [3,3,2,2],   // 2 Fighter
    [5,4,4,3],   // 3 Warrior
    [7,6,6,5],   // 4 Batyr
    [10,9,8,7]   // 5 Legend
  ];
  const normalizedPoints=(points,version)=>{
    const coef=Number(version)>=2?1:SKILL_SCALE;
    return Object.fromEntries(statKeys.map(k=>[k,round(clamp(points&&points[k],0,5)*coef,3)]));
  };
  const rankCap=rank=>{
    const stageNum=Math.max(1,Math.min(5,Math.floor(Number(rank)||1)));
    if(stageNum===5)return [99,99,99,99];
    // No current-stage attribute may overtake even one previewed skill
    // of the NEXT stage. Categories remain independent.
    return STAGE_TEMPLATES[stageNum].map(n=>n-.1);
  };
  const detect=name=>{
    const n=String(name||"").toLowerCase().replace(/ё/g,"е");
    if(/планк|статич|изометр|удерж|wall.?sit|вис\b|баланс|равновес|фермерск|farmer.?carry|hold\b/i.test(n))return "stability";
    if(/бег|ходьб|вел|кардио|плаван|эллип|скакал|степпер|прогул|кросс\b|jogg|cycling|running|walking|swim|жүгір|жүру|жузу/i.test(n))return "cardio";
    if(/бурп|берпи|кругов|интервал|hiit|кроссфит|функцион|комплекс|бокс|мма|борьб|танц|jumping.?jack/i.test(n))return "mixed";
    if(/отжим|подтяг|присед|штанг|гантел|станов|жим|тяга|тяги|гиря|гире|бицепс|трицепс|скруч|пресс\b|шведск|выпад|squat|deadlift|bench|push.?up|pull.?up|lunge|curl/i.test(n))return "strength";
    return "mixed";
  };
  function category(ex) {
    if(ex && Object.prototype.hasOwnProperty.call(labels,ex.category))return ex.category;
    return detect(ex&&ex.name);
  }
  function scoreSession(exercises, done) {
    const totals=[0,0,0,0], breakdown={strength:0,cardio:0,stability:0,mixed:0};
    const details=[];
    for(const x of exercises||[]){
      const repsPerSet=clamp(x.amount,0,10000),sets=clamp(x.sets,0,12);
      if(!repsPerSet||!sets)continue;
      let complete=0;
      for(let i=1;i<=sets;i++)if(done(x,i))complete++;
      if(complete===0)continue;
      const kind=category(x), conversion=units[kind];
      const volume=complete*repsPerSet;
      const dose=clamp(volume/(x.kind==="Секунды"?conversion.seconds:conversion.reps),0,3);
      breakdown[kind]+=dose;
      details.push({id:String(x.id||""),name:String(x.name||"").slice(0,70),
        category:kind,sets:complete,kind:x.kind,amount:repsPerSet,
        seconds:x.kind==="Секунды"?volume:0,repetitions:x.kind==="Секунды"?0:volume});
      weights[kind].forEach((w,index)=>totals[index]+=dose*w);
    }
    if(details.length>0) {
      totals[2]+=.12; // modest resilience for completing an honest session
      totals[3]+=.12; // small game energy progression for consistency
    }
    // Hard daily cap and logarithmic saturation protect against inflated volume.
    const points=totals.map(n=>round(Math.min(5,5*Math.log2(1+Math.max(0,n))/Math.log2(6))*SKILL_SCALE,3));
    return {
      version:2,
      points:Object.fromEntries(statKeys.map((k,i)=>[k,points[i]])),
      breakdown:Object.fromEntries(Object.entries(breakdown).map(([k,v])=>[k,round(v)])),
      exercises:details
    };
  }
  function stats(){
    const scores=Object.fromEntries(statKeys.map(k=>[k,1]));
    const archive=state.trainingHistory && typeof state.trainingHistory==="object"?state.trainingHistory:{};
    for(const entry of Object.values(archive)){
      const p=entry&&entry.statPoints;
      if(!p||typeof p!=="object")continue;
      const corrected=normalizedPoints(p,entry.statVersion||1);
      for(const key of statKeys)scores[key]+=corrected[key];
    }
    const cap=rankCap(level());
    return Object.fromEntries(statKeys.map((k,i)=>[k,round(Math.min(cap[i],scores[k]),2)]));
  }
  function recentFocus(days=14){
    const current=new Date();
    const start=new Date(current.getFullYear(),current.getMonth(),current.getDate()-days+1).getTime();
    const summary={strength:0,cardio:0,stability:0,mixed:0};
    for(const [date,entry] of Object.entries(state.trainingHistory||{})){
      const time=Date.parse(date+"T12:00:00");
      if(!Number.isFinite(time)||time<start||!entry||!entry.statBreakdown)continue;
      for(const k of Object.keys(summary))summary[k]+=clamp(entry.statBreakdown[k],0,30);
    }
    return summary;
  }
  const format=n=>Number(n).toLocaleString("ru-RU",{minimumFractionDigits:1,maximumFractionDigits:1});
  const currentStats=()=>Object.values(stats());
  window.BATYR_GET_CATEGORY=category;
  window.BATYR_SCORE_WORKOUT=()=>scoreSession(state.ex,(x,i)=>isDone(x,i));
  window.BATYR_GAME_STATS=currentStats;
  window.BATYR_STAT_NAMES=names;
  window.BATYR_STAT_ENGINE={detect,category,scoreSession,stats,recentFocus,normalizedPoints,rankCap,STAGE_TEMPLATES};
  window.BATYR_NORMALIZE_GAIN=normalizedPoints;

  function attrRows(values){
    const symbols=["💪","❤️","🛡","⚡"];
    return '<div class="v11-attrs">'+values.map((v,i)=>
      '<div class="v11-attr-row"><span>'+symbols[i]+' '+names[i]+'</span>'+
      '<div class="v11-attr-track"><div style="width:'+clamp((Number(v)-1)*2.5,2,100)+'%"></div></div>'+
      '<b>'+format(v)+'</b></div>').join("")+'</div>';
  }
  const oldProgress=progressScreen;
  progressScreen=function(){
    const current=stats(),values=statKeys.map(k=>current[k]),recent=recentFocus();
    const max=Math.max(.01,...Object.values(recent));
    const kindRows=Object.entries(recent).map(([key,dose])=>
      '<div class="v11-kind"><span>'+labels[key].icon+' '+labels[key].name+'</span>'+
      '<div class="v11-kind-track"><div style="width:'+(dose/max*100).toFixed(1)+'%"></div></div>'+
      '<b>'+format(dose)+'</b></div>').join("");
    const weakest=statKeys.slice(0,3).sort((a,b)=>current[a]-current[b])[0];
    const helps={
      strength:"Добавь упражнения с собственным весом, гантелями или штангой с комфортной техникой.",
      endurance:"Добавь посильную ходьбу, велосипед или другое кардио.",
      resilience:"Добавь короткие статические удержания, например планку в комфортной форме."
    };
    return '<div class="card v11-card"><div class="caps">ИГРОВЫЕ ХАРАКТЕРИСТИКИ</div>'+
      '<h2>Что ты действительно тренируешь</h2>'+attrRows(values)+
      '<p class="small">Каждое занятие добавляет немного навыков. Уровень ограничивает максимальные показатели: Новичок не может быть сильнее Бойца из предпросмотра. Бег развивает прежде всего выносливость, штанга — силу.</p></div>'+
      '<div class="card v11-card"><div class="caps">ПОСЛЕДНИЕ 14 ДНЕЙ</div><h2>Какие нагрузки преобладают</h2>'+
      kindRows+
      '<div class="v11-suggestion"><b>Чтобы развиваться гармоничнее:</b><p>'+helps[weakest]+'</p></div>'+
      '<p class="small">«Энергия» — игровое поощрение регулярности и разнообразия. Это не показатель усталости или здоровья.</p></div>'+
      oldProgress();
  };

  const oldWorkout=workout;
  workout=function(){
    let html=oldWorkout();
    const content='<div class="v11-legend"><b>Прокачка навыков зависит от упражнений</b>'+
      '<div>💪 Штанга и отжимания → сила · ❤️ Бег и велосипед → выносливость</div>'+
      '<div>🛡 Планка и удержания → стойкость · ⚡ Разные нагрузки → энергия</div>'+
      '<p>Нажми «Изменить», чтобы выбрать категорию вручную.</p></div>';
    return html.replace('<div class="v9-exercises">',content+'<div class="v9-exercises">');
  };
  render();
})();