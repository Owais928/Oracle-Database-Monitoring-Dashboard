# Oracle Database Monitoring Dashboard

<div align="center">

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D14.0.0-brightgreen)](https://nodejs.org/)
[![Express.js](https://img.shields.io/badge/Express.js-4.x-black)](https://expressjs.com/)
[![Oracle Database](https://img.shields.io/badge/Oracle-11g%2B-red)](https://www.oracle.com/database/)
[![HTTPS Ready](https://img.shields.io/badge/HTTPS-Ready-green)](https://en.wikipedia.org/wiki/HTTPS)
[![Bootstrap 5](https://img.shields.io/badge/Bootstrap-5.3-7952B3)](https://getbootstrap.com/)

**A Professional-Grade Real-Time Database Monitoring and Administration Tool for Oracle Database**

[Features](#features) • [Installation](#installation) • [Configuration](#configuration) • [Usage](#usage) • [Documentation](#documentation) • [Contributing](#contributing)

</div>

---

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Technology Stack](#technology-stack)
- [Screenshots](#screenshots)
- [Installation](#installation)
- [Configuration](#configuration)
- [Usage](#usage)
- [Security Features](#security-features)
- [API Endpoints](#api-endpoints)
- [Database Requirements](#database-requirements)
- [Performance Tips](#performance-tips)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)
- [License](#license)
- [Support](#support)
- [Author](#author)

---

## 🎯 Overview

The **Oracle Database Monitoring Dashboard** is an enterprise-grade web-based monitoring and administration platform designed for Database Administrators (DBAs) and IT operations teams. It provides real-time visibility into Oracle Database health, performance metrics, and system statistics through an intuitive, responsive web interface.

Whether you're managing a single development instance or multiple production databases, this dashboard delivers the tools, insights, and controls needed to ensure optimal database performance and availability.

**Key Highlights:**
- 🔍 Real-time performance monitoring with WebSocket updates
- 📊 Interactive charts and visualizations
- 🔐 Enterprise security with HTTPS/SSL and CSP headers
- 🛠️ Powerful DBA tools for administration
- 📈 Detailed session and SQL performance analysis
- 🎯 Wait event analysis for performance tuning

---

## ✨ Features

### 1. **Performance Monitoring**
- Real-time system metrics tracking
- CPU, memory, and I/O utilization monitoring
- Buffer cache hit ratio analysis
- Automatic metric updates (configurable intervals)

### 2. **Wait Events Analysis**
- Detailed wait event breakdown by class
- System I/O, User I/O, Concurrency, CPU, and more
- Trend visualization and percentile analysis
- Performance bottleneck identification

### 3. **Session Management**
- Active session monitoring with detailed info
- Session filtering and search capabilities
- Kill problematic sessions instantly
- Long-running session detection
- Lock chain visualization

### 4. **SQL Performance Analysis**
- Top SQL statements by resource consumption
- Execution plans and query optimization
- Explain plan generation
- Query performance metrics (elapsed time, CPU, buffer gets)
- Save and execute favorite queries

### 5. **Storage Management**
- Tablespace usage monitoring
- Data file tracking and status
- Space alert detection
- Growth forecasting and capacity planning
- Auto-extending tablespace management

### 6. **Database Administration**
- Schema export with DDL generation
- Backup creation and management
- Backup status tracking
- System information dashboard
- Database parameter configuration

### 7. **Real-Time Updates**
- WebSocket-powered live data streaming
- Zero-latency metric updates
- Persistent connections with Socket.IO
- Automatic reconnection handling

### 8. **Security & Compliance**
- HTTPS/SSL encryption with Let's Encrypt
- Content Security Policy (CSP) headers
- Secure session management
- HSTS enforcement
- CORS protection

### 9. **Responsive Design**
- Mobile-friendly Bootstrap 5 interface
- Desktop, tablet, and smartphone support
- Touch-optimized controls
- Adaptive layouts

### 10. **Data Export**
- CSV export functionality
- JSON format support
- Query result export
- Report generation

---

## 🛠️ Technology Stack

### **Backend**
```
Node.js 14+          - JavaScript runtime
Express.js 4.x       - Web application framework
oracledb 6.0+        - Oracle Database driver
Socket.IO 4.x        - Real-time bidirectional communication
Helmet.js            - Security middleware
express-session      - Session management
compression          - Response compression
CORS                 - Cross-origin resource sharing
```

### **Frontend**
```
Bootstrap 5.3        - CSS framework
EJS                  - Server-side template engine
Chart.js 4.x         - Data visualization
jQuery               - DOM manipulation
Bootstrap Icons      - Icon library
```

### **Security**
```
Let's Encrypt        - SSL/TLS certificates
HTTPS (TLS 1.2+)    - Encrypted communications
CSP Headers          - Content security policy
HSTS                 - HTTP Strict Transport Security
Helmet               - Security headers middleware
```

### **Database**
```
Oracle Database 11g+ - Data source
SQL*Plus compatible  - Query execution
V$ views            - Performance data
```

---

## 📸 Screenshots

The dashboard includes:

- **Login Page** - Secure authentication interface
<img width="1914" height="906" alt="image" src="https://github.com/user-attachments/assets/cf0d8525-1066-48ed-a779-80971dda096c" />
- **Performance Dashboard** - Real-time metrics and charts
<img width="1916" height="906" alt="image" src="https://github.com/user-attachments/assets/c39374db-e34d-4ad5-a0bb-12553b4728e2" />

- **Sessions Management** - Active session monitoring
<img width="1910" height="908" alt="image" src="https://github.com/user-attachments/assets/11dc9bef-d139-4013-940b-ef97f22d1a6a" />

- **SQL Executor** - Query editor with explain plans
<img width="1910" height="906" alt="image" src="https://github.com/user-attachments/assets/a8f250fb-bbf4-47e1-8daa-e22a7573b445" />

- **Storage Dashboard** - Tablespace and file management
<img width="1912" height="910" alt="image" src="https://github.com/user-attachments/assets/55a3f3b1-1f8e-4e93-b7b8-e092d452ebb3" />

- **DBA Tools** - Administration utilities
<img width="1916" height="906" alt="image" src="https://github.com/user-attachments/assets/c2bdeea0-2366-4690-9a71-5da2cf2c804c" />


> 🖼️ [View full blog article with feature descriptions](./public/blog-article.html)

---

## 🚀 Installation

### Prerequisites

```bash
# Required versions
Node.js >= 14.0.0
npm >= 6.0.0
Oracle Database 11g or higher
```

### Step 1: Clone the Repository

```bash
git clone https://github.com/M-AWAIS/oracle-dashboard.git
cd oracle-dashboard
```

### Step 2: Install Dependencies

```bash
npm install
```

### Step 3: Create Environment Configuration

Create a `.env` file in the root directory:

```bash
cp .env.example .env
# Edit .env with your configuration
```

### Step 4: Configure SSL Certificates

For HTTPS (recommended for production):

```bash
# Option 1: Using Let's Encrypt
sudo certbot certonly --standalone -d your-domain.com

# Option 2: Copy existing certificates
cp /path/to/cert.pem ./certs/
cp /path/to/privkey.pem ./certs/
cp /path/to/chain.pem ./certs/
```

### Step 5: Start the Application

```bash
# Development mode (with auto-reload)
npm run dev

# Production mode
npm start
```

The dashboard will be available at:
- **HTTPS:** `https://localhost:3022`
- **HTTP:** `http://localhost:3022` (if configured)

---

## ⚙️ Configuration

### Environment Variables (.env)

```env
# Server Configuration
NODE_ENV=development
PORT=3022
HOST=localhost

# HTTPS/SSL
ENABLE_HTTPS=true
SSL_KEY_PATH=/etc/letsencrypt/live/your-domain/privkey.pem
SSL_CERT_PATH=/etc/letsencrypt/live/your-domain/cert.pem
SSL_CHAIN_PATH=/etc/letsencrypt/live/your-domain/chain.pem

# Database Connection
DB_HOST=your-oracle-host
DB_PORT=1521
DB_SERVICE=ORCL
DB_USER=system
DB_PASSWORD=your-password

# Session Configuration
SESSION_SECRET=your-secret-key-here
SESSION_TIMEOUT=86400000  # 24 hours in milliseconds

# Application Settings
REFRESH_INTERVAL=5000     # Metrics refresh interval (ms)
MAX_ROWS=100              # Max rows to display
BACKUP_DIRECTORY=./backups

# Security
ENABLE_CSP=true
ENABLE_HSTS=true
```

### Database User Privileges

The database user requires the following privileges:

```sql
-- Basic privileges
GRANT CREATE SESSION TO dashboard_user;
GRANT VIEW SYSTEM PRIV TO dashboard_user;
GRANT SELECT_CATALOG_ROLE TO dashboard_user;

-- V$ views access
GRANT SELECT ON v_$session TO dashboard_user;
GRANT SELECT ON v_$sqlstats TO dashboard_user;
GRANT SELECT ON v_$sysstat TO dashboard_user;
GRANT SELECT ON v_$system_wait_class TO dashboard_user;

-- DBA views access
GRANT SELECT ON dba_tablespaces TO dashboard_user;
GRANT SELECT ON dba_data_files TO dashboard_user;
GRANT SELECT ON dba_temp_files TO dashboard_user;
GRANT SELECT ON dba_objects TO dashboard_user;
GRANT SELECT ON dba_segments TO dashboard_user;

-- Optional: Admin privileges
GRANT ALTER SYSTEM TO dashboard_user;  -- For parameter changes
GRANT KILL SESSION TO dashboard_user;  -- For session termination
```

---

## 📖 Usage

### Basic Navigation

1. **Login** - Authenticate with your database credentials
2. **Dashboard** - View real-time performance metrics
3. **Sessions** - Monitor active database sessions
4. **SQL** - Execute and analyze SQL queries
5. **Storage** - Track tablespace usage
6. **DBA Tools** - Perform administrative tasks

### Common Tasks

#### Monitor Performance
1. Navigate to **Performance Dashboard**
2. Review system metrics and wait events
3. Analyze top SQL statements
4. Check database health status

#### Kill a Session
1. Go to **Sessions** page
2. Find the session to terminate
3. Click **Kill Session** button
4. Confirm the action

#### Execute Custom SQL
1. Open **SQL Executor**
2. Write or paste your query
3. Click **Execute** (Ctrl+Enter)
4. Review results or explain plan
5. Export results if needed

#### Create Database Backup
1. Navigate to **DBA Tools**
2. Click **Create Backup**
3. Select backup parameters
4. Monitor backup progress
5. Verify backup file creation

#### Export Schema
1. Go to **DBA Tools**
2. Click **Export Schema**
3. Specify schema name
4. Backup file is created in `./backups` directory
5. Download or archive as needed

---

## 🔐 Security Features

### HTTPS/SSL Encryption
- All traffic encrypted with TLS 1.2+
- Automatic certificate renewal with Let's Encrypt
- HSTS header forces HTTPS for 1 year
- Prevents man-in-the-middle attacks

### Session Security
- Secure httpOnly cookies (not accessible via JavaScript)
- Automatic session expiration (24 hours)
- CSRF token validation
- Session fixation prevention

### Content Security Policy (CSP)
- Strict CSP headers prevent script injection
- Whitelist of trusted external domains
- WebSocket support for real-time updates
- Form submission restrictions

### Additional Headers
```
X-Content-Type-Options: nosniff          # MIME type sniffing prevention
X-Frame-Options: SAMEORIGIN              # Clickjacking protection
X-XSS-Protection: 1; mode=block          # XSS filter
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: geolocation=(), microphone=(), camera=()
```

### Database Security
- Read-only query execution by default
- No direct database password in frontend
- Connection pooling with controlled limits
- Query validation and sanitization

---

## 📡 API Endpoints

### Authentication
```
POST /login                    - User login
POST /logout                   - User logout
GET  /auth/status             - Check authentication status
```

### Dashboard Metrics
```
GET  /api/dashboard/metrics          - All metrics
GET  /api/dashboard/metrics/performance   - Performance data
GET  /api/dashboard/metrics/sessions      - Session information
GET  /api/dashboard/metrics/wait-events   - Wait events data
GET  /api/dashboard/metrics/tablespaces   - Tablespace usage
GET  /api/dashboard/metrics/sql           - Top SQL statements
```

### Sessions Management
```
GET  /api/sessions              - All sessions
POST /api/sessions/kill         - Kill a session
POST /api/sessions/trace        - Enable session tracing
GET  /api/sessions/locks        - Lock information
GET  /api/sessions/blocking     - Blocking sessions
```

### SQL Operations
```
POST /api/sql/execute           - Execute SQL query
POST /api/sql/explain-plan      - Generate explain plan
POST /api/sql/export            - Export query results
GET  /api/sql/templates         - Get query templates
```

### DBA Tools
```
POST /api/dba/create-backup     - Create database backup
GET  /api/dba/backup-status     - Backup history
POST /api/dba/export-schema     - Export schema DDL
GET  /api/dba/parameters        - Database parameters
POST /api/dba/alter-parameter   - Modify parameters
```

### Storage Management
```
GET  /api/storage/tablespaces   - Tablespace details
GET  /api/storage/datafiles     - Data file information
POST /api/storage/add-datafile  - Add new data file
POST /api/storage/resize        - Resize tablespace
```

---

## 🗄️ Database Requirements

### Supported Versions
- Oracle Database 11g Release 2 and above
- Oracle Database 12c, 18c, 19c, 21c
- Oracle Database 23c (latest)

### Required Privileges
See [Configuration](#configuration) section for detailed privilege requirements.

### Storage Requirements
- Minimum 500MB for application
- Additional space for backups (configurable)
- Monitor /backups directory size

### Network Requirements
- Oracle Net connectivity to target databases
- Port 1521 (default Oracle Net listener)
- HTTPS port 3022 (configurable)

---

## 📊 Performance Tips

### Interpreting Wait Events

| Wait Event | Likely Cause | Solution |
|---|---|---|
| `db file sequential read` | Missing indexes | Create indexes, optimize queries |
| `db file scattered read` | Full table scans | Add indexes, partition tables |
| `log file sync` | Redo log bottleneck | Move logs to faster disk, batch commits |
| `latch free` | Internal contention | Tune DB parameters, reduce load |
| `lock` | Concurrent access issues | Review application logic |
| `CPU` | CPU saturation | Optimize queries, add resources |

### Optimization Best Practices

1. **Monitor Regularly**
   - Review dashboard daily for production databases
   - Track trends over time
   - Set up custom alerts

2. **Focus on Top SQL**
   - Optimize high-resource statements first
   - Use explain plans to understand execution
   - Consider indexing and partitioning

3. **Manage Resources**
   - Keep tablespaces at <80% capacity
   - Archive old data regularly
   - Adjust SGA/PGA parameters based on workload

4. **Session Management**
   - Kill idle long-running sessions
   - Monitor blocking scenarios
   - Review lock contention

5. **Backup Strategy**
   - Regular automated backups
   - Test recovery procedures
   - Monitor backup performance

---

## 🐛 Troubleshooting

### Issue: Cannot Connect to Database

**Solution:**
1. Verify database is running: `sqlplus sys/password@ORCL as sysdba`
2. Check network connectivity: `tnsping ORCL`
3. Verify `.env` configuration
4. Check firewall rules
5. Review application logs: `tail -f logs/application.log`

### Issue: HTTPS Certificate Warning

**Solution:**
```bash
# Install Let's Encrypt certificate
sudo certbot certonly --standalone -d your-domain.com

# Update certificate paths in .env
# Restart application
```

### Issue: WebSocket Connection Failed

**Solution:**
1. Check firewall allows WebSocket connections
2. Verify Socket.IO port configuration
3. Check browser console for errors
4. Review server logs for connection issues

### Issue: Slow Performance/High Memory Usage

**Solution:**
1. Increase Node.js heap: `NODE_OPTIONS='--max-old-space-size=4096'`
2. Reduce refresh interval in `.env`
3. Limit number of active connections
4. Monitor database query performance

### Issue: Session Timeout Errors

**Solution:**
1. Increase SESSION_TIMEOUT in `.env`
2. Check database session limits
3. Review application logs for errors
4. Verify database connectivity

### Enable Debug Logging

```bash
# Set debug environment variable
DEBUG=* npm run dev

# Or for specific module
DEBUG=express:* npm run dev
```

---

## 📝 Project Structure

```
oracle-dashboard/
├── public/                 # Static files
│   ├── css/               # Stylesheets
│   ├── js/                # Client-side JavaScript
│   ├── assets/            # Images and icons
│   └── blog-article.html  # Feature documentation
├── views/                 # EJS templates
│   ├── layout.ejs         # Main layout template
│   ├── login.ejs          # Login page
│   ├── dashboard.ejs      # Performance dashboard
│   ├── sessions.ejs       # Sessions management
│   ├── sql.ejs            # SQL executor
│   ├── dba.ejs            # DBA tools
│   ├── storage.html       # Storage dashboard
│   └── performance.html   # Performance page
├── routes/                # Express routes
│   ├── dashboard.js       # Dashboard endpoints
│   ├── dba.js             # DBA tools endpoints
│   └── auth.js            # Authentication endpoints
├── services/              # Business logic
│   ├── database.js        # Database wrapper
│   ├── monitoring.js      # Monitoring service
│   └── scheduler.js       # Background tasks
├── config/                # Configuration files
│   └── settings.js        # App settings
├── backups/               # Database backups
├── logs/                  # Application logs
├── scripts/               # Setup scripts
│   └── create_tables.sql  # Database setup
├── server.js              # Application entry point
├── package.json           # Dependencies
├── .env.example           # Example environment config
└── README.md              # This file
```

---

## 🤝 Contributing

We welcome contributions! Here's how you can help:

### Fork and Clone

```bash
git clone https://github.com/your-username/oracle-dashboard.git
cd oracle-dashboard
git checkout -b feature/your-feature
```

### Make Changes

1. Create a new branch: `git checkout -b feature/amazing-feature`
2. Make your changes
3. Test thoroughly
4. Commit with clear messages: `git commit -m 'Add amazing feature'`
5. Push to branch: `git push origin feature/amazing-feature`
6. Open a Pull Request

### Code Style

- Use consistent indentation (4 spaces)
- Follow JavaScript conventions
- Add comments for complex logic
- Test all changes before submitting PR

### Reporting Issues

When reporting bugs, please include:
- Node.js and npm versions
- Oracle Database version
- Detailed steps to reproduce
- Expected vs actual behavior
- Error messages and logs

---

## 📄 License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

```
MIT License

Copyright (c) 2026 M-AWAIS

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files...
```

---

## 💬 Support

### Getting Help

- 📖 [Full Documentation](./public/blog-article.html)
- 🐛 [Issue Tracker](https://github.com/M-AWAIS/oracle-dashboard/issues)
- 💡 [Discussions](https://github.com/M-AWAIS/oracle-dashboard/discussions)
- 📧 Email: support@example.com

### Community

- **Stack Overflow**: Tag questions with `oracle-dashboard`
- **GitHub Discussions**: Share ideas and ask questions
- **Issues**: Report bugs and request features

---

## 👨‍💻 Author

### M-AWAIS

**Senior Software Engineer | Oracle Database Specialist | DevOps Expert**

- 🔗 [GitHub](https://github.com/M-AWAIS)
- 💼 [LinkedIn](https://linkedin.com/in/m-awais)
- 🌐 [Portfolio](https://m-awais.dev)
- 📧 [Email](mailto:contact@m-awais.dev)

**Skills & Expertise:**
- Oracle Database 11g, 12c, 19c, 21c
- Performance tuning and optimization
- Node.js and Express.js development
- Full-stack web development
- DevOps and infrastructure automation
- Enterprise security and compliance

---

## 🙏 Acknowledgments

- [Node.js](https://nodejs.org/) - JavaScript runtime
- [Express.js](https://expressjs.com/) - Web framework
- [Bootstrap](https://getbootstrap.com/) - CSS framework
- [Chart.js](https://www.chartjs.org/) - Data visualization
- [Socket.IO](https://socket.io/) - Real-time communication
- [Helmet.js](https://helmetjs.github.io/) - Security middleware
- [Let's Encrypt](https://letsencrypt.org/) - Free SSL certificates
- [Oracle Database](https://www.oracle.com/database/) - Database system

---

## 📈 Project Statistics

- **Stars**: ⭐ If you find this useful, please star!
- **Forks**: 🍴 Feel free to fork and customize
- **Contributors**: 👥 Join us in improving the project
- **Last Updated**: January 2026
- **Version**: 1.0.0

---

<div align="center">

**Made with ❤️ by [M-AWAIS](https://github.com/M-AWAIS)**

If you find this project helpful, please consider:
- ⭐ Starring the repository
- 🐛 Reporting bugs
- 💡 Suggesting features
- 🤝 Contributing code

**Happy Database Monitoring! 🚀**

</div>

---

*Last Updated: January 28, 2026*
*Oracle Database Monitoring Dashboard v1.0.0*
