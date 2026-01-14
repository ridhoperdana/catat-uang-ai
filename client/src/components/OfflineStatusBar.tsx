import { useEffect, useState } from "react";
import { apiRequest } from "@/lib/queryClient";
import { processSyncQueue, getSyncQueue } from "@/lib/sync-manager";
import { AlertCircle, CheckCircle2, CloudOff, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";

export function OfflineStatusBar() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  const [queueLength, setQueueLength] = useState(0);
  const queryClient = useQueryClient();
  const { user } = useAuth();

  useEffect(() => {
    const handleOnline = async () => {
      setIsOnline(true);
      setIsSyncing(true);
      try {
        await processSyncQueue(apiRequest, user?.id);
        // Refresh all data after sync completes
        await queryClient.invalidateQueries();
      } finally {
        setIsSyncing(false);
        const queue = await getSyncQueue(user?.id);
        setQueueLength(queue.length);
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    const checkQueue = async () => {
      const queue = await getSyncQueue(user?.id);
      setQueueLength(queue.length);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    
    checkQueue();
    const interval = setInterval(checkQueue, 5000);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      clearInterval(interval);
    };
  }, []);

  if (isOnline && !isSyncing && queueLength === 0) return null;

  return (
    <div
      className={cn(
        "fixed bottom-4 right-4 p-3 rounded-lg shadow-lg flex items-center gap-2 text-sm font-medium transition-all duration-300 z-50",
        !isOnline ? "bg-destructive text-destructive-foreground" : 
        isSyncing ? "bg-primary text-primary-foreground" : 
        "bg-green-500 text-white"
      )}
    >
      {!isOnline ? (
        <>
          <CloudOff className="h-4 w-4" />
          <span>Offline - {queueLength} pending changes</span>
        </>
      ) : isSyncing ? (
        <>
          <RefreshCw className="h-4 w-4 animate-spin" />
          <span>Syncing changes...</span>
        </>
      ) : (
        <>
          <CheckCircle2 className="h-4 w-4" />
          <span>All changes synced</span>
        </>
      )}
    </div>
  );
}
