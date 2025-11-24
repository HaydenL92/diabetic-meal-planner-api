from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from . import models, schemas
from .deps import get_db, get_current_active_user


def _classify_glycemic_load(gl: float | None) -> str:
    """
    Simple classification:
    - GL < 10  => "low"
    - 10–19    => "medium"
    - >= 20    => "high"
    """
    if gl is None:
        return "unknown"

    if gl < 10:
        return "low"
    elif gl < 20:
        return "medium"
    else:
        return "high"


router = APIRouter(prefix="/meals", tags=["Meals"])


@router.post("/", response_model=schemas.MealRead)
def create_meal(
    meal: schemas.MealCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user),
):
    db_meal = models.Meal(
        user_id=current_user.id,
        name=meal.name,
        description=meal.description,
        calories_kcal=meal.calories_kcal,
        carbs_g=meal.carbs_g,
        protein_g=meal.protein_g,
        fat_g=meal.fat_g,
        fiber_g=meal.fiber_g,
        sugar_g=meal.sugar_g,
        glycemic_index=meal.glycemic_index,
        tags=meal.tags,
        photo_url=meal.photo_url,
    )
    db.add(db_meal)
    db.commit()
    db.refresh(db_meal)
    return db_meal


@router.get("/", response_model=list[schemas.MealRead])
def list_meals(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user),
):
    return (
        db.query(models.Meal)
        .filter(models.Meal.user_id == current_user.id)
        .order_by(models.Meal.timestamp.desc())
        .all()
    )


@router.post("/logs", response_model=schemas.MealLogRead)
def create_meal_log(
    log: schemas.MealLogCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user),
):
    # Ensure the meal belongs to this user
    meal = (
        db.query(models.Meal)
        .filter(
            models.Meal.id == log.meal_id,
            models.Meal.user_id == current_user.id,
        )
        .first()
    )
    if not meal:
        raise HTTPException(status_code=404, detail="Meal not found for this user.")

    db_log = models.MealLog(
        user_id=current_user.id,
        meal_id=log.meal_id,
        bg_before=log.bg_before,
        bg_after=log.bg_after,
    )
    db.add(db_log)
    db.commit()
    db.refresh(db_log)
    return db_log


@router.get("/logs", response_model=list[schemas.MealLogRead])
def list_meal_logs(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user),
):
    return (
        db.query(models.MealLog)
        .filter(models.MealLog.user_id == current_user.id)
        .order_by(models.MealLog.timestamp.desc())
        .all()
    )

@router.get("/{meal_id}/analysis", response_model=schemas.MealAnalysis)
def analyze_single_meal(
    meal_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user),
):
    meal = (
        db.query(models.Meal)
        .filter(
            models.Meal.id == meal_id,
            models.Meal.user_id == current_user.id,
        )
        .first()
    )
    if not meal:
        raise HTTPException(status_code=404, detail="Meal not found.")

    carbs = meal.carbs_g
    gi = meal.glycemic_index

    if carbs is not None and gi is not None:
        glycemic_load = carbs * gi / 100.0
    else:
        glycemic_load = None

    impact = _classify_glycemic_load(glycemic_load)

    return schemas.MealAnalysis(
        meal_id=meal.id,
        name=meal.name,
        carbs_g=carbs,
        glycemic_index=gi,
        glycemic_load=glycemic_load,
        impact_category=impact,
    )


@router.get("/analysis/all", response_model=list[schemas.MealAnalysis])
def analyze_all_meals(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user),
):
    meals = (
        db.query(models.Meal)
        .filter(models.Meal.user_id == current_user.id)
        .order_by(models.Meal.timestamp.desc())
        .all()
    )

    results: list[schemas.MealAnalysis] = []

    for meal in meals:
        carbs = meal.carbs_g
        gi = meal.glycemic_index

        if carbs is not None and gi is not None:
            glycemic_load = carbs * gi / 100.0
        else:
            glycemic_load = None

        impact = _classify_glycemic_load(glycemic_load)

        results.append(
            schemas.MealAnalysis(
                meal_id=meal.id,
                name=meal.name,
                carbs_g=carbs,
                glycemic_index=gi,
                glycemic_load=glycemic_load,
                impact_category=impact,
            )
        )

    return results

@router.get("/{meal_id}", response_model=schemas.MealRead)
def get_meal(
    meal_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user),
):
    meal = (
        db.query(models.Meal)
        .filter(
            models.Meal.id == meal_id,
            models.Meal.user_id == current_user.id,
        )
        .first()
    )

    if not meal:
        raise HTTPException(status_code=404, detail="Meal not found")

    return meal

@router.put("/{meal_id}", response_model=schemas.MealRead)
def update_meal(
    meal_id: int,
    meal_update: schemas.MealUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    db_meal = (
        db.query(models.Meal)
        .filter(
            models.Meal.id == meal_id,
            models.Meal.user_id == current_user.id,
        )
        .first()
    )
    if not db_meal:
        raise HTTPException(status_code=404, detail="Meal not found")

    # Update basic fields
    db_meal.name = meal_update.name
    db_meal.description = meal_update.description
    db_meal.calories_kcal = meal_update.calories_kcal
    db_meal.carbs_g = meal_update.carbs_g
    db_meal.protein_g = meal_update.protein_g
    db_meal.fat_g = meal_update.fat_g
    db_meal.fiber_g = meal_update.fiber_g
    db_meal.sugar_g = meal_update.sugar_g
    db_meal.glycemic_index = meal_update.glycemic_index
    db_meal.tags = meal_update.tags
    db_meal.photo_url = meal_update.photo_url

    db.commit()
    db.refresh(db_meal)
    return db_meal
