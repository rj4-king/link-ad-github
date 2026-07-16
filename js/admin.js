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
  updateDoc, 
  deleteDoc, 
  onSnapshot, 
  query, 
  orderBy, 
  serverTimestamp 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

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
const customCodeInput = document.getElementById("customCodeInput");
const generateCodeBtn = document.getElementById("generateCodeBtn");
const createLinkSubmitBtn = document.getElementById("createLinkSubmitBtn");
const linkResultBox = document.getElementById("linkResultBox");
const resultShortUrl = document.getElementById("resultShortUrl");
const copyResultBtn = document.getElementById("copyResultBtn");

// DOM Elements - Link Table & Search
const searchInput = document.getElementById("searchInput");
const linksTableBody = document.getElementById("linksTableBody");

// DOM Elements - Settings
const settingsForm = document.getElementById("settingsForm");
const settingPageTitle = document.getElementById("settingPageTitle");
const settingButtonText = document.getElementById("settingButtonText");
const settingCountdown = document.getElementById("settingCountdown");
const settingAutoRedirect = document.getElementById("settingAutoRedirect");
const settingAdScript = document.getElementById("settingAdScript");
const saveSettingsBtn = document.getElementById("saveSettingsBtn");

// DOM Elements - Modals
const editModal = document.getElementById("editModal");
const editLinkForm = document.getElementById("editLinkForm");
const editLinkId = document.getElementById("editLinkId");
const editLinkCode = document.getElementById("editLinkCode");
const editLinkUrl = document.getElementById("editLinkUrl");
const editLinkStatus = document.getElementById("editLinkStatus");
const closeEditModalBtn = document.getElementById("closeEditModalBtn");
const cancelEditBtn = document.getElementById("cancelEditBtn");

const deleteModal = document.getElementById("deleteModal");
const deleteLinkDisplay = document.getElementById("deleteLinkDisplay");
const deleteLinkId = document.getElementById("deleteLinkId");
const confirmDeleteBtn = document.getElementById("confirmDeleteBtn");
const cancelDeleteBtn = document.getElementById("cancelDeleteBtn");

// DOM Elements - Toast Container
const toastContainer = document.getElementById("toastContainer");

// Global states
let linksCache = [];
let unsubscribeLinks = null;

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
  
  // Auto remove toast after 3.5 seconds
  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateX(50px)";
    toast.style.transition = "all 0.3s ease";
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

// Helper: Construct short URL base path dynamically to support root paths or subfolder scopes (e.g. GitHub Pages repo folders)
function getShortBaseUrl() {
  const loc = window.location;
  let path = loc.pathname;
  if (path.endsWith("admin.html")) {
    path = path.slice(0, -10); // Remove "admin.html"
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
    
    // Bind Realtime listeners
    bindRealtimeLinks();
    fetchSettings();
  } else {
    // Unauthenticated state
    authScreen.style.display = "flex";
    dashboardScreen.style.display = "none";
    
    // Clear dynamic listeners
    if (unsubscribeLinks) {
      unsubscribeLinks();
      unsubscribeLinks = null;
    }
  }
});

// Login Form Submit Handler
loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  
  const email = loginEmail.value.trim();
  const password = loginPassword.value;
  
  // Set Loading
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
  } finally {
    // Reset Loading State
    loginSubmitBtn.disabled = false;
    loginSubmitBtn.innerHTML = `<span>Sign In</span>`;
  }
});

// Logout Button Click Handler
logoutBtn.addEventListener("click", async () => {
  try {
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
      // Ensure we preserve id (which is the short code)
      linksCache.push({
        id: doc.id,
        ...data
      });
      totalClicks += (data.clicks || 0);
      if (data.status) activeCount++;
    });
    
    // Update Stats panel
    statTotalLinks.textContent = linksCache.length;
    statTotalClicks.textContent = totalClicks;
    statActiveLinks.textContent = activeCount;
    
    // Render links
    renderLinksTable(linksCache);
  }, (error) => {
    console.error("Firestore links fetch failed:", error);
    showToast("Failed to fetch links. Check security rules.", "error");
  });
}

