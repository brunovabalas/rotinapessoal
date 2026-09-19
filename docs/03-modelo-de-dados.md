# 03 — Modelo de dados

## 1. Princípios

1. **Casa → membros → programas.** `households` é a raiz de tudo. `members` têm telefone
   (WhatsApp) e, opcionalmente, login no painel. `programs` (ex.: Protocolo 30 Dias) têm
   metas por membro com validade, para que um ajuste de calorias na semana 3 não reescreva
   a semana 1.
2. **Escopo explícito.** Entidades compartilháveis (`calendar_events`, `tasks`,
   `shopping_lists`, `checklists`, `goals`) têm `household_id` e um `member_id` opcional.
   `member_id = null` significa "da casa".
3. **Plano vs. execução.** Toda coisa planejada (rotina, cardápio, treino, evento) tem uma
   tabela de plano e uma tabela de log. Aderência é calculada comparando as duas.
4. **Recorrência sem quebra.** Rotina e eventos usam regra + tabela de exceções por data.
   Alterar uma ocorrência nunca reescreve a regra.
5. **Tempo.** Colunas `timestamptz` em UTC. Horários de rotina são `time` em hora local +
   `households.timezone`. Datas de log são `date` local.
6. **Tudo que o agente envia ou recebe fica registrado** (`wa_messages`,
   `ai_notifications`, `agent_runs`) para auditoria, idempotência e métricas.
7. **RLS em tudo.** Uma função `current_household_ids()` resolve as casas do usuário logado.

## 2. Mapa de entidades

```
households ─┬─ members ─┬─ member_facts (memória do agente)
            │           ├─ ai_preferences
            │           ├─ conversation_state (janela 24h, ação pendente)
            │           ├─ program_enrollments ── programs
            │           ├─ routine_templates ── routine_items ── routine_logs / routine_exceptions
            │           ├─ workout_plans ── workout_days ── workout_day_exercises ── exercises
            │           ├─ workout_sessions ── workout_set_logs / cardio_logs
            │           ├─ meal_logs, water_logs, step_logs, sleep_logs
            │           ├─ body_measurements, weekly_checkins
            │           ├─ books ── reading_logs
            │           ├─ ai_notifications, ai_insights, agent_runs, wa_messages
            ├─ meals ── meal_items ── foods ;  meal_portions (por membro) ; meal_substitutions
            ├─ meal_plans (cardápio semanal)
            ├─ calendar_events ── event_participants / event_overrides
            ├─ tasks
            ├─ checklists ── checklist_items
            ├─ shopping_lists ── shopping_items
            └─ goals ── goal_progress
```

## 3. Decisões de modelagem que respondem ao briefing

| Requisito | Como o modelo resolve |
|---|---|
| Mesma preparação, porções distintas | `meals` + `meal_items` (gramas base) + `meal_portions(member_id, multiplier ou overrides por item)` |
| Substituições equivalentes | `meal_substitutions(meal_item_id, food_id, grams)` |
| Cardápio repetido 4 semanas | `meal_plans` por `weekday` + `slot`, sem data; `program` define quantas semanas |
| Cardio início/meio/fim | `workout_days.cardio_start_min / cardio_mid_min / cardio_end_min` + `cardio_logs.position` |
| Carga/reps/séries/RPE/evolução | `workout_set_logs` (por série) + `workout_sessions.rpe`; evolução = query por exercício/semana |
| Rotina editável por usuário e por dia | `routine_templates(member_id, weekday_mask)` + `routine_exceptions(date)` |
| Alterar horário sem quebrar recorrência | `routine_exceptions(action = 'move', new_time)` e `event_overrides` |
| Eventos em conjunto aparecem para ambos | `event_participants` (N:N) |
| Peso diário existe, análise usa média semanal | `body_measurements` diário; view `v_weekly_weight` com média; `weekly_checkins.weight_avg` |
| Mudança de dieta só após tendência | `program_enrollments` versionado (`valid_from`); ajuste cria linha nova com `reason` |
| Agente considera contexto | View `v_member_day` agrega tudo do dia por membro (usada pelo `context.ts`) |
| Não punir | Nenhuma coluna de "falha"; `routine_logs.status` tem `done | skipped | missed` e o texto do agente é neutro |

## 4. SQL (Supabase / Postgres 15)

Arquivo alvo: `supabase/migrations/0001_init.sql`. Abaixo, o schema completo proposto.

