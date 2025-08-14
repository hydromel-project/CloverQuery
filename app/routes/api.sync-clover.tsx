import type { Route } from "./+types/api.sync-clover";
import { CloverSyncService } from "~/lib/clover-sync";

export async function loader({}: Route.LoaderArgs) {
  try {
    const syncService = new CloverSyncService();
    const stats = await syncService.getStats();
    
    return Response.json({
      message: "Sync status",
      stats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Sync status error:', error);
    return Response.json(
      { error: 'Failed to get sync status', message: error?.message || 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function action({ request }: Route.ActionArgs) {
  if (request.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405 });
  }

  try {
    console.log('[API] Starting Clover sync...');
    const syncService = new CloverSyncService();
    const result = await syncService.syncAllCustomers();
    
    console.log('[API] Clover sync completed:', result);
    
    return Response.json({
      message: result.success ? "Sync completed successfully" : "Sync completed with errors",
      success: result.success,
      stats: result.stats,
      errors: result.errors,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Sync error:', error);
    return Response.json(
      { 
        error: 'Sync failed', 
        message: error?.message || 'Unknown error',
        success: false,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}