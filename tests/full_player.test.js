const fs=require("node:fs");
const vm=require("node:vm");
const assert=require("node:assert/strict");
const list=[
  {id:"a",title:"Первая",added:4,size:1024},
  {id:"b",title:"Вторая",added:3,size:2048},
  {id:"c",title:"Третья",added:2,size:4096}
];
const played=[],seeked=[];
const els={
  musicStrip:{innerHTML:"",className:""},
  p10List:{innerHTML:""},p10Status:{textContent:"",className:""}
};
const ctx={
  console,Date,Math,Promise,Number,JSON,
  Audio:class{constructor(){this.paused=true;this.currentTime=0;this.duration=60;this.src="";}pause(){this.paused=true}play(){this.paused=false;return Promise.resolve()}removeAttribute(){}},
  NativeMusic:{
    listTracks:()=>JSON.stringify(list),
    playTrack:id=>played.push(id),seekTo:n=>seeked.push(n),
    requestPosition(){},stopTrack(){},togglePause(){},
    renameTrack(){},deleteTrack(){},pickTrack(){}
  },
  localStorage:{getItem:()=>null,setItem(){}},
  window:{BatyrMusic:{}},
  state:{view:"hero"},render(){},music(){return ""},
  esc:String,
  audio:{pause(){}},
  document:{
    body:{classList:{toggle(){}}},
    getElementById:id=>els[id]||null,
    addEventListener(){}
  },
  setInterval(){}
};
vm.createContext(ctx);
vm.runInContext(fs.readFileSync("app/src/main/assets/v10.js","utf8"),ctx);
const wait=()=>new Promise(r=>setTimeout(r,2));
(async()=>{
  await wait();
  assert.equal(ctx.window.BatyrPlayer.state().tracks.length,3);
  assert.equal(ctx.window.BatyrPlayer.state().mode,"order");
  await ctx.window.BatyrPlayer.play("a");
  assert.equal(played.at(-1),"a");
  ctx.window.BatyrMusic.onNativeEvent("finished","a");
  await wait();
  assert.equal(played.at(-1),"b","auto advances in order");
  ctx.window.BatyrMusic.onNativeEvent("finished","c");
  await wait();
  assert.equal(played.at(-1),"b","stale completion should not change track");
  ctx.window.BatyrPlayer.setMode("one");
  ctx.window.BatyrMusic.onNativeEvent("finished","b");
  await wait();
  assert.equal(played.at(-1),"b","repeat one replays same song");
  ctx.window.BatyrPlayer.setMode("all");
  await ctx.window.BatyrPlayer.play("c");
  ctx.window.BatyrMusic.onNativeEvent("finished","c");
  await wait();
  assert.equal(played.at(-1),"a","repeat playlist wraps from last to first");
  ctx.window.BatyrMusic.onNativeEvent("position",JSON.stringify({id:"a",position:32000,duration:120000,playing:true}));
  assert.equal(ctx.window.BatyrPlayer.state().position,32);
  assert.equal(ctx.window.BatyrPlayer.state().duration,120);
  await ctx.window.BatyrPlayer.seek(70);
  assert.equal(seeked.at(-1),70000,"native seek receives milliseconds");
  console.log("PASS music: ordered next, stale event safety, repeat one, repeat all, seek");
})().catch(e=>{console.error(e);process.exitCode=1;});
