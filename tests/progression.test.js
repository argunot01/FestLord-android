const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
function game(){
 let date='2026-01-01';
 const state={xp:0,ex:[],done:{},awarded:{},dayXp:{},finished:{},
   trainingHistory:{},baselineLoads:[],previewStage:0,view:'hero'};
 const ctx={state,window:{},console,Math,Date,Number,Object,Array,Set,
   ranks:['','Новичок','Боец','Воин','Батыр','Легенда'],
   level:()=>1,stage:()=>1,heroIndex:()=>0,mainHero:()=>'',workout:()=>'',reward:()=>'',book:()=>{},finish:()=>{},
   save(){},render(){},badge(){},btn:()=>'',esc:String,
   today:()=>date,
   doneKey:(x,i)=>date+'/'+x.id+'/'+i,
   isDone:(x,i)=>!!state.done[date+'/'+x.id+'/'+i],
   setsTotal:()=>state.ex.reduce((n,x)=>n+x.sets,0),
   setsDone:()=>state.ex.reduce((n,x)=>n+Array.from({length:x.sets},(_,i)=>!!state.done[date+'/'+x.id+'/'+(i+1)]).filter(Boolean).length,0)};
 vm.createContext(ctx);
 vm.runInContext(fs.readFileSync('app/src/main/assets/v07.js','utf8'),ctx);
 const setDate=i=>{const d=new Date(Date.UTC(2026,0,1+i));date=d.toISOString().slice(0,10)};
 const complete=i=>{
   setDate(i);
   for(const x of state.ex)for(let set=1;set<=x.sets;set++)state.done[date+'/'+x.id+'/'+set]=true;
   ctx.finish();
 };
 return {state,ctx,complete,setDate};
}
const rules=game(),q=rules.ctx.window.BATYR_LEVEL_ENGINE;
assert.equal(q.levelXP(2),2400);
assert.equal(q.levelXP(3),9600);
assert.equal(q.levelXP(4),27600);
assert.equal(q.levelXP(5),63600);
assert.equal(q.requiredSessions(2),10);
assert.equal(q.requiredSessions(5),265);
assert.equal(q.earnedForLoad(30,1),51);
assert.equal(q.earnedForLoad(60,1),72);
assert.equal(q.earnedForLoad(100,2),105);
assert.equal(q.earnedForLoad(300,5),240);
assert.equal(q.earnedForLoad(10000,15),240,'reward capped even for unrealistic inputs');
assert.equal(q.earnedForLoad(100,5),120,'more distinct exercises increase XP modestly');

rules.state.ex=[{id:'one',name:'Отжимания',kind:'Повторения',amount:1,sets:1}];
rules.complete(0);
assert.equal(rules.state.xp,0,'1 pushup per day is never a complete session');
assert.equal(q.completedSessions(),0);

const light=game();
light.state.ex=[{id:'one',name:'Отжимания',kind:'Повторения',amount:15,sets:2}];
light.complete(0);
assert.equal(light.state.xp,51);
light.complete(0);
assert.equal(light.state.xp,51,'once per day cap');
assert.equal(light.ctx.level(),1,'single session is < 5% of stage 2 XP');
for(let i=1;i<47;i++)light.complete(i);
assert.equal(light.state.xp,51*47);
assert.equal(light.ctx.level(),1,'47 light sessions not enough for second rank');
light.complete(47);
assert.equal(light.ctx.level(),2,'48 light sessions unlock fighter');

const medium=game();
medium.state.ex=[
 {id:'push',name:'Отжимания',kind:'Повторения',amount:15,sets:3},
 {id:'squat',name:'Приседания',kind:'Повторения',amount:20,sets:3}
];
for(let i=0;i<22;i++)medium.complete(i);
assert.equal(medium.ctx.level(),1);
medium.complete(22);
assert.equal(medium.ctx.level(),2,'23 moderate workouts unlock Fighter');
assert.ok(medium.state.xp>=2400);
medium.state.ex=[{id:'easy',name:'Отжимания',kind:'Повторения',amount:10,sets:2}];
for(let i=23;i<30;i++)medium.complete(i);
assert.equal(medium.ctx.level(),2,'rank already earned never regresses after easier workouts');
assert.equal(medium.state.highestRank,2,'unlocked rank stored persistently');

const hard=game();
hard.state.ex=Array.from({length:5},(_,i)=>({id:'ex'+i,name:'Упражнение '+i,kind:'Повторения',amount:20,sets:3}));
for(let i=0;i<9;i++)hard.complete(i);
assert.equal(hard.ctx.level(),1);
hard.complete(9);
assert.equal(hard.ctx.level(),2,'10 varied high-volume sessions unlock rank 2');
hard.state.ex.forEach(x=>x.amount=22);
for(let i=10;i<40;i++)hard.complete(i);
assert.equal(hard.ctx.level(),3,'rank 3 requires substantial cumulative participation');
hard.state.ex.forEach(x=>x.amount=24);
for(let i=40;i<115;i++)hard.complete(i);
assert.equal(hard.ctx.level(),4,'rank 4 only after much longer progression');
hard.state.ex.forEach(x=>x.amount=25);
for(let i=115;i<265;i++)hard.complete(i);
assert.equal(hard.ctx.level(),5,'rank 5 after 265 qualifying capped high-volume sessions');

const gentle=game();
gentle.state.ex=[{id:'walk',name:'Ходьба',kind:'Секунды',amount:600,sets:1}];
gentle.complete(0);
assert.equal(gentle.state.xp,51,'10-minute low-impact cardio qualifies');
gentle.state.ex=[{id:'pl',name:'Планка',kind:'Секунды',amount:600,sets:1}];
gentle.complete(1);
assert.equal(gentle.state.xp,51,'single long plank cannot game the cardio exception');
gentle.state.ex[0].amount=45;gentle.state.ex[0].sets=2;
gentle.complete(2);
assert.ok(gentle.state.xp>51,'90 seconds of static holds in two sets qualifies');
console.log('PASS: five slow RPG ranks, 23 medium/48 light/10 hard sessions, progressive 40/115/265 gates, anti-farming.');
