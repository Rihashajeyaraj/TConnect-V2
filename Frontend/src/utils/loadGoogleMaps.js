export function purgeGoogleMapsBillingModal() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  // 1. Remove dark overlay elements
  document.querySelectorAll('.gm-style-moc, .gm-err-container, .gm-err-content, [aria-labelledby*="gm-err"]').forEach(el => {
    try { el.remove(); } catch (e) {}
  });

  // 2. Scan all divs for Google Maps billing error modal text
  const allDivs = document.querySelectorAll('div');
  allDivs.forEach(el => {
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
  setInterval(purgeGoogleMapsBillingModal, 300);
}

let googleMapsPromise = typeof window !== 'undefined' ? (window.__googleMapsPromise || null) : null;

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
      script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&libraries=geometry&loading=async&callback=${callbackName}`;
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
