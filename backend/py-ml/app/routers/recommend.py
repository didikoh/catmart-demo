from fastapi import APIRouter, Query
from typing import List
import os

from app.services.recommender import RecommendationService

router = APIRouter()
recommendation_service = RecommendationService()

@router.get("/recommendations")
async def get_recommendations(userId: str = Query(..., description="User ID for recommendations")):
    """
    Get product recommendations for a user.
    
    Uses simple rule-based logic:
    - Fetches user's order history from Go API
    - Returns popular products from same categories
    - Falls back to overall popular products if no history
    """
    try:
        recommendations = await recommendation_service.get_recommendations(userId)
        return {
            "userId": userId,
            "items": recommendations,
            "algorithm": "rule-based-v1",
            "message": "Replace with ML model for production"
        }
    except Exception as e:
        # Fallback to static recommendations
        fallback_recommendations = await recommendation_service.get_fallback_recommendations()
        return {
            "userId": userId,
            "items": fallback_recommendations,
            "algorithm": "fallback",
            "error": str(e)
        }
