/**
 * SISTEMA DE SONIDOS PARA PERSONALIDADES
 * Genera y reproduce sonidos según la personalidad actual
 */

class GestorSonidos {
  constructor() {
    this.audioContext = null;
    this.osciladores = [];
    this.envolventesActivas = [];
    this.volumenGlobal = 0.3;
    this.sonoridadActivada = true;
    this.sonadaReciente = null;
    this.tiempoUltimoSonido = 0;
    this.minimoCooldown = 1000; // 1 segundo entre sonidos
  }

  inicializarAudio() {
    if (!this.audioContext) {
      try {
        const audioClass = window.AudioContext || window.webkitAudioContext;
        this.audioContext = new audioClass();
      } catch (e) {
        console.error('AudioContext no disponible:', e);
      }
    }
  }

  reproducirSonido(tipo) {
    if (!this.sonoridadActivada) return;
    
    const ahora = Date.now();
    if (ahora - this.tiempoUltimoSonido < this.minimoCooldown) return;
    
    this.inicializarAudio();
    
    const mapasSonidos = {
      suspiro: () => this.suspiro(),
      nostalgia: () => this.sonidoNostalgia(),
      recuerdo: () => this.sonidoRecuerdo(),
      decepcion: () => this.sonidoDecepcion(),
      delicado: () => this.sonidoDelicado(),
      eco: () => this.sonidoEco(),
      suspiro_largo: () => this.suspiroLargo(),
      reflexion: () => this.sonidoReflexion(),
      llanto_suave: () => this.llantoSuave(),
      dramatico: () => this.sonidoDramatico(),
      wow: () => this.sonidoWow(),
      telenovela: () => this.sonidoTelenovela(),
      dramatico_fuerte: () => this.dramaticoFuerte(),
      aplausos_falsos: () => this.aplausosFalsos(),
      bostezo: () => this.bostezo(),
      gruñido: () => this.gruñido(),
      bostezo_pequeño: () => this.bostezoPequeno(),
      bostezo_grande: () => this.bostezGrande(),
      ronquido: () => this.ronquido(),
      gruñido_enojo: () => this.gruñidoEnojo(),
      sss: () => this.sonidoSss(),
      tap_tap: () => this.sonidoTapTap(),
      guitarraelectrica: () => this.guitarraElectrica(),
      musica_metalica: () => this.musicaMetalica(),
      guitarra_punk: () => this.guitarraPunk(),
      rock: () => this.sonidoRock(),
      confianza: () => this.sonidoConfianza(),
      ternura: () => this.sonidoTernura(),
      aww: () => this.sonidoAww(),
      corazon_latiendo: () => this.corazonLatiendo(),
      campanillas: () => this.campanillas(),
      bienvenida: () => this.sonidoBienvenida(),
      risa: () => this.sonidoRisa(),
      risa_bromista: () => this.risaBromista(),
      kazoo: () => this.sonidoKazoo(),
      campanilla_bromista: () => this.campanillaBromista(),
      risa_burlona: () => this.risaBurlona(),
      carcajada_loca: () => this.carcajadaLoca(),
      caos: () => this.sonidoCaos(),
      energia_alta: () => this.energiaAlta(),
      ding_ding: () => this.sonidoDingDing(),
      boing: () => this.sonidoBoing(),
      sarcasmo: () => this.sonidoSarcasmo(),
      ironia: () => this.sonidoIronia(),
      sarcasmo_fuerte: () => this.sarcasmoFuerte(),
      burla: () => this.sonidoBurla(),
      suspiro_aburrido: () => this.suspiroAburrido(),
      eh: () => this.sonidoEh(),
      meh: () => this.sonidoMeh(),
      nada: () => this.sonidoSilencio(),
      monotono: () => this.sonidoMonotono(),
      pregunta: () => this.sonidoPregunta(),
      investigando: () => this.sonidoInvestigando(),
      aventura: () => this.sonidoAventura(),
      observacion: () => this.sonidoObservacion(),
      pregunta_constante: () => this.sonidoPreguntaConstante(),
      risa_picarona: () => this.risaPicarona(),
      sincronia: () => this.sonidoSincronia(),
      jugueteo: () => this.sonidoJugueteo(),
      risa_silenciosa: () => this.risaSilenciosa(),
      inteligencia: () => this.sonidoInteligencia(),
      oscuridad: () => this.sonidoOscuridad(),
      tinieblas: () => this.sonidoTinieblas(),
      susurro: () => this.sonidoSusurro(),
      inquietante: () => this.sonidoInquietante(),
      misterio: () => this.sonidoMisterio(),
      video_game: () => this.sonidoVideoGame(),
      victoria: () => this.sonidoVictoria(),
      fallo_comico: () => this.falloComico(),
      competencia: () => this.sonidoCompetencia(),
      batalla: () => this.sonidoBatalla(),
      nota_musical: () => this.notaMusical(),
      canto: () => this.sonidoCanto(),
      rock_music: () => this.musicaRock(),
      metal: () => this.sonidoMetal(),
      punk_sound: () => this.sonidoPunk(),
      beep_boop: () => this.beepBoop(),
      laser: () => this.sonidoLaser(),
      calcular: () => this.sonidoCalcular(),
      matematicas: () => this.sonidoMatematicas(),
      codigo: () => this.sonidoCodigo(),
      timidez: () => this.sonidoTimidez(),
      vergüenza: () => this.sonidoVergüenza(),
      silencio: () => this.sonidoSilencio(),
      reflexion_interna: () => this.reflexionInterna(),
      quietud: () => this.sonidoQuietud(),
      fanfarria: () => this.fanfarria(),
      arrogancia: () => this.sonidoArrogancia(),
      vanidad: () => this.sonidoVanidad(),
      orgullo: () => this.sonidoOrgullo(),
      elegancia: () => this.sonidoElegancia(),
      amor: () => this.sonidoAmor(),
      amistad: () => this.sonidoAmistad(),
      proteccion: () => this.sonidoProteccion(),
      cuidado: () => this.sonidoCuidado(),
      empatia: () => this.sonidoEmpatia(),
      misterio_profundo: () => this.misterioProfundo(),
      enigma: () => this.sonidoEnigma(),
      profecia: () => this.sonidoProfecia(),
      vision: () => this.sonidoVision(),
      profundidad: () => this.sonidoProfundidad(),
      filosofia: () => this.sonidoFilosofia(),
      existencia: () => this.sonidoExistencia(),
      noche_silenciosa: () => this.nocheSilenciosa(),
      viaje: () => this.sonidoViaje(),
      cosmos: () => this.sonidoCosmos(),
      viaje_temporal: () => this.sonidoViajesTemporal(),
      espacio: () => this.sonidoEspacio(),
      digital: () => this.sonidoDigital(),
      antiguedad: () => this.sonidoAntiguedad(),
      futuro: () => this.sonidoFuturo(),
      dimension: () => this.sonidoDimension(),
      fantasma: () => this.sonidoFantasma(),
      sueños: () => this.sonidoSueños(),
      recuerdos: () => this.sonidoRecuerdos(),
      estrellas: () => this.sonidoEstrellas(),
      luna: () => this.sonidoLuna(),
      vacio: () => this.sonidoVacio(),
      secreto: () => this.sonidoSecreto(),
      sombras: () => this.sonidoSombras(),
      acertijo: () => this.sonidoAcertijo(),
      leyenda: () => this.sonidoLeyenda(),
      imaginacion: () => this.sonidoImaginacion(),
      pensamiento: () => this.sonidoPensamiento(),
      creacion: () => this.sonidoCreacion(),
      nostalgia: () => this.sonidoNostalgia(),
      noche: () => this.sonidoNoche(),
      madrugada: () => this.sonidoMadrugada(),
      sueno_extrano: () => this.sonidoSuenoExtrano(),
      bromas_silenciosas: () => this.risaSilenciosa(),
      sonido_misterioso: () => this.sonidoMisterioso(),
      expresion_rara: () => this.sonidoExpresionRara(),
      multipersonal: () => this.multipersonal(),
      transformacion: () => this.sonidoTransformacion(),
      evolucion: () => this.sonidoEvolucion(),
      mil_rostros: () => this.sonidoMilRostros(),
      caos_absoluto: () => this.caosAbsoluto(),
      multiverso: () => this.sonidoMultiverso(),
      leyenda_absoluta: () => this.sonidoLeyendaAbsoluta(),
      supremacia: () => this.sonidoSupremacia(),
      infinito: () => this.sonidoInfinito(),
      finalidad: () => this.sonidoFinalidad(),
      todas_las_voces: () => this.todasLasVoces(),
      osito_supremo: () => this.ositorSupremo(),
    };

    const fn = mapasSonidos[tipo];
    if (fn) {
      fn.call(this);
      this.tiempoUltimoSonido = ahora;
    }
  }

