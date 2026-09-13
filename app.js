(() => {
  const url = window.SUPABASE_URL;
  const key = window.SUPABASE_PUBLISHABLE_KEY;
  const configured = url && key && !url.includes("PASTE_") && !key.includes("PASTE_");
  const supabase = configured ? window.supabase.createClient(url, key) : null;

  const $ = (id) => document.getElementById(id);
  const esc = (v="") => String(v).replace(/[&<>"']/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#039;" }[c]));

  $("year")?.append(String(new Date().getFullYear()));

  const toggleMenu = () => {
    $("mainNav")?.classList.toggle("open");
  };
  $("menuToggle")?.addEventListener("click", toggleMenu);
  $("mainNav")?.querySelectorAll("a").forEach(a => a.addEventListener("click", () => $("mainNav").classList.remove("open")));

  const revealObserver = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add("visible"); revealObserver.unobserve(e.target); }
    });
  }, { threshold: .12 });
  document.querySelectorAll(".reveal").forEach(x => revealObserver.observe(x));

  const fmt = (date) => new Intl.DateTimeFormat("id-ID", { day:"2-digit", month:"short", year:"numeric" }).format(new Date(date));
  $("todayDate") && ($("todayDate").textContent = new Intl.DateTimeFormat("id-ID", {weekday:"long", day:"2-digit", month:"long", year:"numeric"}).format(new Date()));

  const prayerFallback = [["Subuh","04:47"],["Dzuhur","12:08"],["Ashar","15:27"],["Maghrib","18:12"],["Isya","19:22"]];

  function parsePrayerMinutes(timeString = "00:00") {
    const [hours, minutes] = String(timeString).slice(0,5).split(":").map(Number);
    return hours * 60 + minutes;
  }

  function renderPrayerCards(schedule) {
    if (!$("prayerGrid")) return;
    const now = new Date().getHours()*60 + new Date().getMinutes();
    let nextIndex = schedule.findIndex(x => parsePrayerMinutes(x.time) > now);
    if (nextIndex < 0) nextIndex = 0;

    $("prayerGrid").innerHTML = schedule.map((x, i) => `
      <article class="prayer-card ${i === nextIndex ? "is-next" : ""}">
        <small>${esc(x.name)}</small>
        <strong>${esc(String(x.time).slice(0,5))}</strong>
        ${i === nextIndex ? '<div class="badge">Waktu berikutnya</div>' : ""}
      </article>
    `).join("");

    const next = schedule[nextIndex];
    $("nextPrayerText").textContent = next ? `Shalat ${next.name} pukul ${String(next.time).slice(0,5)} WIB` : "Jadwal shalat hari ini belum tersedia.";
  }

  async function fetchPrayerScheduleFromApi() {
    const date = new Date().toISOString().slice(0,10);
    const url = `https://api.aladhan.com/v1/timingsByAddress/${date}?address=Surakarta,Indonesia&method=2`;

    try {
      const response = await fetch(url, { headers: { Accept: "application/json" } });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      const timings = data?.data?.timings || {};
      const mapping = [
        { name: "Subuh", key: "Fajr" },
        { name: "Dzuhur", key: "Dhuhr" },
        { name: "Ashar", key: "Asr" },
        { name: "Maghrib", key: "Maghrib" },
        { name: "Isya", key: "Isha" }
      ];

      return mapping
        .map((item, index) => ({
          name: item.name,
          time: String(timings[item.key] || "00:00").slice(0,5),
          display_order: index + 1
        }))
        .filter(x => x.time !== "00:00");
    } catch (error) {
      console.warn("Gagal mengambil jadwal sholat otomatis:", error);
      return null;
    }
  }

  function showDemo() {
    if ($("prayerGrid")) {
      renderPrayerCards(prayerFallback.map(([name, time]) => ({ name, time, display_order: 0 })));
      $("nextPrayerText").textContent = "Jadwal default — otomatisasi tidak tersedia.";
    }
    if ($("eventsGrid")) {
      const data = [["Kajian Tafsir Al-Qur'an","30 Agu 2026","19:30","Kajian"],["Tahsin Al-Qur'an","01 Sep 2026","16:30","Pendidikan"],["Santunan Yatim","05 Sep 2026","09:00","Sosial"]];
      $("eventsGrid").innerHTML = data.map(e=>`<article class="event-card"><div class="event-meta"><span class="event-date">${e[1]}</span><span>${e[2]}</span></div><h3>${e[0]}</h3><p>Agenda contoh. Ubah data melalui Supabase.</p><span class="event-tag">${e[3]}</span></article>`).join("");
    }
    if ($("donationCards")) $("donationCards").innerHTML = `<div class="donation-card"><small>BSI</small><strong>7123456789</strong><span>a.n. Masjid Kampus UMS</span></div><div class="donation-card"><small>QRIS</small><strong>QRIS Resmi Masjid</strong><span>Ganti dengan QRIS yang sebenarnya.</span></div>`;
  }

  async function loadHome() {
    if ($("prayerGrid")) {
      const apiSchedule = await fetchPrayerScheduleFromApi();
      if (apiSchedule?.length) {
        renderPrayerCards(apiSchedule);
      } else if (configured && supabase) {
        const today = new Date().toISOString().slice(0,10);
        const { data, error } = await supabase.from("prayer_schedule").select("*").eq("prayer_date", today).order("display_order");
        if (error || !data?.length) {
          renderPrayerCards(prayerFallback.map(([name, time]) => ({ name, time, display_order: 0 })));
          $("nextPrayerText").textContent = "Jadwal default — belum ada data otomatis atau manual hari ini.";
        } else {
          renderPrayerCards(data.map(x => ({ name: x.name, time: x.time, display_order: x.display_order })));
        }
      } else {
        renderPrayerCards(prayerFallback.map(([name, time]) => ({ name, time, display_order: 0 })));
        $("nextPrayerText").textContent = "Jadwal default — otomatisasi tidak tersedia.";
      }
    }

    if (!configured) { showDemo(); return; }

    if ($("eventsGrid")) {
      const { data, error } = await supabase.from("events").select("*").gte("event_date", new Date().toISOString().slice(0,10)).order("event_date").limit(3);
      if (error || !data?.length) $("eventsGrid").innerHTML = `<div class="loading-card">Belum ada agenda mendatang.</div>`;
      else $("eventsGrid").innerHTML = data.map(x=>`<article class="event-card"><div class="event-meta"><span class="event-date">${fmt(x.event_date)}</span><span>${esc(x.start_time||"")}</span></div><h3>${esc(x.title)}</h3><p>${esc(x.description||"")}</p><span class="event-tag">${esc(x.category||"Kegiatan")}</span></article>`).join("");
    }
    if ($("donationCards")) {
      const { data } = await supabase.from("donation_accounts").select("*").eq("is_active",true).order("display_order");
      $("donationCards").innerHTML = data?.length ? data.map(x=>`<div class="donation-card"><small>${esc(x.bank_name)}</small><strong>${esc(x.account_number)}</strong><span>a.n. ${esc(x.account_name)}</span><br><button class="copy-account" data-account="${esc(x.account_number)}">Salin nomor rekening</button></div>`).join("") : `<div class="loading-card">Belum ada rekening donasi.</div>`;
      document.querySelectorAll(".copy-account").forEach(btn=>btn.addEventListener("click", async()=>{await navigator.clipboard.writeText(btn.dataset.account); toast("Nomor rekening disalin");}));
    }
  }

  $("contactForm")?.addEventListener("submit", async e => {
    e.preventDefault();
    const btn = $("contactSubmit"), status=$("formStatus");
    btn.disabled=true; btn.textContent="Mengirim...";
    const payload=Object.fromEntries(new FormData(e.currentTarget).entries());
    if (!configured) {
      status.textContent="Mode demo: hubungkan Supabase agar pesan tersimpan.";
    } else {
      const { error } = await supabase.from("contact_messages").insert(payload);
      status.textContent = error ? "Pesan gagal dikirim. Coba lagi." : "Pesan berhasil dikirim. Terima kasih.";
      if (!error) e.currentTarget.reset();
    }
    btn.disabled=false; btn.textContent="Kirim Pesan";
  });

  function toast(message) {
    const el=$("toast"); if(!el) return; el.textContent=message; el.classList.add("show"); setTimeout(()=>el.classList.remove("show"),2200);
  }
  window.masjidToast=toast;

  loadHome();
})();
