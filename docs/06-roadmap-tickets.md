# 06 — Roadmap em tickets

Tamanhos: **P** (≤ meio dia), **M** (1–2 dias), **G** (3–5 dias). Dependências entre
parênteses. Tickets viram issues no GitHub com o mesmo id.

## E0 — Fundação
| Id | Ticket | Tam. | Dep. |
|---|---|---|---|
| E0-01 | Criar projeto Next.js 15 + TypeScript + Tailwind + shadcn/ui; ESLint/Prettier; Vitest | P | |
| E0-02 | Projeto Supabase; `supabase/config.toml`; CLI local; script de migrations | P | |
| E0-03 | Migration `0001_init.sql` (doc 03) + tipos gerados | M | E0-02 |
| E0-04 | Seeds: `foods` (TACO), `exercises`, casa demo Bruno & Bruna (rotina, treinos, cardápio, metas) | M | E0-03 |
| E0-05 | Clientes Supabase (server/service), helpers de data (`lib/dates.ts`, fuso) | P | E0-03 |
| E0-06 | Deploy na Vercel + variáveis de ambiente + preview por branch | P | E0-01 |
| E0-07 | Conta WhatsApp Business Platform, número, app Meta, token permanente, webhook de teste (paralelo, tarefa humana) | M | |

## E1 — Canal WhatsApp
| Id | Ticket | Tam. | Dep. |
|---|---|---|---|
| E1-01 | Interface `WhatsAppProvider` + implementação Cloud API (text, buttons, list, template, markRead, downloadMedia) | M | E0-05 |
| E1-02 | Webhook GET (verify) e POST com validação de assinatura; persistir em `wa_messages` com idempotência | M | E1-01 |
| E1-03 | Resolver membro por telefone; atualizar `conversation_state`; ignorar desconhecidos | P | E1-02 |
| E1-04 | Webhook de status (sent/delivered/read) → `ai_notifications` e `wa_messages` | P | E1-02 |
| E1-05 | Transcrição de áudio (Whisper) com limite de 60 s | P | E1-01 |
| E1-06 | "Eco" de ponta a ponta: membro manda "oi" e recebe "Olá, Bruno" | P | E1-03 |

## E2 — Rotina e lembretes
| Id | Ticket | Tam. | Dep. |
|---|---|---|---|
| E2-01 | Domínio: rotina do dia (template por weekday − exceções), em `lib/domain/routine.ts` com testes | M | E0-04 |
| E2-02 | Gerador de notificações de rotina (dedupe_key) | M | E2-01 |
| E2-03 | Rota `/api/jobs/tick` com `JOB_SECRET`; pg_cron + pg_net | P | E2-02 |
| E2-04 | Supressão: já feito, quiet hours, cap diário, agrupamento | M | E2-02 |
| E2-05 | Dispatcher: janela 24h → livre ou template; retries | M | E1-01, E2-04 |
| E2-06 | Botões `done/skip/snooze` sem LLM | P | E2-05 |
| E2-07 | Templates pt-BR submetidos e mapeados (`templates.ts`) (tarefa humana + código) | P | E0-07 |
| E2-08 | Modos do dia (`day_modes`) e efeito na supressão | P | E2-04 |

## E3 — Agente (núcleo)
| Id | Ticket | Tam. | Dep. |
|---|---|---|---|
| E3-01 | Construtor de contexto (`context.ts`) com `v_daily_totals`, plano do dia, eventos, tendência | M | E2-01 |
| E3-02 | Router com Vercel AI SDK + tools tipadas; `agent_runs` | M | E3-01 |
| E3-03 | Tools: `log_water`, `log_steps`, `log_weight`, `log_sleep`, `complete_routine_item`, `move_routine_item`, `set_day_mode`, `remember_fact`, `get_plan` | M | E3-02 |
| E3-04 | `ask_clarification` + `pending_action` multi-turno | P | E3-02 |
| E3-05 | Camada de segurança (`safety.ts`): termos de risco, faixas de valores | P | E3-02 |
| E3-06 | Resolução de datas relativas e referências vagas (similaridade) com testes | M | E3-02 |
| E3-07 | Check-in noturno (22:15) com botões e sequência | M | E2-06, E3-03 |

## E4 — Nutrição
| Id | Ticket | Tam. | Dep. |
|---|---|---|---|
| E4-01 | Domínio: macros de uma refeição por membro (`meal_items` × `meal_portions`), com testes | M | E0-04 |
| E4-02 | Tool `log_meal` (do cardápio, texto livre, flexível) e estimativa com `foods` | M | E4-01, E3-02 |
| E4-03 | Sugestão de refeição por horário no lembrete (com porção de cada membro) | P | E2-02, E4-01 |
| E4-04 | Sugestão de jantar baseada no restante do dia | P | E4-02 |
| E4-05 | Substituições equivalentes ("troca o frango por…") | P | E4-01 |
| E4-06 | Nudges de água e proteína | P | E2-04 |

