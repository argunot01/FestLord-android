const fs=require("node:fs");
const vm=require("node:vm");
const assert=require("node:assert/strict");
const events={};
const els={
  mlList:{innerHTML:""},musicStrip:{innerHTML:""},
  mlStatus:{textContent:"",className:""},
  modal:{innerHTML:""}
};
const ctx={
  console,setTimeout,clearTimeout,Date,Math,Promise,
  state:{view:"music"},audio:{pause(){},src:"",play(){return Promise.resolve()}},
  music(){return "old"},render(){},
  esc:s=>String(s).replaceAll("<","&lt;"),
  badge(){},
  document:{
    getElementById:id=>els[id]||null,
    addEventListener:(name,cb)=>events[name]=cb
  },
  NativeMusic:{
    listTracks:()=>JSON.stringify([
      {id:"123",title:"Тренировка",size:1024,added:1760000000000},
      {id:"456",title:"Отдых",size:2048,added:1750000000000}
    ]),
    pickTrack:()=>ctx.picked++,
    playTrack:id=>ctx.played=id,
    togglePause(){},stopTrack(){},renameTrack(){},deleteTrack(){}
  },
  window:{}
};
ctx.Audio=class{pause(){} play(){return Promise.resolve()}};
ctx.picked=0;
vm.createContext(ctx);
vm.runInContext(fs.readFileSync("app/src/main/assets/v08.js","utf8"),ctx);
assert.match(ctx.music(),/Сохранённые треки/);
assert.match(ctx.music(),/Сохранить музыку/);
ctx.render();
setTimeout(async ()=>{
  assert.match(els.mlList.innerHTML,/Тренировка/);
  assert.match(els.mlList.innerHTML,/Отдых/);
  assert.ok(els.mlList.innerHTML.indexOf("Тренировка")<els.mlList.innerHTML.indexOf("Отдых"));
  assert.match(els.mlList.innerHTML,/ml-rename:123/);
  assert.match(els.mlList.innerHTML,/ml-delete:123/);
  events.click({
    target:{closest:()=>({dataset:{action:"ml-add"}})},
    preventDefault(){},stopPropagation(){}
  });
  assert.equal(ctx.picked,1);
  await events.click({
    target:{closest:()=>({dataset:{action:"ml-play:123"}})},
    preventDefault(){},stopPropagation(){}
  });
  assert.equal(ctx.played,"123");
  console.log("PASS: music library UI, newest-first sorting, add, play, rename/delete controls");
},5);
