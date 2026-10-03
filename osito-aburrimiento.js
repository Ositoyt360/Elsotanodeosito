/* OSITO — comportamiento cuando lleva rato sin compañía (10 s):
 * lee su libro (pasa una página cada 8 s), juega con el mando o hace otras expresiones. V54/V53: diseño nuevo en 3D
 * (osito-actividades-3d.css), la cara hace expresiones distintas y ya no tiembla.
 * No añade personalidades nuevas; es una actividad visual temporal.
 */
(function(){
  'use strict';
  var F=window.OsitoFace, S=window.OsitoFaceSound;
  if(!F || !F.caras) return;
  var ABURRIDO_MS=10000; // 10 s sin actividad real
  var PAGINA_MS=8000;    // pasa una página del libro cada 8 s
  var CAMBIO_MS={diario:30000,juego:30000,libre:24000};
  var modos=[]; // bolsa de actividades: cada una sale una vez antes de repetir y nunca la misma dos veces seguidas
  var ultima=Date.now(), aburrido=false, modo='';
  var ultimoCambio=0, timerPag=null, timerCambio=null, timer=null, token=0, timerActo=null, bolsa=[], ultimoActo='';

  /* ---------- Guion de expresiones ----------
   * a  = expresión propia de la actividad (data-act, la dibuja osito-actividades-3d.css)
   * f  = emoción normal de la cara (wow, joy, sad…) durante "ms" milisegundos
   * beat = movimiento especial del objeto 3D    snd = sonido de la cara   */
  var GUION={
    diario:[
      {a:'r-scan',ms:4200},
      {a:'r-scan',ms:3800},
      {a:'r-hmm',ms:2600},
      {f:'smile',ms:2200},
      {a:'r-drowsy',ms:3400},
      {f:'wow',ms:1700,beat:'aha'},
      {f:'laugh',ms:1900},
      {f:'sad',ms:1900},
      {f:'love',ms:2000},
      {f:'curious',ms:1800}
    ],
    juego:[
      {a:'p-focus',ms:3600},
      {a:'p-tongue',ms:3400},
      {a:'p-sweat',ms:2800},
      {a:'p-smirk',ms:2400},
      {a:'p-peek',ms:2200},
      {f:'smile',ms:2200},
      {f:'wow',ms:1700},
      {f:'joy',ms:1900,beat:'win'},
      {f:'angry',ms:1500,beat:'lose',luego:{f:'sad',ms:1700}},
      {f:'laugh',ms:1900},
      {f:'love',ms:2000},
      {f:'excited',ms:1700},
      {f:'cool',ms:2000},
      {f:'wink',ms:1400},
      {f:'curious',ms:1800},
      {f:'dizzy',ms:1500}
    ],
    /* Escena libre: sin objeto, solo las expresiones de siempre, en mini-historias suaves */
    libre:[
      {f:'yawn',ms:2300,luego:{f:'smile',ms:1700}},
      {f:'curious',ms:2200,cab:[2,-9]},
      {f:'confused',ms:2000,cab:[-2,8]},
      {f:'wow',ms:1700},
      {f:'shy',ms:2500,cab:[3,-7]},
      {f:'love',ms:2200},
      {f:'kiss',ms:1800},
      {f:'dance',ms:3200,cab:[0,0]},
      {f:'excited',ms:2000},
      {f:'joy',ms:1900},
      {f:'laugh',ms:2100},
      {f:'cool',ms:2300,cab:[-2,7]},
      {f:'wink',ms:1500,cab:[0,6]},
      {f:'watch',ms:2600},
      {f:'chat',ms:2300},
      {f:'sad',ms:2300,cab:[5,0]},
      {f:'angry',ms:1700,luego:{f:'dizzy',ms:1600}},
      {a:'l-idle',ms:2600,cab:[-3,10]},
      {a:'l-idle',ms:2600,cab:[2,-10]}
    ]
  };

  function caras(){ return Array.prototype.slice.call(document.querySelectorAll('.osito-face')); }
  function noche(){ return !!(window.OsitoNight && window.OsitoNight.esNoche && window.OsitoNight.esNoche()); }
  function visible(c){ return !!(c.offsetParent || (c.getClientRects && c.getClientRects().length)); }

  /* ---------- Objetos 3D ---------- */
  function slabs(n){ var h=''; for(var i=0;i<n;i++) h+='<i class="of-slab" style="--i:'+i+'"></i>'; return h; }
  var MITT_L='<span class="of-mitt ml"></span>', MITT_R='<span class="of-mitt mr"></span>';
  var HTML_DIARIO=
    '<span class="of-book">'+
      '<span class="bk-pg l"></span><span class="bk-pg r"></span><span class="bk-flip"></span>'+
      '<span class="bk-cov l"></span><span class="bk-cov r"></span>'+
      '<span class="bk-spine"></span><span class="bk-ribbon"></span>'+
      MITT_L+MITT_R+
    '</span><i class="of-poof"></i>';
  var HTML_MANDO=
    '<span class="of-phone">'+
      slabs(4)+
      '<span class="ph-back"></span>'+
      '<span class="ph-cam"><i class="ph-lens a"></i><i class="ph-lens b"></i><i class="ph-flash"></i></span>'+
      '<span class="ph-logo"></span><span class="ph-btn t1"></span><span class="ph-btn t2"></span>'+
      MITT_L+MITT_R+
    '</span><i class="of-poof"></i>';

  function asegurarExtras(c){
    // Lengüita y gota de sudor para las expresiones de juego (dentro de la tarjeta de la cara).
    var card=c.querySelector('.of-card');
    if(card && !card.querySelector('.of-tongue')) card.insertAdjacentHTML('beforeend','<i class="of-tongue"></i><i class="of-sweat"></i>');
  }
  function ocultar(){
    aburrido=false; modo=''; ultimoCambio=0; token++;
    clearTimeout(timerActo); timerActo=null;
    clearInterval(timerPag); timerPag=null;
    clearTimeout(timerCambio); timerCambio=null;
    caras().forEach(function(c){
      var estaba=c.hasAttribute('data-boredom');
      c.removeAttribute('data-boredom'); c.removeAttribute('data-act'); c.removeAttribute('data-pg');
      if(estaba){ c.style.setProperty('--rx','0deg'); c.style.setProperty('--ry','0deg'); }
      quitarProp(c,true);
      if(estaba) restaurarPersonalidad(c);
    });
  }
  /* Mientras lee o juega, la coreografía de personalidad (que mueve toda la tarjeta) se pausa:
     así la cara no tiembla. Al terminar vuelve a su movimiento de siempre. */
  function calmarCara(c){
    var card=c.querySelector('.of-card'); if(!card) return;
    ['animation-name','animation-duration','animation-timing-function','animation-iteration-count','animation-delay','animation-fill-mode'].forEach(function(k){ card.style.removeProperty(k); });
  }
  function restaurarPersonalidad(c){
    var A=window.OsitoPersonalidadAnim; if(!A || !A.activarEnCara) return;
    var id=c.getAttribute('data-personality-id') || document.documentElement.getAttribute('data-osito-personality');
    if(id && A.nombres && A.nombres[Number(id)]) A.activarEnCara(c,Number(id),false);
  }
  /* ---------- Página que pasa cada 8 s (solo con el libro) ---------- */
  function pasarPagina(){
    if(!aburrido || modo!=='diario') return;
    caras().forEach(function(c){
      var h=c.querySelector('.of-boredom-prop .bk-flip'); if(!h) return;
      h.classList.remove('go'); void h.offsetWidth; h.classList.add('go');
      c.setAttribute('data-pg','1');
      setTimeout(function(){ c.removeAttribute('data-pg'); },1300);
    });
  }
  function quitarProp(c,suave){
    var p=c.querySelector('.of-boredom-prop'); if(!p) return;
    if(suave){
      p.classList.add('of-out');
      setTimeout(function(){ if(p.parentNode && p.classList.contains('of-out')) p.remove(); },950);
    } else p.remove();
  }
  function mostrarProp(c,m){
    asegurarExtras(c);
    quitarProp(c,false);
    if(m!=='libre'){
      var p=document.createElement('span');
      p.className='of-boredom-prop';
      p.setAttribute('aria-hidden','true');
      p.setAttribute('data-mode',m);
      p.innerHTML = m==='diario' ? HTML_DIARIO : HTML_MANDO;
      c.appendChild(p);
    }
    c.setAttribute('data-boredom',m);
    calmarCara(c);
  }
  /* Giro 3D suave de la cabeza (rx = arriba/abajo, ry = izquierda/derecha, en grados) */
  function cabeza(rx,ry){
    caras().forEach(function(c){
      if(!c.hasAttribute('data-boredom')) return;
      c.style.setProperty('--rx',rx+'deg'); c.style.setProperty('--ry',ry+'deg');
    });
  }

  /* ---------- Guion de expresiones: nunca el mismo gesto dos veces seguidas ---------- */
  function siguienteActo(){
    if(!bolsa.length){
      bolsa=GUION[modo].slice();
      for(var i=bolsa.length-1;i>0;i--){ var k=Math.floor(Math.random()*(i+1)), t=bolsa[i]; bolsa[i]=bolsa[k]; bolsa[k]=t; }
      if(bolsa[bolsa.length-1]===ultimoActo){ var t2=bolsa[0]; bolsa[0]=bolsa[bolsa.length-1]; bolsa[bolsa.length-1]=t2; }
    }
    ultimoActo=bolsa.pop();
    return ultimoActo;
  }
  function beat(nombre,ms){
    caras().forEach(function(c){
      var p=c.querySelector('.of-boredom-prop'); if(!p) return;
      p.removeAttribute('data-beat'); void p.offsetWidth; p.setAttribute('data-beat',nombre);
      setTimeout(function(){ if(p.getAttribute('data-beat')===nombre) p.removeAttribute('data-beat'); },ms||1500);
    });
  }
  function ejecutar(acto,miToken){
    if(miToken!==token || !aburrido) return;
    caras().forEach(function(c){
      if(!c.hasAttribute('data-boredom')) return;
      if(acto.a) c.setAttribute('data-act',acto.a);
      else if(modo==='libre') c.setAttribute('data-act','l-idle');
    });
    if(acto.cab) cabeza(acto.cab[0],acto.cab[1]);
    else if(modo==='libre') cabeza(0,0);
    if(acto.f && F.paraTodas) F.paraTodas(acto.f,acto.ms);
    if(acto.beat) beat(acto.beat,acto.ms+500);
    var espera=acto.ms+(acto.luego?acto.luego.ms:0)+250+Math.random()*500;
    if(acto.luego) setTimeout(function(){ if(miToken===token && aburrido) F.paraTodas(acto.luego.f,acto.luego.ms); },acto.ms+60);
    timerActo=setTimeout(function(){ ejecutar(acto.sig||siguienteActo(),miToken); },espera);
  }

  function siguienteModo(){
    if(!modos.length){
      modos=['diario','juego','libre'];
      for(var i=modos.length-1;i>0;i--){ var k=Math.floor(Math.random()*(i+1)), t=modos[i]; modos[i]=modos[k]; modos[k]=t; }
      if(modos[modos.length-1]===modo){ var t2=modos[0]; modos[0]=modos[modos.length-1]; modos[modos.length-1]=t2; }
    }
    return modos.pop();
  }
  function actividad(){
    ultima=Date.now();
    if(aburrido) ocultar();
  }
  function comenzar(m){
    if(noche() || (window.OsitoNight && window.OsitoNight.duerme && window.OsitoNight.duerme())) return;
    clearTimeout(timerActo);
    aburrido=true; modo=m; ultimoCambio=Date.now(); bolsa=[]; ultimoActo=''; token++;
    var miToken=token;
    caras().forEach(function(c){mostrarProp(c,m);});
    // Arranca siempre con su gesto base (leyendo / concentrada) y luego sigue el guion.
    var inicio=(m==='diario')?{f:'wow',ms:1200,sig:{a:'r-scan',ms:3600}}:(m==='juego')?{f:'excited',ms:1200,sig:{a:'p-focus',ms:3200}}:{a:'l-peek',ms:1500};
    if(S && S.reproducir && m!=='libre') S.reproducir(m==='diario'?'tap':'boing');
    clearInterval(timerPag); timerPag=null;
    if(m==='diario'){ setTimeout(function(){ if(miToken===token) pasarPagina(); },2500); timerPag=setInterval(pasarPagina,PAGINA_MS); }
    ejecutar(inicio,miToken);
  }
  function activar(m){
    if(noche() || (window.OsitoNight && window.OsitoNight.duerme && window.OsitoNight.duerme())) return;
    clearTimeout(timerCambio); timerCambio=null;
    var hay=aburrido && caras().some(function(c){ return c.querySelector('.of-boredom-prop:not(.of-out)'); });
    if(!hay){ comenzar(m); return; }
    // Primero guarda el objeto que tenía (se ve cómo baja) y después saca el nuevo.
    clearTimeout(timerActo); timerActo=null; clearInterval(timerPag); timerPag=null; token++;
    ultimoCambio=Date.now(); modo=m;
    caras().forEach(function(c){
      if(c.hasAttribute('data-boredom')) c.setAttribute('data-act','g-out');
      quitarProp(c,true);
    });
    if(F.paraTodas) F.paraTodas('smile',900);
    timerCambio=setTimeout(function(){ timerCambio=null; comenzar(m); },950);
  }
  function ciclo(){
    if(document.hidden){ timer=setTimeout(ciclo,1000); return; }
    if(noche()) { ocultar(); timer=setTimeout(ciclo,1000); return; }
    if(window.OsitoNight && window.OsitoNight.duerme && window.OsitoNight.duerme()){ ocultar(); timer=setTimeout(ciclo,1000); return; }
    var ahora=Date.now();
    if(!aburrido && ahora-ultima>=ABURRIDO_MS){ activar(siguienteModo()); }
    else if(aburrido && modo && ahora-ultimoCambio>=(CAMBIO_MS[modo]||30000)){
      // Cambia de actividad mientras sigue solo: lee, juega o hace otras expresiones.
      activar(siguienteModo());
    }
    timer=setTimeout(ciclo,1000);
  }
  ['pointerdown','keydown','touchstart','wheel','click','input'].forEach(function(ev){document.addEventListener(ev,actividad,{passive:true,capture:true});});
  // Mover el mouse también cuenta como estar presente (reinicia los 10 s) pero no interrumpe la actividad.
  document.addEventListener('pointermove',function(){ if(!aburrido) ultima=Date.now(); },{passive:true,capture:true});
  document.addEventListener('visibilitychange',function(){ if(!document.hidden) ultima=Date.now(); });
  // Si se abre una cara nueva, la actividad se muestra también allí.
  if(window.MutationObserver){
    new MutationObserver(function(list){
      if(!aburrido) return;
      list.forEach(function(m){ if(m.addedNodes) m.addedNodes.forEach(function(n){ if(n.nodeType===1 && n.matches && n.matches('.osito-face')) mostrarProp(n,modo); }); });
    }).observe(document.body,{childList:true,subtree:true});
  }
  window.OsitoAburrimiento={activar:function(m){activar(m==='juego'?'juego':(m==='libre'?'libre':'diario'));},detener:function(){ ultima=Date.now(); ocultar(); },estado:function(){return {aburrido:aburrido,modo:modo};}};
  ciclo();
}());
