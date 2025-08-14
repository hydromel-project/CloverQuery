// This will be called when the server starts
export function initializeServer() {
  console.log('[Server] Initializing...');
  // Background sync disabled during SQLite migration
  console.log('[Server] Initialization complete (background sync disabled)');
}