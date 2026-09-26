/**
 * RozNama (रोज़नामा) - Master Configuration
 * Unified configuration: Runs locally by default (npm start on http://localhost:5000)
 * and is 100% ready for Vercel Cloud Serverless Deployment out-of-the-box.
 */

const CONFIG = {
  DEPLOYMENT_MODE: process.env.DEPLOYMENT_MODE || 'LOCAL',
  OWNER_DEPLOY_KEY: process.env.OWNER_DEPLOY_KEY || 'roznama_owner_haziq_2026_secured'
};

module.exports = CONFIG;
