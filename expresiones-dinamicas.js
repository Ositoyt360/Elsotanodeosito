/**
 * SISTEMA DE EXPRESIONES FACIALES DINÁMICAS
 * Genera expresiones en SVG basadas en la personalidad actual
 */

class ExpresionDinamica {
  constructor(contenedorId = 'osito-cara') {
    this.contenedor = document.getElementById(contenedorId);
    this.personalidadActual = null;
    this.svg = null;
    this.animacionActiva = false;
  }

  generarExpresion(personalidad) {
    this.personalidadActual = personalidad;
    
    const expresionMap = {
      sad: () => this.crearExpresionTriste(),
      melancholic: () => this.crearExpresionMelancolia(),
      nostalgic: () => this.crearExpresionNostalgia(),
      disappointed: () => this.crearExpresionDecepcion(),
      sensitive: () => this.crearExpresionSensible(),
      lonely: () => this.crearExpresionSolitario(),
      discouraged: () => this.crearExpresionDesanimado(),
      disillusioned: () => this.crearExpresionDesilusionado(),
      thoughtful_sad: () => this.crearExpresionPensativoTriste(),
      heartbroken: () => this.crearExpresionCorazonRoto(),
      
      dramatic: () => this.crearExpresionDramatica(),
      exaggerated: () => this.crearExpresionExagerada(),
      soap_opera: () => this.crearExpresionTelenovela(),
      drama_queen: () => this.crearExpresionReinaDrama(),
      pro_dramatic: () => this.crearExpresionDramaticaProfesional(),
      
      sleepy: () => this.crearExpresionDormilona(),
      lazy: () => this.crearExpresionPerezosa(),
      drowsy: () => this.crearExpresionSonoliento(),
      yawner: () => this.crearExpresionBostezador(),
      snorer: () => this.crearExpresionRoncador(),
      
      angry: () => this.crearExpresionEnojada(),
      grumpy: () => this.crearExpresionGrunon(),
      moody: () => this.crearExpresionMalhumorada(),
      irritated: () => this.crearExpresionIrritada(),
      impatient: () => this.crearExpresionImpaciente(),
      
      rebel: () => this.crearExpresionRebelde(),
      emo_rebel: () => this.crearExpresionEmoRebelde(),
      punk: () => this.crearExpresionPunk(),
      rocker: () => this.crearExpresionRockero(),
      independent: () => this.crearExpresionIndependiente(),
      
      sweet: () => this.crearExpresionTierna(),
      adorable: () => this.crearExpresionAdorable(),
      affectionate: () => this.crearExpresionCarinosa(),
      sweet_face: () => this.crearExpresionDulce(),
      friendly: () => this.crearExpresionAmigable(),
      
      funny: () => this.crearExpresionGraciosa(),
      joker: () => this.crearExpresionBromista(),
      clown: () => this.crearExpresionPayaso(),
      jester: () => this.crearExpresionBufon(),
      sarcastic_funny: () => this.crearExpresionSarcasticaFunny(),
      
      crazy_fun: () => this.crearExpresionLocaDivertida(),
      chaotic: () => this.crearExpresionCaotica(),
      hyperactive: () => this.crearExpresionHiperactiva(),
      unpredictable: () => this.crearExpresionImpredecible(),
      eccentric: () => this.crearExpresionExcentrica(),
      
      sarcastic: () => this.crearExpresionSarcastica(),
      ironic: () => this.crearExpresionIronica(),
      biting: () => this.crearExpresionMordaz(),
      smart_mouth: () => this.crearExpresionConeston(),
      mocking: () => this.crearExpresionBurlon(),
      
      bored: () => this.crearExpresionAburrida(),
      unmotivated: () => this.crearExpresionDesganada(),
      indifferent: () => this.crearExpresionDesinteresada(),
      apathetic: () => this.crearExpresionApatica(),
      monotonous: () => this.crearExpresionMonotona(),
      
      curious: () => this.crearExpresionCuriosa(),
      investigator: () => this.crearExpresionInvestigador(),
      explorer: () => this.crearExpresionExplorador(),
      observer: () => this.crearExpresionObservador(),
      questioner: () => this.crearExpresionPreguntona(),
      
      mischievous: () => this.crearExpresionTraviesa(),
      rogue: () => this.crearExpresionPicara(),
      playful: () => this.crearExpresionJugueona(),
      secret_joker: () => this.crearExpresionBromistaDSecreta(),
      clever: () => this.crearExpresionAstuta(),
      
      dark: () => this.crearExpresionOscura(),
      gothic: () => this.crearExpresionGotica(),
      mysterious: () => this.crearExpresionMisteriosa(),
      ominous: () => this.crearExpresionTenebrosa(),
      enigmatic: () => this.crearExpresionEnigmatica(),
      
      gamer: () => this.crearExpresionGamer(),
      pro_gamer: () => this.crearExpresionProGamer(),
      noob: () => this.crearExpresionNoob(),
      tryhard: () => this.crearExpresionTryhard(),
      competitive: () => this.crearExpresionCompetitiva(),
      
      musical: () => this.crearExpresionMusical(),
      singer: () => this.crearExpresionCantante(),
      rocker: () => this.crearExpresionRocker(),
      metalhead: () => this.crearExpresionMetalero(),
      punk_music: () => this.crearExpresionPunkMusical(),
      
      robot_classic: () => this.crearExpresionRobotClasico(),
      robot_futuristic: () => this.crearExpresionRobotFuturista(),
      robot_logical: () => this.crearExpresionRobotLogico(),
      robot_calculator: () => this.crearExpresionRobotCalculador(),
      robot_programmer: () => this.crearExpresionRobotProgramador(),
      
      shy: () => this.crearExpresionTimida(),
      embarrassed: () => this.crearExpresionAvergonzada(),
      reserved: () => this.crearExpresionReservada(),
      introverted: () => this.crearExpresionIntrovertida(),
      quiet: () => this.crearExpresionCallada(),
      
      proud: () => this.crearExpresionPresumida(),
      arrogant: () => this.crearExpresionArrogante(),
      vain: () => this.crearExpresionVanidosa(),
      haughty: () => this.crearExpresionOrgullosa(),
      elegant: () => this.crearExpresionElegante(),
      
      affectionate: () => this.crearExpresionCarinosa(),
      friendly: () => this.crearExpresionAmable(),
      protective: () => this.crearExpresionProtectora(),
      attentive: () => this.crearExpresionAtenta(),
      empathetic: () => this.crearExpresionEmpatica(),
      
      mysterious_special: () => this.crearExpresionMisteriosEspecial(),
      enigmatic_special: () => this.crearExpresionEnigmaticoEspecial(),
      ultimate_osito: () => this.crearExpresionSuprema(),
    };

    const generador = expresionMap[personalidad.expresion];
    if (generador) {
      this.limpiar();
      generador.call(this);
    }
  }

