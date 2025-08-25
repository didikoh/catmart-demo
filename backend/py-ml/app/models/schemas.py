from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

class ProductRecommendation(BaseModel):
    product_id: str
    score: float
    reason: str

class RecommendationResponse(BaseModel):
    user_id: str
    items: List[str]
    algorithm: str
    generated_at: datetime
    
class SalesReportResponse(BaseModel):
    range: str
    csv_url: str
    png_url: str
    generated_at: str
    total_sales: float
    total_orders: int

class SalesDataPoint(BaseModel):
    date: str
    sales: float
    orders: int
    avg_order_value: float