// Render Links list in Table
function renderLinksTable(links) {
  const queryText = searchInput.value.toLowerCase().trim();
  
  // Filter links if search query exists
  const filteredLinks = links.filter(link => {
    return link.id.toLowerCase().includes(queryText) || 
           link.originalUrl.toLowerCase().includes(queryText);
  });
  
  if (filteredLinks.length === 0) {
    linksTableBody.innerHTML = `
      <tr>
        <td colspan="5" class="text-center text-muted" style="padding: 2.5rem 0;">
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
          <div class="link-original" title="${link.originalUrl}">${escapeHTML(link.originalUrl)}</div>
        </td>
        <td class="text-center font-weight-600">${link.clicks || 0}</td>
        <td class="text-center">
          <label class="switch">
            <input type="checkbox" class="toggle-status-checkbox" data-id="${link.id}" ${isChecked}>
            <span class="slider"></span>
          </label>
        </td>
        <td class="text-right">
          <div class="flex gap-2" style="justify-content: flex-end;">
            <button class="btn-icon-only edit-link-btn" data-id="${link.id}" data-url="${link.originalUrl}" data-status="${link.status}" title="Edit destination URL">
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
  
  // Attach Event Listeners to rendered elements
  attachTableEventListeners();
}

// Bind events in Table (copy, toggle status, edit click, delete click)
function attachTableEventListeners() {
  // 1. Copy Short URL
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

  // 2. Toggle status switch
  document.querySelectorAll(".toggle-status-checkbox").forEach(checkbox => {
    checkbox.addEventListener("change", async () => {
      const id = checkbox.getAttribute("data-id");
      const newStatus = checkbox.checked;
      
      try {
        const docRef = doc(db, "links", id);
        await updateDoc(docRef, { status: newStatus });
        showToast(`Link "${id}" has been ${newStatus ? 'enabled' : 'disabled'}.`, "info");
      } catch (err) {
        console.error("Status toggle error:", err);
        showToast("Error updating link status.", "error");
        // Revert UI check state on failure
        checkbox.checked = !newStatus;
      }
    });
  });

  // 3. Edit Link Modal trigger
  document.querySelectorAll(".edit-link-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-id");
      const url = btn.getAttribute("data-url");
      const status = btn.getAttribute("data-status") === "true";
      
      editLinkId.value = id;
      editLinkCode.value = id;
      editLinkUrl.value = url;
      editLinkStatus.checked = status;
      
      editModal.classList.add("active");
    });
  });

  // 4. Delete Confirmation trigger
  document.querySelectorAll(".delete-link-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-id");
      deleteLinkId.value = id;
      deleteLinkDisplay.textContent = `/${id}`;
      deleteModal.classList.add("active");
    });
  });
}

// Search input keyup listener
searchInput.addEventListener("input", () => {
  renderLinksTable(linksCache);
});

// Helper: Escape HTML content to prevent XSS
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
// 3. Link Creation Handler
// ----------------------------------------------------

// Custom code input: restrict input characters
customCodeInput.addEventListener("keypress", (e) => {
  // Allow only alphanumeric, dash and underscore
  const char = String.fromCharCode(e.which);
  if (!/^[a-zA-Z0-9-_]+$/.test(char)) {
    e.preventDefault();
  }
});

// Auto Generate Code Button Click
generateCodeBtn.addEventListener("click", () => {
  customCodeInput.value = generateRandomCode();
});

// Creation form submit
createLinkForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  
  const originalUrl = originalUrlInput.value.trim();
  let code = customCodeInput.value.trim().toLowerCase();
  
  // Client-side validations
  if (!originalUrl.startsWith("http://") && !originalUrl.startsWith("https://")) {
    showToast("Please enter a valid HTTP or HTTPS destination URL.", "warning");
    return;
  }
  
  createLinkSubmitBtn.disabled = true;
  createLinkSubmitBtn.innerHTML = `<div class="spinner"></div> <span>Generating Link...</span>`;
  
  try {
    // If code is empty, generate a unique random one
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
      // Validate that custom code does not exist in DB already
      const docRef = doc(db, "links", code);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        showToast("This short code is already in use. Please choose another.", "error");
        createLinkSubmitBtn.disabled = false;
        createLinkSubmitBtn.innerHTML = `<span>Create Shortened Link</span>`;
        return;
      }
    }
    
    // Save to Firestore links collection with docId = code
    const docRef = doc(db, "links", code);
    await setDoc(docRef, {
      code: code,
      originalUrl: originalUrl,
      createdAt: new Date().toISOString(), // Use ISOString to make querying or sorting simple
      clicks: 0,
      status: true
    });
    
    // Show success results box
    const shortUrl = getShortBaseUrl() + code;
    resultShortUrl.value = shortUrl;
    linkResultBox.classList.remove("hidden");
    
    // Reset Form
    createLinkForm.reset();
    showToast("Shortened URL created successfully!", "success");
    
  } catch (error) {
    console.error("Create link error:", error);
    showToast(error.message || "Failed to create short link.", "error");
  } finally {
    createLinkSubmitBtn.disabled = false;
    createLinkSubmitBtn.innerHTML = `<span>Create Shortened Link</span>`;
  }
});

// Copy newly generated short URL
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

// Close Edit Modal
function closeEditModal() {
  editModal.classList.remove("active");
  editLinkForm.reset();
}

closeEditModalBtn.addEventListener("click", closeEditModal);
cancelEditBtn.addEventListener("click", closeEditModal);

// Close Delete Modal
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
      originalUrl: newUrl,
      status: newStatus
    });
    
    showToast("Short link updated successfully!", "success");
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
    closeDeleteModal();
  } catch (err) {
    console.error("Delete link error:", err);
    showToast("Failed to delete short link.", "error");
  } finally {
    confirmDeleteBtn.disabled = false;
    confirmDeleteBtn.innerHTML = `Delete Link`;
  }
});

// Close modals when clicking overlay wrapper
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
      settingAdScript.value = data.adScript || "";
    } else {
      // Setup default configuration inside inputs if nothing exists in Firestore
      settingPageTitle.value = "Short Link Redirection | AdLinker";
      settingButtonText.value = "Click to Continue";
      settingCountdown.value = 10;
      settingAutoRedirect.checked = true;
      settingAdScript.value = "";
    }
  } catch (err) {
    console.error("Fetch settings error:", err);
    showToast("Error loading Settings. Ensure Firestore collections are initialized.", "warning");
  }
}

settingsForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  
  const pageTitle = settingPageTitle.value.trim();
  const buttonText = settingButtonText.value.trim();
  const countdown = parseInt(settingCountdown.value);
  const autoRedirect = settingAutoRedirect.checked;
  const adScript = settingAdScript.value;
  
  // Timer bounds validation
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
      autoRedirect,
      adScript
    });
    
    showToast("Configuration saved successfully!", "success");
  } catch (err) {
    console.error("Save settings error:", err);
    showToast("Failed to save settings configurations.", "error");
  } finally {
    saveSettingsBtn.disabled = false;
    saveSettingsBtn.innerHTML = `<span>Save Settings</span>`;
  }
});
