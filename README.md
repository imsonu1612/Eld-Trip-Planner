# ELD Trip Planner

A production-quality web application for FMCSA Hours of Service (HOS) compliant truck trip planning with automatic ELD log generation.

## Features

- **Interactive Route Planning**: View complete driving routes on an OpenStreetMap-based Leaflet map
- **Turn-by-Turn Route Instructions**: Shows live route guidance steps for the trip
- **HOS Compliance**: Automatically schedules trips following FMCSA rules for property-carrying drivers (70-hour/8-day cycle)
- **Automatic ELD Generation**: Generates pixel-perfect FMCSA-compliant Driver's Daily Log sheets as canvas drawings
- **Smart Stop Planning**: Automatically places:
  - Pickup/Dropoff stops (1 hour each)
  - Fueling stops (every 1,000 miles)
  - Rest breaks (30 minutes after 8 hours of driving)
  - Sleep periods (10 consecutive hours off-duty)
- **Trip Summary**: Shows total distance, duration, and detailed stop timeline
- **PNG Export**: Download ELD log sheets as images

## Tech Stack

- **Frontend**: React 18 + Vite + TypeScript + TailwindCSS + Leaflet.js
- **Backend**: Django 4.2 + Django REST Framework
- **Maps**: Leaflet.js + OpenStreetMap (Nominatim for geocoding, OpenRouteService for routing)
- **Database**: SQLite (development) / PostgreSQL-ready

## Project Structure

```
eld-trip-planner/
├── frontend/                 # React Vite application
│   ├── src/
│   │   ├── components/       # React components
│   │   ├── services/         # API client & utilities
│   │   ├── types/            # TypeScript types
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   └── index.css
│   ├── package.json
│   ├── vite.config.ts
│   ├── tsconfig.json
│   └── index.html
├── backend/                  # Django application
│   ├── config/               # Django settings
│   ├── api/                  # Trip planning API
│   │   ├── hos_scheduler.py  # HOS calculation engine
│   │   ├── services.py       # External API integration
│   │   ├── views.py          # API endpoints
│   │   ├── serializers.py    # Request/response serializers
│   │   └── urls.py
│   ├── manage.py
│   └── requirements.txt
└── README.md
```

## Installation & Setup

### Backend Setup

1. **Create virtual environment** (Windows):
   ```bash
   cd backend
   python -m venv venv
   venv\Scripts\activate
   ```

2. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

3. **Configure environment**:
   ```bash
   copy .env.example .env
   ```
   
   Edit `.env` with your settings:
   ```env
   DEBUG=True
   SECRET_KEY=your-secret-key-here
   OPENROUTE_API_KEY=your-free-tier-api-key
   CORS_ALLOWED_ORIGINS=http://localhost:5173
   ```

4. **Run migrations**:
   ```bash
   python manage.py migrate
   ```

5. **Start development server**:
   ```bash
   python manage.py runserver
   ```
   
   Backend runs on `http://localhost:8000`

### Frontend Setup

1. **Navigate to frontend directory**:
   ```bash
   cd frontend
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure environment**:
   ```bash
   copy .env.example .env.local
   ```
   
   Ensure `VITE_API_URL=http://localhost:8000`

4. **Start development server**:
   ```bash
   npm run dev
   ```
   
   Frontend runs on `http://localhost:5173`

## API Endpoints

### POST `/api/trip/plan/`

Plans a trip with HOS-compliant schedule.

**Request**:
```json
{
  "current_location": "Chicago, IL",
  "pickup_location": "St. Louis, MO",
  "dropoff_location": "Dallas, TX",
  "current_cycle_used": 20
}
```

