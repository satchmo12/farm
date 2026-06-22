CREATE TABLE IF NOT EXISTS inventory_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  item_type TEXT NOT NULL CHECK (item_type IN ('seed', 'crop')),
  crop_type TEXT NOT NULL CHECK (crop_type IN ('wheat', 'corn', 'tomato')),
  quantity INTEGER NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(user_id, item_type, crop_type)
) STRICT;

CREATE INDEX IF NOT EXISTS idx_inventory_items_user_type
ON inventory_items(user_id, item_type);
