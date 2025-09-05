import { format } from 'date-fns';
import { PDFData } from './pdf-generation';

export interface PDFTemplate {
  generateHTML(data: PDFData, chartBuffers: ChartBuffers): string;
}

export interface ChartBuffers {
  complianceChart: string; // Base64 encoded
  severityChart: string;   // Base64 encoded
  categoriesChart: string; // Base64 encoded
}

export class AccessibilityReportTemplate implements PDFTemplate {
  private readonly BRAND_COLORS = {
    primary: '#2563eb',
    secondary: '#64748b', 
    success: '#16a34a',
    warning: '#ea580c',
    danger: '#dc2626',
    light: '#f8fafc',
    dark: '#0f172a',
  };

  public generateHTML(data: PDFData, charts: ChartBuffers): string {
    const { scanData, complianceScore, severityBreakdown, wcagCompliance, pageBreakdown, issueCategories, recommendations } = data;
    const scanDate = scanData.completedAt ? format(new Date(scanData.completedAt), 'MMMM dd, yyyy') : 'N/A';
    const scanTime = scanData.completedAt ? format(new Date(scanData.completedAt), 'h:mm a') : 'N/A';

    return `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Accessibility Audit Report - ${scanData.websiteUrl}</title>
          ${this.generateStyles()}
        </head>
        <body>
          ${this.generateCoverPage(scanData, complianceScore, scanDate, scanTime)}
          ${this.generateTableOfContents()}
          ${this.generateExecutiveSummary(data, charts.complianceChart)}
          ${this.generateDetailedFindings(data, charts.severityChart, charts.categoriesChart)}
          ${this.generatePageBreakdown(pageBreakdown)}
          ${this.generateRecommendations(recommendations)}
          ${this.generateTechnicalAppendix(scanData)}
          ${this.generateFooter()}
        </body>
      </html>
    `;
  }

