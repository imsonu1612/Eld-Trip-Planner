import React, { useState } from 'react';
import TripForm from './TripForm';
import StopsTimeline from './StopsTimeline';
import RouteMap from './RouteMap';
import ELDLogSheet from './ELDLogSheet';
import RouteInstructions from './RouteInstructions';
import { TripPlanRequest, TripPlanResponse } from '../types';
import { tripPlanService } from '../services/api';

const MainApp: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tripData, setTripData] = useState<TripPlanResponse | null>(null);

  const handleTripSubmit = async (formData: TripPlanRequest) => {
    setLoading(true);
    setError(null);

    try {
      const response = await tripPlanService.planTrip(formData);
      setTripData(response);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to plan trip. Please check your input and try again.'
      );
      console.error('Trip planning error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <header className="bg-[#1E3A5F] text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <h1 className="text-4xl font-bold">ELD Trip Planner</h1>
          <p className="text-sm opacity-90 mt-2">
            FMCSA Hours of Service Compliant Route Planning
          </p>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex gap-8">
          {/* Left Panel */}
          <div className="w-96 flex-shrink-0">
            <TripForm onSubmit={handleTripSubmit} loading={loading} />

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg mb-6">
                <p className="font-semibold">Error</p>
                <p className="text-sm">{error}</p>
              </div>
            )}

            {tripData && (
              <StopsTimeline
                stops={tripData.stops}
                tripSummary={tripData.trip_summary}
              />
            )}

            {tripData && tripData.route_instructions && tripData.route_instructions.length > 0 && (
              <RouteInstructions instructions={tripData.route_instructions} />
            )}
          </div>

          {/* Right Panel */}
          <div className="flex-grow flex flex-col">
            {tripData ? (
              <RouteMap
                coordinates={tripData.route_coordinates}
                stops={tripData.stops}
                tripSummary={tripData.trip_summary}
              />
            ) : (
              <div className="bg-white rounded-lg shadow-md p-12 flex items-center justify-center h-96">
                <p className="text-gray-500 text-center">
                  Enter your trip details on the left to see the route map
                </p>
              </div>
            )}
          </div>
        </div>

        {/* ELD Log Sheets */}
        {tripData && tripData.daily_logs.length > 0 && (
          <div className="mt-12">
            <h2 className="text-2xl font-bold text-[#1E3A5F] mb-6">ELD Daily Log Sheets</h2>
            <div className="overflow-x-auto pb-4">
              <div className="flex gap-6">
                {tripData.daily_logs.map((log, idx) => (
                  <ELDLogSheet key={idx} dailyLog={log} />
                ))}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default MainApp;
