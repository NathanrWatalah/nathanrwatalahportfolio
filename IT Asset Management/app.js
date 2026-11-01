/* IT Asset Manager. Works with the PHP API in /api, or on its own with browser storage. */
(function () {
"use strict";
var CONFIG = {
  helpdesk: "https://nathanrwatalahportfolio.com/ticketing-system/",
  kb: "https://nathanrwatalahportfolio.com/knowledge-base/",
  api: "api/index.php",
  depreciationYears: 4, warrantyDays: 60, serviceDays: 30, currency: "$"
};
var CATS = ["Laptop","Desktop","Phone","Network","Printer","Peripheral","Other"];
var STATUSES = ["In use","In stock","In repair","Retired"];
var AF = [
  ["name","Name","text"],["category","Category","select",CATS],["serial","Serial number","text"],["location","Location","text"],
  ["status","Status","select",STATUSES],["assignee","Assigned to","text"],["checkedOut","Checked out on","date"],["due","Due back","date"],
  ["warranty","Warranty ends","date"],["nextService","Next service","date"],["purchaseDate","Purchase date","date"],["price","Purchase price","number"],
  ["notes","Notes","textarea"],["photo","Photo","photo"]
];
var LF = [
  ["name","Software","text"],["vendor","Vendor","text"],["seats","Seats bought","number"],["used","Seats in use","number"],
  ["expires","Expires","date"],["cost","Yearly cost","number"],["notes","Notes","textarea"]
];
var LS_KEY = "itam.v2";
var $ = function (s) { return document.querySelector(s); };
var S = { assets: [], licenses: [], log: [] };
var role = "viewer", remote = false, view = "assets", editCol = "assets", editing = null, photoData = "";
var F = { q: "", status: "", cat: "", sort: "id", dir: 1 };

/* ---------- helpers ---------- */
function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c]; }); }
function today() { return new Date().toISOString().slice(0, 10); }
function addDays(n) { var d = new Date(); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); }
function daysTo(d) { if (!d) return null; return Math.round((new Date(d + "T00:00:00") - new Date(today() + "T00:00:00")) / 864e5); }
function money(n) { return CONFIG.currency + Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 0 }); }
function toast(m) { var t = $("#toast"); t.textContent = m; t.classList.add("on"); clearTimeout(toast.h); toast.h = setTimeout(function () { t.classList.remove("on"); }, 2600); }
function fail(e) { if (e && e.status === 401) { showLogin(); return; } toast("Could not save: " + (e && e.message ? e.message : "try again")); }
function prefix(col) { return col === "assets" ? "AST-" : "LIC-"; }
function nextId(col) { var m = 0; S[col].forEach(function (d) { var n = parseInt(d.id.slice(4), 10); if (n > m) m = n; }); return prefix(col) + String(m + 1).padStart(4, "0"); }
function find(col, id) { return S[col].filter(function (d) { return d.id === id; })[0]; }
function overdue(a) { return a.status === "In use" && a.due && daysTo(a.due) < 0; }
function warrantySoon(a) { var d = daysTo(a.warranty); return a.status !== "Retired" && d !== null && d >= 0 && d <= CONFIG.warrantyDays; }
function serviceDue(a) { var d = daysTo(a.nextService); return a.status !== "Retired" && d !== null && d <= CONFIG.serviceDays; }
function value(a) {
  if (!a.price) return 0; if (!a.purchaseDate) return +a.price;
  var yrs = (Date.now() - new Date(a.purchaseDate)) / 31557600000;
  return Math.max(0, a.price * (1 - yrs / CONFIG.depreciationYears));
}
function statusClass(s) { return { "In use":"s-use","In stock":"s-stock","In repair":"s-repair","Retired":"s-retired" }[s] || "s-stock"; }
function dateHtml(d, soonDays) {
  var n = daysTo(d); if (n === null) return "";
  if (n < 0) return '<span class="w-out">' + esc(d) + '</span><small>' + (-n) + ' days ago</small>';
  if (n <= soonDays) return '<span class="w-soon">' + esc(d) + '</span><small>in ' + n + ' days</small>';
  return esc(d);
}

