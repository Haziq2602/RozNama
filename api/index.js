// Vercel Serverless Function Entry Point with Owner Authorization Guard
const config = require('../roznama.config');
const app = require('../server/server');

module.exports = (req, res) => {
  // 1. Check Single-Variable Deployment Switch
  if (config.DEPLOYMENT_MODE !== 'VERCEL') {
    return res.status(403).json({
      error: 'Deployment Restricted',
      message: 'This repository is configured for LOCAL deployment only. Cloud deployment on Vercel is locked by the author.',
      status: 'LOCKED_LOCAL_ONLY',
      hint: 'To enable Vercel deployment, set DEPLOYMENT_MODE to "VERCEL" in roznama.config.js.'
    });
  }

  // 2. Owner Authorization Anti-Theft Guard
  const providedKey = process.env.OWNER_DEPLOY_KEY;
  const expectedKey = config.OWNER_DEPLOY_KEY;

  if (!providedKey || providedKey !== expectedKey) {
    return res.status(403).json({
      error: 'Unauthorized Vercel Deployment',
      message: 'Missing or invalid OWNER_DEPLOY_KEY in Vercel environment variables. Deployment restricted to the verified project owner.',
      status: 'LOCKED_UNAUTHORIZED_OWNER'
    });
  }

  // 3. Authorized Owner: Forward request to Express Server
  return app(req, res);
};
