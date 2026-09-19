# 01 — Auditoria de produto

## 1. O que está sendo pedido, de fato

Há dois documentos de entrada e eles não descrevem o mesmo produto:

| | Briefing "Projeto 30 Dias" | Pedido atual (chat) |
|---|---|---|
| Público | Bruno & Bruna (casal) | 1 pessoa **ou** família (N pessoas) |
| Canal principal | Web (Next.js), WhatsApp "futuro" | **WhatsApp com agente de IA** |
| Escopo | Dieta, treino, rotina, calendário, check-in, IA | Tudo isso **+** afazeres, reuniões, passeios, listas de mercado/casa, checklists, metas, livros, insights |
| Horizonte | 30 dias | Uso contínuo |

**Decisão de produto:** o sistema é um *assistente de rotina da casa* no WhatsApp, com
módulos. O Protocolo 30 Dias é o primeiro **programa** que roda dentro dele (com metas
calóricas, treinos e cardápio por membro). Nada do briefing se perde; ele vira o caso de
uso âncora, e a modelagem deixa de ser "casal" para ser "casa com membros".

Consequência prática: `couple_profiles` some; entra `households` + `members` + `programs`.

## 2. O que o briefing acerta (manter)

- "Coach operacional", não agenda. É a diferença entre um app de lembretes e algo que as
  pessoas realmente usam por 30 dias.
- Baixo atrito para registrar. No WhatsApp isso vira: *"almoço feito"*, *"2 litros"*,
  *"7.800 passos"*, *"pesei 79,2"*, áudio de 5 segundos. Sem formulário.
- Mesma preparação, porções diferentes. É a regra que faz o cardápio funcionar para um casal
  (ou família) e precisa estar no modelo de dados, não só no texto.
- Regras de segurança contra ajuste agressivo: tendência de 14 dias, média semanal de peso,
  passos antes de calorias. Isso vai virar código, não prompt.
- Devocional como primeira atividade e check-in às 22:15 são os dois "âncoras" do dia. O
  check-in noturno é também o momento que mantém a janela de 24h do WhatsApp aberta (ver
  doc 05), o que é um bônus técnico grande.
- Cardio fracionado (início/meio/fim) precisa ser modelado explicitamente.
- Exceções de rotina sem quebrar recorrência (regra 10). É o requisito mais difícil do
  módulo de calendário e o briefing acertou em listá-lo.

## 3. O que precisa mudar ou ser acrescentado

### 3.1 Inversão de prioridade: WhatsApp-first
No briefing, WhatsApp está em "melhorias futuras". No pedido atual é o núcleo. Isso muda
a ordem de implementação: o webhook do WhatsApp, o roteador de intenções e o motor de
notificações vêm **antes** do dashboard web. A web fica para: onboarding, configuração
de rotina/cardápio/treino (edição em massa é ruim por chat), gráficos e histórico.

### 3.2 Multi-membro real
- Papéis: `owner` (configura tudo), `adult` (usa e registra), `child` (opcional, só recebe
  tarefas/lembretes, sem dieta). Cada membro tem seu número de WhatsApp.
- Entidades compartilhadas (evento da casa, lista de mercado, tarefa) vs. individuais
  (dieta, treino, peso, livros). O modelo precisa de `scope`: `member` ou `household`.
- Privacidade dentro da casa: peso e fotos são do membro; o padrão é compartilhar com o
  cônjuge, mas tem que ser configurável (`share_body_metrics`).

### 3.3 Módulos novos (do pedido atual)
| Módulo | Mínimo viável via WhatsApp |
|---|---|
| Afazeres / tarefas | "lembra de pagar a conta de luz sexta" → tarefa com prazo e responsável |
| Reuniões / compromissos / passeios | "reunião com o contador terça 15h" → evento, lembrete 30 min antes |
| Listas de mercado e casa | "põe azeite e papel toalha na lista" → item; "manda a lista" → lista formatada; check por botão |
| Checklists | Listas reutilizáveis (mala de viagem, limpeza semanal) com reset |
| Metas | Meta com valor alvo, unidade, prazo, progresso; o agente pergunta semanalmente |
| Livros | "comecei Hábitos Atômicos, 320 páginas" / "li até a 140" → progresso e ritmo |
| Insights com IA | Resumo semanal cruzando adesão, peso, cintura, sono, treinos, leitura |

