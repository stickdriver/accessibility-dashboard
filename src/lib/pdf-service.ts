import puppeteer from 'puppeteer';
import { PDFReportGenerator, ScanData } from './pdf-generation';
import { AccessibilityReportTemplate } from './pdf-template';

export interface PDFGenerationOptions {
  format: 'A4' | 'Letter';
  orientation: 'portrait' | 'landscape';
  margins: {
    top: string;
    right: string;
    bottom: string;
    left: string;
  };
  displayHeaderFooter: boolean;
  headerTemplate?: string;
  footerTemplate?: string;
  printBackground: boolean;
}

export class PDFService {
  private reportGenerator: PDFReportGenerator;
  private template: AccessibilityReportTemplate;

  constructor() {
    this.reportGenerator = new PDFReportGenerator();
    this.template = new AccessibilityReportTemplate();
  }

  /**
   * Generate a complete PDF accessibility audit report
   */
  public async generateAccessibilityReport(
    scanData: ScanData,
    options: Partial<PDFGenerationOptions> = {}
  ): Promise<Buffer> {
    try {
      // Process scan data
      const pdfData = this.reportGenerator.processScanData(scanData);
      
      // Generate HTML content with canvas-free visuals
      const htmlContent = this.template.generateHTML(pdfData);
      
      // Generate PDF from HTML
      const pdfBuffer = await this.generatePDFFromHTML(htmlContent, options);
      
      return pdfBuffer;
    } catch (error) {
      console.error('Error generating PDF report:', error);
      throw new Error(`Failed to generate PDF report: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Canvas chart generation removed - using HTML/CSS visuals instead

  /**
   * Convert HTML content to PDF using Puppeteer
   */
  private async generatePDFFromHTML(
    htmlContent: string,
    options: Partial<PDFGenerationOptions> = {}
  ): Promise<Buffer> {
    let browser;
    
    try {
      console.log('Starting PDF generation process...');
      
      const defaultOptions: PDFGenerationOptions = {
        format: 'A4',
        orientation: 'portrait',
        margins: {
          top: '1in',
          right: '0.8in',
          bottom: '1in',
          left: '0.8in',
        },
        displayHeaderFooter: true,
        headerTemplate: this.getHeaderTemplate(),
        footerTemplate: this.getFooterTemplate(),
        printBackground: true,
      };

      const finalOptions = { ...defaultOptions, ...options };

      console.log('Launching browser...');
      // Launch browser with optimal settings for PDF generation
      browser = await puppeteer.launch({
        headless: 'new', // Use new headless mode
        executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/chromium-browser',
        timeout: 60000, // Increase browser launch timeout
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--disable-gpu',
          '--disable-background-timer-throttling',
          '--disable-backgrounding-occluded-windows',
          '--disable-renderer-backgrounding',
          '--disable-features=VizDisplayCompositor',
          '--disable-extensions',
          '--disable-default-apps',
          '--single-process', // Use single process for containers
          '--memory-pressure-off',
        ],
      });
      console.log('Browser launched successfully');

      const page = await browser.newPage();
      console.log('New page created');

      // Set viewport for consistent rendering
      await page.setViewport({
        width: 1280,
        height: 720,
        deviceScaleFactor: 2, // Higher DPI for better quality
      });
      console.log('Viewport set');

      // Set content with more reliable waiting strategy for containers
      console.log('Setting page content...');
      await page.setContent(htmlContent, {
        waitUntil: 'domcontentloaded', // More reliable than networkidle0 in containers
        timeout: 60000, // Increase timeout to 60 seconds
      });
      console.log('Page content set successfully');

      // Wait for CSS animations and visuals to complete
      console.log('Waiting for CSS rendering...');
      await page.evaluate(() => {
        return new Promise((resolve) => {
          if (document.readyState === 'complete') {
            setTimeout(resolve, 2000); // Give more time for CSS visuals
          } else {
            document.addEventListener('DOMContentLoaded', () => {
              setTimeout(resolve, 2000);
            });
          }
        });
      });
      console.log('CSS rendering complete');

      // Generate PDF with high quality settings
      console.log('Generating PDF...');
      const pdfOptions: any = {
        format: finalOptions.format,
        landscape: finalOptions.orientation === 'landscape',
        margin: finalOptions.margins,
        displayHeaderFooter: finalOptions.displayHeaderFooter,
        printBackground: finalOptions.printBackground,
        preferCSSPageSize: true,
        omitBackground: false,
        tagged: true, // For accessibility
      };
      
      if (finalOptions.headerTemplate) {
        pdfOptions.headerTemplate = finalOptions.headerTemplate;
      }
      
      if (finalOptions.footerTemplate) {
        pdfOptions.footerTemplate = finalOptions.footerTemplate;
      }
      
      const pdfBuffer = await page.pdf(pdfOptions);
      console.log(`PDF generated successfully, size: ${pdfBuffer.length} bytes`);

      return Buffer.from(pdfBuffer);
    } catch (error) {
      console.error('Error in PDF generation:', error);
      throw new Error(`PDF generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }

  /**
   * Get header template for PDF
   */
  private getHeaderTemplate(): string {
    return `
      <div style="
        width: 100%;
        font-size: 10px;
        padding: 10px 40px;
        color: #64748b;
        border-bottom: 1px solid #e2e8f0;
        display: flex;
        justify-content: space-between;
        align-items: center;
        -webkit-print-color-adjust: exact;
      ">
        <span>Auditable.dev Accessibility Report</span>
        <span class="date"></span>
      </div>
    `;
  }

  /**
   * Get footer template for PDF
   */
  private getFooterTemplate(): string {
    return `
      <div style="
        width: 100%;
        font-size: 10px;
        padding: 10px 40px;
        color: #64748b;
        border-top: 1px solid #e2e8f0;
        display: flex;
        justify-content: space-between;
        align-items: center;
        -webkit-print-color-adjust: exact;
      ">
        <span>Confidential - Generated by Auditable.dev</span>
        <span>Page <span class="pageNumber"></span> of <span class="totalPages"></span></span>
      </div>
    `;
  }

  /**
   * Validate scan data before processing
   */
  public validateScanData(scanData: any): scanData is ScanData {
    if (!scanData || typeof scanData !== 'object') {
      return false;
    }

    const required = ['_id', 'websiteUrl', 'status', 'totalIssues', 'pagesScanned'];
    return required.every(field => field in scanData);
  }

  /**
   * Get PDF generation statistics
   */
  public async getGenerationStats(scanData: ScanData): Promise<{
    estimatedSize: string;
    estimatedPages: number;
    processingTime: string;
  }> {
    const issues = scanData.results?.violations || [];
    const pagesCount = Math.max(scanData.pagesScanned, 1);
    
    // Estimate based on content
    const basePages = 7; // Cover, TOC, Summary, Findings, Pages, Recommendations, Appendix
    const issuePages = Math.ceil(issues.length / 20); // ~20 issues per page
    const estimatedPages = basePages + issuePages;
    
    // Estimate file size (rough calculation)
    const estimatedSizeKB = estimatedPages * 200 + (pagesCount * 50); // Base + charts
    const estimatedSize = estimatedSizeKB > 1024 
      ? `${(estimatedSizeKB / 1024).toFixed(1)}MB`
      : `${estimatedSizeKB}KB`;
    
    // Estimate processing time
    const processingTimeSeconds = Math.max(5, Math.ceil(estimatedPages * 0.5));
    const processingTime = processingTimeSeconds > 60
      ? `${Math.ceil(processingTimeSeconds / 60)}m ${processingTimeSeconds % 60}s`
      : `${processingTimeSeconds}s`;

    return {
      estimatedSize,
      estimatedPages,
      processingTime,
    };
  }
}