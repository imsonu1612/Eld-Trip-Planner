"""
WSGI config for ELD Trip Planner
"""

import os
import sys

# Get the directory containing this file (backend/config)
current_dir = os.path.dirname(os.path.abspath(__file__))

# Get the backend directory (parent of config)
backend_dir = os.path.dirname(current_dir)

# Add backend directory to Python path so 'config' can be imported
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

# Also add the project root for good measure
project_root = os.path.dirname(backend_dir)
if project_root not in sys.path:
    sys.path.insert(0, project_root)

from django.core.wsgi import get_wsgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

application = get_wsgi_application()
