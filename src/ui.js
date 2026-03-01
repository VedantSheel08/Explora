/**
 * UI: sidebar lists (Trending, Recommended, Saved, Radar), detail panel, skeleton,
 * toasts, rewards/badges/challenges pages.
 */

import * as game from "./game.js";
import * as maps from "./maps.js";
import { getCachedDetails, fetchPlaceDetails, getDemoDeals, getCategory } from "./places.js";

function $(id) {
  return document.getElementById(id);
}

function escapeHtml(s) {
  if (s == null) return "";
  const str = String(s);
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

let selectedPlace = null;
let currentPlaces = [];
let onSelectPlaceCallback = null;

export function setCurrentPlaces(places) {
  currentPlaces = places || [];
}

export function getCurrentPlaces() {
  return currentPlaces;
}

export function setSelectedPlace(place) {
  selectedPlace = place;
}

export function getSelectedPlace() {
  return selectedPlace;
}

export function setOnSelectPlace(fn) {
  onSelectPlaceCallback = fn;
}

export function selectPlaceByPlaceId(placeId) {
  const b = currentPlaces.find((p) => p.place_id === placeId);
  if (b && onSelectPlaceCallback) onSelectPlaceCallback(b);
}

function trendingScore(b, visits, reviewsMap, saved) {
  const v = visits[b.place_id] ? 1 : 0;
  const rev = (reviewsMap[b.place_id] || []).length;
  const fav = saved.indexOf(b.place_id) >= 0 ? 1 : 0;
  return (v ? 3 : 0) + rev * 2 + (fav ? 2 : 0) + (b.rating || 0);
}

function sortPlaces(places, sortBy, userPos, visits, reviewsMap, saved) {
  const list = places.slice();
  if (sortBy === "distance" && userPos) {
    list.sort(
      (a, b) =>
        maps.haversineMeters(userPos, { lat: a.lat, lng: a.lng }) -
        maps.haversineMeters(userPos, { lat: b.lat, lng: b.lng })
    );
  } else if (sortBy === "rating") {
    list.sort((a, b) => (b.rating != null ? b.rating : 0) - (a.rating != null ? a.rating : 0));
  } else if (sortBy === "trending") {
    list.sort(
      (a, b) => trendingScore(b, visits, reviewsMap, saved) - trendingScore(a, visits, reviewsMap, saved)
    );
  } else if (sortBy === "relevance") {
    list.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
  }
  return list;
}

function filterByCategory(places, category) {
  if (!category || category === "all") return places;
  if (category === "retail") return places.filter((p) => p.category === "store");
  return places.filter((p) => p.category === category);
}

export function getFilteredAndSortedPlaces(categoryVal, sortVal) {
  const visits = game.getState().visits || {};
  const reviews = game.getState().exploraReviews || {};
  const saved = game.getState().saved || [];
  const filtered = filterByCategory(currentPlaces, categoryVal);
  return sortPlaces(
    filtered,
    sortVal || "distance",
    maps.getUserPosition(),
    visits,
    reviews,
    saved
  );
}

export function showToast(msg) {
  const el = $("toast");
  if (!el) return;
  el.textContent = msg;
  el.classList.remove("hidden");
  el.setAttribute("aria-live", "polite");
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => {
    el.classList.add("toast-out");
    setTimeout(() => {
      el.classList.add("hidden");
      el.classList.remove("toast-out");
    }, 250);
  }, 3500);
}

export function renderRadarList() {
  const el = $("radarList");
  if (!el) return;
  const userPos = maps.getUserPosition();
  const closest = maps.getClosestPlaces(currentPlaces, 3);
  el.innerHTML = "";
  if (!userPos) {
    el.innerHTML = "<li class='muted small'>Enable location to see nearest places.</li>";
    return;
  }
  if (closest.length === 0) {
    el.innerHTML = "<li class='muted small'>No places loaded yet.</li>";
    return;
  }
  closest.forEach((x) => {
    const li = document.createElement("li");
    li.innerHTML =
      "<span class='thumb'></span><div class='info'><span class='name'>" +
      escapeHtml(x.place.name) +
      "</span><span class='meta'>" +
      Math.round(x.dist) +
      " m</span></div>";
    li.addEventListener("click", () => selectPlaceByPlaceId(x.place.place_id));
    el.appendChild(li);
  });
}

