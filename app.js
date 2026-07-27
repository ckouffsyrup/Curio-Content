const RARITIES = ["Common","Uncommon","Rare","Epic","Legendary","Mythic"];
const DB_NAME = "setsmith-web";
const STORE = "projects";
const AUTOSAVE_KEY = "current";
const $ = (id) => document.getElementById(id);

let project = createBlankProject();
let activeUid = null;
let saveTimer = null;
let dirty = false;

function uid() {
  return crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
}
function slugify(v) {
  return (v || "").toLowerCase().trim().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "").replace(/_+/g, "_") || "curio";
}
function exportFolderName(v) {
  return (v || "")
    .trim()
    .replace(/[<>:"/\\|?*]+/g, "")
    .replace(/\s+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "") || "Curio_Set";
}
function cleanName(filename) {
  return filename.replace(/\.[^.]+$/, "")
    .replace(/^\d+px[-_ ]*/i, "")
    .replace(/[-_]+/g, " ")
    .replace(/\b(icon|image|img|final|transparent|render)\b/gi, "")
    .replace(/\s+/g, " ").trim()
    .replace(/\b\w/g, c => c.toUpperCase()) || "Untitled Curio";
}
function createBlankProject() {
  return {
    format: "setsmith-web-project",
    format_version: 1,
    app_version: "0.2.1",
    set: { name: "New Set", id: "new_set", description: "", version: 1, boost_multiplier: 1, icon: null },
    items: []
  };
}
function fileToData(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve({ name: file.name, type: file.type || "application/octet-stream", data: r.result });
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}
function dataUrlToBlob(dataUrl) {
  const [head, data] = dataUrl.split(",");
  const mime = (head.match(/data:(.*?);/) || [])[1] || "application/octet-stream";
  const binary = atob(data);
  const arr = new Uint8Array(binary.length);
  for (let i=0;i<binary.length;i++) arr[i] = binary.charCodeAt(i);
  return new Blob([arr], {type:mime});
}
function download(blob, filename) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}
function toast(message) {
  $("toast").textContent = message;
  $("toast").classList.remove("hidden");
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => $("toast").classList.add("hidden"), 2600);
}
function markDirty() {
  dirty = true;
  $("dirtyBadge").classList.remove("hidden");
  $("saveStatus").textContent = "Saving locally…";
  clearTimeout(saveTimer);
  saveTimer = setTimeout(autosave, 550);
}
async function autosave() {
  try {
    await idbPut(AUTOSAVE_KEY, project);
    dirty = false;
    $("dirtyBadge").classList.add("hidden");
    $("saveStatus").textContent = `Saved locally at ${new Date().toLocaleTimeString([], {hour:"numeric",minute:"2-digit"})}`;
  } catch (e) {
    $("saveStatus").textContent = "Local save failed";
  }
}
function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
async function idbPut(key, value) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(value, key);
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
}
async function idbGet(key) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const req = db.transaction(STORE).objectStore(STORE).get(key);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
function syncFormFromProject() {
  $("setName").value = project.set.name;
  $("setId").value = project.set.id;
  $("setDescription").value = project.set.description || "";
  $("setVersion").value = project.set.version ?? 1;
  $("boost").value = project.set.boost_multiplier ?? 1;
  renderIcon();
  renderAll();
}
function syncProjectFromSetForm() {
  project.set.name = $("setName").value;
  project.set.id = slugify($("setId").value);
  project.set.description = $("setDescription").value;
  project.set.version = Math.max(1, Number.parseInt($("setVersion").value || "1",10));
  project.set.boost_multiplier = Number.parseFloat($("boost").value || "1");
  markDirty();
  updateValidation();
}
function renderIcon() {
  const icon = project.set.icon;
  if (icon?.data) {
    $("iconPreview").src = icon.data;
    $("iconPreview").hidden = false;
    $("iconEmpty").classList.add("hidden");
  } else {
    $("iconPreview").hidden = true;
    $("iconEmpty").classList.remove("hidden");
  }
}
function filteredItems() {
  const q = $("searchInput").value.trim().toLowerCase();
  const rarity = $("rarityFilter").value;
  const status = $("statusFilter").value;
  return project.items.filter(i =>
    (!q || i.name.toLowerCase().includes(q) || i.id.toLowerCase().includes(q)) &&
    (rarity === "All rarities" || i.rarity === rarity) &&
    (status === "All statuses" || (status === "Enabled" ? i.enabled : !i.enabled))
  );
}
function renderAll() {
  renderCards();
  renderStats();
  updateValidation();
}
function renderCards() {
  const cards = $("cards");
  cards.innerHTML = "";
  const items = filteredItems();
  $("galleryTitle").textContent = items.length === project.items.length
    ? `Curios (${project.items.length})`
    : `Curios (${items.length} of ${project.items.length})`;
  $("emptyState").classList.toggle("hidden", project.items.length > 0);
  cards.classList.toggle("hidden", project.items.length === 0);

  for (const item of items) {
    const card = document.createElement("article");
    card.className = `curio-card${item.enabled ? "" : " disabled"}`;
    card.dataset.uid = item.uid;
    card.innerHTML = `
      <button class="card-menu" aria-label="Edit ${escapeHtml(item.name)}">⋯</button>
      <img src="${item.image.data}" alt="">
      <div class="card-body">
        <div class="card-name">${escapeHtml(item.name)}</div>
        <div class="card-id">${escapeHtml(item.id)}</div>
        <div class="card-meta">
          <span class="rarity-pill">${escapeHtml(item.rarity)}</span>
          <span class="status-pill">${item.enabled ? "Enabled" : "Disabled"}</span>
        </div>
      </div>`;
    card.addEventListener("click", () => openEditor(item.uid));
    cards.appendChild(card);
  }
}
function renderStats() {
  $("statTotal").textContent = project.items.length;
  $("statEnabled").textContent = project.items.filter(i=>i.enabled).length;
  $("statDisabled").textContent = project.items.filter(i=>!i.enabled).length;
  const counts = Object.fromEntries(RARITIES.map(r=>[r,0]));
  project.items.forEach(i => counts[i.rarity] = (counts[i.rarity] || 0) + 1);
  $("rarityStats").innerHTML = RARITIES.map(r => `<div class="rarity-line"><span>${r}</span><strong>${counts[r]}</strong></div>`).join("");
}
function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
function openEditor(id) {
  activeUid = id;
  const item = project.items.find(i=>i.uid===id);
  if (!item) return;
  $("editorHeading").textContent = item.name;
  $("editorPreview").src = item.image.data;
  $("itemName").value = item.name;
  $("itemId").value = item.id;
  $("itemRarity").value = item.rarity;
  $("itemDescription").value = item.description || "";
  $("itemEnabled").checked = !!item.enabled;
  $("editor").classList.add("open");
  $("editor").setAttribute("aria-hidden","false");
  $("editorBackdrop").classList.remove("hidden");
}
function closeEditor() {
  activeUid = null;
  $("editor").classList.remove("open");
  $("editor").setAttribute("aria-hidden","true");
  $("editorBackdrop").classList.add("hidden");
}
function updateActive() {
  const item = project.items.find(i=>i.uid===activeUid);
  if (!item) return;
  item.name = $("itemName").value;
  item.id = slugify($("itemId").value);
  item.rarity = $("itemRarity").value;
  item.description = $("itemDescription").value;
  item.enabled = $("itemEnabled").checked;
  $("editorHeading").textContent = item.name || "Curio";
  markDirty();
  renderAll();
}
async function addImages(files) {
  const accepted = [...files].filter(f=>f.type.startsWith("image/"));
  if (!accepted.length) return;
  const used = new Set(project.items.map(i=>i.id));
  for (const file of accepted) {
    const image = await fileToData(file);
    const base = slugify(cleanName(file.name));
    let id = base, n=2;
    while (used.has(id)) id = `${base}_${n++}`;
    used.add(id);
    project.items.push({
      uid: uid(), filename: file.name, id, name: cleanName(file.name),
      rarity: "Common", description: "", enabled: true, image
    });
  }
  markDirty();
  renderAll();
  toast(`Added ${accepted.length} Curio${accepted.length===1?"":"s"}`);
}
function validate() {
  const errors = [];
  if (!project.set.name.trim()) errors.push("Set name is missing.");
  if (!project.set.icon?.data) errors.push("Choose a set icon.");
  if (!project.items.length) errors.push("Add at least one Curio.");
  const ids = new Set(), names = new Set();
  for (const i of project.items) {
    if (!i.name.trim()) errors.push("A Curio has no display name.");
    if (ids.has(i.id)) errors.push(`Duplicate ID: ${i.id}`);
    ids.add(i.id);
    const fn = i.filename.toLowerCase();
    if (names.has(fn)) errors.push(`Duplicate filename: ${i.filename}`);
    names.add(fn);
  }
  return errors;
}
function updateValidation() {
  const errors = validate();
  $("validationBanner").classList.toggle("hidden", errors.length===0);
  $("validationBanner").textContent = errors.length ? `${errors.length} issue${errors.length===1?"":"s"} before export: ${errors.slice(0,3).join(" · ")}` : "";
  $("exportBtn").textContent = errors.length ? `Fix ${errors.length} issue${errors.length===1?"":"s"}` : "Export set ZIP";
}
async function exportZip() {
  syncProjectFromSetForm();
  const errors = validate();
  if (errors.length) {
    toast(errors[0]);
    $("validationBanner").scrollIntoView({behavior:"smooth",block:"center"});
    return;
  }
  if (!window.JSZip) {
    toast("ZIP library did not load. Check your internet connection and reload.");
    return;
  }
  const zip = new JSZip();
  // The exported folder/ZIP uses underscores for GitHub-friendly paths,
  // while set.json keeps the original display name with spaces.
  const folderName = exportFolderName(project.set.name);
  const folder = zip.folder(folderName);
  const iconName = `icon.${extensionFor(project.set.icon.name, project.set.icon.type)}`;
  folder.file(iconName, dataUrlToBlob(project.set.icon.data));
  const imagesFolder = folder.folder("images");
  for (const i of project.items) imagesFolder.file(i.filename, dataUrlToBlob(i.image.data));

  const setId = slugify(project.set.id);
  const setJson = {
    format_version: 1, id: setId, name: project.set.name.trim(),
    description: project.set.description || "", version: Number(project.set.version) || 1,
    icon: iconName, curios: "curios.json", boost_multiplier: Number(project.set.boost_multiplier) || 1
  };
  const curiosJson = {
    format_version: 1, set_id: setId,
    curios: project.items.map(i=>({
      id:i.id, name:i.name, rarity:i.rarity, description:i.description || "",
      image:`images/${i.filename}`, enabled:!!i.enabled
    }))
  };
  folder.file("set.json", JSON.stringify(setJson,null,2));
  folder.file("curios.json", JSON.stringify(curiosJson,null,2));
  toast("Building ZIP…");
  const blob = await zip.generateAsync({type:"blob", compression:"DEFLATE", compressionOptions:{level:6}});
  download(blob, `${folderName}.zip`);
  toast("Set ZIP downloaded");
}
function extensionFor(name, type) {
  const ext = (name || "").split(".").pop().toLowerCase();
  if (["png","jpg","jpeg","webp","gif","bmp"].includes(ext)) return ext;
  return type === "image/jpeg" ? "jpg" : type === "image/webp" ? "webp" : "png";
}
function saveProjectFile() {
  syncProjectFromSetForm();
  const blob = new Blob([JSON.stringify(project)], {type:"application/json"});
  const name = `${slugify(project.set.name || "set")}.setsmith`;
  download(blob, name);
  autosave();
  toast("Portable project downloaded");
}
async function openProjectFile(file) {
  try {
    const loaded = JSON.parse(await file.text());
    if (loaded.format === "setsmith-web-project" && Array.isArray(loaded.items)) {
      project = loaded;
    } else if (loaded.set && Array.isArray(loaded.items)) {
      const hasEmbedded = loaded.items.every(i => i.image?.data);
      if (!hasEmbedded) throw new Error("This desktop project only stores file paths. Open it on the PC and import the exported set into the web version.");
      project = loaded;
    } else throw new Error("Not a valid SetSmith Web project.");
    closeEditor();
    syncFormFromProject();
    markDirty();
    toast(`Opened ${file.name}`);
  } catch (e) {
    toast(e.message || "Could not open that project");
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  const saved = await idbGet(AUTOSAVE_KEY).catch(()=>null);
  if (saved?.set && Array.isArray(saved.items)) project = saved;
  syncFormFromProject();

  ["setName","setDescription","setVersion","boost"].forEach(id => $(id).addEventListener("input", syncProjectFromSetForm));
  $("setId").addEventListener("input", syncProjectFromSetForm);
  $("setName").addEventListener("input", () => {
    if ($("setId").value === "new_set" || !$("setId").dataset.edited) $("setId").value = slugify($("setName").value);
  });
  $("setId").addEventListener("input", () => $("setId").dataset.edited = "true");

  $("iconInput").addEventListener("change", async e => {
    if (!e.target.files[0]) return;
    project.set.icon = await fileToData(e.target.files[0]);
    renderIcon(); markDirty(); updateValidation();
  });
  $("imageInput").addEventListener("change", e => addImages(e.target.files));
  const dz = $("dropZone");
  ["dragenter","dragover"].forEach(type => dz.addEventListener(type, e => {e.preventDefault(); dz.classList.add("dragging")}));
  ["dragleave","drop"].forEach(type => dz.addEventListener(type, e => {e.preventDefault(); dz.classList.remove("dragging")}));
  dz.addEventListener("drop", e => addImages(e.dataTransfer.files));

  ["searchInput","rarityFilter","statusFilter"].forEach(id => $(id).addEventListener(id==="searchInput"?"input":"change", renderCards));

  ["itemName","itemId","itemDescription"].forEach(id => $(id).addEventListener("input", updateActive));
  ["itemRarity","itemEnabled"].forEach(id => $(id).addEventListener("change", updateActive));
  $("closeEditorBtn").addEventListener("click", closeEditor);
  $("editorBackdrop").addEventListener("click", closeEditor);
  $("removeBtn").addEventListener("click", () => {
    const item = project.items.find(i=>i.uid===activeUid);
    if (!item || !confirm(`Remove "${item.name}" from this project?`)) return;
    project.items = project.items.filter(i=>i.uid!==activeUid);
    closeEditor(); markDirty(); renderAll();
  });
  $("duplicateBtn").addEventListener("click", () => {
    const item = project.items.find(i=>i.uid===activeUid);
    if (!item) return;
    const copy = structuredClone(item);
    copy.uid = uid();
    copy.name += " Copy";
    copy.id = slugify(copy.name);
    let n=2, base=copy.id;
    while (project.items.some(i=>i.id===copy.id)) copy.id=`${base}_${n++}`;
    project.items.push(copy);
    closeEditor(); markDirty(); renderAll(); toast("Curio duplicated");
  });

  $("newBtn").addEventListener("click", () => {
    if (project.items.length && !confirm("Start a new project? Your current project is saved locally and can also be downloaded first.")) return;
    project = createBlankProject(); activeUid=null; $("setId").dataset.edited=""; syncFormFromProject(); markDirty();
  });
  $("saveProjectBtn").addEventListener("click", saveProjectFile);
  $("projectInput").addEventListener("change", e => e.target.files[0] && openProjectFile(e.target.files[0]));
  $("exportBtn").addEventListener("click", exportZip);

  window.addEventListener("beforeunload", () => { if (dirty) autosave(); });
});
