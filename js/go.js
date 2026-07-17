window.firebaseAppLoaded = true;
import { db } from "./firebase-config.js";
import { 
  doc, 
  getDoc, 
  setDoc,
  updateDoc, 
  increment,
  addDoc,
  collection
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// DOM Elements
const skeletonView = document.getElementById("skeletonView");
const countdownView = document.getElementById("countdownView");
const errorView = document.getElementById("errorView");
const missingLinkView = document.getElementById("missingLinkView");

const pageTitleDisplay = document.getElementById("pageTitleDisplay");
const countdownNumber = document.getElementById("countdownNumber");
const timerCircleProgress = document.getElementById("timerCircleProgress");
const redirectBtn = document.getElementById("redirectBtn");
const redirectBtnText = document.getElementById("redirectBtnText");

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
let redirectionStarted = false;

// ----------------------------------------------------
// 1. Initialization and Parallel Data Lookup
// ----------------------------------------------------

async function initRedirection() {
  if (redirectionStarted) return;
  redirectionStarted = true;

  // Extract short code from URL parameters
  const urlParams = new URLSearchParams(window.location.search);
  const code = urlParams.get("code") || urlParams.get("c");
  
  // Default fallback configurations
  let settings = {
    pageTitle: "Short Link Redirection | AdLinker",
    buttonText: "Click to Continue",
    countdown: 10,
    autoRedirect: true,
    headerAdScript: "",
    headerAdEnabled: false,
    bodyAdScript: "",
    bodyAdEnabled: false,
    footerAdScript: "",
    footerAdEnabled: false,
    customAdScript: "",
    customAdEnabled: false
  };

  try {
    const configDocRef = doc(db, "settings", "config");
    
    if (code) {
      const sanitizedCode = code.trim().toLowerCase();
      
      const linkDocRef = doc(db, "links", sanitizedCode);

      // Fetch short link and global settings configuration in parallel
      const [linkDocSnap, configDocSnap] = await Promise.all([
        getDoc(linkDocRef),
        getDoc(configDocRef)
      ]);
      
      parseSettings(configDocSnap, settings);

      // A. Check if the link exists
      if (!linkDocSnap.exists()) {
        await logRedirectFailure(sanitizedCode, "Short code does not exist.");
        showMissingLinkPage(settings);
        return;
      }
      
      const linkData = linkDocSnap.data();
      
      // B. Check link active status
      if (linkData.status !== true) {
        await logRedirectFailure(sanitizedCode, "Short link is disabled by administrator.");
        showMissingLinkPage(settings);
        return;
      }

      destinationUrl = linkData.originalUrl;
      // Ensure original URL has a protocol before routing to prevent relative loops
      if (destinationUrl && !/^https?:\/\//i.test(destinationUrl)) {
        destinationUrl = "https://" + destinationUrl;
      }
      
      // C. Increment click count in Firestore (background write)
      updateDoc(linkDocRef, {
        clicks: increment(1)
      }).catch(err => {
        console.warn("Failed to increment click counter:", err);
      });
      
      // D. Apply config states to DOM
      document.title = settings.pageTitle;
      pageTitleDisplay.textContent = settings.pageTitle;
      customButtonText = settings.buttonText;
      autoRedirect = settings.autoRedirect;
      totalTime = settings.countdown;
      timeLeft = settings.countdown;
      
      // E. Lazy load active ad script blocks
      injectAdScripts(settings, false);
      
      // F. Transition UI and Start timer countdown
      skeletonView.classList.add("hidden");
      countdownView.classList.remove("hidden");
      startTimer();
      
    } else {
      // Code parameter missing entirely
      const configDocSnap = await getDoc(configDocRef);
      parseSettings(configDocSnap, settings);
      
      await logRedirectFailure("none", "Link code parameter is missing in URL.");
      showMissingLinkPage(settings);
    }
    
  } catch (error) {
    console.error("Redirection boot error:", error);
    showError("Service Interrupted", "An error occurred while loading this link. Please try again later.");
    const errCode = code ? code.trim().toLowerCase() : "none";
    logRedirectFailure(errCode, "Redirection system error: " + error.message);
  }
}

// Helper to parse settings configurations
function parseSettings(configDocSnap, settings) {
  if (configDocSnap && configDocSnap.exists()) {
    const configData = configDocSnap.data();
    settings.pageTitle = configData.pageTitle || settings.pageTitle;
    settings.buttonText = configData.buttonText || settings.buttonText;
    settings.countdown = configData.countdown || settings.countdown;
    settings.autoRedirect = configData.autoRedirect !== false;
    
    // Legacy general ad script fallback
    settings.adScript = configData.adScript || "";
    
    // Load individual ad properties
    settings.headerAdScript = configData.headerAdScript || "";
    settings.headerAdEnabled = configData.headerAdEnabled === true;
    settings.bodyAdScript = configData.bodyAdScript || "";
    settings.bodyAdEnabled = configData.bodyAdEnabled === true;
    settings.footerAdScript = configData.footerAdScript || "";
    settings.footerAdEnabled = configData.footerAdEnabled === true;
    settings.customAdScript = configData.customAdScript || "";
    settings.customAdEnabled = configData.customAdEnabled === true;
  }
}

// ----------------------------------------------------
// 2. UI View Transitions & Errors
// ----------------------------------------------------

function showError(title, subtitle) {
  errorTitle.textContent = title;
  errorSubtitle.textContent = subtitle;
  skeletonView.classList.add("hidden");
  countdownView.classList.add("hidden");
  missingLinkView.classList.add("hidden");
  errorView.classList.remove("hidden");
}

function showMissingLinkPage(settings) {
  document.title = "Short Link | AdLinker";
  
  // Inject and render ads into missingLinkView placeholders
  injectAdScripts(settings, true);
  
  // Transition UI
  skeletonView.classList.add("hidden");
  countdownView.classList.add("hidden");
  errorView.classList.add("hidden");
  missingLinkView.classList.remove("hidden");
}

// ----------------------------------------------------
// 3. Ad Script Execution Helper
// ----------------------------------------------------

function injectAdScripts(settings, isMissingPage) {
  const suffix = isMissingPage ? "missingAd" : "ad";
  
  const hasAnyNewAd = (settings.headerAdEnabled && settings.headerAdScript) ||
                      (settings.bodyAdEnabled && settings.bodyAdScript) ||
                      (settings.footerAdEnabled && settings.footerAdScript) ||
                      (settings.customAdEnabled && settings.customAdScript);
                      
  if (hasAnyNewAd) {
    if (settings.headerAdEnabled && settings.headerAdScript) {
      injectSingleAd(settings.headerAdScript, `${suffix}ContainerHeader`);
    }
    if (settings.bodyAdEnabled && settings.bodyAdScript) {
      injectSingleAd(settings.bodyAdScript, `${suffix}ContainerBody`);
    }
    if (settings.footerAdEnabled && settings.footerAdScript) {
      injectSingleAd(settings.footerAdScript, `${suffix}ContainerFooter`);
    }
    if (settings.customAdEnabled && settings.customAdScript) {
      injectSingleAd(settings.customAdScript, `${suffix}ContainerExtra`);
    }
  } else if (settings.adScript) {
    // Fallback to legacy general ad script in the body container if no new ad slots are configured
    injectSingleAd(settings.adScript, `${suffix}ContainerBody`);
  }
}

function injectSingleAd(adScriptHtml, containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  
  // Make parent container space visible
  const parentSpace = container.parentElement;
  if (parentSpace) {
    parentSpace.classList.remove("hidden");
  }
  
  try {
    const parser = new DOMParser();
    const docParsed = parser.parseFromString(adScriptHtml, "text/html");
    
    // Copy visual layout elements
    Array.from(docParsed.body.childNodes).forEach(node => {
      if (node.nodeType === Node.ELEMENT_NODE && node.tagName !== "SCRIPT") {
        container.appendChild(node.cloneNode(true));
      } else if (node.nodeType === Node.TEXT_NODE && node.textContent.trim()) {
        container.appendChild(document.createTextNode(node.textContent));
      }
    });
    
    // Inject scripts to execute in general execution context
    Array.from(docParsed.querySelectorAll("script")).forEach(oldScript => {
      const newScript = document.createElement("script");
      Array.from(oldScript.attributes).forEach(attr => {
        newScript.setAttribute(attr.name, attr.value);
      });
      newScript.textContent = oldScript.textContent;
      generalAdScriptWrapper.appendChild(newScript);
    });
  } catch (err) {
    console.error(`Ad scripts rendering failed inside #${containerId}:`, err);
  }
}


// ----------------------------------------------------
// 5. Log Redirection Errors to Notifications Center
// ----------------------------------------------------

async function logRedirectFailure(code, reason) {
  try {
    await addDoc(collection(db, "notifications"), {
      type: "error",
      category: "failed_redirect",
      message: `Failed redirect for /${code}: ${reason}`,
      timestamp: Date.now(),
      read: false
    });
  } catch (err) {
    console.warn("Failed to write failure notification to Firebase:", err);
  }
}

// ----------------------------------------------------
// 6. Circular Countdown Timer Logic
// ----------------------------------------------------

function startTimer() {
  countdownNumber.textContent = timeLeft;
  timerCircleProgress.style.strokeDashoffset = "0";
  
  countdownInterval = setInterval(() => {
    timeLeft--;
    countdownNumber.textContent = timeLeft >= 0 ? timeLeft : 0;
    
    const progressOffset = 440 - (440 * (timeLeft / totalTime));
    timerCircleProgress.style.strokeDashoffset = Math.min(Math.max(progressOffset, 0), 440);
    
    if (timeLeft <= 0) {
      clearInterval(countdownInterval);
      handleTimerComplete();
    }
  }, 1000);
}

function handleTimerComplete() {
  redirectBtn.removeAttribute("disabled");
  redirectBtnText.textContent = customButtonText;
  
  redirectBtn.addEventListener("click", () => {
    window.location.href = destinationUrl;
  });

  if (autoRedirect) {
    setTimeout(() => {
      window.location.replace(destinationUrl);
    }, 500);
  }
}

// Run loader on entry
window.addEventListener("DOMContentLoaded", initRedirection);