export function renderRadarMapOverlay() {
  const listEl = $("radarMapList");
  const overlay = $("radarMapOverlay");
  if (!listEl || !overlay) return;
  const userPos = maps.getUserPosition();
  const closest = maps.getClosestPlaces(currentPlaces, 3);
  if (!userPos || closest.length === 0) {
    overlay.style.display = "none";
    return;
  }
  overlay.style.display = "block";
  listEl.innerHTML = "";
  closest.forEach((x) => {
    const li = document.createElement("li");
    li.innerHTML =
      "<span class='name'>" +
      escapeHtml(x.place.name) +
      "</span><span class='dist'>" +
      Math.round(x.dist) +
      " m</span>";
    li.addEventListener("click", () => selectPlaceByPlaceId(x.place.place_id));
    listEl.appendChild(li);
  });
}

export function renderTrendingList(categoryVal, sortVal, limit = 5) {
  const listEl = $("trendingList");
  if (!listEl) return;
  const sorted = getFilteredAndSortedPlaces(categoryVal, sortVal);
  const trending = sorted.slice(0, limit);
  listEl.innerHTML = "";
  const userPos = maps.getUserPosition();
  trending.forEach((b) => {
    const li = document.createElement("li");
    const distStr = userPos
      ? "<span class='distance-pill'>" +
        Math.round(maps.haversineMeters(userPos, { lat: b.lat, lng: b.lng })) +
        " m</span>"
      : "";
    li.innerHTML =
      "<span class='thumb'></span><div class='info'><span class='name'>" +
      escapeHtml(b.name) +
      "</span><span class='meta'>" +
      (b.rating != null ? "<span class='stars'>★ " + b.rating + "</span> • " : "") +
      escapeHtml(b.category) +
      distStr +
      "</span></div>";
    li.addEventListener("click", () => selectPlaceByPlaceId(b.place_id));
    listEl.appendChild(li);
  });
}

export function renderRecommendedList(categoryVal, limit = 5) {
  const listEl = $("recommendedList");
  if (!listEl) return;
  const filtered = filterByCategory(currentPlaces, categoryVal);
  const saved = game.getState().saved || [];
  const reviews = game.getState().exploraReviews || {};
  const userPos = maps.getUserPosition();
  const scored = filtered.map((p) => {
    let reason = "Near you";
    let score = 0;
    const dist = userPos ? maps.haversineMeters(userPos, { lat: p.lat, lng: p.lng }) : 0;
    if (userPos && dist < 500) {
      score += 3;
      reason = "Very close";
    } else if (userPos && dist < 1000) {
      score += 2;
      reason = "Nearby";
    }
    if (p.rating >= 4.5) {
      score += 2;
      reason += " • Highly rated";
    }
    if (saved.indexOf(p.place_id) >= 0) {
      score += 1;
      reason = "In your saved list";
    }
    if ((reviews[p.place_id] || []).length > 0) {
      score += 1;
      reason += " • You reviewed";
    }
    return { place: p, score, reason };
  });
  scored.sort((a, b) => b.score - a.score);
  const recs = scored.slice(0, limit).map((x) => ({ place: x.place, reason: x.reason }));
  listEl.innerHTML = "";
  recs.forEach((item) => {
    const b = item.place;
    const li = document.createElement("li");
    const distStr = userPos
      ? "<span class='distance-pill'>" +
        Math.round(maps.haversineMeters(userPos, { lat: b.lat, lng: b.lng })) +
        " m</span>"
      : "";
    li.innerHTML =
      "<span class='thumb'></span><div class='info'><span class='name'>" +
      escapeHtml(b.name) +
      "</span><span class='meta'>" +
      escapeHtml(item.reason) +
      distStr +
      "</span></div>";
    li.addEventListener("click", () => selectPlaceByPlaceId(b.place_id));
    listEl.appendChild(li);
  });
}

