"""
Admin interface for ELD Trip Planner
"""

from django.contrib import admin
from .models import TripPlan, DailyLogEntry, TimeSegmentEntry


class TimeSegmentEntryInline(admin.TabularInline):
    model = TimeSegmentEntry
    extra = 0
    fields = ('status', 'start_time', 'end_time', 'location', 'duration_minutes')
    readonly_fields = ('start_time', 'end_time', 'duration_minutes')


class DailyLogEntryInline(admin.TabularInline):
    model = DailyLogEntry
    extra = 0
    fields = ('date', 'day_number', 'from_location', 'to_location', 'total_miles_today')
    readonly_fields = ('date', 'day_number', 'total_miles_today')


@admin.register(TripPlan)
class TripPlanAdmin(admin.ModelAdmin):
    list_display = ('pickup_location', 'dropoff_location', 'total_distance_miles', 'estimated_start', 'created_at')
    list_filter = ('created_at', 'estimated_start')
    search_fields = ('pickup_location', 'dropoff_location')
    readonly_fields = ('created_at', 'updated_at')
    inlines = [DailyLogEntryInline]


@admin.register(DailyLogEntry)
class DailyLogEntryAdmin(admin.ModelAdmin):
    list_display = ('trip_plan', 'date', 'day_number', 'total_miles_today')
    list_filter = ('date', 'trip_plan')
    search_fields = ('trip_plan__pickup_location', 'trip_plan__dropoff_location')
    readonly_fields = ('created_at',)
    inlines = [TimeSegmentEntryInline]


@admin.register(TimeSegmentEntry)
class TimeSegmentEntryAdmin(admin.ModelAdmin):
    list_display = ('daily_log', 'status', 'start_time', 'end_time', 'duration_minutes')
    list_filter = ('status', 'daily_log__date')
    search_fields = ('location', 'notes')
    readonly_fields = ('start_time', 'end_time', 'duration_minutes')
