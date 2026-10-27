# Security Specification: FinanFlow Firestore Rules

## 1. Data Invariants
- An unauthenticated user can never read, list, create, update, or delete any user profiles, households, transactions, categories, accounts, or goals.
- A user can only access and modify their own `/users/{userId}` profile where `userId == request.auth.uid`.
- A user can only read, list, create, update, or delete transactions, categories, accounts, or goals if their UID is present in `resource.data.memberUids` (or `request.resource.data.memberUids` on creation) and they are verified.
- On creation of any financial entity (Transaction, Category, Account, Goal), `creatorUid` must strictly match `request.auth.uid`.
- On creation and update, `memberUids` must be a list containing at least one UID and at most 10 UIDs to prevent resource exhaustion, and `request.auth.uid in memberUids` must hold.
- Immutability: `creatorUid`, `id`, and `householdId` cannot be altered during an update (`incoming().creatorUid == existing().creatorUid`).
- Document ID path variables must satisfy `isValidId(id)` (alphanumeric with underscores and hyphens, max 128 characters).
- Field volumetric limits: string descriptions <= 300 chars, notes <= 2000 chars, amounts must be non-negative valid numbers.

## 2. The "Dirty Dozen" Payloads (Designed to Fail)
1. **Unauthenticated Read**: Attempting to read `/transactions/tx_1` without `request.auth`.
2. **Identity Spoofing on Transaction Create**: Creating a transaction with `creatorUid: "another_user"`.
3. **Foreign Member Infiltration**: User B attempting to read a transaction belonging to household members `[UserA]`.
4. **List Query Scraping**: Listing `/transactions` without filtering by `request.auth.uid in memberUids`.
5. **ID Poisoning**: Passing a 2KB junk string as the document ID in `/transactions/{id}`.
6. **Denial of Wallet (Unbounded Array)**: Creating a household with an array of 500 member UIDs.
7. **Creator UID Tampering**: Updating an existing transaction and changing `creatorUid` to an unauthorized user.
8. **Negative / NaN Amount Exploitation**: Inserting a transaction with `amount: -5000` or `amount: "fifty"`.
9. **Shadow Fields Attack**: Injecting `{ isSystemAdmin: true, bypassBilling: true }` into a transaction payload.
10. **Household Takeover**: Non-owner attempting to modify the `ownerId` of `/households/house_1`.
11. **User Profile Impersonation**: User A writing to `/users/UserB`.
12. **Unverified Email Bypass**: Creating records when `request.auth.token.email_verified == false`.
