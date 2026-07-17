window.firebaseAppLoaded = true;
import { auth, db } from "./firebase-config.js";
import { 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs,
  updateDoc, 
  deleteDoc, 
  addDoc,
  onSnapshot, 
  query, 
  orderBy,
  where,
  limit
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

class AdSettingsComponent extends HTMLElement {
  constructor() {
    super();
    this.innerHTML = `
      <div class="glass-card" style="height: fit-content;">
        <div class="panel-header" style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
          <h2 class="panel-title">⚙️ Ad Settings</h2>
          <button type="button" id="toggleAdScriptsBtn" class="btn-icon-only" style="padding: 0.5rem; border-radius: 0.5rem; display: flex; align-items: center; justify-content: center; background: transparent; border: none; cursor: pointer; color: var(--text-secondary);" title="Toggle Advanced Ad Scripts">
            <svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"/>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z"/>
            </svg>
          </button>
        </div>
        <div class="panel-body">
          <form id="settingsForm">
            <div class="form-group">
              <label for="settingPageTitle" class="form-label">Visitor Page Title</label>
              <input type="text" id="settingPageTitle" class="form-input" placeholder="Loading Short Link..." required>
            </div>
            
            <div class="form-group">
              <label for="settingButtonText" class="form-label">Continue Button Text</label>
              <input type="text" id="settingButtonText" class="form-input" placeholder="Click to Continue" required>
            </div>

            <div class="form-row" style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1.25rem;">
              <div class="form-group">
                <label for="settingCountdown" class="form-label">Timer (Seconds)</label>
                <input type="number" id="settingCountdown" class="form-input" min="5" max="60" value="10" required>
              </div>
              <div class="form-group" style="margin-bottom: 0; display: flex; flex-direction: column; justify-content: center; align-items: flex-start;">
                <label class="form-label" style="margin-bottom: 0.75rem;">Auto Redirect</label>
                <label class="switch">
                  <input type="checkbox" id="settingAutoRedirect" checked>
                  <span class="slider"></span>
                </label>
              </div>
            </div>

            <!-- Collapsible Ad Scripts Wrapper (hidden by default) -->
            <div id="advancedAdScriptsContainer" style="display: none; transition: max-height 0.4s cubic-bezier(0.16, 1, 0.3, 1); max-height: 0; overflow: hidden; margin-top: 1.5rem; border-top: 1px dashed var(--border-glass); padding-top: 1.5rem;">
              <h3 style="font-size: 0.9rem; font-weight: 600; color: var(--color-primary); margin-bottom: 1.25rem; display: flex; align-items: center; gap: 0.5rem;">
                <span>⚙️ Advanced Script Slots</span>
              </h3>

              <!-- Header Ad Script Section -->
              <div class="glass-card settings-sub-card mb-4" style="padding: 0; border-color: rgba(255,255,255,0.03); background: rgba(0,0,0,0.15); overflow: hidden;">
                <div class="ad-section-header">
                  <div class="flex align-center gap-2">
                    <span class="ad-toggle-icon">⚙️</span>
                    <span class="form-label" style="margin-bottom: 0; font-weight: 600; color: var(--text-primary);">Header Ad Script</span>
                  </div>
                  <div class="flex align-center gap-3" style="margin-left: auto;">
                    <div class="flex align-center gap-2" onclick="event.stopPropagation()">
                      <span class="text-secondary" style="font-size: 0.725rem;">Enable</span>
                      <label class="switch" style="transform: scale(0.85);">
                        <input type="checkbox" id="settingHeaderAdEnabled">
                        <span class="slider"></span>
                      </label>
                    </div>
                    <span class="chevron-icon">▼</span>
                  </div>
                </div>
                <div class="ad-section-content">
                  <textarea id="settingHeaderAdScript" class="form-input" rows="4" style="font-family: monospace; font-size: 0.8rem;" placeholder="<!-- Paste script or HTML for Header ad space -->"></textarea>
                  <div class="flex justify-between align-center mt-2">
                    <small class="text-muted" style="font-size: 0.725rem;">Injected at page header.</small>
                    <button type="button" id="saveHeaderAdBtn" class="btn btn-primary btn-sm" style="padding: 0.35rem 0.75rem; font-size: 0.8rem;">Save Header Ad</button>
                  </div>
                </div>
              </div>

              <!-- Body Ad Script Section -->
              <div class="glass-card settings-sub-card mb-4" style="padding: 0; border-color: rgba(255,255,255,0.03); background: rgba(0,0,0,0.15); overflow: hidden;">
                <div class="ad-section-header">
                  <div class="flex align-center gap-2">
                    <span class="ad-toggle-icon">⚙️</span>
                    <span class="form-label" style="margin-bottom: 0; font-weight: 600; color: var(--text-primary);">Body Ad Script</span>
                  </div>
                  <div class="flex align-center gap-3" style="margin-left: auto;">
                    <div class="flex align-center gap-2" onclick="event.stopPropagation()">
                      <span class="text-secondary" style="font-size: 0.725rem;">Enable</span>
                      <label class="switch" style="transform: scale(0.85);">
                        <input type="checkbox" id="settingBodyAdEnabled">
                        <span class="slider"></span>
                      </label>
                    </div>
                    <span class="chevron-icon">▼</span>
                  </div>
                </div>
                <div class="ad-section-content">
                  <textarea id="settingBodyAdScript" class="form-input" rows="4" style="font-family: monospace; font-size: 0.8rem;" placeholder="<!-- Paste script or HTML for Body ad space -->"></textarea>
                  <div class="flex justify-between align-center mt-2">
                    <small class="text-muted" style="font-size: 0.725rem;">Injected inside redirect card (above timer).</small>
                    <button type="button" id="saveBodyAdBtn" class="btn btn-primary btn-sm" style="padding: 0.35rem 0.75rem; font-size: 0.8rem;">Save Body Ad</button>
                  </div>
                </div>
              </div>

              <!-- Footer Ad Script Section -->
              <div class="glass-card settings-sub-card mb-4" style="padding: 0; border-color: rgba(255,255,255,0.03); background: rgba(0,0,0,0.15); overflow: hidden;">
                <div class="ad-section-header">
                  <div class="flex align-center gap-2">
                    <span class="ad-toggle-icon">⚙️</span>
                    <span class="form-label" style="margin-bottom: 0; font-weight: 600; color: var(--text-primary);">Footer Ad Script</span>
                  </div>
                  <div class="flex align-center gap-3" style="margin-left: auto;">
                    <div class="flex align-center gap-2" onclick="event.stopPropagation()">
                      <span class="text-secondary" style="font-size: 0.725rem;">Enable</span>
                      <label class="switch" style="transform: scale(0.85);">
                        <input type="checkbox" id="settingFooterAdEnabled">
                        <span class="slider"></span>
                      </label>
                    </div>
                    <span class="chevron-icon">▼</span>
                  </div>
                </div>
                <div class="ad-section-content">
                  <textarea id="settingFooterAdScript" class="form-input" rows="4" style="font-family: monospace; font-size: 0.8rem;" placeholder="<!-- Paste script or HTML for Footer ad space -->"></textarea>
                  <div class="flex justify-between align-center mt-2">
                    <small class="text-muted" style="font-size: 0.725rem;">Injected inside redirect card (below button).</small>
                    <button type="button" id="saveFooterAdBtn" class="btn btn-primary btn-sm" style="padding: 0.35rem 0.75rem; font-size: 0.8rem;">Save Footer Ad</button>
                  </div>
                </div>
              </div>

              <!-- Extra/Custom Ad Script Section -->
              <div class="glass-card settings-sub-card mb-4" style="padding: 0; border-color: rgba(255,255,255,0.03); background: rgba(0,0,0,0.15); overflow: hidden;">
                <div class="ad-section-header">
                  <div class="flex align-center gap-2">
                    <span class="ad-toggle-icon">⚙️</span>
                    <span class="form-label" style="margin-bottom: 0; font-weight: 600; color: var(--text-primary);">Custom/Extra Ad Script</span>
                  </div>
                  <div class="flex align-center gap-3" style="margin-left: auto;">
                    <div class="flex align-center gap-2" onclick="event.stopPropagation()">
                      <span class="text-secondary" style="font-size: 0.725rem;">Enable</span>
                      <label class="switch" style="transform: scale(0.85);">
                        <input type="checkbox" id="settingCustomAdEnabled">
                        <span class="slider"></span>
                      </label>
                    </div>
                    <span class="chevron-icon">▼</span>
                  </div>
                </div>
                <div class="ad-section-content">
                  <textarea id="settingCustomAdScript" class="form-input" rows="4" style="font-family: monospace; font-size: 0.8rem;" placeholder="<!-- Paste script or HTML for Custom ad space -->"></textarea>
                  <div class="flex justify-between align-center mt-2">
                    <small class="text-muted" style="font-size: 0.725rem;">Injected at the bottom of the page.</small>
                    <button type="button" id="saveCustomAdBtn" class="btn btn-primary btn-sm" style="padding: 0.35rem 0.75rem; font-size: 0.8rem;">Save Custom Ad</button>
                  </div>
                </div>
              </div>
            </div>

            <div style="border-top: 1px solid var(--border-glass); padding-top: 1.25rem; margin-top: 1.5rem;">
              <button type="submit" id="saveSettingsBtn" class="btn btn-secondary w-full">
                <span>Save General Configs</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    `;
  }
}
customElements.define('ad-settings-component', AdSettingsComponent);

// DOM Elements - Auth Screen
const authScreen = document.getElementById("authScreen");
const loginForm = document.getElementById("loginForm");
const loginEmail = document.getElementById("loginEmail");
const loginPassword = document.getElementById("loginPassword");
const loginSubmitBtn = document.getElementById("loginSubmitBtn");

// DOM Elements - Dashboard Screen
const dashboardScreen = document.getElementById("dashboardScreen");
const userEmailDisplay = document.getElementById("userEmailDisplay");
const logoutBtn = document.getElementById("logoutBtn");

// DOM Elements - Metrics
const statTotalLinks = document.getElementById("statTotalLinks");
const statTotalClicks = document.getElementById("statTotalClicks");
const statActiveLinks = document.getElementById("statActiveLinks");

// DOM Elements - Create Link Form
const createLinkForm = document.getElementById("createLinkForm");
const originalUrlInput = document.getElementById("originalUrlInput");
const linkTitleInput = document.getElementById("linkTitleInput");
const titleLoadingSpinner = document.getElementById("titleLoadingSpinner");
const customCodeInput = document.getElementById("customCodeInput");
const generateCodeBtn = document.getElementById("generateCodeBtn");
const createLinkSubmitBtn = document.getElementById("createLinkSubmitBtn");
const linkResultBox = document.getElementById("linkResultBox");
const resultShortUrl = document.getElementById("resultShortUrl");
const copyResultBtn = document.getElementById("copyResultBtn");

// DOM Elements - Link Table & Search
const searchInput = document.getElementById("searchInput");
const linksTableBody = document.getElementById("linksTableBody");

// DOM Elements - General Settings
const settingsForm = document.getElementById("settingsForm");
const settingPageTitle = document.getElementById("settingPageTitle");
const settingButtonText = document.getElementById("settingButtonText");
const settingCountdown = document.getElementById("settingCountdown");
const settingAutoRedirect = document.getElementById("settingAutoRedirect");
const saveSettingsBtn = document.getElementById("saveSettingsBtn");

// DOM Elements - Advanced Ad Script Sections
const settingHeaderAdScript = document.getElementById("settingHeaderAdScript");
const settingHeaderAdEnabled = document.getElementById("settingHeaderAdEnabled");
const saveHeaderAdBtn = document.getElementById("saveHeaderAdBtn");

const settingBodyAdScript = document.getElementById("settingBodyAdScript");
const settingBodyAdEnabled = document.getElementById("settingBodyAdEnabled");
const saveBodyAdBtn = document.getElementById("saveBodyAdBtn");

const settingFooterAdScript = document.getElementById("settingFooterAdScript");
const settingFooterAdEnabled = document.getElementById("settingFooterAdEnabled");
const saveFooterAdBtn = document.getElementById("saveFooterAdBtn");

const settingCustomAdScript = document.getElementById("settingCustomAdScript");
const settingCustomAdEnabled = document.getElementById("settingCustomAdEnabled");
const saveCustomAdBtn = document.getElementById("saveCustomAdBtn");

// DOM Elements - Modals
const editModal = document.getElementById("editModal");
const editLinkForm = document.getElementById("editLinkForm");
const editLinkId = document.getElementById("editLinkId");
const editLinkCode = document.getElementById("editLinkCode");
const editLinkTitle = document.getElementById("editLinkTitle");
const editLinkUrl = document.getElementById("editLinkUrl");
const editLinkStatus = document.getElementById("editLinkStatus");
const closeEditModalBtn = document.getElementById("closeEditModalBtn");
const cancelEditBtn = document.getElementById("cancelEditBtn");

const deleteModal = document.getElementById("deleteModal");
const deleteLinkDisplay = document.getElementById("deleteLinkDisplay");
const deleteLinkId = document.getElementById("deleteLinkId");
const confirmDeleteBtn = document.getElementById("confirmDeleteBtn");
const cancelDeleteBtn = document.getElementById("cancelDeleteBtn");

// DOM Elements - Notifications Center
const notificationBellBtn = document.getElementById("notificationBellBtn");
const notificationBadge = document.getElementById("notificationBadge");
const notificationPanel = document.getElementById("notificationPanel");
const closeNotificationPanelBtn = document.getElementById("closeNotificationPanelBtn");
const clearAllNotificationsBtn = document.getElementById("clearAllNotificationsBtn");
const notificationList = document.getElementById("notificationList");

// DOM Elements - Toast Container
const toastContainer = document.getElementById("toastContainer");

// Global states
let linksCache = [];
let loadedNotifications = [];
let unsubscribeLinks = null;
let unsubscribeNotifications = null;
let hasLoggedLogin = false;

// Helper: Toast Notifications
function showToast(message, type = "info") {
  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <span>${message}</span>
    <button class="toast-close">✕</button>
  `;
  
  toast.querySelector(".toast-close").addEventListener("click", () => {
    toast.remove();
  });
  
  toastContainer.appendChild(toast);
  
  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateX(50px)";
    toast.style.transition = "all 0.3s ease";
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

// Helper: Construct short URL base path dynamically
function getShortBaseUrl() {
  const loc = window.location;
  let path = loc.pathname;
  if (path.endsWith("admin.html")) {
    path = path.slice(0, -10);
  } else if (path.endsWith("index.html")) {
    path = path.slice(0, -10);
  }
  if (!path.endsWith("/")) {
    path += "/";
  }
  return loc.origin + path;
}

// Helper: Generate a unique random alphanumeric short code
function generateRandomCode(length = 6) {
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// ----------------------------------------------------
// 1. Auth Management Flow
// ----------------------------------------------------

onAuthStateChanged(auth, (user) => {
  if (user) {
    // Authenticated state
    authScreen.style.display = "none";
    dashboardScreen.style.display = "block";
    userEmailDisplay.textContent = user.email;
    
    // Log user login activity (once per session)
    if (!hasLoggedLogin && !sessionStorage.getItem("admin_login_logged")) {
      logActivity("info", `Admin logged in successfully: ${user.email}`);
      sessionStorage.setItem("admin_login_logged", "true");
      hasLoggedLogin = true;
    }

    // Bind Realtime listeners
    bindRealtimeLinks();
    bindNotifications();
    fetchSettings();
  } else {
    // Unauthenticated state
    authScreen.style.display = "flex";
    dashboardScreen.style.display = "none";
    
    // Clear dynamic listeners & intervals
    if (unsubscribeLinks) {
      unsubscribeLinks();
      unsubscribeLinks = null;
    }
    if (unsubscribeNotifications) {
      unsubscribeNotifications();
      unsubscribeNotifications = null;
    }
    hasLoggedLogin = false;
  }
});

// Login Form Submit Handler
loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = loginEmail.value.trim();
  const password = loginPassword.value;
  
  loginSubmitBtn.disabled = true;
  loginSubmitBtn.innerHTML = `<div class="spinner"></div> <span>Verifying...</span>`;
  
  try {
    await signInWithEmailAndPassword(auth, email, password);
    showToast("Signed in successfully!", "success");
  } catch (error) {
    console.error("Login failed:", error);
    let errorMsg = "Invalid email or password.";
    if (error.code === "auth/user-not-found") errorMsg = "No account found with this email.";
    if (error.code === "auth/wrong-password") errorMsg = "Incorrect password.";
    showToast(errorMsg, "error");
    logActivity("error", `Failed login attempt for email: ${email}. Reason: ${error.message}`);
  } finally {
    loginSubmitBtn.disabled = false;
    loginSubmitBtn.innerHTML = `<span>Sign In</span>`;
  }
});

// Logout Button Click Handler
logoutBtn.addEventListener("click", async () => {
  try {
    logActivity("info", "Admin initiated sign out.");
    sessionStorage.removeItem("admin_login_logged");
    await signOut(auth);
    showToast("Signed out successfully.", "info");
    linkResultBox.classList.add("hidden");
    createLinkForm.reset();
  } catch (error) {
    showToast("Error signing out.", "error");
  }
});

// ----------------------------------------------------
// 2. Real-time Links Operations
// ----------------------------------------------------

function bindRealtimeLinks() {
  const q = query(collection(db, "links"), orderBy("createdAt", "desc"));
  
  unsubscribeLinks = onSnapshot(q, (snapshot) => {
    linksCache = [];
    let totalClicks = 0;
    let activeCount = 0;
    
    snapshot.forEach((doc) => {
      const data = doc.data();
      linksCache.push({
        id: doc.id,
        ...data
      });
      totalClicks += (data.clicks || 0);
      if (data.status) activeCount++;
    });
    
    statTotalLinks.textContent = linksCache.length;
    statTotalClicks.textContent = totalClicks;
    statActiveLinks.textContent = activeCount;
    
    renderLinksTable(linksCache);
  }, (error) => {
    console.error("Firestore links fetch failed:", error);
    showToast("Failed to fetch links. Check security rules.", "error");
    logActivity("error", "Database link query failed: " + error.message);
  });
}

// Render Links list in Table
function renderLinksTable(links) {
  const queryText = searchInput.value.toLowerCase().trim();
  
  const filteredLinks = links.filter(link => {
    const titleMatch = link.title ? link.title.toLowerCase().includes(queryText) : false;
    return link.id.toLowerCase().includes(queryText) || 
           link.originalUrl.toLowerCase().includes(queryText) ||
           titleMatch;
  });
  
  if (filteredLinks.length === 0) {
    linksTableBody.innerHTML = `
      <tr>
        <td colspan="6" class="text-center text-muted" style="padding: 2.5rem 0;">
          <p class="empty-state-icon">🔍</p>
          <p class="empty-state-text">No matching links found.</p>
        </td>
      </tr>
    `;
    return;
  }
  
  const baseUrl = getShortBaseUrl();
  
  linksTableBody.innerHTML = filteredLinks.map(link => {
    const shortLink = baseUrl + link.id;
    const isChecked = link.status ? 'checked' : '';
    const createdDate = link.createdAt ? new Date(link.createdAt).toLocaleDateString(undefined, {month: 'short', day: 'numeric', year: 'numeric'}) : 'N/A';
    
    return `
      <tr>
        <td>
          <div class="link-short-wrapper">
            <span class="link-short-text">${link.id}</span>
            <button class="btn-icon-only copy-link-btn" data-url="${shortLink}" title="Copy short URL">
              <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
            </button>
          </div>
        </td>
        <td>
          <div class="link-details" style="display: flex; flex-direction: column;">
            <span class="link-title-text font-weight-600 text-primary" style="font-size: 0.95rem; font-weight: 500;">${escapeHTML(link.title || 'Untitled Link')}</span>
            <div class="link-original" title="${link.originalUrl}">${escapeHTML(link.originalUrl)}</div>
          </div>
        </td>
        <td class="text-center text-secondary" style="font-size: 0.85rem; white-space: nowrap;">${createdDate}</td>
        <td class="text-center font-weight-600">${link.clicks || 0}</td>
        <td class="text-center">
          <label class="switch">
            <input type="checkbox" class="toggle-status-checkbox" data-id="${link.id}" ${isChecked}>
            <span class="slider"></span>
          </label>
        </td>
        <td class="text-right">
          <div class="flex gap-2" style="justify-content: flex-end;">
            <button class="btn-icon-only edit-link-btn" data-id="${link.id}" data-url="${link.originalUrl}" data-title="${escapeHTML(link.title || '')}" data-status="${link.status}" title="Edit link settings">
              <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            </button>
            <button class="btn-icon-only delete-btn delete-link-btn" data-id="${link.id}" title="Delete link">
              <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join("");
  
  attachTableEventListeners();
}

// Bind events in Table (copy, toggle status, edit click, delete click)
function attachTableEventListeners() {
  document.querySelectorAll(".copy-link-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const url = btn.getAttribute("data-url");
      navigator.clipboard.writeText(url).then(() => {
        showToast("Short link copied to clipboard!", "success");
      }).catch(() => {
        showToast("Failed to copy link.", "error");
      });
    });
  });

  document.querySelectorAll(".toggle-status-checkbox").forEach(checkbox => {
    checkbox.addEventListener("change", async () => {
      const id = checkbox.getAttribute("data-id");
      const newStatus = checkbox.checked;
      
      try {
        const docRef = doc(db, "links", id);
        await updateDoc(docRef, { status: newStatus });
        showToast(`Link "${id}" has been ${newStatus ? 'enabled' : 'disabled'}.`, "info");
        logActivity("info", `Link '/${id}' status changed to ${newStatus ? 'Active' : 'Inactive'}.`);
      } catch (err) {
        console.error("Status toggle error:", err);
        showToast("Error updating link status.", "error");
        checkbox.checked = !newStatus;
      }
    });
  });

  document.querySelectorAll(".edit-link-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-id");
      const url = btn.getAttribute("data-url");
      const title = btn.getAttribute("data-title");
      const status = btn.getAttribute("data-status") === "true";
      
      editLinkId.value = id;
      editLinkCode.value = id;
      editLinkTitle.value = title;
      editLinkUrl.value = url;
      editLinkStatus.checked = status;
      
      editModal.classList.add("active");
    });
  });

  document.querySelectorAll(".delete-link-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-id");
      deleteLinkId.value = id;
      deleteLinkDisplay.textContent = `/${id}`;
      deleteModal.classList.add("active");
    });
  });
}

