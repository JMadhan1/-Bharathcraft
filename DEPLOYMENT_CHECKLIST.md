# 🚀 Render Deployment Checklist

## Pre-Deployment

- [ ] All code is committed to Git
- [ ] `.env` file is NOT committed (check `.gitignore`)
- [ ] `requirements.txt` includes all dependencies
- [ ] `gunicorn` is in `requirements.txt`
- [ ] Database models are finalized
- [ ] Static files are in the correct directories
- [ ] All routes are tested locally

## GitHub Setup

- [ ] Repository is created on GitHub
- [ ] Code is pushed to GitHub
  ```bash
  git init
  git add .
  git commit -m "Initial commit - ready for deployment"
  git branch -M main
  git remote add origin https://github.com/YOUR_USERNAME/bharatcraft.git
  git push -u origin main
  ```

## Render Account Setup

- [ ] Created account at https://render.com
- [ ] Email verified
- [ ] Payment method added (if using paid tier)

## Database Setup on Render

- [ ] PostgreSQL database created
- [ ] Database name: `bharatcraft-db`
- [ ] Internal Database URL copied
- [ ] Database is in the same region as web service

## Web Service Setup on Render

- [ ] New Web Service created
- [ ] GitHub repository connected
- [ ] Branch selected: `main`
- [ ] Build Command: `./build.sh`
- [ ] Start Command: `gunicorn --worker-class eventlet -w 1 --bind 0.0.0.0:$PORT app:app`

## Environment Variables Set

Required:
- [ ] `DATABASE_URL` - From PostgreSQL service (Internal URL)
- [ ] `SESSION_SECRET` - Generated random string
- [ ] `HOST` - Set to `0.0.0.0`
- [ ] `FLASK_ENV` - Set to `production`

Optional (if using features):
- [ ] `OPENAI_API_KEY` - For AI features
- [ ] `STRIPE_SECRET_KEY` - For payments
- [ ] `STRIPE_PUBLISHABLE_KEY` - For payments
- [ ] `MONGODB_URI` - If using MongoDB

## Deployment

- [ ] Click "Create Web Service"
- [ ] Monitor build logs for errors
- [ ] Wait for deployment to complete
- [ ] Check for "Live" status

## Post-Deployment Testing

- [ ] Application URL is accessible
- [ ] Homepage loads correctly
- [ ] Static files (CSS, JS) are loading
- [ ] Can register a new user
- [ ] Can login with credentials
- [ ] Artisan portal is accessible
- [ ] Buyer portal is accessible
- [ ] Admin portal is accessible
- [ ] Database connection is working
- [ ] File uploads work (if applicable)
- [ ] SocketIO chat works (if applicable)
- [ ] No errors in Render logs

## Security Checks

- [ ] HTTPS is enabled (automatic on Render)
- [ ] Debug mode is OFF in production
- [ ] Strong `SESSION_SECRET` is used
- [ ] API keys are not exposed in code
- [ ] CORS is properly configured
- [ ] SQL injection protection (using SQLAlchemy ORM)

## Performance Optimization

- [ ] Static files are cached
- [ ] Database queries are optimized
- [ ] Proper indexes on database tables
- [ ] Connection pooling configured
- [ ] Logs are not too verbose

## Monitoring Setup

- [ ] Health check endpoint configured
- [ ] Error tracking enabled
- [ ] Log monitoring set up
- [ ] Uptime monitoring configured

## Documentation

- [ ] README.md is updated
- [ ] DEPLOYMENT.md is available
- [ ] API documentation (if applicable)
- [ ] Environment variables documented

## Optional Enhancements

- [ ] Custom domain configured
- [ ] CDN for static assets
- [ ] Redis for caching (if needed)
- [ ] Background workers (if needed)
- [ ] Scheduled jobs (if needed)
- [ ] Email service configured
- [ ] SMS service configured

## Troubleshooting Commands

If deployment fails, check:

```bash
# View recent logs
# (In Render Dashboard → Logs tab)

# Test database connection locally
python -c "from sqlalchemy import create_engine; engine = create_engine('YOUR_DATABASE_URL'); print(engine.connect())"

# Test gunicorn locally
gunicorn --worker-class eventlet -w 1 --bind 127.0.0.1:5000 app:app

# Check Python version
python --version

# Verify all dependencies install
pip install -r requirements.txt
```

## Common Issues & Solutions

### Build Fails
- Check Python version in `runtime.txt`
- Verify all dependencies in `requirements.txt`
- Check `build.sh` has execute permissions

### App Crashes on Start
- Verify `DATABASE_URL` is correct
- Check all required env vars are set
- Review start command syntax
- Check logs for specific errors

### Database Connection Error
- Use Internal Database URL, not External
- Ensure database is running
- Check database credentials
- Verify database and web service are in same region

### Static Files Not Loading
- Check file paths are correct
- Verify files are in Git repository
- Check CORS settings

### SocketIO Not Working
- Ensure using `eventlet` worker
- Check CORS configuration
- Verify WebSocket support

## Success Criteria

✅ Application is live and accessible
✅ All features work as expected
✅ No critical errors in logs
✅ Performance is acceptable
✅ Security best practices followed
✅ Monitoring is in place

---

**Deployment Date:** _________________

**Deployed By:** _________________

**Application URL:** https://_________________.onrender.com

**Notes:**
_________________________________________________________________
_________________________________________________________________
_________________________________________________________________
