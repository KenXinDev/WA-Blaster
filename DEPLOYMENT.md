# 🚀 Deployment Guide - WhatsApp Blast

Panduan lengkap untuk deploy aplikasi WhatsApp Blast ke berbagai platform.

## 📋 Persiapan Deployment

### 1. Environment Variables
Pastikan semua environment variables sudah diset:

```env
NEXTAUTH_URL=https://yourdomain.com
NEXTAUTH_SECRET=your-production-secret-key
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
NODE_ENV=production
```

### 2. Build Application
```bash
npm run build
```

### 3. Test Production Build
```bash
npm start
```

## 🌐 Deployment Options

### Option 1: Vercel (Recommended)

1. **Install Vercel CLI**
   ```bash
   npm i -g vercel
   ```

2. **Login to Vercel**
   ```bash
   vercel login
   ```

3. **Deploy**
   ```bash
   vercel --prod
   ```

4. **Set Environment Variables**
   - Go to Vercel Dashboard
   - Select your project
   - Go to Settings > Environment Variables
   - Add all required variables

**⚠️ Important for Vercel:**
- WhatsApp sessions might not persist due to serverless nature
- Consider using external storage for sessions
- File uploads are limited to 4.5MB

### Option 2: VPS/Dedicated Server

1. **Server Requirements**
   - Ubuntu 20.04+ or CentOS 8+
   - Node.js 18+
   - 2GB+ RAM
   - 20GB+ Storage
   - Nginx (recommended)

2. **Setup Server**
   ```bash
   # Update system
   sudo apt update && sudo apt upgrade -y
   
   # Install Node.js
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt-get install -y nodejs
   
   # Install PM2
   sudo npm install -g pm2
   
   # Install Nginx
   sudo apt install nginx -y
   ```

3. **Deploy Application**
   ```bash
   # Clone repository
   git clone <your-repo-url>
   cd whatsapp-blast
   
   # Install dependencies
   npm install
   
   # Build application
   npm run build
   
   # Start with PM2
   pm2 start npm --name "whatsapp-blast" -- start
   pm2 save
   pm2 startup
   ```

4. **Configure Nginx**
   ```nginx
   server {
       listen 80;
       server_name yourdomain.com;
       
       location / {
           proxy_pass http://localhost:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

5. **SSL Certificate (Let's Encrypt)**
   ```bash
   sudo apt install certbot python3-certbot-nginx -y
   sudo certbot --nginx -d yourdomain.com
   ```

### Option 3: Docker

1. **Create Dockerfile**
   ```dockerfile
   FROM node:18-alpine
   
   WORKDIR /app
   
   COPY package*.json ./
   RUN npm ci --only=production
   
   COPY . .
   RUN npm run build
   
   EXPOSE 3000
   
   CMD ["npm", "start"]
   ```

2. **Create docker-compose.yml**
   ```yaml
   version: '3.8'
   services:
     whatsapp-blast:
       build: .
       ports:
         - "3000:3000"
       environment:
         - NEXTAUTH_URL=https://yourdomain.com
         - NEXTAUTH_SECRET=${NEXTAUTH_SECRET}
         - GOOGLE_CLIENT_ID=${GOOGLE_CLIENT_ID}
         - GOOGLE_CLIENT_SECRET=${GOOGLE_CLIENT_SECRET}
       volumes:
         - ./data:/app/data
         - ./.wwebjs_auth:/app/.wwebjs_auth
       restart: unless-stopped
   ```

3. **Deploy**
   ```bash
   docker-compose up -d
   ```

### Option 4: Railway

1. **Install Railway CLI**
   ```bash
   npm install -g @railway/cli
   ```

2. **Login and Deploy**
   ```bash
   railway login
   railway init
   railway up
   ```

3. **Set Environment Variables**
   ```bash
   railway variables set NEXTAUTH_URL=https://your-app.railway.app
   railway variables set NEXTAUTH_SECRET=your-secret
   railway variables set GOOGLE_CLIENT_ID=your-client-id
   railway variables set GOOGLE_CLIENT_SECRET=your-client-secret
   ```

## 🔧 Production Optimizations

### 1. Performance
```javascript
// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['whatsapp-web.js']
  },
  webpack: (config) => {
    config.externals.push({
      'utf-8-validate': 'commonjs utf-8-validate',
      'bufferutil': 'commonjs bufferutil',
    });
    return config;
  }
}

module.exports = nextConfig
```

### 2. Security Headers
```javascript
// middleware.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const response = NextResponse.next()
  
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('Referrer-Policy', 'origin-when-cross-origin')
  
  return response
}
```

### 3. Monitoring
```bash
# Install monitoring tools
npm install @sentry/nextjs

# Setup PM2 monitoring
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 30
```

## 📊 Database Migration (Optional)

Jika ingin menggunakan database instead of file storage:

### 1. Setup PostgreSQL
```bash
# Install PostgreSQL
sudo apt install postgresql postgresql-contrib -y

# Create database
sudo -u postgres createdb whatsapp_blast
```

### 2. Update Environment
```env
DATABASE_URL="postgresql://username:password@localhost:5432/whatsapp_blast"
```

### 3. Run Migrations
```bash
npx prisma migrate deploy
```

## 🔒 Security Checklist

- [ ] HTTPS enabled
- [ ] Environment variables secured
- [ ] File upload limits configured
- [ ] Rate limiting implemented
- [ ] CORS properly configured
- [ ] Security headers added
- [ ] Regular backups scheduled
- [ ] Monitoring and logging setup

## 🚨 Troubleshooting

### Common Issues

1. **WhatsApp Session Lost**
   ```bash
   # Backup session directory
   cp -r .wwebjs_auth .wwebjs_auth.backup
   
   # Clear and restart
   rm -rf .wwebjs_auth
   pm2 restart whatsapp-blast
   ```

2. **Memory Issues**
   ```bash
   # Increase Node.js memory limit
   NODE_OPTIONS="--max-old-space-size=4096" npm start
   ```

3. **File Permission Issues**
   ```bash
   # Fix permissions
   sudo chown -R $USER:$USER ./data
   sudo chown -R $USER:$USER ./.wwebjs_auth
   chmod -R 755 ./data
   ```

## 📈 Scaling

### Horizontal Scaling
- Use Redis for session storage
- Implement message queue (Bull/Agenda)
- Load balancer with sticky sessions
- Separate WhatsApp instances per server

### Vertical Scaling
- Increase server resources
- Optimize memory usage
- Use clustering
- Database connection pooling

## 🔄 Maintenance

### Regular Tasks
```bash
# Update dependencies
npm update

# Security audit
npm audit fix

# Clean old files
find ./data -name "*.json" -mtime +30 -delete

# Restart application
pm2 restart whatsapp-blast
```

### Backup Strategy
```bash
#!/bin/bash
# backup.sh
DATE=$(date +%Y%m%d_%H%M%S)
tar -czf backup_$DATE.tar.gz data/ .wwebjs_auth/
aws s3 cp backup_$DATE.tar.gz s3://your-backup-bucket/
```

## 📞 Support

Untuk bantuan deployment:
1. Cek log error: `pm2 logs whatsapp-blast`
2. Monitor resources: `pm2 monit`
3. Restart jika diperlukan: `pm2 restart whatsapp-blast`

---

**Happy Deploying! 🚀**