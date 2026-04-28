import React from 'react';
import { TripPlanRequest } from '../types';

interface TripFormProps {
  onSubmit: (data: TripPlanRequest) => void;
  loading: boolean;
}

const TripForm: React.FC<TripFormProps> = ({ onSubmit, loading }) => {
  const [formData, setFormData] = React.useState<TripPlanRequest>({
    current_location: '',
    pickup_location: '',
    dropoff_location: '',
    current_cycle_used: 0,
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'current_cycle_used' ? parseFloat(value) || 0 : value,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.current_location && formData.pickup_location && formData.dropoff_location) {
      onSubmit(formData);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
      <h2 className="text-2xl font-bold text-[#1E3A5F] mb-4">Plan Your Trip</h2>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-[#1E293B] mb-1">
            📍 Current Location
          </label>
          <input
            type="text"
            name="current_location"
            value={formData.current_location}
            onChange={handleChange}
            placeholder="e.g., Chicago, IL"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#F97316]"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-[#1E293B] mb-1">
            📍 Pickup Location
          </label>
          <input
            type="text"
            name="pickup_location"
            value={formData.pickup_location}
            onChange={handleChange}
            placeholder="e.g., St. Louis, MO"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#F97316]"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-[#1E293B] mb-1">
            📍 Dropoff Location
          </label>
          <input
            type="text"
            name="dropoff_location"
            value={formData.dropoff_location}
            onChange={handleChange}
            placeholder="e.g., Dallas, TX"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#F97316]"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-[#1E293B] mb-1">
            🕐 Current Cycle Used (Hours)
          </label>
          <input
            type="number"
            name="current_cycle_used"
            value={formData.current_cycle_used}
            onChange={handleChange}
            min="0"
            max="70"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#F97316]"
            required
          />
          <p className="text-xs text-gray-500 mt-1">Hours already used in current 70-hour cycle (0-70)</p>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-[#F97316] hover:bg-[#ea580c] disabled:bg-gray-400 text-white font-bold py-2 px-4 rounded-md transition"
        >
          {loading ? 'Calculating your route and HOS schedule...' : 'Plan My Trip'}
        </button>
      </form>
    </div>
  );
};

export default TripForm;
