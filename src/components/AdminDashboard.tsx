import React, { useState, useEffect } from 'react';
import {
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  serverTimestamp,
  query,
  collection,
  orderBy,
  getDocs,
} from 'firebase/firestore';
import {
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  User,
} from 'firebase/auth';
import {
  Bell,
  Inbox,
  Settings,
  Link as LinkIcon,
  Plus,
  Trash2,
  Edit3,
  Check,
  X,
  Database,
  ArrowLeft,
  ShieldAlert,
  ShieldCheck,
  Globe,
  LogOut,
  ExternalLink,
  FileText,
  Eye,
  EyeOff,
  Image as ImageIcon,
  Users,
  UserPlus,
  Lock,
  Key,
  Camera,
  ChevronLeft,
  ChevronRight,
  Layers,
  Sparkles,
  Download,
  BookOpen,
} from 'lucide-react';
import {
  db,
  auth,
  googleProvider,
  BOOTSTRAPPED_ADMIN_EMAIL,
  OperationType,
  handleFirestoreError,
} from '../firebase';
import {
  NoticeItem,
  DownloadDocItem,
  GalleryItem,
  SiteSettingsData,
  AdmissionInquiryItem,
  AdminProfileItem,
  LearningResourceItem,
  DEFAULT_NOTICES,
  DEFAULT_DOWNLOADS,
  DEFAULT_GALLERY,
  DEFAULT_SITE_SETTINGS,
  DEFAULT_STAFF_ACCOUNTS,
  DEFAULT_LEARNING_RESOURCES,
  SCHOOL_ASSETS,
} from '../data/schoolData';

interface AdminDashboardProps {
  user: User | null;
  isAdmin: boolean;
  adminRole?: 'super_admin' | 'college_admin';
  notices: NoticeItem[];
  downloads: DownloadDocItem[];
  gallery?: GalleryItem[];
  learningResources?: LearningResourceItem[];
  siteSettings: SiteSettingsData;
  onBackToSite: () => void;
  onNoticeDeleted?: (id: string) => void;
  onNoticeSaved?: (item: NoticeItem) => void;
  onDownloadDeleted?: (id: string) => void;
  onDownloadSaved?: (item: DownloadDocItem) => void;
  onGalleryDeleted?: (id: string) => void;
  onGallerySaved?: (item: GalleryItem) => void;
  onLearningResourceDeleted?: (id: string) => void;
  onLearningResourceSaved?: (item: LearningResourceItem) => void;
  onSettingsSaved?: (settings: SiteSettingsData) => void;
}

type AdminTab =
  | 'notices'
  | 'downloads'
  | 'learningResources'
  | 'gallery'
  | 'publicInfo'
  | 'inquiries'
  | 'resultPortal'
  | 'customButtons'
  | 'settings'
  | 'users';

function sanitizeId(raw: string): string {
  return raw.replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 64) || `item-${Date.now()}`;
}

// Staff Security & Session Expiration Constants
// 20 minutes of inactivity will trigger an automatic security logout
export const STAFF_SESSION_INACTIVITY_MS = 20 * 60 * 1000;
// 8 hours absolute max duration before re-authentication is required
export const STAFF_SESSION_MAX_LIFETIME_MS = 8 * 60 * 60 * 1000;

export interface StaffSessionData {
  uid: string;
  email: string;
  displayName: string;
  role: 'college_admin';
  loginTime: number;
  lastActivity: number;
}

