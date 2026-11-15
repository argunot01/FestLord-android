/* Batyr's Way 1.8 — animated exercise coach. Artwork is a looping demonstration,
   not camera-based recognition or automatic repetition counting. */
(function(){
 'use strict';
 const previousSession=sessionScreen;
 const previousRender=render;
 const friendly=['Отжимания','Приседания','Подтягивания','Жим лёжа','Становая тяга','Выпады','Планка',
 'Удержание у стены','Ходьба','Бег','Велотренажёр','Бой с тенью','Разминка','Растяжка','Скакалка',
 'Гребной тренажёр','Эллипсоид','Круговой комплекс','Берпи','Бокс на мешке'];
 let freeze=false;
 let prevTime=0;
 let tick=0;
 const reduced=window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;
 const types={
   push:/отжим|push.?up/i,squat:/присед|squat/i,pull:/подтяг|pull.?up/i,bench:/жим л[её]жа|bench|грудн/i,
   deadlift:/станов|deadlift|тяга штанг/i,lunge:/выпад|lunge/i,
   plank:/планк|plank/i,wall:/у стены|wall.?sit/i,
   walking:/ходьб|прогул|walking|жүру/i,running:/бег|running|jogg|жүгір/i,
   cycling:/вел|cycling|bike/i,boxing:/с тенью|shadow.?box/i,
   warmup:/размин|warm.?up/i,stretch:/растяж|stretch|йога/i,
   rope:/скакал|rope/i,rowing:/греб|rowing/i,elliptical:/эллип|elliptical/i,
   circuit:/кругов|circuit|функцион/i,burpee:/берпи|бурп|burpee/i,bag:/мешк|heavy.?bag/i,
   press:/пресс|скручив|crunch/i,plankup:/удерж|изометр/i
 };
 const identify=(x)=>{
   const name=typeof x==='string'?x:String(x?.name||'');
   for(const [type,re] of Object.entries(types))if(re.test(name))return type;
   const k=(x?.category)||'strength';
   return k==='cardio'?'running':k==='stability'?'plank':k==='mixed'?'warmup':'squat';
 };
 function P(head,neck,shoulder,hip,elL,handL,elR,handR,kneeL,footL,kneeR,footR){
   return {head,neck,shoulder,hip,elL,handL,elR,handR,kneeL,footL,kneeR,footR};
 }
 const poses={
   stand:P([183,45],[184,66],[184,81],[184,137],[167,104],[162,130],[201,103],[207,130],[171,169],[164,203],[199,169],[203,203]),
   squat:P([183,45],[184,66],[184,81],[184,137],[174,108],[184,121],[198,109],[205,121],[174,169],[171,202],[197,169],[201,202]),
   squatDown:P([202,85],[200,106],[199,115],[188,164],[182,128],[203,128],[216,129],[233,135],[160,169],[159,200],[213,173],[221,201]),
   pushUp:P([78,124],[98,125],[128,138],[233,128],[131,169],[131,203],[153,169],[153,203],[260,134],[293,180],[266,135],[306,182]),
   pushDown:P([78,153],[98,154],[127,164],[233,144],[124,186],[124,203],[151,186],[151,203],[259,150],[293,180],[269,151],[306,182]),
   plank:P([82,144],[103,145],[127,153],[236,144],[140,183],[164,198],[150,185],[174,198],[260,147],[295,183],[268,146],[305,184]),
   pullLow:P([184,89],[183,112],[184,128],[184,177],[145,85],[141,42],[221,85],[226,42],[169,192],[165,217],[201,192],[210,215]),
   pullUp:P([184,51],[183,76],[184,95],[184,142],[145,65],[141,42],[221,65],[226,42],[169,159],[169,185],[202,160],[210,185]),
   benchLow:P([80,134],[103,133],[138,139],[242,150],[142,100],[151,102],[165,103],[167,103],[263,152],[280,195],[273,152],[304,195]),
   benchHigh:P([80,134],[103,133],[138,139],[242,150],[148,78],[157,52],[173,80],[176,52],[263,152],[280,195],[273,152],[304,195]),
   deadLow:P([210,100],[207,120],[199,134],[175,160],[210,161],[212,194],[220,159],[230,194],[164,179],[159,206],[193,179],[196,207]),
   deadHigh:P([184,46],[184,66],[184,81],[185,140],[165,109],[168,158],[201,110],[210,158],[175,170],[166,207],[201,170],[207,207]),
   lungeUp:P([178,45],[178,65],[180,80],[186,135],[157,102],[156,127],[202,99],[210,124],[166,165],[135,204],[210,164],[247,205]),
   lungeDown:P([175,67],[178,87],[179,99],[187,151],[157,122],[151,149],[201,120],[211,148],[160,170],[136,203],[222,175],[247,204]),
   wallSit:P([184,57],[184,78],[184,92],[182,150],[168,119],[169,142],[195,119],[197,142],[226,151],[229,203],[226,151],[246,203]),
   boxingGuard:P([175,48],[176,69],[180,81],[180,140],[163,100],[166,78],[199,102],[203,79],[165,170],[157,205],[202,171],[209,205]),
   boxingPunch:P([175,48],[176,69],[180,81],[180,140],[166,98],[164,78],[222,96],[290,89],[164,170],[154,205],[203,171],[214,205]),
   boxingCross:P([175,48],[176,69],[180,81],[180,140],[223,97],[288,100],[195,102],[194,78],[164,170],[154,205],[203,171],[214,205]),
   warmDown:P([182,47],[181,65],[181,82],[181,139],[164,100],[163,128],[199,103],[204,128],[169,170],[167,204],[198,170],[201,204]),
   warmUp:P([182,45],[182,65],[182,82],[181,139],[151,49],[144,24],[210,49],[220,24],[170,170],[167,204],[199,170],[202,204]),
   stretchRight:P([204,46],[201,68],[198,85],[185,136],[176,50],[188,28],[219,92],[230,117],[168,170],[163,204],[199,169],[201,204]),
   ropeLow:P([182,48],[182,68],[182,85],[182,138],[156,109],[148,120],[210,108],[217,120],[169,170],[169,205],[198,170],[200,205]),
   ropeHigh:P([182,41],[182,61],[182,78],[182,130],[156,102],[149,112],[209,102],[218,112],[169,163],[169,194],[198,164],[200,194]),
   rowStart:P([118,112],[131,124],[141,130],[166,170],[151,144],[200,163],[154,149],[211,165],[210,172],[247,186],[206,180],[249,200]),
   rowPull:P([100,103],[113,117],[125,130],[180,164],[163,134],[192,155],[169,145],[195,161],[215,171],[250,185],[221,180],[255,198]),
   cycle:P([145,63],[146,85],[150,94],[163,132],[177,106],[215,114],[169,116],[216,115],[207,160],[205,191],[187,153],[172,177]),
   elliptic:P([178,53],[178,76],[178,89],[179,143],[202,112],[212,81],[161,113],[157,79],[175,171],[162,205],[201,169],[212,198]),
   crunchLow:P([81,147],[101,152],[129,155],[231,158],[134,133],[144,118],[157,139],[165,122],[255,164],[271,198],[265,168],[291,199]),
   crunchUp:P([112,100],[132,112],[146,124],[229,158],[143,97],[146,90],[168,107],[178,98],[256,164],[272,198],[266,166],[291,199])
 };
 const mix=(a,b,t)=>{
   const out={};for(const k of Object.keys(a))out[k]=[a[k][0]+(b[k][0]-a[k][0])*t,a[k][1]+(b[k][1]-a[k][1])*t];return out;
 };
 const lerp=(a,b,t)=>a+(b-a)*t;
 const wave=(x)=>.5-.5*Math.cos(x*2*Math.PI);
 const ease=(t)=>t*t*(3-2*t);
 function scene(type,phase){
   const c=phase%1, w=wave(c);
   if(type==='push')return mix(poses.pushUp,poses.pushDown,w);
   if(type==='squat')return mix(poses.squat,poses.squatDown,w);
   if(type==='pull')return mix(poses.pullLow,poses.pullUp,w);
   if(type==='bench')return mix(poses.benchLow,poses.benchHigh,w);
   if(type==='deadlift')return mix(poses.deadLow,poses.deadHigh,w);
   if(type==='lunge')return mix(poses.lungeUp,poses.lungeDown,w);
   if(type==='plank')return mix(poses.plank,poses.pushUp,.018+.045*w);
   if(type==='wall')return poses.wallSit;
   if(type==='boxing'||type==='bag')return c<.5?mix(poses.boxingGuard,poses.boxingPunch,wave(c*2)):mix(poses.boxingGuard,poses.boxingCross,wave((c-.5)*2));
   if(type==='warmup')return mix(poses.warmDown,poses.warmUp,w);
   if(type==='stretch')return mix(poses.warmUp,poses.stretchRight,w);
   if(type==='rope')return mix(poses.ropeLow,poses.ropeHigh,w);
   if(type==='rowing')return mix(poses.rowStart,poses.rowPull,w);
   if(type==='press')return mix(poses.crunchLow,poses.crunchUp,w);
   if(type==='burpee'||type==='circuit'){
     const p= c<.25?mix(poses.squat,poses.squatDown,ease(c*4)):
       c<.5?mix(poses.squatDown,poses.plank,ease((c-.25)*4)):
       c<.75?mix(poses.plank,poses.squatDown,ease((c-.5)*4)):
       mix(poses.squatDown,poses.ropeHigh,ease((c-.75)*4));return p;
   }
   if(type==='walking'||type==='running'||type==='elliptical'){
     const p=mix(poses.stand,poses.stand,0);
     const speed=type==='running'?1.1:.62;
     const s=Math.sin(c*Math.PI*2),a=Math.cos(c*Math.PI*2),b=Math.sin(c*Math.PI*2+Math.PI);
     const hip=p.hip,sh=p.shoulder;
     p.kneeL=[hip[0]+s*25*speed,hip[1]+32-(type==='running'?Math.max(0,s)*27:Math.max(0,s)*8)];
     p.footL=[p.kneeL[0]+s*19,201-(type==='running'?Math.max(0,s)*23:Math.max(0,s)*7)];
     p.kneeR=[hip[0]+b*25*speed,hip[1]+32-(type==='running'?Math.max(0,b)*27:Math.max(0,b)*8)];
     p.footR=[p.kneeR[0]+b*19,201-(type==='running'?Math.max(0,b)*23:Math.max(0,b)*7)];
     p.elL=[sh[0]-18+b*19,108];p.handL=[sh[0]-23+b*25,122+b*13];
     p.elR=[sh[0]+18+s*19,109];p.handR=[sh[0]+27+s*25,122+s*13];
     const hop=type==='running'?Math.abs(a)*6:0;
     for(const k of Object.keys(p))p[k]=[p[k][0],p[k][1]-hop];
     if(type==='elliptical'){p.elL=[150,109];p.handL=[154,91];p.elR=[204,109];p.handR=[207,87];}
     return p;
   }
   if(type==='cycling'){
     const p=mix(poses.cycle,poses.cycle,0);
     const an=c*Math.PI*2;
     const pedal=[184,184];
     p.footL=[pedal[0]+28*Math.cos(an),pedal[1]+23*Math.sin(an)];
     p.footR=[pedal[0]+28*Math.cos(an+Math.PI),pedal[1]+23*Math.sin(an+Math.PI)];
     p.kneeL=[lerp(p.hip[0],p.footL[0],.55)+7,lerp(p.hip[1],p.footL[1],.6)-10];
     p.kneeR=[lerp(p.hip[0],p.footR[0],.55)-5,lerp(p.hip[1],p.footR[1],.6)-10];
     return p;
   }
   return mix(poses.squat,poses.squatDown,w);
 }
 function draw(canvas,kind,sec){
   if(!canvas||!canvas.isConnected)return;
   const dpr=Math.min(2,window.devicePixelRatio||1),cw=360,ch=230;
   const w=Math.round(cw*dpr),h=Math.round(ch*dpr);
   if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}
   const g=canvas.getContext('2d');if(!g)return;
   g.setTransform(dpr,0,0,dpr,0,0);g.clearRect(0,0,cw,ch);
   const bg=g.createLinearGradient(0,0,0,ch);bg.addColorStop(0,'#293240');bg.addColorStop(.73,'#191c24');bg.addColorStop(1,'#10151c');g.fillStyle=bg;g.fillRect(0,0,cw,ch);
   const halo=g.createRadialGradient(184,100,10,184,100,160);halo.addColorStop(0,'#9f74432d');halo.addColorStop(1,'#10151c00');g.fillStyle=halo;g.fillRect(0,0,cw,ch);
   g.strokeStyle='#c49d5b33';g.lineWidth=1;
   for(let y=38;y<230;y+=44){g.beginPath();g.moveTo(14,y);g.lineTo(346,y);g.stroke();}
   g.strokeStyle='#94774955';g.beginPath();g.moveTo(0,213);g.lineTo(360,213);g.stroke();
   const angle=(sec*2*Math.PI)/((kind==='running'||kind==='walking'||kind==='cycling'||kind==='rope'||kind==='elliptical')?1.35:2.5);
   const phase=((angle/(Math.PI*2))%1+1)%1;
   const p=scene(kind,phase);
   function path(points,color,width){g.beginPath();g.moveTo(points[0][0],points[0][1]);for(let i=1;i<points.length;i++)g.lineTo(points[i][0],points[i][1]);g.strokeStyle=color;g.lineWidth=width;g.lineCap='round';g.lineJoin='round';g.stroke();}
   function seg(a,b,width,inner){path([a,b],'#1b130f',width+5);path([a,b],inner,width);}
   function circle(x,y,r,color,stroke){g.beginPath();g.arc(x,y,r,0,Math.PI*2);g.fillStyle=color;g.fill();if(stroke){g.strokeStyle=stroke;g.lineWidth=2;g.stroke();}}
   function rect(x,y,w,h,color){g.fillStyle=color;g.fillRect(x,y,w,h);}
   // Equipment behind the character.
   if(kind==='pull'){path([[120,38],[242,38]],'#eed18b',8);path([[120,38],[120,15]],'#655840',7);path([[242,38],[242,15]],'#655840',7);}
   if(kind==='bench'){rect(111,168,163,8,'#b69661');rect(142,176,7,33,'#77613c');rect(263,177,7,32,'#77613c');}
   if(kind==='cycling'){
     for(const [cx,cy] of [[115,195],[263,195]]){circle(cx,cy,40,'#101419','#b7a17a');circle(cx,cy,30,'#273240');circle(cx,cy,5,'#caa761');}
     path([[115,195],[163,130],[184,184],[115,195],[263,195],[202,131],[163,130]],'#b88846',4);
     path([[164,127],[181,127]],'#d6bf8b',6);path([[199,127],[215,109]],'#b88846',5);
   }
   if(kind==='rowing'){path([[60,198],[305,198]],'#665a49',8);rect(155,179,38,8,'#d5ab64');}
   if(kind==='wall'){rect(117,27,7,185,'#776c5a');}
   if(kind==='bag'){path([[305,18],[305,42]],'#c9b18e',4);rect(285,44,39,114,'#4b382c');rect(289,50,31,103,'#785442');}
   if(kind==='elliptical'){path([[135,213],[234,213]],'#796647',5);path([[156,206],[153,71]],'#c39a56',5);path([[207,206],[213,64]],'#c39a56',5);}
   if(kind==='rope'){const radius=62+Math.sin(angle*2)*10;g.beginPath();g.ellipse(182,114,radius,99,0,Math.PI*.1,Math.PI*1.9);g.strokeStyle='#efc36c9e';g.lineWidth=2;g.stroke();}
   if(kind==='bench'||kind==='deadlift'){
     const y=kind==='bench'?lerp(100,53,wave(phase)):lerp(195,158,wave(phase));
     const minX=kind==='bench'?137:156,maxX=kind==='bench'?202:232;
     path([[minX,y],[maxX,y]],'#e9c58a',6);
     path([[minX-12,y],[minX+2,y]],'#7c7f83',13);
     path([[maxX-2,y],[maxX+12,y]],'#7c7f83',13);
   }
   // Shadow, legs, back arm, torso, front arm.
   const shadowX=(p.hip[0]+p.footL[0]+p.footR[0])/3;
   g.save();g.globalAlpha=.28;g.beginPath();g.ellipse(shadowX,211,69,8,0,0,Math.PI*2);g.fillStyle='#000';g.fill();g.restore();
   seg(p.hip,p.kneeR,17,'#5d4130');seg(p.kneeR,p.footR,14,'#6f4d34');
   seg(p.hip,p.kneeL,19,'#94653b');seg(p.kneeL,p.footL,15,'#94633b');
   seg(p.shoulder,p.elL,15,'#9b6746');seg(p.elL,p.handL,13,'#bf8b5e');
   path([p.neck,p.shoulder,p.hip],'#1d1510',38);path([p.neck,p.shoulder,p.hip],'#6b4730',31);
   path([p.shoulder,p.hip],'#bc8e51',3);
   path([[p.shoulder[0]-13,p.shoulder[1]+17],[p.shoulder[0]+14,p.shoulder[1]+17]],'#d1a568',3);
   path([[p.hip[0]-13,p.hip[1]-4],[p.hip[0]+11,p.hip[1]-4]],'#e7bf75',4);
   circle(p.hip[0],p.hip[1],8,'#3e3024','#a98149');
   seg(p.shoulder,p.elR,16,'#ab7850');seg(p.elR,p.handR,13,'#e0af7a');
   for(const hand of [p.handL,p.handR])circle(hand[0],hand[1],7,'#d9a26c','#6a4931');
   // Head with hair, Kazakh moustache and stylized helmet.
   circle(p.head[0]+1,p.head[1]+2,13,'#2b241d');circle(p.head[0],p.head[1],12,'#d49d68','#32241b');
   path([[p.head[0]-11,p.head[1]-6],[p.head[0]-7,p.head[1]-12],[p.head[0]+5,p.head[1]-13],[p.head[0]+12,p.head[1]-5]],'#352b23',6);
   path([[p.head[0]+2,p.head[1]+3],[p.head[0]+8,p.head[1]+4]],'#41261b',2);
   // Amber headband and a restrained plume rather than a crown.
   path([[p.head[0]-11,p.head[1]-8],[p.head[0]+12,p.head[1]-8]],'#e9c376',3);
   path([[p.head[0]-2,p.head[1]-12],[p.head[0]+3,p.head[1]-23]],'#c89c57',3);
   g.fillStyle='#e8c485';g.font='700 11px system-ui';g.textAlign='left';
   g.fillText('BATYR’S WAY',15,21);
   g.fillStyle='#f2d49c';g.font='bold 11px system-ui';g.textAlign='right';
   g.fillText('▶  '+(Math.floor(sec*1000/200)%2===0?'':'')+' ПРИМЕР ДВИЖЕНИЯ',347,21);
 }
 function currentExercise(){
   const ui=window.BW17?.ui,seq=ui?.circ?.seq;
   if(!seq||!seq.length)return null;
   const z=seq.find(z=>{const x=state.ex.find(t=>t.id===z.id);return x&&!isDone(x,z.set);});
   return z?state.ex.find(x=>x.id===z.id):null;
 }
 function slot(name,category){
   return '<div class="bw18-art"><canvas class="bw18-canvas" width="720" height="460" role="img" aria-label="Анимация упражнения: '+esc(name)+'" data-bw18-name="'+esc(name)+'" data-bw18-category="'+esc(category||'')+'"></canvas>'+
    '<div class="bw18-art-bottom"><span><span class="bw18-pulse"></span> ДВИЖЕНИЕ</span><button data-action="bw18-toggle" title="Пауза анимации" aria-label="Пауза анимации">'+(freeze?'▶':'Ⅱ')+'</button></div></div>';
 }
 sessionScreen=function(){
   let html=previousSession();
   if(state.view!=='session'||!window.BW17?.ui?.circ)return html;
   const x=currentExercise();if(!x)return html;
   // Exactly the exercise shown in the active ordered or circuit step.
   html=html.replace(/<div class="bw17-ex-icon">[\s\S]*?<\/div>/,slot(x.name,x.category));
   return html;
 };
 function ensureQuickAnimation(){
   const modal=document.querySelector('.bw17-quick-modal');if(!modal||modal.querySelector('.bw18-art'))return;
   const title=modal.querySelector('h2')?.textContent||'';
   const item=(window.BW17?.LIB||[]).find(x=>title.includes(x.name));
   if(!item)return;
   const tmp=document.createElement('div');tmp.innerHTML=slot(item.name,item.category);
   const art=tmp.firstElementChild;
   modal.querySelector('p')?.after(art);
 }
 function tickAll(timestamp){
   try{
     if(!prevTime)prevTime=timestamp;
     const dt=Math.min(50,Math.max(0,timestamp-prevTime));prevTime=timestamp;
     if(!freeze&&!reduced && !document.hidden)tick+=dt/1000;
     const cs=document.querySelectorAll('.bw18-canvas');
     cs.forEach(canvas=>draw(canvas,identify({name:canvas.dataset.bw18Name,category:canvas.dataset.bw18Category}),tick));
   }catch(error){if(!window.BW18_ERROR)window.BW18_ERROR=String(error);}
   requestAnimationFrame(tickAll);
 }
 const watcher=new MutationObserver(()=>ensureQuickAnimation());
 watcher.observe(document.getElementById('modal'),{childList:true,subtree:true});
 render=function(){previousRender();ensureQuickAnimation();};
 document.addEventListener('click',e=>{
   const el=e.target.closest('[data-action="bw18-toggle"]');if(!el)return;
   e.preventDefault();e.stopImmediatePropagation();freeze=!freeze;
   document.querySelectorAll('[data-action="bw18-toggle"]').forEach(x=>x.textContent=freeze?'▶':'Ⅱ');
 },true);
 requestAnimationFrame(tickAll);
 window.BW18={identify,poses,scene,draw,available:friendly,toggle:()=>{freeze=!freeze;},status:()=>({paused:freeze,seconds:tick,error:window.BW18_ERROR||null})};
})();