> Validado em Postgres 16 local (com stub de `auth.users`): 48 tabelas, 2 views, RLS
> ativa em todas as tabelas, 50 políticas; inserções de exemplo, upsert de passos,
> deduplicação de notificações e as duas views funcionam.

```sql
-- =====================================================================
-- 0001_init.sql — Rotina Pessoal
-- =====================================================================
create extension if not exists "pgcrypto";
create extension if not exists "pg_cron";
create extension if not exists "pg_net";

-- ---------- enums ----------
create type member_role       as enum ('owner','adult','child');
create type routine_item_type as enum ('wake','devotional','meal','workout','walk','work','leisure','checkin','sleep','custom');
create type event_type        as enum ('devotional','workout','meal','work','appointment','church','leisure','checkin','weigh_in','walk','flex_meal','meeting','outing','custom');
create type participant_status as enum ('invited','accepted','declined');
create type log_status        as enum ('done','skipped','missed');
create type meal_slot         as enum ('breakfast','post_workout','lunch','snack','dinner','other');
create type log_source        as enum ('manual','whatsapp','ai_estimate','import');
create type cardio_position   as enum ('start','mid','end','standalone');
create type task_status       as enum ('open','done','cancelled');
create type goal_status       as enum ('active','done','paused','dropped');
create type book_status       as enum ('wishlist','reading','done','abandoned');
create type wa_direction      as enum ('inbound','outbound');
create type wa_msg_type       as enum ('text','audio','image','document','interactive','template','reaction','other');
create type wa_status         as enum ('queued','processing','processed','ignored','failed','sent','delivered','read');
create type notif_kind        as enum ('routine','event','workout','meal_suggestion','checkin_daily','checkin_weekly','nudge_steps','nudge_water','nudge_workout','digest','insight','custom');
create type notif_status      as enum ('queued','sent','delivered','read','failed','skipped');
create type day_mode          as enum ('normal','busy','travel','rest','eating_out');

-- ---------- casa e membros ----------
create table households (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  timezone    text not null default 'America/Sao_Paulo',
  settings    jsonb not null default '{}'::jsonb,   -- ex.: {"share_body_metrics_default": true}
  created_at  timestamptz not null default now()
);

create table members (
  id             uuid primary key default gen_random_uuid(),
  household_id   uuid not null references households(id) on delete cascade,
  auth_user_id   uuid unique references auth.users(id) on delete set null,
  name           text not null,
  phone_e164     text unique,                      -- '+5511999999999'; null para criança sem WhatsApp
  role           member_role not null default 'adult',
  sex            text check (sex in ('m','f','other')),
  birth_date     date,
  height_cm      numeric(5,1),
  steps_goal     int  not null default 8000,
  water_goal_ml  int  not null default 2000,
  share_body_metrics boolean not null default true,
  active         boolean not null default true,
  created_at     timestamptz not null default now()
);
create index on members (household_id);

-- memória do agente: fatos aprendidos ("não gosta de peixe", "treina na Smart Fit")
create table member_facts (
  id          uuid primary key default gen_random_uuid(),
  member_id   uuid not null references members(id) on delete cascade,
  key         text not null,
  value       text not null,
  source      text not null default 'whatsapp',
  created_at  timestamptz not null default now(),
  unique (member_id, key)
);

create table ai_preferences (
  member_id        uuid primary key references members(id) on delete cascade,
  language         text not null default 'pt-BR',
  tone             text not null default 'direto e acolhedor',
  quiet_start      time,                             -- ex.: 23:00
  quiet_end        time,                             -- ex.: 06:45
  max_per_day      int  not null default 12,
  digest_mode      boolean not null default false,   -- agrupa lembretes em 3 blocos/dia
  enabled_kinds    notif_kind[] not null default array['routine','event','workout','meal_suggestion','checkin_daily','checkin_weekly','nudge_steps','nudge_water','nudge_workout','digest','insight']::notif_kind[],
  updated_at       timestamptz not null default now()
);

-- estado da conversa (janela de 24h e ação pendente multi-turno)
create table conversation_state (
  member_id        uuid primary key references members(id) on delete cascade,
  last_inbound_at  timestamptz,
  last_outbound_at timestamptz,
  pending_action   jsonb,        -- {"tool":"log_weight","missing":["weight_kg"],"expires_at":...}
  updated_at       timestamptz not null default now()
);

-- modo do dia (viagem, descanso, dia corrido, refeição fora)
create table day_modes (
  id          uuid primary key default gen_random_uuid(),
  member_id   uuid not null references members(id) on delete cascade,
  date        date not null,
  mode        day_mode not null,
  note        text,
  unique (member_id, date)
);

-- ---------- programas e metas ----------
create table programs (
  id            uuid primary key default gen_random_uuid(),
  household_id  uuid not null references households(id) on delete cascade,
  name          text not null,                    -- 'Protocolo 30 Dias'
  start_date    date not null,
  end_date      date,
  description   text,
  created_at    timestamptz not null default now()
);

-- metas versionadas por membro
create table program_enrollments (
  id              uuid primary key default gen_random_uuid(),
  program_id      uuid not null references programs(id) on delete cascade,
  member_id       uuid not null references members(id) on delete cascade,
  valid_from      date not null,
  kcal_target     int,
  protein_g_min   int,
  protein_g_max   int,
  carbs_g_target  int,
  fat_g_target    int,
  training_focus  text,                           -- 'superior' | 'gluteos_pernas'
  weekly_workouts int default 5,
  flex_meals_per_week int default 1,
  reason          text,                           -- por que esta versão existe (ajuste semana 3...)
  created_at      timestamptz not null default now()
);
create index on program_enrollments (member_id, valid_from desc);

-- ---------- rotina ----------
create table routine_templates (
  id            uuid primary key default gen_random_uuid(),
  household_id  uuid not null references households(id) on delete cascade,
  member_id     uuid references members(id) on delete cascade,   -- null = vale para todos
  name          text not null,                                   -- 'Dias úteis', 'Fim de semana'
  weekday_mask  int  not null default 62,   -- bitmask dom=1 seg=2 ter=4 qua=8 qui=16 sex=32 sab=64 (62 = seg-sex)
  active        boolean not null default true,
  created_at    timestamptz not null default now()
);

create table routine_items (
  id               uuid primary key default gen_random_uuid(),
  template_id      uuid not null references routine_templates(id) on delete cascade,
  time_local       time not null,
  title            text not null,
  type             routine_item_type not null default 'custom',
  duration_min     int,
  description      text,
  reminder_offset_min int not null default 0,     -- 0 = na hora; 10 = 10 min antes
  remind           boolean not null default true,
  sort_order       int not null default 0
);
create index on routine_items (template_id, time_local);

create table routine_exceptions (
  id          uuid primary key default gen_random_uuid(),
  member_id   uuid not null references members(id) on delete cascade,
  item_id     uuid not null references routine_items(id) on delete cascade,
  date        date not null,
  action      text not null check (action in ('skip','move')),
  new_time    time,
  note        text,
  unique (member_id, item_id, date)
);

create table routine_logs (
  id          uuid primary key default gen_random_uuid(),
  member_id   uuid not null references members(id) on delete cascade,
  item_id     uuid not null references routine_items(id) on delete cascade,
  date        date not null,
  status      log_status not null,
  done_at     timestamptz,
  note        text,
  source      log_source not null default 'whatsapp',
  unique (member_id, item_id, date)
);

-- ---------- calendário ----------
create table calendar_events (
  id             uuid primary key default gen_random_uuid(),
  household_id   uuid not null references households(id) on delete cascade,
  created_by     uuid references members(id) on delete set null,
  title          text not null,
  type           event_type not null default 'custom',
  starts_at      timestamptz not null,
  ends_at        timestamptz,
  all_day        boolean not null default false,
  rrule          text,                          -- RFC 5545, ex.: 'FREQ=WEEKLY;BYDAY=SU'
  location       text,
  notes          text,
  reminder_min   int default 30,
  linked_workout_day_id uuid,                   -- vínculo opcional
  linked_meal_id uuid,
  created_at     timestamptz not null default now()
);
create index on calendar_events (household_id, starts_at);

create table event_participants (
  event_id   uuid not null references calendar_events(id) on delete cascade,
  member_id  uuid not null references members(id) on delete cascade,
  status     participant_status not null default 'accepted',
  primary key (event_id, member_id)
);

-- exceções de ocorrência recorrente
create table event_overrides (
  id             uuid primary key default gen_random_uuid(),
  event_id       uuid not null references calendar_events(id) on delete cascade,
  original_date  date not null,
  action         text not null check (action in ('cancel','move')),
  new_starts_at  timestamptz,
  new_ends_at    timestamptz,
  note           text,
  unique (event_id, original_date)
);

create table event_logs (
  event_id     uuid not null references calendar_events(id) on delete cascade,
  member_id    uuid not null references members(id) on delete cascade,
  date         date not null,
  status       log_status not null,
  done_at      timestamptz,
  primary key (event_id, member_id, date)
);

-- ---------- treino ----------
create table exercises (
  id            uuid primary key default gen_random_uuid(),
  name          text not null unique,
  muscle_group  text not null,      -- 'peito','costas','ombro','biceps','triceps','quadriceps','posterior','gluteos','panturrilha','core','cardio'
  equipment     text,
  is_cardio     boolean not null default false
);

create table workout_plans (
  id          uuid primary key default gen_random_uuid(),
  member_id   uuid not null references members(id) on delete cascade,
  name        text not null,                    -- 'Definição + foco superior'
  focus       text,
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);

create table workout_days (
  id                uuid primary key default gen_random_uuid(),
  plan_id           uuid not null references workout_plans(id) on delete cascade,
  weekday           int  not null check (weekday between 0 and 6),   -- 0 = domingo
  title             text not null,                                    -- 'Peito, ombro e tríceps'
  cardio_start_min  int not null default 8,
  cardio_mid_min    int not null default 0,
  cardio_end_min    int not null default 15,
  notes             text,
  unique (plan_id, weekday)
);

create table workout_day_exercises (
  id            uuid primary key default gen_random_uuid(),
  day_id        uuid not null references workout_days(id) on delete cascade,
  exercise_id   uuid not null references exercises(id),
  sort_order    int  not null default 0,
  sets          int  not null,
  rep_min       int,
  rep_max       int,
  duration_min  int,                             -- para core/cardio por tempo
  notes         text
);

create table workout_sessions (
  id              uuid primary key default gen_random_uuid(),
  member_id       uuid not null references members(id) on delete cascade,
  workout_day_id  uuid references workout_days(id) on delete set null,
  date            date not null,
  status          log_status not null default 'done',
  started_at      timestamptz,
  finished_at     timestamptz,
  rpe             int check (rpe between 1 and 10),
  notes           text,
  source          log_source not null default 'whatsapp',
  unique (member_id, date, workout_day_id)
);

create table workout_set_logs (
  id            uuid primary key default gen_random_uuid(),
  session_id    uuid not null references workout_sessions(id) on delete cascade,
  exercise_id   uuid not null references exercises(id),
  set_no        int  not null,
  reps          int,
  load_kg       numeric(6,2),
  rpe           int check (rpe between 1 and 10),
  unique (session_id, exercise_id, set_no)
);

create table cardio_logs (
  id           uuid primary key default gen_random_uuid(),
  member_id    uuid not null references members(id) on delete cascade,
  session_id   uuid references workout_sessions(id) on delete cascade,
  date         date not null,
  position     cardio_position not null default 'end',
  minutes      int  not null,
  modality     text,                              -- 'esteira','bike','caminhada'
  intensity    text check (intensity in ('leve','moderado','intenso')),
  source       log_source not null default 'whatsapp'
);

-- ---------- nutrição ----------
create table foods (
  id             uuid primary key default gen_random_uuid(),
  name           text not null unique,
  kcal_per_100g  numeric(7,2) not null,
  protein_g      numeric(6,2) not null default 0,
  carbs_g        numeric(6,2) not null default 0,
  fat_g          numeric(6,2) not null default 0,
  unit_label     text,                           -- 'ovo', 'fatia', 'scoop' (para porção por unidade)
  grams_per_unit numeric(6,2),                   -- 50 para ovo, 25 para fatia de pão
  is_high_volume boolean not null default false,
  source         text default 'TACO'
);

create table meals (
  id            uuid primary key default gen_random_uuid(),
  household_id  uuid not null references households(id) on delete cascade,
  name          text not null,                   -- 'Ovos + pão integral + mamão'
  slot          meal_slot not null,
  instructions  text,
  created_at    timestamptz not null default now()
);

create table meal_items (
  id         uuid primary key default gen_random_uuid(),
  meal_id    uuid not null references meals(id) on delete cascade,
  food_id    uuid not null references foods(id),
  grams      numeric(7,2) not null,              -- porção base
  sort_order int not null default 0
);

-- porção por membro: multiplicador geral ou override por item
create table meal_portions (
  meal_id     uuid not null references meals(id) on delete cascade,
  member_id   uuid not null references members(id) on delete cascade,
  multiplier  numeric(4,2) not null default 1.0,
  overrides   jsonb not null default '{}'::jsonb,   -- {"<meal_item_id>": grams}
  primary key (meal_id, member_id)
);

create table meal_substitutions (
  id            uuid primary key default gen_random_uuid(),
  meal_item_id  uuid not null references meal_items(id) on delete cascade,
  food_id       uuid not null references foods(id),
  grams         numeric(7,2) not null,
  note          text
);

-- cardápio semanal (repete N semanas)
create table meal_plans (
  id            uuid primary key default gen_random_uuid(),
  household_id  uuid not null references households(id) on delete cascade,
  program_id    uuid references programs(id) on delete cascade,
  weekday       int not null check (weekday between 0 and 6),
  slot          meal_slot not null,
  meal_id       uuid not null references meals(id) on delete cascade,
  unique (household_id, program_id, weekday, slot)
);

create table meal_logs (
  id            uuid primary key default gen_random_uuid(),
  member_id     uuid not null references members(id) on delete cascade,
  date          date not null,
  slot          meal_slot not null,
  meal_id       uuid references meals(id) on delete set null,
  description   text,                            -- texto livre quando fora do cardápio
  kcal          numeric(7,1),
  protein_g     numeric(6,1),
  carbs_g       numeric(6,1),
  fat_g         numeric(6,1),
  is_flex_meal  boolean not null default false,
  followed_plan boolean,                         -- comeu o que estava previsto?
  source        log_source not null default 'whatsapp',
  logged_at     timestamptz not null default now()
);
create index on meal_logs (member_id, date);

create table water_logs (
  id         uuid primary key default gen_random_uuid(),
  member_id  uuid not null references members(id) on delete cascade,
  date       date not null,
  ml         int  not null,
  logged_at  timestamptz not null default now(),
  source     log_source not null default 'whatsapp'
);
create index on water_logs (member_id, date);

create table step_logs (
  member_id  uuid not null references members(id) on delete cascade,
  date       date not null,
  steps      int  not null,
  source     log_source not null default 'whatsapp',
  logged_at  timestamptz not null default now(),
  primary key (member_id, date)                  -- um total por dia (upsert)
);

create table sleep_logs (
  member_id   uuid not null references members(id) on delete cascade,
  date        date not null,                     -- data em que acordou
  bed_at      timestamptz,
  wake_at     timestamptz,
  hours       numeric(4,2),
  quality     int check (quality between 1 and 5),
  source      log_source not null default 'whatsapp',
  primary key (member_id, date)
);

-- ---------- corpo e check-ins ----------
create table body_measurements (
  id               uuid primary key default gen_random_uuid(),
  member_id        uuid not null references members(id) on delete cascade,
  measured_at      timestamptz not null default now(),
  date             date not null,
  weight_kg        numeric(5,2),
  waist_cm         numeric(5,1),
  hip_cm           numeric(5,1),
  photo_front_path text,                         -- storage privado
  photo_side_path  text,
  note             text,
  source           log_source not null default 'whatsapp'
);
create index on body_measurements (member_id, date desc);

create table weekly_checkins (
  id              uuid primary key default gen_random_uuid(),
  member_id       uuid not null references members(id) on delete cascade,
  week_start      date not null,                 -- segunda-feira
  weight_avg_kg   numeric(5,2),
  waist_cm        numeric(5,1),
  steps_avg       int,
  workouts_done   int,
  workouts_planned int,
  diet_adherence  int check (diet_adherence between 0 and 100),
  hunger          int check (hunger between 1 and 5),
  sleep           int check (sleep between 1 and 5),
  energy          int check (energy between 1 and 5),
  notes           text,
  ai_summary      text,
  created_at      timestamptz not null default now(),
  unique (member_id, week_start)
);

-- ---------- tarefas, checklists, listas, metas, livros ----------
create table tasks (
  id            uuid primary key default gen_random_uuid(),
  household_id  uuid not null references households(id) on delete cascade,
  assignee_id   uuid references members(id) on delete set null,   -- null = da casa
  created_by    uuid references members(id) on delete set null,
  title         text not null,
  category      text,                            -- 'casa','trabalho','financeiro','compras','saude'
  due_at        timestamptz,
  rrule         text,
  status        task_status not null default 'open',
  done_at       timestamptz,
  reminder_min  int,
  created_at    timestamptz not null default now()
);
create index on tasks (household_id, status, due_at);

create table checklists (
  id            uuid primary key default gen_random_uuid(),
  household_id  uuid not null references households(id) on delete cascade,
  member_id     uuid references members(id) on delete cascade,
  name          text not null,                   -- 'Mala de viagem', 'Limpeza semanal'
  reusable      boolean not null default true,
  created_at    timestamptz not null default now()
);

create table checklist_items (
  id            uuid primary key default gen_random_uuid(),
  checklist_id  uuid not null references checklists(id) on delete cascade,
  text          text not null,
  done          boolean not null default false,
  done_by       uuid references members(id) on delete set null,
  done_at       timestamptz,
  sort_order    int not null default 0
);

create table shopping_lists (
  id            uuid primary key default gen_random_uuid(),
  household_id  uuid not null references households(id) on delete cascade,
  name          text not null,                   -- 'Mercado', 'Casa'
  kind          text not null default 'market' check (kind in ('market','home','pharmacy','other')),
  archived      boolean not null default false,
  created_at    timestamptz not null default now()
);

create table shopping_items (
  id         uuid primary key default gen_random_uuid(),
  list_id    uuid not null references shopping_lists(id) on delete cascade,
  name       text not null,
  qty        numeric(8,2),
  unit       text,
  category   text,                               -- 'hortifruti','proteina','limpeza'...
  checked    boolean not null default false,
  added_by   uuid references members(id) on delete set null,
  created_at timestamptz not null default now()
);
create index on shopping_items (list_id, checked);

create table goals (
  id            uuid primary key default gen_random_uuid(),
  household_id  uuid not null references households(id) on delete cascade,
  member_id     uuid references members(id) on delete cascade,   -- null = meta da casa
  title         text not null,
  category      text,                            -- 'corpo','financeiro','leitura','espiritual','casa'
  target_value  numeric(12,2),
  current_value numeric(12,2) default 0,
  unit          text,
  deadline      date,
  status        goal_status not null default 'active',
  created_at    timestamptz not null default now()
);

create table goal_progress (
  id        uuid primary key default gen_random_uuid(),
  goal_id   uuid not null references goals(id) on delete cascade,
  value     numeric(12,2) not null,
  note      text,
  at        timestamptz not null default now()
);

create table books (
  id           uuid primary key default gen_random_uuid(),
  member_id    uuid not null references members(id) on delete cascade,
  title        text not null,
  author       text,
  total_pages  int,
  current_page int not null default 0,
  status       book_status not null default 'reading',
  started_at   date,
  finished_at  date,
  rating       int check (rating between 1 and 5),
  notes        text,
  created_at   timestamptz not null default now()
);

create table reading_logs (
  id        uuid primary key default gen_random_uuid(),
  book_id   uuid not null references books(id) on delete cascade,
  at        timestamptz not null default now(),
  to_page   int not null,
  minutes   int,
  note      text                                  -- insight/frase marcada
);

-- ---------- WhatsApp, notificações, IA ----------
create table wa_messages (
  id                 uuid primary key default gen_random_uuid(),
  wa_message_id      text unique,                -- id da Meta (idempotência)
  member_id          uuid references members(id) on delete set null,
  phone_e164         text not null,
  direction          wa_direction not null,
  type               wa_msg_type not null default 'text',
  body               text,                       -- texto ou transcrição
  media_path         text,
  payload            jsonb,                      -- payload bruto (sem PII extra)
  status             wa_status not null default 'queued',
  error              text,
  created_at         timestamptz not null default now(),
  processed_at       timestamptz
);
create index on wa_messages (member_id, created_at desc);
create index on wa_messages (status) where status in ('queued','processing');

create table ai_notifications (
  id                  uuid primary key default gen_random_uuid(),
  member_id           uuid not null references members(id) on delete cascade,
  kind                notif_kind not null,
  dedupe_key          text not null unique,      -- 'member|kind|ref|date|HH:MM'
  scheduled_for       timestamptz not null,
  body                text,                      -- texto final (ou variáveis do template)
  buttons             jsonb,                     -- [{"id":"done","title":"Feito ✅"}]
  template_name       text,                      -- se enviado fora da janela de 24h
  status              notif_status not null default 'queued',
  attempts            int not null default 0,
  provider_message_id text,
  error               text,
  sent_at             timestamptz,
  created_at          timestamptz not null default now()
);
create index on ai_notifications (status, scheduled_for);
create index on ai_notifications (member_id, scheduled_for desc);

create table ai_insights (
  id          uuid primary key default gen_random_uuid(),
  member_id   uuid not null references members(id) on delete cascade,
  period_start date not null,
  period_end   date not null,
  kind        text not null,                     -- 'weekly_summary','diet_adjustment_proposal','reading','goals'
  content     text not null,
  data        jsonb,                             -- números usados (para auditoria)
  model       text,
  created_at  timestamptz not null default now()
);

create table agent_runs (
  id             uuid primary key default gen_random_uuid(),
  member_id      uuid references members(id) on delete set null,
  wa_message_id  uuid references wa_messages(id) on delete set null,
  model          text,
  tools_called   jsonb,
  input_tokens   int,
  output_tokens  int,
  cost_usd       numeric(8,5),
  latency_ms     int,
  error          text,
  created_at     timestamptz not null default now()
);

-- ---------- views de apoio ao agente e ao dashboard ----------
create view v_daily_totals as
select m.id as member_id, d.date,
  coalesce((select sum(kcal)      from meal_logs  where member_id = m.id and date = d.date), 0) as kcal,
  coalesce((select sum(protein_g) from meal_logs  where member_id = m.id and date = d.date), 0) as protein_g,
  coalesce((select sum(ml)        from water_logs where member_id = m.id and date = d.date), 0) as water_ml,
  coalesce((select steps          from step_logs  where member_id = m.id and date = d.date), 0) as steps,
  exists (select 1 from workout_sessions where member_id = m.id and date = d.date and status = 'done') as workout_done,
  (select count(*) from routine_logs where member_id = m.id and date = d.date and status = 'done') as routine_done
from members m
cross join lateral (select distinct date from meal_logs where member_id = m.id
                    union select date from water_logs where member_id = m.id
                    union select date from step_logs where member_id = m.id
                    union select date from workout_sessions where member_id = m.id
                    union select date from routine_logs where member_id = m.id) d;

create view v_weekly_weight as
select member_id, date_trunc('week', date)::date as week_start,
       round(avg(weight_kg)::numeric, 2) as weight_avg_kg,
       round(avg(waist_cm)::numeric, 1)  as waist_avg_cm,
       count(*) as samples
from body_measurements
where weight_kg is not null
group by member_id, date_trunc('week', date);

-- ---------- RLS ----------
create or replace function current_household_ids() returns setof uuid
language sql stable security definer set search_path = public as $$
  select household_id from members where auth_user_id = auth.uid()
$$;

create or replace function current_member_id() returns uuid
language sql stable security definer set search_path = public as $$
  select id from members where auth_user_id = auth.uid() limit 1
$$;

-- padrão: tabelas com household_id → visíveis para quem é da casa
do $$
declare t text;
begin
  foreach t in array array['households','routine_templates','calendar_events','meals','meal_plans','tasks','checklists','shopping_lists','goals','programs']
  loop
    execute format('alter table %I enable row level security', t);
    if t = 'households' then
      execute 'create policy hh_select on households for select using (id in (select current_household_ids()))';
      execute 'create policy hh_update on households for update using (id in (select current_household_ids()))';
    else
      execute format('create policy %I_all on %I for all using (household_id in (select current_household_ids())) with check (household_id in (select current_household_ids()))', t, t);
    end if;
  end loop;
end $$;

-- tabelas com member_id → visíveis para a casa do membro (dados corporais respeitam share_body_metrics)
do $$
declare t text;
begin
  foreach t in array array['members','member_facts','ai_preferences','conversation_state','day_modes','program_enrollments',
                           'routine_exceptions','routine_logs','workout_plans','workout_sessions','cardio_logs',
                           'meal_logs','water_logs','step_logs','sleep_logs','weekly_checkins','books','ai_notifications','ai_insights','agent_runs']
  loop
    execute format('alter table %I enable row level security', t);
    if t = 'members' then
      execute 'create policy members_all on members for all using (household_id in (select current_household_ids())) with check (household_id in (select current_household_ids()))';
    else
      execute format('create policy %I_all on %I for all using (member_id in (select id from members where household_id in (select current_household_ids()))) with check (member_id in (select id from members where household_id in (select current_household_ids())))', t, t);
    end if;
  end loop;
end $$;

alter table body_measurements enable row level security;
create policy body_own    on body_measurements for all using (member_id = current_member_id()) with check (member_id = current_member_id());
create policy body_shared on body_measurements for select using (
  member_id in (select id from members where household_id in (select current_household_ids()) and share_body_metrics)
);

-- tabelas filhas (via pai)
alter table routine_items enable row level security;
create policy ri_all on routine_items for all using (template_id in (select id from routine_templates where household_id in (select current_household_ids())));
alter table event_participants enable row level security;
create policy ep_all on event_participants for all using (event_id in (select id from calendar_events where household_id in (select current_household_ids())));
alter table event_overrides enable row level security;
create policy eo_all on event_overrides for all using (event_id in (select id from calendar_events where household_id in (select current_household_ids())));
alter table event_logs enable row level security;
create policy el_all on event_logs for all using (event_id in (select id from calendar_events where household_id in (select current_household_ids())));
alter table workout_days enable row level security;
create policy wd_all on workout_days for all using (plan_id in (select id from workout_plans where member_id in (select id from members where household_id in (select current_household_ids()))));
alter table workout_day_exercises enable row level security;
create policy wde_all on workout_day_exercises for all using (day_id in (select d.id from workout_days d join workout_plans p on p.id = d.plan_id where p.member_id in (select id from members where household_id in (select current_household_ids()))));
alter table workout_set_logs enable row level security;
create policy wsl_all on workout_set_logs for all using (session_id in (select id from workout_sessions where member_id in (select id from members where household_id in (select current_household_ids()))));
alter table meal_items enable row level security;
create policy mi_all on meal_items for all using (meal_id in (select id from meals where household_id in (select current_household_ids())));
alter table meal_portions enable row level security;
create policy mp_all on meal_portions for all using (meal_id in (select id from meals where household_id in (select current_household_ids())));
alter table meal_substitutions enable row level security;
create policy ms_all on meal_substitutions for all using (meal_item_id in (select i.id from meal_items i join meals m on m.id = i.meal_id where m.household_id in (select current_household_ids())));
alter table checklist_items enable row level security;
create policy ci_all on checklist_items for all using (checklist_id in (select id from checklists where household_id in (select current_household_ids())));
alter table shopping_items enable row level security;
create policy si_all on shopping_items for all using (list_id in (select id from shopping_lists where household_id in (select current_household_ids())));
alter table goal_progress enable row level security;
create policy gp_all on goal_progress for all using (goal_id in (select id from goals where household_id in (select current_household_ids())));
alter table reading_logs enable row level security;
create policy rl_all on reading_logs for all using (book_id in (select id from books where member_id in (select id from members where household_id in (select current_household_ids()))));

-- catálogos públicos (leitura para autenticados; escrita só service role)
alter table exercises enable row level security;
create policy ex_read on exercises for select to authenticated using (true);
alter table foods enable row level security;
create policy fd_read on foods for select to authenticated using (true);

-- wa_messages: só o servidor (service role) lê e escreve; membros veem as próprias
alter table wa_messages enable row level security;
create policy wa_own on wa_messages for select using (member_id = current_member_id());

-- ---------- scheduler ----------
-- Chama o tick a cada minuto. A URL e o segredo ficam em vault/settings do projeto.
-- select cron.schedule('tick', '* * * * *', $$
--   select net.http_post(
--     url := current_setting('app.tick_url'),
--     headers := jsonb_build_object('x-job-secret', current_setting('app.job_secret'), 'content-type', 'application/json'),
--     body := '{}'::jsonb
--   );
-- $$);
```

