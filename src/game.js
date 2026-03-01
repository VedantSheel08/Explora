/**
 * Unified game state: XP, coins, level, visits, saved, badges, challenges, streak, activity feed.
 * All persisted in localStorage under explora_gameState_v2.
 */

const STORAGE_KEY = "explora_gameState_v2";
const LEVEL_XP = 250;
const VISIT_XP = 50;
const VISIT_COINS = 5;
const FIRST_VISIT_BONUS_XP = 100;
const CATEGORY_BONUS_XP = 25;

let _state = null;

function load() {
  if (_state) return _state;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    _state = raw ? JSON.parse(raw) : defaultState();
    return _state;
  } catch (_) {
    _state = defaultState();
    return _state;
  }
}

function defaultState() {
  return {
    xp: 0,
    level: 1,
    coins: 0,
    visits: {},
    saved: [],
    exploraReviews: {},
    streak: { count: 0, lastVisitDate: null },
    badges: {},
    challenges: {
      daily: [
        { id: "d1", title: "Visit 2 places today", goal: 2, progress: 0, reward: { xp: 50 }, lastReset: null },
        { id: "d2", title: "Save 1 new place", goal: 1, progress: 0, reward: { coins: 10 }, lastReset: null },
      ],
      weekly: [
        { id: "w1", title: "Visit 5 places this week", goal: 5, progress: 0, reward: { xp: 150 }, lastReset: null },
      ],
    },
    placeAwards: {},
    activityFeed: [],
    reviewLast: {},
  };
}

const REVIEW_COOLDOWN_MS = 5 * 60 * 1000;

export function getReviewCooldown(placeId) {
  const last = (getState().reviewLast || {})[placeId];
  if (!last) return 0;
  return Math.max(0, REVIEW_COOLDOWN_MS - (Date.now() - last));
}

export function setReviewCooldown(placeId) {
  const state = load();
  state.reviewLast = state.reviewLast || {};
  state.reviewLast[placeId] = Date.now();
  save();
}

function save() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(load()));
  } catch (_) {}
}

export function getState() {
  return load();
}

export function persist() {
  save();
}

export function addToFeed(type, payload) {
  const state = load();
  state.activityFeed = (state.activityFeed || []).slice(0, 49);
  state.activityFeed.unshift({ type, payload, at: Date.now() });
  save();
}

export function recomputeLevel() {
  const state = load();
  state.level = Math.floor(state.xp / LEVEL_XP) + 1;
  save();
  return state.level;
}

export function grantXP(amount) {
  const state = load();
  state.xp = (state.xp || 0) + amount;
  recomputeLevel();
  save();
  return state.xp;
}

export function addCoins(amount) {
  const state = load();
  state.coins = (state.coins || 0) + Math.max(0, amount);
  save();
  return state.coins;
}

export function recordVisit(placeId, category) {
  const state = load();
  if (state.visits[placeId]) return { first: false, bonus: 0 };
  const first = !Object.keys(state.visits || {}).length;
  state.visits[placeId] = { at: Date.now(), category: category || "other" };
  state.placeAwards[placeId] = state.placeAwards[placeId] || {};
  state.placeAwards[placeId].visited = true;
  state.placeAwards[placeId].visitCount = (state.placeAwards[placeId].visitCount || 0) + 1;
  if (!state.placeAwards[placeId].firstVisitAt) state.placeAwards[placeId].firstVisitAt = Date.now();

  let xp = VISIT_XP;
  let coins = VISIT_COINS;
  if (first) {
    xp += FIRST_VISIT_BONUS_XP;
    addToFeed("first_visit", { placeId, xp: FIRST_VISIT_BONUS_XP });
  }
  grantXP(xp);
  addCoins(coins);
  updateStreak();
  resetAndUpdateChallenges();
  save();
  addToFeed("visit", { placeId, xp, coins });
  return { first, bonus: first ? FIRST_VISIT_BONUS_XP : 0 };
}

export function updateStreak() {
  const state = load();
  const today = new Date().toISOString().slice(0, 10);
  const str = state.streak || { count: 0, lastVisitDate: null };
  if (str.lastVisitDate === today) return str.count;
  const yesterday = new Date(Date.now() - 864e5).toISOString().slice(0, 10);
  if (str.lastVisitDate === yesterday) str.count = (str.count || 0) + 1;
  else str.count = 1;
  str.lastVisitDate = today;
  state.streak = str;
  save();
  return str.count;
}

export function toggleSaved(placeId) {
  const state = load();
  const list = state.saved || [];
  const i = list.indexOf(placeId);
  if (i >= 0) list.splice(i, 1);
  else list.push(placeId);
  state.saved = list;
  save();
  return list.indexOf(placeId) >= 0;
}

export function isSaved(placeId) {
  return (getState().saved || []).indexOf(placeId) >= 0;
}

export function addExploraReview(placeId, stars, text) {
  const state = load();
  state.exploraReviews[placeId] = state.exploraReviews[placeId] || [];
  state.exploraReviews[placeId].push({ name: "You", stars, text, at: Date.now() });
  state.placeAwards[placeId] = state.placeAwards[placeId] || {};
  state.placeAwards[placeId].localSupporter = true;
  save();
  addToFeed("review", { placeId });
  resetAndUpdateChallenges();
}

export function getActivityFeed(limit = 5) {
  return (getState().activityFeed || []).slice(0, limit);
}

function getToday() {
  return new Date().toISOString().slice(0, 10);
}
function getWeekStart() {
  const d = new Date();
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  return d.toISOString().slice(0, 10);
}

