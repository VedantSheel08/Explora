/**
 * Places discovery (type buckets, merge, dedupe) and Place Details with 24h TTL cache.
 * Businesses come from Google Places only.
 */

const DEFAULT_CENTER = { lat: 43.6394, lng: -79.3765 }; // Westin Harbour Castle, Toronto
const NEARBY_RADIUS = 1500;
const MAX_MARKERS = 55;
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const LS_PREFIX = "explora_place_";

const PLACE_DETAILS_FIELDS = [
  "name", "rating", "user_ratings_total", "reviews", "formatted_address",
  "opening_hours", "price_level", "types", "url", "website", "photos"
].join(",");

const DISCOVERY_TYPES = [
  { type: "restaurant" }, { type: "cafe" }, { type: "bakery" },
  { type: "store" }, { type: "clothing_store" }, { type: "supermarket" },
  { type: "convenience_store" }, { type: "book_store" }, { type: "electronics_store" },
  { type: "gym" }, { type: "hair_care" }, { type: "beauty_salon" }, { type: "pharmacy" },
  { type: "tourist_attraction" }, { type: "museum" }, { type: "park" },
];

const PLACE_TYPE_TO_CATEGORY = {
  restaurant: "food", cafe: "food", bakery: "food", meal_takeaway: "food", meal_delivery: "food", bar: "food", food: "food",
  store: "store", clothing_store: "store", shoe_store: "store", grocery_or_supermarket: "store", supermarket: "store",
  shopping_mall: "store", convenience_store: "store", book_store: "store", electronics_store: "store", florist: "store",
  pet_store: "store", furniture_store: "store", home_goods_store: "store", hardware_store: "store", liquor_store: "store",
  gym: "services", spa: "services", beauty_salon: "services", hair_care: "services", pharmacy: "services",
  establishment: "services", lawyer: "services", doctor: "services", dentist: "services",
  tourist_attraction: "fun", museum: "fun", park: "fun", lodging: "services",
};

const DEMO_DEALS = {
  default: [{ title: "20% OFF", code: "SAVE20" }, { title: "Buy 1 Get 1", code: null }],
  food: [{ title: "10% off next order", code: "EAT10" }, { title: "Free drink with main", code: null }],
  store: [{ title: "20% OFF First Purchase", code: "WELCOME20" }],
  services: [{ title: "First visit 15% off", code: "FIRST15" }],
  fun: [{ title: "Explora member discount", code: "EXPLORA10" }],
};

const memoryCache = new Map();

export function getDefaultCenter() {
  return { ...DEFAULT_CENTER };
}

export function getCategory(types) {
  if (!types || !types.length) return "services";
  for (let i = 0; i < types.length; i++) {
    const c = PLACE_TYPE_TO_CATEGORY[types[i]];
    if (c) return c;
  }
  return "services";
}

export function placeToBusiness(p) {
  const loc = p.geometry && p.geometry.location;
  const lat = typeof loc.lat === "function" ? loc.lat() : loc.lat;
  const lng = typeof loc.lng === "function" ? loc.lng() : loc.lng;
  return {
    place_id: p.place_id,
    name: p.name || "Unnamed",
    category: getCategory(p.types),
    lat,
    lng,
    rating: p.rating != null ? p.rating : null,
    vicinity: p.vicinity || "",
    types: p.types || [],
  };
}

export function getDemoDeals(category) {
  return DEMO_DEALS[category] || DEMO_DEALS.default;
}

function getFromStorage(placeId) {
  try {
    const raw = localStorage.getItem(LS_PREFIX + placeId);
    if (!raw) return null;
    const obj = JSON.parse(raw);
    if (obj.expiresAt && Date.now() > obj.expiresAt) {
      localStorage.removeItem(LS_PREFIX + placeId);
      return null;
    }
    return obj.data || null;
  } catch (_) {
    return null;
  }
}

function setToStorage(placeId, data) {
  try {
    localStorage.setItem(LS_PREFIX + placeId, JSON.stringify({
      data,
      expiresAt: Date.now() + CACHE_TTL_MS,
    }));
  } catch (_) {}
}

export function getCachedDetails(placeId) {
  const mem = memoryCache.get(placeId);
  if (mem) return mem;
  const stored = getFromStorage(placeId);
  if (stored) {
    memoryCache.set(placeId, stored);
    return stored;
  }
  return null;
}

export function setCachedDetails(placeId, data) {
  memoryCache.set(placeId, data);
  setToStorage(placeId, data);
}

function serializeDetails(place) {
  const reviews = (place.reviews || []).map((r) => ({
    author_name: r.author_name,
    rating: r.rating,
    text: r.text,
  }));
  return {
    name: place.name,
    rating: place.rating,
    user_ratings_total: place.user_ratings_total,
    formatted_address: place.formatted_address,
    opening_hours: place.opening_hours ? { open_now: place.opening_hours.open_now } : null,
    price_level: place.price_level,
    types: place.types || [],
    url: place.url,
    website: place.website,
    reviews,
  };
}

export function fetchPlaceDetails(placeId, placesService, map, onResult) {
  if (!placesService || !map) return;
  const cached = getCachedDetails(placeId);
  if (cached) {
    onResult(cached);
    return;
  }
  const req = { placeId, fields: PLACE_DETAILS_FIELDS };
  placesService.getDetails(req, (place, status) => {
    if (status !== google.maps.places.PlacesServiceStatus.OK || !place) {
      onResult(null);
      return;
    }
    const data = serializeDetails(place);
    setCachedDetails(placeId, data);
    onResult(data);
  });
}

function delay(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

export function runDiscovery(placesService, center, onProgress, onComplete) {
  if (!placesService) {
    if (onComplete) onComplete([]);
    return;
  }
  const seen = {};
  const merged = [];
  let idx = 0;

  function doOne() {
    if (idx >= DISCOVERY_TYPES.length) {
      const list = merged.slice(0, MAX_MARKERS);
      if (onComplete) onComplete(list);
      return;
    }
    const typeConfig = DISCOVERY_TYPES[idx];
    idx++;
    const req = {
      location: center,
      radius: NEARBY_RADIUS,
      type: typeConfig.type,
    };
    placesService.nearbySearch(req, (results, status) => {
      if (status === google.maps.places.PlacesServiceStatus.OK && results) {
        results.forEach((p) => {
          if (!seen[p.place_id]) {
            seen[p.place_id] = true;
            merged.push(placeToBusiness(p));
          }
        });
      }
      if (merged.length >= MAX_MARKERS) {
        const list = merged.slice(0, MAX_MARKERS);
        if (onComplete) onComplete(list);
        return;
      }
      if (onProgress) onProgress(merged.length);
      setTimeout(doOne, 280);
    });
  }
  doOne();
}

export function runTextSearch(placesService, map, query, center, onComplete) {
  if (!placesService || !map || !query.trim()) {
    if (onComplete) onComplete([]);
    return;
  }
  placesService.textSearch(
    { location: center, radius: 5000, query: query.trim() },
    (results, status) => {
      if (status !== google.maps.places.PlacesServiceStatus.OK || !results) {
        if (onComplete) onComplete([]);
        return;
      }
      const list = results.map(placeToBusiness).slice(0, MAX_MARKERS);
      if (onComplete) onComplete(list);
    }
  );
}
