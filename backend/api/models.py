"""
Django models for ELD Trip Planner
Currently unused but ready for future use with persistent storage
"""

from django.db import models


class TripPlan(models.Model):
    """Store planned trips for reference/history"""
    
    current_location = models.CharField(max_length=255)
    pickup_location = models.CharField(max_length=255)
    dropoff_location = models.CharField(max_length=255)
    current_cycle_used = models.FloatField()
    
    total_distance_miles = models.FloatField()
    total_duration_hours = models.FloatField()
    
    estimated_start = models.DateTimeField()
    estimated_end = models.DateTimeField()
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.pickup_location} → {self.dropoff_location} ({self.created_at.date()})"


class DailyLogEntry(models.Model):
    """Store individual daily log entries for trips"""
    
    DUTY_STATUS_CHOICES = [
        ('off_duty', 'Off Duty'),
        ('sleeper_berth', 'Sleeper Berth'),
        ('driving', 'Driving'),
        ('on_duty_not_driving', 'On Duty (Not Driving)'),
    ]
    
    trip_plan = models.ForeignKey(TripPlan, on_delete=models.CASCADE, related_name='daily_logs')
    
    date = models.DateField()
    day_number = models.IntegerField()
    from_location = models.CharField(max_length=255)
    to_location = models.CharField(max_length=255)
    total_miles_today = models.FloatField(default=0)
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['trip_plan', 'day_number']
    
    def __str__(self):
        return f"Day {self.day_number} - {self.date}"


class TimeSegmentEntry(models.Model):
    """Store individual time segments within a daily log"""
    
    DUTY_STATUS_CHOICES = [
        ('off_duty', 'Off Duty'),
        ('sleeper_berth', 'Sleeper Berth'),
        ('driving', 'Driving'),
        ('on_duty_not_driving', 'On Duty (Not Driving)'),
    ]
    
    daily_log = models.ForeignKey(DailyLogEntry, on_delete=models.CASCADE, related_name='segments')
    
    status = models.CharField(max_length=20, choices=DUTY_STATUS_CHOICES)
    start_time = models.DateTimeField()
    end_time = models.DateTimeField()
    location = models.CharField(max_length=255)
    duration_minutes = models.IntegerField()
    notes = models.CharField(max_length=255, blank=True)
    
    class Meta:
        ordering = ['daily_log', 'start_time']
    
    def __str__(self):
        return f"{self.status} - {self.start_time.strftime('%H:%M')}"
