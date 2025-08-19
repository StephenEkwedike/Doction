Doction — Backend Integration Guide (findme.md)

Purpose
This document is your map of the project so you can quickly connect databases, auth, messaging, and billing. It explains routes, components, hooks, data flow, and the exact file paths that matter.

High-level overview
- Frontend framework: Next.js (App Router) with shadcn/ui and Tailwind CSS.
- AI: Vercel AI SDK with OpenAI provider for chat streaming and case extraction. The client uses useChat from @ai-sdk/react; the server uses streamText/generateText. [^1]
- Data storage (current): Local storage in the browser for MVP. Replace with your DB when wiring real persistence.
- OCR: Client-side PDF text extraction (pdfjs-dist) and image OCR (tesseract.js).
- Notifications: Placeholder API endpoint ready to hook into Twilio/SMTP.
- Provider data: Mock dataset in code; replace with DB-backed directory.

Where the shell layout lives (navs that must exist everywhere)
- app/layout.tsx
  - Wraps all pages with:
    - Sidebar: components/sidebar.tsx
    - TopNav: components/top-nav.tsx
  - Ensures the left and top navs persist across all routes.

Primary pages and routes
1) Patient Home (Page 1 — chat-style intake)
- app/page.tsx
  - Wires the AI chat using useChat from @ai-sdk/react and passes handlers to ChatView. [^1]
  - Sends messages via append({ role: 'user', content }) — the AI SDK handles /api/chat streaming.

- components/chat-view.tsx
  - The hero (orb + greeting), message list, profile preview, offer notifications, and chat composer.
  - Triggers:
    - Profile creation preview after file uploads.
    - Offers display via OfferNotifications and opens a chat room on action.
    - AuthGate modal prompts for email/phone before revealing offers/actions.

- components/chat_composer.tsx
  - The input box with:
    - Attach button and file input.
    - File processing: extractFromFiles()
      - PDF: pdfjs-dist, text extracted from pages.
      - Images: tesseract.js OCR.
      - Text files: raw text.
    - After extraction:
      - POST /api/extract-case with text → AI-structured profile JSON (server).
      - POST /api/match-offers with profile → offer list (server).
      - Stores profile/offers in local storage via use-case.ts hook.

- components/example-cards.tsx
  - Four Doction‑specific example prompts to prefill the chat.

- components/intake-hints.tsx
  - Quick chips under the hero to seed intake messages.

- components/offer-notifications.tsx
  - Displays “You have N new offers”.
  - Accept/Request consult → creates a conversation and navigates to /room/[id].

- components/auth-modal.tsx (AuthGate)
  - Email + phone capture before showing offer actions.
  - POST /api/notify for downstream SMS/email follow‑ups (stub).

2) Conversations list (patient)
- app/rooms/page.tsx
  - Email‑style list of all conversations with unread counts.
  - Clicking an item → /room/[id].

3) Conversation thread (patient ↔ provider)
- app/room/[id]/page.tsx
  - Shows the selected offer header + chat thread.
  - Messages are persisted to localStorage per room (THREAD_KEY = doction_room_${id}).
  - Uses useConversations() to update previews and unread counts.
  - Simulates provider reply (MVP); replace with your real socket/long-polling later.

4) Provider dashboard (separate surface)
- app/provider/page.tsx
  - Inbox for providers with a filter by provider (dropdown).
  - Uses the same client-side conversations store; you will replace with server data.

- app/provider/room/[id]/page.tsx
  - Provider’s view of a conversation.
  - Sends messages as “provider”, updates unread counts for the patient side.

Server API routes (App Router)
- app/api/chat/route.ts
  - Streaming chat endpoint using AI SDK streamText and OpenAI provider.
  - Reads process.env.OPENAI_API_KEY. If not set, returns a demo JSON message. [^1]
  - Client integration is handled via @ai-sdk/react useChat on app/page.tsx.

- app/api/extract-case/route.ts
  - Case extraction:
    - With OPENAI_API_KEY: Uses AI SDK generateText with an instruction to return strict JSON only. [^1]
    - Without a key: Falls back to naiveExtract() for a best‑effort parse.
  - Returns: { profile, raw }.

