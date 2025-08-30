/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable React strict mode for better development experience
  reactStrictMode: true,

  // Enable SWC minification for better performance
  swcMinify: true,

  // Experimental features
  experimental: {
    // Enable server components
    serverComponentsExternalPackages: [],
    
    // Enable optimized package imports
    optimizePackageImports: [
      'lucide-react',
      '@tanstack/react-query',
      '@tanstack/react-table',
      'recharts'
    ]
  },

  // Environment variables to expose to the browser
  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY,
  },

  // Image optimization configuration
  images: {
    domains: [],
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },

  // Headers for security and performance
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          // Security headers
          {
            key: 'X-Frame-Options',
            value: 'DENY'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin'
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()'
          },
          // Cache headers for static assets
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable'
          }
        ]
      },
      {
        source: '/api/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store, must-revalidate'
          }
        ]
      }
    ];
  },

  // Rewrites for API proxy (if needed)
  async rewrites() {
    // Only add rewrite if SCANNER_SERVICE_URL is configured
    if (process.env.SCANNER_SERVICE_URL) {
      return [
        // Proxy scanner service API calls
        {
          source: '/scanner-api/:path*',
          destination: `${process.env.SCANNER_SERVICE_URL}/api/:path*`
        }
      ];
    }
    return [];
  },

  // Redirects
  async redirects() {
    return [
      // No redirects for now - let pages handle their own routing
    ];
  },

  // Bundle analyzer (only in development/CI)
  ...(process.env.ANALYZE === 'true' && {
    webpack: (config) => {
      if (process.env.ANALYZE === 'true') {
        const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');
        config.plugins.push(
          new BundleAnalyzerPlugin({
            analyzerMode: 'static',
            openAnalyzer: false,
            reportFilename: '../bundle-analyzer-report.html'
          })
        );
      }
      return config;
    }
  }),

  // Output configuration
  output: 'standalone',
  
  // Compression
  compress: true,

  // Performance optimizations
  optimizeFonts: true,
  
  // TypeScript configuration
  typescript: {
    // Dangerously allow production builds to successfully complete even if
    // your project has type errors (not recommended for production)
    ignoreBuildErrors: false,
  },

  // ESLint configuration
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors (not recommended for production)
    ignoreDuringBuilds: false,
  },

  // Server-side runtime configuration
  serverRuntimeConfig: {
    // Will only be available on the server side
    scannerServiceToken: process.env.SCANNER_SERVICE_TOKEN,
    clerkSecretKey: process.env.CLERK_SECRET_KEY,
  },

  // Public runtime configuration
  publicRuntimeConfig: {
    // Will be available on both server and client
    dashboardTitle: process.env.DASHBOARD_TITLE || 'Accessibility Scanner Dashboard',
    companyName: process.env.COMPANY_NAME || 'Accessibility Scanner',
    enableAnalytics: process.env.ENABLE_ANALYTICS === 'true',
  },

  // Logging configuration
  logging: {
    fetches: {
      fullUrl: process.env.NODE_ENV === 'development',
    },
  },

  // Development configuration
  ...(process.env.NODE_ENV === 'development' && {
    // Enable source maps in development
    productionBrowserSourceMaps: false,
    
    // Disable x-powered-by header
    poweredByHeader: false,
    
    // Development-specific optimizations
    onDemandEntries: {
      // Period (in ms) where the server will keep pages in the buffer
      maxInactiveAge: 25 * 1000,
      // Number of pages that should be kept simultaneously without being disposed
      pagesBufferLength: 2,
    },
  }),

  // Production optimizations
  ...(process.env.NODE_ENV === 'production' && {
    // Disable source maps in production for security
    productionBrowserSourceMaps: false,
    
    // Optimize for production
    optimizeCss: true,
    
    // Generate build ID for cache invalidation
    generateBuildId: async () => {
      // Use git commit hash as build ID
      return process.env.VERCEL_GIT_COMMIT_SHA || 
             process.env.GITHUB_SHA || 
             `build-${Date.now()}`;
    },
  }),
};

// Validate required environment variables
const requiredEnvVars = [
  'NEXT_PUBLIC_CONVEX_URL',
  'CLERK_SECRET_KEY'
];

// Optional environment variables for full functionality (logged but don't break build)
const optionalEnvVars = [
  'SCANNER_SERVICE_URL'
];

// Log missing optional environment variables
for (const envVar of optionalEnvVars) {
  if (!process.env[envVar]) {
    console.warn(`Optional environment variable missing: ${envVar} - some features may be limited`);
  }
}

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    console.warn(`Missing required environment variable: ${envVar}`);
    // Don't throw during build to allow development setup
    if (process.env.NODE_ENV === 'production') {
      throw new Error(`Missing required environment variable: ${envVar}`);
    }
  }
}

module.exports = nextConfig;