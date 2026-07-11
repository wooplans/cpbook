function json(data, status = 200) { return new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } }); }

export async function onRequestGet({ request }) {
  const token = String(new URL(request.url).searchParams.get('token') || '').trim();
  if (!token) return json({ error: 'Transaction manquante.' }, 400);
  const response = await fetch(`https://www.pay.moneyfusion.net/paiementNotif/${encodeURIComponent(token)}`, { headers: { accept: 'application/json' } });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) return json({ error: 'Statut MoneyFusion indisponible.' }, response.status);
  return json({ status: result.data?.statut || 'unknown', token: result.data?.tokenPay || token });
}
