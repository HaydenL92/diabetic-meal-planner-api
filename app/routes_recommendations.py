from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import desc

from . import models, schemas
from .deps import get_db, get_current_active_user
from .models import User

router = APIRouter(prefix="/diabetes", tags=["Recommendations"])


def _classify_glycemic_load(gl: float | None) -> str:
    """
    Simple classification based on glycemic load:
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


def _bg_category_and_explanation(bg_now: float) -> tuple[str, str, set[str]]:
    """
    Map current blood glucose to:
    - a category label
    - an explanation string
    - a set of allowed impact categories for meals
    """
    if bg_now < 70:
        return (
            "low",
            "Your blood glucose is low. Prefer medium to higher-impact meals to help raise it, and follow your care plan.",
            {"medium", "high"},
        )
    elif bg_now < 130:
        return (
            "in_range",
            "Your blood glucose is in range. You can choose low or medium-impact meals.",
            {"low", "medium"},
        )
    elif bg_now < 180:
        return (
            "mild_high",
            "Your blood glucose is slightly high. Prefer lower-impact meals, with some medium-impact options.",
            {"low", "medium"},
        )
    elif bg_now < 240:
        return (
            "high",
            "Your blood glucose is high. Stick to low-impact meals that won’t spike you further.",
            {"low"},
        )
    else:
        return (
            "very_high",
            "Your blood glucose is very high. Focus on low-impact meals only and follow your care plan or provider instructions.",
            {"low"},
        )


@router.get("/recommend-meals", response_model=schemas.MealRecommendationResponse)
def recommend_meals(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user),
):
    """
    Recommend meals based on the user's latest blood glucose reading
    and the glycemic load classification of their saved meals.
    """
    # 1) Get the latest BG reading
    latest_bg = (
        db.query(models.BloodGlucoseReading)
        .filter(models.BloodGlucoseReading.user_id == current_user.id)
        .order_by(desc(models.BloodGlucoseReading.timestamp))
        .first()
    )

    if not latest_bg:
        raise HTTPException(
            status_code=400,
            detail="No blood glucose readings found. Add a reading before requesting recommendations.",
        )

    bg_now = float(latest_bg.value)

    # 2) Determine BG category, explanation, and allowed meal impact buckets
    bg_category, explanation, allowed_impacts = _bg_category_and_explanation(bg_now)

    # 3) Get all meals for this user
    meals = (
        db.query(models.Meal)
        .filter(models.Meal.user_id == current_user.id)
        .all()
    )

    if not meals:
        return schemas.MealRecommendationResponse(
            bg_now=bg_now,
            bg_category=bg_category,
            explanation="You don't have any meals saved yet. Create meals first, then the app can recommend from them.",
            suggestions=[],
        )

    suggestions: list[schemas.MealSuggestion] = []

    # 4) Compute glycemic load and impact classification for each meal
    for meal in meals:
        carbs = meal.carbs_g
        gi = meal.glycemic_index

        if carbs is not None and gi is not None:
            glycemic_load = carbs * gi / 100.0
        else:
            glycemic_load = None

        impact = _classify_glycemic_load(glycemic_load)

        # We'll build the suggestion object no matter what, but filter below.
        suggestions.append(
            schemas.MealSuggestion(
                meal_id=meal.id,
                name=meal.name,
                glycemic_load=glycemic_load,
                impact_category=impact,
                carbs_g=carbs,
                glycemic_index=gi,
            )
        )

    # 5) Filter suggestions by allowed impact categories, if we have any with known impact
    known_impact_suggestions = [s for s in suggestions if s.impact_category != "unknown"]

    filtered = [
        s for s in known_impact_suggestions if s.impact_category in allowed_impacts
    ]

    # If filtering removed everything (e.g. all meals unknown or wrong bucket),
    # fall back to all known-impact meals, then finally all meals.
    if not filtered:
        filtered = known_impact_suggestions or suggestions

    # 6) Sort by glycemic load (ascending), treating None as "large"
    def sort_key(s: schemas.MealSuggestion):
        return s.glycemic_load if s.glycemic_load is not None else 9999.0

    filtered_sorted = sorted(filtered, key=sort_key)

    # 7) Limit to top N (e.g. 5)
    top_n = filtered_sorted[:5]

    return schemas.MealRecommendationResponse(
        bg_now=bg_now,
        bg_category=bg_category,
        explanation=explanation,
        suggestions=top_n,
    )