-- learnflow-app/seed.sql
-- Seed script to populate the Supabase database with the complete Python curriculum.

-- 1. Insert Python Modules
INSERT INTO modules (name, slug, description, "order", total_topics) VALUES
  ('Python Basics',        'basics',          'Variables, data types, operators, control flow, and basic I/O', 1, 10),
  ('Data Structures',      'data-structures', 'Lists, tuples, sets, dictionaries, and comprehensions',         2, 8),
  ('Functions',            'functions',       'Defining functions, scope, closures, lambdas, and recursion',   3, 7),
  ('Object-Oriented Programming', 'oop',      'Classes, inheritance, encapsulation, polymorphism, and dunder methods', 4, 9),
  ('Error Handling',       'error-handling',  'Exceptions, try/except/finally, custom exceptions, and debugging', 5, 6),
  ('File I/O',             'file-io',         'Reading/writing files, CSV, JSON, pathlib, and context managers', 6, 6),
  ('Decorators',           'decorators',      'Function decorators, class decorators, functools, and metaprogramming', 7, 5),
  ('Async Programming',    'async',           'asyncio, async/await, coroutines, tasks, and aiohttp',          8, 7)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  "order" = EXCLUDED."order",
  total_topics = EXCLUDED.total_topics;

-- 2. Insert Sample Exercises (one per module as a baseline)
-- Note: Replace UUIDs with valid references if manual insertion, though uuid_generate_v4() works in migration.

WITH basic_mod AS (SELECT slug FROM modules WHERE slug = 'basics')
INSERT INTO exercises (module_slug, topic, prompt, difficulty, test_cases)
SELECT basics.slug, 'Variables', 'Create a variable named "score" and set it to 100.', 'beginner',
'[{"input": "", "expected": "100", "description": "Check if score is 100"}]'::jsonb
FROM modules basics WHERE basics.slug = 'basics'
ON CONFLICT DO NOTHING;

WITH ds_mod AS (SELECT slug FROM modules WHERE slug = 'data-structures')
INSERT INTO exercises (module_slug, topic, prompt, difficulty, test_cases)
SELECT slug, 'Lists', 'Create a list named "fruits" containing "apple", "banana", and "cherry".', 'beginner',
'[{"input": "", "expected": "[\"apple\", \"banana\", \"cherry\"]", "description": "Check list content"}]'::jsonb
FROM modules WHERE slug = 'data-structures'
ON CONFLICT DO NOTHING;

WITH func_mod AS (SELECT slug FROM modules WHERE slug = 'functions')
INSERT INTO exercises (module_slug, topic, prompt, difficulty, test_cases)
SELECT slug, 'Definitions', 'Define a function "greet(name)" that returns "Hello, name".', 'beginner',
'[{"input": "\"PanaV\" ", "expected": "Hello, PanaV", "description": "Test greet function"}]'::jsonb
FROM modules WHERE slug = 'functions'
ON CONFLICT DO NOTHING;

-- 3. Insert Initial Mock Progress for 'anonymous_user'
-- This ensures the dashboard doesn't look empty on first load.
INSERT INTO progress (user_id, module_slug, mastery_score, attempts, last_activity) VALUES
  ('anonymous_user', 'basics', 45.5, 3, NOW() - INTERVAL '2 days'),
  ('anonymous_user', 'functions', 15.0, 1, NOW() - INTERVAL '1 day')
ON CONFLICT (user_id, module_slug) DO NOTHING;

-- 4. Insert Initial Struggle Alerts
INSERT INTO struggle_alerts (user_id, module_slug, alert_type, details) VALUES
  ('anonymous_user', 'functions', 'low_score', '{"mastery_score": 15.0, "attempts": 1, "latest_exercise_score": 15.0}'::jsonb)
ON CONFLICT DO NOTHING;
