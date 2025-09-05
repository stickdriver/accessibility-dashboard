// Canvas dependencies removed - using HTML/CSS visuals instead

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
  categoryBreakdown: {
    name: string;
    description: string;
    count: number;
  }[];
  recommendations: string[];
}

export class PDFReportGenerator {

  constructor() {
    // Canvas dependency removed - using HTML/CSS visuals instead
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
    const categoryBreakdown = this.generateCategoryBreakdown(issueCategories);
    const recommendations = this.generateRecommendations(issues, severityBreakdown);

    return {
      scanData,
      complianceScore,
      severityBreakdown,
      wcagCompliance,
      pageBreakdown,
      issueCategories,
      categoryBreakdown,
      recommendations,
    };
  }

  /**
   * Generate category breakdown for visual display
   */
  private generateCategoryBreakdown(issueCategories: { [category: string]: number }): PDFData['categoryBreakdown'] {
    return Object.entries(issueCategories).map(([name, count]) => ({
      name,
      description: this.getCategoryDescription(name),
      count,
    }));
  }
  
  private getCategoryDescription(categoryName: string): string {
    const descriptions: { [key: string]: string } = {
      'Color & Contrast': 'Issues with color contrast ratios and visual accessibility',
      'Keyboard Navigation': 'Problems with keyboard access and focus management',
      'Images & Media': 'Missing alt text and media accessibility issues',
      'Forms': 'Form labels, validation, and input accessibility problems',
      'Structure': 'Heading hierarchy and semantic structure issues',
      'Interactive Elements': 'Button, link, and interactive component problems',
      'Other': 'Miscellaneous accessibility issues'
    };
    return descriptions[categoryName] || 'Accessibility issues in this category';
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