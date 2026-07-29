/**
 * Helper functions for extracting and displaying API error messages
 */

export interface ApiErrorResponse {
  detail?: string;
  message?: string;
  title?: string;
  errorCode?: string;
  errors?: Record<string, string | string[]>;
  [key: string]: unknown;
}

/**
 * Extracts the main error message from an API error response
 * Checks for detail, message, title fields in that order
 */
export function getApiErrorMessage(errorResponse: ApiErrorResponse | unknown): string {
  if (!errorResponse || typeof errorResponse !== 'object') {
    return "Request failed. Please try again.";
  }

  const response = errorResponse as ApiErrorResponse;
  
  return (
    response.detail ??
    response.message ??
    response.title ??
    "Request failed. Please try again."
  );
}

/**
 * Extracts field-level validation errors from an API error response
 * Returns a map of field names to error messages
 */
export function getFieldErrors(errorResponse: ApiErrorResponse | unknown): Record<string, string> {
  if (!errorResponse || typeof errorResponse !== 'object') {
    return {};
  }

  const response = errorResponse as ApiErrorResponse;
  const fieldErrors: Record<string, string> = {};

  if (response.errors && typeof response.errors === 'object') {
    const errors = response.errors as Record<string, unknown>;
    for (const [key, value] of Object.entries(errors)) {
      if (Array.isArray(value)) {
        fieldErrors[key] = value.join(", ");
      } else if (typeof value === 'string') {
        fieldErrors[key] = value;
      }
    }
  }

  return fieldErrors;
}

/**
 * Checks if an error response indicates a duplicate username/email
 */
export function isDuplicateError(errorResponse: ApiErrorResponse | unknown): boolean {
  if (!errorResponse || typeof errorResponse !== 'object') {
    return false;
  }

  const response = errorResponse as ApiErrorResponse;
  const message = getApiErrorMessage(response).toLowerCase();
  const errorCode = response.errorCode?.toLowerCase() || "";

  return (
    message.includes("already exists") ||
    message.includes("already registered") ||
    message.includes("duplicate") ||
    errorCode.includes("duplicate") ||
    errorCode.includes("business_rule_violation")
  );
}

/**
 * Formats a duplicate username error message with helpful suggestion
 */
export function formatDuplicateUsernameError(username: string): string {
  return `Username "${username}" is already registered. Try another username or leave username blank.`;
}

/**
 * Formats a duplicate email error message with helpful suggestion
 */
export function formatDuplicateEmailError(email: string): string {
  return `Email "${email}" is already registered. Please use a different email address.`;
}