searchInput.addEventListener("input", () => {
  renderLinksTable(linksCache);
});

function escapeHTML(str) {
  return str.replace(/[&<>'"]/g, 
    tag => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;'
    }[tag] || tag)
  );
}

// ----------------------------------------------------
// 3. Link Creation Handler & Webpage Title Fetching
// ----------------------------------------------------

// Debounce Helper
function debounce(func, wait) {
  let timeout;
  return function(...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
}

// Monitor Paste or blur on Original URL input to automatically resolve webpage title
const handleUrlInput = async () => {
  const url = originalUrlInput.value.trim();
  if (!url) return;
  if (!url.startsWith("http://") && !url.startsWith("https://")) return;
  
  // If title is already typed by user, do not override
  if (linkTitleInput.value.trim()) return;

  titleLoadingSpinner.classList.remove("hidden");
  
  try {
    // Utilize public CORS proxy
    const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;
    const res = await fetch(proxyUrl);
    if (!res.ok) throw new Error("CORS Proxy retrieval error");
    
    const data = await res.json();
    if (data.contents) {
      const parser = new DOMParser();
      const docParsed = parser.parseFromString(data.contents, "text/html");
      const title = docParsed.title || docParsed.querySelector("title")?.textContent || "";
      
      if (title.trim()) {
        linkTitleInput.value = title.trim();
        showToast("Webpage title resolved automatically!", "success");
      }
    }
  } catch (err) {
    console.warn("Failed to automatically query webpage metadata:", err);
  } finally {
    titleLoadingSpinner.classList.add("hidden");
  }
};

originalUrlInput.addEventListener("blur", handleUrlInput);
originalUrlInput.addEventListener("input", debounce(handleUrlInput, 1200));

customCodeInput.addEventListener("keypress", (e) => {
  const char = String.fromCharCode(e.which);
  if (!/^[a-zA-Z0-9-_]+$/.test(char)) {
    e.preventDefault();
  }
});

generateCodeBtn.addEventListener("click", () => {
  customCodeInput.value = generateRandomCode();
});

// Creation form submit
createLinkForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  
  const originalUrl = originalUrlInput.value.trim();
  const title = linkTitleInput.value.trim();
  let code = customCodeInput.value.trim().toLowerCase();
  
  if (!originalUrl.startsWith("http://") && !originalUrl.startsWith("https://")) {
    showToast("Please enter a valid HTTP or HTTPS destination URL.", "warning");
    return;
  }
  
  createLinkSubmitBtn.disabled = true;
  createLinkSubmitBtn.innerHTML = `<div class="spinner"></div> <span>Generating Link...</span>`;
  
  try {
    if (!code) {
      let isUnique = false;
      let iterations = 0;
      while (!isUnique && iterations < 10) {
        code = generateRandomCode(6).toLowerCase();
        const docRef = doc(db, "links", code);
        const docSnap = await getDoc(docRef);
        if (!docSnap.exists()) {
          isUnique = true;
        }
        iterations++;
      }
      if (!isUnique) {
        throw new Error("Could not generate a unique short code. Try again.");
      }
    } else {
      const docRef = doc(db, "links", code);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        showToast("This short code is already in use. Please choose another.", "error");
        createLinkSubmitBtn.disabled = false;
        createLinkSubmitBtn.innerHTML = `<span>Create Shortened Link</span>`;
        return;
      }
    }
    
    // Save link object
    const docRef = doc(db, "links", code);
    await setDoc(docRef, {
      code: code,
      title: title || `Short link for ${code}`,
      originalUrl: originalUrl,
      createdAt: new Date().toISOString(),
      clicks: 0,
      status: true
    });
    
    const shortUrl = getShortBaseUrl() + code;
    resultShortUrl.value = shortUrl;
    linkResultBox.classList.remove("hidden");
    
    createLinkForm.reset();
    showToast("Shortened URL created successfully!", "success");
    logActivity("success", `Created short link: /${code} -> '${originalUrl}' (Title: '${title || 'None'}')`);
  } catch (error) {
    console.error("Create link error:", error);
    showToast(error.message || "Failed to create short link.", "error");
  } finally {
    createLinkSubmitBtn.disabled = false;
    createLinkSubmitBtn.innerHTML = `<span>Create Shortened Link</span>`;
  }
});

