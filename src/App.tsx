/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  collection,
  doc,
  setDoc,
  onSnapshot,
  serverTimestamp,
  getDoc,
  query,
  orderBy,
} from 'firebase/firestore';
import { onAuthStateChanged, User } from 'firebase/auth';
import {
  Menu,
  X,
  MapPin,
  Phone,
  Mail,
  CheckCircle2,
  ArrowRight,
  FileText,
  Bell,
  ShieldCheck,
  Sparkles,
  Download,
  Calendar,
  Award,
  BookOpen,
  Bus,
  Compass,
  MessageCircle,
  ExternalLink,
  Lock,
  ChevronRight,
  ChevronLeft,
  Eye,
  Clock,
  Building,
  GraduationCap,
  Cpu,
  Check,
  Maximize2,
  Camera,
  Layers,
  Image as ImageIcon,
  MoreVertical,
  MoreHorizontal,
} from 'lucide-react';
import {
  db,
  auth,
  BOOTSTRAPPED_ADMIN_EMAIL,
} from './firebase';
import {
  NoticeItem,
  DownloadDocItem,
  GalleryItem,
  SiteSettingsData,
  LearningResourceItem,
  DEFAULT_NOTICES,
  DEFAULT_DOWNLOADS,
  DEFAULT_GALLERY,
  DEFAULT_SITE_SETTINGS,
  DEFAULT_LEARNING_RESOURCES,
  VISION_MISSION,
  FIVE_LANGUAGES,
  CORE_PILLARS,
  CLASSES_COURSES,
  ADMISSION_PROCESS,
  CAMPUS_FACILITIES,
  TRANSPORT_INFO,
  SCHOOL_ASSETS,
} from './data/schoolData';
import AdminDashboard from './components/AdminDashboard';
import LearningResourcesSection from './components/LearningResourcesSection';

export type PageId =
  | 'home'
  | 'about'
  | 'academics'
  | 'classes'
  | 'facilities'
  | 'transport'
  | 'campus-life'
  | 'notices'
  | 'downloads'
  | 'learning-resources'
  | 'admissions'
  | 'contact';

interface GalleryCardItemProps {
  item: GalleryItem;
  onOpenLightbox: (item: GalleryItem, slideIdx: number) => void;
}

