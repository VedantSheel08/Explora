(function () {
  "use strict";
  window.initMap = function () {};
  var gmapsKey = typeof window !== "undefined" && window.EXPLORA_GMAPS_KEY;
  if (gmapsKey) {
    var s = document.createElement("script");
    s.src = "https://maps.googleapis.com/maps/api/js?key=" + encodeURIComponent(gmapsKey) + "&libraries=places&callback=initMap";
    s.async = true;
    s.defer = true;
    document.body.appendChild(s);
  }

  var VISIT_RADIUS_M = 150;
  var NEARBY_RADIUS = 1500;
  var MAX_MARKERS = 150;
  var PLACE_FIELDS = "name,rating,user_ratings_total,reviews,formatted_address,opening_hours,url,website";

  var map = null;
  var placesService = null;
  var geocoder = null;
  var directionsService = null;
  var directionsRenderer = null;
  var userMarker = null;
  var userPos = null;
  var markers = [];
  var places = [];
  var selectedPlace = null;
  var placeDetailsCache = {};
  var autocompleteInput = null;
  var autocomplete = null;
  var GEOCODE_CACHE_KEY = "explora_toronto_geocode";

  var DISCOVERY_TYPES = ["restaurant", "cafe", "store", "gym", "pharmacy", "museum", "park"];
  var CATEGORY_MAP = { all: "", food: "restaurant", retail: "store", services: "establishment" };
  var WESTIN_HARBOUR_CASTLE = { lat: 43.64084, lng: -79.37606 };
  var DEMO_CENTER = WESTIN_HARBOUR_CASTLE;
  var DEMO_PLACES = getTorontoHarbourfrontPlaces();
  var DEMO_PLACE_SHOW_RADIUS_M = 3000;
  var DEMO_DETAILS = getTorontoHarbourfrontDetails();

  var HARBOURFRONT_COORDS = {
    "1 Harbour Square": { lat: 43.64084, lng: -79.37606 },
    "10 Bay Street": { lat: 43.64218, lng: -79.37918 },
    "40 Bay Street": { lat: 43.64255, lng: -79.37935 },
    "60 Harbour Street": { lat: 43.64115, lng: -79.37718 },
    "88 Harbour Street": { lat: 43.64092, lng: -79.37755 },
    "110 Harbour Street": { lat: 43.64078, lng: -79.37795 },
    "120 Harbour Street": { lat: 43.64072, lng: -79.37825 },
    "159 Harbour Street": { lat: 43.64035, lng: -79.37915 },
    "207 Queens Quay West": { lat: 43.63995, lng: -79.3772 },
    "231 Queens Quay West": { lat: 43.63990, lng: -79.3760 },
    "235 Queens Quay West": { lat: 43.63988, lng: -79.3762 },
    "245 Queens Quay West": { lat: 43.63985, lng: -79.3755 },
    "255 Bremner Boulevard": { lat: 43.64175, lng: -79.38618 },
    "288 Bremner Boulevard": { lat: 43.64218, lng: -79.38648 },
    "290 Bremner Boulevard": { lat: 43.64248, lng: -79.38675 },
    "322 Bremner Boulevard": { lat: 43.64195, lng: -79.38685 },
    "1 Blue Jays Way": { lat: 43.64152, lng: -79.38918 },
    "9 Queens Quay West": { lat: 43.63998, lng: -79.37815 },
    "25 Dockside Drive": { lat: 43.63972, lng: -79.37485 },
    "30 Harbour Square": { lat: 43.64052, lng: -79.37572 },
    "55 Harbour Square": { lat: 43.64028, lng: -79.37528 },
    "65 Front Street West": { lat: 43.64528, lng: -79.38058 },
    "100 Front Street West": { lat: 43.64215, lng: -79.38048 },
    "255 Front Street West": { lat: 43.64198, lng: -79.38552 },
    "18 York Street": { lat: 43.64118, lng: -79.37885 },
    "70 Harbour Street": { lat: 43.64088, lng: -79.37775 },
  };

  function getTorontoHarbourfrontPlaces() {
    var vicinity = "Harbourfront, Toronto (near Westin Harbour Castle)";
    function p(name, types, rating, address) {
      var place = { name: name, vicinity: vicinity, rating: rating || 4, types: types, address: address };
      var addr = (address || "").trim();
      for (var key in HARBOURFRONT_COORDS) {
        if (addr.indexOf(key) === 0) {
          place.lat = HARBOURFRONT_COORDS[key].lat;
          place.lng = HARBOURFRONT_COORDS[key].lng;
          break;
        }
      }
      if (place.lat == null) {
        place.lat = 43.6402;
        place.lng = -79.3765;
      }
      return place;
    }
    var list = [
      p("The Westin Harbour Castle, Toronto", ["lodging", "establishment"], 4.5, "1 Harbour Square, Toronto, ON"),
      p("Toula Restaurant & Bar", ["restaurant", "bar", "food"], 4.4, "1 Harbour Square, Toronto, ON"),
      p("Harbour Sixty Steakhouse", ["restaurant", "food"], 4.6, "60 Harbour Street, Toronto, ON"),
      p("Miku Restaurant", ["restaurant", "food"], 4.7, "10 Bay Street, Toronto, ON"),
      p("Scotiabank Arena", ["stadium", "establishment"], 4.6, "40 Bay Street, Toronto, ON"),
      p("KINKA Sushi Bar Izakaya Harbourfront", ["restaurant", "food"], 4.5, "110 Harbour Street, Toronto, ON"),
      p("Kinton Ramen Harbourfront", ["restaurant", "food"], 4.4, "110 Harbour Street, Toronto, ON"),
      p("Boxcar Social Harbourfront", ["cafe", "bar", "food"], 4.5, "120 Harbour Street, Toronto, ON"),
      p("Amsterdam Brewhouse", ["restaurant", "bar", "food"], 4.4, "245 Queens Quay West, Toronto, ON"),
      p("Pearl Harbourfront Chinese Cuisine", ["restaurant", "food"], 4.6, "207 Queens Quay West, Toronto, ON"),
      p("The Goodman Pub and Kitchen", ["restaurant", "bar", "food"], 4.2, "207 Queens Quay West, Toronto, ON"),
      p("Pie Bar", ["restaurant", "cafe", "food"], 4.3, "207 Queens Quay West, Toronto, ON"),
      p("Joe Bird", ["restaurant", "food"], 4.2, "207 Queens Quay West, Toronto, ON"),
      p("Tim Horton's", ["cafe", "food"], 4.0, "207 Queens Quay West, Toronto, ON"),
      p("Farm Boy", ["store", "grocery", "food"], 4.5, "207 Queens Quay West, Toronto, ON"),
      p("CABIN Barber & Gentlemen Supply", ["store", "beauty", "services"], 4.6, "207 Queens Quay West, Toronto, ON"),
      p("Harbourfront Centre", ["museum", "establishment"], 4.7, "235 Queens Quay West, Toronto, ON"),
      p("Wild Wing Harbourfront", ["restaurant", "food"], 4.1, "88 Harbour Street, Toronto, ON"),
      p("Pizzaiolo Harbourfront", ["restaurant", "food"], 4.3, "70 Harbour Street, Toronto, ON"),
      p("Dark Horse Espresso Bar", ["cafe", "food"], 4.5, "207 Queens Quay West, Toronto, ON"),
      p("Starbucks Harbourfront", ["cafe", "food"], 4.2, "18 York Street, Toronto, ON"),
      p("Rogers Centre", ["stadium", "establishment"], 4.6, "1 Blue Jays Way, Toronto, ON"),
      p("CN Tower", ["tourist_attraction", "establishment"], 4.8, "290 Bremner Boulevard, Toronto, ON"),
      p("Ripley's Aquarium of Canada", ["aquarium", "establishment"], 4.7, "288 Bremner Boulevard, Toronto, ON"),
      p("Steam Whistle Brewery", ["bar", "establishment"], 4.6, "255 Bremner Boulevard, Toronto, ON"),
      p("The Rec Room", ["restaurant", "bar", "establishment"], 4.3, "255 Bremner Boulevard, Toronto, ON"),
      p("Cactus Club Cafe", ["restaurant", "food"], 4.4, "322 Bremner Boulevard, Toronto, ON"),
      p("Metro Toronto Convention Centre", ["establishment"], 4.5, "255 Front Street West, Toronto, ON"),
      p("Fairmont Royal York", ["lodging", "establishment"], 4.7, "100 Front Street West, Toronto, ON"),
      p("Union Station", ["transit_station", "establishment"], 4.5, "65 Front Street West, Toronto, ON"),
      p("Jack Layton Ferry Terminal", ["establishment", "transit_station"], 4.4, "9 Queens Quay West, Toronto, ON"),
      p("Power Plant Contemporary Art Gallery", ["museum", "establishment"], 4.5, "231 Queens Quay West, Toronto, ON"),
      p("Harbourfront Community Centre", ["gym", "establishment"], 4.4, "25 Dockside Drive, Toronto, ON"),
      p("Shoppers Drug Mart Harbourfront", ["pharmacy", "store"], 4.3, "207 Queens Quay West, Toronto, ON"),
    ];
    list.forEach(function (place, i) {
      place.place_id = "ChIJtoronto_" + i;
    });
    return list;
  }

  function ensureTorontoPlacesGeocoded(list) {
    if (typeof google === "undefined" || !google.maps || !google.maps.Geocoder) return Promise.resolve();
    var cache = loadJSON(GEOCODE_CACHE_KEY, {});
    var need = [];
    list.forEach(function (place) {
      if (place.lat != null && place.lng != null) return;
      var addr = (place.address || "").trim();
      if (!addr) return;
      var key = addr.toLowerCase().replace(/\s+/g, " ").trim();
      if (cache[key]) {
        place.lat = cache[key].lat;
        place.lng = cache[key].lng;
        return;
      }
      need.push({ place: place, key: key });
    });
    if (need.length === 0) return Promise.resolve();
    if (!geocoder) geocoder = new google.maps.Geocoder();
    function doOne(i) {
      if (i >= need.length) { saveJSON(GEOCODE_CACHE_KEY, cache); return Promise.resolve(); }
      var item = need[i];
      var request = { address: item.place.address + ", Canada" };
      return new Promise(function (resolve, reject) {
        geocoder.geocode(request, function (results, status) {
          if (status === "OK" && results && results[0] && results[0].geometry && results[0].geometry.location) {
            var loc = results[0].geometry.location;
            var lat = typeof loc.lat === "function" ? loc.lat() : loc.lat;
            var lng = typeof loc.lng === "function" ? loc.lng() : loc.lng;
            item.place.lat = lat;
            item.place.lng = lng;
            cache[item.key] = { lat: lat, lng: lng };
          }
          resolve();
        });
      }).then(function () {
        return new Promise(function (r) { setTimeout(r, 120); });
      }).then(function () { return doOne(i + 1); });
    }
    if (need.length > 0) showToast("Locating businesses…");
    return doOne(0);
  }

  function getTorontoHarbourfrontDetails() {
    var details = {};
    getTorontoHarbourfrontPlaces().forEach(function (p) {
      details[p.place_id] = {
        name: p.name,
        rating: p.rating,
        user_ratings_total: Math.floor(Math.random() * 80) + 20,
        formatted_address: (p.address || p.vicinity) + ", Toronto, ON",
        opening_hours: { open_now: true },
        reviews: [],
      };
    });
    return details;
  }

  function $(id) { return document.getElementById(id); }

  function loadJSON(key, def) {
    try {
      var s = localStorage.getItem(key);
      return s ? JSON.parse(s) : (def !== undefined ? def : null);
    } catch (e) { return def !== undefined ? def : null; }
  }
  function saveJSON(key, val) {
    try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) {}
  }

  var STORAGE = {
    user: "explora_user",
    userJson: "explora_user_json",
    onboarding: "explora_onboarding_done",
    interests: "explora_interests",
    scannedQR: "explora_scanned_qr",
    xp: "explora_xp",
    level: "explora_level",
    favorites: "explora_favorites",
    visits: "explora_visits",
    reviews: "explora_reviews",
    reviewCooldown: "explora_review_cooldown",
    badges: "explora_badges",
    challenges: "explora_challenges",
    completedChallenges: "explora_completed_challenges",
    placeCache: "explora_place_cache_",
  };

  var DEMO_USER = { name: "Vedant Sheel", username: "vedant123" };
  var DEMO_XP = 1240;
  var DEMO_LEVEL = 5;
  var DEMO_VISITS = 8;
  function applyDemoState() {
    saveState("xp", DEMO_XP);
    saveState("level", DEMO_LEVEL);
    var placeIds = ["ChIJdemo_panago", "ChIJdemo_diltak", "ChIJdemo1", "ChIJdemo2", "ChIJdemo3", "ChIJdemo4", "ChIJdemo5", "ChIJdemo6"];
    var visits = {};
    for (var i = 0; i < DEMO_VISITS; i++) visits[placeIds[i]] = Date.now() - (i * 86400000);
    saveState("visits", visits);
    saveJSON(STORAGE.scannedQR, { ChIJdemo_panago: Date.now(), ChIJdemo_diltak: Date.now() });
    if ($("xpValue")) $("xpValue").textContent = DEMO_XP;
  }
  function getCurrentUser() {
    try {
      var raw = localStorage.getItem(STORAGE.userJson);
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    var name = localStorage.getItem(STORAGE.user);
    return name ? { name: name, username: name.toLowerCase().replace(/\s+/g, "") } : null;
  }
  function setCurrentUser(obj) {
    if (!obj) { localStorage.removeItem(STORAGE.user); localStorage.removeItem(STORAGE.userJson); return; }
    localStorage.setItem(STORAGE.user, obj.name || obj.username || "");
    localStorage.setItem(STORAGE.userJson, JSON.stringify({ name: obj.name || "", username: obj.username || "" }));
  }

  var GEMINI_KEY = (typeof window !== "undefined" && window.EXPLORA_GEMINI_KEY) || "";

  var INTEREST_FILTER_SECTIONS = [
    {
      heading: "Eats & drinks",
      filters: [
        { emoji: "☕", label: "Coffee & tea" },
        { emoji: "🍕", label: "Pizza" },
        { emoji: "🍔", label: "Burgers" },
        { emoji: "🍜", label: "Asian food" },
        { emoji: "🌮", label: "Mexican" },
        { emoji: "🥐", label: "Bakery" },
        { emoji: "🍦", label: "Ice cream" },
        { emoji: "🥗", label: "Healthy eats" },
        { emoji: "🍣", label: "Sushi" },
        { emoji: "🍳", label: "Brunch" },
        { emoji: "🥘", label: "Indian" },
        { emoji: "🍝", label: "Italian" },
        { emoji: "🥙", label: "Mediterranean" },
        { emoji: "🍻", label: "Bars" },
        { emoji: "🧋", label: "Bubble tea" },
        { emoji: "🍩", label: "Desserts" },
        { emoji: "🌯", label: "Street food" },
        { emoji: "🥂", label: "Wine" },
      ],
    },
    {
      heading: "Shop",
      filters: [
        { emoji: "🛍️", label: "Shopping" },
        { emoji: "📚", label: "Books" },
        { emoji: "👕", label: "Clothing" },
        { emoji: "👜", label: "Thrift & vintage" },
        { emoji: "💄", label: "Beauty" },
        { emoji: "⌚", label: "Electronics" },
        { emoji: "🛒", label: "Markets" },
        { emoji: "🎁", label: "Gifts" },
        { emoji: "👟", label: "Sneakers" },
        { emoji: "🏠", label: "Home decor" },
      ],
    },
    {
      heading: "Do",
      filters: [
        { emoji: "🧘", label: "Yoga" },
        { emoji: "💪", label: "Gym" },
        { emoji: "💆", label: "Spa" },
        { emoji: "🌳", label: "Parks" },
        { emoji: "🎭", label: "Museums" },
        { emoji: "🎵", label: "Live music" },
        { emoji: "🎬", label: "Movies" },
        { emoji: "🎳", label: "Bowling" },
        { emoji: "🎮", label: "Arcade" },
        { emoji: "🏃", label: "Running" },
        { emoji: "🚴", label: "Biking" },
        { emoji: "🎨", label: "Art & galleries" },
        { emoji: "📷", label: "Photo spots" },
        { emoji: "🐕", label: "Pet-friendly" },
        { emoji: "🧩", label: "Escape rooms" },
      ],
    },
    {
      heading: "Vibes",
      filters: [
        { emoji: "🔥", label: "Trending" },
        { emoji: "✨", label: "Hidden gems" },
        { emoji: "🌙", label: "Late night" },
        { emoji: "💅", label: "Aesthetic" },
        { emoji: "🪴", label: "Chill" },
        { emoji: "⚡", label: "Hype" },
        { emoji: "🌅", label: "Sunset views" },
        { emoji: "🎪", label: "Events" },
        { emoji: "👯", label: "Group hangs" },
        { emoji: "📖", label: "Quiet & study" },
      ],
    },
  ];
  var INTEREST_FILTERS = [];
  INTEREST_FILTER_SECTIONS.forEach(function (s) { s.filters.forEach(function (f) { INTEREST_FILTERS.push(f); }); });
  var INTEREST_CATEGORIES = INTEREST_FILTERS.map(function (f) { return f.label; });

  var INTEREST_TO_KEYWORDS = {
    "Coffee & tea": ["coffee", "cafe", "tea", "espresso"],
    "Pizza": ["pizza"],
    "Burgers": ["burger"],
    "Asian food": ["asian", "sushi", "ramen", "japanese", "chinese", "thai", "vietnamese"],
    "Mexican": ["mexican", "taco", "burrito"],
    "Bakery": ["bakery"],
    "Ice cream": ["ice cream", "gelato"],
    "Healthy eats": ["healthy", "salad", "organic"],
    "Sushi": ["sushi", "japanese"],
    "Brunch": ["brunch", "breakfast"],
    "Indian": ["indian", "curry"],
    "Italian": ["italian", "pasta", "pizza"],
    "Mediterranean": ["mediterranean"],
    "Bars": ["bar", "pub"],
    "Bubble tea": ["bubble tea", "boba"],
    "Desserts": ["dessert", "cake", "pastry"],
    "Street food": ["street food"],
    "Wine": ["wine"],
    "Shopping": ["store", "shopping", "retail"],
    "Books": ["book"],
    "Clothing": ["clothing", "fashion"],
    "Thrift & vintage": ["thrift", "vintage"],
    "Beauty": ["beauty", "salon", "spa"],
    "Electronics": ["electronics"],
    "Markets": ["market", "grocery"],
    "Gifts": ["gift"],
    "Sneakers": ["sneaker", "shoe"],
    "Home decor": ["decor", "home"],
    "Yoga": ["yoga"],
    "Gym": ["gym", "fitness"],
    "Spa": ["spa"],
    "Parks": ["park"],
    "Museums": ["museum"],
    "Live music": ["music", "live"],
    "Movies": ["movie", "cinema"],
    "Bowling": ["bowling"],
    "Arcade": ["arcade"],
    "Running": ["running"],
    "Biking": ["bike", "biking", "cycling"],
    "Hiking": ["hiking", "trail"],
    "Art & galleries": ["art", "gallery"],
    "Photo spots": ["photo"],
    "Pet-friendly": ["pet"],
    "Escape rooms": ["escape"],
    "Trending": [],
    "Hidden gems": [],
    "Late night": ["night", "late"],
    "Aesthetic": [],
    "Chill": [],
    "Hype": [],
    "Sunset views": ["view", "sunset"],
    "Events": ["event"],
    "Group hangs": [],
    "Quiet & study": ["cafe", "coffee", "library"],
  };

  function getSavedInterests() {
    try {
      var raw = localStorage.getItem(STORAGE.interests);
      if (raw) {
        var arr = JSON.parse(raw);
        return Array.isArray(arr) ? arr : [];
      }
    } catch (e) {}
    return [];
  }

  function placeInterestScore(place, interestLabels) {
    if (!interestLabels || interestLabels.length === 0) return 0;
    var name = (place.name || "").toLowerCase();
    var types = (place.types || []).join(" ").toLowerCase();
    var text = name + " " + types;
    var score = 0;
    interestLabels.forEach(function (label) {
      var keywords = INTEREST_TO_KEYWORDS[label];
      if (!keywords || keywords.length === 0) return;
      keywords.forEach(function (kw) {
        if (text.indexOf(kw.toLowerCase()) >= 0) score += 1;
      });
    });
    return score;
  }

  function getRecommendedByInterests(list) {
    var interests = getSavedInterests();
    var arr = (list || []).slice();
    if (interests.length === 0) return arr;
    arr.sort(function (a, b) {
      var sa = placeInterestScore(a, interests);
      var sb = placeInterestScore(b, interests);
      if (sb !== sa) return sb - sa;
      if (userPos) return calculateDistanceMeters(userPos, { lat: a.lat, lng: a.lng }) - calculateDistanceMeters(userPos, { lat: b.lat, lng: b.lng });
      return (b.rating || 0) - (a.rating || 0);
    });
    return arr;
  }

  var PROMO_BY_CATEGORY = {
    food: [
      { title: "10% off first visit", code: "EXPLORA10" },
      { title: "Free drink with main", code: null },
    ],
    retail: [
      { title: "15% off today", code: "SHOP15" },
    ],
    services: [
      { title: "First visit discount", code: "WELCOME" },
    ],
    default: [
      { title: "Explora member deal", code: "EXPLORA" },
    ],
  };

  function getState() {
    return {
      xp: loadJSON(STORAGE.xp, 0),
      level: loadJSON(STORAGE.level, 1),
      favorites: loadJSON(STORAGE.favorites, []),
      visits: loadJSON(STORAGE.visits, {}),
      reviews: loadJSON(STORAGE.reviews, {}),
      reviewCooldown: loadJSON(STORAGE.reviewCooldown, {}),
      badges: loadJSON(STORAGE.badges, {}),
      challenges: loadJSON(STORAGE.challenges, { daily: [], weekly: [] }),
      completedChallenges: loadJSON(STORAGE.completedChallenges, {}),
    };
  }
  function saveState(k, v) {
    if (k === "xp") localStorage.setItem(STORAGE.xp, JSON.stringify(v));
    else if (k === "level") localStorage.setItem(STORAGE.level, JSON.stringify(v));
    else if (k === "favorites") saveJSON(STORAGE.favorites, v);
    else if (k === "visits") saveJSON(STORAGE.visits, v);
    else if (k === "reviews") saveJSON(STORAGE.reviews, v);
    else if (k === "reviewCooldown") saveJSON(STORAGE.reviewCooldown, v);
    else if (k === "badges") saveJSON(STORAGE.badges, v);
    else if (k === "challenges") saveJSON(STORAGE.challenges, v);
    else if (k === "completedChallenges") saveJSON(STORAGE.completedChallenges, v);
  }

  function showToast(msg) {
    var el = $("toast");
    if (!el) return;
    if (!msg) { el.classList.add("hidden"); return; }
    el.textContent = msg;
    el.classList.remove("hidden");
    clearTimeout(showToast.tid);
    showToast.tid = setTimeout(function () {
      el.classList.add("hidden");
    }, 3500);
  }

  function calculateDistanceMeters(a, b) {
    var R = 6371000;
    var dLat = ((b.lat - a.lat) * Math.PI) / 180;
    var dLng = ((b.lng - a.lng) * Math.PI) / 180;
    var x = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    return 2 * R * Math.asin(Math.sqrt(x));
  }
  function formatDistance(meters) {
    if (meters < 1000) return Math.round(meters) + " m";
    return (meters / 1000).toFixed(1) + " km";
  }

  function getUserLocation() {
    return new Promise(function (resolve) {
      if (!navigator || !navigator.geolocation) {
        resolve(null);
        return;
      }
      navigator.geolocation.getCurrentPosition(
        function (pos) {
          resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        },
        function () { resolve(null); },
        { enableHighAccuracy: true, maximumAge: 30000, timeout: 15000 }
      );
    });
  }

  function showLocationPrompt(show) {
    var el = $("locationPrompt");
    if (!el) return;
    el.classList.toggle("hidden", !show);
  }

  function startLocationWatch(cb) {
    if (!navigator || !navigator.geolocation || !cb) return;
    navigator.geolocation.watchPosition(
      function (pos) {
        userPos = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        if (userMarker && userMarker.setPosition) userMarker.setPosition(userPos);
        if (map && map.panTo) map.panTo(userPos);
        cb(userPos);
      },
      function () {},
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 15000 }
    );
  }

  function fetchNearbyPlaces(category) {
    if (!map) return Promise.resolve([]);
    var center = userPos || DEMO_CENTER;
    if (!userPos && map.setCenter) map.setCenter(DEMO_CENTER);
    var type = CATEGORY_MAP[category] || "";
    var seen = {};
    var withinRange = !userPos || calculateDistanceMeters(userPos, DEMO_CENTER) <= DEMO_PLACE_SHOW_RADIUS_M;
    var merged = withinRange ? DEMO_PLACES.slice() : [];
    if (withinRange) DEMO_PLACES.forEach(function (p) { seen[p.place_id] = true; });
    if (!placesService || !userPos) {
      return ensureTorontoPlacesGeocoded(DEMO_PLACES).then(function () {
        var out = DEMO_PLACES.slice();
        if (type === "restaurant") out = out.filter(function (p) { return (p.types || []).some(function (t) { return /restaurant|food|cafe|bar|bakery/.test(t); }); });
        else if (type === "store") out = out.filter(function (p) { return (p.types || []).some(function (t) { return /store|retail|shopping|clothing|grocery|liquor|convenience/.test(t); }); });
        else if (type === "establishment") out = out.filter(function (p) { return (p.types || []).some(function (t) { return /establishment|bank|finance|real_estate|spa|gym|health|lodging/.test(t); }); });
        var maxDemoRadius = 1200;
        out = out.filter(function (p) {
          if (p.lat == null || p.lng == null) return false;
          return calculateDistanceMeters(WESTIN_HARBOUR_CASTLE, { lat: p.lat, lng: p.lng }) <= maxDemoRadius;
        });
        return out.slice(0, MAX_MARKERS);
      });
    }
    var types = type ? [type] : DISCOVERY_TYPES.slice(0, 5);
    function runOne(i) {
      if (i >= types.length) return Promise.resolve(merged.slice(0, MAX_MARKERS));
      var req = { location: center, radius: NEARBY_RADIUS, type: types[i] };
      return new Promise(function (resolve) {
        if (typeof placesService.nearbySearch !== "function") { resolve(merged); return; }
        placesService.nearbySearch(req, function (results, status) {
          if (results && status === (google && google.maps && google.maps.places ? google.maps.places.PlacesServiceStatus.OK : "OK")) {
            results.forEach(function (p) {
              if (!seen[p.place_id]) {
                seen[p.place_id] = true;
                var loc = p.geometry && p.geometry.location;
                merged.push({
                  place_id: p.place_id,
                  name: p.name || "Unnamed",
                  vicinity: p.vicinity || "",
                  rating: p.rating,
                  types: p.types || [],
                  lat: typeof loc.lat === "function" ? loc.lat() : (loc && loc.lat),
                  lng: typeof loc.lng === "function" ? loc.lng() : (loc && loc.lng),
                });
              }
            });
          }
          resolve(merged);
        });
      }).then(function () { return runOne(i + 1); });
    }
    return runOne(0);
  }

  function getMarkerStyle(place) {
    var types = (place.types || []).join(" ").toLowerCase();
    if (/\brestaurant\b|\bfood\b|\bcafe\b|\bbar\b|\bbakery\b/.test(types)) return { fillColor: "#E74C3C", scale: 9 };
    if (/\bpark\b|\bgym\b|\bfitness\b|\byoga\b|\bhealth\b|\bmuseum\b|\bart_gallery\b|\btourist_attraction\b|\baquarium\b|\bstadium\b|\btransit_station\b/.test(types)) return { fillColor: "#27AE60", scale: 8 };
    if (/\bstore\b|\bretail\b|\bshopping\b|\bclothing\b|\bgrocery\b|\bliquor_store\b|\bconvenience\b|\bpharmacy\b|\bspa\b|\bbeauty\b|\bbank\b|\bfinance\b|\breal_estate\b|\bestablishment\b/.test(types)) return { fillColor: "#7F8C8D", scale: 8 };
    if (/\blodging\b|\bhotel\b/.test(types)) return { fillColor: "#C0392B", scale: 9 };
    return { fillColor: "#7F8C8D", scale: 8 };
  }

  var markerLabelOverlays = [];
  var MarkerLabelOverlayClass = null;
  function clearMarkerLabels() {
    markerLabelOverlays.forEach(function (ov) {
      if (ov && ov.setMap) ov.setMap(null);
    });
    markerLabelOverlays = [];
  }
  function renderMarkers(list) {
    if (!map || typeof google === "undefined" || !google.maps) return;
    markers.forEach(function (m) {
      if (m && m.setMap) m.setMap(null);
    });
    markers = [];
    clearMarkerLabels();
    (list || []).forEach(function (p) {
      var style = getMarkerStyle(p);
      var m = new google.maps.Marker({
        map: map,
        position: { lat: p.lat, lng: p.lng },
        title: p.name,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: style.scale,
          fillColor: style.fillColor,
          fillOpacity: 0.95,
          strokeColor: "#fff",
          strokeWeight: 2,
        },
      });
      m.addListener("click", function () { selectPlace(p); });
      markers.push(m);
      if (MarkerLabelOverlayClass) {
        var labelOverlay = new MarkerLabelOverlayClass(new google.maps.LatLng(p.lat, p.lng), p.name, map);
        markerLabelOverlays.push(labelOverlay);
      }
    });
  }

  function getCurrentList() {
    var searchEl = $("searchInput");
    var q = (searchEl && searchEl.value) ? searchEl.value.trim() : "";
    if (!q) return places.slice();
    return filterPlacesByQuery(places, q);
  }

  function applySort(list, sortValue) {
    var arr = (list || []).slice();
    var v = (sortValue || "recommended").toLowerCase();
    if (v === "distance" || v === "recommended") {
      arr.sort(function (a, b) {
        if (!userPos) return 0;
        return calculateDistanceMeters(userPos, { lat: a.lat, lng: a.lng }) -
          calculateDistanceMeters(userPos, { lat: b.lat, lng: b.lng });
      });
    } else if (v === "rating" || v === "trending") {
      arr.sort(function (a, b) {
        var ra = a.rating != null ? Number(a.rating) : 0;
        var rb = b.rating != null ? Number(b.rating) : 0;
        return rb - ra;
      });
    }
    return arr;
  }

  function refreshMapAndLists() {
    var sortEl = $("sortBy");
    var list = getCurrentList();
    var sorted = applySort(list, sortEl ? sortEl.value : "recommended");
    renderMarkers(sorted);
    renderLists(sorted);
  }

  function renderLists(list) {
    var list_ = list || places;
    var nearbyEl = $("nearbyList") || $("radarList");
    if (nearbyEl) {
      nearbyEl.innerHTML = "";
      var sorted = list_.slice().sort(function (a, b) {
        if (!userPos) return 0;
        return calculateDistanceMeters(userPos, { lat: a.lat, lng: a.lng }) -
          calculateDistanceMeters(userPos, { lat: b.lat, lng: b.lng });
      });
      sorted.slice(0, 10).forEach(function (p) {
        var li = document.createElement("li");
        var dist = userPos ? formatDistance(calculateDistanceMeters(userPos, { lat: p.lat, lng: p.lng })) : "";
        li.innerHTML = "<span class=\"name\">" + escapeHtml(p.name) + "</span><span class=\"meta\">" + (p.rating ? "★ " + p.rating : "") + " " + dist + "</span>";
        li.onclick = function () { selectPlace(p); };
        nearbyEl.appendChild(li);
      });
    }
    var trendingEl = $("trendingList");
    if (trendingEl) {
      trendingEl.innerHTML = "";
      list_.slice(0, 5).forEach(function (p) {
        var li = document.createElement("li");
        li.innerHTML = "<span class=\"name\">" + escapeHtml(p.name) + "</span>";
        li.onclick = function () { selectPlace(p); };
        trendingEl.appendChild(li);
      });
    }
    var recEl = $("recommendedList");
    if (recEl) {
      recEl.innerHTML = "";
      var recommended = getRecommendedByInterests(list_).slice(0, 8);
      recommended.forEach(function (p) {
        var li = document.createElement("li");
        li.innerHTML = "<span class=\"name\">" + escapeHtml(p.name) + "</span>";
        li.onclick = function () { selectPlace(p); };
        recEl.appendChild(li);
      });
    }
  }
  function escapeHtml(s) {
    if (s == null) return "";
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  function getChatContext() {
    var list = (places && places.length) ? places.slice() : [];
    var nearby = list.slice().sort(function (a, b) {
      if (!userPos) return 0;
      return calculateDistanceMeters(userPos, { lat: a.lat, lng: a.lng }) -
        calculateDistanceMeters(userPos, { lat: b.lat, lng: b.lng });
    });
    var nearbyNames = nearby.slice(0, 15).map(function (p) { return p.name; }).filter(Boolean);
    var allNames = list.map(function (p) { return p.name; }).filter(Boolean);
    var category = ($("categoryFilter") && $("categoryFilter").value) ? $("categoryFilter").value : "all";
    var locationDesc = userPos ? "The user's current location is known; places listed are near them." : "Location not yet available; places shown are from a default area.";
    var nearestDesc = nearbyNames.length ? "Closest to the user right now: " + nearbyNames.slice(0, 8).join(", ") + "." : "";
    return {
      placeNames: allNames,
      nearbyNames: nearbyNames,
      category: category,
      hasLocation: !!userPos,
      places: list,
      locationDesc: locationDesc,
      nearestDesc: nearestDesc,
    };
  }

  function getChatPlacesForQuery(userText) {
    var ctx = getChatContext();
    var list = (ctx.places || []).slice();
    if (!list.length) return { places: [], filterDesc: "no places loaded", placeNames: [] };
    var lower = (userText || "").toLowerCase();
    var types = function (p) { return (p.types || []).join(" ").toLowerCase(); };
    var name = function (p) { return (p.name || "").toLowerCase(); };
    var matches = function (p) {
      var n = name(p);
      var t = types(p);
      if (/\bpizza\b/.test(lower)) return /pizza/.test(n) || /pizza/.test(t);
      if (/\bdrink\b|\bdrinks\b|\bbeer\b|\bwine\b|\bcocktail\b|\bbar\b|\bpub\b|\bget\s+.*\s+drink\b/.test(lower)) {
        var isDrinkPlace = /bar|liquor|cafe/.test(t) || /bar|pub|brew|beer|wine|coffee|cafe/.test(n) || (/restaurant/.test(t) && /bar|brew|cafe|pub|wine/.test(n + " " + t));
        if (!isDrinkPlace) return false;
        return !(/^pizza\s|pizza\s+(hut|pizza|place)|domino'?s\s*pizza|gino'?s\s*pizza/i.test(n) || (/pizza/.test(n) && !/bar|brew|cafe|pub/.test(n)));
      }
      if (/\bcoffee\b|\bcafe\b|\btea\b/.test(lower)) {
        var isCoffeeTea = /cafe|coffee/.test(t) || /coffee|cafe|espresso|tea/.test(n);
        return isCoffeeTea && !/^pizza\s|domino|pizza\s+pizza|pizza\s+hut|gino'?s\s*pizza/i.test(n);
      }
      if (/\bburger\b/.test(lower)) return /burger/.test(n) || /burger/.test(t);
      if (/\bsushi\b|\bjapanese\b/.test(lower)) return /sushi|japanese|restaurant/.test(t) || /sushi|japanese/.test(n);
      if (/\bfood\b|\beat\b|\blunch\b|\bdinner\b|\brestaurant\b|\bmeal\b/.test(lower)) return /restaurant|food|cafe/.test(t);
      if (/\bgrocery\b|\bshop\b|\bstore\b|\bbuy\b/.test(lower)) return /store|grocery|retail/.test(t);
      if (/\bgym\b|\bfitness\b|\bworkout\b/.test(lower)) return /gym|fitness|health/.test(t);
      if (/\bspa\b|\bbeauty\b/.test(lower)) return /spa|beauty/.test(t);
      if (/\battraction\b|\btourist\b|\bsee\b|\bvisit\b/.test(lower)) return /tourist_attraction|museum|aquarium|stadium|park/.test(t);
      return true;
    };
    var filtered = list.filter(matches);
    var seenIds = {};
    var seenNames = {};
    var deduped = filtered.filter(function (p) {
      var id = (p.place_id || p.name || "").toString().trim();
      var normName = (p.name || "").toLowerCase().replace(/[\s']/g, "");
      if (seenIds[id]) return false;
      if (normName && seenNames[normName]) return false;
      seenIds[id] = true;
      if (normName) seenNames[normName] = true;
      return true;
    });
    var sorted = deduped.slice().sort(function (a, b) {
      if (userPos) {
        var da = calculateDistanceMeters(userPos, { lat: a.lat, lng: a.lng });
        var db = calculateDistanceMeters(userPos, { lat: b.lat, lng: b.lng });
        if (Math.abs(da - db) > 50) return da - db;
      }
      return (b.rating || 0) - (a.rating || 0);
    });
    var filterDesc = sorted.length === list.length ? "all nearby places" : (sorted.length + " place(s) matching what they asked for");
    var placeNames = sorted.map(function (p) { return p.name; }).filter(Boolean);
    return { places: sorted, filterDesc: filterDesc, placeNames: placeNames };
  }

  function findMentionedPlaces(text) {
    if (!text || typeof text !== "string") return [];
    var ctx = getChatContext();
    var list = (ctx.places || []).slice();
    list.sort(function (a, b) { return (b.name || "").length - (a.name || "").length; });
    var seen = {};
    var out = [];
    var lower = text.toLowerCase();
    var wordsInText = lower.split(/\s+/).map(function (w) { return w.replace(/[^\w]/g, ""); }).filter(function (w) { return w.length >= 2; });
    list.forEach(function (p) {
      var name = (p.name || "").trim();
      if (!name || seen[p.place_id]) return;
      var nameLower = name.toLowerCase();
      if (lower.indexOf(nameLower) >= 0) {
        seen[p.place_id] = true;
        out.push(p);
        return;
      }
      var nameWords = nameLower.split(/\s+/).map(function (w) { return w.replace(/[^\w]/g, ""); }).filter(Boolean);
      for (var i = 0; i < nameWords.length; i++) {
        if (nameWords[i].length < 2) continue;
        if (lower.indexOf(nameWords[i]) >= 0) {
          seen[p.place_id] = true;
          out.push(p);
          break;
        }
      }
    });
    return out;
  }

  function filterPlacesByQuery(list, query) {
    if (!query || !list || !list.length) return list.slice();
    var q = query.toLowerCase();
    var match = function (p) {
      var name = (p.name || "").toLowerCase();
      var types = (p.types || []).join(" ").toLowerCase();
      return name.indexOf(q) >= 0 || types.indexOf(q) >= 0 ||
        (q.indexOf("coffee") >= 0 && (name.indexOf("cafe") >= 0 || name.indexOf("coffee") >= 0 || types.indexOf("cafe") >= 0)) ||
        (q.indexOf("pizza") >= 0 && (name.indexOf("pizza") >= 0 || types.indexOf("restaurant") >= 0)) ||
        (q.indexOf("breakfast") >= 0 && (types.indexOf("cafe") >= 0 || types.indexOf("restaurant") >= 0 || name.indexOf("breakfast") >= 0));
    };
    return list.filter(match);
  }

  function getPlaceDetails(placeId, cb, skipCache) {
    if (!placeId || !cb) return;
    if (DEMO_DETAILS[placeId]) { cb(DEMO_DETAILS[placeId]); return; }
    if (!skipCache && placeDetailsCache[placeId]) {
      cb(placeDetailsCache[placeId]);
      return;
    }
    if (!skipCache) {
      try {
        var cached = localStorage.getItem(STORAGE.placeCache + placeId);
        if (cached) {
          var data = JSON.parse(cached);
          placeDetailsCache[placeId] = data;
          cb(data);
          return;
        }
      } catch (e) {}
    }
    if (!placesService || !map) { cb(null); return; }
    var req = { placeId: placeId, fields: PLACE_FIELDS };
    placesService.getDetails(req, function (place, status) {
      var ok = google && google.maps && google.maps.places && (google.maps.places.PlacesServiceStatus && google.maps.places.PlacesServiceStatus.OK);
      if (!place || (ok ? status !== google.maps.places.PlacesServiceStatus.OK : status !== "OK")) {
        cb(null);
        return;
      }
      var reviews = place.reviews;
      if (!Array.isArray(reviews)) reviews = [];
      var data = {
        name: place.name,
        rating: place.rating,
        user_ratings_total: place.user_ratings_total,
        reviews: reviews.slice(0, 5),
        formatted_address: place.formatted_address,
        opening_hours: place.opening_hours ? { open_now: place.opening_hours.open_now } : null,
        url: place.url,
        website: place.website,
      };
      placeDetailsCache[placeId] = data;
      try {
        if (reviews.length > 0) localStorage.setItem(STORAGE.placeCache + placeId, JSON.stringify(data));
        else localStorage.removeItem(STORAGE.placeCache + placeId);
      } catch (e) {}
      cb(data);
    });
  }

  function renderBusinessDetails(basic, details) {
    var titleEl = $("panelTitle");
    var addrEl = $("panelAddress");
    var ratingEl = $("panelRating");
    var hoursEl = $("panelHours");
    if (titleEl) titleEl.textContent = basic ? basic.name : "";
    if (ratingEl) ratingEl.textContent = (details && details.rating != null) ? "★ " + details.rating + (details.user_ratings_total != null ? " (" + details.user_ratings_total + ")" : "") : (basic && basic.rating != null) ? "★ " + basic.rating : "";
    if (addrEl) addrEl.textContent = (details && details.formatted_address) ? details.formatted_address : (basic ? basic.vicinity : "") || "";
    if (hoursEl) hoursEl.textContent = (details && details.opening_hours && details.opening_hours.open_now !== undefined) ? (details.opening_hours.open_now ? "Open now" : "Closed") : "";
    renderPromos(basic ? basic.types : []);
    renderExploraReviews(basic ? basic.place_id : null);
    ensurePanelRewardsQR();
    updateVisitButton();
    updateFavoriteButton();
    updateDirectionsButton();
  }
  function renderPromos(types) {
    var el = $("panelPromos");
    if (!el) return;
    var category = "default";
    if (types && types.length) {
      if (types.some(function (t) { return /restaurant|cafe|food|bar/.test(t); })) category = "food";
      else if (types.some(function (t) { return /store|shop|clothing|book/.test(t); })) category = "retail";
      else category = "services";
    }
    var promos = PROMO_BY_CATEGORY[category] || PROMO_BY_CATEGORY.default;
    el.innerHTML = "";
    promos.forEach(function (p) {
      var div = document.createElement("div");
      div.className = "promo-item";
      div.innerHTML = "<strong>" + escapeHtml(p.title) + "</strong>" + (p.code ? " <code>" + escapeHtml(p.code) + "</code>" : "");
      el.appendChild(div);
    });
  }
  function ensurePanelRewardsQR() {
    var qrEl = $("panelExploraRewardsQR");
    if (!qrEl || typeof QRCode === "undefined" || qrEl.hasChildNodes()) return;
    try {
      new QRCode(qrEl, { text: "EXPLORA-REWARDS", width: 120, height: 120 });
    } catch (e) {}
  }
  function renderExploraReviews(placeId) {
    var el = $("exploraReviews");
    if (!el) return;
    if (!placeId) { el.innerHTML = "<p class=\"muted small\">Select a place.</p>"; return; }
    var list = (getState().reviews || {})[placeId] || [];
    if (list.length === 0) { el.innerHTML = "<p class=\"muted small\">No Explora reviews yet.</p>"; return; }
    el.innerHTML = "";
    list.forEach(function (r) {
      var div = document.createElement("div");
      div.className = "review-item";
      div.innerHTML = "<span class=\"stars\">" + "★".repeat(r.stars || 0) + "</span><p>" + escapeHtml(r.text || "") + "</p>";
      el.appendChild(div);
    });
  }

  function updateVisitButton() {
    var btn = $("visitBtn");
    if (!btn || !selectedPlace) return;
    var dist = userPos ? calculateDistanceMeters(userPos, { lat: selectedPlace.lat, lng: selectedPlace.lng }) : Infinity;
    btn.disabled = !userPos;
    btn.textContent = dist <= VISIT_RADIUS_M ? "Visit (+XP)" : "Get within " + VISIT_RADIUS_M + "m";
  }
  function updateFavoriteButton() {
    var btn = $("bookmarkBtn");
    if (!btn || !selectedPlace) return;
    var fav = (getState().favorites || []).some(function (f) { return (typeof f === "string" ? f : f.id) === selectedPlace.place_id; });
    btn.classList.toggle("bookmarked", fav);
    btn.textContent = fav ? "Saved" : "Save";
  }
  function updateDirectionsButton() {
    var mapBtn = $("directionsMapBtn");
    var googleBtn = $("directionsGoogleBtn");
    if (mapBtn) mapBtn.disabled = !selectedPlace;
    if (googleBtn) googleBtn.disabled = !selectedPlace;
  }

  function handleVisit() {
    if (!selectedPlace) return;
    if (!userPos) {
      showToast("Enable location to visit.");
      return;
    }
    var dist = calculateDistanceMeters(userPos, { lat: selectedPlace.lat, lng: selectedPlace.lng });
    if (dist > VISIT_RADIUS_M) {
      showToast("Get within " + VISIT_RADIUS_M + "m to visit (you're " + formatDistance(dist) + " away).");
      return;
    }
    var state = getState();
    if (state.visits[selectedPlace.place_id]) {
      showToast("Already visited this place.");
      return;
    }
    state.visits[selectedPlace.place_id] = Date.now();
    saveState("visits", state.visits);
    var xp = 50;
    state.xp = (state.xp || 0) + xp;
    state.level = Math.floor(state.xp / 250) + 1;
    saveState("xp", state.xp);
    saveState("level", state.level);
    if ($("xpValue")) $("xpValue").textContent = state.xp;
    showToast("+50 XP! Visited.");
    updateVisitButton();
  }

  function selectPlace(p) {
    selectedPlace = p;
    var empty = $("panelEmpty");
    var content = $("panelContent");
    if (empty) empty.classList.add("hidden");
    if (content) content.classList.remove("hidden");
    renderBusinessDetails(p, null);
    if ($("panelTitle")) $("panelTitle").textContent = p.name;
    showToast("Loading details…");
    getPlaceDetails(p.place_id, function (details) {
      if (selectedPlace && selectedPlace.place_id === p.place_id) {
        renderBusinessDetails(p, details);
      }
      showToast("");
    });
    if (directionsRenderer && directionsRenderer.setMap) directionsRenderer.setMap(null);
    if (map && p.lat != null && p.lng != null) map.panTo({ lat: p.lat, lng: p.lng });
  }

  function drawRoute(origin, destination) {
    if (!directionsService || !directionsRenderer || !map) return;
    directionsRenderer.setMap(null);
    directionsRenderer.setMap(map);
    directionsService.route(
      {
        origin: origin,
        destination: destination,
        travelMode: google.maps.TravelMode.WALKING,
      },
      function (response, status) {
        if (status === (google && google.maps && google.maps.DirectionsStatus ? google.maps.DirectionsStatus.OK : "OK") && response) {
          directionsRenderer.setDirections(response);
        } else {
          showToast("Could not get route.");
        }
      }
    );
  }

  function openGoogleMapsDirections(destLat, destLng) {
    var lat = Number(destLat);
    var lng = Number(destLng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
    var origin = userPos && Number.isFinite(userPos.lat) && Number.isFinite(userPos.lng)
      ? userPos.lat + "," + userPos.lng : "";
    var dest = lat + "," + lng;
    var url = "https://www.google.com/maps/dir/?api=1&destination=" + encodeURIComponent(dest);
    if (origin) url += "&origin=" + encodeURIComponent(origin);
    window.open(url, "_blank");
  }

  function initAutocomplete() {
    var input = $("destinationInput");
    if (!input || typeof google === "undefined" || !google.maps || !google.maps.places) return;
    autocompleteInput = input;
    autocomplete = new google.maps.places.Autocomplete(input, {
      types: ["establishment"],
      fields: ["place_id", "geometry", "name", "formatted_address"],
    });
    autocomplete.addListener("place_changed", function () {
      var place = autocomplete.getPlace();
      if (!place || !place.geometry || !place.geometry.location) return;
      var loc = place.geometry.location;
      var lat = typeof loc.lat === "function" ? loc.lat() : loc.lat;
      var lng = typeof loc.lng === "function" ? loc.lng() : loc.lng;
      if (userPos) drawRoute(userPos, { lat: lat, lng: lng });
      openGoogleMapsDirections(lat, lng);
    });
  }

  function initMap() {
    if (typeof google === "undefined" || !google.maps) {
      showToast("Google Maps failed to load.");
      return;
    }
    if (!MarkerLabelOverlayClass) {
      function MarkerLabelOverlay(position, text, map) {
        this.position = position;
        this.text = text;
        this.div = null;
        this.setMap(map);
      }
      MarkerLabelOverlay.prototype = new google.maps.OverlayView();
      MarkerLabelOverlay.prototype.onAdd = function () {
        this.div = document.createElement("div");
        this.div.className = "map-marker-label";
        this.div.textContent = (this.text || "").substring(0, 28);
        this.div.title = this.text || "";
        this.div.style.cssText = "position:absolute;pointer-events:none;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:160px;font-size:11px;font-weight:600;color:#1a1a1a;text-shadow:0 0 2px #fff,0 1px 2px #fff;padding:2px 6px;background:rgba(255,255,255,0.95);border-radius:4px;box-shadow:0 1px 3px rgba(0,0,0,0.2);margin-left:-50%;margin-top:8px;";
        var panes = this.getPanes();
        if (panes && panes.overlayMouseTarget) panes.overlayMouseTarget.appendChild(this.div);
      };
      MarkerLabelOverlay.prototype.draw = function () {
        if (!this.div || !this.position) return;
        var proj = this.getProjection();
        if (!proj) return;
        var point = proj.fromLatLngToDivPixel(this.position);
        if (point) {
          this.div.style.left = point.x + "px";
          this.div.style.top = point.y + "px";
        }
      };
      MarkerLabelOverlay.prototype.onRemove = function () {
        if (this.div && this.div.parentNode) this.div.parentNode.removeChild(this.div);
        this.div = null;
      };
      MarkerLabelOverlayClass = MarkerLabelOverlay;
    }
    populateCategoryFilter();
    var mapEl = $("map");
    if (!mapEl) return;

    map = new google.maps.Map(mapEl, {
      center: { lat: 20, lng: 0 },
      zoom: 2,
      mapTypeControl: true,
      mapTypeControlOptions: {
        position: google.maps.ControlPosition.TOP_RIGHT,
        style: google.maps.MapTypeControlStyle.HORIZONTAL_BAR,
        mapTypeIds: ["roadmap", "satellite", "hybrid"],
      },
      streetViewControl: false,
      fullscreenControl: true,
      zoomControl: true,
    });
    placesService = new google.maps.places.PlacesService(map);
    directionsService = new google.maps.DirectionsService();
    directionsRenderer = new google.maps.DirectionsRenderer({ suppressMarkers: false });

    showToast("Getting your location…");
    getUserLocation().then(function (pos) {
      if (pos) {
        userPos = pos;
        map.setCenter(userPos);
        map.setZoom(15);
        if (userMarker && userMarker.setMap) userMarker.setMap(null);
        userMarker = new google.maps.Marker({
          map: map,
          position: userPos,
          title: "You",
          zIndex: 999,
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 14,
            fillColor: "#2563eb",
            fillOpacity: 1,
            strokeColor: "#fff",
            strokeWeight: 3,
          },
        });
        startLocationWatch(function () {
          renderLists(places);
          updateVisitButton();
        });
        showLocationPrompt(false);
        showToast("Showing places near you.");
        fetchNearbyPlaces($("categoryFilter") ? $("categoryFilter").value : "all").then(function (list) {
          places = list || [];
          refreshMapAndLists();
          if (places.length === 0) showToast("No places in this area. Try another category.");
        });
      } else {
        userPos = null;
        showLocationPrompt(true);
        showToast("Showing 100+ businesses near Westin Harbour Castle, Toronto.");
        map.setCenter(DEMO_CENTER);
        map.setZoom(15);
        fetchNearbyPlaces($("categoryFilter") ? $("categoryFilter").value : "all").then(function (list) {
          places = list || [];
          refreshMapAndLists();
        });
      }
    });

    var catEl = $("categoryFilter");
    if (catEl) catEl.addEventListener("change", function () {
      fetchNearbyPlaces(catEl.value).then(function (list) {
        places = list || [];
        refreshMapAndLists();
      });
    });

    var visitBtn = $("visitBtn");
    if (visitBtn) visitBtn.addEventListener("click", handleVisit);

    var bookmarkBtn = $("bookmarkBtn");
    if (bookmarkBtn) bookmarkBtn.addEventListener("click", function () {
      if (!selectedPlace) return;
      var state = getState();
      var fav = state.favorites || [];
      var id = selectedPlace.place_id;
      var name = selectedPlace.name || "Place";
      var idx = fav.findIndex(function (f) { return (typeof f === "string" ? f : f.id) === id; });
      if (idx >= 0) fav.splice(idx, 1);
      else {
        var lat = selectedPlace.lat != null ? Number(typeof selectedPlace.lat === "function" ? selectedPlace.lat() : selectedPlace.lat) : null;
        var lng = selectedPlace.lng != null ? Number(typeof selectedPlace.lng === "function" ? selectedPlace.lng() : selectedPlace.lng) : null;
        fav.push({ id: id, name: name, lat: lat, lng: lng });
      }
      saveState("favorites", fav);
      updateFavoriteButton();
      showToast(idx >= 0 ? "Removed from saved." : "Saved.");
    });

    var dirMapBtn = $("directionsMapBtn");
    if (dirMapBtn) dirMapBtn.addEventListener("click", function () {
      if (!selectedPlace || !userPos) return;
      drawRoute(userPos, { lat: selectedPlace.lat, lng: selectedPlace.lng });
    });
    var dirGoogleBtn = $("directionsGoogleBtn");
    if (dirGoogleBtn) dirGoogleBtn.addEventListener("click", function () {
      if (!selectedPlace) return;
      openGoogleMapsDirections(selectedPlace.lat, selectedPlace.lng);
    });

    initAutocomplete();

    var useLocBtn = $("useLocationBtn");
    if (useLocBtn) useLocBtn.addEventListener("click", function () {
      useLocBtn.disabled = true;
      useLocBtn.textContent = "Getting location…";
      getUserLocation().then(function (pos) {
        useLocBtn.disabled = false;
        useLocBtn.textContent = "Use my location";
        if (pos) {
          userPos = pos;
          map.setCenter(userPos);
          map.setZoom(15);
          if (userMarker && userMarker.setMap) userMarker.setMap(null);
          userMarker = new google.maps.Marker({
            map: map,
            position: userPos,
            title: "You",
            zIndex: 999,
            icon: {
              path: google.maps.SymbolPath.CIRCLE,
              scale: 14,
              fillColor: "#2563eb",
              fillOpacity: 1,
              strokeColor: "#fff",
              strokeWeight: 3,
            },
          });
          startLocationWatch(function () {
            renderLists(places);
            updateVisitButton();
          });
          showLocationPrompt(false);
          showToast("Showing places near you.");
          fetchNearbyPlaces($("categoryFilter") ? $("categoryFilter").value : "all").then(function (list) {
            places = list || [];
            refreshMapAndLists();
          });
        } else {
          showToast("Could not get location. Enable it in browser settings and try again.");
        }
      });
    });

    var xpEl = $("xpValue");
    if (xpEl) xpEl.textContent = getState().xp || 0;

    var searchEl = $("searchInput");
    if (searchEl) searchEl.addEventListener("input", function () { refreshMapAndLists(); });

    var sortEl = $("sortBy");
    if (sortEl) sortEl.addEventListener("change", function () { refreshMapAndLists(); });

    function claimScanCode(code) {
      if (!code) return false;
      var match = code.match(/explora:([\w-]+)/i);
      var placeId = match ? match[1] : code;
      var scanned = loadJSON(STORAGE.scannedQR, {});
      if (scanned[placeId]) { showToast("Already claimed for this place."); return true; }
      scanned[placeId] = Date.now();
      saveJSON(STORAGE.scannedQR, scanned);
      var state = getState();
      state.xp = (state.xp || 0) + 25;
      state.level = Math.floor(state.xp / 250) + 1;
      saveState("xp", state.xp);
      saveState("level", state.level);
      if ($("xpValue")) $("xpValue").textContent = state.xp;
      if ($("scanCodeInput")) $("scanCodeInput").value = "";
      if ($("panelScanCodeInput")) $("panelScanCodeInput").value = "";
      showToast("+25 XP! Code claimed.");
      return true;
    }
    var scanSubmit = $("scanSubmitBtn");
    if (scanSubmit) scanSubmit.addEventListener("click", function () {
      var input = $("scanCodeInput");
      var code = (input && input.value) ? input.value.trim() : "";
      if (!code) { showToast("Enter a code or scan with camera/upload."); return; }
      claimScanCode(code);
    });
    var panelScanSubmit = $("panelScanSubmitBtn");
    if (panelScanSubmit) panelScanSubmit.addEventListener("click", function () {
      var input = $("panelScanCodeInput");
      var code = (input && input.value) ? input.value.trim() : "";
      if (!code) { showToast("Enter a code or scan with camera/upload."); return; }
      claimScanCode(code);
    });
    (function initScanCameraAndUpload() {
      var cameraBtn = $("scanCameraBtn");
      var uploadBtn = $("scanUploadBtn");
      var fileInput = $("scanFileInput");
      var cameraArea = $("scanCameraArea");
      var videoEl = $("scanVideo");
      var stopBtn = $("scanCameraStop");
      var codeInput = $("scanCodeInput");
      var stream = null;
      var scanCanvas = document.createElement("canvas");
      var scanCtx = scanCanvas.getContext("2d");
      function stopCamera() {
        if (stream) { stream.getTracks().forEach(function (t) { t.stop(); }); stream = null; }
        if (videoEl) videoEl.srcObject = null;
        if (cameraArea) cameraArea.classList.add("hidden");
      }
      function tryDecodeFromVideo() {
        if (!videoEl || !scanCtx || videoEl.readyState !== videoEl.HAVE_ENOUGH_DATA || !stream) return;
        scanCanvas.width = videoEl.videoWidth;
        scanCanvas.height = videoEl.videoHeight;
        scanCtx.drawImage(videoEl, 0, 0);
        var data = scanCtx.getImageData(0, 0, scanCanvas.width, scanCanvas.height);
        if (typeof jsQR !== "undefined") {
          var result = jsQR(data.data, data.width, data.height);
          if (result && result.data) {
            if (codeInput) codeInput.value = result.data;
            showToast("Code found — tap Claim.");
            stopCamera();
            return;
          }
        }
        requestAnimationFrame(tryDecodeFromVideo);
      }
      if (cameraBtn && videoEl) cameraBtn.addEventListener("click", function () {
        if (stream) { stopCamera(); return; }
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          showToast("Camera not supported. Use upload or type the code.");
          return;
        }
        navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } }).then(function (s) {
          stream = s;
          videoEl.srcObject = s;
          if (cameraArea) cameraArea.classList.remove("hidden");
          videoEl.onloadedmetadata = function () { videoEl.play(); tryDecodeFromVideo(); };
        }).catch(function () { showToast("Camera access denied. Use upload or type the code."); });
      });
      if (stopBtn) stopBtn.addEventListener("click", stopCamera);
      if (uploadBtn && fileInput) uploadBtn.addEventListener("click", function () { fileInput.click(); });
      if (fileInput) fileInput.addEventListener("change", function () {
        var file = fileInput.files && fileInput.files[0];
        if (!file) return;
        var img = new Image();
        img.onload = function () {
          scanCanvas.width = img.width;
          scanCanvas.height = img.height;
          scanCtx.drawImage(img, 0, 0);
          var data = scanCtx.getImageData(0, 0, scanCanvas.width, scanCanvas.height);
          if (typeof jsQR !== "undefined") {
            var result = jsQR(data.data, data.width, data.height);
            if (result && result.data) {
              if (codeInput) codeInput.value = result.data;
              showToast("Code found — tap Claim.");
            } else showToast("No QR code found in image.");
          } else showToast("Decoder not loaded. Paste the code manually.");
          fileInput.value = "";
        };
        img.onerror = function () { showToast("Could not load image."); fileInput.value = ""; };
        img.src = URL.createObjectURL(file);
      });
    })();

    (function initPanelScanCameraAndUpload() {
      var cameraBtn = $("panelScanCameraBtn");
      var uploadBtn = $("panelScanUploadBtn");
      var fileInput = $("panelScanFileInput");
      var cameraArea = $("panelScanCameraArea");
      var videoEl = $("panelScanVideo");
      var stopBtn = $("panelScanCameraStop");
      var codeInput = $("panelScanCodeInput");
      var stream = null;
      var scanCanvas = document.createElement("canvas");
      var scanCtx = scanCanvas.getContext("2d");
      function stopCamera() {
        if (stream) { stream.getTracks().forEach(function (t) { t.stop(); }); stream = null; }
        if (videoEl) videoEl.srcObject = null;
        if (cameraArea) cameraArea.classList.add("hidden");
      }
      function tryDecodeFromVideo() {
        if (!videoEl || !scanCtx || videoEl.readyState !== videoEl.HAVE_ENOUGH_DATA || !stream) return;
        scanCanvas.width = videoEl.videoWidth;
        scanCanvas.height = videoEl.videoHeight;
        scanCtx.drawImage(videoEl, 0, 0);
        var data = scanCtx.getImageData(0, 0, scanCanvas.width, scanCanvas.height);
        if (typeof jsQR !== "undefined") {
          var result = jsQR(data.data, data.width, data.height);
          if (result && result.data) {
            if (codeInput) codeInput.value = result.data;
            showToast("Code found — tap Claim.");
            stopCamera();
            return;
          }
        }
        requestAnimationFrame(tryDecodeFromVideo);
      }
      if (cameraBtn && videoEl) cameraBtn.addEventListener("click", function () {
        if (stream) { stopCamera(); return; }
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          showToast("Camera not supported. Use upload or type the code.");
          return;
        }
        navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } }).then(function (s) {
          stream = s;
          videoEl.srcObject = s;
          if (cameraArea) cameraArea.classList.remove("hidden");
          videoEl.onloadedmetadata = function () { videoEl.play(); tryDecodeFromVideo(); };
        }).catch(function () { showToast("Camera access denied. Use upload or type the code."); });
      });
      if (stopBtn) stopBtn.addEventListener("click", stopCamera);
      if (uploadBtn && fileInput) uploadBtn.addEventListener("click", function () { fileInput.click(); });
      if (fileInput) fileInput.addEventListener("change", function () {
        var file = fileInput.files && fileInput.files[0];
        if (!file) return;
        var img = new Image();
        img.onload = function () {
          scanCanvas.width = img.width;
          scanCanvas.height = img.height;
          scanCtx.drawImage(img, 0, 0);
          var data = scanCtx.getImageData(0, 0, scanCanvas.width, scanCanvas.height);
          if (typeof jsQR !== "undefined") {
            var result = jsQR(data.data, data.width, data.height);
            if (result && result.data) {
              if (codeInput) codeInput.value = result.data;
              showToast("Code found — tap Claim.");
            } else showToast("No QR code found in image.");
          } else showToast("Decoder not loaded. Paste the code manually.");
          fileInput.value = "";
        };
        img.onerror = function () { showToast("Could not load image."); fileInput.value = ""; };
        img.src = URL.createObjectURL(file);
      });
    })();

    var addReviewBtn = $("addReviewBtn");
    if (addReviewBtn) addReviewBtn.addEventListener("click", function () {
      if (!selectedPlace) { showToast("Select a place first."); return; }
      var state = getState();
      state.reviews[selectedPlace.place_id] = state.reviews[selectedPlace.place_id] || [];
      var stars = parseInt($("reviewStars") ? $("reviewStars").value : 5, 10);
      var text = ($("reviewText") ? $("reviewText").value : "").trim();
      var lat = selectedPlace.lat != null ? Number(typeof selectedPlace.lat === "function" ? selectedPlace.lat() : selectedPlace.lat) : null;
      var lng = selectedPlace.lng != null ? Number(typeof selectedPlace.lng === "function" ? selectedPlace.lng() : selectedPlace.lng) : null;
      state.reviews[selectedPlace.place_id].push({
        stars: stars, text: text, at: Date.now(), placeName: selectedPlace.name || "Place",
        lat: lat, lng: lng
      });
      state.reviewCooldown[selectedPlace.place_id] = Date.now();
      saveState("reviews", state.reviews);
      saveState("reviewCooldown", state.reviewCooldown);
      if ($("reviewText")) $("reviewText").value = "";
      renderExploraReviews(selectedPlace.place_id);
      showToast("Review submitted.");
    });
  }

  function showScreen(name) {
    var targetId = "screen-" + name;
    ["screen-login", "screen-onboarding", "screen-app"].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) {
        var show = id === targetId;
        el.classList.toggle("hidden", !show);
        el.style.display = show ? (id === "screen-app" ? "flex" : "flex") : "none";
      }
    });
    if (name === "app") {
      initRouter();
      initTheme();
      populateCategoryFilter();
      initChatbot();
      initProfile();
      renderRewardsPage();
      renderBadgesPage();
      renderChallengesPage();
      requestAnimationFrame(function () {
        if (map && typeof google !== "undefined" && google.maps && google.maps.event) {
          google.maps.event.trigger(map, "resize");
          if (userPos) map.setCenter(userPos);
          else if (map.setCenter) map.setCenter(DEMO_CENTER);
        }
      });
      setTimeout(function () {
        if (places.length === 0 && map) {
          fetchNearbyPlaces($("categoryFilter") ? $("categoryFilter").value : "all").then(function (list) {
            places = list || [];
            refreshMapAndLists();
          });
        } else {
          refreshMapAndLists();
        }
      }, 300);
    }
  }
  var LOGIN_USER = "vedant123";
  var LOGIN_PASS = "1234";
  function initLogin() {
    var form = document.getElementById("loginForm");
    var usernameInput = document.getElementById("loginUsername");
    var passwordInput = document.getElementById("loginPassword");
    var errorEl = document.getElementById("loginError");
    var submitBtn = document.getElementById("loginSubmitBtn");
    var tabSignIn = document.getElementById("authTabSignIn");
    var tabSignUp = document.getElementById("authTabSignUp");
    var signUpMode = false;
    function showError(msg) {
      if (errorEl) {
        errorEl.textContent = msg || "";
        errorEl.classList.toggle("hidden", !msg);
      }
    }
    function setMode(signUp) {
      signUpMode = !!signUp;
      showError("");
      if (passwordInput) passwordInput.style.display = signUp ? "none" : "block";
      if (passwordInput) passwordInput.required = !signUp;
      if (usernameInput) usernameInput.placeholder = signUp ? "Choose username" : "Username";
      if (submitBtn) submitBtn.textContent = signUp ? "Sign up" : "Sign in";
      if (tabSignIn) tabSignIn.classList.toggle("active", !signUp);
      if (tabSignUp) tabSignUp.classList.toggle("active", signUp);
    }
    if (tabSignIn) tabSignIn.addEventListener("click", function () { setMode(false); });
    if (tabSignUp) tabSignUp.addEventListener("click", function () { setMode(true); });
    setMode(false);
    if (usernameInput) usernameInput.addEventListener("input", showError);
    if (passwordInput) passwordInput.addEventListener("input", showError);
    function doLogin() {
      var username = (usernameInput && usernameInput.value) ? String(usernameInput.value).trim() : "";
      var password = (passwordInput && passwordInput.value) ? String(passwordInput.value) : "";
      if (!username && !signUpMode) { showError("Enter username and password."); return; }
      if (signUpMode) {
        if (!username) { showError("Choose a username."); return; }
        setCurrentUser({ name: username, username: username });
        if (username === LOGIN_USER) try { applyDemoState(); } catch (e) {}
        showError("");
        var loginEl = document.getElementById("screen-login");
        var appEl = document.getElementById("screen-app");
        var onboardingEl = document.getElementById("screen-onboarding");
        if (!localStorage.getItem(STORAGE.onboarding)) {
          if (loginEl) loginEl.style.display = "none";
          if (appEl) appEl.style.display = "none";
          if (onboardingEl) onboardingEl.style.display = "flex";
          showScreen("onboarding");
          initOnboarding();
        } else {
          if (loginEl) loginEl.style.display = "none";
          if (onboardingEl) onboardingEl.style.display = "none";
          if (appEl) appEl.style.display = "flex";
          window.location.hash = "#/home";
          showScreen("app");
        }
        return;
      }
      var passwordTrimmed = String(password || "").trim();
      if (String(username).trim() !== String(LOGIN_USER).trim() || passwordTrimmed !== String(LOGIN_PASS).trim()) {
        showError("Wrong username or password. Try again.");
        return;
      }
      showError("");
      setCurrentUser({ name: "Vedant Sheel", username: LOGIN_USER });
      try {
        applyDemoState();
      } catch (err) {}
      function goToApp() {
        var loginEl = document.getElementById("screen-login");
        var appEl = document.getElementById("screen-app");
        var onboardingEl = document.getElementById("screen-onboarding");
        if (!localStorage.getItem(STORAGE.onboarding)) {
          if (loginEl) { loginEl.style.display = "none"; loginEl.setAttribute("aria-hidden", "true"); }
          if (appEl) appEl.style.display = "none";
          if (onboardingEl) { onboardingEl.style.display = "flex"; onboardingEl.classList.remove("hidden"); }
          showScreen("onboarding");
          initOnboarding();
        } else {
          if (loginEl) { loginEl.style.display = "none"; loginEl.setAttribute("aria-hidden", "true"); }
          if (onboardingEl) onboardingEl.style.display = "none";
          if (appEl) { appEl.style.display = "flex"; appEl.classList.remove("hidden"); }
          window.location.hash = "#/home";
          showScreen("app");
        }
      }
      setTimeout(goToApp, 0);
    }
    if (form) {
      form.addEventListener("submit", function (e) {
        e.preventDefault();
        e.stopPropagation();
        doLogin();
        return false;
      });
    }
    if (submitBtn) {
      submitBtn.addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();
        doLogin();
      });
    }
  }
  function initOnboarding() {
    var container = document.getElementById("onboardingFilterSections");
    if (container) {
      container.innerHTML = "";
      INTEREST_FILTER_SECTIONS.forEach(function (section) {
        var sectionEl = document.createElement("div");
        sectionEl.className = "onboarding-section";
        var heading = document.createElement("h3");
        heading.className = "onboarding-section-heading";
        heading.textContent = section.heading;
        sectionEl.appendChild(heading);
        var chipWrap = document.createElement("div");
        chipWrap.className = "onboarding-chips-grid";
        section.filters.forEach(function (f) {
          var chip = document.createElement("button");
          chip.type = "button";
          chip.className = "category-chip";
          chip.setAttribute("data-label", f.label);
          chip.innerHTML = "<span class=\"chip-emoji\">" + f.emoji + "</span><span class=\"chip-label\">" + f.label + "</span>";
          chip.addEventListener("click", function () { chip.classList.toggle("selected"); });
          chipWrap.appendChild(chip);
        });
        sectionEl.appendChild(chipWrap);
        container.appendChild(sectionEl);
      });
    }
    var doneBtn = document.getElementById("onboardingDone");
    var chipSelector = ".category-chip.selected";
    if (doneBtn) doneBtn.addEventListener("click", function () {
      var selected = [];
      document.querySelectorAll(chipSelector).forEach(function (c) { selected.push(c.getAttribute("data-label") || c.textContent); });
      try {
        localStorage.setItem(STORAGE.onboarding, "1");
        localStorage.setItem(STORAGE.interests, JSON.stringify(selected.length ? selected : ["Coffee & tea", "Parks"]));
      } catch (err) {}
      window.location.hash = "#/home";
      showScreen("app");
    });
  }
  function populateCategoryFilter() {
    var catEl = $("categoryFilter");
    if (!catEl) return;
    catEl.innerHTML = "<option value=\"all\">All</option><option value=\"food\">Food</option><option value=\"retail\">Retail</option><option value=\"services\">Services</option>";
  }
  function initRouter() {
    function showPage(route) {
      route = route || "home";
      if (route === "scan") {
        route = "rewards";
        if (window.location.hash === "#/scan") window.history.replaceState(null, "", "#/rewards");
      }
      var baseRoute = route.split("/")[0];
      document.querySelectorAll(".page").forEach(function (el) {
        el.classList.toggle("hidden", el.getAttribute("data-page") !== baseRoute);
      });
      document.querySelectorAll(".bottom-link").forEach(function (el) {
        el.classList.toggle("active", (el.getAttribute("data-route") || el.getAttribute("href") || "").replace("#/", "").split("/")[0] === baseRoute);
      });
      document.querySelectorAll(".nav-tab").forEach(function (el) {
        el.classList.toggle("active", (el.getAttribute("data-route") || "").replace("#/", "").split("/")[0] === baseRoute);
      });
      updateFooterProgress();
      if (baseRoute === "rewards") renderRewardsPage();
      if (baseRoute === "badges") renderBadgesPage();
      if (baseRoute === "challenges") renderChallengesPage();
      if (baseRoute === "leaderboard") renderLeaderboardPage();
      if (baseRoute === "social") renderSocialPage();
      if (baseRoute === "profile") renderProfilePage();
    }
    window.addEventListener("hashchange", function () {
      showPage((window.location.hash || "#/home").replace("#/", "") || "home");
    });
    showPage((window.location.hash || "#/home").replace("#/", "") || "home");
  }
  function initTheme() {
    var theme = localStorage.getItem("explora_theme") || "light";
    theme = theme === "dark" ? "dark" : "light";
    document.documentElement.setAttribute("data-theme", theme);
    document.documentElement.classList.remove("theme-light", "theme-dark");
    document.documentElement.classList.add("theme-" + theme);
    var btn = $("themeToggle");
    if (btn) {
      btn.addEventListener("click", function () {
        theme = document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
        document.documentElement.setAttribute("data-theme", theme);
        document.documentElement.classList.remove("theme-light", "theme-dark");
        document.documentElement.classList.add("theme-" + theme);
        localStorage.setItem("explora_theme", theme);
        btn.textContent = theme === "dark" ? "🌙" : "☀️";
        btn.setAttribute("aria-label", theme === "dark" ? "Switch to light mode" : "Switch to dark mode");
      });
      btn.textContent = theme === "dark" ? "🌙" : "☀️";
      btn.setAttribute("aria-label", theme === "dark" ? "Switch to light mode" : "Switch to dark mode");
    }
  }
  function initChatbot() {
    var drawer = document.getElementById("chatbotDrawer");
    var toggle = $("chatToggle");
    var close = document.getElementById("chatClose");
    var send = $("chatSend");
    var input = $("chatInput");
    var messages = document.getElementById("chatMessages");
    function appendMsg(text, isUser, options) {
      if (!messages) return;
      var div = document.createElement("div");
      div.className = "chat-msg " + (isUser ? "user" : "bot");
      if (isUser) div.textContent = text;
      else {
        div.innerHTML = escapeHtml(text).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
        if (!options || options.addPlaceButtons !== false) {
          var suggestedPlaces = (options && options.suggestedPlaces) ? options.suggestedPlaces : [];
          var mentioned;
          if (suggestedPlaces.length === 0) {
            mentioned = [];
          } else {
            mentioned = findMentionedPlaces(text).filter(function (p) {
              return suggestedPlaces.some(function (s) { return (s.place_id && s.place_id === p.place_id) || (s.name && String(s.name).trim() === String(p.name).trim()); });
            });
            if (mentioned.length === 0) mentioned = suggestedPlaces.slice(0, 3);
          }
          if (mentioned.length > 0) {
            setLastSuggested(mentioned);
            var wrap = document.createElement("div");
            wrap.className = "chat-msg-actions";
            mentioned.forEach(function (place) {
              var row = document.createElement("div");
              row.className = "chat-place-row";
              var label = document.createElement("span");
              label.className = "chat-place-name";
              label.textContent = place.name || "Place";
              var btns = document.createElement("div");
              btns.className = "chat-place-btns";
              var openBtn = document.createElement("button");
              openBtn.type = "button";
              openBtn.className = "chat-action-btn";
              openBtn.textContent = "Open on map";
              openBtn.addEventListener("click", function () {
                selectPlace(place);
                if (drawer) drawer.classList.add("hidden");
              });
              var takeMeBtn = document.createElement("button");
              takeMeBtn.type = "button";
              takeMeBtn.className = "chat-action-btn chat-action-btn-primary";
              takeMeBtn.textContent = "Take me there";
              takeMeBtn.addEventListener("click", function () {
                if (place.lat != null && place.lng != null) {
                  if (userPos) drawRoute(userPos, { lat: Number(place.lat), lng: Number(place.lng) });
                  openGoogleMapsDirections(Number(place.lat), Number(place.lng));
                  selectPlace(place);
                  if (drawer) drawer.classList.add("hidden");
                } else {
                  selectPlace(place);
                  if (drawer) drawer.classList.add("hidden");
                }
              });
              btns.appendChild(openBtn);
              btns.appendChild(takeMeBtn);
              row.appendChild(label);
              row.appendChild(btns);
              wrap.appendChild(row);
            });
            div.appendChild(wrap);
          }
        }
      }
      messages.appendChild(div);
      messages.scrollTop = messages.scrollHeight;
    }
    if (toggle) toggle.addEventListener("click", function () {
      if (drawer) {
        var isHidden = drawer.classList.contains("hidden");
        drawer.classList.toggle("hidden", !isHidden);
      }
    });
    if (close) close.addEventListener("click", function () {
      if (drawer) drawer.classList.add("hidden");
    });
    var lastChatSuggestedPlaces = [];
    function setLastSuggested(places) {
      lastChatSuggestedPlaces = places && places.length ? places.slice() : [];
    }
    function getPlaceForHeaderAction() {
      if (lastChatSuggestedPlaces.length > 0) return lastChatSuggestedPlaces[0];
      return selectedPlace || null;
    }
    var openMapBtn = document.getElementById("chatHeaderOpenMap");
    var navigateBtn = document.getElementById("chatHeaderNavigate");
    if (openMapBtn) openMapBtn.addEventListener("click", function () {
      var p = getPlaceForHeaderAction();
      if (p) {
        selectPlace(p);
        if (drawer) drawer.classList.add("hidden");
      } else {
        showToast("Ask for a place first (e.g. \"something to eat\") then use this to open it on the map.");
      }
    });
    if (navigateBtn) navigateBtn.addEventListener("click", function () {
      var p = getPlaceForHeaderAction();
      if (p) {
        if (p.lat != null && p.lng != null) {
          if (userPos) drawRoute(userPos, { lat: Number(p.lat), lng: Number(p.lng) });
          openGoogleMapsDirections(Number(p.lat), Number(p.lng));
          selectPlace(p);
          if (drawer) drawer.classList.add("hidden");
        } else {
          selectPlace(p);
          if (drawer) drawer.classList.add("hidden");
        }
      } else {
        showToast("Ask for a place first (e.g. \"something to eat\") then use this to get directions.");
      }
    });
    var FALLBACK_MSG = "I couldn’t connect right now. Try again in a moment.";
    function isPlaceSeekingQuery(text) {
      var lower = (text || "").toLowerCase().trim();
      if (lower.length < 3) return false;
      if (/^(hi|hey|hello|how are you|what'?s up|hey there|yo|thanks|thank you|bye|goodbye|good morning|good night|sup)[\s!?.,]*$/i.test(lower)) return false;
      if (lower.length < 25 && /\b(hi|hey|hello|how are you|thanks|bye)\b/i.test(lower)) return false;
      return /\b(pizza|coffee|tea|drink|drinks|beer|wine|bar|food|eat|lunch|dinner|restaurant|cafe|burger|sushi|shop|store|grocery|gym|spa|nearby|find|where|suggest|recommend|get something)\b/i.test(lower);
    }
    function sendToGemini(userText, cb) {
      if (!userText) { if (cb) cb("What can I help you with?"); return; }
      if (!GEMINI_KEY) { if (cb) cb(FALLBACK_MSG, []); return; }
      var seekingPlace = isPlaceSeekingQuery(userText);
      var filtered = seekingPlace ? getChatPlacesForQuery(userText) : { places: [], placeNames: [], filterDesc: "none" };
      var placeNames = filtered.placeNames;
      var placeList = placeNames.length ? placeNames.join(", ") : "";
      var system;
      if (seekingPlace) {
        var locationNote = userPos ? "Places are sorted by distance (closest first) then rating. Recommend the first 1–2 from the list." : "Recommend the best-rated from the list.";
        system = "You are the Explora in-app guide. The user asked: \"" + userText + "\". " +
        "You must ONLY suggest places from this exact list. Use the FULL place names exactly as written below so the app can show a \"Take me there\" button. " +
        "Allowed places (" + filtered.filterDesc + ", best/closest first): " + (placeList || "(none)") + ". " +
        "Give a helpful 1–2 sentence reply: name 1–2 places by their full name (e.g. \"Tim Horton's\" or \"Amsterdam Brewhouse\"), say why they fit (e.g. great for coffee, closest spot for a drink), and keep it friendly. " +
        locationNote + " If the list is empty or \"(none)\", say there are no matching spots nearby.";
      } else {
        system = "You are the Explora in-app guide. The user is just chatting (greeting, small talk, or general question). Reply in 1–2 short, friendly sentences. Do NOT suggest any places, list any businesses, or mention \"Take me there\". Keep it conversational only.";
      }
      var contents = [{ role: "user", parts: [{ text: system + "\n\nUser: " + userText }] }];
      var generationConfig = { maxOutputTokens: 320, temperature: 0.6 };
      var CHAT_SERVER_HINT = "Run the app with the Explora server: in the project folder run \"node server.js\", then open http://localhost:3131";
      function handleResponse(data) {
        var text = null;
        if (data && data.error) { if (cb) cb(FALLBACK_MSG, []); return; }
        var c = data && data.candidates && data.candidates[0];
        if (c && c.content && c.content.parts && c.content.parts[0]) text = (c.content.parts[0].text || "").trim();
        if (cb) cb(text && text.length > 0 ? text : FALLBACK_MSG, filtered.places || []);
      }
      function tryDirect() {
        var directUrl = "https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=" + encodeURIComponent(GEMINI_KEY);
        fetch(directUrl, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ contents: contents, generationConfig: generationConfig }) })
          .then(function (r) { return r.json(); })
          .then(handleResponse)
          .catch(function () { if (cb) cb(FALLBACK_MSG + " " + CHAT_SERVER_HINT, []); });
      }
      function tryProxy() {
        fetch("/api/gemini", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ contents: contents, generationConfig: generationConfig, key: GEMINI_KEY }) })
          .then(function (r) {
            if (r.ok) return r.json();
            return r.text().then(function () { return null; });
          })
          .then(function (data) {
            if (data && !data.error) { handleResponse(data); return; }
            tryDirect();
          })
          .catch(tryDirect);
      }
      if (window.location.protocol === "http:" || window.location.protocol === "https:") tryProxy(); else tryDirect();
    }
    function doSend() {
      if (!send || !input) return;
      var text = (input.value || "").trim();
      if (!text) return;
      input.value = "";
      appendMsg(text, true);
      sendToGemini(text, function (reply, suggestedPlaces) { appendMsg(reply, false, { suggestedPlaces: suggestedPlaces || [] }); });
    }
    if (send && input) {
      send.addEventListener("click", doSend);
      input.addEventListener("keydown", function (e) {
        if (e.key === "Enter") { e.preventDefault(); doSend(); }
      });
    }
  }
  function getProgressCardData() {
    var state = getState();
    var xp = state.xp || 0;
    var level = state.level || 1;
    var need = 250;
    var inLevel = xp - (level - 1) * 250;
    if (inLevel < 0) inLevel = 0;
    var nextXp = level * 250;
    var completed = Object.keys(state.completedChallenges || {}).length;
    var totalCh = 8 + 12 + 22;
    return { xp: xp, level: level, inLevel: inLevel, need: need, nextXp: nextXp, challengesCompleted: completed, challengesTotal: totalCh };
  }
  function updateProgressDashboardCard(container) {
    if (!container) return;
    var data = getProgressCardData();
    var xpPct = data.need > 0 ? Math.min(100, (data.inLevel / data.need) * 100) : 0;
    var chPct = data.challengesTotal > 0 ? Math.min(100, (data.challengesCompleted / data.challengesTotal) * 100) : 0;
    var rewardsStatus = container.querySelector(".progress-dashboard-rewards-status");
    var rewardsFill = container.querySelector(".progress-dashboard-rewards-fill");
    var challengesStatus = container.querySelector(".progress-dashboard-challenges-status");
    var challengesFill = container.querySelector(".progress-dashboard-challenges-fill");
    if (rewardsStatus) rewardsStatus.textContent = data.xp + " / " + data.nextXp + " XP";
    if (rewardsFill) rewardsFill.style.width = xpPct + "%";
    if (challengesStatus) challengesStatus.textContent = data.challengesCompleted + " / " + data.challengesTotal + " Completed";
    if (challengesFill) challengesFill.style.width = chPct + "%";
  }
  function updateFooterProgress() {
    var data = getProgressCardData();
    var xpPct = data.need > 0 ? Math.min(100, (data.inLevel / data.need) * 100) : 0;
    var chPct = data.challengesTotal > 0 ? Math.min(100, (data.challengesCompleted / data.challengesTotal) * 100) : 0;
    var rewardsStatus = $("bottomRewardsStatus");
    var rewardsFill = $("bottomRewardsFill");
    var challengesStatus = $("bottomChallengesStatus");
    var challengesFill = $("bottomChallengesFill");
    if (rewardsStatus) rewardsStatus.textContent = data.xp + " / " + data.nextXp + " XP";
    if (rewardsFill) rewardsFill.style.width = xpPct + "%";
    if (challengesStatus) challengesStatus.textContent = data.challengesCompleted + " / " + data.challengesTotal + " Completed";
    if (challengesFill) challengesFill.style.width = chPct + "%";
    var count = (getState().socialNotificationCount != null ? getState().socialNotificationCount : 2);
    document.querySelectorAll(".notification-badge").forEach(function (badge) {
      badge.textContent = count;
      badge.classList.toggle("hidden", count === 0);
    });
  }
  function renderRewardsPage() {
    var qrEl = $("exploraRewardsQR");
    if (qrEl && typeof QRCode !== "undefined" && !qrEl.hasChildNodes()) {
      try {
        new QRCode(qrEl, { text: "EXPLORA-REWARDS", width: 160, height: 160 });
      } catch (e) {}
    }
    var state = getState();
    var xp = state.xp || 0;
    var level = state.level || 1;
    var nextXp = level * 250;
    var inLevel = xp - (level - 1) * 250;
    var need = 250;
    updateProgressDashboardCard($("page-rewards"));
    var tiersEl = $("rewardsTiersList");
    if (tiersEl) {
      var tiers = [
        { name: "Starter", xp: 0, desc: "10% off one partner visit. Valid at Panago Pizza, Dil Tak, and other Explora partners.", unlocked: xp >= 0 },
        { name: "Explorer", xp: 250, desc: "15% off + free drink at participating locations. Unlock after 250 XP.", unlocked: xp >= 250 },
        { name: "Champion", xp: 500, desc: "20% off + priority support and exclusive partner events.", unlocked: xp >= 500 },
        { name: "Local legend", xp: 1000, desc: "Top tier: 25% off, free item monthly, and featured on Explora.", unlocked: xp >= 1000 },
      ];
      tiersEl.innerHTML = "";
      tiers.forEach(function (t) {
        var div = document.createElement("div");
        div.className = "tier-card" + (t.unlocked ? " unlocked" : "");
        div.innerHTML = "<span class=\"tier-name\">" + t.name + " (" + t.xp + " XP)</span><p class=\"tier-desc\">" + t.desc + "</p>";
        tiersEl.appendChild(div);
      });
    }
    var couponsEl = $("rewardsCouponsList");
    if (couponsEl) {
      var list = [
        { title: "10% off first visit", code: "EXPLORA10", minXp: 0 },
        { title: "15% off + free drink", code: "EXPLORA15", minXp: 250 },
        { title: "20% off at partners", code: "EXPLORA20", minXp: 500 },
      ];
      couponsEl.innerHTML = "";
      list.forEach(function (c) {
        if (xp < c.minXp) return;
        var card = document.createElement("div");
        card.className = "coupon-card";
        card.innerHTML = "<strong>" + escapeHtml(c.title) + "</strong> <code>" + escapeHtml(c.code) + "</code> — Show at checkout.";
        couponsEl.appendChild(card);
      });
      if (couponsEl.children.length === 0) couponsEl.innerHTML = "<p class=\"muted small\">Check in at places and complete challenges to earn XP. Every 250 XP unlocks new coupons and tiers.</p>";
    }
  }
  function renderBadgesPage() {
    var state = getState();
    var user = getCurrentUser();
    var visits = Object.keys(state.visits || {}).length;
    var isLeaderboardFirst = !!(user && user.username === "vedant123");
    var badges = [
      { name: "#1 Leaderboard", icon: "👑", desc: "Top of the Explora leaderboard", leaderboardFirst: true },
      { name: "First step", icon: "🎯", desc: "Check in once at any partner", req: 1 },
      { name: "Explorer", icon: "👣", desc: "5 check-ins", req: 5 },
      { name: "Champion", icon: "🏆", desc: "10 check-ins", req: 10 },
      { name: "Foodie", icon: "🍕", desc: "3 food or cafe check-ins", req: 3 },
      { name: "Local hero", icon: "⭐", desc: "7 check-ins", req: 7 },
      { name: "Trendsetter", icon: "🔥", desc: "Visit 3 different categories", req: 3 },
      { name: "Reviewer", icon: "✍️", desc: "Leave 2 Explora reviews", req: 2 },
      { name: "QR scout", icon: "📱", desc: "Scan 2 store QR codes", req: 2 },
    ];
    var reviewCount = 0;
    try { Object.keys(state.reviews || {}).forEach(function (pid) { reviewCount += (state.reviews[pid] || []).length; }); } catch (e) {}
    var scanCount = Object.keys(loadJSON(STORAGE.scannedQR, {}) || {}).length;
    var grid = $("badgesGrid");
    if (!grid) return;
    grid.innerHTML = "";
    badges.forEach(function (b) {
      if (b.leaderboardFirst) {
        var div = document.createElement("div");
        div.className = "badge-card" + (isLeaderboardFirst ? " unlocked" : "");
        div.innerHTML = "<div class=\"badge-icon\">" + b.icon + "</div><div class=\"badge-name\">" + b.name + "</div><div class=\"badge-desc\">" + b.desc + "</div>";
        grid.appendChild(div);
        return;
      }
      var count = visits;
      if (b.req === 2 && b.name === "Reviewer") count = reviewCount;
      else if (b.req === 2 && b.name === "QR scout") count = scanCount;
      else if (b.name === "Trendsetter") count = Math.min(3, visits);
      var unlocked = (b.name === "Reviewer" ? count >= 2 : b.name === "QR scout" ? count >= 2 : count >= b.req);
      var div = document.createElement("div");
      div.className = "badge-card" + (unlocked ? " unlocked" : "");
      div.innerHTML = "<div class=\"badge-icon\">" + b.icon + "</div><div class=\"badge-name\">" + b.name + "</div><div class=\"badge-desc\">" + b.desc + " (" + count + "/" + b.req + ")</div>";
      grid.appendChild(div);
    });
  }
  function renderChallengesPage() {
    var state = getState();
    var now = new Date();
    var today = now.toISOString().slice(0, 10);
    var weekAgo = now.getTime() - 7 * 24 * 60 * 60 * 1000;
    var visitsToday = 0;
    var visitsThisWeek = 0;
    var totalVisits = 0;
    Object.keys(state.visits || {}).forEach(function (id) {
      totalVisits++;
      var t = state.visits[id];
      if (new Date(t).toISOString().slice(0, 10) === today) visitsToday++;
      if (t >= weekAgo) visitsThisWeek++;
    });
    var reviewCount = 0;
    var reviewsToday = 0;
    var reviewsThisWeek = 0;
    try {
      Object.keys(state.reviews || {}).forEach(function (pid) {
        (state.reviews[pid] || []).forEach(function (r) {
          reviewCount++;
          if (r.at) {
            if (new Date(r.at).toISOString().slice(0, 10) === today) reviewsToday++;
            if (r.at >= weekAgo) reviewsThisWeek++;
          }
        });
      });
    } catch (e) {}
    var savedCount = (state.favorites || []).length;
    var scanCount = Object.keys(loadJSON(STORAGE.scannedQR, {}) || {}).length;
    var completed = state.completedChallenges || {};

    function challengeId(type, title) { return type + ":" + title; }
    function addIfComplete(type, c) {
      if (c.progress >= c.goal && c.xp && !completed[challengeId(type, c.title)]) {
        completed[challengeId(type, c.title)] = Date.now();
        var newXp = (state.xp || 0) + c.xp;
        state.xp = newXp;
        state.level = Math.floor(newXp / 250) + 1;
        saveState("xp", state.xp);
        saveState("level", state.level);
        saveState("completedChallenges", completed);
        state.completedChallenges = completed;
        if ($("xpValue")) $("xpValue").textContent = state.xp;
        showToast("+" + c.xp + " XP! Challenge complete.");
      }
    }

    var daily = [
      { title: "Check in at any place today", goal: 1, progress: Math.min(1, visitsToday), xp: 10 },
      { title: "Visit 2 places in 1 day", goal: 2, progress: Math.min(2, visitsToday), xp: 20 },
      { title: "Visit 3 places in 1 day", goal: 3, progress: Math.min(3, visitsToday), xp: 35 },
      { title: "Visit 4 places in 1 day", goal: 4, progress: Math.min(4, visitsToday), xp: 50 },
      { title: "Leave 1 review today", goal: 1, progress: Math.min(1, reviewsToday), xp: 25 },
      { title: "Leave 2 reviews today", goal: 2, progress: Math.min(2, reviewsToday), xp: 50 },
      { title: "First check-in of the day", goal: 1, progress: visitsToday >= 1 ? 1 : 0, xp: 15 },
    ];
    var weekly = [
      { title: "Visit 3 places this week", goal: 3, progress: Math.min(3, visitsThisWeek), xp: 30 },
      { title: "Visit 5 places this week", goal: 5, progress: Math.min(5, visitsThisWeek), xp: 50 },
      { title: "Visit 7 places this week", goal: 7, progress: Math.min(7, visitsThisWeek), xp: 75 },
      { title: "Visit 10 places this week", goal: 10, progress: Math.min(10, visitsThisWeek), xp: 120 },
      { title: "Leave 1 Explora review this week", goal: 1, progress: Math.min(1, reviewsThisWeek), xp: 25 },
      { title: "Leave 3 Explora reviews this week", goal: 3, progress: Math.min(3, reviewsThisWeek), xp: 60 },
      { title: "Leave 5 Explora reviews this week", goal: 5, progress: Math.min(5, reviewsThisWeek), xp: 100 },
      { title: "Scan 1 QR code", goal: 1, progress: Math.min(1, scanCount), xp: 30 },
      { title: "Scan 2 QR codes", goal: 2, progress: Math.min(2, scanCount), xp: 50 },
      { title: "Save 3 places to your list", goal: 3, progress: Math.min(3, savedCount), xp: 25 },
      { title: "Save 5 places to your list", goal: 5, progress: Math.min(5, savedCount), xp: 40 },
      { title: "Explore 2 different places", goal: 2, progress: Math.min(2, totalVisits), xp: 20 },
    ];
    var personal = [
      { title: "First steps — Visit your first place", goal: 1, progress: Math.min(1, totalVisits), xp: 15 },
      { title: "Explorer — Visit 5 places", goal: 5, progress: Math.min(5, totalVisits), xp: 50 },
      { title: "Adventurer — Visit 10 places", goal: 10, progress: Math.min(10, totalVisits), xp: 100 },
      { title: "Local regular — Visit 15 places", goal: 15, progress: Math.min(15, totalVisits), xp: 150 },
      { title: "Local legend — Visit 25 places", goal: 25, progress: Math.min(25, totalVisits), xp: 250 },
      { title: "Neighborhood hero — Visit 50 places", goal: 50, progress: Math.min(50, totalVisits), xp: 500 },
      { title: "Reviewer — Leave your first review", goal: 1, progress: Math.min(1, reviewCount), xp: 30 },
      { title: "Super reviewer — Leave 5 reviews", goal: 5, progress: Math.min(5, reviewCount), xp: 75 },
      { title: "Community voice — Leave 10 reviews", goal: 10, progress: Math.min(10, reviewCount), xp: 150 },
      { title: "Critic — Leave 20 reviews", goal: 20, progress: Math.min(20, reviewCount), xp: 300 },
      { title: "Bookworm — Save 5 places", goal: 5, progress: Math.min(5, savedCount), xp: 35 },
      { title: "Curator — Save 10 places", goal: 10, progress: Math.min(10, savedCount), xp: 75 },
      { title: "Collector — Save 20 places", goal: 20, progress: Math.min(20, savedCount), xp: 150 },
      { title: "QR scout — Scan your first QR code", goal: 1, progress: Math.min(1, scanCount), xp: 25 },
      { title: "QR hunter — Scan 3 QR codes", goal: 3, progress: Math.min(3, scanCount), xp: 60 },
      { title: "QR master — Scan 5 QR codes", goal: 5, progress: Math.min(5, scanCount), xp: 100 },
      { title: "QR champion — Scan 10 QR codes", goal: 10, progress: Math.min(10, scanCount), xp: 200 },
      { title: "Double tap — Visit 2 places in one day", goal: 2, progress: Math.min(2, visitsToday), xp: 25 },
      { title: "Triple threat — Visit 3 places in one day", goal: 3, progress: Math.min(3, visitsToday), xp: 45 },
      { title: "Power user — Reach 500 total XP", goal: 1, progress: (state.xp || 0) >= 500 ? 1 : 0, xp: 50 },
      { title: "Rising star — Reach 1000 total XP", goal: 1, progress: (state.xp || 0) >= 1000 ? 1 : 0, xp: 100 },
      { title: "Getting around — Make 3 visits", goal: 3, progress: Math.min(3, totalVisits), xp: 40 },
      { title: "Early supporter — Save your first place", goal: 1, progress: Math.min(1, savedCount), xp: 15 },
      { title: "Tastemaker — Leave a review with 50+ characters", goal: 1, progress: (function () {
        try {
          var found = 0;
          Object.keys(state.reviews || {}).forEach(function (pid) {
            (state.reviews[pid] || []).forEach(function (r) { if ((r.text || "").length >= 50) found = 1; });
          });
          return found;
        } catch (e) { return 0; }
      })(), xp: 35 },
      { title: "Storyteller — Leave 3 detailed reviews (20+ chars each)", goal: 3, progress: (function () {
        var count = 0;
        try {
          Object.keys(state.reviews || {}).forEach(function (pid) {
            (state.reviews[pid] || []).forEach(function (r) { if ((r.text || "").length >= 20) count++; });
          });
        } catch (e) {}
        return Math.min(3, count);
      })(), xp: 60 },
    ];

    daily.forEach(function (c) { addIfComplete("daily", c); });
    weekly.forEach(function (c) { addIfComplete("weekly", c); });
    personal.forEach(function (c) { addIfComplete("personal", c); });

    function renderList(id, list) {
      var ul = $(id);
      if (!ul) return;
      ul.innerHTML = "";
      list.forEach(function (c) {
        var li = document.createElement("li");
        var done = c.progress >= c.goal;
        li.classList.toggle("done", done);
        var xpStr = c.xp ? " <span class=\"challenge-xp\">+" + c.xp + " XP</span>" : "";
        li.innerHTML = "<strong>" + escapeHtml(c.title) + "</strong>" + xpStr + " <span class=\"challenge-progress\">" + c.progress + "/" + c.goal + "</span>";
        ul.appendChild(li);
      });
    }
    renderList("challengesDaily", daily);
    renderList("challengesWeekly", weekly);
    renderList("challengesPersonal", personal);
    updateProgressDashboardCard($("page-challenges"));
  }

  var LEADERBOARD_PROFILES = {
    "ishxan.dhingra": {
      name: "Ishaan Dhingra",
      username: "ishxan.dhingra",
      avatar: "ishaanpfp.png",
      bio: "I like dogs (6'7 btw)",
      instagram: "https://www.instagram.com/ishxan.dhingra/",
      visits: 12,
      memberSince: "Dec 2024",
      xp: 980,
      level: 4,
      savedPlaces: [
        { name: "Dil Tak Indian Cuisine", lat: 43.327, lng: -79.801 },
        { name: "Tim Hortons", lat: 43.326, lng: -79.798 },
        { name: "Square One Shopping Centre", lat: 43.595, lng: -79.640 }
      ],
      reviews: [
        { placeName: "Dil Tak Indian Cuisine", stars: 5, text: "Butter chicken hit different. Will def come back with the squad.", at: Date.now() - 14 * 86400000, lat: 43.327, lng: -79.801 },
        { placeName: "Tim Hortons", stars: 4, text: "Classic double-double never misses. Quick stop before class.", at: Date.now() - 28 * 86400000, lat: 43.326, lng: -79.798 },
        { placeName: "Panago Pizza", stars: 4, text: "Solid pizza spot. Good for late night cravings.", at: Date.now() - 45 * 86400000, lat: 43.324, lng: -79.798 }
      ],
      badges: [
        { name: "First step", icon: "🎯", unlocked: true },
        { name: "Explorer", icon: "👣", unlocked: true },
        { name: "Champion", icon: "🏆", unlocked: true },
        { name: "Foodie", icon: "🍕", unlocked: true },
        { name: "Local hero", icon: "⭐", unlocked: false }
      ]
    },
    "kush.dhussa": {
      name: "Kush Dhussa",
      username: "kush.dhussa",
      avatar: "kushpfp.png",
      bio: "R u travis scott bcuz u look fein",
      instagram: "https://www.instagram.com/kush.dhussa/",
      visits: 9,
      memberSince: "Jan 2025",
      xp: 845,
      level: 4,
      savedPlaces: [
        { name: "Panago Pizza", lat: 43.324, lng: -79.798 },
        { name: "Starbucks", lat: 43.325, lng: -79.797 },
        { name: "Cineplex", lat: 43.595, lng: -79.639 }
      ],
      reviews: [
        { placeName: "Panago Pizza", stars: 5, text: "Best pan pizza in the area. Staff is always chill.", at: Date.now() - 7 * 86400000, lat: 43.324, lng: -79.798 },
        { placeName: "Starbucks", stars: 4, text: "My go-to for studying. Vibes are immaculate.", at: Date.now() - 21 * 86400000, lat: 43.325, lng: -79.797 },
        { placeName: "Dil Tak Indian Cuisine", stars: 5, text: "Fire food. Naan was fresh and the biryani slapped.", at: Date.now() - 35 * 86400000, lat: 43.327, lng: -79.801 }
      ],
      badges: [
        { name: "First step", icon: "🎯", unlocked: true },
        { name: "Explorer", icon: "👣", unlocked: true },
        { name: "Champion", icon: "🏆", unlocked: false },
        { name: "Foodie", icon: "🍕", unlocked: true },
        { name: "Local hero", icon: "⭐", unlocked: false }
      ]
    }
  };

  var SOCIAL_CHATS = {
    "ishxan.dhingra": {
      name: "Ishaan Dhingra",
      avatar: "ishaanpfp.png",
      messages: [
        { from: "me", text: "yoo testing testing" },
        { from: "them", text: "lmao whats good" },
        { from: "me", text: "whats up bro" },
        { from: "them", text: "nm just chillin wbu" },
        { from: "me", text: "same same just been exploring spots on the app" },
        { from: "them", text: "oh bet u hit dil tak yet?" },
        { from: "me", text: "yeah that place is fire" },
        { from: "them", text: "right the butter chicken hits different" },
        { from: "me", text: "we should go again sometime" },
        { from: "them", text: "down just lmk when" },
        { from: "them", text: "maybe get kush to come too" },
        { from: "me", text: "yeah squad trip" },
        { from: "them", text: "😂😂" }
      ]
    },
    "kush.dhussa": {
      name: "Kush Dhussa",
      avatar: "kushpfp.png",
      messages: [
        { from: "me", text: "hey" },
        { from: "them", text: "yo whats up" },
        { from: "me", text: "nm u?" },
        { from: "them", text: "chillin just got back from cineplex" },
        { from: "me", text: "oh nice what did u see" },
        { from: "them", text: "that new movie was lowkey mid" },
        { from: "me", text: "lol fair" },
        { from: "them", text: "u still going to that pizza spot later?" },
        { from: "me", text: "panago? yeah maybe" },
        { from: "them", text: "bet im down" },
        { from: "me", text: "cool ill text when im heading" },
        { from: "them", text: "sounds good g" },
        { from: "them", text: "oh and ishaan said hes down to link too" },
        { from: "me", text: "perfect" }
      ]
    }
  };

  function getLeaderboardEntries() {
    var user = getCurrentUser();
    var state = getState();
    var myXp = state.xp || 0;
    var myLevel = state.level || 1;
    var leaders = [
      { name: "Vedant Sheel", username: "vedant123", xp: user && user.username === "vedant123" ? myXp : 1240, level: user && user.username === "vedant123" ? myLevel : 5, avatar: "vedantheadshot.jpeg" },
      { name: "Ishaan Dhingra", username: "ishxan.dhingra", xp: 980, level: 4, avatar: "ishaanpfp.png", hasProfile: true },
      { name: "Kush Dhussa", username: "kush.dhussa", xp: 845, level: 4, avatar: "kushpfp.png", hasProfile: true },
      { name: "Sam Rivera", username: "samr", xp: 720, level: 3 },
      { name: "Morgan Taylor", username: "morgant", xp: 610, level: 3 },
      { name: "Casey Kim", username: "caseyk", xp: 490, level: 2 },
      { name: "Riley Jones", username: "rileyj", xp: 380, level: 2 },
    ];
    return leaders.filter(function (e) { return !user || e.username !== user.username; });
  }

  function ensureSocialChat(username, name, avatar) {
    if (SOCIAL_CHATS[username]) return;
    SOCIAL_CHATS[username] = { name: name || username, avatar: avatar || "", messages: [] };
  }

  function renderSocialThreadMessages(threadMessagesEl, messages) {
    if (!threadMessagesEl) return;
    threadMessagesEl.innerHTML = "";
    (messages || []).forEach(function (m) {
      var div = document.createElement("div");
      div.className = "social-msg social-msg-" + (m.from === "me" ? "me" : "them");
      var bubble = document.createElement("div");
      bubble.className = "social-msg-bubble";
      bubble.textContent = m.text;
      div.appendChild(bubble);
      threadMessagesEl.appendChild(div);
    });
    threadMessagesEl.scrollTop = threadMessagesEl.scrollHeight;
  }

  function setupSocialThreadSend(username) {
    var input = $("socialThreadInput");
    var sendBtn = $("socialThreadSend");
    if (!input || !sendBtn) return;
    function send() {
      var text = (input.value || "").trim();
      if (!text) return;
      var chat = SOCIAL_CHATS[username];
      if (!chat) return;
      if (!chat.messages) chat.messages = [];
      chat.messages.push({ from: "me", text: text });
      input.value = "";
      var threadMessagesEl = $("socialThreadMessages");
      renderSocialThreadMessages(threadMessagesEl, chat.messages);
    }
    sendBtn.onclick = send;
    input.onkeydown = function (e) { if (e.key === "Enter") { e.preventDefault(); send(); } };
  }

  function openSocialModal(modalId) {
    var modal = $(modalId);
    if (modal) modal.classList.remove("hidden");
  }
  function closeSocialModal(modalId) {
    var modal = $(modalId);
    if (modal) modal.classList.add("hidden");
  }

  function renderSocialPage() {
    var hash = (window.location.hash || "#/social").replace("#/", "");
    var parts = hash.split("/");
    var listScreen = $("socialListScreen");
    var threadScreen = $("socialThreadScreen");
    var threadNameEl = $("socialThreadName");
    var threadMessagesEl = $("socialThreadMessages");
    var listEl = $("socialConversationList");
    if (!listScreen || !threadScreen) return;

    if (parts[1]) {
      var username = parts[1];
      var chat = SOCIAL_CHATS[username];
      if (chat) {
        listScreen.classList.add("hidden");
        threadScreen.classList.remove("hidden");
        if (threadNameEl) threadNameEl.textContent = chat.name;
        renderSocialThreadMessages(threadMessagesEl, chat.messages);
        setupSocialThreadSend(username);
        return;
      }
    }
    listScreen.classList.remove("hidden");
    threadScreen.classList.add("hidden");
    if (listEl) {
      listEl.innerHTML = "";
      Object.keys(SOCIAL_CHATS).forEach(function (username) {
        var chat = SOCIAL_CHATS[username];
        if (!chat) return;
        var lastMsg = (chat.messages || [])[(chat.messages || []).length - 1];
        var preview = lastMsg ? (lastMsg.text.length > 35 ? lastMsg.text.slice(0, 35) + "…" : lastMsg.text) : "No messages";
        var li = document.createElement("li");
        li.className = "social-conversation-item";
        li.innerHTML = "<span class=\"social-conv-avatar-wrap\"><img src=\"" + escapeHtml(chat.avatar || "") + "\" alt=\"\" class=\"social-conv-avatar\" onerror=\"this.style.display='none';this.nextElementSibling.style.display='flex'\" /><span class=\"social-conv-avatar-placeholder\" style=\"display:none\">" + (chat.name ? chat.name.charAt(0) : "?") + "</span></span><div class=\"social-conv-info\"><span class=\"social-conv-name\">" + escapeHtml(chat.name || "") + "</span><span class=\"social-conv-preview muted\">" + escapeHtml(preview) + "</span></div>";
        li.onclick = function () { window.location.hash = "#/social/" + username; };
        listEl.appendChild(li);
      });
    }

    var newChatBtn = $("socialNewChatBtn");
    var quickAddBtn = $("socialQuickAddBtn");
    var newChatModal = $("socialNewChatModal");
    var quickAddModal = $("socialQuickAddModal");
    var entries = getLeaderboardEntries();

    if (newChatBtn) {
      newChatBtn.onclick = function () {
        var list = $("socialNewChatList");
        if (!list) return;
        list.innerHTML = "";
        entries.forEach(function (entry) {
          var li = document.createElement("li");
          li.className = "social-modal-item";
          var avatarHtml = entry.avatar
            ? "<img src=\"" + escapeHtml(entry.avatar) + "\" alt=\"\" class=\"social-conv-avatar\" onerror=\"this.style.display='none';this.nextElementSibling.style.display='flex'\" /><span class=\"social-conv-avatar-placeholder\" style=\"display:none\">" + (entry.name ? entry.name.charAt(0) : "?") + "</span>"
            : "<span class=\"social-conv-avatar-placeholder\">" + (entry.name ? entry.name.charAt(0) : "?") + "</span>";
          li.innerHTML = "<span class=\"social-conv-avatar-wrap\">" + avatarHtml + "</span><div class=\"social-conv-info\"><span class=\"social-conv-name\">" + escapeHtml(entry.name || "") + "</span></div><button type=\"button\" class=\"btn btn-primary btn-sm\">Message</button>";
          var msgBtn = li.querySelector(".btn");
          msgBtn.onclick = function (e) { e.stopPropagation(); ensureSocialChat(entry.username, entry.name, entry.avatar); closeSocialModal("socialNewChatModal"); window.location.hash = "#/social/" + entry.username; };
          list.appendChild(li);
        });
        openSocialModal("socialNewChatModal");
      };
    }
    if (quickAddBtn) {
      quickAddBtn.onclick = function () {
        var list = $("socialQuickAddList");
        if (!list) return;
        list.innerHTML = "";
        var toShow = entries.filter(function (e) { return !SOCIAL_CHATS[e.username]; });
        if (toShow.length === 0) {
          list.innerHTML = "<li class=\"social-modal-item\" style=\"justify-content:center;color:var(--muted)\">You've added everyone from the leaderboard.</li>";
        } else {
          toShow.forEach(function (entry) {
            var li = document.createElement("li");
            li.className = "social-modal-item";
            var avatarHtml = entry.avatar
              ? "<img src=\"" + escapeHtml(entry.avatar) + "\" alt=\"\" class=\"social-conv-avatar\" onerror=\"this.style.display='none';this.nextElementSibling.style.display='flex'\" /><span class=\"social-conv-avatar-placeholder\" style=\"display:none\">" + (entry.name ? entry.name.charAt(0) : "?") + "</span>"
              : "<span class=\"social-conv-avatar-placeholder\">" + (entry.name ? entry.name.charAt(0) : "?") + "</span>";
            li.innerHTML = "<span class=\"social-conv-avatar-wrap\">" + avatarHtml + "</span><div class=\"social-conv-info\"><span class=\"social-conv-name\">" + escapeHtml(entry.name || "") + "</span></div><button type=\"button\" class=\"btn btn-primary btn-sm\">Add</button>";
            var addBtn = li.querySelector(".btn");
            addBtn.onclick = function (e) { e.stopPropagation(); ensureSocialChat(entry.username, entry.name, entry.avatar); closeSocialModal("socialQuickAddModal"); renderSocialPage(); };
            list.appendChild(li);
          });
        }
        openSocialModal("socialQuickAddModal");
      };
    }

    ["socialNewChatModalBackdrop", "socialNewChatModalClose"].forEach(function (id) {
      var el = $(id);
      if (el) el.onclick = function () { closeSocialModal("socialNewChatModal"); };
    });
    ["socialQuickAddModalBackdrop", "socialQuickAddModalClose"].forEach(function (id) {
      var el = $(id);
      if (el) el.onclick = function () { closeSocialModal("socialQuickAddModal"); };
    });
  }

  function renderLeaderboardPage() {
    var listEl = $("leaderboardList");
    if (!listEl) return;
    var user = getCurrentUser();
    var state = getState();
    var myXp = state.xp || 0;
    var myLevel = state.level || 1;
    var leaders = [
      { name: "Vedant Sheel", username: "vedant123", xp: user && user.username === "vedant123" ? myXp : 1240, level: user && user.username === "vedant123" ? myLevel : 5, avatar: "vedantheadshot.jpeg" },
      { name: "Ishaan Dhingra", username: "ishxan.dhingra", xp: 980, level: 4, avatar: "ishaanpfp.png", hasProfile: true },
      { name: "Kush Dhussa", username: "kush.dhussa", xp: 845, level: 4, avatar: "kushpfp.png", hasProfile: true },
      { name: "Sam Rivera", username: "samr", xp: 720, level: 3 },
      { name: "Morgan Taylor", username: "morgant", xp: 610, level: 3 },
      { name: "Casey Kim", username: "caseyk", xp: 490, level: 2 },
      { name: "Riley Jones", username: "rileyj", xp: 380, level: 2 },
    ];
    leaders.sort(function (a, b) { return (b.xp || 0) - (a.xp || 0); });
    var top7 = leaders.slice(0, 7);
    listEl.innerHTML = "";
    top7.forEach(function (entry, i) {
      var rank = i + 1;
      var isCurrentUser = user && user.username === entry.username;
      var hasProfile = entry.hasProfile && LEADERBOARD_PROFILES[entry.username];
      var li = document.createElement("li");
      li.className = "leaderboard-item" + (isCurrentUser ? " leaderboard-item-you" : "");
      var rankClass = rank === 1 ? "leaderboard-rank gold" : rank === 2 ? "leaderboard-rank silver" : rank === 3 ? "leaderboard-rank bronze" : "leaderboard-rank";
      var rankIcon = rank === 1 ? "👑" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : "";
      var avatarHtml = entry.avatar
        ? "<img src=\"" + escapeHtml(entry.avatar) + "\" alt=\"\" class=\"leaderboard-avatar\" onerror=\"this.style.display='none';this.nextElementSibling.style.display='flex'\" /><span class=\"leaderboard-avatar-placeholder\" style=\"display:none\">" + (entry.name ? entry.name.charAt(0) : "?") + "</span>"
        : "<span class=\"leaderboard-avatar-placeholder\">" + (entry.name ? entry.name.charAt(0) : "?") + "</span>";
      var viewProfileHtml = hasProfile ? "<a href=\"#/profile/" + escapeHtml(entry.username) + "\" class=\"leaderboard-view-profile\">View profile</a>" : "";
      li.innerHTML =
        "<span class=\"" + rankClass + "\">" + (rankIcon || rank) + "</span>" +
        "<span class=\"leaderboard-avatar-wrap\">" + avatarHtml + "</span>" +
        "<div class=\"leaderboard-info\"><span class=\"leaderboard-name\">" + escapeHtml(entry.name || "Explorer") + (isCurrentUser ? " <span class=\"leaderboard-you-badge\">You</span>" : "") + "</span><span class=\"leaderboard-username muted\">@" + escapeHtml(entry.username || "") + "</span></div>" +
        "<div class=\"leaderboard-stats\"><strong class=\"leaderboard-xp\">" + (entry.xp || 0) + " XP</strong><span class=\"leaderboard-level muted\">Level " + (entry.level || 1) + "</span>" + viewProfileHtml + "</div>";
      listEl.appendChild(li);
    });
  }

  function initProfile() {
    var profileBtn = $("profileBtn");
    var logoutBtn = $("profileLogout");
    if (profileBtn) profileBtn.addEventListener("click", function () {
      window.location.hash = "#/profile";
    });
    if (logoutBtn) logoutBtn.addEventListener("click", function () {
      setCurrentUser(null);
      showScreen("login");
      initLogin();
    });
    var profilePage = $("page-profile");
    if (profilePage) {
      profilePage.addEventListener("click", function (e) {
        var btn = e.target && e.target.closest && e.target.closest(".profile-saved-visit-btn");
        if (!btn || btn.disabled) return;
        var lat = btn.getAttribute("data-lat");
        var lng = btn.getAttribute("data-lng");
        if (lat != null && lng != null) {
          e.preventDefault();
          e.stopPropagation();
          openGoogleMapsDirections(Number(lat), Number(lng));
        }
      });
    }
  }
  function renderProfilePage() {
    var hash = window.location.hash || "#/profile";
    var parts = hash.replace("#/", "").split("/");
    var viewUsername = parts[1] || null;
    var viewUser = viewUsername && LEADERBOARD_PROFILES[viewUsername] ? LEADERBOARD_PROFILES[viewUsername] : null;
    var nameEl = $("profileName");
    var usernameEl = $("profileUsername");
    var bioEl = $("profileBio");
    var avatarEl = $("profileAvatar");
    var ribbonEl = $("profileRibbon");
    var leaderboardRow = $("profileLeaderboardRow");
    var metaRight = $("profileMetaRight");
    var mySections = $("profileMySections");
    var backSection = $("profileBackSection");
    var profileCounts = $("profileCounts");
    var socialEl = $("profileSocial");

    if (viewUser) {
      if (nameEl) nameEl.textContent = viewUser.name || "Explorer";
      if (usernameEl) usernameEl.textContent = "@" + (viewUser.username || "");
      if (bioEl) bioEl.textContent = viewUser.bio || "";
      if (avatarEl) { avatarEl.src = viewUser.avatar || ""; avatarEl.alt = viewUser.name || ""; avatarEl.style.display = ""; }
      if (ribbonEl) ribbonEl.classList.add("hidden");
      if (leaderboardRow) leaderboardRow.classList.add("hidden");
      if (metaRight) { metaRight.style.display = ""; }
      if ($("profileVisits")) $("profileVisits").textContent = viewUser.visits != null ? viewUser.visits : 0;
      if ($("profileMemberSince")) $("profileMemberSince").textContent = viewUser.memberSince || "2025";
      if ($("profileXp")) $("profileXp").textContent = viewUser.xp != null ? viewUser.xp : 0;
      if ($("profileLevel")) $("profileLevel").textContent = viewUser.level != null ? viewUser.level : 1;
      if (profileCounts) profileCounts.style.display = "none";
      if (mySections) mySections.style.display = "";
      if (backSection) backSection.style.display = "block";
      var logoutSection = $("profileLogoutSection");
      if (logoutSection) logoutSection.style.display = "none";
      var insta = viewUser.instagram || "#";
      if (socialEl) {
        socialEl.innerHTML =
          "<a href=\"" + escapeHtml(insta) + "\" target=\"_blank\" rel=\"noopener\" class=\"profile-social-icon\" aria-label=\"Instagram\"><img src=\"instagram.png\" alt=\"Instagram\" /></a>" +
          "<a href=\"" + escapeHtml(insta) + "\" target=\"_blank\" rel=\"noopener\" class=\"profile-social-icon\" aria-label=\"Snapchat\"><img src=\"snapchat.png\" alt=\"Snapchat\" /></a>" +
          "<a href=\"" + escapeHtml(insta) + "\" target=\"_blank\" rel=\"noopener\" class=\"profile-social-icon profile-social-svg\" aria-label=\"Facebook\"><svg viewBox=\"0 0 24 24\" fill=\"currentColor\" width=\"100%\" height=\"100%\"><path d=\"M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z\"/></svg></a>" +
          "<a href=\"" + escapeHtml(insta) + "\" target=\"_blank\" rel=\"noopener\" class=\"profile-social-icon\" aria-label=\"Twitter\"><img src=\"twitter.png\" alt=\"Twitter\" /></a>" +
          "<a href=\"" + escapeHtml(insta) + "\" target=\"_blank\" rel=\"noopener\" class=\"profile-social-icon profile-social-svg\" aria-label=\"LinkedIn\"><svg viewBox=\"0 0 24 24\" fill=\"currentColor\" width=\"100%\" height=\"100%\"><path d=\"M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z\"/></svg></a>";
      }
      var savedListEl = $("profileSavedList");
      var savedEmptyEl = $("profileSavedEmpty");
      var saved = viewUser.savedPlaces || [];
      if (savedListEl) {
        savedListEl.innerHTML = "";
        saved.forEach(function (p) {
          var div = document.createElement("div");
          div.className = "profile-saved-item";
          div.innerHTML = "<span class=\"profile-saved-name\">" + escapeHtml(p.name || "Place") + "</span>";
          var visitBtn = document.createElement("button");
          visitBtn.type = "button";
          visitBtn.className = "profile-saved-visit-btn";
          visitBtn.textContent = "Visit";
          if (p.lat != null && p.lng != null) {
            visitBtn.setAttribute("data-lat", String(p.lat));
            visitBtn.setAttribute("data-lng", String(p.lng));
          } else visitBtn.disabled = true;
          div.appendChild(visitBtn);
          savedListEl.appendChild(div);
        });
      }
      if (savedEmptyEl) savedEmptyEl.classList.toggle("hidden", saved.length > 0);
      var reviewsListEl = $("profileReviewsList");
      var reviewsEmptyEl = $("profileReviewsEmpty");
      var reviews = viewUser.reviews || [];
      if (reviewsListEl) {
        reviewsListEl.innerHTML = "";
        reviews.forEach(function (r) {
          var div = document.createElement("div");
          div.className = "profile-review-item";
          var starsStr = "";
          for (var i = 0; i < 5; i++) starsStr += i < (r.stars || 0) ? "★" : "☆";
          var dateStr = r.at ? new Date(r.at).toLocaleDateString() : "";
          div.innerHTML = "<div class=\"profile-review-content\"><span class=\"profile-review-place\">" + escapeHtml(r.placeName || "Place") + "</span> <span class=\"profile-review-stars\">" + starsStr + "</span><p class=\"profile-review-text\">" + escapeHtml(r.text || "") + "</p><span class=\"profile-review-date\">" + escapeHtml(dateStr) + "</span></div>";
          var visitBtn = document.createElement("button");
          visitBtn.type = "button";
          visitBtn.className = "profile-saved-visit-btn";
          visitBtn.textContent = "Visit";
          if (r.lat != null && r.lng != null) {
            visitBtn.setAttribute("data-lat", String(r.lat));
            visitBtn.setAttribute("data-lng", String(r.lng));
          } else visitBtn.disabled = true;
          div.appendChild(visitBtn);
          reviewsListEl.appendChild(div);
        });
      }
      if (reviewsEmptyEl) reviewsEmptyEl.classList.toggle("hidden", reviews.length > 0);
      var badgesEl = $("profileBadges");
      if (badgesEl && viewUser.badges && viewUser.badges.length) {
        badgesEl.innerHTML = "";
        viewUser.badges.forEach(function (b) {
          var div = document.createElement("div");
          div.className = "profile-badge-item" + (b.unlocked ? " unlocked" : "");
          div.innerHTML = "<span class=\"profile-badge-icon\">" + (b.icon || "") + "</span><span>" + escapeHtml(b.name || "") + "</span>";
          badgesEl.appendChild(div);
        });
      }
      var couponsEl = $("profileCoupons");
      if (couponsEl) couponsEl.innerHTML = "<p class=\"muted small\">Earn more XP to unlock coupons.</p>";
      return;
    }

    var logoutSectionEl = $("profileLogoutSection");
    if (logoutSectionEl) logoutSectionEl.style.display = "";

    if (metaRight) metaRight.style.display = "";
    if (profileCounts) profileCounts.style.display = "";
    if (mySections) mySections.style.display = "";
    if (backSection) backSection.style.display = "none";
    if (socialEl) {
      socialEl.innerHTML =
        "<a href=\"https://www.instagram.com/vedant.sheel/\" target=\"_blank\" rel=\"noopener\" class=\"profile-social-icon\" aria-label=\"Instagram\"><img src=\"instagram.png\" alt=\"Instagram\" /></a>" +
        "<a href=\"https://snapchat.com/t/U4dZW0H0\" target=\"_blank\" rel=\"noopener\" class=\"profile-social-icon\" aria-label=\"Snapchat\"><img src=\"snapchat.png\" alt=\"Snapchat\" /></a>" +
        "<a href=\"https://www.instagram.com/vedant.sheel/\" target=\"_blank\" rel=\"noopener\" class=\"profile-social-icon profile-social-svg\" aria-label=\"Facebook\"><svg viewBox=\"0 0 24 24\" fill=\"currentColor\" width=\"100%\" height=\"100%\"><path d=\"M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z\"/></svg></a>" +
        "<a href=\"https://www.instagram.com/vedant.sheel/\" target=\"_blank\" rel=\"noopener\" class=\"profile-social-icon\" aria-label=\"Twitter\"><img src=\"twitter.png\" alt=\"Twitter\" /></a>" +
        "<a href=\"#\" class=\"profile-social-icon profile-social-placeholder profile-social-svg\" aria-label=\"LinkedIn\"><svg viewBox=\"0 0 24 24\" fill=\"currentColor\" width=\"100%\" height=\"100%\"><path d=\"M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z\"/></svg></a>";
    }

    var user = getCurrentUser();
    var state = getState();
    var xp = state.xp || 0;
    var level = state.level || 1;
    var visits = Object.keys(state.visits || {}).length;
    var xpEl = $("profileXp");
    var levelEl = $("profileLevel");
    var friendsEl = $("profileFriends");
    var followingEl = $("profileFollowing");
    if (nameEl) nameEl.textContent = (user && user.name) ? user.name : "Explorer";
    if (usernameEl) usernameEl.textContent = (user && user.username) ? "@" + user.username : "";
    if (bioEl) bioEl.textContent = (user && user.username === "vedant123") ? "17 | Toronto\ninsta: vedant.sheel" : "Discover and support local businesses.";
    if (friendsEl) friendsEl.textContent = (user && user.username === "vedant123") ? "24" : "0";
    if (followingEl) followingEl.textContent = (user && user.username === "vedant123") ? "12" : "0";
    if (xpEl) xpEl.textContent = xp;
    if (levelEl) levelEl.textContent = level;
    if (avatarEl) {
      if (user && user.username === "vedant123") {
        avatarEl.src = "vedantheadshot.jpeg";
        avatarEl.alt = user.name || "Profile";
        avatarEl.onerror = function () { this.src = "assets/vedantheadshot.jpeg"; };
      }
      avatarEl.style.display = "";
    }
    if (ribbonEl) ribbonEl.classList.toggle("hidden", !(user && user.username === "vedant123"));
    if (leaderboardRow) leaderboardRow.classList.toggle("hidden", !(user && user.username === "vedant123"));
    var visitsEl = $("profileVisits");
    var memberEl = $("profileMemberSince");
    if (visitsEl) visitsEl.textContent = visits;
    if (memberEl) memberEl.textContent = (user && user.username === "vedant123") ? "Jan 2025" : "2025";
    var savedListEl = $("profileSavedList");
    var savedEmptyEl = $("profileSavedEmpty");
    var favorites = state.favorites || [];
    if (savedListEl) {
      savedListEl.innerHTML = "";
      favorites.forEach(function (f) {
        var rawName = (typeof f === "string" ? f : (f && f.name)) || "";
        var name = rawName;
        if (!name || name.length > 35 || String(name).indexOf("ChIJ") === 0) name = "Saved place";
        var lat = typeof f === "object" && f != null ? f.lat : null;
        var lng = typeof f === "object" && f != null ? f.lng : null;
        lat = lat != null ? Number(lat) : null;
        lng = lng != null ? Number(lng) : null;
        var hasCoords = Number.isFinite(lat) && Number.isFinite(lng);
        var div = document.createElement("div");
        div.className = "profile-saved-item";
        div.innerHTML = "<span class=\"profile-saved-name\">" + escapeHtml(name) + "</span>";
        var visitBtn = document.createElement("button");
        visitBtn.type = "button";
        visitBtn.className = "profile-saved-visit-btn";
        visitBtn.textContent = "Visit";
        if (hasCoords) {
          visitBtn.setAttribute("data-lat", String(lat));
          visitBtn.setAttribute("data-lng", String(lng));
        } else { visitBtn.disabled = true; }
        div.appendChild(visitBtn);
        savedListEl.appendChild(div);
      });
    }
    if (savedEmptyEl) savedEmptyEl.classList.toggle("hidden", favorites.length > 0);
    var reviewsListEl = $("profileReviewsList");
    var reviewsEmptyEl = $("profileReviewsEmpty");
    var reviewItems = [];
    try {
      Object.keys(state.reviews || {}).forEach(function (pid) {
        (state.reviews[pid] || []).forEach(function (r) {
          reviewItems.push({ placeName: r.placeName || "Place", stars: r.stars, text: r.text || "", at: r.at, lat: r.lat, lng: r.lng });
        });
      });
    } catch (e) {}
    if (reviewsListEl) {
      reviewsListEl.innerHTML = "";
      reviewItems.forEach(function (r) {
        var rLat = r.lat != null ? Number(r.lat) : null;
        var rLng = r.lng != null ? Number(r.lng) : null;
        var hasCoords = Number.isFinite(rLat) && Number.isFinite(rLng);
        var div = document.createElement("div");
        div.className = "profile-review-item";
        var starsStr = "";
        for (var i = 0; i < 5; i++) starsStr += i < (r.stars || 0) ? "★" : "☆";
        var dateStr = r.at ? new Date(r.at).toLocaleDateString() : "";
        div.innerHTML = "<div class=\"profile-review-content\"><span class=\"profile-review-place\">" + escapeHtml(r.placeName) + "</span> <span class=\"profile-review-stars\">" + starsStr + "</span><p class=\"profile-review-text\">" + escapeHtml(r.text) + "</p><span class=\"profile-review-date\">" + escapeHtml(dateStr) + "</span></div>";
        var visitBtn = document.createElement("button");
        visitBtn.type = "button";
        visitBtn.className = "profile-saved-visit-btn";
        visitBtn.textContent = "Visit";
        if (hasCoords) {
          visitBtn.setAttribute("data-lat", String(rLat));
          visitBtn.setAttribute("data-lng", String(rLng));
        } else { visitBtn.disabled = true; }
        div.appendChild(visitBtn);
        reviewsListEl.appendChild(div);
      });
    }
    if (reviewsEmptyEl) reviewsEmptyEl.classList.toggle("hidden", reviewItems.length > 0);
    var badgesEl = $("profileBadges");
    if (badgesEl) {
      var badges = [
        { name: "First step", icon: "🎯", req: 1 },
        { name: "Explorer", icon: "👣", req: 5 },
        { name: "Champion", icon: "🏆", req: 10 },
        { name: "Foodie", icon: "🍕", req: 3 },
        { name: "Local hero", icon: "⭐", req: 7 },
      ];
      badgesEl.innerHTML = "";
      badges.forEach(function (b) {
        var unlocked = visits >= b.req;
        var div = document.createElement("div");
        div.className = "profile-badge-item" + (unlocked ? " unlocked" : "");
        div.innerHTML = "<span class=\"profile-badge-icon\">" + b.icon + "</span><span>" + b.name + "</span>";
        badgesEl.appendChild(div);
      });
    }
    var couponsEl = $("profileCoupons");
    if (couponsEl) {
      var numCoupons = Math.floor(xp / 250);
      var list = [
        { title: "10% off first visit", code: "EXPLORA10", tier: 0 },
        { title: "15% off + free drink", code: "EXPLORA15", tier: 250 },
        { title: "20% off at partners", code: "EXPLORA20", tier: 500 },
      ];
      couponsEl.innerHTML = "";
      list.forEach(function (c) {
        if (xp < c.tier) return;
        var card = document.createElement("div");
        card.className = "profile-coupon-card";
        card.innerHTML = "<strong>" + escapeHtml(c.title) + "</strong><code>" + escapeHtml(c.code) + "</code><span class=\"muted small\">Show at checkout</span>";
        couponsEl.appendChild(card);
      });
      if (couponsEl.children.length === 0) couponsEl.innerHTML = "<p class=\"muted small\">Earn more XP on the Rewards page to unlock coupons.</p>";
    }
  }

  (function onLoad() {
    try {
      var user = getCurrentUser();
      if (!user) {
        showScreen("login");
        initLogin();
        initOnboarding();
        return;
      }
      if (!localStorage.getItem(STORAGE.onboarding)) {
        showScreen("onboarding");
        initOnboarding();
        return;
      }
      showScreen("app");
    } catch (err) {
      console.error("Explora startup error:", err);
      showScreen("login");
      initLogin();
    }
  })();

  window.initMap = initMap;
})();
