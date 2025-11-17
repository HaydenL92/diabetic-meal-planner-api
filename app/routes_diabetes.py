from datetime import datetime, timedelta, date
from sqlalchemy import func
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from . import models, schemas
from .deps import get_db, get_current_user

router = APIRouter(
    prefix="/diabetes",
    tags=["Diabetes"],
)


@router.post("/bg-readings", response_model=schemas.BGReadingRead)
def create_bg_reading(
    reading: schemas.BGReadingCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    db_reading = models.BloodGlucoseReading(
        value=reading.value,
        context=reading.context,
        user_id=current_user.id,
    )
    db.add(db_reading)
    db.commit()
    db.refresh(db_reading)
    return db_reading


@router.get("/bg-readings", response_model=list[schemas.BGReadingRead])
def list_bg_readings(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    return (
        db.query(models.BloodGlucoseReading)
        .where(models.BloodGlucoseReading.user_id == current_user.id)
        .all()
    )


@router.get("/bg-stats/today", response_model=schemas.BGStatsToday)
def get_bg_stats_today(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    today = date.today()

    avg_value, min_value, max_value, count_value = db.query(
        func.avg(models.BloodGlucoseReading.value),
        func.min(models.BloodGlucoseReading.value),
        func.max(models.BloodGlucoseReading.value),
        func.count(models.BloodGlucoseReading.id),
    ).filter(
        models.BloodGlucoseReading.user_id == current_user.id,
        func.date(models.BloodGlucoseReading.created_at) == today,
    ).one()

    return schemas.BGStatsToday(
        average=float(avg_value) if avg_value is not None else None,
        minimum=float(min_value) if min_value is not None else None,
        maximum=float(max_value) if max_value is not None else None,
        count=count_value or 0,
    )


@router.get("/bg-stats/7d", response_model=schemas.BGStats7Days)
def get_bg_stats_7_days(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    today = date.today()
    start_date = today - timedelta(days=6)  # last 7 days including today

    rows = (
        db.query(
            func.date(models.BloodGlucoseReading.created_at).label("day"),
            func.avg(models.BloodGlucoseReading.value).label("avg"),
            func.count(models.BloodGlucoseReading.id).label("count"),
        )
        .filter(
            models.BloodGlucoseReading.user_id == current_user.id,
            func.date(models.BloodGlucoseReading.created_at) >= start_date,
            func.date(models.BloodGlucoseReading.created_at) <= today,
        )
        .group_by(func.date(models.BloodGlucoseReading.created_at))
        .order_by(func.date(models.BloodGlucoseReading.created_at))
        .all()
    )

    daily_stats: list[schemas.BGStatsDaily] = []
    for row in rows:
        daily_stats.append(
            schemas.BGStatsDaily(
                date=row.day,
                average=float(row.avg) if row.avg is not None else None,
                count=row.count or 0,
            )
        )

    return schemas.BGStats7Days(daily=daily_stats)


@router.get("/bg-stats/variability", response_model=schemas.BGVariabilityStats)
def get_bg_variability(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    values = [
        v[0]
        for v in db.query(models.BloodGlucoseReading.value)
        .filter(models.BloodGlucoseReading.user_id == current_user.id)
        .all()
    ]

    count = len(values)
    if count == 0:
        return schemas.BGVariabilityStats(count=0)

    mean = sum(values) / count

    if count < 2:
        # Not enough data for real variability metrics
        return schemas.BGVariabilityStats(mean=float(mean), count=count)

    variance = sum((v - mean) ** 2 for v in values) / (count - 1)
    std_dev = variance ** 0.5

    cv = std_dev / mean if mean > 0 else None

    return schemas.BGVariabilityStats(
        mean=float(mean),
        std_dev=float(std_dev),
        coefficient_of_variation=float(cv) if cv is not None else None,
        count=count,
    )


@router.post("/meal-logs", response_model=schemas.MealLogRead)
def create_meal_log(
    meal_log: schemas.MealLogCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    db_log = models.MealLog(
        meal_id=meal_log.meal_id,
        bg_before=meal_log.bg_before,
        bg_after=meal_log.bg_after,
        user_id=current_user.id,
    )
    db.add(db_log)
    db.commit()
    db.refresh(db_log)
    return db_log


@router.get("/meal-logs", response_model=list[schemas.MealLogRead])
def list_meal_logs(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    return (
        db.query(models.MealLog)
        .where(models.MealLog.user_id == current_user.id)
        .all()
    )


@router.post("/recommend-meals", response_model=list[schemas.MealRecommendation])
def recommend_meals(
    req: schemas.MealRecommendationRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    meals = db.query(models.Meal).all()
    recommendations = []

    for meal in meals:
        reason = []

        # Rule 1: If BG is high, prefer low carb, high protein meals
        if req.current_bg > 180:
            if meal.carbs <= 15:
                reason.append("Low carb option suitable for high BG")
            if "high_protein" in (meal.tags or "").split(","):
                reason.append("High protein helps stabilize BG")
        
        # Rule 2: If BG is low, prefer fast carbs
        elif req.current_bg < 80:
            if meal.carbs >= 15:
                reason.append("Provides quick carbs for low BG")
            if "fast_carbs" in (meal.tags or "").split(","):
                reason.append("Fast-acting carbs help raise BG")

        # Rule 3: Hunger level
        if req.hunger_level >= 7:
            if meal.category == "meal":
                reason.append("Suitable for high hunger level")
        else:
            if meal.category == "snack":
                reason.append("Lighter option for low hunger")

        # Rule 4: Time of day preferences
        if req.time_of_day:
            if req.time_of_day in meal.category:
                reason.append(f"Good for {req.time_of_day}")

        # Only add meals that have at least one matching reason
        if reason:
            recommendations.append({
                "meal_id": meal.id,
                "name": meal.name,
                "carbs": meal.carbs,
                "category": meal.category,
                "tags": meal.tags,
                "reason": "; ".join(reason)
            })

    # Fallback if no rules match
    if not recommendations:
        for meal in meals:
            recommendations.append({
                "meal_id": meal.id,
                "name": meal.name,
                "carbs": meal.carbs,
                "category": meal.category,
                "tags": meal.tags,
                "reason": "General fallback recommendation"
            })

    return recommendations
