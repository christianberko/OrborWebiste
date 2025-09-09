# 🚀 Orobor Website - GoDaddy VPS Deployment Guide

## 📋 **Prerequisites**

- GoDaddy VPS with Ubuntu 20.04+ or CentOS 8+
- Domain name pointing to your VPS IP address
- SSH access to your VPS
- Root or sudo access

## 🔧 **Step-by-Step Deployment**

### **1. Prepare Your Local Project**

```bash
# Install production dependencies
npm install --production

# Create production environment file
cp env.template .env.production
# Edit .env.production with your actual values
```

### **2. Upload Files to VPS**

```bash
# Option 1: Git (Recommended)
git clone https://github.com/yourusername/OrborWebiste.git /var/www/orobor

# Option 2: SCP/SFTP
scp -r ./* root@your-vps-ip:/var/www/orobor/
```

### **3. Run Deployment Script**

```bash
# SSH into your VPS
ssh root@your-vps-ip

# Navigate to project directory
cd /var/www/orobor

# Make deployment script executable
chmod +x deploy.sh

# Run deployment script
./deploy.sh
```

### **4. Manual Configuration (if needed)**

```bash
# Install dependencies manually
npm install --production

# Start with PM2
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup

# Configure Nginx
cp nginx.conf /etc/nginx/sites-available/orobor
ln -sf /etc/nginx/sites-available/orobor /etc/nginx/sites-enabled/
nginx -t
systemctl reload nginx
```

## 🔐 **Environment Variables Setup**

### **Required Variables:**

```bash
# Supabase (Production)
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_SERVICE_KEY=your_service_role_key

# UPS API (Production)
UPS_CLIENT_ID=your_ups_client_id
UPS_CLIENT_SECRET=your_ups_client_secret

# Security
SESSION_SECRET=$(openssl rand -hex 32)
COOKIE_SECRET=$(openssl rand -hex 32)
```

### **Generate Secure Secrets:**

```bash
# Generate random secrets
openssl rand -hex 32
```

## 🌐 **Domain & SSL Setup**

### **1. DNS Configuration**
- Point your domain to your VPS IP address
- Add A record: `@` → `your-vps-ip`
- Add A record: `www` → `your-vps-ip`

### **2. SSL Certificate**
```bash
# Install Let's Encrypt
apt install certbot python3-certbot-nginx

# Get SSL certificate
certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Auto-renewal
echo "0 12 * * * /usr/bin/certbot renew --quiet" | crontab -
```

## 📊 **Monitoring & Maintenance**

### **PM2 Commands:**
```bash
# Check status
pm2 status

# View logs
pm2 logs orobor-website

# Monitor resources
pm2 monit

# Restart application
pm2 restart orobor-website

# Update application
pm2 reload orobor-website
```

### **System Monitoring:**
```bash
# Check Nginx status
systemctl status nginx

# Check firewall status
ufw status

# Check disk space
df -h

# Check memory usage
free -h
```

## 🔒 **Security Checklist**

- [ ] Firewall configured (UFW)
- [ ] Fail2ban installed and configured
- [ ] SSH key authentication enabled
- [ ] Root login disabled
- [ ] SSL certificate installed
- [ ] Security headers configured
- [ ] Rate limiting enabled
- [ ] Input validation implemented
- [ ] SQL injection protection
- [ ] XSS protection enabled

## 📝 **Log Files**

```bash
# Application logs
/var/log/orobor/

# Nginx logs
/var/log/nginx/orobor_access.log
/var/log/nginx/orobor_error.log

# System logs
/var/log/syslog
/var/log/auth.log
```

## 🚨 **Troubleshooting**

### **Common Issues:**

1. **Port 3000 not accessible**
   - Check if Node.js app is running: `pm2 status`
   - Check firewall: `ufw status`

2. **SSL certificate issues**
   - Verify domain DNS: `nslookup yourdomain.com`
   - Check certbot status: `certbot certificates`

3. **Nginx errors**
   - Test configuration: `nginx -t`
   - Check error logs: `tail -f /var/log/nginx/error.log`

4. **Application crashes**
   - Check PM2 logs: `pm2 logs orobor-website`
   - Check application logs: `tail -f /var/log/orobor/error.log`

## 🔄 **Updates & Maintenance**

### **Regular Tasks:**
```bash
# Update system packages
apt update && apt upgrade -y

# Update Node.js dependencies
npm update

# Restart application
pm2 restart orobor-website

# Check SSL certificate renewal
certbot renew --dry-run
```

### **Backup Strategy:**
```bash
# Create backup script
mkdir -p /backups/orobor
tar -czf /backups/orobor/$(date +%Y%m%d_%H%M%S).tar.gz /var/www/orobor
```

## 📞 **Support & Resources**

- **PM2 Documentation**: https://pm2.keymetrics.io/
- **Nginx Documentation**: https://nginx.org/en/docs/
- **Let's Encrypt**: https://letsencrypt.org/docs/
- **Ubuntu Security**: https://ubuntu.com/security

## ✅ **Deployment Checklist**

- [ ] All files uploaded to VPS
- [ ] Environment variables configured
- [ ] Dependencies installed
- [ ] Application started with PM2
- [ ] Nginx configured and running
- [ ] SSL certificate installed
- [ ] Firewall configured
- [ ] Domain pointing to VPS
- [ ] Website accessible via HTTPS
- [ ] All functionality tested
- [ ] Monitoring configured
- [ ] Backup strategy implemented

---

**🎯 Your Orobor website is now production-ready on GoDaddy VPS!**
