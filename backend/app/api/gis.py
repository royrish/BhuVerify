"""
GIS Parcel Plotting API Endpoint.
"""
from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional, Dict, Any
from app.gis_engine import (
    normalize_area_to_sq_meters,
    geocode_cadastral_anchor,
    construct_geodesic_polygon
)

router = APIRouter(prefix="/gis", tags=["GIS & Spatial Intelligence"])

class PlotParcelRequest(BaseModel):
    tehsil: str
    village: Optional[str] = ""
    district: Optional[str] = ""
    state: Optional[str] = ""
    survey_number: str
    land_area: float
    area_unit: str = "Acres"

@router.post("/plot-parcel")
async def plot_parcel(payload: PlotParcelRequest) -> Dict[str, Any]:
    # 1. Normalize area magnitude
    area_sq_m = normalize_area_to_sq_meters(payload.land_area, payload.area_unit)

    # 2. Geocode location
    lat, lon, location_name = await geocode_cadastral_anchor(
        payload.village, payload.tehsil, payload.district, payload.state
    )

    # 3. Construct boundary polygon
    polygon_geojson, computed_sq_m = construct_geodesic_polygon(lat, lon, area_sq_m)

    return {
        "status": "SUCCESS",
        "center": [lat, lon],
        "geojson": {
            "type": "Feature",
            "geometry": polygon_geojson,
            "properties": {
                "survey_no": payload.survey_number,
                "area_sq_m": computed_sq_m,
                "location": location_name
            }
        }
    }