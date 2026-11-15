/* Batyr's Way 1.9 — use the hero, not a wireframe, for motion demos.
   Motion sources are looping renders. These are demonstrations, not camera-based
   body tracking or automatic repetition counts. */
(function(){
  'use strict';
  const supported=new Set(['push','squat','walking','running','boxing']);
  const srcs=(typeof window.BW19_MOTIONS==='object' && window.BW19_MOTIONS)||{};
  let paused=false;
  const typeFor=(name,category)=>{
    const k=typeof window.BW18?.identify==='function'
      ?window.BW18.identify({name,category}) : '';
    if(supported.has(k))return k;
    const n=String(name||'').toLowerCase();
    if(/отжим|push.?up/i.test(n))return 'push';
    if(/присед|squat/i.test(n))return 'squat';
    if(/ходьб|прогул|walking|жүру/i.test(n))return 'walking';
    if(/бег|running|jogg|жүгір/i.test(n))return 'running';
    if(/бой с тенью|с тенью|shadow.?box/i.test(n))return 'boxing';
    return null;
  };
  const asset=(k,still)=>srcs[k]?.[still?'still':'animation'] ||
    ('motions/'+k+(still?'.jpg':'.gif'));
  function replaceOne(canvas){
    if(!canvas?.isConnected)return;
    const kind=typeFor(canvas.dataset.bw18Name,canvas.dataset.bw18Category);
    if(!kind)return; // Preserve older demonstration for exercises not yet modelled.
    const hero=document.createElement('img');
    hero.className='bw19-motion';hero.dataset.kind=kind;
    hero.src=asset(kind,paused);hero.alt='Батыр показывает упражнение: '+canvas.dataset.bw18Name;
    hero.setAttribute('role','img');hero.decoding='async';hero.loading='eager';
    const section=canvas.closest('.bw18-art');
    const button=section?.querySelector('[data-action="bw18-toggle"]');
    if(button){
      button.dataset.action='bw19-toggle';
      button.textContent=paused?'▶':'Ⅱ';
      button.title=paused?'Запустить анимацию':'Остановить анимацию';
      button.setAttribute('aria-label',button.title);
    }
    canvas.replaceWith(hero);
    section?.classList.add('bw19-shown');
  }
  function scan(){
    document.querySelectorAll('canvas.bw18-canvas').forEach(replaceOne);
    // If the round switched to a new exercise, the new GIF is loaded by scan.
  }
  const originalRender=render;
  render=function(){originalRender();scan();};
  const modal=document.getElementById('modal');
  if(modal){
    const observer=new MutationObserver(scan);
    observer.observe(modal,{childList:true,subtree:true});
  }
  document.addEventListener('click',event=>{
    const button=event.target.closest('[data-action="bw19-toggle"]');
    if(!button)return;
    event.preventDefault();event.stopPropagation();event.stopImmediatePropagation();
    paused=!paused;
    document.querySelectorAll('.bw19-motion').forEach(image=>{
      const kind=image.dataset.kind;
      image.src=asset(kind,paused);
    });
    document.querySelectorAll('[data-action="bw19-toggle"]').forEach(b=>{
      b.textContent=paused?'▶':'Ⅱ';b.title=paused?'Запустить анимацию':'Остановить анимацию';
      b.setAttribute('aria-label',b.title);
    });
  },true);
  if(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)paused=true;
  window.BW19={supported:[...supported],typeFor,asset,scan,isPaused:()=>paused};
  scan();
})();