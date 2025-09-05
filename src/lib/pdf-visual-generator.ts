// PDF Visual Generator - Canvas-Free Implementation
// Replaces chartjs-node-canvas with pure HTML/CSS visuals

export interface SeverityData {
  critical: number;
  high: number;
  medium: number;
  low: number;
}

export interface CategoryData {
  name: string;
  description: string;
  count: number;
  iconKey: 'images' | 'forms' | 'navigation' | 'contrast' | 'structure';
}

export interface WCAGPrincipleData {
  number: 1 | 2 | 3 | 4;
  title: string;
  description: string;
  status: 'compliant' | 'non-compliant' | 'partial';
}

export class PDFVisualGenerator {
  public readonly CSS_STYLES = `
    /* PDF-Optimized Color Palette */
    :root {
        --color-critical: #DC2626;
        --color-high: #EA580C;
        --color-medium: #D97706;
        --color-low: #059669;
        --color-success: #16A34A;
        --color-neutral: #6B7280;
        --color-light-gray: #F3F4F6;
        --color-medium-gray: #E5E7EB;
        --color-dark-gray: #374151;
        --color-text: #111827;
        --color-text-secondary: #4B5563;
        --font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }

    /* Base Typography and Layout */
    body {
        font-family: var(--font-family);
        color: var(--color-text);
        line-height: 1.5;
        margin: 0;
        padding: 0;
    }

    .report-section {
        margin-bottom: 32px;
        page-break-inside: avoid;
    }

    .section-title {
        font-size: 18px;
        font-weight: 600;
        color: var(--color-text);
        margin-bottom: 16px;
        border-bottom: 2px solid var(--color-medium-gray);
        padding-bottom: 8px;
    }

    /* 1. SEVERITY DISTRIBUTION VISUAL */
    .severity-distribution {
        background: white;
        border: 1px solid var(--color-medium-gray);
        border-radius: 8px;
        padding: 20px;
        margin-bottom: 20px;
    }

    .severity-grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 16px;
        margin-bottom: 20px;
    }

    .severity-item {
        display: flex;
        flex-direction: column;
        align-items: center;
        text-align: center;
        padding: 16px;
        border-radius: 6px;
        border: 1px solid var(--color-medium-gray);
    }

    .severity-item.critical { border-left: 4px solid var(--color-critical); }
    .severity-item.high { border-left: 4px solid var(--color-high); }
    .severity-item.medium { border-left: 4px solid var(--color-medium); }
    .severity-item.low { border-left: 4px solid var(--color-low); }

    .severity-count {
        font-size: 24px;
        font-weight: 700;
        margin-bottom: 4px;
    }

    .severity-item.critical .severity-count { color: var(--color-critical); }
    .severity-item.high .severity-count { color: var(--color-high); }
    .severity-item.medium .severity-count { color: var(--color-medium); }
    .severity-item.low .severity-count { color: var(--color-low); }

    .severity-label {
        font-size: 14px;
        font-weight: 500;
        color: var(--color-text);
        margin-bottom: 8px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
    }

    .severity-percentage {
        font-size: 12px;
        color: var(--color-text-secondary);
        background: var(--color-light-gray);
        padding: 4px 8px;
        border-radius: 12px;
        margin-bottom: 8px;
    }

    .severity-progress {
        width: 100%;
        height: 6px;
        background: var(--color-light-gray);
        border-radius: 3px;
        overflow: hidden;
    }

    .severity-progress-bar {
        height: 100%;
        border-radius: 3px;
        transition: width 0.3s ease;
    }

    .severity-progress-bar.critical { background: var(--color-critical); }
    .severity-progress-bar.high { background: var(--color-high); }
    .severity-progress-bar.medium { background: var(--color-medium); }
    .severity-progress-bar.low { background: var(--color-low); }

    /* 2. COMPLIANCE SCORE CIRCLE */
    .compliance-overview {
        display: flex;
        align-items: center;
        gap: 24px;
        margin-bottom: 20px;
    }

    .compliance-circle {
        width: 120px;
        height: 120px;
        border-radius: 50%;
        position: relative;
        display: flex;
        align-items: center;
        justify-content: center;
        background: conic-gradient(
            var(--color-success) 0deg,
            var(--color-success) var(--progress-deg, 270deg),
            var(--color-light-gray) var(--progress-deg, 270deg),
            var(--color-light-gray) 360deg
        );
    }

    .compliance-circle::after {
        content: '';
        position: absolute;
        width: 90px;
        height: 90px;
        background: white;
        border-radius: 50%;
    }

    .compliance-percentage {
        position: relative;
        z-index: 1;
        font-size: 24px;
        font-weight: 700;
        color: var(--color-text);
    }

    .compliance-details {
        flex: 1;
    }

    .compliance-title {
        font-size: 16px;
        font-weight: 600;
        margin-bottom: 8px;
    }

    .compliance-description {
        font-size: 14px;
        color: var(--color-text-secondary);
        margin-bottom: 12px;
    }

    /* 3. CATEGORY BREAKDOWN */
    .category-breakdown {
        background: white;
        border: 1px solid var(--color-medium-gray);
        border-radius: 8px;
        padding: 20px;
        margin-bottom: 20px;
    }

    .category-list {
        list-style: none;
        padding: 0;
        margin: 0;
    }

    .category-item {
        display: flex;
        align-items: center;
        padding: 12px 0;
        border-bottom: 1px solid var(--color-light-gray);
    }

    .category-item:last-child {
        border-bottom: none;
    }

    .category-badge {
        width: 40px;
        height: 32px;
        border-radius: 4px;
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-size: 10px;
        font-weight: 600;
        margin-right: 16px;
        flex-shrink: 0;
    }

    .category-badge.images { background: #8B5CF6; }
    .category-badge.forms { background: #06B6D4; }
    .category-badge.navigation { background: #10B981; }
    .category-badge.contrast { background: #F59E0B; }
    .category-badge.structure { background: #EF4444; }

    .category-info {
        flex: 1;
        margin-right: 16px;
    }

    .category-name {
        font-weight: 500;
        margin-bottom: 2px;
    }

    .category-description {
        font-size: 12px;
        color: var(--color-text-secondary);
    }

    .category-progress {
        width: 120px;
        display: flex;
        align-items: center;
        gap: 8px;
    }

    .category-bar {
        width: 80px;
        height: 6px;
        background: var(--color-light-gray);
        border-radius: 3px;
        overflow: hidden;
    }

    .category-bar-fill {
        height: 100%;
        background: var(--color-neutral);
        border-radius: 3px;
    }

    .category-count {
        font-size: 12px;
        font-weight: 600;
        color: var(--color-text);
        min-width: 20px;
        text-align: right;
    }

    /* 4. WCAG COMPLIANCE GRID */
    .wcag-compliance {
        background: white;
        border: 1px solid var(--color-medium-gray);
        border-radius: 8px;
        padding: 20px;
    }

    .wcag-grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 16px;
    }

    .wcag-principle {
        padding: 16px;
        border: 1px solid var(--color-light-gray);
        border-radius: 6px;
        text-align: center;
    }

    .principle-number {
        width: 32px;
        height: 32px;
        border-radius: 50%;
        background: var(--color-neutral);
        color: white;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 600;
        margin: 0 auto 8px;
    }

    .principle-title {
        font-size: 14px;
        font-weight: 600;
        margin-bottom: 4px;
    }

    .principle-description {
        font-size: 12px;
        color: var(--color-text-secondary);
        margin-bottom: 12px;
    }

    .principle-status {
        padding: 4px 8px;
        border-radius: 12px;
        font-size: 11px;
        font-weight: 500;
    }

    .principle-status.compliant {
        background: #D1FAE5;
        color: #065F46;
    }

    .principle-status.non-compliant {
        background: #FEE2E2;
        color: #991B1B;
    }

    .principle-status.partial {
        background: #FEF3C7;
        color: #92400E;
    }

    /* Responsive adjustments for PDF */
    @media print {
        .severity-grid, .wcag-grid {
            grid-template-columns: repeat(2, 1fr);
        }
        
        .report-section {
            page-break-inside: avoid;
        }
    }
  `;

