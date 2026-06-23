CREATE TABLE inventory_items_next (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  item_type TEXT NOT NULL CHECK (item_type IN ('seed', 'crop')),
  crop_type TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(user_id, item_type, crop_type)
) STRICT;

INSERT INTO inventory_items_next (
  id,
  user_id,
  item_type,
  crop_type,
  quantity,
  created_at,
  updated_at
)
SELECT
  id,
  user_id,
  item_type,
  crop_type,
  quantity,
  created_at,
  updated_at
FROM inventory_items;

DROP TABLE inventory_items;

ALTER TABLE inventory_items_next RENAME TO inventory_items;

CREATE INDEX IF NOT EXISTS idx_inventory_items_user_type
ON inventory_items(user_id, item_type);
