import axios from 'axios';
import { TripPlanRequest, TripPlanResponse } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const tripPlanService = {
  async planTrip(request: TripPlanRequest): Promise<TripPlanResponse> {
    const response = await api.post<TripPlanResponse>('/api/trip/plan/', request);
    return response.data;
  },

  async healthCheck(): Promise<{ status: string }> {
    const response = await api.get<{ status: string }>('/api/health/');
    return response.data;
  },
};

export default api;
