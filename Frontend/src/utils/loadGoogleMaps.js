let googleMapsPromise = null;

export function loadGoogleMaps(apiKey) {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Window is not defined. Google Maps can only be loaded in the browser.'));
  }
  
  if (window.google && window.google.maps) {
    return Promise.resolve(window.google.maps);
  }

  if (!apiKey) {
    return Promise.reject(new Error('Google Maps API key is not configured.'));
  }

  if (!googleMapsPromise) {
    googleMapsPromise = new Promise((resolve, reject) => {
      // Create callback
      const callbackName = `__googleMapsCallback_${Date.now()}`;
      window[callbackName] = () => {
        delete window[callbackName];
        if (window.google && window.google.maps) {
          resolve(window.google.maps);
        } else {
          reject(new Error('Google Maps SDK loaded but namespace window.google.maps is undefined.'));
        }
      };

      const script = document.createElement('script');
      // Request libraries parameter for geometry tools needed for distance calculations
      script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&libraries=geometry&loading=async&callback=${callbackName}`;
      script.async = true;
      script.defer = true;
      script.onerror = (err) => {
        delete window[callbackName];
        googleMapsPromise = null; // allow retry on error
        reject(err);
      };

      document.head.appendChild(script);
    });
  }

  return googleMapsPromise;
}