  // SONIDOS BÁSICOS
  suspiro() {
    const ctx = this.audioContext;
    const ahora = ctx.currentTime;
    
    const osc = ctx.createOscillator();
    const env = ctx.createGain();
    
    osc.frequency.setValueAtTime(200, ahora);
    osc.frequency.exponentialRampToValueAtTime(80, ahora + 0.5);
    
    env.gain.setValueAtTime(0.2, ahora);
    env.gain.linearRampToValueAtTime(0, ahora + 0.5);
    
    osc.connect(env);
    env.connect(ctx.destination);
    
    osc.start(ahora);
    osc.stop(ahora + 0.5);
  }

  bostezo() {
    const ctx = this.audioContext;
    const ahora = ctx.currentTime;
    
    const osc = ctx.createOscillator();
    const env = ctx.createGain();
    
    osc.frequency.setValueAtTime(150, ahora);
    osc.frequency.linearRampToValueAtTime(100, ahora + 0.3);
    osc.frequency.linearRampToValueAtTime(80, ahora + 0.6);
    
    env.gain.setValueAtTime(0, ahora);
    env.gain.linearRampToValueAtTime(0.15, ahora + 0.1);
    env.gain.linearRampToValueAtTime(0, ahora + 0.6);
    
    osc.connect(env);
    env.connect(ctx.destination);
    
    osc.start(ahora);
    osc.stop(ahora + 0.6);
  }

