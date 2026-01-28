// routes/dashboard.js
const express = require('express');
const router = express.Router();
const monitoring = require('../services/monitoring');

// Get all metrics
router.get('/metrics', async (req, res) => {
  try {
    const metrics = await monitoring.getAllMetrics();
    res.json({
      success: true,
      data: metrics,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch metrics',
      error: error.message
    });
  }
});

// Get specific metric
router.get('/metrics/:type', async (req, res) => {
  const { type } = req.params;
  
  try {
    let data;
    switch (type) {
      case 'performance':
        data = await monitoring.getPerformanceMetrics();
        break;
      case 'tablespaces':
        data = await monitoring.getTablespaceUsage();
        break;
      case 'sessions':
        data = await monitoring.getActiveSessions();
        break;
      case 'sql':
        data = await monitoring.getTopSQL();
        break;
      case 'locks':
        data = await monitoring.getLockInformation();
        break;
      case 'parameters':
        data = await monitoring.getDatabaseParameters();
        break;
      case 'wait-events':
        data = await monitoring.getWaitEvents();
        break;
      case 'alerts':
      default:
        return res.status(400).json({
          success: false,
          message: 'Invalid metric type'
        });
    }
    
    res.json({
      success: true,
      data,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: `Failed to fetch ${type} metrics`,
      error: error.message
    });
  }
});

// Set refresh interval
router.post('/refresh-interval', (req, res) => {
  const { interval } = req.body;
  
  if (req.session) {
    req.session.refreshInterval = interval;
  }
  
  res.json({
    success: true,
    message: `Refresh interval set to ${interval}ms`
  });
});

module.exports = router;