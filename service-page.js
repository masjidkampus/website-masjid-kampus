(() => {
  const url = window.SUPABASE_URL;
  const key = window.SUPABASE_PUBLISHABLE_KEY;
  const configured = url && key && !url.includes("PASTE_") && !key.includes("PASTE_");
  const supabase = configured ? window.supabase.createClient(url, key) : null;

  const params = new URLSearchParams(location.search);
  const service = params.get("service") || "peminjaman-masjid";

  const $ = id => document.getElementById(id);
  const esc = (v = "") => String(v).replace(/[&<>"']/g, c => ({
    "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#039;"
  }[c]));

  const toast = message => {
    const t = $("toast");
    t.textContent = message;
    t.classList.add("show");
    setTimeout(() => t.classList.remove("show"), 2400);
  };

  const configs = {
    "peminjaman-masjid": {
      label:"Peminjaman Masjid",
      eyebrow:"PEMINJAMAN MASJID",
      title:"Informasi Peminjaman Masjid Kampus UMS",
      intro:"Ajukan penggunaan ruang Masjid Kampus UMS untuk kegiatan resmi kampus, organisasi, maupun komunitas.",
      info:[
        "Pengajuan diajukan paling lambat 3 hari sebelum tanggal kegiatan.",
        "Kegiatan tidak boleh bertabrakan dengan waktu sholat lima waktu dan sholat Jumat.",
        "Penanggung jawab kegiatan wajib hadir selama acara berlangsung.",
        "Peminjam bertanggung jawab menjaga kebersihan dan kerapian masjid setelah kegiatan.",
        "Konfirmasi persetujuan akan diinformasikan melalui kontak yang didaftarkan."
      ],
      actions:[
        ["apply","Ajukan Peminjaman","Isi formulir pengajuan penggunaan masjid."],
        ["confirm","Konfirmasi Peminjaman","Konfirmasi pengajuan yang telah dikoordinasikan."]
      ]
    },
    "peminjaman-alat": {
      label:"Peminjaman Alat",
      eyebrow:"PEMINJAMAN ALAT",
      title:"Informasi Peminjaman Alat Kampus UMS",
      intro:"Ajukan peminjaman alat yang tersedia untuk mendukung kegiatan di lingkungan Masjid Kampus UMS.",
      info:[
        "Pengajuan diajukan sebelum alat dibutuhkan agar pengelola dapat memeriksa ketersediaan.",
        "Peminjam bertanggung jawab atas keamanan dan kondisi alat selama masa peminjaman.",
        "Alat wajib dikembalikan sesuai waktu yang disepakati bersama pengelola.",
        "Kerusakan atau kehilangan alat menjadi tanggung jawab peminjam sesuai ketentuan.",
        "Konfirmasi peminjaman akan diinformasikan melalui kontak yang didaftarkan."
      ],
      actions:[
        ["apply","Ajukan Peminjaman","Isi formulir kebutuhan alat."],
        ["confirm","Konfirmasi Peminjaman","Konfirmasi peminjaman yang sudah dikoordinasikan."]
      ]
    },
    "media-partner": {
      label:"Media Partner",
      eyebrow:"MEDIA PARTNER",
      title:"Media Partner Masjid Kampus UMS",
      intro:"Ajukan kerja sama publikasi untuk kegiatan mahasiswa, organisasi, komunitas, atau kegiatan sosial yang relevan.",
      info:[
        "Jelaskan nama kegiatan, penyelenggara, jadwal, dan tujuan kerja sama secara lengkap.",
        "Materi publikasi harus sesuai dengan nilai, ketentuan, dan citra Masjid Kampus UMS.",
        "Bentuk dukungan media partner disesuaikan dengan kapasitas dan kanal yang tersedia.",
        "Pengelola dapat meminta materi publikasi sebelum menyetujui kerja sama.",
        "Hasil pengajuan akan dikonfirmasi melalui kontak yang didaftarkan."
      ],
      actions:[
        ["apply","Ajukan Media Partner","Kirim detail kegiatan dan kebutuhan publikasi."]
      ]
    },
    "barang-temuan": {
      label:"Barang Hilang & Temuan",
      eyebrow:"BARANG HILANG & TEMUAN",
      title:"Informasi Barang Temuan Masjid Kampus UMS",
      intro:"Ajukan pengambilan barang temuan dengan memberikan ciri-ciri yang dapat digunakan untuk verifikasi kepemilikan.",
      info:[
        "Pengambilan dilakukan setelah pemohon dapat menjelaskan ciri-ciri barang dengan tepat.",
        "Pemohon dapat diminta menunjukkan identitas untuk proses verifikasi.",
        "Barang temuan diserahkan setelah data pemohon dinyatakan sesuai.",
        "Barang yang belum dapat diidentifikasi tetap disimpan sesuai kebijakan pengelola.",
        "Pastikan nomor HP atau email yang ditulis dapat dihubungi."
      ],
      actions:[
        ["found","Ajukan Pengambilan","Kirim data barang dan informasi untuk verifikasi."]
      ]
    },
    "kritik-saran": {
      label:"Kritik & Saran",
      eyebrow:"KRITIK & SARAN",
      title:"Kritik dan Saran Masjid Kampus UMS",
      intro:"Sampaikan masukan, evaluasi, apresiasi, maupun ide pengembangan agar pelayanan masjid semakin baik.",
      info:[
        "Sampaikan masukan dengan bahasa yang sopan dan jelas.",
        "Sertakan lokasi atau konteks kejadian jika kritik berkaitan dengan fasilitas atau pelayanan.",
        "Masukan dapat berupa kritik, saran, apresiasi, maupun ide kolaborasi.",
        "Data kontak bersifat opsional, tetapi disarankan agar pengelola dapat memberikan tindak lanjut.",
        "Setiap masukan akan menjadi bahan evaluasi pengelola."
      ],
      actions:[
        ["feedback","Kirim Kritik & Saran","Sampaikan masukan kepada pengelola masjid."]
      ]
    }
  };

  const cfg = configs[service] || configs["peminjaman-masjid"];

  $("breadcrumbService").textContent = cfg.label;
  $("detailEyebrow").textContent = cfg.eyebrow;
  $("detailTitle").textContent = cfg.title;
  $("detailIntro").textContent = cfg.intro;
  $("infoTitle").textContent = cfg.infoTitle || "Syarat & Ketentuan";

  $("infoList").innerHTML = cfg.info.map(item => `
    <div class="requirement-row">
      <span class="check">✓</span>
      <p>${esc(item)}</p>
    </div>
  `).join("");

  renderServiceDataTable();

  $("actionButtons").innerHTML = cfg.actions.map((a, i) => `
    <button type="button" class="service-action ${i === 0 ? "primary-action" : ""}" data-action="${a[0]}">
      <span class="action-title">${esc(a[1])}</span>
      <small>${esc(a[2])}</small>
    </button>
  `).join("");

  $("actionButtons").querySelectorAll("[data-action]").forEach(btn => {
    btn.addEventListener("click", () => openForm(btn.dataset.action));
  });

  async function renderServiceDataTable() {
    const tableWrap = $("serviceDataTable");
    tableWrap.hidden = true;
    tableWrap.innerHTML = "";

    if (!configured || !supabase || !["peminjaman-masjid", "peminjaman-alat", "media-partner"].includes(service)) return;

    const { data, error } = await supabase
      .from("service_requests")
      .select("service_type, status, form_data, created_at")
      .eq("service_type", service)
      .in("status", ["baru", "diproses", "disetujui", "ditolak", "selesai"])
      .order("created_at", { ascending: false })
      .limit(20);

    if (error) {
      console.error("Gagal mengambil data layanan aktif:", error);
      return;
    }

    const rows = (data || []).map(item => {
      const f = item.form_data || {};
      const name = f.name || f.nama_pemohon || f.nama_penanggung_jawab || f["Nama Pemohon"] || f["Nama Penanggung Jawab"] || "-";
      const organization = f.organization || f.instansi || f.organisasi || f["Instansi / Organisasi"] || "-";
      const activity = f.activity || f.nama_kegiatan || f["Nama Kegiatan"] || "-";
      const date = f.date || f.event_date || f["Tanggal Kegiatan"] || f["Tanggal Penggunaan"] || "-";
      const contact = f.contact || f.phone || f.email || f["Nomor HP / WhatsApp"] || f["Nomor HP / Email"] || "-";

      return {
        name: String(name),
        organization: String(organization),
        activity: String(activity),
        date: String(date),
        contact: String(contact),
        status: item.status || "baru"
      };
    });

    if (!rows.length) return;

    const tableMeta = {
      "peminjaman-masjid": { title: "Daftar Peminjam Masjid Aktif", columns: ["Nama","Instansi","Kegiatan","Tanggal","Kontak","Status"] },
      "peminjaman-alat": { title: "Daftar Peminjam Alat Aktif", columns: ["Nama","Instansi","Kegiatan","Tanggal","Kontak","Status"] },
      "media-partner": { title: "Daftar Media Partner Aktif", columns: ["Penanggung Jawab","Instansi","Kegiatan","Tanggal","Kontak","Status"] }
    };

    const meta = tableMeta[service] || tableMeta["peminjaman-masjid"];
    tableWrap.innerHTML = `
      <div class="table-header-row">
        <div class="eyebrow">DATA AKTIF</div>
        <h3>${esc(meta.title)}</h3>
      </div>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>${meta.columns.map(col => `<th>${esc(col)}</th>`).join("")}</tr>
          </thead>
          <tbody>
            ${rows.map(r => `
              <tr>
                <td>${esc(r.name)}</td>
                <td>${esc(r.organization)}</td>
                <td>${esc(r.activity)}</td>
                <td>${esc(r.date)}</td>
                <td>${esc(r.contact)}</td>
                <td><span class="status-badge status-${esc(r.status)}">${esc(r.status)}</span></td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    `;
    tableWrap.hidden = false;
  }

  $("backToInfo").addEventListener("click", e => {
    e.preventDefault();
    $("formWrap").hidden = true;
    document.querySelector(".requirements-card").scrollIntoView({behavior:"smooth", block:"start"});
  });

  $("menuToggle")?.addEventListener("click", () => $("mainNav").classList.toggle("open"));
  $("mainNav")?.querySelectorAll("a").forEach(a =>
    a.addEventListener("click", () => $("mainNav").classList.remove("open"))
  );

  function input(name,label,type="text",placeholder="",required=true,extra="") {
    return `<label>${esc(label)}<input name="${esc(name)}" type="${type}" ${required ? "required" : ""} placeholder="${esc(placeholder)}" ${extra}></label>`;
  }
  function textarea(name,label,placeholder="",required=true) {
    return `<label class="wide-field">${esc(label)}<textarea name="${esc(name)}" rows="5" ${required ? "required" : ""} placeholder="${esc(placeholder)}"></textarea></label>`;
  }
  function select(name,label,values,required=true) {
    return `<label>${esc(label)}<select name="${esc(name)}" ${required ? "required" : ""}><option value="">Pilih</option>${values.map(v=>`<option value="${esc(v)}">${esc(v)}</option>`).join("")}</select></label>`;
  }

  function openForm(action) {
    let html = "";
    let title = "";
    let description = "";

    if (action === "apply" && service === "peminjaman-masjid") {
      title="Ajukan Peminjaman";
      description="Lengkapi data kegiatan agar pengelola dapat memeriksa jadwal dan kebutuhan peminjaman.";
      html = `<div class="form-grid">
        ${input("name","Nama Pemohon","text","Nama lengkap")}
        ${input("contact","Nomor HP / Email","text","08xxxxxxxxxx / nama@email.com")}
        ${input("organization","Instansi / Organisasi","text","Contoh: BEM / UKM / Komunitas")}
        ${input("activity","Nama Kegiatan","text","Nama kegiatan")}
        ${input("date","Tanggal Penggunaan","date")}
        ${input("time_range","Jam Mulai – Jam Selesai","text","Contoh: 19.00 – 21.00")}
        ${input("participants","Perkiraan Jumlah Peserta","number","Contoh: 100",true,'min="1"')}
        ${textarea("notes","Keperluan / Catatan Tambahan","Jelaskan secara singkat keperluan peminjaman")}
      </div>`;
    }

    else if (action === "confirm" && service === "peminjaman-masjid") {
      title="Konfirmasi Peminjaman";
      description="Masukkan data pengajuan yang telah dikoordinasikan untuk proses konfirmasi.";
      html = `<div class="form-grid">
        ${input("name","Nama Pemohon","text","Nama lengkap")}
        ${input("contact","Nomor HP / Email","text","08xxxxxxxxxx / nama@email.com")}
        ${input("reference","Nomor / Kode Pengajuan","text","Contoh: PM-001")}
        ${input("activity","Nama Kegiatan","text","Nama kegiatan")}
        ${input("date","Tanggal Penggunaan","date")}
        ${input("time_range","Jam Mulai – Jam Selesai","text","Contoh: 19.00 – 21.00")}
        ${textarea("notes","Keterangan Konfirmasi","Tuliskan informasi yang ingin dikonfirmasi")}
      </div>`;
    }

    else if (action === "apply" && service === "peminjaman-alat") {
      title="Ajukan Peminjaman Alat";
      description="Isi kebutuhan alat secara rinci agar pengelola dapat memeriksa ketersediaannya.";
      html = `<div class="form-grid">
        ${input("name","Nama Pemohon","text","Nama lengkap")}
        ${input("contact","Nomor HP / Email","text","08xxxxxxxxxx / nama@email.com")}
        ${input("organization","Instansi / Organisasi","text","Nama instansi")}
        ${input("activity","Nama Kegiatan","text","Nama kegiatan")}
        ${input("date","Tanggal Penggunaan","date")}
        ${input("return_date","Tanggal Pengembalian","date")}
        ${textarea("items","Daftar Alat yang Dibutuhkan","Contoh: sound system 1 set, mic 2 unit, kabel 2 buah")}
        ${textarea("notes","Keperluan / Catatan Tambahan","Informasi tambahan",false)}
      </div>`;
    }

    else if (action === "confirm" && service === "peminjaman-alat") {
      title="Konfirmasi Peminjaman";
      description="Masukkan kode pengajuan dan rincian alat yang telah dikoordinasikan.";
      html = `<div class="form-grid">
        ${input("name","Nama Pemohon","text","Nama lengkap")}
        ${input("contact","Nomor HP / Email","text","08xxxxxxxxxx / nama@email.com")}
        ${input("reference","Nomor / Kode Pengajuan","text","Contoh: PA-001")}
        ${textarea("items","Alat yang Dikonfirmasi","Tuliskan alat dan jumlahnya")}
        ${textarea("notes","Catatan","Keterangan tambahan",false)}
      </div>`;
    }

    else if (action === "apply" && service === "media-partner") {
      title="Ajukan Media Partner";
      description="Lengkapi detail kegiatan dan bentuk kerja sama publikasi yang dibutuhkan.";
      html = `<div class="form-grid">
        ${input("name","Nama Penanggung Jawab","text","Nama lengkap")}
        ${input("phone","Nomor HP / WhatsApp","tel","08xxxxxxxxxx")}
        ${input("email","Email","email","nama@email.com")}
        ${input("organization","Instansi / Organisasi","text","Nama penyelenggara")}
        ${input("activity","Nama Kegiatan","text","Nama kegiatan")}
        ${input("event_date","Tanggal Kegiatan","date")}
        ${input("social","Instagram / Media Sosial","text","@username atau tautan")}
        ${textarea("proposal","Gambaran Kegiatan","Jelaskan tujuan, target peserta, dan bentuk kegiatan")}
        ${textarea("request","Bentuk Media Partner yang Diajukan","Contoh: feed, story, poster, dokumentasi")}
      </div>`;
    }

    else if (action === "found" && service === "barang-temuan") {
      title="Ajukan Pengambilan Barang";
      description="Berikan informasi sejelas mungkin agar pengelola dapat memverifikasi kepemilikan.";
      html = `<div class="form-grid">
        ${input("name","Nama Pemohon","text","Nama lengkap")}
        ${input("identity","NIM / NIP / Identitas","text","Nomor identitas",false)}
        ${input("phone","Nomor HP / WhatsApp","tel","08xxxxxxxxxx")}
        ${input("email","Email","email","nama@email.com",false)}
        ${input("item_name","Nama / Jenis Barang","text","Contoh: dompet hitam")}
        ${input("lost_date","Perkiraan Tanggal Kehilangan","date","",false)}
        ${input("lost_location","Perkiraan Lokasi Kehilangan","text","Contoh: selasar masjid",false)}
        ${textarea("item_description","Ciri-ciri Barang","Tuliskan warna, merek, isi, tanda khusus, dan ciri lainnya")}
        ${textarea("notes","Keterangan Tambahan","Informasi yang dapat membantu verifikasi",false)}
      </div>`;
    }

    else if (action === "feedback" && service === "kritik-saran") {
      title="Kritik & Saran";
      description="Sampaikan masukan yang dapat membantu meningkatkan pelayanan Masjid Kampus UMS.";
      html = `<div class="form-grid">
        ${input("name","Nama","text","Nama lengkap",false)}
        ${input("contact","Nomor HP / WhatsApp","text","08xxxxxxxxxx",false)}
        ${input("email","Email","email","nama@email.com",false)}
        ${select("type","Jenis Masukan",["Kritik","Saran","Apresiasi","Ide / Kolaborasi"])}
        ${textarea("message","Isi Kritik / Saran","Tuliskan masukanmu secara jelas")}
      </div>`;
    }

    else return;

    $("formEyebrow").textContent = cfg.eyebrow;
    $("formTitle").textContent = title;
    $("formDescription").textContent = description;
    $("serviceForm").innerHTML = html + `
      <div class="form-submit-row">
        <button class="btn btn-primary submit-service" type="submit">Kirim Pengajuan</button>
        <p class="form-status" id="serviceStatus"></p>
      </div>
    `;
    $("serviceForm").dataset.action = action;
    $("formWrap").hidden = false;
    $("formWrap").scrollIntoView({behavior:"smooth", block:"start"});
    $("serviceForm").onsubmit = submitForm;
  }

  async function submitForm(e) {
    e.preventDefault();
    const btn = e.currentTarget.querySelector(".submit-service");
    const status = $("serviceStatus");
    btn.disabled = true;
    btn.textContent = "Mengirim...";

    const data = Object.fromEntries(new FormData(e.currentTarget).entries());
    const payload = {
      service_type: service,
      action_type: e.currentTarget.dataset.action,
      service_name: cfg.title,
      form_data: data
    };

    if (!configured) {
      status.textContent = "Mode demo: Supabase belum terhubung. Setelah config.js diisi, data akan masuk database.";
      btn.disabled = false;
      btn.textContent = "Kirim Pengajuan";
      return;
    }

    const { error } = await supabase.from("service_requests").insert(payload);

    if (error) {
      console.error(error);
      status.textContent = "Pengajuan gagal disimpan. Pastikan schema.sql dan RLS sudah dijalankan.";
    } else {
      status.textContent = "Pengajuan berhasil dikirim. Terima kasih.";
      e.currentTarget.reset();
      toast("Pengajuan berhasil dikirim");
    }

    btn.disabled = false;
    btn.textContent = "Kirim Pengajuan";
  }
})();
