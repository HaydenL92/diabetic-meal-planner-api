from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from . import models, schemas
from .db import engine, Base
from .deps import get_db
from .routes_meals import router as meals_router
from .routes_diabetes import router as diabetes_router
from .routes_auth import router as auth_router
from .routes_recommendations import router as recommendations_router
from .security import get_password_hash


app = FastAPI(
    title="Diabetic Meal Planner API",
    version="0.3.0",
    description="Backend API for a diabetic meal recommendation app."
)

origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register the meals and diabetes router
app.include_router(auth_router)
app.include_router(meals_router)
app.include_router(diabetes_router)
app.include_router(recommendations_router)

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

    # NOTE: real apps hash passwords
    db_user = models.User(
        email=user.email,
        full_name=user.full_name,
        hashed_password=get_password_hash(user.password)
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user


@app.get("/users", response_model=list[schemas.UserRead])
def list_users(db: Session = Depends(get_db)):
    users = db.query(models.User).all()
    return users
