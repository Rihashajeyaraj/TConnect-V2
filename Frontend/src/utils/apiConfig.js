/**
 * Resolves the backend API base URL dynamically.
 * On production hosts (e.g. connect.twite.ai), forces relative '/api/v1' if the env variable
 * contains 'localhost' or '127.0.0.1', ensuring mobile clients connect to the production server.
 */
export function getApiBaseUrl() {
  const envUrl = import.meta.env.VITE_API_BASE_URL
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname
    const isLocal = hostname === 'localhost' || hostname === '127.0.0.1'
    if (!isLocal) {
      if (!envUrl || envUrl.includes('localhost') || envUrl.includes('127.0.0.1')) {
        return '/api/v1'
      }
    }
  }
  return envUrl || '/api/v1'
}
