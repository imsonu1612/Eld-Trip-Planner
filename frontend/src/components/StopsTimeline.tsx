import React from 'react';
import { Stop } from '../types';

interface StopsTimelineProps {
  stops: Stop[];
  tripSummary?: {
    total_distance_miles: number;
    total_duration_hours: number;
    estimated_start: string;
    estimated_end: string;
  };
}

const StopsTimeline: React.FC<StopsTimelineProps> = ({ stops, tripSummary }) => {
  const getStopColor = (type: string): string => {
    switch (type) {
      case 'pickup':
      case 'dropoff':
        return 'bg-[#16A34A]';
      case 'fuel':
        return 'bg-[#F97316]';
      case 'rest':
        return 'bg-gray-400';
      case 'sleep':
        return 'bg-[#1E3A5F]';
      default:
        return 'bg-gray-300';
    }
  };

  const formatTime = (timeStr: string): string => {
    try {
      return new Date(timeStr).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return timeStr;
    }
  };

  return (
    <div className="premium-card interactive-lift animate-rise animate-delay-2 p-6">
      {tripSummary && (
        <div className="mb-6 border-b border-slate-200 pb-6">
          <p className="section-kicker">Trip Snapshot</p>
          <h3 className="section-title mb-3">Trip Summary</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-slate-500">Total Distance</p>
              <p className="text-lg font-semibold text-[#ea580c]">{tripSummary.total_distance_miles.toFixed(1)} miles</p>
            </div>
            <div>
              <p className="text-slate-500">Estimated Duration</p>
              <p className="text-lg font-semibold text-[#ea580c]">{tripSummary.total_duration_hours.toFixed(1)} hours</p>
            </div>
            <div>
              <p className="text-slate-500">Start Time</p>
              <p className="text-sm font-mono text-[#1a3c5b]">{formatTime(tripSummary.estimated_start)}</p>
            </div>
            <div>
              <p className="text-slate-500">End Time</p>
              <p className="text-sm font-mono text-[#1a3c5b]">{formatTime(tripSummary.estimated_end)}</p>
            </div>
          </div>
        </div>
      )}

      <p className="section-kicker">Schedule Events</p>
      <h3 className="section-title mb-4">Stops & Events</h3>
      <div className="space-y-4">
        {stops.map((stop, idx) => (
          <div
            key={idx}
            className="flex items-start space-x-4 rounded-xl border border-slate-200/80 bg-white/70 p-3 animate-fade"
            style={{ animationDelay: `${idx * 70}ms` }}
          >
            <div className={`mt-1 h-4 w-4 flex-shrink-0 rounded-full ${getStopColor(stop.type)} ring-4 ring-white`}></div>
            <div className="flex-grow">
              <div className="font-semibold text-[#1E293B]">{stop.location_name}</div>
              <div className="text-sm text-slate-600">
                <p className="font-medium text-[#1a3c5b]">{stop.type.charAt(0).toUpperCase() + stop.type.slice(1)}</p>
                <p className="text-xs">
                  {formatTime(stop.arrival_time)} - {formatTime(stop.departure_time)} ({stop.duration_minutes} min)
                </p>
                <p className="text-xs italic">{stop.notes}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default StopsTimeline;
