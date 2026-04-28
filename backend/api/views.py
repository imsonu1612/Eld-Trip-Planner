"""
API views for ELD Trip Planner
"""

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.conf import settings
from datetime import datetime, timedelta
import logging

from .serializers import TripPlanRequestSerializer, TripPlanResponseSerializer
from .services import geocode_multiple_locations, get_live_route
from .hos_scheduler import HOSScheduler

logger = logging.getLogger(__name__)


def _place_stops_on_route(stops, route_coordinates):
    """Place generated non-address stops (rest/fuel/sleep) along the route polyline."""
    if not route_coordinates:
        return

    zero_coord_indices = [
        index for index, stop in enumerate(stops)
        if abs(stop.lat) < 1e-9 and abs(stop.lng) < 1e-9
    ]

    if not zero_coord_indices:
        return

    max_index = len(route_coordinates) - 1
    for placement_order, stop_index in enumerate(zero_coord_indices, start=1):
        ratio = placement_order / (len(zero_coord_indices) + 1)
        coord_index = min(max_index, max(0, int(ratio * max_index)))
        stop_coord = route_coordinates[coord_index]
        stops[stop_index].lat = stop_coord[0]
        stops[stop_index].lng = stop_coord[1]


class TripPlanView(APIView):
    """
    POST /api/trip/plan/
    
    Plan a trip with HOS-compliant schedule and route
    """
    
    def post(self, request):
        # Validate request
        serializer = TripPlanRequestSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        current_location = serializer.validated_data['current_location']
        pickup_location = serializer.validated_data['pickup_location']
        dropoff_location = serializer.validated_data['dropoff_location']
        current_cycle_used = serializer.validated_data['current_cycle_used']
        
        try:
            # Step 1: Geocode all locations
            logger.info(f"Geocoding locations: {current_location}, {pickup_location}, {dropoff_location}")
            geo_results = geocode_multiple_locations(current_location, pickup_location, dropoff_location)
            
            current_geo = geo_results.get(current_location)
            pickup_geo = geo_results.get(pickup_location)
            dropoff_geo = geo_results.get(dropoff_location)
            
            if not all([current_geo, pickup_geo, dropoff_geo]):
                return Response(
                    {'error': 'Could not geocode all locations. Please check your input.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Step 2: Get routes
            logger.info("Getting live routes from provider chain")

            # Route from current location to pickup
            route_to_pickup = get_live_route(
                current_geo['lat'], current_geo['lng'],
                pickup_geo['lat'], pickup_geo['lng'],
                settings.OPENROUTE_API_KEY,
            )
            
            # Route from pickup to dropoff (main trip)
            route_main = get_live_route(
                pickup_geo['lat'], pickup_geo['lng'],
                dropoff_geo['lat'], dropoff_geo['lng'],
                settings.OPENROUTE_API_KEY,
            )
            
            if not route_main:
                return Response(
                    {'error': 'Could not calculate route. Please try again.'},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
            
            total_distance_miles = route_main['distance_miles']
            route_main_coordinates = route_main.get('coordinates', [])
            route_coordinates = route_main_coordinates

            # Build a full displayed polyline: current -> pickup -> dropoff.
            pickup_leg = route_to_pickup.get('coordinates', []) if route_to_pickup else []
            if pickup_leg and route_coordinates:
                route_coordinates = pickup_leg + route_coordinates[1:]
            elif pickup_leg:
                route_coordinates = pickup_leg

            route_instructions = []
            if route_to_pickup and route_to_pickup.get('instructions'):
                route_instructions.append('Current location to pickup:')
                route_instructions.extend(route_to_pickup['instructions'])

            if route_main.get('instructions'):
                route_instructions.append('Pickup to dropoff:')
                route_instructions.extend(route_main['instructions'])
            
            # Step 3: Schedule the trip using HOS rules
            logger.info(f"Scheduling trip with HOS rules. Distance: {total_distance_miles:.1f} miles")
            
            scheduler_config = {
                'assumed_driving_speed_mph': settings.ASSUMED_DRIVING_SPEED_MPH,
                'max_driving_hours': settings.MAX_DRIVING_HOURS,
                'max_on_duty_hours': settings.MAX_ON_DUTY_HOURS,
                'max_driving_before_break': settings.MAX_DRIVING_BEFORE_BREAK,
                'min_break_minutes': settings.MIN_BREAK_MINUTES,
                'consecutive_off_duty_hours': settings.CONSECUTIVE_OFF_DUTY_HOURS,
                'max_cycle_hours': settings.MAX_CYCLE_HOURS,
                'cycle_days': settings.CYCLE_DAYS,
                'restart_hours': settings.RESTART_HOURS,
                'fueling_interval_miles': settings.FUELING_INTERVAL_MILES,
                'pickup_duration_hours': settings.PICKUP_DURATION_HOURS,
                'dropoff_duration_hours': settings.DROPOFF_DURATION_HOURS,
            }
            
            scheduler = HOSScheduler(scheduler_config)
            
            # Start time: now (or next 8 AM for realistic planning)
            start_time = datetime.now().replace(hour=8, minute=0, second=0, microsecond=0)
            if datetime.now().hour > 8:
                start_time += timedelta(days=1)
            
            segments, stops_raw, daily_logs = scheduler.schedule_trip(
                current_location=current_location,
                pickup_location=pickup_location,
                dropoff_location=dropoff_location,
                route_distance_miles=total_distance_miles,
                route_coordinates=route_coordinates,
                current_cycle_used_hours=current_cycle_used,
                start_time=start_time
            )
            
            # Step 4: Enrich stops with geocoded coordinates
            stops = []
            for stop in stops_raw:
                if stop.location_name == pickup_location:
                    stop.lat, stop.lng = pickup_geo['lat'], pickup_geo['lng']
                elif stop.location_name == dropoff_location:
                    stop.lat, stop.lng = dropoff_geo['lat'], dropoff_geo['lng']
                stops.append(stop)

            _place_stops_on_route(stops, route_main_coordinates)
            
            # Calculate trip summary
            trip_duration_hours = (segments[-1].end_time - segments[0].start_time).total_seconds() / 3600
            
            response_data = {
                'trip_summary': {
                    'total_distance_miles': total_distance_miles,
                    'total_duration_hours': trip_duration_hours,
                    'estimated_start': segments[0].start_time.isoformat(),
                    'estimated_end': segments[-1].end_time.isoformat(),
                },
                'route_coordinates': route_coordinates,
                'route_instructions': route_instructions,
                'stops': stops,
                'daily_logs': daily_logs,
            }
            
            # Serialize response
            response_serializer = TripPlanResponseSerializer(response_data)
            
            logger.info(f"Trip planned successfully: {total_distance_miles:.1f} miles, {trip_duration_hours:.1f} hours")
            
            return Response(response_serializer.data, status=status.HTTP_200_OK)
        
        except Exception as e:
            logger.exception(f"Error planning trip: {str(e)}")
            return Response(
                {'error': f'Internal server error: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class HealthCheckView(APIView):
    """Simple health check endpoint"""
    
    def get(self, request):
        return Response({'status': 'ok'}, status=status.HTTP_200_OK)
