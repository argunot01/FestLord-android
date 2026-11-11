const assert=require("node:assert/strict");
const fs=require("node:fs");
const vm=require("node:vm");
let date="2026-11-11";
const state={
  xp:0,ex:[],done:{},dayXp:{},finished:{},trainingHistory:{},baselineLoads:[],
  previewStage:0,view:"workout"
};
const ctx={
  window:{},state,console,Math,Date,Number,Object,Array,
  ranks:["","Новичок","Боец","Воин","Батыр","Легенда"],
  level:()=>1,stage:()=>1,heroIndex:()=>0,mainHero:()=>"",workout:()=>'<div class="v9-exercises"></div>',
  reward:()=>"",progressScreen:()=>"",book:()=>{},finish:()=>{},save:()=>{},render:()=>{},
  badge:()=>{},today:()=>date,esc:String,btn:()=>"",
  doneKey:(x,i)=>date+"/"+x.id+"/"+i,
  isDone:(x,i)=>Boolean(state.done[date+"/"+x.id+"/"+i]),
  setsTotal:()=>state.ex.reduce((n,x)=>n+x.sets,0),
  setsDone:()=>state.ex.reduce((n,x)=>n+Array.from({length:x.sets},(_,i)=>Boolean(state.done[date+"/"+x.id+"/"+(i+1)])?1:0).reduce((a,b)=>a+b,0),0),
  document:{}, 
};
vm.createContext(ctx);
vm.runInContext(fs.readFileSync("app/src/main/assets/v07.js","utf8"),ctx);
vm.runInContext(fs.readFileSync("app/src/main/assets/v11.js","utf8"),ctx);
const {detect,scoreSession,stats}=ctx.window.BATYR_STAT_ENGINE;
assert.equal(detect("Жим лёжа"),"strength");
assert.equal(detect("Становая тяга"),"strength");
assert.equal(detect("Приседания со штангой"),"strength");
assert.equal(detect("Велотренажёр"),"cardio");
assert.equal(detect("Ходьба"),"cardio");
assert.equal(detect("Бег"),"cardio");
assert.equal(detect("Планка"),"stability");
assert.equal(detect("Удержание веса"),"stability");
assert.equal(ctx.window.BATYR_GET_CATEGORY({name:"Бег",category:"strength"}),"strength","explicit user override");

const complete=(kind,name,amount,sets)=>
  scoreSession([{id:"x",name,kind,amount,sets}],()=>true).points;
const strength=complete("Повторения","Жим лёжа",8,4);
const cardio=complete("Секунды","Велотренажёр",900,1);
const staticHold=complete("Секунды","Планка",60,3);
assert.ok(strength.strength>strength.endurance*5,"lifting mainly improves strength");
assert.ok(strength.resilience>strength.endurance,"lifting improves resilience more than cardio endurance");
assert.ok(cardio.endurance>cardio.strength*5,"cardio mainly improves endurance");
assert.ok(staticHold.resilience>staticHold.endurance*5,"plank mainly improves resilience");
assert.ok(strength.energy>0&&cardio.energy>0,"regular activity provides small game-energy growth");

const squat={id:"s",name:"Приседания",kind:"Повторения",amount:12,sets:2,category:"strength"};
state.ex=[squat];
for(let n=1;n<=2;n++)state.done[date+"/s/"+n]=true;
ctx.finish();
const first=stats();
assert.ok(first.strength>1,"valid strength session increases strength");
assert.equal(state.trainingHistory[date].statExercises[0].category,"strength");
const earned=state.xp;
ctx.finish();
assert.equal(state.xp,earned,"duplicate finish blocked");
assert.equal(stats().strength,first.strength,"duplicate finish doesn't award additional strength");
squat.amount=100;
assert.equal(stats().strength,first.strength,"editing future exercise doesn't retroactively change archived scores");

date="2026-11-12";
const walk={id:"w",name:"Ходьба",kind:"Секунды",amount:900,sets:1,category:"cardio"};
state.ex=[walk];state.done[date+"/w/1"]=true;ctx.finish();
const second=stats();
assert.ok(second.endurance>first.endurance,"walking increases endurance");
assert.ok(second.endurance-first.endurance>second.strength-first.strength,"walking adds more endurance than strength");
assert.ok(state.lastReward.statGains.endurance>state.lastReward.statGains.strength,"award screen receives actual type-specific gains");

date="2026-11-13";
state.ex=[{id:"q",name:"Жим лёжа",kind:"Повторения",amount:1,sets:1,category:"strength"}];
state.done[date+"/q/1"]=true;
const before=stats();
ctx.finish();
assert.equal(state.trainingHistory[date],undefined,"one repetition not a qualified workout");
assert.equal(stats().strength,before.strength,"one push-up can't farm RPG stats");
console.log("PASS: strength/cardio/static classification, differentiated gains, history snapshot, no duplicate or single-rep farm.");