export function renderSavedList() {
  const listEl = $("savedList");
  if (!listEl) return;
  const savedIds = game.getState().saved || [];
  const savedPlaces = currentPlaces.filter((p) => savedIds.indexOf(p.place_id) >= 0);
  listEl.innerHTML = "";
  if (savedPlaces.length === 0) {
    listEl.innerHTML = "<li class='muted small'>No saved places. Bookmark from the map.</li>";
    return;
  }
  const userPos = maps.getUserPosition();
  savedPlaces.forEach((b) => {
    const li = document.createElement("li");
    const distStr = userPos
      ? "<span class='distance-pill'>" +
        Math.round(maps.haversineMeters(userPos, { lat: b.lat, lng: b.lng })) +
        " m</span>"
      : "";
    li.innerHTML =
      "<span class='thumb'></span><div class='info'><span class='name'>" +
      escapeHtml(b.name) +
      "</span><span class='meta'>" +
      (b.rating != null ? "★ " + b.rating + " • " : "") +
      escapeHtml(b.category) +
      distStr +
      "</span></div>";
    li.addEventListener("click", () => selectPlaceByPlaceId(b.place_id));
    listEl.appendChild(li);
  });
}

function showReviewsSkeleton() {
  const root = $("googleReviews");
  if (!root) return;
  root.innerHTML =
    "<div class='reviews-skeleton'><div class='skeleton-line short'></div><div class='skeleton-line'></div><div class='skeleton-line'></div><div class='skeleton-line short'></div></div>";
}

function setPanelRating(rating) {
  const el = $("panelRating");
  if (!el) return;
  if (rating != null) el.innerHTML = "★ " + Number(rating).toFixed(1) + " / 5";
  else el.textContent = "";
}

function applyPlaceDetailsToPanel(details) {
  if ($("panelAddress") && details.formatted_address) $("panelAddress").textContent = details.formatted_address;
  if (details.rating != null) setPanelRating(details.rating);
  const hoursEl = $("panelHours");
  if (hoursEl) {
    if (details.opening_hours && details.opening_hours.open_now !== undefined) {
      hoursEl.textContent = details.opening_hours.open_now ? "Open now" : "Closed";
    } else hoursEl.textContent = "";
  }
  const root = $("googleReviews");
  if (!root) return;
  root.classList.remove("empty-state");
  const reviews = details.reviews || [];
  if (reviews.length === 0) {
    root.classList.add("empty-state");
    root.innerHTML =
      "<p class='muted small'>No Google reviews available via API for this place.</p>";
    return;
  }
  root.innerHTML = "";
  reviews.slice(0, 5).forEach((r) => {
    const div = document.createElement("div");
    div.className = "review-item";
    div.innerHTML =
      "<div class='row'><strong>" +
      escapeHtml(r.author_name || "User") +
      "</strong><span class='stars'>" +
      "★".repeat(r.rating || 0) +
      "☆".repeat(5 - (r.rating || 0)) +
      "</span></div><p>" +
      escapeHtml((r.text || "").slice(0, 300)) +
      "</p>";
    root.appendChild(div);
  });
}

export function showDetailPanel(b, placesService, map) {
  selectedPlace = b;
  $("panelEmpty").classList.add("hidden");
  $("panelContent").classList.remove("hidden");

  $("panelTitle").textContent = b.name;
  const catText =
    (b.category || "establishment").charAt(0).toUpperCase() + (b.category || "").slice(1);
  $("panelCategory").innerHTML =
    "<span class='category-icon' aria-hidden='true'></span>" + escapeHtml(catText);
  $("panelAddress").textContent = b.vicinity || "Address not available";
  $("panelHours").textContent = "";
  setPanelRating(b.rating);
  showReviewsSkeleton();
  renderExploraReviewsSection(b.place_id);
  renderDeals(b);
  updateVisitButton();
  updateBookmarkButton();
  updateReviewForm(b.place_id);
  const dirBtn = $("directionsBtn");
  if (dirBtn) dirBtn.disabled = false;

  const cached = getCachedDetails(b.place_id);
  if (cached) {
    applyPlaceDetailsToPanel(cached);
  } else {
    fetchPlaceDetails(b.place_id, placesService, map, (details) => {
      if (!selectedPlace || selectedPlace.place_id !== b.place_id) return;
      if (details) applyPlaceDetailsToPanel(details);
      else {
        const root = $("googleReviews");
        if (root) {
          root.classList.add("empty-state");
          root.innerHTML =
            "<p class='muted small'>No Google reviews available via API for this place.</p>";
        }
        setPanelRating(b.rating);
        $("panelAddress").textContent = b.vicinity || "Address not available";
      }
    });
  }

  maps.panToPlace(b.lat, b.lng);
  maps.setMarkerHighlight(b.place_id);
}

