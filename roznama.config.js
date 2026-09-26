/**
 * RozNama (रोज़नामा) - Master Deployment & Target Configuration
 * 
 * INSTRUCTIONS:
 * Change the single variable `DEPLOYMENT_MODE` below to switch the entire application:
 * 
 *   'LOCAL'  -> Configured for Local Evaluation & Development (Default for Judges / Evaluators).
 *               Runs locally via `npm start` or `node server/server.js` on http://localhost:5000.
 *               Uses local SQLite database (`roznama.db`) with client-side IndexedDB.
 * 
 *   'VERCEL' -> Configured for Vercel Cloud Serverless Deployment (Owner Only).
 *               Enables serverless API routing with Supabase Cloud PostgreSQL.
 *               Protected by OWNER_DEPLOY_KEY so only the authorized author can deploy.
 */

const CONFIG = {
  // =========================================================================
  // 1. SINGLE-VARIABLE DEPLOYMENT SWITCH
  // Options: 'LOCAL' | 'VERCEL'
  // =========================================================================
  DEPLOYMENT_MODE: 'VERCEL',

  // =========================================================================
  // 2. OWNER AUTHORIZATION GUARD (ANTI-THEFT LOCK)
  // When DEPLOYMENT_MODE is 'VERCEL', Vercel environment variable `OWNER_DEPLOY_KEY`
  // must match this secret key. Anyone attempting to deploy this repository to
  // their own Vercel account without this secret key will be blocked.
  // =========================================================================
  OWNER_DEPLOY_KEY: process.env.OWNER_DEPLOY_KEY || 'roznama_owner_haziq_2026_secured'
};

module.exports = CONFIG;
