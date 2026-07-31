const DEV_FALLBACK_URL = "http://localhost:5082";

function removeTrailingSlash(url: string): string {
  return url.trim().replace(/\/+$/, "");
}

function getApiBaseUrl(): string {
  const envUrl = process.env.NEXT_PUBLIC_API_BASE_URL;

  if (envUrl?.trim()) {
    return removeTrailingSlash(envUrl);
  }

  if (process.env.NODE_ENV === "development") {
    console.warn(
      "[API] NEXT_PUBLIC_API_BASE_URL is not configured. " +
        "Using local backend:",
      DEV_FALLBACK_URL
    );

    return DEV_FALLBACK_URL;
  }

  throw new Error(
    "NEXT_PUBLIC_API_BASE_URL is required in production. " +
      "Configure it in Vercel Project Settings > Environment Variables."
  );
}

export const API_BASE_URL = getApiBaseUrl();

if (
  process.env.NODE_ENV === "development" &&
  typeof window !== "undefined"
) {
  console.log("[API] Base URL:", API_BASE_URL);
}
