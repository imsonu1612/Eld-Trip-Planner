# ELD Trip Planner - Deployment Guide

## Deployment Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Users                               │
└────────────────────────┬────────────────────────────────────┘
                         │ HTTPS
        ┌────────────────┴────────────────┐
        │                                 │
   ┌────▼─────────────────┐   ┌──────────▼──────────────┐
   │   Vercel (Frontend)  │   │  Railway/Render         │
   │                      │   │  (Backend API)          │
   │  React SPA           │   │                         │
   │  Static assets       │   │  Django Gunicorn        │
   │  CDN distributed     │   │  PostgreSQL             │
   │                      │   │  Redis (optional)       │
   └─────────┬────────────┘   └──────────┬──────────────┘
             │                          │
             └──────────────┬───────────┘
                            │
                      Nominatim + OpenRouteService APIs
                      (External, free tier)
```

## Frontend Deployment (Vercel)

Frontend deployment is pre-configured with [frontend/vercel.json](frontend/vercel.json).

### Prerequisites
- Vercel account (https://vercel.com)
- GitHub repository (optional but recommended)

### Option 1: Git Integration (Recommended)

```bash
# 1. Push your code to GitHub
cd frontend
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/eld-trip-planner.git
git push -u origin main

# 2. In Vercel dashboard:
#    - Click "New Project"
#    - Import GitHub repository
#    - Select "frontend" folder as root
#    - Add environment variable: VITE_API_URL=https://your-backend.com
#    - Deploy
```

### Option 2: Direct Upload

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy from frontend directory
cd frontend
vercel
# Follow prompts
# Set environment variable: VITE_API_URL=https://your-backend.com
```

### Environment Variables (Vercel)

In Vercel project settings → Environment Variables:

```
VITE_API_URL=https://your-backend-domain.com
```

### Build Settings
- **Framework**: Vite
- **Build Command**: `npm run build`
- **Output Directory**: `dist`

### After Deployment

```bash
# Your frontend is now at: https://eld-trip-planner.vercel.app
# Update backend CORS to allow this domain
```

## Backend Deployment (Railway or Render)

Backend deployment is pre-configured with [backend/Procfile](backend/Procfile) and [backend/runtime.txt](backend/runtime.txt).

### Option A: Railway

#### 1. Prepare Backend

```bash
# Create runtime.txt for Python version
echo "python-3.11.6" > runtime.txt

# Create Procfile
echo "web: gunicorn config.wsgi:application" > Procfile

# Update requirements.txt with:
Django==4.2.11
djangorestframework==3.14.0
django-cors-headers==4.3.1
python-dotenv==1.0.0
requests==2.31.0
gunicorn==21.2.0
psycopg2-binary==2.9.9
geopy==2.4.0
```

#### 2. Deploy to Railway

```bash
# Install Railway CLI
npm i -g @railway/cli

# Login to Railway
railway login

# Create new project
railway init

# Link to GitHub
railway link

# Set environment variables
railway variables set DEBUG=False
railway variables set SECRET_KEY=your-secret-key-here
railway variables set OPENROUTE_API_KEY=your-api-key
railway variables set DATABASE_URL=postgresql://...
railway variables set CORS_ALLOWED_ORIGINS=https://your-frontend.vercel.app

# Deploy
railway up
```

#### 3. Create PostgreSQL Database

```bash
# In Railway dashboard:
# - Create new PostgreSQL plugin
# - Railway auto-fills DATABASE_URL
# - Run migrations:

railway run python manage.py migrate
railway run python manage.py createsuperuser
```

### Option B: Render

#### 1. Prepare Backend (Same as Railway)

```bash
# Create these files in backend/:
# runtime.txt, Procfile, requirements.txt
```

#### 2. Deploy to Render

```bash
# 1. Push code to GitHub
git push origin main

# 2. In Render dashboard:
#    - Click "New +"
#    - Select "Web Service"
#    - Connect GitHub repository
#    - Select backend folder
#    - Choose Python runtime

# 3. Configure:
#    - Build Command: pip install -r requirements.txt
#    - Start Command: gunicorn config.wsgi:application
#    - Add environment variables (see below)
```

#### 4. Create PostgreSQL Database

```bash
# In Render dashboard:
# - Create new PostgreSQL instance
# - Copy internal database URL
# - Set as DATABASE_URL environment variable
# - Run migrations via Render shell:

python manage.py migrate
python manage.py createsuperuser
```

### Backend Environment Variables

Both Railway and Render require these environment variables:

```env
DEBUG=False
SECRET_KEY=generate-a-strong-key-with-secrets.token_urlsafe(32)
ALLOWED_HOSTS=your-api-domain.railway.app,your-api-domain.render.com
DATABASE_URL=postgresql://user:password@host:port/dbname
OPENROUTE_API_KEY=your-actual-api-key
CORS_ALLOWED_ORIGINS=https://eld-trip-planner.vercel.app
```

### Generating a Strong Secret Key

```bash
# In Python console:
python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
```

## Database Setup

### Local Development (SQLite - Default)

Already configured, no setup needed:
```python
# backend/config/settings.py
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': BASE_DIR / 'db.sqlite3',
    }
}
```

### Production (PostgreSQL)

#### 1. Create PostgreSQL Database

**On Railway/Render:** Automatically created with credentials in DATABASE_URL

**Self-hosted PostgreSQL:**
```bash
createdb eld_trip_planner
```

