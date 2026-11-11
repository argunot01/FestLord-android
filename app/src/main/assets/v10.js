/* Batyr's Way v1.0 — SANA-style music library and expanded mini player. */
(function () {
  "use strict";
  const native = typeof NativeMusic !== "undefined" &&
      typeof NativeMusic.listTracks === "function";
  const modes = ["order", "all", "one"];
  const modeNames = {order:"По порядку",all:"Повтор списка",one:"Повтор трека"};
  let mode = "order";
  try { const saved = localStorage.getItem("batyr-player-mode"); if(modes.includes(saved)) mode=saved; } catch (_) {}
  let tracks = [], id = null, playing = false, expanded = false, position = 0, duration = 0;
  let uploading = false, dbPromise = null, blobUrl = null;
  const player = new Audio();
  player.preload = "metadata";
  const safe = s => esc(String(s == null ? "" : s));
  const fmt = seconds => {
    seconds = Math.max(0, Number(seconds)||0);
    return Math.floor(seconds/60)+":"+String(Math.floor(seconds%60)).padStart(2,"0");
  };
  const size = bytes => (Math.max(0,Number(bytes)||0)/1048576).toFixed(1)+" МБ";
  const current = () => tracks.find(t => t.id === id);
  function bridgeDb() {
    if(dbPromise) return dbPromise;
    dbPromise = new Promise((resolve,reject)=>{
      const req=indexedDB.open("batyrs-way-music-v08",1);
      req.onupgradeneeded=()=>req.result.createObjectStore("tracks",{keyPath:"id"});
      req.onsuccess=()=>resolve(req.result);
      req.onerror=()=>reject(req.error||Error("Библиотека недоступна"));
    });
    return dbPromise;
  }
  async function db(mode, value) {
    const database=await bridgeDb();
    return new Promise((resolve,reject)=>{
      const request=database.transaction("tracks",mode==="list"?"readonly":"readwrite")
        .objectStore("tracks")[mode==="list"?"getAll":mode==="save"?"put":"delete"](mode==="list"?undefined:value);
      request.onsuccess=()=>resolve(request.result);
      request.onerror=()=>reject(request.error||Error("Ошибка сохранения"));
    });
  }
  // IndexedDB getAll has no argument on older Android WebViews.
  async function browserList() {
    const database=await bridgeDb();
    return new Promise((resolve,reject)=>{
      const request=database.transaction("tracks","readonly").objectStore("tracks").getAll();
      request.onsuccess=()=>resolve(request.result);
      request.onerror=()=>reject(request.error||Error("Ошибка чтения"));
    });
  }
  function info(message,isError) {
    const n=document.getElementById("p10Status");
    if(n){n.textContent=message;n.className="p10-status"+(isError?" error":"");}
    else if(isError && typeof badge==="function")badge(message);
  }
  async function refresh(){
    try {
      const all=native?JSON.parse(NativeMusic.listTracks()):await browserList();
      tracks=all.sort((a,b)=>(Number(b.added)||0)-(Number(a.added)||0));
      paintList();paintPlayer();
    } catch(error) {info("Музыка не загружена: "+(error.message||"ошибка"),true);}
  }
  function paintList(){
    const list=document.getElementById("p10List");
    if(!list)return;
    list.innerHTML=tracks.length?tracks.map(t=>
      '<div class="p10-track'+(id===t.id?' active':'')+'">'+
      '<button class="p10-track-play" data-action="p10-play:'+safe(t.id)+'" aria-label="Воспроизвести '+safe(t.title)+'">'+(id===t.id&&playing?'Ⅱ':'▶')+'</button>'+
      '<div class="p10-track-name"><b>'+safe(t.title)+'</b><small>'+size(t.size)+' · сохранено офлайн</small></div>'+
      '<button class="p10-track-edit" data-action="p10-rename:'+safe(t.id)+'" aria-label="Переименовать">✎</button>'+
      '<button class="p10-track-delete" data-action="p10-delete:'+safe(t.id)+'" aria-label="Удалить">✕</button>'+
      '</div>').join(""):'<div class="p10-empty">Добавь первую мелодию с телефона.<p>Треки будут сохранены внутри Batyr’s Way и появятся здесь.</p></div>';
  }
  function paintTime() {
    const percent=duration>0?Math.min(100,position/duration*100):0;
    for(const suffix of ["mini","big"]){
      const elapsed=document.getElementById("p10-"+suffix+"-elapsed");
      const total=document.getElementById("p10-"+suffix+"-total");
      if(elapsed)elapsed.textContent=fmt(position);
      if(total)total.textContent=fmt(duration);
    }
    const range=document.getElementById("p10-seek");
    if(range && !range.matches(":active") && !range.dataset.dragging) {
      range.value=String(Math.round(percent*10));
    }
    const mini=document.getElementById("p10-miniprogress");
    if(mini)mini.style.width=percent+"%";
  }
  function playerHtml(){
    const t=current();
    if(!t)return "";
    const toggle=playing?"Ⅱ":"▶";
    return '<div class="p10-miniplayer">'+
      '<button class="p10-minimark" data-action="p10-open" aria-label="Развернуть плеер">♫</button>'+
      '<button class="p10-minititle" data-action="p10-open" aria-label="Открыть плеер"><b>'+safe(t.title)+'</b>'+
      '<small><span id="p10-mini-elapsed">'+fmt(position)+'</span> / <span id="p10-mini-total">'+fmt(duration)+'</span> · '+modeNames[mode]+'</small></button>'+
      '<button class="p10-miniaction" data-action="p10-prev" aria-label="Предыдущая">|◀</button>'+
      '<button class="p10-miniaction p10-gold" data-action="p10-toggle" aria-label="Пауза или воспроизвести">'+toggle+'</button>'+
      '<button class="p10-miniaction" data-action="p10-next" aria-label="Следующая">▶|</button>'+
      '<div class="p10-miniprogress"><div id="p10-miniprogress" style="width:'+(duration?Math.min(100,position/duration*100):0)+'%"></div></div></div>';
  }
  function sheetHtml(){
    const t=current();if(!t || !expanded)return "";
    return '<div class="p10-shade" data-action="p10-close"></div><section class="p10-expanded" role="dialog" aria-label="Музыкальный плеер">'+
      '<div class="p10-handle"></div><div class="p10-heading"><b>МОЯ МУЗЫКА</b><button data-action="p10-close" aria-label="Закрыть">⌄</button></div>'+
      '<div class="p10-art"><span class="p10-notes">♫</span><small>BATYR’S WAY</small></div>'+
      '<div class="p10-song"><h2>'+safe(t.title)+'</h2><p>Сохранено в приложении</p></div>'+
      '<div class="p10-seekbox"><input type="range" min="0" max="1000" step="1" id="p10-seek" value="'+(duration?Math.round(position/duration*1000):0)+'" aria-label="Перемотка композиции">'+
      '<div class="p10-times"><span id="p10-big-elapsed">'+fmt(position)+'</span><span id="p10-big-total">'+fmt(duration)+'</span></div></div>'+
      '<div class="p10-main-controls">'+
      '<button data-action="p10-mode" class="'+(mode!=="order"?"selected":"")+'" aria-label="Изменить режим повторения" title="'+modeNames[mode]+'">'+(mode==="one"?"↻¹":mode==="all"?"↻":"⇥")+'</button>'+
      '<button data-action="p10-prev" aria-label="Предыдущая композиция">|◀</button>'+
      '<button class="p10-big-play" data-action="p10-toggle" aria-label="Пауза или воспроизвести">'+(playing?"Ⅱ":"▶")+'</button>'+
      '<button data-action="p10-next" aria-label="Следующая композиция">▶|</button>'+
      '<button data-action="p10-stop" aria-label="Остановить воспроизведение">■</button></div>'+
      '<div class="p10-mode-text">Режим: '+modeNames[mode]+'</div>'+
      '<button class="p10-queue-link" data-action="p10-library">♫ Перейти к списку треков ('+tracks.length+')</button></section>';
  }
  function paintPlayer(){
    const el=document.getElementById("musicStrip");if(!el)return;
    el.innerHTML=playerHtml()+sheetHtml();
    el.className=(current()?"p10-playing":"")+(expanded?" p10-expanded-open":"");
    document.body.classList.toggle("p10-sheet-visible",expanded&&!!current());
    paintTime();
  }
  function close(){expanded=false;paintPlayer();}
  function stop(){
    if(native)NativeMusic.stopTrack();
    player.pause();
    if(blobUrl){URL.revokeObjectURL(blobUrl);blobUrl=null;}
    player.removeAttribute("src");
    id=null;playing=false;position=0;duration=0;close();paintList();
  }
  async function start(trackId){
    const t=tracks.find(x=>x.id===trackId);
    if(!t)return;
    try {
      audio.pause(); // Stop an internet stream when playing from the saved library.
      id=trackId;playing=false;position=0;duration=0;
      if(native) {
        NativeMusic.playTrack(trackId);
      } else {
        player.pause();
        if(blobUrl){URL.revokeObjectURL(blobUrl);blobUrl=null;}
        if(!t.blob)throw Error("Аудиофайл не найден");
        blobUrl=URL.createObjectURL(t.blob);
        player.src=blobUrl;
        await player.play();
        playing=true;
      }
      paintList();paintPlayer();
    }catch(error){
      playing=false;
      info("Не удалось запустить трек: "+(error.message||"ошибка"),true);
      paintPlayer();
    }
  }
  function nextManual(step){
    if(!tracks.length)return;
    const at=tracks.findIndex(x=>x.id===id);
    const n=(at<0?0:(at+step+tracks.length)%tracks.length);
    start(tracks[n].id);
  }
  async function previous(){
    if(position>3 && duration>0){await seek(0);return;}
    nextManual(-1);
  }
  async function finished(trackId){
    if(trackId!==id)return;
    playing=false;
    if(mode==="one"){await start(id);return;}
    const n=tracks.findIndex(t=>t.id===id)+1;
    if(n>0 && n<tracks.length){await start(tracks[n].id);return;}
    if(mode==="all" && tracks.length){await start(tracks[0].id);return;}
    paintList();paintPlayer();
  }
  async function toggle(){
    if(!id){if(tracks.length)await start(tracks[0].id);return;}
    if(native){NativeMusic.togglePause();return;}
    if(player.paused){try{await player.play();playing=true;}catch(_){info("Ошибка воспроизведения",true)}}
    else {player.pause();playing=false;}
    paintList();paintPlayer();
  }
  async function seek(seconds){
    if(!id)return;
    seconds=Math.max(0,Math.min(duration,Number(seconds)||0));
    if(native){NativeMusic.seekTo(Math.round(seconds*1000));NativeMusic.requestPosition();}
    else{player.currentTime=seconds;position=seconds;paintTime();}
  }
  function modeToggle(){
    mode=modes[(modes.indexOf(mode)+1)%modes.length];
    try{localStorage.setItem("batyr-player-mode",mode);}catch(_){}
    paintPlayer();
    info("Режим: "+modeNames[mode]);
  }
  function pickerDialog(kind,trackId){
    const track=tracks.find(t=>t.id===trackId);if(!track)return;
    const html=kind==="rename"?
      '<h2>Переименовать трек</h2><label>Название</label><input id="p10-name" maxlength="70" class="field" value="'+safe(track.title)+'">'+
      '<button class="btn" data-action="p10-rename-save:'+safe(trackId)+'">Сохранить</button>':
      '<h2>Удалить мелодию?</h2><p>«'+safe(track.title)+'» будет удалена только из Batyr’s Way. Файл на телефоне останется.</p>'+
      '<button class="btn secondary" data-action="p10-delete-confirm:'+safe(trackId)+'">Удалить</button>';
    document.getElementById("modal").innerHTML='<div class="overlay"><div class="dialog">'+html+
      '<button class="btn secondary" data-action="p10-cancel">Отмена</button></div></div>';
  }
  async function loadFile(input){
    const file=input.files&&input.files[0];if(!file)return;
    if(file.size>80*1024*1024){info("Максимум 80 МБ на файл",true);return;}
    try{
      await db("save",{
        id:"m"+Date.now()+"_"+Math.random().toString(36).slice(2),
        added:Date.now(),size:file.size,
        title:file.name.replace(/\.[^.]+$/,"").slice(0,70)||"Моя музыка",blob:file
      });
      await refresh();info("Мелодия сохранена");
    }catch(error){info("Не удалось сохранить файл: "+(error.message||"ошибка"),true);}
    finally{input.value="";}
  }
  function musicScreen(){
    return '<div class="title">♫ Моя музыка</div>'+
      '<div class="card p10-feature"><h2>Музыка для твоего пути</h2><p>Сохраняй мелодии внутри приложения и слушай их офлайн во время тренировки.</p>'+
      '<button class="btn" data-action="p10-add">＋ Добавить музыку</button>'+
      (!native?'<input id="p10-file" type="file" accept="audio/*" hidden>':'')+
      '<p id="p10Status" class="p10-status">Новые треки сверху. Нажми на название в мини-плеере, чтобы открыть перемотку.</p></div>'+
      '<div class="card"><div class="p10-list-head"><h2>Мои треки</h2><span>♫</span></div><div id="p10List"></div></div>'+
      '<div class="card p10-help"><h2>Режимы воспроизведения</h2>'+
      '<p>⇥ По порядку — следующий трек, остановка после последнего.</p>'+
      '<p>↻ Повтор списка — после последнего снова первый.</p>'+
      '<p>↻¹ Повтор одного — текущая песня играет снова.</p>'+
      '<button data-action="p10-mode" class="btn secondary">Режим: '+modeNames[mode]+'</button></div>';
  }
  music=musicScreen;
  const oldRender=render;
  render=function(){
    oldRender();
    if(state.view==="music"){
      const picker=document.getElementById("p10-file");
      if(picker)picker.addEventListener("change",()=>loadFile(picker),{once:true});
      refresh();
    } else {
      paintPlayer();
    }
  };
  player.onended=()=>finished(id);
  player.ontimeupdate=()=>{position=player.currentTime||0;duration=Number.isFinite(player.duration)?player.duration:0;paintTime();};
  player.onloadedmetadata=()=>{duration=Number.isFinite(player.duration)?player.duration:0;paintTime();};
  // Android reports positions on the activity UI thread; do not access MediaPlayer from the WebView bridge thread.
  setInterval(()=>{if(native && id && typeof NativeMusic.requestPosition==="function")NativeMusic.requestPosition();},800);
  window.BatyrMusic=window.BatyrMusic||{};
  window.BatyrMusic.onNativeEvent=function(event,detail){
    if(event==="position"){
      try{
        const p=JSON.parse(detail);
        if(p.id!==id)return;
        position=Math.max(0,(Number(p.position)||0)/1000);
        duration=Math.max(0,(Number(p.duration)||0)/1000);
        playing=!!p.playing;paintTime();
      }catch(_){}return;
    }
    if(event==="playing"){if(!id)id=detail;playing=true;paintPlayer();}
    if(event==="paused"){playing=false;paintPlayer();}
    if(event==="finished"){finished(detail);}
    if(event==="stopped"){if(id){id=null;playing=false;position=0;duration=0;expanded=false;paintPlayer();}}
    if(event==="deleted"||event==="added"||event==="renamed")refresh();
    if(event==="error")info(detail||"Ошибка аудио",true);
  };
  document.addEventListener("click",async e=>{
    const b=e.target.closest('[data-action^="p10-"]');
    if(!b)return;
    e.preventDefault();e.stopPropagation();
    const key=b.dataset.action.slice(4),p=key.indexOf(":");
    const action=p<0?key:key.slice(0,p),value=p<0?"":key.slice(p+1);
    if(action==="add"){
      if(native)NativeMusic.pickTrack();else document.getElementById("p10-file")?.click();
    }else if(action==="play"){if(id===value)await toggle();else await start(value);}
    else if(action==="open"){expanded=true;paintPlayer();}
    else if(action==="close")close();
    else if(action==="toggle")await toggle();
    else if(action==="next")nextManual(1);
    else if(action==="prev")await previous();
    else if(action==="mode")modeToggle();
    else if(action==="stop")stop();
    else if(action==="library"){close();state.view="music";render();}
    else if(action==="rename"||action==="delete")pickerDialog(action,value);
    else if(action==="cancel"){document.getElementById("modal").innerHTML="";}
    else if(action==="rename-save"){
      const name=document.getElementById("p10-name")?.value.trim().slice(0,70)||"";
      if(!name){info("Укажи название",true);return;}
      if(native)NativeMusic.renameTrack(value,name);
      else{
        const t=tracks.find(x=>x.id===value);
        if(t){t.title=name;await db("save",t);}
      }
      document.getElementById("modal").innerHTML="";await refresh();
    }else if(action==="delete-confirm"){
      if(value===id)stop();
      if(native)NativeMusic.deleteTrack(value);
      else await db("delete",value);
      document.getElementById("modal").innerHTML="";await refresh();
    }
  },true);
  document.addEventListener("input",e=>{
    if(e.target.id!=="p10-seek")return;
    e.target.dataset.dragging="true";
    const s=(Number(e.target.value)/1000)*duration;
    const readout=document.getElementById("p10-big-elapsed");if(readout)readout.textContent=fmt(s);
  },true);
  document.addEventListener("change",e=>{
    if(e.target.id!=="p10-seek")return;
    const s=(Number(e.target.value)/1000)*duration;
    delete e.target.dataset.dragging;seek(s);
  },true);
  window.BatyrPlayer={refresh,play:start,next:()=>nextManual(1),previous,stop,seek,toggle,setMode:m=>{
    if(!modes.includes(m))return;
    mode=m;try{localStorage.setItem("batyr-player-mode",m);}catch(_){}
    paintPlayer();
  },state:()=>({id,mode,position,duration,playing,expanded,tracks:tracks.map(t=>({id:t.id,title:t.title}))})};
  refresh();
})();