  private generateStyles(): string {
    return `
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
        
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        body {
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          line-height: 1.6;
          color: ${this.BRAND_COLORS.dark};
          font-size: 14px;
        }
        
        .page {
          min-height: 100vh;
          padding: 60px 50px;
          page-break-after: always;
          background: white;
        }
        
        .page:last-child {
          page-break-after: auto;
        }
        
        .cover-page {
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          text-align: center;
          background: linear-gradient(135deg, ${this.BRAND_COLORS.primary}, ${this.BRAND_COLORS.secondary});
          color: white;
        }
        
        .logo {
          font-size: 48px;
          font-weight: 700;
          margin-bottom: 20px;
        }
        
        .cover-title {
          font-size: 36px;
          font-weight: 600;
          margin-bottom: 30px;
          max-width: 800px;
        }
        
        .cover-subtitle {
          font-size: 20px;
          font-weight: 400;
          margin-bottom: 40px;
          opacity: 0.9;
        }
        
        .cover-meta {
          display: flex;
          gap: 60px;
          margin-top: 60px;
          flex-wrap: wrap;
          justify-content: center;
        }
        
        .meta-item {
          text-align: center;
        }
        
        .meta-label {
          font-size: 14px;
          opacity: 0.8;
          margin-bottom: 8px;
        }
        
        .meta-value {
          font-size: 24px;
          font-weight: 600;
        }
        
        .compliance-badge {
          display: inline-block;
          padding: 12px 24px;
          border-radius: 50px;
          font-size: 18px;
          font-weight: 600;
          margin-top: 20px;
        }
        
        .compliance-excellent { background: ${this.BRAND_COLORS.success}; }
        .compliance-good { background: #22c55e; }
        .compliance-fair { background: ${this.BRAND_COLORS.warning}; }
        .compliance-poor { background: ${this.BRAND_COLORS.danger}; }
        
        h1 {
          font-size: 32px;
          font-weight: 700;
          margin-bottom: 30px;
          color: ${this.BRAND_COLORS.primary};
          border-bottom: 3px solid ${this.BRAND_COLORS.primary};
          padding-bottom: 15px;
        }
        
        h2 {
          font-size: 24px;
          font-weight: 600;
          margin: 40px 0 20px 0;
          color: ${this.BRAND_COLORS.secondary};
        }
        
        h3 {
          font-size: 18px;
          font-weight: 600;
          margin: 30px 0 15px 0;
          color: ${this.BRAND_COLORS.dark};
        }
        
        .toc {
          list-style: none;
          padding: 0;
        }
        
        .toc li {
          padding: 12px 0;
          border-bottom: 1px dotted #cbd5e1;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        
        .toc-item {
          font-weight: 500;
        }
        
        .toc-page {
          font-weight: 600;
          color: ${this.BRAND_COLORS.primary};
        }
        
        .summary-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 40px;
          margin: 30px 0;
        }
        
        .summary-card {
          background: ${this.BRAND_COLORS.light};
          padding: 30px;
          border-radius: 12px;
          border-left: 5px solid ${this.BRAND_COLORS.primary};
        }
        
        .metric {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin: 15px 0;
          padding: 15px 20px;
          background: white;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.05);
        }
        
        .metric-label {
          font-weight: 500;
          color: ${this.BRAND_COLORS.secondary};
        }
        
        .metric-value {
          font-size: 24px;
          font-weight: 700;
        }
        
        .metric-critical { color: ${this.BRAND_COLORS.danger}; }
        .metric-serious { color: #f97316; }
        .metric-moderate { color: ${this.BRAND_COLORS.warning}; }
        .metric-minor { color: #eab308; }
        
        .chart-container {
          text-align: center;
          margin: 40px 0;
          page-break-inside: avoid;
        }
        
        .chart-image {
          max-width: 100%;
          height: auto;
          border-radius: 8px;
          box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        }
        
        .findings-table {
          width: 100%;
          border-collapse: collapse;
          margin: 30px 0;
          background: white;
          border-radius: 8px;
          overflow: hidden;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        
        .findings-table th {
          background: ${this.BRAND_COLORS.primary};
          color: white;
          padding: 15px 12px;
          text-align: left;
          font-weight: 600;
          font-size: 14px;
        }
        
        .findings-table td {
          padding: 12px;
          border-bottom: 1px solid #e2e8f0;
          vertical-align: top;
        }
        
        .findings-table tr:last-child td {
          border-bottom: none;
        }
        
        .findings-table tr:nth-child(even) {
          background: #fafafa;
        }
        
        .severity-badge {
          display: inline-block;
          padding: 4px 12px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 600;
          color: white;
          text-transform: uppercase;
        }
        
        .severity-critical { background: ${this.BRAND_COLORS.danger}; }
        .severity-serious { background: #f97316; }
        .severity-moderate { background: ${this.BRAND_COLORS.warning}; }
        .severity-minor { background: #eab308; }
        
        .recommendations-list {
          list-style: none;
          padding: 0;
        }
        
        .recommendations-list li {
          background: ${this.BRAND_COLORS.light};
          margin: 15px 0;
          padding: 20px;
          border-radius: 8px;
          border-left: 4px solid ${this.BRAND_COLORS.primary};
          position: relative;
          padding-left: 50px;
        }
        
        .recommendations-list li::before {
          content: counter(recommendation);
          counter-increment: recommendation;
          position: absolute;
          left: 20px;
          top: 20px;
          background: ${this.BRAND_COLORS.primary};
          color: white;
          border-radius: 50%;
          width: 24px;
          height: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          font-weight: 600;
        }
        
        .recommendations-list {
          counter-reset: recommendation;
        }
        
        .tech-details {
          background: #f1f5f9;
          padding: 20px;
          border-radius: 8px;
          margin: 20px 0;
          font-family: 'Courier New', monospace;
          font-size: 12px;
        }
        
        .tech-label {
          font-weight: 600;
          color: ${this.BRAND_COLORS.secondary};
          display: inline-block;
          width: 140px;
        }
        
        .footer-info {
          text-align: center;
          color: ${this.BRAND_COLORS.secondary};
          font-size: 12px;
          margin-top: 40px;
          padding-top: 20px;
          border-top: 1px solid #e2e8f0;
        }
        
        @media print {
          .page {
            min-height: auto;
            page-break-after: always;
          }
          
          body {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          
          .chart-image {
            max-height: 400px;
          }
        }
      </style>
    `;
  }

  private generateCoverPage(scanData: any, complianceScore: number, scanDate: string, scanTime: string): string {
    const complianceClass = this.getComplianceClass(complianceScore);
    
    return `
      <div class="page cover-page">
        <div class="logo">Auditable.dev</div>
        <h1 class="cover-title">Web Accessibility Audit Report</h1>
        <p class="cover-subtitle">${scanData.websiteUrl}</p>
        
        <div class="compliance-badge ${complianceClass}">
          ${complianceScore.toFixed(1)}% Compliant
        </div>
        
        <div class="cover-meta">
          <div class="meta-item">
            <div class="meta-label">Scan Date</div>
            <div class="meta-value">${scanDate}</div>
          </div>
          <div class="meta-item">
            <div class="meta-label">Scan Time</div>
            <div class="meta-value">${scanTime}</div>
          </div>
          <div class="meta-item">
            <div class="meta-label">Pages Scanned</div>
            <div class="meta-value">${scanData.pagesScanned}</div>
          </div>
          <div class="meta-item">
            <div class="meta-label">Total Issues</div>
            <div class="meta-value">${scanData.totalIssues}</div>
          </div>
        </div>
      </div>
    `;
  }

