const VILLA_ID = '18maln7qIHwKhKOVXOwtkvF85fq0XVuzr';
const DUPLEX_ID = '1ArGsvuyEhnHd2IDy_9Tk0sHQQ8CNceM3';
function text(message, status) { return new Response(message, { status, headers: { 'content-type': 'text/plain; charset=utf-8' } }); }

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const token = String(url.searchParams.get('token') || '').trim();
  const file = url.searchParams.get('file') === 'duplex' ? 'duplex' : 'villa';
  if (!token) return text('Transaction manquante.', 400);
  const statusResponse = await fetch(`https://www.pay.moneyfusion.net/paiementNotif/${encodeURIComponent(token)}`);
  const statusData = await statusResponse.json().catch(() => ({}));
  if (!statusResponse.ok || statusData.data?.statut !== 'paid') return text('Paiement non confirmé.', 403);
  const fallback = `https://drive.google.com/uc?export=download&id=${file === 'duplex' ? DUPLEX_ID : VILLA_ID}`;
  return Response.redirect(file === 'duplex' ? (env.CATALOGUE_DUPLEX_URL || fallback) : (env.CATALOGUE_VILLA_URL || fallback), 302);
}
