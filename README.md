# Operating Systems Emulator 🖥️

**Course:** Operating Systems Lab (CS257)  
**Project:** OS Algorithm Emulator & Visualizer

## 📖 Overview
This project is an interactive, web-based Operating Systems Emulator developed for the CS257 Operating Systems Lab. It provides visual demonstrations and simulations of core OS concepts, algorithms, and resource management techniques. 

The primary goal of this emulator is to bridge the gap between theoretical OS concepts and practical understanding through real-time visualizations and step-by-step algorithmic tracing.

---

## ✨ Implemented Modules

1. System Calls
2. CPU Scheduling
3. Process Synchronization
4. Deadlocks
5. Memory Management
6. Contiguous Memory Allocation
7. Page Replacement
8. Disk Scheduling
9. File Allocation
10. File Organization

---

## 🛠️ Tech Stack
*   **Frontend:** HTML5, CSS3 (Custom Variables, Flexbox/Grid layouts), Vanilla JavaScript (ES6+).
*   **Visualization:** HTML5 `<canvas>` API for dynamic graph rendering and DOM manipulation for state updates.

---

## 🚀 How to Run Locally

Because the project is built using native web technologies (HTML/CSS/JS), there is no complex build step required.

1. **Clone the repository:**
   ```bash
   git clone https://github.com/compu-TEE/OS-MP.git
   cd OS-MP
   ```

2. **Serve the project (Recommended):**
   To avoid any CORS issues with local file loading (specifically for canvas elements or modules), use a simple local server.
   
   *Using Python:*
   ```bash
   python -m http.server 8000
   ```
   *Using Node.js:*
   ```bash
   npx serve .
   ```
   
3. **Open in Browser:**
   Navigate to `http://localhost:8000` (or the port specified by your server) to view the emulator.

*(Alternatively, you can just double-click the respective `index.html` file inside any module folder to run it directly).*

---

## 👥 Authors
*   **Tanay** 
*   *(Add your lab partners here if any)*

---
*Developed for the CS257 Operating Systems Lab.*
