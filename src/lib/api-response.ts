import { NextApiResponse } from "next";

export interface APISuccess<T = any> {
  success: true;
  data: T;
  message?: string;
}

export interface APIError {
  success: false;
  error: string;
  code?: string;
  details?: any;
}

export type APIResponse<T = any> = APISuccess<T> | APIError;

export function sendSuccess<T>(
  res: NextApiResponse<APIResponse<T>>,
  data: T,
  message?: string,
  statusCode = 200
): void {
  res.status(statusCode).json({
    success: true,
    data,
    message,
  });
}

export function sendError(
  res: NextApiResponse<APIResponse>,
  error: string,
  statusCode = 400,
  code?: string,
  details?: any
): void {
  res.status(statusCode).json({
    success: false,
    error,
    code,
    details,
  });
}

export function handleAPIError(
  res: NextApiResponse<APIResponse>,
  error: unknown,
  defaultMessage = "Internal server error"
): void {
  console.error("API Error:", error);

  if (error instanceof Error) {
    if (error.message === "Authentication required") {
      sendError(res, "Authentication required", 401, "AUTH_REQUIRED");
      return;
    }
    
    if (error.message === "Admin access required") {
      sendError(res, "Admin access required", 403, "ADMIN_REQUIRED");
      return;
    }
    
    sendError(res, error.message, 400, "VALIDATION_ERROR");
    return;
  }

  sendError(res, defaultMessage, 500, "INTERNAL_ERROR");
}