  crearSVGBase(ancho = 400, alto = 400) {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', `0 0 ${ancho} ${alto}`);
    svg.setAttribute('width', '100%');
    svg.setAttribute('height', '100%');
    svg.style.maxWidth = '600px';
    return svg;
  }

  crearOjos(svg, x, y, expresion = 'normal') {
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.id = 'ojos';

    const expresionMap = {
      cerrado: () => {
        const linea1 = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        linea1.setAttribute('x1', x - 60);
        linea1.setAttribute('y1', y);
        linea1.setAttribute('x2', x - 20);
        linea1.setAttribute('y2', y);
        linea1.setAttribute('stroke', '#000');
        linea1.setAttribute('stroke-width', '8');
        linea1.setAttribute('stroke-linecap', 'round');
        g.appendChild(linea1);

        const linea2 = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        linea2.setAttribute('x1', x + 20);
        linea2.setAttribute('y1', y);
        linea2.setAttribute('x2', x + 60);
        linea2.setAttribute('y2', y);
        linea2.setAttribute('stroke', '#000');
        linea2.setAttribute('stroke-width', '8');
        linea2.setAttribute('stroke-linecap', 'round');
        g.appendChild(linea2);
      },
      semi_abierto: () => {
        const circulo1 = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        circulo1.setAttribute('cx', x - 40);
        circulo1.setAttribute('cy', y);
        circulo1.setAttribute('r', '15');
        circulo1.setAttribute('fill', '#000');
        g.appendChild(circulo1);

        const iris1 = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        iris1.setAttribute('cx', x - 40);
        iris1.setAttribute('cy', y);
        iris1.setAttribute('r', '8');
        iris1.setAttribute('fill', '#fff');
        g.appendChild(iris1);

        const circulo2 = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        circulo2.setAttribute('cx', x + 40);
        circulo2.setAttribute('cy', y);
        circulo2.setAttribute('r', '15');
        circulo2.setAttribute('fill', '#000');
        g.appendChild(circulo2);

        const iris2 = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        iris2.setAttribute('cx', x + 40);
        iris2.setAttribute('cy', y);
        iris2.setAttribute('r', '8');
        iris2.setAttribute('fill', '#fff');
        g.appendChild(iris2);
      },
      abierto: () => {
        const elipse1 = document.createElementNS('http://www.w3.org/2000/svg', 'ellipse');
        elipse1.setAttribute('cx', x - 40);
        elipse1.setAttribute('cy', y);
        elipse1.setAttribute('rx', '20');
        elipse1.setAttribute('ry', '25');
        elipse1.setAttribute('fill', '#000');
        g.appendChild(elipse1);

        const iris1 = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        iris1.setAttribute('cx', x - 40);
        iris1.setAttribute('cy', y - 5);
        iris1.setAttribute('r', '10');
        iris1.setAttribute('fill', '#fff');
        g.appendChild(iris1);

        const brillo1 = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        brillo1.setAttribute('cx', x - 36);
        brillo1.setAttribute('cy', y - 8);
        brillo1.setAttribute('r', '4');
        brillo1.setAttribute('fill', '#ffff00');
        g.appendChild(brillo1);

        const elipse2 = document.createElementNS('http://www.w3.org/2000/svg', 'ellipse');
        elipse2.setAttribute('cx', x + 40);
        elipse2.setAttribute('cy', y);
        elipse2.setAttribute('rx', '20');
        elipse2.setAttribute('ry', '25');
        elipse2.setAttribute('fill', '#000');
        g.appendChild(elipse2);

        const iris2 = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        iris2.setAttribute('cx', x + 40);
        iris2.setAttribute('cy', y - 5);
        iris2.setAttribute('r', '10');
        iris2.setAttribute('fill', '#fff');
        g.appendChild(iris2);

        const brillo2 = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        brillo2.setAttribute('cx', x + 44);
        brillo2.setAttribute('cy', y - 8);
        brillo2.setAttribute('r', '4');
        brillo2.setAttribute('fill', '#ffff00');
        g.appendChild(brillo2);
      },
      lloroso: () => {
        const elipse1 = document.createElementNS('http://www.w3.org/2000/svg', 'ellipse');
        elipse1.setAttribute('cx', x - 40);
        elipse1.setAttribute('cy', y);
        elipse1.setAttribute('rx', '20');
        elipse1.setAttribute('ry', '25');
        elipse1.setAttribute('fill', '#000');
        g.appendChild(elipse1);

        const iris1 = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        iris1.setAttribute('cx', x - 40);
        iris1.setAttribute('cy', y + 5);
        iris1.setAttribute('r', '10');
        iris1.setAttribute('fill', '#00ccff');
        g.appendChild(iris1);

        const lagrima1 = document.createElementNS('http://www.w3.org/2000/svg', 'ellipse');
        lagrima1.setAttribute('cx', x - 40);
        lagrima1.setAttribute('cy', y + 35);
        lagrima1.setAttribute('rx', '8');
        lagrima1.setAttribute('ry', '15');
        lagrima1.setAttribute('fill', '#00ccff');
        lagrima1.setAttribute('opacity', '0.7');
        g.appendChild(lagrima1);

        const elipse2 = document.createElementNS('http://www.w3.org/2000/svg', 'ellipse');
        elipse2.setAttribute('cx', x + 40);
        elipse2.setAttribute('cy', y);
        elipse2.setAttribute('rx', '20');
        elipse2.setAttribute('ry', '25');
        elipse2.setAttribute('fill', '#000');
        g.appendChild(elipse2);

        const iris2 = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        iris2.setAttribute('cx', x + 40);
        iris2.setAttribute('cy', y + 5);
        iris2.setAttribute('r', '10');
        iris2.setAttribute('fill', '#00ccff');
        g.appendChild(iris2);

        const lagrima2 = document.createElementNS('http://www.w3.org/2000/svg', 'ellipse');
        lagrima2.setAttribute('cx', x + 40);
        lagrima2.setAttribute('cy', y + 35);
        lagrima2.setAttribute('rx', '8');
        lagrima2.setAttribute('ry', '15');
        lagrima2.setAttribute('fill', '#00ccff');
        lagrima2.setAttribute('opacity', '0.7');
        g.appendChild(lagrima2);
      },
      maravillado: () => {
        const elipse1 = document.createElementNS('http://www.w3.org/2000/svg', 'ellipse');
        elipse1.setAttribute('cx', x - 40);
        elipse1.setAttribute('cy', y);
        elipse1.setAttribute('rx', '25');
        elipse1.setAttribute('ry', '32');
        elipse1.setAttribute('fill', '#000');
        g.appendChild(elipse1);

        const iris1 = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        iris1.setAttribute('cx', x - 40);
        iris1.setAttribute('cy', y);
        iris1.setAttribute('r', '12');
        iris1.setAttribute('fill', '#ffff00');
        g.appendChild(iris1);

        const elipse2 = document.createElementNS('http://www.w3.org/2000/svg', 'ellipse');
        elipse2.setAttribute('cx', x + 40);
        elipse2.setAttribute('cy', y);
        elipse2.setAttribute('rx', '25');
        elipse2.setAttribute('ry', '32');
        elipse2.setAttribute('fill', '#000');
        g.appendChild(elipse2);

        const iris2 = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        iris2.setAttribute('cx', x + 40);
        iris2.setAttribute('cy', y);
        iris2.setAttribute('r', '12');
        iris2.setAttribute('fill', '#ffff00');
        g.appendChild(iris2);
      },
      enojado: () => {
        const cejaizq = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        cejaizq.setAttribute('x1', x - 60);
        cejaizq.setAttribute('y1', y - 35);
        cejaizq.setAttribute('x2', x - 20);
        cejaizq.setAttribute('y2', y - 20);
        cejaizq.setAttribute('stroke', '#000');
        cejaizq.setAttribute('stroke-width', '6');
        cejaizq.setAttribute('stroke-linecap', 'round');
        g.appendChild(cejaizq);

        const cejader = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        cejader.setAttribute('x1', x + 20);
        cejader.setAttribute('y1', y - 20);
        cejader.setAttribute('x2', x + 60);
        cejader.setAttribute('y2', y - 35);
        cejader.setAttribute('stroke', '#000');
        cejader.setAttribute('stroke-width', '6');
        cejader.setAttribute('stroke-linecap', 'round');
        g.appendChild(cejader);

        const circulo1 = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        circulo1.setAttribute('cx', x - 40);
        circulo1.setAttribute('cy', y);
        circulo1.setAttribute('r', '18');
        circulo1.setAttribute('fill', '#ff0000');
        g.appendChild(circulo1);

        const iris1 = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        iris1.setAttribute('cx', x - 40);
        iris1.setAttribute('cy', y);
        iris1.setAttribute('r', '8');
        iris1.setAttribute('fill', '#000');
        g.appendChild(iris1);

        const circulo2 = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        circulo2.setAttribute('cx', x + 40);
        circulo2.setAttribute('cy', y);
        circulo2.setAttribute('r', '18');
        circulo2.setAttribute('fill', '#ff0000');
        g.appendChild(circulo2);

        const iris2 = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        iris2.setAttribute('cx', x + 40);
        iris2.setAttribute('cy', y);
        iris2.setAttribute('r', '8');
        iris2.setAttribute('fill', '#000');
        g.appendChild(iris2);
      }
    };

    const fn = expresionMap[expresion];
    if (fn) fn.call(this);
    else expresionMap.normal?.call(this);

    return g;
  }

