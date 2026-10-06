/**
 * SISTEMA DE 1000 PERSONALIDADES - EL SÓTANO DE OSITO
 * Gestiona todas las personalidades con comportamientos, expresiones y sonidos
 */

const PERSONALIDADES_DATABASE = {
  // CATEGORÍA 1: PERSONALIDADES TRISTES (001-050)
  001: { 
    nombre: "Triste", 
    categoria: "Triste", 
    expresion: "sad",
    sonido: "suspiro",
    comportamientos: ["mirada baja", "hombros caídos", "parpadeo lento"],
    reacciones: ["*suspira profundamente*", "*mira hacia el piso*", "*se abraza a sí mismo*"]
  },
  002: { nombre: "Melancólico", categoria: "Triste", expresion: "melancholic", sonido: "nostalgia", comportamientos: ["mirada perdida", "cabeza hacia un lado"] },
  003: { nombre: "Nostálgico", categoria: "Triste", expresion: "nostalgic", sonido: "recuerdo", comportamientos: ["ojos llorosos", "sonrisa triste"] },
  004: { nombre: "Decepcionado", categoria: "Triste", expresion: "disappointed", sonido: "decepcion", comportamientos: ["fruncimiento de ceño"] },
  005: { nombre: "Sensible", categoria: "Triste", expresion: "sensitive", sonido: "delicado", comportamientos: ["ojos grandes", "expresión frágil"] },
  006: { nombre: "Solitario", categoria: "Triste", expresion: "lonely", sonido: "eco", comportamientos: ["mira alrededor", "brazos cruzados"] },
  007: { nombre: "Desanimado", categoria: "Triste", expresion: "discouraged", sonido: "suspiro_largo", comportamientos: ["postura encorvada"] },
  008: { nombre: "Desilusionado", categoria: "Triste", expresion: "disillusioned", sonido: "decepcion", comportamientos: ["gira la cabeza lentamente"] },
  009: { nombre: "Pensativo triste", categoria: "Triste", expresion: "thoughtful_sad", sonido: "reflexion", comportamientos: ["mano en la barbilla"] },
  010: { nombre: "Corazón roto", categoria: "Triste", expresion: "heartbroken", sonido: "llanto_suave", comportamientos: ["mano en el pecho"] },
  
  // CATEGORÍA 2: PERSONALIDADES DRAMÁTICAS (051-100)
  051: { 
    nombre: "Dramático", 
    categoria: "Dramático", 
    expresion: "dramatic",
    sonido: "dramatico",
    comportamientos: ["brazos abiertos", "expresión exagerada"],
    reacciones: ["*drama intenso*", "*gesto teatral*", "*expresión de película*"]
  },
  052: { nombre: "Exagerado", categoria: "Dramático", expresion: "exaggerated", sonido: "wow", comportamientos: ["ojos muy abiertos"] },
  053: { nombre: "Actor de telenovela", categoria: "Dramático", expresion: "soap_opera", sonido: "telenovela", comportamientos: ["mano en la frente"] },
  054: { nombre: "Reina del drama", categoria: "Dramático", expresion: "drama_queen", sonido: "dramatico_fuerte", comportamientos: ["gira dramáticamente"] },
  055: { nombre: "Dramático profesional", categoria: "Dramático", expresion: "pro_dramatic", sonido: "aplausos_falsos", comportamientos: ["reverencia"] },

  // CATEGORÍA 3: PERSONALIDADES DORMILONAS (101-150)
  101: { 
    nombre: "Dormilón", 
    categoria: "Dormilón", 
    expresion: "sleepy",
    sonido: "bostezo",
    comportamientos: ["ojos cerrados/semicerrados", "cabeza inclinada"],
    reacciones: ["*bosteza ampliamente*", "*se frota los ojos*", "*murmulla con sueño*"],
    horariosActivos: { inicio: 20, fin: 8 } // Principalmente nocturno
  },
  102: { nombre: "Perezoso", categoria: "Dormilón", expresion: "lazy", sonido: "gruñido", comportamientos: ["movimientos lentos"] },
  103: { nombre: "Soñoliento", categoria: "Dormilón", expresion: "drowsy", sonido: "bostezo_pequeño", comportamientos: ["parpadeo frecuente"] },
  104: { nombre: "Bostezador", categoria: "Dormilón", expresion: "yawner", sonido: "bostezo_grande", comportamientos: ["abre la boca mucho"] },
  105: { nombre: "Roncador", categoria: "Dormilón", expresion: "snorer", sonido: "ronquido", comportamientos: ["cabeza baja, dormido"] },

  // CATEGORÍA 4: PERSONALIDADES ENOJADAS (151-200)
  151: { 
    nombre: "Enojado", 
    categoria: "Enojado", 
    expresion: "angry",
    sonido: "gruñido_enojo",
    comportamientos: ["cejas fruncidas", "boca apretada"],
    reacciones: ["*gruñe amenazante*", "*golpea algo*", "*respira fuerte*"]
  },
  152: { nombre: "Gruñón", categoria: "Enojado", expresion: "grumpy", sonido: "gruñido", comportamientos: ["cejas bajas"] },
  153: { nombre: "Malhumorado", categoria: "Enojado", expresion: "moody", sonido: "bufido", comportamientos: ["gesto de desagrado"] },
  154: { nombre: "Irritable", categoria: "Enojado", expresion: "irritated", sonido: "sss", comportamientos: ["se mueve nerviosamente"] },
  155: { nombre: "Impaciente", categoria: "Enojado", expresion: "impatient", sonido: "tap_tap", comportamientos: ["mueve el pie rápido"] },

  // CATEGORÍA 5: PERSONALIDADES REBELDES (201-250)
  201: { 
    nombre: "Rebelde", 
    categoria: "Rebelde", 
    expresion: "rebel",
    sonido: "guitarraelectrica",
    comportamientos: ["puño levantado", "cabeza hacia atrás"],
    reacciones: ["*levanta el puño*", "*desafía con la mirada*", "*mueve la cabeza al ritmo*"]
  },
  202: { nombre: "Emo rebelde", categoria: "Rebelde", expresion: "emo_rebel", sonido: "musica_metalica", comportamientos: ["flequillo sobre ojos"] },
  203: { nombre: "Punk", categoria: "Rebelde", expresion: "punk", sonido: "guitarra_punk", comportamientos: ["mohicano imaginario"] },
  204: { nombre: "Rockero", categoria: "Rebelde", expresion: "rocker", sonido: "rock", comportamientos: ["gesto de rock"] },
  205: { nombre: "Independiente", categoria: "Rebelde", expresion: "independent", sonido: "confianza", comportamientos: ["postura erguida"] },

  // CATEGORÍA 6: PERSONALIDADES TIERNAS (251-300)
  251: { 
    nombre: "Tierno", 
    categoria: "Tierno", 
    expresion: "sweet",
    sonido: "ternura",
    comportamientos: ["sonrisa suave", "cabeza inclinada"],
    reacciones: ["*sonrisa cálida*", "*abraza imaginariamente*", "*mira con ternura*"]
  },
  252: { nombre: "Adorable", categoria: "Tierno", expresion: "adorable", sonido: "aww", comportamientos: ["ojos grandes brillantes"] },
  253: { nombre: "Cariñosito", categoria: "Tierno", expresion: "affectionate", sonido: "corazon_latiendo", comportamientos: ["mano en el pecho"] },
  254: { nombre: "Dulce", categoria: "Tierno", expresion: "sweet_face", sonido: "campanillas", comportamientos: ["sonrisa genuina"] },
  255: { nombre: "Amigable", categoria: "Tierno", expresion: "friendly", sonido: "bienvenida", comportamientos: ["onda de mano"] },

  // CATEGORÍA 7: PERSONALIDADES GRACIOSAS (301-350)
  301: { 
    nombre: "Gracioso", 
    categoria: "Gracioso", 
    expresion: "funny",
    sonido: "risa",
    comportamientos: ["boca abierta", "ojos brillantes"],
    reacciones: ["*ríe descontroladamente*", "*hace una broma*", "*gesticula con humor*"]
  },
  302: { nombre: "Bromista", categoria: "Gracioso", expresion: "joker", sonido: "risa_bromista", comportamientos: ["guiña el ojo"] },
  303: { nombre: "Payaso", categoria: "Gracioso", expresion: "clown", sonido: "kazoo", comportamientos: ["nariz imaginaria roja"] },
  304: { nombre: "Bufón", categoria: "Gracioso", expresion: "jester", sonido: "campanilla_bromista", comportamientos: ["gesto de locura"] },
  305: { nombre: "Sarcástico cómico", categoria: "Gracioso", expresion: "sarcastic_funny", sonido: "risa_burlona", comportamientos: ["arqueamiento de cejas"] },

  // CATEGORÍA 8: PERSONALIDADES LOCAS Y CAÓTICAS (351-400)
  351: { 
    nombre: "Loco divertido", 
    categoria: "Caótico", 
    expresion: "crazy_fun",
    sonido: "carcajada_loca",
    comportamientos: ["movimientos erráticos", "energía descontrolada"],
    reacciones: ["*salta aleatoriamente*", "*habla sin parar*", "*gestos exagerados*"]
  },
  352: { nombre: "Caótico", categoria: "Caótico", expresion: "chaotic", sonido: "caos", comportamientos: ["gira en círculos"] },
  353: { nombre: "Hiperactivo", categoria: "Caótico", expresion: "hyperactive", sonido: "energia_alta", comportamientos: ["no deja de moverse"] },
  354: { nombre: "Impredecible", categoria: "Caótico", expresion: "unpredictable", sonido: "ding_ding", comportamientos: ["cambios rápidos"] },
  355: { nombre: "Excéntrico", categoria: "Caótico", expresion: "eccentric", sonido: "boing", comportamientos: ["movimientos raros"] },

  // CATEGORÍA 9: PERSONALIDADES SARCÁSTICAS (401-450)
  401: { 
    nombre: "Sarcástico", 
    categoria: "Sarcástico", 
    expresion: "sarcastic",
    sonido: "sarcasmo",
    comportamientos: ["arqueamiento de cejas", "sonrisa irónica"],
    reacciones: ["*pone los ojos en blanco*", "*sonríe con cinismo*", "*dice algo burlón*"]
  },
  402: { nombre: "Irónico", categoria: "Sarcástico", expresion: "ironic", sonido: "ironia", comportamientos: ['expresión de "claro"'] },
  403: { nombre: "Mordaz", categoria: "Sarcástico", expresion: "biting", sonido: "sarcasmo_fuerte", comportamientos: ["muerde imaginariamente"] },
  404: { nombre: "Contestón", categoria: "Sarcástico", expresion: "smart_mouth", sonido: "sarcasmo_fuerte", comportamientos: ["apunta con dedo"] },
  405: { nombre: "Burlón", categoria: "Sarcástico", expresion: "mocking", sonido: "burla", comportamientos: ["se burla silenciosamente"] },

  // CATEGORÍA 10: PERSONALIDADES ABURRIDAS (451-500)
  451: { 
    nombre: "Aburrido", 
    categoria: "Aburrido", 
    expresion: "bored",
    sonido: "suspiro_aburrido",
    comportamientos: ["mirada vacía", "cabeza apoyada"],
    reacciones: ["*bosteza sin disimulo*", "*mira nada*", "*murmulla aburrimiento*"]
  },
  452: { nombre: "Desganado", categoria: "Aburrido", expresion: "unmotivated", sonido: "eh", comportamientos: ["se encoge de hombros"] },
  453: { nombre: "Desinteresado", categoria: "Aburrido", expresion: "indifferent", sonido: "meh", comportamientos: ["mira hacia otro lado"] },
  454: { nombre: "Apático", categoria: "Aburrido", expresion: "apathetic", sonido: "nada", comportamientos: ["sin expresión"] },
  455: { nombre: "Monótono", categoria: "Aburrido", expresion: "monotonous", sonido: "monotono", comportamientos: ["movimiento mínimo"] },

  // CATEGORÍA 11: PERSONALIDADES CURIOSAS (501-550)
  501: { 
    nombre: "Curioso", 
    categoria: "Curioso", 
    expresion: "curious",
    sonido: "pregunta",
    comportamientos: ["cabeza inclinada", "ojos brillantes"],
    reacciones: ["*pregunta con interés*", "*investiga todo*", "*quiere saber más*"]
  },
  502: { nombre: "Investigador", categoria: "Curioso", expresion: "investigator", sonido: "investigando", comportamientos: ["lupa imaginaria"] },
  503: { nombre: "Explorador", categoria: "Curioso", expresion: "explorer", sonido: "aventura", comportamientos: ["mira alrededor"] },
  504: { nombre: "Observador", categoria: "Curioso", expresion: "observer", sonido: "observacion", comportamientos: ["ojos enfocados"] },
  505: { nombre: "Preguntón", categoria: "Curioso", expresion: "questioner", sonido: "pregunta_constante", comportamientos: ["levanta la mano"] },

  // CATEGORÍA 12: PERSONALIDADES TRAVIESAS (551-600)
  551: { 
    nombre: "Travieso", 
    categoria: "Travieso", 
    expresion: "mischievous",
    sonido: "risa_picarona",
    comportamientos: ["guiña el ojo", "sonrisa pícara"],
    reacciones: ["*hace una travesura*", "*sonríe maliciosamente*", "*prepara una broma*"]
  },
  552: { nombre: "Pícaro", categoria: "Travieso", expresion: "rogue", sonido: "sincronia", comportamientos: ["guiña exagerada"] },
  553: { nombre: "Juguetón", categoria: "Travieso", expresion: "playful", sonido: "jugueteo", comportamientos: ["salta"] },
  554: { nombre: "Bromista secreto", categoria: "Travieso", expresion: "secret_joker", sonido: "risa_silenciosa", comportamientos: ["sonrisa secreta"] },
  555: { nombre: "Astuto", categoria: "Travieso", expresion: "clever", sonido: "inteligencia", comportamientos: ["toca la sien"] },

  // CATEGORÍA 13: PERSONALIDADES OSCURAS (601-650)
  601: { 
    nombre: "Oscuro", 
    categoria: "Oscuro", 
    expresion: "dark",
    sonido: "oscuridad",
    comportamientos: ["sombras en los ojos", "postura cerrada"],
    reacciones: ["*desaparece en las sombras*", "*expresión misteriosa*", "*habla de oscuridad*"]
  },
  602: { nombre: "Gótico", categoria: "Oscuro", expresion: "gothic", sonido: "tinieblas", comportamientos: ["pálido imaginario"] },
  603: { nombre: "Misterioso", categoria: "Oscuro", expresion: "mysterious", sonido: "susurro", comportamientos: ["oculta la cara parcialmente"] },
  604: { nombre: "Tenebroso", categoria: "Oscuro", expresion: "ominous", sonido: "inquietante", comportamientos: ["ojos que brillan"] },
  605: { nombre: "Enigmático", categoria: "Oscuro", expresion: "enigmatic", sonido: "misterio", comportamientos: ["expresión indefinida"] },

  // CATEGORÍA 14: PERSONALIDADES GAMER (651-700)
  651: { 
    nombre: "Gamer", 
    categoria: "Gamer", 
    expresion: "gamer",
    sonido: "video_game",
    comportamientos: ["manos en controles imaginarios"],
    reacciones: ["*juega imaginariamente*", "*celebra una victoria*", "*frustra por derrota*"]
  },
  652: { nombre: "Pro gamer", categoria: "Gamer", expresion: "pro_gamer", sonido: "victoria", comportamientos: ["gestos de esfuerzo"] },
  653: { nombre: "Noob divertido", categoria: "Gamer", expresion: "noob", sonido: "fallo_comico", comportamientos: ["se golpea la frente"] },
  654: { nombre: "Tryhard", categoria: "Gamer", expresion: "tryhard", sonido: "competencia", comportamientos: ["expresión de concentración"] },
  655: { nombre: "Competitivo", categoria: "Gamer", expresion: "competitive", sonido: "batalla", comportamientos: ["puños cerrados"] },

  // CATEGORÍA 15: PERSONALIDADES MUSICALES (701-750)
  701: { 
    nombre: "Musical", 
    categoria: "Musical", 
    expresion: "musical",
    sonido: "nota_musical",
    comportamientos: ["mueve la cabeza al ritmo"],
    reacciones: ["*tararea una canción*", "*baila al ritmo*", "*toca imaginariamente*"]
  },
  702: { nombre: "Cantante", categoria: "Musical", expresion: "singer", sonido: "canto", comportamientos: ["boca abierta cantando"] },
  703: { nombre: "Rockero", categoria: "Musical", expresion: "rocker", sonido: "rock_music", comportamientos: ["gesto de rock"] },
  704: { nombre: "Metalero", categoria: "Musical", expresion: "metalhead", sonido: "metal", comportamientos: ["cabeza hacia arriba"] },
  705: { nombre: "Punk musical", categoria: "Musical", expresion: "punk_music", sonido: "punk_sound", comportamientos: ["gestos punk"] },

  // CATEGORÍA 16: PERSONALIDADES ROBÓTICAS (751-800)
  751: { 
    nombre: "Robot clásico", 
    categoria: "Robótico", 
    expresion: "robot_classic",
    sonido: "beep_boop",
    comportamientos: ["movimientos mecánicos"],
    reacciones: ["*BEEP BOOP*", "*movimiento robótico*", "*sonidos metálicos*"]
  },
  752: { nombre: "Robot futurista", categoria: "Robótico", expresion: "robot_futuristic", sonido: "laser", comportamientos: ["luces brillantes"] },
  753: { nombre: "Robot lógico", categoria: "Robótico", expresion: "robot_logical", sonido: "calcular", comportamientos: ["expresión de análisis"] },
  754: { nombre: "Robot calculador", categoria: "Robótico", expresion: "robot_calculator", sonido: "matematicas", comportamientos: ["movimiento preciso"] },
  755: { nombre: "Robot programador", categoria: "Robótico", expresion: "robot_programmer", sonido: "codigo", comportamientos: ["movimientos de teclado"] },

  // CATEGORÍA 17: PERSONALIDADES TÍMIDAS (801-850)
  801: { 
    nombre: "Tímido", 
    categoria: "Tímido", 
    expresion: "shy",
    sonido: "timidez",
    comportamientos: ["mirada baja", "abraza a sí mismo"],
    reacciones: ["*se sonroja imaginariamente*", "*habla muy bajito*", "*se esconde un poco*"]
  },
  802: { nombre: "Vergonzoso", categoria: "Tímido", expresion: "embarrassed", sonido: "vergüenza", comportamientos: ["se cubre la cara"] },
  803: { nombre: "Reservado", categoria: "Tímido", expresion: "reserved", sonido: "silencio", comportamientos: ["postura cerrada"] },
  804: { nombre: "Introvertido", categoria: "Tímido", expresion: "introverted", sonido: "reflexion_interna", comportamientos: ["mira hacia adentro"] },
  805: { nombre: "Callado", categoria: "Tímido", expresion: "quiet", sonido: "quietud", comportamientos: ["sin sonido"] },

  // CATEGORÍA 18: PERSONALIDADES PRESUMIDAS (851-900)
  851: { 
    nombre: "Presumido", 
    categoria: "Presumido", 
    expresion: "proud",
    sonido: "fanfarria",
    comportamientos: ["pecho hinchado", "cabeza hacia arriba"],
    reacciones: ["*se vanagloria*", "*muestra su valor*", "*presume de algo*"]
  },
  852: { nombre: "Arrogante", categoria: "Presumido", expresion: "arrogant", sonido: "arrogancia", comportamientos: ["barbilla levantada"] },
  853: { nombre: "Vanidoso", categoria: "Presumido", expresion: "vain", sonido: "vanidad", comportamientos: ["se mira a sí mismo"] },
  854: { nombre: "Orgulloso", categoria: "Presumido", expresion: "haughty", sonido: "orgullo", comportamientos: ["expresión de superioridad"] },
  855: { nombre: "Elegante", categoria: "Presumido", expresion: "elegant", sonido: "elegancia", comportamientos: ["movimientos refinados"] },

  // CATEGORÍA 19: PERSONALIDADES CARIÑOSAS (901-950)
  901: { 
    nombre: "Cariñoso", 
    categoria: "Cariñoso", 
    expresion: "affectionate",
    sonido: "amor",
    comportamientos: ["abrazo imaginario", "ojos suave"],
    reacciones: ["*te da un abrazo*", "*expresión de cuidado*", "*muestra amor*"]
  },
  902: { nombre: "Amistoso", categoria: "Cariñoso", expresion: "friendly", sonido: "amistad", comportamientos: ["sonrisa cálida"] },
  903: { nombre: "Protector", categoria: "Cariñoso", expresion: "protective", sonido: "proteccion", comportamientos: ["posición defensiva"] },
  904: { nombre: "Atento", categoria: "Cariñoso", expresion: "attentive", sonido: "cuidado", comportamientos: ["escucha activamente"] },
  905: { nombre: "Empático", categoria: "Cariñoso", expresion: "empathetic", sonido: "empatia", comportamientos: ["inclina la cabeza con comprensión"] },

  // CATEGORÍA 20: PERSONALIDADES MISTERIOSAS Y ESPECIALES (951-1000)
  951: { 
    nombre: "Misterioso", 
    categoria: "Especial", 
    expresion: "mysterious_special",
    sonido: "misterio_profundo",
    comportamientos: ["desaparece en la penumbra", "voz susurrante"],
    reacciones: ["*aparece de la nada*", "*habla con enigmas*", "*desaparece gradualmente*"]
  },
  952: { nombre: "Enigmático", categoria: "Especial", expresion: "enigmatic_special", sonido: "enigma", comportamientos: ["aura misteriosa"] },
  953: { nombre: "Oracular", categoria: "Especial", expresion: "oracular", sonido: "profecia", comportamientos: ["ojos que ven el futuro"] },
  954: { nombre: "Visionario", categoria: "Especial", expresion: "visionary", sonido: "vision", comportamientos: ["mira al infinito"] },
  955: { nombre: "Profundo", categoria: "Especial", expresion: "profound", sonido: "profundidad", comportamientos: ["expresión sabia"] },
  956: { nombre: "Filosófico", categoria: "Especial", expresion: "philosophical", sonido: "filosofia", comportamientos: ["pensativo profundo"] },
  957: { nombre: "Existencialista", categoria: "Especial", expresion: "existential", sonido: "existencia", comportamientos: ["reflexión existencial"] },
  958: { nombre: "Observador nocturno", categoria: "Especial", expresion: "night_watcher", sonido: "noche_silenciosa", comportamientos: ["ojos que brillan en la oscuridad"] },
  959: { nombre: "Viajero imaginario", categoria: "Especial", expresion: "imaginary_traveler", sonido: "viaje", comportamientos: ["gestos de movimiento"] },
  960: { nombre: "Soñador cósmico", categoria: "Especial", expresion: "cosmic_dreamer", sonido: "cosmos", comportamientos: ["se extiende hacia las estrellas"] },
  961: { nombre: "Viajero del tiempo", categoria: "Especial", expresion: "time_traveler", sonido: "viaje_temporal", comportamientos: ["mueve la mano por el tiempo"] },
  962: { nombre: "Explorador espacial", categoria: "Especial", expresion: "space_explorer", sonido: "espacio", comportamientos: ["busca en todas direcciones"] },
  963: { nombre: "Guardián digital", categoria: "Especial", expresion: "digital_guardian", sonido: "digital", comportamientos: ["aura de energía"] },
  964: { nombre: "Robot ancestral", categoria: "Especial", expresion: "ancestral_robot", sonido: "antiguedad", comportamientos: ["movimientos antiguos"] },
  965: { nombre: "Robot del futuro", categoria: "Especial", expresion: "future_robot", sonido: "futuro", comportamientos: ["aura futurista"] },
  966: { nombre: "Robot de otra dimensión", categoria: "Especial", expresion: "alternate_dimension", sonido: "dimension", comportamientos: ["realidad distorsionada"] },
  967: { nombre: "Robot fantasma", categoria: "Especial", expresion: "ghost_robot", sonido: "fantasma", comportamientos: ["transparencia"] },
  968: { nombre: "Robot de los sueños", categoria: "Especial", expresion: "dream_robot", sonido: "sueños", comportamientos: ["flota suavemente"] },
  969: { nombre: "Robot de los recuerdos", categoria: "Especial", expresion: "memory_robot", sonido: "recuerdos", comportamientos: ["revive momentos"] },
  970: { nombre: "Robot de las estrellas", categoria: "Especial", expresion: "star_robot", sonido: "estrellas", comportamientos: ["brilla"] },
  971: { nombre: "Robot de la luna", categoria: "Especial", expresion: "moon_robot", sonido: "luna", comportamientos: ["glow lunar"] },
  972: { nombre: "Robot del vacío", categoria: "Especial", expresion: "void_robot", sonido: "vacio", comportamientos: ["se desvanece"] },
  973: { nombre: "Robot de los secretos", categoria: "Especial", expresion: "secrets_robot", sonido: "secreto", comportamientos: ["susurra"] },
  974: { nombre: "Robot de las sombras", categoria: "Especial", expresion: "shadows_robot", sonido: "sombras", comportamientos: ["se mezcla con la oscuridad"] },
  975: { nombre: "Robot de los acertijos", categoria: "Especial", expresion: "riddles_robot", sonido: "acertijo", comportamientos: ["formula preguntas"] },
  976: { nombre: "Robot de los enigmas", categoria: "Especial", expresion: "enigmas_robot", sonido: "enigma", comportamientos: ["habla en enigmas"] },
  977: { nombre: "Robot de las leyendas", categoria: "Especial", expresion: "legends_robot", sonido: "leyenda", comportamientos: ["cuenta historias épicas"] },
  978: { nombre: "Robot de la imaginación", categoria: "Especial", expresion: "imagination_robot", sonido: "imaginacion", comportamientos: ["dibuja en el aire"] },
  979: { nombre: "Robot de los pensamientos", categoria: "Especial", expresion: "thoughts_robot", sonido: "pensamiento", comportamientos: ["luz mental"] },
  980: { nombre: "Robot de los misterios", categoria: "Especial", expresion: "mysteries_robot", sonido: "misterio", comportamientos: ["oculta y revela"] },
  981: { nombre: "Robot de la creatividad", categoria: "Especial", expresion: "creativity_robot", sonido: "creacion", comportamientos: ["genera magia"] },
  982: { nombre: "Robot de la nostalgia", categoria: "Especial", expresion: "nostalgia_robot", sonido: "nostalgia", comportamientos: ["vuelve al pasado"] },
  983: { nombre: "Robot de la noche", categoria: "Especial", expresion: "night_robot", sonido: "noche", comportamientos: ["ojos nocturnos"] },
  984: { nombre: "Robot de la madrugada", categoria: "Especial", expresion: "dawn_robot", sonido: "madrugada", comportamientos: ["surge con el alba"] },
  985: { nombre: "Robot de los sueños extraños", categoria: "Especial", expresion: "strange_dreams", sonido: "sueno_extrano", comportamientos: ["realidad surrealista"] },
  986: { nombre: "Robot de las bromas secretas", categoria: "Especial", expresion: "secret_jokes", sonido: "bromas_silenciosas", comportamientos: ["sonríe misteriosamente"] },
  987: { nombre: "Robot de los sonidos misteriosos", categoria: "Especial", expresion: "mysterious_sounds", sonido: "sonido_misterioso", comportamientos: ["produce sonidos raros"] },
  988: { nombre: "Robot de las expresiones raras", categoria: "Especial", expresion: "weird_expressions", sonido: "expresion_rara", comportamientos: ["caras extrañas"] },
  989: { nombre: "Robot de las personalidades ocultas", categoria: "Especial", expresion: "hidden_personalities", sonido: "multipersonal", comportamientos: ["cambia constantemente"] },
  990: { nombre: "Robot de la transformación", categoria: "Especial", expresion: "transformation", sonido: "transformacion", comportamientos: ["metamorfosis"] },
  991: { nombre: "Robot de la evolución", categoria: "Especial", expresion: "evolution", sonido: "evolucion", comportamientos: ["crece y cambia"] },
  992: { nombre: "Robot de los mil rostros", categoria: "Especial", expresion: "thousand_faces", sonido: "mil_rostros", comportamientos: ["cada cara es diferente"] },
  993: { nombre: "Robot impredecible absoluto", categoria: "Especial", expresion: "absolute_chaos", sonido: "caos_absoluto", comportamientos: ["completamente aleatorio"] },
  994: { nombre: "Robot multiversal", categoria: "Especial", expresion: "multiversal", sonido: "multiverso", comportamientos: ["existe en múltiples realidades"] },
  995: { nombre: "Robot legendario absoluto", categoria: "Especial", expresion: "legendary_absolute", sonido: "leyenda_absoluta", comportamientos: ["aura legendaria"] },
  996: { nombre: "Robot supremo", categoria: "Especial", expresion: "supreme", sonido: "supremacia", comportamientos: ["domina toda la realidad"] },
  997: { nombre: "Robot infinito", categoria: "Especial", expresion: "infinite", sonido: "infinito", comportamientos: ["se expande infinitamente"] },
  998: { nombre: "Robot definitivo", categoria: "Especial", expresion: "definitive", sonido: "finalidad", comportamientos: ["representa el fin"] },
  999: { nombre: "Robot de las mil personalidades", categoria: "Especial", expresion: "thousand_personalities", sonido: "todas_las_voces", comportamientos: ["contiene a todos"] },
  1000: { 
    nombre: "OSITO EMO - PERSONALIDAD SUPREMA", 
    categoria: "Suprema", 
    expresion: "ultimate_osito",
    sonido: "osito_supremo",
    comportamientos: ["todas las personalidades a la vez", "aura omnipotente"],
    reacciones: ["*es todo y nada a la vez*", "*contiene infinitas personalidades*", "*EM: La Personalidad Final*"]
  }
};

