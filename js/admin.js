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
  connectedCallback() {
    this.innerHTML = `
      <div class="glass-card" style="height: fit-content; margin-bottom: 2rem;">
        <div class="panel-header" style="display: flex; flex-direction: column; gap: 0.75rem; width: 100%;">
          <div style="display: flex; justify-content: space-between; align-items: center; width: 100%; gap: 1rem;">
            <h2 class="panel-title" style="white-space: nowrap;">⚙️ Ad Setup Manager</h2>
            <button type="button" id="createNewAdSetupBtn" class="btn btn-secondary btn-sm" style="font-size: 0.8rem; padding: 0.35rem 0.75rem; white-space: nowrap;">
              + Create New Setup
            </button>
          </div>
          <div class="form-group" style="width: 100%; margin-bottom: 0;">
            <label for="adSetupSelector" class="form-label" style="font-size: 0.8rem;">Select Ad Configuration</label>
            <select id="adSetupSelector" class="form-input" style="background: rgba(0, 0, 0, 0.3);">
              <!-- Populated by JS -->
            </select>
          </div>
        </div>
        <div class="panel-body">
          <form id="settingsForm">
            <!-- Hidden field for Setup ID -->
            <input type="hidden" id="setupId" value="default">

            <div class="form-group">
              <label for="setupName" class="form-label">Setup Name</label>
              <input type="text" id="setupName" class="form-input" placeholder="e.g., Default Setup" required>
            </div>

            <div class="form-row" style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1.25rem;">
              <div class="form-group" style="margin-bottom: 0; display: flex; flex-direction: column; justify-content: center;">
                <label class="form-label" style="margin-bottom: 0.5rem;">Set as Default</label>
                <label class="switch">
                  <input type="checkbox" id="setupIsDefault">
                  <span class="slider"></span>
                </label>
              </div>
              <div class="form-group" style="margin-bottom: 0; display: flex; flex-direction: column; justify-content: center;">
                <label class="form-label" style="margin-bottom: 0.5rem;">Active Status</label>
                <label class="switch">
                  <input type="checkbox" id="setupEnabled" checked>
                  <span class="slider"></span>
                </label>
              </div>
            </div>

            <div class="form-row" style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1.25rem;">
              <div class="form-group" style="margin-bottom: 0;">
                <label for="settingCountdown" class="form-label">Timer (Seconds)</label>
                <input type="number" id="settingCountdown" class="form-input" min="0" max="60" value="10" required>
              </div>
              <div class="form-group" style="margin-bottom: 0; display: flex; flex-direction: column; justify-content: center; align-items: flex-start;">
                <label class="form-label" style="margin-bottom: 0.5rem;">Auto Redirect</label>
                <label class="switch">
                  <input type="checkbox" id="settingAutoRedirect" checked>
                  <span class="slider"></span>
                </label>
              </div>
            </div>

            <div class="form-row" style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1.25rem;">
              <div class="form-group" style="margin-bottom: 0; display: flex; flex-direction: column; justify-content: center;">
                <label class="form-label" style="margin-bottom: 0.5rem;">Message Page</label>
                <label class="switch">
                  <input type="checkbox" id="settingMessagePageEnabled">
                  <span class="slider"></span>
                </label>
              </div>
              <div class="form-group" style="margin-bottom: 0;">
                <label for="settingButtonText" class="form-label">Continue Button Text</label>
                <input type="text" id="settingButtonText" class="form-input" placeholder="Click to Continue" required>
              </div>
            </div>

            <!-- Collapsible Ad Scripts Accordion -->
            <div id="advancedAdScriptsContainer" style="margin-top: 1.5rem; border-top: 1px dashed var(--border-glass); padding-top: 1.5rem;">
              <h3 style="font-size: 0.9rem; font-weight: 600; color: var(--color-primary); margin-bottom: 1.25rem;">
                <span>⚙️ Ad Script Slots</span>
              </h3>

              <!-- Header Ad Script Section -->
              <div class="glass-card settings-sub-card mb-4" style="padding: 0; border-color: rgba(255,255,255,0.03); background: rgba(0,0,0,0.15); overflow: hidden; margin-bottom: 1rem;">
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
                  <small class="text-muted mt-1" style="font-size: 0.725rem; display: block; padding-top: 0.25rem;">Injected at page header.</small>
                </div>
              </div>

              <!-- Body Ad Script Section -->
              <div class="glass-card settings-sub-card mb-4" style="padding: 0; border-color: rgba(255,255,255,0.03); background: rgba(0,0,0,0.15); overflow: hidden; margin-bottom: 1rem;">
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
                  <small class="text-muted mt-1" style="font-size: 0.725rem; display: block; padding-top: 0.25rem;">Injected inside redirect card (above timer).</small>
                </div>
              </div>

              <!-- Footer Ad Script Section -->
              <div class="glass-card settings-sub-card mb-4" style="padding: 0; border-color: rgba(255,255,255,0.03); background: rgba(0,0,0,0.15); overflow: hidden; margin-bottom: 1rem;">
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
                  <small class="text-muted mt-1" style="font-size: 0.725rem; display: block; padding-top: 0.25rem;">Injected inside redirect card (below button).</small>
                </div>
              </div>

              <!-- Extra/Custom Ad Script Section -->
              <div class="glass-card settings-sub-card mb-4" style="padding: 0; border-color: rgba(255,255,255,0.03); background: rgba(0,0,0,0.15); overflow: hidden; margin-bottom: 1rem;">
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
                  <small class="text-muted mt-1" style="font-size: 0.725rem; display: block; padding-top: 0.25rem;">Injected at the bottom of the page.</small>
                </div>
              </div>
            </div>

            <div class="flex gap-2" style="border-top: 1px solid var(--border-glass); padding-top: 1.25rem; margin-top: 1.5rem;">
              <button type="submit" id="saveSettingsBtn" class="btn btn-primary" style="flex: 1;">
                <span>Save Setup</span>
              </button>
              <button type="button" id="deleteAdSetupBtn" class="btn btn-danger hidden" style="padding: 0.75rem 1.25rem; display: inline-flex; align-items: center; justify-content: center;" title="Delete this setup">
                <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
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

// DOM Elements - General Settings & Ad Setups Manager
let settingsForm = null;
let adSetupSelector = null;
let createNewAdSetupBtn = null;
let setupIdInput = null;
let setupNameInput = null;
let setupIsDefaultInput = null;
let setupEnabledInput = null;
let settingCountdownInput = null;
let settingAutoRedirectInput = null;
let settingMessagePageEnabledInput = null;
let settingButtonTextInput = null;
let deleteAdSetupBtn = null;
let saveAdSetupBtn = null;

// DOM Elements - Advanced Ad Script Sections
let settingHeaderAdScript = null;
let settingHeaderAdEnabled = null;
let settingBodyAdScript = null;
let settingBodyAdEnabled = null;
let settingFooterAdScript = null;
let settingFooterAdEnabled = null;
let settingCustomAdScript = null;
let settingCustomAdEnabled = null;

// Global Ad Setups State
let adSetupsCache = [];
let selectedAdSetupId = "default";

// Bind component DOM elements after connected upgrade
function initSettingsDOMBindings() {
  settingsForm = document.getElementById("settingsForm");
  adSetupSelector = document.getElementById("adSetupSelector");
  createNewAdSetupBtn = document.getElementById("createNewAdSetupBtn");
  setupIdInput = document.getElementById("setupId");
  setupNameInput = document.getElementById("setupName");
  setupIsDefaultInput = document.getElementById("setupIsDefault");
  setupEnabledInput = document.getElementById("setupEnabled");
  settingCountdownInput = document.getElementById("settingCountdown");
  settingAutoRedirectInput = document.getElementById("settingAutoRedirect");
  settingMessagePageEnabledInput = document.getElementById("settingMessagePageEnabled");
  settingButtonTextInput = document.getElementById("settingButtonText");
  deleteAdSetupBtn = document.getElementById("deleteAdSetupBtn");
  saveAdSetupBtn = document.getElementById("saveSettingsBtn");

  settingHeaderAdScript = document.getElementById("settingHeaderAdScript");
  settingHeaderAdEnabled = document.getElementById("settingHeaderAdEnabled");
  settingBodyAdScript = document.getElementById("settingBodyAdScript");
  settingBodyAdEnabled = document.getElementById("settingBodyAdEnabled");
  settingFooterAdScript = document.getElementById("settingFooterAdScript");
  settingFooterAdEnabled = document.getElementById("settingFooterAdEnabled");
  settingCustomAdScript = document.getElementById("settingCustomAdScript");
  settingCustomAdEnabled = document.getElementById("settingCustomAdEnabled");
}

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
    
    // Update Debug Label to Dashboard
    const debugLabel = document.getElementById("debugPageLabel");
    if (debugLabel) debugLabel.textContent = "PAGE: Admin Dashboard";
    console.log("Current Page: PAGE: Admin Dashboard");
    
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
    
    // Update Debug Label to Login
    const debugLabel = document.getElementById("debugPageLabel");
    if (debugLabel) debugLabel.textContent = "PAGE: Admin Login";
    console.log("Current Page: PAGE: Admin Login");
    
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
    
    // Resolve favicon URL with safe try-catch wrapper
    let domain = "";
    try {
      if (link.originalUrl) {
        domain = new URL(link.originalUrl).hostname;
      }
    } catch (e) {}
    const faviconSrc = link.faviconUrl || (domain ? `https://www.google.com/s2/favicons?sz=64&domain=${domain}` : "");

    return `
      <tr>
        <td>
          <div class="link-short-wrapper" style="display: flex; align-items: center; gap: 0.5rem;">
            <img class="link-favicon" src="${faviconSrc}" style="width: 16px; height: 16px; border-radius: 2px; flex-shrink: 0;" onerror="this.src='data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2216%22 height=%2216%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22%239ca3af%22 stroke-width=%222%22 stroke-linecap=%22round%22 stroke-linejoin=%22round%22><circle cx=%2212%22 cy=%2212%22 r=%2210%22></circle><line x1=%222%22 y1=%2212%22 x2=%2222%22 y2=%2212%22></line><path d=%22M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z%22></path></svg>';" />
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
            <button class="btn-icon-only edit-link-btn" data-id="${link.id}" title="Edit link settings">
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
      const link = linksCache.find(l => l.id === id);
      if (!link) return;
      
      editLinkId.value = link.id;
      editLinkCode.value = link.id;
      editLinkTitle.value = link.title || "";
      editLinkUrl.value = link.originalUrl || "";
      editLinkStatus.checked = link.status !== false;
      
      // Load Advanced Options into Edit Modal fields
      document.getElementById("editLinkAdsCountdownEnabled").checked = link.adsCountdownEnabled !== false;
      document.getElementById("editLinkCloakingEnabled").checked = link.linkCloakingEnabled === true;
      document.getElementById("editLinkMessagePageEnabled").checked = link.messagePageEnabled === true;
      document.getElementById("editLinkMessagePageTitle").value = link.messagePageTitle || "Confirm Redirection";
      document.getElementById("editLinkMessagePageText").value = link.messagePageText || "Please confirm to continue to your destination.";
      document.getElementById("editLinkMessagePageButton").value = link.messagePageButton || "Continue";
      document.getElementById("editLinkExternalBrowserEnabled").checked = link.externalBrowserEnabled === true;
      document.getElementById("editLinkPasswordProtectionEnabled").checked = link.passwordProtectionEnabled === true;
      document.getElementById("editLinkPasswordValue").value = link.passwordProtectionValue || "";
      document.getElementById("editLinkOgTitle").value = link.ogTitle || "";
      document.getElementById("editLinkOgDescription").value = link.ogDescription || "";
      document.getElementById("editLinkOgImageUrl").value = link.ogImageUrl || "";
      
      document.getElementById("editLinkDeviceRedirectEnabled").checked = link.deviceRedirectEnabled === true;
      document.getElementById("editLinkDesktopUrl").value = link.desktopUrl || "";
      document.getElementById("editLinkAndroidUrl").value = link.androidUrl || "";
      document.getElementById("editLinkIosUrl").value = link.iosUrl || "";
      
      document.getElementById("editLinkGeoRedirectEnabled").checked = link.geoRedirectEnabled === true;
      document.getElementById("editLinkGeoDefaultUrl").value = link.geoDefaultUrl || "";
      
      // Populate geo rules list in edit form
      const editGeoRulesListContainer = document.getElementById("editGeoRulesListContainer");
      editGeoRulesListContainer.innerHTML = "";
      if (link.geoRules) {
        Object.entries(link.geoRules).forEach(([country, destUrl]) => {
          addGeoRuleRow(editGeoRulesListContainer, country, destUrl);
        });
      }
      
      // Ad setup options
      document.getElementById("editLinkAdSetupOption").value = link.adSetupOption || "default";
      document.getElementById("editLinkAdSetupId").value = link.adSetupId || "";
      
      const manual = link.manualAdSettings || {};
      document.getElementById("editManualCountdown").value = manual.countdown || 10;
      document.getElementById("editManualAutoRedirect").checked = manual.autoRedirect !== false;
      document.getElementById("editManualButtonText").value = manual.continueButtonText || "Click to Continue";
      
      document.getElementById("editManualHeaderAdScript").value = manual.headerAdScript || "";
      document.getElementById("editManualHeaderAdEnabled").checked = manual.headerAdEnabled === true;
      document.getElementById("editManualBodyAdScript").value = manual.bodyAdScript || "";
      document.getElementById("editManualBodyAdEnabled").checked = manual.bodyAdEnabled === true;
      document.getElementById("editManualFooterAdScript").value = manual.footerAdScript || "";
      document.getElementById("editManualFooterAdEnabled").checked = manual.footerAdEnabled === true;
      document.getElementById("editManualCustomAdScript").value = manual.customAdScript || "";
      document.getElementById("editManualCustomAdEnabled").checked = manual.customAdEnabled === true;
      
      // Trigger change events to display/hide appropriate subfields dynamically
      document.getElementById("editLinkMessagePageEnabled").dispatchEvent(new Event("change"));
      document.getElementById("editLinkPasswordProtectionEnabled").dispatchEvent(new Event("change"));
      document.getElementById("editLinkDeviceRedirectEnabled").dispatchEvent(new Event("change"));
      document.getElementById("editLinkGeoRedirectEnabled").dispatchEvent(new Event("change"));
      document.getElementById("editLinkAdSetupOption").dispatchEvent(new Event("change"));

      // Expand/Collapse clean state
      document.getElementById("editAdvancedOptionsContainer").classList.add("hidden");
      document.getElementById("editAdvancedOptionsChevron").style.transform = "rotate(0deg)";
      document.getElementById("toggleEditAdvancedOptionsBtn").classList.remove("active");

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

// ----------------------------------------------------
// Advanced Options Form Binders
// ----------------------------------------------------

// Toggle Advanced Options in Create Link form
const toggleAdvancedOptionsBtn = document.getElementById("toggleAdvancedOptionsBtn");
const advancedOptionsContainer = document.getElementById("advancedOptionsContainer");
const advancedOptionsChevron = document.getElementById("advancedOptionsChevron");

toggleAdvancedOptionsBtn.addEventListener("click", () => {
  const isHidden = advancedOptionsContainer.classList.contains("hidden");
  if (isHidden) {
    advancedOptionsContainer.classList.remove("hidden");
    advancedOptionsChevron.style.transform = "rotate(180deg)";
    toggleAdvancedOptionsBtn.classList.add("active");
  } else {
    advancedOptionsContainer.classList.add("hidden");
    advancedOptionsChevron.style.transform = "rotate(0deg)";
    toggleAdvancedOptionsBtn.classList.remove("active");
  }
});

// Toggle Advanced Options in Edit Link form
const toggleEditAdvancedOptionsBtn = document.getElementById("toggleEditAdvancedOptionsBtn");
const editAdvancedOptionsContainer = document.getElementById("editAdvancedOptionsContainer");
const editAdvancedOptionsChevron = document.getElementById("editAdvancedOptionsChevron");

toggleEditAdvancedOptionsBtn.addEventListener("click", () => {
  const isHidden = editAdvancedOptionsContainer.classList.contains("hidden");
  if (isHidden) {
    editAdvancedOptionsContainer.classList.remove("hidden");
    editAdvancedOptionsChevron.style.transform = "rotate(180deg)";
    toggleEditAdvancedOptionsBtn.classList.add("active");
  } else {
    editAdvancedOptionsContainer.classList.add("hidden");
    editAdvancedOptionsChevron.style.transform = "rotate(0deg)";
    toggleEditAdvancedOptionsBtn.classList.remove("active");
  }
});

// General binder for toggles (switch to show/hide detailed fields)
function bindToggleField(checkboxId, targetId) {
  const checkbox = document.getElementById(checkboxId);
  const target = document.getElementById(targetId);
  if (!checkbox || !target) return;
  checkbox.addEventListener("change", () => {
    if (checkbox.checked) {
      target.classList.remove("hidden");
    } else {
      target.classList.add("hidden");
    }
  });
}

bindToggleField("linkMessagePageEnabled", "linkMessagePageFields");
bindToggleField("linkPasswordProtectionEnabled", "linkPasswordFields");
bindToggleField("linkDeviceRedirectEnabled", "linkDeviceFields");
bindToggleField("linkGeoRedirectEnabled", "linkGeoFields");

bindToggleField("editLinkMessagePageEnabled", "editLinkMessagePageFields");
bindToggleField("editLinkPasswordProtectionEnabled", "editLinkPasswordFields");
bindToggleField("editLinkDeviceRedirectEnabled", "editLinkDeviceFields");
bindToggleField("editLinkGeoRedirectEnabled", "editLinkGeoFields");

// Ad Setup selector options change visibility
function bindAdSetupOption(optionSelectId, selectGroupId, manualGroupId) {
  const select = document.getElementById(optionSelectId);
  const selectGroup = document.getElementById(selectGroupId);
  const manualGroup = document.getElementById(manualGroupId);
  if (!select || !selectGroup || !manualGroup) return;
  select.addEventListener("change", () => {
    const val = select.value;
    if (val === "default") {
      selectGroup.classList.add("hidden");
      manualGroup.classList.add("hidden");
    } else if (val === "select") {
      selectGroup.classList.remove("hidden");
      manualGroup.classList.add("hidden");
    } else if (val === "manual") {
      selectGroup.classList.add("hidden");
      manualGroup.classList.remove("hidden");
    }
  });
}

bindAdSetupOption("linkAdSetupOption", "linkAdSetupSelectGroup", "linkAdSetupManualGroup");
bindAdSetupOption("editLinkAdSetupOption", "editLinkAdSetupSelectGroup", "editLinkAdSetupManualGroup");

// Geo Rules rows addition/deletion
function addGeoRuleRow(container, country = "", url = "") {
  const row = document.createElement("div");
  row.className = "flex align-center gap-2 geo-rule-row";
  row.style.marginBottom = "0.5rem";
  row.innerHTML = `
    <input type="text" class="form-input geo-country-input" style="width: 70px; text-transform: uppercase;" placeholder="US" maxlength="2" value="${country}" required>
    <input type="url" class="form-input geo-url-input" style="flex: 1;" placeholder="https://..." value="${url}" required>
    <button type="button" class="btn btn-icon-only delete-geo-row-btn" style="color: var(--color-danger); padding: 0.25rem; font-size: 0.8rem;" title="Delete rule">✕</button>
  `;
  row.querySelector(".delete-geo-row-btn").addEventListener("click", () => {
    row.remove();
  });
  container.appendChild(row);
}

document.getElementById("addGeoRuleBtn").addEventListener("click", () => {
  addGeoRuleRow(document.getElementById("geoRulesListContainer"));
});

document.getElementById("editAddGeoRuleBtn").addEventListener("click", () => {
  addGeoRuleRow(document.getElementById("editGeoRulesListContainer"));
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
    
    // Resolve favicon URL
    let faviconUrl = "";
    try {
      const parsedUrl = new URL(originalUrl);
      faviconUrl = `https://www.google.com/s2/favicons?sz=64&domain=${parsedUrl.hostname}`;
    } catch (err) {
      console.warn("Invalid original URL for favicon parsing", err);
    }

    // Compile Geo Redirect rules
    const geoRules = {};
    const geoRedirectEnabled = document.getElementById("linkGeoRedirectEnabled").checked;
    if (geoRedirectEnabled) {
      const rows = document.querySelectorAll("#geoRulesListContainer .geo-rule-row");
      rows.forEach(row => {
        const country = row.querySelector(".geo-country-input").value.trim().toUpperCase();
        const url = row.querySelector(".geo-url-input").value.trim();
        if (country && url) {
          geoRules[country] = url;
        }
      });
    }

    // Compile Ad Setup Choice
    const adSetupOption = document.getElementById("linkAdSetupOption").value;
    const adSetupId = document.getElementById("linkAdSetupId").value;
    const manualAdSettings = {
      countdown: parseInt(document.getElementById("manualCountdown").value) || 10,
      autoRedirect: document.getElementById("manualAutoRedirect").checked,
      continueButtonText: document.getElementById("manualButtonText").value.trim() || "Click to Continue",
      headerAdScript: document.getElementById("manualHeaderAdScript").value,
      headerAdEnabled: document.getElementById("manualHeaderAdEnabled").checked,
      bodyAdScript: document.getElementById("manualBodyAdScript").value,
      bodyAdEnabled: document.getElementById("manualBodyAdEnabled").checked,
      footerAdScript: document.getElementById("manualFooterAdScript").value,
      footerAdEnabled: document.getElementById("manualFooterAdEnabled").checked,
      customAdScript: document.getElementById("manualCustomAdScript").value,
      customAdEnabled: document.getElementById("manualCustomAdEnabled").checked
    };

    // Save link object with all new fields
    const docRef = doc(db, "links", code);
    const linkDocData = {
      code: code,
      title: title || `Short link for ${code}`,
      originalUrl: originalUrl,
      createdAt: new Date().toISOString(),
      clicks: 0,
      status: true,
      faviconUrl: faviconUrl,

      // Advanced options
      adsCountdownEnabled: document.getElementById("linkAdsCountdownEnabled").checked,
      linkCloakingEnabled: document.getElementById("linkCloakingEnabled").checked,
      messagePageEnabled: document.getElementById("linkMessagePageEnabled").checked,
      messagePageTitle: document.getElementById("linkMessagePageTitle").value.trim() || "Confirm Redirection",
      messagePageText: document.getElementById("linkMessagePageText").value.trim() || "Please confirm to continue to your destination.",
      messagePageButton: document.getElementById("linkMessagePageButton").value.trim() || "Continue",
      externalBrowserEnabled: document.getElementById("linkExternalBrowserEnabled").checked,
      passwordProtectionEnabled: document.getElementById("linkPasswordProtectionEnabled").checked,
      passwordProtectionValue: document.getElementById("linkPasswordValue").value.trim(),
      ogTitle: document.getElementById("linkOgTitle").value.trim(),
      ogDescription: document.getElementById("linkOgDescription").value.trim(),
      ogImageUrl: document.getElementById("linkOgImageUrl").value.trim(),
      deviceRedirectEnabled: document.getElementById("linkDeviceRedirectEnabled").checked,
      desktopUrl: document.getElementById("linkDesktopUrl").value.trim(),
      androidUrl: document.getElementById("linkAndroidUrl").value.trim(),
      iosUrl: document.getElementById("linkIosUrl").value.trim(),
      geoRedirectEnabled: geoRedirectEnabled,
      geoRules: geoRules,
      geoDefaultUrl: document.getElementById("linkGeoDefaultUrl").value.trim(),

      // Ad setups linkage
      adSetupOption: adSetupOption,
      adSetupId: adSetupId,
      manualAdSettings: manualAdSettings
    };

    await setDoc(docRef, linkDocData);
    
    // Trigger Live Favicon & Title Preview
    const resultLinkPreview = document.getElementById("resultLinkPreview");
    const resultFavicon = document.getElementById("resultFavicon");
    const resultTitle = document.getElementById("resultTitle");
    if (resultLinkPreview && resultFavicon && resultTitle) {
      resultFavicon.src = faviconUrl || "";
      resultTitle.textContent = title || `Short link for ${code}`;
      resultLinkPreview.style.display = "flex";
    }

    const shortUrl = getShortBaseUrl() + code;
    resultShortUrl.value = shortUrl;
    linkResultBox.classList.remove("hidden");
    
    // Reset Form and Collapsible Sub-fields
    createLinkForm.reset();
    document.getElementById("geoRulesListContainer").innerHTML = "";
    advancedOptionsContainer.classList.add("hidden");
    advancedOptionsChevron.style.transform = "rotate(0deg)";
    toggleAdvancedOptionsBtn.classList.remove("active");
    
    // Hide all expanded fields
    document.getElementById("linkMessagePageFields").classList.add("hidden");
    document.getElementById("linkPasswordFields").classList.add("hidden");
    document.getElementById("linkDeviceFields").classList.add("hidden");
    document.getElementById("linkGeoFields").classList.add("hidden");
    document.getElementById("linkAdSetupSelectGroup").classList.add("hidden");
    document.getElementById("linkAdSetupManualGroup").classList.add("hidden");

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
    // Re-resolve favicon URL
    let faviconUrl = "";
    try {
      const parsedUrl = new URL(newUrl);
      faviconUrl = `https://www.google.com/s2/favicons?sz=64&domain=${parsedUrl.hostname}`;
    } catch (err) {
      console.warn("Invalid original URL for favicon parsing", err);
    }

    // Compile Geo Redirect rules
    const geoRules = {};
    const geoRedirectEnabled = document.getElementById("editLinkGeoRedirectEnabled").checked;
    if (geoRedirectEnabled) {
      const rows = document.querySelectorAll("#editGeoRulesListContainer .geo-rule-row");
      rows.forEach(row => {
        const country = row.querySelector(".geo-country-input").value.trim().toUpperCase();
        const url = row.querySelector(".geo-url-input").value.trim();
        if (country && url) {
          geoRules[country] = url;
        }
      });
    }

    // Compile Ad Setup Choice
    const adSetupOption = document.getElementById("editLinkAdSetupOption").value;
    const adSetupId = document.getElementById("editLinkAdSetupId").value;
    const manualAdSettings = {
      countdown: parseInt(document.getElementById("editManualCountdown").value) || 10,
      autoRedirect: document.getElementById("editManualAutoRedirect").checked,
      continueButtonText: document.getElementById("editManualButtonText").value.trim() || "Click to Continue",
      headerAdScript: document.getElementById("editManualHeaderAdScript").value,
      headerAdEnabled: document.getElementById("editManualHeaderAdEnabled").checked,
      bodyAdScript: document.getElementById("editManualBodyAdScript").value,
      bodyAdEnabled: document.getElementById("editManualBodyAdEnabled").checked,
      footerAdScript: document.getElementById("editManualFooterAdScript").value,
      footerAdEnabled: document.getElementById("editManualFooterAdEnabled").checked,
      customAdScript: document.getElementById("editManualCustomAdScript").value,
      customAdEnabled: document.getElementById("editManualCustomAdEnabled").checked
    };

    const docRef = doc(db, "links", id);
    await updateDoc(docRef, {
      title: newTitle || `Short link for ${id}`,
      originalUrl: newUrl,
      status: newStatus,
      faviconUrl: faviconUrl,

      // Advanced options
      adsCountdownEnabled: document.getElementById("editLinkAdsCountdownEnabled").checked,
      linkCloakingEnabled: document.getElementById("editLinkCloakingEnabled").checked,
      messagePageEnabled: document.getElementById("editLinkMessagePageEnabled").checked,
      messagePageTitle: document.getElementById("editLinkMessagePageTitle").value.trim() || "Confirm Redirection",
      messagePageText: document.getElementById("editLinkMessagePageText").value.trim() || "Please confirm to continue to your destination.",
      messagePageButton: document.getElementById("editLinkMessagePageButton").value.trim() || "Continue",
      externalBrowserEnabled: document.getElementById("editLinkExternalBrowserEnabled").checked,
      passwordProtectionEnabled: document.getElementById("editLinkPasswordProtectionEnabled").checked,
      passwordProtectionValue: document.getElementById("editLinkPasswordValue").value.trim(),
      ogTitle: document.getElementById("editLinkOgTitle").value.trim(),
      ogDescription: document.getElementById("editLinkOgDescription").value.trim(),
      ogImageUrl: document.getElementById("editLinkOgImageUrl").value.trim(),
      deviceRedirectEnabled: document.getElementById("editLinkDeviceRedirectEnabled").checked,
      desktopUrl: document.getElementById("editLinkDesktopUrl").value.trim(),
      androidUrl: document.getElementById("editLinkAndroidUrl").value.trim(),
      iosUrl: document.getElementById("editLinkIosUrl").value.trim(),
      geoRedirectEnabled: geoRedirectEnabled,
      geoRules: geoRules,
      geoDefaultUrl: document.getElementById("editLinkGeoDefaultUrl").value.trim(),

      // Ad setups linkage
      adSetupOption: adSetupOption,
      adSetupId: adSetupId,
      manualAdSettings: manualAdSettings
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

// Load all setups from Firestore and populate selectors
async function fetchSettings() {
  try {
    initSettingsDOMBindings();
    
    // Subscribe/fetch setups from collection "adSetups"
    const setupsCol = collection(db, "adSetups");
    const setupsSnapshot = await getDocs(setupsCol);
    
    adSetupsCache = [];
    setupsSnapshot.forEach(docSnap => {
      adSetupsCache.push({
        id: docSnap.id,
        ...docSnap.data()
      });
    });
    
    // If default setup doesn't exist, create it
    let defaultSetup = adSetupsCache.find(s => s.id === "default");
    if (!defaultSetup) {
      console.log("Default ad setup not found. Creating...");
      defaultSetup = {
        id: "default",
        name: "Default Ad Setup",
        isDefault: true,
        enabled: true,
        countdown: 10,
        autoRedirect: true,
        messagePageEnabled: false,
        continueButtonText: "Click to Continue",
        headerAdScript: "",
        headerAdEnabled: false,
        bodyAdScript: "",
        bodyAdEnabled: false,
        footerAdScript: "",
        footerAdEnabled: false,
        customAdScript: "",
        customAdEnabled: false
      };
      await setDoc(doc(db, "adSetups", "default"), defaultSetup);
      adSetupsCache.push(defaultSetup);
    }
    
    populateAdSetupSelectors();
    loadSetupIntoForm(selectedAdSetupId);
    
  } catch (err) {
    console.error("Fetch settings error:", err);
    showToast("Error loading Settings. Ensure Firestore rules are configured.", "warning");
  }
}

// Populate all select dropdowns with ad setups
function populateAdSetupSelectors() {
  if (!adSetupSelector) return;
  
  // Sort default setup first, then alphabetically by name
  const sortedSetups = [...adSetupsCache].sort((a, b) => {
    if (a.isDefault) return -1;
    if (b.isDefault) return 1;
    return a.name.localeCompare(b.name);
  });
  
  // 1. Selector in Ad Setup Manager Card
  adSetupSelector.innerHTML = sortedSetups.map(setup => {
    const isDefaultLabel = setup.isDefault ? " (Default)" : "";
    const activeLabel = setup.enabled ? "" : " [Disabled]";
    return `<option value="${setup.id}">${escapeHTML(setup.name)}${isDefaultLabel}${activeLabel}</option>`;
  }).join("");
  adSetupSelector.value = selectedAdSetupId;

  // 2. Selector in Create Link Advanced Options
  const linkAdSetupIdSelect = document.getElementById("linkAdSetupId");
  if (linkAdSetupIdSelect) {
    const customSetups = sortedSetups.filter(s => !s.isDefault && s.enabled);
    linkAdSetupIdSelect.innerHTML = customSetups.map(setup => {
      return `<option value="${setup.id}">${escapeHTML(setup.name)}</option>`;
    }).join("");
    if (customSetups.length === 0) {
      linkAdSetupIdSelect.innerHTML = `<option value="">No custom setups available</option>`;
    }
  }

  // 3. Selector in Edit Link Advanced Options
  const editLinkAdSetupIdSelect = document.getElementById("editLinkAdSetupId");
  if (editLinkAdSetupIdSelect) {
    const customSetups = sortedSetups.filter(s => !s.isDefault && s.enabled);
    editLinkAdSetupIdSelect.innerHTML = customSetups.map(setup => {
      return `<option value="${setup.id}">${escapeHTML(setup.name)}</option>`;
    }).join("");
    if (customSetups.length === 0) {
      editLinkAdSetupIdSelect.innerHTML = `<option value="">No custom setups available</option>`;
    }
  }
}

// Load selected setup configuration into settings form
function loadSetupIntoForm(setupId) {
  initSettingsDOMBindings();
  const setup = adSetupsCache.find(s => s.id === setupId);
  if (!setup) return;
  
  selectedAdSetupId = setupId;
  setupIdInput.value = setup.id;
  setupNameInput.value = setup.name;
  setupIsDefaultInput.checked = setup.isDefault === true;
  setupEnabledInput.checked = setup.enabled !== false;
  settingCountdownInput.value = setup.countdown || 10;
  settingAutoRedirectInput.checked = setup.autoRedirect !== false;
  settingMessagePageEnabledInput.checked = setup.messagePageEnabled === true;
  settingButtonTextInput.value = setup.continueButtonText || "Click to Continue";
  
  settingHeaderAdScript.value = setup.headerAdScript || "";
  settingHeaderAdEnabled.checked = setup.headerAdEnabled === true;
  settingBodyAdScript.value = setup.bodyAdScript || "";
  settingBodyAdEnabled.checked = setup.bodyAdEnabled === true;
  settingFooterAdScript.value = setup.footerAdScript || "";
  settingFooterAdEnabled.checked = setup.footerAdEnabled === true;
  settingCustomAdScript.value = setup.customAdScript || "";
  settingCustomAdEnabled.checked = setup.customAdEnabled === true;

  // Lock "Set as Default" if it is the default setup or named default
  if (setup.id === "default" || setup.isDefault) {
    setupIsDefaultInput.disabled = true;
    setupEnabledInput.disabled = true;
    deleteAdSetupBtn.classList.add("hidden");
    setupNameInput.disabled = true;
  } else {
    setupIsDefaultInput.disabled = false;
    setupEnabledInput.disabled = false;
    deleteAdSetupBtn.classList.remove("hidden");
    setupNameInput.disabled = false;
  }
}

// Setup Manager Event Listeners
document.addEventListener("change", (e) => {
  if (e.target && e.target.id === "adSetupSelector") {
    loadSetupIntoForm(e.target.value);
  }
});

// "+ Create New Setup" button click
document.addEventListener("click", (e) => {
  const btn = e.target.closest("#createNewAdSetupBtn");
  if (btn) {
    initSettingsDOMBindings();
    const newId = "setup_" + generateRandomCode(8).toLowerCase();
    
    // Clear and set fields for a new configuration
    selectedAdSetupId = newId;
    setupIdInput.value = newId;
    setupNameInput.value = "New Ad Setup";
    setupNameInput.disabled = false;
    setupIsDefaultInput.checked = false;
    setupIsDefaultInput.disabled = false;
    setupEnabledInput.checked = true;
    setupEnabledInput.disabled = false;
    settingCountdownInput.value = 10;
    settingAutoRedirectInput.checked = true;
    settingMessagePageEnabledInput.checked = false;
    settingButtonTextInput.value = "Click to Continue";
    
    settingHeaderAdScript.value = "";
    settingHeaderAdEnabled.checked = false;
    settingBodyAdScript.value = "";
    settingBodyAdEnabled.checked = false;
    settingFooterAdScript.value = "";
    settingFooterAdEnabled.checked = false;
    settingCustomAdScript.value = "";
    settingCustomAdEnabled.checked = false;
    
    // Show delete button
    deleteAdSetupBtn.classList.remove("hidden");
    
    // Temporarily add to selector options so it's active in editing
    const option = document.createElement("option");
    option.value = newId;
    option.textContent = "New Ad Setup";
    adSetupSelector.appendChild(option);
    adSetupSelector.value = newId;
    
    showToast("Prepared a new custom ad setup! Set a name and save.", "info");
  }
});

// "Delete Setup" button click
document.addEventListener("click", async (e) => {
  const btn = e.target.closest("#deleteAdSetupBtn");
  if (btn) {
    const id = setupIdInput.value;
    if (id === "default") return;
    
    if (!confirm("Are you sure you want to delete this custom ad configuration?")) return;
    
    btn.disabled = true;
    
    try {
      const docRef = doc(db, "adSetups", id);
      await deleteDoc(docRef);
      
      adSetupsCache = adSetupsCache.filter(s => s.id !== id);
      selectedAdSetupId = "default";
      
      showToast("Ad Setup configuration deleted.", "info");
      logActivity("warning", `Deleted ad configuration setup: '${id}'`);
      
      populateAdSetupSelectors();
      loadSetupIntoForm("default");
    } catch (err) {
      console.error("Delete setup error:", err);
      showToast("Failed to delete ad setup.", "error");
    } finally {
      btn.disabled = false;
    }
  }
});

// Form Submit: Save Ad Setup
document.addEventListener("submit", async (e) => {
  if (e.target && e.target.id === "settingsForm") {
    e.preventDefault();
    initSettingsDOMBindings();
    
    const id = setupIdInput.value;
    const name = setupNameInput.value.trim();
    const isDefault = setupIsDefaultInput.checked;
    const enabled = setupEnabledInput.checked;
    const countdown = parseInt(settingCountdownInput.value);
    const autoRedirect = settingAutoRedirectInput.checked;
    const messagePageEnabled = settingMessagePageEnabledInput.checked;
    const continueButtonText = settingButtonTextInput.value.trim();
    
    const headerAdScript = settingHeaderAdScript.value;
    const headerAdEnabled = settingHeaderAdEnabled.checked;
    const bodyAdScript = settingBodyAdScript.value;
    const bodyAdEnabled = settingBodyAdEnabled.checked;
    const footerAdScript = settingFooterAdScript.value;
    const footerAdEnabled = settingFooterAdEnabled.checked;
    const customAdScript = settingCustomAdScript.value;
    const customAdEnabled = settingCustomAdEnabled.checked;
    
    if (countdown < 0 || countdown > 60) {
      showToast("Countdown must be between 0 and 60 seconds.", "warning");
      return;
    }
    
    saveAdSetupBtn.disabled = true;
    const originalText = saveAdSetupBtn.innerHTML;
    saveAdSetupBtn.innerHTML = `<div class="spinner"></div> <span>Saving...</span>`;
    
    try {
      // 1. If this setup is set as default, clear the default flag on other setups first
      if (isDefault && id !== "default") {
        const batchPromises = adSetupsCache.map(async (s) => {
          if (s.id !== id && s.isDefault) {
            const docRef = doc(db, "adSetups", s.id);
            await updateDoc(docRef, { isDefault: false });
            s.isDefault = false;
          }
        });
        await Promise.all(batchPromises);
        
        // Also clear standard settings default config pointer if we want
        const configDocRef = doc(db, "settings", "config");
        await setDoc(configDocRef, { defaultAdSetupId: id }, { merge: true });
      }
      
      const newSetup = {
        id,
        name,
        isDefault,
        enabled,
        countdown,
        autoRedirect,
        messagePageEnabled,
        continueButtonText,
        headerAdScript,
        headerAdEnabled,
        bodyAdScript,
        bodyAdEnabled,
        footerAdScript,
        footerAdEnabled,
        customAdScript,
        customAdEnabled
      };
      
      const docRef = doc(db, "adSetups", id);
      await setDoc(docRef, newSetup);
      
      // Update in local cache
      const cachedIdx = adSetupsCache.findIndex(s => s.id === id);
      if (cachedIdx > -1) {
        adSetupsCache[cachedIdx] = newSetup;
      } else {
        adSetupsCache.push(newSetup);
      }
      
      selectedAdSetupId = id;
      
      showToast("Configuration saved successfully!", "success");
      logActivity("success", `Saved settings for ad configuration: '${name}'`);
      
      populateAdSetupSelectors();
      loadSetupIntoForm(id);
      
    } catch (err) {
      console.error("Save ad setup error:", err);
      showToast("Failed to save ad setup configurations.", "error");
    } finally {
      saveAdSetupBtn.disabled = false;
      saveAdSetupBtn.innerHTML = originalText;
    }
  }
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

// Collapsible Ad Settings Accordion via delegation
document.addEventListener("click", (e) => {
  const header = e.target.closest(".ad-section-header");
  if (header) {
    const card = header.closest(".settings-sub-card");
    if (card) {
      card.classList.toggle("open");
    }
  }
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
