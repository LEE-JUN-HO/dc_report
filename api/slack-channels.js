// Vercel serverless function: Slack SV 채널 목록 프록시
// 환경변수 SLACK_BOT_TOKEN 필요 (Vercel 대시보드 → Settings → Environment Variables)

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const token = process.env.SLACK_BOT_TOKEN;
  if (!token) {
    return res.status(500).json({ ok: false, error: 'SLACK_BOT_TOKEN 환경변수가 설정되지 않았습니다.' });
  }

  try {
    const all = [];
    let cursor = '';
    do {
      const params = new URLSearchParams({ limit: '200', types: 'public_channel,private_channel' });
      if (cursor) params.set('cursor', cursor);
      const r = await fetch('https://slack.com/api/conversations.list?' + params, {
        headers: { Authorization: 'Bearer ' + token },
      });
      if (!r.ok) throw new Error('Slack HTTP ' + r.status);
      const data = await r.json();
      if (!data.ok) throw new Error(data.error);
      all.push(...(data.channels || []));
      cursor = (data.response_metadata && data.response_metadata.next_cursor) || '';
    } while (cursor);

    const svChannels = all
      .filter(ch => /sv\d{2}/i.test(ch.name))
      .map(ch => ({ id: ch.id, name: ch.name }));

    res.json({ ok: true, channels: svChannels });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
};