  crearBoca(svg, x, y, expresion = 'neutral') {
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.id = 'boca';

    const expresionMap = {
      sonrisa: () => {
        const arco = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        arco.setAttribute('d', `M ${x - 40} ${y} Q ${x} ${y + 30} ${x + 40} ${y}`);
        arco.setAttribute('stroke', '#000');
        arco.setAttribute('stroke-width', '5');
        arco.setAttribute('fill', 'none');
        arco.setAttribute('stroke-linecap', 'round');
        g.appendChild(arco);
      },
      sonrisa_grande: () => {
        const arco = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        arco.setAttribute('d', `M ${x - 50} ${y} Q ${x} ${y + 45} ${x + 50} ${y}`);
        arco.setAttribute('stroke', '#ff0000');
        arco.setAttribute('stroke-width', '6');
        arco.setAttribute('fill', 'none');
        arco.setAttribute('stroke-linecap', 'round');
        g.appendChild(arco);
      },
      sonrisa_timida: () => {
        const arco = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        arco.setAttribute('d', `M ${x - 25} ${y} Q ${x} ${y + 15} ${x + 25} ${y}`);
        arco.setAttribute('stroke', '#000');
        arco.setAttribute('stroke-width', '4');
        arco.setAttribute('fill', 'none');
        arco.setAttribute('stroke-linecap', 'round');
        g.appendChild(arco);
      },
      neutral: () => {
        const linea = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        linea.setAttribute('x1', x - 40);
        linea.setAttribute('y1', y);
        linea.setAttribute('x2', x + 40);
        linea.setAttribute('y2', y);
        linea.setAttribute('stroke', '#000');
        linea.setAttribute('stroke-width', '4');
        linea.setAttribute('stroke-linecap', 'round');
        g.appendChild(linea);
      },
      triste: () => {
        const arco = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        arco.setAttribute('d', `M ${x - 40} ${y} Q ${x} ${y - 20} ${x + 40} ${y}`);
        arco.setAttribute('stroke', '#0000ff');
        arco.setAttribute('stroke-width', '5');
        arco.setAttribute('fill', 'none');
        arco.setAttribute('stroke-linecap', 'round');
        g.appendChild(arco);
      },
      sorpresa: () => {
        const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        rect.setAttribute('x', x - 30);
        rect.setAttribute('y', y - 10);
        rect.setAttribute('width', '60');
        rect.setAttribute('height', '40');
        rect.setAttribute('rx', '15');
        rect.setAttribute('fill', '#ff6600');
        rect.setAttribute('stroke', '#000');
        rect.setAttribute('stroke-width', '2');
        g.appendChild(rect);
      }
    };

    const fn = expresionMap[expresion];
    if (fn) fn.call(this);
    else expresionMap.neutral?.call(this);

    return g;
  }

