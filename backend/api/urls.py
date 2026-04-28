"""
URL routing for API
"""

from django.urls import path
from .views import TripPlanView, HealthCheckView

urlpatterns = [
    path('health/', HealthCheckView.as_view(), name='health-check'),
    path('trip/plan/', TripPlanView.as_view(), name='trip-plan'),
]