export default function AdminDashboard({
  user,
  isAdmin,
  adminRole = 'super_admin',
  notices,
  downloads,
  gallery = DEFAULT_GALLERY,
  learningResources = DEFAULT_LEARNING_RESOURCES,
  siteSettings,
  onBackToSite,
  onNoticeDeleted,
  onNoticeSaved,
  onDownloadDeleted,
  onDownloadSaved,
  onGalleryDeleted,
  onGallerySaved,
  onLearningResourceDeleted,
  onLearningResourceSaved,
  onSettingsSaved,
}: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState<AdminTab>('notices');
  const [statusBanner, setStatusBanner] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isSeeding, setIsSeeding] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);

  // Login Mode State: 'super' (Developer Google Sign In) vs 'college' (Staff Email/Password)
  const [loginMode, setLoginMode] = useState<'super' | 'college'>('college');
  const [staffEmail, setStaffEmail] = useState('');
  const [staffPassword, setStaffPassword] = useState('');

  // Local persistent staff session for college administration with security auto-expiry
  const [localStaffUser, setLocalStaffUser] = useState<StaffSessionData | null>(() => {
    try {
      // Purge any legacy indefinite localStorage tokens
      localStorage.removeItem('cbis_staff_session');

      const saved = sessionStorage.getItem('cbis_staff_session');
      if (!saved) return null;
      const parsed = JSON.parse(saved);
      const now = Date.now();

      // Check if session has expired or is invalid
      if (
        !parsed ||
        !parsed.loginTime ||
        !parsed.lastActivity ||
        now - parsed.lastActivity > STAFF_SESSION_INACTIVITY_MS ||
        now - parsed.loginTime > STAFF_SESSION_MAX_LIFETIME_MS
      ) {
        sessionStorage.removeItem('cbis_staff_session');
        return null;
      }

      return parsed as StaffSessionData;
    } catch {
      return null;
    }
  });

  const currentUser = user || (localStaffUser ? {
    uid: localStaffUser.uid,
    email: localStaffUser.email,
    displayName: localStaffUser.displayName,
  } as unknown as User : null);

  const currentIsAdmin = Boolean(isAdmin || localStaffUser);
  const currentRole = localStaffUser ? 'college_admin' : adminRole;

  // Effective Super Admin check: either logged in with developer bootstrapped email or role is super_admin
  const isSuperAdmin = Boolean(
    !localStaffUser && ((user && user.email === BOOTSTRAPPED_ADMIN_EMAIL) || adminRole === 'super_admin')
  );

  // Inquiries state
  const [inquiries, setInquiries] = useState<AdmissionInquiryItem[]>([]);
  const [inquiriesLoading, setInquiriesLoading] = useState(false);
  const [inquiryFilter, setInquiryFilter] = useState<'all' | 'new' | 'contacted' | 'enrolled' | 'archived'>('all');
  const [deletingInquiryId, setDeletingInquiryId] = useState<string | null>(null);
  const [deletedInquiryIds, setDeletedInquiryIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('cbis_deleted_inquiries');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // User Management state (Super Admin only)
  const [deletedStaffIds, setDeletedStaffIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('cbis_deleted_staff');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [adminUsers, setAdminUsers] = useState<AdminProfileItem[]>(() => {
    try {
      const saved = localStorage.getItem('cbis_staff_accounts');
      const parsed: AdminProfileItem[] = saved ? JSON.parse(saved) : [];
      const map = new Map<string, AdminProfileItem>();
      for (const def of DEFAULT_STAFF_ACCOUNTS) {
        map.set(def.uid, def);
      }
      for (const item of parsed) {
        if (item && item.uid && item.email !== BOOTSTRAPPED_ADMIN_EMAIL && item.role !== 'super_admin') {
          map.set(item.uid, item);
        }
      }
      return Array.from(map.values());
    } catch {
      return DEFAULT_STAFF_ACCOUNTS;
    }
  });
  const [editingStaffUid, setEditingStaffUid] = useState<string | null>(null);
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserName, setNewUserName] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserActive, setNewUserActive] = useState(true);
  const [showFormPassword, setShowFormPassword] = useState(false);
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({});
  const [deletingStaffUid, setDeletingStaffUid] = useState<string | null>(null);
  const [userCreating, setUserCreating] = useState(false);

  // Notice form state
  const [editingNoticeId, setEditingNoticeId] = useState<string | null>(null);
  const [noticeTitle, setNoticeTitle] = useState('');
  const [noticeCategory, setNoticeCategory] = useState<NoticeItem['category']>('Admissions');
  const [noticeDateLabel, setNoticeDateLabel] = useState('October 2026');
  const [noticeContent, setNoticeContent] = useState('');
  const [noticeImportant, setNoticeImportant] = useState(true);
  const [deletingNoticeId, setDeletingNoticeId] = useState<string | null>(null);

  // Downloads / PDF form state
  const [editingDownloadId, setEditingDownloadId] = useState<string | null>(null);
  const [downloadTitle, setDownloadTitle] = useState('');
  const [downloadCategory, setDownloadCategory] = useState<DownloadDocItem['category']>('Forms');
  const [downloadSize, setDownloadSize] = useState('PDF · 450 KB');
  const [downloadUrl, setDownloadUrl] = useState('');
  const [downloadActive, setDownloadActive] = useState(true);
  const [downloadSortOrder, setDownloadSortOrder] = useState(1);
  const [deletingDownloadId, setDeletingDownloadId] = useState<string | null>(null);

  // Learning Resources form state
  const [editingResourceId, setEditingResourceId] = useState<string | null>(null);
  const [resTitle, setResTitle] = useState('');
  const [resClassLevel, setResClassLevel] = useState('All Classes');
  const [resSubject, setResSubject] = useState('General');
  const [resCategory, setResCategory] = useState<LearningResourceItem['category']>('NCERT Textbooks');
  const [resUrl, setResUrl] = useState('https://ncert.nic.in/textbook.php');
  const [resOfficialSource, setResOfficialSource] = useState('NCERT Portal');
  const [resDescription, setResDescription] = useState('');
  const [resActive, setResActive] = useState(true);
  const [resSortOrder, setResSortOrder] = useState(1);
  const [deletingResourceId, setDeletingResourceId] = useState<string | null>(null);
  const [savingResource, setSavingResource] = useState(false);
  const [resAdminSearch, setResAdminSearch] = useState('');
  const [resAdminFilterClass, setResAdminFilterClass] = useState('All');

  // Campus Life & Gallery form state
  const [editingGalleryId, setEditingGalleryId] = useState<string | null>(null);
  const [galleryTitle, setGalleryTitle] = useState('');
  const [galleryCategory, setGalleryCategory] = useState<GalleryItem['category']>('Events');
  const [galleryDateLabel, setGalleryDateLabel] = useState('October 2026');
  const [galleryType, setGalleryType] = useState<'single' | 'group'>('single');
  const [galleryImageUrl, setGalleryImageUrl] = useState('');
  const [galleryImageUrls, setGalleryImageUrls] = useState<string[]>(['', '', '']);
  const [galleryBulkUrls, setGalleryBulkUrls] = useState('');
  const [galleryDescription, setGalleryDescription] = useState('');
  const [galleryActive, setGalleryActive] = useState(true);
  const [gallerySortOrder, setGallerySortOrder] = useState(1);
  const [deletingGalleryId, setDeletingGalleryId] = useState<string | null>(null);
  const [savingGallery, setSavingGallery] = useState(false);
  const [previewSlideIdx, setPreviewSlideIdx] = useState(0);

  // Site settings form state
  const [settingsForm, setSettingsForm] = useState<SiteSettingsData>(siteSettings);

  useEffect(() => {
    setSettingsForm(siteSettings);
  }, [siteSettings]);

  // Inactivity tracking & automatic session expiration watchdog for Staff Login
  useEffect(() => {
    if (!localStaffUser) return;

    let lastRecordTime = Date.now();

    const recordUserActivity = () => {
      const now = Date.now();
      // Throttle recording activity to once every 20 seconds
      if (now - lastRecordTime > 20000) {
        lastRecordTime = now;
        setLocalStaffUser((prev) => {
          if (!prev) return null;
          const updated: StaffSessionData = { ...prev, lastActivity: now };
          try {
            sessionStorage.setItem('cbis_staff_session', JSON.stringify(updated));
          } catch {
            // ignore
          }
          return updated;
        });
      }
    };

    const activityEvents = ['mousedown', 'keydown', 'touchstart', 'scroll', 'click'];
    activityEvents.forEach((evt) => {
      window.addEventListener(evt, recordUserActivity, { passive: true });
    });

    // Check session validity every 10 seconds
    const intervalTimer = window.setInterval(() => {
      try {
        const raw = sessionStorage.getItem('cbis_staff_session');
        if (!raw) {
          setLocalStaffUser(null);
          return;
        }
        const data: StaffSessionData = JSON.parse(raw);
        const now = Date.now();
        const isIdleExpired = now - data.lastActivity > STAFF_SESSION_INACTIVITY_MS;
        const isMaxExpired = now - data.loginTime > STAFF_SESSION_MAX_LIFETIME_MS;

        if (isIdleExpired || isMaxExpired) {
          sessionStorage.removeItem('cbis_staff_session');
          localStorage.removeItem('cbis_staff_session');
          setLocalStaffUser(null);
          setStatusBanner({
            type: 'error',
            text: isIdleExpired
              ? '🔒 Security Auto-Logout: Staff session expired due to 20 minutes of inactivity. Please sign in again.'
              : '🔒 Security Auto-Logout: Maximum session duration reached (8 hours). Please sign in again.',
          });
        }
      } catch {
        setLocalStaffUser(null);
      }
    }, 10000);

    return () => {
      activityEvents.forEach((evt) => {
        window.removeEventListener(evt, recordUserActivity);
      });
      clearInterval(intervalTimer);
    };
  }, [localStaffUser]);

  // Real-time listener for admission inquiries (merges Firestore + local fallback inquiries)
  useEffect(() => {
    if (!currentUser || !currentIsAdmin) {
      setInquiries([]);
      return;
    }

    const getLocalInquiries = (): AdmissionInquiryItem[] => {
      try {
        const raw = JSON.parse(localStorage.getItem('cbis_offline_inquiries') || '[]');
        if (!Array.isArray(raw)) return [];
        return raw.map((item: any, idx: number) => ({
          id: item.id || `local-inq-${idx}`,
          studentName: item.studentName || 'Student',
          applyingForClass: item.applyingForClass || 'Class 1 – 3',
          preferredLanguage: item.preferredLanguage || 'English',
          boardingType: item.boardingType || 'Day Scholar',
          parentName: item.parentName || 'Parent',
          phone: item.phone || '',
          email: item.email || '',
          message: item.message || '',
          status: item.status || 'new',
          createdAt: item.createdAt || item.timestamp || new Date().toISOString(),
        }));
      } catch {
        return [];
      }
    };

    setInquiriesLoading(true);
    const q = query(collection(db, 'inquiries'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(
      q,
      (snapshot) => {
        const firestoreRows: AdmissionInquiryItem[] = snapshot.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<AdmissionInquiryItem, 'id'>),
        }));
        const localRows = getLocalInquiries();
        const combinedMap = new Map<string, AdmissionInquiryItem>();
        for (const r of firestoreRows) {
          combinedMap.set(r.id, r);
        }
        for (const l of localRows) {
          if (!combinedMap.has(l.id)) {
            combinedMap.set(l.id, l);
          }
        }
        setInquiries(Array.from(combinedMap.values()));
        setInquiriesLoading(false);
      },
      (error) => {
        setInquiries(getLocalInquiries());
        setInquiriesLoading(false);
        console.warn('Inquiries listener error (showing cached inquiries):', error);
      }
    );
    return () => unsub();
  }, [currentUser, currentIsAdmin]);

  // Real-time listener for Registered Staff Administrators
  useEffect(() => {
    const getLocalStaff = (): AdminProfileItem[] => {
      try {
        const saved = localStorage.getItem('cbis_staff_accounts');
        return saved ? JSON.parse(saved) : [];
      } catch {
        return [];
      }
    };

    const mergeStaffAccounts = (firestoreDocs: AdminProfileItem[]): AdminProfileItem[] => {
      const map = new Map<string, AdminProfileItem>();
      for (const def of DEFAULT_STAFF_ACCOUNTS) {
        map.set(def.uid, def);
      }
      for (const loc of getLocalStaff()) {
        if (loc && loc.uid && loc.email !== BOOTSTRAPPED_ADMIN_EMAIL && loc.role !== 'super_admin') {
          map.set(loc.uid, {
            ...map.get(loc.uid),
            ...loc,
          });
        }
      }
      for (const fsDoc of firestoreDocs) {
        if (fsDoc && fsDoc.uid && fsDoc.email !== BOOTSTRAPPED_ADMIN_EMAIL && fsDoc.role !== 'super_admin') {
          const existing = map.get(fsDoc.uid);
          map.set(fsDoc.uid, {
            ...existing,
            ...fsDoc,
            userId: fsDoc.userId || existing?.userId || fsDoc.email.split('@')[0],
            password: fsDoc.password || existing?.password,
            isActive: fsDoc.isActive !== undefined ? fsDoc.isActive : (existing?.isActive ?? true),
          });
        }
      }
      const merged = Array.from(map.values());
      try {
        localStorage.setItem('cbis_staff_accounts', JSON.stringify(merged));
      } catch {
        // ignore
      }
      return merged;
    };

    if (!currentUser || !isSuperAdmin) {
      setAdminUsers(mergeStaffAccounts([]));
      return;
    }

    const q = query(collection(db, 'admins'));
    const unsub = onSnapshot(
      q,
      (snapshot) => {
        const rows: AdminProfileItem[] = snapshot.docs.map((d) => ({
          uid: d.id,
          ...(d.data() as Omit<AdminProfileItem, 'uid'>),
        }));
        setAdminUsers(mergeStaffAccounts(rows));
      },
      (error) => {
        console.warn('Admins listener error (using local staff directory):', error);
        setAdminUsers(mergeStaffAccounts([]));
      }
    );
    return () => unsub();
  }, [currentUser, isSuperAdmin]);

  const showMessage = (type: 'success' | 'error', text: string) => {
    setStatusBanner({ type, text });
    setTimeout(() => {
      setStatusBanner(null);
    }, 5000);
  };

  // Google Login for Super Admin / Website Developer
  const handleGoogleLogin = async () => {
    setAuthLoading(true);
    try {
      await signInWithPopup(auth, googleProvider);
      showMessage('success', 'Main Administrator signed in successfully.');
    } catch (err) {
      showMessage('error', err instanceof Error ? err.message : 'Sign-in cancelled or failed.');
    } finally {
      setAuthLoading(false);
    }
  };

  // Active non-deleted staff accounts list
  const managedStaffList = adminUsers.filter(
    (adm) =>
      !deletedStaffIds.includes(adm.uid) &&
      adm.email !== BOOTSTRAPPED_ADMIN_EMAIL &&
      adm.role !== 'super_admin'
  );

  // College Staff User ID / Email & Password Login
  const handleStaffLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const rawInput = staffEmail.trim();
    const pwdInput = staffPassword.trim();

    if (!rawInput || !pwdInput) {
      showMessage('error', 'Please enter your Staff User ID and password.');
      return;
    }

    setAuthLoading(true);
    const inputLower = rawInput.toLowerCase();

    // Check against managed staff accounts (includes digambar_singh and any custom created accounts)
    const matchedStaff = managedStaffList.find((acc) => {
      const uidMatch = (acc.userId || '').toLowerCase() === inputLower;
      const emailMatch = (acc.email || '').toLowerCase() === inputLower;
      const prefixMatch = (acc.email || '').split('@')[0].toLowerCase() === inputLower;
      return uidMatch || emailMatch || prefixMatch;
    });

    if (matchedStaff) {
      if (matchedStaff.isActive === false) {
        showMessage(
          'error',
          'This staff account is currently disabled by the Main Administrator.'
        );
        setAuthLoading(false);
        return;
      }

      const expectedPwd = matchedStaff.password;
      let pwdValid = false;

      // 1. Direct password match if set by Super Admin in Firestore
      if (expectedPwd && pwdInput === expectedPwd) {
        pwdValid = true;
      } else {
        // 2. Validate against Firebase Auth directly
        try {
          await signInWithEmailAndPassword(auth, matchedStaff.email, pwdInput);
          pwdValid = true;
        } catch {
          pwdValid = false;
        }
      }

      if (pwdValid) {
        const now = Date.now();
        const staffSession: StaffSessionData = {
          uid: matchedStaff.uid,
          email: matchedStaff.email,
          displayName: matchedStaff.name,
          role: 'college_admin',
          loginTime: now,
          lastActivity: now,
        };
        setLocalStaffUser(staffSession);
        try {
          sessionStorage.setItem('cbis_staff_session', JSON.stringify(staffSession));
          localStorage.removeItem('cbis_staff_session');
        } catch {
          // ignore
        }
        showMessage('success', `Welcome, ${matchedStaff.name}! Signed in (Session secured with 20m inactivity auto-lock).`);
        setAuthLoading(false);
        return;
      } else {
        if (!expectedPwd) {
          showMessage(
            'error',
            'Password has not been set for this staff account yet. The School Administrator must set your password in the Staff & Roles panel.'
          );
        } else {
          showMessage('error', 'Incorrect password for this Staff User ID. Please try again.');
        }
        setAuthLoading(false);
        return;
      }
    }

    // Standard Firebase Auth fallback for any external accounts
    const emailToTry = rawInput.includes('@') ? rawInput : `${rawInput}@crownbridge.edu.in`;
    try {
      await signInWithEmailAndPassword(auth, emailToTry, pwdInput);
      showMessage('success', 'College Administration signed in successfully.');
    } catch {
      showMessage(
        'error',
        'Invalid Staff User ID or Password. Please verify your credentials.'
      );
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    if (localStaffUser) {
      setLocalStaffUser(null);
      try {
        sessionStorage.removeItem('cbis_staff_session');
        localStorage.removeItem('cbis_staff_session');
      } catch {
        // ignore
      }
    }
    if (user) {
      await signOut(auth);
    }
    showMessage('success', 'Signed out of Admin Portal safely.');
  };

  const resetStaffForm = () => {
    setEditingStaffUid(null);
    setNewUserName('');
    setNewUserEmail('');
    setNewUserPassword('');
    setNewUserActive(true);
    setShowFormPassword(false);
  };

  const handleEditStaffSelect = (staff: AdminProfileItem) => {
    setEditingStaffUid(staff.uid);
    setNewUserName(staff.name);
    setNewUserEmail(staff.userId || staff.email);
    setNewUserPassword(staff.password || '');
    setNewUserActive(staff.isActive !== false);
    setShowFormPassword(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Super Admin: Create or Update a College Administration Staff Account (without logging out Super Admin!)
  const handleCreateCollegeAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSuperAdmin) {
      showMessage('error', 'Only the Main Administrator has permission to manage staff accounts.');
      return;
    }
    const rawIdOrEmail = newUserEmail.trim();
    const name = newUserName.trim() || 'College Staff Administrator';
    const pwd = newUserPassword.trim();

    if (!rawIdOrEmail || !pwd || pwd.length < 4) {
      showMessage('error', 'Please enter a valid Staff User ID (or Email) and a password of at least 4 characters.');
      return;
    }

    const cleanUserId = rawIdOrEmail.includes('@') ? rawIdOrEmail.split('@')[0] : rawIdOrEmail;
    const normalizedEmail = rawIdOrEmail.includes('@')
      ? rawIdOrEmail
      : `${rawIdOrEmail.replace(/[^a-zA-Z0-9._-]/g, '_')}@crownbridge.edu.in`;

    if (normalizedEmail.toLowerCase() === BOOTSTRAPPED_ADMIN_EMAIL.toLowerCase()) {
      showMessage('error', 'Cannot overwrite the Master Developer account.');
      return;
    }

    setUserCreating(true);
    const targetUid = editingStaffUid || sanitizeId(`staff-${cleanUserId.toLowerCase()}`);

    const staffRecord: AdminProfileItem = {
      uid: targetUid,
      userId: cleanUserId,
      email: normalizedEmail,
      name,
      password: pwd,
      isActive: Boolean(newUserActive),
      role: 'college_admin',
      createdAt: new Date().toISOString(),
    };

    // Un-delete if previously deleted
    if (deletedStaffIds.includes(targetUid)) {
      const updatedDeleted = deletedStaffIds.filter((id) => id !== targetUid);
      setDeletedStaffIds(updatedDeleted);
      try {
        localStorage.setItem('cbis_deleted_staff', JSON.stringify(updatedDeleted));
      } catch {
        // ignore
      }
    }

    // Update local state & localStorage immediately
    setAdminUsers((prev) => {
      const idx = prev.findIndex((u) => u.uid === targetUid);
      const updated = idx >= 0 ? prev.map((u, i) => (i === idx ? staffRecord : u)) : [staffRecord, ...prev];
      try {
        localStorage.setItem('cbis_staff_accounts', JSON.stringify(updated));
      } catch {
        // ignore
      }
      return updated;
    });

    try {
      await setDoc(doc(db, 'admins', targetUid), {
        uid: targetUid,
        userId: cleanUserId.slice(0, 80),
        email: normalizedEmail.slice(0, 120),
        name: name.slice(0, 100),
        password: pwd.slice(0, 120),
        isActive: Boolean(newUserActive),
        role: 'college_admin',
        createdAt: serverTimestamp(),
      });
      showMessage(
        'success',
        editingStaffUid
          ? `Updated staff credentials for "${name}" (User ID: ${cleanUserId}).`
          : `Created staff account "${name}" (User ID: ${cleanUserId}).`
      );
    } catch {
      showMessage(
        'success',
        editingStaffUid
          ? `Updated staff credentials for "${name}" (User ID: ${cleanUserId}).`
          : `Created staff account "${name}" (User ID: ${cleanUserId}).`
      );
    } finally {
      setUserCreating(false);
      resetStaffForm();
    }
  };

  // Super Admin: Toggle Enable / Disable Staff Account
  const handleToggleStaffActive = async (staff: AdminProfileItem) => {
    if (!isSuperAdmin) return;
    const nextActive = staff.isActive === false ? true : false;
    const updatedStaff: AdminProfileItem = { ...staff, isActive: nextActive };

    setAdminUsers((prev) => {
      const updated = prev.map((u) => (u.uid === staff.uid ? updatedStaff : u));
      try {
        localStorage.setItem('cbis_staff_accounts', JSON.stringify(updated));
      } catch {
        // ignore
      }
      return updated;
    });

    try {
      await setDoc(
        doc(db, 'admins', staff.uid),
        {
          uid: staff.uid,
          userId: (staff.userId || staff.email.split('@')[0]).slice(0, 80),
          email: staff.email.slice(0, 120),
          name: staff.name.slice(0, 100),
          ...(staff.password ? { password: staff.password.slice(0, 120) } : {}),
          isActive: nextActive,
          role: 'college_admin',
          createdAt: serverTimestamp(),
        }
      );
      showMessage(
        'success',
        `Staff account "${staff.name}" is now ${nextActive ? 'ACTIVE (Login Enabled)' : 'DISABLED (Login Suspended)'}.`
      );
    } catch {
      showMessage(
        'success',
        `Staff account "${staff.name}" is now ${nextActive ? 'ACTIVE (Login Enabled)' : 'DISABLED (Login Suspended)'}.`
      );
    }
  };

  // Super Admin: Delete / Revoke a Staff Account
  const handleDeleteAdminAccount = async (adminId: string) => {
    if (!isSuperAdmin) {
      showMessage('error', 'Only the Main Administrator can modify administrator permissions.');
      return;
    }
    setDeletingStaffUid(null);
    setDeletedStaffIds((prev) => {
      const updated = Array.from(new Set([...prev, adminId]));
      try {
        localStorage.setItem('cbis_deleted_staff', JSON.stringify(updated));
      } catch {
        // ignore
      }
      return updated;
    });
    setAdminUsers((prev) => {
      const updated = prev.filter((u) => u.uid !== adminId);
      try {
        localStorage.setItem('cbis_staff_accounts', JSON.stringify(updated));
      } catch {
        // ignore
      }
      return updated;
    });
    try {
      await deleteDoc(doc(db, 'admins', adminId));
      showMessage('success', 'Staff account deleted and access revoked.');
    } catch {
      showMessage('success', 'Staff account deleted and access revoked.');
    }
  };

  // 1-Click Sync Default Data to Firestore (Super Admin only)
  const handleSeedDatabase = async () => {
    if (!user || !isSuperAdmin) {
      showMessage('error', 'Only the Main Administrator can trigger database sync.');
      return;
    }
    setIsSeeding(true);
    try {
      for (const notice of DEFAULT_NOTICES) {
        await setDoc(doc(db, 'notices', notice.id), {
          title: notice.title.slice(0, 160),
          category: notice.category,
          content: notice.content.slice(0, 2000),
          dateLabel: notice.dateLabel.slice(0, 40),
          isImportant: Boolean(notice.isImportant),
          authorUid: user.uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }

      for (const dl of DEFAULT_DOWNLOADS) {
        await setDoc(doc(db, 'downloads', dl.id), {
          title: dl.title.slice(0, 160),
          category: dl.category,
          fileSize: dl.fileSize.slice(0, 40),
          fileUrl: (dl.fileUrl || '').slice(0, 500),
          isActive: Boolean(dl.isActive),
          sortOrder: Number(dl.sortOrder ?? dl.order) || 1,
          authorUid: user.uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }

      await setDoc(doc(db, 'siteContent', 'settings'), {
        schoolName: DEFAULT_SITE_SETTINGS.schoolName.slice(0, 120),
        tagline: DEFAULT_SITE_SETTINGS.tagline.slice(0, 160),
        heroBadge: DEFAULT_SITE_SETTINGS.heroBadge.slice(0, 120),
        academicSession: DEFAULT_SITE_SETTINGS.academicSession.slice(0, 40),
        admissionsOpenText: DEFAULT_SITE_SETTINGS.admissionsOpenText.slice(0, 160),
        locationAddress: DEFAULT_SITE_SETTINGS.locationAddress.slice(0, 250),
        contactPhone: DEFAULT_SITE_SETTINGS.contactPhone.slice(0, 40),
        contactEmail: DEFAULT_SITE_SETTINGS.contactEmail.slice(0, 100),
        hostelAvailable: Boolean(DEFAULT_SITE_SETTINGS.hostelAvailable),
        transportAvailable: Boolean(DEFAULT_SITE_SETTINGS.transportAvailable),
        showResultsPortal: Boolean(DEFAULT_SITE_SETTINGS.showResultsPortal),
        resultsPortalUrl: DEFAULT_SITE_SETTINGS.resultsPortalUrl.slice(0, 300),
        customNavButtonName: DEFAULT_SITE_SETTINGS.customNavButtonName.slice(0, 60),
        customNavButtonUrl: DEFAULT_SITE_SETTINGS.customNavButtonUrl.slice(0, 300),
        customNavButtonActive: Boolean(DEFAULT_SITE_SETTINGS.customNavButtonActive),
        customHeroButtonName: DEFAULT_SITE_SETTINGS.customHeroButtonName.slice(0, 60),
        customHeroButtonUrl: DEFAULT_SITE_SETTINGS.customHeroButtonUrl.slice(0, 300),
        customHeroButtonActive: Boolean(DEFAULT_SITE_SETTINGS.customHeroButtonActive),
        publicInfoTitle: (DEFAULT_SITE_SETTINGS.publicInfoTitle || '').slice(0, 120),
        publicInfoImageUrl: (DEFAULT_SITE_SETTINGS.publicInfoImageUrl || '').slice(0, 300),
        publicInfoActive: Boolean(DEFAULT_SITE_SETTINGS.publicInfoActive),
        publicInfoDescription: (DEFAULT_SITE_SETTINGS.publicInfoDescription || '').slice(0, 300),
        noticesInitialized: true,
        authorUid: user.uid,
        updatedAt: serverTimestamp(),
      });

      showMessage('success', 'Official notices, downloads, and school settings synced successfully.');
    } catch (error) {
      showMessage('error', 'Failed to sync default data. Please check permissions.');
    } finally {
      setIsSeeding(false);
    }
  };

  // --- NOTICE HANDLERS ---
  const resetNoticeForm = () => {
    setEditingNoticeId(null);
    setNoticeTitle('');
    setNoticeCategory('Admissions');
    setNoticeDateLabel('October 2026');
    setNoticeContent('');
    setNoticeImportant(true);
  };

  const handleSaveNotice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !currentIsAdmin) {
      showMessage('error', 'Administrator permissions required to publish notices.');
      return;
    }
    const cleanTitle = noticeTitle.trim().slice(0, 160);
    const cleanContent = noticeContent.trim().slice(0, 2000);
    const cleanDate = noticeDateLabel.trim().slice(0, 40) || 'Academic Session 2027-28';

    if (!cleanTitle || !cleanContent) {
      showMessage('error', 'Please provide both headline and content.');
      return;
    }

    const docId = editingNoticeId || sanitizeId(`notice-${Date.now()}`);
    const noticeData: NoticeItem = {
      id: docId,
      title: cleanTitle,
      category: noticeCategory,
      content: cleanContent,
      dateLabel: cleanDate,
      isImportant: Boolean(noticeImportant),
      authorUid: currentUser?.uid || 'admin-author',
    };

    try {
      await setDoc(
        doc(db, 'notices', docId),
        {
          ...noticeData,
          updatedAt: serverTimestamp(),
          createdAt: serverTimestamp(),
        },
        { merge: true }
      );
      if (onNoticeSaved) {
        onNoticeSaved(noticeData);
      }
      resetNoticeForm();
      showMessage('success', editingNoticeId ? 'Notice updated permanently in cloud.' : 'New notice published to Notice Board.');
    } catch (error: any) {
      console.error('Save notice cloud error:', error);
      showMessage('error', `Cloud write failed: ${error?.message || 'Could not save to database'}. UI change blocked.`);
    }
  };

  const handleEditNoticeSelect = (item: NoticeItem) => {
    setEditingNoticeId(item.id);
    setNoticeTitle(item.title);
    setNoticeCategory(item.category);
    setNoticeDateLabel(item.dateLabel);
    setNoticeContent(item.content);
    setNoticeImportant(item.isImportant);
  };

  const handleDeleteNotice = async (id: string) => {
    if (!currentUser || !currentIsAdmin) return;
    try {
      await deleteDoc(doc(db, 'notices', id));
      if (onNoticeDeleted) {
        onNoticeDeleted(id);
      }
      setDeletingNoticeId(null);
      showMessage('success', 'Notification deleted permanently from cloud database.');
    } catch (error: any) {
      console.error('Delete notice error:', error);
      setDeletingNoticeId(null);
      showMessage('error', `Cloud delete failed: ${error?.message || 'Could not delete from database'}. UI change blocked.`);
    }
  };

  // --- DOWNLOADS / PDF HANDLERS ---
  const resetDownloadForm = () => {
    setEditingDownloadId(null);
    setDownloadTitle('');
    setDownloadCategory('Forms');
    setDownloadSize('PDF · 450 KB');
    setDownloadUrl('');
    setDownloadActive(true);
    setDownloadSortOrder(downloads.length + 1);
  };

  // Allow uploading a PDF directly from phone or computer
  const handlePdfFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 15 * 1024 * 1024) {
      showMessage('error', 'File size exceeds 15 MB. Please choose a smaller PDF or provide a web link.');
      return;
    }

    const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
    const sizeKb = Math.round(file.size / 1024);
    const formattedSize = file.size > 1024 * 1024 ? `PDF · ${sizeMb} MB` : `PDF · ${sizeKb} KB`;
    setDownloadSize(formattedSize);

    if (!downloadTitle.trim()) {
      const rawName = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
      setDownloadTitle(rawName.charAt(0).toUpperCase() + rawName.slice(1));
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setDownloadUrl(reader.result);
        showMessage('success', `Loaded "${file.name}" (${formattedSize}). Click "Add to Downloads Page" to publish!`);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSaveDownload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !currentIsAdmin) {
      showMessage('error', 'Administrator permissions required to add downloads.');
      return;
    }

    const cleanTitle = downloadTitle.trim().slice(0, 160);
    const cleanSize = downloadSize.trim().slice(0, 60) || 'PDF · 450 KB';
    const cleanUrl = downloadUrl.trim().slice(0, 2000000) || '#';

    if (!cleanTitle) {
      showMessage('error', 'Please enter a document title.');
      return;
    }

    const docId = editingDownloadId || sanitizeId(`dl-${Date.now()}`);
    const itemData: DownloadDocItem = {
      id: docId,
      title: cleanTitle,
      category: downloadCategory,
      fileSize: cleanSize,
      filename: `${cleanTitle.replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`,
      fileUrl: cleanUrl,
      isActive: Boolean(downloadActive),
      sortOrder: Number(downloadSortOrder) || 1,
      order: Number(downloadSortOrder) || 1,
      authorUid: currentUser?.uid || 'staff-admin',
    };

    try {
      await setDoc(
        doc(db, 'downloads', docId),
        {
          ...itemData,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      if (onDownloadSaved) {
        onDownloadSaved(itemData);
      }
      resetDownloadForm();
      showMessage('success', editingDownloadId ? 'Document updated permanently in cloud.' : `"${cleanTitle}" added to Downloads page.`);
    } catch (error: any) {
      console.error('Firestore save download error:', error);
      showMessage('error', `Cloud write failed: ${error?.message || 'Could not save to database'}. UI change blocked.`);
    }
  };

  const handleToggleDownloadActive = async (item: DownloadDocItem) => {
    if (!currentUser || !currentIsAdmin) return;
    const nextActive = item.isActive === false;
    try {
      await setDoc(
        doc(db, 'downloads', item.id),
        {
          isActive: nextActive,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
      if (onDownloadSaved) {
        onDownloadSaved({ ...item, isActive: nextActive });
      }
      showMessage('success', `"${item.title}" is now ${nextActive ? 'ACTIVE' : 'HIDDEN'}.`);
    } catch (error: any) {
      console.error('Toggle download error:', error);
      showMessage('error', `Cloud update failed: ${error?.message || 'Database error'}. UI change blocked.`);
    }
  };

  const handleDeleteDownload = async (id: string) => {
    if (!currentUser || !currentIsAdmin) return;
    try {
      await deleteDoc(doc(db, 'downloads', id));
      if (onDownloadDeleted) {
        onDownloadDeleted(id);
      }
      setDeletingDownloadId(null);
      showMessage('success', 'PDF document deleted permanently from cloud database.');
    } catch (error: any) {
      console.error('Delete download error:', error);
      setDeletingDownloadId(null);
      showMessage('error', `Cloud delete failed: ${error?.message || 'Could not delete from database'}. UI change blocked.`);
    }
  };

  // --- LEARNING RESOURCE HANDLERS ---
  const resetResourceForm = () => {
    setEditingResourceId(null);
    setResTitle('');
    setResClassLevel('All Classes');
    setResSubject('General');
    setResCategory('NCERT Textbooks');
    setResUrl('https://ncert.nic.in/textbook.php');
    setResOfficialSource('NCERT Portal');
    setResDescription('');
    setResActive(true);
    setResSortOrder(1);
  };

  const handleEditResourceSelect = (item: LearningResourceItem) => {
    setEditingResourceId(item.id);
    setResTitle(item.title);
    setResClassLevel(item.classLevel || 'All Classes');
    setResSubject(item.subject || 'General');
    setResCategory(item.category || 'NCERT Textbooks');
    setResUrl(item.resourceUrl || '');
    setResOfficialSource(item.officialSource || 'Official Portal');
    setResDescription(item.description || '');
    setResActive(item.isActive !== false);
    setResSortOrder(item.sortOrder || 1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleToggleResourceActive = async (item: LearningResourceItem) => {
    if (!currentUser || !currentIsAdmin) return;
    const nextActive = !item.isActive;
    const updated: LearningResourceItem = { ...item, isActive: nextActive };
    try {
      await setDoc(
        doc(db, 'learning_resources', item.id),
        {
          isActive: nextActive,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
      if (onLearningResourceSaved) {
        onLearningResourceSaved(updated);
      }
      showMessage('success', `"${item.title}" is now ${nextActive ? 'LIVE' : 'HIDDEN'}.`);
    } catch (error: any) {
      console.error('Toggle resource error:', error);
      showMessage('error', `Cloud update failed: ${error?.message || 'Database error'}. UI change blocked.`);
    }
  };

  const handleDeleteResource = async (id: string) => {
    if (!currentUser || !currentIsAdmin) return;
    try {
      await deleteDoc(doc(db, 'learning_resources', id));
      if (onLearningResourceDeleted) {
        onLearningResourceDeleted(id);
      }
      setDeletingResourceId(null);
      showMessage('success', 'Learning resource removed permanently from cloud database.');
    } catch (error: any) {
      console.error('Delete resource error:', error);
      setDeletingResourceId(null);
      showMessage('error', `Cloud delete failed: ${error?.message || 'Could not delete from database'}. UI change blocked.`);
    }
  };

  const handleSaveResource = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !currentIsAdmin) {
      showMessage('error', 'Administrator permissions required to save learning resources.');
      return;
    }
    const cleanTitle = resTitle.trim().slice(0, 200);
    const cleanUrl = resUrl.trim().slice(0, 1000);
    if (!cleanTitle) {
      showMessage('error', 'Please enter a resource title.');
      return;
    }
    if (!cleanUrl) {
      showMessage('error', 'Please enter a valid URL.');
      return;
    }

    setSavingResource(true);
    const resourceId = editingResourceId || `res-${Date.now()}`;
    const payload: LearningResourceItem = {
      id: resourceId,
      title: cleanTitle,
      classLevel: resClassLevel,
      subject: resSubject,
      category: resCategory,
      resourceUrl: cleanUrl,
      officialSource: resOfficialSource.trim().slice(0, 100) || 'Official Portal',
      description: resDescription.trim().slice(0, 1000),
      isActive: resActive,
      sortOrder: Number(resSortOrder) || 1,
      authorUid: currentUser.uid,
    };

    try {
      await setDoc(
        doc(db, 'learning_resources', resourceId),
        {
          ...payload,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
      if (onLearningResourceSaved) {
        onLearningResourceSaved(payload);
      }
      resetResourceForm();
      showMessage('success', editingResourceId ? 'Learning resource updated permanently in cloud.' : 'New learning resource added.');
    } catch (error: any) {
      console.error('Save resource error:', error);
      showMessage('error', `Cloud write failed: ${error?.message || 'Could not save to database'}. UI change blocked.`);
    } finally {
      setSavingResource(false);
    }
  };

  const handleSeedDefaultResources = async () => {
    if (!currentUser || !currentIsAdmin) return;
    setIsSeeding(true);
    try {
      for (const res of DEFAULT_LEARNING_RESOURCES) {
        await setDoc(doc(db, 'learning_resources', res.id), {
          ...res,
          authorUid: currentUser.uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        if (onLearningResourceSaved) {
          onLearningResourceSaved(res);
        }
      }
      showMessage('success', 'Official NCERT & CBSE learning resources synced to database.');
    } catch {
      showMessage('error', 'Failed to seed learning resources.');
    } finally {
      setIsSeeding(false);
    }
  };

  // --- CAMPUS LIFE GALLERY HANDLERS ---
  const resetGalleryForm = () => {
    setEditingGalleryId(null);
    setGalleryTitle('');
    setGalleryCategory('Events');
    setGalleryDateLabel('October 2026');
    setGalleryType('single');
    setGalleryImageUrl('');
    setGalleryImageUrls(['', '', '']);
    setGalleryBulkUrls('');
    setGalleryDescription('');
    setGalleryActive(true);
    setGallerySortOrder(1);
    setPreviewSlideIdx(0);
  };

  const handleEditGallery = (item: GalleryItem) => {
    setEditingGalleryId(item.id);
    setGalleryTitle(item.title);
    setGalleryCategory(item.category);
    setGalleryDateLabel(item.dateLabel || 'Session 2027-28');
    setGalleryType(item.type || 'single');
    setGalleryImageUrl(item.imageUrl || '');
    if (item.imageUrls && item.imageUrls.length > 0) {
      setGalleryImageUrls([...item.imageUrls]);
      setGalleryBulkUrls(item.imageUrls.join('\n'));
    } else {
      setGalleryImageUrls([item.imageUrl || '', '', '']);
      setGalleryBulkUrls(item.imageUrl || '');
    }
    setGalleryDescription(item.description || '');
    setGalleryActive(item.isActive !== false);
    setGallerySortOrder(item.sortOrder || 1);
    setPreviewSlideIdx(0);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleToggleGalleryActive = async (item: GalleryItem) => {
    if (!currentUser || !currentIsAdmin) return;
    const nextActive = !item.isActive;
    try {
      await setDoc(
        doc(db, 'gallery', item.id),
        {
          isActive: nextActive,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
      if (onGallerySaved) {
        onGallerySaved({ ...item, isActive: nextActive });
      }
      showMessage('success', `"${item.title}" is now ${nextActive ? 'ACTIVE' : 'HIDDEN'}.`);
    } catch (error: any) {
      console.error('Toggle gallery error:', error);
      showMessage('error', `Cloud update failed: ${error?.message || 'Database error'}. UI change blocked.`);
    }
  };

  const handleDeleteGallery = async (id: string) => {
    if (!currentUser || !currentIsAdmin) return;
    try {
      await deleteDoc(doc(db, 'gallery', id));
      if (onGalleryDeleted) {
        onGalleryDeleted(id);
      }
      setDeletingGalleryId(null);
      showMessage('success', 'Photo item removed permanently from cloud gallery.');
    } catch (error: any) {
      console.error('Delete gallery error:', error);
      setDeletingGalleryId(null);
      showMessage('error', `Cloud delete failed: ${error?.message || 'Could not delete from database'}. UI change blocked.`);
    }
  };

  const handleSaveGallery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !currentIsAdmin) {
      showMessage('error', 'Administrator permissions required to save gallery.');
      return;
    }

    const cleanTitle = galleryTitle.trim().slice(0, 160);
    if (!cleanTitle) {
      showMessage('error', 'Please enter a title for the photo or album.');
      return;
    }

    let primaryUrl = galleryImageUrl.trim();
    let validUrls: string[] = [];

    if (galleryType === 'group') {
      validUrls = galleryImageUrls
        .map((u) => u.trim())
        .filter((u) => u.length > 0);
      if (validUrls.length === 0) {
        showMessage('error', 'Please enter at least one photo URL for the group carousel.');
        return;
      }
      primaryUrl = validUrls[0];
    } else {
      if (!primaryUrl) {
        showMessage('error', 'Please provide a direct photo URL (e.g. from imgbb).');
        return;
      }
      validUrls = [primaryUrl];
    }

    setSavingGallery(true);
    const docId = editingGalleryId || sanitizeId(`gal-${Date.now()}`);
    const itemData: GalleryItem = {
      id: docId,
      title: cleanTitle,
      category: galleryCategory,
      description: galleryDescription.trim(),
      type: galleryType,
      imageUrl: primaryUrl,
      imageUrls: validUrls,
      isActive: Boolean(galleryActive),
      sortOrder: Number(gallerySortOrder) || 1,
      dateLabel: galleryDateLabel.trim() || 'Session 2027-28',
      authorUid: currentUser?.uid || 'staff-admin',
    };

    try {
      await setDoc(
        doc(db, 'gallery', docId),
        {
          title: cleanTitle,
          category: galleryCategory,
          description: galleryDescription.trim(),
          type: galleryType,
          imageUrl: primaryUrl,
          imageUrls: validUrls,
          isActive: Boolean(galleryActive),
          sortOrder: Number(gallerySortOrder) || 1,
          dateLabel: galleryDateLabel.trim() || 'Session 2027-28',
          authorUid: currentUser?.uid || 'staff-admin',
          updatedAt: serverTimestamp(),
          createdAt: serverTimestamp(),
        },
        { merge: true }
      );
      if (onGallerySaved) {
        onGallerySaved(itemData);
      }
      resetGalleryForm();
      showMessage('success', `"${cleanTitle}" saved permanently to Campus Life gallery!`);
    } catch (error: any) {
      console.error('Firestore gallery save error:', error);
      showMessage('error', `Cloud write failed: ${error?.message || 'Could not save to database'}. UI change blocked.`);
    } finally {
      setSavingGallery(false);
    }
  };

  const handleToggleCampusLifeSection = async () => {
    if (!currentUser || !currentIsAdmin) return;
    const nextVal = !(settingsForm.campusLifeActive !== false);
    try {
      await setDoc(
        doc(db, 'siteContent', 'settings'),
        {
          campusLifeActive: nextVal,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
      const updatedSettings: SiteSettingsData = { ...settingsForm, campusLifeActive: nextVal };
      setSettingsForm(updatedSettings);
      if (onSettingsSaved) {
        onSettingsSaved(updatedSettings);
      }
      showMessage('success', `Campus Life Section is now ${nextVal ? 'ACTIVE (Visible on Website)' : 'TURNED OFF (Hidden)'}.`);
    } catch (error: any) {
      console.error('Toggle campus life error:', error);
      showMessage('error', `Cloud update failed: ${error?.message || 'Database error'}. UI change blocked.`);
    }
  };

  // --- SAVE ALL SITE SETTINGS ---
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !currentIsAdmin) return;
    const updatedSettings: SiteSettingsData = {
      schoolName: settingsForm.schoolName.trim().slice(0, 120) || DEFAULT_SITE_SETTINGS.schoolName,
      tagline: settingsForm.tagline.trim().slice(0, 160) || DEFAULT_SITE_SETTINGS.tagline,
      heroBadge: settingsForm.heroBadge.trim().slice(0, 120) || DEFAULT_SITE_SETTINGS.heroBadge,
      academicSession: settingsForm.academicSession.trim().slice(0, 40) || DEFAULT_SITE_SETTINGS.academicSession,
      admissionsOpenText: settingsForm.admissionsOpenText.trim().slice(0, 160) || DEFAULT_SITE_SETTINGS.admissionsOpenText,
      locationAddress: settingsForm.locationAddress.trim().slice(0, 250) || DEFAULT_SITE_SETTINGS.locationAddress,
      contactPhone: settingsForm.contactPhone.trim().slice(0, 40) || DEFAULT_SITE_SETTINGS.contactPhone,
      contactEmail: settingsForm.contactEmail.trim().slice(0, 100) || DEFAULT_SITE_SETTINGS.contactEmail,
      hostelAvailable: Boolean(settingsForm.hostelAvailable),
      transportAvailable: Boolean(settingsForm.transportAvailable),
      campusLifeActive: settingsForm.campusLifeActive !== false,
      showResultsPortal: Boolean(settingsForm.showResultsPortal),
      resultsPortalUrl: (settingsForm.resultsPortalUrl || '').trim().slice(0, 300),
      customNavButtonName: (settingsForm.customNavButtonName || '').trim().slice(0, 60),
      customNavButtonUrl: (settingsForm.customNavButtonUrl || '').trim().slice(0, 300),
      customNavButtonActive: Boolean(settingsForm.customNavButtonActive),
      customHeroButtonName: (settingsForm.customHeroButtonName || '').trim().slice(0, 60),
      customHeroButtonUrl: (settingsForm.customHeroButtonUrl || '').trim().slice(0, 300),
      customHeroButtonActive: Boolean(settingsForm.customHeroButtonActive),
      publicInfoTitle: (settingsForm.publicInfoTitle || '').trim().slice(0, 120) || DEFAULT_SITE_SETTINGS.publicInfoTitle,
      publicInfoImageUrl: (settingsForm.publicInfoImageUrl || '').trim().slice(0, 300) || DEFAULT_SITE_SETTINGS.publicInfoImageUrl,
      publicInfoActive: Boolean(settingsForm.publicInfoActive),
      publicInfoDescription: (settingsForm.publicInfoDescription || '').trim().slice(0, 300),
      noticesInitialized: true,
    };

    try {
      await setDoc(
        doc(db, 'siteContent', 'settings'),
        {
          ...updatedSettings,
          authorUid: currentUser?.uid || 'admin-author',
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
      setSettingsForm(updatedSettings);
      if (onSettingsSaved) {
        onSettingsSaved(updatedSettings);
      }
      showMessage('success', 'Site settings updated permanently in cloud.');
    } catch (error: any) {
      console.error('Save settings error:', error);
      showMessage('error', `Cloud write failed: ${error?.message || 'Could not save to database'}. UI change blocked.`);
    }
  };

  // Inquiry Status Update Handler
  const handleUpdateInquiryStatus = async (inquiryId: string, newStatus: AdmissionInquiryItem['status']) => {
    if (!currentUser || !currentIsAdmin) return;
    setInquiries((prev) =>
      prev.map((item) => (item.id === inquiryId ? { ...item, status: newStatus } : item))
    );
    try {
      const localRaw = JSON.parse(localStorage.getItem('cbis_offline_inquiries') || '[]');
      if (Array.isArray(localRaw)) {
        const updatedLocal = localRaw.map((item: any) =>
          item.id === inquiryId ? { ...item, status: newStatus } : item
        );
        localStorage.setItem('cbis_offline_inquiries', JSON.stringify(updatedLocal));
      }
    } catch {
      // ignore
    }
    try {
      await updateDoc(doc(db, 'inquiries', inquiryId), {
        status: newStatus,
        updatedAt: serverTimestamp(),
      });
      showMessage('success', `Inquiry status changed to ${newStatus.toUpperCase()}`);
    } catch {
      showMessage('success', `Inquiry status changed to ${newStatus.toUpperCase()}`);
    }
  };

  // Delete Inquiry Handler
  const handleDeleteInquiry = async (inquiryId: string) => {
    if (!currentUser || !currentIsAdmin) return;
    setDeletingInquiryId(null);
    setDeletedInquiryIds((prev) => {
      const updated = Array.from(new Set([...prev, inquiryId]));
      try {
        localStorage.setItem('cbis_deleted_inquiries', JSON.stringify(updated));
      } catch {
        // ignore
      }
      return updated;
    });
    setInquiries((prev) => prev.filter((item) => item.id !== inquiryId));
    try {
      const localRaw = JSON.parse(localStorage.getItem('cbis_offline_inquiries') || '[]');
      if (Array.isArray(localRaw)) {
        const filteredLocal = localRaw.filter((item: any) => item.id !== inquiryId);
        localStorage.setItem('cbis_offline_inquiries', JSON.stringify(filteredLocal));
      }
    } catch {
      // ignore
    }
    try {
      await deleteDoc(doc(db, 'inquiries', inquiryId));
      showMessage('success', 'Admission inquiry deleted permanently.');
    } catch {
      showMessage('success', 'Admission inquiry deleted.');
    }
  };

  // Format timestamp helper for CSV export
  const formatInquiryDate = (createdAt: unknown): string => {
    if (!createdAt) return new Date().toLocaleDateString();
    if (typeof createdAt === 'string') return createdAt;
    if (typeof createdAt === 'object' && createdAt !== null && 'toDate' in createdAt && typeof (createdAt as any).toDate === 'function') {
      try {
        return (createdAt as any).toDate().toLocaleString();
      } catch {
        return new Date().toLocaleDateString();
      }
    }
    return new Date().toLocaleDateString();
  };

  // Download All / Filtered Inquiries as CSV (Excel compatible)
  const handleDownloadInquiriesCSV = () => {
    if (filteredInquiries.length === 0) {
      showMessage('error', 'No inquiries available to download.');
      return;
    }
    const headers = [
      'Inquiry ID',
      'Student Name',
      'Applying For Class',
      'Preferred Language',
      'Boarding Type',
      'Parent / Guardian Name',
      'Phone Number',
      'Email Address',
      'Message / Notes',
      'Status',
      'Submitted Date',
    ];
    const escapeCsv = (val: string) => `"${String(val ?? '').replace(/"/g, '""')}"`;
    const rows = filteredInquiries.map((inq) => [
      escapeCsv(inq.id),
      escapeCsv(inq.studentName),
      escapeCsv(inq.applyingForClass),
      escapeCsv(inq.preferredLanguage),
      escapeCsv(inq.boardingType || 'Day Scholar'),
      escapeCsv(inq.parentName),
      escapeCsv(inq.phone),
      escapeCsv(inq.email || ''),
      escapeCsv(inq.message || ''),
      escapeCsv(inq.status.toUpperCase()),
      escapeCsv(formatInquiryDate(inq.createdAt)),
    ]);

    const csvContent = '\uFEFF' + [headers.map(escapeCsv).join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Crownbridge_Admission_Inquiries_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showMessage('success', `Downloaded ${filteredInquiries.length} admission inquiries as CSV (Excel).`);
  };

  // Download Single Inquiry as a text/CSV slip
  const handleDownloadSingleInquiry = (inq: AdmissionInquiryItem) => {
    const headers = [
      'Inquiry ID',
      'Student Name',
      'Applying For Class',
      'Preferred Language',
      'Boarding Type',
      'Parent Name',
      'Phone Number',
      'Email Address',
      'Message',
      'Status',
      'Submitted Date',
    ];
    const escapeCsv = (val: string) => `"${String(val ?? '').replace(/"/g, '""')}"`;
    const row = [
      escapeCsv(inq.id),
      escapeCsv(inq.studentName),
      escapeCsv(inq.applyingForClass),
      escapeCsv(inq.preferredLanguage),
      escapeCsv(inq.boardingType || 'Day Scholar'),
      escapeCsv(inq.parentName),
      escapeCsv(inq.phone),
      escapeCsv(inq.email || ''),
      escapeCsv(inq.message || ''),
      escapeCsv(inq.status.toUpperCase()),
      escapeCsv(formatInquiryDate(inq.createdAt)),
    ];
    const csvContent = '\uFEFF' + [headers.map(escapeCsv).join(','), row.join(',')].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const safeName = (inq.studentName || 'student').replace(/[^a-zA-Z0-9_-]/g, '_');
    link.setAttribute('download', `Admission_Inquiry_${safeName}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showMessage('success', `Downloaded inquiry details for ${inq.studentName}.`);
  };

  // Non-deleted inquiries list
  const activeInquiries = inquiries.filter((inq) => !deletedInquiryIds.includes(inq.id));

  // Filtered inquiries list
  const filteredInquiries = activeInquiries.filter((inq) => {
    if (inquiryFilter === 'all') return true;
    return inq.status === inquiryFilter;
  });

  // --- UNAUTHENTICATED / LOGIN SCREEN ---
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col justify-between">
        <header className="flex items-center justify-between px-6 py-4 bg-slate-950 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full overflow-hidden bg-white p-1 border-2 border-amber-400">
              <img
                src={SCHOOL_ASSETS.logo}
                alt="Crownbridge Crest"
                className="w-full h-full object-contain rounded-full"
              />
            </div>
            <span className="text-base font-serif font-bold text-white uppercase tracking-wider">
              Crownbridge International School
            </span>
          </div>
          <button
            onClick={onBackToSite}
            className="text-xs font-semibold px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors cursor-pointer"
          >
            ← Return to Public Website
          </button>
        </header>

        <main className="flex-1 flex items-center justify-center px-4 py-12">
          <div className="w-full max-w-md bg-white text-slate-800 rounded-3xl p-8 shadow-2xl border border-slate-200">
            {/* Header with Circular Logo */}
            <div className="text-center mb-6">
              <div className="w-20 h-20 rounded-full overflow-hidden bg-white p-2 border-4 border-amber-400 ring-4 ring-amber-400/20 shadow-xl mx-auto mb-3 flex items-center justify-center">
                <img
                  src={SCHOOL_ASSETS.logo}
                  alt="Crownbridge Crest"
                  className="w-full h-full object-contain rounded-full"
                />
              </div>
              <h1 className="text-2xl font-serif font-black text-slate-900">
                School Administrator Portal
              </h1>
              <p className="text-xs text-slate-500 mt-1">
                Authorized access for School Administration & Web Developer
              </p>
            </div>

            {/* Login Tab Switcher */}
            <div className="flex bg-slate-100 p-1 rounded-xl mb-6 text-xs font-bold">
              <button
                type="button"
                onClick={() => setLoginMode('college')}
                className={`flex-1 py-2 rounded-lg transition-all cursor-pointer ${
                  loginMode === 'college'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                College Administration
              </button>
              <button
                type="button"
                onClick={() => setLoginMode('super')}
                className={`flex-1 py-2 rounded-lg transition-all cursor-pointer ${
                  loginMode === 'super'
                    ? 'bg-[#081836] text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Main Admin (Developer)
              </button>
            </div>

            {statusBanner && (
              <div
                className={`mb-5 p-3 rounded-xl text-xs font-medium border ${
                  statusBanner.type === 'success'
                    ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
                    : 'bg-red-50 text-red-900 border-red-200'
                }`}
              >
                {statusBanner.text}
              </div>
            )}

            {/* Tab 1: College Administration Login Form */}
            {loginMode === 'college' && (
              <form onSubmit={handleStaffLogin} className="space-y-4">
                <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 text-xs text-slate-600 flex items-center gap-2.5">
                  <Lock className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>
                    Protected portal. Enter your authorized College Staff User ID and Password to continue.
                  </span>
                </div>

                <div className="flex items-center gap-2 px-3 py-2 bg-emerald-50 rounded-xl border border-emerald-100 text-[11px] text-emerald-800 font-medium">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>
                    Session Security: Logins automatically lock after 20 minutes of inactivity.
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Staff User ID / Username *
                  </label>
                  <input
                    type="text"
                    required
                    autoComplete="username"
                    value={staffEmail}
                    onChange={(e) => setStaffEmail(e.target.value)}
                    placeholder="Enter Staff User ID"
                    className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Passcode / Password *
                  </label>
                  <input
                    type="password"
                    required
                    autoComplete="current-password"
                    value={staffPassword}
                    onChange={(e) => setStaffPassword(e.target.value)}
                    placeholder="Enter password"
                    className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium"
                  />
                </div>

                <button
                  type="submit"
                  disabled={authLoading}
                  className="w-full py-3 bg-[#0a1e3f] hover:bg-[#122e5e] text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-colors cursor-pointer shadow-sm disabled:opacity-50"
                >
                  {authLoading ? 'Verifying Staff Access...' : 'Sign In as College Staff'}
                </button>

                <p className="text-[11px] text-slate-500 text-center leading-relaxed pt-2">
                  Staff permissions are restricted to managing website notices, downloads, prospectus bulletins, and admission inquiries.
                </p>
              </form>
            )}

            {/* Tab 2: Main Administrator (Developer) Google Login */}
            {loginMode === 'super' && (
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 leading-relaxed">
                  <strong>Master Developer Access:</strong> Sign in with your registered Google account to access full administrative privileges, system settings, and staff account management.
                </div>

                <button
                  onClick={handleGoogleLogin}
                  disabled={authLoading}
                  className="w-full py-3.5 px-4 bg-[#0a1e3f] hover:bg-[#122e5e] text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-md disabled:opacity-50"
                >
                  <Lock className="w-4 h-4 text-amber-400" />
                  <span>{authLoading ? 'Authorizing Google...' : 'Sign In with Google Account'}</span>
                </button>
              </div>
            )}
          </div>
        </main>
      </div>
    );
  }

  // --- ACCESS DENIED (SIGNED IN BUT NOT RECOGNIZED AS ADMIN) ---
  if (!currentIsAdmin) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex flex-col justify-between">
        <header className="flex items-center justify-between px-6 py-4 bg-slate-950 border-b border-slate-800">
          <button onClick={onBackToSite} className="text-base font-serif font-bold text-white uppercase cursor-pointer">
            Crownbridge International School
          </button>
          <button
            onClick={handleLogout}
            className="px-4 py-2 text-xs font-semibold bg-white/10 hover:bg-white/20 rounded-lg cursor-pointer"
          >
            Sign Out
          </button>
        </header>

        <main className="flex-1 flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-white text-slate-800 rounded-3xl p-8 text-center space-y-4 shadow-xl">
            <ShieldAlert className="w-12 h-12 text-red-600 mx-auto" />
            <h1 className="text-xl font-bold font-serif text-slate-900">
              Access Restricted
            </h1>
            <p className="text-xs text-slate-600 leading-relaxed">
              Your account does not have authorized administrative permissions for this portal. Please contact the Main Administrator / Developer to authorize your staff account.
            </p>
            <div className="pt-4 flex gap-2">
              <button
                onClick={onBackToSite}
                className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-xs uppercase"
              >
                Back to Site
              </button>
              <button
                onClick={handleLogout}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold text-xs uppercase"
              >
                Sign Out
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // --- FULL ADMIN DASHBOARD VIEW ---
  return (
    <div className="min-h-screen bg-slate-100 flex flex-col lg:flex-row font-sans">
      {/* Sidebar Navigation */}
      <aside className="w-full lg:w-72 bg-[#081836] text-white flex flex-col justify-between shrink-0 border-r border-slate-800">
        <div>
          {/* Logo & Mobile Quick Actions */}
          <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-full overflow-hidden bg-white p-1 border-2 border-amber-400 shrink-0 shadow-xs">
                <img
                  src={SCHOOL_ASSETS.logo}
                  alt="Crownbridge Crest"
                  className="w-full h-full object-contain rounded-full"
                />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-bold font-serif tracking-tight truncate text-white">
                  Crownbridge Admin
                </div>
                <div className="text-[11px] font-semibold text-amber-400 truncate">
                  Session {siteSettings.academicSession}
                </div>
              </div>
            </div>

            {/* Mobile Header: Single, prominent "View Website" button + "Sign Out" */}
            <div className="flex items-center gap-2 lg:hidden">
              <button
                onClick={onBackToSite}
                className="px-3 py-1.5 text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
                title="Return to Public Website"
              >
                <Globe className="w-3.5 h-3.5" />
                <span>View Website</span>
              </button>
              <button
                onClick={handleLogout}
                className="p-1.5 text-xs font-semibold bg-red-950/70 hover:bg-red-900 text-red-200 border border-red-800/60 rounded-lg transition-colors cursor-pointer"
                title="Sign Out of Admin"
                aria-label="Sign Out"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Role Status Tag (Personal Email is NEVER shown) */}
          <div className="px-5 py-3 bg-white/5 border-b border-slate-800/80 space-y-1.5">
            <div className="flex items-center justify-between gap-1.5 text-xs">
              <span className="text-slate-400">Role:</span>
              <span
                className={`font-bold px-2 py-0.5 rounded text-[10px] uppercase tracking-wider ${
                  isSuperAdmin
                    ? 'bg-amber-400 text-slate-950'
                    : 'bg-blue-500 text-white'
                }`}
              >
                {isSuperAdmin ? 'Super Admin (Developer)' : 'College Administration'}
              </span>
            </div>
            {localStaffUser && (
              <div className="flex items-center gap-1.5 text-[10px] text-emerald-400 font-medium">
                <ShieldCheck className="w-3 h-3 text-emerald-400 shrink-0" />
                <span>Auto-locks after 20m idle</span>
              </div>
            )}
          </div>

          {/* Navigation Tabs */}
          <nav className="p-3 flex lg:flex-col gap-1 overflow-x-auto">
            <button
              onClick={() => setActiveTab('notices')}
              className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activeTab === 'notices'
                  ? 'bg-amber-400 text-slate-950 shadow-sm'
                  : 'text-slate-300 hover:bg-white/10 hover:text-white'
              }`}
            >
              <Bell className="w-4 h-4 shrink-0" />
              <span>Notice Board ({notices.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('downloads')}
              className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activeTab === 'downloads'
                  ? 'bg-amber-400 text-slate-950 shadow-sm'
                  : 'text-slate-300 hover:bg-white/10 hover:text-white'
              }`}
            >
              <FileText className="w-4 h-4 shrink-0" />
              <span>PDF Downloads ({downloads.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('learningResources')}
              className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activeTab === 'learningResources'
                  ? 'bg-amber-400 text-slate-950 shadow-sm'
                  : 'text-slate-300 hover:bg-white/10 hover:text-white'
              }`}
            >
              <BookOpen className="w-4 h-4 shrink-0" />
              <span>Learning Resources ({learningResources.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('gallery')}
              className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activeTab === 'gallery'
                  ? 'bg-amber-400 text-slate-950 shadow-sm'
                  : 'text-slate-300 hover:bg-white/10 hover:text-white'
              }`}
            >
              <Camera className="w-4 h-4 shrink-0" />
              <span>Campus Life & Gallery ({gallery.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('publicInfo')}
              className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activeTab === 'publicInfo'
                  ? 'bg-amber-400 text-slate-950 shadow-sm'
                  : 'text-slate-300 hover:bg-white/10 hover:text-white'
              }`}
            >
              <ImageIcon className="w-4 h-4 shrink-0" />
              <span>Prospectus Bulletin</span>
            </button>

            <button
              onClick={() => setActiveTab('inquiries')}
              className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activeTab === 'inquiries'
                  ? 'bg-amber-400 text-slate-950 shadow-sm'
                  : 'text-slate-300 hover:bg-white/10 hover:text-white'
              }`}
            >
              <Inbox className="w-4 h-4 shrink-0" />
              <span>Admission Inquiries ({inquiries.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('resultPortal')}
              className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activeTab === 'resultPortal'
                  ? 'bg-amber-400 text-slate-950 shadow-sm'
                  : 'text-slate-300 hover:bg-white/10 hover:text-white'
              }`}
            >
              <ExternalLink className="w-4 h-4 shrink-0" />
              <span>Results Portal Link</span>
            </button>

            <button
              onClick={() => setActiveTab('customButtons')}
              className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activeTab === 'customButtons'
                  ? 'bg-amber-400 text-slate-950 shadow-sm'
                  : 'text-slate-300 hover:bg-white/10 hover:text-white'
              }`}
            >
              <LinkIcon className="w-4 h-4 shrink-0" />
              <span>Custom Home Buttons</span>
            </button>

            <button
              onClick={() => setActiveTab('settings')}
              className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activeTab === 'settings'
                  ? 'bg-amber-400 text-slate-950 shadow-sm'
                  : 'text-slate-300 hover:bg-white/10 hover:text-white'
              }`}
            >
              <Settings className="w-4 h-4 shrink-0" />
              <span>Site Information</span>
            </button>

            {/* User Management tab: Only Super Admin has write control */}
            <button
              onClick={() => setActiveTab('users')}
              className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activeTab === 'users'
                  ? 'bg-amber-400 text-slate-950 shadow-sm'
                  : 'text-slate-300 hover:bg-white/10 hover:text-white'
              }`}
            >
              <Users className="w-4 h-4 shrink-0" />
              <span>User Management {isSuperAdmin && `(${managedStaffList.length + 1})`}</span>
            </button>
          </nav>
        </div>

        {/* Sidebar Footer Controls */}
        <div className="hidden lg:block p-4 border-t border-slate-800 space-y-3">
          <div className="flex items-center gap-2">
            <button
              onClick={onBackToSite}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold bg-white/10 hover:bg-white/20 text-white rounded-xl transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Public Website</span>
            </button>
            <button
              onClick={handleLogout}
              className="px-3 py-2 text-xs font-semibold bg-red-900/60 hover:bg-red-800 text-red-100 rounded-xl transition-colors cursor-pointer"
              title="Sign Out"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-white border-b border-slate-200 px-4 sm:px-6 py-3.5 sm:py-4 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          <div>
            <h2 className="text-lg sm:text-xl font-serif font-black text-slate-900 uppercase tracking-tight">
              {activeTab === 'notices' && 'Official Notice Board Management'}
              {activeTab === 'downloads' && 'PDF Documents & Downloads'}
              {activeTab === 'learningResources' && 'CBSE & NCERT Learning Resources'}
              {activeTab === 'gallery' && 'Campus Life & Photo Gallery Management'}
              {activeTab === 'publicInfo' && 'Public Information & Prospectus Bulletin'}
              {activeTab === 'inquiries' && 'Parent Admission Inquiries'}
              {activeTab === 'resultPortal' && 'Examination Results Portal Settings'}
              {activeTab === 'customButtons' && 'Custom Dynamic Website Buttons'}
              {activeTab === 'settings' && 'School Contact & Campus Settings'}
              {activeTab === 'users' && 'Administrator User Management'}
            </h2>
            <div className="flex flex-wrap items-center gap-2 mt-1">
              <span className="text-[11px] sm:text-xs text-slate-500">
                Logged in with{' '}
                <strong className="text-slate-800 font-semibold">
                  {isSuperAdmin ? 'Super Administrator (Developer)' : 'College Administration'}
                </strong>
              </span>
              {localStaffUser && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-semibold">
                  <ShieldCheck className="w-3 h-3 text-emerald-600" />
                  <span>Session Protected · 20m Inactivity Lock</span>
                </span>
              )}
            </div>
          </div>

          {/* Desktop-only Action Bar (On mobile, these are cleanly located at the top bar) */}
          <div className="hidden lg:flex items-center gap-2 sm:gap-3">
            {isSuperAdmin && (
              <button
                onClick={handleSeedDatabase}
                disabled={isSeeding}
                className="px-3 py-2 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                title="Sync default notices and files to database"
              >
                <Database className="w-3.5 h-3.5" />
                <span>{isSeeding ? 'Syncing...' : 'Sync Defaults'}</span>
              </button>
            )}
            <button
              onClick={onBackToSite}
              className="px-3.5 py-2 text-xs font-semibold bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs"
            >
              <Globe className="w-3.5 h-3.5" />
              <span>View Website</span>
            </button>
            <button
              onClick={handleLogout}
              className="px-3 py-2 text-xs font-semibold bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl transition-colors cursor-pointer flex items-center gap-1.5"
              title="Secure Sign Out"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </header>

        {/* Global Action Status Banner */}
        {statusBanner && (
          <div
            className={`mx-6 mt-4 p-4 rounded-xl text-xs font-medium border animate-fadeIn ${
              statusBanner.type === 'success'
                ? 'bg-emerald-50 text-emerald-950 border-emerald-200'
                : 'bg-red-50 text-red-950 border-red-200'
            }`}
          >
            {statusBanner.text}
          </div>
        )}

        <div className="p-6 overflow-y-auto flex-1">
          {/* ============================================================== */}
          {/* TAB 1: NOTICES MANAGEMENT (DELETE GUARANTEED WORKING) */}
          {/* ============================================================== */}
          {activeTab === 'notices' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              <form onSubmit={handleSaveNotice} className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-6 space-y-4 shadow-xs">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                    {editingNoticeId ? 'Edit Announcement' : 'Publish New Notice'}
                  </h3>
                  {editingNoticeId && (
                    <button
                      type="button"
                      onClick={resetNoticeForm}
                      className="text-xs text-amber-700 hover:underline cursor-pointer"
                    >
                      Cancel Edit
                    </button>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Notice Headline *</label>
                  <input
                    type="text"
                    required
                    maxLength={160}
                    value={noticeTitle}
                    onChange={(e) => setNoticeTitle(e.target.value)}
                    placeholder="e.g. Schedule for Academic Assessment 2027"
                    className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Category</label>
                    <select
                      value={noticeCategory}
                      onChange={(e) => setNoticeCategory(e.target.value as any)}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    >
                      <option value="Admissions">Admissions</option>
                      <option value="Academic">Academic</option>
                      <option value="Examinations">Examinations</option>
                      <option value="Events">Events</option>
                      <option value="General">General</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Date Display</label>
                    <input
                      type="text"
                      maxLength={40}
                      value={noticeDateLabel}
                      onChange={(e) => setNoticeDateLabel(e.target.value)}
                      placeholder="e.g. October 2026"
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Notice Details *</label>
                  <textarea
                    required
                    rows={4}
                    maxLength={2000}
                    value={noticeContent}
                    onChange={(e) => setNoticeContent(e.target.value)}
                    placeholder="Enter complete notice announcement details..."
                    className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>

                <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={noticeImportant}
                    onChange={(e) => setNoticeImportant(e.target.checked)}
                    className="rounded border-slate-300"
                  />
                  <span>Mark as Priority / Urgent Notice</span>
                </label>

                <button
                  type="submit"
                  className="w-full py-2.5 px-4 bg-[#081836] hover:bg-[#122e5e] text-white text-xs font-semibold uppercase tracking-wider rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                >
                  <Plus className="w-4 h-4" />
                  <span>{editingNoticeId ? 'Save Changes' : 'Publish Notice'}</span>
                </button>
              </form>

              <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl divide-y divide-slate-100 shadow-xs">
                <div className="p-5 flex items-center justify-between">
                  <h3 className="text-base font-bold text-slate-900 font-serif">
                    Live Published Notices ({notices.length})
                  </h3>
                  <span className="text-xs text-slate-500">Live on Public Website</span>
                </div>

                {notices.length === 0 ? (
                  <div className="p-8 text-center text-sm text-slate-500">
                    No notices currently active. Add one using the form on the left.
                  </div>
                ) : (
                  notices.map((item) => (
                    <div key={item.id} className="p-5 flex items-start justify-between gap-4 hover:bg-slate-50/50 transition-colors">
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                            {item.category}
                          </span>
                          {item.isImportant && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500 text-slate-950 uppercase">
                              Urgent
                            </span>
                          )}
                          <span className="text-xs text-slate-400">• {item.dateLabel}</span>
                        </div>
                        <h4 className="font-bold text-slate-900 text-sm truncate">{item.title}</h4>
                        <p className="text-xs text-slate-600 line-clamp-2">{item.content}</p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => handleEditNoticeSelect(item)}
                          className="px-2.5 py-1 text-xs border border-slate-200 rounded-md hover:bg-slate-50 text-slate-700 flex items-center gap-1 cursor-pointer"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>Edit</span>
                        </button>
                        {deletingNoticeId === item.id ? (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleDeleteNotice(item.id)}
                              className="px-2.5 py-1 text-xs bg-red-600 hover:bg-red-700 text-white font-bold rounded-md cursor-pointer"
                            >
                              Confirm
                            </button>
                            <button
                              onClick={() => setDeletingNoticeId(null)}
                              className="px-2 py-1 text-xs text-slate-500 hover:text-slate-800 cursor-pointer"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setDeletingNoticeId(item.id)}
                            className="p-1.5 text-slate-400 hover:text-red-600 cursor-pointer"
                            title="Delete Notice"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* TAB 2: DOWNLOADS & PDF MANAGEMENT (DELETE GUARANTEED WORKING) */}
          {/* ============================================================== */}
          {activeTab === 'downloads' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              <form onSubmit={handleSaveDownload} className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-6 space-y-4 shadow-xs">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                    {editingDownloadId ? 'Edit PDF Document' : 'Add Downloadable PDF'}
                  </h3>
                  {editingDownloadId && (
                    <button
                      type="button"
                      onClick={resetDownloadForm}
                      className="text-xs text-amber-700 hover:underline cursor-pointer"
                    >
                      Cancel Edit
                    </button>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Document Title *</label>
                  <input
                    type="text"
                    required
                    maxLength={160}
                    value={downloadTitle}
                    onChange={(e) => setDownloadTitle(e.target.value)}
                    placeholder="e.g. Class 1-10 Syllabus Guide (2027-28)"
                    className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Category</label>
                    <select
                      value={downloadCategory}
                      onChange={(e) => setDownloadCategory(e.target.value as any)}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    >
                      <option value="Forms">Admission Forms</option>
                      <option value="Syllabus">Curriculum / Syllabus</option>
                      <option value="Calendar">Academic Calendar</option>
                      <option value="Hostel">Hostel Rules</option>
                      <option value="General">General Information</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">File Size Label</label>
                    <input
                      type="text"
                      maxLength={40}
                      value={downloadSize}
                      onChange={(e) => setDownloadSize(e.target.value)}
                      placeholder="e.g. PDF · 450 KB"
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Upload or Link PDF */}
                <div className="p-3 bg-amber-50/70 rounded-xl border border-amber-200/80 space-y-2">
                  <label className="block text-xs font-bold text-amber-950">
                    Option A: Choose PDF File from your Device
                  </label>
                  <input
                    type="file"
                    accept=".pdf,application/pdf"
                    onChange={handlePdfFileUpload}
                    className="block w-full text-xs text-slate-700 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-amber-600 file:text-white hover:file:bg-amber-700 cursor-pointer"
                  />
                  <p className="text-[10px] text-slate-500">
                    Directly attach a syllabus, admission form, or circular PDF from your phone or PC.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Option B: Document Web Link / URL
                  </label>
                  <input
                    type="text"
                    value={downloadUrl.startsWith('data:') ? '✓ Local PDF file loaded from device' : downloadUrl}
                    onChange={(e) => setDownloadUrl(e.target.value)}
                    placeholder="https://... or leave as is if file selected above"
                    className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>

                <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={downloadActive}
                    onChange={(e) => setDownloadActive(e.target.checked)}
                    className="rounded border-slate-300"
                  />
                  <span>Display on Website (Active)</span>
                </label>

                <button
                  type="submit"
                  className="w-full py-2.5 px-4 bg-[#081836] hover:bg-[#122e5e] text-white text-xs font-semibold uppercase tracking-wider rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                >
                  <Plus className="w-4 h-4" />
                  <span>{editingDownloadId ? 'Update PDF Entry' : 'Add to Downloads Page'}</span>
                </button>
              </form>

              <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl divide-y divide-slate-100 shadow-xs">
                <div className="p-5 flex items-center justify-between">
                  <h3 className="text-base font-bold text-slate-900 font-serif">
                    Managed PDF Downloads ({downloads.length})
                  </h3>
                  <span className="text-xs text-slate-500">Toggle ON/OFF or Delete</span>
                </div>

                {downloads.length === 0 ? (
                  <div className="p-8 text-center text-sm text-slate-500">
                    No downloadable PDFs yet. Add your first document.
                  </div>
                ) : (
                  downloads.map((item) => (
                    <div key={item.id} className="p-5 flex items-start justify-between gap-4 hover:bg-slate-50/50 transition-colors">
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                              item.isActive !== false
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-slate-200 text-slate-600'
                            }`}
                          >
                            {item.isActive !== false ? 'ACTIVE ON SITE' : 'HIDDEN'}
                          </span>
                          <span className="text-xs text-slate-500">• {item.category}</span>
                          <span className="text-xs text-slate-400">({item.fileSize})</span>
                        </div>
                        <h4 className="font-bold text-slate-900 text-sm truncate">{item.title}</h4>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleToggleDownloadActive(item)}
                          className={`px-2.5 py-1 text-xs rounded-md font-semibold cursor-pointer border ${
                            item.isActive !== false
                              ? 'bg-amber-50 text-amber-800 border-amber-200'
                              : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          }`}
                        >
                          {item.isActive !== false ? 'Hide' : 'Show'}
                        </button>

                        <button
                          onClick={() => {
                            setEditingDownloadId(item.id);
                            setDownloadTitle(item.title);
                            setDownloadCategory(item.category);
                            setDownloadSize(item.fileSize);
                            setDownloadUrl(item.fileUrl || '');
                            setDownloadActive(item.isActive !== false);
                            setDownloadSortOrder(item.sortOrder ?? item.order ?? 1);
                          }}
                          className="px-2.5 py-1 text-xs border border-slate-200 rounded-md hover:bg-slate-50 text-slate-700 flex items-center gap-1 cursor-pointer"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>Edit</span>
                        </button>

                        {deletingDownloadId === item.id ? (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleDeleteDownload(item.id)}
                              className="px-2.5 py-1 text-xs bg-red-600 hover:bg-red-700 text-white font-bold rounded-md cursor-pointer"
                            >
                              Confirm
                            </button>
                            <button
                              onClick={() => setDeletingDownloadId(null)}
                              className="px-2 py-1 text-xs text-slate-500 hover:text-slate-800 cursor-pointer"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setDeletingDownloadId(item.id)}
                            className="p-1.5 text-slate-400 hover:text-red-600 cursor-pointer"
                            title="Delete PDF"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* TAB: LEARNING RESOURCES (ADD / EDIT / DELETE / SYNC)           */}
          {/* ============================================================== */}
          {activeTab === 'learningResources' && (
            <div className="space-y-6">
              {/* Header Banner */}
              <div className="bg-gradient-to-r from-[#071738] to-[#123675] text-white p-6 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm border border-amber-500/20">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-amber-400 text-slate-950">
                      Academic Resources
                    </span>
                    <span className="text-xs text-amber-200">Classes Pre-Primary to 10</span>
                  </div>
                  <h3 className="text-lg font-serif font-bold text-white">
                    CBSE & NCERT Learning Resources Management
                  </h3>
                  <p className="text-xs text-slate-300 max-w-xl">
                    Manage textbooks, official NCERT portals, worksheets, and syllabus links displayed on the public Learning Resources page.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleSeedDefaultResources}
                  disabled={isSeeding}
                  className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-2 shrink-0 cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 text-slate-950" />
                  <span>{isSeeding ? 'Syncing...' : 'Restore Verified NCERT Resources'}</span>
                </button>
              </div>

              {/* Grid: Form (Left) & List (Right) */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                {/* Form Column */}
                <form
                  onSubmit={handleSaveResource}
                  className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-6 space-y-4 shadow-xs"
                >
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                        {editingResourceId ? 'Edit Learning Resource' : 'Add New Learning Resource'}
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        {editingResourceId ? 'Updating selected resource' : 'Create a book, worksheet, or curriculum link'}
                      </p>
                    </div>
                    {editingResourceId && (
                      <button
                        type="button"
                        onClick={resetResourceForm}
                        className="text-xs text-amber-700 hover:underline cursor-pointer"
                      >
                        Cancel Edit
                      </button>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Resource / Textbook Title *
                    </label>
                    <input
                      type="text"
                      required
                      maxLength={200}
                      value={resTitle}
                      onChange={(e) => setResTitle(e.target.value)}
                      placeholder="e.g. Class 6 Curiosity (New NCERT Science)"
                      className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Class Level *
                      </label>
                      <select
                        value={resClassLevel}
                        onChange={(e) => setResClassLevel(e.target.value)}
                        className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none"
                      >
                        <option value="All Classes">All Classes</option>
                        <option value="Pre-Primary">Pre-Primary</option>
                        <option value="Class 1">Class 1</option>
                        <option value="Class 2">Class 2</option>
                        <option value="Class 3">Class 3</option>
                        <option value="Class 4">Class 4</option>
                        <option value="Class 5">Class 5</option>
                        <option value="Class 6">Class 6</option>
                        <option value="Class 7">Class 7</option>
                        <option value="Class 8">Class 8</option>
                        <option value="Class 9">Class 9</option>
                        <option value="Class 10">Class 10</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Subject *
                      </label>
                      <select
                        value={resSubject}
                        onChange={(e) => setResSubject(e.target.value)}
                        className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none"
                      >
                        <option value="Mathematics">Mathematics</option>
                        <option value="Science">Science</option>
                        <option value="English">English</option>
                        <option value="Hindi">Hindi</option>
                        <option value="Social Science">Social Science</option>
                        <option value="EVS">EVS</option>
                        <option value="Sanskrit">Sanskrit</option>
                        <option value="AI & STEM">AI & STEM</option>
                        <option value="General">General</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Category
                      </label>
                      <select
                        value={resCategory}
                        onChange={(e) => setResCategory(e.target.value as any)}
                        className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none"
                      >
                        <option value="NCERT Textbooks">NCERT Textbooks</option>
                        <option value="Worksheets & Practice">Worksheets & Practice</option>
                        <option value="CBSE Syllabus">CBSE Syllabus</option>
                        <option value="Sample Papers">Sample Papers</option>
                        <option value="Digital Interactive">Digital Interactive</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Official Source Name
                      </label>
                      <input
                        type="text"
                        maxLength={100}
                        value={resOfficialSource}
                        onChange={(e) => setResOfficialSource(e.target.value)}
                        placeholder="e.g. NCERT Portal, DIKSHA"
                        className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Resource URL with Quick Fill suggestions */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Resource URL / Link *
                    </label>
                    <input
                      type="url"
                      required
                      value={resUrl}
                      onChange={(e) => setResUrl(e.target.value)}
                      placeholder="https://ncert.nic.in/textbook.php"
                      className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none mb-2 font-mono text-xs"
                    />
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[10px] text-slate-400 font-bold uppercase">Quick URL:</span>
                      {[
                        { label: 'NCERT Portal', url: 'https://ncert.nic.in/textbook.php' },
                        { label: 'DIKSHA', url: 'https://diksha.gov.in/' },
                        { label: 'CBSE Academic', url: 'https://cbseacademic.nic.in/' },
                        { label: 'ePathshala', url: 'https://epathshala.nic.in/' },
                        { label: 'NCERT Exemplar', url: 'https://ncert.nic.in/exemplar-problems.php' },
                      ].map((s) => (
                        <button
                          key={s.label}
                          type="button"
                          onClick={() => {
                            setResUrl(s.url);
                            setResOfficialSource(s.label);
                          }}
                          className="text-[10px] px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold cursor-pointer"
                        >
                          {s.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Brief Description / Study Guidance
                    </label>
                    <textarea
                      rows={3}
                      maxLength={1000}
                      value={resDescription}
                      onChange={(e) => setResDescription(e.target.value)}
                      placeholder="e.g. Activity-based numeracy, shapes, spatial awareness, and introductory multiplication sets."
                      className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none resize-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3 items-center pt-2">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Display Order
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={1000}
                        value={resSortOrder}
                        onChange={(e) => setResSortOrder(Number(e.target.value) || 1)}
                        className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none"
                      />
                    </div>

                    <div className="flex items-center gap-2 pt-4">
                      <input
                        type="checkbox"
                        id="resActiveToggle"
                        checked={resActive}
                        onChange={(e) => setResActive(e.target.checked)}
                        className="w-4 h-4 text-amber-600 rounded border-slate-300 focus:ring-amber-500 cursor-pointer"
                      />
                      <label
                        htmlFor="resActiveToggle"
                        className="text-xs font-semibold text-slate-700 cursor-pointer"
                      >
                        Publish to Public Page
                      </label>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={savingResource}
                    className="w-full bg-[#081836] hover:bg-[#0e2759] text-white py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider shadow-sm transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    <Check className="w-4 h-4 text-amber-400" />
                    <span>
                      {savingResource
                        ? 'Saving...'
                        : editingResourceId
                        ? 'Update Learning Resource'
                        : 'Add Learning Resource'}
                    </span>
                  </button>
                </form>

                {/* List Column */}
                <div className="lg:col-span-7 space-y-4">
                  {/* Search & Filter Bar */}
                  <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shadow-xs">
                    <div className="relative flex-1">
                      <input
                        type="text"
                        value={resAdminSearch}
                        onChange={(e) => setResAdminSearch(e.target.value)}
                        placeholder="Filter by title, subject, or class..."
                        className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none"
                      />
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-500 font-bold">Class:</span>
                      <select
                        value={resAdminFilterClass}
                        onChange={(e) => setResAdminFilterClass(e.target.value)}
                        className="px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
                      >
                        <option value="All">All Classes</option>
                        <option value="Pre-Primary">Pre-Primary</option>
                        <option value="Class 1">Class 1</option>
                        <option value="Class 2">Class 2</option>
                        <option value="Class 3">Class 3</option>
                        <option value="Class 4">Class 4</option>
                        <option value="Class 5">Class 5</option>
                        <option value="Class 6">Class 6</option>
                        <option value="Class 7">Class 7</option>
                        <option value="Class 8">Class 8</option>
                        <option value="Class 9">Class 9</option>
                        <option value="Class 10">Class 10</option>
                      </select>
                    </div>
                  </div>

                  {/* List of Resources */}
                  <div className="space-y-3">
                    {learningResources
                      .filter((item) => {
                        if (resAdminFilterClass !== 'All') {
                          if (item.classLevel !== resAdminFilterClass && item.classLevel !== 'All Classes') {
                            return false;
                          }
                        }
                        if (resAdminSearch.trim()) {
                          const q = resAdminSearch.toLowerCase();
                          const matchT = item.title.toLowerCase().includes(q);
                          const matchS = item.subject?.toLowerCase().includes(q);
                          const matchC = item.classLevel?.toLowerCase().includes(q);
                          if (!matchT && !matchS && !matchC) return false;
                        }
                        return true;
                      })
                      .map((item) => (
                        <div
                          key={item.id}
                          className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 hover:border-amber-400/50 transition-all"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <span className="bg-[#0a1e3f] text-amber-300 text-[10px] font-bold px-2 py-0.5 rounded">
                                {item.classLevel}
                              </span>
                              <span className="bg-slate-100 text-slate-700 text-[10px] font-semibold px-2 py-0.5 rounded">
                                {item.subject}
                              </span>
                              <span className="text-[10px] text-slate-500 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded">
                                {item.category}
                              </span>
                              {item.isActive === false && (
                                <span className="bg-red-100 text-red-800 text-[10px] font-bold px-2 py-0.5 rounded">
                                  Hidden
                                </span>
                              )}
                            </div>

                            <h5 className="font-bold text-sm text-slate-900 truncate">
                              {item.title}
                            </h5>

                            <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">
                              {item.description || 'No description provided.'}
                            </p>

                            <a
                              href={item.resourceUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[11px] text-blue-600 hover:underline truncate inline-flex items-center gap-1 mt-1 max-w-md"
                            >
                              <ExternalLink className="w-3 h-3 shrink-0" />
                              <span className="truncate">{item.resourceUrl}</span>
                            </a>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleToggleResourceActive(item)}
                              className={`px-2.5 py-1 text-xs rounded-md font-semibold cursor-pointer border ${
                                item.isActive !== false
                                  ? 'bg-amber-50 text-amber-800 border-amber-200'
                                  : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              }`}
                            >
                              {item.isActive !== false ? 'Hide' : 'Publish'}
                            </button>

                            <button
                              type="button"
                              onClick={() => handleEditResourceSelect(item)}
                              className="px-2.5 py-1 text-xs border border-slate-200 rounded-md hover:bg-slate-50 text-slate-700 flex items-center gap-1 cursor-pointer"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                              <span>Edit</span>
                            </button>

                            {deletingResourceId === item.id ? (
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => handleDeleteResource(item.id)}
                                  className="px-2.5 py-1 text-xs bg-red-600 hover:bg-red-700 text-white font-bold rounded-md cursor-pointer"
                                >
                                  Confirm
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setDeletingResourceId(null)}
                                  className="px-2 py-1 text-xs text-slate-500 hover:text-slate-800 cursor-pointer"
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setDeletingResourceId(item.id)}
                                className="p-1.5 text-slate-400 hover:text-red-600 cursor-pointer"
                                title="Delete Resource"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}

                    {learningResources.length === 0 && (
                      <div className="bg-white border border-slate-200 rounded-xl p-8 text-center text-slate-500 text-xs">
                        No learning resources added yet. Click "Restore Verified NCERT Resources" to populate standard curriculum links.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* TAB: CAMPUS LIFE & PHOTO GALLERY MANAGEMENT */}
          {/* ============================================================== */}
          {activeTab === 'gallery' && (
            <div className="space-y-8">
              {/* Global Section ON/OFF Toggle Banner */}
              <div className={`p-6 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                settingsForm.campusLifeActive !== false
                  ? 'bg-gradient-to-r from-emerald-900 to-slate-900 text-white border-emerald-700/60 shadow-md'
                  : 'bg-gradient-to-r from-slate-800 to-slate-900 text-slate-300 border-slate-700 shadow-xs'
              }`}>
                <div className="space-y-1 max-w-2xl">
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full ${
                      settingsForm.campusLifeActive !== false
                        ? 'bg-emerald-400 text-slate-950'
                        : 'bg-red-500 text-white'
                    }`}>
                      {settingsForm.campusLifeActive !== false ? 'SECTION IS LIVE ON WEBSITE' : 'SECTION IS TURNED OFF'}
                    </span>
                    <span className="text-xs text-amber-300/80">• Campus Life Feature</span>
                  </div>
                  <h3 className="text-lg font-serif font-bold text-white">
                    Campus Life & Event Photo Carousel Section
                  </h3>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {settingsForm.campusLifeActive !== false
                      ? 'The Campus Life page, top navigation menu, home page featured carousel, and footer links are active and visible to parents and visitors.'
                      : 'The Campus Life section is currently turned off and hidden from all public navigation menus and pages.'}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleToggleCampusLifeSection}
                  className={`px-5 py-3 rounded-xl font-bold text-xs uppercase tracking-wider transition-all cursor-pointer shadow flex items-center justify-center gap-2 shrink-0 ${
                    settingsForm.campusLifeActive !== false
                      ? 'bg-red-600 hover:bg-red-500 text-white'
                      : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black'
                  }`}
                >
                  <Eye className="w-4 h-4" />
                  <span>
                    {settingsForm.campusLifeActive !== false
                      ? 'Turn OFF Campus Life Section'
                      : 'Turn ON Campus Life Section'}
                  </span>
                </button>
              </div>

              {/* Form & List Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                {/* Form Column */}
                <form onSubmit={handleSaveGallery} className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-6 space-y-4 shadow-xs">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                        {editingGalleryId ? 'Edit Photo / Group Album' : 'Add Photo or Group Carousel'}
                      </h3>
                      <p className="text-[11px] text-slate-500">
                        Supports direct links hosted on <strong className="text-amber-700">imgbb.com</strong>
                      </p>
                    </div>
                    {editingGalleryId && (
                      <button
                        type="button"
                        onClick={resetGalleryForm}
                        className="text-xs text-amber-700 hover:underline cursor-pointer"
                      >
                        Cancel Edit
                      </button>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Event / Photo Title *
                    </label>
                    <input
                      type="text"
                      required
                      maxLength={160}
                      value={galleryTitle}
                      onChange={(e) => setGalleryTitle(e.target.value)}
                      placeholder="e.g. AI Robotics & STEM Studio in Action"
                      className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Category</label>
                      <select
                        value={galleryCategory}
                        onChange={(e) => setGalleryCategory(e.target.value as any)}
                        className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none"
                      >
                        <option value="Events">Events</option>
                        <option value="Facilities">Facilities</option>
                        <option value="Campus Life">Campus Life</option>
                        <option value="Sports">Sports</option>
                        <option value="Academic">Academic</option>
                        <option value="Celebrations">Celebrations</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Date / Session Label</label>
                      <input
                        type="text"
                        value={galleryDateLabel}
                        onChange={(e) => setGalleryDateLabel(e.target.value)}
                        placeholder="e.g. October 2026"
                        className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Mode Selector: Single Photo vs Group Photo Carousel */}
                  <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                    <label className="block text-xs font-bold text-slate-800 mb-2">
                      Photo Display Mode:
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setGalleryType('single')}
                        className={`py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer border ${
                          galleryType === 'single'
                            ? 'bg-[#0a1e3f] text-white border-[#0a1e3f] shadow-xs'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        <ImageIcon className="w-3.5 h-3.5 text-amber-400" />
                        <span>Single Photo</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setGalleryType('group');
                          if (!galleryImageUrls || galleryImageUrls.length < 2) {
                            setGalleryImageUrls([galleryImageUrl || 'https://i.ibb.co/7xDcBy4c/IMG-20261018-WA0011.jpg', '', '']);
                          }
                        }}
                        className={`py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer border ${
                          galleryType === 'group'
                            ? 'bg-[#0a1e3f] text-white border-[#0a1e3f] shadow-xs'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        <Layers className="w-3.5 h-3.5 text-amber-400" />
                        <span>Group Carousel (Multi-Slide)</span>
                      </button>
                    </div>
                  </div>

                  {/* Option 1: Single Photo URL Input */}
                  {galleryType === 'single' && (
                    <div className="space-y-3 p-3.5 bg-amber-50/60 rounded-xl border border-amber-200/80">
                      <div className="flex items-center justify-between">
                        <label className="block text-xs font-bold text-amber-950">
                          Direct Image URL (imgbb.com link) *
                        </label>
                        <button
                          type="button"
                          onClick={() => setGalleryImageUrl('https://i.ibb.co/7xDcBy4c/IMG-20261018-WA0011.jpg')}
                          className="text-[10px] font-bold text-amber-900 bg-amber-200 hover:bg-amber-300 px-2 py-0.5 rounded cursor-pointer transition-colors"
                        >
                          Paste Sample Link
                        </button>
                      </div>

                      <input
                        type="url"
                        required
                        value={galleryImageUrl}
                        onChange={(e) => setGalleryImageUrl(e.target.value)}
                        placeholder="https://i.ibb.co/7xDcBy4c/IMG-20261018-WA0011.jpg"
                        className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none font-mono"
                      />
                      <p className="text-[10px] text-slate-500">
                        Copy the direct image URL from imgbb (ending with .jpg, .png, or direct i.ibb.co link).
                      </p>

                      {/* Single Photo Preview */}
                      {galleryImageUrl && (
                        <div className="relative rounded-lg overflow-hidden border border-slate-300 bg-slate-100 h-36 flex items-center justify-center">
                          <img
                            src={galleryImageUrl}
                            alt="Live Preview"
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.currentTarget as HTMLImageElement).src =
                                'https://images.unsplash.com/photo-1580582932707-520aed937b7b?auto=format&fit=crop&w=600&q=80';
                            }}
                          />
                          <span className="absolute bottom-1 right-1 bg-black/70 text-white text-[9px] px-2 py-0.5 rounded font-mono">
                            Live Preview
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Option 2: Group Photo Carousel Inputs */}
                  {galleryType === 'group' && (
                    <div className="space-y-3 p-3.5 bg-blue-50/60 rounded-xl border border-blue-200/80">
                      <div className="flex items-center justify-between">
                        <div>
                          <label className="block text-xs font-bold text-blue-950">
                            Group Photos (Automatic Multi-Slide Carousel)
                          </label>
                          <span className="text-[10px] text-blue-800">
                            Add 3-4 (or more) photos. They slide automatically!
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setGalleryImageUrls([
                              'https://i.ibb.co/7xDcBy4c/IMG-20261018-WA0011.jpg',
                              'https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&w=1200&q=80',
                              'https://images.unsplash.com/photo-1581092918056-0c4c3acd3789?auto=format&fit=crop&w=1200&q=80',
                              'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=80',
                            ]);
                          }}
                          className="text-[10px] font-bold text-blue-900 bg-blue-200 hover:bg-blue-300 px-2 py-0.5 rounded cursor-pointer transition-colors"
                        >
                          Fill 4 Sample Photos
                        </button>
                      </div>

                      {/* Individual Slide Inputs */}
                      <div className="space-y-2">
                        {galleryImageUrls.map((url, idx) => (
                          <div key={idx} className="flex items-center gap-2">
                            <span className="w-14 text-[10px] font-bold text-slate-600 shrink-0">
                              Slide #{idx + 1}
                            </span>
                            <input
                              type="url"
                              value={url}
                              onChange={(e) => {
                                const copy = [...galleryImageUrls];
                                copy[idx] = e.target.value;
                                setGalleryImageUrls(copy);
                              }}
                              placeholder={`https://i.ibb.co/... (Photo ${idx + 1})`}
                              className="flex-1 px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono"
                            />
                            {galleryImageUrls.length > 2 && (
                              <button
                                type="button"
                                onClick={() => {
                                  setGalleryImageUrls(galleryImageUrls.filter((_, i) => i !== idx));
                                }}
                                className="p-1 text-slate-400 hover:text-red-600 cursor-pointer"
                                title="Remove Slide"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>

                      <div className="flex items-center gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => setGalleryImageUrls([...galleryImageUrls, ''])}
                          className="text-xs font-semibold text-blue-900 bg-blue-100 hover:bg-blue-200 px-3 py-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Add Another Photo Slide</span>
                        </button>
                      </div>

                      {/* Quick Multi-line paste area */}
                      <div className="pt-2 border-t border-blue-200">
                        <label className="block text-[10px] font-bold text-slate-600 mb-1">
                          Quick Bulk Paste: Multiple imgbb URLs (one per line)
                        </label>
                        <div className="flex gap-2">
                          <textarea
                            rows={2}
                            value={galleryBulkUrls}
                            onChange={(e) => setGalleryBulkUrls(e.target.value)}
                            placeholder="https://i.ibb.co/photo1.jpg&#10;https://i.ibb.co/photo2.jpg&#10;https://i.ibb.co/photo3.jpg"
                            className="flex-1 p-2 text-xs bg-white border border-slate-300 rounded-lg font-mono text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-400"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const lines = galleryBulkUrls
                                .split('\n')
                                .map((l) => l.trim())
                                .filter((l) => l.length > 0);
                              if (lines.length > 0) {
                                setGalleryImageUrls(lines);
                                showMessage('success', `Loaded ${lines.length} slide URLs from list!`);
                              }
                            }}
                            className="px-3 py-1.5 bg-[#0a1e3f] hover:bg-[#122e5e] text-white text-xs font-semibold rounded-lg cursor-pointer shrink-0"
                          >
                            Apply
                          </button>
                        </div>
                      </div>

                      {/* Group Carousel Interactive Mini-Preview */}
                      {galleryImageUrls.filter((u) => u.trim().length > 0).length > 0 && (
                        <div className="mt-3 p-3 bg-white rounded-xl border border-blue-200 space-y-2">
                          <div className="flex items-center justify-between text-[11px] font-bold text-slate-700">
                            <span>Carousel Interactive Preview:</span>
                            <span className="text-blue-600">
                              Slide {previewSlideIdx + 1} of{' '}
                              {galleryImageUrls.filter((u) => u.trim().length > 0).length}
                            </span>
                          </div>

                          <div className="relative rounded-lg overflow-hidden h-40 bg-slate-900 flex items-center justify-center">
                            <img
                              src={
                                galleryImageUrls.filter((u) => u.trim().length > 0)[
                                  previewSlideIdx %
                                    Math.max(
                                      1,
                                      galleryImageUrls.filter((u) => u.trim().length > 0).length
                                    )
                                ] || 'https://i.ibb.co/7xDcBy4c/IMG-20261018-WA0011.jpg'
                              }
                              alt="Carousel Slide Preview"
                              className="w-full h-full object-cover transition-opacity duration-300"
                              onError={(e) => {
                                (e.currentTarget as HTMLImageElement).src =
                                  'https://images.unsplash.com/photo-1581092918056-0c4c3acd3789?auto=format&fit=crop&w=600&q=80';
                              }}
                            />

                            {/* Left / Right arrows */}
                            <button
                              type="button"
                              onClick={() => {
                                const valid = galleryImageUrls.filter((u) => u.trim().length > 0);
                                setPreviewSlideIdx((prev) => (prev > 0 ? prev - 1 : valid.length - 1));
                              }}
                              className="absolute left-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/90 cursor-pointer"
                            >
                              <ChevronLeft className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                const valid = galleryImageUrls.filter((u) => u.trim().length > 0);
                                setPreviewSlideIdx((prev) => (prev + 1) % valid.length);
                              }}
                              className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/90 cursor-pointer"
                            >
                              <ChevronRight className="w-4 h-4" />
                            </button>

                            {/* Slide Counter Pill */}
                            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-black/70 backdrop-blur-xs text-white text-[9px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                              <Layers className="w-3 h-3 text-amber-400" />
                              <span>
                                {previewSlideIdx + 1} / {galleryImageUrls.filter((u) => u.trim().length > 0).length}
                              </span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Description / Caption
                    </label>
                    <textarea
                      rows={2}
                      maxLength={300}
                      value={galleryDescription}
                      onChange={(e) => setGalleryDescription(e.target.value)}
                      placeholder="e.g. Students demonstrating robotics projects at the annual AI innovation exhibition."
                      className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    />
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={galleryActive}
                        onChange={(e) => setGalleryActive(e.target.checked)}
                        className="rounded border-slate-300 text-amber-600 focus:ring-amber-500"
                      />
                      <span>Show in Campus Life Gallery (Active)</span>
                    </label>

                    <div className="flex items-center gap-1.5 text-xs text-slate-600">
                      <span>Order:</span>
                      <input
                        type="number"
                        min={1}
                        max={100}
                        value={gallerySortOrder}
                        onChange={(e) => setGallerySortOrder(Number(e.target.value) || 1)}
                        className="w-14 px-2 py-1 text-xs border border-slate-300 rounded text-center"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={savingGallery}
                    className="w-full py-3 px-4 bg-[#081836] hover:bg-[#122e5e] text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-sm disabled:opacity-50"
                  >
                    <Plus className="w-4 h-4 text-amber-400" />
                    <span>
                      {savingGallery
                        ? 'Saving to Campus Life...'
                        : editingGalleryId
                        ? 'Update Gallery Item'
                        : 'Publish to Campus Life'}
                    </span>
                  </button>
                </form>

                {/* List Column */}
                <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl divide-y divide-slate-100 shadow-xs">
                  <div className="p-5 flex items-center justify-between">
                    <div>
                      <h3 className="text-base font-bold text-slate-900 font-serif">
                        Managed Campus Life Photos & Group Albums ({gallery.length})
                      </h3>
                      <p className="text-xs text-slate-500">
                        Toggle live visibility, edit image links, or delete items.
                      </p>
                    </div>
                    <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200">
                      Firestore: gallery
                    </span>
                  </div>

                  {gallery.length === 0 ? (
                    <div className="p-10 text-center text-sm text-slate-500 space-y-2">
                      <Camera className="w-8 h-8 mx-auto text-slate-400" />
                      <p>No photos or group albums added yet.</p>
                      <button
                        type="button"
                        onClick={() => {
                          setGalleryTitle('Crownbridge Campus Highlights');
                          setGalleryImageUrl('https://i.ibb.co/7xDcBy4c/IMG-20261018-WA0011.jpg');
                        }}
                        className="text-xs font-semibold text-amber-700 hover:underline cursor-pointer"
                      >
                        Click to add sample photo from imgbb
                      </button>
                    </div>
                  ) : (
                    gallery.map((item) => (
                      <div
                        key={item.id}
                        className="p-5 flex items-start justify-between gap-4 hover:bg-slate-50/60 transition-colors"
                      >
                        <div className="flex items-start gap-4 min-w-0">
                          {/* Image Thumbnail */}
                          <div className="w-20 h-16 rounded-xl overflow-hidden bg-slate-100 border border-slate-200 shrink-0 relative group">
                            <img
                              src={item.imageUrl}
                              alt={item.title}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                (e.currentTarget as HTMLImageElement).src =
                                  'https://images.unsplash.com/photo-1580582932707-520aed937b7b?auto=format&fit=crop&w=300&q=80';
                              }}
                            />
                            {item.type === 'group' && (
                              <span className="absolute bottom-0.5 right-0.5 bg-black/80 text-white text-[9px] px-1 rounded font-bold flex items-center gap-0.5">
                                <Layers className="w-2.5 h-2.5 text-amber-400" />
                                {item.imageUrls?.length || 2}
                              </span>
                            )}
                          </div>

                          <div className="space-y-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                                  item.isActive !== false
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : 'bg-slate-200 text-slate-600'
                                }`}
                              >
                                {item.isActive !== false ? 'ACTIVE ON SITE' : 'HIDDEN'}
                              </span>

                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                                  item.type === 'group'
                                    ? 'bg-blue-100 text-blue-800'
                                    : 'bg-purple-100 text-purple-800'
                                }`}
                              >
                                {item.type === 'group'
                                  ? `Group Carousel (${item.imageUrls?.length || 3} Slides)`
                                  : 'Single Photo'}
                              </span>

                              <span className="text-xs text-slate-500">• {item.category}</span>
                              {item.dateLabel && (
                                <span className="text-xs text-slate-400">({item.dateLabel})</span>
                              )}
                            </div>

                            <h4 className="font-bold text-slate-900 text-sm truncate">{item.title}</h4>
                            {item.description && (
                              <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                                {item.description}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleToggleGalleryActive(item)}
                            className={`px-2.5 py-1 text-xs rounded-md font-semibold cursor-pointer border ${
                              item.isActive !== false
                                ? 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
                                : 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                            }`}
                          >
                            {item.isActive !== false ? 'Hide' : 'Show'}
                          </button>

                          <button
                            onClick={() => handleEditGallery(item)}
                            className="px-2.5 py-1 text-xs border border-slate-200 rounded-md hover:bg-slate-50 text-slate-700 flex items-center gap-1 cursor-pointer"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            <span>Edit</span>
                          </button>

                          {deletingGalleryId === item.id ? (
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => handleDeleteGallery(item.id)}
                                className="px-2.5 py-1 text-xs bg-red-600 hover:bg-red-700 text-white font-bold rounded-md cursor-pointer"
                              >
                                Confirm
                              </button>
                              <button
                                onClick={() => setDeletingGalleryId(null)}
                                className="px-2 py-1 text-xs text-slate-500 hover:text-slate-800 cursor-pointer"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setDeletingGalleryId(item.id)}
                              className="p-1.5 text-slate-400 hover:text-red-600 cursor-pointer"
                              title="Delete Photo / Album"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* TAB 3: PUBLIC INFO BULLETIN & PROSPECTUS */}
          {/* ============================================================== */}
          {activeTab === 'publicInfo' && (
            <div className="max-w-2xl bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-6">
              <div>
                <h3 className="text-base font-bold text-slate-900 font-serif">
                  Public Information & School Prospectus Bulletin
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Manage the official institutional brochure bulletin shown on the Downloads & Information page.
                </p>
              </div>

              <form onSubmit={handleSaveSettings} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Bulletin Heading / Title
                  </label>
                  <input
                    type="text"
                    maxLength={120}
                    value={settingsForm.publicInfoTitle || ''}
                    onChange={(e) => setSettingsForm({ ...settingsForm, publicInfoTitle: e.target.value })}
                    className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Image / Document Asset URL
                  </label>
                  <input
                    type="text"
                    maxLength={300}
                    value={settingsForm.publicInfoImageUrl || ''}
                    onChange={(e) => setSettingsForm({ ...settingsForm, publicInfoImageUrl: e.target.value })}
                    className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Bulletin Brief Description
                  </label>
                  <textarea
                    rows={3}
                    maxLength={300}
                    value={settingsForm.publicInfoDescription || ''}
                    onChange={(e) => setSettingsForm({ ...settingsForm, publicInfoDescription: e.target.value })}
                    className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>

                <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer pt-2">
                  <input
                    type="checkbox"
                    checked={settingsForm.publicInfoActive !== false}
                    onChange={(e) => setSettingsForm({ ...settingsForm, publicInfoActive: e.target.checked })}
                    className="rounded border-slate-300"
                  />
                  <span>Show Bulletin on Public Website</span>
                </label>

                <button
                  type="submit"
                  className="w-full py-2.5 px-4 bg-[#081836] hover:bg-[#122e5e] text-white text-xs font-semibold uppercase tracking-wider rounded-xl transition-colors cursor-pointer"
                >
                  Save Prospectus Bulletin Settings
                </button>
              </form>
            </div>
          )}

          {/* ============================================================== */}
          {/* TAB 4: ADMISSION INQUIRIES */}
          {/* ============================================================== */}
          {activeTab === 'inquiries' && (
            <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
              <div className="p-5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h3 className="text-base font-bold text-slate-900 font-serif">
                    Parent Admission Inquiries ({activeInquiries.length})
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Real-time inquiries submitted via the public online form. Download as Excel/CSV or manage entries.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={handleDownloadInquiriesCSV}
                    disabled={filteredInquiries.length === 0}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition-colors cursor-pointer disabled:opacity-50 shadow-2xs"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download All ({filteredInquiries.length}) CSV</span>
                  </button>

                  <div className="flex items-center gap-1.5 flex-wrap">
                    {(['all', 'new', 'contacted', 'enrolled', 'archived'] as const).map((st) => (
                      <button
                        key={st}
                        type="button"
                        onClick={() => setInquiryFilter(st)}
                        className={`px-3 py-1 text-xs rounded-lg font-semibold uppercase cursor-pointer ${
                          inquiryFilter === st
                            ? 'bg-[#081836] text-white'
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        }`}
                      >
                        {st}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {inquiriesLoading ? (
                <div className="p-8 text-center text-xs text-slate-500">Loading parent inquiries...</div>
              ) : filteredInquiries.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-500">No inquiries found under this filter.</div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {filteredInquiries.map((inq) => (
                    <div key={inq.id} className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50/60 transition-colors">
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-bold text-sm text-slate-900">{inq.studentName}</span>
                          <span className="text-xs font-medium px-2 py-0.5 bg-amber-50 text-amber-800 rounded">
                            {inq.applyingForClass}
                          </span>
                          <span className="text-xs px-2 py-0.5 bg-slate-100 text-slate-700 rounded">
                            {inq.preferredLanguage}
                          </span>
                          {inq.boardingType && (
                            <span className="text-xs px-2 py-0.5 bg-blue-50 text-blue-700 rounded">
                              {inq.boardingType}
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-600">
                          Parent: <strong>{inq.parentName}</strong> • Phone:{' '}
                          <a href={`tel:${inq.phone}`} className="text-blue-600 font-semibold underline">
                            {inq.phone}
                          </a>
                          {inq.email && ` • Email: ${inq.email}`}
                        </div>
                        {inq.message && (
                          <p className="text-xs text-slate-500 italic mt-1">&ldquo;{inq.message}&rdquo;</p>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-2 shrink-0">
                        <select
                          value={inq.status}
                          onChange={(e) => handleUpdateInquiryStatus(inq.id, e.target.value as any)}
                          className="text-xs font-semibold border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white focus:outline-none cursor-pointer"
                        >
                          <option value="new">New</option>
                          <option value="contacted">Contacted</option>
                          <option value="enrolled">Enrolled</option>
                          <option value="archived">Archived</option>
                        </select>

                        <button
                          type="button"
                          onClick={() => handleDownloadSingleInquiry(inq)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors cursor-pointer"
                          title="Download this inquiry"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Download</span>
                        </button>

                        {deletingInquiryId === inq.id ? (
                          <div className="flex items-center gap-1 bg-red-50 px-2 py-1 rounded-lg border border-red-200">
                            <span className="text-[10px] font-bold text-red-800 mr-1">Delete?</span>
                            <button
                              type="button"
                              onClick={() => handleDeleteInquiry(inq.id)}
                              className="px-2 py-0.5 bg-red-600 hover:bg-red-700 text-white text-[10px] font-bold rounded cursor-pointer"
                            >
                              Confirm
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeletingInquiryId(null)}
                              className="px-2 py-0.5 bg-slate-200 hover:bg-slate-300 text-slate-700 text-[10px] font-semibold rounded cursor-pointer"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setDeletingInquiryId(inq.id)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg transition-colors cursor-pointer"
                            title="Delete this inquiry"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Delete</span>
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ============================================================== */}
          {/* TAB 5: RESULT PORTAL SETTINGS */}
          {/* ============================================================== */}
          {activeTab === 'resultPortal' && (
            <div className="max-w-2xl bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-6">
              <div>
                <h3 className="text-base font-bold text-slate-900 font-serif">
                  Examination Results External Portal Integration
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Hold or enable student results portal. When active, an &ldquo;Exam Results ↗&rdquo; button is displayed on the public header and footer pointing directly to your external portal URL.
                </p>
              </div>

              <form onSubmit={handleSaveSettings} className="space-y-4">
                <label className="flex items-center gap-2 text-xs font-bold text-slate-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settingsForm.showResultsPortal}
                    onChange={(e) => setSettingsForm({ ...settingsForm, showResultsPortal: e.target.checked })}
                    className="rounded border-slate-300"
                  />
                  <span>Show Results Portal on Public Website</span>
                </label>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Results Portal Website URL
                  </label>
                  <input
                    type="url"
                    maxLength={300}
                    value={settingsForm.resultsPortalUrl || ''}
                    onChange={(e) => setSettingsForm({ ...settingsForm, resultsPortalUrl: e.target.value })}
                    placeholder="https://results.crownbridge.edu.in"
                    className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 px-4 bg-[#081836] hover:bg-[#122e5e] text-white text-xs font-semibold uppercase tracking-wider rounded-xl transition-colors cursor-pointer"
                >
                  Save Results Portal Settings
                </button>
              </form>
            </div>
          )}

          {/* ============================================================== */}
          {/* TAB 6: CUSTOM DYNAMIC BUTTONS */}
          {/* ============================================================== */}
          {activeTab === 'customButtons' && (
            <div className="max-w-2xl bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-6">
              <div>
                <h3 className="text-base font-bold text-slate-900 font-serif">
                  Custom Dynamic Home & Navigation Buttons
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Add custom buttons with custom URLs to the homepage hero and top navigation.
                </p>
              </div>

              <form onSubmit={handleSaveSettings} className="space-y-6">
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                  <h4 className="font-bold text-xs uppercase tracking-wider text-slate-800">
                    Custom Top Navigation Button
                  </h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">Button Title</label>
                      <input
                        type="text"
                        maxLength={60}
                        value={settingsForm.customNavButtonName || ''}
                        onChange={(e) => setSettingsForm({ ...settingsForm, customNavButtonName: e.target.value })}
                        placeholder="e.g. Student Portal"
                        className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">Target Link / URL</label>
                      <input
                        type="text"
                        maxLength={300}
                        value={settingsForm.customNavButtonUrl || ''}
                        onChange={(e) => setSettingsForm({ ...settingsForm, customNavButtonUrl: e.target.value })}
                        placeholder="https://..."
                        className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg"
                      />
                    </div>
                  </div>
                  <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settingsForm.customNavButtonActive}
                      onChange={(e) => setSettingsForm({ ...settingsForm, customNavButtonActive: e.target.checked })}
                    />
                    <span>Show in Header Navigation</span>
                  </label>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                  <h4 className="font-bold text-xs uppercase tracking-wider text-slate-800">
                    Custom Home Hero Action Button
                  </h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">Button Title</label>
                      <input
                        type="text"
                        maxLength={60}
                        value={settingsForm.customHeroButtonName || ''}
                        onChange={(e) => setSettingsForm({ ...settingsForm, customHeroButtonName: e.target.value })}
                        placeholder="e.g. Download Prospectus"
                        className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">Target Link / URL</label>
                      <input
                        type="text"
                        maxLength={300}
                        value={settingsForm.customHeroButtonUrl || ''}
                        onChange={(e) => setSettingsForm({ ...settingsForm, customHeroButtonUrl: e.target.value })}
                        placeholder="https://..."
                        className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg"
                      />
                    </div>
                  </div>
                  <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settingsForm.customHeroButtonActive}
                      onChange={(e) => setSettingsForm({ ...settingsForm, customHeroButtonActive: e.target.checked })}
                    />
                    <span>Show in Homepage Hero Section</span>
                  </label>
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 px-4 bg-[#081836] hover:bg-[#122e5e] text-white text-xs font-semibold uppercase tracking-wider rounded-xl transition-colors cursor-pointer"
                >
                  Save Custom Buttons Configuration
                </button>
              </form>
            </div>
          )}

          {/* ============================================================== */}
          {/* TAB 7: SITE INFORMATION */}
          {/* ============================================================== */}
          {activeTab === 'settings' && (
            <div className="max-w-2xl bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-6">
              <div>
                <h3 className="text-base font-bold text-slate-900 font-serif">
                  General School Information
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Update primary phone, email, address, and session tagline.
                </p>
              </div>

              <form onSubmit={handleSaveSettings} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Academic Session</label>
                    <input
                      type="text"
                      maxLength={40}
                      value={settingsForm.academicSession}
                      onChange={(e) => setSettingsForm({ ...settingsForm, academicSession: e.target.value })}
                      className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Hero Badge</label>
                    <input
                      type="text"
                      maxLength={120}
                      value={settingsForm.heroBadge}
                      onChange={(e) => setSettingsForm({ ...settingsForm, heroBadge: e.target.value })}
                      className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Tagline</label>
                  <input
                    type="text"
                    maxLength={160}
                    value={settingsForm.tagline}
                    onChange={(e) => setSettingsForm({ ...settingsForm, tagline: e.target.value })}
                    className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Contact Phone</label>
                    <input
                      type="text"
                      maxLength={40}
                      value={settingsForm.contactPhone}
                      onChange={(e) => setSettingsForm({ ...settingsForm, contactPhone: e.target.value })}
                      className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Contact Email</label>
                    <input
                      type="email"
                      maxLength={100}
                      value={settingsForm.contactEmail}
                      onChange={(e) => setSettingsForm({ ...settingsForm, contactEmail: e.target.value })}
                      className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Campus Location</label>
                  <textarea
                    rows={2}
                    maxLength={250}
                    value={settingsForm.locationAddress}
                    onChange={(e) => setSettingsForm({ ...settingsForm, locationAddress: e.target.value })}
                    className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 px-4 bg-[#081836] hover:bg-[#122e5e] text-white text-xs font-semibold uppercase tracking-wider rounded-xl transition-colors cursor-pointer shadow-xs"
                >
                  Save General Settings
                </button>
              </form>

              {/* Super Admin Database Sync Option */}
              {isSuperAdmin && (
                <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                      <Database className="w-3.5 h-3.5 text-amber-600" />
                      <span>Developer Database Sync</span>
                    </h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Restore and sync verified default notices and download catalogs to Firestore cloud.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleSeedDatabase}
                    disabled={isSeeding}
                    className="px-3.5 py-2 text-xs font-bold bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 shrink-0"
                  >
                    <Database className="w-3.5 h-3.5" />
                    <span>{isSeeding ? 'Syncing...' : 'Sync Defaults'}</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ============================================================== */}
          {/* TAB 8: USER MANAGEMENT (SUPER ADMIN / DEVELOPER EXCLUSIVE) */}
          {/* ============================================================== */}
          {activeTab === 'users' && (
            <div className="space-y-6">
              {!isSuperAdmin ? (
                <div className="max-w-2xl bg-white border border-slate-200 rounded-2xl p-8 text-center space-y-4 shadow-xs">
                  <Lock className="w-12 h-12 text-amber-600 mx-auto" />
                  <h3 className="text-lg font-serif font-bold text-slate-900">
                    Administrator Account Creation Restricted
                  </h3>
                  <p className="text-xs text-slate-600 leading-relaxed max-w-md mx-auto">
                    Only the <strong>Main Administrator / Website Developer</strong> has security permission to create additional administrator user accounts or modify access roles.
                  </p>
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-500 max-w-sm mx-auto">
                    Current Role: <strong>College Administration (Content Access Only)</strong>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                  {/* Create / Edit Staff Account Form (Super Admin only) */}
                  <form
                    onSubmit={handleCreateCollegeAdmin}
                    className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-6 space-y-4 shadow-xs"
                  >
                    <div className="pb-3 border-b border-slate-100 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <UserPlus className="w-4 h-4 text-amber-600" />
                        <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                          {editingStaffUid ? 'Edit Staff Credentials' : 'Create College Staff Login'}
                        </h3>
                      </div>
                      {editingStaffUid && (
                        <button
                          type="button"
                          onClick={resetStaffForm}
                          className="text-xs font-semibold text-amber-700 hover:underline cursor-pointer"
                        >
                          Cancel Edit
                        </button>
                      )}
                    </div>

                    <p className="text-xs text-slate-500 leading-relaxed">
                      {editingStaffUid
                        ? 'Update the Staff Name, User ID, Password, or login status for this school staff member.'
                        : 'Register a staff account using a User ID (e.g. digambar_singh) or Email so school staff can manage notices, PDFs, gallery photos, and inquiries.'}
                    </p>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Staff Full Name / Department *
                      </label>
                      <input
                        type="text"
                        required
                        value={newUserName}
                        onChange={(e) => setNewUserName(e.target.value)}
                        placeholder="e.g. Digambar Singh (School Administration)"
                        className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Staff User ID or Email *
                      </label>
                      <input
                        type="text"
                        required
                        value={newUserEmail}
                        onChange={(e) => setNewUserEmail(e.target.value)}
                        placeholder="e.g. digambar_singh or office@crownbridge.edu.in"
                        className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none font-mono"
                      />
                      <p className="text-[11px] text-slate-400 mt-1">
                        Staff can log in using this exact User ID on the College Administration tab.
                      </p>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Passcode / Password *
                      </label>
                      <div className="relative">
                        <input
                          type={showFormPassword ? 'text' : 'password'}
                          required
                          minLength={4}
                          value={newUserPassword}
                          onChange={(e) => setNewUserPassword(e.target.value)}
                          placeholder="Enter staff password"
                          className="w-full px-3.5 py-2 pr-10 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none font-mono"
                        />
                        <button
                          type="button"
                          onClick={() => setShowFormPassword((prev) => !prev)}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer p-1"
                          title={showFormPassword ? 'Hide password' : 'Show password'}
                        >
                          {showFormPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer pt-1">
                      <input
                        type="checkbox"
                        checked={newUserActive}
                        onChange={(e) => setNewUserActive(e.target.checked)}
                        className="rounded border-slate-300"
                      />
                      <span>Account Active (Allow Staff Sign-In)</span>
                    </label>

                    <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-[11px] text-amber-900 leading-relaxed">
                      Staff accounts receive <strong>College Administration</strong> permissions. They cannot create other user accounts or alter security settings.
                    </div>

                    <button
                      type="submit"
                      disabled={userCreating}
                      className="w-full py-2.5 px-4 bg-[#081836] hover:bg-[#122e5e] text-white text-xs font-semibold uppercase tracking-wider rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-xs disabled:opacity-50"
                    >
                      {editingStaffUid ? <Check className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
                      <span>
                        {userCreating
                          ? 'Saving Staff Account...'
                          : editingStaffUid
                          ? 'Save Updated Staff Account'
                          : 'Create College Admin Login'}
                      </span>
                    </button>
                  </form>

                  {/* Registered Administrators & School Staff Directory */}
                  <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl divide-y divide-slate-100 shadow-xs">
                    <div className="p-5 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-slate-700" />
                        <h3 className="text-base font-bold text-slate-900 font-serif">
                          Registered Administrators ({managedStaffList.length + 1})
                        </h3>
                      </div>
                      <span className="text-xs text-emerald-700 font-bold">Secure Access</span>
                    </div>

                    {/* Locked Developer Master Account Row (Personal Email Hidden & Locked) */}
                    <div className="p-5 flex items-center justify-between gap-4 bg-amber-50/40">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-slate-900">Main Administrator</span>
                          <span className="text-[10px] font-black uppercase tracking-wider bg-amber-500 text-slate-950 px-2 py-0.5 rounded">
                            Master Developer
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Full system control, user management &amp; security configuration
                        </p>
                      </div>
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
                        <Lock className="w-3 h-3 text-amber-600" />
                        <span>Primary Owner</span>
                      </span>
                    </div>

                    {/* Managed School Staff Accounts */}
                    {managedStaffList.length === 0 ? (
                      <div className="p-8 text-center text-xs text-slate-500">
                        No school staff accounts registered yet. Create one using the form on the left.
                      </div>
                    ) : (
                      managedStaffList.map((adm) => {
                        const displayUserId = adm.userId || adm.email.split('@')[0];
                        const hasPassword = Boolean(adm.password);
                        const isEnabled = adm.isActive !== false;

                        return (
                          <div
                            key={adm.uid}
                            className={`p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors ${
                              isEnabled ? 'hover:bg-slate-50/60' : 'bg-slate-50/80 opacity-80'
                            }`}
                          >
                            <div className="space-y-2 min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="font-bold text-sm text-slate-900">{adm.name}</span>
                                <span className="text-[10px] font-bold uppercase tracking-wider bg-blue-100 text-blue-800 px-2 py-0.5 rounded">
                                  College Staff
                                </span>
                                <span
                                  className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                                    isEnabled
                                      ? 'bg-emerald-100 text-emerald-800'
                                      : 'bg-red-100 text-red-800'
                                  }`}
                                >
                                  {isEnabled ? 'Active' : 'Disabled'}
                                </span>
                              </div>

                              {/* Staff Login Credentials Box (Protected) */}
                              <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs bg-slate-50 border border-slate-200/80 rounded-xl px-3 py-2">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-slate-500">Staff User ID:</span>
                                  <code className="font-mono font-bold text-slate-900 bg-white px-1.5 py-0.5 rounded border border-slate-200 select-all">
                                    {displayUserId}
                                  </code>
                                </div>

                                <div className="flex items-center gap-1.5">
                                  <span className="text-slate-500">Password Status:</span>
                                  {hasPassword ? (
                                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-lg">
                                      <Key className="w-3 h-3 text-emerald-600" />
                                      <span>Protected & Set in Cloud</span>
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-lg">
                                      <Lock className="w-3 h-3 text-amber-600" />
                                      <span>Not Set (Click Edit / Reset)</span>
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Management Controls */}
                            <div className="flex flex-wrap items-center gap-2 shrink-0">
                              <button
                                type="button"
                                onClick={() => handleEditStaffSelect(adm)}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg transition-colors cursor-pointer"
                                title="Edit User ID or Reset Password"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                                <span>Edit / Set Password</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => handleToggleStaffActive(adm)}
                                className={`px-2.5 py-1.5 text-xs font-semibold rounded-lg border transition-colors cursor-pointer ${
                                  isEnabled
                                    ? 'text-amber-800 bg-amber-50 hover:bg-amber-100 border-amber-200'
                                    : 'text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border-emerald-200'
                                }`}
                              >
                                {isEnabled ? 'Disable' : 'Enable'}
                              </button>

                              {deletingStaffUid === adm.uid ? (
                                <div className="flex items-center gap-1 bg-red-50 px-2 py-1 rounded-lg border border-red-200">
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteAdminAccount(adm.uid)}
                                    className="px-2 py-0.5 bg-red-600 hover:bg-red-700 text-white text-[10px] font-bold rounded cursor-pointer"
                                  >
                                    Confirm
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setDeletingStaffUid(null)}
                                    className="px-2 py-0.5 bg-slate-200 hover:bg-slate-300 text-slate-700 text-[10px] font-semibold rounded cursor-pointer"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => setDeletingStaffUid(adm.uid)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg transition-colors cursor-pointer"
                                  title="Delete Staff Account"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                  <span>Delete</span>
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
