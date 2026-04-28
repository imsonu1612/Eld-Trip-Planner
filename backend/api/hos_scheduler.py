"""
HOS (Hours of Service) algorithm for FMCSA compliance
Property-carrying drivers, 70-hour/8-day cycle
"""

from datetime import datetime, timedelta
from typing import List, Dict, Tuple, Optional
from dataclasses import dataclass, asdict


@dataclass
class TimeSegment:
    """Represents a segment of time in a specific duty status"""
    status: str  # 'off_duty', 'sleeper_berth', 'driving', 'on_duty_not_driving'
    start_time: datetime
    end_time: datetime
    location: str
    distance_miles: Optional[float] = None
    notes: str = ""
    
    @property
    def duration_minutes(self) -> int:
        return int((self.end_time - self.start_time).total_seconds() / 60)
    
    @property
    def duration_hours(self) -> float:
        return self.duration_minutes / 60


@dataclass
class Stop:
    """Represents a stop during the trip"""
    type: str  # 'pickup', 'dropoff', 'rest', 'sleep', 'fuel'
    location_name: str
    lat: float
    lng: float
    arrival_time: datetime
    departure_time: datetime
    duration_minutes: int
    notes: str


@dataclass
class DailyLog:
    """Represents one day's ELD log"""
    date: str
    day_number: int
    from_location: str
    to_location: str
    total_miles_today: float
    segments: List[TimeSegment]
    totals: Dict[str, float]
    remarks: List[str]
    recap: Dict[str, float]


