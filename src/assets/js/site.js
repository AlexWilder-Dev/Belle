// Belle Pubs & Restaurants: small, dependency-free enhancements. Every page works without it.
(() => {
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const data = JSON.parse($("#belle-data")?.textContent || "{}");
  const venues = data.venues || [];
  const fixtures = data.fixtures || [];

  // ---------- London time helpers ----------
  const londonNow = () => {
    const parts = Object.fromEntries(new Intl.DateTimeFormat("en-GB", {
      timeZone: "Europe/London", year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", weekday: "short", hour12: false,
    }).formatToParts(new Date()).map((p) => [p.type, p.value]));
    const dayIdx = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].indexOf(parts.weekday);
    return { date: `${parts.year}-${parts.month}-${parts.day}`, mins: (+parts.hour % 24) * 60 + +parts.minute, day: dayIdx };
  };
  // "YYYY-MM-DDTHH:MM" in London time, shifted by some minutes; used to drop games that have finished.
  const londonStamp = (shiftMin = 0) => {
    const d = new Date(Date.now() + shiftMin * 60000);
    const p = Object.fromEntries(new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/London", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false }).formatToParts(d).map((x) => [x.type, x.value]));
    return `${p.year}-${p.month}-${p.day}T${String(+p.hour % 24).padStart(2, "0")}:${p.minute}`;
  };
  const finished = (when) => when < londonStamp(-150);
  const toMins = (t) => { const [h, m] = t.split(":").map(Number); return h * 60 + m; };
  const fmt = (t) => {
    const [h, m] = t.split(":").map(Number);
    if (h === 0 && m === 0) return "midnight";
    const hr = ((h + 11) % 12) + 1;
    return `${hr}${m ? "." + String(m).padStart(2, "0") : ""}${h < 12 ? "am" : "pm"}`;
  };
  const prettyDate = (iso) => {
    const d = new Date(`${iso}T12:00:00Z`);
    return `${["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][d.getUTCDay()]} ${d.getUTCDate()} ${["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][d.getUTCMonth()]}`;
  };

  // Open now / opens at, from each venue's published hours.
  function openState(hours) {
    const now = londonNow();
    const yesterday = hours[(now.day + 6) % 7];
    const today = hours[now.day];
    const yClose = toMins(yesterday[1]);
    if (yClose < 6 * 60 && now.mins < yClose) return { open: true, text: `Open now · till ${fmt(yesterday[1])}` };
    const open = toMins(today[0]);
    let close = toMins(today[1]); if (close < 6 * 60) close += 1440;
    if (now.mins >= open && now.mins < close) return { open: true, text: `Open now · till ${fmt(today[1])}` };
    if (now.mins < open) return { open: false, text: `Opens ${fmt(today[0])} today` };
    return { open: false, text: `Opens ${fmt(hours[(now.day + 1) % 7][0])} tomorrow` };
  }
  $$("[data-hours]").forEach((el) => {
    const out = $("[data-open-now]", el);
    if (!out) return;
    const s = openState(JSON.parse(el.dataset.hours));
    out.textContent = s.text;
    out.classList.toggle("is-open", s.open);
  });
  $$("table.hours").forEach((t) => {
    const row = t.rows[londonNow().day];
    if (row) row.classList.add("is-today");
  });

  // ---------- Header drawer ----------
  const toggle = $("[data-drawer-toggle]");
  const drawer = $("#drawer");
  toggle?.addEventListener("click", () => {
    const open = toggle.getAttribute("aria-expanded") !== "true";
    toggle.setAttribute("aria-expanded", String(open));
    drawer.hidden = !open;
    document.body.style.overflow = open ? "hidden" : "";
  });
  document.addEventListener("click", (e) => {
    $$(".venue-menu[open]").forEach((d) => { if (!d.contains(e.target)) d.open = false; });
  });

  // ---------- Tabs (dialog, menus, christmas) ----------
  function initTabs(root) {
    const tabs = $$('[role="tab"]', root);
    const select = (tab, focus) => {
      tabs.forEach((t) => {
        const on = t === tab;
        t.setAttribute("aria-selected", String(on));
        t.tabIndex = on ? 0 : -1;
        const pane = document.getElementById(t.getAttribute("aria-controls"));
        if (pane) pane.hidden = !on;
      });
      if (focus) tab.focus();
    };
    tabs.forEach((t, i) => {
      t.addEventListener("click", () => select(t));
      t.addEventListener("keydown", (e) => {
        const d = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
        if (d) { e.preventDefault(); select(tabs[(i + d + tabs.length) % tabs.length], true); }
      });
    });
    return select;
  }
  $$(".tabs").forEach((t) => { if (!t.closest(".book")) initTabs(t.parentElement); });

  // ---------- Booking dialog ----------
  const dialog = $("#book");
  const selectTab = dialog ? initTabs(dialog) : null;
  const fixtureSelect = $("[data-fixture-select]");
  const tableForm = dialog ? $('form[data-mock="table"]', dialog) : null;
  const today = londonNow().date;

  function fillFixtures(venue) {
    if (!fixtureSelect) return;
    const keep = fixtureSelect.value;
    fixtureSelect.length = 1;
    fixtures.filter((f) => f.date >= today && (!venue || f.venues.includes(venue))).slice(0, 40).forEach((f) => {
      const o = new Option(`${prettyDate(f.date)}${f.time ? " · " + f.time : ""} · ${f.title}`, f.id);
      o.dataset.date = f.date; o.dataset.time = f.time || "";
      fixtureSelect.add(o);
    });
    if ([...fixtureSelect.options].some((o) => o.value === keep)) fixtureSelect.value = keep;
  }

  function openBook(opts = {}) {
    if (!dialog) return;
    $(".book__done", dialog).hidden = true;
    $$(".book__pane, .tabs", dialog).forEach((p) => p.classList.remove("is-hidden"));
    $(".tabs", dialog).hidden = false;
    const tab = $(`[data-tab="${opts.tab || "table"}"]`, dialog);
    selectTab(tab);
    if (tableForm) {
      tableForm.reset();
      const date = tableForm.elements.date;
      date.min = today;
      date.value = opts.date || today;
      if (opts.venue) tableForm.elements.venue.value = opts.venue;
      fillFixtures(tableForm.elements.venue.value);
      if (opts.fixture) {
        fixtureSelect.value = opts.fixture;
        const o = fixtureSelect.selectedOptions[0];
        if (o && o.dataset.time) {
          const [h, m] = o.dataset.time.split(":").map(Number);
          const early = Math.max(h * 60 + m - 45, 8 * 60);
          tableForm.elements.time.value = `${String(Math.floor(early / 60)).padStart(2, "0")}:${String(early % 60).padStart(2, "0")}`;
        }
      }
    }
    const party = $('form[data-mock="party"]', dialog);
    if (party && opts.venue) party.elements.venue.value = opts.venue;
    if (party && opts.occasion) party.elements.occasion.value = opts.occasion;
    dialog.showModal();
  }
  $$("[data-book]").forEach((b) => b.addEventListener("click", () => openBook({
    tab: b.dataset.bookTab, venue: b.dataset.venue, date: b.dataset.date, fixture: b.dataset.fix, occasion: b.dataset.occasion,
  })));
  $$("[data-book-close]").forEach((b) => b.addEventListener("click", () => dialog.close()));
  dialog?.addEventListener("click", (e) => { if (e.target === dialog) dialog.close(); });
  tableForm?.elements.venue.addEventListener("change", (e) => fillFixtures(e.target.value));
  fixtureSelect?.addEventListener("change", () => {
    const o = fixtureSelect.selectedOptions[0];
    if (o && o.dataset.date) tableForm.elements.date.value = o.dataset.date;
  });

  // ---------- Mock forms: validate, confirm, send nothing ----------
  const ref = (p) => `${p}-${Math.random().toString(36).slice(2, 6).toUpperCase()}${new Date().getDate()}`;
  const venueName = (slug) => venues.find((v) => v.slug === slug)?.name || "the Belle";
  const NOTE = '<p class="preview-note">This is a preview site, so nothing has actually been sent.</p>';

  function confirmation(form) {
    const f = Object.fromEntries(new FormData(form));
    const kind = form.dataset.mock;
    if (kind === "table") {
      const fx = fixtures.find((x) => x.id === f.fixture);
      return `<h3>Lovely. That's pencilled in.</h3>
        <p>A table for <b>${f.guests}</b> at the <b>${venueName(f.venue)}</b> on <b>${prettyDate(f.date)}</b> at <b>${fmt(f.time)}</b>${fx ? `, in time for <b>${fx.title}</b>` : ""}.</p>
        <p>We'll text ${f.phone || "you"} to confirm${f.kids ? ", and we'll have a highchair ready" : ""}. Big games fill up, so if plans change, give us a shout.</p>
        <p class="ref">Ref ${ref("BT")}</p>${NOTE}`;
    }
    if (kind === "party") {
      return `<h3>Thanks ${f.name ? f.name.split(" ")[0] : ""}, we're on it.</h3>
        <p>Your ${f.occasion ? f.occasion.toLowerCase() : "do"} for about <b>${f.guests}</b>${f.venue ? ` at the <b>${venueName(f.venue)}</b>` : ""}${f.date ? ` on <b>${prettyDate(f.date)}</b>` : ""} is with the team.</p>
        <p>Someone from the pub will email ${f.email || "you"} within a day with spaces, menus and a deposit link.</p>
        <p class="ref">Enquiry ${ref("BP")}</p>${NOTE}`;
    }
    if (kind === "job") {
      return `<h3>Application received.</h3><p>Thanks ${f.name ? f.name.split(" ")[0] : ""}. The manager at the ${venueName(f.venue)} will be in touch, or just pop in and say hello.</p>${NOTE}`;
    }
    if (kind === "contact") {
      return `<h3>Message received.</h3><p>We'll get back to ${f.email || "you"} soon.</p>${NOTE}`;
    }
    return `<h3>You're on the list.</h3><p>First mailer lands soon${f.local ? `, with news from the ${venueName(f.local)}` : ""}.</p>${NOTE}`;
  }

  $$("form[data-mock]").forEach((form) => {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      let ok = true;
      $$("input, select, textarea", form).forEach((el) => {
        const bad = !el.checkValidity();
        el.setAttribute("aria-invalid", String(bad));
        if (bad && ok) { el.focus(); ok = false; }
      });
      if (!ok) return;
      const html = confirmation(form);
      if (form.dataset.mock === "mailer") {
        const done = $(".mailer__done", form);
        $$("input, select, button", form).forEach((el) => (el.hidden = true));
        done.innerHTML = "You're on the list. First one lands soon. (Preview site: nothing sent.)";
        done.hidden = false;
        return;
      }
      const inDialog = form.closest(".book");
      if (inDialog) {
        const done = $(".book__done", inDialog);
        done.innerHTML = `<div class="done">${html}</div><p style="margin-top:14px"><button class="btn btn--ghost" type="button" data-book-close>Close</button></p>`;
        done.hidden = false;
        $$(".book__pane", inDialog).forEach((p) => (p.hidden = true));
        $(".tabs", inDialog).hidden = true;
        $("[data-book-close]", done).addEventListener("click", () => dialog.close());
        done.scrollIntoView({ block: "nearest" });
      } else {
        const box = document.createElement("div");
        box.className = "done";
        box.setAttribute("role", "status");
        box.innerHTML = html;
        form.replaceWith(box);
        box.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    });
  });

  // ---------- Fixtures board filters ----------
  const board = $("[data-board]");
  if (board) {
    const state = { sport: "all", venue: "all", big: false, all: false };
    const more = $("[data-board-more]");
    const cutoff = new Date(Date.parse(`${londonNow().date}T12:00:00Z`) + 13 * 864e5).toISOString().slice(0, 10);
    const hash = location.hash.slice(1);
    if (hash && $(`[data-filter-sport="${hash}"]`)) state.sport = hash;
    const apply = () => {
      let shown = 0;
      $$("[data-fixture]", board).forEach((card) => {
        const past = finished(card.dataset.when);
        const ok = !past && (state.sport === "all" || card.dataset.sport === state.sport)
          && (state.venue === "all" || card.dataset.venues.split(" ").includes(state.venue))
          && (!state.big || card.dataset.headline === "yes");
        card.hidden = !ok;
        if (ok) shown++;
      });
      let later = 0;
      $$("[data-day]", board).forEach((d) => {
        const any = $$("[data-fixture]:not([hidden])", d).length > 0;
        const isLater = d.dataset.day > cutoff;
        if (any && isLater) later++;
        d.hidden = !any || (isLater && !state.all);
      });
      if (more) more.hidden = state.all || !later;
      $("[data-board-empty]").hidden = shown > 0;
      $("[data-board-count]").textContent = `${shown} ${shown === 1 ? "fixture" : "fixtures"}`;
      $$("[data-filter-sport]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.filterSport === state.sport)));
      $$("[data-filter-venue]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.filterVenue === state.venue)));
      $("[data-filter-big]")?.setAttribute("aria-pressed", String(state.big));
    };
    $$("[data-filter-sport]").forEach((b) => b.addEventListener("click", () => {
      state.sport = b.dataset.filterSport;
      history.replaceState(null, "", state.sport === "all" ? location.pathname : `#${state.sport}`);
      apply();
    }));
    $$("[data-filter-venue]").forEach((b) => b.addEventListener("click", () => { state.venue = b.dataset.filterVenue; apply(); }));
    $("[data-filter-big]")?.addEventListener("click", () => { state.big = !state.big; apply(); });
    more?.addEventListener("click", () => { state.all = true; apply(); });
    apply();
  }
  // Hide past fixtures anywhere else they appear.
  $$("[data-upcoming] [data-fixture]").forEach((c) => { if (finished(c.dataset.when)) c.hidden = true; });
  // Keep the "next big one" screen current once the built-in fixture has been played.
  const screen = $(".bigscreen");
  if (screen) {
    const next = fixtures.find((f) => f.headline && !finished(`${f.date}T${f.time || "23:59"}`));
    if (next) {
      $(".bigscreen__comp", screen).textContent = next.competition;
      $(".bigscreen__title", screen).textContent = next.title;
      $(".bigscreen__when", screen).textContent = `${prettyDate(next.date)} · ${next.time || "time TBC"}${next.channel ? " · " + next.channel : ""}`;
      const b = $("[data-book]", screen); b.dataset.fix = next.id; b.dataset.date = next.date;
    }
  }

  // ---------- Christmas countdown ----------
  $$("[data-countdown]").forEach((el) => {
    const end = el.dataset.countdown;
    const days = Math.round((Date.parse(`${end}T12:00:00Z`) - Date.parse(`${today}T12:00:00Z`)) / 864e5);
    if (days < 0) { el.hidden = true; return; }
    $("[data-days]", el).textContent = days === 0 ? "Last" : days;
    $("[data-days-label]", el).textContent = days === 0 ? "day" : days === 1 ? "day left" : "days left";
  });

  // ---------- Menus: venue switch and veggie filter ----------
  const menuRoot = $("[data-menu-root]");
  if (menuRoot) {
    $$("[data-menu-venue-btn]").forEach((b) => b.addEventListener("click", () => {
      menuRoot.dataset.menuVenue = b.dataset.menuVenueBtn;
      $$("[data-menu-venue-btn]").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
      $$("[data-chicken-title]").forEach((h) => (h.textContent = b.dataset.menuVenueBtn === "moretown" ? h.dataset.moretown : h.dataset.shared));
    }));
    $("[data-diet-btn]")?.addEventListener("click", (e) => {
      const on = menuRoot.dataset.dietFilter !== "veg";
      menuRoot.dataset.dietFilter = on ? "veg" : "all";
      e.currentTarget.setAttribute("aria-pressed", String(on));
    });
  }

  // ---------- Burger builder ----------
  const builder = $("[data-builder]");
  if (builder) {
    const say = $("[data-builder-say]", builder);
    const LINES = {
      dressed: "Dressed: the full works, lid on.",
      topless: "Topless: no top bun, all the toppings showing off.",
      naked: "Naked: no bun at all. Just the burger, the fillings and a pile of salad.",
      beef: "a smashed beef patty", chicken: "a southern fried chicken breast", veg: "a crispy vegetable pattie (vegan bun too)",
    };
    const update = () => { say.textContent = `${LINES[builder.dataset.style]} Built on ${LINES[builder.dataset.fill]}.`; };
    $$("[data-set]", builder).forEach((b) => b.addEventListener("click", () => {
      const [k, v] = b.dataset.set.split(":");
      builder.dataset[k] = v;
      $$(`[data-set^="${k}:"]`, builder).forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
      update();
    }));
    update();
  }

  // ---------- Room slideshows ----------
  $$("[data-slides]").forEach((wrap) => {
    const track = $(".slides", wrap);
    const count = $("[data-slide-count]", wrap);
    const n = track.children.length;
    const idx = () => Math.round(track.scrollLeft / track.clientWidth);
    const show = () => { if (count) count.textContent = `${idx() + 1} / ${n}`; };
    $("[data-prev]", wrap)?.addEventListener("click", () => track.scrollBy({ left: -track.clientWidth, behavior: "smooth" }));
    $("[data-next]", wrap)?.addEventListener("click", () => track.scrollBy({ left: track.clientWidth, behavior: "smooth" }));
    track.addEventListener("scroll", () => requestAnimationFrame(show), { passive: true });
    show();
  });

  // ---------- Stay chooser ----------
  $$("[data-choose]").forEach((b) => b.addEventListener("click", () => {
    const pick = b.dataset.choose.split(" ");
    const on = b.getAttribute("aria-pressed") !== "true";
    $$("[data-choose]").forEach((x) => x.setAttribute("aria-pressed", "false"));
    b.setAttribute("aria-pressed", String(on));
    $$("[data-hotel]").forEach((h) => {
      h.classList.toggle("is-match", on && pick.includes(h.dataset.hotel));
      h.classList.toggle("is-dim", on && !pick.includes(h.dataset.hotel));
    });
    if (on) $(`[data-hotel="${pick[0]}"]`)?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
  }));

  // ---------- Job adverts preselect the application form ----------
  $$("[data-role]").forEach((a) => a.addEventListener("click", () => {
    const form = $('form[data-mock="job"]');
    if (!form) return;
    form.elements.venue.value = a.dataset.roleVenue;
    const opt = [...form.elements.role.options].find((o) => o.text.startsWith(a.dataset.role));
    if (opt) form.elements.role.value = opt.value;
  }));

  // ---------- Hammersmith garden plan ----------
  const plan = $("[data-plan]");
  if (plan) {
    const spots = $$("[data-spot]", plan);
    const show = (key) => {
      $$("[data-spot-pane]").forEach((p) => (p.hidden = p.dataset.spotPane !== key));
      spots.forEach((s) => s.classList.toggle("is-on", s.dataset.spot === key));
      $$("[data-spot-btn]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.spotBtn === key)));
    };
    spots.forEach((s) => {
      s.addEventListener("click", () => show(s.dataset.spot));
      s.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); show(s.dataset.spot); } });
    });
    $$("[data-spot-btn]").forEach((b) => b.addEventListener("click", () => show(b.dataset.spotBtn)));
  }
})();
