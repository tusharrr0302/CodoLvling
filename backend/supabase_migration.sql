-- ============================================================
-- Codo Leveling — Supabase Schema Migration
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- -------------------------------------------------------
-- ENUMS
-- -------------------------------------------------------

CREATE TYPE rank_tier AS ENUM ('BRONZE', 'SILVER', 'GOLD', 'PLATINUM', 'DIAMOND', 'ABYSS');
CREATE TYPE difficulty AS ENUM ('EASY', 'EASY_MEDIUM', 'MEDIUM', 'MEDIUM_HARD', 'HARD');
CREATE TYPE progress_status AS ENUM ('UNSOLVED', 'ATTEMPTED', 'SOLVED');
CREATE TYPE item_type AS ENUM ('CONSUMABLE', 'BOOST', 'PASSIVE', 'COSMETIC');
CREATE TYPE item_rarity AS ENUM ('COMMON', 'UNCOMMON', 'RARE', 'EPIC', 'LEGENDARY');
CREATE TYPE item_source AS ENUM ('DROP', 'SHOP', 'PVP_REWARD', 'ACHIEVEMENT');
CREATE TYPE transaction_type AS ENUM ('PURCHASE', 'REGION_UNLOCK');
CREATE TYPE battle_status AS ENUM ('PENDING', 'ACTIVE', 'COMPLETE', 'ABANDONED');
CREATE TYPE friend_status AS ENUM ('PENDING', 'ACCEPTED', 'BLOCKED');
CREATE TYPE enemy_tier AS ENUM ('GREEN', 'YELLOW', 'BLUE', 'PURPLE', 'RED', 'GREY', 'BROWN', 'CYAN', 'FINAL');

-- -------------------------------------------------------
-- player_profiles (replaces User + PlayerProfile)
-- clerk_id is the primary foreign key from Clerk Auth
-- -------------------------------------------------------

