## ETAPA: plano de edição

Monte o plano de edição do VÍDEO BRUTO replicando o modelo de edição do briefing.

## Estilo completo (JSON)
{{estilo_json}}

## Métricas da referência
{{metricas}}

## Bruto
Duração: {{duracao}} s · {{largura}}×{{altura}}. Saída: {{aspecto}}.
Quadro do bruto (abra com Read para localizar o rosto): {{still}}

## Transcrição do bruto (índice:palavra, agrupada por pausas; [tempo] = início da linha)
{{transcricao}}

## Tarefa
1. subject: onde está o rosto no quadro bruto (fx, fy de 0 a 1), para o recorte {{aspecto}} não cortar a cabeça.
2. dropWords: remova erros, gaguejos, frases repetidas (fique com a ÚLTIMA versão boa), falas de bastidor ("corta", "de novo", "deixa eu refazer") e vícios longos. Não remova conteúdo útil. Os silêncios já são cortados automaticamente.
3. emphasis: escolha palavras de impacto. "punch" (zoom de ênfase) com ritmo parecido com a referência ({{ritmo}}); "highlight" nas palavras-chave para a legenda{{destaque_legenda}}. Use o mapa de seções do briefing: mais ênfase onde a intenção pede.
4. callouts: {{callouts}}
5. sfx: poucos efeitos extras em momentos-chave (lista vazia se o estilo for limpo). Dinheiro → cash/coin, revelação → boom/whoosh-hit, lista → blip/confirm.
6. notes: resumo das decisões.

## Efeitos sonoros disponíveis (nome = quando usar)
{{sfx_guia}}