/* ---------- storage: PHP API when present, browser storage otherwise ---------- */
function api(r, body) {
  return fetch(CONFIG.api + "?r=" + r, {
    method: body ? "POST" : "GET", credentials: "same-origin",
    headers: { "Content-Type": "application/json", "X-Requested-With": "itam" },
    body: body ? JSON.stringify(body) : undefined
  }).then(function (res) {
    return res.json().then(function (j) {
      if (!res.ok) { var e = new Error(j.error || "Request failed"); e.status = res.status; throw e; }
      return j;
    });
  });
}
function lsSave() { try { localStorage.setItem(LS_KEY, JSON.stringify(S)); } catch (e) { toast("Browser storage is full or blocked."); } }
function pull() { return api("all").then(function (d) { S = d; render(); }).catch(fail); }
function addLog(id, msg) { S.log.unshift({ t: new Date().toISOString(), id: id, msg: msg }); S.log = S.log.slice(0, 200); }
function put(col, doc, msg) {
  if (remote) return api("save", { col: col, doc: doc, log: msg }).then(pull).catch(fail);
  var i = S[col].findIndex(function (x) { return x.id === doc.id; });
  if (i > -1) S[col][i] = doc; else S[col].push(doc);
  addLog(doc.id, msg); lsSave(); render(); return Promise.resolve();
}
function del(col, id, msg) {
  if (remote) return api("delete", { col: col, id: id, log: msg }).then(pull).catch(fail);
  S[col] = S[col].filter(function (x) { return x.id !== id; }); addLog(id, msg); lsSave(); render(); return Promise.resolve();
}
function sample() {
  var a = [
    ["Dell Latitude 5440","Laptop","DL5440-8K2Q","Amara Kollie","Admin office, Monrovia","In use",420,1100,-300,addDays(-10),addDays(4),addDays(120)],
    ["HP EliteDesk 800","Desktop","HP800-31JD","Computer Lab 2","Starz University","In use",180,780,-500,"","",addDays(20)],
    ["MikroTik hAP ac2","Network","MT-A7731X","","Server room","In stock",30,95,-200,"","",""],
    ["Huawei 4G CPE","Network","HW4G-5521","Group project","Starz University","In use",-40,120,-700,addDays(-30),addDays(-5),""],
    ["Lenovo ThinkPad T14","Laptop","LT14-90PX","","Repair bench","In repair",55,950,-600,"","",""],
    ["Epson L3250 Printer","Printer","EP-L32-0042","Front desk","Admin office, Monrovia","In use",260,260,-150,"","",addDays(60)],
    ["iPhone 12","Phone","IP12-FX93K","Nathan","Field","In use",-200,640,-900,addDays(-200),"",""],
    ["Acer Aspire 5","Laptop","AC5-77LM","","Storage","Retired",-500,520,-1500,"","",""]
  ];
  S.assets = a.map(function (r, i) {
    return { id: "AST-" + String(i + 1).padStart(4, "0"), name: r[0], category: r[1], serial: r[2], assignee: r[3], location: r[4], status: r[5],
      warranty: addDays(r[6]), price: r[7], purchaseDate: addDays(r[8]), checkedOut: r[9], due: r[10], nextService: r[11], notes: "", photo: "" };
  });
  S.licenses = [
    { id: "LIC-0001", name: "Microsoft 365 Business", vendor: "Microsoft", seats: 10, used: 9, expires: addDays(45), cost: 1500, notes: "" },
    { id: "LIC-0002", name: "Adobe Acrobat Pro", vendor: "Adobe", seats: 3, used: 4, expires: addDays(200), cost: 540, notes: "Over-allocated by one seat" }
  ];
  S.log = []; addLog("AST-0001", "Sample data loaded");
}

/* ---------- filtering ---------- */
function filtered() {
  var q = F.q.toLowerCase();
  var list = S.assets.filter(function (a) {
    if (F.cat && a.category !== F.cat) return false;
    if (F.status === "__overdue") { if (!overdue(a)) return false; }
    else if (F.status === "__warranty") { if (!warrantySoon(a)) return false; }
    else if (F.status === "__service") { if (!serviceDue(a)) return false; }
    else if (F.status && a.status !== F.status) return false;
    return !q || [a.id, a.name, a.serial, a.assignee, a.location, a.category].join(" ").toLowerCase().indexOf(q) > -1;
  });
  var k = F.sort;
  list.sort(function (x, y) { var a = x[k] || "", b = y[k] || ""; if (k === "warranty") { a = a || "9999"; b = b || "9999"; } return a < b ? -F.dir : a > b ? F.dir : 0; });
  return list;
}

