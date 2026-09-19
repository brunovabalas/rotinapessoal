# Protótipo beta (HTML estático)

`beta.html` é um protótipo navegável em um único arquivo, sem dependências além das
fontes do Google. Abra no navegador (desktop ou celular).

- Painel web: Hoje, Rotina, Agenda, Alimentação, Treino, Listas, Metas & Livros,
  Progresso, Agente.
- Simulador do WhatsApp (coluna à direita ou botão "Abrir WhatsApp" no celular):
  digite em linguagem natural e o painel reage. Exemplos: "almoço feito",
  "2 copos de água", "7 mil passos", "pesei 79,2", "treino feito, esforço 7",
  "põe azeite e 2 kg de frango na lista", "manda a lista",
  "reunião com o contador terça 15h", "lembra de pagar a luz sexta", "li até a 160",
  "quanto falta?", "modo viagem".
- "Simular relógio": dispara as mensagens proativas (07:10, 07:35, 08:00, 12:30, 18:00,
  22:15) com botões, incluindo a supressão quando o item já foi registrado.

Os dados são de exemplo e nada é salvo. A lógica do "agente" aqui é um conjunto de
regras em JavaScript que imita as ferramentas descritas em `docs/04-agente-ia.md`;
na versão real, a interpretação é feita pelo LLM e a execução pelas mesmas ferramentas.
