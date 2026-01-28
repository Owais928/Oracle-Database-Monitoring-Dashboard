// server.js
const express = require('express');
const https = require('https');
const fs = require('fs');
const socketIo = require('socket.io');
const path = require('path');
const session = require('express-session');
const helmet = require('helmet');
const compression = require('compression');
const cors = require('cors');
require('dotenv').config();

// Import modules
const database = require('./services/database');
const monitoring = require('./services/monitoring');
const dashboardRoutes = require('./routes/dashboard');
const dbaRoutes = require('./routes/dba');

const app = express();

// Load SSL certificates
const certPath = '/etc/letsencrypt/live/www.ot.oracletech.com.pk-0001';
const sslOptions = {
  key: fs.readFileSync(path.join(certPath, 'privkey.pem')),
  cert: fs.readFileSync(path.join(certPath, 'cert.pem')),
  ca: fs.readFileSync(path.join(certPath, 'chain.pem'))
};

const server = https.createServer(sslOptions, app);
const io = socketIo(server);

const expressLayouts = require('express-ejs-layouts');

// Add this middleware AFTER setting view engine
app.set('view engine', 'ejs');
app.use(expressLayouts);
app.set('layout', 'layout');

// Middleware
app.use(helmet({
  crossOriginOpenerPolicy: { 
    policy: 'unsafe-none'  // Allow cross-origin opener access
  },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: [
        "'self'",
        "https://cdn.jsdelivr.net",
        "https://code.jquery.com",
        "https://cdn.plot.ly",
        "'unsafe-inline'"
      ],
      scriptSrcAttr: [
        "'self'",
        "'unsafe-inline'"
      ],
      styleSrc: [
        "'self'",
        "https://cdn.jsdelivr.net",
        "https://cdn.plot.ly",
        "'unsafe-inline'"
      ],
      imgSrc: ["'self'", "data:", "https:"],
      fontSrc: ["'self'", "https://cdn.jsdelivr.net", "data:"],
      connectSrc: [
        "'self'",
        "ws://localhost:*",
        "wss://localhost:*",
        "ws://127.0.0.1:*",
        "wss://127.0.0.1:*",
        "https://cdn.jsdelivr.net"
      ],
      formAction: ["'self'"],
      frameSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      baseUri: ["'self'"],
      upgradeInsecureRequests: []
    }
  }
}));
/*app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
      connectSrc: ["'self'", "ws://localhost:3022"],
      imgSrc: ["'self'", "data:", "https:"]
    }
  }
}));*/

// Additional security headers
app.use((req, res, next) => {
  // HSTS - Force HTTPS
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  
  // X-Content-Type-Options - Prevent MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');
  
  // X-Frame-Options - Clickjacking protection
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  
  // X-XSS-Protection - XSS filter
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  // Permissions-Policy
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  
  next();
});

app.use(compression());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Session management
app.use(session({
  secret: process.env.SESSION_SECRET || 'oracle-dashboard-secret',
  resave: true,  // Changed to true
  saveUninitialized: true,  // Changed to true
  cookie: { 
    secure: true,  // Use secure cookies for HTTPS
    maxAge: 24 * 60 * 60 * 1000,
    httpOnly: true,
    sameSite: 'lax'  // Important for cross-origin protection
  },
  name: 'oracle.sid',
  store: new session.MemoryStore() // Explicitly use memory store
}));
/*app.use(session({
  secret: process.env.SESSION_SECRET || 'oracle-dashboard-secret',
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: process.env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));*/

// Set view engine
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// Authentication middleware
const requireAuth = (req, res, next) => {
  console.log('Auth check:', { 
    hasSession: !!req.session, 
    authenticated: req.session?.authenticated,
    path: req.path 
  });
  
  if (req.session && req.session.authenticated) {
    console.log('User authenticated:', req.session.user);
    return next();
  }
  
  console.log('User not authenticated, redirecting to login');
  res.redirect('/login');
};
/*const requireAuth = (req, res, next) => {
  if (req.session && req.session.authenticated) {
    return next();
  }
  res.redirect('/login');
};*/

// Routes
app.get('/', requireAuth, (req, res) => {
  res.render('dashboard', { 
    title: 'Dashboard',
    currentPage: 'dashboard',
    user: req.session.user,
    refreshInterval: req.session.refreshInterval || 30000
  });
});

