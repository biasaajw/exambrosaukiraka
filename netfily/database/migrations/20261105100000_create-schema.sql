-- UjiAman: skema database (Milestone 2)
CREATE TABLE users (
  id            SERIAL PRIMARY KEY,
  username      TEXT NOT NULL UNIQUE CHECK (username = lower(username)),
  name          TEXT NOT NULL,
  kelas         TEXT,
  role          TEXT NOT NULL CHECK (role IN ('admin', 'pengawas', 'siswa')),
  password_hash TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE sessions (
  token_hash TEXT PRIMARY KEY,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX sessions_user_idx ON sessions(user_id);

CREATE TABLE login_attempts (
  id       BIGSERIAL PRIMARY KEY,
  username TEXT,
  ip       TEXT,
  at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX login_attempts_at_idx ON login_attempts(at);

CREATE TABLE exams (
  id                     TEXT PRIMARY KEY,
  title                  TEXT NOT NULL,
  subject                TEXT NOT NULL DEFAULT '',
  duration_minutes       INTEGER NOT NULL CHECK (duration_minutes > 0),
  token_interval_minutes INTEGER NOT NULL DEFAULT 5 CHECK (token_interval_minutes > 0),
  shuffle_questions      BOOLEAN NOT NULL DEFAULT TRUE,
  shuffle_options        BOOLEAN NOT NULL DEFAULT TRUE,
  sections               JSONB NOT NULL DEFAULT '[]',
  active                 BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE questions (
  id         TEXT PRIMARY KEY,
  exam_id    TEXT NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  section    TEXT NOT NULL,
  text       TEXT NOT NULL,
  image      TEXT,
  answer_key TEXT NOT NULL,
  position   INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX questions_exam_idx ON questions(exam_id);

CREATE TABLE question_options (
  question_id TEXT NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  key         TEXT NOT NULL,
  text        TEXT NOT NULL,
  position    INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (question_id, key)
);

CREATE TABLE exam_tokens (
  code       TEXT PRIMARY KEY,
  issued_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  issued_by  TEXT NOT NULL DEFAULT 'sistem'
);
CREATE INDEX exam_tokens_expires_idx ON exam_tokens(expires_at);

-- Satu baris saja: status jeda/gangguan untuk semua ujian.
CREATE TABLE exam_control (
  id               INTEGER PRIMARY KEY CHECK (id = 1),
  paused           BOOLEAN NOT NULL DEFAULT FALSE,
  reason           TEXT NOT NULL DEFAULT '',
  paused_by        TEXT NOT NULL DEFAULT '',
  paused_at        TIMESTAMPTZ,
  paused_accum_ms  BIGINT NOT NULL DEFAULT 0
);
INSERT INTO exam_control (id) VALUES (1);

CREATE TABLE attempts (
  id                  SERIAL PRIMARY KEY,
  user_id             INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  exam_id             TEXT NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  question_order      JSONB NOT NULL,
  option_order        JSONB NOT NULL,
  current_index       INTEGER NOT NULL DEFAULT 0,
  started_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  duration_ms         BIGINT NOT NULL,
  pause_baseline_ms   BIGINT NOT NULL DEFAULT 0,
  entry_active        BOOLEAN NOT NULL DEFAULT FALSE,
  status              TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'locked', 'submitted')),
  submitted_at        TIMESTAMPTZ,
  auto_submitted      BOOLEAN NOT NULL DEFAULT FALSE,
  last_seen           TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, exam_id)
);

CREATE TABLE attempt_tokens (
  attempt_id INTEGER NOT NULL REFERENCES attempts(id) ON DELETE CASCADE,
  code       TEXT NOT NULL,
  used_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (attempt_id, code)
);

CREATE TABLE attempt_answers (
  attempt_id  INTEGER NOT NULL REFERENCES attempts(id) ON DELETE CASCADE,
  question_id TEXT NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  choice_key  TEXT,
  doubt       BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (attempt_id, question_id)
);

CREATE TABLE violations (
  id         BIGSERIAL PRIMARY KEY,
  attempt_id INTEGER NOT NULL REFERENCES attempts(id) ON DELETE CASCADE,
  at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  type       TEXT NOT NULL,
  detail     TEXT NOT NULL DEFAULT ''
);
CREATE INDEX violations_attempt_idx ON violations(attempt_id);

CREATE TABLE results (
  attempt_id       INTEGER PRIMARY KEY REFERENCES attempts(id) ON DELETE CASCADE,
  user_id          INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  exam_id          TEXT NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  score            NUMERIC(5,1) NOT NULL,
  correct          INTEGER NOT NULL,
  wrong            INTEGER NOT NULL,
  blank            INTEGER NOT NULL,
  doubt            INTEGER NOT NULL DEFAULT 0,
  total            INTEGER NOT NULL,
  sections         JSONB NOT NULL DEFAULT '[]',
  review           JSONB NOT NULL DEFAULT '[]',
  duration_used_ms BIGINT NOT NULL DEFAULT 0,
  violations       INTEGER NOT NULL DEFAULT 0,
  submitted_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  auto_submitted   BOOLEAN NOT NULL DEFAU
LT FALSE
);
