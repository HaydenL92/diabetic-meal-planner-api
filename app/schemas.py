from datetime import datetime, date
from pydantic import BaseModel, EmailStr


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
    description: str | None = None

    calories_kcal: float | None = None
    carbs_g: float | None = None
    protein_g: float | None = None
    fat_g: float | None = None
    fiber_g: float | None = None
    sugar_g: float | None = None
    glycemic_index: float | None = None

    tags: str | None = None
    photo_url: str | None = None


class MealCreate(MealBase):
    """
    For now we’ll treat update as “full update”:
    frontend will send all fields, just like create.
    If you later want PATCH behavior, we can make these optional.
    """
    pass


class MealUpdate(MealBase):
    """
    For now, update uses the same fields as create.
    The frontend sends all fields, same as MealCreate.
    If we later want partial updates (PATCH), we can make
    these fields optional instead.
    """
    pass


class MealRead(MealBase):
    id: int
    timestamp: datetime

    class Config:
        from_attributes = True


class MealAnalysis(BaseModel):
    meal_id: int
    name: str
    carbs_g: float | None = None
    glycemic_index: float | None = None
    glycemic_load: float | None = None
    impact_category: str

    class Config:
        from_attributes = True


class MealSuggestion(BaseModel):
    meal_id: int
    name: str
    glycemic_load: float | None = None
    impact_category: str
    carbs_g: float | None = None
    glycemic_index: float | None = None

    class Config:
        from_attributes = True


class MealRecommendationResponse(BaseModel):
    bg_now: float
    bg_category: str
    explanation: str
    suggestions: list[MealSuggestion]


class BGReadingBase(BaseModel):
    value: float
    context: str | None = None


class BGReadingCreate(BGReadingBase):
    pass


class BGReadingRead(BGReadingBase):
    id: int
    timestamp: datetime

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
    """Used when logging a meal event."""
    pass


class MealLogRead(MealLogBase):
    id: int
    timestamp: datetime

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
