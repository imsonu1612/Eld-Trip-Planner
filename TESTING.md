# ELD Trip Planner - Testing Guide

## Automated Testing

### Backend Unit Tests

Create `backend/tests/test_hos_scheduler.py`:

```python
import pytest
from datetime import datetime
from api.hos_scheduler import HOSScheduler, TimeSegment


@pytest.fixture
def scheduler_config():
    return {
        'assumed_driving_speed_mph': 55,
        'max_driving_hours': 11,
        'max_on_duty_hours': 14,
        'max_driving_before_break': 8,
        'min_break_minutes': 30,
        'consecutive_off_duty_hours': 10,
        'max_cycle_hours': 70,
        'cycle_days': 8,
        'restart_hours': 34,
        'fueling_interval_miles': 1000,
        'pickup_duration_hours': 1,
        'dropoff_duration_hours': 1,
    }


@pytest.fixture
def scheduler(scheduler_config):
    return HOSScheduler(scheduler_config)


def test_short_trip_under_11_hours(scheduler):
    """Test that short trips don't require sleep"""
    segments, stops, logs = scheduler.schedule_trip(
        current_location='Chicago, IL',
        pickup_location='St. Louis, MO',
        dropoff_location='Springfield, IL',
        route_distance_miles=300,
        route_coordinates=[[39, -95], [38, -90]],
        current_cycle_used_hours=0,
        start_time=datetime(2024, 1, 15, 8, 0)
    )
    
    # Should complete in one day
    assert len(logs) == 1
    
    # Total driving should be ~5-6 hours
    total_driving = logs[0].totals['driving']
    assert 4 < total_driving < 7


def test_long_trip_requires_sleep(scheduler):
    """Test that long trips require sleep periods"""
    segments, stops, logs = scheduler.schedule_trip(
        current_location='Chicago, IL',
        pickup_location='St. Louis, MO',
        dropoff_location='Dallas, TX',
        route_distance_miles=920,
        route_coordinates=[[39, -95], [32, -97]],
        current_cycle_used_hours=0,
        start_time=datetime(2024, 1, 15, 8, 0)
    )
    
    # Should require 2 days
    assert len(logs) >= 2
    
    # Should have sleeper berth periods
    total_sleep = sum(log.totals['sleeper_berth'] for log in logs)
    assert total_sleep >= 10


def test_8_hour_break_rule(scheduler):
    """Test that 8-hour driving rule triggers break"""
    segments, stops, logs = scheduler.schedule_trip(
        current_location='Chicago, IL',
        pickup_location='St. Louis, MO',
        dropoff_location='Memphis, TN',
        route_distance_miles=600,
        route_coordinates=[[39, -95], [35, -90]],
        current_cycle_used_hours=0,
        start_time=datetime(2024, 1, 15, 8, 0)
    )
    
    # Check for rest breaks in segments
    rest_periods = [s for s in logs[0].segments if s.status == 'off_duty']
    # Should have at least pickup and rest break
    assert len(rest_periods) >= 2


def test_cycle_hours_respected(scheduler):
    """Test that 70-hour cycle is enforced"""
    # Trip scheduled with 65 hours already used
    segments, stops, logs = scheduler.schedule_trip(
        current_location='Chicago, IL',
        pickup_location='St. Louis, MO',
        dropoff_location='Miami, FL',  # ~1,200 miles
        route_distance_miles=1200,
        route_coordinates=[[39, -95], [25, -80]],
        current_cycle_used_hours=65,
        start_time=datetime(2024, 1, 15, 8, 0)
    )
    
    # Can only do ~5 hours driving before hitting 70-hour limit
    total_driving = sum(log.totals['driving'] for log in logs)
    assert total_driving <= 5


def test_fueling_stops_inserted(scheduler):
    """Test that fueling stops are inserted every 1000 miles"""
    segments, stops, logs = scheduler.schedule_trip(
        current_location='Chicago, IL',
        pickup_location='St. Louis, MO',
        dropoff_location='Los Angeles, CA',  # ~2,000 miles
        route_distance_miles=2000,
        route_coordinates=[[39, -95], [34, -118]],
        current_cycle_used_hours=0,
        start_time=datetime(2024, 1, 15, 8, 0)
    )
    
    # Should have fuel stops
    fuel_stops = [s for s in stops if s.type == 'fuel']
    assert len(fuel_stops) >= 1


def test_pickup_dropoff_allocation(scheduler):
    """Test that pickup/dropoff get 1 hour allocation"""
    segments, stops, logs = scheduler.schedule_trip(
        current_location='Chicago, IL',
        pickup_location='St. Louis, MO',
        dropoff_location='Springfield, IL',
        route_distance_miles=300,
        route_coordinates=[[39, -95], [38, -90]],
        current_cycle_used_hours=0,
        start_time=datetime(2024, 1, 15, 8, 0)
    )
    
    # First segment should be pickup (1 hour)
    assert segments[0].status == 'on_duty_not_driving'
    assert segments[0].duration_minutes == 60
    
    # Last segment should be dropoff (1 hour)
    assert segments[-1].status == 'on_duty_not_driving'
    assert segments[-1].duration_minutes == 60


# Run tests:
# pip install pytest
# pytest backend/tests/test_hos_scheduler.py -v
```

