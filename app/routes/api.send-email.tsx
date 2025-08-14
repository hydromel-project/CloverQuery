import type { Route } from "./+types/api.send-email";
import puppeteer from 'puppeteer';
import { emailService } from '~/lib/email-service';

export async function action({ request }: Route.ActionArgs) {
  try {
    const url = new URL(request.url);
    const formData = await request.formData();
    
    const filter = formData.get('filter')?.toString() || 'action-required';
    const search = formData.get('search')?.toString() || '';
    const sort = formData.get('sort')?.toString() || 'urgency';
    const customRecipient = formData.get('recipient')?.toString();

    console.log(`[Email] Starting PDF generation and email for filter: ${filter}`);

    if (!emailService.isEnabled()) {
      return new Response(
        JSON.stringify({ error: 'Email service is disabled' }), 
        { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Launch puppeteer to generate PDF
    const browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--no-first-run'
      ]
    });

    const page = await browser.newPage();

    // Construct the print URL - use the same host as the request
    const baseUrl = `${url.protocol}//${url.host}`;
    const printParams = new URLSearchParams({
      filter,
      search,
      sort
    });
    const printUrl = `${baseUrl}/customers/print?${printParams.toString()}`;

    console.log(`[Email] Loading URL for PDF: ${printUrl}`);

    // Navigate to the print page
    await page.goto(printUrl, {
      waitUntil: 'networkidle2',
      timeout: 30000
    });

    // Wait for content to load
    await page.waitForSelector('table tbody tr', { timeout: 15000 });

    // Get customer count from the page
    const customerCount = await page.evaluate(() => {
      const rows = document.querySelectorAll('table tbody tr');
      return rows.length;
    });

    // Generate PDF
    const pdfBuffer = await page.pdf({
      format: 'letter',
      margin: {
        top: '0.5in',
        right: '0.5in',
        bottom: '0.5in',
        left: '0.5in'
      },
      printBackground: true,
      preferCSSPageSize: true
    });

    await browser.close();

    console.log(`[Email] Generated PDF: ${pdfBuffer.length} bytes, ${customerCount} customers`);

    // Send email with PDF attachment
    await emailService.sendPdfReport(
      Buffer.from(pdfBuffer),
      filter,
      customerCount,
      customRecipient
    );

    const recipient = customRecipient || emailService.getRecipient();
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `PDF report sent successfully to ${recipient}`,
        customerCount,
        filter
      }), 
      { 
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );

  } catch (error: any) {
    console.error('[Email] Error sending email:', error);

    return new Response(
      JSON.stringify({ 
        error: 'Failed to send email', 
        details: error?.message || 'Unknown error' 
      }), 
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}