/* ---------- rendering ---------- */
function renderStats() {
  var A = S.assets, n = function (s) { return A.filter(function (a) { return a.status === s; }).length; };
  var od = A.filter(overdue).length, ws = A.filter(warrantySoon).length, sv = A.filter(serviceDue).length;
  var items = [[A.length,"Total assets","",""],[n("In use"),"In use","In use",""],[n("In stock"),"In stock","In stock",""],[n("In repair"),"In repair","In repair",""],
    [od,"Overdue returns","__overdue",od ? " bad" : ""],[ws,"Warranty ending in " + CONFIG.warrantyDays + " days","__warranty",ws ? " alert" : ""],[sv,"Service due in " + CONFIG.serviceDays + " days","__service",sv ? " alert" : ""]];
  $("#stats").innerHTML = items.map(function (i) { return '<button type="button" class="stat' + i[3] + '" data-f="' + esc(i[2]) + '"><b>' + i[0] + '</b><span>' + i[1] + '</span></button>'; }).join("");
}
function renderAssets() {
  var list = filtered();
  $("#rows").innerHTML = list.map(function (a) {
    var id = esc(a.id), who = a.assignee ? esc(a.assignee) : '<span style="color:var(--muted)">Unassigned</span>';
    var out = a.status === "In use" && a.due ? '<small>Due back ' + dateHtml(a.due, 3) + '</small>' : "";
    var ticket = CONFIG.helpdesk + "?asset=" + encodeURIComponent(a.id);
    var guide = CONFIG.kb + "?s=" + encodeURIComponent(a.name);
    var thumb = a.photo ? '<img class="thumb" alt="" src="' + esc(a.photo) + '">' : "";
    var svc = a.nextService ? '<small>Service ' + dateHtml(a.nextService, CONFIG.serviceDays) + '</small>' : "";
    return '<tr><td class="tag">' + id + '</td><td>' + thumb + esc(a.name) + '<small>' + esc(a.category) + (a.serial ? " - " + esc(a.serial) : "") + '</small></td>' +
      '<td>' + who + (a.location ? '<small>' + esc(a.location) + '</small>' : "") + out + '</td>' +
      '<td><span class="chip ' + statusClass(a.status) + '">' + esc(a.status) + '</span></td>' +
      '<td>' + (a.warranty ? dateHtml(a.warranty, CONFIG.warrantyDays) : '<span style="color:var(--muted)">No warranty date</span>') + svc + '</td>' +
      '<td><div class="acts"><button class="btn sm" data-act="edit" data-id="' + id + '">' + (role === "admin" ? "Edit" : "View") + '</button>' +
      (a.status === "In use" && a.assignee ? '<button class="btn sm adm" data-act="return" data-id="' + id + '">Return</button>' : '<button class="btn sm adm" data-act="assign" data-id="' + id + '">Assign</button>') +
      '<a class="btn sm" href="' + ticket + '" target="_blank" rel="noopener">Open ticket</a>' +
      '<a class="btn sm" href="' + guide + '" target="_blank" rel="noopener">Fix guide</a>' +
      '<button class="btn sm" data-act="qr" data-id="' + id + '">QR</button>' +
      '<button class="btn sm danger adm" data-act="del" data-id="' + id + '">Delete</button></div></td></tr>';
  }).join("");
  $("#empty").hidden = list.length > 0;
  $("#empty").textContent = S.assets.length ? "No assets match. Clear the filters or add a new asset." : "No assets yet. Add your first asset or load sample data below.";
  $("#count").textContent = "Showing " + list.length + " of " + S.assets.length + " assets";
}
function renderLic() {
  $("#licRows").innerHTML = S.licenses.map(function (l) {
    var over = +l.used > +l.seats, id = esc(l.id);
    return '<tr><td class="tag">' + id + '</td><td>' + esc(l.name) + '<small>' + esc(l.vendor) + '</small></td>' +
      '<td>' + (over ? '<span class="w-out">' + esc(l.used) + ' of ' + esc(l.seats) + '</span><small>Over-allocated</small>' : esc(l.used) + ' of ' + esc(l.seats)) + '</td>' +
      '<td>' + dateHtml(l.expires, CONFIG.warrantyDays) + '</td><td>' + money(l.cost) + '</td>' +
      '<td><div class="acts"><button class="btn sm" data-lic="edit" data-id="' + id + '">' + (role === "admin" ? "Edit" : "View") + '</button><button class="btn sm danger adm" data-lic="del" data-id="' + id + '">Delete</button></div></td></tr>';
  }).join("");
  $("#licEmpty").hidden = S.licenses.length > 0;
}
function renderLog() {
  $("#logList").innerHTML = S.log.length ? S.log.map(function (l) { return '<li><span><b>' + esc(l.id) + '</b> ' + esc(l.msg) + '</span><time>' + new Date(l.t).toLocaleString() + '</time></li>'; }).join("") : "<li>No activity yet.</li>";
}
function table(head, rows) { return '<table style="min-width:0"><thead><tr>' + head.map(function (h) { return "<th>" + h + "</th>"; }).join("") + "</tr></thead><tbody>" + rows.join("") + "</tbody></table>"; }
function listOf(items, f) { return items.length ? "<ul>" + items.map(f).join("") + "</ul>" : '<span style="color:var(--muted)">Nothing to report.</span>'; }
function renderReport() {
  var A = S.assets, cost = 0, val = 0, byCat = {}, byStat = {};
  A.forEach(function (a) { cost += +a.price || 0; var v = value(a); val += v;
    var c = byCat[a.category] = byCat[a.category] || { n: 0, cost: 0, val: 0 }; c.n++; c.cost += +a.price || 0; c.val += v; byStat[a.status] = (byStat[a.status] || 0) + 1; });
  var licCost = S.licenses.reduce(function (s, l) { return s + (+l.cost || 0); }, 0);
  var card = function (n, l) { return '<div class="panel"><b style="font-size:24px">' + n + '</b><br><span style="color:var(--muted)">' + l + '</span></div>'; };
  var tagName = function (a) { return "<li><b>" + esc(a.id) + "</b> " + esc(a.name); };
  $("#report").innerHTML =
    '<div class="rcards">' + card(A.length, "Assets") + card(money(cost), "Purchase cost") + card(money(val), "Current value (" + CONFIG.depreciationYears + "-year straight line)") + card(money(licCost), "Licences per year") + '</div>' +
    '<div class="cols"><div class="panel"><h2>By category</h2>' + table(["Category","Count","Cost","Value"], Object.keys(byCat).sort().map(function (k) { var c = byCat[k]; return "<tr><td>" + esc(k) + "</td><td>" + c.n + "</td><td>" + money(c.cost) + "</td><td>" + money(c.val) + "</td></tr>"; })) + '</div>' +
    '<div class="panel"><h2>By status</h2>' + table(["Status","Count"], STATUSES.map(function (s) { return "<tr><td>" + s + "</td><td>" + (byStat[s] || 0) + "</td></tr>"; })) + '</div></div>' +
    '<div class="cols"><div class="panel"><h2>Overdue returns</h2>' + listOf(A.filter(overdue), function (a) { return tagName(a) + " - " + esc(a.assignee) + ", due " + esc(a.due) + "</li>"; }) + '</div>' +
    '<div class="panel"><h2>Warranty ending in ' + CONFIG.warrantyDays + ' days</h2>' + listOf(A.filter(warrantySoon), function (a) { return tagName(a) + " - " + esc(a.warranty) + "</li>"; }) + '</div>' +
    '<div class="panel"><h2>Service due in ' + CONFIG.serviceDays + ' days</h2>' + listOf(A.filter(serviceDue), function (a) { return tagName(a) + " - " + esc(a.nextService) + "</li>"; }) + '</div>' +
    '<div class="panel"><h2>Licence alerts</h2>' + listOf(S.licenses.filter(function (l) { var d = daysTo(l.expires); return +l.used > +l.seats || (d !== null && d <= CONFIG.warrantyDays); }),
      function (l) { var d = daysTo(l.expires), m = []; if (+l.used > +l.seats) m.push("over-allocated"); if (d !== null && d <= CONFIG.warrantyDays) m.push(d < 0 ? "expired" : "expires in " + d + " days"); return "<li><b>" + esc(l.id) + "</b> " + esc(l.name) + " - " + m.join(", ") + "</li>"; }) + '</div></div>' +
    '<p style="color:var(--muted);margin:0">Generated ' + new Date().toLocaleString() + '</p>';
}
function renderFilters() {
  $("#fStatus").innerHTML = '<option value="">All statuses</option>' + STATUSES.map(function (s) { return "<option>" + s + "</option>"; }).join("") +
    '<option value="__overdue">Overdue returns</option><option value="__warranty">Warranty ending soon</option><option value="__service">Service due</option>';
  $("#fCat").innerHTML = '<option value="">All categories</option>' + CATS.map(function (c) { return "<option>" + c + "</option>"; }).join("");
}
var hashDone = false;
function hashOpen() {
  if (hashDone) return; var m = /^#(AST-\d+)$/.exec(location.hash || "");
  if (!m) { hashDone = true; return; }
  var a = find("assets", m[1]); if (a && !$("#dlg").open) { hashDone = true; openEdit("assets", a); }
}
function render() {
  document.body.classList.toggle("ro", role !== "admin");
  $("#mode").textContent = remote ? "Signed in as " + role + ". Data is stored on the server." : "Demo mode: data is saved in this browser only. Upload the api folder for shared storage.";
  $("#outBtn").hidden = !remote;
  renderStats(); renderAssets(); renderLic(); renderLog(); if (view === "rep") renderReport(); hashOpen();
}
function showView(v) {
  view = v;
  document.querySelectorAll(".tabs button").forEach(function (t) { t.setAttribute("aria-selected", t.dataset.view === v); });
  ["assets","lic","rep","log"].forEach(function (x) { $("#v-" + x).hidden = x !== v; });
  $("#addBtn").textContent = v === "lic" ? "Add licence" : "Add asset";
  if (v === "rep") renderReport();
}

