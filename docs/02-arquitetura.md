# 02 — Arquitetura técnica

## 1. Visão geral

```
┌──────────────┐   webhook    ┌──────────────────────────────┐
│  WhatsApp    │ ───────────▶ │  Next.js (Vercel)             │
│  Cloud API   │ ◀─────────── │  /api/whatsapp/webhook        │
│  (Meta)      │   send msg   │  /api/jobs/tick (scheduler)   │
└──────────────┘              │  /app (painel web)            │
                              │  lib/agent (tools + LLM)      │
                              └──────┬──────────────┬─────────┘
                                     │              │
                          supabase-js│              │ Vercel AI SDK
                                     ▼              ▼
                      ┌─────────────────────┐  ┌──────────────┐
                      │  Supabase           │  │  OpenAI      │
                      │  Postgres + RLS     │  │  (gpt-4.1-   │
                      │  Auth (painel web)  │  │   mini /     │
                      │  Storage (fotos)    │  │   whisper)   │
                      │  pg_cron + pg_net ──┼──▶ /api/jobs/tick
                      └─────────────────────┘  └──────────────┘
```

Três "entradas" no sistema:
1. **Mensagem do membro** (WhatsApp → webhook → agente → banco → resposta).
2. **Relógio** (pg_cron a cada minuto → tick → gera notificações devidas → despacha).
3. **Painel web** (membro logado → configura rotina, cardápio, treino → vê gráficos).

## 2. Stack e justificativa

| Camada | Escolha | Por quê |
|---|---|---|
| App/API | **Next.js 15 (App Router) + TypeScript** | Pedido no briefing; uma base para webhook, jobs e painel |
| Banco/Auth/Storage | **Supabase** (Postgres 15, RLS, Auth, Storage, pg_cron, pg_net) | Pedido no briefing; scheduler e storage sem serviço extra |
| WhatsApp | **WhatsApp Cloud API (Meta)**, atrás de uma interface `WhatsAppProvider` | Oficial, sem risco de banimento, botões interativos, áudio; ver alternativas na seção 7 |
| LLM | **OpenAI via Vercel AI SDK** (`ai` + `@ai-sdk/openai`) | Pedido ("GPT"); o SDK deixa trocar de provedor por env var e dá tool calling tipado com Zod |
| Transcrição | OpenAI Whisper (`whisper-1` ou `gpt-4o-mini-transcribe`) | Áudio é o formato mais usado no Brasil |
| Validação | **Zod** | Schemas das tools do agente e dos inputs da API |
| UI | Tailwind CSS + shadcn/ui + Recharts | Mobile-first, visual limpo, gráficos simples |
| Datas | `date-fns` + `date-fns-tz`, `rrule` | Recorrência RFC 5545 e fuso America/Sao_Paulo |
| Hospedagem | Vercel (app) + Supabase (dados) | Deploy por push; zero servidor para manter |
| Testes | Vitest (unit), Playwright (e2e do painel) | |

Sem ORM no início: `supabase-js` + tipos gerados (`supabase gen types`). Migrations em SQL
puro em `supabase/migrations/`. Se o volume de queries crescer, Drizzle entra depois sem
mudar o schema.

## 3. Fluxo de mensagem recebida (reativo)

```
1. POST /api/whatsapp/webhook
   ├─ valida X-Hub-Signature-256 (app secret)
   ├─ para cada mensagem no payload:
   │    ├─ INSERT wa_messages (wa_message_id UNIQUE) → se conflito, ignora (reentrega)
   │    ├─ resolve member por phone_e164 → se não existe, registra e ignora
   │    └─ atualiza conversation_state.last_inbound_at (abre janela de 24h)
   └─ responde 200 em < 1 s

2. Processamento (mesma request se couber em 10 s; senão rota /api/agent/process)
   ├─ marca como "lida" (read receipt) e, se áudio, baixa mídia e transcreve
   ├─ monta contexto (doc 04 §3): perfil, plano de hoje, logs de hoje, restante das metas,
   │  próximos eventos, ação pendente, fatos do membro
   ├─ chama LLM com tools (registrar_refeicao, marcar_item_rotina, adicionar_tarefa, ...)
   ├─ executa tools em código (Zod valida; grava no banco; recalcula totais)
   ├─ LLM redige confirmação curta com o resultado das tools
   ├─ envia resposta (texto ou botões) via WhatsAppProvider
   └─ grava agent_runs (tools chamadas, tokens, latência) e wa_messages (saída)
```

