/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";
import type * as accessibilityScanner from "../accessibilityScanner.js";
import type * as asyncAccessibilityScanner from "../asyncAccessibilityScanner.js";
import type * as http from "../http.js";
import type * as pdf from "../pdf.js";
import type * as remediationGuides from "../remediationGuides.js";
import type * as scanProcessor from "../scanProcessor.js";
import type * as scanProgress from "../scanProgress.js";
import type * as scanQueue from "../scanQueue.js";
import type * as scans from "../scans.js";
import type * as sourceMapping from "../sourceMapping.js";
import type * as usage from "../usage.js";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  accessibilityScanner: typeof accessibilityScanner;
  asyncAccessibilityScanner: typeof asyncAccessibilityScanner;
  http: typeof http;
  pdf: typeof pdf;
  remediationGuides: typeof remediationGuides;
  scanProcessor: typeof scanProcessor;
  scanProgress: typeof scanProgress;
  scanQueue: typeof scanQueue;
  scans: typeof scans;
  sourceMapping: typeof sourceMapping;
  usage: typeof usage;
}>;
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;
