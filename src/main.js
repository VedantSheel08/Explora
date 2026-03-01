/**
 * Explora – Single-page app entry.
 * Run: Live Server or `python -m http.server` from project root.
 * Set your Google Maps API key: in index.html add before this script:
 *   <script>window.EXPLORA_GMAPS_KEY = 'YOUR_KEY';</script>
 * Or set window.EXPLORA_GMAPS_KEY before loading. Restrict key by HTTP referrer in Google Cloud.
 */

import { initTheme, toggleTheme, getTheme } from "./theme.js";
import { initRouter, getRoute, navigate } from "./router.js";
import * as game from "./game.js";
import * as maps from "./maps.js";
import * as places from "./places.js";
import * as ui from "./ui.js";

const DEFAULT_CENTER = places.getDefaultCenter();

function $(id) {
  return document.getElementById(id);
}

function getCategoryFilter() {
  const el = $("categoryFilter");
  return el ? el.value : "all";
}

function getCategoryFilterForMarkers() {
  const c = getCategoryFilter();
  return c === "retail" ? "store" : c;
}

function getSortBy() {
  const el = $("sortBy");
  return el ? el.value : "distance";
}

function initExplora() {
  if (typeof google === "undefined" || !google.maps) {
    ui.showToast("Google Maps failed to load.");
    return;
  }

  const mapEl = $("map");
  if (!mapEl) return;

  maps.initMap(mapEl, DEFAULT_CENTER);

  const onFirstPosition = (userPos) => {
    if (userPos) {
      maps.setMapCenter(userPos);
      maps.addUserMarker();
    } else {
      maps.setMapCenter(DEFAULT_CENTER);
      ui.showToast("Location not available — showing Toronto. Enable location for your position.");
    }
    places.runDiscovery(
      maps.getPlacesService(),
      userPos || DEFAULT_CENTER,
      null,
      (list) => {
        ui.setCurrentPlaces(list);
        if (list.length === 0) {
          ui.showToast("No places found. Check that Places API is enabled for your key.");
        }
        maps.setPlaceMarkers(list, getCategoryFilterForMarkers(), (b) => {
          ui.showDetailPanel(b, maps.getPlacesService(), maps.getMap());
          ui.renderTrendingList(getCategoryFilter(), getSortBy());
          ui.renderRecommendedList(getCategoryFilter());
          ui.renderSavedList();
          ui.renderRadarList();
          ui.renderRadarMapOverlay();
        });
        ui.renderTrendingList(getCategoryFilter(), getSortBy());
        ui.renderRecommendedList(getCategoryFilter());
        ui.renderSavedList();
        ui.renderRadarList();
        ui.renderRadarMapOverlay();
      }
    );
  };

  maps.initGeolocation(onFirstPosition, (pos) => {
    maps.checkProximityAlert(ui.getCurrentPlaces(), (nearest) => {
      ui.showToast("You're near " + nearest.name + " — check it out!");
      maps.setProximityHighlight(nearest.place_id, true);
      setTimeout(() => maps.setProximityHighlight(null, false), 2000);
      game.unlockBadge("radar_discovery");
      game.updateBadges();
    });
    ui.renderRadarList();
    ui.renderRadarMapOverlay();
    if (ui.getSelectedPlace()) ui.updateVisitButton();
  });

  ui.setOnSelectPlace((b) => {
    ui.showDetailPanel(b, maps.getPlacesService(), maps.getMap());
    ui.renderTrendingList(getCategoryFilter(), getSortBy());
    ui.renderRecommendedList(getCategoryFilter());
    ui.renderSavedList();
    ui.renderRadarList();
    ui.renderRadarMapOverlay();
  });

  $("categoryFilter").addEventListener("change", () => {
    maps.setPlaceMarkers(ui.getCurrentPlaces(), getCategoryFilterForMarkers(), (b) => {
      ui.showDetailPanel(b, maps.getPlacesService(), maps.getMap());
      ui.renderTrendingList(getCategoryFilter(), getSortBy());
      ui.renderRecommendedList(getCategoryFilter());
      ui.renderSavedList();
      ui.renderRadarList();
      ui.renderRadarMapOverlay();
    });
    ui.renderTrendingList(getCategoryFilter(), getSortBy());
    ui.renderRecommendedList(getCategoryFilter());
    ui.renderSavedList();
  });

  $("sortBy").addEventListener("change", () => {
    ui.renderTrendingList(getCategoryFilter(), getSortBy());
    ui.renderRecommendedList(getCategoryFilter());
  });

  $("visitBtn").addEventListener("click", () => {
    const place = ui.getSelectedPlace();
    if (!place) return;
    const userPos = maps.getUserPosition();
    if (!userPos) return;
    const dist = maps.haversineMeters(userPos, { lat: place.lat, lng: place.lng });
    const radius = maps.getVisitRadiusMeters();
    if (dist > radius) {
      ui.showToast("Get within " + radius + "m to check in (you're ~" + Math.round(dist) + "m away).");
      return;
    }
    const result = game.recordVisit(place.place_id, place.category);
    if (!result) {
      ui.showToast("Already visited this place.");
      return;
    }
    ui.showToast("+50 XP" + (result.bonus ? " + First visit bonus!" : ""));
    game.updateBadges();
    ui.updateXpUI();
    ui.updateVisitButton();
    ui.renderTrendingList(getCategoryFilter(), getSortBy());
    ui.renderRecommendedList(getCategoryFilter());
    ui.renderSavedList();
    ui.renderRadarList();
    ui.renderRadarMapOverlay();
  });

  $("bookmarkBtn").addEventListener("click", () => {
    const place = ui.getSelectedPlace();
    if (!place) return;
    const isNowSaved = game.toggleSaved(place.place_id);
    game.resetAndUpdateChallenges();
    ui.updateBookmarkButton();
    ui.renderTrendingList(getCategoryFilter(), getSortBy());
    ui.renderRecommendedList(getCategoryFilter());
    ui.renderSavedList();
    ui.showToast(isNowSaved ? "Saved." : "Removed from saved.");
  });

  $("directionsBtn").addEventListener("click", () => ui.openDirections());

  $("writeReviewBtn").addEventListener("click", () => {
    const t = $("reviewText");
    if (t) t.focus();
  });

  $("addReviewBtn").addEventListener("click", () => {
    const place = ui.getSelectedPlace();
    if (!place) return;
    const check = $("notBotCheck");
    if (!check || !check.checked) {
      ui.showToast("Please confirm you're not a bot.");
      return;
    }
    if (game.getReviewCooldown(place.place_id) > 0) {
      ui.showToast("Please wait before submitting another review.");
      return;
    }
    const stars = parseInt($("reviewStars").value, 10);
    const text = ($("reviewText").value || "").trim();
    if (!text) {
      ui.showToast("Write a short review first.");
      return;
    }
    game.addExploraReview(place.place_id, stars, text);
    game.setReviewCooldown(place.place_id);
    $("reviewText").value = "";
    if (check) check.checked = false;
    ui.renderExploraReviewsSection(place.place_id);
    ui.updateReviewForm(place.place_id);
    game.updateBadges();
    ui.renderTrendingList(getCategoryFilter(), getSortBy());
    ui.showToast("Review submitted.");
  });

  $("searchInput").addEventListener("keydown", (e) => {
    if (e.key !== "Enter") return;
    const q = ($("searchInput").value || "").trim();
    if (q.length < 2) return;
    const center = maps.getUserPosition() || DEFAULT_CENTER;
    places.runTextSearch(maps.getPlacesService(), maps.getMap(), q, center, (list) => {
      ui.setCurrentPlaces(list);
      maps.setPlaceMarkers(list, getCategoryFilterForMarkers(), (b) => {
        ui.showDetailPanel(b, maps.getPlacesService(), maps.getMap());
        ui.renderTrendingList(getCategoryFilter(), getSortBy());
        ui.renderRecommendedList(getCategoryFilter());
        ui.renderSavedList();
        ui.renderRadarList();
        ui.renderRadarMapOverlay();
      });
      ui.renderTrendingList(getCategoryFilter(), getSortBy());
      ui.renderRecommendedList(getCategoryFilter());
      ui.renderSavedList();
      ui.renderRadarList();
      ui.renderRadarMapOverlay();
    });
  });

  const followBtn = $("followMeBtn");
  if (followBtn) {
    followBtn.addEventListener("click", () => {
      const next = !maps.getFollowMe();
      maps.setFollowMe(next);
      followBtn.classList.toggle("active", next);
      followBtn.title = next ? "Following your location" : "Follow me";
    });
  }

  $("profileBtn").addEventListener("click", () => ui.showToast("Profile (demo)"));

  ui.updateXpUI();
  ui.updateBottomBar();
}