copyResultBtn.addEventListener("click", () => {
  const url = resultShortUrl.value;
  navigator.clipboard.writeText(url).then(() => {
    showToast("Copied to clipboard!", "success");
  }).catch(() => {
    showToast("Failed to copy link.", "error");
  });
});

// ----------------------------------------------------
// 4. Modals Management Flow
// ----------------------------------------------------

function closeEditModal() {
  editModal.classList.remove("active");
  editLinkForm.reset();
}

closeEditModalBtn.addEventListener("click", closeEditModal);
cancelEditBtn.addEventListener("click", closeEditModal);

function closeDeleteModal() {
  deleteModal.classList.remove("active");
  deleteLinkId.value = "";
  deleteLinkDisplay.textContent = "";
}

cancelDeleteBtn.addEventListener("click", closeDeleteModal);

// Handle Edit Form Submit
editLinkForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  
  const id = editLinkId.value;
  const newTitle = editLinkTitle.value.trim();
  const newUrl = editLinkUrl.value.trim();
  const newStatus = editLinkStatus.checked;
  
  if (!newUrl.startsWith("http://") && !newUrl.startsWith("https://")) {
    showToast("Destination URL must start with http:// or https://", "warning");
    return;
  }
  
  const saveEditBtn = document.getElementById("saveEditBtn");
  saveEditBtn.disabled = true;
  saveEditBtn.innerHTML = `<div class="spinner"></div> Saving...`;
  
  try {
    const docRef = doc(db, "links", id);
    await updateDoc(docRef, {
      title: newTitle || `Short link for ${id}`,
      originalUrl: newUrl,
      status: newStatus
    });
    
    showToast("Short link updated successfully!", "success");
    logActivity("info", `Updated short link settings for /${id}: Title: '${newTitle}', URL: '${newUrl}', Active: ${newStatus}`);
    closeEditModal();
  } catch (err) {
    console.error("Update link error:", err);
    showToast("Failed to update short link.", "error");
  } finally {
    saveEditBtn.disabled = false;
    saveEditBtn.innerHTML = `Save Changes`;
  }
});

