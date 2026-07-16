import { db } from "./firebase-config.js";
import { 
  doc, 
  getDoc, 
  updateDoc, 
  increment 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// DOM Elements
const loadingView = document.getElementById("loadingView");
const countdownView = document.getElementById("countdownView");
const errorView = document.getElementById("errorView");

const pageTitleDisplay = document.getElementById("pageTitleDisplay");
const countdownNumber = document.getElementById("countdownNumber");
const timerCircleProgress = document.getElementById("timerCircleProgress");
const redirectBtn = document.getElementById("redirectBtn");
const redirectBtnText = document.getElementById("redirectBtnText");

const adSpaceTop = document.getElementById("adSpaceTop");
const adSpaceBottom = document.getElementById("adSpaceBottom");
const adContainerTop = document.getElementById("adContainerTop");
const adContainerBottom = document.getElementById("adContainerBottom");
const generalAdScriptWrapper = document.getElementById("generalAdScriptWrapper");

const errorTitle = document.getElementById("errorTitle");
const errorSubtitle = document.getElementById("errorSubtitle");

// Global states
let timeLeft = 10;
let totalTime = 10;
let countdownInterval = null;
let destinationUrl = "";
let autoRedirect = true;
let customButtonText = "Click to Continue";

// ----------------------------------------------------
// 1. Initialization and Data Lookup
// ----------------------------------------------------

async function initRedirection() {
  // Extract short code from URL parameters
  const urlParams = new URLSearchParams(window.location.search);
  const code = urlParams.get("code") || urlParams.get("c");
  
  if (!code) {
    showError("Link Code Missing", "Please provide a valid short link URL parameter.");
    return;
  }
  
  const sanitizedCode = code.trim().toLowerCase();
  
  try {
    // 1. Fetch short link document from Firestore
    const linkDocRef = doc(db, "links", sanitizedCode);
    const linkDocSnap = await getDoc(linkDocRef);
    
    if (!linkDocSnap.exists()) {
      showError("Link Not Found", "The link you are trying to access does not exist or has been deleted.");
      return;
    }
    
    const linkData = linkDocSnap.data();
    
    // 2. Validate status
    if (linkData.status !== true) {
      showError("Link Inactive", "This short link is currently disabled by the administrator.");
      return;
    }
    
    destinationUrl = linkData.originalUrl;
    
    // 3. Increment click count in Firestore
    try {
      await updateDoc(linkDocRef, {
        clicks: increment(1)
      });
    } catch (err) {
      console.warn("Failed to increment click counter (check Firestore rules):", err);
    }
    
    // 4. Fetch site configuration details
    let settings = {
      pageTitle: "Short Link Redirection | AdLinker",
      buttonText: "Click to Continue",
      countdown: 10,
      autoRedirect: true,
      adScript: ""
    };
    
    try {
      const configDocRef = doc(db, "settings", "config");
      const configDocSnap = await getDoc(configDocRef);
      if (configDocSnap.exists()) {
        const configData = configDocSnap.data();
        settings.pageTitle = configData.pageTitle || settings.pageTitle;
        settings.buttonText = configData.buttonText || settings.buttonText;
        settings.countdown = configData.countdown || settings.countdown;
        settings.autoRedirect = configData.autoRedirect !== false; // default true
        settings.adScript = configData.adScript || "";
      }
    } catch (err) {
      console.warn("Settings document not accessible, using default fallback parameters.", err);
    }
    
    // 5. Apply configurations to DOM
    document.title = settings.pageTitle;
    pageTitleDisplay.textContent = settings.pageTitle;
    customButtonText = settings.buttonText;
    autoRedirect = settings.autoRedirect;
    totalTime = settings.countdown;
    timeLeft = settings.countdown;
    
    // 6. Inject and execute third-party ad scripts
    if (settings.adScript) {
      injectAndRunAdScript(settings.adScript);
    }
    
    // 7. Transition UI and Start timer countdown
    loadingView.classList.add("hidden");
    countdownView.classList.remove("hidden");
    startTimer();
    
  } catch (error) {
    console.error("Redirection boot error:", error);
    showError("Service Interrupted", "An error occurred while loading this link. Please try again later.");
  }
}

// ----------------------------------------------------
// 2. Helper: Display Error
// ----------------------------------------------------

function showError(title, subtitle) {
  errorTitle.textContent = title;
  errorSubtitle.textContent = subtitle;
  loadingView.classList.add("hidden");
  countdownView.classList.add("hidden");
  errorView.classList.remove("hidden");
}

// ----------------------------------------------------
// 3. Ad Scripts Execution Engine
// ----------------------------------------------------

function injectAndRunAdScript(adScriptHtml) {
  if (!adScriptHtml) return;

  try {
    // Show structural elements
    adSpaceTop.classList.remove("hidden");
    adSpaceBottom.classList.remove("hidden");
    
    // Parse HTML string in memory
    const parser = new DOMParser();
    const docParsed = parser.parseFromString(adScriptHtml, "text/html");
    
    // Move layout nodes (banners, text) to target locations
    const nodes = Array.from(docParsed.body.childNodes);
    nodes.forEach(node => {
      if (node.nodeType === Node.ELEMENT_NODE && node.tagName !== "SCRIPT") {
        adContainerTop.appendChild(node.cloneNode(true));
        adContainerBottom.appendChild(node.cloneNode(true));
      } else if (node.nodeType === Node.TEXT_NODE && node.textContent.trim()) {
        // Handle plain texts
        const textNodeTop = document.createTextNode(node.textContent);
        const textNodeBottom = document.createTextNode(node.textContent);
        adContainerTop.appendChild(textNodeTop);
        adContainerBottom.appendChild(textNodeBottom);
      }
    });

    // Execute scripts dynamically
    const scripts = Array.from(docParsed.querySelectorAll("script"));
    scripts.forEach(oldScript => {
      const newScript = document.createElement("script");
      
      // Copy all script attributes
      Array.from(oldScript.attributes).forEach(attr => {
        newScript.setAttribute(attr.name, attr.value);
      });
      
      // Copy inline script contents
      newScript.textContent = oldScript.textContent;
      
      // Add to wrapper to trigger load/execution
      generalAdScriptWrapper.appendChild(newScript);
    });
  } catch (err) {
    console.error("Ad scripts rendering failed:", err);
  }
}

// ----------------------------------------------------
// 4. Circular Countdown Timer Logic
// ----------------------------------------------------

function startTimer() {
  countdownNumber.textContent = timeLeft;
  
  // Reset dashoffset progress bar (starts at full outline)
  timerCircleProgress.style.strokeDashoffset = "0";
  
  countdownInterval = setInterval(() => {
    timeLeft--;
    
    // Update numerical value
    countdownNumber.textContent = timeLeft >= 0 ? timeLeft : 0;
    
    // Update SVG Circular progression
    // dasharray total = 440 (2 * PI * r)
    const progressOffset = 440 - (440 * (timeLeft / totalTime));
    timerCircleProgress.style.strokeDashoffset = Math.min(Math.max(progressOffset, 0), 440);
    
    if (timeLeft <= 0) {
      clearInterval(countdownInterval);
      handleTimerComplete();
    }
  }, 1000);
}

function handleTimerComplete() {
  // Update button visual states
  redirectBtn.removeAttribute("disabled");
  redirectBtnText.textContent = customButtonText;
  
  // Attach user click trigger
  redirectBtn.addEventListener("click", () => {
    window.location.href = destinationUrl;
  });

  // Automatically trigger redirection if enabled
  if (autoRedirect) {
    setTimeout(() => {
      window.location.replace(destinationUrl);
    }, 500); // Small visual buffer to show 0 before leaving
  }
}

// Run loader on entry
window.addEventListener("DOMContentLoaded", initRedirection);
