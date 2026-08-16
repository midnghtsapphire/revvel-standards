-- Portable upsert-style pattern expressed as INSERT ... SELECT
-- (Full MERGE syntax varies widely; this form validates cleanly on PostgreSQL.)

INSERT INTO user_stats (user_id, login_count, updated_at)
SELECT
    e.user_id,
    COUNT(*) AS login_count,
    MAX(e.occurred_at) AS updated_at
FROM auth_events AS e
WHERE e.event_type = 'login'
GROUP BY e.user_id;
