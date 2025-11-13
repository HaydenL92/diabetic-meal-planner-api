from sqlalchemy import Column, Integer, String, Float
from .db import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, nullable=False, index=True)
    full_name = Column(String, nullable=True)
    hashed_password = Column(String, nullable=False)

class Meal(Base):
    __tablename__ = "meals"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    carbs = Column(Float, nullable=False)
    category = Column(String, nullable=False)  # e.g., meal, snack
    tags = Column(String, nullable=True)       # comma-separated tags, e.g., "low_carb,high_protein"