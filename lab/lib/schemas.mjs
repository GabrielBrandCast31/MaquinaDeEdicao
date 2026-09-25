// JSON Schemas handed to Claude (structured output). Keep in sync with src/lab/types.ts.

export const FONTS = ['Montserrat', 'Poppins', 'Inter', 'Anton', 'BebasNeue', 'Oswald', 'Sora', 'ArchivoBlack', 'Bangers', 'Roboto', 'LeagueSpartan', 'Outfit', 'DMSans', 'PlayfairDisplay'];
export const SFX = ['whoosh', 'whip', 'switch', 'mouse-click', 'ding', 'page-turn', 'shutter-modern', 'click', 'pop', 'confirm', 'glitch', 'tick', 'ui-open', 'drop', 'glass', 'error', 'bass', 'shimmer', 'data', 'hit', 'rise-short', 'riser', 'sub', 'notif'];
export const ASPECTS = {'9:16': [1080, 1920], '16:9': [1920, 1080], '1:1': [1080, 1080], '4:5': [1080, 1350]};

// Numeric ranges and color formats live in the description (structured output ignores min/max/pattern);
// sanitizeStyle() clamps everything afterwards.
const num = (description, minimum, maximum) => ({type: 'number', description: minimum === undefined ? description : `${description} [${minimum}..${maximum}]`});
const str = (description) => ({type: 'string', description});
const bool = (description) => ({type: 'boolean', description});
const oneOf = (values, description) => ({type: 'string', enum: values, description});
const obj = (properties) => ({type: 'object', additionalProperties: false, required: Object.keys(properties), properties});
const color = (description) => ({type: 'string', description: `${description} (hex #RRGGBB)`});
const sfxOrNull = (description) => ({anyOf: [{type: 'string', enum: SFX}, {type: 'null'}], description});

export const STYLE_SCHEMA = obj({
  name: str('Nome curto do estilo, ex: "Reels dinâmico amarelo"'),
  summary: str('2-4 frases em pt-BR descrevendo a linguagem de edição da referência'),
  format: obj({aspect: oneOf(Object.keys(ASPECTS), 'Proporção do vídeo final'), fps: num('Quadros por segundo de saída (use 30)', 24, 60)}),
  pacing: obj({
    removeSilences: bool('Se a referência corta pausas/respiros (jump cuts)'),
    maxPauseSec: num('Pausas maiores que isso são cortadas (s). Edição frenética ~0.15-0.3, calma ~0.6-1.0', 0.1, 3),
    padBeforeSec: num('Folga antes de cada fala (s), 0.03-0.2', 0, 1),
    padAfterSec: num('Folga depois de cada fala (s), 0.05-0.3', 0, 1),
  }),
  camera: obj({
    baseZoom: num('Zoom base sobre o enquadramento (1 = sem zoom)', 1, 2),
    zoomOnCut: oneOf(['none', 'alternate', 'random'], 'Muda o zoom a cada corte (alternate = alterna 1x / cutZoomScale)'),
    cutZoomScale: num('Zoom do plano "fechado" usado nos cortes, ex 1.15', 1, 2),
    punchScale: num('Multiplicador do punch-in de ênfase, ex 1.2', 1, 2),
    punchStyle: oneOf(['cut', 'smooth'], 'Punch seco (cut) ou animado (smooth)'),
    punchHoldSec: num('Quanto tempo o punch fica (s)', 0.2, 5),
    slowPushIn: num('Zoom lento contínuo por 10s de plano (0 = nenhum, 0.05 = sutil)', 0, 0.3),
    shakeOnPunch: bool('Tremida curta ao entrar o punch'),
  }),
  captions: obj({
    enabled: bool('Se a referência tem legendas queimadas'),
    mode: oneOf(['word-by-word', 'phrase', 'karaoke'], 'word-by-word = 1 palavra por vez; phrase = bloco de palavras; karaoke = palavras surgem conforme faladas'),
    wordsPerCaption: num('Palavras por bloco de legenda', 1, 12),
    yPct: num('Centro vertical da legenda em % da altura (50 = meio, 75 = terço inferior)', 5, 95),
    font: oneOf(FONTS, 'Fonte mais parecida com a da referência'),
    weight: num('Peso da fonte (400-900)', 100, 900),
    sizePct: num('Tamanho da fonte em % do lado menor do vídeo (típico 5-9)', 2, 16),
    uppercase: bool('Texto em caixa alta'),
    color: color('Cor principal do texto'),
    highlightColor: color('Cor de destaque (palavra ativa ou palavra-chave)'),
    highlight: oneOf(['active-word', 'keywords', 'none'], 'O que recebe a cor de destaque'),
    activeWordBox: bool('Caixa colorida atrás da palavra destacada (estilo TikTok)'),
    strokeColor: color('Cor do contorno'),
    strokeWidth: num('Espessura do contorno (0 = sem, 2-8 comum)', 0, 20),
    shadow: bool('Sombra projetada'),
    box: obj({enabled: bool('Caixa de fundo atrás do bloco inteiro'), color: color('Cor da caixa'), opacity: num('Opacidade 0-1', 0, 1), radius: num('Raio da borda em px', 0, 80)}),
    animation: oneOf(['pop', 'slide-up', 'fade', 'bounce', 'none'], 'Animação de entrada de cada bloco'),
  }),
  callouts: obj({
    enabled: bool('Se a referência usa textos grandes/títulos de destaque além da legenda'),
    style: oneOf(['bold-center', 'lower-third', 'sticker'], 'Formato do destaque'),
    font: oneOf(FONTS, 'Fonte do destaque'),
    color: color('Cor do texto do destaque'),
    accentColor: color('Cor de apoio (fundo/brilho)'),
    frequency: oneOf(['low', 'medium', 'high'], 'Com que frequência aparecem'),
  }),
  transitions: obj({type: oneOf(['none', 'flash', 'whip', 'zoom-blur', 'glitch'], 'Transição usada nos cortes'), every: num('Aplicar a cada N cortes (0 = nunca, 1 = todos)', 0, 50)}),
  grade: obj({
    contrast: num('Contraste (1 = neutro)', 0.5, 1.6),
    saturation: num('Saturação (1 = neutro)', 0, 2),
    brightness: num('Brilho (1 = neutro)', 0.5, 1.5),
    warmth: num('Temperatura: -1 frio, 0 neutro, 1 quente', -1, 1),
    vignette: num('Vinheta 0-1', 0, 1),
    grain: num('Granulação 0-1', 0, 1),
  }),
  progressBar: obj({enabled: bool('Barra de progresso'), color: color('Cor da barra'), position: oneOf(['top', 'bottom'], 'Posição')}),
  audio: obj({
    music: obj({enabled: bool('Tem trilha de fundo'), volume: num('Volume da trilha 0-1 (típico 0.08-0.2)', 0, 1), duckUnderVoice: bool('Abaixa a trilha quando há fala')}),
    sfx: obj({
      onCut: sfxOrNull('Efeito sonoro nos cortes com transição, ou null'),
      onPunch: sfxOrNull('Efeito sonoro no punch-in, ou null'),
      onCallout: sfxOrNull('Efeito sonoro quando entra um destaque, ou null'),
      volume: num('Volume dos efeitos 0-1', 0, 1),
    }),
  }),
  notes: {type: 'array', items: {type: 'string'}, description: 'Observações em pt-BR sobre elementos da referência que o template NÃO reproduz (b-roll, gráficos específicos, memes, etc.) e dicas de gravação'},
});

