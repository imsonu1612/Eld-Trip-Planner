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
    <div className="relative min-h-screen overflow-hidden pb-10">
      <div className="pointer-events-none absolute -left-20 top-16 h-80 w-80 rounded-full bg-cyan-300/30 blur-3xl animate-float"></div>
      <div className="pointer-events-none absolute -right-24 top-20 h-96 w-96 rounded-full bg-orange-300/30 blur-3xl animate-float"></div>

      <header className="relative z-10 px-4 pt-5 md:px-6">
        <div className="mx-auto max-w-7xl rounded-2xl bg-gradient-to-r from-[#0f2a47] via-[#18496f] to-[#1d8a8a] px-6 py-7 text-white shadow-2xl animate-rise animate-scale-in">
          <div className="mb-3 flex flex-wrap gap-2">
            <span className="brand-chip">FMCSA Compliant</span>
            <span className="brand-chip">Live Routing</span>
            <span className="brand-chip">ELD Canvas Logs</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight md:text-5xl">ELD Trip Planner</h1>
          <p className="mt-2 text-sm opacity-90 md:text-base">
            FMCSA Hours of Service Compliant Route Planning
          </p>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-7xl px-4 py-8 md:px-6">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[420px_1fr]">
          {/* Left Panel */}
          <div className="space-y-6 lg:sticky lg:top-5 lg:h-fit animate-rise animate-delay-1">
            <TripForm onSubmit={handleTripSubmit} loading={loading} />

            {error && (
              <div className="premium-card border-red-200 bg-red-50 px-4 py-3 text-red-800">
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
          <div className="flex min-h-[420px] flex-col animate-rise animate-delay-2">
            {tripData ? (
              <RouteMap
                coordinates={tripData.route_coordinates}
                stops={tripData.stops}
                tripSummary={tripData.trip_summary}
              />
            ) : (
              <div className="premium-card flex h-[420px] items-center justify-center p-12 text-center">
                <p className="max-w-md text-gray-600">
                  Enter your trip details on the left to see the route map
                </p>
              </div>
            )}
          </div>
        </div>

        {/* ELD Log Sheets */}
        {tripData && tripData.daily_logs.length > 0 && (
          <div className="mt-12 animate-rise animate-delay-3">
            <p className="section-kicker">Compliance Logs</p>
            <h2 className="section-title mb-1">ELD Daily Log Sheets</h2>
            <p className="section-subtitle mb-6">Rendered from your schedule with downloadable PNG exports.</p>
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
