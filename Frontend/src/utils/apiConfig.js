/**
 * Resolves the backend API base URL dynamically.
 * On production hosts (e.g. connect.twite.ai or remote IPs), forces relative '/api/v1' if the env variable
 * contains 'localhost', '127.0.0.1', or explicit ':8001' port, ensuring browsers route requests via Nginx / standard HTTPS (port 443).
 */
export function getApiBaseUrl() {
  let envUrl = import.meta.env.VITE_API_BASE_URL
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname
    const isLocal = hostname === 'localhost' || hostname === '127.0.0.1'
    if (!isLocal) {
      if (!envUrl || envUrl.includes('localhost') || envUrl.includes('127.0.0.1') || envUrl.includes(':8001') || envUrl.includes(':8000')) {
        return '/api/v1'
      }
    }
  }
  let url = envUrl || 'http://localhost:8000/api/v1'
  if (url.includes(':8001')) {
    url = url.replace(':8001', ':8000')
  }
  return url
}