## 5. Seeds (arquivo `supabase/seed/`)

- `foods.sql`: ~80 alimentos da tabela TACO usados no cardápio (ovo, pão integral,
  mamão, iogurte, aveia, banana, whey, frango, patinho, peixe, arroz, feijão, batata,
  vegetais de alto volume...).
- `exercises.sql`: os ~35 exercícios dos treinos de Bruno e Bruna.
- `demo_household.sql`: casa "Bruno & Bruna", 2 membros, programa "Protocolo 30 Dias",
  metas (1.900/140–150 g e 1.500/105–115 g), rotina de dias úteis (13 itens do
  briefing), rotina de fim de semana, treinos por dia, refeições do cardápio semanal
  com porções por membro.

## 6. Consultas que o agente e o dashboard vão precisar (para guiar índices)

| Pergunta | Fonte |
|---|---|
| O que está previsto para o membro hoje? | `routine_items` (template do dia da semana) − `routine_exceptions` + `calendar_events` expandidos + `workout_days[weekday]` + `meal_plans[weekday]` |
| Quanto falta de kcal/proteína hoje? | `program_enrollments` (vigente) − `v_daily_totals` |
| Adesão da semana | `routine_logs` vs itens previstos; `workout_sessions` vs `workout_days`; `meal_logs.followed_plan` |
| Tendência de 14 dias | `v_weekly_weight` (2 semanas) + `body_measurements.waist_cm` |
| Evolução de carga | `workout_set_logs` join `workout_sessions` por exercício e semana |
| Lista de mercado atual | `shopping_items where checked = false` |
| Ritmo de leitura | `reading_logs` (páginas/dia) e previsão de término |
