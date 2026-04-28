"""
Serializers for ELD Trip Planner API
"""

from rest_framework import serializers
from datetime import datetime


class TimeSegmentSerializer(serializers.Serializer):
    status = serializers.CharField()
    start_time = serializers.SerializerMethodField()
    end_time = serializers.SerializerMethodField()
    duration_minutes = serializers.IntegerField()
    location = serializers.CharField()
    
    def get_start_time(self, obj):
        return obj.start_time.isoformat()
    
    def get_end_time(self, obj):
        return obj.end_time.isoformat()


class StopSerializer(serializers.Serializer):
    type = serializers.CharField()
    location_name = serializers.CharField()
    lat = serializers.FloatField()
    lng = serializers.FloatField()
    arrival_time = serializers.SerializerMethodField()
    departure_time = serializers.SerializerMethodField()
    duration_minutes = serializers.IntegerField()
    notes = serializers.CharField()
    
    def get_arrival_time(self, obj):
        return obj.arrival_time.isoformat()
    
    def get_departure_time(self, obj):
        return obj.departure_time.isoformat()


class DailyLogSerializer(serializers.Serializer):
    date = serializers.CharField()
    day_number = serializers.IntegerField()
    from_location = serializers.CharField()
    to_location = serializers.CharField()
    total_miles_today = serializers.FloatField()
    segments = TimeSegmentSerializer(many=True)
    totals = serializers.DictField()
    remarks = serializers.ListField(child=serializers.CharField())
    recap = serializers.DictField()


class TripPlanRequestSerializer(serializers.Serializer):
    current_location = serializers.CharField(required=True)
    pickup_location = serializers.CharField(required=True)
    dropoff_location = serializers.CharField(required=True)
    current_cycle_used = serializers.FloatField(required=True, min_value=0, max_value=70)


class TripPlanResponseSerializer(serializers.Serializer):
    trip_summary = serializers.DictField()
    route_coordinates = serializers.ListField()
    route_instructions = serializers.ListField(child=serializers.CharField(), required=False)
    stops = StopSerializer(many=True)
    daily_logs = DailyLogSerializer(many=True)
