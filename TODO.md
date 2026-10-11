# Vaultora implementation outcomes

## Public site and responsive Vaultora design

- The public site provides Home, Plans, About, Contact, Sign up, Log in, Forgot password, and Reset password screens.
- Home includes a hero, how it works, Starter/Pro/Elite investment plans with ROI percentage and duration, live BTC/ETH/USDT price ticker, testimonials, FAQ, and footer.
- The visual system is a responsive dark premium fintech look with deep navy/black surfaces, Vault Gold and emerald accents, clean modern typography, mobile layouts, and consistent loading/empty/error states.

## Secure email/password authentication

- Sign up collects full name, email, phone, country, password, and password confirmation.
- After sign-up, the server validates and stores the submitted details without requiring a confirmation email; the user is taken directly to Sign in.
- Login validates the submitted email and password on the server, allows only non-suspended users, creates a secure application session, and sends the user to the dashboard.
- Forgot password accepts an email without account enumeration; reset password uses a hashed, expiring, single-use token/code and a strong replacement password.
- All credentials, codes, and sessions are handled server-side; no raw password or code is stored or exposed.

## User dashboard and self-owned data

- Signed-in users see total balance, active investments, total profit, pending withdrawals, recent activity, and unread inbox count.
- Users can submit deposit requests by selecting an enabled coin/address, seeing the wallet address, and entering amount and transaction ID.
- Users can pick a plan, enter an amount within server-validated bounds, have the amount deducted from their balance on the server, and see the investment tracked.
- Users can submit withdrawals with amount and wallet address and see Pending / Approved / Rejected status with any reason.
- Users can view their own deposit, withdrawal, credit, debit, investment, and profit transaction history.
- Users can view/read inbox messages and notifications with an unread badge.
- Users can edit their profile and change their password.
- A user can only read or mutate their own records; client-provided user IDs, roles, balances, and statuses are ignored.

## Admin control center

- Only users with an admin role stored in the separate roles table can access admin procedures or admin pages; non-admin users are rejected server-side.
- Admin dashboard shows total users, total deposits, pending withdrawals, total balances, and queue highlights.
- Admin users can search/list users, view details, suspend/activate, delete with confirmation while preserving audit history, edit balance by credit/debit with a required note, and promote/remove the admin role.
- Admin users can approve or reject deposit requests; approval credits the balance through the server ledger and rejection records a reason.
- Admin users can approve or reject pending withdrawals with a reason and status transition; approval is an internal ledger state change, not a real blockchain transfer.
- Admin users can compose a direct message/email to one user; the message is saved to that user's inbox and an email attempt is logged.
- Every admin action is recorded in an activity log with actor, action, target, metadata, and timestamp.

## Unlimited admin-managed deposit addresses

- Admins can add any number of deposit addresses for any supported coin and network; there is no fixed row or address limit in the application.
- Admins can edit an address, coin, network, label, enabled state, and display order, and users see only enabled addresses.
- Adding, editing, enabling, disabling, and reordering addresses is server-protected and logged with the admin actor.
- Users cannot create, edit, delete, reorder, or enable deposit addresses.
- Multiple addresses for the same coin/network remain independent; disabling or editing one does not change the others.

## Notifications and email delivery

- The user receives an inbox message and an email attempt when a withdrawal is approved/rejected with reason, a deposit is approved/rejected, an admin credits balance, an admin debits balance, or an admin sends a direct message.
- Credit/debit notifications include the amount, new balance, and admin note.
- Email attempts are stored with recipient, event type, subject, provider status/error, and timestamp; missing provider configuration never claims delivery.
- SMTP/provider secrets are supplied only through protected project configuration and never exposed to the browser.

## Server-side security and auditable ledger

- All balance changes and approval effects happen inside server-side database transactions with fixed-precision amounts and validation.
- Every balance-affecting change creates a transaction row containing type, amount/direction, reference, note, actor, resulting balance, and timestamp.
- Deposit approval credits balance, investment creation deducts balance, and withdrawal approval deducts/locks the approved amount according to the implemented server workflow; rejected requests do not silently change balances.
- Protected procedures use the validated application session and separate database-backed roles; browser state is never trusted for authorization.
- The route manifest is served from `/manus-routes.json`, `/api/health` remains healthy, the app type-checks, tests pass for auth/authorization/ledger/wallet management, and the production build succeeds.
