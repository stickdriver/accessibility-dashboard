import { ChartJSNodeCanvas } from 'chartjs-node-canvas';
import {
  Chart,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement,
} from 'chart.js';

// Register Chart.js components
Chart.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement
);

export interface ScanData {
  _id: string;
  websiteUrl: string;
  status: string;
  totalIssues: number;
  criticalIssues: number;
  results: any;
  scanDuration?: number;
  completedAt?: number;
  pagesScanned: number;
  pages?: PageData[];
}

export interface PageData {
  pageUrl: string;
  pageTitle?: string;
  issues: any[];
  wcagLevel: string;
  loadTime?: number;
}

export interface IssueData {
  type: 'error' | 'warning' | 'notice';
  code: string;
  message: string;
  context: string;
  selector: string;
  runnerExtras?: any;
}

export interface PDFData {
  scanData: ScanData;
  complianceScore: number;
  severityBreakdown: {
    critical: number;
    serious: number;
    moderate: number;
    minor: number;
  };
  wcagCompliance: {
    level: 'A' | 'AA' | 'AAA';
    passedCriteria: number;
    totalCriteria: number;
    percentage: number;
  };
  pageBreakdown: {
    url: string;
    title: string;
    issueCount: number;
    criticalIssues: number;
    loadTime?: number;
  }[];
  issueCategories: {
    [category: string]: number;
  };
  recommendations: string[];
}

export class PDFReportGenerator {
  private chartRenderer: ChartJSNodeCanvas;
  private readonly BRAND_COLORS = {
    primary: '#2563eb', // Blue
    secondary: '#64748b', // Slate
    success: '#16a34a', // Green
    warning: '#ea580c', // Orange
    danger: '#dc2626', // Red
    accent: '#7c3aed', // Purple
  };

  constructor() {
    this.chartRenderer = new ChartJSNodeCanvas({
      width: 800,
      height: 400,
      backgroundColour: 'white',
      plugins: {
        modern: ['chartjs-adapter-date-fns'],
      },
    });
  }

  /**
   * Process raw scan data into structured PDF data
   */
  public processScanData(scanData: ScanData): PDFData {
    const issues = this.extractIssuesFromScan(scanData);
    const severityBreakdown = this.calculateSeverityBreakdown(issues);
    const complianceScore = this.calculateComplianceScore(issues, scanData.pagesScanned);
    const wcagCompliance = this.calculateWCAGCompliance(issues);
    const pageBreakdown = this.calculatePageBreakdown(scanData.pages || []);
    const issueCategories = this.categorizeIssues(issues);
    const recommendations = this.generateRecommendations(issues, severityBreakdown);

    return {
      scanData,
      complianceScore,
      severityBreakdown,
      wcagCompliance,
      pageBreakdown,
      issueCategories,
      recommendations,
    };
  }

  /**
   * Generate compliance score chart
   */
  public async generateComplianceChart(complianceScore: number): Promise<Buffer> {
    const configuration = {
      type: 'doughnut' as const,
      data: {
        labels: ['Compliant', 'Issues Found'],
        datasets: [
          {
            data: [complianceScore, 100 - complianceScore],
            backgroundColor: [this.BRAND_COLORS.success, this.BRAND_COLORS.danger],
            borderWidth: 0,
          },
        ],
      },
      options: {
        responsive: false,
        plugins: {
          legend: {
            position: 'bottom' as const,
            labels: {
              usePointStyle: true,
              padding: 20,
              font: {
                size: 14,
                family: 'Arial',
              },
            },
          },
          title: {
            display: true,
            text: `Overall Compliance Score: ${complianceScore.toFixed(1)}%`,
            font: {
              size: 18,
              weight: 'bold' as const,
              family: 'Arial',
            },
            padding: {
              top: 10,
              bottom: 30,
            },
          },
        },
        cutout: '60%',
      },
    };

    return await this.chartRenderer.renderToBuffer(configuration as any);
  }

