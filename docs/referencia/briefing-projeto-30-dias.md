# BRIEFING PARA CLAUDE CODE
## Projeto: Sistema de rotina, dieta, treino e agente de IA para Bruno & Bruna

### 1. Objetivo do produto
Criar um sistema web compartilhado para um casal acompanhar um protocolo de 30 dias focado em:
- redução de gordura corporal;
- diminuição de circunferência abdominal;
- definição muscular;
- musculação 5x por semana;
- cardio fracionado;
- alimentação hipocalórica com alto volume e proteína adequada;
- rotina diária com horários;
- devocional cristão como primeira atividade do dia;
- calendário compartilhado;
- agente de IA com lembretes, acompanhamento e recomendações contextuais.

O sistema não deve funcionar apenas como uma agenda. Ele deve funcionar como um "coach operacional" do casal.

---

## 2. Usuários

### Bruno
- Altura: 1,70 m
- Peso inicial: 80 kg
- Meta calórica inicial: ~1.900 kcal/dia
- Proteína: 140–150 g/dia
- Foco de treino: definição muscular e maior ênfase em parte superior.
- Treino: segunda a sexta.

### Bruna
- Altura: 1,60 m
- Peso inicial: 65 kg
- Meta calórica inicial: ~1.500 kcal/dia
- Proteína: 105–115 g/dia
- Foco de treino: definição muscular e maior ênfase em glúteos/pernas.
- Treino: segunda a sexta.

As refeições devem usar os mesmos alimentos sempre que possível, mudando apenas as porções.

---

## 3. Filosofia do sistema
O sistema deve priorizar:
1. simplicidade;
2. consistência;
3. visão conjunta do casal;
4. baixo atrito para registrar dados;
5. lembretes inteligentes;
6. histórico de execução;
7. adaptação futura por IA.

Não trabalhar com a promessa de “perder gordura localizada”. O conceito correto é redução de gordura corporal total, preservação de massa muscular e acompanhamento da circunferência abdominal.

---

## 4. Rotina-base do casal

### Segunda a sexta
- 07:00 — acordar
- 07:10 — devocional
- 07:35 — café da manhã rápido
- 08:00 — treino
- 09:20 — lanche pós-treino
- 10:00 — trabalho
- 12:30 — almoço
- 13:15 — caminhada curta quando possível
- 13:30 — trabalho
- 16:30 — lanche
- 17:00 — trabalho
- 19:30 — jantar/lazer
- 22:15 — desacelerar/check-in
- 23:00 — dormir

A rotina deve ser editável por usuário e por dia.

---

## 5. Estrutura de treino

### Bruno
Foco:
- definição;
- parte superior;
- musculação + cardio;
- 5 sessões semanais.

Cardio:
- 8 min de aquecimento leve;
- 15–20 min de cardio ao final;
- terça e sexta podem ter 6 min extras de cardio moderado no meio.

Divisão:
- Segunda: peito, ombro, tríceps;
- Terça: costas, bíceps, core;
- Quarta: pernas, core;
- Quinta: superior completo;
- Sexta: ombros, braços, definição.

### Bruna
Foco:
- definição;
- glúteos e pernas;
- 3 inferiores + 2 superiores.

Divisão:
- Segunda: glúteos + quadríceps;
- Terça: superior + core;
- Quarta: posterior + glúteos;
- Quinta: superior + core;
- Sexta: glúteos + quadríceps.

Cardio:
- 8 min de aquecimento;
- 15–25 min ao final dependendo do dia.

O sistema deve permitir registrar:
- carga;
- repetições;
- séries;
- exercício concluído;
- cardio realizado;
- percepção de esforço;
- observações;
- evolução de carga por semana.

---

## 6. Nutrição

### Metas iniciais
Bruno:
- ~1.900 kcal/dia;
- 140–150 g proteína.

Bruna:
- ~1.500 kcal/dia;
- 105–115 g proteína.

### Princípios
- proteína em todas as refeições;
- alto volume de vegetais;
- carboidrato controlado;
- arroz e feijão permitidos;
- evitar excesso de óleos/molhos;
- manter hidratação;
- 1 refeição flexível semanal;
- álcool idealmente zero durante os 30 dias.

### Refeições
1. café da manhã pré-treino;
2. lanche pós-treino;
3. almoço;
4. lanche da tarde;
5. jantar.

O sistema deve suportar:
- refeições cadastradas;
- alimentos;
- porção Bruno;
- porção Bruna;
- calorias;
- proteínas;
- carboidratos;
- gorduras;
- substituições equivalentes;
- cardápio semanal;
- repetição do cardápio por 4 semanas;
- sugestão automática de refeição conforme horário.

---

## 7. Agente de IA

### Papel
O agente deve atuar como:
- lembrete;
- assistente de rotina;
- coach de consistência;
- guia de treino;
- auxiliar de alimentação;
- organizador do calendário do casal.

### Exemplos de mensagens
07:10:
"Bom dia. Hora do devocional. Separem 20 minutos antes de iniciar o restante do dia."

07:35:
"Hoje o café sugerido é ovos, pão integral e mamão. Bruno: 3 ovos e 2 fatias. Bruna: 2 ovos e 1 fatia."

08:00:
"Hoje é terça-feira. Bruno: costas, bíceps e core. Bruna: superior + core. Comecem com 8 min de cardio leve."