  gruñido() {
    const ctx = this.audioContext;
    const ahora = ctx.currentTime;
    
    const osc = ctx.createOscillator();
    const env = ctx.createGain();
    
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(100, ahora);
    osc.frequency.linearRampToValueAtTime(120, ahora + 0.2);
    
    env.gain.setValueAtTime(0.15, ahora);
    env.gain.linearRampToValueAtTime(0, ahora + 0.3);
    
    osc.connect(env);
    env.connect(ctx.destination);
    
    osc.start(ahora);
    osc.stop(ahora + 0.3);
  }

  sonidoRisa() {
    const ctx = this.audioContext;
    const ahora = ctx.currentTime;
    
    for (let i = 0; i < 3; i++) {
      const osc = ctx.createOscillator();
      const env = ctx.createGain();
      
      osc.frequency.setValueAtTime(300 + (i * 100), ahora + (i * 0.15));
      
      env.gain.setValueAtTime(0, ahora + (i * 0.15));
      env.gain.linearRampToValueAtTime(0.1, ahora + (i * 0.15) + 0.05);
      env.gain.linearRampToValueAtTime(0, ahora + (i * 0.15) + 0.15);
      
      osc.connect(env);
      env.connect(ctx.destination);
      
      osc.start(ahora + (i * 0.15));
      osc.stop(ahora + (i * 0.15) + 0.15);
    }
  }

  sonidoDramatico() {
    const ctx = this.audioContext;
    const ahora = ctx.currentTime;
    
    const osc = ctx.createOscillator();
    const env = ctx.createGain();
    
    osc.frequency.setValueAtTime(400, ahora);
    osc.frequency.linearRampToValueAtTime(600, ahora + 0.1);
    osc.frequency.linearRampToValueAtTime(200, ahora + 0.4);
    
    env.gain.setValueAtTime(0, ahora);
    env.gain.linearRampToValueAtTime(0.2, ahora + 0.1);
    env.gain.linearRampToValueAtTime(0, ahora + 0.4);
    
    osc.connect(env);
    env.connect(ctx.destination);
    
    osc.start(ahora);
    osc.stop(ahora + 0.4);
  }

  sonidoTernura() {
    const ctx = this.audioContext;
    const ahora = ctx.currentTime;
    
    const osc = ctx.createOscillator();
    const env = ctx.createGain();
    
    osc.frequency.setValueAtTime(600, ahora);
    osc.frequency.linearRampToValueAtTime(700, ahora + 0.2);
    
    env.gain.setValueAtTime(0, ahora);
    env.gain.linearRampToValueAtTime(0.08, ahora + 0.05);
    env.gain.linearRampToValueAtTime(0, ahora + 0.3);
    
    osc.connect(env);
    env.connect(ctx.destination);
    
    osc.start(ahora);
    osc.stop(ahora + 0.3);
  }

