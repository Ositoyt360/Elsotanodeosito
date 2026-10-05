/* OSITO — comportamiento cuando lleva rato sin compañía (10 s):
 * lee su libro o su periódico (pasa una página cada 8 s), juega con el mando, usa el teléfono, toma café,
 * escucha música con audífonos, arma un cubo de Rubik o hace otras expresiones. V60: un solo objeto a la vez y objetos vistos por atrás. V59: ritmo lento (objeto 3 min, expresión 1 min). V58: repertorio ampliado con 15 objetos 3D, todos en 3D
 * (osito-actividades-3d.css), la cara hace expresiones distintas y ya no tiembla.
 * No añade personalidades nuevas; es una actividad visual temporal.
 */
(function(){
  'use strict';
  var F=window.OsitoFace, S=window.OsitoFaceSound;
  if(!F || !F.caras) return;
  var ABURRIDO_MS=5000;  // 5 s sin actividad real para empezar actividades 3D
  var PAGINA_MS=7000;    // pasa una página del libro cada 7 s
  var OBJETO_MS=24000;   // 24 segundos por objeto para mayor variedad de animaciones 3D
  var EXPRESION_MS=6500; // cada 6.5 segundos cambia de expresión/gesto con el objeto
  var BEAT_MS=2400;         // los movimientos puntuales del objeto (brindar, ganar…) duran poco: no se alargan
  var CAMBIO_MS={};
  ['diario','juego','control','periodico','telefono','cafe','chocolate','audifonos','cubo','peluche','pizza','manzana','microfono','laptop','mochila','balon','varita','regalo','consola','vaso','camara','libre'].forEach(function(k){ CAMBIO_MS[k]=OBJETO_MS; });
  var primeraBolsa=true; // la primera vez salen primero el periódico y el teléfono
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
    periodico:[
      {a:'r-scan',ms:4200},
      {a:'r-scan',ms:3600},
      {a:'r-hmm',ms:2600},
      {f:'wow',ms:1700,beat:'aha'},
      {f:'smile',ms:2200},
      {a:'r-drowsy',ms:3200},
      {f:'confused',ms:2000},
      {f:'laugh',ms:1900},
      {f:'sad',ms:1900},
      {f:'angry',ms:1500,luego:{f:'sad',ms:1700}},
      {f:'curious',ms:1800},
      {f:'joy',ms:1900,beat:'aha'}
    ],
    telefono:[
      {a:'t-scroll',ms:4200},
      {a:'t-type',ms:3200},
      {f:'laugh',ms:1900,beat:'buzz'},
      {a:'t-scroll',ms:3600},
      {f:'love',ms:2000},
      {f:'wow',ms:1700,beat:'buzz'},
      {a:'t-type',ms:2800},
      {f:'smile',ms:2200},
      {f:'wink',ms:1400},
      {f:'curious',ms:1800},
      {f:'excited',ms:1700},
      {f:'shy',ms:2300},
      {f:'cool',ms:2000}
    ],
    cafe:[
      {a:'c-sip',ms:3200,beat:'sip'},
      {a:'c-blow',ms:2600,beat:'blow'},
      {f:'smile',ms:2200},
      {a:'c-sip',ms:3000,beat:'sip'},
      {f:'joy',ms:1900},
      {f:'yawn',ms:2300,luego:{f:'smile',ms:1500}},
      {f:'wow',ms:1700},
      {f:'shy',ms:2300},
      {a:'c-blow',ms:2400,beat:'blow'},
      {f:'curious',ms:1800}
    ],
    audifonos:[
      {a:'m-bop',ms:4200},
      {f:'dance',ms:3000},
      {a:'m-bop',ms:3800},
      {f:'joy',ms:1900},
      {f:'cool',ms:2200},
      {f:'excited',ms:1800},
      {f:'love',ms:2000},
      {f:'wink',ms:1400},
      {f:'smile',ms:2000}
    ],
    cubo:[
      {a:'p-focus',ms:3600},
      {a:'p-tongue',ms:3400},
      {a:'p-sweat',ms:2800},
      {f:'confused',ms:2000},
      {f:'dizzy',ms:1600},
      {f:'wow',ms:1700},
      {f:'angry',ms:1500,beat:'lose',luego:{f:'sad',ms:1700}},
      {f:'curious',ms:1800},
      {f:'joy',ms:1900,beat:'win'},
      {f:'cool',ms:2000}
    ],
    chocolate:[
      {a:'ch-sip',ms:3200},{a:'ch-blow',ms:2500},{f:'smile',ms:2200},{a:'ch-sip',ms:3000,beat:'sip'},
      {f:'love',ms:2000},{f:'joy',ms:1900},{f:'wow',ms:1700},{f:'shy',ms:2200}
    ],
    control:[
      {a:'g-focus',ms:3300},{a:'g-press',ms:3000},{f:'excited',ms:1800},{a:'g-focus',ms:3200},
      {f:'angry',ms:1500,beat:'fail',luego:{f:'sad',ms:1600}},{f:'joy',ms:1900,beat:'win'},
      {f:'cool',ms:2100},{f:'laugh',ms:2000}
    ],
    peluche:[
      {a:'pl-hug',ms:3600},{a:'pl-pat',ms:2800},{f:'love',ms:2200},{a:'pl-squeeze',ms:3200},
      {f:'joy',ms:1900},{f:'shy',ms:2300},{f:'smile',ms:2200},{f:'wink',ms:1400}
    ],
    pizza:[
      {a:'pz-smell',ms:2800},{a:'pz-spin',ms:3200},{f:'wow',ms:1700},{a:'pz-take',ms:3000,beat:'lift'},
      {f:'joy',ms:1900},{f:'love',ms:2000},{f:'laugh',ms:1900},{f:'smile',ms:2200}
    ],
    manzana:[
      {a:'ap-polish',ms:2800},{a:'ap-smell',ms:2500},{f:'curious',ms:1900},{a:'ap-bite',ms:3000,beat:'bite'},
      {f:'wow',ms:1700},{f:'joy',ms:1900},{f:'smile',ms:2200},{f:'wink',ms:1400}
    ],
    microfono:[
      {a:'mc-check',ms:2800},{a:'mc-sing',ms:3600},{f:'joy',ms:1900},{a:'mc-sing',ms:3300,beat:'sing'},
      {f:'cool',ms:2100},{f:'excited',ms:1800},{f:'laugh',ms:1900},{f:'smile',ms:2200}
    ],
    laptop:[
      {a:'lp-open',ms:2400},{a:'lp-type',ms:3600},{a:'lp-track',ms:2800},{f:'curious',ms:1900},
      {f:'wow',ms:1700},{f:'smile',ms:2200},{a:'lp-type',ms:3300},{f:'joy',ms:1900}
    ],
    mochila:[
      {a:'bk-open',ms:2800},{a:'bk-search',ms:3400},{f:'curious',ms:1900},{a:'bk-close',ms:2500},
      {f:'smile',ms:2200},{f:'excited',ms:1800},{f:'joy',ms:1900},{f:'cool',ms:2100}
    ],
    balon:[
      {a:'ba-bounce',ms:3600},{a:'ba-spin',ms:3200},{f:'joy',ms:1900},{a:'ba-bounce',ms:3400},
      {f:'excited',ms:1800,beat:'kick'},{f:'laugh',ms:1900},{f:'cool',ms:2100},{f:'smile',ms:2200}
    ],
    varita:[
      {a:'w-wave',ms:3000},{a:'w-cast',ms:3400,beat:'magic'},{f:'wow',ms:1700},{a:'w-wave',ms:3000},
      {f:'excited',ms:1800},{f:'love',ms:2000},{f:'joy',ms:1900},{f:'wink',ms:1400}
    ],
    regalo:[
      {a:'gd-hold',ms:2800},{a:'gd-open',ms:3400,beat:'open'},{f:'wow',ms:1700},{f:'joy',ms:1900},
      {a:'gd-close',ms:2600},{f:'love',ms:2000},{f:'smile',ms:2200},{f:'excited',ms:1800}
    ],
    consola:[
      {a:'hc-focus',ms:3300},{a:'hc-tap',ms:3000},{f:'excited',ms:1800},{a:'hc-focus',ms:3300},
      {f:'joy',ms:1900,beat:'win'},{f:'cool',ms:2100},{f:'laugh',ms:1900},{f:'smile',ms:2200}
    ],
    vaso:[
      {a:'vs-hold',ms:2600},{a:'vs-sip',ms:3200,beat:'sip'},{f:'smile',ms:2200},{f:'love',ms:2000},
      {a:'vs-sip',ms:3000},{f:'joy',ms:1900},{f:'shy',ms:2200},{f:'wink',ms:1400}
    ],
    camara:[
      {a:'cm-focus',ms:3200},{a:'cm-aim',ms:2800},{f:'curious',ms:1900},{a:'cm-snap',ms:2500,beat:'flash'},
      {f:'wow',ms:1700},{f:'joy',ms:1900},{f:'cool',ms:2100},{f:'smile',ms:2200}
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
      '<span class="bk-pg l"></span><span class="bk-pg r"></span>'+
      '<span class="bk-page-lines l"></span><span class="bk-page-lines r"></span>'+
      '<span class="bk-flip"></span><span class="bk-cov l"></span><span class="bk-cov r"></span>'+
      '<span class="bk-spine"></span><span class="bk-ribbon"></span>'+
      MITT_L+MITT_R+
    '</span><i class="of-poof"></i>';

  /* Teléfono apaisado: Osito juega con la pantalla, no es un objeto vertical. */
  var HTML_TELEFONO=
    '<span class="of-tel">'+
      slabs(3)+
      '<span class="tl-body"></span><span class="tl-screen"><i class="tl-game"></i><i class="tl-bar"></i><i class="tl-notif"></i></span>'+
      '<i class="tl-speaker"></i><i class="tl-dot"></i>'+MITT_L+MITT_R+
    '</span><i class="of-poof"></i>';

  /* Control de videojuegos 3D */
  var HTML_CONTROL=
    '<span class="of-control">'+
      '<i class="ct-body"></i><i class="ct-dpad"></i><i class="ct-stick l"></i><i class="ct-stick r"></i>'+
      '<i class="ct-btn a"></i><i class="ct-btn b"></i><i class="ct-btn x"></i><i class="ct-btn y"></i>'+
      '<i class="ct-led l"></i><i class="ct-led r"></i>'+MITT_L+MITT_R+
    '</span><i class="of-poof"></i>';

  var HTML_CHOCOLATE=
    '<span class="of-cup chocolate"><i class="cf-saucer"></i><i class="cf-handle"></i><i class="cf-body"></i>'+
      '<i class="cf-rim"></i><i class="cf-choco"></i><i class="cf-foam"></i><i class="cf-marshmallow m1"></i><i class="cf-marshmallow m2"></i>'+
      '<i class="cf-steam s1"></i><i class="cf-steam s2"></i><i class="cf-steam s3"></i>'+MITT_L+MITT_R+
    '</span><i class="of-poof"></i>';

  var HTML_PELUCHE=
    '<span class="of-plush"><i class="pl-ear l"></i><i class="pl-ear r"></i><i class="pl-head"></i><i class="pl-eye l"></i><i class="pl-eye r"></i>'+
      '<i class="pl-nose"></i><i class="pl-body"></i><i class="pl-belly"></i><i class="pl-arm l"></i><i class="pl-arm r"></i>'+MITT_L+MITT_R+
    '</span><i class="of-poof"></i>';

  var HTML_PIZZA=
    '<span class="of-pizza"><i class="pz-crust"></i><i class="pz-cheese"></i><i class="pz-pep p1"></i><i class="pz-pep p2"></i><i class="pz-pep p3"></i><i class="pz-pep p4"></i><i class="pz-melt"></i>'+
      MITT_L+MITT_R+
    '</span><i class="of-poof"></i>';

  var HTML_MANZANA=
    '<span class="of-apple"><i class="ap-fruit"></i><i class="ap-highlight"></i><i class="ap-stem"></i><i class="ap-leaf"></i>'+MITT_L+MITT_R+
    '</span><i class="of-poof"></i>';

  var HTML_MICROFONO=
    '<span class="of-mic"><i class="mc-head"></i><i class="mc-grille"></i><i class="mc-body"></i><i class="mc-ring"></i><i class="mc-stand"></i><i class="mc-base"></i>'+MITT_L+MITT_R+
    '</span><i class="of-poof"></i>';

  var HTML_LAPTOP=
    '<span class="of-laptop"><i class="lp-screen"></i><i class="lp-glass"></i><i class="lp-base"></i><i class="lp-keyboard"></i><i class="lp-trackpad"></i><i class="lp-glow"></i>'+MITT_L+MITT_R+
    '</span><i class="of-poof"></i>';

  var HTML_MOCHILA=
    '<span class="of-backpack"><i class="bp-body"></i><i class="bp-pocket"></i><i class="bp-flap"></i><i class="bp-strap l"></i><i class="bp-strap r"></i><i class="bp-buckle"></i>'+MITT_L+MITT_R+
    '</span><i class="of-poof"></i>';

  var HTML_BALON=
    '<span class="of-ball"><i class="ba-sphere"></i><i class="ba-patch p1"></i><i class="ba-patch p2"></i><i class="ba-patch p3"></i><i class="ba-patch p4"></i>'+MITT_L+MITT_R+
    '</span><i class="of-poof"></i>';

  var HTML_VARITA=
    '<span class="of-wand"><i class="wd-stick"></i><i class="wd-star"></i><i class="wd-spark s1"></i><i class="wd-spark s2"></i><i class="wd-spark s3"></i>'+MITT_L+MITT_R+
    '</span><i class="of-poof"></i>';

  var HTML_REGALO=
    '<span class="of-gift"><i class="gd-box"></i><i class="gd-lid"></i><i class="gd-ribbon-v"></i><i class="gd-ribbon-h"></i><i class="gd-bow l"></i><i class="gd-bow r"></i>'+MITT_L+MITT_R+
    '</span><i class="of-poof"></i>';

  var HTML_CONSOLA=
    '<span class="of-handheld"><i class="hc-body"></i><i class="hc-screen"></i><i class="hc-game"></i><i class="hc-dpad"></i><i class="hc-stick l"></i><i class="hc-stick r"></i><i class="hc-btn a"></i><i class="hc-btn b"></i>'+MITT_L+MITT_R+
    '</span><i class="of-poof"></i>';

  var HTML_VASO=
    '<span class="of-glass"><i class="vs-body"></i><i class="vs-liquid"></i><i class="vs-rim"></i><i class="vs-straw"></i><i class="vs-shine"></i>'+MITT_L+MITT_R+
    '</span><i class="of-poof"></i>';

  var HTML_CAMARA=
    '<span class="of-camera"><i class="cm-body"></i><i class="cm-top"></i><i class="cm-lens"></i><i class="cm-lens-glass"></i><i class="cm-flash"></i><i class="cm-grip"></i>'+MITT_L+MITT_R+
    '</span><i class="of-poof"></i>';

  var HTML_AUDIFONOS=
    '<span class="of-hp"><i class="hp-band"></i><i class="hp-pad"></i><span class="hp-cup l"></span><span class="hp-cup r"></span>'+
      '<i class="hp-n n1">♪</i><i class="hp-n n2">♫</i><i class="hp-n n3">♪</i>'+
    '</span><i class="of-poof"></i>';

  function stickers(a){ var h=''; for(var i=0;i<a.length;i++) h+='<i class="k'+a[i]+'"></i>'; return h; }
  var HTML_CUBO=
    '<span class="of-cubewrap"><span class="cb-cube">'+
      '<span class="cb-f fr">'+stickers([0,5,4,2,0,1,3,4,5])+'</span><span class="cb-f rt">'+stickers([4,3,0,5,1,2,0,4,3])+'</span><span class="cb-f tp">'+stickers([2,1,5,3,5,0,4,2,1])+'</span>'+
    '</span>'+MITT_L+MITT_R+'</span><i class="of-poof"></i>';

  /* Compatibilidad con los objetos antiguos: se mantienen periódico, cubo y el libro. */
  var HTML_PERIODICO=
    '<span class="of-news"><span class="np-pg l"></span><span class="np-pg r"></span><span class="np-fold"></span><span class="np-flip"></span>'+
      MITT_L+MITT_R+'</span><i class="of-poof"></i>';

  var HTML_OBJETO={
    diario:HTML_DIARIO, juego:HTML_CONTROL, control:HTML_CONTROL, periodico:HTML_PERIODICO, telefono:HTML_TELEFONO,
    cafe:HTML_CHOCOLATE, chocolate:HTML_CHOCOLATE, audifonos:HTML_AUDIFONOS, cubo:HTML_CUBO,
    peluche:HTML_PELUCHE, pizza:HTML_PIZZA, manzana:HTML_MANZANA, microfono:HTML_MICROFONO, laptop:HTML_LAPTOP,
    mochila:HTML_MOCHILA, balon:HTML_BALON, varita:HTML_VARITA, regalo:HTML_REGALO, consola:HTML_CONSOLA,
    vaso:HTML_VASO, camara:HTML_CAMARA
  };
  // Primer gesto al sacar cada objeto y sonido de aparición
  var INICIO={
    diario:{f:'wow',ms:1200,sig:{a:'r-scan',ms:3600}},
    periodico:{f:'wow',ms:1200,sig:{a:'r-scan',ms:3600}},
    juego:{f:'excited',ms:1200,sig:{a:'g-focus',ms:3200}},
    control:{f:'excited',ms:1200,sig:{a:'g-focus',ms:3200}},
    telefono:{f:'wink',ms:1200,sig:{a:'hc-focus',ms:3200}},
    cafe:{f:'smile',ms:1400,sig:{a:'ch-sip',ms:3000,beat:'sip'}},
    chocolate:{f:'smile',ms:1400,sig:{a:'ch-sip',ms:3000,beat:'sip'}},
    audifonos:{f:'excited',ms:1200,sig:{a:'m-bop',ms:3600}},
    cubo:{f:'curious',ms:1300,sig:{a:'p-focus',ms:3200}},
    peluche:{f:'love',ms:1200,sig:{a:'pl-hug',ms:3300}},
    pizza:{f:'wow',ms:1200,sig:{a:'pz-smell',ms:2800}},
    manzana:{f:'curious',ms:1200,sig:{a:'ap-polish',ms:2800}},
    microfono:{f:'excited',ms:1200,sig:{a:'mc-check',ms:2800}},
    laptop:{f:'curious',ms:1200,sig:{a:'lp-open',ms:2400}},
    mochila:{f:'smile',ms:1200,sig:{a:'bk-open',ms:2800}},
    balon:{f:'joy',ms:1200,sig:{a:'ba-bounce',ms:3400}},
    varita:{f:'wow',ms:1200,sig:{a:'w-wave',ms:3000}},
    regalo:{f:'excited',ms:1200,sig:{a:'gd-hold',ms:2800}},
    consola:{f:'excited',ms:1200,sig:{a:'hc-focus',ms:3300}},
    vaso:{f:'smile',ms:1200,sig:{a:'vs-hold',ms:2600}},
    camara:{f:'curious',ms:1200,sig:{a:'cm-focus',ms:3200}},
    libre:{a:'l-peek',ms:1500}
  };
  var SONIDO={diario:0,periodico:1,juego:2,control:2,telefono:3,cafe:4,chocolate:4,audifonos:5,cubo:6,peluche:7,pizza:8,manzana:9,microfono:10,laptop:11,mochila:12,balon:13,varita:14,regalo:15,consola:16,vaso:17,camara:18};
  var VALIDOS=['diario','juego','control','periodico','telefono','cafe','chocolate','audifonos','cubo','peluche','pizza','manzana','microfono','laptop','mochila','balon','varita','regalo','consola','vaso','camara','libre'];

  function asegurarExtras(c){
    // Lengüita y gota de sudor para las expresiones de juego (dentro de la tarjeta de la cara).
    var card=c.querySelector('.of-card');
    if(card && !card.querySelector('.of-tongue')) card.insertAdjacentHTML('beforeend','<i class="of-tongue"></i><i class="of-sweat"></i>');
  }
  function ocultar(){
    aburrido=false; modo=''; ultimoCambio=0; token++;
    clearTimeout(timerActo); timerActo=null; clearTimeout(timerCabeza); timerCabeza=null;
    clearInterval(timerPag); timerPag=null;
    clearTimeout(timerCambio); timerCambio=null;
    caras().forEach(function(c){
      var estaba=c.hasAttribute('data-boredom');
      c.removeAttribute('data-boredom'); c.removeAttribute('data-act'); c.removeAttribute('data-pg');
      if(estaba){ c.style.setProperty('--cx','0deg'); c.style.setProperty('--cy','0deg'); }
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
    if(!aburrido || (modo!=='diario' && modo!=='periodico')) return;
    caras().forEach(function(c){
      var h=c.querySelector('.of-boredom-prop .bk-flip, .of-boredom-prop .np-flip'); if(!h) return;
      h.classList.remove('go'); void h.offsetWidth; h.classList.add('go');
      c.setAttribute('data-pg','1');
      if(S && S.reproducir) S.reproducir('pagina');
      setTimeout(function(){ c.removeAttribute('data-pg'); },1300);
    });
  }
  /* V60: nunca puede haber dos objetos a la vez en el personaje. Si se pide quitar "de golpe",
     se borran TODOS los objetos que queden (incluidos los que se estaban guardando). */
  function quitarProp(c,suave){
    var ps=c.querySelectorAll('.of-boredom-prop'); if(!ps.length) return;
    Array.prototype.forEach.call(ps,function(p){
      if(suave){
        p.classList.add('of-out');
        setTimeout(function(){ if(p.parentNode && p.classList.contains('of-out')) p.remove(); },950);
      } else p.remove();
    });
  }
  function mostrarProp(c,m){
    asegurarExtras(c);
    quitarProp(c,false);
    if(m!=='libre'){
      var p=document.createElement('span');
      p.className='of-boredom-prop';
      p.setAttribute('aria-hidden','true');
      p.setAttribute('data-mode',m);
      p.innerHTML = HTML_OBJETO[m] || HTML_DIARIO;
      c.appendChild(p);
    }
    c.setAttribute('data-boredom',m);
    calmarCara(c);
  }
  /* Giro 3D suave de la cabeza (rx = arriba/abajo, ry = izquierda/derecha, en grados) */
  function cabeza(rx,ry){
    caras().forEach(function(c){
      if(!c.hasAttribute('data-boredom')) return;
      c.style.setProperty('--cx',rx+'deg'); c.style.setProperty('--cy',ry+'deg');
    });
  }
  /* V61: mientras usa un objeto, el cubo mira al FRENTE y mueve la cara: abajo (al objeto), derecha, izquierda, arriba. */
  var timerCabeza=null, ultimaMirada=-1;
  var MIRADAS=[[-13,0],[-10,-22],[-10,22],[8,0],[-4,-30],[-4,30],[10,-14],[10,14],[-16,0]]; // [rx (neg = abajo), ry (neg = izquierda)]
  function moverCabeza(miToken){
    if(miToken!==token || !aburrido) return;
    var i; do{ i=Math.floor(Math.random()*MIRADAS.length); }while(i===ultimaMirada);
    ultimaMirada=i; cabeza(MIRADAS[i][0],MIRADAS[i][1]);
    // vuelve a mirar al objeto antes de la siguiente mirada
    timerCabeza=setTimeout(function(){
      if(miToken!==token || !aburrido) return;
      cabeza(-12,0);
      timerCabeza=setTimeout(function(){ moverCabeza(miToken); },1800+Math.random()*1600);
    },1600+Math.random()*900);
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
    // V59: ritmo lento. Cada gesto/expresión dura EXPRESION_MS, sin importar los ms del guion.
    acto=Object.assign({},acto,{ms:EXPRESION_MS});
    if(acto.luego) acto.luego=Object.assign({},acto.luego,{ms:EXPRESION_MS});
    caras().forEach(function(c){
      if(!c.hasAttribute('data-boredom')) return;
      if(acto.a) c.setAttribute('data-act',acto.a);
      else if(modo==='libre') c.setAttribute('data-act','l-idle');
    });
    // V58: no inclinar ni sacudir la cabeza; solo se animan ojos, boca y objeto.
    if(!timerCabeza){ cabeza(-12,0); timerCabeza=setTimeout(function(){ moverCabeza(miToken); },1800); }
    if(acto.f && F.paraTodas) F.paraTodas(acto.f,acto.ms);
    else if(acto.a && S && S.acto){
      /* V61: cada gesto de cada objeto (leer, deslizar, teclear, sorber, morder, disparar…) tiene su propio sonido. */
      S.acto(acto.a);
    }
    if(acto.beat){
      beat(acto.beat,BEAT_MS);
      if(S && S.beat) setTimeout(function(){ if(miToken===token && aburrido) S.beat(acto.beat); },650);
    }
    var espera=acto.ms+(acto.luego?acto.luego.ms:0)+250;
    if(acto.luego) setTimeout(function(){ if(miToken===token && aburrido) F.paraTodas(acto.luego.f,acto.luego.ms); },acto.ms+60);
    timerActo=setTimeout(function(){ ejecutar(acto.sig||siguienteActo(),miToken); },espera);
  }

  function siguienteModo(){
    if(!modos.length){
      modos=['diario','juego','control','periodico','telefono','cafe','chocolate','audifonos','cubo','peluche','pizza','manzana','microfono','laptop','mochila','balon','varita','regalo','consola','vaso','camara','libre'];
      var prio=[];
      if(primeraBolsa){ // la primera vuelta empieza con el periódico y el teléfono (en cualquier orden)
        modos=modos.filter(function(x){ return x!=='periodico' && x!=='telefono'; });
        prio=Math.random()<.5?['periodico','telefono']:['telefono','periodico'];
        primeraBolsa=false;
      }
      for(var i=modos.length-1;i>0;i--){ var k=Math.floor(Math.random()*(i+1)), t=modos[i]; modos[i]=modos[k]; modos[k]=t; }
      modos=modos.concat(prio.reverse()); // se saca desde el final: salen primero
      if(!prio.length && modos[modos.length-1]===modo){ var t2=modos[0]; modos[0]=modos[modos.length-1]; modos[modos.length-1]=t2; }
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
    var inicio=INICIO[m]||INICIO.libre;
    if(S && S.objeto) S.objeto(m);
    clearInterval(timerPag); timerPag=null;
    if(m==='diario' || m==='periodico'){ setTimeout(function(){ if(miToken===token) pasarPagina(); },2500); timerPag=setInterval(pasarPagina,PAGINA_MS); }
    ejecutar(inicio,miToken);
  }
  function activar(m){
    if(noche() || (window.OsitoNight && window.OsitoNight.duerme && window.OsitoNight.duerme())) return;
    clearTimeout(timerCambio); timerCambio=null;
    var hay=aburrido && caras().some(function(c){ return c.querySelector('.of-boredom-prop:not(.of-out)'); });
    if(!hay){ comenzar(m); return; }
    // Primero guarda el objeto que tenía (se ve cómo baja) y después saca el nuevo.
    clearTimeout(timerActo); timerActo=null; clearTimeout(timerCabeza); timerCabeza=null; clearInterval(timerPag); timerPag=null; token++;
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
    else if(aburrido && modo && ahora-ultimoCambio>=(CAMBIO_MS[modo]||OBJETO_MS)){
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
  window.OsitoAburrimiento={activar:function(m){activar(VALIDOS.indexOf(m)>=0?m:'diario');},detener:function(){ ultima=Date.now(); ocultar(); },estado:function(){return {aburrido:aburrido,modo:modo};}};
  ciclo();
}());
