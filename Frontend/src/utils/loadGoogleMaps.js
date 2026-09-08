export function purgeGoogleMapsBillingModal() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  // Fast exit: if no auth failure flag and no error container elements exist on screen, exit immediately
  if (!window.__google_maps_auth_failed && !document.querySelector('.gm-err-container, .gm-err-content, .gm-style-moc')) {
    return;
  }

  // 1. Remove dark overlay elements
  document.querySelectorAll('.gm-style-moc, .gm-err-container, .gm-err-content, [aria-labelledby*="gm-err"]').forEach(el => {
    try { el.remove(); } catch (e) {}
  });

  // 2. Scan map container divs for Google Maps billing error modal text
  const targets = document.querySelectorAll('.gm-style div, [aria-labelledby*="gm-err"]');
  targets.forEach(el => {
    const text = el.textContent || '';
    if (text.includes("This page can't load Google Maps correctly") || text.includes("Do you own this website?")) {
      let modalWrapper = el;
      while (modalWrapper && modalWrapper.parentElement && modalWrapper.parentElement !== document.body) {
        const style = window.getComputedStyle(modalWrapper);
        if (style.position === 'absolute' || style.position === 'fixed' || (parseInt(style.zIndex, 10) > 100)) {
          break;
        }
        modalWrapper = modalWrapper.parentElement;
      }
      if (modalWrapper && modalWrapper !== document.body && modalWrapper.tagName === 'DIV') {
        try { modalWrapper.remove(); } catch (e) {}
      }
    }
  });
}

if (typeof window !== 'undefined') {
  window.gm_authFailure = function () {
    console.warn('[Google Maps] Billing or API Key notice. Suppressing default error popup dialog.');
    window.__google_maps_auth_failed = true;
    
    // Auto-purge Google Maps error modal popups immediately
    purgeGoogleMapsBillingModal();
    setTimeout(purgeGoogleMapsBillingModal, 50);
    setTimeout(purgeGoogleMapsBillingModal, 200);
    setTimeout(purgeGoogleMapsBillingModal, 600);
  };

  // Standing background loop to catch any deferred Google Maps error popups
  setInterval(purgeGoogleMapsBillingModal, 3000);
}

let googleMapsPromise = typeof window !== 'undefined' ? (window.__googleMapsPromise || null) : null;

export function loadGoogleMaps(apiKey) {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Window is not defined. Google Maps can only be loaded in the browser.'));
  }
  
  // Only skip loading if the Map constructor is truly available (not just a partial stub)
  if (window.google && window.google.maps && typeof window.google.maps.Map === 'function') {
    return Promise.resolve(window.google.maps);
  }

  // If google.maps exists but Map is not a constructor, the previous load was incomplete — reset and reload
  if (window.google && window.google.maps && typeof window.google.maps.Map !== 'function') {
    console.warn('[loadGoogleMaps] Detected partial Maps stub (Map not a constructor). Resetting for clean load.')
    window.__googleMapsPromise = null
    googleMapsPromise = null
  }

  if (!apiKey) {
    return Promise.reject(new Error('Google Maps API key is not configured.'));
  }

  if (!googleMapsPromise && window.__googleMapsPromise) {
    googleMapsPromise = window.__googleMapsPromise;
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
      script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&libraries=geometry&callback=${callbackName}`;
      script.async = true;
      script.defer = true;
      script.onerror = (err) => {
        delete window[callbackName];
        googleMapsPromise = null;
        if (window.__googleMapsPromise) window.__googleMapsPromise = null;
        reject(err);
      };

      document.head.appendChild(script);
    });

    window.__googleMapsPromise = googleMapsPromise;
  }

  return googleMapsPromise;
}
