/**
 * Centralized Map & GPS Configuration
 * -----------------------------------
 * Location-Independent Technical Map Configuration.
 * DEFAULT_VIEWPORT_CENTER is strictly a canvas viewport initialization fallback,
 * NEVER to be reported or saved as actual executive GPS or attendance location.
 */

export const MAP_CONFIG = {
  // Default Map Canvas Viewport (Used ONLY when GPS is acquiring or no target item location)
  DEFAULT_VIEWPORT_CENTER: { lat: 13.0067, lng: 80.2570 },
  DEFAULT_ZOOM: 12,

  // Technical GPS & Navigation Thresholds (km)
  ROUTE_REFETCH_DISTANCE_KM: 0.05,  // 50m movement before route recalculation
  OFF_ROUTE_THRESHOLD_KM: 0.15,     // 150m off route triggers alert
  ARRIVAL_RADIUS_KM: 0.05,           // 50m arrival check-in radius
  GEOFENCE_VERIFICATION_RADIUS_M: 450, // 450m visit geofence radius
};

export default MAP_CONFIG;
