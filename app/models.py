from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime
from .db import Base
import datetime

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


class BloodGlucoseReading(Base):
    __tablename__ = "bg_readings"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    value = Column(Float, nullable=False)  # mg/dL
    timestamp = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)
    context = Column(String, nullable=True)  # e.g., "fasting", "pre_meal", "post_meal"


class MealLog(Base):
    __tablename__ = "meal_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    meal_id = Column(Integer, ForeignKey("meals.id"), nullable=False)
    bg_before = Column(Float, nullable=True)
    bg_after = Column(Float, nullable=True)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)
