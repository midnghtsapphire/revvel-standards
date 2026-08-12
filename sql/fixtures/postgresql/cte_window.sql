-- PostgreSQL fixture: CTE + window function
-- Covers advanced constructs called out in WR #15862 DoD

WITH monthly AS (
    SELECT
        o.user_id,
        DATE_TRUNC('month', o.created_at) AS month_start,
        SUM(o.total_cents) AS month_total
    FROM orders AS o
    WHERE o.status = 'paid'
    GROUP BY o.user_id, DATE_TRUNC('month', o.created_at)
)
SELECT
    m.user_id,
    m.month_start,
    m.month_total,
    SUM(m.month_total) OVER (
        PARTITION BY m.user_id
        ORDER BY m.month_start
        ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
    ) AS running_total
FROM monthly AS m
ORDER BY m.user_id, m.month_start;
