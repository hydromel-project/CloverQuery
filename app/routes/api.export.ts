import type { Route } from "./+types/api.export";

export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const status = url.searchParams.get('status') || 'action-required';
  const search = url.searchParams.get('search') || '';

  // Fetch from our customers API
  const apiUrl = new URL('/api/customers', request.url);
  const response = await fetch(apiUrl);
  const data = await response.json();
  
  // Transform and filter customers
  let customers = data.customers.map((customer: any) => ({
    ...customer,
    firstName: customer.first_name,
    lastName: customer.last_name,
    businessName: customer.business_name,
    merchantCurrency: customer.merchant_currency,
    email: customer.emailAddresses?.find((e: any) => e.primary_email)?.email_address || 
           customer.emailAddresses?.[0]?.email_address || null,
    phone: customer.phoneNumbers?.[0]?.phone_number || null,
  }));

  // Apply filters
  if (search) {
    const searchLower = search.toLowerCase();
    customers = customers.filter((customer: any) => {
      const name = `${customer.firstName || ''} ${customer.lastName || ''}`.toLowerCase();
      const businessName = (customer.businessName || '').toLowerCase();
      const email = (customer.email || '').toLowerCase();
      return name.includes(searchLower) || businessName.includes(searchLower) || email.includes(searchLower);
    });
  }

  if (status !== 'all') {
    customers = customers.filter((customer: any) => {
      if (status === 'action-required') {
        return customer.has_expired || customer.has_expiring_soon ||
               (customer.customer_since && (Date.now() - customer.customer_since * 1000) < 6 * 30 * 24 * 60 * 60 * 1000 && customer.total_cards === 0);
      }
      return false;
    });
  }

  // Generate CSV
  const headers = ['Name', 'Business Name', 'Email', 'Phone', 'Currency', 'Cards', 'Status'];
  const csvRows = [
    headers.join(','),
    ...customers.map((customer: any) => [
      `"${customer.firstName || ''} ${customer.lastName || ''}"`.trim(),
      `"${customer.businessName || ''}"`,
      `"${customer.email || ''}"`,
      `"${customer.phone || ''}"`,
      customer.merchantCurrency,
      customer.total_cards,
      customer.has_expired ? 'Expired Cards' : 
      customer.has_expiring_soon ? 'Expiring Soon' :
      customer.total_cards === 0 ? 'No Cards' : 'Active'
    ].join(','))
  ];
  
  const csv = csvRows.join('\n');
  
  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="customers-${new Date().toISOString().split('T')[0]}.csv"`,
    },
  });
}