from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from . import models, schemas
from .deps import get_db

router = APIRouter(prefix="/meals", tags=["Meals"])

@router.post("/", response_model=schemas.MealRead)
def create_meal(meal: schemas.MealCreate, db: Session = Depends(get_db)):
    db_meal = models.Meal(**meal.dict())
    db.add(db_meal)
    db.commit()
    db.refresh(db_meal)
    return db_meal

@router.get("/", response_model=list[schemas.MealRead])
def list_meals(db: Session = Depends(get_db)):
    return db.query(models.Meal).all()
