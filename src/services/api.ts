const apiBase = (import.meta.env?.VITE_API_URL || '/api').replace(/\/$/, '');

export class ApiError extends Error {
  constructor(message: string, public readonly status: number) { super(message); }
}

export async function apiRequest<T>(path: string, body?: unknown): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);
  try {
    const response = await fetch(`${apiBase}${path}`, {
      method: body === undefined ? 'GET' : 'POST', credentials: 'include', cache: 'no-store',
      ...(body === undefined ? {} : { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }), signal: controller.signal,
    });
    const data = await response.json().catch(() => null);
    if (!response.ok || !data) {
      const message = data?.message;
      throw new ApiError(Array.isArray(message) ? message.join(' · ') : typeof message === 'string' ? message : 'O backend está indisponível. Confira a API e o banco de dados.', response.status);
    }
    return data as T;
  } catch (error) {
    if (error instanceof TypeError || (error instanceof Error && error.name === 'AbortError')) throw new ApiError('Não foi possível conectar ao backend. Confira se a API está em execução.', 0);
    throw error;
  } finally { clearTimeout(timeout); }
}
