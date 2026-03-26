-- hackathon-3/learnflow-app/supabase-schema.sql
-- LearnFlow App — Supabase PostgreSQL Schema
-- Enable pgvector extension for future embedding support
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS vector;

-- ── modules ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS modules (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name         TEXT NOT NULL,
  slug         TEXT UNIQUE NOT NULL,
  description  TEXT NOT NULL DEFAULT '',
  "order"      INTEGER NOT NULL DEFAULT 0,
  total_topics INTEGER NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_modules_slug ON modules(slug);
CREATE INDEX IF NOT EXISTS idx_modules_order ON modules("order");

-- Seed: 8 Python learning modules
INSERT INTO modules (name, slug, description, "order", total_topics) VALUES
  ('Python Basics',        'basics',          'Variables, data types, operators, control flow, and basic I/O', 1, 10),
  ('Data Structures',      'data-structures', 'Lists, tuples, sets, dictionaries, and comprehensions',         2, 8),
  ('Functions',            'functions',       'Defining functions, scope, closures, lambdas, and recursion',   3, 7),
  ('Object-Oriented Programming', 'oop',      'Classes, inheritance, encapsulation, polymorphism, and dunder methods', 4, 9),
  ('Error Handling',       'error-handling',  'Exceptions, try/except/finally, custom exceptions, and debugging', 5, 6),
  ('File I/O',             'file-io',         'Reading/writing files, CSV, JSON, pathlib, and context managers', 6, 6),
  ('Decorators',           'decorators',      'Function decorators, class decorators, functools, and metaprogramming', 7, 5),
  ('Async Programming',    'async',           'asyncio, async/await, coroutines, tasks, and aiohttp',          8, 7)
ON CONFLICT (slug) DO NOTHING;

-- ── exercises ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS exercises (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  module_slug TEXT NOT NULL REFERENCES modules(slug) ON DELETE CASCADE,
  topic       TEXT NOT NULL,
  prompt      TEXT NOT NULL,
  test_cases  JSONB NOT NULL DEFAULT '[]',
  difficulty  TEXT NOT NULL DEFAULT 'beginner' CHECK (difficulty IN ('beginner','intermediate','advanced')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_exercises_module_slug ON exercises(module_slug);
CREATE INDEX IF NOT EXISTS idx_exercises_difficulty  ON exercises(difficulty);

-- ── submissions ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS submissions (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     TEXT NOT NULL,
  exercise_id UUID NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
  code        TEXT NOT NULL,
  passed      BOOLEAN NOT NULL DEFAULT FALSE,
  score       NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (score >= 0 AND score <= 100),
  output      TEXT NOT NULL DEFAULT '',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_submissions_user_id      ON submissions(user_id);
CREATE INDEX IF NOT EXISTS idx_submissions_exercise_id  ON submissions(exercise_id);
CREATE INDEX IF NOT EXISTS idx_submissions_created_at   ON submissions(created_at DESC);

-- Composite index for user exercise history
CREATE INDEX IF NOT EXISTS idx_submissions_user_exercise
  ON submissions(user_id, exercise_id, created_at DESC);

-- ── progress ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS progress (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id        TEXT NOT NULL,
  module_slug    TEXT NOT NULL REFERENCES modules(slug) ON DELETE CASCADE,
  mastery_score  NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (mastery_score >= 0 AND mastery_score <= 100),
  attempts       INTEGER NOT NULL DEFAULT 0,
  last_activity  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, module_slug)
);

CREATE INDEX IF NOT EXISTS idx_progress_user_id     ON progress(user_id);
CREATE INDEX IF NOT EXISTS idx_progress_module_slug ON progress(module_slug);
CREATE INDEX IF NOT EXISTS idx_progress_mastery     ON progress(user_id, mastery_score DESC);

-- ── struggle_alerts ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS struggle_alerts (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     TEXT NOT NULL,
  module_slug TEXT NOT NULL REFERENCES modules(slug) ON DELETE CASCADE,
  alert_type  TEXT NOT NULL DEFAULT 'low_score'
              CHECK (alert_type IN ('low_score','repeated_failure','stuck','inactivity')),
  details     JSONB NOT NULL DEFAULT '{}',
  resolved    BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_struggle_alerts_user_id     ON struggle_alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_struggle_alerts_module_slug ON struggle_alerts(module_slug);
CREATE INDEX IF NOT EXISTS idx_struggle_alerts_resolved    ON struggle_alerts(resolved, created_at DESC);

-- Realtime: enable for teacher dashboard
ALTER TABLE struggle_alerts REPLICA IDENTITY FULL;

-- ── Row Level Security ─────────────────────────────────────────────────────────
ALTER TABLE modules     ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercises   ENABLE ROW LEVEL SECURITY;
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE progress    ENABLE ROW LEVEL SECURITY;
ALTER TABLE struggle_alerts ENABLE ROW LEVEL SECURITY;

-- Modules: public read, admin write
CREATE POLICY "modules_public_read" ON modules FOR SELECT USING (true);

-- Exercises: public read
CREATE POLICY "exercises_public_read" ON exercises FOR SELECT USING (true);

-- Submissions: users can only see their own
CREATE POLICY "submissions_own_data" ON submissions
  FOR ALL USING (user_id = auth.uid()::text);

-- Progress: users can only see/modify their own
CREATE POLICY "progress_own_data" ON progress
  FOR ALL USING (user_id = auth.uid()::text);

-- Struggle alerts: users see their own; service_role sees all (for teacher dashboard)
CREATE POLICY "struggle_alerts_own_data" ON struggle_alerts
  FOR SELECT USING (user_id = auth.uid()::text);

-- ── Helper function: upsert mastery ───────────────────────────────────────────
CREATE OR REPLACE FUNCTION upsert_mastery(
  p_user_id TEXT,
  p_module_slug TEXT,
  p_score NUMERIC
) RETURNS VOID AS $$
BEGIN
  INSERT INTO progress (user_id, module_slug, mastery_score, attempts, last_activity)
  VALUES (p_user_id, p_module_slug, p_score, 1, NOW())
  ON CONFLICT (user_id, module_slug) DO UPDATE SET
    mastery_score = (
      -- Weighted average: 70% existing, 30% new score
      progress.mastery_score * 0.7 + EXCLUDED.mastery_score * 0.3
    ),
    attempts      = progress.attempts + 1,
    last_activity = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
