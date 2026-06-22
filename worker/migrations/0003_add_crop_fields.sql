ALTER TABLE lands ADD COLUMN crop_type TEXT;

ALTER TABLE lands ADD COLUMN planted_at TEXT;

ALTER TABLE lands ADD COLUMN growth_duration_seconds INTEGER NOT NULL DEFAULT 0 CHECK (growth_duration_seconds >= 0);
