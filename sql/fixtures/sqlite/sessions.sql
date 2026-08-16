-- SQLite fixture: simple session lookup

SELECT
    s.id,
    s.user_id,
    s.created_at,
    s.expires_at
FROM sessions AS s
WHERE s.revoked = 0
  AND s.expires_at > CURRENT_TIMESTAMP
ORDER BY s.created_at DESC;
