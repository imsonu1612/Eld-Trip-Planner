"""
WSGI config for ELD Trip Planner
"""

import os
import sys

# Get the directory containing this file (backend/config)
current_dir = os.path.dirname(os.path.abspath(__file__))

# Get the backend directory (parent of config)
backend_dir = os.path.dirname(current_dir)

# Ensure backend directory is in Python path (this is where 'config' module is)
sys.path.insert(0, backend_dir)

# For Vercel deployment, add additional paths
if '/var/task' in os.getcwd():
    sys.path.insert(0, '/var/task')
    sys.path.insert(0, '/var/task/backend')

from django.core.wsgi import get_wsgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

application = get_wsgi_application()
