import { del, get, set } from 'idb-keyval';

const SYNC_QUEUE_KEY = 'sync-queue';

export interface QueuedMutation {
  id: string;
  userId: number;
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

export async function getSyncQueue(userId?: number) {
  const queue = (await get<QueuedMutation[]>(SYNC_QUEUE_KEY)) || [];
  if (userId !== undefined) {
    return queue.filter(item => item.userId === userId);
  }
  return queue;
}

export async function clearSyncQueue(userId?: number) {
  if (userId !== undefined) {
    const queue = (await get<QueuedMutation[]>(SYNC_QUEUE_KEY)) || [];
    await set(SYNC_QUEUE_KEY, queue.filter(item => item.userId !== userId));
  } else {
    await del(SYNC_QUEUE_KEY);
  }
}

export async function processSyncQueue(apiRequest: (method: string, url: string, data?: any) => Promise<Response>, userId?: number) {
  const allQueue = (await get<QueuedMutation[]>(SYNC_QUEUE_KEY)) || [];
  const userQueue = userId !== undefined ? allQueue.filter(item => item.userId === userId) : allQueue;
  
  if (userQueue.length === 0) return;

  const failedItems: QueuedMutation[] = [];
  const processedIds = new Set<string>();

  for (const item of userQueue) {
    try {
      await apiRequest(item.method, item.url, item.data);
      processedIds.add(item.id);
    } catch (error) {
      failedItems.push(item);
    }
  }

  // Update original queue: remove processed ones, but keep failed ones and ones from other users
  const updatedQueue = [
    ...failedItems,
    ...allQueue.filter(item => !processedIds.has(item.id) && !failedItems.some(f => f.id === item.id))
  ];

  if (updatedQueue.length > 0) {
    await set(SYNC_QUEUE_KEY, updatedQueue);
  } else {
    await del(SYNC_QUEUE_KEY);
  }
}