12:30:
"Hora do almoço. Meta: proteína + arroz + feijão + vegetais. Bruno e Bruna têm porções diferentes, mas podem comer a mesma preparação."

22:15:
"Check-in do dia: treino, alimentação, passos, água e preparação para amanhã."

### Inteligência contextual desejada
O agente deve conseguir considerar:
- dia da semana;
- usuário;
- treino previsto;
- treino concluído;
- calorias consumidas;
- refeições ainda disponíveis;
- passos acumulados;
- água;
- horário;
- compromissos do calendário;
- peso e cintura;
- frequência de adesão;
- sono.

### Regra importante
O agente não deve fazer alterações agressivas de dieta baseado em um único dia ou em flutuações normais de peso.

---

## 8. Calendário compartilhado
Criar uma visão conjunta Bruno + Bruna.

Tipos de evento:
- devocional;
- treino;
- refeição;
- trabalho;
- compromisso;
- igreja;
- lazer;
- check-in;
- pesagem;
- caminhada;
- refeição flexível.

Cada evento deve aceitar:
- responsável: Bruno, Bruna ou Ambos;
- horário;
- recorrência;
- lembrete;
- status;
- observação;
- vínculo com treino/refeição quando aplicável.

---

## 9. Dashboard

O dashboard inicial deve mostrar:

### Hoje
- data;
- dia da semana;
- próximos eventos;
- treino de cada um;
- refeições pendentes;
- passos;
- água;
- calorias;
- proteína;
- rotina concluída em %.

### Resumo Bruno
- peso;
- cintura;
- calorias;
- proteína;
- passos;
- treino;
- sequência atual.

### Resumo Bruna
Mesmas métricas.

### Progresso de 30 dias
- peso;
- cintura;
- aderência;
- treinos;
- passos médios;
- comparação semana a semana.

---

## 10. Check-in semanal
Preferencialmente sábado pela manhã.

Registrar:
- peso;
- cintura;
- foto frontal;
- foto lateral;
- média de passos;
- quantidade de treinos;
- aderência alimentar;
- percepção de fome;
- sono;
- energia;
- observações.

Não usar apenas peso como métrica.

---

## 11. Banco de dados sugerido

Tabelas:
- users
- couple_profiles
- routines
- routine_items
- calendar_events
- workouts
- workout_days
- exercises
- workout_logs
- cardio_logs
- foods
- meals
- meal_items
- meal_plans
- meal_logs
- water_logs
- step_logs
- sleep_logs
- body_measurements
- weekly_checkins
- ai_notifications
- ai_preferences

---

## 12. Regras de negócio importantes

1. Bruno e Bruna compartilham preparação, mas possuem porções distintas.
2. Cada treino deve ser específico por usuário.
3. Cardio pode ser dividido em início, meio e final.
4. Rotina deve permitir exceções.
5. Eventos em conjunto devem aparecer para ambos.
6. O agente deve enviar alertas contextuais, não apenas mensagens fixas.
7. O sistema deve registrar aderência sem criar sensação de punição.
8. Peso diário pode existir, mas análises devem preferir média semanal.
9. Mudança de dieta deve ser feita apenas após análise de tendência.
10. Permitir que o usuário altere horários sem quebrar a recorrência completa.

---

## 13. UX/UI
Estética desejada:
- premium;
- clara;
- moderna;
- mobile-first;
- inspiração Apple;
- cards;
- bastante espaço;
- visual limpo;
- gráficos simples;
- progresso fácil de entender.

Telas principais:
1. Home/Dashboard
2. Hoje
3. Rotina
4. Calendário
5. Alimentação
6. Treino
7. Progresso
8. Agente IA
9. Perfil
10. Configurações

---

## 14. Próximas melhorias que o Claude deve propor

Quero que você analise este projeto e proponha:
- melhor arquitetura;
- melhor modelagem de dados;
- componentes React/Next.js;
- banco Supabase;
- autenticação;
- calendário recorrente;
- notificações;
- agente de IA;
- cron jobs;
- regras para recomendações;
- histórico;
- gráficos;
- UX mobile;
- sincronização futura com Apple Health/Google Fit;
- integração futura com WhatsApp;
- progressão automática de treino;
- substituições alimentares;
- biblioteca de refeições;
- modo "dia corrido";
- modo "refeição fora";
- modo "viagem";
- modo "descanso".

Também quero que identifique riscos técnicos, pontos que faltam e melhorias no produto antes da implementação.

---

## 15. Segurança e saúde
Este sistema não é diagnóstico médico.
O produto deve:
- evitar recomendações extremas;
- evitar reduções abruptas de calorias;
- sinalizar quando o usuário reportar tontura, fraqueza, dor anormal ou lesão;
- orientar avaliação profissional quando necessário;
- não prometer redução localizada de gordura;
- permitir ajustes individualizados por profissional de saúde.

---

## 16. Primeiro pedido ao Claude Code

"Analise todo este briefing e o HTML de referência. Não implemente imediatamente. Primeiro:
1. faça uma auditoria de produto;
2. proponha arquitetura técnica;
3. proponha banco de dados;
4. proponha fluxo do agente de IA;
5. proponha estrutura de notificações;
6. proponha roadmap em tickets;
7. identifique o que está faltando;
8. só depois apresente a ordem ideal de implementação."