  /**
   * Generate severity breakdown chart
   */
  public async generateSeverityChart(severityBreakdown: PDFData['severityBreakdown']): Promise<Buffer> {
    const configuration = {
      type: 'bar' as const,
      data: {
        labels: ['Critical', 'Serious', 'Moderate', 'Minor'],
        datasets: [
          {
            label: 'Number of Issues',
            data: [
              severityBreakdown.critical,
              severityBreakdown.serious,
              severityBreakdown.moderate,
              severityBreakdown.minor,
            ],
            backgroundColor: [
              this.BRAND_COLORS.danger,
              '#f97316', // Orange-500
              this.BRAND_COLORS.warning,
              '#eab308', // Yellow-500
            ],
            borderWidth: 1,
            borderColor: '#ffffff',
          },
        ],
      },
      options: {
        responsive: false,
        plugins: {
          legend: {
            display: false,
          },
          title: {
            display: true,
            text: 'Issues by Severity Level',
            font: {
              size: 16,
              weight: 'bold' as const,
              family: 'Arial',
            },
            padding: {
              top: 10,
              bottom: 30,
            },
          },
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              stepSize: 1,
              font: {
                size: 12,
                family: 'Arial',
              },
            },
            grid: {
              color: '#e5e7eb',
            },
          },
          x: {
            ticks: {
              font: {
                size: 12,
                family: 'Arial',
              },
            },
            grid: {
              display: false,
            },
          },
        },
      },
    };

    return await this.chartRenderer.renderToBuffer(configuration as any);
  }

  /**
   * Generate issue categories chart
   */
  public async generateCategoriesChart(issueCategories: { [category: string]: number }): Promise<Buffer> {
    const categories = Object.keys(issueCategories);
    const counts = Object.values(issueCategories);
    
    const colors = [
      this.BRAND_COLORS.primary,
      this.BRAND_COLORS.accent,
      this.BRAND_COLORS.secondary,
      this.BRAND_COLORS.warning,
      '#06b6d4', // Cyan-500
      '#84cc16', // Lime-500
      '#f59e0b', // Amber-500
      '#ef4444', // Red-500
    ];

    const configuration = {
      type: 'pie' as const,
      data: {
        labels: categories,
        datasets: [
          {
            data: counts,
            backgroundColor: colors.slice(0, categories.length),
            borderWidth: 2,
            borderColor: '#ffffff',
          },
        ],
      },
      options: {
        responsive: false,
        plugins: {
          legend: {
            position: 'right' as const,
            labels: {
              usePointStyle: true,
              padding: 15,
              font: {
                size: 12,
                family: 'Arial',
              },
            },
          },
          title: {
            display: true,
            text: 'Issues by Category',
            font: {
              size: 16,
              weight: 'bold' as const,
              family: 'Arial',
            },
            padding: {
              top: 10,
              bottom: 30,
            },
          },
        },
      },
    };

    return await this.chartRenderer.renderToBuffer(configuration as any);
  }

  private extractIssuesFromScan(scanData: ScanData): IssueData[] {
    const issues: IssueData[] = [];

    // Extract from main results
    if (scanData.results?.violations) {
      issues.push(...scanData.results.violations);
    }

    // Extract from pages
    if (scanData.pages) {
      scanData.pages.forEach(page => {
        if (page.issues && Array.isArray(page.issues)) {
          issues.push(...page.issues);
        }
      });
    }

    return issues;
  }

  private calculateSeverityBreakdown(issues: IssueData[]): PDFData['severityBreakdown'] {
    const breakdown = {
      critical: 0,
      serious: 0,
      moderate: 0,
      minor: 0,
    };

    issues.forEach(issue => {
      switch (issue.type) {
        case 'error':
          if (issue.code?.includes('color-contrast') || issue.code?.includes('keyboard')) {
            breakdown.critical++;
          } else {
            breakdown.serious++;
          }
          break;
        case 'warning':
          breakdown.moderate++;
          break;
        case 'notice':
          breakdown.minor++;
          break;
        default:
          breakdown.moderate++;
      }
    });

    return breakdown;
  }

  private calculateComplianceScore(issues: IssueData[], pagesScanned: number): number {
    if (issues.length === 0) return 100;
    
    // Calculate based on critical and serious issues
    const criticalIssues = issues.filter(i => i.type === 'error').length;
    const totalPossibleIssues = Math.max(pagesScanned * 10, 1); // Estimate
    
    return Math.max(0, Math.min(100, 100 - (criticalIssues / totalPossibleIssues) * 100));
  }

  private calculateWCAGCompliance(issues: IssueData[]): PDFData['wcagCompliance'] {
    // Simplified WCAG compliance calculation
    const criticalIssues = issues.filter(i => i.type === 'error').length;
    const totalCriteria = 61; // WCAG 2.1 AA criteria count
    const passedCriteria = Math.max(0, totalCriteria - criticalIssues);
    
    return {
      level: 'AA',
      passedCriteria,
      totalCriteria,
      percentage: (passedCriteria / totalCriteria) * 100,
    };
  }

  private calculatePageBreakdown(pages: PageData[]): PDFData['pageBreakdown'] {
    return pages.map(page => {
      const baseResult = {
        url: page.pageUrl,
        title: page.pageTitle || 'Untitled Page',
        issueCount: page.issues?.length || 0,
        criticalIssues: page.issues?.filter(i => i.type === 'error').length || 0,
      };
      
      if (page.loadTime !== null && page.loadTime !== undefined) {
        return { ...baseResult, loadTime: page.loadTime };
      }
      return baseResult;
    });
  }

  private categorizeIssues(issues: IssueData[]): { [category: string]: number } {
    const categories: { [category: string]: number } = {};

    issues.forEach(issue => {
      let category = 'Other';

      // Categorize by rule code patterns
      if (issue.code?.includes('color') || issue.code?.includes('contrast')) {
        category = 'Color & Contrast';
      } else if (issue.code?.includes('keyboard') || issue.code?.includes('focus')) {
        category = 'Keyboard Navigation';
      } else if (issue.code?.includes('alt') || issue.code?.includes('image')) {
        category = 'Images & Media';
      } else if (issue.code?.includes('form') || issue.code?.includes('label') || issue.code?.includes('input')) {
        category = 'Forms';
      } else if (issue.code?.includes('heading') || issue.code?.includes('landmark')) {
        category = 'Structure';
      } else if (issue.code?.includes('link') || issue.code?.includes('button')) {
        category = 'Interactive Elements';
      }

      categories[category] = (categories[category] || 0) + 1;
    });

    return categories;
  }

  private generateRecommendations(
    issues: IssueData[],
    severityBreakdown: PDFData['severityBreakdown']
  ): string[] {
    const recommendations: string[] = [];

    if (severityBreakdown.critical > 0) {
      recommendations.push(
        'Address critical accessibility barriers immediately as they prevent users with disabilities from accessing your content.'
      );
    }

    if (severityBreakdown.serious > 0) {
      recommendations.push(
        'Fix serious accessibility issues to improve user experience for people with disabilities.'
      );
    }

    // Category-specific recommendations
    const categories = this.categorizeIssues(issues);
    
    if (categories['Color & Contrast'] && categories['Color & Contrast'] > 0) {
      recommendations.push(
        'Improve color contrast ratios to meet WCAG AA standards (4.5:1 for normal text, 3:1 for large text).'
      );
    }

    if (categories['Keyboard Navigation'] && categories['Keyboard Navigation'] > 0) {
      recommendations.push(
        'Ensure all interactive elements are keyboard accessible and have visible focus indicators.'
      );
    }

    if (categories['Images & Media'] && categories['Images & Media'] > 0) {
      recommendations.push(
        'Add descriptive alternative text for all images and multimedia content.'
      );
    }

    if (categories['Forms'] && categories['Forms'] > 0) {
      recommendations.push(
        'Provide clear labels and instructions for all form fields and error handling.'
      );
    }

    if (categories['Structure'] && categories['Structure'] > 0) {
      recommendations.push(
        'Use proper heading hierarchy and semantic HTML structure for better navigation.'
      );
    }

    // General recommendations
    if (recommendations.length === 0) {
      recommendations.push('Continue monitoring accessibility to maintain compliance standards.');
    } else {
      recommendations.push(
        'Consider implementing an ongoing accessibility testing process to catch issues early.',
        'Provide accessibility training for your development and content teams.',
        'Conduct regular user testing with people who use assistive technologies.'
      );
    }

    return recommendations.slice(0, 8); // Limit to 8 recommendations for PDF space
  }
}