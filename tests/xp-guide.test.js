const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
let todayStr='2026-11-11';
const state={xp:0,view:'hero',previewStage:0,ex:[
 {id:'a',name:'Отжимания',kind:'Повторения',amount:15,sets:2,weight:0}
],done:{},finished:{},trainingHistory:{},baselineLoads:[],dayXp:{}};
const dom={modal:{innerHTML:''},musicStrip:{innerHTML:''}},listeners={};
const ctx={
 window:{},state,console,Math,Date,Number,JSON,Set,
 level:()=>1,stage:()=>1,ranks:['','Новичок','Боец','Воин','Батыр','Легенда'],
 mainHero:()=>'<section class="v9-panel v9-next-rank"></section>',
 workout:()=>'<div class="v9-exercises"></div>',progressScreen:()=>'',reward:()=>'<div class="v9-reward-progress"></div>',
 heroIndex:()=>0,render(){},save(){},badge(){},btn:()=>'',esc:String,
 today:()=>todayStr,doneKey:(x,i)=>todayStr+'/'+x.id+'/'+i,
 isDone:(x,i)=>!!state.done[todayStr+'/'+x.id+'/'+i],
 setsTotal:()=>state.ex.reduce((n,x)=>n+x.sets,0),
 setsDone:()=>state.ex.reduce((n,x)=>n+Array.from({length:x.sets},(_,i)=>!!state.done[todayStr+'/'+x.id+'/'+(i+1)]).filter(Boolean).length,0),
 document:{getElementById:id=>dom[id]||null,addEventListener:(event,handler)=>listeners[event]=handler}
};
vm.createContext(ctx);
for(const file of ['v07.js','v12.js'])vm.runInContext(fs.readFileSync('app/src/main/assets/'+file,'utf8'),ctx);
const model=ctx.window.BATYR_XP_GUIDE.getModel;
const breakdown=ctx.window.BATYR_XP_GUIDE.formulaText;
assert.equal(breakdown(30,1).earned,51);
assert.equal(breakdown(30,1).base,30);
assert.equal(breakdown(30,1).effort,21);
assert.equal(breakdown(30,1).variety,0);
assert.equal(breakdown(100,5).earned,120);
assert.equal(breakdown(300,5).earned,240);
assert.equal(model().next,2);
assert.equal(model().xpNeeded,2400);
assert.equal(model().sessionsNeeded,10);
assert.equal(model().missingXP,2400);
assert.equal(model().forecast,48,'light 2x15 workout requires 48 sessions');
assert.match(ctx.mainHero(),/Ориентировочно ещё 48/);
assert.match(ctx.mainHero(),/Боец/);
assert.match(ctx.workout(),/\+51 XP/);
assert.match(ctx.workout(),/Базовый XP/);
assert.match(ctx.workout(),/За разные упражнения/);
state.done[todayStr+'/a/1']=true;
state.done[todayStr+'/a/2']=true;
ctx.finish();
assert.equal(state.xp,51);
assert.equal(model().missingXP,2349);
assert.equal(model().missingSessions,9);
assert.equal(model().missingPasses,1);
assert.match(ctx.reward(),/За 30.0 балла нагрузки/);
assert.match(ctx.reward(),/\+21 XP/);
assert.match(ctx.workout(),/Уже начислено сегодня/);
ctx.finish();
assert.equal(state.xp,51,'same day cannot earn twice');
assert.equal(model().forecast,47);
listeners.click({target:{closest:()=>({dataset:{action:'xp12-explain'}})},preventDefault(){},stopPropagation(){}});
assert.match(dom.modal.innerHTML,/Как начисляются XP/);
assert.match(dom.modal.innerHTML,/3 × 10 отжиманий/);
assert.match(dom.modal.innerHTML,/Максимум \+240 XP/);
console.log('PASS: long-term stage thresholds, low/medium/high effort XP, accurate forecast and per-session breakdown.');
