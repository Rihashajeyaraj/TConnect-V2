/**
 * Road Snapping Utility: Map-matches raw GPS points to real road geometries
 * Prioritizes Google Maps Roads API (if VITE_GOOGLE_MAPS_API_KEY is available)
 * and falls back to OSRM Match API and raw points as resilient fallbacks.
 */

const snapCache = new Map();
const MAX_CACHE_SIZE = 120;

function addToCache(key, val) {
  if (snapCache.size >= MAX_CACHE_SIZE) {
    const firstKey = snapCache.keys().next().value;
    if (firstKey) snapCache.delete(firstKey);
  }
  snapCache.set(key, val);
}

export async function snapToRoadGeometry(pts) {
  if (!Array.isArray(pts) || pts.length < 2) return pts || [];

  // Filter out invalid coords
  const cleanPts = pts.filter(p => p && typeof p.lat === 'number' && typeof p.lng === 'number' && !isNaN(p.lat) && !isNaN(p.lng) && p.lat !== 0 && p.lng !== 0);
  if (cleanPts.length < 2) return cleanPts;

  // Cache key based on start, middle, end coords + length
  const cacheKey = `${cleanPts[0].lat.toFixed(4)},${cleanPts[0].lng.toFixed(4)}_${cleanPts[cleanPts.length - 1].lat.toFixed(4)},${cleanPts[cleanPts.length - 1].lng.toFixed(4)}_${cleanPts.length}`;
  if (snapCache.has(cacheKey)) {
    return snapCache.get(cacheKey);
  }

  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || (typeof window !== 'undefined' && window.VITE_GOOGLE_MAPS_API_KEY);

  // 1. Primary: Google Maps Roads API (if API Key is present)
  if (apiKey) {
    try {
      let sampled = cleanPts;
      if (cleanPts.length > 100) {
        const step = Math.ceil(cleanPts.length / 100);
        sampled = cleanPts.filter((_, idx) => idx % step === 0 || idx === cleanPts.length - 1);
      }

      const pathParam = sampled.map(p => `${p.lat},${p.lng}`).join('|');
      const url = `https://roads.googleapis.com/v1/snapToRoads?path=${encodeURIComponent(pathParam)}&interpolate=true&key=${apiKey}`;

      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        if (data && Array.isArray(data.snappedPoints) && data.snappedPoints.length > 0) {
          const snappedPoints = data.snappedPoints.map(sp => ({
            lat: sp.location.latitude,
            lng: sp.location.longitude
          }));
          addToCache(cacheKey, snappedPoints);
          return snappedPoints;
        }
      }
    } catch (gErr) {
      console.warn('[RoadSnap] Google Roads API notice (falling back to OSRM):', gErr);
    }
  }

  // 2. Secondary: OSRM Match Engine
  try {
    let sampled = cleanPts;
    if (cleanPts.length > 80) {
      const step = Math.ceil(cleanPts.length / 80);
      sampled = cleanPts.filter((_, idx) => idx % step === 0 || idx === cleanPts.length - 1);
    }

    const coordStr = sampled.map(p => `${p.lng},${p.lat}`).join(';');
    const url = `https://router.project-osrm.org/match/v1/driving/${coordStr}?overview=full&geometries=geojson&steps=false`;

    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      if (data && data.code === 'Ok' && Array.isArray(data.matchings) && data.matchings.length > 0) {
        const snappedPoints = [];
        data.matchings.forEach(m => {
          if (m.geometry && Array.isArray(m.geometry.coordinates)) {
            m.geometry.coordinates.forEach(c => {
              snappedPoints.push({ lat: c[1], lng: c[0] });
            });
          }
        });

        if (snappedPoints.length > 1) {
          addToCache(cacheKey, snappedPoints);
          return snappedPoints;
        }
      }
    }
  } catch (err) {
    console.warn('[RoadSnap] OSRM match notice (trying OSRM route fallback):', err);
  }

  // 3. Tertiary Fallback: OSRM Route Engine (Guarantees turn-by-turn road geometry along streets between sparse points)
  try {
    let sampled = cleanPts;
    if (cleanPts.length > 40) {
      const step = Math.ceil(cleanPts.length / 40);
      sampled = cleanPts.filter((_, idx) => idx % step === 0 || idx === cleanPts.length - 1);
    }

    const coordStr = sampled.map(p => `${p.lng},${p.lat}`).join(';');
    const routeUrl = `https://router.project-osrm.org/route/v1/driving/${coordStr}?overview=full&geometries=geojson`;

    const res = await fetch(routeUrl);
    if (res.ok) {
      const data = await res.json();
      if (data && data.code === 'Ok' && Array.isArray(data.routes) && data.routes.length > 0) {
        const routeGeo = data.routes[0].geometry;
        if (routeGeo && Array.isArray(routeGeo.coordinates) && routeGeo.coordinates.length > 1) {
          const snappedPoints = routeGeo.coordinates.map(c => ({ lat: c[1], lng: c[0] }));
          addToCache(cacheKey, snappedPoints);
          return snappedPoints;
        }
      }
    }
  } catch (routeErr) {
    console.warn('[RoadSnap] OSRM route notice (falling back to raw points):', routeErr);
  }

  // 4. Final Fallback: Raw filtered points
  return cleanPts;
}