class HOSScheduler:
    """
    Schedules a trip following FMCSA HOS rules
    """
    
    def __init__(self, config: Dict):
        self.config = config
        self.assumed_speed_mph = config.get('assumed_driving_speed_mph', 55)
        self.max_driving_hours = config.get('max_driving_hours', 11)
        self.max_on_duty_hours = config.get('max_on_duty_hours', 14)
        self.max_driving_before_break = config.get('max_driving_before_break', 8)
        self.min_break_minutes = config.get('min_break_minutes', 30)
        self.consecutive_off_duty_hours = config.get('consecutive_off_duty_hours', 10)
        self.max_cycle_hours = config.get('max_cycle_hours', 70)
        self.cycle_days = config.get('cycle_days', 8)
        self.restart_hours = config.get('restart_hours', 34)
        self.fueling_interval_miles = config.get('fueling_interval_miles', 1000)
        self.pickup_duration_hours = config.get('pickup_duration_hours', 1)
        self.dropoff_duration_hours = config.get('dropoff_duration_hours', 1)
    
    def schedule_trip(
        self,
        current_location: str,
        pickup_location: str,
        dropoff_location: str,
        route_distance_miles: float,
        route_coordinates: List[Tuple[float, float]],
        current_cycle_used_hours: float,
        start_time: datetime
    ) -> Tuple[List[TimeSegment], List[Stop], List[DailyLog]]:
        """
        Generate a complete trip schedule following HOS rules
        Returns: (segments, stops, daily_logs)
        """
        
        segments: List[TimeSegment] = []
        stops: List[Stop] = []
        
        current_time = start_time
        current_location_name = current_location
        cycle_hours_used = current_cycle_used_hours
        cumulative_miles = 0
        segments_today: List[TimeSegment] = []
        
        # 1. Start with pickup - On Duty (not driving) for 1 hour
        pickup_start = current_time
        pickup_end = current_time + timedelta(hours=self.pickup_duration_hours)
        pickup_segment = TimeSegment(
            status='on_duty_not_driving',
            start_time=pickup_start,
            end_time=pickup_end,
            location=pickup_location,
            notes='Pickup'
        )
        segments.append(pickup_segment)
        segments_today.append(pickup_segment)
        
        stops.append(Stop(
            type='pickup',
            location_name=pickup_location,
            lat=0, lng=0,  # Will be filled by route data
            arrival_time=pickup_start,
            departure_time=pickup_end,
            duration_minutes=60,
            notes='Pickup - 1 hour on duty'
        ))
        
        cycle_hours_used += self.pickup_duration_hours
        current_time = pickup_end
        
        # 2. Main driving loop
        remaining_distance = route_distance_miles
        driving_hours_since_break = 0
        on_duty_hours_since_start = self.pickup_duration_hours
        next_fuel_stop_miles = self.fueling_interval_miles
        
        # Calculate driving time
        total_driving_hours = route_distance_miles / self.assumed_speed_mph
        miles_per_hour = self.assumed_speed_mph
        
        while remaining_distance > 0:
            # Determine how much we can drive
            can_drive_hours = self.max_driving_hours - driving_hours_since_break
            can_drive_before_break = self.max_driving_before_break - driving_hours_since_break
            
            # Check 14-hour window
            hours_into_day = (current_time - current_time.replace(hour=0, minute=0, second=0, microsecond=0)).total_seconds() / 3600
            hours_left_in_window = max(0, self.max_on_duty_hours - on_duty_hours_since_start)
            
            # Check 70-hour cycle
            can_drive_cycle = max(0, self.max_cycle_hours - cycle_hours_used)
            
            # Drive until we hit a limit
            drive_hours = min(
                can_drive_before_break,
                can_drive_hours,
                hours_left_in_window,
                can_drive_cycle,
                remaining_distance / miles_per_hour
            )
            
            if drive_hours <= 0:
                # Need to take rest
                break
            
            drive_distance = drive_hours * miles_per_hour
            drive_start = current_time
            drive_end = current_time + timedelta(hours=drive_hours)
            
            driving_segment = TimeSegment(
                status='driving',
                start_time=drive_start,
                end_time=drive_end,
                location=f"{drive_distance:.0f} miles",
                distance_miles=drive_distance,
                notes='Driving'
            )
            segments.append(driving_segment)
            segments_today.append(driving_segment)
            
            cycle_hours_used += drive_hours
            on_duty_hours_since_start += drive_hours
            driving_hours_since_break += drive_hours
            cumulative_miles += drive_distance
            remaining_distance -= drive_distance
            current_time = drive_end

            # Insert fueling stop each time we cross a 1,000-mile threshold.
            while cumulative_miles >= next_fuel_stop_miles and remaining_distance > 0:
                fuel_start = current_time
                fuel_end = current_time + timedelta(minutes=self.min_break_minutes)
                fuel_segment = TimeSegment(
                    status='on_duty_not_driving',
                    start_time=fuel_start,
                    end_time=fuel_end,
                    location=f"Mile {int(next_fuel_stop_miles)}",
                    notes='Fueling stop'
                )
                segments.append(fuel_segment)
                segments_today.append(fuel_segment)

                stops.append(Stop(
                    type='fuel',
                    location_name=f"Fuel Stop ({int(next_fuel_stop_miles)} mi)",
                    lat=0,
                    lng=0,
                    arrival_time=fuel_start,
                    departure_time=fuel_end,
                    duration_minutes=self.min_break_minutes,
                    notes='Fueling stop - 30 minutes'
                ))

                cycle_hours_used += fuel_segment.duration_hours
                on_duty_hours_since_start += fuel_segment.duration_hours
                current_time = fuel_end
                driving_hours_since_break = 0
                next_fuel_stop_miles += self.fueling_interval_miles
            
            # Check if we need a 30-min break
            if driving_hours_since_break >= self.max_driving_before_break and remaining_distance > 0:
                rest_start = current_time
                rest_end = current_time + timedelta(minutes=self.min_break_minutes)
                rest_segment = TimeSegment(
                    status='off_duty',
                    start_time=rest_start,
                    end_time=rest_end,
                    location=f"Mile {int(cumulative_miles)}",
                    notes='30-minute rest break'
                )
                segments.append(rest_segment)
                segments_today.append(rest_segment)

                stops.append(Stop(
                    type='rest',
                    location_name=f"Rest Break ({int(cumulative_miles)} mi)",
                    lat=0,
                    lng=0,
                    arrival_time=rest_start,
                    departure_time=rest_end,
                    duration_minutes=self.min_break_minutes,
                    notes='30-minute mandatory break'
                ))
                
                driving_hours_since_break = 0
                current_time = rest_end
            
            # Check if we need to sleep
            if (driving_hours_since_break >= self.max_driving_hours or 
                on_duty_hours_since_start >= self.max_on_duty_hours or
                cycle_hours_used >= self.max_cycle_hours) and remaining_distance > 0:
                
                # End current day if we're close to midnight
                current_hour = current_time.hour
                if current_hour >= 22:  # If after 10 PM, sleep and continue next day
                    sleep_start = current_time
                    next_midnight = (current_time + timedelta(days=1)).replace(hour=0, minute=0, second=0, microsecond=0)
                    sleep_end = next_midnight + timedelta(hours=self.consecutive_off_duty_hours)
                    
                    sleep_segment = TimeSegment(
                        status='sleeper_berth',
                        start_time=sleep_start,
                        end_time=sleep_end,
                        location=f"Mile {int(cumulative_miles)}",
                        notes='Overnight sleep'
                    )
                    segments.append(sleep_segment)
                    # Don't add to segments_today - will go to next day

                    stops.append(Stop(
                        type='sleep',
                        location_name=f"Overnight Rest ({int(cumulative_miles)} mi)",
                        lat=0,
                        lng=0,
                        arrival_time=sleep_start,
                        departure_time=sleep_end,
                        duration_minutes=int((sleep_end - sleep_start).total_seconds() / 60),
                        notes='10-hour sleeper berth rest'
                    ))
                    
                    current_time = sleep_end
                    driving_hours_since_break = 0
                    on_duty_hours_since_start = 0
                    cycle_hours_used = 0  # Reset for new day calculation
                else:
                    sleep_start = current_time
                    sleep_end = current_time + timedelta(hours=self.consecutive_off_duty_hours)
                    
                    sleep_segment = TimeSegment(
                        status='sleeper_berth',
                        start_time=sleep_start,
                        end_time=sleep_end,
                        location=f"Mile {int(cumulative_miles)}",
                        notes='10-hour rest'
                    )
                    segments.append(sleep_segment)

                    stops.append(Stop(
                        type='sleep',
                        location_name=f"Sleeper Berth ({int(cumulative_miles)} mi)",
                        lat=0,
                        lng=0,
                        arrival_time=sleep_start,
                        departure_time=sleep_end,
                        duration_minutes=int((sleep_end - sleep_start).total_seconds() / 60),
                        notes='10-hour sleeper berth rest'
                    ))
                    
                    current_time = sleep_end
                    driving_hours_since_break = 0
                    on_duty_hours_since_start = 0
                    cycle_hours_used = 0
        
        # 3. Final dropoff - On Duty (not driving) for 1 hour
        dropoff_start = current_time
        dropoff_end = current_time + timedelta(hours=self.dropoff_duration_hours)
        dropoff_segment = TimeSegment(
            status='on_duty_not_driving',
            start_time=dropoff_start,
            end_time=dropoff_end,
            location=dropoff_location,
            notes='Dropoff'
        )
        segments.append(dropoff_segment)
        segments_today.append(dropoff_segment)
        
        stops.append(Stop(
            type='dropoff',
            location_name=dropoff_location,
            lat=0, lng=0,
            arrival_time=dropoff_start,
            departure_time=dropoff_end,
            duration_minutes=60,
            notes='Dropoff - 1 hour on duty'
        ))
        
        # 4. Generate daily logs
        daily_logs = self._generate_daily_logs(segments, pickup_location, dropoff_location, route_distance_miles)
        
        return segments, stops, daily_logs
    
    def _generate_daily_logs(self, segments: List[TimeSegment], from_location: str, to_location: str, total_distance: float) -> List[DailyLog]:
        """Group segments by calendar day and create daily logs"""
        
        daily_logs_dict: Dict[str, Dict] = {}
        day_number = 1
        
        for segment in segments:
            date_key = segment.start_time.strftime('%Y-%m-%d')
            
            if date_key not in daily_logs_dict:
                daily_logs_dict[date_key] = {
                    'segments': [],
                    'remarks': [],
                    'day_number': day_number,
                    'date': date_key,
                    'total_miles_today': 0
                }
                day_number += 1
            
            daily_logs_dict[date_key]['segments'].append(segment)
            
            if segment.status == 'driving':
                daily_logs_dict[date_key]['total_miles_today'] += segment.distance_miles or 0
                daily_logs_dict[date_key]['remarks'].append(
                    f"{segment.start_time.strftime('%H:%M')} - Driving from {segment.location}"
                )
            else:
                daily_logs_dict[date_key]['remarks'].append(
                    f"{segment.start_time.strftime('%H:%M')} - {segment.notes} at {segment.location}"
                )
        
        # Create DailyLog objects
        daily_logs = []
        for date_key in sorted(daily_logs_dict.keys()):
            log_data = daily_logs_dict[date_key]
            
            # Calculate totals
            totals = {
                'off_duty': 0,
                'sleeper_berth': 0,
                'driving': 0,
                'on_duty_not_driving': 0
            }
            
            for segment in log_data['segments']:
                if segment.status in totals:
                    totals[segment.status] += segment.duration_hours
            
            # Calculate recap (simplified)
            recap = {
                'on_duty_today': totals['on_duty_not_driving'],
                'total_last_7_days': sum(totals['on_duty_not_driving'] for _ in [1]),  # Simplified
                'available_tomorrow': max(0, self.max_cycle_hours - sum(totals['on_duty_not_driving'] for _ in [1]))
            }
            
            daily_log = DailyLog(
                date=log_data['date'],
                day_number=log_data['day_number'],
                from_location=from_location,
                to_location=to_location,
                total_miles_today=log_data['total_miles_today'],
                segments=log_data['segments'],
                totals=totals,
                remarks=log_data['remarks'],
                recap=recap
            )
            
            daily_logs.append(daily_log)
        
        return daily_logs
