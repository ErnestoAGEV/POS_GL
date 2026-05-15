import { create } from "zustand";

type SyncStatus = "online" | "offline" | "syncing";

interface SyncState {
  status: SyncStatus;
  pendingCount: number;
  lastSyncAt: string | null;
  setStatus: (status: SyncStatus) => void;
  setPendingCount: (count: number) => void;
  setLastSyncAt: (date: string) => void;
}

export const useSyncStore = create<SyncState>((set) => ({
  status: "offline",
  pendingCount: 0,
  lastSyncAt: null,
  setStatus: (status) => set({ status }),
  setPendingCount: (count) => set({ pendingCount: count }),
  setLastSyncAt: (date) => set({ lastSyncAt: date }),
}));

// Initialize listener for sync status updates from main process
if (typeof window !== "undefined" && window.api?.sync?.onStatus) {
  window.api.sync.onStatus((status) => {
    useSyncStore.getState().setStatus(status as SyncStatus);
    // When syncing completes (status goes back to online), update lastSyncAt
    if (status === "online") {
      useSyncStore.getState().setLastSyncAt(new Date().toISOString());
    }
  });
}

// Poll pending count periodically
if (typeof window !== "undefined" && window.api?.sync?.pendingCount) {
  const pollPending = () => {
    window.api.sync.pendingCount().then((count: number) => {
      useSyncStore.getState().setPendingCount(count);
    }).catch(() => {});
  };
  pollPending();
  setInterval(pollPending, 10000);
}
