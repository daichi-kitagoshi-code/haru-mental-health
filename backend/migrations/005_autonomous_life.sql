-- Expand characters table with detailed profile fields
ALTER TABLE characters ADD COLUMN IF NOT EXISTS occupation TEXT;
ALTER TABLE characters ADD COLUMN IF NOT EXISTS current_city TEXT;
ALTER TABLE characters ADD COLUMN IF NOT EXISTS family_background TEXT;
ALTER TABLE characters ADD COLUMN IF NOT EXISTS childhood_story TEXT;
ALTER TABLE characters ADD COLUMN IF NOT EXISTS love_history TEXT;
ALTER TABLE characters ADD COLUMN IF NOT EXISTS current_romance_status TEXT;
ALTER TABLE characters ADD COLUMN IF NOT EXISTS work_hours TEXT;
ALTER TABLE characters ADD COLUMN IF NOT EXISTS narrative_profile TEXT;

-- Character's ongoing worries (drives autonomous posts)
CREATE TABLE IF NOT EXISTS character_worries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  worry_type TEXT NOT NULL DEFAULT 'general'
    CHECK (worry_type IN ('work','love','money','future','health','relationship','life','general')),
  current_status TEXT NOT NULL DEFAULT 'beginning'
    CHECK (current_status IN ('beginning','progressing','resolved')),
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ,
  resolution_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Character's daily life posts (Instagram-like feed)
CREATE TABLE IF NOT EXISTS character_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  post_type TEXT NOT NULL DEFAULT 'daily'
    CHECK (post_type IN ('daily','work','love','worry','followup')),
  scheduled_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_published BOOLEAN NOT NULL DEFAULT true,
  related_worry_id UUID REFERENCES character_worries(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- User advice extracted from chat (for future post follow-ups)
CREATE TABLE IF NOT EXISTS user_advice_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  character_id UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  worry_id UUID REFERENCES character_worries(id) ON DELETE SET NULL,
  advice_content TEXT NOT NULL,
  given_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS policies
ALTER TABLE character_worries ENABLE ROW LEVEL SECURITY;
ALTER TABLE character_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_advice_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role bypass for character_worries"
  ON character_worries FOR ALL TO service_role USING (true);

CREATE POLICY "Service role bypass for character_posts"
  ON character_posts FOR ALL TO service_role USING (true);

CREATE POLICY "Service role bypass for user_advice_log"
  ON user_advice_log FOR ALL TO service_role USING (true);

-- Index for feed queries
CREATE INDEX IF NOT EXISTS idx_character_posts_char_time
  ON character_posts(character_id, scheduled_at DESC);

CREATE INDEX IF NOT EXISTS idx_character_worries_char
  ON character_worries(character_id, current_status);
