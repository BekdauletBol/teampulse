from sqlalchemy import create_engine, event
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.config import settings

if settings.is_sqlite:
    engine = create_engine(settings.database_url, connect_args={"check_same_thread": False})

    @event.listens_for(engine, "connect")
    def _enable_sqlite_fk(dbapi_connection, _record):
        # SQLite ignores FOREIGN KEY constraints unless this pragma is on per connection.
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()

else:
    # Postgres (Render): pre-ping drops stale pooled connections after the DB restarts/idles.
    engine = create_engine(settings.database_url, pool_pre_ping=True, pool_size=5, max_overflow=5)


SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


class Base(DeclarativeBase):
    pass


def get_db():
    db: Session = SessionLocal()
    try:
        yield db
    finally:
        db.close()
