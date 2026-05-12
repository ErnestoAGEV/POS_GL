import { create } from "zustand";

type SyncStatus = "online" | "offline" | "syncing";

interface SyncState {
  status: SyncStatus;
  setStatus: (status: SyncStatus) => void;
}

export const useSyncStore = create<SyncState>((set) => ({
  status: "offline",
  setStatus: (status) => set({ status }),
}));

// Initialize listener for sync status updates from main process
if (typeof window !== "undefined" && window.api?.sync?.onStatus) {
  window.api.sync.onStatus((status) => {
    useSyncStore.getState().setStatus(status as SyncStatus);
  });
}
