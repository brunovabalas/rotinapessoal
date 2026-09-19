# Rotina Pessoal — assistente de rotina no WhatsApp

Sistema com agente de IA no WhatsApp para gestão de rotina pessoal e familiar:
rotina diária, dieta, treino, afazeres, reuniões, compromissos, listas de mercado,
metas, livros e insights com IA. O **Protocolo 30 Dias (Bruno & Bruna)** é o
primeiro "programa" que roda em cima dessa base.

> Estado atual: **fase de análise e planejamento**. Nenhum código de produto ainda.
> Este repositório contém a auditoria de produto, a arquitetura proposta, o modelo
> de dados, o desenho do agente, o esquema de notificações e o roadmap em tickets.

## Documentos

| # | Documento | Conteúdo |
|---|-----------|----------|
| 01 | [Auditoria de produto](docs/01-auditoria-de-produto.md) | O que o briefing acerta, onde diverge do pedido, personas, escopo MVP/V1/V2, riscos de produto |
| 02 | [Arquitetura técnica](docs/02-arquitetura.md) | Stack, fluxos, estrutura de pastas, decisões (WhatsApp, LLM, scheduler, hospedagem), segurança |
| 03 | [Modelo de dados](docs/03-modelo-de-dados.md) | Entidades, relacionamentos, regras, SQL completo para Supabase/Postgres com RLS |
| 04 | [Agente de IA](docs/04-agente-ia.md) | Fluxo reativo e proativo, ferramentas (tools), contexto, prompt, regras de recomendação, guardrails, custo |
| 05 | [Notificações](docs/05-notificacoes.md) | Motor de agendamento, janela de 24h do WhatsApp, templates, anti-fadiga, modos (viagem, descanso, dia corrido) |
| 06 | [Roadmap em tickets](docs/06-roadmap-tickets.md) | Épicos e tickets com dependências e tamanho |
| 07 | [Lacunas e riscos](docs/07-lacunas-e-riscos.md) | O que falta no briefing, riscos técnicos e de produto, mitigações |
| 08 | [Ordem de implementação](docs/08-ordem-de-implementacao.md) | Fases, o que entra em cada uma e as 3 decisões que precisam de confirmação |

Referências originais: [briefing](docs/referencia/briefing-projeto-30-dias.md) e
[protótipo HTML](docs/referencia/prototipo-html-projeto-30-dias.html).

## Resumo executivo

- **WhatsApp é o produto; a web é o painel.** O briefing original era web-first com
  WhatsApp "futuro". O pedido atual inverte isso, e a arquitetura proposta segue o pedido.
- **Modelo generalista com programas.** Em vez de `couple_profiles`, o núcleo é
  `households` com N `members`. O "Projeto 30 Dias" vira um `program` com metas por membro.
- **Stack proposta:** Next.js + Supabase (Postgres, Auth, Storage, pg_cron) + WhatsApp
  Cloud API (Meta) + OpenAI via Vercel AI SDK (provedor trocável) + Vercel.
- **Agente com ferramentas, não chat livre.** Toda mensagem vira uma chamada de
  ferramenta tipada (registrar refeição, marcar treino, adicionar item na lista...).
  O LLM interpreta; o código decide e grava.
- **Ajustes de dieta nunca são automáticos.** O agente propõe com base em tendência
  de 14 dias; o membro confirma.

## Próximo passo

Confirmar as três decisões listadas em
[docs/08-ordem-de-implementacao.md](docs/08-ordem-de-implementacao.md#decisões-que-precisam-de-confirmação)
e iniciar a Fase 0.
