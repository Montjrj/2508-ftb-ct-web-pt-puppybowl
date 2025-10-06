/**
 * @typedef Puppy
 * @property {number} id
 * @property {string} name
 * @property {string} breed
 * @property {string} status
 * @property {string} imageUrl
 * @property {{id:number,name:string}|null} team
 */

// === Constants ===
const BASE = "https://fsa-puppy-bowl.herokuapp.com/api";
const COHORT = "/2508-montjoy";
const RESOURCE = "/players";
const API = BASE + COHORT;

// === State ===
let players = [];
let selectedPlayer = null;
let loadingList = false;
let loadingDetails = false;
let error = null;

// === Root
const $app = document.querySelector("#app");

// tiny helper
function el(tag, props = {}, ...children) {
  const node = document.createElement(tag);
  Object.entries(props).forEach(([k, v]) => {
    if (k === "className") node.className = v;
    else if (k.startsWith("on") && typeof v === "function") {
      node.addEventListener(k.slice(2).toLowerCase(), v);
    } else if (k in node) node[k] = v;
    else node.setAttribute(k, v);
  });
  for (const child of children) {
    if (child == null) continue;
    node.append(child.nodeType ? child : document.createTextNode(child));
  }
  return node;
}

// === API ===
async function getPlayers() {
  loadingList = true;
  error = null;
  render();
  try {
    const res = await fetch(`${API}${RESOURCE}`);
    const json = await res.json();
    players = json?.data?.players ?? [];
  } catch (e) {
    console.error(e);
    error = "Failed to fetch players.";
    players = [];
  } finally {
    loadingList = false;
    render();
  }
}

async function getPlayerById(id) {
  loadingDetails = true;
  renderDetails();
  try {
    const res = await fetch(`${API}${RESOURCE}/${id}`);
    const json = await res.json();
    return json?.data?.player ?? null;
  } catch (e) {
    console.error(e);
    error = "Failed to fetch selected player.";
    return null;
  } finally {
    loadingDetails = false;
    renderDetails();
  }
}

async function createPlayer({ name, breed }) {
  try {
    const res = await fetch(`${API}${RESOURCE}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, breed }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error?.message || "Create failed");
    selectedPlayer = json.data?.newPlayer ?? null;
    await getPlayers();
  } catch (e) {
    console.error(e);
    alert(e.message || "Could not add puppy.");
  }
}

async function removePlayer(id) {
  try {
    const res = await fetch(`${API}${RESOURCE}/${id}`, { method: "DELETE" });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error?.message || "Delete failed");
    selectedPlayer = null;
    await getPlayers();
  } catch (e) {
    console.error(e);
    alert(e.message || "Could not remove puppy.");
  }
}

// === Layout matching your CSS ===
function renderLayout() {
  if ($app.dataset.built) return;

  const header = el("h1", {}, "Puppy Bowl Admin");

  const rosterSection = el(
    "section",
    {},
    el("h2", {}, "Roster"),
    // ul.lineup per your CSS
    el("ul", { id: "roster", className: "lineup" }, "Loading…")
  );

  const detailsSection = el(
    "section",
    {},
    el("h2", {}, "Selected Puppy"),
    // .artist per your CSS
    el("div", { id: "details", className: "artist" }, "Select a puppy to see details."),
    el("h3", {}, "Add Puppy"),
    el(
      "form",
      {
        id: "add-form",
        onsubmit: async (e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          const name = (fd.get("name") || "").toString().trim();
          const breed = (fd.get("breed") || "").toString().trim();
          if (!name || !breed) {
            alert("Please provide both name and breed.");
            return;
          }
          await createPlayer({ name, breed });
          e.currentTarget.reset();
        },
      },
      el("label", {}, "Name", el("input", { name: "name", required: true, placeholder: "e.g., Waffles" })),
      el("label", {}, "Breed", el("input", { name: "breed", required: true, placeholder: "e.g., Corgi" })),
      el("button", { type: "submit" }, "Add to Roster")
    )
  );

  const main = el("main", {}, rosterSection, detailsSection);

  $app.append(header, main);
  $app.dataset.built = "true";
}

// === Renders wired to your selectors/classes ===
function renderRoster() {
  const $roster = document.querySelector("#roster");
  if (!$roster) return;

  if (loadingList) {
    $roster.textContent = "Loading…";
    return;
  }
  if (error) {
    $roster.textContent = error;
    return;
  }
  if (!players.length) {
    $roster.textContent = "No puppies found.";
    return;
  }

  $roster.innerHTML = "";

  for (const p of players) {
    // each item is <li><a>…</a></li> to match .lineup a styles
    const item = el(
      "li",
      {},
      el(
        "a",
        {
          href: "#",
          onclick: async (e) => {
            e.preventDefault();
            selectedPlayer = await getPlayerById(p.id);
            renderDetails();
          },
        },
        // Show name prominently; image is optional in the list (CSS supports it either way)
        el("div", {}, p.name)
      )
    );
    $roster.appendChild(item);
  }
}

function renderDetails() {
  const $details = document.querySelector("#details");
  if (!$details) return;

  if (loadingDetails) {
    $details.textContent = "Loading details…";
    return;
  }

  if (!selectedPlayer) {
    $details.textContent = "Select a puppy to see details.";
    return;
  }

  const { id, name, breed, status, imageUrl, team } = selectedPlayer;
  const teamName = team?.name || "Unassigned";

  $details.innerHTML = "";
  // .artist container just needs content; global img styles apply
  $details.append(
    el("h3", {}, name),
    el("img", { src: imageUrl, alt: name }),
    el("div", {}, el("strong", {}, "ID: "), " ", String(id)),
    el("div", {}, el("strong", {}, "Breed: "), " ", breed || "—"),
    el("div", {}, el("strong", {}, "Status: "), " ", status || "—"),
    el("div", {}, el("strong", {}, "Team: "), " ", teamName),
    el(
      "button",
      {
        onclick: async () => {
          if (!confirm(`Remove ${name} from the roster?`)) return;
          await removePlayer(id);
        },
      },
      "Remove from roster"
    )
  );
}

function render() {
  renderLayout();
  renderRoster();
  renderDetails();
}

// init
getPlayers();
render();
