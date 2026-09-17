(() => {
  const url = window.SUPABASE_URL;
  const key = window.SUPABASE_PUBLISHABLE_KEY;
  const configured = url && key && !url.includes("PASTE_") && !key.includes("PASTE_");

  const $ = id => document.getElementById(id);
  const sb = configured ? window.supabase.createClient(url, key) : null;

  $("passwordToggle").addEventListener("click", () => {
    const passwordInput = $("loginPassword");
    const isVisible = passwordInput.type === "text";
    passwordInput.type = isVisible ? "password" : "text";
    $("passwordToggle").textContent = isVisible ? "Tampilkan" : "Sembunyikan";
    $("passwordToggle").setAttribute("aria-label", isVisible ? "Tampilkan password" : "Sembunyikan password");
    $("passwordToggle").setAttribute("aria-pressed", String(!isVisible));
  });

  let currentUser = null;
  let allRequests = [];
  let allMessages = [];
  let allEvents = [];
  let allDonations = [];
  let dashboardUserId = null;
  let dashboardInitPromise = null;
  let navigationBound = false;

  if (!configured) {
    $("loginStatus").textContent = "Isi config.js terlebih dahulu dengan URL dan Publishable Key Supabase.";
    $("loginBtn").disabled = true;
    return;
  }

  const toast = message => {
    const el = $("toast"); el.textContent = message; el.classList.add("show");
    setTimeout(() => el.classList.remove("show"), 2300);
  };

  const esc = (v="") => String(v).replace(/[&<>"']/g, c => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
  }[c]));

  const serviceLabel = {
    "peminjaman-masjid":"Peminjaman Masjid",
    "peminjaman-alat":"Peminjaman Alat",
    "media-partner":"Media Partner",
    "barang-temuan":"Barang Hilang & Temuan",
    "kritik-saran":"Kritik & Saran"
  };

  const actionLabel = {
    apply:"Ajukan",
    confirm:"Konfirmasi",
    found:"Pengambilan",
    feedback:"Masukan"
  };

  const statusLabel = {
    baru:"Baru", diproses:"Diproses", disetujui:"Disetujui", ditolak:"Ditolak", selesai:"Selesai"
  };

  // Auth: Supabase email/password auth.
  $("loginForm").addEventListener("submit", async e => {
    e.preventDefault();
    $("loginBtn").disabled = true; $("loginBtn").textContent = "Memeriksa...";
    $("loginStatus").textContent = "";
    const { data, error } = await sb.auth.signInWithPassword({
      email: $("loginEmail").value.trim(),
      password: $("loginPassword").value
    });
    if (error) {
      $("loginStatus").textContent = "Login gagal. Periksa email dan password.";
      $("loginBtn").disabled = false; $("loginBtn").textContent = "Masuk";
      return;
    }
    await initDashboard(data.user);
  });

  $("logoutBtn").addEventListener("click", async () => {
    await sb.auth.signOut();
    location.reload();
  });

  sb.auth.getSession().then(({ data: { session } }) => {
    if (session?.user) initDashboard(session.user);
  });

  sb.auth.onAuthStateChange((event, session) => {
    if (event === "SIGNED_OUT") {
      dashboardUserId = null;
      showLogin();
      return;
    }
    if (session?.user) initDashboard(session.user);
  });

  async function initDashboard(user) {
    if (dashboardUserId === user.id && !$('dashboardView').hidden) return;
    if (dashboardInitPromise) return dashboardInitPromise;

    dashboardInitPromise = (async () => {
      currentUser = user;
      // Akses admin benar-benar dicek ke database dengan RPC.
      const { data: isAdmin, error } = await sb.rpc("is_admin");
      if (error || isAdmin !== true) {
        dashboardUserId = null;
        await sb.auth.signOut();
        showLogin("Akun ini belum diberi akses administrator.");
        return;
      }

      dashboardUserId = user.id;
      $("loginView").hidden = true;
      $("dashboardView").hidden = false;
      $("adminEmail").textContent = user.email || "Admin";
      $("adminAvatar").textContent = (user.email || "A").slice(0,1).toUpperCase();

      bindNavigation();
      await refreshAll();
    })();

    try {
      await dashboardInitPromise;
    } finally {
      dashboardInitPromise = null;
    }
  }

  function showLogin(message = "") {
    $("dashboardView").hidden = true;
    $("loginView").hidden = false;
    $("loginStatus").textContent = message;
    $("loginBtn").disabled = false;
    $("loginBtn").textContent = "Masuk";
  }

  function bindNavigation() {
    if (navigationBound) return;
    navigationBound = true;
    document.querySelectorAll(".admin-nav-item").forEach(btn => {
      btn.addEventListener("click", () => openSection(btn.dataset.section));
    });
    document.querySelectorAll("[data-open-section]").forEach(btn => btn.addEventListener("click", () => openSection(btn.dataset.openSection)));
    $("requestFilter").addEventListener("change", renderRequests);
    $("addEventBtn").addEventListener("click", () => openEventForm());
    $("addDonationBtn").addEventListener("click", () => openDonationForm());
    $("modalClose").addEventListener("click", closeModal);
    $("modalBackdrop").addEventListener("click", e => { if(e.target === $("modalBackdrop")) closeModal(); });
    $("sidebarToggle").addEventListener("click", () => $("sidebar").classList.toggle("open"));
  }

  function openSection(name) {
    document.querySelectorAll(".admin-nav-item").forEach(b => b.classList.toggle("active", b.dataset.section === name));
    document.querySelectorAll(".panel-section").forEach(p => p.classList.toggle("active", p.dataset.panel === name));
    $("sectionTitle").textContent = ({
      overview:"Ringkasan", requests:"Pengajuan Layanan", messages:"Pesan Kontak",
      events:"Kegiatan", donations:"Donasi"
    }[name] || "Ringkasan");
    $("sidebar").classList.remove("open");
  }

  async function refreshAll() {
    await Promise.all([loadRequests(), loadMessages(), loadEvents(), loadDonations()]);
    renderOverview();
    renderRequests();
    renderMessages();
    renderEvents();
    renderDonations();
  }

  async function loadRequests() {
    const { data, error } = await sb.from("service_requests").select("*").order("created_at",{ascending:false});
    if(error){ console.error(error); allRequests=[]; return; }
    allRequests=data||[];
  }

  async function loadMessages() {
    const { data, error } = await sb.from("contact_messages").select("*").order("created_at",{ascending:false});
    if(error){ console.error(error); allMessages=[]; return; }
    allMessages=data||[];
  }

  async function loadEvents() {
    const { data, error } = await sb.from("events").select("*").order("event_date",{ascending:true});
    if(error){ console.error(error); allEvents=[]; return; }
    allEvents=data||[];
  }

  async function loadDonations() {
    const { data, error } = await sb.from("donation_accounts").select("*").order("display_order",{ascending:true});
    if(error){ console.error(error); allDonations=[]; return; }
    allDonations=data||[];
  }

  function formatDate(v) {
    if(!v) return "-";
    return new Intl.DateTimeFormat("id-ID",{day:"2-digit",month:"short",year:"numeric"}).format(new Date(v));
  }
  function formatDateTime(v) {
    if(!v) return "-";
    return new Intl.DateTimeFormat("id-ID",{day:"2-digit",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit"}).format(new Date(v));
  }
  function renderOverview() {
    $("statNew").textContent=allRequests.filter(x=>x.status==="baru").length;
    $("statProcess").textContent=allRequests.filter(x=>x.status==="diproses").length;
    $("statMessages").textContent=allMessages.length;
    $("statEvents").textContent=allEvents.filter(x=>new Date(x.event_date)>=new Date(new Date().toISOString().slice(0,10))).length;
    $("requestBadge").textContent=allRequests.filter(x=>x.status==="baru").length;
    $("messageBadge").textContent=allMessages.length;

    $("recentRequests").innerHTML=allRequests.slice(0,5).map(r=>`
      <div class="list-row">
        <div><strong>${esc(serviceLabel[r.service_type]||r.service_name)}</strong><small>${esc(r.form_data?.name||"Pemohon")} • ${formatDateTime(r.created_at)}</small></div>
        <span class="status-pill status-${esc(r.status)}">${esc(statusLabel[r.status]||r.status)}</span>
      </div>`).join("") || '<div class="empty">Belum ada pengajuan.</div>';

    $("recentMessages").innerHTML=allMessages.slice(0,5).map(m=>`
      <div class="list-row">
        <div><strong>${esc(m.name)}</strong><small>${esc(m.message).slice(0,80)}${m.message.length>80?"…":""}</small></div>
        <small>${formatDateTime(m.created_at)}</small>
      </div>`).join("") || '<div class="empty">Belum ada pesan.</div>';
  }

  function renderRequests() {
    const filter=$("requestFilter").value;
    const rows=allRequests.filter(x=>filter==="all"||x.status===filter);
    $("requestsTableWrap").innerHTML = rows.length ? `<table class="data-table"><thead><tr><th>Waktu</th><th>Layanan</th><th>Pemohon</th><th>Aksi</th><th>Status</th><th></th></tr></thead><tbody>${rows.map(r=>`
      <tr>
        <td>${formatDateTime(r.created_at)}</td>
        <td><strong>${esc(serviceLabel[r.service_type]||r.service_name)}</strong><br><small>${esc(actionLabel[r.action_type]||r.action_type)}</small></td>
        <td>${esc(r.form_data?.name||"-")}<br><small>${esc(r.form_data?.phone||r.form_data?.email||"")}</small></td>
        <td><button class="mini-action" data-request-view="${r.id}">Lihat</button></td>
        <td><select class="status-select" data-status-id="${r.id}">${["baru","diproses","disetujui","ditolak","selesai"].map(s=>`<option value="${s}" ${r.status===s?"selected":""}>${statusLabel[s]}</option>`).join("")}</select></td>
        <td><button class="mini-action danger" data-request-delete="${r.id}">Hapus</button></td>
      </tr>`).join("")}</tbody></table>` : '<div class="empty">Tidak ada pengajuan dengan filter ini.</div>';

    document.querySelectorAll("[data-request-view]").forEach(b=>b.addEventListener("click",()=>showRequestDetail(Number(b.dataset.requestView))));
    document.querySelectorAll("[data-status-id]").forEach(s=>s.addEventListener("change",()=>updateRequestStatus(Number(s.dataset.statusId),s.value)));
    document.querySelectorAll("[data-request-delete]").forEach(b=>b.addEventListener("click",()=>deleteRequest(Number(b.dataset.requestDelete))));
  }

  async function updateRequestStatus(id,status) {
    const {error}=await sb.from("service_requests").update({status,updated_at:new Date().toISOString()}).eq("id",id);
    if(error){toast("Gagal mengubah status");return;}
    toast("Status diperbarui"); await loadRequests(); renderRequests(); renderOverview();
  }

  async function deleteRequest(id) {
    if(!confirm("Hapus pengajuan ini?")) return;
    const {error}=await sb.from("service_requests").delete().eq("id",id);
    if(error){toast("Gagal menghapus pengajuan");return;}
    toast("Pengajuan dihapus"); await loadRequests(); renderRequests(); renderOverview();
  }

  function showRequestDetail(id) {
    const r=allRequests.find(x=>x.id===id); if(!r)return;
    const formData=JSON.stringify(r.form_data,null,2);
    openModal(`
      <div class="eyebrow">${esc(serviceLabel[r.service_type]||"LAYANAN")}</div>
      <h3>Detail Pengajuan</h3>
      <p class="muted">Dikirim ${formatDateTime(r.created_at)}</p>
      <div class="detail-meta">
        <div class="meta-box"><small>Status</small><strong>${esc(statusLabel[r.status]||r.status)}</strong></div>
        <div class="meta-box"><small>Aksi</small><strong>${esc(actionLabel[r.action_type]||r.action_type)}</strong></div>
      </div>
      <pre class="json-view">${esc(formData)}</pre>
      <div class="modal-actions"><button class="btn btn-secondary" id="modalCloseAction">Tutup</button></div>
    `);
    $("modalCloseAction").onclick=closeModal;
  }

  function renderMessages() {
    $("messagesTableWrap").innerHTML=allMessages.length?`<table class="data-table"><thead><tr><th>Tanggal</th><th>Nama</th><th>Email</th><th>Pesan</th><th></th></tr></thead><tbody>${allMessages.map(m=>`<tr><td>${formatDateTime(m.created_at)}</td><td><strong>${esc(m.name)}</strong></td><td>${esc(m.email)}</td><td>${esc(m.message)}</td><td><button class="mini-action danger" data-message-delete="${m.id}">Hapus</button></td></tr>`).join("")}</tbody></table>`:'<div class="empty">Belum ada pesan.</div>';
    document.querySelectorAll("[data-message-delete]").forEach(b=>b.addEventListener("click",()=>deleteMessage(Number(b.dataset.messageDelete))));
  }

  async function deleteMessage(id) {
    if(!confirm("Hapus pesan ini?")) return;
    const {error}=await sb.from("contact_messages").delete().eq("id",id);
    if(error){toast("Gagal menghapus pesan");return;}
    toast("Pesan dihapus"); await loadMessages(); renderMessages(); renderOverview();
  }

  function renderEvents() {
    $("eventsAdminGrid").innerHTML=allEvents.map(e=>`<article class="admin-item-card"><div class="eyebrow">${esc(e.category||"KEGIATAN")}</div><h4>${esc(e.title)}</h4><p>${formatDate(e.event_date)} • ${esc(e.start_time||"-")}</p><p>${esc(e.description||"")}</p><div class="card-actions"><button class="mini-action" data-event-edit="${e.id}">Edit</button><button class="mini-action danger" data-event-delete="${e.id}">Hapus</button></div></article>`).join("")||'<div class="empty">Belum ada kegiatan.</div>';
    document.querySelectorAll("[data-event-edit]").forEach(b=>b.addEventListener("click",()=>openEventForm(Number(b.dataset.eventEdit))));
    document.querySelectorAll("[data-event-delete]").forEach(b=>b.addEventListener("click",()=>deleteEvent(Number(b.dataset.eventDelete))));
  }

  function openEventForm(id=null) {
    const e=id?allEvents.find(x=>x.id===id):null;
    openModal(`
      <div class="eyebrow">AGENDA MASJID</div><h3>${e?"Edit":"Tambah"} Kegiatan</h3>
      <form id="eventForm" class="form-grid">
        <label class="wide">Judul<input name="title" required value="${esc(e?.title||"")}" placeholder="Nama kegiatan"></label>
        <label>Kategori<select name="category">${["Kajian","Pendidikan","Sosial","Dakwah","Umum"].map(x=>`<option ${e?.category===x?"selected":""}>${x}</option>`).join("")}</select></label>
        <label>Tanggal<input name="event_date" type="date" required value="${esc(e?.event_date||"")}"></label>
        <label>Jam Mulai<input name="start_time" type="time" value="${esc(e?.start_time||"")}"></label>
        <label class="wide">Deskripsi<textarea name="description" rows="4" placeholder="Deskripsi singkat">${esc(e?.description||"")}</textarea></label>
        <div class="modal-actions wide"><button type="button" class="btn btn-secondary" id="cancelModal">Batal</button><button class="btn btn-primary" type="submit">${e?"Simpan Perubahan":"Tambah Kegiatan"}</button></div>
        <p class="form-status wide" id="eventFormStatus"></p>
      </form>
    `);
    $("cancelModal").onclick=closeModal;
    $("eventForm").onsubmit=async ev=>{
      ev.preventDefault();
      const payload=Object.fromEntries(new FormData(ev.currentTarget).entries());
      const result=e?await sb.from("events").update(payload).eq("id",e.id):await sb.from("events").insert(payload);
      if(result.error){$("eventFormStatus").textContent="Gagal menyimpan.";return;}
      closeModal(); toast("Kegiatan disimpan"); await loadEvents(); renderEvents(); renderOverview();
    };
  }

  async function deleteEvent(id) {
    if(!confirm("Hapus kegiatan ini?"))return;
    const {error}=await sb.from("events").delete().eq("id",id);
    if(error){toast("Gagal menghapus");return;} toast("Kegiatan dihapus"); await loadEvents(); renderEvents(); renderOverview();
  }

  function renderDonations() {
    $("donationsAdminGrid").innerHTML=allDonations.map(d=>`<article class="admin-item-card"><div class="eyebrow">${d.is_active?"AKTIF":"NONAKTIF"}</div><h4>${esc(d.bank_name)}</h4><p><strong>${esc(d.account_number)}</strong></p><p>a.n. ${esc(d.account_name)}</p><div class="card-actions"><button class="mini-action" data-donation-edit="${d.id}">Edit</button><button class="mini-action danger" data-donation-delete="${d.id}">Hapus</button></div></article>`).join("")||'<div class="empty">Belum ada rekening.</div>';
    document.querySelectorAll("[data-donation-edit]").forEach(b=>b.addEventListener("click",()=>openDonationForm(Number(b.dataset.donationEdit))));
    document.querySelectorAll("[data-donation-delete]").forEach(b=>b.addEventListener("click",()=>deleteDonation(Number(b.dataset.donationDelete))));
  }

  function openDonationForm(id=null) {
    const d=id?allDonations.find(x=>x.id===id):null;
    openModal(`
      <div class="eyebrow">DONASI</div><h3>${d?"Edit":"Tambah"} Rekening</h3>
      <form id="donationForm" class="form-grid">
        <label>Nama Bank<input name="bank_name" required value="${esc(d?.bank_name||"")}" placeholder="Contoh: BSI"></label>
        <label>Nomor Rekening<input name="account_number" required value="${esc(d?.account_number||"")}" placeholder="Nomor rekening"></label>
        <label>Atas Nama<input name="account_name" required value="${esc(d?.account_name||"Masjid Kampus UMS")}"></label>
        <label>Urutan<input name="display_order" type="number" min="0" value="${esc(d?.display_order??1)}"></label>
        <label class="wide"><input name="is_active" type="checkbox" ${d?.is_active!==false?"checked":""}> Tampilkan di website</label>
        <div class="modal-actions wide"><button type="button" class="btn btn-secondary" id="cancelModal">Batal</button><button class="btn btn-primary" type="submit">${d?"Simpan Perubahan":"Tambah Rekening"}</button></div>
        <p class="form-status wide" id="donationFormStatus"></p>
      </form>
    `);
    $("cancelModal").onclick=closeModal;
    $("donationForm").onsubmit=async ev=>{
      ev.preventDefault();
      const fd=new FormData(ev.currentTarget);
      const payload={bank_name:fd.get("bank_name"),account_number:fd.get("account_number"),account_name:fd.get("account_name"),display_order:Number(fd.get("display_order")||0),is_active:fd.get("is_active")==="on"};
      const result=d?await sb.from("donation_accounts").update(payload).eq("id",d.id):await sb.from("donation_accounts").insert(payload);
      if(result.error){$("donationFormStatus").textContent="Gagal menyimpan.";return;}
      closeModal(); toast("Rekening disimpan"); await loadDonations(); renderDonations();
    };
  }

  async function deleteDonation(id){
    if(!confirm("Hapus rekening ini?"))return;
    const {error}=await sb.from("donation_accounts").delete().eq("id",id);
    if(error){toast("Gagal menghapus");return;} toast("Rekening dihapus"); await loadDonations(); renderDonations();
  }

  function openModal(html){$("modalContent").innerHTML=html;$("modalBackdrop").hidden=false}
  function closeModal(){$("modalBackdrop").hidden=true;$("modalContent").innerHTML=""}
})();