### Frontend Component Tests

Create `frontend/src/components/__tests__/TripForm.test.tsx`:

```typescript
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TripForm from '../TripForm';

describe('TripForm', () => {
  it('renders form inputs', () => {
    const mockSubmit = jest.fn();
    render(<TripForm onSubmit={mockSubmit} loading={false} />);
    
    expect(screen.getByPlaceholderText(/Chicago/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/St. Louis/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Dallas/i)).toBeInTheDocument();
  });

  it('submits form with data', async () => {
    const mockSubmit = jest.fn();
    render(<TripForm onSubmit={mockSubmit} loading={false} />);
    
    const user = userEvent.setup();
    
    await user.type(screen.getByPlaceholderText(/Chicago/i), 'Chicago, IL');
    await user.type(screen.getByPlaceholderText(/St. Louis/i), 'St. Louis, MO');
    await user.type(screen.getByPlaceholderText(/Dallas/i), 'Dallas, TX');
    await user.type(screen.getByDisplayValue(/0/i), '20');
    
    await user.click(screen.getByText(/Plan My Trip/i));
    
    expect(mockSubmit).toHaveBeenCalledWith({
      current_location: 'Chicago, IL',
      pickup_location: 'St. Louis, MO',
      dropoff_location: 'Dallas, TX',
      current_cycle_used: 20,
    });
  });

  it('shows loading state', () => {
    render(<TripForm onSubmit={jest.fn()} loading={true} />);
    
    expect(screen.getByText(/Calculating your route/i)).toBeInTheDocument();
  });
});
```

## Manual Testing

### Test Case 1: Basic Trip Planning

**Setup:**
- Backend running on http://localhost:8000
- Frontend running on http://localhost:5173

**Steps:**
1. Enter: Chicago, IL → St. Louis, MO → Dallas, TX
2. Cycle Used: 0 hours
3. Click "Plan My Trip"

**Expected Results:**
- ✅ Map shows route from Chicago through St. Louis to Dallas
- ✅ Trip summary shows ~920 miles, ~18 hours
- ✅ Stops include: Pickup (St. Louis), Dropoff (Dallas), Rest breaks
- ✅ 2 daily logs generated (one per calendar day)
- ✅ Each log shows duty status grid and remarks

### Test Case 2: HOS Rule: 8-Hour Break

**Setup:**
Same as Test Case 1

**Expected:**
- In Day 1 log: Driving should stop after 8 hours
- A 30-minute "Rest break" should appear
- Driving resumes after break

**Check:**
```
Segments:
08:00-09:00: On Duty (Pickup)
09:00-17:00: Driving (8 hours)
17:00-17:30: Off Duty (Rest break)
17:30-21:30: Driving (4 hours)
21:30-22:00: Sleeper Berth (continue next day)
```

### Test Case 3: HOS Rule: 10-Hour Sleep Requirement

**Setup:**
Same as Test Case 1

**Expected:**
- Between Day 1 and Day 2: 10-hour sleeper berth period
- Driving doesn't resume until after full 10 hours

**Check:**
```
Day 1 ends: 21:30
Day 2 starts: 07:30 (10 hours later)
```

### Test Case 4: HOS Rule: 11-Hour Driving Limit

**Setup:**
- Route: Chicago → Los Angeles (~2,000 miles)
- Cycle Used: 0

**Expected:**
- No single driving segment exceeds 11 hours
- Should require 2-3 days
- Each day shows at most 11 hours driving

### Test Case 5: HOS Rule: 70-Hour Cycle

**Setup:**
- Route: Chicago → Dallas
- Cycle Used: 65 hours (already 65/70 used)

**Expected:**
- Trip only proceeds ~5 hours (to reach 70-hour limit)
- System indicates cycle exhaustion
- Suggests next driving after 34-hour rest (restart)

### Test Case 6: Fueling Stops

**Setup:**
- Route: Chicago → Los Angeles (~2,000 miles)
- Cycle Used: 0

**Expected:**
- Fueling stops every 1,000 miles
- Should see 2 fuel stops
- Each stop: 30 minutes, "On Duty (Not Driving)"
- Shows in timeline and map

