# Guia para escrever cenas de motion do Lab

Você escreve arquivos `.tsx` numa pasta de projeto (`src/lab/motion/<projeto>/`). Cada arquivo exporta:

```tsx
import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {pop, Sfx, Text, useExit, wordFrame, type MotionScene, type SceneProps} from '../../motionKit';

const Numero: React.FC<SceneProps> = ({durationInFrames, height, fps, words, style}) => {
  const f = useCurrentFrame();
  const at = wordFrame(words, 'milhões', 6);      // sincroniza com a fala
  const s = pop(f, fps, at);                        // mola 0→1
  const out = useExit(durationInFrames);            // fade-out no fim
  return (
    <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center', opacity: out}}>
      <Text font="Anton" size={height * 0.12} color={style.captions.highlightColor} style={{scale: String(s)}}>3 MILHÕES</Text>
      <Sfx at={at} name="pop" />
    </AbsoluteFill>
  );
};

export const scenes: MotionScene[] = [
  {id: 'numero-milhoes', startWord: 42, endWord: 49, layer: 'over', Component: Numero},
];
```

## Regras (o código é checado com TypeScript estrito)

- Importe **somente** de `react`, `remotion` e `../../motionKit`. Nada de outros pacotes, imagens ou arquivos externos.
- Tudo é animado por `useCurrentFrame()` (frames locais, 0 = início da cena). **Proibido**: CSS transitions/animations, `setTimeout`, `Math.random()` (use `random('seed')` do `remotion`), `useState` para animar.
- Sem variáveis/imports não usados (`noUnusedLocals`). Tipos explícitos em props: use `SceneProps`.
- O vídeo tem `width`×`height` (pode ser vertical 1080×1920 ou horizontal 1920×1080). Dimensione tudo em proporção de `width`/`height`, nunca em px fixos grandes.
- `startWord` / `endWord` são **índices da transcrição** (os números antes de cada palavra no prompt). A cena começa quando essa palavra é falada e termina ao fim de `endWord` (ou após `durationSec`).
- Cenas da mesma camada não devem se sobrepor no tempo.

## Camadas e câmera

- `layer: 'over'` — sobreposição transparente por cima do vídeo (textos, ícones, setas, números, listas). Fundo transparente!
- `layer: 'full'` — tela cheia de motion no lugar do vídeo (desenhe o fundo). Por padrão a câmera some; use `camera` para manter o apresentador:
  - `'pip-right'`, `'pip-left'` — janela lateral (no vertical, fica na metade de baixo)
  - `'pip-top'` — janela no topo · `'bubble'` — bolinha no canto · `'hidden'` — some
- `hideCaptions: true` quando a cena já mostra o texto em destaque (evita duplicar com a legenda).

## Toolkit (`../../motionKit`)

| Item | Uso |
| --- | --- |
| `progress(f, a, b, easing?)` | 0→1 entre frames a e b, com easing e clamp |
| `pop(f, fps, delay?, damping?)` | mola 0→1 começando em `delay` |
| `useExit(dur, frames?)` | multiplicador de opacidade para sair no fim |
| `wordFrame(words, 'texto', fallback)` | frame local em que a palavra é falada |
| `ease.out / inOut / in / back`, `clamp` | easings e opção de clamp para `interpolate` |
| `Text` | texto com fonte do Lab: `font` ∈ Montserrat, Poppins, Inter, Anton, BebasNeue, Oswald, Sora, ArchivoBlack, Bangers, Roboto, LeagueSpartan, Outfit, DMSans, PlayfairDisplay |
| `fontFamily(font, weight)` | família CSS para usar em `style` |
| `Sfx` | efeito sonoro `<Sfx at={frame} name="…" />`. São ~90 efeitos em 6 categorias (transições, impactos, tensão, brilho/sucesso, interface, memes). **Leia `src/lab/sfx.ts`** para os nomes e quando usar cada um. Exemplos: `whoosh`, `whoosh-hit`, `boom`, `cash`, `typing`, `blip`, `riser-long`, `countdown`. Memes só se o pedido for de humor |

`style` traz as cores/fontes do estilo do projeto (`style.captions.highlightColor`, `style.callouts.accentColor`, `style.captions.font`…). Use-as para manter a identidade.

## Qualidade

**Composição (erro mais comum: tela vazia com elementos minúsculos):**
- O elemento principal ocupa **50–80% da largura** do espaço livre. Títulos em tela cheia: `height * 0.07`–`0.12`. Números de destaque: `height * 0.15`+.
- Em `layer: 'full'` com câmera em janela, o conteúdo preenche a área que a câmera **não** ocupa. No vertical, `pip-right`/`pip-left` ficam na metade de baixo → conteúdo nos 55% de cima. No horizontal, a janela fica numa lateral → conteúdo na outra.
- Nunca deixe a tela cheia só com fundo: sempre um elemento forte visível do primeiro ao último frame da cena (entradas com stagger, mas o primeiro elemento entra nos primeiros 6 frames).
- Fundo de `full` com profundidade (gradiente, brilho radial, grade sutil), não cor chapada.

Pense como motion designer: hierarquia clara, poucos elementos por vez, entradas com mola/easing, stagger entre itens, saídas limpas, ícones desenhados com SVG inline ou formas CSS, números que contam (`Math.round(interpolate(...))`), sincronizados com a fala. Para referência de nível, veja `src/vsl/scenes/*.tsx` e `src/vsl/ui/*.tsx` (apenas leia; não importe de lá).
