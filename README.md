# Lab de Edição (IA)

Interface local para **copiar o modelo de edição de um vídeo de referência** e aplicá-lo nos seus brutos.

```bash
npm run lab        # abre http://localhost:4747
```

Pré-requisitos (já instalados nesta máquina): `ffmpeg`, `whisper.cpp/` com o modelo `large-v3-turbo` e o `claude` CLI logado. A IA roda pelo seu login do Claude Code, sem chave de API. O custo estimado de cada chamada aparece na tela.

## Fluxo

1. **Referência**: envie um vídeo editado (ou cole o caminho do arquivo). O Lab gera um proxy, transcreve com Whisper, mede cortes por minuto, duração dos planos, pausas e trilha, e manda as grades de quadros para o Claude. O resultado é um **modelo de edição** (`style.json`) editável: ritmo, zooms, legendas, destaques, transições, cor e som.
2. **Projeto**: envie o bruto, escolha o estilo e escreva o **prompt de motion** (o que animar, estilo visual, quando entrar tela cheia).
3. **Amostra (8–20 s)**: o Lab corta as pausas, a IA monta o plano (remove erros e repetições, escolhe os punch-ins e as palavras-chave) e **escreve as cenas de motion em código Remotion** só para esse trecho. Depois renderiza a amostra.
4. **Aprovação**: se gostar, aprove. A IA faz o motion do resto em blocos de 45 s, seguindo a linguagem da amostra, e renderiza o vídeo completo. Se não gostar, diga o que mudar e ele refaz só a amostra.
5. **Ajustes finos**: o preview roda no Player do Remotion. Dá para mexer nos controles, pedir mudanças em português e renderizar de novo na aba Exportar.

Extras:

- **Abrir no editor**: o botão no topo do projeto sobe o Remotion Studio (porta 3000) e abre a composição `LabEdit` com a edição atual.
- **Transcrição própria**: no passo "Transcrição" do projeto, envie ou cole um SRT, VTT, JSON ou TXT. SRT/VTT/JSON são usados com os tempos do arquivo. TXT (roteiro sem tempos) é sincronizado com a fala pelo Whisper, e as legendas saem com o seu texto. Sem arquivo, o Whisper transcreve como antes. Trocar a transcrição refaz o plano e o motion.
- **Briefing (prompt pai)**: toda chamada de IA do projeto é montada como *prompt pai + prompt da etapa*. O prompt pai reúne o pedido, o estilo, a visão geral do vídeo e o mapa de seções (escritos pela IA na primeira amostra), a linguagem visual aprovada e o roteiro de cada bloco (escritos depois da amostra) e as suas observações fixas. Dá para ler e editar tudo na aba **Briefing** antes de aprovar. Os templates de cada etapa ficam em `lab/prompts/` (veja o README de lá).
- **Vídeo completo em paralelo**: ao aprovar, os blocos de motion de 45 s são escritos ao mesmo tempo (3 por padrão, `LAB_MOTION_PARALLEL`), cada um com o briefing, o próprio roteiro e o que os vizinhos vão fazer. Cada bloco escreve num rascunho (`part-N.draft.tsx`) e só entra no vídeo depois de passar no TypeScript.
- **Vários projetos ao mesmo tempo**: cada projeto roda a própria tarefa e a barra lateral mostra tudo em "Rodando agora". As ferramentas pesadas têm fila global: 1 render (`LAB_RENDER_PARALLEL`), 1 Whisper, 2 proxies, 4 chamadas de IA (`LAB_AI_PARALLEL`) e 2 checagens de TypeScript. O que está esperando aparece como "na fila".
- **Efeitos usados**: depois de cada render (amostra, completo ou pela aba Exportar), aparece embaixo do vídeo a lista de todos os efeitos sonoros (com tempo e origem, inclusive os de dentro das cenas de motion) e visuais (cortes, zooms, punch-ins, transições, legendas, destaques, cor, cenas de motion). Fica salva ao lado do MP4 como `.efeitos.txt` e `.efeitos.json`.
- **Biblioteca de efeitos** (barra lateral): ouve os ~90 efeitos sonoros por categoria e vê cada efeito visual (transições, legendas, destaques, câmera, cor, câmera em janela) rodando no seu próprio vídeo.

As cenas de motion ficam em `src/lab/motion/<projeto>/` (`sample.tsx`, `part-N.tsx`). O Claude só tem permissão para escrever nessa pasta. O código passa pelo TypeScript e, se não compilar, a IA corrige sozinha (até 2 tentativas). O contrato está em `src/lab/motion/GUIDE.md`.

## Arquitetura

