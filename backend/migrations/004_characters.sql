-- characters table: AI friends generated per user
CREATE TABLE IF NOT EXISTS characters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  gender TEXT NOT NULL CHECK (gender IN ('male', 'female', 'other')),
  age INTEGER NOT NULL,
  hometown TEXT NOT NULL,
  education TEXT NOT NULL,
  background TEXT NOT NULL,
  hobbies TEXT NOT NULL,
  personality TEXT NOT NULL,
  speech_style TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add character_id column to conversations (nullable for migration compatibility)
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS character_id UUID REFERENCES characters(id) ON DELETE CASCADE;

-- Add character_id column to user_memories
ALTER TABLE user_memories ADD COLUMN IF NOT EXISTS character_id UUID REFERENCES characters(id) ON DELETE CASCADE;

-- RLS policies for characters
ALTER TABLE characters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own characters"
  ON characters FOR ALL
  USING (auth.uid() = user_id);

-- Service role bypass
CREATE POLICY "Service role bypass for characters"
  ON characters FOR ALL
  TO service_role
  USING (true);
