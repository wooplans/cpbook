export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === '/visitor-context' && request.method === 'GET') return json({ country: request.cf?.country || request.headers.get('CF-IPCountry') || null });
    if (url.pathname === '/api/moneyfusion-payment' && request.method === 'POST') return handleMoneyFusionPayment(request, env);
    if (url.pathname === '/confirmation' || url.pathname === '/confirmation/') { url.pathname = '/digital.html'; return env.ASSETS.fetch(new Request(url.toString(), request)); }
    if (url.pathname === '/api/moneyfusion-status' && request.method === 'GET') return handleMoneyFusionStatus(request);
    if (url.pathname === '/api/moneyfusion-webhook' && request.method === 'POST') return handleMoneyFusionWebhook(request, env);
    if (url.pathname === '/api/catalogue-download' && request.method === 'GET') return handleCatalogueDownload(request, env);

    if (url.pathname === '/api/cpbook-event') {
      if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors() });
      if (request.method === 'POST') return handleCapi(request, env);
      return new Response('Method Not Allowed', { status: 405 });
    }

    if (url.pathname === '/digital' || url.pathname === '/digital/') {
      url.pathname = '/index-digital.html';
      url.searchParams.delete('__cpbook_version');
      const assetResponse = await env.ASSETS.fetch(new Request(url.toString(), request));
      const headers = new Headers(assetResponse.headers);
      headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
      headers.set('CDN-Cache-Control', 'no-store');
      return new Response(assetResponse.body, {
        status: assetResponse.status,
        statusText: assetResponse.statusText,
        headers
      });
    }
    if (url.pathname === '/whatsapp' || url.pathname === '/whatsapp/') {
      url.pathname = '/whatsapp.html';
      return env.ASSETS.fetch(new Request(url.toString(), request));
    }
    return env.ASSETS.fetch(request);
  }
};

const MONEYFUSION_API = 'https://pay.moneyfusion.net/CP_BOOK_WOOPLANS/e25d949f16e781b6/pay/';
const MONEYFUSION_STATUS = 'https://www.pay.moneyfusion.net/paiementNotif/';
const AMOUNT = 39000;

function json(data, status=200) {
  return new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });
}