export const PLAN_SCHEMA = obj({
  subject: obj({fx: num('Centro horizontal do rosto/assunto no quadro bruto (0-1)', 0, 1), fy: num('Centro vertical do rosto no quadro bruto (0-1), normalmente 0.3-0.45', 0, 1)}),
  dropWords: {
    type: 'array',
    description: 'Trechos a remover: erros, gaguejos, frases repetidas (mantenha a última tentativa boa), vícios de linguagem, conversa fora do roteiro',
    items: obj({from: {type: 'integer', description: 'Índice da primeira palavra removida'}, to: {type: 'integer', description: 'Índice da última palavra removida (inclusivo)'}, reason: str('Motivo curto')}),
  },
  emphasis: {
    type: 'array',
    description: 'Palavras de ênfase. punch = zoom de ênfase naquela palavra; highlight = palavra-chave colorida na legenda',
    items: obj({w: {type: 'integer', description: 'Índice da palavra'}, kind: oneOf(['punch', 'highlight', 'both'], 'Tipo')}),
  },
  callouts: {
    type: 'array',
    description: 'Textos de destaque na tela (só se o estilo usa). Frases curtas, máx 5 palavras',
    items: obj({w: {type: 'integer', description: 'Índice da palavra onde entra'}, text: str('Texto curto'), durationSec: num('Duração (s)', 0.6, 5)}),
  },
  sfx: {
    type: 'array',
    description: 'Efeitos sonoros extras pontuais (além dos automáticos do estilo)',
    items: obj({w: {type: 'integer', description: 'Índice da palavra'}, name: oneOf(SFX, 'Efeito')}),
  },
  notes: str('Resumo em pt-BR das decisões de edição (o que cortou e por quê, ritmo, onde enfatizou)'),
});

export const REFINE_SCHEMA = obj({style: STYLE_SCHEMA, plan: PLAN_SCHEMA, reply: str('Resposta curta em pt-BR explicando o que mudou')});

export const DEFAULT_STYLE = {
  name: 'Padrão Reels',
  summary: 'Estilo base: jump cuts sem pausas, legenda palavra a palavra com destaque, punch-ins de ênfase.',
  format: {aspect: '9:16', fps: 30},
  pacing: {removeSilences: true, maxPauseSec: 0.35, padBeforeSec: 0.08, padAfterSec: 0.12},
  camera: {baseZoom: 1, zoomOnCut: 'alternate', cutZoomScale: 1.12, punchScale: 1.2, punchStyle: 'cut', punchHoldSec: 1.2, slowPushIn: 0.03, shakeOnPunch: false},
  captions: {enabled: true, mode: 'phrase', wordsPerCaption: 3, yPct: 70, font: 'Montserrat', weight: 900, sizePct: 7.5, uppercase: true, color: '#FFFFFF', highlightColor: '#FFD400', highlight: 'active-word', activeWordBox: false, strokeColor: '#000000', strokeWidth: 6, shadow: true, box: {enabled: false, color: '#000000', opacity: 0.6, radius: 16}, animation: 'pop'},
  callouts: {enabled: false, style: 'bold-center', font: 'Anton', color: '#FFFFFF', accentColor: '#FFD400', frequency: 'low'},
  transitions: {type: 'none', every: 0},
  grade: {contrast: 1.05, saturation: 1.05, brightness: 1, warmth: 0, vignette: 0.15, grain: 0},
  progressBar: {enabled: false, color: '#FFD400', position: 'top'},
  audio: {music: {enabled: false, volume: 0.12, duckUnderVoice: true}, sfx: {onCut: null, onPunch: null, onCallout: 'pop', volume: 0.5}},
  notes: [],
};
