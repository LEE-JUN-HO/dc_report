const SLACK_API_URL = 'https://slack.com/api/conversations.list';

function sendJson(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Resource-Hub-Token');
  res.end(JSON.stringify(body));
}

function getRequestToken(req) {
  const headerToken = String(req.headers['x-resource-hub-token'] || '').trim();
  const auth = String(req.headers.authorization || '').trim();
  const bearerToken = auth.toLowerCase().startsWith('bearer ') ? auth.slice(7).trim() : '';
  return headerToken || bearerToken;
}

function assertConfigured(req) {
  const slackToken = process.env.SLACK_BOT_TOKEN;
  const syncToken = process.env.SLACK_SYNC_TOKEN;

  if (!slackToken) {
    return { ok: false, status: 503, error: 'missing_slack_bot_token' };
  }
  if (!syncToken) {
    return { ok: false, status: 503, error: 'missing_slack_sync_token' };
  }
  if (getRequestToken(req) !== syncToken) {
    return { ok: false, status: 401, error: 'invalid_sync_token', detail: 'SLACK_SYNC_TOKEN mismatch' };
  }
  return { ok: true, slackToken };
}

async function fetchSlackChannels(slackToken) {
  const channels = [];
  let cursor = '';

  do {
    const url = new URL(SLACK_API_URL);
    url.searchParams.set('types', 'public_channel,private_channel');
    url.searchParams.set('exclude_archived', 'true');
    url.searchParams.set('limit', '1000');
    if (cursor) url.searchParams.set('cursor', cursor);

    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${slackToken}` },
    });
    const data = await response.json();
    if (!data.ok) throw new Error(data.error || `slack_http_${response.status}`);

    channels.push(...(data.channels || []));
    cursor = data.response_metadata?.next_cursor || '';
  } while (cursor);

  return channels;
}

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') return sendJson(res, 200, { ok: true });
  if (req.method !== 'GET') return sendJson(res, 405, { ok: false, error: 'method_not_allowed' });

  const config = assertConfigured(req);
  if (!config.ok) return sendJson(res, config.status, { ok: false, error: config.error, detail: config.detail || null });

  try {
    const channels = await fetchSlackChannels(config.slackToken);
    const svChannels = channels
      .map(ch => ({ id: ch.id, name: ch.name_normalized || ch.name || '' }))
      .filter(ch => /^sv\d{2}[-_:]/i.test(ch.name) || /[-_:]sv\d{2}[-_:]/i.test(ch.name));

    return sendJson(res, 200, { ok: true, channels: svChannels });
  } catch (error) {
    return sendJson(res, 502, { ok: false, error: 'slack_fetch_failed', detail: error.message || null });
  }
};
