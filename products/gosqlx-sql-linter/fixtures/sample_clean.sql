-- Product fixture: clean multi-join query (CI-gated via gosqlx-lint workflow)

SELECT
    u.id,
    u.email,
    COUNT(s.id) AS session_count
FROM users AS u
LEFT JOIN sessions AS s
    ON u.id = s.user_id
WHERE u.active = TRUE
GROUP BY u.id, u.email
ORDER BY session_count DESC;