/* ---------- add / edit dialog ---------- */
function fieldHtml(f) {
  var k = f[0], l = f[1], t = f[2], full = (t === "textarea" || t === "photo") ? " full" : "";
  var inp = t === "select" ? '<select name="' + k + '">' + f[3].map(function (o) { return "<option>" + o + "</option>"; }).join("") + "</select>"
    : t === "textarea" ? '<textarea name="' + k + '" rows="2" maxlength="300"></textarea>'
    : t === "photo" ? '<input type="file" name="photoFile" accept="image/*"><img class="preview" id="prev" alt="" hidden><button type="button" class="btn sm" id="rmPhoto" hidden>Remove photo</button>'
    : '<input name="' + k + '" type="' + t + '"' + (t === "number" ? ' min="0" step="0.01"' : ' maxlength="80"') + '>';
  return '<label class="f' + full + '">' + l + inp + "</label>";
}
function setPhoto(src) { photoData = src || ""; var p = $("#prev"); if (!p) return; p.hidden = !photoData; if (photoData) p.src = photoData; $("#rmPhoto").hidden = !photoData; }
function openEdit(col, doc) {
  editCol = col; editing = doc ? doc.id : null; var fs = col === "assets" ? AF : LF, f = $("#form");
  $("#dTitle").textContent = (doc ? (role === "admin" ? "Edit " : "") + doc.id : col === "assets" ? "Add asset" : "Add licence");
  $("#fields").innerHTML = fs.map(fieldHtml).join(""); $("#err").hidden = true;
  fs.forEach(function (x) { if (x[2] !== "photo" && doc && doc[x[0]] != null) f.elements[x[0]].value = doc[x[0]]; });
  if (col === "assets") {
    setPhoto(doc && doc.photo);
    f.elements.photoFile.addEventListener("change", function (e) { resizeImage(e.target.files[0], setPhoto); });
    $("#rmPhoto").onclick = function () { setPhoto(""); };
  }
  var h = doc ? S.log.filter(function (l) { return l.id === doc.id; }).slice(0, 6) : [];
  $("#hist").hidden = !h.length; $("#hist").innerHTML = h.map(function (l) { return "<li>" + esc(l.msg) + " (" + new Date(l.t).toLocaleDateString() + ")</li>"; }).join("");
  $("#dlg").showModal();
  if (role !== "admin") [].forEach.call(f.elements, function (el) { el.disabled = el.type !== "button" && el.type !== "submit"; });
}
function resizeImage(file, cb) {
  if (!file) return; var img = new Image(), url = URL.createObjectURL(file);
  img.onload = function () {
    var s = Math.min(1, 320 / Math.max(img.width, img.height)), c = document.createElement("canvas");
    c.width = Math.round(img.width * s); c.height = Math.round(img.height * s); c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
    URL.revokeObjectURL(url); cb(c.toDataURL("image/jpeg", 0.72));
  };
  img.onerror = function () { URL.revokeObjectURL(url); toast("That file is not a readable image."); };
  img.src = url;
}
function showErr(m) { $("#err").textContent = m; $("#err").hidden = false; }
$("#form").addEventListener("submit", function (e) {
  e.preventDefault(); if (role !== "admin") return;
  var f = e.target, fs = editCol === "assets" ? AF : LF, v = {};
  fs.forEach(function (x) { if (x[2] === "photo") return; var val = f.elements[x[0]].value.trim(); v[x[0]] = x[2] === "number" ? (val === "" ? "" : Number(val)) : val; });
  if (!v.name) return showErr("Enter a name.");
  if (editCol === "assets") {
    if (v.serial && S.assets.some(function (a) { return a.serial && a.serial.toLowerCase() === v.serial.toLowerCase() && a.id !== editing; })) return showErr("That serial number already belongs to another asset.");
    if (v.status === "In use" && !v.assignee) return showErr("An asset in use needs a person or team in Assigned to.");
    if (v.status !== "In use" && v.status !== "In repair") { v.assignee = ""; v.checkedOut = ""; v.due = ""; }
    if (v.checkedOut && v.due && v.due < v.checkedOut) return showErr("Due back must be on or after the check-out date.");
    v.photo = photoData;
  } else if (v.seats === "" || v.used === "" || v.seats < 0 || v.used < 0) return showErr("Enter seats bought and seats in use as numbers.");
  var old = editing ? find(editCol, editing) : null, doc = Object.assign({}, old || {}, v);
  if (!editing) doc.id = nextId(editCol);
  var ch = old ? Object.keys(v).filter(function (k) { return k !== "photo" ? old[k] !== v[k] : (old.photo || "") !== v.photo; }) : [];
  $("#dlg").close();
  put(editCol, doc, old ? (ch.length ? "Updated " + ch.join(", ") : "Saved with no changes") : "Added " + doc.name).then(function () { toast("Saved " + doc.id); });
});
$("#cancel").onclick = function () { $("#dlg").close(); };

