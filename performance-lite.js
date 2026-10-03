/* V50.3 — rendimiento y ahorro de datos para móviles / Redmi 15C. */
(function(){
  'use strict';
  var root=document.documentElement, body=document.body;
  var nav=navigator, conn=nav.connection||nav.mozConnection||nav.webkitConnection||null;
  var low=(nav.deviceMemory&&nav.deviceMemory<=4) || (nav.hardwareConcurrency&&nav.hardwareConcurrency<=4) || /Android/i.test(nav.userAgent||'');
  var saver=!!(conn&&conn.saveData) || !!(conn&&/^(slow-2g|2g|3g)$/.test(conn.effectiveType||''));
  var capture=false;
  if(low) root.classList.add('mobile-lite','low-end-device');
  if(saver) root.classList.add('data-saver');
  if(window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches) root.classList.add('no-animations');
  function captureOn(){
    if(capture) return; capture=true; root.classList.add('capture-performance');
    if(body) body.classList.add('capture-performance');
    try{ document.querySelectorAll('video').forEach(function(v){ if(!v.closest('#modo-sitio-video')) return; v.pause(); }); }catch(e){}
  }
  function captureOff(){ capture=false; root.classList.remove('capture-performance'); if(body) body.classList.remove('capture-performance'); }
  try{
    if(nav.mediaDevices&&nav.mediaDevices.getDisplayMedia){
      var gd=nav.mediaDevices.getDisplayMedia.bind(nav.mediaDevices);
      nav.mediaDevices.getDisplayMedia=function(){ return gd.apply(null,arguments).then(function(stream){ captureOn(); stream.getTracks().forEach(function(track){ track.addEventListener('ended',function(){ setTimeout(captureOff,250); }); }); return stream; }); };
    }
  }catch(e){}
  try{
    var MR=window.MediaRecorder;
    if(MR){
      window.MediaRecorder=function(stream,options){ captureOn(); var r=new MR(stream,options); r.addEventListener('stop',function(){setTimeout(captureOff,250);}); return r; };
      window.MediaRecorder.prototype=MR.prototype;
    }
  }catch(e){}
  document.addEventListener('visibilitychange',function(){ if(document.hidden) return; });
  window.OsitoPerformance={
    lowEnd:low, dataSaver:saver, capture:function(v){ if(v===false) captureOff(); else captureOn(); },
    isCapture:function(){return capture;}
  };
  // Ahorro de datos: las imágenes no visibles no se descargan todavía.
  function lazyImages(){
    document.querySelectorAll('img').forEach(function(img){
      if(!img.loading) img.loading='lazy';
      if(!img.decoding) img.decoding='async';
    });
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',lazyImages,{once:true}); else lazyImages();
}());
