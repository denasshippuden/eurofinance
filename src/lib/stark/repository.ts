import type { StarkStoredState } from "@/lib/stark/types";
import { loadStarkStoredState, saveStarkStoredState } from "@/lib/stark/storage";

export interface StarkRepositoryScope {
  groupId: string;
  userId: string;
}

export interface StarkRepository {
  load(): Promise<StarkStoredState>;
  save(state: StarkStoredState): Promise<void>;
}

class LocalStarkRepository implements StarkRepository {
  constructor(private readonly scope: StarkRepositoryScope) {}

  async load() {
    return loadStarkStoredState(this.scope);
  }

  async save(state: StarkStoredState) {
    saveStarkStoredState(this.scope, state);
  }
}

export function createStarkRepository(scope: StarkRepositoryScope): StarkRepository {
  return new LocalStarkRepository(scope);
}