  crearExpresionTriste() {
    const svg = this.crearSVGBase();
    
    const cabeza = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    cabeza.setAttribute('cx', '200');
    cabeza.setAttribute('cy', '200');
    cabeza.setAttribute('r', '100');
    cabeza.setAttribute('fill', '#F8E5B8');
    cabeza.setAttribute('stroke', '#000');
    cabeza.setAttribute('stroke-width', '3');
    svg.appendChild(cabeza);

    svg.appendChild(this.crearOjos(svg, 200, 150, 'lloroso'));
    svg.appendChild(this.crearBoca(svg, 200, 260, 'triste'));

    if (this.contenedor) {
      this.contenedor.innerHTML = '';
      this.contenedor.appendChild(svg);
    }
  }

  crearExpresionDramatica() {
    const svg = this.crearSVGBase();
    
    const cabeza = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    cabeza.setAttribute('cx', '200');
    cabeza.setAttribute('cy', '200');
    cabeza.setAttribute('r', '100');
    cabeza.setAttribute('fill', '#F8E5B8');
    cabeza.setAttribute('stroke', '#000');
    cabeza.setAttribute('stroke-width', '3');
    svg.appendChild(cabeza);

    svg.appendChild(this.crearOjos(svg, 200, 150, 'maravillado'));
    svg.appendChild(this.crearBoca(svg, 200, 260, 'sorpresa'));

    if (this.contenedor) {
      this.contenedor.innerHTML = '';
      this.contenedor.appendChild(svg);
    }
  }

