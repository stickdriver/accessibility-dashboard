// Enhanced source mapping for accessibility issues
// This provides detailed source code context for each accessibility violation

interface EnhancedSourceInfo {
  // Basic axe data
  target: string;
  html: string;
  failureSummary: string;
  
  // Enhanced source mapping
  lineNumber?: number;
  columnNumber?: number;
  contextLines?: string[];
  sourceFile?: string;
  componentName?: string;
  
  // CSS/Style information
  computedStyles?: Record<string, string>;
  cssRules?: string[];
  
  // Fix suggestions
  suggestedFix?: string;
  fixedHtml?: string;
  
  // Additional context
  parentElements?: string[];
  siblingElements?: string[];
}

export function enhanceAxeViolations(violations: any[]): any[] {
  return violations.map(violation => ({
    id: violation.id,
    impact: violation.impact,
    description: violation.description,
    help: violation.help,
    helpUrl: violation.helpUrl,
    wcagLevel: extractWcagLevel(violation.tags),
    nodes: violation.nodes.map((node: any) => enhanceNodeInfo(node, violation.id)),
    remediation: generateDetailedRemediation(violation.id),
    codeExamples: generateCodeExamples(violation.id),
  }));
}

function enhanceNodeInfo(node: any, violationId: string): EnhancedSourceInfo {
  const enhanced: EnhancedSourceInfo = {
    target: node.target[0],
    html: node.html,
    failureSummary: node.failureSummary,
  };

  // Add line numbers if available (from DOM inspection)
  enhanced.lineNumber = extractLineNumber(node.html);
  
  // Extract component context (React/Vue patterns)
  enhanced.componentName = extractComponentName(node.target[0]);
  
  // Get computed styles for styling issues
  if (isStyleRelatedViolation(violationId)) {
    enhanced.computedStyles = extractRelevantStyles(node, violationId);
  }
  
  // Generate contextual information
  enhanced.contextLines = generateContextLines(node.html);
  enhanced.parentElements = extractParentContext(node.target[0]);
  
  // Generate fix suggestions
  enhanced.suggestedFix = generateSpecificFix(violationId, node);
  enhanced.fixedHtml = generateFixedHtml(violationId, node.html);

  return enhanced;
}

function extractLineNumber(html: string): number | undefined {
  // In a real implementation, this would use source maps or DOM position
  // For now, we'll use a heuristic based on the HTML structure
  const lines = html.split('\n');
  return lines.length > 1 ? 1 : undefined;
}

function extractComponentName(selector: string): string | undefined {
  // Look for React component patterns in selectors
  const reactPatterns = [
    /\[data-testid="([^"]+)"\]/,
    /\.([A-Z][a-zA-Z0-9]*)/,
    /\#([A-Z][a-zA-Z0-9]*)/
  ];
  
  for (const pattern of reactPatterns) {
    const match = selector.match(pattern);
    if (match) {
      return match[1];
    }
  }
  
  return undefined;
}

function isStyleRelatedViolation(violationId: string): boolean {
  const styleViolations = [
    'color-contrast',
    'focus-order-semantics',
    'target-size',
    'color-contrast-enhanced'
  ];
  return styleViolations.includes(violationId);
}

function extractRelevantStyles(node: any, violationId: string): Record<string, string> {
  // This would extract computed styles relevant to the violation
  const relevantProperties: Record<string, string[]> = {
    'color-contrast': ['color', 'background-color', 'font-size', 'font-weight'],
    'target-size': ['width', 'height', 'padding', 'margin'],
    'focus-order-semantics': ['outline', 'border', 'box-shadow']
  };

  const properties = relevantProperties[violationId] || [];
  const styles: Record<string, string> = {};
  
  // In a real implementation, this would get computed styles from the DOM
  properties.forEach(prop => {
    styles[prop] = 'auto'; // Placeholder
  });

  return styles;
}

function generateContextLines(html: string): string[] {
  // Generate context lines around the problematic element
  const lines = html.split('\n');
  const contextSize = 3;
  
  if (lines.length <= 1) {
    return [html];
  }
  
  // Return a few lines around the main element for context
  return lines.slice(0, Math.min(contextSize, lines.length));
}

