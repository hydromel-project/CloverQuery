export function meta() {
  return [
    { title: "Admin - Merchant Configuration" },
    { name: "description", content: "Enable/disable merchant accounts and cache management" },
  ];
}

export default function Admin() {
  const configs = [
    {
      currency: 'USD',
      merchantId: process.env.CLOVER_USD_MERCHANT_ID || 'Not configured',
      enabled: process.env.CLOVER_USD_ENABLED === 'true',
      environment: 'production'
    },
    {
      currency: 'CAD', 
      merchantId: process.env.CLOVER_CAD_MERCHANT_ID || 'Not configured',
      enabled: process.env.CLOVER_CAD_ENABLED === 'true',
      environment: 'production'
    }
  ];

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Admin Panel</h1>
        
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-center">
            <span className="text-blue-600 mr-2">ℹ️</span>
            <p className="text-blue-800">
              Cache management and merchant configuration. Changes require server restart.
            </p>
          </div>
        </div>
        
        <div className="space-y-6">
          {configs.map((config) => (
            <div key={config.currency} className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <h2 className="text-xl font-semibold text-gray-900">
                      {config.currency} Merchant
                    </h2>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                      config.enabled 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {config.enabled ? '✅ Enabled' : '❌ Disabled'}
                    </span>
                  </div>
                  
                  <div className="text-sm text-gray-600 space-y-1">
                    <p><strong>Merchant ID:</strong> {config.merchantId}</p>
                    <p><strong>Environment:</strong> {config.environment}</p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
        
        <div className="mt-8 space-y-6">
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <h3 className="font-semibold text-yellow-900 mb-2">Batch Sync Control</h3>
            <p className="text-yellow-800 text-sm mb-3">
              Batch sync is currently disabled by default. Enable only when you need to fetch fresh data from Clover API.
            </p>
            <div className="bg-yellow-100 p-3 rounded text-sm font-mono">
              ENABLE_BATCH_SYNC=true
            </div>
          </div>
          
          <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
            <h3 className="font-semibold text-gray-900 mb-2">Manual Configuration</h3>
            <p className="text-gray-800 text-sm mb-2">
              Edit the <code className="bg-gray-100 px-1 rounded">.env</code> file to enable/disable merchants:
            </p>
            <div className="bg-gray-100 p-3 rounded text-sm font-mono">
              CLOVER_USD_ENABLED=true<br/>
              CLOVER_CAD_ENABLED=false
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}