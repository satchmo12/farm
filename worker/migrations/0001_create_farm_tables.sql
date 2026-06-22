CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY,
  first_name TEXT NOT NULL,
  username TEXT,
  coin INTEGER NOT NULL DEFAULT 0 CHECK (coin >= 0),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
) STRICT;

CREATE TABLE IF NOT EXISTS lands (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  position INTEGER NOT NULL CHECK (position >= 0 AND position < 24),
  status TEXT NOT NULL DEFAULT 'empty' CHECK (status IN ('empty', 'growing', 'ready')),
  remain INTEGER NOT NULL DEFAULT 0 CHECK (remain >= 0),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(user_id, position)
) STRICT;

CREATE INDEX IF NOT EXISTS idx_lands_user_id_position
ON lands(user_id, position);