const MF_API='https://pay.moneyfusion.net/CP_BOOK_WOOPLANS/e25d949f16e781b6/pay/';
const MF_STATUS='https://www.pay.moneyfusion.net/paiementNotif/';
const MF_AMOUNT=39000;
function mfJson(data,status=200){return new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}})}
async function handleMoneyFusionPayment(request,env){
  const body=await request.json().catch(()=>null); if(!body)return mfJson({error:'Requête invalide.'},400);
  const name=String(body.name||'').trim(), phone=String(body.phone||'').replace(/[^\d+]/g,''), email=String(body.email||'').trim().toLowerCase();
  if(!name||phone.length<8||!email.includes('@'))return mfJson({error:'Nom, téléphone et e-mail sont obligatoires.'},400);
  const provider='chariow';
  if(provider==='chariow') return mfJson({provider:'chariow',payment_url:env.CHARIOW_CHECKOUT_URL||'https://wooplans.mychariow.shop/prd_41k85hc0/checkout'});
  const origin=new URL(request.url).origin, tracking=body.tracking&&typeof body.tracking==='object'?body.tracking:{};
  const payload={totalPrice:MF_AMOUNT,article:[{'Catalogue Premium PDF':MF_AMOUNT}],numeroSend:phone,nomclient:name,personal_Info:[{orderId:'cpbook-'+Date.now(),email,phone,fbp:String(tracking.fbp||''),fbc:String(tracking.fbc||''),event_source_url:String(tracking.event_source_url||origin+'/digital')}],return_url:origin+'/confirmation',webhook_url:origin+'/api/moneyfusion-webhook'};
  const response=await fetch(env.MONEYFUSION_API_URL||MF_API,{method:'POST',headers:{'content-type':'application/json',accept:'application/json'},body:JSON.stringify(payload)});
  const data=await response.json().catch(()=>({})); if(!response.ok||data.statut===false)return mfJson({error:data.message||'MoneyFusion n’a pas pu préparer le paiement.'},response.ok?502:response.status);
  return mfJson({token:data.token,payment_url:data.url,message:data.message||'Paiement en cours'});
}
async function handleMoneyFusionStatus(request){
  const token=String(new URL(request.url).searchParams.get('token')||'').trim(); if(!token)return mfJson({error:'Transaction manquante.'},400);
  const result=await fetch(MF_STATUS+encodeURIComponent(token)).then(r=>r.json()).catch(()=>({})); return mfJson({status:result.data?.statut||'unknown',token:result.data?.tokenPay||token});
}
async function handleCatalogueDownload(request,env){
  const u=new URL(request.url),token=String(u.searchParams.get('token')||'').trim(); if(!token)return new Response('Transaction manquante.',{status:400});
  const result=await fetch(MF_STATUS+encodeURIComponent(token)).then(r=>r.json()).catch(()=>({})); if(result.data?.statut!=='paid')return new Response('Paiement non confirmé.',{status:403});
  const file=u.searchParams.get('file')==='duplex'?'duplex':'villa';
  const fallback=file==='duplex'?'https://drive.google.com/uc?export=download&id=1ArGsvuyEhnHd2IDy_9Tk0sHQQ8CNceM3':'https://drive.google.com/uc?export=download&id=18maln7qIHwKhKOVXOwtkvF85fq0XVuzr';
  return Response.redirect(file==='duplex'?(env.CATALOGUE_DUPLEX_URL||fallback):(env.CATALOGUE_VILLA_URL||fallback),302);
}
async function handleMoneyFusionWebhook(request,env){
  const payload=await request.json().catch(()=>({})); if(payload.event!=='payin.session.completed'||!payload.tokenPay)return mfJson({received:true});
  const verified=await fetch(MF_STATUS+encodeURIComponent(payload.tokenPay)).then(r=>r.json()).catch(()=>({})); if(verified.data?.statut!=='paid'||Number(verified.data?.Montant)!==MF_AMOUNT)return mfJson({received:false},400);
  const details=Array.isArray(payload.personal_Info)?(payload.personal_Info[0]||{}):{};
  const fbToken=env.FB_ACCESS_TOKEN||env.META_ACCESS_TOKEN, fbPixel=env.FB_PIXEL_ID||env.META_PIXEL_ID;
  if(fbToken&&fbPixel){const event={event_name:'Purchase',event_time:Math.floor(Date.now()/1000),event_id:String(payload.tokenPay),action_source:'website',event_source_url:details.event_source_url||'',user_data:{fbp:details.fbp||'',fbc:details.fbc||''},custom_data:{currency:'XAF',value:MF_AMOUNT,content_name:'Catalogue Premium Wooplans',content_ids:['cpbook-premium-2026'],content_type:'product',order_id:String(payload.tokenPay)}}; await fetch('https://graph.facebook.com/v23.0/'+fbPixel+'/events?access_token='+fbToken,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({data:[event]})}).catch(()=>null)}
  return mfJson({received:true});
}

async function handleCapi(request, env) {
  try {
    const { event_id, name, phone, city, payment_method } = await request.json();
    const [hashedPhone, hashedFirstName] = await Promise.all([sha256(normalizePhone(phone)), sha256(name.split(' ')[0].toLowerCase().trim())]);
    const baseEvent = { event_time:Math.floor(Date.now()/1000), event_id, event_source_url:request.headers.get('Referer') || '', action_source:'website', user_data:{ph:[hashedPhone],fn:[hashedFirstName],client_ip_address:request.headers.get('CF-Connecting-IP') || '',client_user_agent:request.headers.get('User-Agent') || ''}, custom_data:{content_name:'Catalogue Premium Wooplans',value:AMOUNT,currency:'XAF',city,payment_method} };
    const fb = await fetch('https://graph.facebook.com/v19.0/' + env.FB_PIXEL_ID + '/events?access_token=' + env.FB_ACCESS_TOKEN, {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({data:[{...baseEvent,event_name:'cpbook_Lead'},{...baseEvent,event_name:'InitiateCheckout'}]})});
    const result = await fb.json();
    return new Response(JSON.stringify({ok:true,result}), {headers:{...cors(),'Content-Type':'application/json'}});
  } catch (err) { return new Response(JSON.stringify({ok:false}), {status:500,headers:{...cors(),'Content-Type':'application/json'}}); }
}
async function sha256(str) { const buf=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(str)); return [...new Uint8Array(buf)].map(b=>b.toString(16).padStart(2,'0')).join(''); }
function normalizePhone(phone) { let n=String(phone || '').replace(/\D/g,''); if(n.startsWith('0')) n='237'+n.slice(1); if(!n.startsWith('237')) n='237'+n; return n; }
const cors=()=>({'Access-Control-Allow-Origin':'*','Access-Control-Allow-Methods':'POST, OPTIONS','Access-Control-Allow-Headers':'Content-Type'});