export function renderExploraReviewsSection(placeId) {
  const root = $("exploraReviews");
  if (!root) return;
  root.innerHTML = "";
  const list = (game.getState().exploraReviews || {})[placeId] || [];
  if (list.length === 0) {
    root.innerHTML = "<p class='muted small'>No Explora reviews yet. Be the first!</p>";
    return;
  }
  list.slice().reverse().forEach((r) => {
    const div = document.createElement("div");
    div.className = "review-item";
    div.innerHTML =
      "<div class='row'><strong>" +
      escapeHtml(r.name || "Anonymous") +
      "</strong><span class='stars'>" +
      "★".repeat(r.stars) +
      "☆".repeat(5 - r.stars) +
      "</span></div><p>" +
      escapeHtml(r.text) +
      "</p><div class='muted small'>" +
      new Date(r.at).toLocaleString() +
      "</div>";
    root.appendChild(div);
  });
}

function renderDeals(b) {
  const list = getDemoDeals(b.category);
  const container = $("dealsList");
  if (!container) return;
  if (!list.length) {
    container.innerHTML = "<p class='muted small'>No deals at the moment.</p>";
    return;
  }
  container.innerHTML = "";
  list.forEach((d, idx) => {
    const div = document.createElement("div");
    div.className = "deal-item";
    const pillClass = idx === 0 ? "deal-pill" : "deal-pill blue";
    const codeHtml = d.code
      ? "<div class='code-wrap'><span class='code'>USE CODE: " +
        escapeHtml(d.code) +
        "</span><button type='button' class='btn-copy' data-code='" +
        escapeHtml(d.code) +
        "'>Copy</button></div>"
      : "";
    div.innerHTML =
      "<div class='" +
      pillClass +
      "' aria-hidden='true'></div><div class='deal-body'><strong>" +
      escapeHtml(d.title) +
      "</strong>" +
      codeHtml +
      "</div>";
    container.appendChild(div);
    if (d.code) {
      const btn = div.querySelector(".btn-copy");
      if (btn)
        btn.addEventListener("click", () => {
          const code = btn.getAttribute("data-code");
          if (code && navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(code).then(() => showToast("Code copied!"));
          }
        });
    }
  });
}

function getReviewCooldown(placeId) {
  return game.getReviewCooldown(placeId);
}

export function updateVisitButton() {
  const btn = $("visitBtn");
  if (!btn || !selectedPlace) return;
  const userPos = maps.getUserPosition();
  btn.disabled = !userPos;
  const dist = userPos
    ? maps.haversineMeters(userPos, { lat: selectedPlace.lat, lng: selectedPlace.lng })
    : Infinity;
  const radius = maps.getVisitRadiusMeters();
  btn.title =
    dist <= radius
      ? "Claim +50 XP"
      : "Get within " + radius + "m (you're ~" + Math.round(dist) + "m)";
}

export function updateBookmarkButton() {
  const btn = $("bookmarkBtn");
  if (!btn || !selectedPlace) return;
  btn.classList.toggle("bookmarked", game.isSaved(selectedPlace.place_id));
  btn.title = game.isSaved(selectedPlace.place_id) ? "Remove from saved" : "Add to saved";
}