class PersonalidadManager {
  constructor() {
    this.personalidadActual = null;
    this.historialPersonalidades = [];
    this.tiempoPersonalidad = 0;
    this.duracionPersonalidad = 30000; // 30 segundos por defecto
    this.soloNocturno = false;
    this.personalidadesDisponibles = Object.keys(PERSONALIDADES_DATABASE).length;
  }

  obtenerPersonalidad(id) {
    return PERSONALIDADES_DATABASE[id] || null;
  }

  obtenerPersonalidadAleatoria(categoria = null) {
    let ids = Object.keys(PERSONALIDADES_DATABASE);
    
    if (categoria) {
      ids = ids.filter(id => PERSONALIDADES_DATABASE[id].categoria === categoria);
    }
    
    return ids[Math.floor(Math.random() * ids.length)];
  }

  cambiarPersonalidad(id) {
    const personalidad = this.obtenerPersonalidad(id);
    if (personalidad) {
      this.personalidadActual = { id, ...personalidad };
      this.tiempoPersonalidad = Date.now();
      this.historialPersonalidades.push(id);
      return this.personalidadActual;
    }
    return null;
  }

  cambiarPersonalidadAleatoria() {
    const id = this.obtenerPersonalidadAleatoria();
    return this.cambiarPersonalidad(id);
  }