function GalleryCardItem({ item, onOpenLightbox }: GalleryCardItemProps) {
  const isGroup = item.type === 'group' && Array.isArray(item.imageUrls) && item.imageUrls.length > 0;
  const rawSlides = isGroup ? item.imageUrls! : [item.imageUrl];
  const slides = rawSlides.filter((s) => Boolean(s && s.trim().length > 0));
  const finalSlides = slides.length > 0 ? slides : [item.imageUrl || 'https://i.ibb.co/7xDcBy4c/IMG-20261018-WA0011.jpg'];

  const [currentSlide, setCurrentSlide] = useState(0);
  const [isHovered, setIsHovered] = useState(false);

  // Auto-advance group photo slides every 3.5 seconds
  useEffect(() => {
    if (!isGroup || finalSlides.length <= 1 || isHovered) return;
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % finalSlides.length);
    }, 3500);
    return () => clearInterval(timer);
  }, [isGroup, finalSlides.length, isHovered]);

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentSlide((prev) => (prev > 0 ? prev - 1 : finalSlides.length - 1));
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentSlide((prev) => (prev + 1) % finalSlides.length);
  };

  const activeSrc = finalSlides[currentSlide] || item.imageUrl;

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => onOpenLightbox(item, currentSlide)}
      className="group bg-white rounded-2xl overflow-hidden border border-slate-200/90 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col cursor-pointer hover:-translate-y-1"
    >
      {/* Image Media Area with Auto-Carousel */}
      <div className="relative aspect-4/3 bg-slate-900 overflow-hidden select-none">
        <img
          src={activeSrc}
          alt={item.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).src =
              'https://images.unsplash.com/photo-1580582932707-520aed937b7b?auto=format&fit=crop&w=800&q=80';
          }}
        />

        {/* Shadow Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/25 pointer-events-none" />

        {/* Badges on Top */}
        <div className="absolute top-3 left-3 flex items-center gap-1.5 z-10 flex-wrap">
          <span className="bg-[#0a1e3f]/90 backdrop-blur-xs text-amber-300 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-md border border-amber-400/30">
            {item.category}
          </span>
          {isGroup && (
            <span className="bg-blue-600/90 backdrop-blur-xs text-white text-[10px] font-bold px-2 py-1 rounded-md flex items-center gap-1 shadow-xs">
              <Layers className="w-3 h-3 text-amber-300" />
              <span>Group Carousel ({finalSlides.length})</span>
            </span>
          )}
        </div>

        {/* Expand Icon */}
        <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity z-10">
          <span className="w-8 h-8 rounded-full bg-black/60 backdrop-blur-xs text-white flex items-center justify-center hover:bg-black/90">
            <Maximize2 className="w-4 h-4 text-amber-400" />
          </span>
        </div>

        {/* Carousel Navigation Arrows */}
        {isGroup && finalSlides.length > 1 && (
          <>
            <button
              type="button"
              onClick={handlePrev}
              aria-label="Previous slide"
              className="absolute left-2.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 hover:bg-black/80 text-white flex items-center justify-center backdrop-blur-xs transition-opacity duration-200 opacity-80 hover:opacity-100 z-10 cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleNext}
              aria-label="Next slide"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 hover:bg-black/80 text-white flex items-center justify-center backdrop-blur-xs transition-opacity duration-200 opacity-80 hover:opacity-100 z-10 cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </>
        )}

        {/* Dot Indicators */}
        {isGroup && finalSlides.length > 1 && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 z-10">
            {finalSlides.map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentSlide(idx);
                }}
                className={`transition-all rounded-full cursor-pointer ${
                  currentSlide === idx
                    ? 'w-5 h-1.5 bg-amber-400'
                    : 'w-1.5 h-1.5 bg-white/60 hover:bg-white'
                }`}
                aria-label={`Go to slide ${idx + 1}`}
              />
            ))}
          </div>
        )}

        {/* Date on Bottom Right */}
        {item.dateLabel && (
          <span className="absolute bottom-3 right-3 text-[10px] font-semibold text-slate-200 bg-black/50 backdrop-blur-xs px-2 py-0.5 rounded z-10">
            {item.dateLabel}
          </span>
        )}
      </div>

      {/* Card Info Area */}
      <div className="p-5 flex-1 flex flex-col justify-between">
        <div>
          <h3 className="font-serif font-bold text-base text-slate-900 group-hover:text-amber-800 transition-colors mb-1.5 line-clamp-1">
            {item.title}
          </h3>
          {item.description && (
            <p className="text-slate-600 text-xs leading-relaxed line-clamp-2">
              {item.description}
            </p>
          )}
        </div>

        <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between text-xs text-amber-700 font-semibold">
          <span className="inline-flex items-center gap-1">
            <span>{isGroup ? `View Album (${finalSlides.length} Photos)` : 'View Full Photo'}</span>
            <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
          </span>
          <span className="text-[11px] text-slate-400">Click to expand</span>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [currentPage, setCurrentPage] = useState<PageId>('home');
  const [viewMode, setViewMode] = useState<'public' | 'admin'>('public');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [privacyModalOpen, setPrivacyModalOpen] = useState(false);

  // Auth & RBAC State
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminRole, setAdminRole] = useState<'super_admin' | 'college_admin'>('college_admin');

  // Live Firestore Data Collections (authoritative real-time sync)
  const [notices, setNotices] = useState<NoticeItem[]>([]);
  const [downloads, setDownloads] = useState<DownloadDocItem[]>(DEFAULT_DOWNLOADS);
  const [gallery, setGallery] = useState<GalleryItem[]>(DEFAULT_GALLERY);
  const [siteSettings, setSiteSettings] = useState<SiteSettingsData>(() => {
    try {
      const saved = localStorage.getItem('cbis_site_settings');
      return saved ? { ...DEFAULT_SITE_SETTINGS, ...JSON.parse(saved) } : DEFAULT_SITE_SETTINGS;
    } catch {
      return DEFAULT_SITE_SETTINGS;
    }
  });
  const [learningResources, setLearningResources] = useState<LearningResourceItem[]>(DEFAULT_LEARNING_RESOURCES);

  // Notice Board Filter
  const [noticeFilter, setNoticeFilter] = useState<'All' | NoticeItem['category']>('All');
  const [noticeSearch, setNoticeSearch] = useState('');

  // Campus Life Category Filter
  const [galleryFilter, setGalleryFilter] = useState<'All' | GalleryItem['category']>('All');

  // Interactive Lightbox State for Campus Life & Prospectus
  const [galleryLightbox, setGalleryLightbox] = useState<{
    item: GalleryItem;
    slideIndex: number;
  } | null>(null);

  const [lightboxImage, setLightboxImage] = useState<{
    title: string;
    src: string;
  } | null>(null);

  // Admission Enquiry Form State
  const [inqStudentName, setInqStudentName] = useState('');
  const [inqClass, setInqClass] = useState('Class 1 – 3');
  const [inqLanguage, setInqLanguage] = useState<'Korean' | 'Japanese' | 'German' | 'English' | 'Hindi'>('Japanese');
  const [inqBoarding, setInqBoarding] = useState<'Day Scholar' | 'Residential Hostel'>('Day Scholar');
  const [inqParentName, setInqParentName] = useState('');
  const [inqPhone, setInqPhone] = useState('');
  const [inqEmail, setInqEmail] = useState('');
  const [inqMessage, setInqMessage] = useState('');
  const [inqSubmitting, setInqSubmitting] = useState(false);
  const [inqSuccess, setInqSuccess] = useState(false);
  const [inqError, setInqError] = useState<string | null>(null);

  // Listen to Auth State
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        if (currentUser.email === BOOTSTRAPPED_ADMIN_EMAIL) {
          setIsAdmin(true);
          setAdminRole('super_admin');
          try {
            await setDoc(
              doc(db, 'admins', currentUser.uid),
              {
                uid: currentUser.uid,
                email: currentUser.email,
                name: currentUser.displayName || 'Developer / Super Admin',
                role: 'super_admin',
                createdAt: serverTimestamp(),
              },
              { merge: true }
            );
          } catch {
            // Non-fatal if offline
          }
        } else {
          try {
            const adminDoc = await getDoc(doc(db, 'admins', currentUser.uid));
            if (adminDoc.exists()) {
              setIsAdmin(true);
              const data = adminDoc.data();
              setAdminRole((data?.role as 'super_admin' | 'college_admin') || 'college_admin');
            } else {
              setIsAdmin(false);
              setAdminRole('college_admin');
            }
          } catch {
            setIsAdmin(false);
            setAdminRole('college_admin');
          }
        }
      } else {
        setIsAdmin(false);
        setAdminRole('college_admin');
      }
    });
    return () => unsub();
  }, []);

  // Listen to Site Settings
  useEffect(() => {
    const unsub = onSnapshot(
      doc(db, 'siteContent', 'settings'),
      (snap) => {
        if (snap.exists()) {
          const data = snap.data() as SiteSettingsData;
          setSiteSettings(data);
          try {
            localStorage.setItem('cbis_site_settings', JSON.stringify(data));
          } catch {
            // ignore
          }
        }
      },
      (error) => {
        console.warn('Site settings snapshot (using cached/default settings):', error);
      }
    );
    return () => unsub();
  }, []);

  // Immediate and persistent site settings save handler
  const handleSettingsSaved = (newSettings: SiteSettingsData) => {
    setSiteSettings(newSettings);
    try {
      localStorage.setItem('cbis_site_settings', JSON.stringify(newSettings));
    } catch {
      // ignore
    }
  };

  // Listen to Notices (Firestore single source of truth - no ghost resurrection)
  useEffect(() => {
    const q = query(collection(db, 'notices'));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const items = snap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        })) as NoticeItem[];
        setNotices(items);
      },
      (error) => {
        console.warn('Notices listener error:', error);
      }
    );
    return () => unsub();
  }, []);

  // Listen to Downloads collection (Firestore single source of truth)
  useEffect(() => {
    const q = query(collection(db, 'downloads'));
    const unsub = onSnapshot(
      q,
      (snap) => {
        if (!snap.empty) {
          const items = snap.docs.map((d) => ({
            id: d.id,
            ...d.data(),
          })) as DownloadDocItem[];
          items.sort((a, b) => (a.sortOrder ?? a.order ?? 1) - (b.sortOrder ?? b.order ?? 1));
          setDownloads(items);
        } else {
          setDownloads([]);
        }
      },
      (error) => {
        console.warn('Downloads listener error:', error);
      }
    );
    return () => unsub();
  }, []);

  // Notice save & delete handlers
  const handleNoticeSaved = (item: NoticeItem) => {
    setNotices((prev) => {
      const idx = prev.findIndex((n) => n.id === item.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = item;
        return next;
      }
      return [item, ...prev];
    });
  };

  const handleNoticeDeleted = (id: string) => {
    setNotices((prev) => prev.filter((item) => item.id !== id));
  };

  // Download save & delete handlers
  const handleDownloadSaved = (item: DownloadDocItem) => {
    setDownloads((prev) => {
      const idx = prev.findIndex((d) => d.id === item.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = item;
        return next;
      }
      return [...prev, item];
    });
  };

  const handleDownloadDeleted = (id: string) => {
    setDownloads((prev) => prev.filter((item) => item.id !== id));
  };

  // Listen to Gallery collection (Firestore single source of truth)
  useEffect(() => {
    const q = query(collection(db, 'gallery'));
    const unsub = onSnapshot(
      q,
      (snap) => {
        if (!snap.empty) {
          const items = snap.docs.map((d) => ({
            id: d.id,
            ...d.data(),
          })) as GalleryItem[];
          items.sort((a, b) => (a.sortOrder ?? 1) - (b.sortOrder ?? 1));
          setGallery(items);
        } else {
          setGallery([]);
        }
      },
      (error) => {
        console.warn('Gallery listener error:', error);
      }
    );
    return () => unsub();
  }, []);

  // Gallery save & delete handlers
  const handleGallerySaved = (item: GalleryItem) => {
    setGallery((prev) => {
      const idx = prev.findIndex((g) => g.id === item.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = item;
        return next;
      }
      return [item, ...prev];
    });
  };

  const handleGalleryDeleted = (id: string) => {
    setGallery((prev) => prev.filter((item) => item.id !== id));
  };

  // Listen to Learning Resources (Firestore single source of truth)
  useEffect(() => {
    const q = query(collection(db, 'learning_resources'));
    const unsub = onSnapshot(
      q,
      (snap) => {
        if (!snap.empty) {
          const items = snap.docs.map((d) => ({
            id: d.id,
            ...d.data(),
          })) as LearningResourceItem[];
          items.sort((a, b) => (a.sortOrder ?? 1) - (b.sortOrder ?? 1));
          setLearningResources(items);
        } else {
          setLearningResources([]);
        }
      },
      (error) => {
        console.warn('Learning resources listener error:', error);
      }
    );
    return () => unsub();
  }, []);

  // Learning resource save & delete handlers
  const handleLearningResourceSaved = (item: LearningResourceItem) => {
    setLearningResources((prev) => {
      const idx = prev.findIndex((r) => r.id === item.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = item;
        return next;
      }
      return [...prev, item];
    });
  };

  const handleLearningResourceDeleted = (id: string) => {
    setLearningResources((prev) => prev.filter((item) => item.id !== id));
  };

  // Submit Admission Enquiry Form
  const handleEnquirySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inqStudentName.trim() || !inqParentName.trim() || !inqPhone.trim()) {
      setInqError('Please fill in Student Name, Parent Name, and Contact Phone.');
      return;
    }
    setInqSubmitting(true);
    setInqError(null);
    const inquiryId = `inq-${Date.now()}`;
    const localRecord = {
      id: inquiryId,
      studentName: inqStudentName.trim(),
      applyingForClass: inqClass,
      preferredLanguage: inqLanguage,
      boardingType: inqBoarding,
      parentName: inqParentName.trim(),
      phone: inqPhone.trim(),
      email: inqEmail.trim() || 'not-provided@crownbridge.edu.in',
      message: inqMessage.trim() || 'General admission enquiry submitted via website.',
      status: 'new',
      timestamp: new Date().toISOString(),
    };

    try {
      const offlineInquiries = JSON.parse(localStorage.getItem('cbis_offline_inquiries') || '[]');
      offlineInquiries.unshift(localRecord);
      localStorage.setItem('cbis_offline_inquiries', JSON.stringify(offlineInquiries));
    } catch {
      // ignore local storage errors
    }

    try {
      await setDoc(doc(db, 'inquiries', inquiryId), {
        studentName: localRecord.studentName,
        applyingForClass: localRecord.applyingForClass,
        preferredLanguage: localRecord.preferredLanguage,
        boardingType: localRecord.boardingType,
        parentName: localRecord.parentName,
        phone: localRecord.phone,
        email: localRecord.email,
        message: localRecord.message,
        status: 'new',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      setInqSuccess(true);
      setInqStudentName('');
      setInqParentName('');
      setInqPhone('');
      setInqEmail('');
      setInqMessage('');
    } catch (err: unknown) {
      console.error(err);
      setInqSuccess(true);
      setInqStudentName('');
      setInqParentName('');
      setInqPhone('');
      setInqEmail('');
      setInqMessage('');
    } finally {
      setInqSubmitting(false);
    }
  };

  // Authoritative notices from Firestore (single source of truth)
  const availableNotices = notices;

  // Filtered notices for public display
  const filteredNotices = availableNotices.filter((n) => {
    const matchesCat = noticeFilter === 'All' || n.category === noticeFilter;
    const matchesSearch =
      noticeSearch.trim() === '' ||
      n.title.toLowerCase().includes(noticeSearch.toLowerCase()) ||
      n.content.toLowerCase().includes(noticeSearch.toLowerCase());
    return matchesCat && matchesSearch;
  });

  // Authoritative downloads from Firestore
  const availableDownloads = downloads;
  const activeDownloads = availableDownloads.filter((d) => d.isActive !== false);

  // Authoritative gallery from Firestore
  const availableGallery = gallery;
  const activeGallery = availableGallery.filter((g) => g.isActive !== false);
  const filteredGallery = activeGallery.filter((g) => {
    if (galleryFilter === 'All') return true;
    return g.category === galleryFilter;
  });

  // Authoritative learning resources from Firestore
  const availableLearningResources = learningResources;
  const activeLearningResources = availableLearningResources.filter((r) => r.isActive !== false);

  // Navigation Helper
  const navigateTo = (page: PageId) => {
    setCurrentPage(page);
    setMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Dynamic WhatsApp URL computed from Admin siteSettings.contactPhone
  const rawPhoneDigits = (siteSettings.contactPhone || '+919436027109').replace(/[^0-9]/g, '');
  const whatsappNumber =
    rawPhoneDigits.length === 10
      ? `91${rawPhoneDigits}`
      : rawPhoneDigits.length > 0
      ? rawPhoneDigits
      : '919436027109';
  const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(
    `Hello ${siteSettings.schoolName || 'Crownbridge International School'}, I would like to inquire about admissions.`
  )}`;

  // If Admin View is active, render the dedicated Admin Dashboard
  if (viewMode === 'admin') {
    return (
      <AdminDashboard
        user={user}
        isAdmin={isAdmin}
        adminRole={adminRole}
        notices={availableNotices}
        downloads={availableDownloads}
        gallery={availableGallery}
        learningResources={availableLearningResources}
        siteSettings={siteSettings}
        onBackToSite={() => setViewMode('public')}
        onNoticeDeleted={handleNoticeDeleted}
        onNoticeSaved={handleNoticeSaved}
        onDownloadDeleted={handleDownloadDeleted}
        onDownloadSaved={handleDownloadSaved}
        onGalleryDeleted={handleGalleryDeleted}
        onGallerySaved={handleGallerySaved}
        onLearningResourceDeleted={handleLearningResourceDeleted}
        onLearningResourceSaved={handleLearningResourceSaved}
        onSettingsSaved={handleSettingsSaved}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans antialiased selection:bg-amber-400 selection:text-slate-900">
      {/* Topmost Royal Utility Bar (Clean Public Header without Admin Button) */}
      <div className="bg-[#071326] text-amber-100 text-xs py-2 px-4 border-b border-amber-900/30">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-4 flex-wrap">
            <span className="inline-flex items-center gap-1.5 font-medium text-amber-300">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              {siteSettings.heroBadge || "State's First AI Integrated School"}
            </span>
            <span className="hidden md:inline text-slate-500">•</span>
            <span className="hidden md:inline-flex items-center gap-1 text-slate-300">
              <MapPin className="w-3.5 h-3.5 text-amber-400" />
              Nirjuli Village-I, Doimukh Road, Itanagar
            </span>
          </div>

          <div className="flex items-center gap-4 text-xs">
            <a
              href={`tel:${siteSettings.contactPhone}`}
              className="hover:text-amber-300 transition-colors inline-flex items-center gap-1"
            >
              <Phone className="w-3 h-3 text-amber-400" />
              {siteSettings.contactPhone}
            </a>
            <span className="hidden sm:inline text-slate-600">•</span>
            <a
              href={`mailto:${siteSettings.contactEmail}`}
              className="hidden sm:inline-flex items-center gap-1 hover:text-amber-300 transition-colors"
            >
              <Mail className="w-3 h-3 text-amber-400" />
              {siteSettings.contactEmail}
            </a>
          </div>
        </div>
      </div>

      {/* Main Header / Navigation */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md shadow-sm border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            {/* Logo & School Branding */}
            <button
              onClick={() => navigateTo('home')}
              className="flex items-center gap-3.5 text-left group cursor-pointer"
            >
              <div className="w-13 h-13 rounded-full overflow-hidden bg-white p-1 border-2 border-amber-400 shadow-sm shrink-0 flex items-center justify-center">
                <img
                  src={SCHOOL_ASSETS.logo}
                  alt="Crownbridge Crest"
                  className="w-full h-full object-contain rounded-full transition-transform group-hover:scale-105"
                />
              </div>
              <div>
                <span className="block text-xl sm:text-2xl font-serif font-black tracking-tight text-[#081938] uppercase">
                  Crownbridge
                </span>
                <span className="block text-[11px] sm:text-xs font-semibold tracking-wider text-amber-700 uppercase">
                  International School • Itanagar
                </span>
              </div>
            </button>

            {/* Desktop Navigation Links */}
            <nav className="hidden xl:flex items-center space-x-1 text-sm font-medium">
              {[
                { id: 'home', label: 'Home' },
                { id: 'about', label: 'About Us' },
                { id: 'academics', label: 'Academics & AI' },
                { id: 'classes', label: 'Classes' },
                { id: 'facilities', label: 'Facilities' },
                { id: 'transport', label: 'Transport' },
                ...(siteSettings.campusLifeActive !== false
                  ? [{ id: 'campus-life', label: 'Campus Life' }]
                  : []),
                { id: 'notices', label: 'Notices' },
                { id: 'downloads', label: 'Downloads' },
                { id: 'learning-resources', label: 'Learning Resources' },
                { id: 'contact', label: 'Contact' },
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => navigateTo(item.id as PageId)}
                  className={`px-3 py-2 rounded-lg transition-all cursor-pointer ${
                    currentPage === item.id
                      ? 'bg-amber-50 text-amber-900 font-semibold shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  {item.label}
                </button>
              ))}

              {/* Dynamic Custom Nav Button (from Admin) */}
              {siteSettings.customNavButtonActive && siteSettings.customNavButtonName && (
                <a
                  href={siteSettings.customNavButtonUrl || '#'}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-2 rounded-lg text-emerald-700 hover:text-emerald-900 hover:bg-emerald-50 font-medium inline-flex items-center gap-1 transition-colors"
                >
                  {siteSettings.customNavButtonName}
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}

              {/* Dynamic Results Portal Link (from Admin) */}
              {siteSettings.showResultsPortal && siteSettings.resultsPortalUrl && (
                <a
                  href={siteSettings.resultsPortalUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-2 rounded-lg bg-blue-50 text-blue-800 hover:bg-blue-100 font-semibold inline-flex items-center gap-1 transition-colors border border-blue-200"
                >
                  <Award className="w-3.5 h-3.5 text-blue-600" />
                  Exam Results ↗
                </a>
              )}
            </nav>

            {/* Action Buttons: Admission Enquiry + Single 3-Line Hamburger Menu */}
            <div className="flex items-center gap-2 sm:gap-3">
              <button
                onClick={() => navigateTo('admissions')}
                className="hidden sm:inline-flex items-center gap-2 bg-[#0a1e3f] hover:bg-[#122e5e] text-white px-4 py-2.5 rounded-lg font-semibold text-xs uppercase tracking-wider shadow-sm transition-all hover:shadow-md cursor-pointer border border-amber-500/30"
              >
                <span>Admission Enquiry</span>
                <ArrowRight className="w-3.5 h-3.5 text-amber-400" />
              </button>

              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="xl:hidden p-2 rounded-lg text-slate-700 hover:bg-slate-100 focus:outline-none cursor-pointer"
                aria-label="Toggle navigation menu"
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6 text-slate-900" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="xl:hidden bg-white border-b border-slate-200 px-4 pt-3 pb-6 shadow-xl animate-fadeIn">
            <div className="grid grid-cols-2 gap-2 text-sm font-medium mb-4">
              {[
                { id: 'home', label: 'Home Page' },
                { id: 'about', label: 'About Us' },
                { id: 'academics', label: 'Academics & AI' },
                { id: 'classes', label: 'Classes & Courses' },
                { id: 'facilities', label: 'Campus Facilities' },
                { id: 'transport', label: 'Transport Info' },
                ...(siteSettings.campusLifeActive !== false
                  ? [{ id: 'campus-life', label: 'Campus Life & Gallery' }]
                  : []),
                { id: 'notices', label: 'Notice Board' },
                { id: 'downloads', label: 'Downloads & Info' },
                { id: 'learning-resources', label: '📚 Learning Resources' },
                { id: 'contact', label: 'Contact Us' },
                { id: 'admissions', label: 'Admissions' },
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => navigateTo(item.id as PageId)}
                  className={`text-left px-3 py-2.5 rounded-lg transition-colors ${
                    currentPage === item.id
                      ? 'bg-amber-100 text-amber-900 font-bold'
                      : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>

            {/* Dynamic Results Link in Mobile */}
            {siteSettings.showResultsPortal && siteSettings.resultsPortalUrl && (
              <a
                href={siteSettings.resultsPortalUrl}
                target="_blank"
                rel="noreferrer"
                className="block w-full text-center py-2.5 mb-2 rounded-lg bg-blue-50 text-blue-800 font-semibold border border-blue-200 text-sm"
              >
                Check Student Results ↗
              </a>
            )}

            {/* Custom Nav Button in Mobile */}
            {siteSettings.customNavButtonActive && siteSettings.customNavButtonName && (
              <a
                href={siteSettings.customNavButtonUrl || '#'}
                target="_blank"
                rel="noreferrer"
                className="block w-full text-center py-2.5 mb-2 rounded-lg bg-emerald-50 text-emerald-800 font-semibold border border-emerald-200 text-sm"
              >
                {siteSettings.customNavButtonName} ↗
              </a>
            )}

            {/* Dedicated School Portals */}
            <div className="mt-3 pt-3 border-t border-slate-100">
              <div className="flex items-center justify-between mb-2 px-1">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Dedicated School Portals
                </span>
                <span className="bg-amber-100 text-amber-900 text-[10px] font-bold px-2 py-0.5 rounded-full">
                  Curriculum
                </span>
              </div>
              <div className="space-y-1.5">
                <button
                  onClick={() => navigateTo('learning-resources')}
                  className="w-full text-left p-2.5 rounded-xl bg-amber-50/90 hover:bg-amber-100 border border-amber-200/80 transition-colors flex items-center gap-3 cursor-pointer"
                >
                  <div className="w-8 h-8 rounded-lg bg-amber-500 text-slate-950 flex items-center justify-center shrink-0 shadow-xs">
                    <BookOpen className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-slate-900">Learning Resources</span>
                      <span className="bg-emerald-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded">
                        NCERT / CBSE
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 truncate">Official textbooks, worksheets & notes</p>
                  </div>
                </button>

                <button
                  onClick={() => navigateTo('downloads')}
                  className="w-full text-left p-2 rounded-lg hover:bg-slate-50 transition-colors flex items-center gap-2.5 cursor-pointer text-slate-700"
                >
                  <FileText className="w-4 h-4 text-slate-400" />
                  <span className="text-xs font-medium">Download Prospectus & Forms</span>
                </button>

                <button
                  onClick={() => navigateTo('notices')}
                  className="w-full text-left p-2 rounded-lg hover:bg-slate-50 transition-colors flex items-center gap-2.5 cursor-pointer text-slate-700"
                >
                  <Bell className="w-4 h-4 text-slate-400" />
                  <span className="text-xs font-medium">Circulars & Notice Board</span>
                </button>
              </div>
            </div>

            <div className="pt-3 mt-3 border-t border-slate-100 flex items-center gap-2">
              <button
                onClick={() => navigateTo('admissions')}
                className="flex-1 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-center py-2.5 rounded-lg text-sm cursor-pointer shadow-sm"
              >
                Enrol / Inquire Now
              </button>
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  setViewMode('admin');
                }}
                className="px-3.5 py-2.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-100 text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer shrink-0"
                title="Staff Portal Login"
              >
                <Lock className="w-3.5 h-3.5 text-slate-500" />
                <span>Staff Portal</span>
              </button>
            </div>
          </div>
        )}
      </header>

      {/* Main Multi-Page Content Router */}
      <main className="flex-1">
        {/* PAGE 1: HOME (CLEAN, MINIMAL, GATEWAY ORIENTED, NO DATA DUMP) */}
        {currentPage === 'home' && (
          <div>
            {/* Urgent Notice Strip if any */}
            {availableNotices.length > 0 && (
              <div className="bg-amber-500/10 border-b border-amber-300/40 text-amber-950 px-4 py-2 text-xs sm:text-sm">
                <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 overflow-hidden truncate">
                    <span className="bg-amber-500 text-slate-950 px-2 py-0.5 rounded font-black text-[10px] tracking-wide uppercase shrink-0">
                      Announcement
                    </span>
                    <span className="font-semibold truncate">
                      {availableNotices[0].title}
                    </span>
                  </div>
                  <button
                    onClick={() => navigateTo('notices')}
                    className="shrink-0 text-xs font-bold text-amber-900 hover:text-amber-950 underline inline-flex items-center gap-0.5 cursor-pointer"
                  >
                    View All ({availableNotices.length}) <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}

            {/* Hero Section */}
            <section className="relative bg-gradient-to-b from-[#061226] via-[#091b3b] to-[#0d2650] text-white py-16 sm:py-24 px-4 overflow-hidden border-b border-amber-600/20">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-amber-500/10 via-transparent to-transparent pointer-events-none" />
              <div className="max-w-6xl mx-auto text-center relative z-10">
                {/* Crest Emblem - Perfectly Circular Royal Medallion */}
                <div className="inline-block mb-6 relative">
                  <div className="w-28 h-28 sm:w-32 sm:h-32 mx-auto bg-white rounded-full p-2 border-4 border-amber-400 ring-4 ring-amber-400/25 shadow-2xl overflow-hidden flex items-center justify-center">
                    <img
                      src={SCHOOL_ASSETS.logo}
                      alt="Crownbridge Crest"
                      className="w-full h-full object-contain rounded-full"
                    />
                  </div>
                  <span className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 bg-amber-500 text-slate-950 font-black text-[10px] tracking-widest px-3 py-0.5 rounded-full uppercase shadow whitespace-nowrap">
                    Session {siteSettings.academicSession}
                  </span>
                </div>

                {/* Main Titles */}
                <h1 className="text-3xl sm:text-5xl lg:text-6xl font-serif font-black tracking-tight text-white mb-4 uppercase">
                  Crownbridge <span className="text-amber-400">International</span> School
                </h1>
                <p className="text-base sm:text-xl font-medium text-amber-200/90 max-w-3xl mx-auto mb-6">
                  {siteSettings.heroBadge || "State's First AI Integrated School"}
                  <span className="block text-slate-300 text-sm sm:text-base font-normal mt-1">
                    {siteSettings.tagline || 'Bridging Knowledge to Excellence'} • Doimukh Road, Nirjuli, Itanagar
                  </span>
                </p>

                {/* 5 Language Badges */}
                <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 mb-10 max-w-3xl mx-auto">
                  <span className="text-xs font-semibold text-amber-300 uppercase tracking-wider mr-1">
                    5-Language Immersion:
                  </span>
                  {[
                    { lang: 'English', sub: 'Global' },
                    { lang: 'Hindi', sub: 'National' },
                    { lang: 'German', sub: 'Deutsch' },
                    { lang: 'Japanese', sub: '日本語' },
                    { lang: 'Korean', sub: '한국어' },
                  ].map((l) => (
                    <span
                      key={l.lang}
                      className="px-3 py-1 rounded-full bg-white/10 hover:bg-white/15 border border-amber-300/30 text-xs text-white font-medium backdrop-blur-xs transition-colors"
                    >
                      <strong className="text-amber-300">{l.lang}</strong>{' '}
                      <span className="text-slate-300 text-[10px]">({l.sub})</span>
                    </span>
                  ))}
                </div>

                {/* Action Buttons */}
                <div className="flex flex-wrap items-center justify-center gap-4">
                  <button
                    onClick={() => navigateTo('admissions')}
                    className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-7 py-3.5 rounded-xl shadow-lg hover:shadow-amber-500/20 text-sm tracking-wide uppercase transition-all flex items-center gap-2 cursor-pointer"
                  >
                    <span>Admissions Open (Pre-Nur to Cl 10)</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => navigateTo('academics')}
                    className="bg-white/10 hover:bg-white/20 text-white font-semibold px-6 py-3.5 rounded-xl border border-white/20 text-sm transition-all flex items-center gap-2 cursor-pointer"
                  >
                    <span>Explore Academics & AI</span>
                    <Sparkles className="w-4 h-4 text-amber-400" />
                  </button>

                  {/* Dynamic Hero Button (from Admin) */}
                  {siteSettings.customHeroButtonActive && siteSettings.customHeroButtonName && (
                    <a
                      href={siteSettings.customHeroButtonUrl || '#'}
                      target="_blank"
                      rel="noreferrer"
                      className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-6 py-3.5 rounded-xl text-sm transition-all flex items-center gap-2 shadow"
                    >
                      <span>{siteSettings.customHeroButtonName}</span>
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  )}
                </div>
              </div>
            </section>

            {/* Quick Metrics Bar */}
            <section className="bg-white border-b border-slate-200 py-6 px-4">
              <div className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
                <div className="p-3">
                  <div className="text-2xl sm:text-3xl font-black text-[#0a1e3f] font-serif">1st in State</div>
                  <div className="text-xs text-slate-500 font-medium mt-1">AI Integrated School System</div>
                </div>
                <div className="p-3 border-l border-slate-100">
                  <div className="text-2xl sm:text-3xl font-black text-amber-600 font-serif">5 Languages</div>
                  <div className="text-xs text-slate-500 font-medium mt-1">English, Hindi, German, Japanese, Korean</div>
                </div>
                <div className="p-3 border-l border-slate-100">
                  <div className="text-2xl sm:text-3xl font-black text-[#0a1e3f] font-serif">100% Secure</div>
                  <div className="text-xs text-slate-500 font-medium mt-1">Separate Hostels for Boys & Girls</div>
                </div>
                <div className="p-3 border-l border-slate-100">
                  <div className="text-2xl sm:text-3xl font-black text-emerald-600 font-serif">Pre-Nur to 10</div>
                  <div className="text-xs text-slate-500 font-medium mt-1">Holistic Academic Continuum</div>
                </div>
              </div>
            </section>

            {/* Clean Gateway Hub: Multi-Page Portals */}
            <section className="py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
              <div className="text-center max-w-2xl mx-auto mb-12">
                <span className="text-amber-600 font-bold text-xs tracking-wider uppercase">
                  Explore Crownbridge
                </span>
                <h2 className="text-2xl sm:text-4xl font-serif font-black text-[#07152d] mt-1">
                  Dedicated School Portals
                </h2>
                <p className="text-slate-600 text-sm sm:text-base mt-2">
                  Select a section below or use the top menu to view detailed information.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* 1. About Us */}
                <div
                  onClick={() => navigateTo('about')}
                  className="group bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md hover:border-amber-400 transition-all cursor-pointer flex flex-col justify-between"
                >
                  <div>
                    <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                      <GraduationCap className="w-6 h-6" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 group-hover:text-amber-700 transition-colors">
                      About Us & Vision
                    </h3>
                    <p className="text-slate-600 text-xs sm:text-sm mt-2 line-clamp-3">
                      Discover our founding philosophy, vision, mission, and commitment to building tomorrow&apos;s global leaders.
                    </p>
                  </div>
                  <div className="mt-5 flex items-center gap-1 text-xs font-bold text-amber-700">
                    <span>Learn More</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>

                {/* 2. Academics & AI */}
                <div
                  onClick={() => navigateTo('academics')}
                  className="group bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md hover:border-blue-400 transition-all cursor-pointer flex flex-col justify-between"
                >
                  <div>
                    <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                      <Cpu className="w-6 h-6" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 group-hover:text-blue-700 transition-colors">
                      Academics & 5 Languages
                    </h3>
                    <p className="text-slate-600 text-xs sm:text-sm mt-2 line-clamp-3">
                      AI curriculum, robotics, smart labs, and immersion in English, Hindi, German, Japanese, and Korean.
                    </p>
                  </div>
                  <div className="mt-5 flex items-center gap-1 text-xs font-bold text-blue-700">
                    <span>Explore Curriculum</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>

                {/* 3. Classes & Wings */}
                <div
                  onClick={() => navigateTo('classes')}
                  className="group bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md hover:border-emerald-400 transition-all cursor-pointer flex flex-col justify-between"
                >
                  <div>
                    <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                      <BookOpen className="w-6 h-6" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 group-hover:text-emerald-700 transition-colors">
                      Classes & Courses
                    </h3>
                    <p className="text-slate-600 text-xs sm:text-sm mt-2 line-clamp-3">
                      Pre-Nursery, Kindergarten, Primary (1–5), Middle (6–8), and Secondary (9–10) programs.
                    </p>
                  </div>
                  <div className="mt-5 flex items-center gap-1 text-xs font-bold text-emerald-700">
                    <span>View Class Wings</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>

                {/* 4. Facilities & Hostels */}
                <div
                  onClick={() => navigateTo('facilities')}
                  className="group bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md hover:border-purple-400 transition-all cursor-pointer flex flex-col justify-between"
                >
                  <div>
                    <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                      <Building className="w-6 h-6" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 group-hover:text-purple-700 transition-colors">
                      Campus & Hostels
                    </h3>
                    <p className="text-slate-600 text-xs sm:text-sm mt-2 line-clamp-3">
                      Separate residential hostels for boys & girls, dining mess, sports arena, and 24/7 CCTV security.
                    </p>
                  </div>
                  <div className="mt-5 flex items-center gap-1 text-xs font-bold text-purple-700">
                    <span>View Campus</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>

                {/* 5. Safe Transport */}
                <div
                  onClick={() => navigateTo('transport')}
                  className="group bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md hover:border-amber-400 transition-all cursor-pointer flex flex-col justify-between"
                >
                  <div>
                    <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-800 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                      <Bus className="w-6 h-6" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 group-hover:text-amber-800 transition-colors">
                      Transport & Bus Routes
                    </h3>
                    <p className="text-slate-600 text-xs sm:text-sm mt-2 line-clamp-3">
                      GPS-tracked buses covering Nirjuli, Doimukh, Borum, Naharlagun, and Itanagar with trained attendants.
                    </p>
                  </div>
                  <div className="mt-5 flex items-center gap-1 text-xs font-bold text-amber-800">
                    <span>Check Routes</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>

                {/* 6. Notice Board */}
                <div
                  onClick={() => navigateTo('notices')}
                  className="group bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md hover:border-red-400 transition-all cursor-pointer flex flex-col justify-between"
                >
                  <div>
                    <div className="w-12 h-12 rounded-xl bg-red-50 text-red-700 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                      <Bell className="w-6 h-6" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 group-hover:text-red-700 transition-colors">
                      Official Notice Board
                    </h3>
                    <p className="text-slate-600 text-xs sm:text-sm mt-2 line-clamp-3">
                      Latest announcements, examination dates, circulars, and official updates from the administration.
                    </p>
                  </div>
                  <div className="mt-5 flex items-center gap-1 text-xs font-bold text-red-700">
                    <span>Read Notices ({availableNotices.length})</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>

                {/* 7. Downloads & Info */}
                <div
                  onClick={() => navigateTo('downloads')}
                  className="group bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md hover:border-indigo-400 transition-all cursor-pointer flex flex-col justify-between"
                >
                  <div>
                    <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                      <Download className="w-6 h-6" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 group-hover:text-indigo-700 transition-colors">
                      Downloads & Public Info
                    </h3>
                    <p className="text-slate-600 text-xs sm:text-sm mt-2 line-clamp-3">
                      Syllabus, admission forms, school calendar, and official public information prospectus bulletin.
                    </p>
                  </div>
                  <div className="mt-5 flex items-center gap-1 text-xs font-bold text-indigo-700">
                    <span>Access Files</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>

                {/* 8. Learning Resources (CBSE & NCERT) */}
                <div
                  onClick={() => navigateTo('learning-resources')}
                  className="group bg-gradient-to-b from-amber-50/50 via-white to-white p-6 rounded-2xl border border-amber-200 shadow-xs hover:shadow-lg hover:border-amber-400 transition-all cursor-pointer flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-900 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <BookOpen className="w-6 h-6 text-amber-800" />
                      </div>
                      <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-md bg-emerald-100 text-emerald-800 border border-emerald-200">
                        NCERT • CBSE
                      </span>
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 group-hover:text-amber-800 transition-colors">
                      Learning Resources
                    </h3>
                    <p className="text-slate-600 text-xs sm:text-sm mt-1 line-clamp-3">
                      Verified official NCERT e-textbooks, CBSE curriculum, practice worksheets, and digital study portals for Classes Pre-Primary to 10.
                    </p>
                  </div>
                  <div className="mt-5 flex items-center gap-1.5 text-xs font-bold text-amber-800">
                    <span>Open Learning Hub</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>

                {/* 9. Admissions */}
                <div
                  onClick={() => navigateTo('admissions')}
                  className="group bg-gradient-to-br from-[#081836] to-[#0d285a] text-white p-6 rounded-2xl border border-amber-400/40 shadow-sm hover:shadow-lg transition-all cursor-pointer flex flex-col justify-between"
                >
                  <div>
                    <div className="w-12 h-12 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center mb-4 font-bold">
                      <Sparkles className="w-6 h-6" />
                    </div>
                    <h3 className="text-lg font-bold text-white group-hover:text-amber-300 transition-colors">
                      Admissions 2027–28
                    </h3>
                    <p className="text-slate-300 text-xs sm:text-sm mt-2 line-clamp-3">
                      Review the 4-step admission process roadmap and submit an instant online enquiry.
                    </p>
                  </div>
                  <div className="mt-5 flex items-center gap-1 text-xs font-bold text-amber-300">
                    <span>Apply / Inquire Online</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </div>
            </section>

            {/* Campus Life & Events Highlights Showcase (Toggled ON/OFF via Admin) */}
            {siteSettings.campusLifeActive !== false && activeGallery.length > 0 && (
              <section className="py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto border-t border-slate-200">
                <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="bg-amber-100 text-amber-900 font-bold text-[10px] tracking-wider uppercase px-2.5 py-0.5 rounded-full">
                        Campus Life & Events
                      </span>
                      <span className="text-xs text-slate-400">• Multi-Slide Carousels</span>
                    </div>
                    <h2 className="text-2xl sm:text-4xl font-serif font-black text-[#07152d] mt-2">
                      Vibrant Moments & Campus Tour
                    </h2>
                    <p className="text-slate-600 text-sm sm:text-base mt-2 max-w-2xl">
                      Take a visual journey through robotics studios, cultural festivals, sports tournaments, and student life at Crownbridge.
                    </p>
                  </div>

                  <button
                    onClick={() => navigateTo('campus-life')}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#081836] hover:bg-[#122e5e] text-white text-xs font-bold uppercase tracking-wider transition-colors shadow-sm cursor-pointer self-start md:self-auto shrink-0"
                  >
                    <span>View All Albums ({activeGallery.length})</span>
                    <ArrowRight className="w-3.5 h-3.5 text-amber-400" />
                  </button>
                </div>

                {/* 3-Card Interactive Grid featuring top events */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {activeGallery.slice(0, 3).map((item) => (
                    <GalleryCardItem
                      key={item.id}
                      item={item}
                      onOpenLightbox={(galItem, slideIdx) => {
                        setGalleryLightbox({ item: galItem, slideIndex: slideIdx });
                      }}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* Quick Campus Overview Strip */}
            <section className="bg-slate-100 py-12 px-4 border-t border-slate-200">
              <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6 bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
                <div className="max-w-xl">
                  <span className="text-xs font-bold uppercase tracking-wider text-amber-600">
                    Visit Our Campus
                  </span>
                  <h3 className="text-xl sm:text-2xl font-serif font-black text-slate-900 mt-1">
                    Experience Arunachal Pradesh&apos;s First AI-Integrated Campus
                  </h3>
                  <p className="text-slate-600 text-sm mt-2">
                    Located on Doimukh Road, behind SP Office, Borum, Nirjuli. We welcome parents for campus walkthroughs and counseling.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    onClick={() => navigateTo('contact')}
                    className="px-5 py-3 rounded-xl bg-[#081836] hover:bg-[#122e5e] text-white font-semibold text-xs uppercase tracking-wider transition-colors cursor-pointer"
                  >
                    Get Directions & Hours
                  </button>
                  <a
                    href={whatsappUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="px-5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs uppercase tracking-wider inline-flex items-center gap-2 transition-colors"
                  >
                    <MessageCircle className="w-4 h-4" />
                    WhatsApp Chat
                  </a>
                </div>
              </div>
            </section>
          </div>
        )}

        {/* PAGE 2: ABOUT US */}
        {currentPage === 'about' && (
          <div className="py-12 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto">
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-xs font-medium text-slate-500 mb-6">
              <button onClick={() => navigateTo('home')} className="hover:text-amber-700 cursor-pointer">
                Home
              </button>
              <ChevronRight className="w-3.5 h-3.5" />
              <span className="text-slate-900 font-semibold">About Us</span>
            </div>

            {/* Header Banner */}
            <div className="bg-[#07152d] text-white p-8 sm:p-12 rounded-2xl shadow-sm mb-12 border-l-4 border-amber-500">
              <span className="text-amber-400 font-bold text-xs uppercase tracking-widest">
                Our Heritage & Ambition
              </span>
              <h1 className="text-3xl sm:text-5xl font-serif font-black mt-2 mb-4">
                Bridging Knowledge to Excellence
              </h1>
              <p className="text-slate-300 text-sm sm:text-base max-w-3xl leading-relaxed">
                Crownbridge International School in Nirjuli, Itanagar is committed to pioneering modern education in Arunachal Pradesh. By harmonizing global languages, state-of-the-art AI technology, and deep rooted human values, we prepare students to lead confidently in an interconnected world.
              </p>
            </div>

            {/* Vision & Mission Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
              <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
                <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center mb-4">
                  <Compass className="w-6 h-6" />
                </div>
                <h2 className="text-xl font-serif font-bold text-slate-900 mb-2">{VISION_MISSION.vision.heading}</h2>
                <p className="text-slate-600 text-sm leading-relaxed mb-4">
                  {VISION_MISSION.vision.quote}
                </p>
                <div className="space-y-2 pt-2 border-t border-slate-100">
                  {VISION_MISSION.vision.details.map((detail, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-xs text-slate-700">
                      <Check className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                      <span>{detail}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
                <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center mb-4">
                  <Award className="w-6 h-6" />
                </div>
                <h2 className="text-xl font-serif font-bold text-slate-900 mb-2">{VISION_MISSION.mission.heading}</h2>
                <p className="text-slate-600 text-sm leading-relaxed mb-4">
                  {VISION_MISSION.mission.quote}
                </p>
                <div className="space-y-2 pt-2 border-t border-slate-100">
                  {VISION_MISSION.mission.pillars.map((pillar) => (
                    <div key={pillar.title} className="text-xs bg-slate-50 p-2.5 rounded-lg border border-slate-100 text-slate-700">
                      <strong className="text-slate-900 font-semibold">{pillar.title}:</strong> {pillar.text}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Core Values */}
            <div className="bg-white p-8 sm:p-10 rounded-2xl border border-slate-200 shadow-sm mb-12">
              <h2 className="text-2xl font-serif font-bold text-slate-900 mb-6 text-center">
                Our Core Pillars & Institutional Values
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {CORE_PILLARS.map((pillar) => (
                  <div key={pillar.title} className="p-5 rounded-xl bg-slate-50 border border-slate-100">
                    <h3 className="font-bold text-slate-900 text-base mb-1.5 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-amber-600 shrink-0" />
                      {pillar.title}
                    </h3>
                    <p className="text-slate-600 text-xs leading-relaxed">
                      {pillar.summary}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Leadership Message */}
            <div className="bg-gradient-to-r from-amber-500/10 via-amber-100/30 to-amber-500/10 p-8 rounded-2xl border border-amber-300/40 text-center max-w-3xl mx-auto">
              <h3 className="text-xl font-serif font-bold text-[#07152d] mb-2">
                A Message from the Leadership
              </h3>
              <p className="text-slate-700 text-sm italic leading-relaxed mb-4">
                &ldquo;At Crownbridge, we believe that education is not merely the transmission of facts, but the ignition of creative and analytical potential. By integrating artificial intelligence and East-West languages right from the primary years, we provide our students an authentic global advantage.&rdquo;
              </p>
              <div className="text-xs font-bold text-amber-900 uppercase tracking-widest">
                Academic Advisory Council • Crownbridge International School
              </div>
            </div>
          </div>
        )}

        {/* PAGE 3: ACADEMICS & AI */}
        {currentPage === 'academics' && (
          <div className="py-12 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto">
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-xs font-medium text-slate-500 mb-6">
              <button onClick={() => navigateTo('home')} className="hover:text-amber-700 cursor-pointer">
                Home
              </button>
              <ChevronRight className="w-3.5 h-3.5" />
              <span className="text-slate-900 font-semibold">Academics & AI</span>
            </div>

            {/* Header Banner */}
            <div className="bg-[#07152d] text-white p-8 sm:p-12 rounded-2xl shadow-sm mb-12 border-l-4 border-blue-500">
              <span className="text-blue-400 font-bold text-xs uppercase tracking-widest">
                Future-Ready Education
              </span>
              <h1 className="text-3xl sm:text-5xl font-serif font-black mt-2 mb-4">
                State&apos;s First AI Integrated School
              </h1>
              <p className="text-slate-300 text-sm sm:text-base max-w-3xl leading-relaxed">
                Crownbridge International School redefines school learning with deep computational integration, hands-on robotics, and a flagship 5-Language Immersion Program designed for 21st-century global citizenship.
              </p>
            </div>

            {/* 5-Language Program Full Showcase */}
            <div className="mb-14">
              <div className="text-center max-w-2xl mx-auto mb-8">
                <span className="text-amber-600 font-bold text-xs uppercase tracking-wider">
                  Global Communication for a Brighter Tomorrow
                </span>
                <h2 className="text-2xl sm:text-3xl font-serif font-black text-slate-900 mt-1">
                  The Flagship 5-Language Program
                </h2>
                <p className="text-slate-600 text-xs sm:text-sm mt-2">
                  Students develop multilingual cognitive agility, global cultural appreciation, and competitive international career pathways.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5">
                {FIVE_LANGUAGES.map((lang) => (
                  <div
                    key={lang.name}
                    className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col justify-between hover:border-amber-400 hover:shadow-md transition-all text-center"
                  >
                    <div>
                      <span className="inline-block text-xs font-bold text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full mb-2">
                        {lang.index} • {lang.region}
                      </span>
                      <h3 className="font-serif font-bold text-lg text-slate-900">{lang.name}</h3>
                      <div className="text-xs font-semibold text-amber-700 mb-2">{lang.nativeScript}</div>
                      <span className="inline-block bg-slate-100 text-slate-700 text-[11px] px-2.5 py-0.5 rounded-full font-medium mb-3">
                        {lang.role}
                      </span>
                      <p className="text-slate-600 text-xs leading-relaxed text-left">
                        {lang.description}
                      </p>
                    </div>
                    <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] font-bold text-slate-700">
                      {lang.landmark}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 5 Core Academic Pillars */}
            <div className="bg-white p-8 sm:p-10 rounded-2xl border border-slate-200 shadow-sm mb-12">
              <h2 className="text-2xl font-serif font-bold text-slate-900 mb-6 text-center">
                Core Academic Pillars
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {CORE_PILLARS.map((pillar) => (
                  <div key={pillar.title} className="p-6 rounded-xl bg-slate-50 border border-slate-100">
                    <div className="w-10 h-10 rounded-lg bg-blue-100 text-blue-800 flex items-center justify-center font-bold mb-3">
                      <Sparkles className="w-5 h-5" />
                    </div>
                    <h3 className="font-bold text-slate-900 text-base mb-2">{pillar.title}</h3>
                    <p className="text-slate-600 text-xs sm:text-sm leading-relaxed">{pillar.summary}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* AI & Robotics Curriculum Details */}
            <div className="bg-slate-900 text-white p-8 sm:p-10 rounded-2xl shadow-sm mb-12">
              <div className="max-w-3xl">
                <span className="text-amber-400 font-bold text-xs uppercase tracking-widest">
                  STEM & Innovation
                </span>
                <h2 className="text-2xl sm:text-3xl font-serif font-bold mt-1 mb-4">
                  Hands-on AI Lab & Computational Thinking
                </h2>
                <p className="text-slate-300 text-sm leading-relaxed mb-6">
                  Starting in primary classes, our students participate in interactive problem-solving modules, visual block programming, robotics kits, and ethical AI awareness sessions led by certified educators.
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
                  <div className="bg-white/5 p-4 rounded-xl border border-white/10">
                    <div className="text-amber-400 font-bold text-xl mb-1">Scratch & Block</div>
                    <div className="text-xs text-slate-300">Junior Logic Building</div>
                  </div>
                  <div className="bg-white/5 p-4 rounded-xl border border-white/10">
                    <div className="text-amber-400 font-bold text-xl mb-1">Python & AI</div>
                    <div className="text-xs text-slate-300">Middle & Senior Coding</div>
                  </div>
                  <div className="bg-white/5 p-4 rounded-xl border border-white/10">
                    <div className="text-amber-400 font-bold text-xl mb-1">Robotics Kits</div>
                    <div className="text-xs text-slate-300">Sensors & Microcontrollers</div>
                  </div>
                  <div className="bg-white/5 p-4 rounded-xl border border-white/10">
                    <div className="text-amber-400 font-bold text-xl mb-1">Smart Labs</div>
                    <div className="text-xs text-slate-300">1:1 Digital Devices</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* PAGE 4: CLASSES & COURSES */}
        {currentPage === 'classes' && (
          <div className="py-12 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto">
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-xs font-medium text-slate-500 mb-6">
              <button onClick={() => navigateTo('home')} className="hover:text-amber-700 cursor-pointer">
                Home
              </button>
              <ChevronRight className="w-3.5 h-3.5" />
              <span className="text-slate-900 font-semibold">Classes & Courses</span>
            </div>

            {/* Header Banner */}
            <div className="bg-[#07152d] text-white p-8 sm:p-12 rounded-2xl shadow-sm mb-12 border-l-4 border-emerald-500">
              <span className="text-emerald-400 font-bold text-xs uppercase tracking-widest">
                Academic Continuum
              </span>
              <h1 className="text-3xl sm:text-5xl font-serif font-black mt-2 mb-4">
                Classes & Pedagogical Wings
              </h1>
              <p className="text-slate-300 text-sm sm:text-base max-w-3xl leading-relaxed">
                From foundational early-childhood development to rigorous secondary preparation, our curriculum is structured to support every developmental stage with personalized care and intellectual stimulation.
              </p>
            </div>

            {/* Class Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
              {CLASSES_COURSES.map((course) => (
                <div
                  key={course.wing}
                  className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-black uppercase tracking-wider text-amber-700 bg-amber-50 px-3 py-1 rounded-full">
                        {course.classes}
                      </span>
                    </div>
                    <h2 className="text-2xl font-serif font-bold text-slate-900 mb-3">{course.wing}</h2>
                    <p className="text-slate-600 text-sm leading-relaxed mb-6">{course.focus}</p>

                    <div>
                      <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">
                        Key Curriculum Highlights:
                      </h3>
                      <div className="space-y-1.5">
                        {course.highlights.map((h) => (
                          <div key={h} className="text-xs bg-slate-50 border border-slate-200 p-2 rounded-lg text-slate-700 flex items-center gap-2">
                            <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            <span>{h}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="mt-8 pt-4 border-t border-slate-100">
                    <button
                      onClick={() => {
                        setInqClass(course.classes);
                        navigateTo('admissions');
                      }}
                      className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs uppercase tracking-wider transition-colors flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <span>Inquire for {course.classes}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Daily Schedule Overview */}
            <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
              <h2 className="text-xl font-serif font-bold text-slate-900 mb-4">
                A Balanced School Day
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-sm text-slate-600">
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="font-bold text-slate-900 mb-1 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-amber-600" /> Morning Assembly & Academics
                  </div>
                  <p className="text-xs">
                    Multilingual morning thought, core STEM concepts, language laboratories, and interactive problem solving.
                  </p>
                </div>
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="font-bold text-slate-900 mb-1 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-blue-600" /> Midday Nutrition & Activity
                  </div>
                  <p className="text-xs">
                    Nutritious wholesome lunch, guided sports, robotics innovation time, and co-curricular fine arts.
                  </p>
                </div>
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="font-bold text-slate-900 mb-1 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-emerald-600" /> Evening Prep (Hostellers)
                  </div>
                  <p className="text-xs">
                    Supervised homework support, reading circles, recreational fitness, and values mentorship.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* PAGE 5: FACILITIES & HOSTELS */}
        {currentPage === 'facilities' && (
          <div className="py-12 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto">
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-xs font-medium text-slate-500 mb-6">
              <button onClick={() => navigateTo('home')} className="hover:text-amber-700 cursor-pointer">
                Home
              </button>
              <ChevronRight className="w-3.5 h-3.5" />
              <span className="text-slate-900 font-semibold">Campus Facilities</span>
            </div>

            {/* Header Banner */}
            <div className="bg-[#07152d] text-white p-8 sm:p-12 rounded-2xl shadow-sm mb-12 border-l-4 border-purple-500">
              <span className="text-purple-400 font-bold text-xs uppercase tracking-widest">
                Safe & Modern Infrastructure
              </span>
              <h1 className="text-3xl sm:text-5xl font-serif font-black mt-2 mb-4">
                World-Class Campus Facilities
              </h1>
              <p className="text-slate-300 text-sm sm:text-base max-w-3xl leading-relaxed">
                Designed to nurture curiosity, physical strength, and safety, our campus features separate residential hostels for boys & girls, advanced digital laboratories, hygienic dining, and lush green grounds.
              </p>
            </div>

            {/* Facilities Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
              {CAMPUS_FACILITIES.map((facility) => (
                <div
                  key={facility.title}
                  className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:border-amber-400 hover:shadow-md transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-800 flex items-center justify-center font-bold mb-4">
                      <CheckCircle2 className="w-6 h-6 text-amber-600" />
                    </div>
                    <span className="text-[10px] uppercase font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded">
                      {facility.category}
                    </span>
                    <h3 className="text-lg font-serif font-bold text-slate-900 mt-2 mb-2">
                      {facility.title}
                    </h3>
                    <p className="text-slate-600 text-xs sm:text-sm leading-relaxed mb-4">
                      {facility.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Hostel Highlights Focus */}
            <div className="bg-gradient-to-br from-amber-500/10 via-white to-amber-500/10 p-8 rounded-2xl border border-amber-200 shadow-sm">
              <div className="max-w-3xl">
                <span className="text-xs font-bold text-amber-700 uppercase tracking-wider">
                  Residential Excellence
                </span>
                <h2 className="text-2xl font-serif font-bold text-slate-900 mt-1 mb-3">
                  Separate Boys & Girls Hostels
                </h2>
                <p className="text-slate-600 text-sm leading-relaxed mb-4">
                  For parents seeking holistic residential schooling, Crownbridge provides secure boarding with resident wardens, 24/7 CCTV vigilance, monitored recreation, hygienic nutritious meal plans, and regular parent video communication.
                </p>
                <div className="flex flex-wrap gap-4 text-xs font-semibold text-slate-800">
                  <span className="bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-xs">
                    ✓ Resident Wardens & Matrons
                  </span>
                  <span className="bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-xs">
                    ✓ 24/7 Infirmary & Doctor On-Call
                  </span>
                  <span className="bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-xs">
                    ✓ Supervised Evening Study Hours
                  </span>
                  <span className="bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-xs">
                    ✓ Wholesome Vegetarian & Non-Veg Meals
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* PAGE 6: TRANSPORT */}
        {currentPage === 'transport' && (
          <div className="py-12 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto">
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-xs font-medium text-slate-500 mb-6">
              <button onClick={() => navigateTo('home')} className="hover:text-amber-700 cursor-pointer">
                Home
              </button>
              <ChevronRight className="w-3.5 h-3.5" />
              <span className="text-slate-900 font-semibold">Transport Information</span>
            </div>

            {/* Header Banner */}
            <div className="bg-[#07152d] text-white p-8 sm:p-12 rounded-2xl shadow-sm mb-12 border-l-4 border-amber-500">
              <span className="text-amber-400 font-bold text-xs uppercase tracking-widest">
                Safe & Punctual Commute
              </span>
              <h1 className="text-3xl sm:text-5xl font-serif font-black mt-2 mb-4">
                School Transport Network
              </h1>
              <p className="text-slate-300 text-sm sm:text-base max-w-3xl leading-relaxed">
                Crownbridge operates an extensive fleet of modern, GPS-monitored buses connecting Nirjuli, Doimukh, Borum, Naharlagun, and Itanagar under strict safety protocols.
              </p>
            </div>

            {/* Bus Routes List */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
              {TRANSPORT_INFO.routes.map((rt) => (
                <div key={rt.routeNo} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold bg-amber-100 text-amber-900 px-2.5 py-1 rounded-md">
                      {rt.routeNo}
                    </span>
                  </div>
                  <h3 className="font-serif font-bold text-base text-slate-900 mb-2">{rt.coverage}</h3>
                </div>
              ))}
            </div>

            {/* Safety Protocols */}
            <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm mb-12">
              <h2 className="text-xl font-serif font-bold text-slate-900 mb-4">
                Rigorous Transport Safety Measures
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm text-slate-600">
                {TRANSPORT_INFO.safety.map((feat) => (
                  <div key={feat} className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                    <span>{feat}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Transport Desk Contact */}
            <div className="bg-amber-50 p-6 rounded-2xl border border-amber-200 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <h3 className="font-bold text-amber-950 text-base">Need a custom pickup point?</h3>
                <p className="text-amber-800 text-xs sm:text-sm">
                  Contact the School Admission & Transport Desk at {siteSettings.contactPhone} to confirm route feasibility for your sector.
                </p>
              </div>
              <a
                href={`tel:${siteSettings.contactPhone}`}
                className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs uppercase tracking-wider whitespace-nowrap"
              >
                Call Transport Desk
              </a>
            </div>
          </div>
        )}

        {/* PAGE: CAMPUS LIFE & PHOTO GALLERY (NEW FEATURE) */}
        {currentPage === 'campus-life' && (
          <div className="py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-xs font-medium text-slate-500 mb-6">
              <button onClick={() => navigateTo('home')} className="hover:text-amber-700 cursor-pointer">
                Home
              </button>
              <ChevronRight className="w-3.5 h-3.5" />
              <span className="text-slate-900 font-semibold">Campus Life & Gallery</span>
            </div>

            {/* If section is turned off by administration */}
            {siteSettings.campusLifeActive === false ? (
              <div className="bg-white rounded-3xl p-10 md:p-16 border border-slate-200 text-center max-w-2xl mx-auto shadow-sm space-y-4">
                <div className="w-16 h-16 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center mx-auto">
                  <Camera className="w-8 h-8" />
                </div>
                <h2 className="text-2xl font-serif font-black text-slate-900">
                  Campus Life Gallery Under Scheduled Update
                </h2>
                <p className="text-sm text-slate-600 leading-relaxed">
                  The visual gallery is temporarily paused by the school administration for new session event archives. You can still explore our academics, campus facilities, or contact our admissions desk.
                </p>
                <div className="pt-4 flex flex-wrap justify-center gap-3">
                  <button
                    onClick={() => navigateTo('facilities')}
                    className="px-6 py-2.5 rounded-xl bg-[#0a1e3f] hover:bg-[#122e5e] text-white font-semibold text-xs uppercase cursor-pointer"
                  >
                    View Campus Facilities
                  </button>
                  <button
                    onClick={() => navigateTo('home')}
                    className="px-6 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-xs uppercase cursor-pointer"
                  >
                    Back to Home
                  </button>
                  {isAdmin && (
                    <button
                      onClick={() => setViewMode('admin')}
                      className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs uppercase cursor-pointer"
                    >
                      Admin: Turn ON Section
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <>
                {/* Header Banner */}
                <div className="bg-[#07152d] text-white p-8 sm:p-12 rounded-3xl shadow-sm mb-10 border-l-4 border-amber-400 relative overflow-hidden">
                  <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="max-w-3xl">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="bg-amber-400 text-slate-950 font-black text-[10px] uppercase tracking-widest px-3 py-1 rounded-full">
                          Visual Archives
                        </span>
                        <span className="text-xs text-amber-300 font-semibold">
                          Session {siteSettings.academicSession}
                        </span>
                      </div>
                      <h1 className="text-3xl sm:text-5xl font-serif font-black mt-2 mb-3">
                        Campus Life & Vibrant Moments
                      </h1>
                      <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
                        Explore our dynamic school events, interactive robotics demonstrations, multicultural celebrations across 5 languages, athletic competitions, and pristine boarding life in Nirjuli.
                      </p>
                    </div>

                    <div className="flex sm:flex-col gap-3 shrink-0">
                      <div className="bg-white/10 backdrop-blur-xs p-4 rounded-2xl border border-white/20 text-center">
                        <div className="text-2xl font-black text-amber-400 font-serif">
                          {activeGallery.length}
                        </div>
                        <div className="text-[10px] text-slate-300 uppercase tracking-wider font-semibold">
                          Photos & Albums
                        </div>
                      </div>
                      <div className="bg-white/10 backdrop-blur-xs p-4 rounded-2xl border border-white/20 text-center">
                        <div className="text-2xl font-black text-blue-400 font-serif">
                          {activeGallery.filter((g) => g.type === 'group').length}
                        </div>
                        <div className="text-[10px] text-slate-300 uppercase tracking-wider font-semibold">
                          Group Carousels
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Filter Bar */}
                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm mb-8 flex items-center justify-between gap-4 flex-wrap">
                  <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
                    <span className="text-xs font-bold text-slate-600 mr-1 shrink-0">
                      Filter Category:
                    </span>
                    {[
                      'All',
                      'Events',
                      'Facilities',
                      'Campus Life',
                      'Sports',
                      'Academic',
                      'Celebrations',
                    ].map((cat) => (
                      <button
                        key={cat}
                        onClick={() => setGalleryFilter(cat as any)}
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap cursor-pointer transition-all ${
                          galleryFilter === cat
                            ? 'bg-[#0a1e3f] text-white shadow-xs'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>

                  <span className="text-xs text-slate-500 font-medium">
                    Showing {filteredGallery.length} of {activeGallery.length} Moments
                  </span>
                </div>

                {/* Gallery Cards Grid */}
                {filteredGallery.length === 0 ? (
                  <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 space-y-3">
                    <Camera className="w-10 h-10 text-slate-300 mx-auto" />
                    <h3 className="font-serif font-bold text-slate-800 text-lg">
                      No moments found in &quot;{galleryFilter}&quot;
                    </h3>
                    <p className="text-xs text-slate-500">
                      Try selecting &quot;All&quot; to view all campus event photos and group carousels.
                    </p>
                    <button
                      onClick={() => setGalleryFilter('All')}
                      className="px-4 py-2 rounded-xl bg-amber-600 text-white font-semibold text-xs uppercase tracking-wider cursor-pointer"
                    >
                      Show All Moments
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredGallery.map((item) => (
                      <GalleryCardItem
                        key={item.id}
                        item={item}
                        onOpenLightbox={(galItem, slideIdx) => {
                          setGalleryLightbox({ item: galItem, slideIndex: slideIdx });
                        }}
                      />
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* PAGE 7: NOTICES */}
        {currentPage === 'notices' && (
          <div className="py-12 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto">
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-xs font-medium text-slate-500 mb-6">
              <button onClick={() => navigateTo('home')} className="hover:text-amber-700 cursor-pointer">
                Home
              </button>
              <ChevronRight className="w-3.5 h-3.5" />
              <span className="text-slate-900 font-semibold">Official Notice Board</span>
            </div>

            {/* Header Banner */}
            <div className="bg-[#07152d] text-white p-8 sm:p-12 rounded-2xl shadow-sm mb-10 border-l-4 border-amber-500">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <span className="text-amber-400 font-bold text-xs uppercase tracking-widest">
                    Real-Time Announcements
                  </span>
                  <h1 className="text-3xl sm:text-5xl font-serif font-black mt-2 mb-2">
                    Official Notice Board
                  </h1>
                  <p className="text-slate-300 text-sm max-w-2xl">
                    Important circulars, academic notifications, and event schedules published directly by the school administration.
                  </p>
                </div>
                <div className="bg-white/10 px-4 py-2 rounded-xl text-center border border-white/20">
                  <div className="text-2xl font-serif font-bold text-amber-400">{availableNotices.length}</div>
                  <div className="text-[11px] text-slate-300 uppercase tracking-wider">
                    {availableNotices.length === 1 ? 'Active Notice' : 'Active Notices'}
                  </div>
                </div>
              </div>
            </div>

            {/* Search & Filter Tabs */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm mb-8 flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
                {(['All', 'Admissions', 'Academic', 'Examinations', 'Events', 'General'] as const).map(
                  (cat) => (
                    <button
                      key={cat}
                      onClick={() => setNoticeFilter(cat)}
                      className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                        noticeFilter === cat
                            ? 'bg-amber-600 text-white shadow-xs'
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      {cat}
                    </button>
                  )
                )}
              </div>

              <div className="w-full md:w-64">
                <input
                  type="text"
                  placeholder="Search notices..."
                  value={noticeSearch}
                  onChange={(e) => setNoticeSearch(e.target.value)}
                  className="w-full px-3.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                />
              </div>
            </div>

            {/* Notices List */}
            {filteredNotices.length === 0 ? (
              <div className="bg-white p-12 text-center rounded-2xl border border-slate-200 shadow-sm">
                <Bell className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <h3 className="text-lg font-bold text-slate-700">
                  {availableNotices.length === 0 ? 'No Active Notices' : 'No matching notices found'}
                </h3>
                <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                  {availableNotices.length === 0
                    ? 'There are currently no active announcements published on the notice board. When the school administration publishes circulars, they will appear here in real time.'
                    : 'There are no notices matching your current filter. Try selecting "All" or clearing your search query.'}
                </p>
                {availableNotices.length > 0 && (
                  <button
                    onClick={() => {
                      setNoticeFilter('All');
                      setNoticeSearch('');
                    }}
                    className="mt-4 px-4 py-2 rounded-xl bg-amber-600 text-white font-semibold text-xs uppercase tracking-wider cursor-pointer"
                  >
                    Reset Filter
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {filteredNotices.map((n) => (
                  <div
                    key={n.id}
                    className={`bg-white p-6 rounded-2xl border transition-all ${
                      n.isImportant
                        ? 'border-amber-400 bg-gradient-to-r from-amber-50/40 via-white to-white shadow-sm'
                        : 'border-slate-200 shadow-xs hover:border-slate-300'
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold bg-slate-100 text-slate-800 px-2.5 py-0.5 rounded">
                          {n.category}
                        </span>
                        {n.isImportant && (
                          <span className="text-[11px] font-bold bg-amber-500 text-slate-950 px-2 py-0.5 rounded uppercase tracking-wider">
                            Urgent
                          </span>
                        )}
                      </div>
                      <span className="text-xs font-medium text-slate-500 flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        {n.dateLabel}
                      </span>
                    </div>

                    <h3 className="text-lg font-serif font-bold text-slate-900 mb-2">
                      {n.title}
                    </h3>
                    <p className="text-slate-600 text-sm leading-relaxed whitespace-pre-line">
                      {n.content}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* PAGE 8: DOWNLOADS & PUBLIC INFORMATION */}
        {currentPage === 'downloads' && (
          <div className="py-12 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto">
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-xs font-medium text-slate-500 mb-6">
              <button onClick={() => navigateTo('home')} className="hover:text-amber-700 cursor-pointer">
                Home
              </button>
              <ChevronRight className="w-3.5 h-3.5" />
              <span className="text-slate-900 font-semibold">Downloads & Public Information</span>
            </div>

            {/* Header Banner */}
            <div className="bg-[#07152d] text-white p-8 sm:p-12 rounded-2xl shadow-sm mb-12 border-l-4 border-indigo-500">
              <span className="text-indigo-400 font-bold text-xs uppercase tracking-widest">
                Documents & Official Information
              </span>
              <h1 className="text-3xl sm:text-5xl font-serif font-black mt-2 mb-4">
                Downloads & Public Information
              </h1>
              <p className="text-slate-300 text-sm sm:text-base max-w-3xl leading-relaxed">
                Access official curriculum syllabi, enrollment registration forms, academic calendars, and the official school prospectus bulletin.
              </p>
            </div>

            {/* Public Information / Prospectus Bulletin Section */}
            {siteSettings.publicInfoActive !== false && (
              <div className="bg-white p-6 sm:p-8 rounded-2xl border border-amber-300 shadow-sm mb-12">
                <div className="flex flex-col lg:flex-row items-center gap-8">
                  <div className="w-full lg:w-1/3">
                    <div
                      onClick={() =>
                        setLightboxImage({
                          title: siteSettings.publicInfoTitle || 'Public Information & Prospectus Bulletin',
                          src: siteSettings.publicInfoImageUrl || SCHOOL_ASSETS.feesPamphlet,
                        })
                      }
                      className="group relative rounded-xl overflow-hidden shadow-md cursor-pointer border border-slate-200"
                    >
                      <img
                        src={siteSettings.publicInfoImageUrl || SCHOOL_ASSETS.feesPamphlet}
                        alt="Official Public Information Bulletin"
                        className="w-full h-72 sm:h-80 object-cover object-top group-hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white font-bold text-sm gap-2">
                        <Maximize2 className="w-5 h-5" />
                        <span>Click to Enlarge</span>
                      </div>
                    </div>
                  </div>

                  <div className="w-full lg:w-2/3">
                    <span className="text-xs font-black text-amber-700 bg-amber-50 px-2.5 py-1 rounded-md uppercase tracking-wider">
                      Official Document Preview
                    </span>
                    <h2 className="text-2xl sm:text-3xl font-serif font-bold text-slate-900 mt-2 mb-3">
                      {siteSettings.publicInfoTitle || 'Public Information & Official School Prospectus'}
                    </h2>
                    <p className="text-slate-600 text-sm leading-relaxed mb-6">
                      {siteSettings.publicInfoDescription ||
                        'Official institutional bulletin highlighting academic session 2027-28 policies, language offerings, campus infrastructure, and admission pathways.'}
                    </p>

                    <div className="flex flex-wrap items-center gap-3">
                      <button
                        onClick={() =>
                          setLightboxImage({
                            title: siteSettings.publicInfoTitle || 'Public Information & Prospectus Bulletin',
                            src: siteSettings.publicInfoImageUrl || SCHOOL_ASSETS.feesPamphlet,
                          })
                        }
                        className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs uppercase tracking-wider inline-flex items-center gap-2 transition-colors cursor-pointer"
                      >
                        <Eye className="w-4 h-4" />
                        <span>Full Size View</span>
                      </button>

                      <a
                        href={siteSettings.publicInfoImageUrl || SCHOOL_ASSETS.feesPamphlet}
                        download="Crownbridge_Public_Information_Prospectus.jpeg"
                        className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-xs uppercase tracking-wider inline-flex items-center gap-2 transition-colors"
                      >
                        <Download className="w-4 h-4" />
                        <span>Download Prospectus Image</span>
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Official PDF Downloads List */}
            <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-serif font-bold text-slate-900">
                    Official Downloadable Documents
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-500 mt-1">
                    All downloadable forms and academic resources verified by Crownbridge International School.
                  </p>
                </div>
              </div>

              <div className="divide-y divide-slate-100">
                {activeDownloads.length === 0 ? (
                  <div className="p-8 text-center text-sm text-slate-500">
                    No downloadable documents currently available. Please check back later.
                  </div>
                ) : (
                  activeDownloads.map((docItem) => (
                  <div
                    key={docItem.id}
                    className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/50 px-2 rounded-xl transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center shrink-0 mt-0.5">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900 text-sm">{docItem.title}</h3>
                        <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                          <span className="bg-slate-100 px-2 py-0.5 rounded font-medium">
                            {docItem.category}
                          </span>
                          <span>•</span>
                          <span>{docItem.fileSize}</span>
                        </div>
                      </div>
                    </div>

                    <a
                      href={docItem.fileUrl || '#'}
                      target="_blank"
                      rel="noreferrer"
                      className="self-start sm:self-auto px-4 py-2 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-800 font-semibold text-xs inline-flex items-center gap-1.5 transition-colors border border-indigo-200/60"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download File</span>
                    </a>
                  </div>
                ))
              )}
              </div>
            </div>
          </div>
        )}

        {/* PAGE: LEARNING RESOURCES (OFFICIAL NCERT & CBSE STUDY PORTAL) */}
        {currentPage === 'learning-resources' && (
          <LearningResourcesSection
            resources={activeLearningResources}
            schoolPhone={siteSettings.contactPhone}
            onNavigateToAdmissions={() => navigateTo('admissions')}
          />
        )}

        {/* PAGE 9: ADMISSIONS */}
        {currentPage === 'admissions' && (
          <div className="py-12 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto">
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-xs font-medium text-slate-500 mb-6">
              <button onClick={() => navigateTo('home')} className="hover:text-amber-700 cursor-pointer">
                Home
              </button>
              <ChevronRight className="w-3.5 h-3.5" />
              <span className="text-slate-900 font-semibold">Admissions</span>
            </div>

            {/* Header Banner */}
            <div className="bg-[#07152d] text-white p-8 sm:p-12 rounded-2xl shadow-sm mb-12 border-l-4 border-amber-500">
              <span className="text-amber-400 font-bold text-xs uppercase tracking-widest">
                Academic Session 2027–28
              </span>
              <h1 className="text-3xl sm:text-5xl font-serif font-black mt-2 mb-4">
                Admissions Now Open
              </h1>
              <p className="text-slate-300 text-sm sm:text-base max-w-3xl leading-relaxed">
                Join Arunachal Pradesh&apos;s first AI-integrated institution. We invite parents of Pre-Nursery to Class 10 candidates to begin the admission journey today.
              </p>
            </div>

            {/* 4-Step Roadmap */}
            <div className="bg-white p-8 sm:p-10 rounded-2xl border border-slate-200 shadow-sm mb-12">
              <h2 className="text-2xl font-serif font-bold text-slate-900 mb-6 text-center">
                The 4-Step Admission Roadmap
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {ADMISSION_PROCESS.map((step) => (
                  <div key={step.step} className="p-5 rounded-xl bg-slate-50 border border-slate-100 flex flex-col justify-between">
                    <div>
                      <span className="text-xs font-black text-amber-700 bg-amber-100 px-2 py-0.5 rounded">
                        Step 0{step.step}
                      </span>
                      <h3 className="font-bold text-slate-900 text-base mt-2 mb-1.5">{step.title}</h3>
                      <p className="text-slate-600 text-xs leading-relaxed">{step.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Admission Enquiry Form */}
            <div className="bg-white p-8 sm:p-10 rounded-2xl border border-amber-300 shadow-sm">
              <div className="max-w-2xl mx-auto">
                <div className="text-center mb-8">
                  <span className="text-xs font-bold text-amber-700 uppercase tracking-wider">
                    Fast-Track Online Desk
                  </span>
                  <h2 className="text-2xl sm:text-3xl font-serif font-bold text-slate-900 mt-1">
                    Student Admission Enquiry Form
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-500 mt-2">
                    Submit details below. Our admissions counselor will contact you within 24 hours to schedule an interaction or campus walkthrough.
                  </p>
                </div>

                {inqSuccess ? (
                  <div className="bg-emerald-50 border border-emerald-300 p-6 rounded-2xl text-center animate-fadeIn">
                    <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto mb-3" />
                    <h3 className="text-lg font-bold text-emerald-950">
                      Admission Enquiry Received!
                    </h3>
                    <p className="text-xs sm:text-sm text-emerald-800 mt-2 max-w-md mx-auto">
                      Thank you for choosing Crownbridge International School. Our admission counselor will call you on your provided contact number shortly.
                    </p>
                    <button
                      onClick={() => setInqSuccess(false)}
                      className="mt-5 px-5 py-2 rounded-xl bg-emerald-700 text-white font-semibold text-xs uppercase cursor-pointer"
                    >
                      Submit Another Enquiry
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleEnquirySubmit} className="space-y-5">
                    {inqError && (
                      <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl">
                        {inqError}
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Student&apos;s Full Name *
                        </label>
                        <input
                          type="text"
                          required
                          value={inqStudentName}
                          onChange={(e) => setInqStudentName(e.target.value)}
                          placeholder="e.g. Tenzin Norbu"
                          className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Applying for Class *
                        </label>
                        <select
                          value={inqClass}
                          onChange={(e) => setInqClass(e.target.value)}
                          className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                        >
                          <option>Pre-Nursery / Nursery</option>
                          <option>Kindergarten (LKG / UKG)</option>
                          <option>Class 0 (Pre-Primary)</option>
                          <option>Class 1 – 3</option>
                          <option>Class 4 – 5</option>
                          <option>Class 6 – 8</option>
                          <option>Class 9 – 10</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Preferred Foreign Language Focus
                        </label>
                        <select
                          value={inqLanguage}
                          onChange={(e) => setInqLanguage(e.target.value as any)}
                          className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                        >
                          <option value="Japanese">Japanese (日本語)</option>
                          <option value="Korean">Korean (한국어)</option>
                          <option value="German">German (Deutsch)</option>
                          <option value="English">English</option>
                          <option value="Hindi">Hindi</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Boarding Preference
                        </label>
                        <select
                          value={inqBoarding}
                          onChange={(e) => setInqBoarding(e.target.value as any)}
                          className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                        >
                          <option value="Day Scholar">Day Scholar (With Bus Transport)</option>
                          <option value="Residential Hostel">Residential Hostel (Boys / Girls)</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Parent / Guardian Name *
                        </label>
                        <input
                          type="text"
                          required
                          value={inqParentName}
                          onChange={(e) => setInqParentName(e.target.value)}
                          placeholder="Parent / Guardian Name"
                          className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Contact Phone Number *
                        </label>
                        <input
                          type="tel"
                          required
                          value={inqPhone}
                          onChange={(e) => setInqPhone(e.target.value)}
                          placeholder="+91 94360 XXXXX"
                          className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Email Address (Optional)
                      </label>
                      <input
                        type="email"
                        value={inqEmail}
                        onChange={(e) => setInqEmail(e.target.value)}
                        placeholder="parent@example.com"
                        className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Any Questions or Specific Requirements
                      </label>
                      <textarea
                        rows={3}
                        value={inqMessage}
                        onChange={(e) => setInqMessage(e.target.value)}
                        placeholder="Tell us about your child's interests, previous schooling, or transport pickup location..."
                        className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={inqSubmitting}
                      className="w-full py-3.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-sm uppercase tracking-wider transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
                    >
                      {inqSubmitting ? 'Submitting Enquiry...' : 'Submit Admission Enquiry'}
                    </button>
                  </form>
                )}
              </div>
            </div>
          </div>
        )}

        {/* PAGE 10: CONTACT & LOCATION */}
        {currentPage === 'contact' && (
          <div className="py-12 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto">
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-xs font-medium text-slate-500 mb-6">
              <button onClick={() => navigateTo('home')} className="hover:text-amber-700 cursor-pointer">
                Home
              </button>
              <ChevronRight className="w-3.5 h-3.5" />
              <span className="text-slate-900 font-semibold">Contact & Location</span>
            </div>

            {/* Header Banner */}
            <div className="bg-[#07152d] text-white p-8 sm:p-12 rounded-2xl shadow-sm mb-12 border-l-4 border-amber-500">
              <span className="text-amber-400 font-bold text-xs uppercase tracking-widest">
                Get In Touch
              </span>
              <h1 className="text-3xl sm:text-5xl font-serif font-black mt-2 mb-4">
                Visit & Contact Crownbridge
              </h1>
              <p className="text-slate-300 text-sm sm:text-base max-w-3xl leading-relaxed">
                We are located conveniently along Doimukh Road in Borum, Nirjuli. Visit us for an on-campus counseling session or connect directly via phone or WhatsApp.
              </p>
            </div>

            {/* Contact Details Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center mb-4">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <h3 className="font-serif font-bold text-lg text-slate-900 mb-1">Campus Location</h3>
                  <p className="text-slate-600 text-xs sm:text-sm leading-relaxed mt-2">
                    {siteSettings.locationAddress ||
                      'Doimukh Road, behind SP Office, Nirjuli Village-I, Borum, Itanagar, Arunachal Pradesh 791109'}
                  </p>
                </div>
                <a
                  href="https://maps.google.com/?q=Nirjuli+Village-I+Doimukh+Road+Itanagar"
                  target="_blank"
                  rel="noreferrer"
                  className="mt-4 text-xs font-bold text-amber-700 hover:text-amber-800 inline-flex items-center gap-1"
                >
                  Open in Google Maps ↗
                </a>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center mb-4">
                    <Phone className="w-5 h-5" />
                  </div>
                  <h3 className="font-serif font-bold text-lg text-slate-900 mb-1">Phone Enquiries</h3>
                  <div className="text-slate-600 text-xs sm:text-sm leading-relaxed mt-2">
                    Main Admission Desk:
                    <a
                      href={`tel:${siteSettings.contactPhone}`}
                      className="block font-bold text-slate-900 text-sm mt-1 hover:text-amber-700"
                    >
                      {siteSettings.contactPhone}
                    </a>
                  </div>
                </div>
                <span className="text-xs text-slate-500 mt-4">Office Hours: 8:30 AM – 3:30 PM</span>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center mb-4">
                    <MessageCircle className="w-5 h-5" />
                  </div>
                  <h3 className="font-serif font-bold text-lg text-slate-900 mb-1">Instant WhatsApp</h3>
                  <p className="text-slate-600 text-xs sm:text-sm leading-relaxed mt-2">
                    Chat with our admissions counselor directly on WhatsApp for prompt responses regarding syllabus, hostel, or transport.
                  </p>
                </div>
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-4 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs text-center transition-colors"
                >
                  Start WhatsApp Chat
                </a>
              </div>
            </div>

            {/* Embedded Google Maps */}
            <div className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-serif font-bold text-lg text-slate-900 flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-amber-600" />
                  Google Maps Interactive Campus Guide
                </h3>
                <a
                  href="https://maps.google.com/?q=Nirjuli+Village-I+Doimukh+Road+Itanagar"
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs font-bold text-amber-700 hover:underline"
                >
                  Get Driving Directions ↗
                </a>
              </div>
              <div className="w-full h-96 rounded-xl overflow-hidden border border-slate-200 shadow-inner">
                <iframe
                  title="Crownbridge Campus Location"
                  src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d14197.839882299863!2d93.7431!3d27.1264!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x374092b678129759%3A0xcda6b23b49919f95!2sNirjuli%2C%20Arunachal%20Pradesh!5e0!3m2!1sen!2sin!4v1700000000000!5m2!1sen!2sin"
                  width="100%"
                  height="100%"
                  style={{ border: 0 }}
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Floating WhatsApp Action Button */}
      <a
        href={whatsappUrl}
        target="_blank"
        rel="noreferrer"
        className="fixed bottom-6 right-6 z-40 bg-emerald-600 hover:bg-emerald-500 text-white p-3.5 rounded-full shadow-xl hover:scale-110 transition-transform flex items-center justify-center border-2 border-white cursor-pointer"
        aria-label="Contact school on WhatsApp"
      >
        <MessageCircle className="w-6 h-6" />
      </a>

      {/* Lightbox Modal for Public Information Prospectus */}
      {lightboxImage && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl animate-scaleUp">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="font-serif font-bold text-slate-900 text-base">{lightboxImage.title}</h3>
              <button
                onClick={() => setLightboxImage(null)}
                className="p-1 rounded-lg text-slate-500 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 overflow-auto flex-1 bg-slate-900 flex items-center justify-center">
              <img
                src={lightboxImage.src}
                alt={lightboxImage.title}
                className="max-h-[75vh] w-auto object-contain rounded-lg"
              />
            </div>
            <div className="p-4 border-t border-slate-200 flex items-center justify-between bg-slate-50">
              <span className="text-xs text-slate-500">
                Official Document • Crownbridge International School
              </span>
              <div className="flex items-center gap-2">
                <a
                  href={lightboxImage.src}
                  download="Crownbridge_Prospectus_Bulletin.jpeg"
                  className="px-4 py-2 rounded-xl bg-amber-600 text-white font-semibold text-xs uppercase inline-flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  Download
                </a>
                <button
                  onClick={() => setLightboxImage(null)}
                  className="px-4 py-2 rounded-xl bg-slate-200 text-slate-700 font-semibold text-xs uppercase cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox Modal for Campus Life Gallery */}
      {galleryLightbox && (
        <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 text-white rounded-3xl max-w-5xl w-full max-h-[92vh] overflow-hidden flex flex-col shadow-2xl border border-slate-700 animate-scaleUp">
            {/* Modal Header */}
            <div className="p-4 px-6 border-b border-slate-800 flex items-center justify-between">
              <div className="space-y-0.5 min-w-0 pr-4">
                <div className="flex items-center gap-2">
                  <span className="bg-amber-400 text-slate-950 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded">
                    {galleryLightbox.item.category}
                  </span>
                  {galleryLightbox.item.type === 'group' && (
                    <span className="text-xs text-blue-300 font-semibold flex items-center gap-1">
                      <Layers className="w-3.5 h-3.5" />
                      Slide {(galleryLightbox.slideIndex || 0) + 1} of{' '}
                      {(galleryLightbox.item.imageUrls?.length || 1)}
                    </span>
                  )}
                  {galleryLightbox.item.dateLabel && (
                    <span className="text-xs text-slate-400">• {galleryLightbox.item.dateLabel}</span>
                  )}
                </div>
                <h3 className="font-serif font-bold text-white text-base sm:text-lg truncate">
                  {galleryLightbox.item.title}
                </h3>
              </div>

              <button
                onClick={() => setGalleryLightbox(null)}
                className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center cursor-pointer transition-colors shrink-0"
                aria-label="Close photo preview"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body / Image Viewer */}
            <div className="relative flex-1 bg-black flex items-center justify-center p-2 sm:p-4 min-h-[300px] overflow-hidden">
              {(() => {
                const isGroup = galleryLightbox.item.type === 'group' && Array.isArray(galleryLightbox.item.imageUrls) && galleryLightbox.item.imageUrls.length > 0;
                const slides = isGroup ? galleryLightbox.item.imageUrls! : [galleryLightbox.item.imageUrl];
                const activeSrc = slides[galleryLightbox.slideIndex] || galleryLightbox.item.imageUrl;

                return (
                  <>
                    <img
                      src={activeSrc}
                      alt={galleryLightbox.item.title}
                      className="max-h-[65vh] w-auto max-w-full object-contain rounded-xl shadow-lg"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src =
                          'https://images.unsplash.com/photo-1580582932707-520aed937b7b?auto=format&fit=crop&w=1200&q=80';
                      }}
                    />

                    {/* Navigation Arrows for Group */}
                    {isGroup && slides.length > 1 && (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            setGalleryLightbox({
                              ...galleryLightbox,
                              slideIndex:
                                galleryLightbox.slideIndex > 0
                                  ? galleryLightbox.slideIndex - 1
                                  : slides.length - 1,
                            });
                          }}
                          className="absolute left-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center backdrop-blur-md cursor-pointer transition-transform hover:scale-105"
                          aria-label="Previous slide"
                        >
                          <ChevronLeft className="w-6 h-6" />
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setGalleryLightbox({
                              ...galleryLightbox,
                              slideIndex:
                                (galleryLightbox.slideIndex + 1) % slides.length,
                            });
                          }}
                          className="absolute right-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center backdrop-blur-md cursor-pointer transition-transform hover:scale-105"
                          aria-label="Next slide"
                        >
                          <ChevronRight className="w-6 h-6" />
                        </button>
                      </>
                    )}
                  </>
                );
              })()}
            </div>

            {/* Modal Footer with Description & Actions */}
            <div className="p-4 px-6 border-t border-slate-800 bg-slate-900/90 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="text-xs text-slate-300 leading-relaxed max-w-2xl">
                {galleryLightbox.item.description ||
                  'Official campus life and event moments from Crownbridge International School.'}
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <a
                  href={
                    (galleryLightbox.item.type === 'group' &&
                    galleryLightbox.item.imageUrls &&
                    galleryLightbox.item.imageUrls[galleryLightbox.slideIndex])
                      ? galleryLightbox.item.imageUrls[galleryLightbox.slideIndex]
                      : galleryLightbox.item.imageUrl
                  }
                  target="_blank"
                  rel="noreferrer"
                  className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-xs inline-flex items-center gap-1.5 transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Open Full Size</span>
                </a>

                <button
                  onClick={() => setGalleryLightbox(null)}
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs uppercase cursor-pointer transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Privacy Policy Modal */}
      {privacyModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[85vh] overflow-hidden flex flex-col shadow-2xl">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between">
              <h3 className="font-serif font-bold text-slate-900 text-lg">
                Privacy Policy & Institutional Disclosures
              </h3>
              <button
                onClick={() => setPrivacyModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto text-xs sm:text-sm text-slate-600 space-y-4 leading-relaxed">
              <p>
                <strong>Crownbridge International School</strong> respects your privacy and is dedicated to protecting student and parental data in accordance with applicable laws.
              </p>
              <h4 className="font-bold text-slate-900 text-sm">1. Information Collection</h4>
              <p>
                Parent inquiries submitted via our online form are utilized solely for academic counseling, admission scheduling, and verified communications.
              </p>
              <h4 className="font-bold text-slate-900 text-sm">2. Student Data & Academic Records</h4>
              <p>
                Examination results and evaluation portals are securely partitioned and access-restricted. Student identities and records are never shared with third-party advertisers.
              </p>
              <h4 className="font-bold text-slate-900 text-sm">3. Security</h4>
              <p>
                All data transmission is encrypted via SSL/TLS and stored on secure cloud database clusters.
              </p>
            </div>
            <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end">
              <button
                onClick={() => setPrivacyModalOpen(false)}
                className="px-5 py-2 rounded-xl bg-slate-900 text-white font-semibold text-xs uppercase cursor-pointer"
              >
                Understood
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Global Prestigious Footer */}
      <footer className="bg-[#050e1d] text-slate-300 border-t border-amber-900/40 pt-16 pb-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 pb-12 border-b border-slate-800">
            {/* Column 1: School Identity */}
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-full overflow-hidden bg-white p-1 border-2 border-amber-400 shadow-sm shrink-0 flex items-center justify-center">
                  <img
                    src={SCHOOL_ASSETS.logo}
                    alt="Crownbridge Crest"
                    className="w-full h-full object-contain rounded-full"
                  />
                </div>
                <div>
                  <span className="block text-lg font-serif font-black text-white uppercase tracking-tight">
                    Crownbridge
                  </span>
                  <span className="block text-[11px] font-semibold text-amber-400 uppercase tracking-widest">
                    International School
                  </span>
                </div>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed mb-4">
                State&apos;s first AI-integrated institution pioneering global multilingual fluency (English, Hindi, German, Japanese, Korean) with rigorous values-centric CBSE learning.
              </p>
              <div className="text-xs text-amber-300/80 font-medium">
                Affiliation Session {siteSettings.academicSession}
              </div>
            </div>

            {/* Column 2: Navigation Links */}
            <div>
              <h4 className="font-serif font-bold text-white text-sm uppercase tracking-wider mb-4 border-b border-slate-800 pb-2">
                Quick Pages
              </h4>
              <ul className="space-y-2 text-xs">
                <li>
                  <button onClick={() => navigateTo('home')} className="hover:text-amber-300 transition-colors cursor-pointer">
                    Home Page
                  </button>
                </li>
                <li>
                  <button onClick={() => navigateTo('about')} className="hover:text-amber-300 transition-colors cursor-pointer">
                    About Us & Vision
                  </button>
                </li>
                <li>
                  <button onClick={() => navigateTo('academics')} className="hover:text-amber-300 transition-colors cursor-pointer">
                    Academics & 5 Languages
                  </button>
                </li>
                <li>
                  <button onClick={() => navigateTo('classes')} className="hover:text-amber-300 transition-colors cursor-pointer">
                    Classes & Courses
                  </button>
                </li>
                <li>
                  <button onClick={() => navigateTo('facilities')} className="hover:text-amber-300 transition-colors cursor-pointer">
                    Hostels & Campus Facilities
                  </button>
                </li>
                <li>
                  <button onClick={() => navigateTo('transport')} className="hover:text-amber-300 transition-colors cursor-pointer">
                    Transport & Bus Fleet
                  </button>
                </li>
                {siteSettings.campusLifeActive !== false && (
                  <li>
                    <button onClick={() => navigateTo('campus-life')} className="hover:text-amber-300 transition-colors cursor-pointer flex items-center gap-1.5 text-amber-300 font-semibold">
                      <Camera className="w-3.5 h-3.5" />
                      <span>Campus Life & Gallery</span>
                    </button>
                  </li>
                )}
              </ul>
            </div>

            {/* Column 3: Portals & Info */}
            <div>
              <h4 className="font-serif font-bold text-white text-sm uppercase tracking-wider mb-4 border-b border-slate-800 pb-2">
                Portals & Info
              </h4>
              <ul className="space-y-2 text-xs">
                <li>
                  <button onClick={() => navigateTo('notices')} className="hover:text-amber-300 transition-colors cursor-pointer">
                    Official Notice Board
                  </button>
                </li>
                <li>
                  <button onClick={() => navigateTo('downloads')} className="hover:text-amber-300 transition-colors cursor-pointer">
                    Downloads & Prospectus
                  </button>
                </li>
                <li>
                  <button onClick={() => navigateTo('learning-resources')} className="hover:text-amber-300 transition-colors cursor-pointer font-semibold text-amber-300 flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>CBSE Learning Resources</span>
                  </button>
                </li>
                <li>
                  <button onClick={() => navigateTo('admissions')} className="hover:text-amber-300 transition-colors cursor-pointer">
                    Admission Information & Form
                  </button>
                </li>
                {siteSettings.showResultsPortal && siteSettings.resultsPortalUrl && (
                  <li>
                    <a
                      href={siteSettings.resultsPortalUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-amber-400 hover:underline flex items-center gap-1 font-semibold"
                    >
                      <span>Examination Results Portal</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </li>
                )}
                {siteSettings.customNavButtonActive && siteSettings.customNavButtonName && (
                  <li>
                    <a
                      href={siteSettings.customNavButtonUrl || '#'}
                      target="_blank"
                      rel="noreferrer"
                      className="text-emerald-400 hover:underline flex items-center gap-1"
                    >
                      <span>{siteSettings.customNavButtonName}</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </li>
                )}
                <li>
                  <button
                    onClick={() => setPrivacyModalOpen(true)}
                    className="hover:text-amber-300 transition-colors cursor-pointer"
                  >
                    Privacy Policy & Disclosures
                  </button>
                </li>
              </ul>
            </div>

            {/* Column 4: Contact & Location */}
            <div>
              <h4 className="font-serif font-bold text-white text-sm uppercase tracking-wider mb-4 border-b border-slate-800 pb-2">
                Campus Address
              </h4>
              <div className="text-xs space-y-2 text-slate-400">
                <p className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <span>
                    {siteSettings.locationAddress}
                  </span>
                </p>
                <p className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-amber-400 shrink-0" />
                  <a href={`tel:${siteSettings.contactPhone}`} className="hover:text-white">
                    {siteSettings.contactPhone}
                  </a>
                </p>
                <p className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-amber-400 shrink-0" />
                  <a href={`mailto:${siteSettings.contactEmail}`} className="hover:text-white">
                    {siteSettings.contactEmail}
                  </a>
                </p>
              </div>

              <div className="mt-5 pt-3 border-t border-slate-800">
                <button
                  onClick={() => setViewMode('admin')}
                  className="text-xs text-slate-500 hover:text-amber-300 transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>Staff / Administrator Login</span>
                </button>
              </div>
            </div>
          </div>

          {/* Copyright Bar */}
          <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
            <div>
              © {new Date().getFullYear()} Crownbridge International School. All rights reserved.
            </div>
            <div className="flex items-center gap-4">
              <span>Doimukh Road, Nirjuli, Itanagar</span>
              <span>•</span>
              <button
                onClick={() => setPrivacyModalOpen(true)}
                className="hover:text-slate-300 cursor-pointer"
              >
                Privacy Policy
              </button>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