  guitarraElectrica() {
    const ctx = this.audioContext;
    const ahora = ctx.currentTime;
    
    for (let i = 0; i < 2; i++) {
      const osc = ctx.createOscillator();
      const env = ctx.createGain();
      
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(330 + (i * 100), ahora + (i * 0.1));
      
      env.gain.setValueAtTime(0.15, ahora + (i * 0.1));
      env.gain.exponentialRampToValueAtTime(0.01, ahora + (i * 0.1) + 0.3);
      
      osc.connect(env);
      env.connect(ctx.destination);
      
      osc.start(ahora + (i * 0.1));
      osc.stop(ahora + (i * 0.1) + 0.3);
    }
  }

  notaMusical() {
    const ctx = this.audioContext;
    const ahora = ctx.currentTime;
    
    const osc = ctx.createOscillator();
    const env = ctx.createGain();
    
    osc.frequency.setValueAtTime(440, ahora);
    
    env.gain.setValueAtTime(0, ahora);
    env.gain.linearRampToValueAtTime(0.1, ahora + 0.05);
    env.gain.linearRampToValueAtTime(0, ahora + 0.4);
    
    osc.connect(env);
    env.connect(ctx.destination);
    
    osc.start(ahora);
    osc.stop(ahora + 0.4);
  }

  beepBoop() {
    const ctx = this.audioContext;
    const ahora = ctx.currentTime;
    
    const notas = [400, 300];
    
    for (let i = 0; i < notas.length; i++) {
      const osc = ctx.createOscillator();
      const env = ctx.createGain();
      
      osc.frequency.setValueAtTime(notas[i], ahora + (i * 0.15));
      
      env.gain.setValueAtTime(0.1, ahora + (i * 0.15));
      env.gain.linearRampToValueAtTime(0, ahora + (i * 0.15) + 0.1);
      
      osc.connect(env);
      env.connect(ctx.destination);
      
      osc.start(ahora + (i * 0.15));
      osc.stop(ahora + (i * 0.15) + 0.1);
    }
  }

  sonidoEnigma() {
    const ctx = this.audioContext;
    const ahora = ctx.currentTime;
    
    const osc = ctx.createOscillator();
    const env = ctx.createGain();
    
    osc.frequency.setValueAtTime(300, ahora);
    osc.frequency.linearRampToValueAtTime(500, ahora + 0.2);
    osc.frequency.linearRampToValueAtTime(250, ahora + 0.4);
    
    env.gain.setValueAtTime(0, ahora);
    env.gain.linearRampToValueAtTime(0.12, ahora + 0.1);
    env.gain.linearRampToValueAtTime(0, ahora + 0.4);
    
    osc.connect(env);
    env.connect(ctx.destination);
    
    osc.start(ahora);
    osc.stop(ahora + 0.4);
  }

  sonidoMisterio() {
    const ctx = this.audioContext;
    const ahora = ctx.currentTime;
    
    const osc = ctx.createOscillator();
    const env = ctx.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(200, ahora);
    osc.frequency.exponentialRampToValueAtTime(100, ahora + 0.5);
    
    env.gain.setValueAtTime(0, ahora);
    env.gain.linearRampToValueAtTime(0.1, ahora + 0.1);
    env.gain.linearRampToValueAtTime(0, ahora + 0.5);
    
    osc.connect(env);
    env.connect(ctx.destination);
    
    osc.start(ahora);
    osc.stop(ahora + 0.5);
  }

