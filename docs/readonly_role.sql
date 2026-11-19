-- Optional SELECT-only role for running AI-generated SQL.
-- Run as the database owner, then set in Backend/.env:
--   READONLY_DATABASE_URL=postgresql+psycopg2://ai_readonly:<password>@<host>:5432/<db>
-- Replace app_owner with the role in DB_USER (the role that creates the dataset tables).

CREATE ROLE ai_readonly LOGIN PASSWORD 'choose-a-strong-password';
ALTER ROLE ai_readonly SET default_transaction_read_only = on;
ALTER ROLE ai_readonly SET statement_timeout = '10s';

GRANT USAGE ON SCHEMA public TO ai_readonly;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO ai_readonly;

-- Uploaded datasets become new tables, so grant SELECT on future tables too.
ALTER DEFAULT PRIVILEGES FOR ROLE app_owner IN SCHEMA public
    GRANT SELECT ON TABLES TO ai_readonly;
