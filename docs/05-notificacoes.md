# 05 — Estrutura de notificações

## 1. Objetivo

Enviar a mensagem certa, na hora certa, **uma vez**, e não enviar quando não faz sentido.
O sistema de notificações é o que transforma um banco de rotina em um coach. Também é o
que mais rápido faz o usuário silenciar o número se for feito errado.

## 2. Fontes de notificação

| Fonte | Como é gerada | Kind |
|---|---|---|
| Item de rotina com `remind = true` | Template do dia da semana − exceções; hora local − `reminder_offset_min` | `routine` |
| Evento de calendário | RRULE expandida para o dia − overrides; `starts_at − reminder_min` | `event` |
| Treino do dia | Junto com o item de rotina tipo `workout` (enriquecido com o `workout_day`) | `workout` |
| Sugestão de refeição | Item de rotina tipo `meal` enriquecido com `meal_plans[weekday][slot]` e porção do membro | `meal_suggestion` |
| Check-in diário | Item de rotina tipo `checkin` (22:15) com botões | `checkin_daily` |
| Check-in semanal | Sábado 08:30 (configurável) | `checkin_weekly` |
| Nudges contextuais | Regras avaliadas no tick (§3) | `nudge_steps`, `nudge_water`, `nudge_workout` |
| Digest | Domingo 20:00: semana que vem | `digest` |
| Insight | Sábado após check-in semanal | `insight` |
| Tarefa com lembrete | `tasks.due_at − reminder_min` | `custom` |

## 3. Nudges contextuais (regras)

Avaliadas no tick, uma vez por dia cada, só em dias `mode = normal` ou `busy`:

| Regra | Condição | Horário |
|---|---|---|
| Treino sem registro | Dia com `workout_day` e nenhuma `workout_session` hoje | 2h30 depois do item de treino (10:30) |
| Água baixa | `water_ml < 40%` da meta | 15:00 |
| Passos baixos | `steps < 60%` da meta (ou sem registro) | 18:00 |
| Proteína longe da meta | `protein_g < 50%` da meta após o lanche da tarde | 17:30 |
| Refeição não registrada | 90 min após item `meal` sem `meal_log` do slot | +90 min |
| Refeição flexível disponível | Sexta 17:00 se ainda não usou na semana | Sexta 17:00 |
| Leitura parada | Livro `reading` sem `reading_log` há 4 dias | 21:00 |
| Meta com prazo | 3 dias antes do `deadline` e progresso < 80% | 09:00 |

## 4. Supressão (antes de enviar)

Ordem de avaliação:
1. **Já feito**: item de rotina com `routine_logs.status = done` hoje → `skipped`.
   Refeição do slot já registrada → `skipped`. Treino já registrado → `skipped`.
2. **Modo do dia**:
   - `rest` (descanso): suprime `workout`, `nudge_workout`, `nudge_steps`; mantém refeições.
   - `travel` (viagem): suprime rotina de horários fixos e treino; mantém água, check-in
     e eventos; sugestões de refeição viram "dica genérica" (proteína + vegetais).
   - `busy` (dia corrido): agrupa tudo em 3 blocos (manhã, almoço, noite); sem nudges.
   - `eating_out` (refeição fora): suprime sugestão daquele slot; oferece contar como
     flexível.
3. **Preferências**: `enabled_kinds`, `quiet_start/quiet_end` (adiar para o fim do
   silêncio ou descartar se perder sentido), `max_per_day` (prioridade: evento >
   check-in > treino > refeição > nudge > digest).
4. **Agrupamento**: notificações do mesmo membro com `scheduled_for` em ±5 min viram
   uma mensagem com bullets.
5. **Casal/família**: evento com vários participantes gera uma notificação por membro,
   com o mesmo `dedupe_key` base + `member_id`.

## 5. Janela de 24h do WhatsApp Cloud API

- **Aberta** (última mensagem do membro há < 24h): mensagem livre, com botões
  interativos (até 3) ou lista (até 10 opções). Sem custo.
- **Fechada**: só template aprovado (categoria *utility*), com variáveis. Custo por
  mensagem. Botões *quick reply* são permitidos em templates.