- app/api/match-offers/route.ts
  - Matching engine (MVP):
    - Reads profile: { procedure, quotedPriceUSD, location, travelOk }.
    - Filters/adjusts against the mock provider set in lib/providers.ts.
    - Returns a list of offers that fuel OfferNotifications and Conversations.

- app/api/notify/route.ts
  - Stub for notifications. Logs requests. Replace with Twilio/SMTP call.

Client-side state (hooks)
- hooks/use-case.ts
  - Keys:
    - doction_case_profile → CaseProfile JSON (age, location, procedure, quote info, travelOk, etc.)
    - doction_offers → Offer[]
    - doction_auth → { email, phone }
  - Exposes: profile, setProfile, offers, setOffers, isAuthed, saveAuth.

- hooks/use-conversations.ts
  - Keys:
    - doction_conversations_v1 → Conversation[]
    - doction_room_${id} → Msg[] (per-thread messages)
    - doction_provider_current → current provider filter in dashboard
  - Exposes:
    - list(): sorted conversations.
    - ensureFromOffer(offer): creates a conversation record from the selected offer.
    - appendMessage(id, role, content): updates lastMessage, timestamps, unread counters.
    - markReadPatient(id) / markReadProvider(id): resets unread counters for the respective party.
    - get/setCurrentProvider(): provider filter persistence.

Data types and fixtures
- hooks/use-case.ts
  - export type CaseProfile and Offer.

- hooks/use-conversations.ts
  - export type Conversation.

- lib/providers.ts
  - Mock provider directory dataset. Replace with your DB query to return providers by specialty/location/price bands.

- public/diverse-user-avatars.png
  - Avatar placeholder.

Branding
- components/purple-orb.tsx
  - Blue orb gradient (Twitter-like) background.
- components/sidebar.tsx
  - Top “logo square” with from-sky-500 to-blue-600 gradient.
- Focus rings, CTAs, and accents mostly use sky/blue classes.

Navigation shell
- components/sidebar.tsx
  - Message icon points to /rooms.
  - Highlight states can be added via pathname if needed.

- components/top-nav.tsx
  - Model selector dropdown (cosmetic).
  - Search input (cosmetic stub for now).
  - Invite and New Thread buttons (cosmetic stubs for now).

End-to-end flow (patient)
1) User lands on / and sees hero + composer.
2) User uploads files → client extracts text (pdfjs-dist/tesseract.js).
3) Client POSTs extracted text to /api/extract-case → AI JSON profile (or fallback). [^1]
4) Client POSTs profile to /api/match-offers → returns offers.
5) OfferNotifications appears with “Accept offer” / “Request a consult.”
6) On click:
   - If email/phone missing → AuthGate modal → saveAuth() then continue.
   - ensureFromOffer(offer) to seed a conversation and navigate to /room/[id].
7) /room/[id] shows offer header + thread; messages persist locally.
8) /rooms shows stacked conversations with unread counts.

End-to-end flow (provider)
1) Visit /provider → pick a provider (filter).
2) Click a thread → /provider/room/[id].
3) Send a message as provider → updates conversation unread for patient.
4) This MVP uses the same local store to simulate both sides; replace with server data for real usage.

AI integration details (what to keep and where)
- Client chat streaming:
  - app/page.tsx uses useChat from @ai-sdk/react and append() to send messages. [^1]
  - The hook POSTs to /api/chat automatically; responses are streamed back.

- Case extraction:
  - app/api/extract-case/route.ts uses generateText with instructions to return pure JSON. [^1]
  - If the model returns invalid JSON, we parse fallback naiveExtract(text).

Environment variables
- .env.local.example
  - OPENAI_API_KEY=your-openai-api-key
  - APP_NAME=Doction

Where to add real integrations
- Database (Neon or Supabase)
  - Replace localStorage with server persistence:
    - Providers: replace lib/providers.ts with a route handler that queries your DB.
    - Offers: move /api/match-offers logic server-side with SQL. Return offers tied to a patient case id.
    - Conversations:
      - Create a table: conversations (id, provider_id, patient_id, last_message, updated_at, unread_patient, unread_provider).
      - Messages:
        - messages (id, conversation_id, sender_role, content, created_at, attachments?).
      - Update use-conversations.ts: fetch list and messages via API instead of localStorage.
  - For Neon, use @neondatabase/serverless in your server routes. [Note: do not use @vercel/postgres per project guidelines.]