app.get('/login', (req, res) => {
  res.render('login', { title: 'Login', currentPage: 'login', layout: false });
});

app.post('/login', async (req, res) => {
  console.log('=== LOGIN ATTEMPT ===');
  console.log('Request body:', req.body);
  console.log('Session ID:', req.sessionID);
  console.log('Session before auth:', req.session);
  
  const { username, password } = req.body;
  
  // Check if form data is being received
  if (!username || !password) {
    console.log('Missing username or password');
    return res.render('login', { 
      title: 'Login', 
      currentPage: 'login',
      layout: false,
      error: 'Username and password are required' 
    });
  }
  
  // For testing, use hardcoded credentials first
  const ADMIN_USER = 'admin';
  const ADMIN_PASSWORD = 'admin123';
  
  console.log(`Checking: ${username} against ${ADMIN_USER}`);
  console.log(`Password check: ${password === ADMIN_PASSWORD ? 'MATCH' : 'NO MATCH'}`);
  
  if (username === ADMIN_USER && password === ADMIN_PASSWORD) {
    console.log('✓ Authentication successful');
    
    req.session.authenticated = true;
    req.session.user = { username, role: 'admin' };
    
    console.log('Session after setting:', req.session);
    
    // Try different approach - don't use save callback
    return res.redirect('/');
    
  } else {
    console.log('✗ Authentication failed');
    return res.render('login', { 
      title: 'Login', 
      currentPage: 'login',
      layout: false,
      error: 'Invalid credentials' 
    });
  }
});

/*app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  
  // Simple authentication - in production, use proper auth
  if (username === process.env.ADMIN_USER && password === process.env.ADMIN_PASSWORD) {
    req.session.authenticated = true;
    req.session.user = { username, role: 'admin' };
    return res.redirect('/');
  }
  
  res.render('login', { 
    title: 'Login', 
    error: 'Invalid credentials' 
  });
});*/

app.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/login');
});

// Add to server.js after existing routes
app.get('/sessions', requireAuth, (req, res) => {
  res.render('sessions', { 
    title: 'Session Management',
    currentPage: 'sessions',
    user: req.session.user 
  });
});

app.get('/performance', requireAuth, (req, res) => {
  res.render('performance', { 
    title: 'Performance',
    currentPage: 'performance',
    user: req.session.user 
  });
});

app.get('/storage', requireAuth, (req, res) => {
  res.render('storage', { 
    title: 'Storage Management',
    currentPage: 'storage',
    user: req.session.user 
  });
});

app.get('/sql', requireAuth, (req, res) => {
  res.render('sql', { 
    title: 'SQL Executor',
    currentPage: 'sql',
    user: req.session.user 
  });
});

app.get('/dba', requireAuth, (req, res) => {
  res.render('dba', { 
    title: 'DBA Tools',
    currentPage: 'dba',
    user: req.session.user 
  });
});


// API Routes
app.use('/api/dashboard', requireAuth, dashboardRoutes);
app.use('/api/dba', requireAuth, dbaRoutes);

// WebSocket for real-time updates
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  
  socket.on('setRefreshInterval', (interval) => {
    socket.refreshInterval = interval;
  });
  
  socket.on('requestUpdate', async () => {
    try {
      const metrics = await monitoring.getAllMetrics();
      socket.emit('metricsUpdate', metrics);
    } catch (error) {
      socket.emit('error', { message: 'Failed to fetch metrics' });
    }
  });
  
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Background updates
const broadcastMetrics = async () => {
  try {
    const metrics = await monitoring.getAllMetrics();
    io.emit('metricsUpdate', metrics);
  } catch (error) {
    console.error('Error broadcasting metrics:', error);
  }
};

// Start periodic updates
setInterval(broadcastMetrics, 30000); // Every 30 seconds

// Start server
const PORT = process.env.PORT || 3022;
server.listen(PORT, async () => {
  console.log(`Server running on https://localhost:${PORT}`);
  
  // Initialize database connection
  try {
    await database.initialize();
    console.log('Database connection initialized');
  } catch (error) {
    console.error('Failed to initialize database:', error);
  }
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('Shutting down gracefully...');
  await database.close();
  server.close();
  process.exit(0);
});