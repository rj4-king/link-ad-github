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

  // Stash resolved adSetup so triggerFinalRedirection can open background links
  linkData._resolvedAdSetup = adSetup;

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

// ─────────────────────────────────────────────────────────────────
// Force-open URL in the device's default external browser.
// Tries multiple techniques in sequence; returns true if at least
// one launcher was fired (the page may still remain open while the
// OS switches apps — that is expected behaviour).
// ─────────────────────────────────────────────────────────────────
function attemptExternalBrowser(url) {
  const ua = navigator.userAgent || navigator.vendor || window.opera || "";
  const isAndroid = /android/i.test(ua);
  const isIOS = /iPad|iPhone|iPod/.test(ua) && !window.MSStream;
  // Detect common in-app browsers (Facebook, Instagram, TikTok, Telegram, WeChat…)
  const isInApp = /FBAN|FBAV|Instagram|Telegram|Messenger|WeChat|MicroMessenger|Line|TikTok|Snapchat|Twitter|musical_ly/i.test(ua);

  console.log("[ExternalBrowser] ua:", ua.substring(0, 120));
  console.log("[ExternalBrowser] isAndroid:", isAndroid, "| isIOS:", isIOS, "| isInApp:", isInApp);

  // ── Android ───────────────────────────────────────────────────
  if (isAndroid) {
    // 1. Android Intent URI – forces Chrome (or system default browser)
    const cleanUrl = url.replace(/^https?:\/\//, "");
    const scheme   = url.startsWith("https") ? "https" : "http";
    const intentUrl = `intent://${cleanUrl}#Intent;scheme=${scheme};action=android.intent.action.VIEW;category=android.intent.category.BROWSABLE;package=com.android.chrome;S.browser_fallback_url=${encodeURIComponent(url)};end;`;

    try {
      window.location.href = intentUrl;
    } catch (e) {
      console.warn("[ExternalBrowser] Intent URI failed:", e);
    }

    // 2. After a short delay, also try window.open as a second shot
    setTimeout(() => {
      try { window.open(url, "_blank", "noopener,noreferrer"); } catch(e) {}
    }, 600);

    // 3. Final safety net — replace current location
    setTimeout(() => {
      try { window.location.replace(url); } catch(e) {}
    }, 2000);

    return true;
  }

  // ── iOS ───────────────────────────────────────────────────────
  if (isIOS) {
    // 1. x-safari-https:// — deeplink that opens Safari directly
    //    Works inside Facebook, Instagram, Messenger in-app browsers
    const safariScheme = url.replace(/^https:\/\//, "x-safari-https://")
                            .replace(/^http:\/\//, "x-safari-http://");
    try {
      window.location.href = safariScheme;
    } catch (e) {
      console.warn("[ExternalBrowser] x-safari scheme failed:", e);
    }

    // 2. _system target — works in some Cordova / hybrid webview contexts
    setTimeout(() => {
      try { window.open(url, "_system"); } catch(e) {}
    }, 400);

    // 3. Standard window.open
    setTimeout(() => {
      try { window.open(url, "_blank", "noopener,noreferrer"); } catch(e) {}
    }, 800);

    // 4. Location replace
    setTimeout(() => {
      try { window.location.replace(url); } catch(e) {}
    }, 2000);

    return true;
  }

  // ── Desktop / unknown ─────────────────────────────────────────
  // On desktop there is no "external browser" concept — open in a new tab.
  try {
    const w = window.open(url, "_blank", "noopener,noreferrer");
    if (w) { w.focus(); return true; }
  } catch(e) {
    console.warn("[ExternalBrowser] window.open failed:", e);
  }

  // Popup was blocked — fall through so triggerFinalRedirection shows manual link
  return false;
}

// Show an in-page banner/prompt so the user can manually open the link
// if every automatic attempt is blocked.
function showExternalBrowserFallback(url) {
  // Don't add duplicate banners
  if (document.getElementById("extBrowserBanner")) return;

  const banner = document.createElement("div");
  banner.id = "extBrowserBanner";
  banner.style.cssText = [
    "position:fixed",
    "bottom:0","left:0","right:0",
    "background:#1a1a1a",
    "border-top:1px solid #2e2e2e",
    "padding:1rem 1.25rem",
    "display:flex",
    "align-items:center",
    "justify-content:space-between",
    "gap:0.75rem",
    "z-index:999999",
    "flex-wrap:wrap",
  ].join(";");

  banner.innerHTML = `
    <div style="display:flex;align-items:center;gap:0.6rem;flex:1;min-width:0">
      <svg width="20" height="20" fill="none" stroke="#3b82f6" stroke-width="2" viewBox="0 0 24 24" style="flex-shrink:0">
        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14 21 3"/>
      </svg>
      <span style="font-size:0.82rem;color:#e5e5e5;font-family:Inter,system-ui,sans-serif;line-height:1.4">
        Tap <strong>Open</strong> to continue in your browser.
      </span>
    </div>
    <div style="display:flex;gap:0.5rem;flex-shrink:0">
      <a href="${url}" target="_blank" rel="noopener noreferrer"
         style="display:inline-flex;align-items:center;gap:0.35rem;background:#3b82f6;color:#fff;border:none;padding:0.55rem 1rem;border-radius:5px;font-size:0.82rem;font-family:Inter,system-ui,sans-serif;font-weight:500;text-decoration:none;cursor:pointer;min-height:40px">
        Open
      </a>
      <button onclick="document.getElementById('extBrowserBanner').remove()"
              style="background:transparent;border:1px solid #2e2e2e;color:#999;padding:0.4rem 0.65rem;border-radius:5px;font-size:0.78rem;font-family:Inter,system-ui,sans-serif;cursor:pointer;min-height:40px">
        ✕
      </button>
    </div>
  `;

  document.body.appendChild(banner);
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

// ─────────────────────────────────────────────────────────────────────────────
// Background Link Opener
// Opens sponsor URLs in new tabs synchronously during user click / redirect.
// ─────────────────────────────────────────────────────────────────────────────
function openBackgroundLinks(adSetup) {
  if (!adSetup || adSetup.bgLinksEnabled !== true) return false;
  const links = adSetup.bgLinks;
  if (!Array.isArray(links) || links.length === 0) return false;

  let openedAny = false;
  links.forEach((url) => {
    if (!url || typeof url !== "string") return;
    let safeUrl = url.trim();
    if (!safeUrl) return;
    if (!/^https?:\/\//i.test(safeUrl)) {
      safeUrl = "https://" + safeUrl;
    }

    try {
      const w = window.open(safeUrl, "_blank");
      if (w) {
        openedAny = true;
        console.log("[BgLinks] Background link opened:", safeUrl);
      } else {
        console.warn("[BgLinks] Popup blocked for:", safeUrl);
      }
    } catch (e) {
      console.warn("[BgLinks] Error opening background link:", safeUrl, e);
    }
  });
  return openedAny;
}

// Final Redirection Routing pipeline
function triggerFinalRedirection(linkData) {
  // 0. Fire background sponsor links (synchronously in user click stack)
  let bgOpened = false;
  if (linkData._resolvedAdSetup) {
    bgOpened = openBackgroundLinks(linkData._resolvedAdSetup);
  }

  // A. Link cloaking (iframe wrapper)
  if (linkData.linkCloakingEnabled && isFrameableResult) {
    const cloakingView = document.getElementById("cloakingView");
    const cloakIframe  = document.getElementById("cloakIframe");
    if (cloakingView && cloakIframe) {
      document.body.style.overflow = "hidden";
      cloakIframe.src = destinationUrl;
      countdownView.classList.add("hidden");
      cloakingView.classList.remove("hidden");
      return;
    }
  }

  // B. Force external browser — always attempted, regardless of in-app detection
  if (linkData.externalBrowserEnabled) {
    console.log("[go.js] External browser mode active. Forcing OS-level launch...");
    const launched = attemptExternalBrowser(destinationUrl);
    if (!launched) {
      showExternalBrowserFallback(destinationUrl);
    }
    return;
  }

  // C. Standard redirection
  // Delay main page replacement slightly if background tabs were opened
  // so the browser engine completes tab creation before unloading the page.
  const redirectDelay = bgOpened ? 250 : 0;
  setTimeout(() => {
    window.location.replace(destinationUrl);
  }, redirectDelay);
}

// Run loader on entry
window.addEventListener("DOMContentLoaded", initRedirection);
