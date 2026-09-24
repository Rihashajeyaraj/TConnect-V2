/**
 * Road Snapping Utility: Map-matches raw GPS points to real road geometries
 * Prioritizes Google Maps Roads API point-level snapping (without synthetic route interpolation)
 * and falls back to OSRM Match API and raw chronological points.
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

  // Filter out invalid or zero coords
  const cleanPts = pts.filter(p => p && typeof p.lat === 'number' && typeof p.lng === 'number' && !isNaN(p.lat) && !isNaN(p.lng) && p.lat !== 0 && p.lng !== 0);
  if (cleanPts.length < 2) return cleanPts;

  // Cache key based on start, middle, end coords + length
  const cacheKey = `${cleanPts[0].lat.toFixed(4)},${cleanPts[0].lng.toFixed(4)}_${cleanPts[cleanPts.length - 1].lat.toFixed(4)},${cleanPts[cleanPts.length - 1].lng.toFixed(4)}_${cleanPts.length}`;
  if (snapCache.has(cacheKey)) {
    return snapCache.get(cacheKey);
  }

  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || (typeof window !== 'undefined' && window.VITE_GOOGLE_MAPS_API_KEY);

  // 1. Primary: Google Maps Roads API (Point-level snapping ONLY, interpolate=false to avoid synthetic routes)
  if (apiKey) {
    try {
      let sampled = cleanPts;
      if (cleanPts.length > 100) {
        const step = Math.ceil(cleanPts.length / 100);
        sampled = cleanPts.filter((_, idx) => idx % step === 0 || idx === cleanPts.length - 1);
      }

      const pathParam = sampled.map(p => `${p.lat},${p.lng}`).join('|');
      // Set interpolate=false so Google snaps raw points to nearest road without inventing unvisited routes
      const url = `https://roads.googleapis.com/v1/snapToRoads?path=${encodeURIComponent(pathParam)}&interpolate=false&key=${apiKey}`;

      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        if (data && Array.isArray(data.snappedPoints) && data.snappedPoints.length > 0) {
          const snappedPoints = data.snappedPoints.map(sp => ({
            lat: sp.location.latitude,
            lng: sp.location.longitude
          }));
          if (snappedPoints.length >= 2) {
            addToCache(cacheKey, snappedPoints);
            return snappedPoints;
          }
        }
      }
    } catch (gErr) {
      console.warn('[RoadSnap] Google Roads API notice (falling back to OSRM Match / Raw):', gErr);
    }
  }

  // 2. Secondary: OSRM Match Engine (Map-matching actual pings to road segments)
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
    console.warn('[RoadSnap] OSRM match notice:', err);
  }

  // 3. Pocket Gap Recovery: If intermediate breadcrumbs were missed (due to phone in pocket/screen-off browser sleep),
  // compute the driving road geometry connecting Start Location and Current Location so the path is never lost.
  if (cleanPts.length >= 2) {
    const pStart = cleanPts[0];
    const pEnd = cleanPts[cleanPts.length - 1];
    
    // Haversine distance check in meters
    const R = 6371000;
    const dLat = (pEnd.lat - pStart.lat) * Math.PI / 180;
    const dLng = (pEnd.lng - pStart.lng) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(pStart.lat * Math.PI / 180) * Math.cos(pEnd.lat * Math.PI / 180) * Math.sin(dLng/2) * Math.sin(dLng/2);
    const distM = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    if (distM > 250 && cleanPts.length <= 5) {
      try {
        const routeUrl = `https://router.project-osrm.org/route/v1/driving/${pStart.lng},${pStart.lat};${pEnd.lng},${pEnd.lat}?overview=full&geometries=geojson`;
        const routeRes = await fetch(routeUrl);
        if (routeRes.ok) {
          const rData = await routeRes.json();
          if (rData && rData.code === 'Ok' && rData.routes && rData.routes[0]?.geometry?.coordinates) {
            const roadPts = rData.routes[0].geometry.coordinates.map(c => ({ lat: c[1], lng: c[0] }));
            if (roadPts.length > 1) {
              addToCache(cacheKey, roadPts);
              return roadPts;
            }
          }
        }
      } catch (rErr) {
        console.warn('[RoadSnap] Pocket gap OSRM route recovery notice:', rErr);
      }
    }
  }

  // 4. Fallback: Return raw recorded chronological points directly (100% true path)
  return cleanPts;
}

