# OpusProcureAI v2 — AI Procurement Assistant

Extending the existing app (no UI redesign). All new features are additive.

## 1. AI Assistant (natural-language search)

- New route `src/routes/assistant.tsx` — ChatGPT-style panel using AI Elements (`conversation`, `message`, `prompt-input`, `shimmer`).
- New server route `src/routes/api/chat.ts` — streams via Lovable AI Gateway (`google/gemini-3.5-flash`) with a tool `extract_search_filters` that returns structured `{ product, quantity, supplierType, category, minRating, distance, budget }`.
- On tool result: navigate to `/search?q=...&type=...&rating=...&category=...&distance=...` with prefilled filters.
- Chat history stored in `localStorage` (`opusprocure:chats`) — thread list in sidebar of the assistant page, one-conversation-per-thread. New sidebar nav entry "AI Assistant".

## 2. Search page enhancements

- `src/routes/search.tsx`: read query-string params on mount → seed query + filters.
- Add "Compare" checkbox on each `VendorCard`; floating "Compare (N)" action bar → opens comparison modal.
- Add "Generate RFQ" button on each card (replaces/augments current Request Quotation flow).
- Add "Open Now" toggle to filters (data already available via `businessStatus` / `regularOpeningHours` — extend Places field mask).
- Extend `src/lib/places.functions.ts` field mask to include `regularOpeningHours`, `currentOpeningHours`, expose `openNow` and `distanceKm` (compute haversine from Pune center using `location`).

## 3. AI Recommendation upgrade

- Extend `AiRecommendation` type: `advantages: string[]`, `risks: string[]`.
- Update the Gemini prompt + zod schema in `places.functions.ts`.
- Render advantages/risks in the recommendation card on `search.tsx`.

## 4. Supplier comparison

- New component `src/components/CompareModal.tsx` — table (Rating, Reviews, Phone, Website, Distance, Type, AI verdict). Highlights best row (highest rating × log(reviews)).
- Server function `compareVendors` (optional) — for now do the ranking client-side; keep it modular.

## 5. RFQ Generator

- New component `src/components/RfqDialog.tsx`:
  - Editable form: Supplier Name, Product, Quantity, Delivery Location (default "Pune, Maharashtra"), Timeline, Payment Terms, Warranty, GST, Contact (name/email/phone/company).
  - Live preview of formatted RFQ body.
  - Buttons: **Send via Outlook** (opens `ms-outlook://compose?to=...&subject=...&body=...`, with mailto fallback after 800 ms if not handled), **Copy**, **Export PDF**, **Export DOCX**.
- Persist last-used "Prepared By" info in localStorage.

## 6. Exports

- Install `jspdf`, `jspdf-autotable`, `xlsx`, `docx`, `file-saver`.
- `src/lib/export.ts`:
  - `exportVendorsCSV/XLSX(vendors)`
  - `exportComparisonPDF(vendors)`
  - `exportRfqPDF(rfq)`, `exportRfqDOCX(rfq)`
- Export buttons on: search results header, comparison modal, RFQ dialog.

## 7. Saved RFQs & stats

- `src/lib/rfq-store.ts` — save RFQs to localStorage `opusprocure:rfqs`.
- Dashboard (`src/routes/index.tsx`) adds cards: Saved RFQs count, Comparisons run count, Top recommended vendors (from history).

## 8. Sidebar

- Add "AI Assistant" nav item in `src/components/AppShell.tsx`.

## Technical notes

- No database. Everything localStorage.
- All AI calls server-side via existing `ai-gateway.server.ts`.
- Google Places New API already handles GST/ISO badges — those aren't exposed by Google, so those filter chips will be **client-side keyword filters** on business name/category (best-effort, labelled as such in tooltip).
- Outlook deep link: `ms-outlook://compose?...` works on Windows with Outlook installed; fallback `mailto:` opens default client. Both are draft-only, never auto-send.
- Distance filter now actually enforced using haversine.

## Out of scope (V1)

- Actual email sending (stays draft-only per user request).
- Server-side RFQ storage / auth.
- Real GST/ISO verification (no free API for this).