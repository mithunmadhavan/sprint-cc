const DEFAULT_TIMEOUT_MS = 15000;

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

function inferSameHostTarget(req) {
  const forwardedProto = String(req.headers['x-forwarded-proto'] || '').split(',')[0].trim();
  const forwardedHost = String(req.headers['x-forwarded-host'] || '').split(',')[0].trim();
  const host = forwardedHost || String(req.headers.host || '').trim();
  const proto = forwardedProto || 'https';
  if (!host) return '';
  return `${proto}://${host}`;
}

module.exports = async (req, res) => {
  if (req.headers['x-sc-api-proxy-hop'] === '1') {
    res.status(503).json({
      error: 'API backend target is not reachable. Set BACKEND_URL to a working backend origin.',
    });
    return;
  }

  const configuredTarget = String(process.env.BACKEND_URL || '').trim().replace(/\/$/, '');
  const backendTarget = configuredTarget || inferSameHostTarget(req);
  if (!backendTarget) {
    res.status(503).json({
      error: 'API backend target is missing. Set BACKEND_URL or provide a valid host header.',
    });
    return;
  }

  const rawPath = Array.isArray(req.query.path) ? req.query.path.join('/') : String(req.query.path || '');
  const queryIndex = req.url.indexOf('?');
  const queryString = queryIndex >= 0 ? req.url.slice(queryIndex) : '';
  const targetUrl = `${backendTarget}/api/${rawPath}${queryString}`;

  const headers = { ...req.headers };
  delete headers.host;
  delete headers['content-length'];
  headers['x-sc-api-proxy-hop'] = '1';

  try {
    const isBodyAllowed = !['GET', 'HEAD'].includes(String(req.method || 'GET').toUpperCase());
    const body = isBodyAllowed ? await readBody(req) : undefined;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

    const upstream = await fetch(targetUrl, {
      method: req.method,
      headers,
      body,
      signal: controller.signal,
    });

    clearTimeout(timer);

    upstream.headers.forEach((value, key) => {
      if (key.toLowerCase() === 'transfer-encoding') return;
      res.setHeader(key, value);
    });

    const buffer = Buffer.from(await upstream.arrayBuffer());
    res.status(upstream.status).send(buffer);
  } catch (error) {
    const message = error?.name === 'AbortError'
      ? 'Upstream API timeout'
      : 'Upstream API request failed';
    res.status(503).json({ error: message });
  }
};

