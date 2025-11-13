from fastapi import FastAPI, Depends, HTTPException, status
from sqlalchemy.orm import Session

from . import models, schemas
from .db import engine, Base
from .deps import get_db
from .routes_meals import router as meals_router

app = FastAPI(
    title="Diabetic Meal Planner API",
    version="0.1.0",
    description="Backend API for a diabetic meal recommendation app."
)

# Register the meals router
app.include_router(meals_router)

# Create database tables on startup
Base.metadata.create_all(bind=engine)

@app.get("/health")
def health_check():
    return {"status": "ok"}

@app.post("/users", response_model=schemas.UserRead, status_code=status.HTTP_201_CREATED)
def create_user(user: schemas.UserCreate, db: Session = Depends(get_db)):
    # check if user already exists
    existing = db.query(models.User).filter(models.User.email == user.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    # NOTE: real apps hash passwords – we will add that soon
    db_user = models.User(
        email=user.email,
        full_name=user.full_name,
        hashed_password=user.password  # placeholder
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user


@app.get("/users", response_model=list[schemas.UserRead])
def list_users(db: Session = Depends(get_db)):
    users = db.query(models.User).all()
    return users