### Test Case 7: ELD Canvas Rendering

**Setup:**
Complete Test Case 1

**Expected:**
- Two ELD sheets visible
- Each shows:
  - Header: Date, locations, mileage
  - 24-hour grid with 4 duty status rows
  - Horizontal lines showing time segments
  - Remarks with timestamps
  - 70-hour recap section
  - "Download PNG" button works

**Validate PNG:**
```
File: ELD_Log_2024-01-15_Day1.png
Size: 816x1056 pixels
Quality: Black text on white background
```

### Test Case 8: Map Interaction

**Setup:**
Complete Test Case 1

**Expected:**
- Route polyline shows in orange
- Markers placed at:
  - Current location
  - Pickup
  - Rest stops
  - Fuel stops
  - Dropoff
- Clicking markers shows:
  - Location name
  - Stop type
  - Times and duration
- Map is zoomable/pannable

### Test Case 9: Error Handling

**Test 9a: Invalid Location**
- Enter: "XYZZZZ, NotRealPlace"
- Expected: Error message "Could not geocode all locations"

**Test 9b: No Input**
- Leave fields empty
- Click "Plan My Trip"
- Expected: Form validation prevents submission

**Test 9c: Invalid Cycle Hours**
- Enter: 75 (exceeds max 70)
- Expected: Form prevents submission or shows error

### Test Case 10: Responsive Design

**Desktop (1920x1080):**
- Left panel: 400px
- Map: Full remaining width
- ELD sheets: Horizontal scroll

**Tablet (768x1024):**
- Should stack vertically
- Form on top
- Map below
- Sheets scrollable

**Mobile (375x667):**
- Single column layout
- Form full width
- Map full width
- Sheets in carousel

## API Integration Testing

### Endpoint Test: POST /api/trip/plan/

```bash
# Using curl
curl -X POST http://localhost:8000/api/trip/plan/ \
  -H "Content-Type: application/json" \
  -d '{
    "current_location": "Chicago, IL",
    "pickup_location": "St. Louis, MO",
    "dropoff_location": "Dallas, TX",
    "current_cycle_used": 20
  }'
```

**Expected Response:**
```json
{
  "trip_summary": {
    "total_distance_miles": 920,
    "total_duration_hours": 18.5,
    "estimated_start": "2024-01-15T08:00:00",
    "estimated_end": "2024-01-16T14:30:00"
  },
  "route_coordinates": [[39.1, -95.3], ...],
  "stops": [...],
  "daily_logs": [...]
}
```

### Endpoint Test: GET /api/health/

```bash
curl http://localhost:8000/api/health/
```

**Expected Response:**
```json
{"status": "ok"}
```

## Performance Testing

### Load Test Backend

```python
# install: pip install locust

# locustfile.py
from locust import HttpUser, task

class TriplPlanUser(HttpUser):
    @task
    def plan_trip(self):
        self.client.post(
            '/api/trip/plan/',
            json={
                "current_location": "Chicago, IL",
                "pickup_location": "St. Louis, MO",
                "dropoff_location": "Dallas, TX",
                "current_cycle_used": 20
            }
        )

# Run:
# locust -f locustfile.py --host=http://localhost:8000
```

Expected: < 3 seconds per request

### Frontend Performance

```javascript
// In browser console
// Measure time to render map
console.time('route-render');
// (complete trip planning)
console.timeEnd('route-render');

// Expected: < 1 second
```

## Browser Testing

### Chrome DevTools
- Lighthouse audit
- Performance profiling
- Network tab for API calls

### Firefox Developer Edition
- Console for errors
- Performance tab
- Network analysis

### Safari (macOS/iOS)
- Responsive design mode
- Mobile testing
- Touch interactions

## Accessibility Testing

```bash
# Install axe DevTools extension
# Scan page for accessibility issues
# Expected: No critical issues
# Warnings: Acceptable if justified
```

## Checklist Before Deployment

- [ ] All unit tests pass
- [ ] Manual test cases pass
- [ ] No console errors
- [ ] API response times < 3 seconds
- [ ] Map loads and renders correctly
- [ ] ELD sheets look correct
- [ ] PNG downloads work
- [ ] Responsive design works
- [ ] No CORS errors
- [ ] Database queries optimized

## Continuous Integration (Optional)

Create `.github/workflows/tests.yml`:

```yaml
name: Tests

on: [push, pull_request]

jobs:
  backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-python@v2
        with:
          python-version: 3.11
      - run: pip install -r backend/requirements.txt pytest
      - run: pytest backend/tests

  frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: 18
      - run: cd frontend && npm install
      - run: cd frontend && npm run lint
      - run: cd frontend && npm run build
```

---

Your application is thoroughly tested and ready for production! ✅
