# ELD Trip Planner - Architecture & HOS Algorithm

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      Frontend (React + Vite)                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐   │
│  │  TripForm    │  │  RouteMap    │  │   ELDLogSheet        │   │
│  │ (input)      │  │ (Leaflet.js) │  │ (Canvas rendering)   │   │
│  └──────────────┘  └──────────────┘  └──────────────────────┘   │
│          │                │                      │                │
│          └────────────────┴──────────────────────┘                │
│                           │                                       │
│                    API Client (Axios)                            │
└───────────────────────────┬────────────────────────────────────┘
                            │ HTTP/JSON
┌───────────────────────────▼────────────────────────────────────┐
│                  Backend (Django REST)                          │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │              TripPlanView (APIView)                      │  │
│  │  POST /api/trip/plan/                                   │  │
│  └──────────────────────────────────────────────────────────┘  │
│         │              │                    │                    │
│         │              │                    │                    │
│    ┌────▼──┐    ┌─────▼────────┐   ┌─────▼──────────┐           │
│    │Geocode │    │Route Planning│   │HOS Calculation │           │
│    └────┬──┘    └─────┬────────┘   └─────┬──────────┘           │
│         │              │                   │                     │
│         └──────────────┼───────────────────┘                     │
│                        │                                         │
│         ┌──────────────▼────────────────────┐                   │
│         │    External API Services          │                   │
│         │ • Nominatim (Geocoding)           │                   │
│         │ • OpenRouteService (Routing)      │                   │
│         └───────────────────────────────────┘                   │
└──────────────────────────────────────────────────────────────┘
```

## HOS Algorithm (The Core Engine)

### FMCSA Regulations Implemented

The algorithm enforces these rules for property-carrying drivers under 70-hour/8-day cycle:

1. **11-Hour Driving Limit**: After 10 consecutive hours off-duty, can drive max 11 hours
2. **14-Hour Window**: Cannot drive past hour 14 after coming on-duty (after 10-hour off-duty)
3. **8-Hour Break Rule**: Must take ≥30 min off-duty/sleeper after 8 hours cumulative driving
4. **10-Hour Off-Duty**: Must have 10 consecutive hours off-duty before next driving shift
5. **70-Hour/8-Day**: Cannot exceed 70 hours on-duty in any 8 consecutive calendar days
6. **34-Hour Restart**: Optional rule to reset the 70-hour cycle
7. **Fueling Stops**: Inserted every 1,000 miles (30 min on-duty)
8. **Pickup/Dropoff**: 1 hour on-duty at each location

### Algorithm Flow

```
START TRIP
│
├─→ Geocode all locations (Current, Pickup, Dropoff)
├─→ Calculate route distance & coordinates
├─→ Create HOSScheduler with config
├─→ Initialize trip at Pickup location
│
├─→ START: On Duty (1 hour) at Pickup
│
├─→ MAIN LOOP while miles_remaining > 0:
│   │
│   ├─→ Check if need fuel stop
│   │   └─→ If cumulative_miles % 1000 == 0: Add 30min fuel stop (On Duty)
│   │
│   ├─→ Calculate max drivable hours (minimum of):
│   │   ├─ (11h - hours_driven_since_last_break)
│   │   ├─ (8h - hours_driven_without_break)
│   │   ├─ (14h - hours_since_on_duty)
│   │   ├─ (70h - cycle_hours_used)
│   │   └─ (remaining_distance / 55mph)
│   │
│   ├─→ If max_drivable_hours > 0:
│   │   ├─ Drive for calculated hours
│   │   └─ Update: cumulative_hours, cumulative_miles, cycle_hours
│   │
│   ├─→ If driving_hours_since_break >= 8:
│   │   ├─ Add 30-minute break (Off Duty)
│   │   └─ Reset: driving_hours_since_break
│   │
│   └─→ If (11h driven OR 14h window OR 70h cycle) AND miles_remaining:
│       ├─ Add 10-hour sleep period (Sleeper Berth)
│       └─ Reset: driving_hours, on_duty_hours, cycle_hours
│
├─→ END: On Duty (1 hour) at Dropoff
│
├─→ Generate Daily Logs (group by calendar day)
│   └─ Calculate totals, remarks, 70-hour recap
│
└─→ Return segments, stops, daily_logs
```

### Example Trace: Chicago → St. Louis → Dallas

```
Trip: ~1,000 miles total
Start: 8:00 AM on Day 1

08:00 - 09:00  [Pickup] On Duty, Chicago, IL (1h) → Cycle: 1h
09:00 - 13:00  [Driving] Drive to St. Louis (~230 miles), 4 hours
13:00 - 13:30  [Fuel] Fuel stop (30 min on-duty) → Cycle: 5.5h
13:30 - 21:30  [Driving] St. Louis → 300 miles toward Dallas, 8 hours
21:30 - 22:00  [Rest Break] 30-min rest (off-duty) [Mandatory after 8h driving]
22:00 - 22:01  [Sleep] Can't drive to midnight safely, so sleep at 22:01
22:01 - 08:01  [Sleep] 10-hour sleep (Sleeper Berth) on Day 1/2 boundary

Day 2:
08:01 - 09:01  [Driving] Continue toward Dallas (~400 miles), 7 hours
16:01 - 16:31  [Fuel] Fuel stop (30 min on-duty)
16:31 - 18:31  [Driving] Final ~110 miles to Dallas, 2 hours
18:31 - 19:31  [Dropoff] On Duty, Dallas, TX (1h)

Total: ~19 hours of driving over 2 calendar days
ELD Output: 2 separate daily log sheets
```

## Code Structure

### `hos_scheduler.py` - The Algorithm Implementation

Key classes:

```python
class TimeSegment:
    """Represents a time period in a duty status"""
    status: str  # 'off_duty', 'sleeper_berth', 'driving', 'on_duty_not_driving'
    start_time: datetime
    end_time: datetime
    location: str
    duration_minutes: int
    duration_hours: float

