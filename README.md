# AdLinker - Premium Firebase URL Shortener with Ads & Analytics

AdLinker is a production-ready, fully static, serverless URL shortener application. It features a modern dark-mode admin control panel and a high-converting visitor redirection system with customized ad integration, countdown timers, click count metrics, and clean URLs.

## Project Structure

```text
├── 404.html                # Routing middleware for clean URLs on GitHub Pages
├── admin.html              # Administrator authentication screen & control panel
├── go.html                 # Visitor advertisement container and progress redirection page
├── firestore.rules         # Public visitor click-increment & admin authentication rules
├── css/
│   └── style.css           # Premium dark-theme glassmorphism CSS stylesheets
└── js/
    ├── firebase-config.js  # Dedicated Firebase SDK initialization 
    ├── admin.js            # Dashboard CRUD & real-time snapshot statistics handlers
    └── go.js               # Redirection scheduler, click incrementer, and ad scripts injector
```

---

## 🛠️ Step-by-Step Setup Guide

Follow these sequential steps to set up, secure, and deploy your URL shortener.

### Phase 1: Firebase Project Setup

1. Go to the [Firebase Console](https://console.firebase.google.com/) and click **Add Project**.
2. Give your project a name (e.g., `AdLinker`) and click **Continue**. Disable Google Analytics if not needed, then click **Create Project**.
3. Once ready, select **Web app (</>)** from the Project Overview screen to register a web application:
   - Enter an app nickname.
   - Click **Register App**.
   - Note the Firebase Config values (already pre-configured in `js/firebase-config.js`).

### Phase 2: Enable Firebase Authentication

1. In the Firebase Console left menu, navigate to **Build > Authentication**.
2. Click **Get Started**.
3. Under the **Sign-in method** tab, click **Email/Password**.
4. Enable the **Email/Password** toggle (leave *Email link (passwordless sign-in)* disabled) and click **Save**.
5. Switch to the **Users** tab inside Authentication and click **Add User**:
   - Enter your administrator email (e.g., `admin@example.com`).
   - Choose a secure password (e.g., `SecureAdminPass123`).
   - Click **Add User**. This will be your login credential for the Admin Dashboard.

### Phase 3: Setup Firestore Database & Security Rules

1. In the Firebase Console left menu, navigate to **Build > Firestore Database**.
2. Click **Create Database**.
3. Select a location closest to your target audience and click **Next**.
4. Start in **Production mode** or **Test mode** (we will overwrite rules in the next step anyway). Click **Create**.
5. Once initialized, navigate to the **Rules** tab at the top of your Firestore dashboard:
   - Copy the exact contents of the [firestore.rules](file:///d:/projact%20coding/link%20ad%20github/firestore.rules) file in this repository.
   - Replace the existing rules in the Firebase editor with these copied rules.
   - Click **Publish**.

---

## 🚀 GitHub Pages Deployment & Clean URLs

GitHub Pages does not natively support server-side routing (e.g., `domain.com/abc123` returns a standard `404 Not Found` response). We use a customized `404.html` routing bridge to provide clean, professional short links.

### Step 1: Initialize Git and Push to GitHub

Create a new repository on your GitHub account (e.g., `adlinker`), then run the following commands in your local project root folder:

```bash
git init
git add .
git commit -m "Initialize AdLinker application"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPOSITORY.git
git push -u origin main
```

### Step 2: Enable GitHub Pages

1. Go to your repository settings on GitHub.
2. Select **Pages** from the left-hand sidebar menu.
3. Under **Build and deployment**, set the Source dropdown to **Deploy from a branch**.
4. Select the `main` branch (and `/root` folder), then click **Save**.
5. Wait 1–2 minutes for the automated deployment to complete. GitHub will show your live site URL (e.g., `https://YOUR_USERNAME.github.io/YOUR_REPOSITORY/`).

### How Clean URLs Work

- When a visitor visits `https://yourdomain.com/abc123`, GitHub Pages loads our custom [404.html](file:///d:/projact%20coding/link%20ad%20github/404.html).
- The router in `404.html` extracts the pathname (`abc123`), validates that it is not a system static file, and instantly redirects the user to:
  `https://yourdomain.com/go.html?code=abc123`
- This ensures clean URLs work out-of-the-box without any custom servers or page reloads!
- If the visitor accesses the root path (`https://yourdomain.com/`), they are automatically routed to `admin.html` to log in.

---

## ⚙️ Settings Configuration Reference

You can configure these parameters directly inside the settings panel on the Admin Dashboard:

* **Visitor Page Title**: The text displayed in the visitor's browser tab and heading card when redirecting.
* **Continue Button Text**: The text displayed on the redirect button after the timer ends (e.g., `Continue to File`, `Get Link`).
* **Timer (Seconds)**: Countdown duration (between 5 and 60 seconds) that a visitor must stay on the page.
* **Auto Redirect**: When checked, the visitor will be automatically redirected to the destination URL as soon as the timer reaches 0. If unchecked, they must click the unlocked Continue button.
* **Ad Network Script**: Paste code snippets from any ad network (Google AdSense, Adsterra, Monetag, etc.). Both HTML elements (e.g., banner `div` wrappers) and Javascript `<script>` tags will be dynamically parsed, rendered, and executed on the page.