function onRoute(route) {
  if (route === "rewards") ui.renderRewardsPage();
  if (route === "badges") ui.renderBadgesPage();
  if (route === "challenges") ui.renderChallengesPage();
}

initTheme();

const themeBtn = $("themeToggle");
if (themeBtn) {
  themeBtn.addEventListener("click", () => {
    const next = toggleTheme();
    themeBtn.textContent = next === "dark" ? "🌙" : "☀️";
    themeBtn.setAttribute("aria-label", next === "dark" ? "Switch to light mode" : "Switch to dark mode");
  });
  themeBtn.textContent = getTheme() === "dark" ? "🌙" : "☀️";
}

initRouter(onRoute);

const key = typeof window !== "undefined" && window.EXPLORA_GMAPS_KEY;
if (!key) {
  console.warn("Explora: Set window.EXPLORA_GMAPS_KEY or add script in index.html to load Google Maps.");
}

function loadMapsScript() {
  const script = document.createElement("script");
  script.src =
    "https://maps.googleapis.com/maps/api/js?key=" +
    encodeURIComponent(key || "") +
    "&callback=window.__exploraMapsReady&libraries=places";
  script.async = true;
  script.defer = true;
  document.head.appendChild(script);
}

window.__exploraMapsReady = function () {
  initExplora();
};

function showMapLoadError(msg) {
  const mapEl = document.getElementById("map");
  if (mapEl) {
    mapEl.innerHTML = "<div style=\"padding:24px;text-align:center;color:#64748b;font-size:14px;\">" + msg + "</div>";
  }
  console.error("Explora:", msg);
}

if (key) {
  loadMapsScript();
  setTimeout(function () {
    if (typeof google === "undefined" || !google.maps) {
      showMapLoadError("Map failed to load. Enable Maps JavaScript API and Places API for your key, and check referrer restrictions.");
    }
  }, 8000);
} else {
  showMapLoadError("No API key. Set window.EXPLORA_GMAPS_KEY in index.html.");
}
