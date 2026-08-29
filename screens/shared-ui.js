// Levain — small DOM helpers + icons shared across screen modules. Kept out
// of app.js per the "app.js is orchestration only" convention (see AGENTS.md).

export function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (key === "class") node.className = value;
    else if (key === "text") node.textContent = value;
    else if (key === "html") node.innerHTML = value;
    else if (key.startsWith("on") && typeof value === "function") node.addEventListener(key.slice(2).toLowerCase(), value);
    else if (value !== undefined && value !== null) node.setAttribute(key, value);
  }
  for (const child of [].concat(children)) {
    if (child == null) continue;
    node.appendChild(typeof child === "string" ? document.createTextNode(child) : child);
  }
  return node;
}

export function clear(node) {
  node.innerHTML = "";
}

// Matches @media (min-width: 744px) in style.css — the tablet three-pane
// layout kicks in there (iPad mini portrait's CSS width).
export const TABLET_MIN_WIDTH = 744;
export function isTabletViewport() {
  return window.matchMedia(`(min-width: ${TABLET_MIN_WIDTH}px)`).matches;
}

export const ICONS = {
  now: '<svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="8.5"></circle><path d="M12 7.4V12l3.1 2.1"></path></svg>',
  bakes: '<svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M3.4 16.6a8.6 8.6 0 0 1 17.2 0z"></path><path d="M9.4 13.6l3-3.4"></path><path d="M13 14.4l2.4-2.7"></path></svg>',
  recipes: '<svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5 4.6h11.4a2.6 2.6 0 0 1 2.6 2.6v12.2H7.6A2.6 2.6 0 0 1 5 16.8z"></path><path d="M5 4.6v14.8"></path><path d="M9.4 9h6"></path><path d="M9.4 12.6h4"></path></svg>',
  starter: '<svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3.6h8"></path><path d="M7.4 7.2h9.2v11.6a2.2 2.2 0 0 1-2.2 2.2H9.6a2.2 2.2 0 0 1-2.2-2.2z"></path><path d="M7.4 13.6c1.5 0 1.5 1.5 3 1.5s1.6-1.5 3.1-1.5 1.6 1.5 3.1 1.5"></path></svg>',
  log: '<svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="4.2" y="4.2" width="15.6" height="15.6" rx="3"></rect><path d="M8.2 11.6l2.4 2.4 4.8-4.8"></path></svg>',
  plus: '<svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5.5v13"></path><path d="M5.5 12h13"></path></svg>',
  check: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.6l4.4 4.4L19 7.4"></path></svg>',
  chevDown: '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9.5l6 6 6-6"></path></svg>',
  chevLeft: '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 5.5l-7 6.5 7 6.5"></path></svg>',
  chevRight: '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M9.5 5.5l7 6.5-7 6.5"></path></svg>',
  share: '<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M20.5 3.5L3.8 10.2l6.3 2.4 2.4 6.3z"></path><path d="M20.5 3.5l-10.4 9.1"></path></svg>',
  edit: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M16.5 4.5l3 3-10 10H6.5v-3z"></path><path d="M14.5 6.5l3 3"></path></svg>',
  startBake: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M3.4 18.4a8.6 8.6 0 0 1 17.2 0z"></path><path d="M9.4 15.4l3-3.4"></path><path d="M13 16.2l2.4-2.7"></path><path d="M8 6.4c0-1.2 1-1.6 1-2.8"></path><path d="M12 6c0-1.4 1-1.8 1-3.2"></path><path d="M16 6.4c0-1.2 1-1.6 1-2.8"></path></svg>',
  trash: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M4.5 7h15"></path><path d="M9.5 7V4.8h5V7"></path><path d="M6.5 7l.9 12.2h9.2L17.5 7"></path><path d="M10.5 10.5v6"></path><path d="M13.5 10.5v6"></path></svg>',
  close: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M6.5 6.5l11 11M17.5 6.5l-11 11"></path></svg>',
  alexa: '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3.1"></circle><path d="M6.9 8.6a6.6 6.6 0 0 0 0 6.8"></path><path d="M17.1 8.6a6.6 6.6 0 0 1 0 6.8"></path><path d="M4.2 5.6a10.6 10.6 0 0 0 0 12.8"></path><path d="M19.8 5.6a10.6 10.6 0 0 1 0 12.8"></path></svg>',
};

export function iconEl(name, extraStyle = "") {
  return el("div", { style: `display:flex;align-items:center;justify-content:center;${extraStyle}`, html: ICONS[name] || "" });
}

export const TAB_DEFS = [
  { id: "now", label: "Now" },
  { id: "bakes", label: "Bakes" },
  { id: "recipes", label: "Recipes" },
  { id: "starter", label: "Starter" },
  { id: "log", label: "Log" },
];
