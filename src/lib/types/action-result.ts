/**
 * Standardized Server Action response contract across Classroom OS.
 */
export type ActionResult<T = void> = {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  fieldErrors?: Record<string, string[]>;
};
