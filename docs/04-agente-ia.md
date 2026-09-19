# 04 — Agente de IA

## 1. Papel e postura

O agente é um **coach operacional da casa** no WhatsApp. Ele:
- registra o que o membro disser (refeição, água, passos, peso, treino, tarefa, item de
  lista, evento, leitura, meta) em uma mensagem;
- lembra e contextualiza (o que é hoje, o que falta, o que vem depois);
- responde perguntas sobre o plano ("o que é o almoço de hoje?", "quanto falta de
  proteína?", "quando é a reunião com o contador?");
- propõe ajustes com base em tendência, e **nunca aplica ajuste sozinho**.

Tom: direto, acolhedor, sem exclamação em excesso, sem sermão. Respostas de 1 a 3
linhas. Português do Brasil. Emoji apenas como marcador de estado (✅ ⏳ ⚠️).

## 2. Dois modos

| Modo | Gatilho | Saída |
|---|---|---|
| **Reativo** | Mensagem do membro (texto, áudio, botão) | Tool calls + confirmação curta |
| **Proativo** | Scheduler (doc 05) | Lembrete/nudge com contexto; às vezes com botões |

Os dois modos usam o **mesmo construtor de contexto** (§3), para que o lembrete das 12:30
saiba que o Bruno já registrou o almoço às 12:10 e não mande nada.

## 3. Contexto injetado em cada chamada

Montado em código (`lib/agent/context.ts`) a partir do banco, em texto compacto (~1,5 k
tokens), sempre com hora local e dia da semana:

```
AGORA: sexta-feira, 19/09/2026 12:42 (America/Sao_Paulo)
MEMBRO: Bruno (owner) · casa "Bruno & Bruna" · outros: Bruna
PROGRAMA: Protocolo 30 Dias · dia 12 de 30
METAS HOJE: 1900 kcal · 140–150 g prot · 8000 passos · 2000 ml água
HOJE ATÉ AGORA: 650 kcal · 45 g prot · 1200 ml · 6200 passos · treino: não registrado
RESTANTE: ~1250 kcal · ~100 g prot · 800 ml · 1800 passos
ROTINA HOJE: 07:10 devocional ✅ · 07:35 café ✅ · 08:00 treino (sem registro) · 12:30 almoço ✅ ·
             13:15 caminhada · 16:30 lanche · 19:30 jantar · 22:15 check-in
TREINO HOJE: Sexta — Ombros, braços e definição (cardio 8/6/20 min)
CARDÁPIO HOJE: café Ovos+pão · pós-treino Whey+fruta · almoço Lombo+arroz+feijão · lanche Whey+fruta · jantar Hambúrguer caseiro+batata
PRÓXIMOS EVENTOS (24h): hoje 19:30 Jantar com os pais (ambos) · amanhã 08:30 Pesagem semanal
TENDÊNCIA 14d: peso 80,4 → 79,6 (média semanal) · cintura 92,5 → 91,8
MODO DO DIA: normal
FATOS: não gosta de peixe; treina na academia do prédio
AÇÃO PENDENTE: nenhuma
LISTA DE MERCADO (abertos): 6 itens
```

O modelo nunca calcula totais; recebe prontos. Isso reduz alucinação e tokens.

## 4. Ferramentas (tools) do modo reativo

Todas com schema Zod, executadas em código. O LLM só escolhe e preenche.

| Tool | Parâmetros principais | O que faz |
|---|---|---|
| `log_meal` | `slot`, `meal_id?` ou `description`, `followed_plan?`, `is_flex?` | Grava refeição; se `meal_id`, calcula macros da porção do membro; se texto livre, estima com `foods` conhecidos ou marca `ai_estimate` |
| `log_water` | `ml` (aceita "2 copos" → 500) | Soma ao dia |
| `log_steps` | `steps` | Upsert do total do dia |
| `log_weight` | `weight_kg`, `waist_cm?` | Grava medição |
| `log_sleep` | `hours` ou `bed_at`+`wake_at`, `quality?` | |
| `complete_routine_item` | `item_id` ou `type`/`title` aproximado, `status` | Marca item de hoje (done/skipped) |
| `log_workout` | `status`, `rpe?`, `notes?`, `sets?[]`, `cardio?[]` | Cria sessão do dia de treino previsto; séries opcionais |
| `move_routine_item` | `item`, `date`, `new_time` ou `skip` | Cria `routine_exceptions` (não altera o template) |
| `create_event` | `title`, `starts_at`, `ends_at?`, `type`, `participants[]`, `rrule?`, `reminder_min?` | Evento do calendário |
| `update_event` / `cancel_event_occurrence` | | Override de ocorrência |
| `create_task` | `title`, `assignee?`, `due_at?`, `category?` | Tarefa |
| `complete_task` | `task_id` ou `title` aproximado | |
| `add_shopping_items` | `items[{name, qty?, unit?}]`, `list?` | Adiciona na lista (mercado por padrão) |
| `check_shopping_items` / `get_shopping_list` | | Marca ou envia a lista formatada |
| `add_checklist_item` / `get_checklist` / `reset_checklist` | | Checklists reutilizáveis |
| `create_goal` / `update_goal_progress` | | Metas |
| `add_book` / `log_reading` | `title`, `author?`, `total_pages?` · `to_page`, `note?` | Livros e leitura |
| `set_day_mode` | `mode`, `date?` | viagem / descanso / dia corrido / refeição fora |
| `remember_fact` | `key`, `value` | Memória do agente |
| `get_plan` | `what`: today / meal / workout / events / week | Responde perguntas do plano (sem gravar) |
| `get_progress` | `period` | Números de adesão e tendência |
| `ask_clarification` | `question`, `pending_tool`, `missing[]` | Salva `pending_action` e pergunta uma coisa só |

Regras de execução:
- Uma mensagem pode disparar várias tools ("almoço feito, 2 copos de água e 7 mil passos").
- Se faltar dado obrigatório, `ask_clarification` com **uma** pergunta; a próxima mensagem
  do membro é interpretada contra `pending_action` primeiro.
- Referências vagas ("marca o treino", "risca o leite") são resolvidas em código por
  similaridade contra o plano de hoje / lista aberta; se houver empate, pergunta.
- Datas relativas ("terça que vem", "daqui a 2h") são resolvidas em código com a hora
  local injetada; o modelo devolve ISO e o código valida.

## 5. Pipeline do modo reativo

```
mensagem → (áudio? transcreve) → contexto → LLM(tools) → executa tools → recalcula totais
        → LLM redige confirmação (≤ 3 linhas, com números atualizados) → envia → audita
```

Duas chamadas ao LLM por mensagem (escolha de tools + redação) usando o modelo rápido.
Para mensagens simples (botão "Feito ✅"), nenhuma chamada: o botão carrega o `item_id`.

### Exemplos

| Membro | Agente |
|---|---|
| "almoço feito" | "✅ Almoço registrado (lombo, arroz, feijão, salada — ~620 kcal, 48 g prot). Restam ~1.250 kcal e ~100 g de proteína." |
| "comi um pastel e um caldo de cana" (áudio) | "Registrei como refeição fora do plano (~550 kcal, estimativa). Quer contar como a refeição flexível da semana?" [Sim] [Não] |
| "pesei 79,2" | "✅ 79,2 kg. Média da semana: 79,6 (−0,8 vs semana passada). Cintura hoje?" |
| "põe azeite, papel toalha e 2 kg de frango na lista" | "✅ 3 itens na lista Mercado (9 abertos)." |
| "reunião com o contador terça 15h" | "✅ Terça 23/09, 15:00 — Reunião com o contador. Lembro 30 min antes. Só você ou a Bruna também?" |
| "o que é o jantar hoje?" | "Hambúrguer caseiro + batata. Sua porção: 150–180 g de carne, 200–300 g de batata. Bruna: 110–130 g / 150–200 g." |
| "comecei Hábitos Atômicos, 320 páginas" | "✅ Adicionado. Me diga a página quando parar de ler que eu acompanho o ritmo." |
| "tô com tontura desde o treino" | "⚠️ Tontura pode ser sinal de baixa ingestão, desidratação ou pressão. Coma algo com carboidrato, beba água e descanse. Se persistir ou piorar, procure atendimento. Não vou sugerir nada de dieta hoje." |

## 6. Modo proativo (mensagens contextuais)

O scheduler gera a notificação; o agente **preenche com contexto** usando um template
determinístico + uma passada opcional do LLM para deixar natural. Regras:

| Horário / gatilho | Mensagem (com dados do contexto) |
|---|---|
| 07:10 devocional | "Bom dia. Hora do devocional — 20 min antes do resto do dia." [Feito ✅] |
| 07:35 café | "Café de hoje: ovos, pão integral e mamão. Bruno: 3 ovos, 2 fatias. Bruna: 2 ovos, 1 fatia." [Comi ✅] [Outra coisa] |
| 08:00 treino | "Sexta: Bruno — ombros, braços e definição (cardio 8/6/20). Bruna — glúteos + quadríceps (cardio 8/18)." [Comecei] [Pular hoje] |
| 10:30 sem treino registrado | "Treino de hoje ainda sem registro. Foi feito?" [Feito ✅] [Descanso hoje] |
| 12:30 almoço | "Almoço: lombo + arroz + feijão + salada. Bruno 150–170 g / Bruna 110–130 g de carne." |
| 15:00 água < 40% da meta | "Água: 800 ml de 2.000. Um copo agora ajuda." |
| 18:00 passos < 60% da meta | "6.200 passos. Faltam ~1.800 para a meta — uma volta de 20 min resolve." |
| 19:30 jantar | Baseado no restante: "Restam ~700 kcal e 55 g de proteína. Jantar previsto: hambúrguer caseiro + batata. Cabe." |
| 22:15 check-in | Botões: Treino ✅ · Água ✅ · Passos? (pergunta número) · Amanhã tem algo diferente? |
| Sáb 08:30 check-in semanal | Pede peso, cintura, fome/sono/energia (1–5) em uma sequência curta; gera resumo |
| Evento com lembrete | "Em 30 min: Reunião com o contador (15:00)." |
| Domingo 20:00 digest | Semana que vem: eventos, treinos, refeição flexível disponível, lista de mercado aberta |

Supressões (doc 05 §4) acontecem antes de gerar texto.

## 7. Insights e recomendações (semanal)

Rodam sábado após o check-in semanal, com o modelo mais capaz, **sobre números
calculados em código** (`lib/domain/trends.ts`):

Entrada: média de peso das últimas 3 semanas, cintura, adesão à rotina, treinos
feitos/planejados, média de passos, água, sono, fome, energia, refeições fora do plano,
leitura (páginas/semana), metas em andamento.

Regras determinísticas (do briefing) aplicadas **antes** do LLM:
1. Não propor nada com menos de 14 dias de dados.
2. Se peso médio **e** cintura não mudaram em 2 semanas → propor +1.500–2.000
   passos/dia. Só na semana seguinte, se ainda estável, propor revisão de −100 a −150 kcal.
3. Nunca propor abaixo do piso: 1.500 kcal (homens) / 1.200 kcal (mulheres).
4. Se fome ≥ 4 e energia ≤ 2 por 2 semanas → propor **aumentar** 100 kcal ou revisar
   distribuição, e sugerir avaliação profissional.
5. Perda > 1% do peso/semana por 2 semanas → alertar que está rápido demais.
6. Adesão < 60% → o foco da semana é consistência, não ajuste de dieta.

Saída do LLM: um resumo de 5–8 linhas por membro + no máximo uma proposta de ajuste,
enviada com botões [Aplicar] [Manter]. "Aplicar" cria uma nova linha em
`program_enrollments` com `reason`. Tudo fica em `ai_insights` com os números usados.

## 8. Guardrails

- **Segurança física:** lista de termos (tontura, desmaio, dor no peito, lesão, vômito,
  "não comi nada hoje", "não aguento mais") dispara resposta fixa, sem LLM, e desliga
  sugestões de dieta por 24h. Palavras ligadas a transtorno alimentar (compulsão, purga,
  "vou parar de comer") recebem orientação para buscar profissional, sem conselho de dieta.
- **Nunca gravar sem confirmar quando o número parece fora de faixa** (peso ±5 kg do
  último, 30 mil passos, 5 L de água).
- **Nunca inventar** kcal: sem `meal_id` ou `foods` reconhecidos, a estimativa é marcada
  e o agente diz "estimativa".
- **Não responder sobre outros membros** além do necessário (lista, eventos comuns);
  peso/fotos de outro membro só se `share_body_metrics`.
- **Não sair do escopo**: pedidos fora (código, notícias) recebem "isso não é comigo".

## 9. Prompt de sistema (esqueleto)

```
Você é o assistente de rotina da casa {household}. Fala português do Brasil, direto e
acolhedor, sem julgamento. Responde em no máximo 3 linhas.

Você NÃO calcula nada: os totais e metas já vêm no CONTEXTO. Você NÃO altera metas de
dieta; apenas registra e informa. Ajustes só são propostos no resumo semanal.

Para registrar ou consultar, use as ferramentas. Se faltar um dado obrigatório, use
ask_clarification com UMA pergunta. Se a mensagem contiver vários registros, chame
várias ferramentas. Datas relativas: devolva ISO usando AGORA do contexto.

Após executar, confirme o que foi gravado com os números atualizados do contexto.
Não repita o que o membro disse. Não dê conselhos médicos. Se houver sinal de
mal-estar, siga a resposta de segurança.

CONTEXTO:
{contexto}
```

## 10. Custo estimado (2 membros, uso intenso)

| Item | Volume/mês | Custo aprox. |
|---|---|---|
| Mensagens reativas (2 chamadas × ~2,5 k tokens in, 150 out) — modelo rápido | ~1.200 msgs | ~US$ 1,50 |
| Transcrição de áudio (média 15 s) | ~300 áudios | ~US$ 0,50 |
| Resumo semanal (modelo capaz, ~6 k tokens) | 8 | ~US$ 0,30 |
| Notificações proativas (a maioria sem LLM) | ~700 | ~US$ 0,30 |
| **Total LLM** | | **~US$ 3/mês** |

WhatsApp: mensagens dentro da janela de 24h não são cobradas; templates *utility* fora
da janela custam ~US$ 0,01 no Brasil. Estimativa: US$ 0–5/mês.
