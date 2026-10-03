/* OSITO — puente robusto para las 1,000 animaciones faciales individuales.
 * La animación de personalidad vive en una capa propia para no pelear con
 * las expresiones (smile/sad/laugh/etc.). Se aplica al .of-card y se reactiva
 * cada vez que cambia la personalidad.
 */
(function(){
  'use strict';
  var nombres=Object.create(null);
  for(var i=1;i<=1000;i++) nombres[i]='ositoP'+i;

  function activarEnCara(face,id,forzado){
    var card=face && face.querySelector('.of-card');
    if(!card) return;
    /* V53: mientras Osito lee o juega la tarjeta se queda quieta (sin temblor). */
    if(face.hasAttribute && face.hasAttribute('data-boredom')) return;
    card.classList.add('osito-personality-motion');
    card.setAttribute('data-personality-animation',String(id));
    var dur=(1.25+((id*37)%175)/100).toFixed(2)+'s';
    var delay=forzado?'0s':(-(((id*13)%90)/100).toFixed(2)+'s');
    /* !important evita que las reglas antiguas de expresiones sustituyan
       accidentalmente la animación de personalidad. */
    card.style.setProperty('animation-name',nombres[id],'important');
    card.style.setProperty('animation-duration',dur,'important');
    card.style.setProperty('animation-timing-function','ease-in-out','important');
    card.style.setProperty('animation-iteration-count','infinite','important');
    card.style.setProperty('animation-delay',delay,'important');
    card.style.setProperty('animation-fill-mode','both','important');
  }

  function aplicar(id,categoria,forzado){
    id=Number(id); if(!nombres[id]) return;
    document.querySelectorAll('.osito-face').forEach(function(face){ activarEnCara(face,id,forzado); });
    document.documentElement.setAttribute('data-osito-animation',String(id));
    if(document.body) document.body.setAttribute('data-osito-animation-category',String(categoria||''));
  }

  /* Dormir tiene prioridad: durante el sueño quitamos la coreografía de
     personalidad para que se vea el cabeceo/ronquido nocturno. Al despertar,
     la personalidad vuelve a tomar el movimiento. */
  if(window.MutationObserver){
    new MutationObserver(function(list){
      list.forEach(function(m){
        if(m.type!=='attributes' || m.attributeName!=='data-expr') return;
        var face=m.target, card=face.querySelector && face.querySelector('.of-card');
        if(!card) return;
        var id=face.getAttribute('data-personality-id') || document.documentElement.getAttribute('data-osito-personality');
        if(face.getAttribute('data-expr')==='sleeping'){
          card.style.removeProperty('animation-name');
          card.style.removeProperty('animation-duration');
          card.style.removeProperty('animation-timing-function');
          card.style.removeProperty('animation-iteration-count');
          card.style.removeProperty('animation-delay');
          card.style.removeProperty('animation-fill-mode');
        }else if(id && nombres[Number(id)]){
          activarEnCara(face,Number(id),false);
        }
      });
    }).observe(document.documentElement,{subtree:true,attributes:true,attributeFilter:['data-expr']});
  }

  /* Si alguna cara aparece después (por renderizado del panel), la animación
     se conecta automáticamente usando su personalidad actual. */
  if(window.MutationObserver){
    new MutationObserver(function(list){
      var id=document.documentElement.getAttribute('data-osito-personality');
      if(!id) return;
      list.forEach(function(m){
        if(m.type==='childList' && m.addedNodes && m.addedNodes.length){
          m.addedNodes.forEach(function(n){
            if(n.nodeType!==1) return;
            if(n.matches && n.matches('.osito-face')) activarEnCara(n,id,true);
            if(n.querySelectorAll) n.querySelectorAll('.osito-face').forEach(function(f){activarEnCara(f,id,true);});
          });
        }
      });
    }).observe(document.documentElement,{childList:true,subtree:true});
  }

  window.OsitoPersonalidadAnim={aplicar:aplicar,activarEnCara:activarEnCara,nombres:nombres,cantidad:1000};
}());