**Response**:
```json
{
  "trip_summary": {
    "total_distance_miles": 850,
    "total_duration_hours": 18.5,
    "estimated_start": "2024-01-15T08:00:00",
    "estimated_end": "2024-01-16T14:30:00"
  },
  "route_coordinates": [[39.1, -95.3], ...],
  "route_instructions": [
    "Current location to pickup:",
    "Depart north onto I-55 (2.1 mi)",
    "Pickup to dropoff:",
    "Turn right onto I-44 (58.2 mi)"
  ],
  "stops": [
    {
      "type": "pickup",
      "location_name": "St. Louis, MO",
      "lat": 38.627,
      "lng": -90.197,
      "arrival_time": "2024-01-15T09:00:00",
      "departure_time": "2024-01-15T10:00:00",
      "duration_minutes": 60,
      "notes": "Pickup - 1 hour on duty"
    }
  ],
  "daily_logs": [
    {
      "date": "2024-01-15",
      "day_number": 1,
      "from_location": "Chicago, IL",
      "to_location": "Dallas, TX",
      "total_miles_today": 300,
      "segments": [...],
      "totals": {
        "off_duty": 0,
        "sleeper_berth": 10,
        "driving": 11,
        "on_duty_not_driving": 3
      },
      "remarks": ["08:00 - On Duty at Chicago, IL (pickup)"],
      "recap": {
        "on_duty_today": 14,
        "total_last_7_days": 34,
        "available_tomorrow": 36
      }
    }
  ]
}
```

### GET `/api/health/`

Simple health check endpoint.

## HOS Rules Implemented

The application implements FMCSA Hours of Service rules for property-carrying drivers with a 70-hour/8-day cycle:

- **11-Hour Driving Limit**: Max 11 hours of driving after 10 consecutive off-duty hours
- **14-Hour Window**: Cannot drive after the 14th hour following a 10-hour off-duty period
- **30-Minute Rest Break**: Required after 8 hours of continuous driving (≥30 min off-duty)
- **10-Hour Off-Duty**: Minimum consecutive off-duty hours required before next driving shift
- **70-Hour/8-Day Cycle**: Cannot exceed 70 hours on-duty in any 8 consecutive days
- **34-Hour Restart**: Clock resets after 34+ consecutive off-duty hours
- **Automatic Fueling Stops**: Inserted every 1,000 miles
- **Pickup/Dropoff Time**: 1 hour on-duty allocation for each

## UI Features

- **Professional Design**: Dark navy blue, orange accent, clean logistics-focused interface
- **Split Layout**: Left panel for form/timeline, right panel for interactive map
- **Real-time Route Visualization**: Animated polyline showing driving route
- **Stop Timeline**: Color-coded stops with times and durations
- **ELD Canvas Rendering**: Pixel-perfect FMCSA log sheets with:
  - 24-hour grid with duty status rows
  - Remarks section with event details
  - 70-hour/8-day recap calculations
  - PNG download capability

## External API Keys

### Required: OpenRouteService (Free Tier)

1. Visit [OpenRouteService](https://openrouteservice.org/)
2. Sign up for free account
3. Get your API key
4. Add to `.env`: `OPENROUTE_API_KEY=your-key`

### No Key Required:
- **OpenStreetMap**: Free tiles via Leaflet
- **Nominatim**: Free geocoding via OpenStreetMap
- **OSRM Public API**: Free live road-routing fallback when OpenRouteService key is not provided

## Assessment Deliverables Checklist

This project is now aligned to your assessment requirements:

- Full-stack app built with Django backend and React frontend
- Inputs implemented:
  - Current location
  - Pickup location
  - Dropoff location
  - Current cycle used (hrs)
- Outputs implemented:
  - Live map route using free APIs (OpenStreetMap + OSRM/OpenRouteService)
  - Stop and rest/fuel/sleep events displayed on map and timeline
  - Daily ELD log sheets rendered and downloadable as PNG
  - Route instructions list shown in UI
- Assumptions implemented:
  - Property-carrying driver (70hrs/8days)
  - Fueling stop every 1,000 miles
  - 1 hour pickup and 1 hour drop-off

Items that require your own accounts (cannot be auto-completed from this local environment):

- Create live hosted version (recommended: Vercel for frontend + Railway/Render for Django backend)
- Record 3-5 minute Loom walkthrough
- Share GitHub repository URL

## Building for Production

### Frontend
```bash
cd frontend
npm run build
```

Deploy `dist/` folder to Vercel.

### Backend
```bash
cd backend
pip install gunicorn
gunicorn config.wsgi:application
```

Deploy to Railway or Render with PostgreSQL database.

## Contributing

Follow the existing code style and add tests for new features.

## License

MIT License

## Support

For issues or questions, create an issue in the repository.
