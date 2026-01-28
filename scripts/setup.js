#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { exec } = require('child_process');
const util = require('util');

const execPromise = util.promisify(exec);
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (query) => new Promise(resolve => rl.question(query, resolve));

async function setupDashboard() {
  console.log('========================================');
  console.log('Oracle Database Dashboard Setup Wizard');
  console.log('========================================\n');
  
  try {
    // Check Node.js version
    const { stdout: nodeVersion } = await execPromise('node --version');
    console.log(`✓ Node.js Version: ${nodeVersion.trim()}`);
    
    // Check npm version
    const { stdout: npmVersion } = await execPromise('npm --version');
    console.log(`✓ npm Version: ${npmVersion.trim()}`);
    
    // Check Oracle client
    try {
      await execPromise('which sqlplus');
      console.log('✓ Oracle SQL*Plus found');
    } catch (error) {
      console.warn('⚠ Oracle SQL*Plus not found in PATH');
      console.log('Please ensure Oracle Instant Client is installed and in PATH');
    }
    
    // Ask for configuration
    console.log('\n📝 Configuration Setup:');
    
    const dbHost = await question('Database Host [localhost]: ') || 'localhost';
    const dbPort = await question('Database Port [1521]: ') || '1521';
    const dbService = await question('Database Service Name [ORCLCDB]: ') || 'ORCLCDB';
    const dbUser = await question('Database Username [system]: ') || 'system';
    const dbPassword = await question('Database Password: ');
    
    if (!dbPassword) {
      console.error('❌ Database password is required');
      process.exit(1);
    }
    
    const adminUser = await question('Dashboard Admin Username [admin]: ') || 'admin';
    const adminPassword = await question('Dashboard Admin Password: ');
    
    if (!adminPassword) {
      console.error('❌ Admin password is required');
      process.exit(1);
    }
    
    const port = await question('Dashboard Port [3000]: ') || '3000';
    const enableEmail = (await question('Enable Email Alerts? (y/n) [n]: ') || 'n').toLowerCase() === 'y';
    
    let emailConfig = {};
    if (enableEmail) {
      emailConfig.host = await question('SMTP Host [smtp.gmail.com]: ') || 'smtp.gmail.com';
      emailConfig.port = await question('SMTP Port [587]: ') || '587';
      emailConfig.user = await question('SMTP Username: ');
      emailConfig.password = await question('SMTP Password: ');
      emailConfig.from = await question('From Email: ');
    }
    
    // Generate secrets
    const sessionSecret = require('crypto').randomBytes(32).toString('hex');
    const jwtSecret = require('crypto').randomBytes(32).toString('hex');
    const encryptionKey = require('crypto').randomBytes(32).toString('hex');
    
    // Create .env file
    const envContent = `# Application Configuration
NODE_ENV=production
APP_NAME=Oracle Dashboard
APP_VERSION=1.0.0
PORT=${port}
HOST=localhost
BASE_URL=http://localhost:${port}

# Security Configuration
SESSION_SECRET=${sessionSecret}
JWT_SECRET=${jwtSecret}
ENCRYPTION_KEY=${encryptionKey}
ENABLE_HTTPS=false

# Database Configuration
DB_HOST=${dbHost}
DB_PORT=${dbPort}
DB_SERVICE=${dbService}
DB_USER=${dbUser}
DB_PASSWORD=${dbPassword}
DB_POOL_MIN=2
DB_POOL_MAX=10
DB_POOL_INCREMENT=1
DB_POOL_TIMEOUT=60
DB_QUEUE_TIMEOUT=60000

# Authentication Configuration
AUTH_ENABLED=true
ADMIN_USER=${adminUser}
ADMIN_PASSWORD=${adminPassword}
SESSION_TIMEOUT=86400000
MAX_LOGIN_ATTEMPTS=5
LOCKOUT_TIME=900000
REQUIRE_2FA=false

# Monitoring Configuration
REFRESH_INTERVAL=30000
METRICS_HISTORY_SIZE=1000
ENABLE_HEALTH_CHECKS=true
HEALTH_CHECK_INTERVAL=300000
ALERT_CHECK_INTERVAL=60000
ENABLE_ALERTING=true
CLEANUP_INTERVAL=86400000

# Alert Thresholds
TABLESPACE_CRITICAL=90
TABLESPACE_WARNING=80
SESSION_CRITICAL=500
SESSION_WARNING=300
CPU_CRITICAL=90
CPU_WARNING=70
MEMORY_CRITICAL=90
MEMORY_WARNING=70
IOWAIT_CRITICAL=50
IOWAIT_WARNING=30
LOCK_CRITICAL=20
LOCK_WARNING=10

# Email Configuration
EMAIL_ENABLED=${enableEmail}
${enableEmail ? Object.entries(emailConfig).map(([key, value]) => `EMAIL_${key.toUpperCase()}=${value}`).join('\n') : ''}

# Other configurations use default values
`;
    
    fs.writeFileSync('.env', envContent);
    console.log('\n✓ Created .env file');
    
    // Install dependencies
    console.log('\n📦 Installing dependencies...');
    await execPromise('npm install');
    console.log('✓ Dependencies installed');
    
    // Create required directories
    const directories = ['logs', 'temp', 'backups'];
    directories.forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
    console.log('✓ Created required directories');
    
    // Test database connection
    console.log('\n🔗 Testing database connection...');
    try {
      const { createConnection } = require('oracledb');
      const connection = await createConnection({
        user: dbUser,
        password: dbPassword,
        connectString: `${dbHost}:${dbPort}/${dbService}`
      });
      await connection.close();
      console.log('✓ Database connection successful');
    } catch (error) {
      console.error('❌ Database connection failed:', error.message);
      console.log('Please check your database configuration and try again');
    }
    
    console.log('\n========================================');
    console.log('✅ Setup completed successfully!');
    console.log('========================================');
    console.log('\nNext steps:');
    console.log('1. Start the dashboard: npm start');
    console.log(`2. Open browser: http://localhost:${port}`);
    console.log(`3. Login with: ${adminUser} / ${adminPassword}`);
    console.log('\nFor production deployment:');
    console.log('- Set up SSL certificates');
    console.log('- Configure firewall rules');
    console.log('- Set up monitoring and backups');
    console.log('- Review and adjust security settings');
    
  } catch (error) {
    console.error('❌ Setup failed:', error.message);
    process.exit(1);
  } finally {
    rl.close();
  }
}

// Run setup
if (require.main === module) {
  setupDashboard();
}