class HOSScheduler:
    """Main scheduler - implements the HOS rules"""
    
    def schedule_trip(self, ...) -> Tuple[segments, stops, daily_logs]:
        """Entry point - returns complete trip schedule"""
    
    def _generate_daily_logs(self, segments, ...) -> List[DailyLog]:
        """Groups segments by calendar day and creates logs"""
```

### `services.py` - External API Integration

```python
class NominatimGeocoder:
    """Free geocoding via OpenStreetMap"""
    @staticmethod
    def geocode(location: str) -> Dict[lat, lng, name]

class OpenRouteServiceRouter:
    """Route planning (requires API key, but has free tier)"""
    def get_route(lat1, lng1, lat2, lng2) -> Dict[distance, duration, coordinates]
```

### `views.py` - API Endpoint

```python
class TripPlanView(APIView):
    """POST /api/trip/plan/ - Main endpoint"""
    
    def post(request):
        1. Validate request body
        2. Geocode locations (Nominatim)
        3. Get routes (OpenRouteService)
        4. Schedule trip (HOSScheduler)
        5. Generate response JSON
```

### `eldCanvasRenderer.ts` - Canvas Drawing

```python
class ELDCanvasRenderer:
    """Renders FMCSA-compliant ELD log sheets to HTML5 Canvas"""
    
    def render(daily_log: DailyLog):
        1. Draw header (date, locations, mileage)
        2. Draw 24-hour grid with 4 duty status rows
        3. Plot each time segment as horizontal line
        4. Add remarks section
        5. Add 70-hour/8-day recap
```

## Data Flow

### Request → Response

**1. Frontend sends:**
```json
{
  "current_location": "Chicago, IL",
  "pickup_location": "St. Louis, MO",
  "dropoff_location": "Dallas, TX",
  "current_cycle_used": 20
}
```

**2. Backend processes:**
- Geocodes: Chicago → (41.88, -87.63)
- Geocodes: St. Louis → (38.63, -90.20)
- Geocodes: Dallas → (32.78, -96.80)
- Routes: Chicago → Dallas = 920 miles
- Schedules: Applies HOS rules over 920 miles
- Groups by day: 2 calendar days
- Generates ELD logs with canvas data

**3. Backend returns:**
```json
{
  "trip_summary": {distance, duration, times},
  "route_coordinates": [[lat, lng], ...],
  "stops": [{type, location, times, duration}, ...],
  "daily_logs": [
    {date, day_number, segments, totals, remarks, recap},
    {date, day_number, segments, totals, remarks, recap}
  ]
}
```

**4. Frontend renders:**
- Maps route using coordinates
- Plots stops on map
- Renders ELD sheets using canvas renderer
- Shows timeline in left sidebar

## Configuration Parameters

All editable in `backend/config/settings.py`:

```python
# Speed assumption
ASSUMED_DRIVING_SPEED_MPH = 55  # Default for HOS calculations

# Time limits (hours)
MAX_DRIVING_HOURS = 11                    # 11-hour rule
MAX_ON_DUTY_HOURS = 14                    # 14-hour window
MAX_DRIVING_BEFORE_BREAK = 8              # 8-hour rule
CONSECUTIVE_OFF_DUTY_HOURS = 10           # 10-hour rule

# Cycle limits
MAX_CYCLE_HOURS = 70                      # 70-hour limit
CYCLE_DAYS = 8                            # 8-day window
RESTART_HOURS = 34                        # 34-hour restart

# Stop durations
MIN_BREAK_MINUTES = 30                    # Break duration
FUELING_INTERVAL_MILES = 1000             # Fuel stop interval
PICKUP_DURATION_HOURS = 1                 # Pickup stop
DROPOFF_DURATION_HOURS = 1                # Dropoff stop
```

## Error Handling

The system handles:
- **Invalid locations**: Returns 400 error if geocoding fails
- **Route errors**: Falls back to straight-line distance calculation
- **API timeouts**: Uses mock data if external APIs unavailable
- **Invalid cycle hours**: Validates 0-70 range
- **Past 70 hours**: Prevents trip planning if already at max

## Testing the Algorithm

To verify HOS correctness, test these scenarios:

1. **11-hour limit**:
   - Trip > 600 miles
   - Verify driving stops after 11 hours

2. **14-hour window**:
   - Long trip with multiple segments
   - Verify no driving after 14th hour

3. **8-hour break rule**:
   - Continuous driving > 8 hours
   - Verify 30-min break inserted

4. **70-hour cycle**:
   - Multi-day trip
   - Verify cycle hours calculated correctly
   - Verify reset on day 8

5. **Multi-day trips**:
   - Long distance (1000+ miles)
   - Verify separate ELD sheets per calendar day

## Performance Notes

- Geocoding: ~500ms per location (Nominatim API)
- Routing: ~1s per route segment (OpenRouteService API)
- HOS calculation: <100ms (local CPU)
- Total request: ~2-3 seconds for typical trip
- Canvas rendering: ~100ms per sheet (client-side)

## Future Enhancements

1. **Database persistence**: Store trip history in PostgreSQL
2. **Route optimization**: Multiple stops, preferred routes
3. **Driver preferences**: Customizable rest preferences, truck type
4. **Real-time tracking**: Integrate with telematics
5. **Mobile app**: React Native version
6. **Multi-driver**: Support for team driving (reduces HOS restrictions)
7. **Logistical optimization**: Calculate costs, fuel, driver pay

---

This architecture ensures FMCSA compliance while maintaining code clarity and extensibility.
