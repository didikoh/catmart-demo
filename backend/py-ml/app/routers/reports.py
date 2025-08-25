from fastapi import APIRouter, Query, HTTPException
from fastapi.responses import FileResponse
import os
from typing import Literal

from app.services.report_gen import ReportGenerator

router = APIRouter()
report_generator = ReportGenerator()

@router.get("/reports/sales")
async def generate_sales_report(
    range: Literal["7d", "30d"] = Query("7d", description="Time range for the report")
):
    """
    Generate sales report with CSV and chart.
    
    Creates:
    - CSV file with sales data
    - PNG chart visualization
    - Returns URLs to access both files
    """
    try:
        report_data = await report_generator.generate_sales_report(range)
        
        return {
            "range": range,
            "csvUrl": f"/static/{report_data['csv_filename']}",
            "pngUrl": f"/static/{report_data['png_filename']}",
            "generatedAt": report_data['generated_at'],
            "totalSales": report_data['total_sales'],
            "totalOrders": report_data['total_orders']
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate report: {str(e)}")

@router.get("/reports/download/{filename}")
async def download_report(filename: str):
    """
    Download generated report file directly.
    """
    file_path = f"/tmp/{filename}"
    
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Report file not found")
    
    return FileResponse(
        file_path,
        media_type='application/octet-stream',
        filename=filename
    )
