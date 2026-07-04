# 🎙️ Digital Pelli Kaanuka (డిజిటల్ పెళ్ళి కానుక)

An elegant, high-fidelity, offline-first Single-Page Application (SPA) designed to record and manage wedding gift entries (Pelli Kaanukalu) using voice announcements in both **Telugu** and **English**.

🔗 **Live URL:** [https://harshavardhanreddy2004.github.io/Digital-Pelli-Kaanuka/](https://harshavardhanreddy2004.github.io/Digital-Pelli-Kaanuka/)

---

## 🌟 Key Features

* **🎙️ Voice Announcement Parsing:** Converts spoken phrases into structured table rows containing Name, Village, Amount, and Phone Number.
  * *Telugu Speech:* `"కట్ల హర్షవర్ధన్ రెడ్డి పోచంపల్లి రెండు వేల రూపాయలు"` $\rightarrow$ **కట్ల హర్షవర్ధన్ రెడ్డి** | **పోచంపల్లి** | **₹2,000.00**
  * *English Speech:* `"Katla Uday Kumar from Pochampally 4000 rupees"` $\rightarrow$ **Katla Uday Kumar** | **Pochampally** | **₹4,000.00**
* **👨‍👦 Relation-Aware Parsing:** Intelligently parses parent/spouse relations (e.g. `s/o`, `d/o`, `w/o`, `తండ్రి`, `కుమారుడు`) to group names properly and isolate the village location.
* **🌐 Dynamic Bilingual UI:** Switch instantly between Telugu (తెలుగు) and English modes. The entire interface, stats, and database records adapt dynamically.
* **📝 Dynamic Token Translation:** Prevents mixed-language display (like `కట్ల Uday Kumar`). Translates individual name tokens to output clean Telugu or English equivalents.
* **📂 Offline-First Architecture:** Keeps data secure locally in `localStorage` and audio recordings in **IndexedDB**.
* **☁️ Supabase Cloud Sync:** Syncs local records and audio blobs to Supabase Database and Storage when enabled.
* **📊 Exporter & Receipts:** Downloads records in Excel/CSV format in the selected language and prints clean physical gift receipts.
* **💬 WhatsApp Verification:** Sends automated WhatsApp text notifications to guests to verify receipt of their cash gifts.

---

## 🚀 How to Enable GitHub Pages (Live Hosting)

1. Open your repository at: [https://github.com/Harshavardhanreddy2004/Digital-Pelli-Kaanuka](https://github.com/Harshavardhanreddy2004/Digital-Pelli-Kaanuka)
2. Click on the **Settings** tab at the top.
3. In the left sidebar, click on **Pages**.
4. Under **Build and deployment**, set **Source** to `Deploy from a branch`.
5. Under **Branch**, select `main` and folder `/ (root)`.
6. Click **Save**.
7. Wait 1 minute, and your site will be live at: [https://harshavardhanreddy2004.github.io/Digital-Pelli-Kaanuka/](https://harshavardhanreddy2004.github.io/Digital-Pelli-Kaanuka/)

---

## 🛠️ Technology Stack

* **Frontend:** HTML5, CSS3, JavaScript (ES6), Tailwind CSS
* **Database & Storage:** Supabase (PostgreSQL), browser `localStorage`, browser `IndexedDB`
* **APIs:** Web Speech API, SpeechSynthesis API, Web Audio API
