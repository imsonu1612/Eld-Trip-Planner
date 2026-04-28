"""
Route and geocoding services using external APIs
"""

import requests
from typing import List, Tuple, Dict, Optional
import logging
from django.conf import settings

logger = logging.getLogger(__name__)


class OpenCageGeocoder:
    """Geocoding using OpenCage API (more accurate than Nominatim)"""
    
    BASE_URL = "https://api.opencagedata.com/geocode/v1/json"
    
    @staticmethod
    def geocode(location: str, api_key: str) -> Optional[Dict]:
        """
        Geocode a location string to lat/lng using OpenCage
        Returns: {'lat': float, 'lng': float, 'name': str} or None
        """
        try:
            params = {
                'q': location,
                'key': api_key,
                'limit': 1,
                'no_annotations': 1
            }
            
            response = requests.get(OpenCageGeocoder.BASE_URL, params=params, timeout=10)
            response.raise_for_status()
            
            data = response.json()
            if data.get('results') and len(data['results']) > 0:
                result = data['results'][0]
                geometry = result.get('geometry', {})
                components = result.get('components', {})
                
                # Build a clean location name
                city = components.get('city') or components.get('town') or components.get('village') or ''
                state = components.get('state') or components.get('county') or ''
                country = components.get('country', '')
                
                if city and state:
                    formatted_name = f"{city}, {state}"
                elif city:
                    formatted_name = city
                else:
                    formatted_name = result.get('formatted', location)
                
                return {
                    'lat': float(geometry.get('lat')),
                    'lng': float(geometry.get('lng')),
                    'name': formatted_name
                }
            return None
        
        except Exception as e:
            logger.error(f"OpenCage geocoding error for {location}: {str(e)}")
            return None


class NominatimGeocoder:
    """Geocoding using OpenStreetMap Nominatim (free, no API key) - Fallback"""
    
    BASE_URL = "https://nominatim.openstreetmap.org/search"
    
    @staticmethod
    def geocode(location: str) -> Optional[Dict]:
        """
        Geocode a location string to lat/lng
        Returns: {'lat': float, 'lng': float, 'name': str} or None
        """
        try:
            params = {
                'q': location,
                'format': 'json',
                'limit': 1
            }
            headers = {
                'User-Agent': 'ELDTripPlanner/1.0'
            }
            
            response = requests.get(NominatimGeocoder.BASE_URL, params=params, headers=headers, timeout=10)
            response.raise_for_status()
            
            results = response.json()
            if results:
                result = results[0]
                return {
                    'lat': float(result['lat']),
                    'lng': float(result['lon']),
                    'name': result.get('display_name', location)
                }
            return None
        
        except Exception as e:
            logger.error(f"Geocoding error for {location}: {str(e)}")
            return None


class OpenRouteServiceRouter:
    """Route planning using OpenRouteService API (free tier available)"""
    
    BASE_URL = "https://api.openrouteservice.org/v2/directions/driving-hgv"
    
    def __init__(self, api_key: str):
        self.api_key = api_key
    
    def get_route(self, start_lat: float, start_lng: float, end_lat: float, end_lng: float) -> Optional[Dict]:
        """
        Get route between two points
        Returns: {'distance_meters': float, 'duration_seconds': float, 'geometry': [...]}
        """
        if not self.api_key:
            logger.warning("OpenRouteService API key is missing; skipping ORS routing")
            return None

        try:
            headers = {
                'Accept': 'application/json, application/geo+json, application/gpx+xml, img/png; charset=utf-8',
                'Authorization': self.api_key,
                'Content-Type': 'application/json'
            }
            
            body = {
                "coordinates": [[start_lng, start_lat], [end_lng, end_lat]],
                "format": "geojson"
            }
            
            response = requests.post(self.BASE_URL, json=body, headers=headers, timeout=10)
            response.raise_for_status()
            
            data = response.json()
            
            if 'routes' in data and data['routes']:
                route = data['routes'][0]
                
                # Extract coordinates from GeoJSON
                coordinates = []
                if 'geometry' in route and 'coordinates' in route['geometry']:
                    coordinates = [[coord[1], coord[0]] for coord in route['geometry']['coordinates']]
                
                return {
                    'distance_meters': route.get('summary', {}).get('distance', 0),
                    'distance_miles': route.get('summary', {}).get('distance', 0) / 1609.34,
                    'duration_seconds': route.get('summary', {}).get('duration', 0),
                    'duration_hours': route.get('summary', {}).get('duration', 0) / 3600,
                    'coordinates': coordinates,
                    'instructions': [],
                }
            
            return None
        
        except Exception as e:
            logger.error(f"Route error: {str(e)}")
            return None


