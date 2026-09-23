/* TallyReel landing: live switcher, sample wall, buy links */

// Set this to your checkout link (e.g. a Lemon Squeezy product URL) when payments are ready.
const BUY_URL = "";
/** Where the installers live. The newest release always answers these addresses. */
const DOWNLOADS = {
  mac: "https://tallyreel.com/download/mac",
  windows: "https://tallyreel.com/download/windows",
};

const SAMPLES = [
  { slug: "ocean-depth", key: "Facts", niche: "Mind-blowing facts", voice: "George, UK", dur: "0:37",
    title: "Depths Unveiled: The Ocean, Its Creatures, and Why Mars Gets the Spotlight" },
  { slug: "pompeii", key: "Dark history", niche: "Dark history", voice: "Onyx, US", dur: "0:31",
    title: "Pompeii's Last 24 Hours" },
  { slug: "immortal-animals", key: "Animals", niche: "Animal facts", voice: "Michael, US", dur: "0:35",
    title: "4 Immortal Creatures" },
  { slug: "phone-detox", key: "Self-improvement", niche: "Self-improvement", voice: "Heart, US", dur: "0:28",
    title: "Seven Days Without Your Phone: The Mind-Body Reset" },
  { slug: "discipline", key: "Motivation", niche: "Motivation", voice: "Adam, US", dur: "0:23",
    title: "Why Discipline Beats Motivation" },
  { slug: "home-staging", key: "Real estate", niche: "Real estate", voice: "Bella, US", dur: "0:27",
    title: "Sell Your Home Faster with These 5 Staging Hacks" },
];

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

/* buy links */
if (BUY_URL) $$("[data-buy]").forEach(a => { a.href = BUY_URL; a.rel = "noopener"; });
else $$("[data-checkout]").forEach(a => {   // no checkout yet: say so instead of a key that does nothing
  a.textContent = "Checkout opens soon"; a.classList.add("key-pending"); a.removeAttribute("href"); a.setAttribute("aria-disabled", "true");
});

/* ---------- program monitor + switcher ---------- */
const pgm = $("#pgm");
let current = 0;
let soundOn = false;

function tc(secs) {
  const f = Math.floor((secs % 1) * 30), s = Math.floor(secs);
  return [Math.floor(s / 3600), Math.floor(s / 60) % 60, s % 60, f].map(n => String(n).padStart(2, "0")).join(":");
}
function frame() { $("#pgmTc").textContent = tc(pgm.currentTime || 0); requestAnimationFrame(frame); }

function take(i, { fromUser } = {}) {
  const s = SAMPLES[i];
  current = i;
  $$(".bk", $("#switcher")).forEach((k, n) => { k.setAttribute("aria-checked", n === i); k.tabIndex = n === i ? 0 : -1; });
  pgm.poster = `media/${s.slug}.jpg`;
  pgm.src = `media/${s.slug}.mp4`;
  pgm.muted = !soundOn;
  pgm.classList.remove("cut"); void pgm.offsetWidth; pgm.classList.add("cut");
  pgm.play().catch(() => {});
  $("#capTitle").textContent = s.title;
  $("#capNiche").textContent = s.niche;
  $("#capVoice").textContent = s.voice;
  $("#capDur").textContent = s.dur;
  $$(".mv", $("#wall")).forEach((m, n) => m.classList.toggle("on-program", n === i));
  if (fromUser) stopAuto();
}

$("#switcher").innerHTML = SAMPLES.map((s, i) =>
  `<span class="bk" role="radio" tabindex="${i ? -1 : 0}" aria-checked="${i === 0}" data-i="${i}">${esc(s.key)}</span>`).join("");
$("#switcher").addEventListener("click", e => { const k = e.target.closest(".bk"); if (k) take(+k.dataset.i, { fromUser: true }); });
$("#switcher").addEventListener("keydown", e => {
  const d = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
  if (e.key === " " || e.key === "Enter") { e.preventDefault(); take(current, { fromUser: true }); return; }
  if (!d) return;
  e.preventDefault();
  const n = (current + d + SAMPLES.length) % SAMPLES.length;
  take(n, { fromUser: true }); $$(".bk", $("#switcher"))[n].focus();
});

$("#sound").addEventListener("click", () => {
  soundOn = !soundOn;
  pgm.muted = !soundOn;
  if (soundOn) pgm.play().catch(() => {});
  const b = $("#sound");
  b.setAttribute("aria-pressed", soundOn);
  $("use", b).setAttribute("href", soundOn ? "#i-sound" : "#i-mute");
  $("span", b).textContent = soundOn ? "Sound on" : "Sound off";
  stopAuto();
});

// Until someone touches the switcher, cut to the next niche each time a video ends.
let auto = true;
function stopAuto() { auto = false; pgm.loop = true; }
pgm.loop = false;
pgm.addEventListener("ended", () => { if (auto) take((current + 1) % SAMPLES.length); else pgm.play(); });

// Only play while the monitor is on screen.
new IntersectionObserver(([e]) => { if (e.isIntersecting) pgm.play().catch(() => {}); else pgm.pause(); }, { threshold: .25 }).observe(pgm);
requestAnimationFrame(frame);

/* ---------- sample wall ---------- */
const wall = $("#wall");
wall.innerHTML = SAMPLES.map((s, i) => `
  <button class="mv" type="button" aria-pressed="false" data-i="${i}" aria-label="Play ${esc(s.title)}">
    <span class="mv-frame">
      <img src="media/${s.slug}.jpg" alt="" loading="lazy" width="540" height="960">
      <span class="mv-niche">${esc(s.niche)}</span>
    </span>
    <span class="mv-cap"><span><span class="mv-dot"></span><span class="mv-onair">On program</span></span><span>${s.dur}</span></span>
    <span class="mv-title">${esc(s.title)}</span>
  </button>`).join("");

$$(".mv", wall).forEach((m, n) => m.classList.toggle("on-program", n === current));

let playing = null;
wall.addEventListener("click", e => {
  const mv = e.target.closest(".mv"); if (!mv) return;
  const frameEl = $(".mv-frame", mv);
  if (playing && playing !== mv) stopTile(playing);
  let v = $("video", frameEl);
  if (v && !v.paused) { stopTile(mv); return; }
  if (!v) {
    v = document.createElement("video");
    v.src = `media/${SAMPLES[+mv.dataset.i].slug}.mp4`;
    v.playsInline = true; v.controls = false;
    v.addEventListener("ended", () => stopTile(mv));
    frameEl.appendChild(v);
  }
  pgm.pause();
  v.muted = false; v.currentTime = 0; v.play().catch(() => {});
  mv.setAttribute("aria-pressed", "true"); playing = mv;
});
function stopTile(mv) {
  const v = $("video", mv); if (v) { v.pause(); v.remove(); }
  mv.setAttribute("aria-pressed", "false"); if (playing === mv) playing = null;
}

/** Offer the installer for the visitor's own system. */
const dl = document.querySelector("#downloadTrial");
if (dl) {
  const windows = /Windows/i.test(navigator.userAgent);
  dl.href = windows ? DOWNLOADS.windows : DOWNLOADS.mac;
  dl.textContent = `Download for ${windows ? "Windows" : "Mac"} · try 3 videos free`;
}
