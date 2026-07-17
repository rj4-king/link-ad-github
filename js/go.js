window.firebaseAppLoaded = true;
import { auth, db } from "./firebase-config.js";
import { 
  doc, 
  getDoc, 
  updateDoc, 
  increment,
  addDoc,
  collection,
  query,
  where,
  limit,
  getDocs
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
let fallbackTimer = null;
let isFrameableResult = true;

// ----------------------------------------------------
// 1. Initialization and Parallel Data Lookup
// ----------------------------------------------------

async function fetchCountryCode() {
  try {
    const res = await fetch("https://freeipapi.com/api/json");
    if (res.ok) {
      const data = await res.json();
      if (data && data.countryCode) {
        return data.countryCode.toUpperCase();
      }
    }
  } catch (err) {
    console.warn("freeipapi failed, falling back to ipapi.co...", err);
  }
  
  try {
    const res = await fetch("https://ipapi.co/json/");
    if (res.ok) {
      const data = await res.json();
      if (data && data.country_code) {
        return data.country_code.toUpperCase();
      }
    }
  } catch (err) {
    console.error("IP Geolocation failed:", err);
  }
  return null;
}

function setOpenGraphMeta(ogData) {
  if (!ogData) return;
  const updateOrCreateMeta = (property, content) => {
    if (!content) return;
    let meta = document.querySelector(`meta[property="${property}"]`);
    if (!meta) {
      meta = document.createElement("meta");
      meta.setAttribute("property", property);
      document.head.appendChild(meta);
    }
    meta.setAttribute("content", content);
  };
  
  updateOrCreateMeta("og:title", ogData.title);
  updateOrCreateMeta("og:description", ogData.description);
  updateOrCreateMeta("og:image", ogData.imageUrl);
  
  if (ogData.title) {
    document.title = ogData.title;
  }
}

async function initRedirection() {
  if (redirectionStarted) return;
  redirectionStarted = true;

  console.log("[go.js] Initializing main redirection script...");
  console.log("Current Page: PAGE: Short Link Loading");
  
  const urlParams = new URLSearchParams(window.location.search);
  const code = urlParams.get("code") || urlParams.get("c");
  
  let fallbackSettings = {
    countdown: 10,
    autoRedirect: true,
    continueButtonText: "Click to Continue",
    messagePageEnabled: false
  };

  // Schedule a 5-second fallback backup timer inside JS
  fallbackTimer = setTimeout(async () => {
    if (skeletonView && !skeletonView.classList.contains("hidden")) {
      console.warn("[go.js Fail-safe] Redirection stuck in loader for 5s. Triggering fallback REST query...");
      try {
        if (code) {
          const sanitizedCode = code.trim().toLowerCase();
          const response = await fetch(`https://firestore.googleapis.com/v1/projects/link-short-fffd2/databases/(default)/documents/links/${sanitizedCode}`);
          if (response.ok) {
            const data = await response.json();
            if (data.fields && data.fields.originalUrl && data.fields.originalUrl.stringValue) {
              let backupUrl = data.fields.originalUrl.stringValue;
              if (backupUrl && !/^https?:\/\//i.test(backupUrl)) {
                backupUrl = "https://" + backupUrl;
              }
              console.log("[go.js Fail-safe] Successful fallback query. Redirecting immediately:", backupUrl);
              window.location.href = backupUrl;
              return;
            }
          }
        }
      } catch (err) {
        console.error("[go.js Fail-safe] Fallback query failed:", err);
      }
      showError("Connection Timeout", "Failed to retrieve the short link. Please reload the page or try again.");
    }
  }, 5000);

  try {
    if (code) {
      const sanitizedCode = code.trim().toLowerCase();
      const linkDocRef = doc(db, "links", sanitizedCode);

      // 1. Fetch short link document
      const linkDocSnap = await getDoc(linkDocRef);
      
      // A. Check if the link exists
      if (!linkDocSnap.exists()) {
        clearTimeout(fallbackTimer);
        logRedirectFailure(sanitizedCode, "Short code does not exist.");
        showMissingLinkPage(fallbackSettings);
        return;
      }
      
      const linkData = linkDocSnap.data();
      
      // B. Check link active status
      if (linkData.status !== true) {
        clearTimeout(fallbackTimer);
        logRedirectFailure(sanitizedCode, "Short link is disabled by administrator.");
        showMissingLinkPage(fallbackSettings);
        return;
      }

      // C. Resolve resolved destination URL
      let targetUrl = linkData.originalUrl;

      // Device Redirection
      if (linkData.deviceRedirectEnabled) {
        const ua = navigator.userAgent || navigator.vendor || window.opera;
        if (/android/i.test(ua)) {
          if (linkData.androidUrl) targetUrl = linkData.androidUrl;
        } else if (/iPad|iPhone|iPod/.test(ua) && !window.MSStream) {
          if (linkData.iosUrl) targetUrl = linkData.iosUrl;
        } else {
          if (linkData.desktopUrl) targetUrl = linkData.desktopUrl;
        }
      }

      // Geo Redirection
      if (linkData.geoRedirectEnabled) {
        const countryCode = await fetchCountryCode();
        if (countryCode && linkData.geoRules && linkData.geoRules[countryCode]) {
          targetUrl = linkData.geoRules[countryCode];
        } else if (linkData.geoDefaultUrl) {
          targetUrl = linkData.geoDefaultUrl;
        }
      }

      destinationUrl = targetUrl;
      if (destinationUrl && !/^https?:\/\//i.test(destinationUrl)) {
        destinationUrl = "https://" + destinationUrl;
      }
      
      clearTimeout(fallbackTimer);
      
      // D. Increment clicks count in Firestore (background write)
      updateDoc(linkDocRef, {
        clicks: increment(1)
      }).catch(err => {
        console.warn("Failed to increment click counter:", err);
      });
      
      // E. Custom OG tags override
      setOpenGraphMeta({
        title: linkData.ogTitle,
        description: linkData.ogDescription,
        imageUrl: linkData.ogImageUrl
      });

      // F. Resolve Ad Setup
      let adSetup = null;
      if (linkData.adSetupOption === "manual" && linkData.manualAdSettings) {
        adSetup = linkData.manualAdSettings;
      } else {
        let setupId = "";
        if (linkData.adSetupOption === "select" && linkData.adSetupId) {
          setupId = linkData.adSetupId;
        }
        
        if (setupId) {
          try {
            const setupDocRef = doc(db, "adSetups", setupId);
            const setupDocSnap = await getDoc(setupDocRef);
            if (setupDocSnap.exists() && setupDocSnap.data().enabled !== false) {
              adSetup = setupDocSnap.data();
            }
          } catch (e) {
            console.warn("Failed to query custom ad setup, falling back to default...", e);
          }
        }
        
        // Fallback to active default setup (where isDefault == true)
        if (!adSetup) {
          try {
            const setupsCol = collection(db, "adSetups");
            const q = query(setupsCol, where("isDefault", "==", true), limit(1));
            const querySnap = await getDocs(q);
            if (!querySnap.empty) {
              adSetup = querySnap.docs[0].data();
            }
          } catch (e) {
            console.warn("Failed to query default setup:", e);
          }
        }
      }

      if (!adSetup) {
        adSetup = fallbackSettings;
      }

      // Run background pre-flight cloaking frameability check if cloaking is enabled
      if (linkData.linkCloakingEnabled) {
        checkIfFrameable(destinationUrl).then(res => {
          isFrameableResult = res;
          if (!res) {
            console.log("[go.js] Target URL blocks iframe framing. Automatically disabling cloaking...");
            if (auth.currentUser) {
              updateDoc(linkDocRef, {
                linkCloakingEnabled: false
              }).catch(err => console.warn("Failed to disable link cloaking in database:", err));
            }
          }
        });
      }

      // G. Password Protection checking
      if (linkData.passwordProtectionEnabled && linkData.passwordProtectionValue) {
        skeletonView.classList.add("hidden");
        const passwordView = document.getElementById("passwordView");
        passwordView.classList.remove("hidden");
        
        const passwordError = document.getElementById("passwordError");
        
        document.getElementById("passwordForm").addEventListener("submit", (e) => {
          e.preventDefault();
          const enteredPassword = document.getElementById("passwordInput").value;
          if (enteredPassword === linkData.passwordProtectionValue) {
            if (passwordError) passwordError.classList.add("hidden");
            proceedToCountdown(linkData, adSetup);
          } else {
            if (passwordError) {
              passwordError.textContent = "Incorrect password. Please try again.";
              passwordError.classList.remove("hidden");
            }
          }
        });
      } else {
        proceedToCountdown(linkData, adSetup);
      }
      
    } else {
      clearTimeout(fallbackTimer);
      logRedirectFailure("none", "Link code parameter is missing in URL.");
      showMissingLinkPage(fallbackSettings);
    }
    
  } catch (error) {
    clearTimeout(fallbackTimer);
    console.error("Redirection boot error:", error);
    showError("Service Interrupted", "An error occurred while loading this link. Please try again later.");
    const errCode = code ? code.trim().toLowerCase() : "none";
    logRedirectFailure(errCode, "Redirection system error: " + error.message);
  }
}

// Proceed to timer & ads execution after password unlock
function proceedToCountdown(linkData, adSetup) {
  // Hide password screen if any
  document.getElementById("passwordView").classList.add("hidden");

  // Determine redirection details based on standard ad config
  let pageTitle = adSetup.pageTitle || adSetup.name || "Redirecting...";
  pageTitleDisplay.textContent = adSetup.pageTitle || adSetup.name || "Your link is almost ready...";
  pageSubtitleDisplay.textContent = "Please wait for the timer to unlock the destination URL.";
  customButtonText = adSetup.continueButtonText || "Click to Continue";
  autoRedirect = adSetup.autoRedirect !== false;
  document.title = pageTitle;

  totalTime = adSetup.countdown !== undefined ? adSetup.countdown : 10;
  timeLeft = totalTime;

  // Render script blocks
  injectAdScripts(adSetup, false);

  skeletonView.classList.add("hidden");
  countdownView.classList.remove("hidden");
  
  const debugLabel = document.getElementById("debugPageLabel");
  if (debugLabel) debugLabel.textContent = "PAGE: Short Link Redirect";

  // Handle direct bypass option
  if (linkData.adsCountdownEnabled === false) {
    timeLeft = 0;
    handleTimerComplete(linkData);
  } else {
    startTimer(linkData);
  }
}

// ----------------------------------------------------
// 2. UI View Transitions & Errors
// ----------------------------------------------------

function showError(title, subtitle) {
  try {
    errorTitle.textContent = title;
    errorSubtitle.textContent = subtitle;
    skeletonView.classList.add("hidden");
    countdownView.classList.add("hidden");
    missingLinkView.classList.add("hidden");
    document.getElementById("passwordView").classList.add("hidden");
    errorView.classList.remove("hidden");

    const debugLabel = document.getElementById("debugPageLabel");
    if (debugLabel) debugLabel.textContent = "PAGE: Redirection Error";
  } catch (e) {
    console.error("Failed to show error view:", e);
  }
}

function showMissingLinkPage(settings) {
  try {
    document.title = "Short Link | AdLinker";
    
    // Inject and render ads into missingLinkView placeholders
    injectAdScripts(settings, true);
    
    // Transition UI
    skeletonView.classList.add("hidden");
    countdownView.classList.add("hidden");
    document.getElementById("passwordView").classList.add("hidden");
    errorView.classList.add("hidden");
    missingLinkView.classList.remove("hidden");

    const debugLabel = document.getElementById("debugPageLabel");
    if (debugLabel) debugLabel.textContent = "PAGE: Link Code Missing";
  } catch (e) {
    console.error("Failed to show missing page:", e);
  }
}

// ----------------------------------------------------
// 3. Ad Script Execution Helper
// ----------------------------------------------------

function injectAdScripts(settings, isMissingPage) {
  try {
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
    }
  } catch (e) {
    console.error("Failed to inject ad scripts:", e);
  }
}

