import os

from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.engine.url import make_url
from sqlalchemy.orm import sessionmaker, declarative_base

# Load .env file if present
load_dotenv()

# Default to SQLite for dev, can be overridden by .env
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./diabetic.db")

url = make_url(DATABASE_URL)

connect_args = {}
# Only SQLite needs check_same_thread
if url.drivername.startswith("sqlite"):
    connect_args = {"check_same_thread": False}

engine = create_engine(DATABASE_URL, connect_args=connect_args)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()