  crearExpresionDormilona() {
    const svg = this.crearSVGBase();
    
    const cabeza = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    cabeza.setAttribute('cx', '200');
    cabeza.setAttribute('cy', '200');
    cabeza.setAttribute('r', '100');
    cabeza.setAttribute('fill', '#F8E5B8');
    cabeza.setAttribute('stroke', '#000');
    cabeza.setAttribute('stroke-width', '3');
    svg.appendChild(cabeza);

    svg.appendChild(this.crearOjos(svg, 200, 150, 'cerrado'));
    svg.appendChild(this.crearBoca(svg, 200, 260, 'neutral'));

    const zzz = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    zzz.setAttribute('x', '280');
    zzz.setAttribute('y', '80');
    zzz.setAttribute('font-size', '32');
    zzz.setAttribute('font-weight', 'bold');
    zzz.textContent = 'Z';
    svg.appendChild(zzz);

    if (this.contenedor) {
      this.contenedor.innerHTML = '';
      this.contenedor.appendChild(svg);
    }
  }

  crearExpresionEnojada() {
    const svg = this.crearSVGBase();
    
    const cabeza = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    cabeza.setAttribute('cx', '200');
    cabeza.setAttribute('cy', '200');
    cabeza.setAttribute('r', '100');
    cabeza.setAttribute('fill', '#F8E5B8');
    cabeza.setAttribute('stroke', '#000');
    cabeza.setAttribute('stroke-width', '3');
    svg.appendChild(cabeza);

    svg.appendChild(this.crearOjos(svg, 200, 150, 'enojado'));
    svg.appendChild(this.crearBoca(svg, 200, 260, 'neutral'));

    if (this.contenedor) {
      this.contenedor.innerHTML = '';
      this.contenedor.appendChild(svg);
    }
  }

