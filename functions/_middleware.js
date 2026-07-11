export async function onRequest(context) {
  const url = new URL(context.request.url);
  const host = url.hostname.toLowerCase();

  const isDigitalSubdomain =
    host === 'digital-cpbook.wooplans.com' &&
    (url.pathname === '/' || url.pathname === '/index.html');

  const isDigitalPath =
    host === 'cpbook.wooplans.com' &&
    (url.pathname === '/digital' || url.pathname === '/digital/');

  if (isDigitalSubdomain || isDigitalPath) {
    const assetUrl = new URL('/index-digital.html', url);
    return context.env.ASSETS.fetch(new Request(assetUrl, context.request));
  }

  return context.next();
}
