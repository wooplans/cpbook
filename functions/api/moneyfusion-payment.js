const AMOUNT = 39000;
const DEFAULT_API_URL = 'https://pay.moneyfusion.net/CP_BOOK_WOOPLANS/e25d949f16e781b6/pay/';

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });
}

export async function onRequestPost({ request, env }) {
  const body = await request.json().catch(() => null);
  if (!body) return json({ error: 'Requête invalide.' }, 400);
  const name = String(body.name || '').trim();
  const phone = String(body.phone || '').replace(/[^\d+]/g, '');
  const email = String(body.email || '').trim().toLowerCase();
  if (!name || phone.length < 8) return json({ error: 'Nom et téléphone sont obligatoires.' }, 400);

  const origin = new URL(request.url).origin;
  const orderId = `cpbook-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
  const tracking = body.tracking && typeof body.tracking === 'object' ? body.tracking : {};
  const payload = {
    totalPrice: AMOUNT,
    article: [{ 'Catalogue Villas (PDF)': 19500, 'Catalogue Duplex (PDF)': 19500 }],
    numeroSend: phone,
    nomclient: name,
    personal_Info: [{
      orderId,
      email: email.includes('@') ? email : '',
      phone,
      fbp: String(tracking.fbp || ''),
      fbc: String(tracking.fbc || ''),
      event_source_url: String(tracking.event_source_url || `${origin}/digital`),
      client_user_agent: request.headers.get('user-agent') || '',
      client_ip_address: request.headers.get('cf-connecting-ip') || '',
      utm_source: String(tracking.utm_source || ''),
      utm_campaign: String(tracking.utm_campaign || ''),
    }],
    return_url: `${origin}/digital?payment=return`,
    webhook_url: `${origin}/api/moneyfusion-webhook`,
  };

  const response = await fetch(env.MONEYFUSION_API_URL || DEFAULT_API_URL, {
    method: 'POST', headers: { 'content-type': 'application/json', accept: 'application/json' }, body: JSON.stringify(payload),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.statut === false) return json({ error: data.message || 'MoneyFusion n’a pas pu préparer le paiement.' }, response.ok ? 502 : response.status);
  return json({ token: data.token, payment_url: data.url, message: data.message || 'Paiement en cours' });
}
