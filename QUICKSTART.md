# ELD Trip Planner - Quick Start Guide

## Prerequisites
- Python 3.9+
- Node.js 18+
- Git (optional)

## 5-Minute Setup (Windows PowerShell)

### Step 1: Backend Setup

```powershell
# Navigate to backend folder
cd backend

# Create virtual environment
python -m venv venv

# Activate it
venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Create .env file (copy from example)
copy .env.example .env

# Edit .env and set your OpenRouteService API key (or use mock mode)
# OPENROUTE_API_KEY=your-key-here
```

### Step 2: Start Backend Server

```powershell
# Still in backend folder with venv activated
python manage.py runserver

# Server starts on http://localhost:8000
```

### Step 3: Frontend Setup (New PowerShell Window)

```powershell
# Navigate to frontend folder
cd frontend

# Install dependencies
npm install

# Create .env file
copy .env.example .env.local

# Start dev server
npm run dev

# Frontend opens at http://localhost:5173
```

## Using the App

1. **Enter Trip Details**:
   - Current Location: "Chicago, IL"
   - Pickup Location: "St. Louis, MO"
   - Dropoff Location: "Dallas, TX"
   - Current Cycle Used: 20 (hours already used in 70-hour cycle)

2. **Click "Plan My Trip"**
   - Backend geocodes locations (free Nominatim API)
   - Calculates route (OpenRouteService API - needs API key for routing)
   - Applies HOS rules to schedule stops and rest periods
   - Generates ELD logs for each calendar day

3. **View Results**:
   - Interactive map shows your route with all stops
   - Left panel shows trip summary and timeline
   - Scroll down to see ELD daily log sheets
   - Click "Download PNG" on each sheet to save as image

## API Keys Setup

### Getting OpenRouteService API Key (Optional - Has Free Tier)

1. Go to https://openrouteservice.org/
2. Sign up (free account)
3. Get your API key from dashboard
4. Add to `backend/.env`:
   ```env
   OPENROUTE_API_KEY=your-actual-key
   ```

**Note**: Without this key, the app uses a mock routing service (still functional for demos).

## Project Files Overview

### Backend Key Files
- `backend/api/hos_scheduler.py` - The HOS calculation engine (most complex logic)
- `backend/api/services.py` - Nominatim geocoding and OpenRouteService integration
- `backend/api/views.py` - Main API endpoint handler
- `backend/config/settings.py` - Django configuration with HOS parameters

### Frontend Key Files
- `frontend/src/components/MainApp.tsx` - Main app orchestrator
- `frontend/src/components/TripForm.tsx` - Input form
- `frontend/src/components/RouteMap.tsx` - Leaflet map
- `frontend/src/components/ELDLogSheet.tsx` - ELD canvas renderer wrapper
- `frontend/src/services/eldCanvasRenderer.ts` - Canvas drawing logic
- `frontend/src/services/api.ts` - API client

## Troubleshooting

### "Module not found" error in frontend
```bash
cd frontend
npm install
```

### Backend port 8000 already in use
```powershell
# Find and kill the process
netstat -ano | findstr :8000
taskkill /PID <PID> /F

# Or change port
python manage.py runserver 8001
```

### CORS errors
Make sure `backend/.env` has:
```env
CORS_ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000
```

### Location not found
Try using full addresses like "Chicago, Illinois, USA"

### Route not calculating
This requires OpenRouteService API key. Without it, the app uses a simple distance calculation.

## Key Configuration Values (in backend/config/settings.py)

These match FMCSA HOS regulations:

```python
ASSUMED_DRIVING_SPEED_MPH = 55           # Used to calculate drive time
MAX_DRIVING_HOURS = 11                   # 11-hour limit
MAX_ON_DUTY_HOURS = 14                   # 14-hour window
MAX_DRIVING_BEFORE_BREAK = 8             # Break required after 8 hours
MIN_BREAK_MINUTES = 30                   # Minimum break duration
CONSECUTIVE_OFF_DUTY_HOURS = 10          # Off-duty requirement
MAX_CYCLE_HOURS = 70                     # 70-hour/8-day cycle
FUELING_INTERVAL_MILES = 1000            # Fuel stop every N miles
PICKUP_DURATION_HOURS = 1                # 1 hour on-duty
DROPOFF_DURATION_HOURS = 1               # 1 hour on-duty
```

## Testing with Example Trip

**Route**: Chicago, IL → St. Louis, MO → Dallas, TX
- Distance: ~1,000 miles
- Estimated Duration: 18+ hours (with regulatory stops)
- Rest Periods: Automatically inserted after 8 hours driving
- Sleep Periods: Automatically inserted after 11 hours or 14-hour window
- Result: 2-day trip with separate ELD log for each day

## What the App Actually Does

### HOS Calculation Flow:
1. **Pickup**: 1 hour on-duty at pickup location
2. **Driving**: Drive for max 8 hours
3. **Break**: 30-minute mandatory rest (off-duty)
4. **Fuel**: Every 1,000 miles, add 30-min fuel stop (on-duty, not driving)
5. **Sleep**: After 11 hours driving or 14-hour window reached, 10-hour sleep
6. **Repeat** until destination reached
7. **Dropoff**: 1 hour on-duty at dropoff
8. **Daily Logs**: One canvas-rendered ELD sheet per calendar day

### Canvas Drawing Features:
- 24-hour grid with 4 duty status rows
- Continuous lines showing status periods
- Quarter-hour marks on grid
- Total hours calculation per status
- Remarks section with timestamps
- 70-hour/8-day recap calculation
- PNG export capability

## Next Steps

1. **Customize HOS Rules**: Edit `backend/config/settings.py` to change regulations
2. **Add Database**: Switch from SQLite to PostgreSQL in `settings.py`
3. **Deploy**: Frontend to Vercel, backend to Railway/Render
4. **Extend**: Add more route optimization, driver preferences, historical logs storage

## Documentation Files

- `README.md` - Full documentation
- `QUICKSTART.md` - This file
- Code comments in key files explain the algorithm

Enjoy planning your trips! 🚚
