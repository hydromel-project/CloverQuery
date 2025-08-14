import type { Route } from "./+types/api.cache";
import { CacheManager } from "~/lib/cache-manager";
import { globalCache } from "~/lib/cache";

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const action = formData.get("action");

  switch (action) {
    case "clear-all":
      globalCache.clear();
      return { success: true, message: "All cache cleared" };

    case "clear-customers":
      const cleared = CacheManager.clearCustomerCaches();
      return { success: true, message: `Cleared ${cleared} customer caches` };

    case "cleanup":
      const removed = CacheManager.cleanup();
      return { success: true, message: `Removed ${removed} expired entries` };

    default:
      return { success: false, message: "Unknown action" };
  }
}

export async function loader({}: Route.LoaderArgs) {
  const cacheInfo = CacheManager.getCacheInfo();
  return { cacheInfo };
}