## 4. Fluxo de notificação (proativo)

```
pg_cron '* * * * *' → pg_net POST /api/jobs/tick (header x-job-secret)
  ├─ GERAÇÃO (idempotente)
  │    para cada member ativo:
  │      ├─ itens de rotina de hoje com lembrete no próximo minuto (hora local)
  │      ├─ eventos de calendário com lembrete devido (expande RRULE + overrides)
  │      ├─ gatilhos contextuais (doc 05 §3): passos baixos às 18h, treino não marcado
  │      │  às 10:30, água às 15h, check-in às 22:15, check-in semanal sábado 08:30
  │      └─ INSERT ai_notifications (dedupe_key UNIQUE) → conflito = já gerado
  ├─ SUPRESSÃO
  │    ├─ item já concluído hoje → status 'skipped'
  │    ├─ modo do dia (viagem/descanso/dia corrido) → filtra tipos
  │    ├─ horário de silêncio / cap diário → adia ou descarta
  │    └─ agrupamento: notificações do mesmo membro em ±5 min viram uma mensagem
  └─ DESPACHO
       ├─ janela 24h aberta? → mensagem livre (com botões quando fizer sentido)
       ├─ fechada? → template aprovado equivalente (utility)
       ├─ envia; grava provider_message_id; status 'sent' | 'failed' (retry 3x)
       └─ webhook de status (delivered/read) atualiza a linha
```

## 5. Estrutura de pastas proposta

```
rotinapessoal/
├── app/
│   ├── (painel)/                  # rotas autenticadas do painel web
│   │   ├── hoje/  rotina/  calendario/  alimentacao/  treino/
│   │   ├── progresso/  listas/  metas/  livros/  agente/  perfil/  configuracoes/
│   ├── (auth)/login/  onboarding/
│   └── api/
│       ├── whatsapp/webhook/route.ts     # GET (verify) + POST (eventos)
│       ├── agent/process/route.ts        # processamento assíncrono
│       └── jobs/tick/route.ts            # scheduler
├── lib/
│   ├── whatsapp/                         # provider interface + cloud-api.ts (+ evolution.ts futuro)
│   ├── agent/
│   │   ├── context.ts                    # monta o contexto do membro
│   │   ├── tools/                        # uma tool por arquivo, com schema Zod
│   │   ├── prompts/                      # system prompt, insights semanais
│   │   ├── router.ts                     # chama o LLM com tools
│   │   └── safety.ts                     # palavras de risco, piso calórico
│   ├── notifications/
│   │   ├── generate.ts  suppress.ts  dispatch.ts  templates.ts
│   ├── domain/                           # regras puras (adesão, macros, tendência 14d, RRULE)
│   ├── db/                               # supabase clients (server/service), types gerados
│   └── dates.ts
├── supabase/
│   ├── migrations/                       # SQL (doc 03)
│   ├── seed/                             # foods (TACO), rotina padrão, treinos Bruno/Bruna, cardápio
│   └── config.toml
├── components/                           # UI (shadcn)
├── tests/
└── docs/
```

## 6. Variáveis de ambiente

