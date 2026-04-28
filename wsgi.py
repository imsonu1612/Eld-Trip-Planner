"""
WSGI entry point for Vercel deployment
"""

import os
import sys

# Add the backend directory to Python path
backend_dir = os.path.join(os.path.dirname(__file__), 'backend')
sys.path.insert(0, backend_dir)

# For Vercel, also add common paths
sys.path.insert(0, '/var/task')
sys.path.insert(0, '/var/task/backend')

from django.core.wsgi import get_wsgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

application = get_wsgi_application()
