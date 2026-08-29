/**
 * Configuration helper for API URLs, dynamic endpoints, and WebSockets.
 * Supports environment variables, custom overrides, and fallback for mobile WebView environments.
 */

// Allow runtime override via window.API_URL
declare global {
  interface Window {
    API_URL?: string;
  }
}

export const getApiUrl = (path: string): string => {
  // If the path already includes a protocol, return it as-is
  if (
    path.startsWith('http://') ||
    path.startsWith('https://') ||
    path.startsWith('ws://') ||
    path.startsWith('wss://') ||
    path.startsWith('data:')
  ) {
    return path;
  }

  // Ensure the path starts with a slash
  const cleanPath = path.startsWith('/') ? path : `/${path}`;

  // Prioritize window.API_URL (dynamic injection on mobile),
  // then Vite env variables, then REACT_APP_API_URL env variables,
  // then fallback to window.location.origin if it's a valid web origin, or empty string.
  let baseUrl = '';

  const meta = import.meta as any;
  if (typeof window !== 'undefined' && window.API_URL) {
    baseUrl = window.API_URL;
  } else if (meta && meta.env && meta.env.VITE_API_URL) {
    baseUrl = meta.env.VITE_API_URL;
  } else if (meta && meta.env && meta.env.REACT_APP_API_URL) {
    baseUrl = meta.env.REACT_APP_API_URL;
  }

  // If baseUrl is still empty, check if we are in a browser on a normal http/https page.
  // On mobile (file:// or capacitor://), window.location.origin might be empty or a local custom scheme,
  // so we should not use it as a default backend API base in those cases.
  if (!baseUrl && typeof window !== 'undefined' && window.location) {
    const origin = window.location.origin;
    if (origin && (origin.startsWith('http://') || origin.startsWith('https://'))) {
      baseUrl = origin;
    }
  }

  // Clean trailing slashes from baseUrl
  const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;

  return `${cleanBaseUrl}${cleanPath}`;
};