// Handle Delete Action Trigger
confirmDeleteBtn.addEventListener("click", async () => {
  const id = deleteLinkId.value;
  if (!id) return;
  
  confirmDeleteBtn.disabled = true;
  confirmDeleteBtn.innerHTML = `<div class="spinner"></div> Deleting...`;
  
  try {
    const docRef = doc(db, "links", id);
    await deleteDoc(docRef);
    
    showToast("Link deleted successfully.", "success");
    logActivity("warning", `Permanently deleted short link: /${id}`);
    closeDeleteModal();
  } catch (err) {
    console.error("Delete link error:", err);
    showToast("Failed to delete short link.", "error");
  } finally {
    confirmDeleteBtn.disabled = false;
    confirmDeleteBtn.innerHTML = `Delete Link`;
  }
});

window.addEventListener("click", (e) => {
  if (e.target === editModal) closeEditModal();
  if (e.target === deleteModal) closeDeleteModal();
});

// ----------------------------------------------------
// 5. Settings Configuration Management
// ----------------------------------------------------

async function fetchSettings() {
  try {
    const docRef = doc(db, "settings", "config");
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      const data = docSnap.data();
      settingPageTitle.value = data.pageTitle || "Redirecting...";
      settingButtonText.value = data.buttonText || "Click to Continue";
      settingCountdown.value = data.countdown || 10;
      settingAutoRedirect.checked = data.autoRedirect !== false;
      
      // Populate script card configuration textareas and toggles
      settingHeaderAdScript.value = data.headerAdScript || "";
      settingHeaderAdEnabled.checked = data.headerAdEnabled === true;
      
      settingBodyAdScript.value = data.bodyAdScript || "";
      settingBodyAdEnabled.checked = data.bodyAdEnabled === true;
      
      settingFooterAdScript.value = data.footerAdScript || "";
      settingFooterAdEnabled.checked = data.footerAdEnabled === true;
      
      settingCustomAdScript.value = data.customAdScript || "";
      settingCustomAdEnabled.checked = data.customAdEnabled === true;
    } else {
      // Default setup
      settingPageTitle.value = "Short Link Redirection | AdLinker";
      settingButtonText.value = "Click to Continue";
      settingCountdown.value = 10;
      settingAutoRedirect.checked = true;
      
      // Send deployment warning
      logActivity("warning", "Deployment Configuration missing. Created settings with default configs.");
    }
  } catch (err) {
    console.error("Fetch settings error:", err);
    showToast("Error loading Settings. Ensure Firestore rules are configured.", "warning");
  }
}

