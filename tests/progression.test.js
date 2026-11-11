// Fast deterministic regression checks for the level-up rules in v07.js.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

let date = '2026-11-11';
let notifications = [];
const state = {
  xp: 0, ex: [], done: {}, awarded: {}, dayXp: {}, finished: {},
  previewStage: 0, trainingHistory: {}, baselineLoads: [], view: 'hero'
};
const ctx = {
  state, ranks: ['','Новичок','Развитие','Сила','Атлет','Легенда'], heroIndex:()=>1,
  level:()=>1, stage:()=>1, mainHero:()=>'', workout:()=>'', reward:()=>'', book:()=>{},
  finish:()=>{}, save:()=>{}, render:()=>{}, badge:x=>notifications.push(x),
  today:()=>date, doneKey:(e,i)=>date+'/'+e.id+'/'+i,
  isDone:(e,i)=>Boolean(state.done[date+'/'+e.id+'/'+i]),
  setsTotal:()=>state.ex.reduce((v,x)=>v+x.sets,0),
  setsDone:()=>state.ex.reduce((v,x)=>v+Array.from({length:x.sets},(_,i)=>Boolean(state.done[date+'/'+x.id+'/'+(i+1)])).filter(Boolean).length,0),
  btn:()=>'',esc:String,console,Math,Number,Object,Array,Date,
};
vm.createContext(ctx);
vm.runInContext(fs.readFileSync('app/src/main/assets/v07.js','utf8'),ctx);

const pushup = {id:'p',name:'Отжимания',kind:'Повторения',amount:1,sets:1};
state.ex = [pushup];
state.done[date+'/p/1'] = true;
ctx.finish();
assert.equal(state.xp,0,'1 pushup cannot earn full workout XP');
assert.equal(Object.keys(state.trainingHistory).length,0,'1 pushup cannot qualify as workout');
assert.equal(ctx.level(),1);

const moderate = {id:'p',name:'Отжимания',kind:'Повторения',amount:8,sets:2};
state.ex = [moderate];
function fullWorkout(){
  state.done[date+'/p/1']=true;
  state.done[date+'/p/2']=true;
  ctx.finish();
}
fullWorkout();
assert.ok(state.xp>0,'2 sets with sufficient repetitions qualify');
const awarded=state.xp;
ctx.finish();
assert.equal(state.xp,awarded,'same day cannot earn twice');

for(const d of ['2026-11-12','2026-11-13']){
  date=d;
  fullWorkout();
}
assert.equal(state.baselineLoads.length,3,'personal baseline freezes after 3 meaningful sessions');
assert.equal(ctx.level(),1,'XP without growth does not auto-unlock the next level');
assert.equal(state.trainingHistory['2026-11-13'].load,16);

moderate.amount=9;
for(const d of ['2026-11-14','2026-11-15']){
  date=d;
  fullWorkout();
}
assert.ok(ctx.level()>=2,'2 recent sessions above personal baseline unlock attainable level 2');

date='2026-11-16';
state.ex=[{id:'w',name:'Ходьба',kind:'Секунды',amount:600,sets:1}];
state.done[date+'/w/1']=true;
const beforeCardio=state.xp;
ctx.finish();
assert.ok(state.xp>beforeCardio,'10 minutes of walking can qualify as accessible low-impact session');

date='2026-11-17';
state.ex=[{id:'plank',name:'Планка',kind:'Секунды',amount:600,sets:1}];
state.done[date+'/plank/1']=true;
const beforePlank=state.xp;
ctx.finish();
assert.equal(state.xp,beforePlank,'a 10-minute single plank must not count as cardio');

console.log('PASS: 1-rep anti-farming, daily cap, baseline, individual workload progress, accessible cardio');
