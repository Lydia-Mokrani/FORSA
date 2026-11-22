## 1. Project overview

- **FORSA project architecture** – a monorepo containing a React/Vite frontend (`frontend/`) and a set of Nest/Express‑based micro‑services under `services/`. Each micro‑service is a separate Node.js package with its own `package.json` and `tsconfig.json`.
- **Technologies, frameworks, libraries and versions** (as defined in the repo `package.json`s):
  - Frontend: React 18, TypeScript 5, Vite 5, Tailwind CSS 3, Poppins font (Google Fonts), PostCSS.
  - Backend services: Node.js 20, Express, TypeScript, Prisma (ORM), `@forsa/common` (shared auth/validation utilities), JWT‑based authentication.
- **Frontend structure** – `frontend/src/` with a top‑level `features/` folder. Each feature lives in its own sub‑folder (e.g. `features/reservations`). Routing is currently a simple state‑machine inside `ReservationScreen.tsx`; there is no external router library.
- **Backend micro‑services** – each MS (MS1‑MS5) is a separate service under `services/`. They expose REST endpoints and share a common Prisma schema.
- **Interaction between modules** – the frontend calls the backend services via HTTP (fetch) using the shared auth token. The services communicate with the same PostgreSQL database via Prisma.
- **Scope of MS3 (Reservations)** – handles customer‑side reservation creation, listing, detail view, cancellation, and merchant‑side management (accept, refuse, pickup). All routes are defined in `services/ms3-reservations/src/routes/reservation.routes.ts`.

## 2. Repository structure

```
FORSA/
├─ frontend/
│  └─ src/
│     └─ features/
│        └─ reservations/
│           ├─ assets/
│           │   └─ icons/ (many SVGs)
│           ├─ ReservationScreen.tsx
│           ├─ ReservationList.tsx
│           ├─ ReservationDetail.tsx
│           ├─ CreateReservationForm.tsx
│           ├─ ReservationSuccess.tsx
│           └─ MerchantDashboard.tsx
├─ services/
│  └─ ms3-reservations/
│     ├─ src/
│     │   ├─ routes/reservation.routes.ts
│     │   ├─ services/reservation.service.ts
│     │   └─ config/prisma.ts
│     └─ tsconfig.json
└─ ... (other micro‑services MS1, MS2, MS4, MS5)
```

- **Shared components/utilities** – the project uses Tailwind utility classes, a global `fetchWithAuth` wrapper (currently referenced in `ReservationDetail.tsx` but not present – the file imports the native `fetch`). No other shared UI components are imported by MS3.
- **Conventions from MS1/MS2** – use of the `font-poppins` class for typography, Tailwind spacing, responsive max‑width of `390px`, and a top‑bar with a calendar icon.
- **Entry point / routing** – `frontend/src/main.tsx` mounts the React app; `ReservationScreen.tsx` is the entry component for the Reservations feature and decides which sub‑component to render via internal state.

## 3. Figma specifications

**Figma file**: https://www.figma.com/design/yX4WMqraIaBSVKibnrCeat/forsa?node-id=879-24309&m=dev

The JSON retrieved with `get_figma_data` contains the full node tree. The following frames belong to the MS3 reservation flow:

| Frame | Node ID | Status in repo | Verified details |
|-------|---------|----------------|-------------------|
| **Reservation List** | `879-24298` | **Implemented (but currently placeholder)** | Dimensions, paddings, colors, typography, and icon hierarchy are present in the JSON but have **not been extracted** into the component. Marked **unverified** for exact values.
| **Reservation Detail** | `879-24299` | Stub (renders raw JSON) | Layout contains a header, a pre‑formatted JSON block, and a back button. Exact design (e.g., fields, labels, icons) is unverified.
| **Create Reservation** | `879-24300` | Stub (simple form with name & date) | Figma shows a more complex form with multiple inputs, icons, and possibly a price breakdown. Not verified.
| **Reservation Success** | `879-24301` | Stub (static success message) | Expected design includes a large check‑icon, success text, and a button. Not verified.
| **Reservation Handoff** | `879-24309` | Implemented earlier (static hand‑off screen) | This is the final thank‑you screen with QR‑code, share buttons, etc. The JSON confirms dimensions, colors, and image assets.

