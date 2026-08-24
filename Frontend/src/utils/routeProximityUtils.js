/**
 * routeProximityUtils.js
 * Shared route-aware proximity utilities for Sales Executive and Manager Smart Maps.
 *
 * All distances are in kilometres (km). The planned route polyline is represented as
 * an array of [lat, lng] tuples (same format used throughout the app).
 */

// ─── Constants ────────────────────────────────────────────────────────────────
/** Hard corridor threshold: clients farther than this from the route are excluded. */
export const ROUTE_CORRIDOR_KM = 0.5   // 500 m

/** Re-alert hysteresis: executive must move this far before a client can alert again. */
export const HYSTERESIS_KM = 0.2        // 200 m

// ─── Haversine ────────────────────────────────────────────────────────────────
export function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

// ─── Segment perpendicular distance ──────────────────────────────────────────
/**
 * Minimum distance (km) from point P to the LINE SEGMENT A→B.
 * Uses the closest-point-on-segment formula (not point-to-point).
 */
export function distanceToSegmentKm(pLat, pLng, aLat, aLng, bLat, bLng) {
  const dx = bLat - aLat
  const dy = bLng - aLng
  const lenSq = dx * dx + dy * dy

  if (lenSq === 0) {
    // Degenerate segment — treat as point
    return haversineKm(pLat, pLng, aLat, aLng)
  }

  // Project P onto the line through A–B, clamped to [0,1]
  let t = ((pLat - aLat) * dx + (pLng - aLng) * dy) / lenSq
  t = Math.max(0, Math.min(1, t))

  const closestLat = aLat + t * dx
  const closestLng = aLng + t * dy
  return haversineKm(pLat, pLng, closestLat, closestLng)
}

/**
 * Minimum distance (km) from a point to the nearest SEGMENT of a polyline.
 * Returns Infinity if polyline has fewer than 2 points.
 */
export function distanceToPolylineKm(lat, lng, polyline) {
  if (!polyline || polyline.length < 2) return Infinity
  let minD = Infinity
  for (let i = 0; i < polyline.length - 1; i++) {
    const [aLat, aLng] = polyline[i]
    const [bLat, bLng] = polyline[i + 1]
    const d = distanceToSegmentKm(lat, lng, aLat, aLng, bLat, bLng)
    if (d < minD) minD = d
  }
  return minD
}

// ─── Progress along route ─────────────────────────────────────────────────────
/**
 * Returns the index of the polyline segment where the point projects closest.
 * Higher index = further along the route toward the destination.
 */
export function closestSegmentIndex(lat, lng, polyline) {
  if (!polyline || polyline.length < 2) return 0
  let minD = Infinity
  let minIdx = 0
  for (let i = 0; i < polyline.length - 1; i++) {
    const [aLat, aLng] = polyline[i]
    const [bLat, bLng] = polyline[i + 1]
    const d = distanceToSegmentKm(lat, lng, aLat, aLng, bLat, bLng)
    if (d < minD) { minD = d; minIdx = i }
  }
  return minIdx
}

/**
 * Returns true if the client is AHEAD of the executive on the planned route.
 * "Ahead" means the client's closest segment index > executive's closest segment index.
 */
export function isAheadOnRoute(clientLat, clientLng, execLat, execLng, polyline) {
  if (!polyline || polyline.length < 2) return true
  const execIdx   = closestSegmentIndex(execLat,   execLng,   polyline)
  const clientIdx = closestSegmentIndex(clientLat, clientLng, polyline)
  return clientIdx > execIdx
}

