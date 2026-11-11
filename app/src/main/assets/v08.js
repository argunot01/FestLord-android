/* Batyr's Way v0.8 — persistent local music library, same workflow as SANA. */
(function(){
  "use strict";
  const native = typeof NativeMusic !== "undefined" && NativeMusic &&
    typeof NativeMusic.listTracks === "function";
  const tracks = [];
  let selectedId = null, isPlaying = false;
  const savedAudio = new Audio();
  let dbPromise = null;
  const cleanTitle = value => String(value || "").trim().slice(0, 70);

  function getDb(){
    if (dbPromise) return dbPromise;
    if (!window.indexedDB) return Promise.reject(new Error("Хранилище недоступно"));
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open("batyrs-way-music-v08",1);
      req.onupgradeneeded = () => req.result.createObjectStore("tracks",{keyPath:"id"});
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error || new Error("Ошибка хранилища"));
    });
    return dbPromise;
  }
  async function browserStore(mode, item, id){
    const db = await getDb();
    return new Promise((resolve,reject)=>{
      const tx=db.transaction("tracks",mode==="list"?"readonly":"readwrite");
      const store=tx.objectStore("tracks");
      let r;
      if(mode==="list") r=store.getAll();
      else if(mode==="put") r=store.put(item);
      else r=store.delete(id);
      r.onsuccess=()=>resolve(r.result);
      r.onerror=()=>reject(r.error);
    });
  }
  async function fetchTracks(){
    try {
      const arr=native ? JSON.parse(NativeMusic.listTracks()) : await browserStore("list");
      tracks.splice(0,tracks.length,...arr.sort((a,b)=>(b.added||0)-(a.added||0)));
      draw();
    }catch(error){
      showStatus("Не удалось загрузить музыку: "+(error.message||"Ошибка"),true);
    }
  }
  function showStatus(message,error=false){
    const el=document.getElementById("mlStatus");
    if(el){
      el.textContent=message;
      el.className="ml-status"+(error?" ml-error":"");
    }else if(typeof badge==="function")badge(message);
  }
  function iconFor(id){ return selectedId===id && isPlaying ? "❚❚" : "▶"; }
  function formatSize(n){return (Math.max(0,Number(n)||0)/1024/1024).toFixed(1)+" МБ";}
  function draw(){
    const box=document.getElementById("mlList");
    if(box){
      box.innerHTML=tracks.length ? tracks.map(t=>
        '<div class="ml-track">'+
          '<button class="ml-play" data-action="ml-play:'+esc(t.id)+'" aria-label="Воспроизвести">'+iconFor(t.id)+'</button>'+
          '<div class="ml-track-info"><strong>'+esc(t.title)+'</strong><small>Сохранено в приложении · '+formatSize(t.size)+'</small></div>'+
          '<button class="ml-icon" data-action="ml-rename:'+esc(t.id)+'" title="Переименовать" aria-label="Переименовать">✎</button>'+
          '<button class="ml-icon ml-delete" data-action="ml-delete:'+esc(t.id)+'" title="Удалить" aria-label="Удалить">✕</button>'+
        '</div>').join("") :
        '<div class="ml-empty">Пока нет сохранённых треков.<p>Добавь первую мелодию — она останется здесь после перезапуска.</p></div>';
    }
    const strip=document.getElementById("musicStrip");
    if(strip && selectedId){
      const t=tracks.find(x=>x.id===selectedId);
      if(t){
        strip.innerHTML='<div class="miniplayer ml-mini"><span>♫</span><span class="ml-now">'+
        esc(t.title)+'</span><button data-action="ml-toggle">'+(isPlaying?'❚❚':'▶')+
        '</button><button data-action="ml-stop">■</button></div>';
      }
    }
  }
  function showRename(id){
    const t=tracks.find(x=>x.id===id);if(!t)return;
    document.getElementById("modal").innerHTML='<div class="overlay"><div class="dialog">'+
      '<h2>Название мелодии</h2><label for="mlNewName">Как назвать трек?</label>'+
      '<input id="mlNewName" maxlength="70" class="field" value="'+esc(t.title)+'">'+
      '<button class="btn" data-action="ml-rename-save:'+esc(id)+'">Сохранить</button>'+
      '<button class="btn secondary" data-action="ml-cancel">Отмена</button></div></div>';
    document.getElementById("mlNewName")?.focus();
  }
  function showDelete(id){
    const t=tracks.find(x=>x.id===id);if(!t)return;
    document.getElementById("modal").innerHTML='<div class="overlay"><div class="dialog">'+
      '<h2>Удалить мелодию?</h2><p>«'+esc(t.title)+'» будет удалена из приложения. Исходный файл на телефоне останется.</p>'+
      '<button class="btn secondary" data-action="ml-delete-confirm:'+esc(id)+'">Удалить трек</button>'+
      '<button class="btn" data-action="ml-cancel">Оставить</button></div></div>';
  }
  function closeDialog(){document.getElementById("modal").innerHTML="";}
  async function addFileBrowser(input){
    const file=input.files?.[0];if(!file)return;
    if(file.size>80*1024*1024){showStatus("Максимальный размер — 80 МБ",true);return;}
    try{
      const title=cleanTitle(file.name.replace(/\.[^.]+$/,""))||"Моя музыка";
      await browserStore("put",{
        id:"m"+Date.now()+"_"+Math.random().toString(36).slice(2),
        title,blob:file,size:file.size,added:Date.now()
      });
      await fetchTracks();
      showStatus("Сохранено: "+title);
      input.value="";
    }catch(error){showStatus("Не удалось сохранить аудио: "+(error.message||""),true)}
  }
  async function play(id){
    const item=tracks.find(t=>t.id===id);
    if(!item)return;
    try{
      audio.pause(); // Stop a previous online stream when a saved track starts.
      if(native) {
        if(selectedId===id && isPlaying){NativeMusic.togglePause();return;}
        NativeMusic.playTrack(id);
        selectedId=id;isPlaying=true;
      }else{
        savedAudio.pause();
        if(savedAudio.src.startsWith("blob:"))URL.revokeObjectURL(savedAudio.src);
        savedAudio.src=URL.createObjectURL(item.blob);
        selectedId=id;
        await savedAudio.play();
        isPlaying=true;
      }
      draw();
    }catch(error){showStatus("Не удалось включить трек: "+(error.message||""),true)}
  }
  function stop(){
    if(native)NativeMusic.stopTrack();
    else{
      savedAudio.pause();
      savedAudio.currentTime=0;
    }
    selectedId=null;isPlaying=false;
    const strip=document.getElementById("musicStrip");
    if(strip)strip.innerHTML="";
    draw();
  }
  async function toggle(){
    if(native)NativeMusic.togglePause();
    else if(selectedId){
      if(savedAudio.paused)await savedAudio.play();else savedAudio.pause();
      isPlaying=!savedAudio.paused;
      draw();
    }
  }
  savedAudio.onended=()=>{isPlaying=false;draw();};
  function musicScreen(){
    return '<div class="title">♫ Моя музыка</div>'+
      '<div class="card ml-feature"><h2>Твоя музыка всегда с тобой</h2>'+
      '<p>Выбирай мелодии с телефона, давай им свои названия, слушай во время тренировок и удаляй ненужные.</p>'+
      '<button class="btn" data-action="ml-add">＋ Сохранить музыку</button>'+
      (!native?'<input type="file" accept="audio/*" id="mlBrowserPicker" hidden>':'')+
      '<div id="mlStatus" class="ml-status">Новые треки находятся в начале списка.</div></div>'+
      '<div class="card"><div class="ml-title"><h2>Сохранённые треки</h2><span>♫</span></div>'+
      '<div id="mlList" class="ml-list"><div class="ml-empty">Загружаем библиотеку...</div></div></div>'+
      '<div class="card"><h2>Управление воспроизведением</h2>'+
      '<div class="row"><button class="btn secondary" data-action="ml-toggle">⏯ Пауза / Играть</button>'+
      '<button class="btn secondary" data-action="ml-stop">■ Стоп</button></div>'+
      '<p class="small">Музыка играет при переходе между разделами. Сохранённые треки доступны без интернета.</p></div>'+
      '<div class="card"><h2>Интернет-аудио</h2><p>Также можно указать прямую ссылку HTTPS на аудиопоток.</p>'+
      '<input class="field" id="audioURL" placeholder="https://.../music.mp3">'+
      '<button class="btn secondary" data-action="ml-online">▶ Слушать онлайн</button></div>';
  }
  music=musicScreen;
  const previousRender=render;
  render=function(){
    previousRender();
    if(state.view==="music") {
      if(!native){
        const picker=document.getElementById("mlBrowserPicker");
        if(picker)picker.onchange=()=>addFileBrowser(picker);
      }
      fetchTracks();
    }else if(selectedId)draw();
  };
  window.BatyrMusic={
    onNativeEvent:function(event,detail){
      if(event==="playing"){selectedId=detail;isPlaying=true;}
      if(event==="paused"||event==="finished")isPlaying=false;
      if(event==="stopped"){selectedId=null;isPlaying=false;document.getElementById("musicStrip").innerHTML="";}
      if(event==="error")showStatus(detail||"Ошибка воспроизведения",true);
      if(event==="added")showStatus("Сохранено: "+detail);
      if(["added","deleted","renamed","playing","paused","finished","stopped"].includes(event))fetchTracks();
    },
    refresh:fetchTracks
  };
  document.addEventListener("click",async function(event){
    const button=event.target.closest("[data-action^='ml-']");
    if(!button)return;
    event.preventDefault();event.stopPropagation();
    const action=button.dataset.action;
    const first=action.indexOf(":");
    const kind=first>=0?action.slice(3,first):action.slice(3);
    const id=first>=0?action.slice(first+1):"";
    if(kind==="add"){
      if(native)NativeMusic.pickTrack();
      else document.getElementById("mlBrowserPicker")?.click();
    }else if(kind==="play")await play(id);
    else if(kind==="stop")stop();
    else if(kind==="toggle")await toggle();
    else if(kind==="rename")showRename(id);
    else if(kind==="delete")showDelete(id);
    else if(kind==="cancel")closeDialog();
    else if(kind==="rename-save"){
      const name=cleanTitle(document.getElementById("mlNewName")?.value);
      if(!name){showStatus("Название не может быть пустым",true);return;}
      if(native)NativeMusic.renameTrack(id,name);
      else {
        const x=tracks.find(t=>t.id===id);
        if(x){x.title=name;await browserStore("put",x);}
      }
      closeDialog();await fetchTracks();
    }else if(kind==="delete-confirm"){
      if(native)NativeMusic.deleteTrack(id);
      else await browserStore("delete",null,id);
      if(selectedId===id)stop();
      closeDialog();await fetchTracks();
    }else if(kind==="online"){
      const link=document.getElementById("audioURL")?.value.trim()||"";
      if(!/^https:\/\/\S+$/i.test(link)){showStatus("Нужна прямая HTTPS-ссылка",true);return;}
      stop();audio.src=link;
      try{await audio.play();showStatus("Воспроизведение онлайн");render();}
      catch(_){showStatus("Не удалось открыть аудиопоток",true);}
    }
  },true);
})();