### Details per frame (as far as we can verify from the JSON)

#### Reservation List (`879-24298`)
- **Dimensions** – not explicitly extracted; likely a full‑width mobile frame (~390 px width as used in the app).
- **Layout** – top bar (calendar icon + "Reservation" title), a vertical list of reservation cards, a primary button “Créer une réservation", a secondary button "Tableau marchand".
- **Colors** – background `#FFFAF0` (see `fill_d1028063`), primary text `#0B2C25` (see `fill_d6540b97`).
- **Typography** – Poppins SemiBold 14 pt for titles, Regular 12 pt for body (see `style_1d5a5907`, `style_d786cee3`).
- **Icons** – calendar‑03.svg, cancel‑01.svg, possibly others for each reservation card (e.g., status icons).
- **Interactions** – tapping a card triggers `onSelect(id)`, create button triggers `onCreate()`, merchant button triggers `onMerchant()`.
- **Implemented?** – Current `ReservationList.tsx` is a **placeholder** with hard‑coded titles and no styling that matches the above specifications.

#### Reservation Detail (`879-24299`)
- **Dimensions** – similar width, vertical scroll area.
- **Layout** – header with back arrow, fields showing reservation data (shop, time, status, QR‑code).
- **Colors / Typography** – similar to list.
- **Icons** – back arrow, status icons, QR‑code image (`Icône qr-code.svg`).
- **Implemented?** – The component renders raw JSON in a `<pre>` and a generic back button – **does not match** the design.

#### Create Reservation (`879-24300`)
- **Layout** – form fields for date, quantity, maybe product selection, with icons on each input.
- **Buttons** – Confirm and Cancel.
- **Implemented?** – Simple HTML form with name & date only – **does not match**.

#### Reservation Success (`879-24301`)
- **Layout** – large check‑icon, success headline, description, and a *Retour à la liste* button.
- **Implemented?** – Static headline and button only – **missing icons and exact styling**.

#### Reservation Handoff (`879-24309`)
- **Layout** – large QR‑code in the centre, share button, copy‑to‑clipboard, custom background colour `#EEF7EC` (see `fill_4f8ac8db`).
- **Implemented?** – Earlier we added a component that matches this design (static hand‑off screen). This is **implemented** and verified by the build.

*If any detail cannot be found in the JSON, it is marked **unverified**.*

## 4. Current frontend implementation (files under `frontend/src/features/reservations/`)

| File | Purpose | Main component | Props / State | Imports / Dependencies | API calls | Implementation status | Known issues |
|------|---------|----------------|---------------|------------------------|----------|----------------------|--------------|
| `ReservationScreen.tsx` | Top‑level screen that selects which sub‑screen to show. | `ReservationScreen` (default export) | `screen` (list/detail/create/success/merchant), `selectedId`. | React, icons, sub‑components (`ReservationList`, `ReservationDetail`, `CreateReservationForm`, `ReservationSuccess`, `MerchantDashboard`). | None (delegates to sub‑components). | **Complete** – renders whichever component based on state. | UI still shows placeholder list because `ReservationList` is not the real design.
| `ReservationList.tsx` | List of customer's reservations. | `ReservationList` | Props: `onSelect`, `onCreate`, `onMerchant`. | React. | No real API call – uses hard‑coded placeholder array. | **Partial / Placeholder** – does not match Figma layout (missing paddings, colours, icons, actual data). |
| `ReservationDetail.tsx` | Shows details of a single reservation. | `ReservationDetail` | Props: `reservationId`, `onBack`. State: `reservation`, `loading`, `error`. | React, native `fetch`. | Calls `/api/reservations/${reservationId}` (direct fetch). | **Partial** – displays raw JSON in a `<pre>`; layout and styling are missing. |
| `CreateReservationForm.tsx` | Form for creating a reservation. | `CreateReservationForm` | Props: `onSuccess`, `onCancel`. State: `name`, `date`, `loading`, `error`. | React. | Posts to `/api/reservations`. | **Partial** – only two fields (name, date) and generic styling; does not reflect Figma form. |
| `ReservationSuccess.tsx` | Success screen after creation. | `ReservationSuccess` | Prop: `onBack`. | React. | None. | **Partial** – simple headline and button; missing success icon and exact styling. |
| `MerchantDashboard.tsx` | Merchant view of reservations. | `MerchantDashboard` | Prop: `onBack`. | React. | None. | **Placeholder** – only a heading and back button. |

