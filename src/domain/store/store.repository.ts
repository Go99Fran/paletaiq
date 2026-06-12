import type { Store } from "./store.entity";

export interface StoreRepository {
  listAll(): Promise<Store[]>;
}
