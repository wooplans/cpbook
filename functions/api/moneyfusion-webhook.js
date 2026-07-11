const AMOUNT = 39000;
async function sha256(value) {
  if (!value) return '';
  const bytes = new TextEncoder().encode(String(value).trim().toLowerCase());
  return [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))].map(byte => byte.toString(16).padStart(2, '0')).join('');
}
function info(payload) { return Array.isArray(payload.personal_Info) && payload.personal_Info[0] ? payload.personal_Info[0] : {}; }

export async function onRequestPost({ request, env }) {
  const payload = await request.json().catch(() => ({}));
  if (payload.event !== 'payin.session.completed') return Response.json({ received: true });
  if (!payload.tokenPay) return Response.json({ received: false }, { status: 400 });
  const verification = await fetch(`https://www.pay.moneyfusion.net/paiementNotif/${encodeURIComponent(payload.tokenPay)}`).then(response => response.json()).catch(() => ({}));
  if (verification.data?.statut !== 'paid' || Number(verification.data?.Montant) !== AMOUNT) return Response.json({ received: false }, { status: 400 });
  const details = info(payload);
  const eventId = String(payload.tokenPay || details.orderId || crypto.randomUUID());
  if (env.META_ACCESS_TOKEN) {
    const userData = { em: [await sha256(details.email)], ph: [await sha256(String(details.phone || '').replace(/\D/g, ''))] };
    if (!userData.em[0]) delete userData.em;
    if (!userData.ph[0]) delete userData.ph;
    if (details.fbp) userData.fbp = details.fbp;
    if (details.fbc) userData.fbc = details.fbc;
    if (details.client_ip_address) userData.client_ip_address = details.client_ip_address;
    if (details.client_user_agent) userData.client_user_agent = details.client_user_agent;
    await fetch(`https://graph.facebook.com/${env.META_API_VERSION || 'v23.0'}/${env.META_PIXEL_ID || '1651374605332302'}/events`, {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ access_token: env.META_ACCESS_TOKEN, data: [{
        event_name: 'Purchase', event_time: Math.floor(Date.now() / 1000), event_id: eventId, action_source: 'website',
        event_source_url: details.event_source_url || new URL(request.url).origin + '/digital', user_data: userData,
        custom_data: { currency: 'XAF', value: AMOUNT, content_name: 'Catalogue Premium Wooplans', content_ids: ['cpbook-premium-2026'], content_type: 'product', order_id: eventId },
      }] }),
    }).catch(() => null);
  }
  return Response.json({ received: true });
}
