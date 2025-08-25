import aiohttp
import json
import os
import random
from typing import List, Dict, Any

class RecommendationService:
    def __init__(self):
        self.go_api_url = os.getenv("GO_API_URL", "http://go-api:8080")
        
    async def get_recommendations(self, user_id: str) -> List[str]:
        """
        Get product recommendations for a user.
        
        Algorithm:
        1. Fetch user's order history from Go API
        2. Find most purchased categories
        3. Return popular products from those categories
        4. Fallback to overall popular products
        """
        try:
            # Try to get user's order history
            user_orders = await self._fetch_user_orders(user_id)
            
            if user_orders:
                # Analyze user's purchase patterns
                categories = self._extract_categories_from_orders(user_orders)
                
                # Get recommendations based on categories
                recommendations = await self._get_category_recommendations(categories)
                
                if recommendations:
                    return recommendations
            
        except Exception as e:
            print(f"Error fetching user data: {e}")
        
        # Fallback to general recommendations
        return await self.get_fallback_recommendations()
    
    async def get_fallback_recommendations(self) -> List[str]:
        """
        Get fallback recommendations when user data is not available.
        Uses seed data or popular products.
        """
        try:
            # Try to get products from Go API
            products = await self._fetch_products()
            
            if products:
                # Return random selection of products
                product_ids = [p["id"] for p in products[:8]]
                random.shuffle(product_ids)
                return product_ids[:4]
                
        except Exception as e:
            print(f"Error fetching products: {e}")
        
        # Final fallback - read from seed file
        return await self._get_seed_recommendations()
    
    async def _fetch_user_orders(self, user_id: str) -> List[Dict[Any, Any]]:
        """Fetch user orders from Go API"""
        try:
            async with aiohttp.ClientSession() as session:
                # Note: This would require JWT token in real implementation
                # For demo, we'll simulate or skip authentication
                url = f"{self.go_api_url}/api/orders/user/{user_id}"
                async with session.get(url) as response:
                    if response.status == 200:
                        return await response.json()
        except Exception as e:
            print(f"Failed to fetch user orders: {e}")
        return []
    
    async def _fetch_products(self, category: str = None) -> List[Dict[Any, Any]]:
        """Fetch products from Go API"""
        try:
            async with aiohttp.ClientSession() as session:
                url = f"{self.go_api_url}/api/products"
                params = {}
                if category:
                    params["category"] = category
                    
                async with session.get(url, params=params) as response:
                    if response.status == 200:
                        return await response.json()
        except Exception as e:
            print(f"Failed to fetch products: {e}")
        return []
    
    def _extract_categories_from_orders(self, orders: List[Dict]) -> List[str]:
        """Extract most common categories from user's orders"""
        categories = []
        for order in orders:
            for item in order.get("items", []):
                if "product" in item and "category" in item["product"]:
                    categories.append(item["product"]["category"])
        
        # Count categories and return most common
        from collections import Counter
        category_counts = Counter(categories)
        return [cat for cat, _ in category_counts.most_common(3)]
    
    async def _get_category_recommendations(self, categories: List[str]) -> List[str]:
        """Get product recommendations based on categories"""
        recommendations = []
        
        for category in categories[:2]:  # Top 2 categories
            products = await self._fetch_products(category)
            if products:
                # Get top products from this category
                category_products = [p["id"] for p in products[:3]]
                recommendations.extend(category_products)
        
        return recommendations[:4]  # Return top 4
    
    async def _get_seed_recommendations(self) -> List[str]:
        """Get recommendations from seed data as final fallback"""
        try:
            # Try different possible locations for seed file
            seed_paths = [
                "/app/seed/seed_products.json",
                "./seed/seed_products.json", 
                "../../infra/seed/seed_products.json"
            ]
            
            seed_data = None
            for path in seed_paths:
                try:
                    with open(path, 'r') as f:
                        seed_data = json.load(f)
                    break
                except FileNotFoundError:
                    continue
            
            if seed_data:
                # Return random selection of products
                random.shuffle(seed_data)
                return [f"mock-{i}" for i in range(min(4, len(seed_data)))]
                
        except Exception as e:
            print(f"Failed to read seed data: {e}")
        
        # Ultimate fallback - mock recommendations
        return ["mock-1", "mock-2", "mock-3", "mock-4"]
