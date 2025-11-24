import datetime as dt

from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime
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
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)

    # Core info
    name = Column(String, nullable=False)
    description = Column(String, nullable=True)

    # Nutrition (per meal serving)
    calories_kcal = Column(Float, nullable=True)
    carbs_g = Column(Float, nullable=True)
    protein_g = Column(Float, nullable=True)
    fat_g = Column(Float, nullable=True)
    fiber_g = Column(Float, nullable=True)
    sugar_g = Column(Float, nullable=True)
    glycemic_index = Column(Float, nullable=True)  # optional if you have it

    # Tags & photo
    tags = Column(String, nullable=True)      # e.g. "breakfast,high-carb,homemade"
    photo_url = Column(String, nullable=True) # for now: paste URL; later: S3/Cloudinary

    timestamp = Column(
        DateTime,
        default=dt.datetime.utcnow,
        nullable=False,
    )

class BloodGlucoseReading(Base):
    __tablename__ = "bg_readings"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    value = Column(Float, nullable=False)  # mg/dL
    timestamp = Column(DateTime, default=dt.datetime.utcnow, nullable=False)
    context = Column(String, nullable=True)  # e.g., "fasting", "pre_meal", "post_meal"


class MealLog(Base):
    __tablename__ = "meal_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    meal_id = Column(Integer, ForeignKey("meals.id"), nullable=False)

    # BG around this meal – optional at creation
    bg_before = Column(Float, nullable=True)  # mg/dL
    bg_after = Column(Float, nullable=True)   # mg/dL

    timestamp = Column(
        DateTime,
        default=dt.datetime.utcnow,
        nullable=False,
    )