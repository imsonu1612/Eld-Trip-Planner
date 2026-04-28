"""
URL configuration for ELD Trip Planner
"""
from django.contrib import admin
from django.urls import path, include
from django.http import JsonResponse

def health_check(request):
    return JsonResponse({
        'status': 'ok',
        'message': 'ELD Trip Planner API is running',
        'endpoints': {
            'api': '/api/',
            'admin': '/admin/',
            'trip_plan': '/api/trip/plan/'
        }
    })

urlpatterns = [
    path('', health_check),
    path('admin/', admin.site.urls),
    path('api/', include('api.urls')),
]
