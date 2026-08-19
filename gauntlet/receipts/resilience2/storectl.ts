/**
 * Store-boundary surgery for the resilience-2 experiments.
 *
 * Everything here goes through the product's own `fileStore` and `vault`, so what it writes is
 * byte-identical to what the running service writes. It exists so the clock and the
 * partial-write experiments can act on a real sealed store without patching product code and
 * without filling this machine's disk. Read-only with respect to the product: it imports, it
 * does not modify.
 */
export { fileStore, memoryStore, type ClassStore, type StoredClass } from "../../../server/store";
export { vault, readStoreKey, plainVault } from "../../../server/vault";
export { sweepExpiredClasses, lastSweepResult } from "../../../server/retention";
export { handleApiRequest } from "../../../server/handler";
export { CLASS_RETENTION_DAYS } from "../../../src/platform/classes/types";
