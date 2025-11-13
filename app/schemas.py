from pydantic import BaseModel, EmailStr

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