  private generateTableOfContents(): string {
    return `
      <div class="page">
        <h1>Table of Contents</h1>
        <ol class="toc">
          <li><span class="toc-item">Executive Summary</span> <span class="toc-page">3</span></li>
          <li><span class="toc-item">Detailed Findings</span> <span class="toc-page">4</span></li>
          <li><span class="toc-item">Page-by-Page Breakdown</span> <span class="toc-page">5</span></li>
          <li><span class="toc-item">Recommendations</span> <span class="toc-page">6</span></li>
          <li><span class="toc-item">Technical Appendix</span> <span class="toc-page">7</span></li>
        </ol>
      </div>
    `;
  }

  private generateExecutiveSummary(data: PDFData, complianceChart: string): string {
    const { scanData, complianceScore, severityBreakdown, wcagCompliance } = data;
    
    return `
      <div class="page">
        <h1>Executive Summary</h1>
        
        <div class="chart-container">
          <img src="data:image/png;base64,${complianceChart}" alt="Compliance Score Chart" class="chart-image">
        </div>
        
        <div class="summary-grid">
          <div class="summary-card">
            <h3>Compliance Overview</h3>
            <div class="metric">
              <span class="metric-label">Overall Score</span>
              <span class="metric-value" style="color: ${this.getComplianceColor(complianceScore)}">${complianceScore.toFixed(1)}%</span>
            </div>
            <div class="metric">
              <span class="metric-label">WCAG ${wcagCompliance.level} Compliance</span>
              <span class="metric-value" style="color: ${this.getComplianceColor(wcagCompliance.percentage)}">${wcagCompliance.percentage.toFixed(1)}%</span>
            </div>
          </div>
          
          <div class="summary-card">
            <h3>Issue Breakdown</h3>
            <div class="metric">
              <span class="metric-label">Critical Issues</span>
              <span class="metric-value metric-critical">${severityBreakdown.critical}</span>
            </div>
            <div class="metric">
              <span class="metric-label">Serious Issues</span>
              <span class="metric-value metric-serious">${severityBreakdown.serious}</span>
            </div>
            <div class="metric">
              <span class="metric-label">Moderate Issues</span>
              <span class="metric-value metric-moderate">${severityBreakdown.moderate}</span>
            </div>
            <div class="metric">
              <span class="metric-label">Minor Issues</span>
              <span class="metric-value metric-minor">${severityBreakdown.minor}</span>
            </div>
          </div>
        </div>
        
        <h2>Key Findings</h2>
        <p>This accessibility audit identified <strong>${scanData.totalIssues} total issues</strong> across <strong>${scanData.pagesScanned} page${scanData.pagesScanned !== 1 ? 's' : ''}</strong>. The overall accessibility compliance score is <strong>${complianceScore.toFixed(1)}%</strong>.</p>
        
        ${severityBreakdown.critical > 0 ? `<p><strong>Critical Priority:</strong> ${severityBreakdown.critical} critical issue${severityBreakdown.critical !== 1 ? 's' : ''} were found that completely block access for users with disabilities and should be addressed immediately.</p>` : ''}
        
        <p>The audit was conducted using industry-standard accessibility testing tools and follows WCAG 2.1 ${wcagCompliance.level} guidelines.</p>
      </div>
    `;
  }

  private generateDetailedFindings(data: PDFData, severityChart: string, categoriesChart: string): string {
    const { severityBreakdown } = data;
    
    return `
      <div class="page">
        <h1>Detailed Findings</h1>
        
        <h2>Issues by Severity</h2>
        <div class="chart-container">
          <img src="data:image/png;base64,${severityChart}" alt="Severity Breakdown Chart" class="chart-image">
        </div>
        
        <h2>Issues by Category</h2>
        <div class="chart-container">
          <img src="data:image/png;base64,${categoriesChart}" alt="Issues by Category Chart" class="chart-image">
        </div>
        
        <h2>Severity Impact</h2>
        <div class="tech-details">
          <p><strong>Critical (${severityBreakdown.critical}):</strong> Issues that completely prevent access to content or functionality for users with disabilities. These must be fixed immediately.</p>
          <p><strong>Serious (${severityBreakdown.serious}):</strong> Issues that significantly impair the user experience for people with disabilities but may have workarounds.</p>
          <p><strong>Moderate (${severityBreakdown.moderate}):</strong> Issues that create some barriers but don't completely prevent access to content.</p>
          <p><strong>Minor (${severityBreakdown.minor}):</strong> Issues that may cause inconvenience but don't significantly impact accessibility.</p>
        </div>
      </div>
    `;
  }