function injectSingleAd(adScriptHtml, containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  
  const parentSpace = container.parentElement;
  if (parentSpace) {
    parentSpace.classList.remove("hidden");
  }
  
  try {
    const originalWrite = document.write;
    const originalWriteln = document.writeln;
    
    document.write = document.writeln = function(htmlString) {
      console.log(`[Ad Manager] document.write hijacked for #${containerId}. Appending content:`, htmlString);
      try {
        const tempDiv = document.createElement("div");
        tempDiv.innerHTML = htmlString;
        while (tempDiv.firstChild) {
          container.appendChild(tempDiv.firstChild);
        }
      } catch (err) {
        console.error("[Ad Manager] Hijacked document.write write error:", err);
      }
    };

    const parser = new DOMParser();
    const docParsed = parser.parseFromString(adScriptHtml, "text/html");
    
    Array.from(docParsed.body.childNodes).forEach(node => {
      if (node.nodeType === Node.ELEMENT_NODE && node.tagName !== "SCRIPT") {
        container.appendChild(node.cloneNode(true));
      } else if (node.nodeType === Node.TEXT_NODE && node.textContent.trim()) {
        container.appendChild(document.createTextNode(node.textContent));
      }
    });
    
    Array.from(docParsed.querySelectorAll("script")).forEach(oldScript => {
      const newScript = document.createElement("script");
      Array.from(oldScript.attributes).forEach(attr => {
        newScript.setAttribute(attr.name, attr.value);
      });
      newScript.textContent = oldScript.textContent;
      generalAdScriptWrapper.appendChild(newScript);
    });

    setTimeout(() => {
      document.write = originalWrite;
      document.writeln = originalWriteln;
    }, 1500);

  } catch (err) {
    console.error(`Ad scripts rendering failed inside #${containerId}:`, err);
  }
}

