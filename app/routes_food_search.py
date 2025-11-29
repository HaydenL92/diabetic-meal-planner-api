# app/routes_food_search.py

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional

from .deps import get_db
from .config import settings

import httpx
from pydantic import BaseModel


router = APIRouter(
    prefix="/food-search",
    tags=["Food Search (USDA)"],
)


class FoodNutrient(BaseModel):
    name: str
    unit_name: str
    amount: float


class FoodSearchResult(BaseModel):
    fdc_id: int
    description: str
    brand_owner: Optional[str] = None
    data_type: Optional[str] = None
    nutrients: List[FoodNutrient] = []


class FoodSearchResponse(BaseModel):
    total_hits: int
    page: int
    page_size: int
    foods: List[FoodSearchResult]


@router.get("/search-foods", response_model=FoodSearchResponse)
async def search_foods(
    q: str,
    page: int = 1,
    page_size: int = 10,
    db: Session = Depends(get_db),  # kept for future local caching, not used yet
):
    """
    Proxy search to USDA FoodData Central.
    """

    if not settings.fdc_api_key:
        raise HTTPException(status_code=500, detail="USDA API key not configured")

    params = {
        "api_key": settings.fdc_api_key,
        "query": q,
        "pageNumber": page,
        "pageSize": page_size,
        "dataType": "Branded,Survey (FNDDS),SR Legacy",
    }

    url = "https://api.nal.usda.gov/fdc/v1/foods/search"

    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.get(url, params=params)

    if resp.status_code != 200:
        raise HTTPException(
            status_code=resp.status_code,
            detail=f"USDA API error: {resp.text}",
        )

    data = resp.json()

    total_hits = data.get("totalHits", 0)
    foods_raw = data.get("foods", [])

    foods: List[FoodSearchResult] = []

    for f in foods_raw:
        nutrients_list: List[FoodNutrient] = []
        for n in f.get("foodNutrients", [])[:10]:  # keep first 10 for now
            name = n.get("nutrientName")
            unit = n.get("unitName")
            amount = n.get("value")
            if name is None or unit is None or amount is None:
                continue
            nutrients_list.append(
                FoodNutrient(
                    name=name,
                    unit_name=unit,
                    amount=float(amount),
                )
            )

        foods.append(
            FoodSearchResult(
                fdc_id=f.get("fdcId"),
                description=f.get("description", ""),
                brand_owner=f.get("brandOwner"),
                data_type=f.get("dataType"),
                nutrients=nutrients_list,
            )
        )

    return FoodSearchResponse(
        total_hits=total_hits,
        page=page,
        page_size=page_size,
        foods=foods,
    )
