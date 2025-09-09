// Production Configuration for GoDaddy VPS
module.exports = {
  // Server Configuration
  port: process.env.PORT || 3000,
  host: '0.0.0.0', // Listen on all network interfaces
  
  // Environment
  nodeEnv: 'production',
  
  // Security
  cors: {
    origin: ['https://yourdomain.com', 'https://www.yourdomain.com'],
    credentials: true
  },
  
  // Rate Limiting
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // limit each IP to 100 requests per windowMs
  },
  
  // Session Configuration
  session: {
    secret: process.env.SESSION_SECRET || 'your-very-long-random-session-secret-here',
    cookie: {
      secure: true, // HTTPS only
      httpOnly: true,
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
  },
  
  // Logging
  logging: {
    level: 'info',
    file: '/var/log/orobor/app.log',
    maxSize: '10m',
    maxFiles: '5'
  },
  
  // Database
  database: {
    url: process.env.DATABASE_URL,
    pool: {
      min: 2,
      max: 10
    }
  }
};
