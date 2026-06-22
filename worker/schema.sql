-- 用户表
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tg_id TEXT UNIQUE,
  username TEXT,
  first_name TEXT,
  avatar TEXT,
  banned INTEGER DEFAULT 0,
  created_at INTEGER
);

