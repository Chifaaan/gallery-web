"""
core/feedback_db.py
Async SQLite database layer untuk menyimpan feedback pencarian pengguna.
"""

import aiosqlite
import os
from typing import Optional

# Default path database
DEFAULT_DB_PATH = os.path.join(os.path.dirname(__file__), "..", "storage", "feedback.db")

# ─── Schema ───────────────────────────────────────────────────

CREATE_TABLE_SQL = """
CREATE TABLE IF NOT EXISTS feedback (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    query_text      TEXT    NOT NULL,
    category        TEXT    NOT NULL CHECK(category IN ('text', 'image', 'multimodal')),
    is_relevant     BOOLEAN NOT NULL,
    timestamp       TEXT    NOT NULL,
    elapsed_ms      REAL,
    top_k           INTEGER,
    total_results   INTEGER,
    created_at      TEXT    DEFAULT (datetime('now'))
);
"""


# ─── Database Manager ─────────────────────────────────────────

class FeedbackDB:
    """Async SQLite manager untuk feedback pencarian."""

    def __init__(self, db_path: Optional[str] = None):
        self.db_path = db_path or DEFAULT_DB_PATH

    async def init(self):
        """Buat tabel jika belum ada. Panggil sekali saat startup."""
        os.makedirs(os.path.dirname(self.db_path), exist_ok=True)
        async with aiosqlite.connect(self.db_path) as db:
            await db.execute(CREATE_TABLE_SQL)
            await db.commit()
        print(f"📝 Feedback DB ready at {self.db_path}")

    async def save_feedback(
        self,
        query_text   : str,
        category     : str,
        is_relevant  : bool,
        timestamp    : str,
        elapsed_ms   : Optional[float] = None,
        top_k        : Optional[int]   = None,
        total_results: Optional[int]   = None,
    ) -> int:
        """Simpan satu record feedback. Return ID yang baru dibuat."""
        async with aiosqlite.connect(self.db_path) as db:
            cursor = await db.execute(
                """
                INSERT INTO feedback
                    (query_text, category, is_relevant, timestamp, elapsed_ms, top_k, total_results)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                (query_text, category, is_relevant, timestamp, elapsed_ms, top_k, total_results),
            )
            await db.commit()
            return cursor.lastrowid  # type: ignore[return-value]

    async def get_all(
        self,
        page : int = 1,
        limit: int = 20,
    ) -> tuple[list[dict], int]:
        """Ambil feedback dengan pagination. Return (items, total)."""
        offset = (page - 1) * limit
        async with aiosqlite.connect(self.db_path) as db:
            db.row_factory = aiosqlite.Row

            # Total count
            async with db.execute("SELECT COUNT(*) as cnt FROM feedback") as cur:
                row = await cur.fetchone()
                total = row["cnt"] if row else 0  # type: ignore[index]

            # Paginated items
            async with db.execute(
                "SELECT * FROM feedback ORDER BY id DESC LIMIT ? OFFSET ?",
                (limit, offset),
            ) as cur:
                rows = await cur.fetchall()
                items = [dict(r) for r in rows]  # type: ignore[arg-type]

        return items, total

    async def get_stats(self) -> dict:
        """Statistik ringkasan feedback."""
        async with aiosqlite.connect(self.db_path) as db:
            db.row_factory = aiosqlite.Row

            # Total & positive count
            async with db.execute("""
                SELECT
                    COUNT(*)                          AS total,
                    SUM(CASE WHEN is_relevant THEN 1 ELSE 0 END) AS positive,
                    SUM(CASE WHEN NOT is_relevant THEN 1 ELSE 0 END) AS negative
                FROM feedback
            """) as cur:
                row = await cur.fetchone()
                total    = row["total"]    if row else 0  # type: ignore[index]
                positive = row["positive"] if row else 0  # type: ignore[index]
                negative = row["negative"] if row else 0  # type: ignore[index]

            # Per-category breakdown
            async with db.execute("""
                SELECT
                    category,
                    COUNT(*)                          AS total,
                    SUM(CASE WHEN is_relevant THEN 1 ELSE 0 END) AS positive
                FROM feedback
                GROUP BY category
            """) as cur:
                cat_rows = await cur.fetchall()
                by_category = {
                    r["category"]: {  # type: ignore[index]
                        "total"   : r["total"],  # type: ignore[index]
                        "positive": r["positive"],  # type: ignore[index]
                    }
                    for r in cat_rows
                }

        positive_rate = (positive / total * 100) if total > 0 else 0.0
        return {
            "total"        : total,
            "positive"     : positive,
            "negative"     : negative,
            "positive_rate": round(positive_rate, 2),
            "by_category"  : by_category,
        }

    async def export_csv(self) -> str:
        """Export seluruh feedback sebagai CSV string."""
        import csv
        import io

        async with aiosqlite.connect(self.db_path) as db:
            db.row_factory = aiosqlite.Row
            async with db.execute("SELECT * FROM feedback ORDER BY id") as cur:
                rows = await cur.fetchall()

        if not rows:
            return "id,query_text,category,is_relevant,timestamp,elapsed_ms,top_k,total_results,created_at\n"

        output = io.StringIO()
        writer = csv.DictWriter(output, fieldnames=dict(rows[0]).keys())  # type: ignore[arg-type]
        writer.writeheader()
        for r in rows:
            writer.writerow(dict(r))  # type: ignore[arg-type]
        return output.getvalue()
