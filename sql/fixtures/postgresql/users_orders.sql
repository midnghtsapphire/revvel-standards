-- PostgreSQL fixture: joins, GROUP BY, aggregates
-- Validated by GoSQLX Lint Action (dialect: postgresql)

SELECT
    u.id,
    u.name,
    COUNT(o.id) AS order_count,
    COALESCE(SUM(o.total_cents), 0) AS revenue_cents
FROM users AS u
LEFT JOIN orders AS o
    ON u.id = o.user_id
WHERE u.active = TRUE
GROUP BY u.id, u.name
ORDER BY revenue_cents DESC;