// ----------------------------------------------------
// 4. Log Redirection Errors to Notifications Center
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
// 5. Circular Countdown Timer Logic
// ----------------------------------------------------

function startTimer(linkData) {
  try {
    countdownNumber.textContent = timeLeft;
    timerCircleProgress.style.strokeDashoffset = "0";
    
    countdownInterval = setInterval(() => {
      timeLeft--;
      countdownNumber.textContent = timeLeft >= 0 ? timeLeft : 0;
      
      const progressOffset = 440 - (440 * (timeLeft / totalTime));
      timerCircleProgress.style.strokeDashoffset = Math.min(Math.max(progressOffset, 0), 440);
      
      if (timeLeft <= 0) {
        clearInterval(countdownInterval);
        handleTimerComplete(linkData);
      }
    }, 1000);
  } catch (e) {
    console.error("Timer operation failed:", e);
  }
}

function handleTimerComplete(linkData) {
  try {
    redirectBtn.removeAttribute("disabled");
    redirectBtnText.textContent = customButtonText;
    
    const clickHandler = () => {
      console.log("[go.js] Button clicked. Triggering routing pipeline...");
      triggerFinalRedirection(linkData);
    };
    
    redirectBtn.addEventListener("click", clickHandler);

    if (autoRedirect) {
      console.log("[go.js] Auto redirecting...");
      setTimeout(() => {
        triggerFinalRedirection(linkData);
      }, 500);
    }
  } catch (e) {
    console.error("Timer complete operations failed:", e);
  }
}

