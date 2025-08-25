import aiohttp
import pandas as pd
import matplotlib
matplotlib.use('Agg')  # Use non-GUI backend
import matplotlib.pyplot as plt
import seaborn as sns
import json
import os
from datetime import datetime, timedelta
from typing import Dict, Any

class ReportGenerator:
    def __init__(self):
        self.go_api_url = os.getenv("GO_API_URL", "http://go-api:8080")
        
    async def generate_sales_report(self, range_days: str) -> Dict[str, Any]:
        """
        Generate sales report with CSV data and PNG chart.
        
        Args:
            range_days: "7d" or "30d"
            
        Returns:
            Dictionary with file paths and summary data
        """
        days = 7 if range_days == "7d" else 30
        
        # Generate mock data for demo (replace with real data in production)
        sales_data = await self._generate_mock_sales_data(days)
        
        # Create timestamp for unique filenames
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        csv_filename = f"sales_report_{range_days}_{timestamp}.csv"
        png_filename = f"sales_chart_{range_days}_{timestamp}.png"
        
        # Generate CSV
        csv_path = f"/tmp/{csv_filename}"
        await self._generate_csv_report(sales_data, csv_path)
        
        # Generate PNG chart
        png_path = f"/tmp/{png_filename}"
        await self._generate_chart(sales_data, png_path, range_days)
        
        # Calculate summary statistics
        total_sales = sum(day["sales"] for day in sales_data)
        total_orders = sum(day["orders"] for day in sales_data)
        
        return {
            "csv_filename": csv_filename,
            "png_filename": png_filename,
            "generated_at": datetime.now().isoformat(),
            "total_sales": total_sales,
            "total_orders": total_orders,
            "days": days
        }
    
    async def _generate_mock_sales_data(self, days: int) -> list:
        """
        Generate mock sales data for the specified number of days.
        In production, this would fetch real data from the database.
        """
        import random
        
        sales_data = []
        base_date = datetime.now() - timedelta(days=days-1)
        
        for i in range(days):
            current_date = base_date + timedelta(days=i)
            
            # Generate realistic-looking sales data
            # Higher sales on weekends, seasonal trends, etc.
            base_sales = 1000
            weekend_boost = 1.5 if current_date.weekday() >= 5 else 1.0
            random_factor = random.uniform(0.7, 1.3)
            
            daily_sales = int(base_sales * weekend_boost * random_factor)
            daily_orders = int(daily_sales / random.uniform(40, 60))  # Average order value
            
            sales_data.append({
                "date": current_date.strftime("%Y-%m-%d"),
                "sales": daily_sales,
                "orders": daily_orders,
                "avg_order_value": round(daily_sales / daily_orders, 2) if daily_orders > 0 else 0
            })
        
        return sales_data
    
    async def _generate_csv_report(self, sales_data: list, file_path: str):
        """Generate CSV report from sales data"""
        df = pd.DataFrame(sales_data)
        
        # Add additional calculated columns
        df['day_of_week'] = pd.to_datetime(df['date']).dt.day_name()
        df['cumulative_sales'] = df['sales'].cumsum()
        
        # Save to CSV
        df.to_csv(file_path, index=False)
        
    async def _generate_chart(self, sales_data: list, file_path: str, range_days: str):
        """Generate PNG chart from sales data"""
        df = pd.DataFrame(sales_data)
        df['date'] = pd.to_datetime(df['date'])
        
        # Create figure with subplots
        fig, ((ax1, ax2), (ax3, ax4)) = plt.subplots(2, 2, figsize=(15, 10))
        fig.suptitle(f'CatMart Sales Report - Last {range_days}', fontsize=16)
        
        # 1. Daily Sales Line Chart
        ax1.plot(df['date'], df['sales'], marker='o', linewidth=2, markersize=4)
        ax1.set_title('Daily Sales')
        ax1.set_ylabel('Sales ($)')
        ax1.tick_params(axis='x', rotation=45)
        ax1.grid(True, alpha=0.3)
        
        # 2. Daily Orders Bar Chart
        ax2.bar(df['date'], df['orders'], alpha=0.7, color='skyblue')
        ax2.set_title('Daily Orders')
        ax2.set_ylabel('Number of Orders')
        ax2.tick_params(axis='x', rotation=45)
        ax2.grid(True, alpha=0.3)
        
        # 3. Average Order Value
        ax3.plot(df['date'], df['avg_order_value'], marker='s', color='green', linewidth=2)
        ax3.set_title('Average Order Value')
        ax3.set_ylabel('AOV ($)')
        ax3.tick_params(axis='x', rotation=45)
        ax3.grid(True, alpha=0.3)
        
        # 4. Sales by Day of Week (if enough data)
        if len(df) >= 7:
            df['day_of_week'] = df['date'].dt.day_name()
            dow_sales = df.groupby('day_of_week')['sales'].mean()
            # Reorder days of week
            day_order = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
            dow_sales = dow_sales.reindex([day for day in day_order if day in dow_sales.index])
            
            ax4.bar(dow_sales.index, dow_sales.values, color='lightcoral')
            ax4.set_title('Average Sales by Day of Week')
            ax4.set_ylabel('Average Sales ($)')
            ax4.tick_params(axis='x', rotation=45)
        else:
            # Cumulative sales for shorter periods
            ax4.plot(df['date'], df['sales'].cumsum(), marker='o', color='purple')
            ax4.set_title('Cumulative Sales')
            ax4.set_ylabel('Cumulative Sales ($)')
            ax4.tick_params(axis='x', rotation=45)
            ax4.grid(True, alpha=0.3)
        
        plt.tight_layout()
        plt.savefig(file_path, dpi=300, bbox_inches='tight')
        plt.close()  # Important: close to free memory
        
    async def _fetch_real_sales_data(self, days: int) -> list:
        """
        Fetch real sales data from Go API.
        This would be implemented in production.
        """
        try:
            async with aiohttp.ClientSession() as session:
                # This endpoint would need to be implemented in Go API
                url = f"{self.go_api_url}/api/analytics/sales"
                params = {"days": days}
                
                async with session.get(url, params=params) as response:
                    if response.status == 200:
                        return await response.json()
                        
        except Exception as e:
            print(f"Failed to fetch sales data: {e}")
            
        return []
