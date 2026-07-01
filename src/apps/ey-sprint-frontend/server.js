const express = require('express');
const path = require('node:path');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();

const appRootDir = __dirname;
const pagesDir = path.join(appRootDir, 'pages');
const publicDir = path.join(appRootDir, 'public');
const configuredBackendTarget = String(process.env.BACKEND_URL || '').trim().replace(/\/$/, '');

function inferSameHostTarget(req) {
  const forwardedProto = String(req.headers['x-forwarded-proto'] || '').split(',')[0].trim();
  const forwardedHost = String(req.headers['x-forwarded-host'] || '').split(',')[0].trim();
  const host = forwardedHost || String(req.headers.host || '').trim();
  const proto = forwardedProto || (req.socket && req.socket.encrypted ? 'https' : 'http');
  if (!host) return '';
  return `${proto}://${host}`;
}

// Enable same-origin /api access by default. If BACKEND_URL is provided, use it.
app.use('/api', (req, res, next) => {
  if (req.headers['x-sc-api-proxy-hop'] === '1') {
    res.status(503).json({
      error: 'API backend target is not reachable. Set BACKEND_URL to a working backend origin.',
    });
    return;
  }

  const dynamicTarget = configuredBackendTarget || inferSameHostTarget(req);
  if (!dynamicTarget) {
    res.status(503).json({
      error: 'API backend target is missing. Set BACKEND_URL or provide a valid host header.',
    });
    return;
  }

  return createProxyMiddleware({
    target: dynamicTarget,
    changeOrigin: true,
    xfwd: true,
    logLevel: 'warn',
    pathRewrite: (requestPath) => `/api${requestPath}`,
    onProxyReq: (proxyReq) => {
      proxyReq.setHeader('x-sc-api-proxy-hop', '1');
    },
  })(req, res, next);
});

app.use(express.static(publicDir));

app.get('/', (_req, res) => {
  res.sendFile(path.join(pagesDir, 'index.html'));
});

app.get('/script.js', (_req, res) => {
  res.type('application/javascript');
  res.sendFile(path.join(pagesDir, 'index.js'));
});

app.get('/admin', (_req, res) => {
  res.sendFile(path.join(pagesDir, 'admin', 'index.html'));
});

app.get('/admin/script.js', (_req, res) => {
  res.type('application/javascript');
  res.sendFile(path.join(pagesDir, 'admin', 'index.js'));
});

app.get('/admin/sprint-calendar', (_req, res) => {
  res.sendFile(path.join(pagesDir, 'admin', 'sprint-calendar.html'));
});

app.get('/admin/sprint-calendar/script.js', (_req, res) => {
  res.type('application/javascript');
  res.sendFile(path.join(pagesDir, 'admin', 'sprint-calendar.js'));
});

app.get('/admin/sprint-roles', (_req, res) => {
  res.sendFile(path.join(pagesDir, 'admin', 'sprint-roles.html'));
});

app.get('/admin/sprint-roles/script.js', (_req, res) => {
  res.type('application/javascript');
  res.sendFile(path.join(pagesDir, 'admin', 'sprint-roles.js'));
});

app.get('/admin/sprint-teams', (_req, res) => {
  res.sendFile(path.join(pagesDir, 'admin', 'sprint-teams.html'));
});

app.get('/admin/sprint-teams/script.js', (_req, res) => {
  res.type('application/javascript');
  res.sendFile(path.join(pagesDir, 'admin', 'sprint-teams.js'));
});

app.get('/admin/users', (_req, res) => {
  res.sendFile(path.join(pagesDir, 'admin', 'users.html'));
});

app.get('/admin/users/script.js', (_req, res) => {
  res.type('application/javascript');
  res.sendFile(path.join(pagesDir, 'admin', 'users.js'));
});

app.use((_req, res) => {
  res.status(404).send('Not found');
});

const port = Number(process.env.PORT) || 3001;
if (process.env.VERCEL !== '1') {
  app.listen(port, () => {
    console.log(`[ey-sprint-frontend] listening on ${port}`);
  });
}

module.exports = app;
