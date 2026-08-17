-- Cross-dialect fixture: UNION set operation

SELECT u.email AS contact
FROM users AS u
WHERE u.newsletter_opt_in = TRUE

UNION

SELECT l.email AS contact
FROM leads AS l
WHERE l.status = 'qualified';