/* ---------- row actions ---------- */
$("#rows").addEventListener("click", function (e) {
  var b = e.target.closest("button[data-act]"); if (!b) return; var a = find("assets", b.dataset.id); if (!a) return; var act = b.dataset.act;
  if (act === "edit") return openEdit("assets", a);
  if (act === "qr") return showLabels([a]);
  if (role !== "admin") return; a = Object.assign({}, a);
  if (act === "assign") {
    var who = prompt("Assign " + a.id + " to (name or team):", a.assignee || ""); if (!who || !who.trim()) return;
    var days = prompt("Days until it is due back (leave empty for no due date):", "14"); if (days === null) return;
    a.assignee = who.trim(); a.status = "In use"; a.checkedOut = today(); a.due = days.trim() && !isNaN(days) ? addDays(Number(days)) : "";
    put("assets", a, "Checked out to " + a.assignee + (a.due ? ", due " + a.due : ""));
  } else if (act === "return") {
    var was = a.assignee; a.assignee = ""; a.status = "In stock"; a.checkedOut = ""; a.due = ""; put("assets", a, "Returned by " + was);
  } else if (act === "del" && confirm("Delete " + a.id + " (" + a.name + ")? This cannot be undone.")) del("assets", a.id, "Deleted " + a.name);
});
$("#licRows").addEventListener("click", function (e) {
  var b = e.target.closest("button[data-lic]"); if (!b) return; var l = find("licenses", b.dataset.id); if (!l) return;
  if (b.dataset.lic === "edit") openEdit("licenses", l);
  else if (role === "admin" && confirm("Delete " + l.id + " (" + l.name + ")?")) del("licenses", l.id, "Deleted " + l.name);
});
$("#addBtn").onclick = function () { openEdit(view === "lic" ? "licenses" : "assets", null); };
$("#stats").addEventListener("click", function (e) { var b = e.target.closest(".stat"); if (!b) return; F.status = b.dataset.f; $("#fStatus").value = F.status; showView("assets"); renderAssets(); });
$("#q").addEventListener("input", function (e) { F.q = e.target.value; renderAssets(); });
$("#fStatus").addEventListener("change", function (e) { F.status = e.target.value; renderAssets(); });
$("#fCat").addEventListener("change", function (e) { F.cat = e.target.value; renderAssets(); });
document.querySelector("thead").addEventListener("click", function (e) { var b = e.target.closest("button[data-sort]"); if (!b) return; if (F.sort === b.dataset.sort) F.dir *= -1; else { F.sort = b.dataset.sort; F.dir = 1; } renderAssets(); });
document.querySelector(".tabs").addEventListener("click", function (e) { var b = e.target.closest("button"); if (b) showView(b.dataset.view); });

