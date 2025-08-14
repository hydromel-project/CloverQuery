#!/usr/bin/env tsx

/**
 * Clover PDF Report Generator CLI Tool
 * 
 * Generates PDF reports for expired and expiring customer credit cards.
 * Optionally sends reports via email if EMAIL_ENABLED=true.
 * 
 * Usage: npm run pdf [filter] [output-dir]
 * 
 * Filters:
 *   - expired: Customers with expired credit cards
 *   - expiring: Customers with cards expiring soon
 *   - action-required: Customers requiring attention (default)
 *   - no-cards: Customers without payment methods
 * 
 * Email Integration:
 *   - Set EMAIL_ENABLED=true in .env to automatically send reports
 *   - Configure Microsoft 365 credentials for email functionality
 *   - Reports are saved locally AND emailed when enabled
 */

import puppeteer from 'puppeteer';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: path.resolve('.env') });

// Import email service - dynamic import to avoid issues if dependencies aren't available
async function getEmailService() {
  try {
    const { emailService } = await import('../app/lib/email-service.js');
    return emailService;
  } catch (error) {
    console.warn('⚠️  Email service not available:', error instanceof Error ? error.message : 'Unknown error');
    return null;
  }
}

interface PDFOptions {
  filter: 'expired' | 'expiring' | 'action-required' | 'no-cards';
  outputDir: string;
  serverUrl: string;
}

async function generatePDF(options: PDFOptions) {
  console.log(`📄 Generating PDF report for filter: ${options.filter}`);
  
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    const page = await browser.newPage();
    
    // Construct the print URL
    const printUrl = `${options.serverUrl}/customers/print?filter=${options.filter}`;
    console.log(`🌐 Loading: ${printUrl}`);
    
    // Navigate to the print page
    await page.goto(printUrl, {
      waitUntil: 'networkidle2',
      timeout: 30000
    });
    
    // Wait for content to load
    await page.waitForSelector('table tbody tr', { timeout: 10000 });
    
    // Generate filename with timestamp
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `Clover_Customers_${options.filter}_${timestamp}.pdf`;
    const outputPath = path.join(options.outputDir, filename);
    
    // Ensure output directory exists
    fs.mkdirSync(options.outputDir, { recursive: true });
    
    // Generate PDF
    await page.pdf({
      path: outputPath,
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
    
    console.log(`✅ PDF generated successfully: ${outputPath}`);
    
    // Get page count and customer count
    const customerCount = await page.evaluate(() => {
      const rows = document.querySelectorAll('table tbody tr');
      return rows.length;
    });
    
    const title = await page.evaluate(() => {
      const titleElement = document.querySelector('h1');
      return titleElement ? titleElement.textContent : 'Customer List';
    });
    
    console.log(`📊 Report: ${title}`);
    console.log(`👥 Customers: ${customerCount}`);
    console.log(`📄 File: ${filename}`);
    
    return {
      success: true,
      outputPath,
      customerCount,
      title,
      pdfBuffer: fs.readFileSync(outputPath)
    };
    
  } finally {
    await browser.close();
  }
}

async function main() {
  const args = process.argv.slice(2);
  const filter = (args[0] || 'action-required') as PDFOptions['filter'];
  const outputDir = args[1] || './reports';
  const serverUrl = process.env.SERVER_URL || 'http://localhost:5173';
  
  // Validate filter
  const validFilters = ['expired', 'expiring', 'action-required', 'no-cards'];
  if (!validFilters.includes(filter)) {
    console.error(`❌ Invalid filter: ${filter}`);
    console.error(`   Valid filters: ${validFilters.join(', ')}`);
    process.exit(1);
  }
  
  console.log('📋 Clover PDF Report Generator');
  console.log(`   Filter: ${filter}`);
  console.log(`   Output: ${outputDir}`);
  console.log(`   Server: ${serverUrl}`);
  console.log('');
  
  try {
    const result = await generatePDF({
      filter,
      outputDir,
      serverUrl
    });
    
    if (result.success) {
      console.log('');
      console.log('🎉 PDF generation completed successfully!');
      console.log(`📁 Report saved to: ${result.outputPath}`);
      
      // Check if email should be sent
      const emailEnabled = process.env.EMAIL_ENABLED === 'true';
      if (emailEnabled) {
        console.log('');
        console.log('📧 Attempting to send email...');
        
        try {
          const emailService = await getEmailService();
          if (emailService && emailService.isEnabled()) {
            await emailService.sendPdfReport(
              result.pdfBuffer,
              filter,
              result.customerCount
            );
            console.log(`✅ Email sent successfully to: ${emailService.getRecipient()}`);
          } else {
            console.log('⚠️  Email service not configured or disabled');
          }
        } catch (emailError) {
          console.error('❌ Failed to send email:', emailError instanceof Error ? emailError.message : 'Unknown error');
          console.log('📁 PDF file still available at:', result.outputPath);
        }
      } else {
        console.log('📧 Email disabled (EMAIL_ENABLED=false)');
      }
    }
    
  } catch (error) {
    console.error('💥 Error generating PDF:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('net::ERR_CONNECTION_REFUSED')) {
        console.error('');
        console.error('🔧 Make sure the development server is running:');
        console.error('   npm run dev');
      }
      if (error.message.includes('TimeoutError')) {
        console.error('');
        console.error('⏰ The page took too long to load. Check:');
        console.error('   - Server is running and responsive');
        console.error('   - Database has customer data');
        console.error('   - Filter produces results');
      }
    }
    
    process.exit(1);
  }
}

// Run the PDF generator if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error('💥 Unexpected error:', error);
    process.exit(1);
  });
}