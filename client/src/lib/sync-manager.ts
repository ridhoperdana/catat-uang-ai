import { del, get, set } from 'idb-keyval';

const SYNC_QUEUE_KEY = 'sync-queue';

export interface QueuedMutation {
  id: string;
  method: string;
  url: string;
  data: any;
  timestamp: number;
}

export async function addToSyncQueue(mutation: Omit<QueuedMutation, 'id' | 'timestamp'>) {
  const queue = (await get<QueuedMutation[]>(SYNC_QUEUE_KEY)) || [];
  
  // Fallback for crypto.randomUUID if not available (e.g. non-secure context)
  const generateUUID = () => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  };

  const newMutation: QueuedMutation = {
    ...mutation,
    id: generateUUID(),
    timestamp: Date.now(),
  };
  queue.push(newMutation);
  await set(SYNC_QUEUE_KEY, queue);
  return newMutation;
}

export async function getSyncQueue() {
  return (await get<QueuedMutation[]>(SYNC_QUEUE_KEY)) || [];
}

export async function clearSyncQueue() {
  await del(SYNC_QUEUE_KEY);
}

export async function processSyncQueue(apiRequest: (method: string, url: string, data?: any) => Promise<Response>) {
  const queue = await getSyncQueue();
  if (queue.length === 0) return;

  console.log(`Processing sync queue with ${queue.length} items...`);

  const failedItems: QueuedMutation[] = [];

  for (const item of queue) {
    try {
      await apiRequest(item.method, item.url, item.data);
    } catch (error) {
      console.error(`Failed to sync item ${item.id}:`, error);
      failedItems.push(item);
    }
  }

  if (failedItems.length > 0) {
    await set(SYNC_QUEUE_KEY, failedItems);
  } else {
    await clearSyncQueue();
  }
}
