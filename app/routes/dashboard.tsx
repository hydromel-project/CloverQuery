import type { Route } from "./+types/dashboard";
import { useLoaderData, Link } from "react-router";
import { ExpirationMonitorService } from "~/lib/expiration-monitor";
import { validateEnvironmentVariables } from "~/lib/config";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Credit Card Expiration Dashboard - Clover Query" },
    { name: "description", content: "Monitor customer credit card expiration dates across multiple Clover merchant accounts" },
  ];
}

export async function loader({}: Route.LoaderArgs) {
  try {
    validateEnvironmentVariables();
    const monitor = new ExpirationMonitorService();
    const result = await monitor.runAnalysis();
    return { result, error: null };
  } catch (error) {
    console.error('Dashboard loader error:', error);
    return { 
      result: null, 
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

function StatusBadge({ status, count }: { status: string; count: number }) {
  const colors = {
    expired: 'bg-red-100 text-red-800',
    'expiring-soon': 'bg-orange-100 text-orange-800',
    'expiring-later': 'bg-yellow-100 text-yellow-800',
  };

  const color = colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800';

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${color}`}>
      {count}
    </span>
  );
}

function CustomerCard({ customer, type }: { customer: any; type: 'expired' | 'expiring-soon' | 'expiring-later' }) {
  const formatted = new ExpirationMonitorService().formatCustomerForNotification(customer);
  
  return (
    <div className="bg-white border rounded-lg p-4 shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-medium text-gray-900">{formatted.name}</h3>
        <span className={`text-xs px-2 py-1 rounded ${customer.merchantCurrency === 'USD' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}`}>
          {customer.merchantCurrency}
        </span>
      </div>
      
      <div className="text-sm text-gray-600 mb-3">
        {formatted.email && <div>📧 {formatted.email}</div>}
        {formatted.phone && <div>📞 {formatted.phone}</div>}
      </div>

      <div className="space-y-2">
        {formatted.expiringCards.map((card, idx) => (
          <div key={idx} className="flex items-center justify-between text-sm">
            <span>
              {card.cardType} ****{card.last4}
            </span>
            <div className="text-right">
              <div className="font-medium">
                {card.expirationDate.substring(0, 2)}/{card.expirationDate.substring(2)}
              </div>
              <div className={`text-xs ${card.daysUntilExpiration < 0 ? 'text-red-600' : card.daysUntilExpiration <= 30 ? 'text-orange-600' : 'text-yellow-600'}`}>
                {card.daysUntilExpiration < 0 
                  ? `Expired ${Math.abs(card.daysUntilExpiration)} days ago`
                  : `${card.daysUntilExpiration} days remaining`
                }
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { result, error } = useLoaderData<typeof loader>();

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <h1 className="text-lg font-medium text-red-800 mb-2">Configuration Error</h1>
            <p className="text-red-700">{error}</p>
            <div className="mt-4 text-sm text-red-600">
              <p>Please ensure the following environment variables are set:</p>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>CLOVER_USD_MERCHANT_ID & CLOVER_USD_API_TOKEN</li>
                <li>CLOVER_CAD_MERCHANT_ID & CLOVER_CAD_API_TOKEN</li>
                <li>CLOVER_ENV (sandbox or production)</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              {[1, 2, 3].map(i => (
                <div key={i} className="bg-gray-200 rounded-lg h-24"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const { summary, customers, merchantErrors } = result;

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Credit Card Expiration Dashboard</h1>
          </div>
          <Link 
            to="/customers" 
            className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 transition-colors"
          >
            View All Customers
          </Link>
        </div>

        {/* Merchant Errors */}
        {merchantErrors && merchantErrors.length > 0 && (
          <div className="mb-6 space-y-2">
            {merchantErrors.map((merchantError, index) => (
              <div key={index} className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-yellow-800">
                      {merchantError.currency} Merchant Connection Issue
                      {merchantError.status && ` (${merchantError.status})`}
                    </h3>
                    <div className="mt-2 text-sm text-yellow-700">
                      {merchantError.status === 401 ? (
                        <p>Authentication failed. Please check your API token and merchant ID for the {merchantError.currency} account.</p>
                      ) : (
                        <p>{merchantError.error}</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-sm font-medium text-gray-500 mb-2">Total Customers</h2>
            <p className="text-3xl font-bold text-gray-900">{summary.totalCustomers}</p>
            <p className="text-sm text-gray-600">{summary.totalCards} cards total</p>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-sm font-medium text-gray-500 mb-2">Expired Cards</h2>
            <p className="text-3xl font-bold text-red-600">{summary.expired.customers}</p>
            <p className="text-sm text-gray-600">{summary.expired.cards} cards</p>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-sm font-medium text-gray-500 mb-2">Expiring Soon</h2>
            <p className="text-3xl font-bold text-orange-600">{summary.expiringSoon.customers}</p>
            <p className="text-sm text-gray-600">{summary.expiringSoon.cards} cards (≤30 days)</p>
          </div>
        </div>

        {/* Customer Lists */}
        <div className="space-y-8">
          {/* Expired Cards */}
          {customers.expired.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <h2 className="text-xl font-semibold text-gray-900">Expired Cards</h2>
                <StatusBadge status="expired" count={customers.expired.length} />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {customers.expired.map((customer) => (
                  <CustomerCard key={`${customer.merchantCurrency}-${customer.id}`} customer={customer} type="expired" />
                ))}
              </div>
            </div>
          )}

          {/* Expiring Soon */}
          {customers.expiringSoon.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <h2 className="text-xl font-semibold text-gray-900">Expiring Soon (≤30 days)</h2>
                <StatusBadge status="expiring-soon" count={customers.expiringSoon.length} />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {customers.expiringSoon.map((customer) => (
                  <CustomerCard key={`${customer.merchantCurrency}-${customer.id}`} customer={customer} type="expiring-soon" />
                ))}
              </div>
            </div>
          )}

          {/* Expiring Later */}
          {customers.expiringLater.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <h2 className="text-xl font-semibold text-gray-900">Expiring Later (31-90 days)</h2>
                <StatusBadge status="expiring-later" count={customers.expiringLater.length} />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {customers.expiringLater.map((customer) => (
                  <CustomerCard key={`${customer.merchantCurrency}-${customer.id}`} customer={customer} type="expiring-later" />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* No Issues */}
        {customers.expired.length === 0 && customers.expiringSoon.length === 0 && customers.expiringLater.length === 0 && (
          <div className="bg-green-50 border border-green-200 rounded-md p-8 text-center">
            <h2 className="text-lg font-medium text-green-800 mb-2">All Clear! 🎉</h2>
            <p className="text-green-700">No customers have expired or expiring credit cards that require attention.</p>
          </div>
        )}
      </div>
    </div>
  );
}