### 3.4 Notificação inteligente ≠ 10 mensagens fixas por dia
O briefing lista 9 horários de lembrete. Para duas pessoas são ~540 mensagens/mês só de
rotina. Sem controle isso vira ruído em uma semana. Necessário desde o MVP:
- silenciar tipos de lembrete por membro;
- agrupar mensagens próximas em uma;
- não lembrar o que já foi registrado ("treino concluído" às 9h suprime "hora do treino"
  atrasado);
- modos: dia corrido, viagem, descanso, refeição fora;
- horário de silêncio.

### 3.5 Cardápio: "sugestão automática por horário" precisa de dados estruturados
Para o agente dizer "Bruno: 3 ovos e 2 fatias; Bruna: 2 ovos e 1 fatia", o cardápio tem que
estar em tabelas com `meal_items` e porção por membro. Texto livre não permite calcular
calorias restantes nem sugerir o jantar com base no que já foi consumido.

### 3.6 Saúde e responsabilidade
Não é diagnóstico médico. Precisa de: aviso no onboarding, detector de palavras de risco
(tontura, desmaio, dor no peito, lesão, "não comi nada") com resposta fixa orientando
avaliação profissional, e piso calórico (nunca sugerir abaixo de ~1.200 kcal para mulheres
e ~1.500 kcal para homens sem acompanhamento profissional). Fotos de check-in são dado
sensível (LGPD): storage privado, URL assinada, exclusão sob demanda.

## 4. Personas e cenários

1. **Casal em programa (Bruno & Bruna).** Cenário âncora. Rotina de segunda a sexta,
   treino às 8h, cardápio rotativo, check-in às 22:15, pesagem sábado.
2. **Pessoa sozinha.** Mesmo sistema, `household` com 1 membro. Nada de "casal" na
   interface ou no tom do agente.
3. **Família com filhos.** Pais como `adult`, filhos como `child` (sem número próprio ou com
   número só para tarefas). Listas e tarefas domésticas ganham peso; dieta e treino são
   opcionais por membro.

## 5. Escopo por versão

| Versão | Entra | Fica de fora |
|---|---|---|
| **MVP (semanas 1–4)** | Onboarding por web mínima; WhatsApp: rotina + lembretes, registro de refeição/água/passos/peso/treino por texto e áudio, tarefas, lista de mercado, eventos simples, check-in diário e semanal, resumo semanal por IA; painel web básico "Hoje" e "Progresso" | Fotos de progresso, gráficos avançados, progressão automática de carga, Apple Health/Google Fit, foto de prato |
| **V1 (semanas 5–8)** | Cardápio com porções por membro e cálculo de macros, treino com carga/série/RPE, calendário com recorrência e exceções, metas, livros, modos (viagem, descanso, dia corrido, refeição fora), fotos de check-in | Integrações externas |
| **V2** | Google Fit / Apple Health, foto de refeição com estimativa, progressão automática de treino, biblioteca de refeições compartilhável, múltiplas casas por usuário | |

## 6. Princípios de UX (chat e web)

1. **Registrar em uma mensagem.** Se o agente precisa perguntar mais de uma coisa para
   registrar, o fluxo está errado.
2. **Confirmar curto.** "✅ Almoço registrado. Restam ~750 kcal e 62 g de proteína hoje."
3. **Nunca punir.** Sem "você falhou". Adesão é mostrada como sequência e porcentagem, e a
   mensagem de dia perdido é neutra: "Ontem não registrou treino. Foi descanso ou esqueceu
   de marcar?"
4. **Botões para o repetitivo.** Check-in noturno com botões (Treino ✅ / Água ✅ / Passos?)
   em vez de texto livre.
5. **A web é para configurar e olhar gráficos.** Edição de cardápio, treino e rotina é na
   web. Registro do dia a dia é no WhatsApp.

## 7. Riscos de produto

| Risco | Impacto | Mitigação |
|---|---|---|
| Fadiga de notificação | Abandono em 1–2 semanas | Agrupamento, supressão do já feito, digest, silêncio por tipo |
| Agente "tagarela" ou incerto | Perda de confiança | Respostas ≤ 2 linhas, sempre confirmar o que gravou, nunca inventar números |
| Dieta sugerida errada | Saúde e confiança | Ajustes nunca automáticos; piso calórico; regra de 14 dias em código |
| Cardápio sem dados estruturados | "Sugestão automática" impossível | Cadastro estruturado no onboarding (web) antes de ativar sugestões |
| Dependência de aprovação da Meta | Atraso de 1–2 semanas no início | Iniciar cadastro do WhatsApp Business no dia 1; ver decisão em doc 08 |
