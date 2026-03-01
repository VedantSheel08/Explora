/**
 * Hash-based router. No full page reload.
 * Routes: home | rewards | badges | challenges
 */

export function getRoute() {
  const hash = (window.location.hash || "#/home").slice(1);
  const path = hash.split("?")[0].replace(/^\/+/, "");
  return path || "home";
}

export function navigate(route) {
  const path = route.replace(/^\/+/, "");
  window.location.hash = "#/" + (path || "home");
}

export function initRouter(onRoute) {
  function handle() {
    const route = getRoute();
    document.querySelectorAll(".page").forEach((el) => {
      el.classList.toggle("hidden", el.getAttribute("data-page") !== route);
    });
    document.querySelectorAll(".nav-tab").forEach((el) => {
      el.classList.toggle("active", el.getAttribute("data-route") === route);
    });
    document.querySelectorAll(".bottom-link").forEach((el) => {
      const href = (el.getAttribute("href") || "").replace("#/", "");
      el.classList.toggle("active", href === route);
    });
    if (typeof onRoute === "function") onRoute(route);
  }
  window.addEventListener("hashchange", handle);
  handle();
}