  private generatePageBreakdown(pageBreakdown: PDFData['pageBreakdown']): string {
    const tableRows = pageBreakdown.map(page => `
      <tr>
        <td>${page.title}</td>
        <td>${page.url}</td>
        <td>${page.issueCount}</td>
        <td>${page.criticalIssues}</td>
        <td>${page.loadTime ? `${page.loadTime}ms` : 'N/A'}</td>
      </tr>
    `).join('');

    return `
      <div class="page">
        <h1>Page-by-Page Breakdown</h1>
        
        <table class="findings-table">
          <thead>
            <tr>
              <th>Page Title</th>
              <th>URL</th>
              <th>Total Issues</th>
              <th>Critical Issues</th>
              <th>Load Time</th>
            </tr>
          </thead>
          <tbody>
            ${tableRows}
          </tbody>
        </table>
        
        <p><strong>Note:</strong> Each page was scanned independently. Issues may be duplicated across pages if they appear on multiple pages with shared components.</p>
      </div>
    `;
  }

  private generateRecommendations(recommendations: string[]): string {
    const recommendationItems = recommendations.map(rec => `<li>${rec}</li>`).join('');
    
    return `
      <div class="page">
        <h1>Recommendations</h1>
        
        <p>Based on the accessibility audit findings, we recommend the following actions to improve your website's accessibility:</p>
        
        <ol class="recommendations-list">
          ${recommendationItems}
        </ol>
        
        <h2>Implementation Priority</h2>
        <p>Focus on addressing issues in this order:</p>
        <ol>
          <li><strong>Critical Issues:</strong> Block user access completely</li>
          <li><strong>Serious Issues:</strong> Significantly impair user experience</li>
          <li><strong>Moderate Issues:</strong> Create barriers but don't prevent access</li>
          <li><strong>Minor Issues:</strong> Polish and optimization opportunities</li>
        </ol>
        
        <h2>Ongoing Accessibility</h2>
        <p>Consider implementing these long-term strategies:</p>
        <ul>
          <li>Regular automated accessibility testing in your CI/CD pipeline</li>
          <li>Manual testing with screen readers and keyboard navigation</li>
          <li>Accessibility training for your development and design teams</li>
          <li>User testing with people who use assistive technologies</li>
        </ul>
      </div>
    `;
  }

  private generateTechnicalAppendix(scanData: any): string {
    const scanDate = scanData.completedAt ? new Date(scanData.completedAt).toISOString() : 'N/A';
    
    return `
      <div class="page">
        <h1>Technical Appendix</h1>
        
        <h2>Scan Configuration</h2>
        <div class="tech-details">
          <p><span class="tech-label">Target URL:</span> ${scanData.websiteUrl}</p>
          <p><span class="tech-label">Scan Type:</span> ${scanData.scanType.replace('_', ' ').toUpperCase()}</p>
          <p><span class="tech-label">Scan Duration:</span> ${scanData.scanDuration ? `${scanData.scanDuration}s` : 'N/A'}</p>
          <p><span class="tech-label">Completion Date:</span> ${scanDate}</p>
          <p><span class="tech-label">Pages Scanned:</span> ${scanData.pagesScanned}</p>
        </div>
        
        <h2>Testing Standards</h2>
        <div class="tech-details">
          <p><span class="tech-label">Guidelines:</span> WCAG 2.1 Level AA</p>
          <p><span class="tech-label">Testing Engine:</span> Pa11y (HTML CodeSniffer + aXe)</p>
          <p><span class="tech-label">Browser:</span> Chromium (Headless)</p>
          <p><span class="tech-label">Viewport:</span> 1280x720</p>
        </div>
        
        <h2>Report Generation</h2>
        <div class="tech-details">
          <p><span class="tech-label">Generated By:</span> Auditable.dev Accessibility Scanner</p>
          <p><span class="tech-label">Report Date:</span> ${new Date().toISOString()}</p>
          <p><span class="tech-label">Report Version:</span> 1.0</p>
        </div>
        
        <h2>Disclaimer</h2>
        <p>This automated accessibility audit provides a comprehensive analysis of your website's compliance with WCAG 2.1 guidelines. However, automated testing cannot catch all accessibility issues. We recommend complementing this report with manual testing and user feedback from people with disabilities.</p>
        
        <p>This report is based on the state of your website at the time of scanning. Content and functionality may have changed since the audit was performed.</p>
      </div>
    `;
  }

  private generateFooter(): string {
    return `
      <div class="footer-info">
        <p>Generated by Auditable.dev Accessibility Scanner • https://auditable.dev</p>
        <p>For support or questions about this report, contact us at support@auditable.dev</p>
      </div>
    `;
  }

  private getComplianceClass(score: number): string {
    if (score >= 95) return 'compliance-excellent';
    if (score >= 80) return 'compliance-good';
    if (score >= 60) return 'compliance-fair';
    return 'compliance-poor';
  }

  private getComplianceColor(score: number): string {
    if (score >= 95) return this.BRAND_COLORS.success;
    if (score >= 80) return '#22c55e';
    if (score >= 60) return this.BRAND_COLORS.warning;
    return this.BRAND_COLORS.danger;
  }
}