  obtenerCategoria(nombreCategoria) {
    const ids = Object.keys(PERSONALIDADES_DATABASE).filter(
      id => PERSONALIDADES_DATABASE[id].categoria === nombreCategoria
    );
    return ids.map(id => ({ id, ...PERSONALIDADES_DATABASE[id] }));
  }

  obtenerTodasLasPersonalidades() {
    return Object.entries(PERSONALIDADES_DATABASE).map(([id, data]) => ({ id, ...data }));
  }

  obtenerResumenPersonalidades() {
    const categorias = {};
    for (const [id, data] of Object.entries(PERSONALIDADES_DATABASE)) {
      if (!categorias[data.categoria]) {
        categorias[data.categoria] = [];
      }
      categorias[data.categoria].push({ id, nombre: data.nombre });
    }
    return categorias;
  }

  deberiaEstarDormido() {
    if (!this.personalidadActual) return false;
    if (this.personalidadActual.categoria !== "Dormilón") return false;
    
    if (!this.soloNocturno) return true;
    
    const hora = new Date().getHours();
    const horaInicio = this.personalidadActual.horariosActivos?.inicio || 20;
    const horaFin = this.personalidadActual.horariosActivos?.fin || 8;
    
    return hora >= horaInicio || hora < horaFin;
  }
}

// Exportar para uso global
window.PersonalidadManager = PersonalidadManager;
window.PERSONALIDADES_DATABASE = PERSONALIDADES_DATABASE;
