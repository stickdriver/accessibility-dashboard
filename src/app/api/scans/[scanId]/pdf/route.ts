import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../../../convex/_generated/api";
import { PDFService } from "../../../../../lib/pdf-service";

// Initialize ConvexHttpClient with fallback for build time
const getConvexClient = () => {
  let url = process.env.NEXT_PUBLIC_CONVEX_URL;
  
  // Fallback to CONVEX_DEPLOYMENT if NEXT_PUBLIC_CONVEX_URL is not available
  if (!url && process.env.CONVEX_DEPLOYMENT) {
    url = `https://${process.env.CONVEX_DEPLOYMENT}.convex.cloud`;
  }
  
  if (!url) {
    throw new Error("NEXT_PUBLIC_CONVEX_URL environment variable is not set");
  }
  return new ConvexHttpClient(url);
};

export async function GET(
  request: NextRequest,
  { params }: { params: { scanId: string } }
) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { scanId } = params;

    if (!scanId) {
      return NextResponse.json({ error: "Scan ID is required" }, { status: 400 });
    }

    // Get scan from Convex
    const convex = getConvexClient();
    const scan = await convex.query(api.scans.getScanById, { 
      scanId: scanId as any,
      clerkUserId: userId
    });

    if (!scan) {
      return NextResponse.json({ error: "Scan not found" }, { status: 404 });
    }

    // Check if scan is completed
    if (scan.status !== "completed") {
      return NextResponse.json(
        { error: "Scan must be completed before generating PDF report" }, 
        { status: 400 }
      );
    }

    // Initialize PDF service
    const pdfService = new PDFService();

    // Validate scan data
    if (!pdfService.validateScanData(scan)) {
      return NextResponse.json(
        { error: "Invalid scan data format" }, 
        { status: 400 }
      );
    }

    // Check for format parameter
    const url = new URL(request.url);
    const format = url.searchParams.get("format") === "letter" ? "Letter" : "A4";
    const filename = `accessibility-report-${scan.websiteUrl.replace(/https?:\/\//, '').replace(/[^a-z0-9]/gi, '-')}-${scanId.slice(-8)}.pdf`;

    console.log(`Generating PDF report for scan ${scanId}...`);
    const startTime = Date.now();

    // Generate PDF report
    const pdfBuffer = await pdfService.generateAccessibilityReport(scan, {
      format: format as 'A4' | 'Letter',
    });

    const generationTime = Date.now() - startTime;
    console.log(`PDF generated in ${generationTime}ms, size: ${(pdfBuffer.length / 1024).toFixed(1)}KB`);

    // Track PDF generation analytics
    try {
      await convex.mutation(api.analytics.insert, {
        eventType: "pdf_downloaded",
        clerkUserId: userId,
        metadata: {
          scanId: scanId,
          websiteUrl: scan.websiteUrl,
          fileSize: pdfBuffer.length,
          generationTime,
          format,
          totalIssues: scan.totalIssues,
          pagesScanned: scan.pagesScanned,
        },
        timestamp: Date.now(),
      });

      // Update usage tracking
      await convex.mutation(api.usage.incrementUsageMutation, {
        clerkUserId: userId,
        metric: "pdfDownloads",
        amount: 1,
      });
    } catch (analyticsError) {
      console.error("Failed to track PDF generation analytics:", analyticsError);
      // Don't fail the request for analytics errors
    }

    // Return PDF as downloadable file
    return new Response(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': pdfBuffer.length.toString(),
        'Cache-Control': 'private, no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });

  } catch (error) {
    console.error("Error generating PDF:", error);
    
    // Return appropriate error based on error type
    if (error instanceof Error) {
      if (error.message.includes('timeout')) {
        return NextResponse.json(
          { error: "PDF generation timed out. Please try again." }, 
          { status: 408 }
        );
      }
      if (error.message.includes('memory')) {
        return NextResponse.json(
          { error: "Insufficient resources to generate PDF. Please contact support." }, 
          { status: 507 }
        );
      }
    }

    return NextResponse.json(
      { error: "Failed to generate PDF report" }, 
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { scanId: string } }
) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { scanId } = params;
    const body = await request.json();
    const { options = {} } = body;

    if (!scanId) {
      return NextResponse.json({ error: "Scan ID is required" }, { status: 400 });
    }

    // Get scan from Convex
    const convex = getConvexClient();
    const scan = await convex.query(api.scans.getScanById, { 
      scanId: scanId as any,
      clerkUserId: userId
    });

    if (!scan) {
      return NextResponse.json({ error: "Scan not found" }, { status: 404 });
    }

    if (scan.status !== "completed") {
      return NextResponse.json(
        { error: "Scan must be completed before generating PDF report" }, 
        { status: 400 }
      );
    }

    // Initialize PDF service
    const pdfService = new PDFService();

    // Get generation statistics
    const stats = await pdfService.getGenerationStats(scan);

    return NextResponse.json({
      success: true,
      data: {
        scanId,
        websiteUrl: scan.websiteUrl,
        totalIssues: scan.totalIssues,
        pagesScanned: scan.pagesScanned,
        estimations: stats,
        downloadUrl: `/api/scans/${scanId}/pdf`,
        previewUrl: `/api/scans/${scanId}/pdf?preview=true`,
      }
    });

  } catch (error) {
    console.error("Error getting PDF info:", error);
    return NextResponse.json(
      { error: "Failed to get PDF information" }, 
      { status: 500 }
    );
  }
}