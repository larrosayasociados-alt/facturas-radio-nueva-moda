const STORAGE = "rnm_facturas_v1";
const LOGO_SRC = window.LOGO_B64 ? ("data:image/jpeg;base64," + window.LOGO_B64) : "";
const EMISOR = {
  emNombre: "RADIO NUEVA MODA",
  emPersona: "Juan Carlos Torres Bahamon",
  emNif: "78848822S",
  emTel: "625 36 17 79",
  emDir: "Centro Comercial Buganvillas",
  emEmail: "pachanquita01@gmail.com",
  emWeb: "www.radionuevamoda.com",
  emIban: "ES61 0182 0779 6502 0163 9932",
  emBanco: "BBVA"
};
const DEFAULTS = Object.assign({ nextNum: 8 }, EMISOR);
function loadState(){
  try {
    const raw = localStorage.getItem(STORAGE);
    if (!raw) return { settings: Object.assign({}, DEFAULTS), invoices: [] };
    const data = JSON.parse(raw);
    const nextNum = Math.max(1, parseInt((data.settings || {}).nextNum, 10) || 8);
    return { settings: Object.assign({}, EMISOR, { nextNum: nextNum }), invoices: data.invoices || [] };
  } catch (e) {
    return { settings: Object.assign({}, DEFAULTS), invoices: [] };
  }
}
function saveState(){
  localStorage.setItem(STORAGE, JSON.stringify({ settings: getSettingsFromForm(), invoices: state.invoices }));
}
let state = loadState();
function $(id){ return document.getElementById(id); }
function euro(n){ return (Number(n) || 0).toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " \u20ac"; }
function parseMoney(v){ if (typeof v === "number") return v; return Number(String(v).replace(/\./g, "").replace(",", ".").replace(/[^\d.-]/g, "")) || 0; }
function todayISO(){ const d = new Date(); const z = function(n){ return String(n).padStart(2, "0"); }; return d.getFullYear() + "-" + z(d.getMonth() + 1) + "-" + z(d.getDate()); }
function fmtDate(iso){ if (!iso) return ""; const p = iso.split("-"); return p[2] + "/" + p[1] + "/" + p[0]; }
function toast(msg){ const el = $("toast"); if (!el) return; el.textContent = msg; el.style.display = "block"; setTimeout(function(){ el.style.display = "none"; }, 2400); }
function fillSettings(){
  if ($("nextNum")) $("nextNum").value = state.settings.nextNum || 8;
  if ($("nextLabel")) $("nextLabel").textContent = "n.\u00ba " + (state.settings.nextNum || 8);
}
function getSettingsFromForm(){
  var next = 8;
  if ($("nextNum")) next = Math.max(1, parseInt($("nextNum").value, 10) || 1);
  return Object.assign({}, EMISOR, { nextNum: next });
}
function addItem(desc, amount){
  desc = desc || "Publicidad radiof\u00f3nica";
  amount = amount || "";
  const tr = document.createElement("tr");
  tr.className = "item-row";
  tr.innerHTML = "<td><input class=\"desc\" placeholder=\"Descripci\u00f3n del servicio\" value=\"" + desc.replace(/\"/g, "") + "\"></td><td><input class=\"imp\" type=\"text\" inputmode=\"decimal\" placeholder=\"0,00\" value=\"" + amount + "\"></td><td><button type=\"button\" class=\"btn-danger\" style=\"padding:8px 10px\">\u2715</button></td>";
  tr.querySelector(".btn-danger").onclick = function(){ if (document.querySelectorAll(".item-row").length === 1) return; tr.remove(); recalc(); };
  tr.querySelector(".imp").addEventListener("input", recalc);
  $("itemsBody").appendChild(tr);
}
function getItems(){ return Array.prototype.slice.call(document.querySelectorAll(".item-row")).map(function(tr){ return { desc: tr.querySelector(".desc").value.trim(), amount: parseMoney(tr.querySelector(".imp").value) }; }).filter(function(x){ return x.desc || x.amount; }); }
function recalc(){
  const items = getItems();
  const sub = items.reduce(function(a, b){ return a + b.amount; }, 0);
  const exento = $("exento").value === "si";
  const pct = exento ? 0 : parseMoney($("igic").value);
  const igic = sub * (pct / 100);
  const total = sub + igic;
  $("subtotalTxt").textContent = euro(sub);
  $("igicLabel").textContent = exento ? "IGIC (0% exento)" : ("IGIC (" + pct + "%)");
  $("igicTxt").textContent = euro(igic);
  $("totalTxt").textContent = euro(total);
  return { sub: sub, pct: pct, igic: igic, total: total, exento: exento };
}
function collectInvoice(consumeNumber){
  const settings = getSettingsFromForm();
  const totals = recalc();
  if (consumeNumber) {
    const last = state.invoices[0];
    const recent = last && (Date.now() - new Date(last.createdAt).getTime() < 180000);
    const same = recent && last.cliNombre === $("cliNombre").value.trim() && last.fecha === ($("fecha").value || todayISO()) && Math.abs((last.total || 0) - (totals.total || 0)) < 0.001;
    if (same) return last;
  }
  const num = settings.nextNum;
  const inv = {
    number: num,
    fecha: $("fecha").value || todayISO(),
    periodoDesde: $("periodoDesde").value,
    periodoHasta: $("periodoHasta").value,
    cliNombre: $("cliNombre").value.trim(),
    cliCif: $("cliCif").value.trim(),
    cliCp: $("cliCp").value.trim(),
    cliDir: $("cliDir").value.trim(),
    cliEmail: $("cliEmail").value.trim(),
    cliTel: $("cliTel").value.trim(),
    items: getItems(),
    mensaje: $("mensaje").value.trim(),
    sub: totals.sub, pct: totals.pct, igic: totals.igic, total: totals.total, exento: totals.exento,
    settings: settings,
    createdAt: new Date().toISOString()
  };
  if (consumeNumber && !state.invoices.some(function(x){ return x.number === num; })) {
    state.invoices.unshift(inv);
    settings.nextNum = num + 1;
    if ($("nextNum")) $("nextNum").value = settings.nextNum;
    if ($("nextLabel")) $("nextLabel").textContent = "n.\u00ba " + settings.nextNum;
    state.settings = settings;
    saveState();
    renderHistory();
    renderClients();
  }
  return inv;
}
function loadInvoice(inv){
  $("fecha").value = inv.fecha || "";
  $("periodoDesde").value = inv.periodoDesde || "";
  $("periodoHasta").value = inv.periodoHasta || "";
  $("cliNombre").value = inv.cliNombre || "";
  $("cliCif").value = inv.cliCif || "";
  $("cliCp").value = inv.cliCp || "";
  $("cliDir").value = inv.cliDir || "";
  $("cliEmail").value = inv.cliEmail || "";
  $("cliTel").value = inv.cliTel || "";
  $("mensaje").value = inv.mensaje || $("mensaje").value;
  $("exento").value = inv.exento ? "si" : "no";
  $("igic").value = inv.pct || 0;
  $("itemsBody").innerHTML = "";
  (inv.items && inv.items.length ? inv.items : [{ desc: "Publicidad radiof\u00f3nica", amount: 0 }]).forEach(function(it){ addItem(it.desc, it.amount ? String(it.amount).replace(".", ",") : ""); });
  recalc();
}
function renderHistory(){
  const box = $("historial");
  if (!state.invoices.length) { box.innerHTML = "<p class='hint'>A\u00fan no hay facturas en este navegador.</p>"; return; }
  box.innerHTML = state.invoices.map(function(inv){ return "<div class=\"hist-item\" data-n=\"" + inv.number + "\"><b>N.\u00ba " + inv.number + "</b><div>" + (inv.cliNombre || "Sin cliente") + "<small>" + fmtDate(inv.fecha) + " \u00b7 " + euro(inv.total) + "</small></div><button class=\"btn-ghost\" type=\"button\" data-pdf=\"" + inv.number + "\">PDF</button></div>"; }).join("");
  Array.prototype.slice.call(box.querySelectorAll(".hist-item")).forEach(function(el){
    el.addEventListener("click", function(ev){
      if (ev.target.dataset.pdf) {
        const inv = state.invoices.find(function(x){ return String(x.number) === ev.target.dataset.pdf; });
        if (inv) { inv.settings = Object.assign({}, EMISOR, inv.settings || {}); generatePdf(inv); }
        return;
      }
      const inv2 = state.invoices.find(function(x){ return String(x.number) === el.dataset.n; });
      if (inv2) loadInvoice(inv2);
    });
  });
}
function renderClients(){ const names = []; state.invoices.forEach(function(x){ if (x.cliNombre && names.indexOf(x.cliNombre) === -1) names.push(x.cliNombre); }); $("clientesPrevios").innerHTML = names.map(function(n){ return "<option value=\"" + n + "\"></option>"; }).join(""); }
function cleanPhone(raw){ var p = String(raw || "").replace(/[^\d+]/g, ""); if (p.indexOf("00") === 0) p = "+" + p.slice(2); if (/^[67]\d{8}$/.test(p)) p = "34" + p; return p.replace(/^\+/, ""); }
function messageText(inv){ var periodo = inv.periodoDesde && inv.periodoHasta ? (" del " + fmtDate(inv.periodoDesde) + " al " + fmtDate(inv.periodoHasta)) : ""; return (inv.mensaje || "Hola, le enviamos su factura.") + "\n\nFactura n.\u00ba " + inv.number + " \u00b7 " + fmtDate(inv.fecha) + "\n" + EMISOR.emNombre + "\nTotal: " + euro(inv.total) + periodo + "\n\nIBAN " + EMISOR.emIban + "\n" + EMISOR.emBanco; }
function boot(){
  if (LOGO_SRC && $("logoImg")) $("logoImg").src = LOGO_SRC;
  fillSettings();
  $("fecha").value = todayISO();
  var d = new Date();
  var z = function(n){ return String(n).padStart(2, "0"); };
  var toDate = new Date(d.getFullYear(), d.getMonth() + 1, d.getDate());
  $("periodoDesde").value = todayISO();
  $("periodoHasta").value = toDate.getFullYear() + "-" + z(toDate.getMonth() + 1) + "-" + z(toDate.getDate());
  addItem("Publicidad radiof\u00f3nica", "");
  $("addItem").onclick = function(){ addItem("", ""); };
  $("igic").oninput = recalc;
  $("exento").onchange = recalc;
  if ($("nextNum")) $("nextNum").oninput = function(){ $("nextLabel").textContent = "n.\u00ba " + (parseInt($("nextNum").value, 10) || 1); };
  $("btnPdf").onclick = function(){ if (!$("cliNombre").value.trim()) { toast("Escribe el nombre del cliente"); return; } generatePdf(collectInvoice(true)); };
  $("btnWa").onclick = function(){ if (!$("cliNombre").value.trim()) { toast("Escribe el nombre del cliente"); return; } var inv = collectInvoice(true); generatePdf(inv); var phone = cleanPhone(inv.cliTel); if (!phone) { toast("Falta el tel\u00e9fono del cliente"); return; } window.open("https://wa.me/" + phone + "?text=" + encodeURIComponent(messageText(inv) + "\n\nAdjunto el PDF descargado."), "_blank"); };
  $("btnMail").onclick = function(){ if (!$("cliNombre").value.trim()) { toast("Escribe el nombre del cliente"); return; } var inv = collectInvoice(true); generatePdf(inv); if (!inv.cliEmail) { toast("Falta el email del cliente"); return; } var subject = "Factura " + inv.number + " \u00b7 " + EMISOR.emNombre; window.location.href = "mailto:" + encodeURIComponent(inv.cliEmail) + "?subject=" + encodeURIComponent(subject) + "&body=" + encodeURIComponent(messageText(inv) + "\n\nAdjunte el PDF descargado a este correo."); };
  $("exportJson").onclick = function(){ var blob = new Blob([JSON.stringify({ settings: getSettingsFromForm(), invoices: state.invoices }, null, 2)], { type: "application/json" }); var a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "facturas-radio-nueva-moda.json"; a.click(); };
  $("importJson").onclick = function(){ $("importFile").click(); };
  $("importFile").onchange = function(e){ var file = e.target.files[0]; if (!file) return; var reader = new FileReader(); reader.onload = function(){ try { var data = JSON.parse(reader.result); var nextNum = Math.max(1, parseInt((data.settings || {}).nextNum, 10) || 8); state = { settings: Object.assign({}, EMISOR, { nextNum: nextNum }), invoices: data.invoices || [] }; fillSettings(); saveState(); renderHistory(); renderClients(); toast("Copia importada"); } catch (err) { toast("Archivo no v\u00e1lido"); } }; reader.readAsText(file); };
  renderHistory();
  renderClients();
  recalc();
}
document.addEventListener("DOMContentLoaded", boot);
