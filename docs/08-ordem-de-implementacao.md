# 08 — Ordem ideal de implementação

## Princípio

Cada fase termina com algo **usável no WhatsApp** pelo casal. Nada de construir o
painel inteiro antes da primeira mensagem chegar.

## Fases

### Fase 0 — Fundação (2–3 dias) · E0
Projeto Next.js, Supabase com migration e seeds da casa Bruno & Bruna, deploy na Vercel.
Em paralelo (tarefa humana): abrir a conta WhatsApp Business Platform e pedir os
templates.
**Pronto quando:** `supabase db reset` sobe o schema com os dados do briefing e o deploy
responde.

### Fase 1 — Canal (2–3 dias) · E1
Webhook com assinatura, idempotência, resolução por telefone, áudio transcrito, eco.
**Pronto quando:** Bruno manda um áudio e recebe a transcrição de volta.

### Fase 2 — Rotina e lembretes (4–5 dias) · E2
Rotina do dia, tick por minuto, notificações com dedupe, supressão, dispatcher com
janela 24h e templates, botões Feito/Pular/Adiar, modos do dia.
**Pronto quando:** o casal recebe os lembretes do briefing (07:10, 07:35, 08:00, 12:30,
22:15) com botões e nada é enviado duas vezes.

### Fase 3 — Agente núcleo (4–5 dias) · E3
Contexto, router com tools básicas (água, passos, peso, sono, item de rotina, mover
item, modo do dia, fatos, consultas), clarificação, segurança, check-in noturno.
**Pronto quando:** "pesei 79,2, 2 litros de água e 8 mil passos" grava três coisas e
responde em uma mensagem com os totais.

### Fase 4 — Nutrição (3–4 dias) · E4
Macros por porção, `log_meal`, sugestão por horário com porções de cada membro, jantar
baseado no restante, substituições, nudges.
**Pronto quando:** o lembrete das 07:35 diz "Bruno: 3 ovos e 2 fatias. Bruna: 2 ovos e
1 fatia" e "almoço feito" desconta do dia.

### Fase 5 — Treino (2–3 dias) · E5
`log_workout`, séries por texto, lembrete enriquecido, nudge 10:30, evolução de carga.

### Fase 6 — Calendário, tarefas, listas, metas, livros (4–5 dias) · E6
RRULE + overrides, eventos com participantes e lembrete, tarefas, lista de mercado,
checklists, metas, livros, digest de domingo.
**Pronto quando:** "reunião com o contador terça 15h" vira evento com lembrete e "põe
azeite na lista" aparece em "manda a lista".

### Fase 7 — Progresso e insights (3–4 dias) · E7
Check-in semanal, tendência de 14 dias, resumo semanal por IA com proposta [Aplicar]
/[Manter], fotos.

### Fase 8 — Painel web (6–8 dias) · E8
Auth, onboarding, Hoje, editores (rotina, cardápio, treino), calendário, progresso,
listas/metas/livros, configurações, auditoria. Pode começar em paralelo à Fase 4 se
houver duas frentes; o onboarding (E8-02) é o que desbloqueia outras famílias.

### Fase 9 — Qualidade e operação (contínua) · E9
Testes de domínio e de conversas, alertas, LGPD, CI.

## Marcos

| Marco | Fases | Semana |
|---|---|---|
| M1 — Lembretes do briefing funcionando no WhatsApp | 0–2 | 2 |
| M2 — Registro por linguagem natural + check-in | 3 | 3 |
| M3 — Dieta e treino completos (MVP do Protocolo 30 Dias) | 4–5 | 4 |
| M4 — Casa completa (agenda, listas, metas, livros) | 6 | 5 |
| M5 — Insights semanais | 7 | 6 |
| M6 — Painel web e onboarding para outras famílias | 8 | 8 |

## Decisões que precisam de confirmação

1. **Provedor de WhatsApp.** Recomendo **WhatsApp Cloud API (Meta)** com número
   dedicado. Exige criar conta na Meta e submeter templates (1–2 semanas de espera, mas
   o modo teste já atende 5 números). A alternativa não oficial (Evolution API) é mais
   rápida de começar e usa número comum, mas viola os termos e pode ter o número bloqueado.
2. **LLM.** Recomendo **OpenAI** (`gpt-4.1-mini` no dia a dia, `gpt-4.1` no resumo
   semanal, Whisper para áudio) via Vercel AI SDK, para poder trocar de provedor depois.
   Preciso da chave da API quando a Fase 3 começar.
3. **Hospedagem e plano.** **Vercel** (Hobby serve para começar; Pro se o processamento
   de áudio passar de 10 s) + **Supabase** (Free serve para o MVP; pg_cron disponível).
   O scheduler fica no Supabase (pg_cron), então não depende do plano da Vercel.

Com essas três confirmadas, a Fase 0 começa com: criação do projeto, migration
`0001_init.sql` (o SQL do doc 03 já foi validado em Postgres 16), seeds do briefing e
deploy.