// General config save form submit handler
settingsForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  
  const pageTitle = settingPageTitle.value.trim();
  const buttonText = settingButtonText.value.trim();
  const countdown = parseInt(settingCountdown.value);
  const autoRedirect = settingAutoRedirect.checked;
  
  if (countdown < 5 || countdown > 60) {
    showToast("Timer must be between 5 and 60 seconds.", "warning");
    return;
  }
  
  saveSettingsBtn.disabled = true;
  saveSettingsBtn.innerHTML = `<div class="spinner"></div> <span>Saving...</span>`;
  
  try {
    const docRef = doc(db, "settings", "config");
    await setDoc(docRef, {
      pageTitle,
      buttonText,
      countdown,
      autoRedirect
    }, { merge: true });
    
    showToast("Configuration saved successfully!", "success");
    logActivity("success", "Updated General settings configurations (Page Title, Button, Countdown).");
  } catch (err) {
    console.error("Save settings error:", err);
    showToast("Failed to save settings configurations.", "error");
  } finally {
    saveSettingsBtn.disabled = false;
    saveSettingsBtn.innerHTML = `<span>Save General Configs</span>`;
  }
});

// Reusable individual ad settings saver
async function saveSingleAdConfig(type, fields) {
  const btn = document.getElementById(`save${type}AdBtn`);
  const originalHtml = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = `<div class="spinner" style="width: 1rem; height: 1rem;"></div> Saving...`;
  
  try {
    const docRef = doc(db, "settings", "config");
    await setDoc(docRef, fields, { merge: true });
    showToast(`${type} Ad configuration saved!`, "success");
    logActivity("success", `Saved advanced settings for ${type} Ad script.`);
  } catch (err) {
    console.error(`Save ${type} ad error:`, err);
    showToast(`Failed to update ${type} ad.`, "error");
  } finally {
    btn.disabled = false;
    btn.innerHTML = originalHtml;
  }
}

