export interface TimeSegment {
  status: 'off_duty' | 'sleeper_berth' | 'driving' | 'on_duty_not_driving';
  start_time: string;
  end_time: string;
  duration_minutes: number;
  location: string;
}

export interface Stop {
  type: 'pickup' | 'dropoff' | 'rest' | 'sleep' | 'fuel';
  location_name: string;
  lat: number;
  lng: number;
  arrival_time: string;
  departure_time: string;
  duration_minutes: number;
  notes: string;
}

export interface DailyLog {
  date: string;
  day_number: number;
  from_location: string;
  to_location: string;
  total_miles_today: number;
  segments: TimeSegment[];
  totals: {
    off_duty: number;
    sleeper_berth: number;
    driving: number;
    on_duty_not_driving: number;
  };
  remarks: string[];
  recap: {
    on_duty_today: number;
    total_last_7_days: number;
    available_tomorrow: number;
  };
}

export interface TripSummary {
  total_distance_miles: number;
  total_duration_hours: number;
  estimated_start: string;
  estimated_end: string;
}

export interface TripPlanResponse {
  trip_summary: TripSummary;
  route_coordinates: [number, number][];
  route_instructions?: string[];
  stops: Stop[];
  daily_logs: DailyLog[];
}

export interface TripPlanRequest {
  current_location: string;
  pickup_location: string;
  dropoff_location: string;
  current_cycle_used: number;
}