export function resetAndUpdateChallenges() {
  const state = load();
  const today = getToday();
  const weekStart = getWeekStart();
  const visits = state.visits || {};
  const visitCountToday = Object.keys(visits).filter((id) => new Date(visits[id].at).toISOString().slice(0, 10) === today).length;
  const visitCountWeek = Object.keys(visits).filter((id) => new Date(visits[id].at).toISOString().slice(0, 10) >= weekStart).length;
  const savedCount = (state.saved || []).length;

  (state.challenges.daily || []).forEach((c) => {
    if (c.lastReset !== today) {
      c.progress = 0;
      c.lastReset = today;
    }
    if (c.id === "d1") c.progress = Math.min(c.goal, visitCountToday);
    if (c.id === "d2") c.progress = Math.min(c.goal, savedCount >= 1 ? 1 : 0);
  });
  (state.challenges.weekly || []).forEach((c) => {
    if (c.lastReset !== weekStart) {
      c.progress = 0;
      c.lastReset = weekStart;
    }
    if (c.id === "w1") c.progress = Math.min(c.goal, visitCountWeek);
  });
  save();
}

export function getChallengeProgress() {
  resetAndUpdateChallenges();
  const state = getState();
  const daily = (state.challenges && state.challenges.daily) || [];
  const weekly = (state.challenges && state.challenges.weekly) || [];
  return { daily, weekly };
}

export function claimChallengeReward(challenge) {
  if (challenge.progress < challenge.goal) return false;
  const reward = challenge.reward || {};
  if (reward.xp) grantXP(reward.xp);
  if (reward.coins) addCoins(reward.coins);
  challenge.claimed = true;
  save();
  return true;
}

// --- Badges ---
export const BADGE_DEFS = [
  { id: "first_visit", name: "First Visit", desc: "Check in at your first place", icon: "🎯", req: { visits: 1 }, rarity: "bronze" },
  { id: "three_visits", name: "Explorer", desc: "Visit 3 places", icon: "👣", req: { visits: 3 }, rarity: "bronze" },
  { id: "five_visits", name: "Adventurer", desc: "Visit 5 places", icon: "🏔️", req: { visits: 5 }, rarity: "silver" },
  { id: "ten_visits", name: "Veteran", desc: "Visit 10 places", icon: "⭐", req: { visits: 10 }, rarity: "gold" },
  { id: "food_explorer", name: "Food Explorer", desc: "Visit 3 food spots", icon: "🍴", req: { foodVisits: 3 }, rarity: "silver" },
  { id: "retail_rover", name: "Retail Rover", desc: "Visit 3 retail spots", icon: "🛍️", req: { retailVisits: 3 }, rarity: "silver" },
  { id: "service_seeker", name: "Service Seeker", desc: "Visit 3 services", icon: "✂️", req: { serviceVisits: 3 }, rarity: "silver" },
  { id: "reviewer", name: "Reviewer", desc: "Write 2 Explora reviews", icon: "✍️", req: { reviews: 2 }, rarity: "silver" },
  { id: "collector", name: "Collector", desc: "Save 5 places", icon: "📌", req: { saved: 5 }, rarity: "gold" },
  { id: "radar_discovery", name: "Radar Discovery", desc: "Get a proximity alert", icon: "📡", req: { radar: true }, rarity: "bronze" },
];

export function getBadgeProgress() {
  const state = getState();
  const visits = state.visits || {};
  const total = Object.keys(visits).length;
  let foodVisits = 0, retailVisits = 0, serviceVisits = 0;
  Object.keys(visits).forEach((id) => {
    const c = (visits[id].category || "").toLowerCase();
    if (c === "food") foodVisits++;
    else if (c === "store" || c === "retail") retailVisits++;
    else if (c === "services") serviceVisits++;
  });
  const savedCount = (state.saved || []).length;
  let reviewCount = 0;
  Object.keys(state.exploraReviews || {}).forEach((pid) => {
    reviewCount += (state.exploraReviews[pid] || []).length;
  });
  const radar = !!(state.badges && state.badges.radar_discovery && state.badges.radar_discovery.unlocked);

  return {
    visits: total,
    foodVisits,
    retailVisits,
    serviceVisits,
    saved: savedCount,
    reviews: reviewCount,
    radar,
  };
}

export function unlockBadge(badgeId) {
  const state = load();
  state.badges[badgeId] = state.badges[badgeId] || {};
  if (state.badges[badgeId].unlocked) return false;
  state.badges[badgeId].unlocked = true;
  state.badges[badgeId].unlockedAt = Date.now();
  save();
  addToFeed("badge", { badgeId });
  return true;
}

export function updateBadges() {
  const prog = getBadgeProgress();
  const state = load();
  BADGE_DEFS.forEach((b) => {
    let done = false;
    if (b.req.visits && prog.visits >= b.req.visits) done = true;
    if (b.req.foodVisits && prog.foodVisits >= b.req.foodVisits) done = true;
    if (b.req.retailVisits && prog.retailVisits >= b.req.retailVisits) done = true;
    if (b.req.serviceVisits && prog.serviceVisits >= b.req.serviceVisits) done = true;
    if (b.req.saved && prog.saved >= b.req.saved) done = true;
    if (b.req.reviews && prog.reviews >= b.req.reviews) done = true;
    if (b.req.radar && prog.radar) done = true;
    if (done) unlockBadge(b.id);
  });
}

export function getLevelProgress() {
  const state = getState();
  const xp = state.xp || 0;
  const level = state.level || 1;
  const currentLevelStart = (level - 1) * LEVEL_XP;
  const nextLevelXP = level * LEVEL_XP;
  const xpInLevel = xp - currentLevelStart;
  const xpNeeded = nextLevelXP - currentLevelStart;
  return { level, xp, xpInLevel, xpNeeded, nextLevelXP };
}

export { LEVEL_XP, VISIT_XP, VISIT_COINS, FIRST_VISIT_BONUS_XP };