function extractParentContext(selector: string): string[] {
  // Extract parent element information from CSS selector
  const parts = selector.split(' > ');
  return parts.slice(0, -1); // All but the last (target) element
}

function generateSpecificFix(violationId: string, node: any): string {
  const fixes: Record<string, string> = {
    'image-alt': 'Add alt attribute: alt="[descriptive text]"',
    'color-contrast': 'Increase contrast ratio to at least 4.5:1 for normal text',
    'heading-order': 'Use heading tags in logical order (h1→h2→h3)',
    'link-name': 'Add descriptive text or aria-label attribute',
    'form-field-multiple-labels': 'Ensure each input has exactly one associated label',
    'button-name': 'Add accessible text via textContent or aria-label',
    'aria-roles': 'Use semantic HTML or correct ARIA role',
    'keyboard-navigation': 'Add tabindex="0" and keyboard event handlers',
  };

  return fixes[violationId] || 'Review accessibility guidelines for this issue';
}

function generateFixedHtml(violationId: string, originalHtml: string): string {
  // Generate corrected HTML examples
  const fixes: Record<string, (html: string) => string> = {
    'image-alt': (html) => {
      if (html.includes('<img') && !html.includes('alt=')) {
        return html.replace('<img', '<img alt="[Add descriptive text here]"');
      }
      return html;
    },
    'link-name': (html) => {
      if (html.includes('<a') && !html.includes('>') && html.includes('</a>')) {
        return html.replace('></a>', '>Link text</a>');
      }
      return html;
    },
    'button-name': (html) => {
      if (html.includes('<button') && html.includes('></button>')) {
        return html.replace('></button>', '>Button text</button>');
      }
      return html;
    }
  };

  const fixFunction = fixes[violationId];
  return fixFunction ? fixFunction(originalHtml) : originalHtml;
}

function generateDetailedRemediation(violationId: string): any {
  const remediations: Record<string, any> = {
    'color-contrast': {
      summary: 'Ensure sufficient color contrast',
      steps: [
        'Check contrast ratio using browser dev tools or online tools',
        'Aim for at least 4.5:1 for normal text, 3:1 for large text',
        'Consider users with color vision deficiencies',
        'Test with actual users if possible'
      ],
      tools: ['WebAIM Contrast Checker', 'Chrome DevTools', 'Colour Contrast Analyser'],
      wcagReference: 'WCAG 2.1 AA 1.4.3'
    },
    'image-alt': {
      summary: 'Provide alternative text for images',
      steps: [
        'Describe the content and function of the image',
        'Keep descriptions concise but informative',
        'Use alt="" for decorative images',
        'Avoid phrases like "image of" or "picture of"'
      ],
      tools: ['axe DevTools', 'WAVE', 'Screen reader testing'],
      wcagReference: 'WCAG 2.1 A 1.1.1'
    }
  };

  return remediations[violationId] || {
    summary: 'Address accessibility issue',
    steps: ['Review the specific accessibility guideline'],
    tools: ['axe DevTools'],
    wcagReference: 'WCAG 2.1'
  };
}

function generateCodeExamples(violationId: string): any {
  const examples: Record<string, any> = {
    'image-alt': {
      incorrect: '<img src="logo.png">',
      correct: '<img src="logo.png" alt="Company Logo">',
      react: '<img src="logo.png" alt="Company Logo" />',
      vue: '<img :src="logoUrl" :alt="logoAlt" />'
    },
    'color-contrast': {
      incorrect: 'color: #999; background: #ccc;',
      correct: 'color: #333; background: #fff;',
      css: `
.button {
  color: #ffffff;
  background-color: #0066cc;
  /* Contrast ratio: 4.5:1 ✓ */
}`
    }
  };

  return examples[violationId] || {};
}

function extractWcagLevel(tags: string[]): string {
  if (tags.includes('wcag2aaa')) return 'AAA';
  if (tags.includes('wcag2aa')) return 'AA';  
  if (tags.includes('wcag2a')) return 'A';
  return 'Unknown';
}

// Export for use in scanner
export type { EnhancedSourceInfo };