#### 2. Update settings.py

```python
# For automatic URL parsing, add to requirements.txt:
# dj-database-url==2.1.0

import dj_database_url

DATABASES = {
    'default': dj_database_url.config(
        default='sqlite:///db.sqlite3',
        conn_max_age=600
    )
}
```

#### 3. Run Migrations

```bash
# Local/SSH:
python manage.py migrate

# Or via Railway/Render:
railway run python manage.py migrate
# render-cli deploy --manual
```

#### 4. Create Superuser

```bash
python manage.py createsuperuser
# Enter username, email, password
```

## Domain Setup

### Connect Custom Domain to Vercel

```bash
# In Vercel project settings → Domains
# Add custom domain: app.yourcompany.com
# Add DNS records (Vercel provides exact values):

# Example:
A     app.yourcompany.com      76.76.19.165
CNAME www.app.yourcompany.com  cname.vercel-dns.com
```

### Connect Custom Domain to Railway/Render

```bash
# In Railway/Render project settings → Domain
# Add custom domain: api.yourcompany.com
# Add CNAME record to your DNS:

CNAME api.yourcompany.com railway.app  (or render.com)
```

### Update CORS

Once domains are set:

**Backend environment variable:**
```env
CORS_ALLOWED_ORIGINS=https://app.yourcompany.com
```

**Frontend environment variable:**
```env
VITE_API_URL=https://api.yourcompany.com
```

## Monitoring & Logs

### Vercel
- Dashboard → Deployments → View each deployment
- Logs tab shows build and runtime logs
- Analytics shows performance metrics

### Railway
- Railway dashboard → Logs tab
- Real-time streaming logs
- Metrics for CPU, memory, network

### Render
- Render dashboard → Logs
- Live tail for debugging
- Alerts for errors/restarts

## SSL/TLS (HTTPS)

- **Vercel**: Automatic, includes all domains
- **Railway**: Automatic, auto-renewing
- **Render**: Automatic, auto-renewing

No additional setup required!

## Database Backups

### Railway
```bash
# Export database
railway database export > backup.sql

# Restore from backup
railway database import < backup.sql
```

### Render
- Automatic backups (30-day retention available)
- Managed from Render dashboard → Database → Backups

### PostgreSQL (Manual)
```bash
# Export
pg_dump -U username databasename > backup.sql

# Import
psql -U username databasename < backup.sql
```

## Performance Optimization

### Frontend (Vercel)
```bash
# In package.json, ensure:
"build": "tsc && vite build"

# Vite handles:
# - Code splitting
# - Tree shaking
# - Asset compression
```

### Backend (Django)
```python
# settings.py for production
DEBUG = False

# Enable compression
MIDDLEWARE.append('django.middleware.gzip.GZipMiddleware')

# Set static files storage
STATIC_URL = '/static/'
STATIC_ROOT = os.path.join(BASE_DIR, 'staticfiles')

# Enable caching
CACHES = {
    'default': {
        'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
    }
}
```

```bash
# Collect static files
python manage.py collectstatic --noinput
```

## Security Checklist

Before production:

- [ ] Set `DEBUG = False` in Django
- [ ] Generate strong `SECRET_KEY`
- [ ] Set `ALLOWED_HOSTS` correctly
- [ ] Configure `CORS_ALLOWED_ORIGINS` with HTTPS domains
- [ ] Use PostgreSQL (not SQLite)
- [ ] Enable HTTPS everywhere
- [ ] Set secure cookies: `SECURE_SSL_REDIRECT = True`
- [ ] Add CSRF protection headers
- [ ] Rate limit API endpoints
- [ ] Use environment variables for secrets
- [ ] Regularly update dependencies

```python
# Secure settings for production:
DEBUG = False
SECURE_SSL_REDIRECT = True
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SECURE_HSTS_SECONDS = 31536000
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True
```

## Cost Estimate

| Service | Tier | Cost/Month |
|---------|------|-----------|
| Vercel | Hobby/Pro | $0-20 |
| Railway | Usage-based | $5-50 |
| Render | Usage-based | $7-50 |
| PostgreSQL | Hobby | $7-20 |
| **Total** | — | **~$12-140** |

*Costs depend on traffic. Typically runs $20-50/month for moderate usage.*

## Troubleshooting

### 502 Bad Gateway
- Check backend logs for errors
- Verify database connection
- Check CORS settings

### CORS Errors
- Verify `CORS_ALLOWED_ORIGINS` includes frontend domain
- Check frontend API URL is correct
- Ensure HTTPS/HTTP match

### Database Connection Errors
- Verify `DATABASE_URL` is correct
- Run migrations: `python manage.py migrate`
- Check database user permissions

### Missing Environment Variables
- List all vars: `vercel env pull` or `railway variables`
- Add missing vars in dashboard
- Redeploy application

## Rollback

### Vercel
```bash
# Automatic: Click previous deployment
# Manual: Reset to previous commit and push
git revert <commit-hash>
git push
```

### Railway/Render
- Dashboard → Deployments → Revert to previous

## Support & Resources

- **Vercel Docs**: https://vercel.com/docs
- **Railway Docs**: https://docs.railway.app
- **Render Docs**: https://render.com/docs
- **Django Deployment**: https://docs.djangoproject.com/en/4.2/howto/deployment/
- **PostgreSQL**: https://www.postgresql.org/docs/

---

Your application is now production-ready! 🚀
