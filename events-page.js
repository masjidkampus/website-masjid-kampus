(() => {
  const url=window.SUPABASE_URL, key=window.SUPABASE_PUBLISHABLE_KEY;
  const configured=url && key && !url.includes("PASTE_") && !key.includes("PASTE_");
  const fmt=d=>new Intl.DateTimeFormat("id-ID",{day:"2-digit",month:"long",year:"numeric"}).format(new Date(d));
  document.getElementById("year").textContent=new Date().getFullYear();
  const nav=document.getElementById("mainNav");
  document.getElementById("menuToggle")?.addEventListener("click",()=>nav.classList.toggle("open"));
  if(!configured){ demo(); return; }
  const sb=window.supabase.createClient(url,key);
  sb.from("events").select("*").gte("event_date",new Date().toISOString().slice(0,10)).order("event_date").then(({data,error})=>{
    if(error||!data?.length) document.getElementById("allEvents").innerHTML='<div class="loading-card">Belum ada agenda mendatang.</div>';
    else document.getElementById("allEvents").innerHTML=data.map(x=>`<article class="event-card"><div class="event-meta"><span class="event-date">${fmt(x.event_date)}</span><span>${x.start_time||""}</span></div><h3>${x.title}</h3><p>${x.description||""}</p><span class="event-tag">${x.category||"Kegiatan"}</span></article>`).join("");
  });
  function demo(){const d=[["Kajian Tafsir Al-Qur'an","30 Agu 2026","19:30","Kajian"],["Tahsin Al-Qur'an","01 Sep 2026","16:30","Pendidikan"],["Santunan Yatim","05 Sep 2026","09:00","Sosial"]];document.getElementById("allEvents").innerHTML=d.map(x=>`<article class="event-card"><div class="event-meta"><span class="event-date">${x[1]}</span><span>${x[2]}</span></div><h3>${x[0]}</h3><p>Agenda contoh dari mode demo.</p><span class="event-tag">${x[3]}</span></article>`).join("");}
})();
