module.exports = {
  apps: [{
    name: 'orobor-website',
    script: 'server.production.js',
    instances: 'max', // Use all available CPU cores
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    
    // Logging
    log_file: '/var/log/orobor/combined.log',
    out_file: '/var/log/orobor/out.log',
    error_file: '/var/log/orobor/error.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    
    // Performance
    max_memory_restart: '1G',
    node_args: '--max-old-space-size=1024',
    
    // Restart policy
    min_uptime: '10s',
    max_restarts: 10,
    restart_delay: 4000,
    
    // Watch mode (disable in production)
    watch: false,
    ignore_watch: ['node_modules', 'logs', '*.log'],
    
    // Health check
    health_check_grace_period: 3000,
    health_check_fatal_exceptions: true,
    
    // Kill timeout
    kill_timeout: 5000,
    
    // Listen timeout
    listen_timeout: 8000,
    
    // Cron jobs for log rotation
    cron_restart: '0 0 * * *', // Restart daily at midnight
    
    // Environment variables
    env_file: '.env.production'
  }],
  
  deploy: {
    production: {
      user: 'root',
      host: 'your-vps-ip',
      ref: 'origin/main',
      repo: 'git@github.com:christianberko/OrborWebiste.git',
      path: '/var/www/orobor',
      'pre-deploy-local': '',
      'post-deploy': 'npm install --production && pm2 reload ecosystem.config.js --env production',
      'pre-setup': ''
    }
  }
};
