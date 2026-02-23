CREATE TABLE IF NOT EXISTS registry_skills (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  version TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  author TEXT NOT NULL DEFAULT '',
  repository TEXT NOT NULL DEFAULT '',
  download_url TEXT NOT NULL DEFAULT '',
  checksum_sha256 TEXT NOT NULL DEFAULT '',
  downloads INTEGER NOT NULL DEFAULT 0,
  verified INTEGER NOT NULL DEFAULT 0,
  tags TEXT NOT NULL DEFAULT '[]',
  rating REAL NOT NULL DEFAULT 0,
  rating_count INTEGER NOT NULL DEFAULT 0,
  published_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS skill_ratings (
  id TEXT PRIMARY KEY,
  skill_id TEXT NOT NULL REFERENCES registry_skills(id),
  user_id TEXT NOT NULL,
  stars INTEGER NOT NULL CHECK(stars >= 1 AND stars <= 5),
  comment TEXT NOT NULL DEFAULT '',
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS security_scans (
  id TEXT PRIMARY KEY,
  skill_id TEXT NOT NULL REFERENCES registry_skills(id),
  version TEXT NOT NULL,
  passed INTEGER NOT NULL DEFAULT 0,
  grade TEXT NOT NULL DEFAULT '',
  score INTEGER NOT NULL DEFAULT 0,
  issues TEXT NOT NULL DEFAULT '[]',
  findings TEXT NOT NULL DEFAULT '[]',
  scanned_files INTEGER NOT NULL DEFAULT 0,
  total_lines INTEGER NOT NULL DEFAULT 0,
  scan_duration INTEGER NOT NULL DEFAULT 0,
  scanned_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_ratings_skill ON skill_ratings(skill_id);
CREATE INDEX IF NOT EXISTS idx_scans_skill ON security_scans(skill_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_ratings_skill_user ON skill_ratings(skill_id, user_id);
