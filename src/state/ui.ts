import { create } from 'zustand'

/** Dočasný stav rozhrania (nepamätá sa). */
interface UiState {
  contextOpen: boolean
  setContextOpen: (open: boolean) => void
}

export const useUi = create<UiState>()((set) => ({
  contextOpen: false,
  setContextOpen: (contextOpen) => set({ contextOpen }),
}))