/* ---------- QR labels ---------- */
function showLabels(list) {
  if (!list.length) return toast("No assets to label.");
  var g = $("#lblGrid"); g.innerHTML = "";
  list.forEach(function (a) {
    var d = document.createElement("div"), q = document.createElement("div"), t = document.createElement("div"); d.className = "lbl";
    t.innerHTML = "<b>" + esc(a.id) + "</b><br>" + esc(a.name) + (a.serial ? "<br><small>" + esc(a.serial) + "</small>" : "");
    d.appendChild(q); d.appendChild(t); g.appendChild(d);
    try { new QRCode(q, { text: location.href.split("#")[0] + "#" + a.id, width: 92, height: 92, correctLevel: QRCode.CorrectLevel.M }); } catch (err) { q.textContent = "QR unavailable"; }
  });
  $("#lbl").showModal();
}
function printWith(cls) { document.body.classList.add(cls); window.print(); setTimeout(function () { document.body.classList.remove(cls); }, 500); }
$("#lblBtn").onclick = function () { showLabels(filtered()); };
$("#lblClose").onclick = function () { $("#lbl").close(); };
$("#lblPrint").onclick = function () { printWith("printing-labels"); };
$("#prtRep").onclick = function () { printWith("printing-report"); };
function saveFile(name, text, type) {
  var u = URL.createObjectURL(new Blob([text], { type: type })), a = document.createElement("a");
  a.href = u; a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(u); }, 1000);
}
$("#lblSave").onclick = function () {
  var cells = [].map.call(document.querySelectorAll("#lblGrid .lbl"), function (l) {
    var im = l.querySelector("img"), cv = l.querySelector("canvas"), src = im && im.src.indexOf("data:") === 0 ? im.src : (cv ? cv.toDataURL() : "");
    return '<div class="l"><img src="' + src + '" width="92" height="92"><div>' + l.lastChild.innerHTML + "</div></div>"; });
  saveFile("asset-labels.html", '<!doctype html><meta charset="utf-8"><title>Asset labels</title><style>body{font:14px sans-serif;display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin:12px}.l{border:1px solid #000;padding:8px;display:flex;gap:8px;align-items:center;break-inside:avoid}</style>' + cells.join(""), "text/html");
};

