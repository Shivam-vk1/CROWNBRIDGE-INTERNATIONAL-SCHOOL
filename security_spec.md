# Security Specification — Crownbridge International School

## 1. Data Invariants
1. **Default Deny**: All paths not explicitly matched are denied by default (`match /{document=**} { allow read, write: if false; }`).
2. **Admin Verification**: Administrator privileges (`isAdmin()`) require an authenticated user (`request.auth != null`) with `request.auth.token.email_verified == true` whose email matches the bootstrapped admin (`shivamvk1090@gmail.com`) OR whose UID exists in `/admins/$(request.auth.uid)`.
3. **Path Variable Hardening**: Every single-document target operation (`get`, `create`, `update`, `delete`) validates the document ID against `isValidId(id)` (`id is string && id.size() <= 128 && id.matches('^[a-zA-Z0-9_\\-]+$')`).
4. **Public Read / Admin Write Collections**:
   - `/notices/{noticeId}`: Publicly readable (`get`, `list`); only `isAdmin()` can `create`, `update`, `delete` with strict schema validation (`isValidNotice`), `authorUid == request.auth.uid`, and server timestamps (`request.time`).
   - `/results/{resultId}`: Publicly readable (`get`, `list`); only `isAdmin()` can `create`, `update`, `delete` with strict schema validation (`isValidResult`), `authorUid == request.auth.uid`, and server timestamps (`request.time`).
   - `/fees/{feeId}`: Publicly readable (`get`, `list`); only `isAdmin()` can `create`, `update`, `delete` with strict schema validation (`isValidFee`), `authorUid == request.auth.uid`, and server timestamps (`request.time`).
   - `/siteContent/{docId}`: Publicly readable (`get`, `list`); only `isAdmin()` can `create`, `update`, `delete` with strict schema validation (`isValidSiteContent`), `authorUid == request.auth.uid`, and server timestamps (`request.time`).
5. **PII Isolation (`/inquiries/{inquiryId}`)**:
   - Anyone can `create` a valid inquiry (`isValidInquiry(incoming())`, `incoming().status == 'new'`, `incoming().createdAt == request.time`, `incoming().updatedAt == request.time`).
   - Because inquiries contain parent PII (`phone`, `email`), ONLY `isAdmin()` can `get`, `list`, `update`, or `delete` documents in `/inquiries`.

## 2. The "Dirty Dozen" Payloads
1. **Shadow Field Injection on Notice**: Adding `"isVerified": true` to `/notices/n1` -> Rejected by `hasOnly`.
2. **Unverified Admin Email Spoof**: User with `email: "shivamvk1090@gmail.com"` and `email_verified: false` attempting to create `/notices/n1` -> Rejected by `email_verified == true` check.
3. **Identity Spoofing on Result**: Admin creating `/results/r1` with `authorUid: "someone_else"` -> Rejected by `data.authorUid == request.auth.uid`.
4. **PII Scraping on Inquiries**: Non-admin user calling `get` or `list` on `/inquiries` -> Rejected by `isAdmin()`.
5. **Status Shortcutting on Inquiry Creation**: Anonymous user creating `/inquiries/inq1` with `status: "enrolled"` -> Rejected by `incoming().status == 'new'`.
6. **Timestamp Forgery on Notice Creation**: Passing a past/future client timestamp instead of `request.time` -> Rejected by `incoming().createdAt == request.time`.
7. **Immortal Field Mutation on Notice Update**: Changing `createdAt` or `authorUid` during `update` -> Rejected by `incoming().createdAt == existing().createdAt && incoming().authorUid == existing().authorUid`.
8. **ID Poisoning**: Creating `/inquiries/invalid$id!@#` -> Rejected by `isValidId(inquiryId)`.
9. **Oversized String Denial-of-Wallet**: Submitting an inquiry with a 5,000-character `message` -> Rejected by `data.message.size() <= 1000`.
10. **Out-of-Bounds Marks on Result**: Admin submitting `englishMarks: 150` or `-10` -> Rejected by `0 <= marks <= 100` check.
11. **Invalid Enum Value on Inquiry**: Submitting `preferredLanguage: "Klingon"` -> Rejected by enum list check.
12. **Self-Assigned Admin Role**: Authenticated non-admin attempting to create `/admins/their_uid` -> Rejected by `isAdmin()`.
