export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === '/api/cpbook-event') {
      if (request.method === 'OPTIONS') {
        return new Response(null, { status: 204, headers: cors() });
      }
      if (request.method === 'POST') {
        return handleCapi(request, env);
      }
      return new Response('Method Not Allowed', { status: 405 });
    }

    if (url.pathname === '/digital' || url.pathname === '/digital/') {
      url.pathname = '/digital.html';
      return env.ASSETS.fetch(new Request(url.toString(), request));
    }

    if (url.pathname === '/whatsapp' || url.pathname === '/whatsapp/') {
      url.pathname = '/whatsapp.html';
      return env.ASSETS.fetch(new Request(url.toString(), request));
    }

    return env.ASSETS.fetch(request);
  }
};

async function handleCapi(request, env) {
  try {
    const { event_id, name, phone, city, payment_method } = await request.json();

    const [hashedPhone, hashedFirstName] = await Promise.all([
      sha256(normalizePhone(phone)),
      sha256(name.split(' ')[0].toLowerCase().trim())
    ]);

    const baseEvent = {
      event_time: Math.floor(Date.now() / 1000),
      event_id,
      event_source_url: request.headers.get('Referer') || '',
      action_source: 'website',
      user_data: {
        ph: [hashedPhone],
        fn: [hashedFirstName],
        client_ip_address: request.headers.get('CF-Connecting-IP') || '',
        client_user_agent: request.headers.get('User-Agent') || '',
      },
      custom_data: {
        content_name: 'Catalogue Premium Wooplans',
        value: 39000,
        currency: 'XAF',
        city,
        payment_method,
      }
    };

    const payload = {
      data: [
        { ...baseEvent, event_name: 'cpbook_Lead' },
        { ...baseEvent, event_name: 'InitiateCheckout' }
      ]
    };

    const fb = await fetch(
      `https://graph.facebook.com/v19.0/${env.FB_PIXEL_ID}/events?access_token=${env.FB_ACCESS_TOKEN}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      }
    );

    const result = await fb.json();
    return new Response(JSON.stringify({ ok: true, result }), {
      headers: { ...cors(), 'Content-Type': 'application/json' }
    });
  } catch (err) {
    return new Response(JSON.stringify({ ok: false }), {
      status: 500,
      headers: { ...cors(), 'Content-Type': 'application/json' }
    });
  }
}

async function sha256(str) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
}

function normalizePhone(phone) {
  let n = phone.replace(/\D/g, '');
  if (n.startsWith('0')) n = '237' + n.slice(1);
  if (!n.startsWith('237')) n = '237' + n;
  return n;
}

const cors = () => ({
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
});