  // Sonidos predeterminados para cuando no tiene uno específico
  sonidoNostalgia() { this.suspiro(); }
  sonidoRecuerdo() { this.suspiro(); }
  sonidoDecepcion() { this.gruñido(); }
  sonidoDelicado() { this.sonidoTernura(); }
  sonidoEco() { this.sonidoMisterio(); }
  suspiroLargo() { this.suspiro(); }
  sonidoReflexion() { this.suspiro(); }
  llantoSuave() { this.suspiro(); }
  wow() { this.sonidoDramatico(); }
  sonidoTelenovela() { this.sonidoDramatico(); }
  dramaticoFuerte() { this.sonidoDramatico(); }
  aplausosFalsos() { this.sonidoRisa(); }
  gruñidoEnojo() { this.gruñido(); }
  sonidoSss() { this.gruñido(); }
  sonidoTapTap() { this.beepBoop(); }
  musica_metalica() { this.guitarraElectrica(); }
  guitarraPunk() { this.guitarraElectrica(); }
  sonidoRock() { this.guitarraElectrica(); }
  sonidoConfianza() { this.notaMusical(); }
  sonidoAww() { this.sonidoTernura(); }
  corazonLatiendo() { this.sonidoTernura(); }
  campanillas() { this.notaMusical(); }
  sonidoBienvenida() { this.sonidoTernura(); }
  risaBromista() { this.sonidoRisa(); }
  sonidoKazoo() { this.notaMusical(); }
  campanillaBromista() { this.notaMusical(); }
  risaBurlona() { this.sonidoRisa(); }
  carcajadaLoca() { this.sonidoRisa(); }
  sonidoCaos() { this.guitarraElectrica(); }
  energiaAlta() { this.notaMusical(); }
  sonidoDingDing() { this.notaMusical(); }
  sonidoBoing() { this.notaMusical(); }
  sonidoSarcasmo() { this.sonidoDramatico(); }
  sonidoIronia() { this.sonidoDramatico(); }
  sarcasmoFuerte() { this.sonidoDramatico(); }
  sonidoBurla() { this.sonidoRisa(); }
  suspiroAburrido() { this.suspiro(); }
  sonidoEh() { this.gruñido(); }
  sonidoMeh() { this.gruñido(); }
  sonidoSilencio() { /* Sin sonido */ }
  sonidoMonotono() { this.suspiro(); }
  sonidoPregunta() { this.notaMusical(); }
  sonidoInvestigando() { this.beepBoop(); }
  sonidoAventura() { this.guitarraElectrica(); }
  sonidoObservacion() { this.notaMusical(); }
  sonidoPreguntaConstante() { this.notaMusical(); }
  risaPicarona() { this.sonidoRisa(); }
  sonidoSincronia() { this.notaMusical(); }
  sonidoJugueteo() { this.sonidoRisa(); }
  risaSilenciosa() { /* Sin sonido */ }
  sonidoInteligencia() { this.beepBoop(); }
  sonidoOscuridad() { this.sonidoMisterio(); }
  sonidoTinieblas() { this.sonidoMisterio(); }
  sonidoSusurro() { this.suspiro(); }
  sonidoInquietante() { this.sonidoMisterio(); }
  sonidoVideoGame() { this.beepBoop(); }
  sonidoVictoria() { this.sonidoRisa(); }
  falloComico() { this.gruñido(); }
  sonidoCompetencia() { this.guitarraElectrica(); }
  sonidoBatalla() { this.guitarraElectrica(); }
  sonidoCanto() { this.notaMusical(); }
  musicaRock() { this.guitarraElectrica(); }
  sonidoMetal() { this.guitarraElectrica(); }
  sonidoPunk() { this.guitarraElectrica(); }
  sonidoLaser() { this.beepBoop(); }
  sonidoCalcular() { this.beepBoop(); }
  sonidoMatematicas() { this.beepBoop(); }
  sonidoCodigo() { this.beepBoop(); }
  sonidoTimidez() { this.suspiro(); }
  sonidoVergüenza() { this.suspiro(); }
  reflexionInterna() { this.suspiro(); }
  sonidoQuietud() { /* Sin sonido */ }
  fanfarria() { this.sonidoRisa(); }
  sonidoArrogancia() { this.sonidoDramatico(); }
  sonidoVanidad() { this.sonidoDramatico(); }
  sonidoOrgullo() { this.notaMusical(); }
  sonidoElegancia() { this.notaMusical(); }
  sonidoAmor() { this.sonidoTernura(); }
  sonidoAmistad() { this.sonidoTernura(); }
  sonidoProteccion() { this.notaMusical(); }
  sonidoCuidado() { this.sonidoTernura(); }
  sonidoEmpatia() { this.sonidoTernura(); }
  misterioProfundo() { this.sonidoMisterio(); }
  sonidoProfecia() { this.sonidoMisterio(); }
  sonidoVision() { this.sonidoMisterio(); }
  sonidoProfundidad() { this.sonidoMisterio(); }
  sonidoFilosofia() { this.suspiro(); }
  sonidoExistencia() { this.sonidoMisterio(); }
  nocheSilenciosa() { /* Sin sonido */ }
  sonidoViaje() { this.guitarraElectrica(); }
  sonidoCosmos() { this.notaMusical(); }
  sonidoViajesTemporal() { this.beepBoop(); }
  sonidoEspacio() { this.notaMusical(); }
  sonidoDigital() { this.beepBoop(); }
  sonidoAntiguedad() { this.suspiro(); }
  sonidoFuturo() { this.beepBoop(); }
  sonidoDimension() { this.beepBoop(); }
  sonidoFantasma() { this.sonidoMisterio(); }
  sonidoSueños() { this.notaMusical(); }
  sonidoRecuerdos() { this.suspiro(); }
  sonidoEstrellas() { this.notaMusical(); }
  sonidoLuna() { this.notaMusical(); }
  sonidoVacio() { this.suspiro(); }
  sonidoSecreto() { this.suspiro(); }
  sonidoSombras() { this.sonidoMisterio(); }
  sonidoAcertijo() { this.sonidoMisterio(); }
  sonidoLeyenda() { this.guitarraElectrica(); }
  sonidoImaginacion() { this.notaMusical(); }
  sonidoPensamiento() { this.beepBoop(); }
  sonidoCreacion() { this.guitarraElectrica(); }
  sonidoNoche() { this.sonidoMisterio(); }
  sonidoMadrugada() { this.suspiro(); }
  sonidoSuenoExtrano() { this.sonidoMisterio(); }
  sonidoMisterioso() { this.sonidoMisterio(); }
  sonidoExpresionRara() { this.beepBoop(); }
  multipersonal() { this.sonidoRisa(); }
  sonidoTransformacion() { this.guitarraElectrica(); }
  sonidoEvolucion() { this.guitarraElectrica(); }
  sonidoMilRostros() { this.sonidoRisa(); }
  caosAbsoluto() { this.guitarraElectrica(); }
  sonidoMultiverso() { this.beepBoop(); }
  sonidoLeyendaAbsoluta() { this.guitarraElectrica(); }
  sonidoSupremacia() { this.guitarraElectrica(); }
  sonidoInfinito() { this.notaMusical(); }
  sonidoFinalidad() { this.suspiro(); }
  todasLasVoces() { this.sonidoRisa(); }
  ositorSupremo() { 
    // Sonido épico para la personalidad suprema
    const ctx = this.audioContext;
    const ahora = ctx.currentTime;
    
    const notas = [261.63, 293.66, 329.63, 349.23, 392.00];
    
    for (let i = 0; i < notas.length; i++) {
      const osc = ctx.createOscillator();
      const env = ctx.createGain();
      
      osc.frequency.setValueAtTime(notas[i], ahora + (i * 0.1));
      
      env.gain.setValueAtTime(0, ahora + (i * 0.1));
      env.gain.linearRampToValueAtTime(0.15, ahora + (i * 0.1) + 0.05);
      env.gain.linearRampToValueAtTime(0, ahora + (i * 0.1) + 0.2);
      
      osc.connect(env);
      env.connect(ctx.destination);
      
      osc.start(ahora + (i * 0.1));
      osc.stop(ahora + (i * 0.1) + 0.2);
    }
  }

  bostezoPequeno() { this.bostezo(); }
  bostezGrande() { this.bostezo(); }
  ronquido() { 
    const ctx = this.audioContext;
    const ahora = ctx.currentTime;
    
    const osc = ctx.createOscillator();
    const env = ctx.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(90, ahora);
    osc.frequency.linearRampToValueAtTime(95, ahora + 0.2);
    osc.frequency.linearRampToValueAtTime(90, ahora + 0.4);
    
    env.gain.setValueAtTime(0.08, ahora);
    env.gain.linearRampToValueAtTime(0.12, ahora + 0.2);
    env.gain.linearRampToValueAtTime(0, ahora + 0.4);
    
    osc.connect(env);
    env.connect(ctx.destination);
    
    osc.start(ahora);
    osc.stop(ahora + 0.4);
  }

  setVolumen(valor) {
    this.volumenGlobal = Math.max(0, Math.min(1, valor));
  }

  activarSonido(estado) {
    this.sonoridadActivada = estado;
  }
}

window.GestorSonidos = GestorSonidos;
