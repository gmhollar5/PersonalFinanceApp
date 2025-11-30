from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os

# DATABASE_URL environment variable allows switching between local SQLite and Cloud SQL
SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///C:/Users/Grant Hollar/OneDrive/Personal Desktop/Pet Projects/Finance App/finance.db")

# create_engine() creates the connection to the database
engine = create_engine(
    SQLALCHEMY_DATABASE_URL, 
    connect_args={"check_same_thread": False} if "sqlite" in SQLALCHEMY_DATABASE_URL else {}
)

# sessionmaker creates a class to generate database sessions
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base class for SQLAlchemy models
Base = declarative_base()

# Dependency function to get a session in routes
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()