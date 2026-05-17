-- Initialize database schema for megatrainer
-- Run once on container startup

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255),
  age INTEGER,
  gender VARCHAR(50),
  gender_notes TEXT,
  location VARCHAR(255),
  country VARCHAR(100),
  sport VARCHAR(100) NOT NULL DEFAULT 'running',
  experience_level INTEGER,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS interview_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  session_status VARCHAR(50) NOT NULL DEFAULT 'in_progress',
  current_phase VARCHAR(100),
  current_attempt INTEGER DEFAULT 0,
  personality_variant VARCHAR(100) NOT NULL DEFAULT 'assessor',
  created_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP,
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS interview_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES interview_sessions(id) ON DELETE CASCADE,
  phase VARCHAR(100) NOT NULL,
  attempt INTEGER NOT NULL,
  user_message TEXT NOT NULL,
  system_prompt TEXT,
  llm_response TEXT NOT NULL,
  llm_model VARCHAR(100),
  classified_category VARCHAR(50),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pending_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  classified_category VARCHAR(50),
  status VARCHAR(50) DEFAULT 'pending',
  handler_response TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  handled_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_interview_sessions_user_id ON interview_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_interview_sessions_status ON interview_sessions(session_status);
CREATE INDEX IF NOT EXISTS idx_interview_messages_session_id ON interview_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_pending_questions_user_id ON pending_questions(user_id);
CREATE INDEX IF NOT EXISTS idx_pending_questions_status ON pending_questions(status);
