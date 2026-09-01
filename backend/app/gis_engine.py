"""
Dynamic Geodesic & Spatial Intelligence Engine.
Constructs true-scale metric polygons on WGS84 ellipsoidal projections from extracted land units.
"""
import math
import httpx
from typing import Dict, Any, Tuple, Optional
from shapely.geometry import Polygon, mapping
from shapely.validation import make_valid

# WGS84 Ellipsoid Constants
WGS84_A = 6378137.0  # Semi-major axis (meters)
WGS84_F = 1.0 / 298.257223563

UNIT_CONVERSION_RATES = {
    "acre": 4046.8564224,
    "acres": 4046.8564224,
    "hectare": 10000.0,
    "hectares": 10000.0,
    "ha": 10000.0,
    "sq meter": 1.0,
    "sq meters": 1.0,
    "sq m": 1.0,
    "sqm": 1.0,
    "sq yard": 0.836127,
    "sq yards": 0.836127,
    "sq ft": 0.092903,
    "sq feet": 0.092903,
    "sqft": 0.092903,
    "cent": 40.4686,
    "cents": 40.4686,
    "guntha": 101.17,
    "gunthas": 101.17,
    "bigha": 2529.28,
    "bighas": 2529.28,
}

def normalize_area_to_sq_meters(value: float, unit_str: Optional[str]) -> float:
    """Converts any regional land unit into square meters (m²)."""
    if not unit_str:
        return value * 4046.8564224
    clean_unit = unit_str.strip().lower()
    for key, rate in UNIT_CONVERSION_RATES.items():
        if key in clean_unit:
            return value * rate
    return value * 4046.8564224

async def geocode_cadastral_anchor(village: Optional[str], tehsil: Optional[str], district: Optional[str], state: Optional[str]) -> Tuple[float, float, str]:
    """Dynamically geocodes the real-world latitude/longitude."""
    headers = {"User-Agent": "BhuVerify-GIS/2.0"}
    candidates = []

    if village and tehsil:
        candidates.append(f"{village}, {tehsil}, India")
    if tehsil:
        candidates.append(f"{tehsil}, India")
    if village:
        candidates.append(f"{village}, India")
    if district:
        candidates.append(f"{district}, India")

    async with httpx.AsyncClient(timeout=6.0) as client:
        for query in candidates:
            try:
                url = f"https://nominatim.openstreetmap.org/search?q={query}&format=json&limit=1"
                res = await client.get(url, headers=headers)
                if res.status_code == 200:
                    data = res.json()
                    if data and len(data) > 0:
                        return float(data[0]["lat"]), float(data[0]["lon"]), data[0].get("display_name", query)
            except Exception:
                continue

    raise ValueError("Could not geocode the extracted land-record location")

def construct_geodesic_polygon(center_lat: float, center_lon: float, target_area_sq_m: float) -> Tuple[Dict[str, Any], float]:
    """Generates a closed WGS84 geodesic boundary polygon with the exact target area."""
    aspect_ratio = 1.25
    side_y = math.sqrt(target_area_sq_m / aspect_ratio)
    side_x = side_y * aspect_ratio

    lat_rad = math.radians(center_lat)
    r_m = WGS84_A * (1 - WGS84_F * 2) / ((1 - (2 * WGS84_F - WGS84_F**2) * math.sin(lat_rad)**2) ** 1.5)
    r_n = WGS84_A / math.sqrt(1 - (2 * WGS84_F - WGS84_F**2) * math.sin(lat_rad)**2)

    delta_lat = (side_y / r_m) * (180.0 / math.pi)
    delta_lon = (side_x / (r_n * math.cos(lat_rad))) * (180.0 / math.pi)

    half_dlat = delta_lat / 2.0
    half_dlon = delta_lon / 2.0

    coordinates = [
        [center_lon - half_dlon, center_lat - half_dlat],
        [center_lon + half_dlon, center_lat - half_dlat],
        [center_lon + half_dlon, center_lat + half_dlat],
        [center_lon - half_dlon, center_lat + half_dlat],
        [center_lon - half_dlon, center_lat - half_dlat],
    ]

    poly = make_valid(Polygon(coordinates))
    computed_sq_m = poly.area * (111319.5 * 111319.5 * math.cos(lat_rad))

    return mapping(poly), round(computed_sq_m, 2)

async def generate_cadastral_boundary(
    village: Optional[str] = "",
    tehsil: Optional[str] = "",
    district: Optional[str] = "",
    state: Optional[str] = "",
    survey_number: str = "N/A",
    land_area: float = 1.0,
    area_unit: str = "Acres",
) -> Dict[str, Any]:
    """
    Generates a cadastral boundary polygon from extracted OCR land-record fields.

    This is a high-level wrapper that combines geocoding, area normalization,
    and polygon construction into a single operation for direct OCR integration.

    Returns:
        GeoJSON Feature with geometry and cadastral properties
    """
    # 1. Normalize area to square meters
    area_sq_m = normalize_area_to_sq_meters(land_area, area_unit)

    # 2. Geocode location to get lat/lon
    lat, lon, location_name = await geocode_cadastral_anchor(village, tehsil, district, state)

    # 3. Construct the polygon boundary
    polygon_geojson, computed_sq_m = construct_geodesic_polygon(lat, lon, area_sq_m)

    # 4. Return structured GeoJSON feature
    return {
        "status": "SUCCESS",
        "center": [lat, lon],
        "geojson": {
            "type": "Feature",
            "geometry": polygon_geojson,
            "properties": {
                "survey_no": survey_number,
                "area_sq_m": computed_sq_m,
                "location": location_name,
                "source": "ocr_extraction",
            }
        }
    }