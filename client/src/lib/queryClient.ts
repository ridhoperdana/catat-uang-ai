import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister';
import { get, set, del } from 'idb-keyval';
import { addToSyncQueue } from "./sync-manager";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
  timeout = 3000,
  userId?: number,
): Promise<Response> {
  const isRead = method === 'GET';
  console.log(`[apiRequest] ${method} ${url}`, { isRead, onLine: navigator.onLine });

  const returnMockResponse = async () => {
    console.log(`[apiRequest] Offline: Queuing mutation for ${url}`);
    await addToSyncQueue({ method, url, data, userId: userId || 0 });
    
    const mockData = {
      id: Math.floor(Math.random() * -1000000),
      ...(data instanceof FormData ? {} : (data || {})),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: "pending",
      message: "Queued for sync",
      isOffline: true
    };

    return new Response(JSON.stringify(mockData), {
      status: 202,
      headers: { "Content-Type": "application/json" },
    });
  };

  if (!navigator.onLine && !isRead) {
    return await returnMockResponse();
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    console.warn(`[apiRequest] Timeout reached for ${url}`);
    controller.abort();
  }, timeout);

  try {
    const res = await fetch(url, {
      method,
      headers: data instanceof FormData ? {} : (data ? { "Content-Type": "application/json" } : {}),
      body: data instanceof FormData ? data : (data ? JSON.stringify(data) : undefined),
      credentials: "include",
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    console.log(`[apiRequest] Response received for ${url}: ${res.status}`);
    
    await throwIfResNotOk(res);
    return res;
  } catch (error: any) {
    clearTimeout(timeoutId);
    console.error(`[apiRequest] Error for ${url}:`, error.name, error.message);
    
    // If it's a network error or timeout during a mutation, queue it
    if (!isRead && (error instanceof TypeError || error.name === 'AbortError' || !navigator.onLine)) {
      return await returnMockResponse();
    }
    throw error;
  }
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    // Correctly handle query keys that might contain objects
    const path = queryKey[0] as string;
    const params = queryKey[1] as Record<string, any> | undefined;
    
    let url = path;
    if (params && typeof params === 'object') {
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          searchParams.append(key, String(value));
        }
      });
      const qs = searchParams.toString();
      if (qs) url += `?${qs}`;
    }

    const res = await apiRequest("GET", url);

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 60 * 24, // 24 hours
      retry: (failureCount, error: any) => {
        if (error?.message?.includes("Failed to fetch") || !navigator.onLine) {
          return failureCount < 3;
        }
        return false;
      },
      networkMode: 'always',
    },
    mutations: {
      retry: false,
      networkMode: 'always',
    },
  },
});

export const persister = {
  persistClient: async (client: any) => {
    await set('react-query', client);
  },
  restoreClient: async () => {
    return await get('react-query');
  },
  removeClient: async () => {
    await del('react-query');
  },
};
