# 🏫 Crownbridge International School — Official Web Portal

> **State's First AI Integrated School • Nirjuli, Itanagar, Arunachal Pradesh**  
> Modern, high-performance web portal built with **React 19**, **Vite**, **Tailwind CSS**, and **Firebase Firestore & Auth**.

---

## 🌟 Key Features

- **🎓 Comprehensive School Information**: About us, vision & mission, academic curriculum, faculty, campus wings, residential hostels, and GPS transport routes.
- **🌐 5-Language Global Communication Program**: Dedicated immersive modules for English, Hindi, German, Japanese, and Korean.
- **📚 CBSE & NCERT Learning Resources Hub**: Verified direct access to official NCERT e-textbooks (Pre-Primary to Class 10), sample papers, practice worksheets, and curriculum framework.
- **📢 Real-Time Official Notice Board**: Instant synchronization of important school announcements, examination schedules, and urgent alerts.
- **📄 Documents & Downloads Portal**: Direct access to downloadable admission registration forms, syllabus guides, and the official school prospectus bulletin.
- **📝 Online Admission Inquiry**: Instant enquiry submission with real-time Firestore database storage.
- **🔒 Protected Staff & Admin Dashboard**:
  - College Administration & Staff login with 20-minute inactivity auto-lock session security.
  - Full CRUD controls for notices, downloads, photo gallery carousels, learning resources, and website settings.
  - Inquiries management with Excel/CSV export capabilities.

---

## 🚀 How to Run Locally

### 1. Prerequisites
- **Node.js** (v18.0.0 or higher recommended)
- **npm** (comes with Node.js)

### 2. Installation
```bash
# Clone the repository
git clone https://github.com/YOUR_USERNAME/YOUR_REPOSITORY.git
cd YOUR_REPOSITORY

# Install dependencies
npm install
```

### 3. Start Development Server
```bash
npm run dev
```
Open your browser at `http://localhost:3000`.

### 4. Build for Production
```bash
npm run build
```
The compiled, optimized files will be output to the `dist/` directory.

---

## 🌐 How to Deploy as a Live Website

### Option 1: GitHub Pages (Free & Automated)
This repository includes an automated GitHub Actions deployment workflow at `.github/workflows/deploy.yml` that automatically builds Vite and publishes the production `dist/` bundle.

1. **Commit and push** all repository files including `package-lock.json` and `.github/workflows/deploy.yml`:
   ```bash
   git add .
   git commit -m "Configure GitHub Actions deployment with Vite build"
   git push origin main
   ```
2. On your GitHub repository:
   - Go to **Settings** → **Pages** (in the left sidebar).
   - Under **Build and deployment** → **Source**, select **GitHub Actions** (do NOT choose "Deploy from a branch").
3. Go to the **Actions** tab at the top of your GitHub repository:
   - You will see the **Deploy to GitHub Pages** workflow running.
   - Once it completes with a green checkmark (usually ~45-60 seconds), your live website is ready!
4. Visit your live site at:  
   `https://shivam-vk1.github.io/CROWNBRIDGE-INTERNATIONAL-SCHOOL/`

> **Note on Blank Screen**: If you ever see a blank white screen, it is because GitHub deployed raw uncompiled `.tsx` source code instead of the compiled `dist/` bundle. Setting Source to **GitHub Actions** and pushing this updated workflow fixes it immediately.

### Option 2: Vercel / Netlify (1-Click Deployment)
1. Go to [vercel.com](https://vercel.com) or [netlify.com](https://netlify.com) and log in with your GitHub account.
2. Click **Add New Project** and select this repository.
3. Framework Preset: **Vite** (automatically detected).
4. Click **Deploy**. Your website will be live in under 60 seconds with a free `.vercel.app` or `.netlify.app` domain and free SSL!

### Option 3: Firebase Hosting
```bash
npm install -g firebase-tools
firebase login
firebase init hosting
# Set public directory to 'dist' and configure as a single-page app (SPA)
npm run build
firebase deploy --only hosting
```

---

## 📤 How to Push This Project to GitHub

Run these commands in your project terminal:

```bash
# 1. Initialize git repository (if not already initialized)
git init

# 2. Add all project files
git add .

# 3. Commit the clean production codebase
git commit -m "Initial commit: Crownbridge International School Portal"

# 4. Rename default branch to main
git branch -M main

# 5. Link to your GitHub repository
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git

# 6. Push to GitHub
git push -u origin main
```

---

## 📁 Clean Project Structure

```text
├── .github/
│   └── workflows/
│       └── deploy.yml          # Automated GitHub Pages CI/CD workflow
├── public/
│   └── assets/                 # Production-only school images & crest
│       ├── crownbridge-logo.jpeg
│       ├── crownbridge-prospectus.jpeg
│       └── crownbridge-languages.jpeg
├── src/
│   ├── components/
│   │   ├── AdminDashboard.tsx           # Administrative management dashboard
│   │   └── LearningResourcesSection.tsx # CBSE & NCERT study resources portal
│   ├── data/
│   │   └── schoolData.ts                # Structured school data & verified links
│   ├── App.tsx                          # Main application layout & multi-page navigation
│   ├── firebase.ts                      # Firebase Firestore & Auth integration
│   └── main.tsx                         # React 19 entry point
├── firestore.rules                      # Production Firestore security rules
├── index.html                           # SEO meta tags, OpenGraph & Schema.org data
├── package.json
├── tsconfig.json
└── vite.config.ts                       # Configured with relative base path for GitHub Pages
```

---

## 📄 License & Ownership
Copyright © Crownbridge International School, Itanagar. All rights reserved.
