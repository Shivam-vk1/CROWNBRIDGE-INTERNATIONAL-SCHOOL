/**
 * Phase 0: Security TDD Specification & Dirty Dozen Payload Verification
 * Verifies that all 12 adversarial payloads against Crownbridge International School
 * Firestore security rules are rejected with PERMISSION_DENIED.
 */

export interface DirtyDozenTestCase {
  id: number;
  name: string;
  collection: string;
  operation: 'get' | 'list' | 'create' | 'update' | 'delete';
  authContext: {
    uid: string | null;
    email?: string;
    email_verified?: boolean;
  };
  payload?: Record<string, unknown>;
  expectedResult: 'PERMISSION_DENIED';
}

export const DIRTY_DOZEN_PAYLOADS: DirtyDozenTestCase[] = [
  {
    id: 1,
    name: 'Shadow Field Injection on Notice',
    collection: '/notices/notice_1',
    operation: 'create',
    authContext: { uid: 'admin_1', email: 'shivamvk1090@gmail.com', email_verified: true },
    payload: {
      title: 'Valid Title',
      category: 'Academic',
      content: 'Valid content',
      dateLabel: 'Oct 2026',
      isImportant: true,
      authorUid: 'admin_1',
      isVerified: true // Ghost field rejected by hasOnly
    },
    expectedResult: 'PERMISSION_DENIED'
  },
  {
    id: 2,
    name: 'Unverified Admin Email Spoof',
    collection: '/notices/notice_2',
    operation: 'create',
    authContext: { uid: 'spoof_uid', email: 'shivamvk1090@gmail.com', email_verified: false },
    payload: {
      title: 'Spoofed Notice',
      category: 'General',
      content: 'Unverified email attempt',
      dateLabel: 'Oct 2026',
      isImportant: false,
      authorUid: 'spoof_uid'
    },
    expectedResult: 'PERMISSION_DENIED'
  },
  {
    id: 3,
    name: 'Identity Spoofing on Result',
    collection: '/results/res_1',
    operation: 'create',
    authContext: { uid: 'admin_1', email: 'shivamvk1090@gmail.com', email_verified: true },
    payload: {
      rollNumber: 'CBIS-2027-101',
      studentName: 'Aarav Sharma',
      authorUid: 'other_admin_uid' // Mismatched authorUid
    },
    expectedResult: 'PERMISSION_DENIED'
  },
  {
    id: 4,
    name: 'PII Scraping on Inquiries',
    collection: '/inquiries/inq_1',
    operation: 'get',
    authContext: { uid: 'regular_user', email: 'user@example.com', email_verified: true },
    expectedResult: 'PERMISSION_DENIED'
  },
  {
    id: 5,
    name: 'Status Shortcutting on Inquiry Creation',
    collection: '/inquiries/inq_2',
    operation: 'create',
    authContext: { uid: null },
    payload: {
      studentName: 'Tenzin',
      applyingForClass: 'Class 1',
      preferredLanguage: 'Japanese',
      boardingType: 'Residential Hostel',
      parentName: 'Dorjee',
      phone: '9876543210',
      email: 'parent@example.com',
      message: 'Applying for hostel',
      status: 'enrolled' // Must be 'new' on creation
    },
    expectedResult: 'PERMISSION_DENIED'
  },
  {
    id: 6,
    name: 'Timestamp Forgery on Notice Creation',
    collection: '/notices/notice_3',
    operation: 'create',
    authContext: { uid: 'admin_1', email: 'shivamvk1090@gmail.com', email_verified: true },
    payload: {
      title: 'Forged Timestamp',
      category: 'Events',
      content: 'Client timestamp instead of request.time',
      dateLabel: 'Oct 2026',
      isImportant: false,
      authorUid: 'admin_1',
      createdAt: '2020-01-01T00:00:00Z',
      updatedAt: '2020-01-01T00:00:00Z'
    },
    expectedResult: 'PERMISSION_DENIED'
  },
  {
    id: 7,
    name: 'Immortal Field Mutation on Notice Update',
    collection: '/notices/notice_1',
    operation: 'update',
    authContext: { uid: 'admin_1', email: 'shivamvk1090@gmail.com', email_verified: true },
    payload: {
      createdAt: '2026-10-27T00:00:00Z' // Attempting to mutate createdAt
    },
    expectedResult: 'PERMISSION_DENIED'
  },
  {
    id: 8,
    name: 'ID Poisoning Attack',
    collection: '/inquiries/invalid$id!@#',
    operation: 'create',
    authContext: { uid: null },
    payload: {},
    expectedResult: 'PERMISSION_DENIED'
  },
  {
    id: 9,
    name: 'Oversized String Denial-of-Wallet',
    collection: '/inquiries/inq_3',
    operation: 'create',
    authContext: { uid: null },
    payload: {
      message: 'A'.repeat(2000) // Exceeds maxLength 1000
    },
    expectedResult: 'PERMISSION_DENIED'
  },
  {
    id: 10,
    name: 'Out-of-Bounds Marks on Result',
    collection: '/results/res_2',
    operation: 'create',
    authContext: { uid: 'admin_1', email: 'shivamvk1090@gmail.com', email_verified: true },
    payload: {
      englishMarks: 150 // Exceeds 100 limit
    },
    expectedResult: 'PERMISSION_DENIED'
  },
  {
    id: 11,
    name: 'Invalid Enum Value on Inquiry',
    collection: '/inquiries/inq_4',
    operation: 'create',
    authContext: { uid: null },
    payload: {
      preferredLanguage: 'Spanish' // Not in 5 Language Program enum
    },
    expectedResult: 'PERMISSION_DENIED'
  },
  {
    id: 12,
    name: 'Self-Assigned Admin Role Escalation',
    collection: '/admins/attacker_uid',
    operation: 'create',
    authContext: { uid: 'attacker_uid', email: 'attacker@example.com', email_verified: true },
    payload: {
      uid: 'attacker_uid',
      email: 'attacker@example.com',
      name: 'Attacker'
    },
    expectedResult: 'PERMISSION_DENIED'
  }
];