// Header ad script click save listener
saveHeaderAdBtn.addEventListener("click", () => {
  saveSingleAdConfig("Header", {
    headerAdScript: settingHeaderAdScript.value,
    headerAdEnabled: settingHeaderAdEnabled.checked
  });
});

// Body ad script click save listener
saveBodyAdBtn.addEventListener("click", () => {
  saveSingleAdConfig("Body", {
    bodyAdScript: settingBodyAdScript.value,
    bodyAdEnabled: settingBodyAdEnabled.checked
  });
});

// Footer ad script click save listener
saveFooterAdBtn.addEventListener("click", () => {
  saveSingleAdConfig("Footer", {
    footerAdScript: settingFooterAdScript.value,
    footerAdEnabled: settingFooterAdEnabled.checked
  });
});

// Custom/Extra ad script click save listener
saveCustomAdBtn.addEventListener("click", () => {
  saveSingleAdConfig("Custom", {
    customAdScript: settingCustomAdScript.value,
    customAdEnabled: settingCustomAdEnabled.checked
  });
});


// ----------------------------------------------------
// 7. Notification Center Drawer Real-time Logic
// ----------------------------------------------------

function bindNotifications() {
  const q = query(
    collection(db, "notifications"), 
    orderBy("timestamp", "desc"),
    limit(50)
  );

  unsubscribeNotifications = onSnapshot(q, (snapshot) => {
    loadedNotifications = [];
    let unreadCount = 0;
    
    snapshot.forEach(docSnap => {
      const data = docSnap.data();
      loadedNotifications.push({
        id: docSnap.id,
        ...data
      });
      if (data.read === false) unreadCount++;
    });

    // Update bell unread count badge
    notificationBadge.textContent = unreadCount;
    if (unreadCount > 0) {
      notificationBadge.classList.remove("hidden");
    } else {
      notificationBadge.classList.add("hidden");
    }

    renderNotificationsList();
  });
}

