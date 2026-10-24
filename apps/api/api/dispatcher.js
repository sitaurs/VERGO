import { handleVercelRequest } from '../dist/vercel-handler.js';

export default function dispatcher(request, response) {
  const url = new URL(request.url ?? '/', `http://${request.headers.host ?? 'localhost'}`);
  const originalPath = url.searchParams.get('__vergo_path');

  if (!originalPath?.startsWith('/api/v1/')) {
    response.statusCode = 404;
    response.end();
    return;
  }

  url.searchParams.delete('__vergo_path');
  request.url = `${originalPath}${url.search}`;
  return handleVercelRequest(request, response);
}