## E5 — Treino
| Id | Ticket | Tam. | Dep. |
|---|---|---|---|
| E5-01 | Tool `log_workout` (status, RPE, cardio início/meio/fim) | M | E3-02 |
| E5-02 | Registro de séries por texto ("supino 4x8 com 40 kg") | M | E5-01 |
| E5-03 | Lembrete de treino enriquecido (dia, exercícios, cardio) e nudge 10:30 | P | E2-02 |
| E5-04 | Evolução de carga por exercício/semana (query + resposta do agente) | P | E5-02 |

## E6 — Calendário, tarefas, listas, metas, livros
| Id | Ticket | Tam. | Dep. |
|---|---|---|---|
| E6-01 | Domínio: expansão de RRULE + overrides (`lib/domain/calendar.ts`) com testes | M | E0-05 |
| E6-02 | Tools `create_event`, `update_event`, `cancel_event_occurrence`; lembretes de evento | M | E6-01, E3-02 |
| E6-03 | Tools `create_task`, `complete_task`; lembrete de tarefa | P | E3-02 |
| E6-04 | Tools de lista de compras (`add`, `check`, `get`) e lista formatada | P | E3-02 |
| E6-05 | Checklists reutilizáveis | P | E3-02 |
| E6-06 | Metas: `create_goal`, `update_goal_progress`, pergunta semanal | P | E3-02 |
| E6-07 | Livros: `add_book`, `log_reading`, ritmo e previsão de término | P | E3-02 |
| E6-08 | Digest de domingo | P | E6-02 |

## E7 — Progresso e insights
| Id | Ticket | Tam. | Dep. |
|---|---|---|---|
| E7-01 | Check-in semanal por WhatsApp (sequência curta) → `weekly_checkins` | M | E3-07 |
| E7-02 | Domínio: tendência 14 dias, adesão, regras de ajuste (`lib/domain/trends.ts`) com testes | M | E4-02, E5-01 |
| E7-03 | Resumo semanal por LLM + proposta com botões [Aplicar]/[Manter] → `program_enrollments` | M | E7-02 |
| E7-04 | Fotos de check-in (Storage privado, URL assinada) | P | E7-01 |

## E8 — Painel web
| Id | Ticket | Tam. | Dep. |
|---|---|---|---|
| E8-01 | Auth (Supabase, magic link) + layout mobile-first + navegação | M | E0-01 |
| E8-02 | Onboarding: criar casa, membros (telefone), programa, importar padrão | G | E8-01, E0-04 |
| E8-03 | Tela Hoje (por membro: rotina, treino, refeições, totais, %) | M | E8-01 |
| E8-04 | Editor de rotina (templates, itens, exceções) | M | E8-01 |
| E8-05 | Editor de cardápio (refeições, itens, porções por membro, plano semanal) | G | E8-01 |
| E8-06 | Editor de treino (plano, dias, exercícios) | M | E8-01 |
| E8-07 | Calendário (semana/mês, eventos, participantes) | M | E6-01 |
| E8-08 | Progresso (peso média semanal, cintura, adesão, treinos, passos) com Recharts | M | E7-02 |
| E8-09 | Listas, tarefas, metas, livros (visualização e edição) | M | E8-01 |
| E8-10 | Configurações do agente (`ai_preferences`) e do membro | P | E8-01 |
| E8-11 | Histórico da conversa e das notificações (auditoria) | P | E8-01 |

## E9 — Qualidade e operação
| Id | Ticket | Tam. | Dep. |
|---|---|---|---|
| E9-01 | Testes de domínio (rotina, calendário, macros, tendência) ≥ 80% | M | E2-01, E6-01, E4-01, E7-02 |
| E9-02 | Testes do agente com conversas gravadas (fixtures) e asserts nas tools chamadas | M | E3-03 |
| E9-03 | Alerta de tick parado e de falhas de envio | P | E2-03 |
| E9-04 | Exclusão de conta/dados (LGPD) | P | E8-10 |
| E9-05 | CI (lint, typecheck, testes) no GitHub Actions | P | E0-01 |

## V2 (sem tickets ainda)
Google Fit / Apple Health (passos e sono automáticos), foto de refeição com estimativa,
progressão automática de carga, biblioteca de refeições compartilhável entre casas,
múltiplas casas por usuário, integração com Google Calendar.

Total MVP (E0–E3 + E4-01..03 + E5-01/03 + E6-03/04 + E7-01 + E8-01/02/03 + E9-05):
~28 tickets, estimativa de 4 semanas para uma pessoa com o Claude Code.
