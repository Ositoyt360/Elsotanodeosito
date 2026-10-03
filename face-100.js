/* V50.3 — 100 animaciones extra + 100 efectos sonoros extra para la cara. */
(function(){
  'use strict';
  var F=window.OsitoFace, S=window.OsitoFaceSound;
  if(!F||!F.caras) return;
  var caras=F.caras, root=document.documentElement;
  var presets=[];
  for(var i=0;i<100;i++){
    var a=(i*37)%17-8, b=(i*53)%15-7, r=((i*29)%25)-12, sc=0.94+((i*7)%13)/100;
    presets.push({x:a/10,y:b/10,rot:r,scale:sc,dur:420+(i%9)*85,tilt:((i*11)%19)-9,glow:(i%4)===0});
  }
  function animar(n,ms){
    if(root.classList.contains('no-animations')||root.classList.contains('capture-performance')) return;
    if(root.classList.contains('ultra-performance') && Math.random()<.75) return;
    var p=presets[Math.max(0,Math.min(99,n|0))];
    caras.forEach(function(c){
      if(!c.offsetParent) return;
      c.style.setProperty('--a-x',p.x+'em'); c.style.setProperty('--a-y',p.y+'em');
      c.style.setProperty('--a-r',p.rot+'deg'); c.style.setProperty('--a-s',p.scale);
      c.style.setProperty('--a-d',p.dur+'ms'); c.style.setProperty('--a-t',p.tilt+'deg');
      c.classList.remove('of-100-anim'); void c.offsetWidth; c.classList.add('of-100-anim');
      setTimeout(function(){c.classList.remove('of-100-anim');},ms||p.dur+80);
    });
  }
  function ejecutar(n){ animar(n); if(S&&S.reproducirExtra) S.reproducirExtra(n); }
  var bolsa=[], anterior=-1;
  function siguiente(){
    if(!bolsa.length){ bolsa=Array.from({length:100},function(_,i){return i;});
      for(var j=bolsa.length-1;j>0;j--){var k=Math.floor(Math.random()*(j+1)),tmp=bolsa[j];bolsa[j]=bolsa[k];bolsa[k]=tmp;}
      if(bolsa[bolsa.length-1]===anterior){var swap=bolsa[0];bolsa[0]=bolsa[bolsa.length-1];bolsa[bolsa.length-1]=swap;}
    }
    anterior=bolsa.pop(); return anterior;
  }
  function ciclo(){
    if(document.hidden || root.classList.contains('no-animations') || root.classList.contains('capture-performance')) return;
    if(document.body.classList.contains('ultra-performance')) return;
    var cara=caras.find(function(c){return c.offsetParent;});
    if(!cara) return;
    var expr=cara.getAttribute('data-expr');
    var estado=cara.dataset.estado;
    if(expr==='sleeping'||expr==='sleepy'||estado==='listening') return;
    ejecutar(siguiente());
  }
  // V51.5: no ejecutar microanimaciones de cuerpo automáticamente.
  // El ciclo de 3.3 s era otra fuente de sacudidas de la cara.
  // La API pública sigue disponible para efectos explícitos cuando se necesite.
  var timer=null;
  document.addEventListener('visibilitychange',function(){if(document.hidden){}}, {passive:true});
  window.OsitoFace100={animar:animar, ejecutar:ejecutar, cantidad:100, detener:function(){if(timer) clearInterval(timer); timer=null;}, iniciar:function(){if(!timer) timer=setInterval(ciclo, root.classList.contains('low-end-device')?5200:3300);}};
}());
