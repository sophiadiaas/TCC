ALTER TABLE games ADD COLUMN owner_id INTEGER REFERENCES users(id);
ALTER TABLE matches ADD COLUMN completed_at TEXT;
CREATE INDEX idx_comments_post ON comments(post_id);
CREATE INDEX idx_registrations_team ON registrations(team_id);
CREATE INDEX idx_members_user ON team_members(user_id);
