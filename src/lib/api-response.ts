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
  const response: APISuccess<T> = {
    success: true,
    data,
  };
  
  if (message !== undefined) {
    response.message = message;
  }
  
  res.status(statusCode).json(response);
}

export function sendError(
  res: NextApiResponse<APIResponse>,
  error: string,
  statusCode = 400,
  code?: string,
  details?: any
): void {
  const response: APIError = {
    success: false,
    error,
  };
  
  if (code !== undefined) {
    response.code = code;
  }
  
  if (details !== undefined) {
    response.details = details;
  }
  
  res.status(statusCode).json(response);
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