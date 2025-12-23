INSERT INTO users (email, "firstName", "lastName", password, active, admin, created_at)
VALUES
('admin1@test.local', 'Admin', 'One', '$2b$10$abcdefghijklmnopqrstuv', true, true, NOW()),
('admin2@test.local', 'Admin', 'Two', '$2b$10$abcdefghijklmnopqrstuv', true, true, NOW()),

('user1@test.local', 'User', 'One', '$2b$10$abcdefghijklmnopqrstuv', true, false, NOW()),
('user2@test.local', 'User', 'Two', '$2b$10$abcdefghijklmnopqrstuv', true, false, NOW()),
('user3@test.local', 'User', 'Three', '$2b$10$abcdefghijklmnopqrstuv', true, false, NOW()),
('user4@test.local', 'User', 'Four', '$2b$10$abcdefghijklmnopqrstuv', true, false, NOW()),
('user5@test.local', 'User', 'Five', '$2b$10$abcdefghijklmnopqrstuv', true, false, NOW()),
('user6@test.local', 'User', 'Six', '$2b$10$abcdefghijklmnopqrstuv', true, false, NOW()),
('user7@test.local', 'User', 'Seven', '$2b$10$abcdefghijklmnopqrstuv', true, false, NOW()),
('user8@test.local', 'User', 'Eight', '$2b$10$abcdefghijklmnopqrstuv', true, false, NOW())
ON CONFLICT (email) DO NOTHING;


INSERT INTO friends ("requesterId", "addresseeId", status, "createdAt", "updatedAt")
SELECT
  u1."userId",
  u2."userId",
  'accepted',
  NOW(),
  NOW()
FROM users u1
JOIN users u2 ON u1."userId" < u2."userId"
WHERE u1.email LIKE '%@test.local'
  AND u2.email LIKE '%@test.local'
ON CONFLICT DO NOTHING;


INSERT INTO friends ("requesterId", "addresseeId", status, "createdAt", "updatedAt")
SELECT
  u1."userId",
  u2."userId",
  'accepted',
  NOW(),
  NOW()
FROM users u1
JOIN users u2 ON u1."userId" < u2."userId"
WHERE u1.email LIKE '%@test.local'
  AND u2.email LIKE '%@test.local'
ON CONFLICT DO NOTHING;