# 07 — Lacunas do briefing e riscos técnicos

## A. O que falta no briefing (e a resposta proposta)

| # | Lacuna | Proposta |
|---|---|---|
| 1 | Não define **como** o usuário registra dados (formulário? chat?) | WhatsApp em linguagem natural + botões; web só para configurar |
| 2 | Sem modelo multi-membro (só casal) | `households` + `members` com papéis e escopo por entidade |
| 3 | Sem definição de onboarding | Fluxo web: criar casa → adicionar membros com telefone → escolher programa → importar rotina/cardápio/treino padrão → membro manda "oi" no WhatsApp para vincular |
| 4 | Sem regra de fuso horário | `households.timezone` (padrão America/Sao_Paulo); horários de rotina em hora local; tudo persistido em UTC |
| 5 | "Calendário recorrente" sem definir exceções | RRULE (RFC 5545) + tabela de overrides por ocorrência |
| 6 | Sem cadastro de alimentos com macros | Tabela `foods` semeada com ~80 itens da TACO (tabela brasileira) usados no cardápio |
| 7 | Sem política de fotos (LGPD) | Storage privado, URL assinada de 1h, exclusão por membro, sem compartilhar por padrão |
| 8 | Sem definição de "adesão" | Adesão diária = itens da rotina concluídos / itens previstos (excluindo pulados por exceção). Adesão alimentar = refeições registradas dentro de ±15% do alvo / refeições previstas |
| 9 | Sem tratamento de áudio | Transcrição (Whisper) antes do roteador de intenção; é o formato mais usado no Brasil |
| 10 | Sem limite de mensagens/dia | Cap por membro (padrão 12/dia), agrupamento, digest |
| 11 | Sem definição de quem pode editar o quê | `owner` edita tudo da casa; `adult` edita o próprio e o compartilhado; `child` só marca tarefas |
| 12 | Metas de passos e água não estão no perfil | Adicionar `steps_goal` (8.000) e `water_goal_ml` (2.500/2.000) por membro |
| 13 | Fim de semana só descrito em texto | Rotina de sábado/domingo como template separado (caminhada 40–60 min, refeição flexível, pesagem sábado) |
| 14 | Sem versionamento de metas (o que valia na semana 1 vs 3) | `program_enrollments` guarda metas com `valid_from`; ajustes criam nova linha |
| 15 | Sem custo estimado | Ver doc 04 (LLM) e doc 05 (WhatsApp): ordem de US$ 5–10/mês para 2 membros |

## B. Riscos técnicos

### B1. Janela de 24 horas do WhatsApp Cloud API (crítico)
Mensagens livres só podem ser enviadas até 24h após a última mensagem **do usuário**.
Fora disso, só templates aprovados pela Meta (categoria *utility*, pagos por mensagem).

- Impacto: lembrete de 07:10 depois de um dia sem interação seria bloqueado.
- Mitigação: (a) check-in noturno às 22:15 com botões mantém a janela aberta quase
  sempre; (b) dispatcher verifica `last_inbound_at` e cai para template quando a janela
  fechou; (c) templates aprovados desde a primeira semana (lista no doc 05).

### B2. Aprovação e verificação na Meta
Criar conta WhatsApp Business Platform, número dedicado (não pode ser o número pessoal
já usado no app WhatsApp), verificação do negócio para sair do limite de teste.
- Mitigação: começar no dia 1, em paralelo ao código. Para uma casa (2–5 números) o
  modo de teste da Meta já permite até 5 números destinatários sem verificação, o que
  cobre o MVP.

### B3. Idempotência do webhook
A Meta reenvia eventos. Sem `wa_message_id` único, um "almoço feito" vira dois registros.
- Mitigação: tabela `wa_messages` com unique em `wa_message_id`; processar só na
  primeira inserção; responder 200 sempre e processar de forma assíncrona.

### B4. Scheduler confiável
Vercel Cron no plano Hobby não roda a cada minuto. Precisa de outro relógio.
- Mitigação: `pg_cron` (a cada minuto) + `pg_net` chamando a rota `/api/jobs/tick`
  com segredo. Tudo dentro do Supabase; sem serviço adicional. Alternativa: Inngest.

### B5. Timeouts em serverless
Transcrever áudio + chamar LLM + gravar + responder pode passar de 10s.
- Mitigação: webhook responde 200 imediatamente e enfileira (`wa_messages.status =
  'queued'`); o processamento roda em rota com `maxDuration` maior (Vercel Pro) ou em
  Edge Function do Supabase; usuário recebe "⏳" só se passar de 5 s.

### B6. LLM inventando dados
Se o modelo "acha" que o almoço tinha 600 kcal e grava sem base, o dashboard mente.
- Mitigação: toda escrita passa por tool tipada com Zod; estimativa calórica vem de
  `foods`/`meals` cadastrados ou é marcada `source = 'ai_estimate'` com aviso de
  incerteza; o modelo nunca escreve no banco diretamente.

### B7. Alucinação de horário/dia
"Amanhã", "sexta que vem", "daqui a 2h" dependem do relógio local.
- Mitigação: injetar `now` em hora local, dia da semana e fuso no prompt; resolver datas
  em código (biblioteca `chrono-node` em pt-BR ou `date-fns`) e pedir confirmação quando
  ambíguo.

### B8. Segurança do webhook e dos dados
- Validar `X-Hub-Signature-256` com o app secret.
- Só processar mensagens de números cadastrados em `members`; ignorar o resto (log).
- Service role apenas no servidor; RLS em todas as tabelas; painel web com Supabase Auth.
- Nunca logar corpo de mensagem em texto plano em logs de terceiros.

### B9. Custos crescendo com áudio e visão
Áudio (Whisper) e imagem (visão) custam mais que texto.
- Mitigação: limitar áudio a 60 s; foto de refeição fica para V2 com cap diário.

### B10. Vendor lock-in
- Mitigação: interface `WhatsAppProvider` (Cloud API hoje; Evolution/Twilio amanhã) e
  LLM via Vercel AI SDK (troca de OpenAI para Anthropic/Google por variável de ambiente).

## C. Riscos de produto (resumo; detalhe no doc 01)
Fadiga de notificação, agente prolixo, ajuste de dieta indevido, cardápio sem dados
estruturados, dependência de aprovação da Meta.