/* ---------- CSV export and import ---------- */
function csvCell(v) { return '"' + String(v == null ? "" : v).replace(/"/g, '""') + '"'; }
$("#csvBtn").onclick = function () {
  var keys = ["id"].concat(AF.filter(function (f) { return f[2] !== "photo"; }).map(function (f) { return f[0]; }));
  var rows = [keys.join(",")].concat(filtered().map(function (a) { return keys.map(function (k) { return csvCell(a[k]); }).join(","); }));
  saveFile("assets.csv", rows.join("\n"), "text/csv"); toast("Exported " + (rows.length - 1) + " assets.");
};
function parseCSV(t) {
  var rows = [], r = [], f = "", q = false, i, c;
  for (i = 0; i < t.length; i++) { c = t[i];
    if (q) { if (c === '"') { if (t[i + 1] === '"') { f += '"'; i++; } else q = false; } else f += c; }
    else if (c === '"') q = true; else if (c === ",") { r.push(f); f = ""; }
    else if (c === "\n" || c === "\r") { if (c === "\r" && t[i + 1] === "\n") i++; r.push(f); rows.push(r); r = []; f = ""; } else f += c; }
  if (f !== "" || r.length) { r.push(f); rows.push(r); }
  return rows.filter(function (x) { return x.some(Boolean); });
}
$("#impBtn").onclick = function () { $("#impFile").click(); };
$("#impFile").addEventListener("change", function (e) {
  var file = e.target.files[0]; e.target.value = ""; if (!file) return;
  file.text().then(function (txt) {
    var rows = parseCSV(txt); if (rows.length < 2) return toast("The file needs a header row and at least one asset.");
    if (rows.length > 501) return toast("Import up to 500 assets at a time.");
    var map = {}; rows[0].forEach(function (h, i) { var s = h.trim().toLowerCase(); AF.forEach(function (f) { if (f[0].toLowerCase() === s || f[1].toLowerCase() === s) map[f[0]] = i; }); });
    if (map.name === undefined) return toast("The header row must include a Name column.");
    var made = [], skipped = 0, serials = {}; S.assets.forEach(function (a) { if (a.serial) serials[a.serial.toLowerCase()] = 1; });
    var n = parseInt(nextId("assets").slice(4), 10);
    rows.slice(1).forEach(function (r) {
      var a = { photo: "" }; AF.forEach(function (f) { if (f[2] === "photo") return; var v = map[f[0]] === undefined ? "" : (r[map[f[0]]] || "").trim(); a[f[0]] = f[2] === "number" ? (v === "" ? "" : Number(v)) : v; });
      if (!a.name || (a.serial && serials[a.serial.toLowerCase()])) { skipped++; return; }
      if (CATS.indexOf(a.category) < 0) a.category = "Other"; if (STATUSES.indexOf(a.status) < 0) a.status = a.assignee ? "In use" : "In stock";
      if (a.serial) serials[a.serial.toLowerCase()] = 1; a.id = "AST-" + String(n++).padStart(4, "0"); made.push(a);
    });
    if (!made.length) return toast("Nothing imported. " + skipped + " rows were blank or had duplicate serials.");
    var done = remote ? made.reduce(function (p, a) { return p.then(function () { return api("save", { col: "assets", doc: a, log: "Imported from CSV" }); }); }, Promise.resolve()).then(pull)
      : (made.forEach(function (a) { S.assets.push(a); addLog(a.id, "Imported from CSV"); }), lsSave(), render(), Promise.resolve());
    done.then(function () { toast("Imported " + made.length + " assets" + (skipped ? ", skipped " + skipped : "") + "."); }).catch(fail);
  });
});
$("#sampleBtn").onclick = function () {
  if (role !== "admin") return;
  if (remote) return toast("On the server, load sample-import.csv with Import CSV.");
  if (confirm("Replace everything with the sample data?")) { sample(); lsSave(); render(); toast("Sample data loaded."); }
};

/* ---------- sign in ---------- */
function showLogin() { $("#pw").value = ""; $("#loginErr").hidden = true; if (!$("#login").open) $("#login").showModal(); $("#pw").focus(); }
$("#loginForm").addEventListener("submit", function (e) {
  e.preventDefault();
  api("login", { password: $("#pw").value }).then(function (j) { role = j.role; $("#login").close(); return pull(); })
    .catch(function (err) { $("#loginErr").textContent = err.message === "Wrong password" ? "Wrong password. Try again." : "Could not sign in: " + err.message; $("#loginErr").hidden = false; });
});
$("#outBtn").onclick = function () { api("logout", {}).then(function () { role = "viewer"; S = { assets: [], licenses: [], log: [] }; render(); showLogin(); }); };
$("#login").addEventListener("cancel", function (e) { e.preventDefault(); });

/* ---------- start ---------- */
$("#lnkHelp").href = CONFIG.helpdesk; $("#lnkKb").href = CONFIG.kb;
renderFilters();
api("session").then(function (j) {
  remote = true; role = j.role; if (!role) { render(); return showLogin(); } return pull();
}).catch(function () {
  remote = false; role = "admin";
  try { var s = JSON.parse(localStorage.getItem(LS_KEY)); if (s && s.assets) S = s; } catch (e) {}
  if (!S.assets.length && !localStorage.getItem(LS_KEY)) { sample(); lsSave(); }
  render();
});
})();