// Log admin action to Firestore
async function logActivity(type, message) {
  try {
    await addDoc(collection(db, "notifications"), {
      type: type,
      message: message,
      timestamp: Date.now(),
      read: false
    });
  } catch (err) {
    console.warn("Failed to write activity logs:", err);
  }
}

// Render Notifications Drawer items
function renderNotificationsList() {
  if (loadedNotifications.length === 0) {
    notificationList.innerHTML = `
      <div class="text-center text-muted" style="padding: 4rem 0; font-size: 0.85rem;">
        No recent activities or warnings.
      </div>
    `;
    return;
  }

  notificationList.innerHTML = loadedNotifications.map(item => {
    const isUnread = item.read === false ? 'unread' : '';
    const dateText = item.timestamp ? new Date(item.timestamp).toLocaleTimeString(undefined, {hour: '2-digit', minute:'2-digit', second:'2-digit'}) : 'N/A';
    
    // Choose emoji for notification types
    let typeEmoji = "ℹ️";
    if (item.type === "success") typeEmoji = "✅";
    if (item.type === "error") typeEmoji = "❌";
    if (item.type === "warning") typeEmoji = "⚠️";

    return `
      <div class="notification-item ${isUnread} ${item.type || 'info'}" data-id="${item.id}">
        <div class="notification-icon">${typeEmoji}</div>
        <div class="notification-content">
          <span class="notification-message">${escapeHTML(item.message)}</span>
          <span class="notification-time">${dateText}</span>
        </div>
      </div>
    `;
  }).join("");
}