  crearExpresionGraciosa() {
    const svg = this.crearSVGBase();
    
    const cabeza = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    cabeza.setAttribute('cx', '200');
    cabeza.setAttribute('cy', '200');
    cabeza.setAttribute('r', '100');
    cabeza.setAttribute('fill', '#F8E5B8');
    cabeza.setAttribute('stroke', '#000');
    cabeza.setAttribute('stroke-width', '3');
    svg.appendChild(cabeza);

    svg.appendChild(this.crearOjos(svg, 200, 150, 'abierto'));
    svg.appendChild(this.crearBoca(svg, 200, 260, 'sonrisa_grande'));

    if (this.contenedor) {
      this.contenedor.innerHTML = '';
      this.contenedor.appendChild(svg);
    }
  }

  crearExpresionTierna() {
    const svg = this.crearSVGBase();
    
    const cabeza = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    cabeza.setAttribute('cx', '200');
    cabeza.setAttribute('cy', '200');
    cabeza.setAttribute('r', '100');
    cabeza.setAttribute('fill', '#FFB6C1');
    cabeza.setAttribute('stroke', '#000');
    cabeza.setAttribute('stroke-width', '3');
    svg.appendChild(cabeza);

    svg.appendChild(this.crearOjos(svg, 200, 150, 'abierto'));
    svg.appendChild(this.crearBoca(svg, 200, 260, 'sonrisa'));

    const corazon = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    corazon.setAttribute('x', '100');
    corazon.setAttribute('y', '100');
    corazon.setAttribute('font-size', '48');
    corazon.textContent = '❤';
    svg.appendChild(corazon);

    if (this.contenedor) {
      this.contenedor.innerHTML = '';
      this.contenedor.appendChild(svg);
    }
  }

