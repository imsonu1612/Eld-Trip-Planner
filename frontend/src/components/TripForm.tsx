import React from 'react';
import { TripPlanRequest } from '../types';

interface TripFormProps {
  onSubmit: (data: TripPlanRequest) => void;
  loading: boolean;
}

interface Suggestion {
  formatted: string;
  lat: number;
  lng: number;
}

const TripForm: React.FC<TripFormProps> = ({ onSubmit, loading }) => {
  const [formData, setFormData] = React.useState<TripPlanRequest>({
    current_location: '',
    pickup_location: '',
    dropoff_location: '',
    current_cycle_used: 0,
  });

  const [suggestions, setSuggestions] = React.useState<Record<string, Suggestion[]>>({});
  const [activeField, setActiveField] = React.useState<string | null>(null);

  const fetchSuggestions = async (query: string, fieldName: string) => {
    if (query.length < 2) {
      setSuggestions(prev => ({ ...prev, [fieldName]: [] }));
      return;
    }

    try {
      const response = await fetch(
        `https://api.opencagedata.com/geocode/v1/json?key=14dc157a11fc4ad3a7a66788c0d50998&q=${encodeURIComponent(query)}&limit=5&no_annotations=1`
      );
      const data = await response.json();
      const results = data.results?.map((r: any) => ({
        formatted: r.formatted,
        lat: r.geometry.lat,
        lng: r.geometry.lng,
      })) || [];
      setSuggestions(prev => ({ ...prev, [fieldName]: results }));
    } catch (error) {
      console.error('Error fetching suggestions:', error);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'current_cycle_used' ? parseFloat(value) || 0 : value,
    }));
    setActiveField(name);
    fetchSuggestions(value, name);
  };

  const handleSelectSuggestion = (fieldName: string, suggestion: Suggestion) => {
    setFormData(prev => ({ ...prev, [fieldName]: suggestion.formatted }));
    setSuggestions(prev => ({ ...prev, [fieldName]: [] }));
    setActiveField(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.current_location && formData.pickup_location && formData.dropoff_location) {
      onSubmit(formData);
    }
  };

  return (
    <div className="premium-card interactive-lift animate-rise form-reveal p-6">
      <p className="section-kicker">Trip Inputs</p>
      <h2 className="section-title">Plan Your Route</h2>
      <p className="section-subtitle mb-5">Enter freight trip details and current cycle hours.</p>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="relative">
          <label className="mb-1 block text-sm font-semibold text-[#173553]">
            Current Location
          </label>
          <input
            type="text"
            name="current_location"
            value={formData.current_location}
            onChange={handleChange}
            placeholder="e.g., Chicago, IL"
            className="input-animate w-full rounded-xl border border-slate-200 bg-white/90 px-3 py-2.5 text-sm shadow-sm outline-none focus:border-[#1d8a8a] focus:ring-2 focus:ring-[#1d8a8a]/25 hover:border-slate-300"
            required
            autoComplete="off"
          />
          {suggestions.current_location && suggestions.current_location.length > 0 && (
            <ul className="absolute z-10 mt-1 w-full rounded-lg border border-slate-200 bg-white shadow-lg">
              {suggestions.current_location.map((suggestion, index) => (
                <li
                  key={index}
                  onClick={() => handleSelectSuggestion('current_location', suggestion)}
                  className="cursor-pointer px-3 py-2 text-sm hover:bg-slate-100"
                >
                  {suggestion.formatted}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="relative">
          <label className="mb-1 block text-sm font-semibold text-[#173553]">
            Pickup Location
          </label>
          <input
            type="text"
            name="pickup_location"
            value={formData.pickup_location}
            onChange={handleChange}
            placeholder="e.g., St. Louis, MO"
            className="input-animate w-full rounded-xl border border-slate-200 bg-white/90 px-3 py-2.5 text-sm shadow-sm outline-none focus:border-[#1d8a8a] focus:ring-2 focus:ring-[#1d8a8a]/25 hover:border-slate-300"
            required
            autoComplete="off"
          />
          {suggestions.pickup_location && suggestions.pickup_location.length > 0 && (
            <ul className="absolute z-10 mt-1 w-full rounded-lg border border-slate-200 bg-white shadow-lg">
              {suggestions.pickup_location.map((suggestion, index) => (
                <li
                  key={index}
                  onClick={() => handleSelectSuggestion('pickup_location', suggestion)}
                  className="cursor-pointer px-3 py-2 text-sm hover:bg-slate-100"
                >
                  {suggestion.formatted}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="relative">
          <label className="mb-1 block text-sm font-semibold text-[#173553]">
            Dropoff Location
          </label>
          <input
            type="text"
            name="dropoff_location"
            value={formData.dropoff_location}
            onChange={handleChange}
            placeholder="e.g., Dallas, TX"
            className="input-animate w-full rounded-xl border border-slate-200 bg-white/90 px-3 py-2.5 text-sm shadow-sm outline-none focus:border-[#1d8a8a] focus:ring-2 focus:ring-[#1d8a8a]/25 hover:border-slate-300"
            required
            autoComplete="off"
          />
          {suggestions.dropoff_location && suggestions.dropoff_location.length > 0 && (
            <ul className="absolute z-10 mt-1 w-full rounded-lg border border-slate-200 bg-white shadow-lg">
              {suggestions.dropoff_location.map((suggestion, index) => (
                <li
                  key={index}
                  onClick={() => handleSelectSuggestion('dropoff_location', suggestion)}
                  className="cursor-pointer px-3 py-2 text-sm hover:bg-slate-100"
                >
                  {suggestion.formatted}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <label className="mb-1 block text-sm font-semibold text-[#173553]">
            Current Cycle Used (Hours)
          </label>
          <input
            type="number"
            name="current_cycle_used"
            value={formData.current_cycle_used}
            onChange={handleChange}
            min="0"
            max="70"
            className="input-animate w-full rounded-xl border border-slate-200 bg-white/90 px-3 py-2.5 text-sm shadow-sm outline-none focus:border-[#1d8a8a] focus:ring-2 focus:ring-[#1d8a8a]/25 hover:border-slate-300"
            required
          />
          <p className="mt-1 text-xs text-slate-500">Hours already used in current 70-hour cycle (0-70)</p>
        </div>

        <button
          type="submit"
          disabled={loading}
          className={`button-press btn-animate w-full rounded-xl bg-gradient-to-r from-[#f97316] to-[#ea580c] px-4 py-2.5 font-bold text-white shadow-lg shadow-orange-200 hover:brightness-105 disabled:cursor-not-allowed disabled:grayscale ${loading ? 'loading-glow' : ''}`}
        >
          <span className="relative z-10 inline-flex items-center gap-2">
            {loading && <span className="spinner" aria-hidden="true"></span>}
            <span>{loading ? 'Calculating your route and HOS schedule...' : 'Plan My Trip'}</span>
          </span>
        </button>
      </form>
    </div>
  );
};

export default TripForm;