- Auth (email/magic link)
  - Add a server-side auth solution (e.g., Supabase Auth) and:
    - Gate /provider and /provider/room/[id] behind provider auth.
    - Persist patient contact from AuthGate to your users table.

- Notifications (Twilio/Email)
  - app/api/notify/route.ts is the hook point.
  - Env vars to expect:
    - TWILIO_ACCOUNT_SID
    - TWILIO_AUTH_TOKEN
    - TWILIO_FROM_NUMBER
  - Replace console.log with Twilio client calls or SMTP send (e.g., Resend/NodeMailer).

- Billing (Stripe)
  - Add a “post-first-client” subscription workflow:
    - Providers table: trial_until_first_client boolean, subscription_status, stripe_customer_id, stripe_price_id.
    - On the first accepted offer (server-vetted), create a Stripe subscription.
    - Add admin tools for manual override, pausing, or canceling.

- File uploads (server-side)
  - For production-grade uploads, use Vercel Blob or Supabase Storage instead of client-only processing.
  - Add an /api/upload route to sign uploads from the client; process PDFs/images server-side if you want stronger/consistent OCR results.

Key file reference list
- Layout/shell
  - app/layout.tsx
  - components/sidebar.tsx
  - components/top-nav.tsx

- Patient home (Page 1)
  - app/page.tsx
  - components/chat-view.tsx
  - components/chat_composer.tsx
  - components/intake-hints.tsx
  - components/example-cards.tsx
  - components/offer-notifications.tsx
  - components/auth-modal.tsx
  - components/purple-orb.tsx

- Conversations (patient)
  - app/rooms/page.tsx
  - app/room/[id]/page.tsx

- Provider surface
  - app/provider/page.tsx
  - app/provider/room/[id]/page.tsx

- APIs
  - app/api/chat/route.ts            → AI streaming chat [^1]
  - app/api/extract-case/route.ts    → AI profile extraction [^1]
  - app/api/match-offers/route.ts    → Offer matching (mock provider data)
  - app/api/notify/route.ts          → Notification webhook (stub)

- State/hooks
  - hooks/use-case.ts                → Case profile, offers, auth
  - hooks/use-conversations.ts       → Conversations + messages (local)

- Data and utilities
  - lib/providers.ts                 → Mock provider directory
  - lib/utils.ts                     → cn() helper
  - public/diverse-user-avatars.png  → Avatar image

How to run locally
1) Copy .env.local.example to .env.local and add OPENAI_API_KEY.
2) Install and run:
   - npm install
   - npm run dev
3) Open http://localhost:3000.
4) Try:
   - Chat on / (streams if key is present).
   - Upload a PDF/image/text quote → profile + offers appear.
   - Click Accept/Request → /room/[offer-id].
   - View all threads at /rooms.
   - Provider dashboard at /provider.

Production notes
- Keep OPENAI_API_KEY server-side only (never client-exposed). [^1]
- Convert client-side OCR to server-side for consistency and performance if needed.
- Replace localStorage with DB models; migrate /api routes to DB-backed logic.
- Add authentication to separate patient/provider experiences.
- Audit PII handling and access controls before launch.

Questions you might have
- Where do I hook in a real provider directory? → Replace lib/providers.ts with a real DB table + query in /api/match-offers.
- How do I swap local message storage for a DB? → Add /api/conversations and /api/messages routes and update use-conversations.ts to fetch/save via these endpoints. Consider WebSockets or server-sent events for real-time updates.
- How do I get Twilio working? → Implement app/api/notify/route.ts using Twilio SDK with the env vars above. Trigger notify whenever offers are created or messages arrive.

Appendix: Key interactions at a glance
- Upload path:
  ChatComposer (client) → /api/extract-case (server AI) → profile → /api/match-offers (server) → offers → OfferNotifications → ensureFromOffer() → /room/[id].
- Chat path:
  app/page.tsx useChat append() → /api/chat (AI SDK) → streamed response back to messages. [^1]

References
- The chat endpoint uses the Vercel AI SDK (useChat on client; streamText/generateText on server) with the OpenAI provider. Configure OPENAI_API_KEY to enable streaming. [^1]
