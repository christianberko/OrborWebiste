const express = require('express');
const path = require('path');
const fs = require('fs');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const compression = require('compression');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const fetch = require('node-fetch');
const winston = require('winston');
require('dotenv').config();

const config = require('./production.config');

const app = express();
const PORT = config.port;
const HOST = config.host;

// Configure logging
const logger = winston.createLogger({
  level: config.logging.level,
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ 
      filename: config.logging.file, 
      maxsize: config.logging.maxSize,
      maxFiles: config.logging.maxFiles
    }),
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ]
});

// Supabase configuration
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// UPS API Configuration
const UPS_CLIENT_ID = process.env.UPS_CLIENT_ID;
const UPS_CLIENT_SECRET = process.env.UPS_CLIENT_SECRET;
const UPS_BASE_URL = 'https://www.ups.com/api/shipments';
const UPS_OAUTH_URL = 'https://www.ups.com/security/v1/oauth/token';

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://unpkg.com", "https://cdnjs.cloudflare.com"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://unpkg.com", "https://cdnjs.cloudflare.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com", "https://cdnjs.cloudflare.com"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https://www.ups.com", "https://api.supabase.co"],
      frameSrc: ["'self'"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: []
    }
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));

// CORS configuration
app.use(cors(config.cors));

// Rate limiting
const limiter = rateLimit(config.rateLimit);
app.use('/api/', limiter);

// Compression
app.use(compression());

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser(config.session.secret));

// Static files with caching
app.use(express.static(path.join(__dirname, 'public'), {
  maxAge: '1d',
  etag: true,
  lastModified: true
}));

// Authentication middleware
const requireAuth = async (req, res, next) => {
  try {
    const sessionToken = req.cookies?.sb_session || req.headers.authorization?.replace('Bearer ', '');
    
    if (!sessionToken) {
      return res.status(401).json({ error: 'No session token found' });
    }

    const { data: { user }, error } = await supabase.auth.getUser(sessionToken);
    
    if (error || !user) {
      return res.status(401).json({ error: 'Invalid session token' });
    }
    
    const founders = [
      'jakob@orobor.com',
      'jonah@orobor.com'
    ];
    
    if (!founders.includes(user.email)) {
      return res.status(403).json({ error: 'Access denied. Founders only.' });
    }
    
    req.user = user;
    next();
  } catch (error) {
    logger.error('Auth middleware error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: config.nodeEnv
  });
});

// Root route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Sign-in route
app.get('/signin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'SignIn.html'));
});

// Dashboard route - protected
app.get('/dashboard', requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

// Authentication endpoints
app.post('/api/auth/signin', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    const founders = [
      'jakob@orobor.com',
      'jonah@orobor.com'
    ];
    
    if (!founders.includes(email)) {
      return res.status(401).json({ error: 'Unauthorized access. Founders only.' });
    }
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email,
      password: password
    });
    
    if (error) {
      return res.status(400).json({ error: error.message });
    }
    
    res.cookie('sb_session', data.session.access_token, {
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 * 1000
    });
    
    res.json({ 
      success: true, 
      user: data.user,
      message: 'Successfully signed in as founder'
    });
    
  } catch (error) {
    logger.error('Sign-in error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/auth/signout', async (req, res) => {
  try {
    const sessionToken = req.cookies?.sb_session;
    
    if (sessionToken) {
      const { error } = await supabase.auth.signOut(sessionToken);
      if (error) {
        logger.error('Supabase signout error:', error);
      }
    }
    
    res.clearCookie('sb_session');
    res.json({ success: true, message: 'Successfully signed out' });
    
  } catch (error) {
    logger.error('Sign-out error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/auth/status', async (req, res) => {
  try {
    const sessionToken = req.cookies?.sb_session;
    
    if (!sessionToken) {
      return res.status(401).json({ authenticated: false });
    }

    const { data: { user }, error } = await supabase.auth.getUser(sessionToken);
    
    if (error || !user) {
      return res.status(401).json({ authenticated: false });
    }
    
    res.json({ 
      authenticated: true, 
      user: user 
    });
    
  } catch (error) {
    logger.error('Auth status error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Protected routes
app.get('/api/founder/dashboard', requireAuth, (req, res) => {
  res.json({ 
    message: 'Welcome to the founder dashboard',
    user: req.user 
  });
});

// UPS API endpoints
app.post('/api/ups/create-label', async (req, res) => {
  try {
    if (!UPS_CLIENT_ID || !UPS_CLIENT_SECRET) {
      return res.status(500).json({ 
        error: 'UPS API credentials not configured' 
      });
    }

    const shipmentRequest = req.body;
    
    // Validate shipment request
    if (!shipmentRequest || !shipmentRequest.ShipmentRequest) {
      return res.status(400).json({ 
        error: 'Invalid shipment request format' 
      });
    }

    // Create UPS label (simplified for production)
    const upsResponse = await createUPSLabel(shipmentRequest);
    
    if (upsResponse.success) {
      res.json(upsResponse);
    } else {
      res.status(400).json(upsResponse);
    }

  } catch (error) {
    logger.error('Error in UPS label creation:', error);
    res.status(500).json({ 
      error: 'Internal server error while creating shipping label'
    });
  }
});

// Locations endpoint
app.get('/api/locations', (req, res) => {
  fs.readFile(path.join(__dirname, 'public', 'json', 'locations.json'), 'utf8', (err, data) => {
    if (err) {
      logger.error('Failed to load locations:', err);
      return res.status(500).json({ error: 'Failed to load locations' });
    }
    res.json(JSON.parse(data));
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Global error handler
app.use((err, req, res, next) => {
  logger.error('Unhandled error:', err);
  
  if (config.nodeEnv === 'production') {
    res.status(500).json({ error: 'Internal server error' });
  } else {
    res.status(500).json({ error: err.message, stack: err.stack });
  }
});

// Start server
app.listen(PORT, HOST, () => {
  logger.info(`🚀 Production server running on http://${HOST}:${PORT}`);
  logger.info(`📦 UPS API configured: ${UPS_CLIENT_ID ? 'Yes' : 'No'}`);
  logger.info(`🌍 Environment: ${config.nodeEnv}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  process.exit(0);
});

// Helper function for UPS label creation (simplified)
async function createUPSLabel(shipmentRequest) {
  // Implementation would go here
  // This is a placeholder for the production version
  return { success: true, message: 'Label created successfully' };
}
