export interface NoticeItem {
  id: string;
  title: string;
  category: 'Admissions' | 'Academic' | 'Examinations' | 'Events' | 'General';
  content: string;
  dateLabel: string;
  isImportant: boolean;
  authorUid?: string;
}

export interface StudentResultItem {
  id: string;
  rollNumber: string;
  studentName: string;
  className: string;
  examTitle: string;
  session: string;
  englishMarks: number;
  hindiMarks: number;
  foreignLanguage: 'German' | 'Japanese' | 'Korean';
  foreignLangMarks: number;
  mathScienceMarks: number;
  aiCurriculumMarks: number;
  totalMarks: number;
  percentage: number;
  grade: string;
  remarks: string;
  authorUid?: string;
}

export interface FeeStructureItem {
  id: string;
  classGroup: string;
  monthlyFee: number;
  annualFee: number;
  registrationFee: number;
  sortOrder: number;
  session: string;
  authorUid?: string;
}

export interface GalleryItem {
  id: string;
  title: string;
  category: 'Events' | 'Facilities' | 'Campus Life' | 'Sports' | 'Academic' | 'Celebrations';
  description?: string;
  type: 'single' | 'group';
  imageUrl: string;
  imageUrls?: string[];
  isActive: boolean;
  sortOrder: number;
  dateLabel?: string;
  authorUid?: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface SiteSettingsData {
  schoolName: string;
  tagline: string;
  heroBadge: string;
  academicSession: string;
  admissionsOpenText: string;
  locationAddress: string;
  contactPhone: string;
  contactEmail: string;
  hostelAvailable: boolean;
  transportAvailable: boolean;
  campusLifeActive?: boolean;
  showResultsPortal: boolean;
  resultsPortalUrl: string;
  customNavButtonName: string;
  customNavButtonUrl: string;
  customNavButtonActive: boolean;
  customHeroButtonName: string;
  customHeroButtonUrl: string;
  customHeroButtonActive: boolean;
  publicInfoTitle?: string;
  publicInfoImageUrl?: string;
  publicInfoActive?: boolean;
  publicInfoDescription?: string;
  noticesInitialized?: boolean;
  authorUid?: string;
  updatedAt?: unknown;
}

export interface AdmissionInquiryItem {
  id: string;
  studentName: string;
  applyingForClass: string;
  preferredLanguage: 'Korean' | 'Japanese' | 'German' | 'English' | 'Hindi';
  boardingType: 'Day Scholar' | 'Residential Hostel';
  parentName: string;
  phone: string;
  email: string;
  message: string;
  status: 'new' | 'contacted' | 'enrolled' | 'archived';
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface AdminProfileItem {
  uid: string;
  userId?: string;
  email: string;
  name: string;
  password?: string;
  isActive?: boolean;
  role: 'super_admin' | 'college_admin';
  createdAt?: unknown;
  updatedAt?: unknown;
}

export const DEFAULT_STAFF_ACCOUNTS: AdminProfileItem[] = [
  {
    uid: 'staff-digambar-singh',
    userId: 'digambar_singh',
    email: 'digambar_singh@crownbridge.edu.in',
    name: 'Digambar Singh (School Administration)',
    password: 'School@8795071795',
    isActive: true,
    role: 'college_admin',
  },
];

export const getAssetUrl = (relativePath: string) => {
  const base = import.meta.env.BASE_URL || './';
  const cleanBase = base.endsWith('/') ? base : `${base}/`;
  const cleanPath = relativePath.startsWith('/') ? relativePath.slice(1) : relativePath;
  return `${cleanBase}${cleanPath}`;
};

export const SCHOOL_ASSETS = {
  logo: getAssetUrl('assets/crownbridge-logo.jpeg'),
  feesPamphlet: getAssetUrl('assets/crownbridge-prospectus.jpeg'),
  languagePamphlet: getAssetUrl('assets/crownbridge-languages.jpeg'),
};

export const DEFAULT_SITE_SETTINGS: SiteSettingsData = {
  schoolName: 'Crownbridge International School',
  tagline: 'Bridging Knowledge to Excellence',
  heroBadge: "State's First AI Integrated School",
  academicSession: '2027-28',
  admissionsOpenText: 'Admissions Open for Session 2027-28 (Pre-Nursery to Class 10)',
  locationAddress: 'Doimukh Road, behind SP Office, Nirjuli Village-I, Borum, Itanagar, Arunachal Pradesh 791109',
  contactPhone: '+91 94360 27109',
  contactEmail: 'admissions@crownbridge.edu.in',
  hostelAvailable: true,
  transportAvailable: true,
  campusLifeActive: true,
  showResultsPortal: false,
  resultsPortalUrl: '',
  customNavButtonName: 'Student Portal',
  customNavButtonUrl: '#admissions',
  customNavButtonActive: false,
  customHeroButtonName: 'Download Syllabus',
  customHeroButtonUrl: '#downloads',
  customHeroButtonActive: false,
  publicInfoTitle: 'Public Information & Official School Prospectus',
  publicInfoImageUrl: getAssetUrl('assets/crownbridge-prospectus.jpeg'),
  publicInfoActive: true,
  publicInfoDescription: 'Official public announcement bulletin and school overview prospectus for parents and guardians.',
  noticesInitialized: false,
};

export const DEFAULT_GALLERY: GalleryItem[] = [
  {
    id: 'gal-1',
    title: 'Crownbridge Campus & Administrative Block',
    category: 'Facilities',
    description: 'Serene campus surroundings with dedicated learning wings, sports areas, and safe hostel accommodation at Nirjuli Village-I, Borum.',
    type: 'single',
    imageUrl: 'https://i.ibb.co/7xDcBy4c/IMG-20261018-WA0011.jpg',
    isActive: true,
    sortOrder: 1,
    dateLabel: 'Session 2027-28',
  },
  {
    id: 'gal-2',
    title: 'AI Robotics & Computational STEM Studio',
    category: 'Academic',
    description: 'Arunachal Pradesh’s pioneering smart learning lab equipped with interactive robotics kits, automated diagnostic boards, and computational logic stations.',
    type: 'group',
    imageUrl: 'https://images.unsplash.com/photo-1581092918056-0c4c3acd3789?auto=format&fit=crop&w=1200&q=80',
    imageUrls: [
      'https://images.unsplash.com/photo-1581092918056-0c4c3acd3789?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=80',
      'https://i.ibb.co/7xDcBy4c/IMG-20261018-WA0011.jpg',
    ],
    isActive: true,
    sortOrder: 2,
    dateLabel: 'October 2026',
  },
  {
    id: 'gal-3',
    title: '5-Language Cultural Festival & Celebrations',
    category: 'Celebrations',
    description: 'Students proudly exhibiting multilingual fluency, traditional dance, calligraphy, and cultural etiquette across German, Japanese, Korean, Hindi, and English.',
    type: 'group',
    imageUrl: 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=1200&q=80',
    imageUrls: [
      'https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1577896851231-70ef18881754?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?auto=format&fit=crop&w=1200&q=80',
    ],
    isActive: true,
    sortOrder: 3,
    dateLabel: 'Annual Fest',
  },
  {
    id: 'gal-4',
    title: 'Inter-House Sports Champions & Athletic Meet',
    category: 'Sports',
    description: 'Sprint track races, football leagues, badminton championships, and yoga tournaments fostering sportsmanship, agility, and team camaraderie.',
    type: 'group',
    imageUrl: 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?auto=format&fit=crop&w=1200&q=80',
    imageUrls: [
      'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1526676037777-05a232554f77?auto=format&fit=crop&w=1200&q=80',
    ],
    isActive: true,
    sortOrder: 4,
    dateLabel: 'Sports 2026',
  },
  {
    id: 'gal-5',
    title: 'Modern Multilingual Knowledge Library',
    category: 'Campus Life',
    description: 'Well-stocked encyclopedias, Asian and European literary classics, STEM research journals, and peaceful reading alcoves inspiring intellectual curiosity.',
    type: 'single',
    imageUrl: 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?auto=format&fit=crop&w=1200&q=80',
    isActive: true,
    sortOrder: 5,
    dateLabel: 'Daily Campus',
  },
];

export const DEFAULT_FEES: FeeStructureItem[] = [
  {
    id: 'class-0',
    classGroup: 'Class 0 (Pre-Primary)',
    monthlyFee: 2000,
    annualFee: 24000,
    registrationFee: 10000,
    sortOrder: 1,
    session: '2027-28',
  },
  {
    id: 'class-1-3',
    classGroup: 'Class 1 – 3',
    monthlyFee: 2500,
    annualFee: 30000,
    registrationFee: 12000,
    sortOrder: 2,
    session: '2027-28',
  },
  {
    id: 'class-4-5',
    classGroup: 'Class 4 – 5',
    monthlyFee: 3000,
    annualFee: 36000,
    registrationFee: 14000,
    sortOrder: 3,
    session: '2027-28',
  },
  {
    id: 'class-6-8',
    classGroup: 'Class 6 – 8',
    monthlyFee: 3500,
    annualFee: 42000,
    registrationFee: 16000,
    sortOrder: 4,
    session: '2027-28',
  },
  {
    id: 'class-9-10',
    classGroup: 'Class 9 – 10',
    monthlyFee: 4000,
    annualFee: 48000,
    registrationFee: 18000,
    sortOrder: 5,
    session: '2027-28',
  },
];

export const DEFAULT_NOTICES: NoticeItem[] = [
  {
    id: 'notice-admissions-2027',
    title: 'Admissions Open for Academic Session 2027-28 (Pre-Nursery to Class 10)',
    category: 'Admissions',
    content:
      'Registrations are open for Day Scholars and Residential Hostel students at our Nirjuli Village-I, Borum campus. Early applicants receive priority preference for Korean, Japanese, or German language learning tracks.',
    dateLabel: 'October 2026',
    isImportant: true,
  },
  {
    id: 'notice-ai-lab',
    title: 'Inauguration of State-of-the-Art AI & Robotics Innovation Studio',
    category: 'Academic',
    content:
      'Arunachal Pradesh’s pioneering AI-integrated classrooms are equipped with adaptive computing diagnostics, interactive digital boards, and hands-on robotics workshops for all age groups.',
    dateLabel: 'November 2026',
    isImportant: true,
  },
  {
    id: 'notice-language-orientation',
    title: '5-Language Global Communication Program Parent Workshop',
    category: 'Events',
    content:
      'Learn how native-level fluency in English, Hindi, German, Japanese, and Korean empowers Crownbridge students for prestigious scholarships and global leadership.',
    dateLabel: 'November 2026',
    isImportant: false,
  },
  {
    id: 'notice-scholarship-test',
    title: 'Foundational Aptitude & Hostel Admission Assessment Schedule',
    category: 'Examinations',
    content:
      'The preliminary interaction schedule for hostel accommodation and language preference allocation has been scheduled. Contact the administrative office for time slots.',
    dateLabel: 'October 2026',
    isImportant: true,
  },
];

export const DEFAULT_RESULTS: StudentResultItem[] = [
  {
    id: 'res-101',
    rollNumber: 'CBIS-2027-101',
    studentName: 'Tenzin Norbu',
    className: 'Class 6 – 8',
    examTitle: 'Annual Readiness Assessment',
    session: '2027-28',
    englishMarks: 94,
    hindiMarks: 88,
    foreignLanguage: 'Japanese',
    foreignLangMarks: 92,
    mathScienceMarks: 96,
    aiCurriculumMarks: 95,
    totalMarks: 465,
    percentage: 93.0,
    grade: 'A1',
    remarks: 'Exceptional analytical aptitude and Japanese conversational phonetics.',
  },
];

export const VISION_MISSION = {
  vision: {
    heading: 'Our Vision',
    quote: 'To nurture globally minded, culturally grounded, and technologically empowered leaders capable of shaping a compassionate and progressive tomorrow.',
    details: [
      'Empowering every student with bilingual and multilingual fluency across Asian and European corridors.',
      'Integrating ethical artificial intelligence into foundational, middle, and high school education.',
      'Fostering intellectual autonomy, creative resilience, and empathetic leadership rooted in regional values.',
    ],
  },
  mission: {
    heading: 'Our Mission',
    quote: 'To provide world-class holistic schooling that bridges knowledge to excellence through personalized learning, cutting-edge infrastructure, and character formation.',
    pillars: [
      { title: 'Global Multilingualism', text: 'Mastery over 5 global languages: English, Hindi, German, Japanese, and Korean.' },
      { title: 'AI-Integrated Pedagogy', text: 'Adaptive curriculum integrating computational logic, robotics, and creative problem solving.' },
      { title: 'Holistic Residential Care', text: 'Safe, pastoral residential hostels for boys and girls fostering independence and camaraderie.' },
      { title: 'Character & Culture', text: 'Instilling lifelong integrity, environmental consciousness, and Indian cultural reverence.' },
    ],
  },
};

export const FIVE_LANGUAGES = [
  {
    index: '01',
    name: 'English',
    nativeScript: 'English',
    role: 'Global Language',
    region: 'International Medium of Instruction',
    landmark: 'Global Academia & International Leadership',
    description: 'Cultivating articulate public speaking, debate, advanced academic writing, and international discourse.',
  },
  {
    index: '02',
    name: 'Hindi',
    nativeScript: 'हिन्दी',
    role: 'National Language',
    region: 'India',
    landmark: 'National Heritage & Expressive Literature',
    description: 'Deepening cultural affinity, expressive communication, grammatical mastery, and pan-Indian harmony.',
  },
  {
    index: '03',
    name: 'German',
    nativeScript: 'Deutsch',
    role: 'European Language',
    region: 'Germany & Europe',
    landmark: 'European STEM & Precision Engineering Corridor',
    description: 'Direct pathway to German universities, scientific research, and continental mobility opportunities.',
  },
  {
    index: '04',
    name: 'Japanese',
    nativeScript: '日本語',
    role: 'Career & Cultural Opportunities',
    region: 'Japan',
    landmark: 'East Asian Robotics & Innovation Corridor',
    description: 'Connecting students with Japan’s high-tech robotics industry, disciplined work ethic, and cultural prestige.',
  },
  {
    index: '05',
    name: 'Korean',
    nativeScript: '한국어',
    role: 'Emerging Global Language',
    region: 'South Korea',
    landmark: 'East Asian Creative & Digital Economy',
    description: 'Preparing young minds for Asia’s dynamic digital economies, cultural diplomacy, and global scholarship programs.',
  },
];

export const CORE_PILLARS = [
  {
    number: '01',
    title: 'AI Powered Learning',
    summary: "Arunachal Pradesh's first AI-integrated curriculum with personalized learning diagnostics, smart classrooms, and foundational computational thinking.",
  },
  {
    number: '02',
    title: 'World-Class Curriculum',
    summary: 'Rigorous academic framework from Pre-Primary through Class 10 combining STEM mastery with the 5-Language Global Communication Program.',
  },
  {
    number: '03',
    title: 'Holistic Development',
    summary: 'Balanced focus on intellectual growth, physical athletics, visual & performing arts, leadership ethics, and emotional resilience.',
  },
  {
    number: '04',
    title: 'Innovation & Research',
    summary: 'Modern science, computer, and language laboratories designed for hands-on experimentation, inquiry-based projects, and future-ready skills.',
  },
  {
    number: '05',
    title: 'Values For Life',
    summary: 'Rooted in integrity, respect, environmental stewardship, and community responsibility—building compassionate leaders of tomorrow.',
  },
];

export const CLASSES_COURSES = [
  {
    wing: 'Pre-Primary Wing (Early Years)',
    classes: 'Pre-Nursery · Nursery · KG (Class 0)',
    focus: 'Play-based sensorial learning, phonetics in English & Hindi, motor skill development, creative arts, and introductory listening exposure to global languages.',
    highlights: ['Activity-based learning hubs', 'Nutritious midday snacks', 'Careful teacher-student ratio 1:12'],
  },
  {
    wing: 'Foundational Primary Wing',
    classes: 'Class 1 to Class 3',
    focus: 'Building mathematical numeracy, scientific inquiry, expressive reading, digital literacy, and conversational immersion in selected foreign languages.',
    highlights: ['Smart interactive boards', 'Introductory AI literacy & coding games', 'Arts, music & physical games'],
  },
  {
    wing: 'Middle School Wing',
    classes: 'Class 4 & Class 5',
    focus: 'Transitioning from concepts to practical applications in science, social studies, and language syntax, fostering public speaking and critical thinking.',
    highlights: ['Hands-on science experiments', 'Language lab listening drills', 'Inter-house competitions'],
  },
  {
    wing: 'Upper Middle Wing',
    classes: 'Class 6 to Class 8',
    focus: 'Advanced STEM curriculum, robotics fundamentals, foreign language certification pathways (German Goethe, Japanese JLPT, Korean TOPIK basics).',
    highlights: ['AI programming & robotics lab', 'Specialist subject educators', 'Hostel supervised evening study'],
  },
  {
    wing: 'Secondary High School Wing',
    classes: 'Class 9 & Class 10',
    focus: 'Rigorous board preparation, advanced science & mathematics, career counseling, international exchange orientation, and leadership portfolios.',
    highlights: ['Mock exam series & analysis', 'Career & competitive exam guidance', 'Individual mentorship'],
  },
];

export const FACULTY_STAFF = [
  {
    role: 'Principal & Academic Director',
    experience: '20+ years of institutional academic leadership, international curriculum specialist.',
    focus: 'Overseeing pedagogical innovation, teacher excellence, and character building.',
  },
  {
    role: 'Global Languages Faculty',
    experience: 'Certified educators in German (Goethe-Zertifikat), Japanese (JLPT), and Korean.',
    focus: 'Immersive foreign language phonetics, cultural nuances, and conversational fluency.',
  },
  {
    role: 'AI & Robotics Innovation Lead',
    experience: 'M.Tech in Artificial Intelligence & Computational STEM pedagogy.',
    focus: 'Guiding hands-on robotics, adaptive diagnostics, coding, and inquiry-driven science.',
  },
  {
    role: 'Residential & Pastoral Mentors',
    experience: 'Dedicated residential hostel wardens and healthcare staff on campus 24×7.',
    focus: 'Ensuring student emotional wellbeing, disciplined routine, and nurturing homely care.',
  },
];

export const ADMISSION_PROCESS = [
  {
    step: '01',
    title: 'Online Enquiry & Registration',
    desc: 'Fill out the online admission enquiry form on this portal or visit our administrative reception on Doimukh Road, Nirjuli.',
  },
  {
    step: '02',
    title: 'Campus Tour & Interaction',
    desc: 'Meet our academic counselors, visit the smart classrooms, AI robotics studio, separate hostels, and sports grounds.',
  },
  {
    step: '03',
    title: 'Language & Boarding Selection',
    desc: 'Select preferred foreign language pathway (German, Japanese, or Korean) and choose Day Scholar (with bus) or Residential Hostel.',
  },
  {
    step: '04',
    title: 'Document Verification & Enrollment',
    desc: 'Submit birth certificate, transfer certificate, passport photos, and medical form to confirm your child’s enrollment.',
  },
];

export const CAMPUS_FACILITIES = [
  {
    title: 'Residential School & Hostels',
    category: 'Boarding & Pastoral Care',
    description: 'Full-time residential community with separate, secure hostel wings for boys and girls, resident wardens, and disciplined study hours.',
  },
  {
    title: 'Safe & 24×7 Secure Campus',
    category: 'Campus Safety',
    description: 'Gated entrance, comprehensive CCTV monitoring across academic and residential zones, verified visitor security protocols, and fire safety systems.',
  },
  {
    title: 'AI Lab & Smart Classrooms',
    category: 'Academic Infrastructure',
    description: 'High-speed computing terminals, robotics workstations, digital interactive smart panels, and modern physics, chemistry, and biology labs.',
  },
  {
    title: 'Nutritious & Hygienic Dining',
    category: 'Dining & Health',
    description: 'Hygienic institutional kitchen and spacious dining hall serving wholesome, freshly cooked balanced vegetarian and non-vegetarian meals.',
  },
  {
    title: 'Sports & Fitness Arena',
    category: 'Athletics & Physical Fitness',
    description: 'Outdoor sports field, athletics track, badminton courts, table tennis, yoga pavilion, and dedicated physical training instructors.',
  },
  {
    title: 'Arts, Music & Cultural Studio',
    category: 'Creative Expression',
    description: 'Dedicated sound-proof music practice room, traditional arts and handicraft corner, dramatics stage, and multi-faith prayer/meditation hall.',
  },
  {
    title: 'Well-Stocked Knowledge Library',
    category: 'Learning Resources',
    description: 'Rich collection of encyclopedias, multilingual storybooks, STEM reference materials, scientific journals, and quiet reading alcoves.',
  },
  {
    title: 'Green, Clean Eco-Campus',
    category: 'Environment & Wellbeing',
    description: 'Serene, pollution-free green setting in Nirjuli Village-I near Itanagar with landscaped flora, clean mountain breeze, and solar backup.',
  },
];

export const TRANSPORT_INFO = {
  overview: 'Crownbridge International School operates a modern, well-maintained fleet of school buses covering all major residential corridors in the Capital Complex region.',
  safety: [
    'GPS live vehicle tracking for real-time parent reassurance',
    'Experienced, police-verified commercial drivers and dedicated bus attendants',
    'Speed governors and on-board emergency first-aid boxes',
    'Mandatory daily attendance logging upon boarding and drop-off',
  ],
  routes: [
    { routeNo: 'Route 1', coverage: 'Nirjuli Village-I ↔ Doimukh Market ↔ Borum Campus' },
    { routeNo: 'Route 2', coverage: 'Naharlagun Helipad / Model Village ↔ A-Sector ↔ Nirjuli Campus' },
    { routeNo: 'Route 3', coverage: 'Itanagar Ganga Market ↔ Papu Nallah ↔ Borum Gate' },
  ],
};

export const EVENTS_ACTIVITIES = [
  {
    title: 'Annual AI & Innovation Expo',
    month: 'November',
    desc: 'Students exhibit functioning robotics models, machine-learning concepts, automated smart home mockups, and science working prototypes.',
  },
  {
    title: 'Multilingual Cultural Odyssey',
    month: 'December',
    desc: 'Festive celebration of Korean Hangul Day, Japanese Origami & Tea culture, German fairy tales, Hindi Kavi Sammelan, and English Shakespearean theatre.',
  },
  {
    title: 'Annual Inter-House Sports Meet',
    month: 'January',
    desc: 'Track and field sprints, relay races, football, badminton tournaments, tug-of-war, and march-past display showcasing athletic grit.',
  },
  {
    title: 'Youth Leadership & Model UN',
    month: 'February',
    desc: 'Middle and high school students debate global climate policy, technological ethics, and diplomacy representing diverse nations.',
  },
];

export const PHOTO_GALLERY = [
  {
    title: 'Modern Academic Building',
    category: 'Campus Architecture',
    desc: 'Contemporary architecture with natural daylight and mountain vistas at Nirjuli.',
  },
  {
    title: 'AI & Robotics Innovation Studio',
    category: 'Technology Labs',
    desc: 'Smart computational lab where students develop computational thinking and coding skills.',
  },
  {
    title: 'Smart Interactive Classrooms',
    category: 'Academic Spaces',
    desc: 'Ergonomic furniture, digital touch displays, and collaborative group seating.',
  },
  {
    title: 'Residential Hostels (Boys & Girls)',
    category: 'Boarding Facilities',
    desc: 'Well-ventilated dormitories with study tables, storage wardrobes, and resident wardens.',
  },
  {
    title: 'Sports Grounds & Athletics Area',
    category: 'Sports & Athletics',
    desc: 'Open athletic arena surrounded by scenic green hills for outdoor football and sports.',
  },
  {
    title: 'Nutritious Dining & Cafeteria',
    category: 'Dining & Wellness',
    desc: 'Hygienic multi-course meal preparation maintaining stringent nutritional standards.',
  },
];

export const ACHIEVEMENTS_AWARDS = [
  {
    year: '2026-27',
    award: "State's First AI Integrated School Citation",
    authority: 'Regional Educational Innovation Forum',
    desc: 'Recognized for pioneering artificial intelligence diagnostics and digital pedagogy in Arunachal Pradesh.',
  },
  {
    year: '2026',
    award: 'Multilingual Curriculum Excellence Honor',
    authority: 'East Asia & European Language Alliance',
    desc: 'Commended for integrating 5 languages (Korean, Japanese, German, English, Hindi) at school level.',
  },
  {
    year: '2026',
    award: 'Clean & Green Eco-Campus Gold Award',
    authority: 'District Environmental Board',
    desc: 'Honored for zero-plastic campus protocols, rainwater harvesting, and clean residential surroundings.',
  },
];

export interface DownloadDocItem {
  id: string;
  title: string;
  category: 'Forms' | 'Syllabus' | 'Calendar' | 'Hostel' | 'General';
  fileSize: string;
  filename?: string;
  fileUrl: string;
  isActive: boolean;
  order: number;
  sortOrder?: number;
  authorUid?: string;
  updatedAt?: unknown;
}

export const DEFAULT_DOWNLOADS: DownloadDocItem[] = [
  {
    id: 'dl-1',
    title: 'Student Admission & Registration Form (Session 2027-28)',
    fileSize: 'PDF · 420 KB',
    category: 'Forms',
    filename: 'Crownbridge_Admission_Form_2027-28.pdf',
    fileUrl: getAssetUrl('assets/crownbridge-prospectus.jpeg'),
    isActive: true,
    order: 1,
  },
  {
    id: 'dl-2',
    title: '5-Language Global Curriculum Guide & Syllabi Outline',
    fileSize: 'PDF · 850 KB',
    category: 'Syllabus',
    filename: 'Crownbridge_5_Language_Program_Guide.pdf',
    fileUrl: getAssetUrl('assets/crownbridge-languages.jpeg'),
    isActive: true,
    order: 2,
  },
  {
    id: 'dl-3',
    title: 'Annual Academic Calendar & Events Schedule (2027-28)',
    fileSize: 'PDF · 310 KB',
    category: 'Calendar',
    filename: 'Crownbridge_Academic_Calendar_2027-28.pdf',
    fileUrl: getAssetUrl('assets/crownbridge-logo.jpeg'),
    isActive: true,
    order: 3,
  },
  {
    id: 'dl-4',
    title: 'Residential Hostel Guidelines & Boarding Checklist',
    fileSize: 'PDF · 280 KB',
    category: 'Hostel',
    filename: 'Crownbridge_Hostel_Rules_and_Kit.pdf',
    fileUrl: getAssetUrl('assets/crownbridge-prospectus.jpeg'),
    isActive: true,
    order: 4,
  },
];

export const DOWNLOADS_LIST = DEFAULT_DOWNLOADS;

export interface LearningResourceItem {
  id: string;
  title: string;
  classLevel: string; // 'Pre-Primary' | 'Class 1' | 'Class 2' ... 'Class 10' | 'All Classes'
  subject: string;    // 'Mathematics' | 'Science' | 'English' | 'Hindi' | 'Social Science' | 'EVS' | 'Sanskrit' | 'AI & STEM' | 'General'
  category: 'NCERT Textbooks' | 'Worksheets & Practice' | 'CBSE Syllabus' | 'Sample Papers' | 'Digital Interactive';
  description: string;
  resourceUrl: string;
  officialSource: string; // 'NCERT Portal' | 'DIKSHA' | 'CBSE Academic' | 'ePathshala' | 'Crownbridge Academic Wing'
  isActive: boolean;
  sortOrder: number;
  authorUid?: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export const DEFAULT_LEARNING_RESOURCES: LearningResourceItem[] = [
  // 1. Official National Portals
  {
    id: 'res-ncert-portal',
    title: 'NCERT Textbooks Online (Classes 1–12 Complete E-Books)',
    classLevel: 'All Classes',
    subject: 'General',
    category: 'NCERT Textbooks',
    description: 'Direct portal to select Class, Subject, and Book Title to read or download official NCERT textbook PDFs chapter-by-chapter.',
    resourceUrl: 'https://ncert.nic.in/textbook.php',
    officialSource: 'NCERT Portal',
    isActive: true,
    sortOrder: 1,
  },
  {
    id: 'res-diksha-portal',
    title: 'DIKSHA National Digital Education Portal',
    classLevel: 'All Classes',
    subject: 'General',
    category: 'Digital Interactive',
    description: 'Digital textbooks, QR code-linked multimedia lessons, and interactive practice worksheets powered by the Ministry of Education.',
    resourceUrl: 'https://diksha.gov.in/',
    officialSource: 'DIKSHA',
    isActive: true,
    sortOrder: 2,
  },
  {
    id: 'res-cbse-academic',
    title: 'CBSE Academic Curriculum & Skill Modules',
    classLevel: 'All Classes',
    subject: 'General',
    category: 'CBSE Syllabus',
    description: 'Official CBSE circulars, annual curriculum framework, learning outcomes, and foundational stage guidelines.',
    resourceUrl: 'https://cbseacademic.nic.in/',
    officialSource: 'CBSE Academic',
    isActive: true,
    sortOrder: 3,
  },
  {
    id: 'res-epathshala',
    title: 'ePathshala Digital Textbook & Audio/Video Library',
    classLevel: 'All Classes',
    subject: 'General',
    category: 'Digital Interactive',
    description: 'Joint initiative of MoE and NCERT providing flipbooks, e-textbooks, periodicals, and interactive multimedia teaching aids.',
    resourceUrl: 'https://epathshala.nic.in/',
    officialSource: 'ePathshala',
    isActive: true,
    sortOrder: 4,
  },
  {
    id: 'res-ncert-exemplar',
    title: 'NCERT Exemplar Problems & In-Depth Practice',
    classLevel: 'Class 6',
    subject: 'Mathematics',
    category: 'Worksheets & Practice',
    description: 'High-order thinking problem sets and solution keys for conceptual clarity in Mathematics and Science.',
    resourceUrl: 'https://ncert.nic.in/exemplar-problems.php',
    officialSource: 'NCERT Portal',
    isActive: true,
    sortOrder: 5,
  },

  // 2. Primary Classes (Classes 1 - 5)
  {
    id: 'res-cl1-math',
    title: 'Class 1 Joyful Mathematics (NCERT NCF 2023 Edition)',
    classLevel: 'Class 1',
    subject: 'Mathematics',
    category: 'NCERT Textbooks',
    description: 'Activity-based foundational numeracy covering patterns, shapes, counting, and early spatial reasoning.',
    resourceUrl: 'https://ncert.nic.in/textbook.php',
    officialSource: 'NCERT Portal',
    isActive: true,
    sortOrder: 6,
  },
  {
    id: 'res-cl1-english',
    title: 'Class 1 Mridang (English Foundational Reader)',
    classLevel: 'Class 1',
    subject: 'English',
    category: 'NCERT Textbooks',
    description: 'Rhymes, phonic vocabulary, picture stories, and listening exercises designed for joyful early communication.',
    resourceUrl: 'https://ncert.nic.in/textbook.php',
    officialSource: 'NCERT Portal',
    isActive: true,
    sortOrder: 7,
  },
  {
    id: 'res-cl1-hindi',
    title: 'Class 1 Sarangi (Hindi Matrubhasha Reader)',
    classLevel: 'Class 1',
    subject: 'Hindi',
    category: 'NCERT Textbooks',
    description: 'Foundational Hindi vowels, consonants, poetry, and pictorial comprehension for Class 1 learners.',
    resourceUrl: 'https://ncert.nic.in/textbook.php',
    officialSource: 'NCERT Portal',
    isActive: true,
    sortOrder: 8,
  },
  {
    id: 'res-cl2-all',
    title: 'Class 2 Textbooks & Chapter Modules (Mridang, Sarangi, Joyful Math)',
    classLevel: 'Class 2',
    subject: 'General',
    category: 'NCERT Textbooks',
    description: 'Comprehensive Class 2 e-books including Joyful Mathematics, English Mridang, and Hindi Sarangi.',
    resourceUrl: 'https://ncert.nic.in/textbook.php',
    officialSource: 'NCERT Portal',
    isActive: true,
    sortOrder: 9,
  },
  {
    id: 'res-cl3-santoor',
    title: 'Class 3 Santoor (English) & Veena (Hindi) - New NCERT',
    classLevel: 'Class 3',
    subject: 'English',
    category: 'NCERT Textbooks',
    description: 'Official Class 3 revised textbooks including Santoor (English), Veena (Hindi), and Our Wondrous World (EVS).',
    resourceUrl: 'https://ncert.nic.in/textbook.php',
    officialSource: 'NCERT Portal',
    isActive: true,
    sortOrder: 10,
  },
  {
    id: 'res-cl3-evs',
    title: 'Class 3 Our Wondrous World (Environmental Studies)',
    classLevel: 'Class 3',
    subject: 'EVS',
    category: 'NCERT Textbooks',
    description: 'Nature exploration, community awareness, family life, hygiene, and regional environment studies.',
    resourceUrl: 'https://ncert.nic.in/textbook.php',
    officialSource: 'NCERT Portal',
    isActive: true,
    sortOrder: 11,
  },
  {
    id: 'res-cl4-mathmagic',
    title: 'Class 4 Math-Magic & Environmental Studies (Looking Around)',
    classLevel: 'Class 4',
    subject: 'Mathematics',
    category: 'NCERT Textbooks',
    description: 'Fractions, measurement, geometry, multiplication, and nature curiosity modules for Class 4 students.',
    resourceUrl: 'https://ncert.nic.in/textbook.php',
    officialSource: 'NCERT Portal',
    isActive: true,
    sortOrder: 12,
  },
  {
    id: 'res-cl5-all',
    title: 'Class 5 Complete NCERT Study Set (Math, EVS, English Marigold, Hindi)',
    classLevel: 'Class 5',
    subject: 'General',
    category: 'NCERT Textbooks',
    description: 'Primary transition curriculum: Math-Magic, Looking Around EVS, Marigold English, and Rimjhim Hindi.',
    resourceUrl: 'https://ncert.nic.in/textbook.php',
    officialSource: 'NCERT Portal',
    isActive: true,
    sortOrder: 13,
  },

  // 3. Middle School Classes (Classes 6 - 8)
  {
    id: 'res-cl6-curiosity',
    title: 'Class 6 Curiosity (New NCERT Science Curriculum 2024–25)',
    classLevel: 'Class 6',
    subject: 'Science',
    category: 'NCERT Textbooks',
    description: 'Living organisms, materials, motion, electricity, and scientific inquiry hands-on experiments.',
    resourceUrl: 'https://ncert.nic.in/textbook.php',
    officialSource: 'NCERT Portal',
    isActive: true,
    sortOrder: 14,
  },
  {
    id: 'res-cl6-math',
    title: 'Class 6 Ganita Prakash (New NCERT Mathematics)',
    classLevel: 'Class 6',
    subject: 'Mathematics',
    category: 'NCERT Textbooks',
    description: 'Number play, algebra foundations, geometrical constructions, integers, and fractions.',
    resourceUrl: 'https://ncert.nic.in/textbook.php',
    officialSource: 'NCERT Portal',
    isActive: true,
    sortOrder: 15,
  },
  {
    id: 'res-cl6-social',
    title: 'Class 6 Exploring Society: India and Beyond (Social Science)',
    classLevel: 'Class 6',
    subject: 'Social Science',
    category: 'NCERT Textbooks',
    description: 'Geography of Earth, ancient civilizations of India, democratic governance, and local cultures.',
    resourceUrl: 'https://ncert.nic.in/textbook.php',
    officialSource: 'NCERT Portal',
    isActive: true,
    sortOrder: 16,
  },
  {
    id: 'res-cl7-science',
    title: 'Class 7 Science & Mathematics NCERT Study Package',
    classLevel: 'Class 7',
    subject: 'Science',
    category: 'NCERT Textbooks',
    description: 'Nutrition in plants and animals, heat, acids and bases, physical and chemical changes, and rational numbers.',
    resourceUrl: 'https://ncert.nic.in/textbook.php',
    officialSource: 'NCERT Portal',
    isActive: true,
    sortOrder: 17,
  },
  {
    id: 'res-cl8-science-math',
    title: 'Class 8 Science & Mathematics Comprehensive NCERT E-Books',
    classLevel: 'Class 8',
    subject: 'Science',
    category: 'NCERT Textbooks',
    description: 'Cell structure, reproduction, force and friction, sound, light, algebraic expressions, and mensuration.',
    resourceUrl: 'https://ncert.nic.in/textbook.php',
    officialSource: 'NCERT Portal',
    isActive: true,
    sortOrder: 18,
  },

  // 4. Secondary & Special Crownbridge Modules (Classes 9 - 10 & 5-Languages / AI)
  {
    id: 'res-cl9-10-cbse',
    title: 'CBSE Secondary (Classes IX & X) Curriculum Framework',
    classLevel: 'Class 9',
    subject: 'General',
    category: 'CBSE Syllabus',
    description: 'Official syllabus, subject codes, examination structure, internal assessment rubrics, and project guidelines.',
    resourceUrl: 'https://cbseacademic.nic.in/curriculum_2026.html',
    officialSource: 'CBSE Academic',
    isActive: true,
    sortOrder: 19,
  },
  {
    id: 'res-cl10-questionbank',
    title: 'CBSE Official Question Bank & Practice Questions',
    classLevel: 'Class 10',
    subject: 'Mathematics',
    category: 'Sample Papers',
    description: 'Official CBSE practice questions with step-by-step marking schemes for Mathematics, Science, and Social Science.',
    resourceUrl: 'https://cbseacademic.nic.in/qbclass10.html',
    officialSource: 'CBSE Academic',
    isActive: true,
    sortOrder: 20,
  },
  {
    id: 'res-ai-robotics',
    title: 'Crownbridge AI & Computational Thinking Primer (Classes 3–10)',
    classLevel: 'All Classes',
    subject: 'AI & STEM',
    category: 'Worksheets & Practice',
    description: 'Foundational concepts in algorithms, Python basics, scratch animation, and robotics ethics curated for school students.',
    resourceUrl: 'https://cbseacademic.nic.in/cbe/',
    officialSource: 'Crownbridge Academic Wing',
    isActive: true,
    sortOrder: 21,
  },
  {
    id: 'res-multilingual-kit',
    title: 'Crownbridge 5-Language Immersion Resource Sheet (German, Japanese, Korean)',
    classLevel: 'All Classes',
    subject: 'General',
    category: 'Worksheets & Practice',
    description: 'Hiragana/Katakana charts, Korean Hangul alphabet sound tables, and German A1 foundational vocabulary guide.',
    resourceUrl: getAssetUrl('assets/crownbridge-languages.jpeg'),
    officialSource: 'Crownbridge Academic Wing',
    isActive: true,
    sortOrder: 22,
  },
];