```
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=          # só servidor

# WhatsApp Cloud API
WHATSAPP_PHONE_NUMBER_ID=
WHATSAPP_ACCESS_TOKEN=              # token permanente de system user
WHATSAPP_APP_SECRET=                # valida assinatura do webhook
WHATSAPP_VERIFY_TOKEN=              # handshake GET do webhook

# LLM
LLM_PROVIDER=openai                 # openai | anthropic | google
OPENAI_API_KEY=
LLM_MODEL_FAST=gpt-4.1-mini         # roteador de intenções e confirmações
LLM_MODEL_SMART=gpt-4.1             # insights semanais
LLM_MODEL_TRANSCRIBE=whisper-1

# Jobs
JOB_SECRET=                         # header exigido em /api/jobs/tick
APP_TIMEZONE_DEFAULT=America/Sao_Paulo
```

## 7. Decisões e alternativas

### 7.1 Provedor de WhatsApp
| Opção | Prós | Contras | Uso |
|---|---|---|---|
| **Cloud API (Meta)** — recomendada | Oficial; botões/listas; áudio; grátis dentro da janela de 24h; até 5 números em modo teste sem verificação | Número dedicado; templates precisam de aprovação; mensagens fora da janela são pagas (~US$ 0,01 cada no Brasil, categoria utility) | Produção |
| Evolution API (não oficial, Baileys) | Sem aprovação; usa número comum; grátis | Viola os termos do WhatsApp; risco de bloqueio do número; sem botões estáveis; precisa de servidor próprio | Só protótipo descartável |
| Twilio | Boa documentação | Custo por mensagem maior; camada a mais sobre a Cloud API | Se já houver conta Twilio |

A interface `WhatsAppProvider` (`send(text|buttons|list|template)`, `downloadMedia`,
`markRead`, `parseWebhook`) isola a escolha.

### 7.2 LLM
OpenAI por pedido explícito. Modelos por tarefa: rápido e barato para roteamento e
confirmação (`gpt-4.1-mini`), mais capaz para o resumo semanal (`gpt-4.1`). Vercel AI SDK
permite `LLM_PROVIDER=anthropic` sem mudar código das tools.

### 7.3 Scheduler
`pg_cron` + `pg_net` no Supabase chamando a rota do Next.js. Não depende do plano da
Vercel, fica na mesma base de dados e é idempotente pela tabela `ai_notifications`.
Alternativas: Vercel Cron (só por minuto no plano Pro), Inngest (mais recursos, mais um
vendor).

### 7.4 Processamento assíncrono
MVP: processa na própria request do webhook com `maxDuration = 30` (Vercel Pro) ou
`waitUntil`. Se ficar lento (áudio longo), a rota `/api/agent/process` é chamada por
`pg_net` a partir de um trigger em `wa_messages` com `status = 'queued'`.

## 8. Segurança e privacidade

- Assinatura do webhook validada em toda requisição; requisições sem assinatura válida
  recebem 401 e são logadas.
- Só números presentes em `members.phone_e164` são processados. Mensagens de
  desconhecidos são gravadas (`wa_messages.member_id = null`) e ignoradas.
- RLS em todas as tabelas: acesso via `household_id` derivado de `members.auth_user_id
  = auth.uid()`. Webhook e jobs usam service role no servidor, nunca no cliente.
- `JOB_SECRET` obrigatório no tick; rate limit simples por IP.
- Fotos em bucket privado `progress-photos/{member_id}/...`; URL assinada de 1 hora.
- Dados de saúde são sensíveis (LGPD art. 5º, II): consentimento no onboarding, exclusão
  de conta apaga tudo (cascade), sem envio de dados para provedores além do LLM
  estritamente necessário para responder.
- Logs de aplicação não guardam corpo de mensagem; guardam ids e métricas.

## 9. Observabilidade mínima
- `agent_runs`: tokens, custo estimado, latência, tools chamadas, erro.
- `ai_notifications`: taxa de envio/entrega/leitura por tipo.
- Alerta simples (e-mail ou WhatsApp do owner) se o tick falhar 5 minutos seguidos.
