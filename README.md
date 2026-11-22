# Ganga Micro-Hotspot Portal

A centralized web platform for civic pollution reporting and digital ghat monitoring along the Ganga in Patna.

**Identify • Map • Prioritize • Verify**

**Live demo:** https://namami-gange-portal-3d48e.web.app

> NIT Patna project, Namami Gange theme.

---

## The problem

- **Riverbank waste:** plastic accumulates along high-footfall Patna ghats.
- **Drainage runoff:** untreated open drains discharge into the Ganga.
- **Visibility gap:** there is no real-time, local view of where the hotspots are.

## What the portal does

Citizens report a pollution hotspot with a geo-tagged photo. The portal scores its severity, shows it on a map, and gives authorities a desk to dispatch it and record cleanup proof.

| Module | Description |
|---|---|
| **Hotspot report form** | Pollution type, area size, busy-ghat flag, description, photo, and GPS location (tap the map or use device location). |
| **Interactive ghat map** | Leaflet map with color-coded pins: red (high), orange (medium), green (low), blue (cleaned). Filter by severity. |
| **Authority desk** *(admin only)* | Reports listed highest severity first. Assign each to a department, then upload cleanup proof. |
| **Cleanup reporting** | The authority uploads an after-cleanup photo and note; the pin turns blue and the proof shows in the pin's popup. |

### End-to-end loop

1. **Capture:** citizen uploads a GPS photo.
2. **Prioritize:** portal calculates a severity score.
3. **Escalate:** admin assigns the report to a department.
4. **Clean:** the government team clears the site.
5. **Report back:** authority uploads cleanup proof.

### Severity score

```
score = type (drain 3, plastic 2, garbage 2) + area size (1 to 3) + busy ghat (2)
```

| Score | Severity |
|---|---|
| 7 or more | High |
| 5 to 6 | Medium |
| Below 5 | Low |

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | HTML, CSS, JavaScript (no build step) |
| Map | Leaflet.js with OpenStreetMap tiles |
| Database | Firebase Firestore (real-time) |
| Admin login | Firebase Authentication (email and password) |
| Hosting | Firebase Hosting |

Photos are compressed in the browser (max 800 px, JPEG) and stored with the report, so Firebase Storage is not needed.

## Project structure

```
ganga-portal/
├── public/
│   ├── index.html
│   ├── css/style.css
│   └── js/
│       ├── app.js              # map, report form, authority desk
│       ├── store.js            # Firestore / demo storage, auth, severity scoring
│       └── firebase-config.js  # Firebase web config
├── firestore.rules             # database security rules
├── firebase.json               # Hosting + Firestore deploy settings
└── .firebaserc                 # linked Firebase project
```

## Run locally

```bash
cd public
python3 -m http.server 8000
```

Open http://localhost:8000. Do not open `index.html` by double-clicking; Firebase and GPS need a server (or https).





## Current limitations and future scope

- "Send to department" records the department and status in the database; it does **not** yet send an email or SMS to the authority.
- Department names in `js/app.js` (`DEPTS`) should be confirmed with the real local bodies.
- Planned: email or SMS dispatch to departments, report export (PDF/CSV), duplicate-report detection, and a public cleanup history.

## Team

| Name | Roll No. |
|---|---|
| Abhishek Verma | 2606039 |
| Nand Kishor | 2606051 |
| Shiva Nand Gupta | 2606022 |
| Rahul Kumar | 2606036 |
| Aditya Kumar | 2606012 |

National Institute of Technology Patna