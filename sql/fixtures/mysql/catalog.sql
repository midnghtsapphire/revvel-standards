-- MySQL / MariaDB fixture: portable catalog query

SELECT
    p.id,
    p.sku,
    p.name,
    c.name AS category_name
FROM products AS p
INNER JOIN categories AS c
    ON p.category_id = c.id
WHERE p.is_published = 1
ORDER BY p.name ASC
LIMIT 100;