export function updateReviewForm(placeId) {
  const cooldown = getReviewCooldown(placeId);
  const check = $("notBotCheck");
  const btn = $("addReviewBtn");
  const msg = $("reviewCooldown");
  if (!btn) return;
  if (cooldown > 0) {
    btn.disabled = true;
    if (msg) msg.textContent = "You can submit again in " + Math.ceil(cooldown / 60000) + " min.";
  } else {
    if (msg) msg.textContent = "";
    btn.disabled = !(check && check.checked);
  }
  if (check) {
    check.checked = false;
    const handler = () => {
      btn.disabled = cooldown > 0 || !check.checked;
    };
    check.onchange = handler;
  }
}

export function updateXpUI() {
  const el = $("xpValue");
  if (el) el.textContent = (game.getState().xp || 0).toLocaleString();
  const coinsEl = $("coinsValue");
  if (coinsEl) coinsEl.textContent = (game.getState().coins || 0).toLocaleString();
  updateBottomBar();
}

export function updateBottomBar() {
  const state = game.getState();
  const { level, xpInLevel, xpNeeded, nextLevelXP } = game.getLevelProgress();
  const xp = state.xp || 0;
  const rewardsBar = $("bottomRewardsBar");
  const rewardsText = $("bottomRewardsText");
  if (rewardsBar) rewardsBar.style.width = Math.min(100, (xpInLevel / xpNeeded) * 100) + "%";
  if (rewardsText) rewardsText.textContent = xpInLevel + " / " + xpNeeded + " XP";

  const badgesUnlocked = state.badges
    ? Object.keys(state.badges).filter((id) => state.badges[id].unlocked).length
    : 0;
  const totalBadges = game.BADGE_DEFS.length;
  const badgesBar = $("bottomBadgesBar");
  const badgesText = $("bottomBadgesText");
  if (badgesBar) badgesBar.style.width = (badgesUnlocked / totalBadges) * 100 + "%";
  if (badgesText) badgesText.textContent = badgesUnlocked + " / " + totalBadges + " Collected";

  const { daily, weekly } = game.getChallengeProgress();
  const completed =
    daily.filter((c) => c.progress >= c.goal).length + weekly.filter((c) => c.progress >= c.goal).length;
  const totalCh = daily.length + weekly.length;
  const challengesBar = $("bottomChallengesBar");
  const challengesText = $("bottomChallengesText");
  if (challengesBar) challengesBar.style.width = (totalCh ? (completed / totalCh) * 100 : 0) + "%";
  if (challengesText) challengesText.textContent = completed + " / " + totalCh + " Completed";
}

export function renderRewardsPage() {
  const state = game.getState();
  game.recomputeLevel();
  const { level, xp, xpInLevel, xpNeeded } = game.getLevelProgress();
  const streak = (state.streak && state.streak.count) || 0;
  const coins = state.coins || 0;

  const elXp = $("rewardsXp");
  const elLevel = $("rewardsLevel");
  const elStreak = $("rewardsStreak");
  const elCoins = $("rewardsCoins");
  const elProgress = $("rewardsLevelProgress");
  const elText = $("rewardsLevelText");
  if (elXp) elXp.textContent = xp.toLocaleString();
  if (elLevel) elLevel.textContent = level;
  if (elStreak) elStreak.textContent = streak;
  if (elCoins) elCoins.textContent = coins.toLocaleString();
  if (elProgress) elProgress.style.width = Math.min(100, (xpInLevel / xpNeeded) * 100) + "%";
  if (elText) elText.textContent = xpInLevel + " / " + xpNeeded + " XP to next level";

  const feedEl = $("rewardsActivityFeed");
  if (feedEl) {
    const feed = game.getActivityFeed(5);
    if (feed.length === 0) {
      feedEl.innerHTML = "<p class='muted small'>No recent activity.</p>";
    } else {
      feedEl.innerHTML = feed
        .map((a) => {
          let text = "Activity";
          if (a.type === "visit") text = "Visited a place (+" + (a.payload.xp || 0) + " XP)";
          if (a.type === "first_visit") text = "First visit bonus (+" + (a.payload.xp || 0) + " XP)";
          if (a.type === "badge") text = "Badge unlocked";
          if (a.type === "review") text = "Wrote a review";
          return "<div class='activity-item'>" + escapeHtml(text) + " <span class='muted small'>" + new Date(a.at).toLocaleString() + "</span></div>";
        })
        .join("");
    }
  }

  const nextEl = $("rewardsNextUnlock");
  if (nextEl) {
    const nextLevel = level * 250;
    const remaining = nextLevel - xp;
    nextEl.innerHTML =
      "<strong>Next level</strong> " +
      remaining +
      " XP to level " +
      (level + 1) +
      " <span class='muted small'>(" +
      nextLevel +
      " total)</span>";
  }
}

