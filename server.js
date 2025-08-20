const express = require('express');
const path = require('path');
const fs = require('fs');
const cookieParser = require('cookie-parser');
const { createClient } = require('@supabase/supabase-js');
const fetch = require('node-fetch');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Supabase configuration
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// UPS API Configuration
const UPS_CLIENT_ID = process.env.UPS_CLIENT_ID;
const UPS_CLIENT_SECRET = process.env.UPS_CLIENT_SECRET;
const UPS_BASE_URL = process.env.NODE_ENV === 'production' 
  ? 'https://www.ups.com/api/shipments' 
  : 'https://wwwcie.ups.com/api/shipments';
const UPS_OAUTH_URL = process.env.NODE_ENV === 'production'
  ? 'https://www.ups.com/security/v1/oauth/token'
  : 'https://wwwcie.ups.com/security/v1/oauth/token';

// Middleware
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(cookieParser());

// Authentication middleware - Fixed to handle sessions properly
const requireAuth = async (req, res, next) => {
  try {
    // Get the session token from cookies or Authorization header
    const sessionToken = req.cookies?.sb_session || req.headers.authorization?.replace('Bearer ', '');
    
    if (!sessionToken) {
      return res.status(401).json({ error: 'No session token found' });
    }

    // Set the session token for this request
    const { data: { user }, error } = await supabase.auth.getUser(sessionToken);
    
    if (error || !user) {
      return res.status(401).json({ error: 'Invalid session token' });
    }
    
    // Check if user is one of the founders
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
    console.error('Auth middleware error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// UPS API Helper Functions
async function getUPSToken() {
  try {
    // Create Basic Auth header with client_id:client_secret
    const credentials = Buffer.from(`${process.env.UPS_CLIENT_ID}:${process.env.UPS_CLIENT_SECRET}`).toString('base64');
    
    const response = await fetch(UPS_OAUTH_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${credentials}`
      },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        scope: 'shipment'
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('UPS OAuth Error Response:', errorText);
      throw new Error(`UPS OAuth failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data.access_token;
  } catch (error) {
    console.error('Error getting UPS token:', error);
    throw error;
  }
}

async function createUPSLabel(shipmentRequest) {
  try {
    const token = await getUPSToken();
    const version = 'v2409';
    const query = new URLSearchParams({ additionaladdressvalidation: 'string' }).toString();
    
    const response = await fetch(`${UPS_BASE_URL}/${version}/ship?${query}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'transId': 'string',
        'transactionSrc': 'testing',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(shipmentRequest)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('UPS API Error Response:', errorText);
      throw new Error(`UPS API failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error creating UPS label:', error);
    console.error('Error stack:', error.stack);
    console.error('Error message:', error.message);
    throw error;
  }
}

// Root route: serve index.html
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

// Authentication endpoint
app.post('/api/auth/signin', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Check if it's one of the founders
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
    
    // Set session cookie for server-side authentication
    res.cookie('sb_session', data.session.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    });
    
    res.json({ 
      success: true, 
      user: data.user,
      message: 'Successfully signed in as founder'
    });
    
  } catch (error) {
    console.error('Sign-in error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Sign-out endpoint
app.post('/api/auth/signout', async (req, res) => {
  try {
    const sessionToken = req.cookies?.sb_session;
    
    if (sessionToken) {
      const { error } = await supabase.auth.signOut(sessionToken);
      if (error) {
        console.error('Supabase signout error:', error);
      }
    }
    
    // Clear the session cookie
    res.clearCookie('sb_session');
    
    res.json({ success: true, message: 'Successfully signed out' });
    
  } catch (error) {
    console.error('Sign-out error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Check authentication status
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
    console.error('Auth status error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Protected route example - only accessible to authenticated founders
app.get('/api/founder/dashboard', requireAuth, (req, res) => {
  res.json({ 
    message: 'Welcome to the founder dashboard',
    user: req.user 
  });
});

// UPS Shipping Label Creation Route
app.post('/api/ups/create-label', async (req, res) => {
  try {
    // Validate required environment variables
    if (!UPS_CLIENT_ID || !UPS_CLIENT_SECRET) {
      return res.status(500).json({ 
        error: 'UPS API credentials not configured. Please set UPS_CLIENT_ID and UPS_CLIENT_SECRET environment variables.' 
      });
    }

    const shipmentRequest = req.body;

    // Basic validation of the shipment request
    if (!shipmentRequest || !shipmentRequest.ShipmentRequest) {
      return res.status(400).json({ 
        error: 'Invalid shipment request format' 
      });
    }

    // Validate required fields
    const shipment = shipmentRequest.ShipmentRequest.Shipment;
    if (!shipment.Shipper || !shipment.ShipTo || !shipment.Package) {
      return res.status(400).json({ 
        error: 'Missing required shipment information (Shipper, ShipTo, or Package)' 
      });
    }

    console.log('Creating UPS shipping label for:', {
      shipper: shipment.Shipper.Name,
      shipTo: shipment.ShipTo.Name,
      service: shipment.Service?.Code
    });

    // Create the shipping label
    const upsResponse = await createUPSLabel(shipmentRequest);
    
    console.log('UPS API Response:', JSON.stringify(upsResponse, null, 2));

    // Check if the UPS response contains errors
    if (upsResponse.fault) {
      console.error('UPS API returned fault:', upsResponse.fault);
      return res.status(400).json({ 
        error: 'UPS API Error: ' + (upsResponse.fault.faultstring || 'Unknown error'),
        details: upsResponse.fault
      });
    }

    // Check for successful response
    if (upsResponse.ShipmentResponse && upsResponse.ShipmentResponse.Response) {
      const response = upsResponse.ShipmentResponse.Response;
      
      if (response.ResponseStatusCode === '1') {
        // Success - return the label data
        const shipmentResults = upsResponse.ShipmentResponse.ShipmentResults;
        
        res.json({
          success: true,
          message: 'Shipping label created successfully',
          trackingNumber: shipmentResults.ShipmentIdentificationNumber,
          labelImage: shipmentResults.PackageResults[0].ShippingLabel.GraphicImage,
          labelFormat: shipmentResults.PackageResults[0].ShippingLabel.LabelImageFormat.Code,
          totalCharges: shipmentResults.ShipmentCharges?.TotalCharges?.MonetaryValue,
          currency: shipmentResults.ShipmentCharges?.TotalCharges?.CurrencyCode,
          upsResponse: upsResponse
        });
      } else {
        // UPS returned an error
        return res.status(400).json({
          error: 'UPS API Error: ' + (response.Error?.ErrorDescription || 'Unknown error'),
          details: response
        });
      }
    } else {
      // Unexpected response format
      return res.status(500).json({
        error: 'Unexpected response format from UPS API',
        response: upsResponse
      });
    }

  } catch (error) {
    console.error('Error in UPS label creation route:', error);
    console.error('Error stack:', error.stack);
    console.error('Error message:', error.message);
    
    // Handle specific error types
    if (error.message.includes('UPS OAuth failed')) {
      return res.status(401).json({ 
        error: 'Failed to authenticate with UPS API. Please check your credentials.' 
      });
    }
    
    if (error.message.includes('UPS API failed')) {
      return res.status(400).json({ 
        error: 'UPS API request failed: ' + error.message 
      });
    }
    
    // Check if it's a network error
    if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
      return res.status(503).json({ 
        error: 'Unable to connect to UPS API. Please try again later.' 
      });
    }
    
    res.status(500).json({ 
      error: 'Internal server error while creating shipping label',
      details: error.message,
      type: error.constructor.name
    });
  }
});

app.get('/api/locations', (req, res) => {
  fs.readFile(path.join(__dirname, 'public', 'json', 'locations.json'), 'utf8', (err, data) => {
      if (err) {
          return res.status(500).json({ error: 'Failed to load locations' });
      }
      res.json(JSON.parse(data));
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port http://localhost:${PORT}`);
  console.log(`📦 UPS API configured: ${UPS_CLIENT_ID ? 'Yes' : 'No'}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
}); 