// Vercel Serverless Function Entry Point
// Universal entry point: forwards serverless requests directly to the Express application
const app = require('../server/server');

module.exports = (req, res) => {
  return app(req, res);
};
