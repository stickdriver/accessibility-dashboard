import { NextRequest, NextResponse } from 'next/server';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '../../../../../convex/_generated/api';

function getConvexClient() {
  const convexUrl = process.env.CONVEX_URL || process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!convexUrl) {
    throw new Error('Convex URL not configured');
  }
  return new ConvexHttpClient(convexUrl);
}

// Seed data from the existing hardcoded guidance
const seedGuidance = [
  {
    ruleCode: 'button-name',
    title: 'Button Missing Accessible Name',
    guidance: 'Ensure all buttons have accessible names using aria-label, aria-labelledby, or visible text content.',
    category: 'buttons',
    wcagReference: '4.1.2 Name, Role, Value',
    severity: 'serious'
  },
  {
    ruleCode: 'color-contrast',
    title: 'Insufficient Color Contrast',
    guidance: 'Increase contrast between text and background colors to meet WCAG AA standards (4.5:1 for normal text, 3:1 for large text).',
    category: 'visual',
    wcagReference: '1.4.3 Contrast (Minimum)',
    severity: 'serious'
  },
  {
    ruleCode: 'heading-order',
    title: 'Incorrect Heading Order',
    guidance: 'Use headings in hierarchical order (h1, h2, h3, etc.) without skipping levels.',
    category: 'structure',
    wcagReference: '1.3.1 Info and Relationships',
    severity: 'moderate'
  },
  {
    ruleCode: 'image-alt',
    title: 'Image Missing Alt Text',
    guidance: 'Add meaningful alt text to images, or use alt="" for decorative images.',
    category: 'images',
    wcagReference: '1.1.1 Non-text Content',
    severity: 'serious'
  },
  {
    ruleCode: 'label',
    title: 'Form Input Missing Label',
    guidance: 'Ensure all form inputs have associated labels using <label> elements or aria-label attributes.',
    category: 'forms',
    wcagReference: '1.3.1 Info and Relationships',
    severity: 'serious'
  },
  {
    ruleCode: 'link-name',
    title: 'Link Missing Accessible Name',
    guidance: 'Provide descriptive text for links using the link text itself or aria-label attributes.',
    category: 'links',
    wcagReference: '4.1.2 Name, Role, Value',
    severity: 'serious'
  },
  {
    ruleCode: 'aria-valid-attr-value',
    title: 'Invalid ARIA Attribute Value',
    guidance: 'Ensure ARIA attributes have valid values according to the ARIA specification.',
    category: 'aria',
    wcagReference: '4.1.2 Name, Role, Value',
    severity: 'serious'
  }
];

export async function POST(_request: NextRequest) {
  try {
    const convex = getConvexClient();
    // Insert the seed data
    const result = await convex.mutation(api.remediationGuides.bulkInsert, {
      guides: seedGuidance
    });
    
    return NextResponse.json({
      success: true,
      message: 'Remediation guides seeded successfully',
      result
    });
    
  } catch (error) {
    console.error('Error seeding remediation guides:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to seed remediation guides',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// GET endpoint to check current status
export async function GET() {
  try {
    const convex = getConvexClient();
    const guides = await convex.query(api.remediationGuides.getAllActive, {});
    
    return NextResponse.json({
      success: true,
      totalGuides: guides.length,
      guides: guides.map(g => ({
        ruleCode: g.ruleCode,
        title: g.title,
        category: g.category,
        lastUpdated: g.lastUpdated
      }))
    });
    
  } catch (error) {
    console.error('Error fetching remediation guides:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch remediation guides' 
      },
      { status: 500 }
    );
  }
}