// ─── Main detection function ──────────────────────────────────────────────────
/**
 * Detect leads/customers that are:
 *   1. Within ROUTE_CORRIDOR_KM (500 m) of the planned route polyline (segment-based)
 *   2. Ahead of the executive on the route
 *   3. Not the destination itself
 *   4. Not already dismissed
 *
 * @param {Object} opts
 * @param {Array}        opts.candidates        - Normalised [{id, latitude, longitude, has_exact_coords, originalItem, ...}]
 * @param {Array}        opts.routePath         - [[lat,lng], ...] planned route polyline
 * @param {{lat,lng}}    opts.execPos           - Executive's current GPS position
 * @param {string|number} opts.destId           - Destination client ID to exclude
 * @param {Set}          opts.completedVisitIds - IDs marking previously-visited entities
 * @param {Set}          opts.scheduledVisitIds - IDs with scheduled (upcoming) visits
 * @param {Set}          opts.dismissedIds      - IDs dismissed this session
 * @param {number}       [opts.thresholdKm]     - Override corridor (default ROUTE_CORRIDOR_KM = 0.5)
 *
 * @returns {Array} Matched clients, sorted by distToRouteKm ascending,
 *                  each with { alertType, distToRouteKm, distToRouteM, distToExecKm }
 */
export function detectRouteClients({
  candidates,
  routePath,
  execPos,
  destId,
  completedVisitIds = new Set(),
  scheduledVisitIds = new Set(),
  dismissedIds      = new Set(),
  thresholdKm       = ROUTE_CORRIDOR_KM,
}) {
  if (!routePath || routePath.length < 2) return []

  const found = []

  for (const entity of candidates) {
    // Basic guards
    if (!entity.has_exact_coords)              continue
    if (String(entity.id) === String(destId))  continue
    if (dismissedIds.has(entity.id))           continue

    const cLat = entity.latitude
    const cLng = entity.longitude

    // Guard: valid coords
    if (!cLat || !cLng || isNaN(cLat) || isNaN(cLng)) continue

    // 1. Route-corridor filter — segment-based perpendicular distance, hard 500 m cap
    const distToRoute = distanceToPolylineKm(cLat, cLng, routePath)
    if (distToRoute > thresholdKm) continue

    // 2. Ahead-only filter — do not show clients the executive has already passed
    if (!isAheadOnRoute(cLat, cLng, execPos.lat, execPos.lng, routePath)) continue

    // 3. Classify alert type
    let alertType = 'unvisited'
    const oid = entity.originalItem
    if (
      completedVisitIds.has(entity.id) ||
      (oid?.lead_id     && completedVisitIds.has(oid.lead_id)) ||
      (oid?.customer_id && completedVisitIds.has(oid.customer_id))
    ) {
      alertType = 'previous'
    } else if (
      scheduledVisitIds.has(entity.id) ||
      (oid?.lead_id     && scheduledVisitIds.has(oid.lead_id)) ||
      (oid?.customer_id && scheduledVisitIds.has(oid.customer_id)) ||
      entity.category === 'Visit'
    ) {
      alertType = 'scheduled'
    }

    const distToExec = haversineKm(cLat, cLng, execPos.lat, execPos.lng)

    found.push({
      ...entity,
      alertType,
      distToRouteKm: distToRoute.toFixed(3),
      distToRouteM:  Math.round(distToRoute * 1000),  // metres for display
      distToExecKm:  distToExec.toFixed(2),
    })
  }

  // Sort: closest to route first
  found.sort((a, b) => parseFloat(a.distToRouteKm) - parseFloat(b.distToRouteKm))
  return found
}

/**
 * Hysteresis-aware notification gate.
 * Returns true only if this client has NOT been notified yet, or if the
 * executive has moved ≥ HYSTERESIS_KM since the last notification.
 *
 * Side-effect: updates notifiedMap with the current execPos on a true return.
 *
 * @param {string|number} clientId
 * @param {{lat,lng}}     execPos
 * @param {Map}           notifiedMap  - Map<id, {lat,lng}> of last notified positions
 */
export function shouldNotify(clientId, execPos, notifiedMap) {
  if (!notifiedMap.has(clientId)) {
    notifiedMap.set(clientId, { lat: execPos.lat, lng: execPos.lng })
    return true
  }
  const lastPos = notifiedMap.get(clientId)
  const moved = haversineKm(execPos.lat, execPos.lng, lastPos.lat, lastPos.lng)
  if (moved >= HYSTERESIS_KM) {
    notifiedMap.set(clientId, { lat: execPos.lat, lng: execPos.lng })
    return true
  }
  return false
}
