from pydantic import BaseModel, EmailStr
import datetime
from datetime import date


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserBase(BaseModel):
    email: EmailStr
    full_name: str | None = None


class UserCreate(UserBase):
    password: str


class UserRead(UserBase):
    id: int

    class Config:
        from_attributes = True


class MealBase(BaseModel):
    name: str
    carbs: float
    category: str
    tags: str | None = None


class MealCreate(MealBase):
    pass


class MealRead(MealBase):
    id: int

    class Config:
        from_attributes = True


class BGReadingBase(BaseModel):
    value: float
    context: str | None = None


class BGReadingCreate(BGReadingBase):
    pass


class BGReadingRead(BGReadingBase):
    id: int
    timestamp: datetime.datetime

    class Config:
        from_attributes = True


class BGStatsToday(BaseModel):
    average: float | None = None
    minimum: float | None = None
    maximum: float | None = None
    count: int = 0


class BGStatsDaily(BaseModel):
    date: date
    average: float | None = None
    count: int = 0


class BGStats7Days(BaseModel):
    daily: list[BGStatsDaily]


class BGVariabilityStats(BaseModel):
    mean: float | None = None
    std_dev: float | None = None
    coefficient_of_variation: float | None = None
    count: int = 0


class MealLogBase(BaseModel):
    meal_id: int
    bg_before: float | None = None
    bg_after: float | None = None


class MealLogCreate(MealLogBase):
    pass


class MealLogRead(MealLogBase):
    id: int
    timestamp: datetime.datetime

    class Config:
        from_attributes = True


class MealRecommendationRequest(BaseModel):
    current_bg: float
    hunger_level: int  # 1–10
    time_of_day: str | None = None  # breakfast, lunch, dinner, snack


class MealRecommendation(BaseModel):
    meal_id: int
    name: str
    carbs: float
    category: str
    tags: str | None = None
    reason: str