  generateSeverityDistribution(data: SeverityData, totalIssues: number): string {
    const calculatePercentage = (count: number) => Math.round((count / totalIssues) * 100);
    const maxCount = Math.max(data.critical, data.high, data.medium, data.low);
    
    const severityItems = [
      { 
        key: 'critical', 
        count: data.critical, 
        label: 'Critical', 
        percentage: calculatePercentage(data.critical),
        progressWidth: maxCount > 0 ? (data.critical / maxCount) * 100 : 0
      },
      { 
        key: 'high', 
        count: data.high, 
        label: 'High', 
        percentage: calculatePercentage(data.high),
        progressWidth: maxCount > 0 ? (data.high / maxCount) * 100 : 0
      },
      { 
        key: 'medium', 
        count: data.medium, 
        label: 'Medium', 
        percentage: calculatePercentage(data.medium),
        progressWidth: maxCount > 0 ? (data.medium / maxCount) * 100 : 0
      },
      { 
        key: 'low', 
        count: data.low, 
        label: 'Low', 
        percentage: calculatePercentage(data.low),
        progressWidth: maxCount > 0 ? (data.low / maxCount) * 100 : 0
      }
    ];

    return `
      <div class="report-section">
        <h2 class="section-title">Issue Severity Distribution</h2>
        <div class="severity-distribution">
          <div class="severity-grid">
            ${severityItems.map(item => `
              <div class="severity-item ${item.key}">
                <div class="severity-count">${item.count}</div>
                <div class="severity-label">${item.label}</div>
                <div class="severity-percentage">${item.percentage}%</div>
                <div class="severity-progress">
                  <div class="severity-progress-bar ${item.key}" 
                       style="width: ${item.progressWidth}%"></div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `;
  }

  generateComplianceCircle(score: number): string {
    const progressDegrees = (score / 100) * 360;
    
    return `
      <div class="compliance-overview">
        <div class="compliance-circle" style="--progress-deg: ${progressDegrees}deg">
          <div class="compliance-percentage">${score}%</div>
        </div>
        <div class="compliance-details">
          <div class="compliance-title">Overall Compliance Score</div>
          <div class="compliance-description">
            Based on ${score >= 80 ? 'excellent' : score >= 60 ? 'good' : 'needs improvement'} accessibility standards
          </div>
        </div>
      </div>
    `;
  }

  generateCategoryBreakdown(categories: CategoryData[]): string {
    const maxCount = Math.max(...categories.map(c => c.count));
    
    return `
      <div class="report-section">
        <h2 class="section-title">Issues by Category</h2>
        <div class="category-breakdown">
          <ul class="category-list">
            ${categories.map(category => `
              <li class="category-item">
                <div class="category-badge ${category.iconKey}">
                  ${category.iconKey.substring(0, 3).toUpperCase()}
                </div>
                <div class="category-info">
                  <div class="category-name">${category.name}</div>
                  <div class="category-description">${category.description}</div>
                </div>
                <div class="category-progress">
                  <div class="category-bar">
                    <div class="category-bar-fill" 
                         style="width: ${maxCount > 0 ? (category.count / maxCount) * 100 : 0}%"></div>
                  </div>
                  <div class="category-count">${category.count}</div>
                </div>
              </li>
            `).join('')}
          </ul>
        </div>
      </div>
    `;
  }

  generateWCAGCompliance(principles: WCAGPrincipleData[]): string {
    return `
      <div class="report-section">
        <h2 class="section-title">WCAG 2.1 Compliance Overview</h2>
        <div class="wcag-compliance">
          <div class="wcag-grid">
            ${principles.map(principle => `
              <div class="wcag-principle">
                <div class="principle-number">${principle.number}</div>
                <div class="principle-title">${principle.title}</div>
                <div class="principle-description">${principle.description}</div>
                <div class="principle-status ${principle.status}">
                  ${principle.status === 'compliant' ? '✓ Compliant' : 
                    principle.status === 'non-compliant' ? '✗ Non-Compliant' : '⚠ Partial'}
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `;
  }

  generateCompleteVisualReport(data: {
    severity: SeverityData;
    categories: CategoryData[];
    complianceScore: number;
    wcagPrinciples: WCAGPrincipleData[];
    totalIssues: number;
  }): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Accessibility Report</title>
        <style>
          ${this.CSS_STYLES}
        </style>
      </head>
      <body>
        ${this.generateComplianceCircle(data.complianceScore)}
        ${this.generateSeverityDistribution(data.severity, data.totalIssues)}
        ${this.generateCategoryBreakdown(data.categories)}
        ${this.generateWCAGCompliance(data.wcagPrinciples)}
      </body>
      </html>
    `;
  }
}