CREATE TABLE player_profiles (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_id         TEXT UNIQUE NOT NULL,
  username         TEXT,
  email            TEXT,
  avatar_url       TEXT,
  display_name     TEXT,
  level            INT NOT NULL DEFAULT 1,
  xp               INT NOT NULL DEFAULT 0,
  xp_to_next_level INT NOT NULL DEFAULT 550,
  coins            INT NOT NULL DEFAULT 100,
  rank             rank_tier NOT NULL DEFAULT 'BRONZE',
  title            TEXT,
  equipped_items   JSONB,
  total_battles    INT NOT NULL DEFAULT 0,
  battles_won      INT NOT NULL DEFAULT 0,
  battles_lost     INT NOT NULL DEFAULT 0,
  streak_days      INT NOT NULL DEFAULT 0,
  last_active      TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -------------------------------------------------------
-- enemies
-- -------------------------------------------------------

CREATE TABLE enemies (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  slug        TEXT UNIQUE NOT NULL,
  topic       TEXT NOT NULL,
  tier        enemy_tier NOT NULL,
  base_hp     INT NOT NULL,
  base_attack INT NOT NULL,
  sprite_url  TEXT,
  battle_cry  TEXT,
  description TEXT,
  lore        TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -------------------------------------------------------
-- questions
-- -------------------------------------------------------

CREATE TABLE questions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title           TEXT NOT NULL,
  slug            TEXT UNIQUE NOT NULL,
  topic           TEXT NOT NULL,
  state_number    INT NOT NULL,
  question_number INT NOT NULL,
  difficulty      difficulty NOT NULL,
  narrative       TEXT,
  problem_body    TEXT NOT NULL,
  base_code       JSONB,
  test_cases      JSONB,
  enemy_id        UUID REFERENCES enemies(id),
  xp_reward       INT NOT NULL DEFAULT 50,
  coin_reward     INT NOT NULL DEFAULT 15,
  item_drop_chance FLOAT NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -------------------------------------------------------
-- user_progress
-- -------------------------------------------------------

CREATE TABLE user_progress (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_id        TEXT NOT NULL REFERENCES player_profiles(clerk_id) ON DELETE CASCADE,
  question_id     UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  status          progress_status NOT NULL DEFAULT 'UNSOLVED',
  attempts        INT NOT NULL DEFAULT 0,
  best_score      FLOAT,
  best_submission TEXT,
  solved_at       TIMESTAMPTZ,
  time_taken_secs INT,
  UNIQUE(clerk_id, question_id)
);

-- -------------------------------------------------------
-- items
-- -------------------------------------------------------

CREATE TABLE items (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  slug        TEXT UNIQUE NOT NULL,
  type        item_type NOT NULL,
  rarity      item_rarity NOT NULL,
  description TEXT,
  effect      JSONB,
  icon_url    TEXT,
  shop_price  INT,
  drop_weight INT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -------------------------------------------------------
-- user_inventory
-- -------------------------------------------------------

CREATE TABLE user_inventory (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_id    TEXT NOT NULL REFERENCES player_profiles(clerk_id) ON DELETE CASCADE,
  item_id     UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  quantity    INT NOT NULL DEFAULT 1,
  acquired_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  source      item_source
);

-- -------------------------------------------------------
-- shop_transactions
-- -------------------------------------------------------

CREATE TABLE shop_transactions (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_id         TEXT NOT NULL REFERENCES player_profiles(clerk_id) ON DELETE CASCADE,
  item_id          UUID REFERENCES items(id),
  coins_spent      INT NOT NULL,
  transaction_type transaction_type NOT NULL DEFAULT 'PURCHASE',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -------------------------------------------------------
-- pvp_battles
-- -------------------------------------------------------

CREATE TABLE pvp_battles (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_one_id TEXT NOT NULL REFERENCES player_profiles(clerk_id) ON DELETE CASCADE,
  player_two_id TEXT REFERENCES player_profiles(clerk_id) ON DELETE SET NULL,
  question_id   UUID NOT NULL REFERENCES questions(id),
  status        battle_status NOT NULL DEFAULT 'PENDING',
  winner_id     TEXT REFERENCES player_profiles(clerk_id) ON DELETE SET NULL,
  p1_score      FLOAT,
  p2_score      FLOAT,
  p1_time_secs  INT,
  p2_time_secs  INT,
  coins_wagered INT NOT NULL DEFAULT 0,
  started_at    TIMESTAMPTZ,
  ended_at      TIMESTAMPTZ
);

-- -------------------------------------------------------
-- achievements
-- -------------------------------------------------------

CREATE TABLE achievements (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug          TEXT UNIQUE NOT NULL,
  name          TEXT NOT NULL,
  description   TEXT,
  icon_url      TEXT,
  reward_coins  INT NOT NULL DEFAULT 0,
  reward_item_id UUID REFERENCES items(id)
);

CREATE TABLE user_achievements (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_id       TEXT NOT NULL REFERENCES player_profiles(clerk_id) ON DELETE CASCADE,
  achievement_id UUID NOT NULL REFERENCES achievements(id) ON DELETE CASCADE,
  unlocked_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(clerk_id, achievement_id)
);

-- -------------------------------------------------------
-- codex_entries
-- -------------------------------------------------------

CREATE TABLE codex_entries (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_id      TEXT NOT NULL REFERENCES player_profiles(clerk_id) ON DELETE CASCADE,
  enemy_id      UUID NOT NULL REFERENCES enemies(id) ON DELETE CASCADE,
  encountered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  defeated_at   TIMESTAMPTZ,
  UNIQUE(clerk_id, enemy_id)
);

-- -------------------------------------------------------
-- friends
-- -------------------------------------------------------

CREATE TABLE friends (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_id   TEXT NOT NULL REFERENCES player_profiles(clerk_id) ON DELETE CASCADE,
  friend_id  TEXT NOT NULL REFERENCES player_profiles(clerk_id) ON DELETE CASCADE,
  status     friend_status NOT NULL DEFAULT 'PENDING',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(clerk_id, friend_id)
);

-- -------------------------------------------------------
-- Row Level Security (RLS)
-- The backend uses service_role key which bypasses RLS.
-- Enable RLS anyway as a best practice for future direct
-- client access (e.g., Supabase Realtime subscriptions).
-- -------------------------------------------------------

ALTER TABLE player_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE shop_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE codex_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE friends ENABLE ROW LEVEL SECURITY;

-- Public read for leaderboard-style queries
CREATE POLICY "Public read player_profiles" ON player_profiles FOR SELECT USING (true);

-- ============================================================
-- COMMUNITY SYSTEM — Posts, Comments, Votes
-- ============================================================

-- Post type enum
CREATE TYPE post_type AS ENUM ('QUESTION', 'DISCUSSION', 'SOLUTION');

-- -------------------------------------------------------
-- posts
-- -------------------------------------------------------
CREATE TABLE posts (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_id     TEXT NOT NULL REFERENCES player_profiles(clerk_id) ON DELETE CASCADE,
  title        TEXT NOT NULL,
  content      TEXT NOT NULL,
  type         post_type NOT NULL DEFAULT 'DISCUSSION',
  tags         TEXT[] NOT NULL DEFAULT '{}',
  code_snippet TEXT,
  code_lang    TEXT,
  vote_score   INT NOT NULL DEFAULT 0,
  views        INT NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -------------------------------------------------------
-- comments (threaded via parent_id self-reference)
-- -------------------------------------------------------
CREATE TABLE comments (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id     UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  clerk_id    TEXT NOT NULL REFERENCES player_profiles(clerk_id) ON DELETE CASCADE,
  parent_id   UUID REFERENCES comments(id) ON DELETE CASCADE,
  content     TEXT NOT NULL,
  vote_score  INT NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -------------------------------------------------------
-- votes (value: +1 upvote, -1 downvote)
-- Exactly one of post_id or comment_id must be set.
-- -------------------------------------------------------
CREATE TABLE votes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_id    TEXT NOT NULL REFERENCES player_profiles(clerk_id) ON DELETE CASCADE,
  post_id     UUID REFERENCES posts(id) ON DELETE CASCADE,
  comment_id  UUID REFERENCES comments(id) ON DELETE CASCADE,
  value       SMALLINT NOT NULL CHECK (value IN (-1, 1)),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(clerk_id, post_id),
  UNIQUE(clerk_id, comment_id)
);

-- Indexes for performance
CREATE INDEX idx_posts_clerk_id     ON posts(clerk_id);
CREATE INDEX idx_posts_tags         ON posts USING GIN(tags);
CREATE INDEX idx_posts_created_at   ON posts(created_at DESC);
CREATE INDEX idx_posts_vote_score   ON posts(vote_score DESC);
CREATE INDEX idx_comments_post_id   ON comments(post_id);
CREATE INDEX idx_comments_parent_id ON comments(parent_id);
CREATE INDEX idx_votes_post_id      ON votes(post_id);
CREATE INDEX idx_votes_comment_id   ON votes(comment_id);

-- RLS
ALTER TABLE posts    ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE votes    ENABLE ROW LEVEL SECURITY;

-- Public reads
CREATE POLICY "Public read posts"    ON posts    FOR SELECT USING (true);
CREATE POLICY "Public read comments" ON comments FOR SELECT USING (true);
