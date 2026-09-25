/**
 * PM2 Ecosystem Config — Preva Kitchen
 *
 * Server pe run karo:
 *   pm2 start ecosystem.config.cjs
 *   pm2 save
 *   pm2 startup   ← reboot pe auto-start ke liye
 *
 * Reload (zero-downtime):
 *   pm2 reload preva-backend
 *
 * Logs dekhne ke liye:
 *   pm2 logs preva-backend
 */

module.exports = {
  apps: [
    {
      name: 'preva-backend',
      script: 'server.js',
      cwd: './backend',

      // NODE_ENV yahan set hota hai — .env mein comment hi rakho
      env_production: {
        NODE_ENV: 'production',
        PORT: 4000,
      },

      // Restart policy
      max_memory_restart: '512M',
      restart_delay: 3000,
      max_restarts: 10,

      // Logs
      out_file: './logs/backend-out.log',
      error_file: './logs/backend-error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
    },
  ],
};