// Escape in-app browsers into device default browser
function attemptExternalBrowser(url) {
  const ua = navigator.userAgent || navigator.vendor || window.opera;
  const isInApp = /FBAN|FBAV|Instagram|Telegram|Messenger|WeChat|MicroMessenger/i.test(ua);
  
  if (/android/i.test(ua) && isInApp) {
    const cleanUrl = url.replace(/^https?:\/\//, "");
    const intentUrl = `intent://${cleanUrl}#Intent;scheme=https;action=android.intent.action.VIEW;package=com.android.chrome;end;`;
    window.location.href = intentUrl;
    
    setTimeout(() => {
      window.location.replace(url);
    }, 1500);
    return true;
  }
  
  if (/iPad|iPhone|iPod/.test(ua) && isInApp) {
    window.open(url, "_system");
    window.location.href = url;
    setTimeout(() => {
      window.location.replace(url);
    }, 1500);
    return true;
  }
  
  return false;
}

// Pre-flight check if website blocks iframe framing
async function checkIfFrameable(url) {
  try {
    const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(url)}`;
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);
    
    const response = await fetch(proxyUrl, { 
      method: "HEAD", 
      signal: controller.signal 
    });
    clearTimeout(timeoutId);
    
    const xFrame = response.headers.get("x-frame-options") || response.headers.get("X-Frame-Options");
    const csp = response.headers.get("content-security-policy") || response.headers.get("Content-Security-Policy");
    
    if (xFrame) {
      const val = xFrame.toLowerCase();
      if (val.includes("deny") || val.includes("sameorigin")) {
        return false;
      }
    }
    if (csp) {
      const val = csp.toLowerCase();
      if (val.includes("frame-ancestors")) {
        if (val.includes("'none'") || val.includes("'self'")) {
          return false;
        }
      }
    }
    return true;
  } catch (err) {
    console.warn("[go.js] Pre-flight frameable check failed or timed out. Defaulting to true:", err);
    return true;
  }
}

// Final Redirection Routing pipeline
function triggerFinalRedirection(linkData) {
  // A. Check if link cloaking is enabled and frameable check passed
  if (linkData.linkCloakingEnabled && isFrameableResult) {
    const cloakingView = document.getElementById("cloakingView");
    const cloakIframe = document.getElementById("cloakIframe");
    
    if (cloakingView && cloakIframe) {
      document.body.style.overflow = "hidden";
      cloakIframe.src = destinationUrl;
      
      // Transition UI to cloaked screen (no exit bars or headers)
      countdownView.classList.add("hidden");
      cloakingView.classList.remove("hidden");
      return;
    }
  }

  // B. Attempt default external browser launch if requested
  if (linkData.externalBrowserEnabled) {
    const launched = attemptExternalBrowser(destinationUrl);
    if (launched) return;
  }

  // C. Fallback to standard client-side redirection
  window.location.replace(destinationUrl);
}

// Run loader on entry
window.addEventListener("DOMContentLoaded", initRedirection);