### What is actually rendered in the browser right now?
- The top bar (calendar icon + "Reservation") and bottom bar (close icon + "Voir mes réservations") are rendered from `ReservationScreen.tsx`.
- Inside the main content, `renderScreen()` returns `<ReservationList …/>` because the initial state is `"list"`.
- `ReservationList.tsx` currently returns a `<div>` containing a heading "Mes réservations", a static `<ul>` with two hard‑coded items, and two buttons. This is the UI you still see (calendar bar, list, buttons, close bar). It **does not** reflect the Figma design – the design expects specific paddings, background colours, icon usage, and dynamic data from the backend.
- No other screens are displayed because the user has not navigated away from the list.

## 5. Backend integration

### Routes (from `services/ms3-reservations/src/routes/reservation.routes.ts`)
| HTTP Method | Path | Role | Description |
|--------------|------|------|-------------|
| GET | `/` | – | Health check. |
| POST | `/` | `CUSTOMER` | Create a reservation. Expects `{ shopId, offerId, quantity, unitPrice }`. |
| GET | `/mine` | `CUSTOMER` | List reservations of the authenticated customer. |
| GET | `/:id` | `CUSTOMER` | Get a single reservation (ownership check). |
| POST | `/:id/cancel` | `CUSTOMER` | Cancel a reservation (if PENDING or ACCEPTED). |
| GET | `/shop` | `MERCHANT` | List reservations for the merchant’s shop. |
| GET | `/shop/history` | `MERCHANT` | Same as above but includes status history. |
| POST | `/:id/accept` | `MERCHANT` | Accept a reservation. |
| POST | `/:id/refuse` | `MERCHANT` | Refuse a reservation (optional reason). |
| POST | `/:id/pickup` | `MERCHANT` | Mark reservation as picked up. |
| POST | `/pickup` | `MERCHANT` | Pickup using a QR‑code / pickup code. |

### Controllers / Services (not fully listed here, but present)
- `ReservationService.createReservation` – creates a reservation record.
- `ReservationService.changeStatus` – changes reservation status (CANCELLED, ACCEPTED, REFUSED).
- `ReservationService.pickup` / `pickupByCode` – handle pickup flow.

### Database model (Prisma schema – not shown but inferred)
- `Reservation` with fields: `id`, `customerId`, `shopId`, `offerId`, `quantity`, `unitPrice`, `status`, etc.
- `StatusHistory` linked to a reservation.

### Authentication & Authorization
- All routes are wrapped with `requireAuth(publicKey)` and `requireRole(<role>)` from `@forsa/common`.
- The frontend currently does **not** send an auth token; the `fetch` calls are raw and will be rejected by the backend until a proper wrapper (`fetchWithAuth`) is used.

### Frontend‑backend connection gaps
| Frontend component | Expected API call | Current code |
|-------------------|-------------------|--------------|
| `ReservationList` | `GET /mine` (list) | No call – uses placeholder data.
| `ReservationDetail` | `GET /:id` | Calls native `fetch` to `/api/reservations/${id}` – endpoint path does not match the backend (`/reservations/:id` under the service mount point). No auth header.
| `CreateReservationForm` | `POST /` | Calls `/api/reservations` with `{ name, date }` – wrong payload and missing auth.
| `ReservationSuccess`, `MerchantDashboard` | – | No backend interaction yet.

## 6. Assets and design system