class OSRMRouter:
    """Live road routing using public OSRM service (no API key required)."""

    BASE_URL = "https://router.project-osrm.org/route/v1/driving"

    @staticmethod
    def get_route(start_lat: float, start_lng: float, end_lat: float, end_lng: float) -> Optional[Dict]:
        try:
            url = (
                f"{OSRMRouter.BASE_URL}/"
                f"{start_lng},{start_lat};{end_lng},{end_lat}"
            )
            params = {
                'overview': 'full',
                'geometries': 'geojson',
                'steps': 'true',
            }

            response = requests.get(url, params=params, timeout=15)
            response.raise_for_status()
            data = response.json()

            if 'routes' not in data or not data['routes']:
                return None

            route = data['routes'][0]
            geometry = route.get('geometry', {})
            raw_coords = geometry.get('coordinates', [])
            coordinates = [[coord[1], coord[0]] for coord in raw_coords]

            instructions: List[str] = []
            for leg in route.get('legs', []):
                for step in leg.get('steps', []):
                    maneuver = step.get('maneuver', {})
                    maneuver_type = maneuver.get('type', '').replace('_', ' ').strip()
                    modifier = maneuver.get('modifier', '').strip()
                    road_name = step.get('name', '').strip()
                    distance_miles = (step.get('distance', 0) or 0) / 1609.34

                    text_parts = []
                    if maneuver_type:
                        text_parts.append(maneuver_type.capitalize())
                    if modifier:
                        text_parts.append(modifier)
                    if road_name:
                        text_parts.append(f"onto {road_name}")

                    instruction_text = " ".join(text_parts).strip()
                    if not instruction_text:
                        instruction_text = "Continue"

                    if distance_miles > 0:
                        instruction_text = f"{instruction_text} ({distance_miles:.1f} mi)"

                    instructions.append(instruction_text)

            return {
                'distance_meters': route.get('distance', 0),
                'distance_miles': route.get('distance', 0) / 1609.34,
                'duration_seconds': route.get('duration', 0),
                'duration_hours': route.get('duration', 0) / 3600,
                'coordinates': coordinates,
                'instructions': instructions,
            }
        except Exception as e:
            logger.error(f"OSRM route error: {str(e)}")
            return None


def get_live_route(
    start_lat: float,
    start_lng: float,
    end_lat: float,
    end_lng: float,
    openroute_api_key: str = "",
) -> Optional[Dict]:
    """
    Resolve a live route from provider chain.
    Priority: OpenRouteService (if key) -> OSRM public API.
    """
    ors_route = OpenRouteServiceRouter(openroute_api_key).get_route(start_lat, start_lng, end_lat, end_lng)
    if ors_route:
        return ors_route

    return OSRMRouter.get_route(start_lat, start_lng, end_lat, end_lng)


def geocode_multiple_locations(*locations: str, api_key: str = None) -> Dict[str, Optional[Dict]]:
    """Geocode multiple locations using OpenCage (with Nominatim fallback)"""
    results = {}
    
    # Use OpenCage if API key is provided
    if api_key:
        for location in locations:
            result = OpenCageGeocoder.geocode(location, api_key)
            if result:
                results[location] = result
                logger.info(f"OpenCage geocoded '{location}' to {result['lat']}, {result['lng']}")
            else:
                # Fallback to Nominatim if OpenCage fails
                logger.warning(f"OpenCage failed for '{location}', trying Nominatim")
                results[location] = NominatimGeocoder.geocode(location)
    else:
        # Use Nominatim if no API key
        for location in locations:
            results[location] = NominatimGeocoder.geocode(location)
    
    return results
