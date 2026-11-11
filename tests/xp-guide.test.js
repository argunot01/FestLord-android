const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
let todayStr='2026-11-11';
const state={xp:0,view:'hero',previewStage:0,ex:[
 {id:'a',name:'Отжимания',kind:'Повторения',amount:15,sets:2,weight:0}
],done:{},finished:{},trainingHistory:{},baselineLoads:[],dayXp:{}};
const dom={modal:{innerHTML:''},musicStrip:{innerHTML:''}};
const listeners={};
let level=()=>1;
const ctx={
 window:{},state,console,Math,Date,Number,JSON,
 level,stage:()=>1,ranks:['','Новичок','Боец','Воин','Батыр','Легенда'],
 mainHero:()=>'<section class="v9-panel v9-next-rank"></section>',
 workout:()=>'<div class="v9-exercises"></div>',
 progressScreen:()=>'',reward:()=>'<div class="v9-reward-progress"></div>',
 heroIndex:()=>0,render(){},save(){},badge(){},btn:()=>'',esc:String,
 today:()=>todayStr,doneKey:(x,i)=>todayStr+'/'+x.id+'/'+i,
 isDone:(x,i)=>!!state.done[todayStr+'/'+x.id+'/'+i],
 setsTotal:()=>state.ex.reduce((n,x)=>n+x.sets,0),
 setsDone:()=>state.ex.reduce((n,x)=>n+Array.from({length:x.sets},(_,i)=>!!state.done[todayStr+'/'+x.id+'/'+(i+1)]).filter(Boolean).length,0),
 document:{
   getElementById:id=>dom[id]||null,
   addEventListener:(event,handler)=>listeners[event]=handler
 }
};
vm.createContext(ctx);
for(const file of ['v07.js','v12.js']){
 vm.runInContext(fs.readFileSync('app/src/main/assets/'+file,'utf8'),ctx);
}
const model=ctx.window.BATYR_XP_GUIDE.getModel;
const earn=ctx.window.BATYR_XP_GUIDE.formulaText;
assert.equal(earn(30).earned,27);
assert.equal(earn(30).bonus,3);
assert.equal(earn(0).earned,24);
assert.equal(earn(500).earned,38);
assert.equal(model().next,2);
assert.equal(model().xpNeeded,66);
assert.equal(model().sessionsNeeded,2);
assert.equal(model().missingXP,66);
assert.equal(model().forecast,3,"three 25-XP complete sessions assuming target load");
assert.match(ctx.mainHero(),/Ориентировочно ещё 3/);
assert.match(ctx.mainHero(),/Личная нагрузка/);
assert.match(ctx.workout(),/\+27 XP/,"complete planned 30-rep session forecasts 27 XP");
assert.match(ctx.workout(),/24 XP за тренировку/);
state.done[todayStr+'/a/1']=true;state.done[todayStr+'/a/2']=true;
ctx.finish();
assert.equal(state.xp,27);
assert.equal(model().missingXP,39);
assert.equal(model().missingSessions,1);
assert.equal(model().missingPasses,1);
assert.match(ctx.reward(),/Бонус за 30.0 балла нагрузки/);
assert.match(ctx.reward(),/\+3 XP/);
assert.match(ctx.workout(),/Уже начислено сегодня/);
ctx.finish();
assert.equal(state.xp,27,"No duplicate XP");
ctx.window.BATYR_XP_GUIDE.getModel();
state.trainingHistory[todayStr].load=30;
assert.equal(model().forecast,2);
listeners.click({target:{closest:()=>({dataset:{action:'xp12-explain'}})},preventDefault(){},stopPropagation(){}});
assert.match(dom.modal.innerHTML,/Как начисляются XP/);
assert.match(dom.modal.innerHTML,/повтор = 1 балл/);
console.log('PASS XP guide: formula, max cap, countdown by XP / sessions / load, real workout and reward detail');
