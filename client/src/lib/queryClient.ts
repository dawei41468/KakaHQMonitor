import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

// Global flag to prevent multiple concurrent refresh attempts
let isRefreshing = false;
let refreshPromise: Promise<void> | null = null;

async function refreshAccessToken(): Promise<void> {
  if (isRefreshing) {
    return refreshPromise!;
  }

  isRefreshing = true;
  refreshPromise = (async () => {
    try {
      const refreshToken = localStorage.getItem('refreshToken');
      if (!refreshToken) {
        throw new Error('No refresh token available');
      }

      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        localStorage.setItem('accessToken', data.accessToken);
      } else {
        // Refresh failed, logout
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        window.location.href = '/';
        throw new Error('Session expired');
      }
    } finally {
      isRefreshing = false;
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

// Get auth token for API requests
function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem('accessToken');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const headers = {
    ...getAuthHeaders(),
    ...(data ? { "Content-Type": "application/json" } : {}),
  };

  let res = await fetch(url, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  // If we get a 401, try to refresh the token once
  if (res.status === 401 && localStorage.getItem('accessToken')) {
    try {
      await refreshAccessToken();
      // Retry the original request with new token
      const newHeaders = {
        ...getAuthHeaders(),
        ...(data ? { "Content-Type": "application/json" } : {}),
      };
      res = await fetch(url, {
        method,
        headers: newHeaders,
        body: data ? JSON.stringify(data) : undefined,
        credentials: "include",
      });
    } catch (refreshError) {
      // Refresh failed, throw the original error
      await throwIfResNotOk(res);
    }
  }

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const headers = {
      ...getAuthHeaders(),
    };

    let res = await fetch(queryKey.join("/") as string, {
      headers,
      credentials: "include",
    });

    // If we get a 401, try to refresh the token once
    if (res.status === 401 && localStorage.getItem('accessToken')) {
      try {
        await refreshAccessToken();
        // Retry the original request with new token
        const newHeaders = {
          ...getAuthHeaders(),
        };
        res = await fetch(queryKey.join("/") as string, {
          headers: newHeaders,
          credentials: "include",
        });
      } catch (refreshError) {
        // Refresh failed, handle based on behavior
        if (unauthorizedBehavior === "returnNull") {
          return null;
        }
        await throwIfResNotOk(res);
      }
    }

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
