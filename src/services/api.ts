// The Vercel rewrite keeps the API and HttpOnly cookies on the site's origin.
const apiBase = (import.meta.env?.VITE_API_URL || '/api').replace(/\/$/, '');

export class ApiError extends Error {
  constructor(message: string, public readonly status: number) { super(message); }
}

export async function apiRequest<T>(path: string, body?: unknown): Promise<T> {
  const controller = new AbortController();
  // Render Free can take about a minute to wake after inactivity.
  const timeout = setTimeout(() => controller.abort(), 90000);
  try {
    const response = await fetch(`${apiBase}${path}`, {
      method: body === undefined ? 'GET' : 'POST', credentials: 'include', cache: 'no-store',
      ...(body === undefined ? {} : { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }), signal: controller.signal,
    });
    const data = await response.json().catch(() => null);
    if (response.status === 401 && path.startsWith('/admin/') && path !== '/admin/session' && typeof window !== 'undefined') {
      window.dispatchEvent(new Event('bilhetou-admin-session-expired'));
    }
    if (!response.ok || !data) {
      if (!data) throw new ApiError('A API não retornou JSON. Confira o encaminhamento /api na Vercel e se o serviço está ativo no Render.', response.status);
      const message = data?.message;
      throw new ApiError(Array.isArray(message) ? message.join(' · ') : typeof message === 'string' ? message : 'O backend está indisponível. Confira a API e o banco de dados.', response.status);
    }
    return data as T;
  } catch (error) {
    if (error instanceof TypeError || (error instanceof Error && error.name === 'AbortError')) throw new ApiError('Não foi possível conectar ao backend. Confira se a API está em execução.', 0);
    throw error;
  } finally { clearTimeout(timeout); }
}
