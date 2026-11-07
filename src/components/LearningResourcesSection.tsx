import React, { useState, useMemo } from 'react';
import {
  BookOpen,
  Search,
  ExternalLink,
  Download,
  Filter,
  CheckCircle2,
  Sparkles,
  HelpCircle,
  Phone,
  MessageCircle,
  Copy,
  ChevronDown,
  Globe,
  Award,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { LearningResourceItem } from '../data/schoolData';

interface LearningResourcesSectionProps {
  resources: LearningResourceItem[];
  schoolPhone?: string;
  onNavigateToAdmissions?: () => void;
}

const CLASS_OPTIONS = [
  'All Classes',
  'Pre-Primary',
  'Class 1',
  'Class 2',
  'Class 3',
  'Class 4',
  'Class 5',
  'Class 6',
  'Class 7',
  'Class 8',
  'Class 9',
  'Class 10',
];

const SUBJECT_OPTIONS = [
  'All Subjects',
  'Mathematics',
  'Science',
  'English',
  'Hindi',
  'Social Science',
  'EVS',
  'Sanskrit',
  'AI & STEM',
  'General',
];

const CATEGORY_OPTIONS: Array<'All' | LearningResourceItem['category']> = [
  'All',
  'NCERT Textbooks',
  'Worksheets & Practice',
  'CBSE Syllabus',
  'Sample Papers',
  'Digital Interactive',
];

export default function LearningResourcesSection({
  resources,
  schoolPhone = '+91 94360 27109',
  onNavigateToAdmissions,
}: LearningResourcesSectionProps) {
  const [selectedClass, setSelectedClass] = useState<string>('All Classes');
  const [selectedSubject, setSelectedSubject] = useState<string>('All Subjects');
  const [selectedCategory, setSelectedCategory] = useState<'All' | LearningResourceItem['category']>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showNcrtGuide, setShowNcrtGuide] = useState<boolean>(false);

  // Filtered resources
  const filteredList = useMemo(() => {
    return resources.filter((item) => {
      if (item.isActive === false) return false;

      // Class Filter
      if (selectedClass !== 'All Classes') {
        if (item.classLevel !== selectedClass && item.classLevel !== 'All Classes') {
          return false;
        }
      }

      // Subject Filter
      if (selectedSubject !== 'All Subjects') {
        if (item.subject !== selectedSubject && item.subject !== 'General') {
          return false;
        }
      }

      // Category Filter
      if (selectedCategory !== 'All' && item.category !== selectedCategory) {
        return false;
      }

      // Search Query
      if (searchQuery.trim().length > 0) {
        const query = searchQuery.toLowerCase().trim();
        const matchTitle = item.title.toLowerCase().includes(query);
        const matchDesc = item.description?.toLowerCase().includes(query);
        const matchSubject = item.subject.toLowerCase().includes(query);
        const matchClass = item.classLevel.toLowerCase().includes(query);
        const matchSource = item.officialSource?.toLowerCase().includes(query);
        if (!matchTitle && !matchDesc && !matchSubject && !matchClass && !matchSource) {
          return false;
        }
      }

      return true;
    });
  }, [resources, selectedClass, selectedSubject, selectedCategory, searchQuery]);

  const handleCopyLink = (item: LearningResourceItem) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(item.resourceUrl);
      setCopiedId(item.id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  const rawPhoneDigits = schoolPhone.replace(/[^0-9]/g, '');
  const cleanPhone = rawPhoneDigits.length === 10 ? `91${rawPhoneDigits}` : rawPhoneDigits || '919436027109';
  const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(
    'Hello Crownbridge Academic Office, please share the verified textbook & syllabus list for my child.'
  )}`;

  return (
    <div className="bg-slate-50 min-h-screen py-10 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-10">
        {/* Hero Section */}
        <div className="relative rounded-3xl bg-gradient-to-r from-[#071738] via-[#0b2454] to-[#123675] text-white p-8 sm:p-12 shadow-xl border border-amber-500/20 overflow-hidden">
          <div className="absolute top-0 right-0 -mt-10 -mr-10 w-96 h-96 rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />

          <div className="relative z-10 max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/40 text-xs font-bold uppercase tracking-wider mb-4">
              <Sparkles className="w-3.5 h-3.5" />
              Student & Parent Academic Resource Centre
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-serif font-black tracking-tight text-white mb-4">
              CBSE Learning Resources & Digital Textbooks
            </h1>

            <p className="text-slate-200 text-sm sm:text-base leading-relaxed mb-6">
              Access verified official textbooks, curriculum guides, practice worksheets, and digital interactive modules
              for <strong className="text-amber-300">Classes Pre-Primary through Class 10</strong>. Directly curated to support CBSE & NCF 2023 educational standards.
            </p>

            <div className="flex flex-wrap items-center gap-3">
              <a
                href="https://ncert.nic.in/textbook.php"
                target="_blank"
                rel="noopener noreferrer"
                className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-5 py-2.5 rounded-xl text-xs sm:text-sm shadow-md transition-all inline-flex items-center gap-2 cursor-pointer"
              >
                <BookOpen className="w-4 h-4" />
                <span>Open Official NCERT Textbooks Portal</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>

              <button
                onClick={() => setShowNcrtGuide(!showNcrtGuide)}
                className="bg-white/10 hover:bg-white/20 text-white font-medium px-4 py-2.5 rounded-xl border border-white/20 text-xs sm:text-sm transition-all inline-flex items-center gap-2 cursor-pointer"
              >
                <HelpCircle className="w-4 h-4 text-amber-300" />
                <span>{showNcrtGuide ? 'Hide Portal Guide' : 'How to Access NCERT Chapters'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Collapsible NCERT Step Guide */}
        {showNcrtGuide && (
          <div className="bg-amber-50/90 border border-amber-300/80 rounded-2xl p-6 text-slate-800 shadow-sm animate-fadeIn">
            <div className="flex items-start justify-between gap-4 mb-3">
              <div className="flex items-center gap-2 text-amber-950 font-bold text-base">
                <CheckCircle2 className="w-5 h-5 text-amber-600 shrink-0" />
                <span>How to Open or Download Any Book / Chapter on Official NCERT:</span>
              </div>
              <button
                onClick={() => setShowNcrtGuide(false)}
                className="text-xs text-slate-500 hover:text-slate-800 font-bold"
              >
                Close ✕
              </button>
            </div>

            <ol className="list-decimal list-inside space-y-2 text-xs sm:text-sm text-slate-700 ml-1">
              <li>
                Click on <strong>Open Official NCERT Textbooks Portal</strong> (it will open <code>ncert.nic.in/textbook.php</code> in a new tab).
              </li>
              <li>
                In the three dropdown fields on the page, select: <strong>Class</strong> (e.g. Class VI), <strong>Subject</strong> (e.g. Mathematics), and <strong>Book Title</strong> (e.g. Ganita Prakash).
              </li>
              <li>
                Click the <strong>Go</strong> button. The portal will display individual chapter PDF links as well as a <em>"Download Complete Book"</em> zip option.
              </li>
              <li>
                All NCERT materials are official and free of cost as mandated by the Ministry of Education.
              </li>
            </ol>
          </div>
        )}

        {/* Official Education Gateways (Zero ads, direct links) */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg sm:text-xl font-serif font-black text-[#081938]">
              Trusted National Education Gateways
            </h2>
            <span className="text-xs text-slate-500 font-medium">Official Portals</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              {
                title: 'NCERT E-Books',
                badge: 'Classes 1–12',
                url: 'https://ncert.nic.in/textbook.php',
                color: 'hover:border-amber-400 hover:bg-amber-50/40',
              },
              {
                title: 'DIKSHA Portal',
                badge: 'QR Lessons',
                url: 'https://diksha.gov.in/',
                color: 'hover:border-blue-400 hover:bg-blue-50/40',
              },
              {
                title: 'CBSE Academic',
                badge: 'Curriculum',
                url: 'https://cbseacademic.nic.in/',
                color: 'hover:border-indigo-400 hover:bg-indigo-50/40',
              },
              {
                title: 'ePathshala',
                badge: 'Flipbooks',
                url: 'https://epathshala.nic.in/',
                color: 'hover:border-emerald-400 hover:bg-emerald-50/40',
              },
              {
                title: 'NCERT Exemplar',
                badge: 'Maths & Science',
                url: 'https://ncert.nic.in/exemplar-problems.php',
                color: 'hover:border-purple-400 hover:bg-purple-50/40',
              },
              {
                title: 'CBSE Circulars',
                badge: 'Official Notices',
                url: 'https://cbseacademic.nic.in/circulars.html',
                color: 'hover:border-rose-400 hover:bg-rose-50/40',
              },
            ].map((p) => (
              <a
                key={p.title}
                href={p.url}
                target="_blank"
                rel="noopener noreferrer"
                className={`bg-white rounded-xl p-3.5 border border-slate-200 text-left transition-all shadow-xs group flex flex-col justify-between ${p.color}`}
              >
                <div>
                  <span className="inline-block text-[10px] font-bold tracking-wide uppercase px-2 py-0.5 rounded bg-slate-100 text-slate-700 mb-2">
                    {p.badge}
                  </span>
                  <div className="font-bold text-xs sm:text-sm text-slate-800 group-hover:text-blue-900 transition-colors">
                    {p.title}
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between text-[11px] font-semibold text-slate-500 group-hover:text-blue-600">
                  <span>Visit</span>
                  <ExternalLink className="w-3 h-3" />
                </div>
              </a>
            ))}
          </div>
        </div>

        {/* Filters & Search Control Bar */}
        <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200 shadow-sm space-y-4">
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by book name, subject, class, or topic..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 hover:text-slate-600"
                >
                  Clear
                </button>
              )}
            </div>

            {/* Subject Dropdown */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-600 shrink-0">Subject:</span>
              <select
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value)}
                className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs sm:text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                {SUBJECT_OPTIONS.map((sub) => (
                  <option key={sub} value={sub}>
                    {sub}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Class Level Selector Chips */}
          <div className="space-y-1.5">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
              Filter By Class:
            </span>
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
              {CLASS_OPTIONS.map((cls) => {
                const isSelected = selectedClass === cls;
                return (
                  <button
                    key={cls}
                    onClick={() => setSelectedClass(cls)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-[#0a1e3f] text-amber-300 shadow-xs'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                    }`}
                  >
                    {cls}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Category Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin border-t border-slate-100 pt-3">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mr-2 shrink-0">
              Type:
            </span>
            {CATEGORY_OPTIONS.map((cat) => {
              const isSelected = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1 rounded-md text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-amber-100 text-amber-900 border border-amber-300'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  {cat}
                </button>
              );
            })}
          </div>
        </div>

        {/* Results Count & Active Filters Indicator */}
        <div className="flex items-center justify-between text-xs text-slate-500 px-1">
          <div>
            Showing <strong className="text-slate-800">{filteredList.length}</strong> resources
            {selectedClass !== 'All Classes' && (
              <span> • Class: <strong className="text-slate-800">{selectedClass}</strong></span>
            )}
            {selectedSubject !== 'All Subjects' && (
              <span> • Subject: <strong className="text-slate-800">{selectedSubject}</strong></span>
            )}
            {selectedCategory !== 'All' && (
              <span> • Category: <strong className="text-slate-800">{selectedCategory}</strong></span>
            )}
          </div>

          {(selectedClass !== 'All Classes' ||
            selectedSubject !== 'All Subjects' ||
            selectedCategory !== 'All' ||
            searchQuery) && (
            <button
              onClick={() => {
                setSelectedClass('All Classes');
                setSelectedSubject('All Subjects');
                setSelectedCategory('All');
                setSearchQuery('');
              }}
              className="text-amber-700 hover:text-amber-800 font-bold underline cursor-pointer"
            >
              Reset All Filters
            </button>
          )}
        </div>

        {/* Resources Grid */}
        {filteredList.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredList.map((item) => {
              const isExternal = item.resourceUrl.startsWith('http');
              const isInternalAsset = item.resourceUrl.startsWith('/assets') || item.resourceUrl.startsWith('data:');

              return (
                <article
                  key={item.id}
                  className="bg-white rounded-2xl border border-slate-200/90 shadow-sm hover:shadow-md transition-all p-5 flex flex-col justify-between group hover:border-amber-400/60"
                >
                  <div>
                    {/* Header Badges */}
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="bg-[#0a1e3f] text-amber-300 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md">
                          {item.classLevel}
                        </span>
                        <span className="bg-slate-100 text-slate-700 text-[10px] font-bold px-2 py-0.5 rounded-md">
                          {item.subject}
                        </span>
                      </div>

                      <span className="text-[10px] font-semibold text-slate-500 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-full">
                        {item.category}
                      </span>
                    </div>

                    {/* Title */}
                    <h3 className="font-serif font-bold text-base sm:text-lg text-slate-900 group-hover:text-amber-700 transition-colors mb-2 leading-snug">
                      {item.title}
                    </h3>

                    {/* Description */}
                    <p className="text-slate-600 text-xs sm:text-sm line-clamp-3 leading-relaxed mb-4">
                      {item.description}
                    </p>
                  </div>

                  <div>
                    {/* Source verification tag */}
                    <div className="flex items-center justify-between text-[11px] text-slate-500 pt-3 border-t border-slate-100 mb-3">
                      <span className="inline-flex items-center gap-1 font-medium">
                        <Award className="w-3.5 h-3.5 text-amber-500" />
                        Source: {item.officialSource || 'Official NCERT / CBSE'}
                      </span>
                      <button
                        onClick={() => handleCopyLink(item)}
                        className="text-slate-400 hover:text-slate-700 p-1 rounded hover:bg-slate-100 transition-colors inline-flex items-center gap-1 text-[10px]"
                        title="Copy direct resource link"
                      >
                        {copiedId === item.id ? (
                          <>
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            <span className="text-emerald-700 font-bold">Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>Copy Link</span>
                          </>
                        )}
                      </button>
                    </div>

                    {/* Action Button */}
                    <a
                      href={item.resourceUrl}
                      target={isExternal ? '_blank' : undefined}
                      rel={isExternal ? 'noopener noreferrer' : undefined}
                      download={isInternalAsset ? item.title.replace(/\s+/g, '_') : undefined}
                      className="w-full bg-[#0a1e3f] hover:bg-[#122e5e] text-white py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all shadow-xs cursor-pointer border border-amber-500/20"
                    >
                      <span>
                        {isInternalAsset ? 'View / Download Material' : 'Open Official Resource'}
                      </span>
                      {isInternalAsset ? (
                        <Download className="w-3.5 h-3.5 text-amber-400" />
                      ) : (
                        <ExternalLink className="w-3.5 h-3.5 text-amber-400" />
                      )}
                    </a>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="bg-white rounded-2xl p-12 text-center border border-slate-200">
            <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-800 mb-1">
              No matching resources found
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto mb-4">
              Try selecting "All Classes" or clearing the search query to see all verified textbooks and curriculum guides.
            </p>
            <button
              onClick={() => {
                setSelectedClass('All Classes');
                setSelectedSubject('All Subjects');
                setSelectedCategory('All');
                setSearchQuery('');
              }}
              className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 cursor-pointer"
            >
              Reset Filters
            </button>
          </div>
        )}

        {/* Important Parent Verification Note */}
        <div className="bg-amber-50/70 border-l-4 border-amber-500 p-5 rounded-r-2xl space-y-2 text-xs sm:text-sm text-slate-700">
          <p className="font-bold text-slate-900">
            Important Information for Parents & Students:
          </p>
          <p>
            • All NCERT textbooks are published by the National Council of Educational Research and Training (NCERT). They are updated according to the National Curriculum Framework (NCF 2023).
          </p>
          <p>
            • Crownbridge International School follows the CBSE syllabus guidelines. If you need confirmation about the exact prescribed book or edition for your child's specific section, please contact our academic office.
          </p>
        </div>

        {/* Academic Helpdesk Banner */}
        <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-sm text-center max-w-3xl mx-auto space-y-4">
          <h3 className="font-serif font-black text-xl text-[#081938]">
            Need Help Finding Prescribed Books or Study Kits?
          </h3>
          <p className="text-xs sm:text-sm text-slate-600 max-w-lg mx-auto">
            Our academic coordinators can assist parents with textbook editions, notebook lists, and foreign language immersion materials.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <a
              href={`tel:${schoolPhone}`}
              className="px-5 py-2.5 rounded-xl bg-[#0a1e3f] text-white font-bold text-xs sm:text-sm hover:bg-[#122e5e] transition-colors inline-flex items-center gap-2 cursor-pointer"
            >
              <Phone className="w-4 h-4 text-amber-400" />
              <span>Call Academic Desk ({schoolPhone})</span>
            </a>
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-5 py-2.5 rounded-xl bg-emerald-600 text-white font-bold text-xs sm:text-sm hover:bg-emerald-700 transition-colors inline-flex items-center gap-2 cursor-pointer"
            >
              <MessageCircle className="w-4 h-4" />
              <span>Ask on WhatsApp</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
