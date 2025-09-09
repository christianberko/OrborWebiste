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
function getServiceName(serviceCode) {
  const serviceNames = {
    '01': 'UPS Next Day Air',
    '02': 'UPS 2nd Day Air',
    '03': 'UPS Ground',
    '12': 'UPS 3 Day Select',
    '13': 'UPS Next Day Air Saver',
    '14': 'UPS Next Day Air Early',
    '59': 'UPS 2nd Day Air A.M.',
    '65': 'UPS Worldwide Saver'
  };
  return serviceNames[serviceCode] || 'UPS Ground';
}

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

// Removed old unauthenticated test endpoint and information_schema debug

// Get shipping orders for admin dashboard
app.get('/api/founder/orders', requireAuth, async (req, res) => {
  try {
    console.log('📊 Founder orders: fetching all orders');
    const { data: orders, error } = await supabase
      .from('shipping_orders')
      .select('*')
      .order('order_date', { ascending: false });

    if (error) {
      console.error('❌ Error fetching orders:', error);
      return res.status(500).json({ success: false, error: 'Failed to fetch orders' });
    }

    console.log('✅ Orders fetched:', orders?.length || 0);
    res.json({ success: true, orders: orders || [] });
  } catch (error) {
    console.error('❌ Exception in orders endpoint:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// Get order analytics for dashboard
app.get('/api/founder/analytics', requireAuth, async (req, res) => {
  try {
    const { data: orders, error } = await supabase
      .from('shipping_orders')
      .select('*');

    if (error) {
      console.error('Error fetching analytics:', error);
      return res.status(500).json({ success: false, error: 'Failed to fetch analytics' });
    }

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const safeNumber = (v) => {
      const n = parseFloat(v);
      return isNaN(n) ? 0 : n;
    };

    let totalRevenueAllTime = 0;
    let totalSpentThisMonth = 0;
    let ordersThisMonth = 0;
    const serviceTypes = {};
    const stateDistribution = {};

    orders.forEach(order => {
      const charge = safeNumber(order.total_charges);
      totalRevenueAllTime += charge;

      const orderDate = order.order_date ? new Date(order.order_date) : null;
      if (orderDate && orderDate >= monthStart) {
        totalSpentThisMonth += charge;
        ordersThisMonth += 1;
      }

      const service = order.service_name || 'Unknown';
      serviceTypes[service] = (serviceTypes[service] || 0) + 1;

      const state = order.shipper_state || 'Unknown';
      stateDistribution[state] = (stateDistribution[state] || 0) + 1;
    });

    // Determine top state overall
    let topStateOverall = 'N/A';
    let topStateCount = 0;
    Object.entries(stateDistribution).forEach(([state, count]) => {
      if (count > topStateCount) {
        topStateCount = count;
        topStateOverall = state;
      }
    });

    const analytics = {
      totalOrders: orders.length,
      totalRevenue: totalRevenueAllTime,
      monthly: {
        totalSpentThisMonth,
        ordersThisMonth
      },
      topStateOverall,
      serviceTypes,
      stateDistribution
    };

    res.json({ success: true, analytics });
  } catch (error) {
    console.error('Error in analytics endpoint:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
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
    
    console.log('UPS API Response received:', JSON.stringify(upsResponse, null, 2));
    console.log('Response structure check:');
    console.log('- Has ShipmentResponse:', !!upsResponse.ShipmentResponse);
    console.log('- Has Response:', !!upsResponse.ShipmentResponse?.Response);
    console.log('- ResponseStatus.Code:', upsResponse.ShipmentResponse?.Response?.ResponseStatus?.Code);
    console.log('- ResponseStatusCode:', upsResponse.ShipmentResponse?.Response?.ResponseStatusCode);

    // Check if the UPS response contains errors
    if (upsResponse.fault) {
      console.error('UPS API returned fault:', upsResponse.fault);
      return res.status(400).json({ 
        error: 'UPS API Error: ' + (upsResponse.fault.faultstring || 'Unknown error'),
        details: upsResponse.fault
      });
    }

    // Check for successful response - UPS can return success in different formats
    if (upsResponse.ShipmentResponse && upsResponse.ShipmentResponse.Response) {
      const response = upsResponse.ShipmentResponse.Response;
      
      // Check both possible success indicators
      const isSuccess = response.ResponseStatus?.Code === '1' || response.ResponseStatusCode === '1';
      
      if (isSuccess) {
        // Success - return the label data
        const shipmentResults = upsResponse.ShipmentResponse.ShipmentResults;
        
        // Validate that we have the required data
        if (!shipmentResults || !shipmentResults.PackageResults || !shipmentResults.PackageResults[0]) {
          console.error('Missing shipment results data:', shipmentResults);
          return res.status(500).json({
            error: 'UPS API returned success but missing label data',
            details: upsResponse
          });
        }
        
        const packageResult = shipmentResults.PackageResults[0];
        const labelImage = packageResult.ShippingLabel?.GraphicImage;
        const trackingNumber = packageResult.TrackingNumber;
        
        if (!labelImage || !trackingNumber) {
          console.error('Missing label image or tracking number:', packageResult);
          return res.status(500).json({
            error: 'UPS API returned success but missing label image or tracking number',
            details: packageResult
          });
        }
        
        // Save order to database
        try {
          console.log('🔄 Attempting to save order to database...');
          
          const shipment = shipmentRequest.ShipmentRequest.Shipment;
          const shipper = shipment.Shipper;
          
          const orderData = {
            tracking_number: trackingNumber,
            ups_shipment_id: shipmentResults.ShipmentIdentificationNumber,
            
            // Shipper information
            shipper_name: shipper.Name || 'Unknown',
            shipper_email: null, // Not collected in current form
            shipper_phone: shipper.Phone?.Number || '0000000000', // Required field in your schema
            shipper_company: shipper.CompanyName || null,
            
            // Shipper address
            shipper_address: shipper.Address?.AddressLine?.[0] || 'Unknown',
            shipper_city: shipper.Address?.City || 'Unknown',
            shipper_state: shipper.Address?.StateProvinceCode || 'Unknown',
            shipper_zip: shipper.Address?.PostalCode || 'Unknown',
            shipper_country: shipper.Address?.CountryCode || 'US',
            
            // Service details
            service_type: shipment.Service?.Code || '03',
            service_name: getServiceName(shipment.Service?.Code || '03'),
            
            // Cost information
            total_charges: parseFloat(shipmentResults.ShipmentCharges?.TotalCharges?.MonetaryValue || '0.00'),
            currency: shipmentResults.ShipmentCharges?.TotalCharges?.CurrencyCode || 'USD',
            
            // Status
            status: 'created',
            order_date: new Date().toISOString(),
            shipped_date: new Date().toISOString()
          };

          console.log('📦 Order data to save:', JSON.stringify(orderData, null, 2));
          
          // Test Supabase connection first
          console.log('🔗 Testing Supabase connection...');
          const { data: testData, error: testError } = await supabase
            .from('shipping_orders')
            .select('count', { count: 'exact', head: true });
            
          if (testError) {
            console.error('❌ Supabase connection test failed:', testError);
            console.error('❌ Full test error:', JSON.stringify(testError, null, 2));
          } else {
            console.log('✅ Supabase connection successful. Current table count:', testData);
          }

          console.log('💾 Inserting order into shipping_orders table...');
          const { data: savedOrder, error: dbError } = await supabase
            .from('shipping_orders')
            .insert([orderData])
            .select();

          if (dbError) {
            console.error('❌ Database save error:', dbError);
            console.error('❌ Full database error details:', JSON.stringify(dbError, null, 2));
            console.error('❌ Error code:', dbError.code);
            console.error('❌ Error message:', dbError.message);
            console.error('❌ Error details:', dbError.details);
            console.error('❌ Error hint:', dbError.hint);
            // Don't fail the request if DB save fails, just log it
          } else {
            console.log('✅ Order saved to database successfully!');
            console.log('✅ Saved order ID:', savedOrder[0]?.id);
            console.log('✅ Saved order data:', JSON.stringify(savedOrder[0], null, 2));
          }
        } catch (dbSaveError) {
          console.error('❌ Exception while saving to database:', dbSaveError);
          console.error('❌ Exception stack:', dbSaveError.stack);
          // Continue with response even if DB save fails
        }

        const successResponse = {
          success: true,
          message: 'Shipping label created successfully',
          trackingNumber: trackingNumber,
          labelImage: labelImage,
          labelFormat: packageResult.ShippingLabel?.LabelImageFormat?.Code || 'GIF',
          totalCharges: shipmentResults.ShipmentCharges?.TotalCharges?.MonetaryValue || '0.00',
          currency: shipmentResults.ShipmentCharges?.TotalCharges?.CurrencyCode || 'USD',
          upsResponse: upsResponse
        };
        
        console.log('Sending SUCCESS response to frontend:', {
          success: successResponse.success,
          hasLabelImage: !!successResponse.labelImage,
          hasTrackingNumber: !!successResponse.trackingNumber,
          trackingNumber: successResponse.trackingNumber
        });
        
        res.json(successResponse);
      } else {
        // UPS returned an error
        console.error('UPS API returned error:', response);
        return res.status(400).json({
          error: 'UPS API Error: ' + (response.Error?.ErrorDescription || response.ResponseStatus?.Description || 'Unknown error'),
          details: response
        });
      }
    } else if (upsResponse.Response && upsResponse.Response.ResponseStatus) {
      // Alternative response format
      const response = upsResponse.Response;
      
      if (response.ResponseStatus.Code === '1') {
        // Success in alternative format
        res.json({
          success: true,
          message: 'Shipping label created successfully',
          trackingNumber: upsResponse.ShipmentResults?.PackageResults?.[0]?.TrackingNumber,
          labelImage: upsResponse.ShipmentResults?.PackageResults?.[0]?.ShippingLabel?.GraphicImage,
          labelFormat: upsResponse.ShipmentResults?.PackageResults?.[0]?.ShippingLabel?.LabelImageFormat?.Code || 'GIF',
          totalCharges: upsResponse.ShipmentResults?.ShipmentCharges?.TotalCharges?.MonetaryValue || '0.00',
          currency: upsResponse.ShipmentResults?.ShipmentCharges?.TotalCharges?.CurrencyCode || 'USD',
          upsResponse: upsResponse
        });
      } else {
        // Error in alternative format
        return res.status(400).json({
          error: 'UPS API Error: ' + (response.ResponseStatus?.Description || 'Unknown error'),
          details: response
        });
      }
    } else {
      // Unexpected response format - log it for debugging
      console.error('Unexpected UPS response format:', JSON.stringify(upsResponse, null, 2));
      return res.status(500).json({
        error: 'Unexpected response format from UPS API',
        details: upsResponse
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
  // Supabase environment diagnostics
  try {
    const maskedKey = supabaseServiceKey ? `${supabaseServiceKey.slice(0, 4)}...${supabaseServiceKey.slice(-4)}` : 'MISSING';
    console.log('🗄️ Supabase URL:', supabaseUrl || 'MISSING');
    console.log('🗄️ Supabase Service Key present:', !!supabaseServiceKey, supabaseServiceKey ? `(masked: ${maskedKey})` : '');
  } catch (e) {
    console.log('🗄️ Supabase env log error:', e?.message || e);
  }
}); 