export function renderBadgesPage() {
  const grid = $("badgesGrid");
  if (!grid) return;
  const state = game.getState();
  const prog = game.getBadgeProgress();
  grid.innerHTML = "";
  game.BADGE_DEFS.forEach((badge) => {
    const unlocked = !!(state.badges && state.badges[badge.id] && state.badges[badge.id].unlocked);
    let progressText = "";
    if (!unlocked) {
      if (badge.req.visits) progressText = prog.visits + " / " + badge.req.visits + " visits";
      else if (badge.req.foodVisits) progressText = prog.foodVisits + " / " + badge.req.foodVisits + " food";
      else if (badge.req.retailVisits) progressText = prog.retailVisits + " / " + badge.req.retailVisits + " retail";
      else if (badge.req.serviceVisits) progressText = prog.serviceVisits + " / " + badge.req.serviceVisits + " services";
      else if (badge.req.saved) progressText = prog.saved + " / " + badge.req.saved + " saved";
      else if (badge.req.reviews) progressText = prog.reviews + " / " + badge.req.reviews + " reviews";
      else if (badge.req.radar) progressText = "Get a proximity alert";
    }
    const rarity = "rarity-" + (badge.rarity || "bronze");
    const div = document.createElement("div");
    div.className = "badge-item " + (unlocked ? "unlocked" : "locked") + " " + rarity;
    div.innerHTML =
      "<div class='badge-icon'>" +
      (unlocked ? badge.icon : "🔒") +
      "</div><div class='badge-name'>" +
      escapeHtml(badge.name) +
      "</div><div class='badge-desc'>" +
      escapeHtml(badge.desc) +
      "</div>" +
      (progressText ? "<div class='badge-progress'>" + escapeHtml(progressText) + "</div>" : "");
    grid.appendChild(div);
  });
}

export function renderChallengesPage() {
  const { daily, weekly } = game.getChallengeProgress();
  function renderList(containerId, list, resetLabel) {
    const ul = $(containerId);
    if (!ul) return;
    ul.innerHTML = "";
    list.forEach((c) => {
      const li = document.createElement("li");
      li.classList.toggle("completed", c.progress >= c.goal);
      const pct = c.goal > 0 ? Math.min(100, (c.progress / c.goal) * 100) : 0;
      let rewardText = "";
      if (c.reward) {
        if (c.reward.xp) rewardText = "+" + c.reward.xp + " XP";
        if (c.reward.coins) rewardText += (rewardText ? " • " : "") + "+" + c.reward.coins + " coins";
      }
      const resetText = resetLabel || "";
      li.innerHTML =
        "<span class='challenge-title'>" +
        escapeHtml(c.title) +
        "</span><div class='challenge-progress-wrap'><div class='challenge-progress-bar' style='width:" +
        pct +
        "%'></div></div><div class='challenge-meta'><span class='challenge-progress'>" +
        c.progress +
        " / " +
        c.goal +
        "</span><span class='challenge-reward'>" +
        rewardText +
        "</span>" +
        (resetText ? "<span class='challenge-reset'>" + resetText + "</span>" : "") +
        "</div>";
      ul.appendChild(li);
    });
  }
  renderList("challengesDaily", daily, "Resets at midnight");
  renderList("challengesWeekly", weekly, "Resets Monday");
}

export function openDirections() {
  if (!selectedPlace) return;
  const dest = selectedPlace.lat + "," + selectedPlace.lng;
  const userPos = maps.getUserPosition();
  const origin = userPos ? userPos.lat + "," + userPos.lng : "";
  let url = "https://www.google.com/maps/dir/?api=1&destination=" + encodeURIComponent(dest);
  if (origin) url += "&origin=" + encodeURIComponent(origin);
  window.open(url, "_blank");
}
