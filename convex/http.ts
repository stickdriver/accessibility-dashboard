import { httpRouter } from "convex/server";
import { updateScanProgress } from "./scanProgress";

const http = httpRouter();

// Route for progress updates
http.route({
  path: "/updateScanProgress",
  method: "POST",
  handler: updateScanProgress,
});

// Also allow it on the original path for backward compatibility
http.route({
  path: "/scanProgress/updateScanProgress", 
  method: "POST",
  handler: updateScanProgress,
});

export default http;