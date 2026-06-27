(() => {
const supabaseUrl = "https://fdxnoirzzmmhqexhrttn.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZkeG5vaXJ6em1taHFleGhydHRuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY4ODAyMTcsImV4cCI6MjA5MjQ1NjIxN30.4J6xKeQrj-OK34FaCdEHAsbgnONxv-JV8XUrgyhr4v4";
let sb = null;
let currentUser = null;

const menuBtn = document.getElementById("menuBtn");
const siteNav = document.getElementById("siteNav");
const reportForm = document.getElementById("reportForm");
const reportList = document.getElementById("reportList");
const placesList = document.getElementById("placesList");
const topContributors = document.getElementById("topContributors");
const achievementSummary = document.getElementById("achievementSummary");

const shymkentPlaces = [
{ name: "Secondary Raw Materials Point", address: "56 Kaldaiakov Street, Shymkent", lat: 42.3168, lng: 69.5964 },
{ name: "Korkem Plast Collection Point", address: "20B/7 Tamerlanovskoye Highway, Shymkent", lat: 42.363, lng: 69.528 },
{ name: "Makulatura Center (IP Ksemaks)", address: "117/1 Ilyaev Street, Shymkent", lat: 42.3125, lng: 69.5858 },
{ name: "Recycling Point (Yntymak)", address: "47/7 Yntymak, Shymkent", lat: 42.2896, lng: 69.5654 },
{ name: "Category DM Waste Utilization", address: "86 Gani Ilyaev Street, Shymkent", lat: 42.3118, lng: 69.5874 },
{ name: "KazMetalTrade", address: "26 Cement Plant Site, Shymkent", lat: 42.3532, lng: 69.5216 },
];

function escapeHTML(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

if (menuBtn && siteNav) {
menuBtn.addEventListener("click", () => siteNav.classList.toggle("open"));
siteNav.querySelectorAll("a").forEach((link) => {
link.addEventListener("click", () => siteNav.classList.remove("open"));
});
}

function initMap() {
const mapRoot = document.getElementById("cityMap");
if (!mapRoot) return;
if (typeof L === "undefined") { setTimeout(initMap, 300); return; }
const map = L.map(mapRoot).setView([42.3417, 69.5901], 11);
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
maxZoom: 18, attribution: "© OpenStreetMap contributors",
}).addTo(map);
shymkentPlaces.forEach((place) => {
L.marker([place.lat, place.lng]).addTo(map)
.bindPopup(`<strong>${escapeHTML(place.name)}</strong><br>${escapeHTML(place.address)}`);
});
}

function renderPlaces() {
if (!placesList) return;
placesList.innerHTML = "";
shymkentPlaces.forEach((place) => {
const item = document.createElement("li");
item.textContent = `${place.name} - ${place.address}`;
placesList.appendChild(item);
});
}

function formatTime(ts) {
if (!ts) return "";
const d = new Date(ts);
const now = new Date();
const diff = Math.floor((now - d) / 1000);
if (diff < 60) return "just now";
if (diff < 3600) return Math.floor(diff / 60) + "m ago";
if (diff < 86400) return Math.floor(diff / 3600) + "h ago";
if (diff < 604800) return Math.floor(diff / 86400) + "d ago";
return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

async function fetchReports() {
if (!sb) return [];
const { data, error } = await sb.from("reports")
  .select("*")
  .order("created_at", { ascending: false })
  .limit(20); 
if (error) { console.error("Fetch error:", error.message); return []; }
return data || [];
}

async function updateReportStatus(reportId, newStatus) {
if (!sb) return;
const { error } = await sb.from("reports").update({ status: newStatus }).eq("id", reportId);
if (error) {
  alert("Error updating status: " + error.message);
  console.error("Status error:", error.message);
}
}

async function saveComments(reportId, comments) {
if (!sb) return;
const { error } = await sb.from("reports").update({ comments }).eq("id", reportId);
if (error) console.error("Save comments error:", error.message);
}

async function getComments(reportId) {
if (!sb) return [];
const { data, error } = await sb.from("reports").select("comments").eq("id", reportId).single();
if (error) return [];
return Array.isArray(data?.comments) ? data.comments : [];
}

function renderComment(c, reportId, allComments) {
const isOwner = currentUser && (currentUser.user_metadata?.full_name === c.author || currentUser.email === c.author);
const likes = c.likes || 0;
const likedBy = c.likedBy || [];
const hasLiked = currentUser && likedBy.includes(currentUser.email);
const replyCount = allComments.filter(r => r.parentId === c.id).length;

const div = document.createElement("div");
div.className = "comment-item";
div.dataset.commentId = c.id;

div.innerHTML = `
  <div class="comment-avatar">${escapeHTML((c.author || "A").charAt(0).toUpperCase())}</div>
  <div class="comment-body">
    <div class="comment-header">
      <span class="comment-author">${escapeHTML(c.author || "Anonymous")}</span>
      <span class="comment-time">${formatTime(c.createdAt)}</span>
      ${isOwner ? `<button class="comment-delete" data-id="${c.id}" title="Delete">✕</button>` : ""}
    </div>
    <div class="comment-text">${escapeHTML(c.text || "")}</div>
    <div class="comment-actions">
      <button class="comment-like ${hasLiked ? "liked" : ""}" data-id="${c.id}">
        <span class="like-icon">${hasLiked ? "❤️" : "🤍"}</span>
        <span class="like-count">${likes}</span>
      </button>
      <a class="comment-reply-btn" href="comments.html?report=${reportId}&comment=${c.id}">
        ↩ Reply${replyCount > 0 ? ` · <span class="reply-count">${replyCount} repl${replyCount === 1 ? "y" : "ies"}</span>` : ""}
      </a>
    </div>
  </div>
`;

div.querySelector(".comment-like").addEventListener("click", async (e) => {
  if (!currentUser) { alert("Please login to like comments."); return; }
  const btn = e.currentTarget;
  btn.disabled = true;
  
  const comments = await getComments(reportId);
  const idx = comments.findIndex(x => x.id === c.id);
  if (idx === -1) { btn.disabled = false; return; }
  
  const email = currentUser.email;
  const lb = comments[idx].likedBy || [];
  if (lb.includes(email)) {
    comments[idx].likedBy = lb.filter(e => e !== email);
    comments[idx].likes = Math.max(0, (comments[idx].likes || 1) - 1);
  } else {
    comments[idx].likedBy = [...lb, email];
    comments[idx].likes = (comments[idx].likes || 0) + 1;
  }
  await saveComments(reportId, comments);
  await renderReports();
});

const delBtn = div.querySelector(".comment-delete");
if (delBtn) {
  delBtn.addEventListener("click", async (e) => {
    if (!confirm("Delete this comment and all its replies?")) return;
    e.currentTarget.disabled = true;
    const comments = await getComments(reportId);
    const toDelete = new Set();
    const collect = (id) => {
      toDelete.add(id);
      comments.filter(x => x.parentId === id).forEach(x => collect(x.id));
    };
    collect(c.id);
    await saveComments(reportId, comments.filter(x => !toDelete.has(x.id)));
    await renderReports();
  });
}

return div;
}

function renderReportList(reports) {
if (!reportList) return;
reportList.innerHTML = "";
if (!reports.length) {
reportList.innerHTML = "<li>No reports yet. Be the first to add one.</li>";
return;
}

reports.forEach((report) => {
  const item = document.createElement("li");
  item.className = "report-item";
  const status = report.status || "open";
  const statusClass = status === "completed" ? "status-completed" : status === "in_progress" ? "status-progress" : "status-open";
  const allComments = Array.isArray(report.comments) ? report.comments : [];
  const topComments = allComments.filter(c => !c.parentId);

  const safePhotoSrc = report.photo || ""; 

  const isAuthor = currentUser && currentUser.user_metadata?.full_name === report.reporter;
  let statusHtml = `<span class="badge ${statusClass}">Status: ${String(status).replace("_", " ")}</span>`;
  
  if (isAuthor) {
    statusHtml = `
      <label><span class="badge">Update status</span>
        <select class="status-select" data-id="${report.id}">
          <option value="open" ${status === "open" ? "selected" : ""}>Open</option>
          <option value="in_progress" ${status === "in_progress" ? "selected" : ""}>In progress</option>
          <option value="completed" ${status === "completed" ? "selected" : ""}>Completed</option>
        </select>
      </label>
    `;
  }

  item.innerHTML = `
    <strong>${escapeHTML(report.location || "Unknown location")}</strong>
    <p>${escapeHTML(report.address || "")}</p>
    <p>${escapeHTML(report.description || "")}</p>
    ${safePhotoSrc ? `<img class="report-media" src="${safePhotoSrc}" alt="Report photo">` : ""}
    <div class="report-meta">
      <span class="badge">By: ${escapeHTML(report.reporter || "Anonymous")}</span>
      ${!isAuthor ? statusHtml : ""}
    </div>
    <div class="report-actions">
      ${isAuthor ? statusHtml : ""}
    </div>
    <div class="comments-section">
      <div class="comments-header">
        <span>💬 ${allComments.length} comment${allComments.length !== 1 ? "s" : ""}</span>
      </div>
      <div class="comments-list" id="comments-${report.id}"></div>
      <div class="new-comment-wrap">
        <div class="comment-avatar">${currentUser ? escapeHTML((currentUser.user_metadata?.full_name || "U").charAt(0).toUpperCase()) : "?"}</div>
        <input type="text" class="new-comment-input" placeholder="${currentUser ? "Add a comment..." : "Login to comment..."}" ${!currentUser ? "disabled" : ""} />
        <button class="btn-send-comment new-comment-send" data-id="${report.id}">Send</button>
      </div>
    </div>
  `;

  const commentsContainer = item.querySelector(`#comments-${report.id}`);
  topComments.forEach(c => {
    commentsContainer.appendChild(renderComment(c, report.id, allComments));
  });

  const selectEl = item.querySelector(".status-select");
  if (selectEl) {
    selectEl.addEventListener("change", async (e) => {
      await updateReportStatus(report.id, e.target.value);
      await renderReports();
      await renderAchievements();
    });
  }

  item.querySelector(".new-comment-send").addEventListener("click", async (e) => {
    if (!currentUser) { alert("Please login to comment."); return; }
    const btn = e.currentTarget;
    btn.disabled = true; 

    const input = item.querySelector(".new-comment-input");
    const text = input.value.trim();
    if (!text) { btn.disabled = false; return; }
    
    const comments = await getComments(report.id); 
    comments.push({
      id: Date.now().toString(),
      parentId: null,
      author: currentUser.user_metadata?.full_name || "Anonymous",
      text,
      createdAt: new Date().toISOString(),
      likes: 0,
      likedBy: [],
    });
    
    await saveComments(report.id, comments);
    input.value = "";
    await renderReports();
    btn.disabled = false;
  });

  item.querySelector(".new-comment-input").addEventListener("keydown", async (e) => {
    if (e.key === "Enter") item.querySelector(".new-comment-send").click();
  });

  reportList.appendChild(item);
});
}

async function renderReports() {
if (!reportList) return;
if (!sb) { reportList.innerHTML = "<li>Connecting to database...</li>"; return; }
renderReportList(await fetchReports());
}

async function renderAchievements() {
if (!topContributors || !achievementSummary) return;
if (!sb) return;
const reports = await fetchReports();
const stats = {};
let completedCount = 0;
reports.forEach((r) => {
const name = r.reporter || "Anonymous";
stats[name] = (stats[name] || 0) + 1;
if (r.status === "completed") completedCount++;
});
const leaders = Object.entries(stats).sort((a, b) => b[1] - a[1]).slice(0, 5);
topContributors.innerHTML = leaders.length
? leaders.map(([name, count]) => `<li>${escapeHTML(name)} - ${count} report(s)</li>`).join("")
: "<li>No contributors yet.</li>";
achievementSummary.textContent = `Total: ${reports.length}. Completed: ${completedCount}. Open/In progress: ${reports.length - completedCount}.`;
}

if (reportForm) {
reportForm.addEventListener("submit", async (event) => {
event.preventDefault();
if (!sb) { alert("Supabase is not initialized."); return; }

const locationInput = document.getElementById("locationName");
const addressInput = document.getElementById("locationAddress");
const descInput = document.getElementById("locationDesc");
const photoInput = document.getElementById("locationPhoto");
const reporterInput = document.getElementById("reporterName");
const submitBtn = reportForm.querySelector("button[type='submit']");

const file = photoInput?.files?.[0];

// ЗАЩИТА: Запрещаем гостям грузить фото (база всё равно отклонит, так хоть с понятной ошибкой)
if (file && !currentUser) {
  alert("Только зарегистрированные пользователи могут прикреплять фото! Пожалуйста, войдите в аккаунт.");
  return;
}

if (file && file.size > 5 * 1024 * 1024) {
  alert("Файл слишком большой! Пожалуйста, выберите фото размером до 5 МБ.");
  return;
}

const saveReport = async (file) => {
  submitBtn.disabled = true;
  submitBtn.textContent = "Uploading...";
  
  // Жестко привязываем имя, чтобы 100% совпадало с профилем
  const exactProfileName = currentUser?.user_metadata?.full_name || "User";
  const reportAuthor = currentUser ? exactProfileName : ((reporterInput?.value || "").trim() || "Anonymous");

  let photoUrl = "";

  if (file) {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
    
    const { data: uploadData, error: uploadError } = await sb.storage.from('photos').upload(fileName, file);
    
    if (uploadError) {
      alert("Ошибка загрузки фото: " + uploadError.message);
      submitBtn.disabled = false;
      submitBtn.textContent = "Submit Report";
      return;
    }
    const { data: publicUrlData } = sb.storage.from('photos').getPublicUrl(fileName);
    photoUrl = publicUrlData.publicUrl;
  }

  const payload = {
    location: (locationInput?.value || "").trim(),
    address: (addressInput?.value || "").trim(),
    description: (descInput?.value || "").trim(),
    reporter: reportAuthor,
    status: "open", 
    photo: photoUrl, 
    comments: [],
  };

  const { error } = await sb.from("reports").insert([payload]);
  
  if (error) { 
    alert("Error: " + error.message); 
  } else {
    reportForm.reset();
    await renderReports();
    await renderAchievements();
  }
  
  submitBtn.disabled = false;
  submitBtn.textContent = "Submit Report";
};

await saveReport(file);
});
}

window.addEventListener("load", async () => {
if (window.supabase) {
sb = window.supabase.createClient(supabaseUrl, supabaseKey);
const { data: { user } } = await sb.auth.getUser();
currentUser = user || null;
}
initMap();
renderPlaces();
renderReports();
renderAchievements();
});
})();