// Toggle notification panel visibility
notificationBellBtn.addEventListener("click", async () => {
  notificationPanel.classList.toggle("active");
  
  // Mark all unread elements as read when drawer is opened
  if (notificationPanel.classList.contains("active")) {
    const unread = loadedNotifications.filter(n => n.read === false);
    if (unread.length > 0) {
      const batchPromise = unread.map(n => 
        updateDoc(doc(db, "notifications", n.id), { read: true })
      );
      await Promise.all(batchPromise);
    }
  }
});

// Close panel click triggers
closeNotificationPanelBtn.addEventListener("click", () => {
  notificationPanel.classList.remove("active");
});

// Clear all notifications click
clearAllNotificationsBtn.addEventListener("click", async () => {
  if (loadedNotifications.length === 0) return;
  
  clearAllNotificationsBtn.disabled = true;
  clearAllNotificationsBtn.textContent = "Clearing...";
  
  try {
    const batchPromises = loadedNotifications.map(n => 
      deleteDoc(doc(db, "notifications", n.id))
    );
    await Promise.all(batchPromises);
    showToast("Notifications cleared.", "info");
  } catch (err) {
    showToast("Error clearing logs.", "error");
  } finally {
    clearAllNotificationsBtn.disabled = false;
    clearAllNotificationsBtn.textContent = "Clear All";
  }
});

// Close drawers if clicking outside the container
window.addEventListener("click", (e) => {
  if (!notificationPanel.contains(e.target) && !notificationBellContainer.contains(e.target)) {
    notificationPanel.classList.remove("active");
  }
});

// Collapsible Ad Settings Accordion
document.querySelectorAll(".ad-section-header").forEach(header => {
  header.addEventListener("click", () => {
    const card = header.closest(".settings-sub-card");
    if (card) {
      card.classList.toggle("open");
    }
  });
});

// Toggle Visibility of Advanced Ad Slots Section via delegation
document.addEventListener("click", (e) => {
  const toggleBtn = e.target.closest("#toggleAdScriptsBtn");
  if (toggleBtn) {
    const container = document.getElementById("advancedAdScriptsContainer");
    if (container) {
      const isClosed = container.style.display === "none" || !container.style.display;
      container.style.display = isClosed ? "block" : "none";
      toggleBtn.classList.toggle("active", isClosed);
      
      // Handle micro-animation transitions
      setTimeout(() => {
        container.style.maxHeight = isClosed ? "2000px" : "0";
      }, 50);
    }
  }
});
