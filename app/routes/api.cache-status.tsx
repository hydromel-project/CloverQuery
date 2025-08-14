import type { Route } from "./+types/api.cache-status";
import { globalCache } from "~/lib/cache";

export async function loader({}: Route.LoaderArgs) {
  const stats = globalCache.getStats();
  const cleaned = globalCache.cleanup(); // Clean up expired entries
  
  return Response.json({
    ...stats,
    cleanedExpiredEntries: cleaned,
    timestamp: new Date().toISOString(),
  });
}

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const action = formData.get('action');
  
  if (action === 'clear') {
    globalCache.clear();
    return Response.json({ 
      success: true, 
      message: 'Cache cleared successfully',
      timestamp: new Date().toISOString() 
    });
  }
  
  if (action === 'cleanup') {
    const cleaned = globalCache.cleanup();
    return Response.json({ 
      success: true, 
      message: `Cleaned ${cleaned} expired entries`,
      cleanedEntries: cleaned,
      timestamp: new Date().toISOString() 
    });
  }
  
  return Response.json({ success: false, message: 'Invalid action' }, { status: 400 });
}