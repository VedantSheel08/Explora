/**
 * Map init, markers, user location (lerp), 150m radar circle, Follow Me, proximity alerts.
 */

const VISIT_RADIUS_METERS = 150;
const PROXIMITY_COOLDOWN_MS = 60000;
const PROXIMITY_THROTTLE_MS = 5000;
const LERP_FACTOR = 0.15;

export function haversineMeters(a, b) {
  const R = 6371000;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const x =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return 2 * R * Math.asin(Math.sqrt(x));
}

let map = null;
let placesService = null;
let userMarker = null;
let radarCircle = null;
let displayedPos = null;
let watchId = null;
let lastProximityPlaceId = null;
let lastProximityTime = 0;
let lastProximityCall = 0;
let followMe = false;
let markersByPlaceId = new Map();
let highlightedPlaceId = null;
let lerpAnimationId = null;

export function getMap() {
  return map;
}

export function getPlacesService() {
  return placesService;
}

export function getUserPosition() {
  return displayedPos;
}

export function getMarkersByPlaceId() {
  return markersByPlaceId;
}

export function getFollowMe() {
  return followMe;
}

export function setFollowMe(value) {
  followMe = !!value;
  if (map && followMe && displayedPos) {
    map.panTo(displayedPos);
  }
}

export function getVisitRadiusMeters() {
  return VISIT_RADIUS_METERS;
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function updateUserMarkerPosition(lat, lng) {
  displayedPos = { lat, lng };
  if (userMarker) userMarker.setPosition(displayedPos);
  if (radarCircle) radarCircle.setCenter(displayedPos);
  if (followMe && map) map.panTo(displayedPos);
}

export function setUserPosition(lat, lng) {
  if (displayedPos == null) {
    updateUserMarkerPosition(lat, lng);
    return;
  }
  if (lerpAnimationId) cancelAnimationFrame(lerpAnimationId);
  const start = { ...displayedPos };
  const end = { lat, lng };
  let t = 0;
  function step() {
    t = Math.min(1, t + LERP_FACTOR);
    const lat = lerp(start.lat, end.lat, t);
    const lng = lerp(start.lng, end.lng, t);
    updateUserMarkerPosition(lat, lng);
    if (t < 1) lerpAnimationId = requestAnimationFrame(step);
  }
  lerpAnimationId = requestAnimationFrame(step);
}

export function initMap(containerEl, center, options = {}) {
  if (typeof google === "undefined" || !google.maps) return null;
  map = new google.maps.Map(containerEl, {
    center: center || { lat: 43.6394, lng: -79.3765 },
    zoom: options.zoom || 15,
    mapTypeControl: true,
    streetViewControl: false,
    fullscreenControl: true,
    zoomControl: true,
    ...options,
  });
  placesService = new google.maps.places.PlacesService(map);
  return map;
}

export function setMapCenter(center) {
  if (map) map.setCenter(center);
}

export function addUserMarker() {
  if (!map || !displayedPos) return null;
  if (userMarker) {
    userMarker.setMap(null);
    userMarker = null;
  }
  userMarker = new google.maps.Marker({
    map,
    position: displayedPos,
    title: "You",
    icon: {
      path: google.maps.SymbolPath.CIRCLE,
      scale: 10,
      fillColor: "#2563eb",
      fillOpacity: 1,
      strokeColor: "#fff",
      strokeWeight: 2,
    },
  });
  if (!radarCircle) {
    radarCircle = new google.maps.Circle({
      map,
      center: displayedPos,
      radius: VISIT_RADIUS_METERS,
      fillColor: "#2563eb",
      fillOpacity: 0.08,
      strokeColor: "#2563eb",
      strokeOpacity: 0.5,
      strokeWeight: 2,
    });
  } else {
    radarCircle.setCenter(displayedPos);
    radarCircle.setMap(map);
  }
  return userMarker;
}

export function setRadarCircleVisible(visible) {
  if (radarCircle) radarCircle.setMap(visible ? map : null);
}

export function setPlaceMarkers(places, categoryFilter, onSelectPlace) {
  markersByPlaceId.forEach((m) => m.setMap(null));
  markersByPlaceId.clear();
  if (!map) return;
  const filtered =
    !categoryFilter || categoryFilter === "all"
      ? places
      : places.filter((p) => p.category === categoryFilter);
  filtered.forEach((b) => {
    const marker = new google.maps.Marker({
      map,
      position: { lat: b.lat, lng: b.lng },
      title: b.name,
    });
    marker.addListener("click", () => onSelectPlace(b));
    markersByPlaceId.set(b.place_id, marker);
  });
  if (highlightedPlaceId && markersByPlaceId.has(highlightedPlaceId)) {
    setMarkerHighlight(highlightedPlaceId);
  }
}

export function setMarkerHighlight(placeId) {
  highlightedPlaceId = placeId;
  markersByPlaceId.forEach((m, pid) => {
    m.setIcon(pid === placeId ? { url: "http://maps.google.com/mapfiles/ms/icons/red-dot.png" } : null);
  });
}

export function setProximityHighlight(placeId, on) {
  if (!on) {
    if (highlightedPlaceId) setMarkerHighlight(highlightedPlaceId);
    else markersByPlaceId.forEach((m) => m.setIcon(null));
    return;
  }
  const m = markersByPlaceId.get(placeId);
  if (m) m.setIcon({ url: "http://maps.google.com/mapfiles/ms/icons/orange-dot.png" });
}

export function panToPlace(lat, lng) {
  if (map) map.panTo({ lat, lng });
}

export function checkProximityAlert(places, onAlert) {
  if (!displayedPos || !places.length) return;
  const now = Date.now();
  if (now - lastProximityCall < PROXIMITY_THROTTLE_MS) return;
  lastProximityCall = now;

  let nearest = null;
  let minDist = Infinity;
  places.forEach((p) => {
    const d = haversineMeters(displayedPos, { lat: p.lat, lng: p.lng });
    if (d < minDist) {
      minDist = d;
      nearest = p;
    }
  });
  if (!nearest || minDist > VISIT_RADIUS_METERS) return;
  if (lastProximityPlaceId === nearest.place_id && now - lastProximityTime < PROXIMITY_COOLDOWN_MS) return;
  lastProximityPlaceId = nearest.place_id;
  lastProximityTime = now;
  if (onAlert) onAlert(nearest);
}

export function initGeolocation(onFirstPosition, onPositionUpdate) {
  if (!navigator.geolocation) {
    if (onFirstPosition) onFirstPosition(null);
    return;
  }
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      displayedPos = { lat, lng };
      addUserMarker();
      if (map) map.setCenter(displayedPos);
      if (onFirstPosition) onFirstPosition(displayedPos);
      startWatchPosition(onPositionUpdate);
    },
    () => {
      if (onFirstPosition) onFirstPosition(null);
    },
    { enableHighAccuracy: true, maximumAge: 60000, timeout: 10000 }
  );
}

function startWatchPosition(onPositionUpdate) {
  if (watchId != null) return;
  watchId = navigator.geolocation.watchPosition(
    (pos) => {
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      setUserPosition(lat, lng);
      if (onPositionUpdate) onPositionUpdate({ lat, lng });
    },
    () => {},
    { enableHighAccuracy: true, maximumAge: 10000, timeout: 15000 }
  );
}

export function getClosestPlaces(places, limit = 3) {
  if (!displayedPos || !places.length) return [];
  const withDist = places.map((p) => ({
    place: p,
    dist: haversineMeters(displayedPos, { lat: p.lat, lng: p.lng }),
  }));
  withDist.sort((a, b) => a.dist - b.dist);
  return withDist.slice(0, limit);
}
