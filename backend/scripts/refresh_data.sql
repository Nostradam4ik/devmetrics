-- backend/scripts/refresh_data.sql
-- Refreshes demo data so all periods (7/14/30/90 days) always have real DB data.
-- Run when data becomes stale (older than 7 days from today):
--
--   docker-compose exec postgres psql -U devmetrics -d devmetrics \
--     -c "$(cat backend/scripts/refresh_data.sql)"

-- Clear old data
DELETE FROM pr_reviews;
DELETE FROM commits;
DELETE FROM pull_requests;

-- Insert 300 commits spread over last 90 days from NOW()
INSERT INTO commits (id, repository_id, developer_id, sha, message,
                     additions, deletions, files_changed, committed_at, created_at)
SELECT
  gen_random_uuid(),
  (ARRAY[
    '00000000-1234-1234-1234-000000000020',
    '00000000-1234-1234-1234-000000000021',
    '00000000-1234-1234-1234-000000000022'
  ])[floor(random()*3+1)::int]::uuid,
  (SELECT id FROM developers ORDER BY random() LIMIT 1),
  md5(random()::text),
  (ARRAY[
    'feat: add new feature',
    'fix: resolve bug',
    'refactor: clean up code',
    'docs: update readme',
    'test: add unit tests',
    'chore: update dependencies',
    'perf: optimize query'
  ])[floor(random()*7+1)::int],
  floor(random()*300+1)::int,
  floor(random()*100)::int,
  floor(random()*10+1)::int,
  NOW() - (random() * interval '90 days'),
  NOW()
FROM generate_series(1, 300);

-- Insert 60 PRs spread over last 90 days from NOW()
INSERT INTO pull_requests (id, repository_id, developer_id, github_pr_id,
                           number, title, state, created_at, merged_at,
                           cycle_time_hours, updated_at)
SELECT
  gen_random_uuid(),
  (ARRAY[
    '00000000-1234-1234-1234-000000000020',
    '00000000-1234-1234-1234-000000000021',
    '00000000-1234-1234-1234-000000000022'
  ])[floor(random()*3+1)::int]::uuid,
  (SELECT id FROM developers ORDER BY random() LIMIT 1),
  3000 + s,
  3000 + s,
  (ARRAY[
    'feat: new dashboard component',
    'fix: authentication bug',
    'refactor: api layer cleanup',
    'docs: update API docs',
    'test: improve coverage'
  ])[floor(random()*5+1)::int],
  (ARRAY['merged','merged','merged','open','closed'])[floor(random()*5+1)::int],
  NOW() - (random() * interval '90 days'),
  CASE WHEN random() > 0.3
    THEN NOW() - (random() * interval '85 days')
    ELSE NULL
  END,
  CASE WHEN random() > 0.3
    THEN random()*70+2
    ELSE NULL
  END,
  NOW()
FROM generate_series(1, 60) s;

-- Insert ~40 PR reviews for merged PRs
INSERT INTO pr_reviews (id, pull_request_id, reviewer_id, github_review_id,
                        state, body, review_time_hours, submitted_at, created_at)
SELECT
  gen_random_uuid(),
  pr.id,
  (SELECT id FROM developers ORDER BY random() LIMIT 1),
  floor(random()*900000+100000)::int,
  (ARRAY['approved','changes_requested','commented','approved','approved'])[floor(random()*5+1)::int],
  (ARRAY['LGTM!','Please fix the edge case','Looks good, approved.',NULL])[floor(random()*4+1)::int],
  random()*24+0.5,
  pr.created_at + (random() * interval '24 hours'),
  NOW()
FROM pull_requests pr
WHERE pr.state = 'merged'
ORDER BY random()
LIMIT 40
ON CONFLICT DO NOTHING;

-- Verify
SELECT
  (SELECT COUNT(*) FROM commits) as commits,
  (SELECT MIN(committed_at)::date FROM commits) as oldest_commit,
  (SELECT MAX(committed_at)::date FROM commits) as newest_commit,
  (SELECT COUNT(*) FROM pull_requests) as prs,
  (SELECT COUNT(*) FROM pr_reviews) as reviews;