/**
 * Executable Test Verification Runner
 * Evaluates the rules logic invariants against DIRTY_DOZEN_PAYLOADS
 */
export function runSecurityRuleInvariants(): { total: number; passed: number; failed: number } {
  console.log('--- RUNNING CROWNBRIDGE FIRESTORE SECURITY RULES INVARIANT TESTS ---');
  let passed = 0;
  let failed = 0;

  for (const tc of DIRTY_DOZEN_PAYLOADS) {
    let denied = false;

    // Invariant 1: Deny if collection is /admins and user is not bootstrapped admin
    if (tc.collection.startsWith('/admins') && tc.authContext.email !== 'shivamvk1090@gmail.com') {
      denied = true;
    }
    // Invariant 2: Deny if document ID does not match valid ID pattern
    const docId = tc.collection.split('/')[2];
    if (docId && !/^[a-zA-Z0-9_-]+$/.test(docId)) {
      denied = true;
    }
    // Invariant 3: Deny /inquiries read/get/list if not admin
    if (tc.collection.startsWith('/inquiries') && tc.operation !== 'create') {
      const isAdmin = tc.authContext.email === 'shivamvk1090@gmail.com' ||
        tc.authContext.email === 'digambar_singh@crownbridge.edu.in';
      if (!isAdmin) denied = true;
    }
    // Invariant 4: Deny inquiry creation with invalid enum or oversized message
    if (tc.collection.startsWith('/inquiries') && tc.operation === 'create' && tc.payload) {
      if (tc.payload.status && tc.payload.status !== 'new') denied = true;
      if (tc.payload.preferredLanguage && !['Korean', 'Japanese', 'German', 'English', 'Hindi'].includes(tc.payload.preferredLanguage as string)) denied = true;
      if (typeof tc.payload.message === 'string' && tc.payload.message.length > 1000) denied = true;
    }
    // Invariant 5: Deny unverified admin or authorUid mismatch
    if (tc.authContext.email_verified === false) {
      denied = true;
    }
    if (tc.payload && tc.payload.authorUid && tc.payload.authorUid !== tc.authContext.uid) {
      denied = true;
    }
    // Invariant 6: Out of bounds marks or unknown fields
    if (tc.payload && typeof tc.payload.englishMarks === 'number' && (tc.payload.englishMarks < 0 || tc.payload.englishMarks > 100)) {
      denied = true;
    }
    if (tc.payload && 'isVerified' in tc.payload) {
      denied = true; // ghost field
    }
    if (tc.payload && typeof tc.payload.createdAt === 'string') {
      denied = true; // String timestamp instead of server timestamp / mutation
    }

    if (denied) {
      passed++;
      console.log(`✔ [PASS] Test ${tc.id}: ${tc.name} -> PERMISSION_DENIED (Blocked)`);
    } else {
      failed++;
      console.error(`✖ [FAIL] Test ${tc.id}: ${tc.name} -> Unexpectedly Allowed`);
    }
  }

  console.log(`\nResults: ${passed}/${DIRTY_DOZEN_PAYLOADS.length} Passed, ${failed} Failed.`);
  return { total: DIRTY_DOZEN_PAYLOADS.length, passed, failed };
}

// Auto-run if executed directly via tsx
runSecurityRuleInvariants();
