# Bharatcraft - Deployment Guide for Render

## 🚀 Quick Deploy to Render

### Prerequisites
- A [Render](https://render.com) account (free tier available)
- Your code pushed to a GitHub repository
- Basic understanding of environment variables

---

## 📋 Step-by-Step Deployment Instructions

### 1. Prepare Your Repository

Make sure all the deployment files are committed to your GitHub repository:
- `render.yaml` - Render configuration
- `build.sh` - Build script
- `requirements.txt` - Python dependencies
- `.gitignore` - Files to exclude from Git

```bash
git add .
git commit -m "Prepare for Render deployment"
git push origin main
```

### 2. Create a New Web Service on Render

1. Go to [Render Dashboard](https://dashboard.render.com/)
2. Click **"New +"** → **"Web Service"**
3. Connect your GitHub repository
4. Select the `Bharatcraft` repository

### 3. Configure the Web Service

**Basic Settings:**
- **Name:** `bharatcraft` (or your preferred name)
- **Region:** Choose the closest to your users
- **Branch:** `main` (or your default branch)
- **Runtime:** `Python 3`

**Build & Deploy Settings:**
- **Build Command:** `./build.sh`
- **Start Command:** `gunicorn --worker-class eventlet -w 1 --bind 0.0.0.0:$PORT app:app`

**Instance Type:**
- Start with **Free** tier for testing
- Upgrade to **Starter** ($7/month) for production

### 4. Set Up PostgreSQL Database

1. In Render Dashboard, click **"New +"** → **"PostgreSQL"**
2. Configure:
   - **Name:** `bharatcraft-db`
   - **Database:** `bharatcraft`
   - **User:** `bharatcraft`
   - **Region:** Same as your web service
   - **PostgreSQL Version:** 15 (or latest)
   - **Instance Type:** Free (or Starter for production)

3. Click **"Create Database"**
4. Wait for the database to be provisioned

### 5. Configure Environment Variables

In your Web Service settings, go to **"Environment"** and add these variables:

| Key | Value | Notes |
|-----|-------|-------|
| `DATABASE_URL` | `[Copy from PostgreSQL service]` | Internal connection string |
| `SESSION_SECRET` | `[Generate random string]` | Use a strong random value |
| `HOST` | `0.0.0.0` | Required for Render |
| `FLASK_ENV` | `production` | Disables debug mode |
| `OPENAI_API_KEY` | `[Your OpenAI API key]` | Optional, for AI features |
| `STRIPE_SECRET_KEY` | `[Your Stripe key]` | Optional, for payments |
| `STRIPE_PUBLISHABLE_KEY` | `[Your Stripe key]` | Optional, for payments |

**To get DATABASE_URL:**
1. Go to your PostgreSQL service in Render
2. Copy the **"Internal Database URL"**
3. Paste it as the `DATABASE_URL` value

**To generate SESSION_SECRET:**
```python
import secrets
print(secrets.token_hex(32))
```

### 6. Deploy!

1. Click **"Create Web Service"**
2. Render will automatically:
   - Clone your repository
   - Run `build.sh`
   - Install dependencies
   - Start your application

3. Monitor the deployment logs for any errors

### 7. Access Your Application

Once deployed, your app will be available at:
```
https://bharatcraft.onrender.com
```
(Replace `bharatcraft` with your actual service name)

---

## 🔧 Configuration Files Explained

### `render.yaml`
Defines your infrastructure as code:
- Web service configuration
- Database configuration
- Environment variables
- Build and start commands

### `build.sh`
Executed during deployment:
- Upgrades pip
- Installs Python dependencies
- Creates necessary directories

### `requirements.txt`
Lists all Python packages needed:
- Flask and extensions
- Database drivers (PostgreSQL, MongoDB)
- SocketIO for real-time features
- Gunicorn for production server

---

## 🔍 Troubleshooting

### Application Won't Start
**Check:**
- Build logs for dependency installation errors
- Start command is correct
- `PORT` environment variable is being used
- Database connection string is correct

### Database Connection Errors
**Solutions:**
- Verify `DATABASE_URL` is set correctly
- Use **Internal Database URL** (not External)
- Ensure database is in the same region
- Check database is running and accessible

### Static Files Not Loading
**Solutions:**
- Ensure `static/` directory is in your repository
- Check file paths are correct (case-sensitive)
- Verify CORS settings if needed

### SocketIO Connection Issues
**Solutions:**
- Ensure you're using `eventlet` worker class
- Check CORS settings in `app.py`
- Verify WebSocket connections are allowed

---

## 📊 Monitoring & Logs

### View Logs
1. Go to your Web Service in Render Dashboard
2. Click **"Logs"** tab
3. Monitor real-time application logs

### Metrics
- **Free tier:** Basic metrics
- **Paid tiers:** Advanced metrics and alerts

---

## 🔄 Continuous Deployment

Render automatically deploys when you push to your connected branch:

```bash
git add .
git commit -m "Update feature"
git push origin main
```

Render will:
1. Detect the push
2. Run build process
3. Deploy new version
4. Zero-downtime deployment (paid tiers)

---

## 💰 Cost Estimates

### Free Tier
- **Web Service:** Free (spins down after inactivity)
- **PostgreSQL:** Free (90 days, then $7/month)
- **Total:** $0 initially, then $7/month

### Production Tier
- **Web Service:** $7/month (Starter)
- **PostgreSQL:** $7/month (Starter)
- **Total:** $14/month

---

## 🔐 Security Best Practices

1. **Never commit `.env` file** - Use environment variables
2. **Use strong SESSION_SECRET** - Generate cryptographically secure random strings
3. **Enable HTTPS** - Render provides free SSL certificates
4. **Rotate API keys** - Regularly update sensitive credentials
5. **Use Internal Database URL** - More secure than external
6. **Enable CORS properly** - Restrict origins in production

---

## 🚦 Health Checks

Render automatically monitors your service. Optionally add a health endpoint:

```python
@app.route('/health')
def health():
    return {'status': 'healthy'}, 200
```

Configure in Render:
- **Health Check Path:** `/health`
- **Health Check Interval:** 30 seconds

---

## 📚 Additional Resources

- [Render Documentation](https://render.com/docs)
- [Flask Deployment Guide](https://flask.palletsprojects.com/en/latest/deploying/)
- [SocketIO Documentation](https://flask-socketio.readthedocs.io/)
- [PostgreSQL on Render](https://render.com/docs/databases)

---

## 🆘 Support

If you encounter issues:
1. Check Render's [Status Page](https://status.render.com/)
2. Review deployment logs carefully
3. Consult [Render Community](https://community.render.com/)
4. Contact Render Support (paid plans)

---

## ✅ Post-Deployment Checklist

- [ ] Application is accessible via HTTPS
- [ ] Database connection is working
- [ ] User registration/login works
- [ ] File uploads are functional
- [ ] SocketIO chat is working
- [ ] All environment variables are set
- [ ] Logs show no critical errors
- [ ] Performance is acceptable
- [ ] Set up monitoring/alerts
- [ ] Configure custom domain (optional)

---

**Happy Deploying! 🎉**