### SVG icons present in `frontend/src/features/reservations/assets/icons/`
```
calendar-03.svg
cancel-01.svg
checkmark-circle-02.svg
Frame.svg
home-05.svg
Icône arrow-right-02-round.svg
Icône clock-01.svg
Icône flag-02.svg
Icône hand-bag-01.svg
Icône qr-code.svg
Icône star.svg
Icône tick-02.svg
Icône time-02.svg
Icône view.svg
Icône wallet-02.svg
leaf.svg
location-05.svg
logout-01.svg
Motif QR.svg
Navigation icon-1.svg
Navigation icon.svg
Unread indicator.svg
user.svg
```

- **Used in current code**: `calendar-03.svg` (top bar) and `cancel-01.svg` (bottom bar). `checkmark-circle-02.svg` is imported but not used.
- **Missing / unreferenced assets**: Many icons referenced in the Figma JSON (e.g., hand‑bag, flag, star) are not used in any component yet.
- **Design system** – Tailwind utility classes combined with custom colours defined in the Figma JSON (`fill_d1028063` → `#FFFAF0`, `fill_d6540b97` → `#0B2C25`, etc.). The Poppins font is applied via the `font-poppins` class.
- **Potential issues** – No central SVG component library; each icon is imported individually, which is fine but could lead to unused imports.

## 7. Build and runtime verification
- `npm run build` – **fails** with a TypeScript error because `ReservationDetail.tsx` imports `useParams` from `react-router-dom` (unused) and the module is not installed. The error was removed by editing the file (the import line was deleted). After that, the build **succeeds**.
- `npm run dev` – Development server starts, but the UI displayed is the placeholder list (see section 4). No runtime JavaScript errors are logged; the only functional gap is the missing data fetching/auth header.
- **TypeScript checks** – All files now compile (no TS2307 errors for SVG imports thanks to `vite‑env.d.ts`).
- **Runtime errors** – None observed beyond missing data; API calls would 401 because no auth token is sent.

## 8. Previous failed attempts and known problems (chronological)
1. **Initial static `ReservationScreen.tsx`** – only displayed a static hand‑off screen (`Reservation handoff`).
2. **Added placeholder `ReservationList.tsx`** – hard‑coded list, buttons, still not matching Figma.
3. **Missing SVG typings** – `TS2307` errors; fixed by creating `src/vite‑env.d.ts` with `declare module "*.svg"`.
4. **Component import errors** – `ReservationScreen.tsx` tried to import non‑existent screen components; created stubs for each screen.
5. **Incorrect double arrow in render function** – syntax error `() => =>`; fixed.
6. **`ReservationDetail.tsx` imported `useParams` from `react-router-dom`** – library not present; removed import.
7. **`npm run build` still failing** – resolved by cleaning up JSX syntax and the extra stray `);` line in `ReservationScreen.tsx`.
8. **Browser still showing placeholder UI** – because the placeholder `ReservationList` was never replaced with the real design; only the imports changed, not the markup. The component still renders hard‑coded data.
9. **Attempted to locate Figma node IDs** – unable to directly map IDs via simple grep; the JSON is large and the exact layout details were not extracted, leaving many design specs **unverified**.

## 9. Exact remaining work (prioritized roadmap)
1. **Reservation List (node 879‑24298)**
   - Extract exact dimensions, paddings, colours, typography from the Figma JSON (or open the file in Figma manually).
   - Replace placeholder markup with the real component hierarchy (e.g., card component for each reservation, proper icons, background colours).
   - Implement data fetching from `GET /mine` using a proper `fetchWithAuth` wrapper (add the wrapper if it exists elsewhere, otherwise create a minimal version that adds the auth header).
   - Handle loading / error states.
2. **Reservation Detail (node 879‑24299)**
   - Build the detailed view according to Figma (header, fields, QR‑code image, status badge, back button).
   - Use `GET /:id` endpoint.
3. **Create Reservation (node 879‑24300)**
   - Replicate the full form layout (inputs, icons, possible dropdowns) as per Figma.
   - POST to `/` with required payload (shopId, offerId, quantity, unitPrice).
4. **Reservation Success (node 879‑24301)**
   - Add the success check‑icon, headline, description, and button with correct styling.
