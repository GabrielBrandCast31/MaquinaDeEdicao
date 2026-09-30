# Prompts do Lab

Cada chamada de IA de um projeto é montada como **prompt pai + prompt da etapa**:

```
pai.md            ← briefing do projeto (igual em todas as etapas)
---
<etapa>.md        ← só o trabalho daquela etapa
```

| Arquivo | Etapa |
| --- | --- |
| `pai.md` | Briefing de edição: pedido, estilo, visão geral, mapa de seções, linguagem visual, observações e regras |
| `visao.md` | Lê a transcrição inteira e escreve a visão geral + o mapa de seções do briefing |
| `plano.md` | Plano de edição: cortes de erros, ênfases, destaques e efeitos sonoros |
| `ajuste.md` | Ajuste pedido pelo chat (estilo + plano) |
| `motion-amostra.md` | Cenas de motion da amostra |
| `roteiro.md` | Depois da amostra: extrai a linguagem visual e distribui o trabalho entre os blocos de 45 s |
| `motion-bloco.md` | Cenas de motion de um bloco (os blocos rodam em paralelo) |
| `motion-correcao.md` | Correção de um arquivo de motion que não compilou |

`{{nome}}` é trocado pelo Lab na hora da chamada (valores em `lab/lib/prompts.mjs`). Dá para editar o texto à vontade; as variáveis que sumirem só deixam de ser preenchidas. A análise de referências (`lab/lib/analyze.mjs`) não usa briefing de projeto e continua com o prompt próprio.
