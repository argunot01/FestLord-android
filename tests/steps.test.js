const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const state={view:'hero'},callbacks={};
const nodes={
 main:{innerHTML:''},nav:{innerHTML:''},
 'bw20-mini-host':{innerHTML:''}
};
let steps=1500,goal=7000,permission=false;
const snapshots=()=>JSON.stringify({supported:true,granted:permission,active:permission,started:true,today:steps,goal,
 week:[
 {date:'2026-11-11',steps:800},{date:'2026-11-12',steps:1500},
 {date:'2026-11-13',steps:3200},{date:'2026-11-14',steps:4100},
 {date:'2026-11-15',steps:5300},{date:'2026-11-16',steps:6800},
 {date:'2026-11-17',steps}
]});
const ctx={
 state,
 window:{},console,Math,Date,Number,
 localStorage:{getItem:()=>null,setItem(){}},
 esc:String,
 mainHero:()=>'<section class="v9-quest-strip">test</section>',
 progressScreen:()=>'<div>progress</div>',
 render(){},
 NativeSteps:{
  getSnapshot:snapshots,
  requestAccess(){permission=true;},
  setGoal:n=>{goal=n;return true;}
 },
 document:{
  getElementById:id=>nodes[id]||null,
  addEventListener:(name,cb)=>callbacks[name]=cb
 }
};
vm.createContext(ctx);
vm.runInContext(fs.readFileSync('app/src/main/assets/v20.js','utf8'),ctx);
assert.match(ctx.mainHero(),/Шаги сегодня/);
assert.ok(ctx.mainHero().replace(/\u00a0/g,' ').includes('1 500'));
assert.match(ctx.window.BatyrStepsApp.screen(),/Последние 7 дней/);
assert.match(ctx.window.BatyrStepsApp.screen(),/Разрешить подсчёт шагов/);
const stepClick=action=>callbacks.click({target:{closest:()=>({dataset:{action}})},preventDefault(){},stopImmediatePropagation(){}});
stepClick('go-steps');
assert.equal(state.view,'steps');
assert.match(nodes.main.innerHTML,/Мой шагомер/);
assert.ok(nodes.main.innerHTML.replace(/\u00a0/g,' ').includes('1 500'));
stepClick('bw20-permission');
assert.equal(permission,true);
steps=2999;
ctx.window.BatyrStepsApp.onNativeEvent('steps');
assert.ok(nodes.main.innerHTML.replace(/\u00a0/g,' ').includes('2 999'));
nodes['bw20-goal']={value:'8000'};
stepClick('bw20-setgoal');
assert.equal(goal,8000);
assert.ok(nodes.main.innerHTML.replace(/\u00a0/g,' ').includes('8 000'));
assert.doesNotMatch(nodes.main.innerHTML,/автоматически.*?XP<\/b>/);
assert.match(nodes.main.innerHTML,/шаги автоматически не дают XP/);
console.log('PASS: step sensor screen, goal, weekly graph, permission and live native updates');
