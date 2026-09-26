/**
 * RozNama (रोज़नामा) - Master Configuration
 * Local deployment by default (npm start on http://localhost:5000).
 * Codebase is ready to deploy on Vercel serverless out-of-the-box without manual toggles.
 */

const CONFIG = {
  DEPLOYMENT_MODE: process.env.VERCEL ? 'VERCEL' : 'LOCAL',
  OWNER_DEPLOY_KEY: process.env.OWNER_DEPLOY_KEY || 'roznama_owner_haziq_2026_secured'
};

module.exports = CONFIG;