O dispatcher decide por `conversation_state.last_inbound_at`. O check-in das 22:15 com
botões é a principal estratégia para manter a janela aberta: quem clica "Feito ✅" abre
mais 24h. Se o membro não interage por um dia inteiro, o primeiro lembrete da manhã sai
como template e os seguintes (após a resposta) voltam a ser livres.

### Templates a submeter para aprovação (semana 1)

| Nome | Categoria | Corpo (variáveis) | Botões |
|---|---|---|---|
| `lembrete_rotina` | utility | "{{1}}, {{2}}: {{3}}." | Feito ✅ / Pular |
| `lembrete_treino` | utility | "{{1}}, treino de hoje: {{2}}. Cardio: {{3}}." | Comecei / Descanso hoje |
| `refeicao_sugerida` | utility | "{{1}}: {{2}}. Sua porção: {{3}}." | Comi ✅ / Outra coisa |
| `checkin_diario` | utility | "Check-in de hoje, {{1}}. Como foi?" | Tudo feito / Responder |
| `checkin_semanal` | utility | "Check-in semanal, {{1}}. Pode me mandar peso e cintura?" | Enviar agora / Mais tarde |
| `lembrete_evento` | utility | "Em {{1}} min: {{2}} ({{3}})." | Ok |
| `aviso_generico` | utility | "{{1}}" | Ok |

Todos em pt-BR. O sistema mapeia `kind → template_name` e preenche variáveis a partir do
mesmo texto que seria enviado livre.

## 6. Motor (idempotente)

```
tick (1x/min, pg_cron → /api/jobs/tick)
 1. now_local por casa (timezone)
 2. GERAR: para cada membro ativo, para cada fonte, calcular notificações devidas na
    janela [now, now+1min); INSERT ... ON CONFLICT (dedupe_key) DO NOTHING
    dedupe_key = "{member_id}|{kind}|{ref_id}|{date_local}|{HH:MM}"
 3. SUPRIMIR: aplicar §4 sobre as queued com scheduled_for <= now → status 'skipped'
 4. AGRUPAR: unir queued do mesmo membro em ±5 min (mantém a de maior prioridade; as
    outras viram 'skipped' com referência)
 5. DESPACHAR: para cada queued restante
      janela aberta? send(text|buttons) : send(template)
      sucesso → 'sent', provider_message_id, sent_at
      erro    → attempts++ ; 3 falhas → 'failed' (alerta ao owner se for evento)
 6. Webhook de status da Meta atualiza 'delivered' / 'read'
```

Garantias:
- Reexecutar o tick não duplica (unique em `dedupe_key`).
- Tick atrasado até 10 min ainda envia (janela de tolerância); acima disso, lembrete de
  rotina é descartado, evento ainda é enviado com "atrasado".
- Mudança de horário de um item cria nova `dedupe_key`; a antiga, se ainda `queued`, é
  cancelada pelo passo de supressão (item não existe mais naquele horário).

## 7. Interações com botões

| Botão (id) | Ação |
|---|---|
| `done:{routine_item_id}` | `routine_logs` done, sem LLM |
| `skip:{routine_item_id}` | `routine_logs` skipped |
| `snooze15:{notif_id}` | Reagenda +15 min (uma vez) |
| `meal_done:{slot}:{meal_id}` | `meal_logs` com macros da porção |
| `meal_other:{slot}` | Pergunta o que comeu (LLM) |
| `workout_start:{day_id}` | Cria sessão `started_at` |
| `workout_rest` | `day_modes` rest hoje |
| `flex_yes` / `flex_no` | Marca refeição como flexível |
| `apply_adjustment:{insight_id}` | Nova linha em `program_enrollments` |
| `checkin:*` | Sequência do check-in noturno |

## 8. Métricas para acompanhar
- Enviadas / entregues / lidas por `kind`.
- Taxa de resposta a botões.
- % de mensagens suprimidas por "já feito" (quanto maior, melhor: o membro registra antes
  de ser lembrado).
- Mensagens por membro por dia (alvo ≤ 8 em dia normal).