| Caminho | Papel |
| --- | --- |
| `lab/server.mjs` | Servidor local: API, streaming de mídia com Range/CORS e UI via Vite |
| `lab/lib/analyze.mjs` | Análise da referência (métricas + quadros + Claude → `style.json`) |
| `lab/lib/edit.mjs` | Preparo do bruto, plano da IA, `buildSpec()` determinístico e render |
| `lab/lib/schemas.mjs` | JSON Schemas do estilo e do plano (saída estruturada do Claude) |
| `lab/lib/ai.mjs` | Ponte com o `claude -p` (lê as imagens com a ferramenta Read) |
| `lab/lib/motion.mjs` | IA escrevendo cenas de motion (TSX), checagem de tipos e registro |
| `src/lab/motionKit.tsx` | Toolkit das cenas: `pop`, `progress`, `wordFrame`, `Sfx`, `Text`… |
| `lab/ui/` | Interface React (Player do Remotion, editor de estilo, chat de ajustes) |
| `src/lab/LabEdit.tsx` | Composição genérica: renderiza qualquer `EditSpec` |
| `src/lab/types.ts` | Contrato `StyleProfile` / `EditSpec` |
| `lab/lib/prompts.mjs`, `lab/prompts/*.md` | Briefing do projeto (prompt pai) e os templates de cada etapa |
| `lab/lib/jobctx.mjs` | Cancelamento das tarefas, filas globais (render, Whisper, IA, tsc) e o pool dos blocos paralelos |
| `lab/lib/report.mjs` | Lista de efeitos usados em cada render |
| `lab/lib/transcript.mjs` | Leitura de SRT/VTT/JSON/TXT e alinhamento do texto com os tempos do Whisper |
| `src/lab/sfx.ts` | Catálogo dos efeitos sonoros (nome, categoria, quando usar), compartilhado com a IA |
| `scripts/make-sfx.mjs` | Gera os efeitos sintetizados e baixa os da `@remotion/sfx` para `public/sfx` |
| `lab/ui/LibraryView.tsx`, `lab/ui/fxDemos.tsx` | Biblioteca de efeitos e as demonstrações visuais |
| `lab/data/` | Vídeos, análises e renders (fora do git) |

Nada usa a API da Anthropic: tudo passa pelo `claude` CLI com o seu login.

---

# VSL Marcão — Análise de Perfil ao Vivo

Edição em Remotion da VSL gravada em `origins/C0134.MP4`.

- Composição: **VSL-Marcao** (1920×1080, 30 fps, ~3:31)
- Preview: `npm run dev` · Render: `npx remotion render VSL-Marcao out/VSL-Marcao.mp4 --crf=18`

## Estrutura

| Arquivo | O que faz |
| --- | --- |
| `src/vsl/Footage.tsx` | EDL gerada (cortes da gravação). Não editar à mão: rode `node scripts/build-edl.mjs` |
| `src/vsl/data/words.ts` | Tempo de cada palavra na timeline final (gerado) |
| `src/vsl/VSL.tsx` | Timeline principal: enquadramento da câmera (`CAM`), cenas, legendas cinéticas, flashes |
| `src/vsl/scenes/*` | Uma cena de motion por bloco do roteiro (S01…S30) |
| `src/vsl/ui/*` | Biblioteca visual: ícones animados, mockup de Instagram, cursor, câmera, tipografia |
| `src/vsl/SoundDesign.tsx` | Todos os SFX, frame a frame |
| `src/vsl/Music.tsx` | Trilha em 3 camadas (pad / pulse / drive) com automação de volume |

## Pipeline de dados

1. `public/video/marcao.mp4` — proxy 1080p/30fps do original 4K
2. `node scripts/transcribe-chunks.mjs` — Whisper (large-v3-turbo, pt) por bloco de fala
3. `node scripts/build-edl.mjs` — gera `Footage.tsx` e `words.ts`
4. `node scripts/music.mjs` — sintetiza a trilha provisória em `public/music/`

Para trocar a trilha por uma licenciada, substitua `public/music/pad.wav` (e zere `PULSE`/`DRIVE` em `Music.tsx`).
SFX: Kenney (CC0) + remotion.media.

---

# Remotion video

<p align="center">
  <a href="https://github.com/remotion-dev/logo">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="https://github.com/remotion-dev/logo/raw/main/animated-logo-banner-dark.apng">
      <img alt="Animated Remotion Logo" src="https://github.com/remotion-dev/logo/raw/main/animated-logo-banner-light.gif">
    </picture>
  </a>
</p>

Welcome to your Remotion project!

## Commands

**Install Dependencies**

```console
npm i
```

**Start Preview**

```console
npm run dev
```

**Render video**

```console
npx remotion render
```

**Upgrade Remotion**

```console
npx remotion upgrade
```

## Docs

Get started with Remotion by reading the [fundamentals page](https://www.remotion.dev/docs/the-fundamentals).

## Help

We provide help on our [Discord server](https://discord.gg/6VzzNDwUwV).

## Issues

Found an issue with Remotion? [File an issue here](https://github.com/remotion-dev/remotion/issues/new).

## License

Note that for some entities a company license is needed. [Read the terms here](https://github.com/remotion-dev/remotion/blob/main/LICENSE.md).
