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
    <div className="bg-white rounded-lg shadow-md p-6">
      {tripSummary && (
        <div className="mb-6 pb-6 border-b border-gray-200">
          <h3 className="text-lg font-bold text-[#1E3A5F] mb-3">Trip Summary</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-600">Total Distance</p>
              <p className="text-lg font-semibold text-[#F97316]">{tripSummary.total_distance_miles.toFixed(1)} miles</p>
            </div>
            <div>
              <p className="text-gray-600">Estimated Duration</p>
              <p className="text-lg font-semibold text-[#F97316]">{tripSummary.total_duration_hours.toFixed(1)} hours</p>
            </div>
            <div>
              <p className="text-gray-600">Start Time</p>
              <p className="text-sm font-mono">{formatTime(tripSummary.estimated_start)}</p>
            </div>
            <div>
              <p className="text-gray-600">End Time</p>
              <p className="text-sm font-mono">{formatTime(tripSummary.estimated_end)}</p>
            </div>
          </div>
        </div>
      )}

      <h3 className="text-lg font-bold text-[#1E3A5F] mb-4">Stops & Events</h3>
      <div className="space-y-4">
        {stops.map((stop, idx) => (
          <div key={idx} className="flex items-start space-x-4">
            <div className={`w-4 h-4 rounded-full ${getStopColor(stop.type)} mt-1 flex-shrink-0`}></div>
            <div className="flex-grow">
              <div className="font-semibold text-[#1E293B]">{stop.location_name}</div>
              <div className="text-sm text-gray-600">
                <p>{stop.type.charAt(0).toUpperCase() + stop.type.slice(1)}</p>
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