5. **Reservation Handoff (node 879‑24309)** – already implemented; verify styling against Figma (background colour, QR‑code size).
6. **Merchant Dashboard (if within MS3 scope)**
   - Implement merchant list view, accept/refuse/pickup actions using the merchant endpoints.
7. **Authentication wiring**
   - Ensure all frontend fetches use the shared `fetchWithAuth` (or equivalent) so the backend receives a valid token.
8. **Testing**
   - Manual UI testing of the full flow: list → detail → create → success → handoff → merchant actions.
   - Add unit tests for components if the project uses a testing framework.

**Acceptance criteria** for each screen: visual match to Figma (pixel‑perfect dimensions, colours, fonts, icons), functional data loading/saving, correct navigation, no TypeScript or runtime errors.

## 10. Instructions for Claude (the next developer)
- **What to inspect before coding**: Open the Figma file, locate each node ID listed above, and copy the exact layout specifications (width/height, padding, margin, colours, font sizes, line‑height, icon assets). Keep the JSON as a fallback reference.
- **Files you may modify**: all files under `frontend/src/features/reservations/` (the six components and `ReservationScreen.tsx`). You may also add or edit `src/vite‑env.d.ts` if needed, but it already exists.
- **Modules to keep untouched**: any other feature folders (`auth`, `catalogue`, etc.), the overall `main.tsx`, and all backend service files except when you need to adjust request URLs to match the actual routes.
- **Preserve MS1/MS2 compatibility**: continue using Tailwind utility classes, the `font-poppins` class, and the same max‑width (`390px`) container. Do not change the global CSS or theme.
- **Backend usage**: Use the exact endpoint paths from `reservation.routes.ts` (e.g., `/reservations/mine`, `/reservations/:id`). Prefix them with the service base URL that the app already uses (usually `/api/reservations`). Attach the auth token via the existing `fetchWithAuth` wrapper (search the repo for that wrapper – it may live in a shared `common` package). If it does not exist, create a thin wrapper that reads the token from local storage and adds `Authorization: Bearer <token>`.
- **Reproducing Figma accurately**: Do not invent UI elements. Every button, label, icon, and spacing must come from the Figma frame. If a design element is ambiguous, open the frame in Figma and inspect its properties.
- **Avoid placeholders**: Replace all hard‑coded data with real API responses. If an endpoint is missing, note it but do not fake data.
- **Testing**: After each screen is completed, run `npm run build` and `npm run dev` to ensure there are no compile errors. Verify the rendered UI in the browser against the Figma design.

## 11. Git and recovery information
- **Current branch** – likely `main` (the repository default). Use `git branch` to confirm.
- **Latest commit** – the most recent commit includes the placeholder components and the `vite‑env.d.ts` fix. (Exact SHA not shown here; run `git log -1` to retrieve.)
- **Modified / untracked files** (relative to the original scaffold):
  - `frontend/src/vite-env.d.ts` (added).
  - `frontend/src/features/reservations/ReservationScreen.tsx` (rewritten).
  - `frontend/src/features/reservations/ReservationList.tsx` (placeholder implementation).
  - `frontend/src/features/reservations/ReservationDetail.tsx` (edited to remove unused import).
  - `frontend/src/features/reservations/CreateReservationForm.tsx` (added).
  - `frontend/src/features/reservations/ReservationSuccess.tsx` (added).
  - `frontend/src/features/reservations/MerchantDashboard.tsx` (added).
- **Uncommitted changes** – all the above files are currently saved on disk but not committed. Use `git add . && git commit -m "MS3 reservation feature scaffolding & fixes"` before handing off.
- **State safety** – The repository builds successfully after the last fixes, so the current state is **recoverable**. Make a backup (e.g., create a zip of the repo or branch `git checkout -b handover-backup`) before continuing.
- **Recommended backup/checkpoint** –
  1. `git checkout -b handover-backup`
  2. Push the branch to the remote (`git push origin handover-backup`).
  3. Tag the commit (`git tag -a handover‑start -m "Start of handover" && git push origin handover-start`).

---
*End of report.*
