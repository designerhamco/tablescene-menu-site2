/** Match the browser's destination Host, since a reverse proxy can expose a
 * different internal request URL. Host includes the port; foreign origins fail. */
export function isSameOriginRequest(request:Pick<Request,'headers'|'url'>) {
  const value=request.headers.get('origin');
  if(!value||request.headers.get('sec-fetch-site')==='cross-site')return false;
  try {
    const origin=new URL(value),target=new URL(request.url);
    const host=request.headers.get('host')??target.host;
    return (origin.protocol==='http:'||origin.protocol==='https:')&&origin.host===host;
  } catch{return false;}
}
