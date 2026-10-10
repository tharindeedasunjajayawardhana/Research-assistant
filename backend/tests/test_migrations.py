from pathlib import Path

from alembic import command
from alembic.config import Config
from sqlalchemy import create_engine, inspect

ROOT = Path(__file__).resolve().parent.parent


def test_migrations_create_and_remove_tables(tmp_path):
    url = f"sqlite:///{(tmp_path / 'migrated.db').as_posix()}"
    cfg = Config(str(ROOT / "alembic.ini"))
    cfg.set_main_option("script_location", str(ROOT / "alembic"))
    cfg.attributes["url"] = url

    command.upgrade(cfg, "head")
    inspector = inspect(create_engine(url))
    assert {
        "papers",
        "paper_pages",
        "paper_chunks",
        "paper_summaries",
        "chat_messages",
        "paper_notes",
        "agent_runs",
        "agent_steps",
        "paper_concerns",
    } <= set(inspector.get_table_names())
    page_columns = {c["name"] for c in inspector.get_columns("paper_pages")}
    assert {"paper_id", "page_no", "text", "char_count", "is_low_text", "extraction_method"} <= page_columns
    chunk_columns = {c["name"] for c in inspector.get_columns("paper_chunks")}
    assert {"paper_id", "page_no", "chunk_index", "char_start", "char_end", "text"} <= chunk_columns

    command.downgrade(cfg, "base")
    assert "papers" not in inspect(create_engine(url)).get_table_names()