  crearExpresionMelancolia() { this.crearExpresionTriste(); }
  crearExpresionNostalgia() { this.crearExpresionTriste(); }
  crearExpresionDecepcion() { this.crearExpresionTriste(); }
  crearExpresionSensible() { this.crearExpresionTriste(); }
  crearExpresionSolitario() { this.crearExpresionTriste(); }
  crearExpresionDesanimado() { this.crearExpresionTriste(); }
  crearExpresionDesilusionado() { this.crearExpresionTriste(); }
  crearExpresionPensativoTriste() { this.crearExpresionTriste(); }
  crearExpresionCorazonRoto() { this.crearExpresionTriste(); }
  crearExpresionExagerada() { this.crearExpresionDramatica(); }
  crearExpresionTelenovela() { this.crearExpresionDramatica(); }
  crearExpresionReinaDrama() { this.crearExpresionDramatica(); }
  crearExpresionDramaticaProfesional() { this.crearExpresionDramatica(); }
  crearExpresionPerezosa() { this.crearExpresionDormilona(); }
  crearExpresionSonoliento() { this.crearExpresionDormilona(); }
  crearExpresionBostezador() { this.crearExpresionDormilona(); }
  crearExpresionRoncador() { this.crearExpresionDormilona(); }
  crearExpresionGrunon() { this.crearExpresionEnojada(); }
  crearExpresionMalhumorada() { this.crearExpresionEnojada(); }
  crearExpresionIrritada() { this.crearExpresionEnojada(); }
  crearExpresionImpaciente() { this.crearExpresionEnojada(); }
  crearExpresionRebelde() { this.crearExpresionDramatica(); }
  crearExpresionEmoRebelde() { this.crearExpresionDramatica(); }
  crearExpresionPunk() { this.crearExpresionDramatica(); }
  crearExpresionRockero() { this.crearExpresionDramatica(); }
  crearExpresionIndependiente() { this.crearExpresionDramatica(); }
  crearExpresionAdorable() { this.crearExpresionTierna(); }
  crearExpresionCarinosa() { this.crearExpresionTierna(); }
  crearExpresionDulce() { this.crearExpresionTierna(); }
  crearExpresionAmigable() { this.crearExpresionTierna(); }
  crearExpresionBromista() { this.crearExpresionGraciosa(); }
  crearExpresionPayaso() { this.crearExpresionGraciosa(); }
  crearExpresionBufon() { this.crearExpresionGraciosa(); }
  crearExpresionSarcasticaFunny() { this.crearExpresionGraciosa(); }
  crearExpresionLocaDivertida() { this.crearExpresionGraciosa(); }
  crearExpresionCaotica() { this.crearExpresionGraciosa(); }
  crearExpresionHiperactiva() { this.crearExpresionGraciosa(); }
  crearExpresionImpredecible() { this.crearExpresionDramatica(); }
  crearExpresionExcentrica() { this.crearExpresionGraciosa(); }
  crearExpresionSarcastica() { this.crearExpresionDramatica(); }
  crearExpresionIronica() { this.crearExpresionDramatica(); }
  crearExpresionMordaz() { this.crearExpresionDramatica(); }
  crearExpresionConeston() { this.crearExpresionDramatica(); }
  crearExpresionBurlon() { this.crearExpresionDramatica(); }
  crearExpresionAburrida() { this.crearExpresionDormilona(); }
  crearExpresionDesganada() { this.crearExpresionDormilona(); }
  crearExpresionDesinteresada() { this.crearExpresionDormilona(); }
  crearExpresionApatica() { this.crearExpresionDormilona(); }
  crearExpresionMonotona() { this.crearExpresionDormilona(); }
  crearExpresionCuriosa() { this.crearExpresionDramatica(); }
  crearExpresionInvestigador() { this.crearExpresionDramatica(); }
  crearExpresionExplorador() { this.crearExpresionDramatica(); }
  crearExpresionObservador() { this.crearExpresionDramatica(); }
  crearExpresionPreguntona() { this.crearExpresionDramatica(); }
  crearExpresionTraviesa() { this.crearExpresionGraciosa(); }
  crearExpresionPicara() { this.crearExpresionGraciosa(); }
  crearExpresionJugueona() { this.crearExpresionGraciosa(); }
  crearExpresionBromistaDSecreta() { this.crearExpresionGraciosa(); }
  crearExpresionAstuta() { this.crearExpresionGraciosa(); }
  crearExpresionOscura() { this.crearExpresionTriste(); }
  crearExpresionGotica() { this.crearExpresionTriste(); }
  crearExpresionMisteriosa() { this.crearExpresionTriste(); }
  crearExpresionTenebrosa() { this.crearExpresionTriste(); }
  crearExpresionEnigmatica() { this.crearExpresionTriste(); }
  crearExpresionGamer() { this.crearExpresionDramatica(); }
  crearExpresionProGamer() { this.crearExpresionDramatica(); }
  crearExpresionNoob() { this.crearExpresionGraciosa(); }
  crearExpresionTryhard() { this.crearExpresionDramatica(); }
  crearExpresionCompetitiva() { this.crearExpresionDramatica(); }
  crearExpresionMusical() { this.crearExpresionGraciosa(); }
  crearExpresionCantante() { this.crearExpresionGraciosa(); }
  crearExpresionRocker() { this.crearExpresionDramatica(); }
  crearExpresionMetalero() { this.crearExpresionDramatica(); }
  crearExpresionPunkMusical() { this.crearExpresionDramatica(); }
  crearExpresionRobotClasico() { this.crearExpresionDramatica(); }
  crearExpresionRobotFuturista() { this.crearExpresionDramatica(); }
  crearExpresionRobotLogico() { this.crearExpresionDramatica(); }
  crearExpresionRobotCalculador() { this.crearExpresionDramatica(); }
  crearExpresionRobotProgramador() { this.crearExpresionDramatica(); }
  crearExpresionTimida() { this.crearExpresionTriste(); }
  crearExpresionAvergonzada() { this.crearExpresionTriste(); }
  crearExpresionReservada() { this.crearExpresionTriste(); }
  crearExpresionIntrovertida() { this.crearExpresionTriste(); }
  crearExpresionCallada() { this.crearExpresionTriste(); }
  crearExpresionPresumida() { this.crearExpresionDramatica(); }
  crearExpresionArrogante() { this.crearExpresionDramatica(); }
  crearExpresionVanidosa() { this.crearExpresionDramatica(); }
  crearExpresionOrgullosa() { this.crearExpresionDramatica(); }
  crearExpresionElegante() { this.crearExpresionTierna(); }
  crearExpresionEmpatica() { this.crearExpresionTierna(); }
  crearExpresionAtenta() { this.crearExpresionTierna(); }
  crearExpresionProtectora() { this.crearExpresionTierna(); }
  crearExpresionMisteriosEspecial() { this.crearExpresionTriste(); }
  crearExpresionEnigmaticoEspecial() { this.crearExpresionTriste(); }
  crearExpresionSuprema() { this.crearExpresionDramatica(); }

  limpiar() {
    if (this.contenedor) {
      this.contenedor.innerHTML = '';
    }
  }

  parpadear() {
    if (!this.animacionActiva) {
      this.animacionActiva = true;
      const ojos = this.contenedor.querySelector('#ojos');
      if (ojos) {
        setTimeout(() => {
          if (ojos) ojos.style.opacity = '0.2';
          setTimeout(() => {
            if (ojos) ojos.style.opacity = '1';
            this.animacionActiva = false;
          }, 100);
        }, 1500);
      }
    }
  }
}

window.ExpresionDinamica = ExpresionDinamica;
