"""
Tests for services/sql_guard.py.

The static checks run anywhere. The database tests need a disposable
PostgreSQL database and are skipped unless TEST_DATABASE_URL is set:

    TEST_DATABASE_URL=postgresql+psycopg2://postgres@localhost:5432/test pytest Backend/tests
"""
import os
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from services.sql_guard import ReadOnlyQueryError, check_read_only, run_read_only_query  # noqa: E402

ALLOWED = [
    'SELECT * FROM "t_sales"',
    'SELECT region, SUM(amount) AS total FROM "t_sales" GROUP BY region ORDER BY total DESC',
    'WITH top AS (SELECT * FROM "t_sales" ORDER BY amount DESC LIMIT 3) SELECT count(*) FROM top',
    'SELECT updated_at, deleted_flag FROM "t_sales"',
    "SELECT * FROM \"t_sales\" WHERE status = 'Created'",
    "SELECT * FROM \"t_sales\";",
]

REJECTED_STATICALLY = [
    'DROP TABLE "t_sales"',
    'DELETE FROM "t_sales"',
    'UPDATE "t_sales" SET amount = 0',
    "INSERT INTO \"t_sales\" VALUES (99, 'x', 1)",
    'SELECT 1; DROP TABLE "t_sales"',
    'WITH d AS (DELETE FROM "t_sales" RETURNING *) SELECT * FROM d',
    'SELECT * INTO stolen FROM "t_sales"',
    'TRUNCATE "t_sales"',
    "COPY (SELECT 1) TO PROGRAM 'id'",
]

# Writes with no keyword the static check knows about: only the database stops these.
REJECTED_BY_DATABASE = [
    "SELECT nextval('t_sales_id_seq')",
    "SELECT set_config('transaction_read_only', 'off', true)",
]


@pytest.mark.parametrize("sql", ALLOWED)
def test_static_check_allows_reads(sql):
    assert check_read_only(sql, blocked=())


@pytest.mark.parametrize("sql", REJECTED_STATICALLY)
def test_static_check_rejects_writes(sql):
    with pytest.raises(ReadOnlyQueryError):
        check_read_only(sql, blocked=())


def test_static_check_rejects_blocked_tables():
    with pytest.raises(ReadOnlyQueryError):
        check_read_only("SELECT username, hashed_password FROM users", blocked=("users", "hashed_password"))


# ---------------------------------------------------------------- database
DB_URL = os.getenv("TEST_DATABASE_URL")
needs_db = pytest.mark.skipif(not DB_URL, reason="TEST_DATABASE_URL not set")


@pytest.fixture
def db():
    from sqlalchemy import create_engine, text
    from sqlalchemy.orm import Session

    engine = create_engine(DB_URL)
    with engine.begin() as conn:
        conn.execute(text('DROP TABLE IF EXISTS "t_sales"'))
        conn.execute(text(
            'CREATE TABLE "t_sales" (id SERIAL PRIMARY KEY, region TEXT, amount INT, '
            'status TEXT, updated_at TIMESTAMP DEFAULT now(), deleted_flag BOOLEAN DEFAULT false)'
        ))
        conn.execute(text(
            "INSERT INTO \"t_sales\" (region, amount, status) VALUES ('North', 10, 'Created'), ('South', 20, 'Paid')"
        ))
    session = Session(engine)
    yield session
    session.close()
    with engine.begin() as conn:
        conn.execute(text('DROP TABLE IF EXISTS "t_sales"'))
    engine.dispose()


def _row_count(db):
    from sqlalchemy import text
    with db.get_bind().connect() as conn:
        return conn.execute(text('SELECT count(*) FROM "t_sales"')).scalar()


@needs_db
@pytest.mark.parametrize("sql", ALLOWED)
def test_reads_return_rows(db, sql):
    cols, rows = run_read_only_query(db, sql)
    assert cols


@needs_db
@pytest.mark.parametrize("sql", REJECTED_BY_DATABASE)
def test_database_rejects_writes_the_static_check_misses(db, sql):
    with pytest.raises(Exception) as err:
        run_read_only_query(db, sql)
    assert "read-only transaction" in str(err.value) or "read-write mode" in str(err.value)
    assert _row_count(db) == 2


@needs_db
@pytest.mark.parametrize("sql", REJECTED_STATICALLY[:-1])
def test_database_layer_alone_blocks_writes(db, sql, monkeypatch):
    """Switch the static check off: PostgreSQL must still refuse every write."""
    import services.sql_guard as guard
    monkeypatch.setattr(guard, "check_read_only", lambda s, blocked=(): s.strip().rstrip(";"))
    with pytest.raises(Exception) as err:
        guard.run_read_only_query(db, sql)
    assert "read-only transaction" in str(err.value)
    assert _row_count(db) == 2


@needs_db
def test_statement_timeout(db, monkeypatch):
    import services.sql_guard as guard
    monkeypatch.setattr(guard, "STATEMENT_TIMEOUT_MS", 200)
    with pytest.raises(Exception) as err:
        run_read_only_query(db, "SELECT pg_sleep(2)")
    assert "statement timeout" in str(err.value)
