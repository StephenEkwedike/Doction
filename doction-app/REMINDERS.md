# Reminders
- Run with cd doction-app && npm install --legacy-peer-deps because Stripe's latest version is incompatible with React19 so this overrides it so it'll still work
- Provision Intercom workspace + Messenger credentials.
  - Generate a Personal Access Token (`INTERCOM_PAT`).
  - Capture the default admin ID and Messenger app ID for environment variables.
- Provision Twilio account or Messaging Service for the hybrid SMS relay.
  - Decide whether to use `TWILIO_MESSAGING_SERVICE_SID` or a dedicated `TWILIO_FROM` number.
- After accounts are ready, update `.env.local` with the Intercom and Twilio values listed in `.env.local.example`.
- Set up a Clerk project (publishable + secret key) and enable Intercom Messenger Security under App Settings.
- Register a Calendly webhook (invitee.created / canceled) pointing to `/api/calendly/webhook` and note the signing key (`CALENDLY_SIGNING_KEY`).
- Configure Stripe (secret + publishable keys, optional webhook secret) and create a webhook endpoint for `/api/stripe/webhook` if you want automatic default payment method updates.

