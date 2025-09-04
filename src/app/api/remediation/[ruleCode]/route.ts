import { NextRequest, NextResponse } from 'next/server';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '../../../../../convex/_generated/api';

const convexUrl = process.env.CONVEX_URL!;
const convex = new ConvexHttpClient(convexUrl);

// In-memory cache for remediation guides
const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_DURATION = 1000 * 60 * 30; // 30 minutes

async function getCachedGuide(ruleCode: string) {
  const cached = cache.get(ruleCode);
  const now = Date.now();
  
  if (cached && (now - cached.timestamp) < CACHE_DURATION) {
    return cached.data;
  }
  
  try {
    const guide = await convex.query(api.remediationGuides.getByRuleCode, { 
      ruleCode 
    });
    
    cache.set(ruleCode, {
      data: guide,
      timestamp: now
    });
    
    return guide;
  } catch (error) {
    console.error('Error fetching remediation guide:', error);
    return null;
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { ruleCode: string } }
) {
  try {
    const { ruleCode } = params;
    
    if (!ruleCode) {
      return NextResponse.json(
        { success: false, error: 'Rule code is required' },
        { status: 400 }
      );
    }
    
    const cleanRuleCode = ruleCode.includes('.') 
      ? ruleCode.split('.').pop()?.toLowerCase() || ruleCode.toLowerCase()
      : ruleCode.toLowerCase();
    
    const guide = await getCachedGuide(cleanRuleCode);
    
    if (!guide) {
      return NextResponse.json({
        success: false,
        error: 'Guide not found',
        ruleCode: cleanRuleCode,
        guidance: null,
        metadata: {
          source: 'database',
          cached: false,
          timestamp: Date.now()
        }
      }, { status: 404 });
    }
    
    return NextResponse.json({
      success: true,
      ruleCode: cleanRuleCode,
      guidance: {
        title: guide.title,
        text: guide.guidance,
        category: guide.category,
        wcagReference: guide.wcagReference,
        severity: guide.severity
      },
      metadata: {
        source: 'database',
        cached: cache.has(cleanRuleCode),
        lastUpdated: guide.lastUpdated,
        timestamp: Date.now()
      }
    });
    
  } catch (error) {
    console.error('API error in remediation guide:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}