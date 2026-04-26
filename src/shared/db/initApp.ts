import { db } from "./dexie";
import { ensureDefaultCategories } from "./seed";
import { recalculateAll } from "@/processes/recalculate-finance-state";

let ready: Promise<void> | null = null;

export function initApp(): Promise<void> {
  if (!ready) {
    ready = (async () => {
      await db.open();
      await ensureDefaultCategories();
      const o = await db.appMeta.get("onboardingComplete");
      if (o?.value === "1") {
        try {
          await recalculateAll();
        } catch {
          // ignore recalc on first corrupt state
        }
      }
    })();
  }
  return ready;
}
