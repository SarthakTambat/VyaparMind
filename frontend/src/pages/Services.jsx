import React, { useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight, X, Plant, Buildings, BookOpen, Warehouse, Storefront,
  Truck, Factory, Money, Gear, Globe, DeviceMobile, MagnifyingGlass,
  GraduationCap, UsersFour, ArrowsClockwise, Cloud, Code, Bug,
  Lightning, Sparkle, RocketLaunch, TrendUp, Timer, Brain, Check,
  Star, ArrowLeft, Play,
} from "@phosphor-icons/react";
import LoadingSplash from "components/LoadingSplash";

const HERO_BG = "https://images.pexels.com/photos/3183153/pexels-photo-3183153.jpeg?auto=compress&cs=tinysrgb&w=1200";

// ─── SERVICE IMAGES (Pexels/Unsplash free-to-use) ────────────────────────────
const IMAGES = {
  agriculture: "https://images.pexels.com/photos/2132171/pexels-photo-2132171.jpeg?auto=compress&cs=tinysrgb&w=600",
  construction: "https://images.pexels.com/photos/2219024/pexels-photo-2219024.jpeg?auto=compress&cs=tinysrgb&w=600",
  library: "https://images.pexels.com/photos/159711/books-bookstore-book-reading-159711.jpeg?auto=compress&cs=tinysrgb&w=600",
  warehouse: "https://images.pexels.com/photos/4481259/pexels-photo-4481259.jpeg?auto=compress&cs=tinysrgb&w=600",
  retail: "https://images.pexels.com/photos/3965548/pexels-photo-3965548.jpeg?auto=compress&cs=tinysrgb&w=600",
  distribution: "https://images.pexels.com/photos/6169668/pexels-photo-6169668.jpeg?auto=compress&cs=tinysrgb&w=600",
  manufacturing: "https://images.pexels.com/photos/1108101/pexels-photo-1108101.jpeg?auto=compress&cs=tinysrgb&w=600",
  payroll: "https://images.pexels.com/photos/4386431/pexels-photo-4386431.jpeg?auto=compress&cs=tinysrgb&w=600",
  erp: "https://images.pexels.com/photos/7688336/pexels-photo-7688336.jpeg?auto=compress&cs=tinysrgb&w=600",
  webdev: "https://images.pexels.com/photos/1181467/pexels-photo-1181467.jpeg?auto=compress&cs=tinysrgb&w=600",
  android: "https://images.pexels.com/photos/1092644/pexels-photo-1092644.jpeg?auto=compress&cs=tinysrgb&w=600",
  seo: "https://images.pexels.com/photos/270637/pexels-photo-270637.jpeg?auto=compress&cs=tinysrgb&w=600",
  education: "https://images.pexels.com/photos/5905709/pexels-photo-5905709.jpeg?auto=compress&cs=tinysrgb&w=600",
  hiring: "https://images.pexels.com/photos/3184465/pexels-photo-3184465.jpeg?auto=compress&cs=tinysrgb&w=600",
  migration: "https://images.pexels.com/photos/1181354/pexels-photo-1181354.jpeg?auto=compress&cs=tinysrgb&w=600",
  hosting: "https://images.pexels.com/photos/325229/pexels-photo-325229.jpeg?auto=compress&cs=tinysrgb&w=600",
  enterprise: "https://images.pexels.com/photos/3183197/pexels-photo-3183197.jpeg?auto=compress&cs=tinysrgb&w=600",
  qa: "https://images.pexels.com/photos/3861969/pexels-photo-3861969.jpeg?auto=compress&cs=tinysrgb&w=600",
};

// ─── SERVICE DOMAINS ─────────────────────────────────────────────────────────
const SERVICES = [
  {
    id: "agriculture",
    title: "Agricultural Software",
    tagline: "From soil to sale — digitized",
    icon: Plant,
    color: "#4CAF50",
    description: "Smart crop management, supply chain tracking, weather-based alerts, and automated procurement systems for modern farms and agri-businesses.",
    features: ["Crop lifecycle management", "Supply chain automation", "Weather-integrated alerts", "Mandi price analytics"],
    caseStudy: { client: "GreenHarvest Farms", result: "40% reduction in post-harvest losses", industry: "Agri-Tech" },
  },
  {
    id: "construction",
    title: "Construction Management",
    tagline: "Build smarter, deliver faster",
    icon: Buildings,
    color: "#FF9800",
    description: "Project tracking, material procurement, contractor management, and real-time progress monitoring for construction firms of all sizes.",
    features: ["Project milestone tracking", "Material cost optimization", "Contractor & labor management", "Real-time site monitoring"],
    caseStudy: { client: "BuildRight Infra", result: "25% faster project delivery", industry: "Infrastructure" },
  },
  {
    id: "library",
    title: "Library Management",
    tagline: "Knowledge, organized intelligently",
    icon: BookOpen,
    color: "#9C27B0",
    description: "Digital cataloging, member management, automated fines, reservation systems, and AI-powered book recommendations.",
    features: ["Smart catalog search", "Member self-service portal", "Automated overdue alerts", "AI book recommendations"],
    caseStudy: { client: "CityRead Libraries", result: "3x increase in member engagement", industry: "Education" },
  },
  {
    id: "warehouse",
    title: "Warehouse Management",
    tagline: "Every shelf, every item — tracked",
    icon: Warehouse,
    color: "#00BCD4",
    description: "Inventory tracking, pick-pack-ship automation, barcode/RFID integration, and predictive stock management.",
    features: ["Real-time inventory tracking", "Pick-pack-ship automation", "Barcode/RFID integration", "Demand forecasting AI"],
    caseStudy: { client: "QuickStore Logistics", result: "60% faster order fulfillment", industry: "Logistics" },
  },
  {
    id: "retail",
    title: "Retail Software",
    tagline: "Sell more, manage less",
    icon: Storefront,
    color: "#E91E63",
    description: "POS systems, customer loyalty programs, multi-store management, and AI-driven pricing optimization.",
    features: ["Smart POS system", "Customer loyalty engine", "Multi-store sync", "Dynamic pricing AI"],
    caseStudy: { client: "FashionHub Retail", result: "35% increase in repeat customers", industry: "Retail" },
  },
  {
    id: "distribution",
    title: "Distribution Software",
    tagline: "Right product, right place, right time",
    icon: Truck,
    color: "#3F51B5",
    description: "Route optimization, dealer management, order tracking, and demand-supply balancing for distributors.",
    features: ["AI route optimization", "Dealer network management", "Real-time order tracking", "Demand-supply balancing"],
    caseStudy: { client: "SpeedLink Distributors", result: "30% reduction in delivery costs", industry: "FMCG" },
  },
  {
    id: "manufacturing",
    title: "Manufacturing Software",
    tagline: "Precision production, zero waste",
    icon: Factory,
    color: "#607D8B",
    description: "Production planning, quality control, machine maintenance scheduling, and supply chain coordination.",
    features: ["Production scheduling AI", "Quality control automation", "Predictive maintenance", "Supply chain coordination"],
    caseStudy: { client: "PrecisionMake Industries", result: "45% reduction in machine downtime", industry: "Manufacturing" },
  },
  {
    id: "payroll",
    title: "Payroll Software",
    tagline: "Happy employees, zero errors",
    icon: Money,
    color: "#8BC34A",
    description: "Automated salary processing, tax compliance, attendance integration, and employee self-service portals.",
    features: ["Auto salary calculation", "Tax compliance engine", "Attendance integration", "Employee self-service"],
    caseStudy: { client: "TechForce Solutions", result: "99.9% payroll accuracy achieved", industry: "IT Services" },
  },
  {
    id: "erp",
    title: "ERP Solutions",
    tagline: "One system, infinite possibilities",
    icon: Gear,
    color: "#FF5722",
    description: "Unified business management covering finance, HR, operations, CRM, and analytics — all in one integrated platform.",
    features: ["Unified business modules", "Custom workflow builder", "Real-time analytics dashboard", "Multi-branch support"],
    caseStudy: { client: "OmniCorp Group", result: "50% improvement in operational efficiency", industry: "Conglomerate" },
  },
  {
    id: "webdev",
    title: "Web Development",
    tagline: "Websites that work as hard as you",
    icon: Globe,
    color: "#2196F3",
    description: "Custom web applications, e-commerce platforms, progressive web apps, and high-performance SaaS products.",
    features: ["Custom web apps", "E-commerce platforms", "Progressive web apps", "High-performance SaaS"],
    caseStudy: { client: "ShopEasy India", result: "200% increase in online sales", industry: "E-Commerce" },
  },
  {
    id: "android",
    title: "Android App Development",
    tagline: "Your business in every pocket",
    icon: DeviceMobile,
    color: "#4CAF50",
    description: "Native and cross-platform mobile apps with seamless UX, push notifications, and offline-first architecture.",
    features: ["Native Android apps", "Cross-platform (React Native)", "Offline-first architecture", "Push notification engine"],
    caseStudy: { client: "FoodDash App", result: "1M+ downloads in 6 months", industry: "Food Tech" },
  },
  {
    id: "seo",
    title: "SEO & SMO",
    tagline: "Be found. Be followed. Be first.",
    icon: MagnifyingGlass,
    color: "#FFC107",
    description: "Search engine optimization, social media marketing, content strategy, and AI-powered campaign management.",
    features: ["Technical SEO audits", "Social media automation", "Content strategy AI", "Performance analytics"],
    caseStudy: { client: "HealthPlus Clinic", result: "5x organic traffic in 4 months", industry: "Healthcare" },
  },
  {
    id: "education",
    title: "Educational Platform",
    tagline: "Transform teaching, amplify learning",
    icon: GraduationCap,
    color: "#673AB7",
    description: "LMS platforms, virtual classrooms, assessment engines, and AI tutoring systems for schools and coaching centers.",
    features: ["AI-powered LMS", "Virtual classrooms", "Smart assessment engine", "Progress analytics"],
    caseStudy: { client: "LearnSmart Academy", result: "85% improvement in student outcomes", industry: "EdTech" },
  },
  {
    id: "hiring",
    title: "Hiring Platform",
    tagline: "Find the right talent, faster",
    icon: UsersFour,
    color: "#009688",
    description: "Applicant tracking, AI resume screening, interview scheduling, and candidate management systems.",
    features: ["AI resume screening", "Smart interview scheduling", "Candidate pipeline management", "Skill assessment engine"],
    caseStudy: { client: "HireNow Solutions", result: "70% reduction in time-to-hire", industry: "HR Tech" },
  },
  {
    id: "migration",
    title: "Legacy Product Migration",
    tagline: "Old systems, new life",
    icon: ArrowsClockwise,
    color: "#795548",
    description: "Migrate legacy software to modern cloud-native architectures with zero downtime and complete data integrity.",
    features: ["Zero-downtime migration", "Data integrity assurance", "Cloud-native architecture", "Performance optimization"],
    caseStudy: { client: "BankSecure Financial", result: "100% data migrated, zero downtime", industry: "FinTech" },
  },
  {
    id: "hosting",
    title: "Server Hosting & DevOps",
    tagline: "Always up, always fast, always secure",
    icon: Cloud,
    color: "#03A9F4",
    description: "Cloud infrastructure, CI/CD pipelines, auto-scaling, monitoring, and 24/7 managed server solutions.",
    features: ["Auto-scaling infrastructure", "CI/CD pipeline setup", "24/7 monitoring & alerts", "99.99% uptime SLA"],
    caseStudy: { client: "StreamFlix OTT", result: "99.99% uptime serving 500K users", industry: "Media" },
  },
  {
    id: "enterprise",
    title: "Enterprise Software",
    tagline: "Built for scale, designed for impact",
    icon: Code,
    color: "#1A237E",
    description: "Custom enterprise solutions, microservices architecture, API platforms, and large-scale system design.",
    features: ["Microservices architecture", "API-first design", "Enterprise security", "Scalable to millions"],
    caseStudy: { client: "MegaCorp Industries", result: "10x throughput improvement", industry: "Enterprise" },
  },
  {
    id: "qa",
    title: "QA & Testing",
    tagline: "Ship with confidence, every time",
    icon: Bug,
    color: "#F44336",
    description: "Automated testing, performance testing, security audits, and continuous quality assurance pipelines.",
    features: ["Automated test suites", "Performance load testing", "Security vulnerability scans", "CI-integrated QA"],
    caseStudy: { client: "PaySafe Wallet", result: "Zero critical bugs in production", industry: "FinTech" },
  },
];

// ─── STATS ────────────────────────────────────────────────────────────────────
const STATS = [
  { number: "150+", label: "Projects Delivered", icon: RocketLaunch },
  { number: "50+", label: "Industries Served", icon: TrendUp },
  { number: "98%", label: "Client Retention", icon: Star },
  { number: "24/7", label: "Support & Monitoring", icon: Timer },
];

// ─── MAIN COMPONENT ──────────────────────────────────────────────────────────
export default function Services() {
  const [activeService, setActiveService] = useState(null);
  const [filter, setFilter] = useState("all");
  const [showSplash, setShowSplash] = useState(false);

  const handleStartProject = (e) => {
    e.preventDefault();
    setShowSplash(true);
    setTimeout(() => {
      window.location.href = "/register";
    }, 6000);
  };

  const categories = {
    all: "All Services",
    software: "Business Software",
    development: "Development",
    digital: "Digital & Marketing",
  };

  const categoryMap = {
    software: ["agriculture", "construction", "library", "warehouse", "retail", "distribution", "manufacturing", "payroll", "erp"],
    development: ["webdev", "android", "enterprise", "migration", "hosting", "qa"],
    digital: ["seo", "education", "hiring"],
  };

  const filteredServices = filter === "all"
    ? SERVICES
    : SERVICES.filter((s) => categoryMap[filter]?.includes(s.id));

  return (
    <div className="min-h-screen bg-[#F9FAFB] text-slate-900">
      {showSplash && <LoadingSplash message="Preparing your project workspace..." />}
      {/* ═══════════════════════ DARK HERO SECTION ═══════════════════════ */}
      <section className="relative bg-[#090E17] text-white overflow-hidden noise">
        <div className="absolute inset-0 grid-bg opacity-60" />
        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: `url(${HERO_BG})`, backgroundSize: "cover", backgroundPosition: "center" }} />
        <div className="absolute inset-0 bg-gradient-to-b from-[#090E17]/70 via-[#090E17]/85 to-[#090E17]" />
        {/* Header */}
        <header className="sticky top-0 z-50 bg-[#090E17]/90 border-b border-white/10" style={{ backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)" }}>
          <div className="max-w-7xl mx-auto px-4 sm:px-8 py-3 flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2">
              <img src="/vyaparmind-logo.png" alt="VyaparMind" className="w-8 h-8 sm:w-10 sm:h-10" />
              <span className="font-display font-black text-white text-lg sm:text-xl tracking-tighter">VyaparMind</span>
            </Link>
            <div className="flex items-center gap-3">
              <Link to="/" className="text-sm text-white/60 hover:text-white transition-colors hidden sm:inline-flex items-center gap-1">
                <ArrowLeft size={14} weight="bold" />Home
              </Link>
              <Link to="/demo" className="text-sm text-white/60 hover:text-white transition-colors hidden sm:inline-flex items-center gap-1">
                <Play size={14} weight="fill" />Demo
              </Link>
              <Link
                to="/register"
                className="inline-flex items-center gap-2 bg-[#00A884] text-white font-bold text-sm px-4 py-2 rounded-lg hover:bg-[#008f6f] transition-colors"
              >
                Get Started <ArrowRight weight="bold" size={14} />
              </Link>
            </div>
          </div>
        </header>

        {/* Hero Content */}
        <div className="relative max-w-7xl mx-auto px-4 sm:px-8 pt-20 sm:pt-28 pb-20 sm:pb-32 text-center">
          <div className="absolute inset-0 bg-gradient-to-br from-[#00A884]/8 via-transparent to-[#6C63FF]/8" />
          <div className="absolute top-20 left-1/4 w-96 h-96 bg-[#00A884]/10 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-10 right-1/4 w-80 h-80 bg-[#6C63FF]/10 rounded-full blur-3xl animate-pulse" />

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="relative">
            <div className="inline-flex items-center gap-2 border border-white/15 px-4 py-2 rounded-full mb-8">
              <Lightning weight="fill" size={14} className="text-[#00A884]" />
              <span className="text-[11px] sm:text-xs tracking-wider uppercase text-white/70 font-semibold">Powered by AI • Tailored for India</span>
            </div>

            {/* MAIN HEADLINE - BOLD & LARGE */}
            <h1 className="font-display font-black text-4xl sm:text-6xl lg:text-[5rem] tracking-tighter leading-[0.92]">
              <span className="text-[#00A884]">Complete Business</span>
              <br />
              <span className="text-white">Automation Suite</span>
            </h1>

            <p className="mt-8 text-lg sm:text-xl text-white/65 max-w-2xl mx-auto leading-relaxed">
              A customized approach focused on <span className="text-white font-bold">driving growth</span> for your business,{" "}
              <span className="text-white font-bold">generating sales</span>, reducing human work, and{" "}
              <span className="text-[#00A884] font-bold">saving time</span> — across 18+ industries.
            </p>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="mt-5 text-base sm:text-lg text-white/40 italic font-medium"
            >
              "Automate the mundane. Amplify the extraordinary."
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="mt-10 flex flex-wrap justify-center gap-4"
            >
              <button
                onClick={handleStartProject}
                className="inline-flex items-center gap-2 bg-[#00A884] text-white font-bold px-8 py-4 rounded-xl hover:bg-[#008f6f] active:scale-[0.97] transition-all text-base shadow-lg shadow-[#00A884]/20"
              >
                Start Your Project <ArrowRight weight="bold" size={18} />
              </button>
              <a
                href="#services"
                className="inline-flex items-center gap-2 bg-white/10 text-white font-bold px-8 py-4 rounded-xl hover:bg-white/15 transition-all text-base border border-white/15"
              >
                Explore Services <Sparkle weight="fill" size={18} />
              </a>
            </motion.div>
          </motion.div>

          {/* Stats row */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.5 }}
            className="relative mt-16 grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6 max-w-3xl mx-auto"
          >
            {STATS.map((stat) => {
              const SIcon = stat.icon;
              return (
                <div key={stat.label} className="bg-white/5 border border-white/10 rounded-xl p-4 sm:p-5 text-center backdrop-blur-sm">
                  <SIcon size={24} weight="fill" className="text-[#00A884] mx-auto mb-2" />
                  <div className="font-black text-2xl sm:text-3xl text-white">{stat.number}</div>
                  <div className="text-[11px] text-white/50 mt-1">{stat.label}</div>
                </div>
              );
            })}
          </motion.div>
        </div>
      </section>

      {/* ═══════════════════════ WHITE: VALUE PROPOSITION ═══════════════════════ */}
      <section className="py-16 sm:py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-8">
          <div className="text-center mb-14">
            <h2 className="font-display font-black text-3xl sm:text-4xl tracking-tight text-slate-900">
              Why Businesses Choose <span className="text-[#00A884]">VyaparMind</span>
            </h2>
            <p className="text-slate-500 mt-3 max-w-lg mx-auto">
              "Your business deserves technology that thinks ahead."
            </p>
          </div>

          <div className="grid sm:grid-cols-3 gap-6">
            {[
              { icon: Brain, title: "AI-First Approach", desc: "Every solution is powered by intelligent automation that learns and adapts to your unique business patterns.", color: "#00A884", img: "https://images.pexels.com/photos/8386440/pexels-photo-8386440.jpeg?auto=compress&cs=tinysrgb&w=400" },
              { icon: TrendUp, title: "Growth-Focused Engineering", desc: "We don't just build software — we engineer systems that directly drive revenue and scale your operations.", color: "#6C63FF", img: "https://images.pexels.com/photos/7681091/pexels-photo-7681091.jpeg?auto=compress&cs=tinysrgb&w=400" },
              { icon: Timer, title: "80% Less Manual Work", desc: "Let AI handle repetitive tasks while you focus on strategic decisions. Save hours every single day.", color: "#FF9800", img: "https://images.pexels.com/photos/3183153/pexels-photo-3183153.jpeg?auto=compress&cs=tinysrgb&w=400" },
            ].map((item) => {
              const IIcon = item.icon;
              return (
                <motion.div
                  key={item.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-xl hover:border-slate-300 transition-all group"
                >
                  <div className="h-40 overflow-hidden">
                    <img src={item.img} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  </div>
                  <div className="p-6">
                    <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-4" style={{ background: item.color + "15" }}>
                      <IIcon size={22} weight="fill" style={{ color: item.color }} />
                    </div>
                    <h3 className="font-bold text-lg text-slate-900 mb-2">{item.title}</h3>
                    <p className="text-sm text-slate-500 leading-relaxed">{item.desc}</p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ═══════════════════════ DARK: SLOGAN BANNER ═══════════════════════ */}
      <section className="py-12 bg-[#090E17] text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-[#00A884]/10 via-transparent to-[#6C63FF]/10" />
        <div className="relative max-w-4xl mx-auto px-4 text-center">
          <Sparkle size={32} weight="fill" className="text-[#00A884] mx-auto mb-4" />
          <p className="text-2xl sm:text-3xl lg:text-4xl font-display font-black tracking-tight">
            "Less manual work. More growth.
            <span className="text-[#00A884]"> Zero compromise.</span>"
          </p>
          <p className="mt-4 text-white/50 text-sm">— The VyaparMind Promise</p>
        </div>
      </section>

      {/* ═══════════════════════ WHITE: SERVICE GRID ═══════════════════════ */}
      <section id="services" className="py-16 sm:py-20 bg-[#F9FAFB]">
        <div className="max-w-7xl mx-auto px-4 sm:px-8">
          <div className="text-center mb-10">
            <h2 className="font-display font-black text-3xl sm:text-4xl tracking-tight text-slate-900">
              Our <span className="text-[#00A884]">Service</span> Portfolio
            </h2>
            <p className="text-slate-500 mt-3 max-w-lg mx-auto">
              18+ specialized domains. One platform. Infinite possibilities.
            </p>
          </div>

          {/* Filter tabs */}
          <div className="flex flex-wrap justify-center gap-2 sm:gap-3 mb-10">
            {Object.entries(categories).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setFilter(key)}
                className={`px-4 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                  filter === key
                    ? "bg-[#090E17] text-white shadow-lg"
                    : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Service cards grid */}
          <motion.div layout className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
            <AnimatePresence mode="popLayout">
              {filteredServices.map((service, idx) => {
                const SIcon = service.icon;
                return (
                  <motion.div
                    key={service.id}
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ delay: idx * 0.03 }}
                    onClick={() => setActiveService(service)}
                    className="group cursor-pointer bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-xl hover:border-slate-300 transition-all"
                  >
                    {/* Service image */}
                    <div className="h-36 sm:h-40 overflow-hidden relative">
                      <img
                        src={IMAGES[service.id]}
                        alt={service.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
                      <div className="absolute bottom-3 left-3 flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-white/20 backdrop-blur-sm">
                          <SIcon size={16} weight="fill" className="text-white" />
                        </div>
                        <span className="text-white font-bold text-sm drop-shadow">{service.title}</span>
                      </div>
                    </div>

                    {/* Card content */}
                    <div className="p-5">
                      <p className="text-xs text-[#00A884] italic font-medium mb-2">"{service.tagline}"</p>
                      <p className="text-sm text-slate-600 leading-relaxed line-clamp-2">{service.description}</p>

                      {/* Case study result badge */}
                      <div className="mt-4 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-[#00A884]" />
                          <span className="text-[11px] text-slate-500 font-medium">{service.caseStudy.result}</span>
                        </div>
                        <ArrowRight size={14} className="text-slate-400 group-hover:text-[#00A884] group-hover:translate-x-1 transition-all" weight="bold" />
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </motion.div>
        </div>
      </section>

      {/* ═══════════════════════ DARK: SUCCESS STORIES ═══════════════════════ */}
      <section className="py-16 sm:py-20 bg-[#090E17] text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-8">
          <div className="text-center mb-12">
            <h2 className="font-display font-black text-3xl sm:text-4xl tracking-tight">
              Proven <span className="text-[#00A884]">Success</span> Stories
            </h2>
            <p className="text-white/50 mt-3">Real results from real businesses across India</p>
            <p className="text-sm text-white/30 italic mt-2">"From vision to execution — we build what matters."</p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { client: "GreenHarvest Farms", industry: "Agriculture", metric: "40% less waste", desc: "AI-powered crop monitoring reduced post-harvest losses dramatically.", color: "#4CAF50", icon: Plant, img: IMAGES.agriculture },
              { client: "BuildRight Infra", industry: "Construction", metric: "25% faster delivery", desc: "Smart project management cut timelines and cost overruns.", color: "#FF9800", icon: Buildings, img: IMAGES.construction },
              { client: "QuickStore Logistics", industry: "Warehouse", metric: "60% faster fulfillment", desc: "Automated pick-pack-ship system transformed warehouse operations.", color: "#00BCD4", icon: Warehouse, img: IMAGES.warehouse },
              { client: "FashionHub Retail", industry: "Retail", metric: "35% more repeat buyers", desc: "AI loyalty engine and dynamic pricing boosted customer retention.", color: "#E91E63", icon: Storefront, img: IMAGES.retail },
              { client: "StreamFlix OTT", industry: "Media & Hosting", metric: "99.99% uptime", desc: "Cloud-native architecture serving 500K+ concurrent users seamlessly.", color: "#03A9F4", icon: Cloud, img: IMAGES.hosting },
              { client: "LearnSmart Academy", industry: "Education", metric: "85% better outcomes", desc: "AI tutoring system personalized learning for 10,000+ students.", color: "#673AB7", icon: GraduationCap, img: IMAGES.education },
            ].map((story) => {
              const CIcon = story.icon;
              return (
                <motion.div
                  key={story.client}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  className="bg-white/[0.04] border border-white/10 rounded-2xl overflow-hidden hover:border-white/20 transition-all group"
                >
                  {/* Story image */}
                  <div className="h-32 overflow-hidden relative">
                    <img src={story.img} alt={story.client} className="w-full h-full object-cover opacity-70 group-hover:opacity-90 group-hover:scale-105 transition-all duration-500" />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#090E17] via-transparent to-transparent" />
                  </div>
                  <div className="p-5 -mt-6 relative">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: story.color + "20" }}>
                        <CIcon size={20} weight="fill" style={{ color: story.color }} />
                      </div>
                      <div>
                        <p className="font-bold text-sm text-white">{story.client}</p>
                        <p className="text-[11px] text-white/40">{story.industry}</p>
                      </div>
                    </div>
                    <div className="text-2xl font-black mb-2" style={{ color: story.color }}>{story.metric}</div>
                    <p className="text-sm text-white/55 leading-relaxed">{story.desc}</p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ═══════════════════════ WHITE: HOW WE WORK ═══════════════════════ */}
      <section className="py-16 sm:py-20 bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-8">
          <div className="text-center mb-14">
            <h2 className="font-display font-black text-3xl sm:text-4xl tracking-tight text-slate-900">
              How We <span className="text-[#00A884]">Work</span>
            </h2>
            <p className="text-slate-500 mt-3">From idea to launch in weeks, not months</p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              { step: "01", title: "Discover", desc: "We deeply understand your business challenges, workflows, and growth goals", icon: MagnifyingGlass, img: "https://images.pexels.com/photos/3183150/pexels-photo-3183150.jpeg?auto=compress&cs=tinysrgb&w=300" },
              { step: "02", title: "Design", desc: "AI-first architecture tailored specifically for your industry needs", icon: Sparkle, img: "https://images.pexels.com/photos/196644/pexels-photo-196644.jpeg?auto=compress&cs=tinysrgb&w=300" },
              { step: "03", title: "Develop", desc: "Rapid iteration with continuous feedback loops and transparent progress", icon: Code, img: "https://images.pexels.com/photos/1181271/pexels-photo-1181271.jpeg?auto=compress&cs=tinysrgb&w=300" },
              { step: "04", title: "Deploy & Scale", desc: "Launch with confidence. Scale without limits. Grow without boundaries.", icon: RocketLaunch, img: "https://images.pexels.com/photos/2004161/pexels-photo-2004161.jpeg?auto=compress&cs=tinysrgb&w=300" },
            ].map((item) => {
              const PIcon = item.icon;
              return (
                <motion.div
                  key={item.step}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  className="text-center group"
                >
                  <div className="w-20 h-20 rounded-2xl overflow-hidden mx-auto mb-4 border-2 border-slate-100 group-hover:border-[#00A884]/30 transition-colors">
                    <img src={item.img} alt={item.title} className="w-full h-full object-cover" />
                  </div>
                  <div className="inline-flex items-center gap-1 text-xs font-bold text-[#00A884] mb-2 bg-[#00A884]/10 px-2 py-1 rounded-full">
                    <PIcon size={12} weight="fill" /> STEP {item.step}
                  </div>
                  <h3 className="font-bold text-slate-900 mb-2 text-lg">{item.title}</h3>
                  <p className="text-xs text-slate-500 leading-relaxed">{item.desc}</p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ═══════════════════════ DARK: FINAL CTA ═══════════════════════ */}
      <section className="py-20 sm:py-28 bg-[#090E17] text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#00A884]/5 via-transparent to-[#6C63FF]/5" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#00A884]/5 rounded-full blur-3xl" />

        <div className="relative max-w-4xl mx-auto px-4 sm:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <RocketLaunch size={48} weight="fill" className="text-[#00A884] mx-auto mb-6" />
            <h2 className="font-display font-black text-3xl sm:text-5xl lg:text-6xl tracking-tight leading-tight">
              Ready to <span className="text-[#00A884]">Transform</span>
              <br />Your Business?
            </h2>
            <p className="mt-5 text-lg sm:text-xl text-white/60 max-w-xl mx-auto">
              Join 150+ businesses that chose VyaparMind to automate, innovate, and dominate their industry.
            </p>
            <p className="mt-4 text-base text-white/40 italic font-medium">
              "Your business deserves technology that thinks ahead."
            </p>

            <div className="mt-10 flex flex-wrap justify-center gap-4">
              <button
                onClick={handleStartProject}
                className="inline-flex items-center gap-2 bg-[#00A884] text-white font-bold px-8 py-4 rounded-xl hover:bg-[#008f6f] active:scale-[0.97] transition-all text-base shadow-lg shadow-[#00A884]/25"
              >
                Start Your Project <ArrowRight weight="bold" size={18} />
              </button>
              <Link
                to="/demo"
                className="inline-flex items-center gap-2 bg-white/10 text-white font-bold px-8 py-4 rounded-xl hover:bg-white/15 transition-all text-base border border-white/15"
              >
                <Play weight="fill" size={18} /> View Platform Demo
              </Link>
            </div>

            <div className="mt-8 flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-white/40">
              <span className="flex items-center gap-1.5"><Check weight="bold" size={14} className="text-[#00A884]" /> Free Consultation</span>
              <span className="flex items-center gap-1.5"><Check weight="bold" size={14} className="text-[#00A884]" /> No Hidden Costs</span>
              <span className="flex items-center gap-1.5"><Check weight="bold" size={14} className="text-[#00A884]" /> 24/7 Support</span>
              <span className="flex items-center gap-1.5"><Check weight="bold" size={14} className="text-[#00A884]" /> Indian Languages</span>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#090E17] border-t border-white/10 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-white/40">
          <div className="flex items-center gap-2">
            <img src="/vyaparmind-logo.png" alt="" className="w-5 h-5" />
            <span>© 2024 VyaparMind. All rights reserved.</span>
          </div>
          <div className="flex items-center gap-6">
            <Link to="/" className="hover:text-white transition-colors">Home</Link>
            <Link to="/demo" className="hover:text-white transition-colors">Demo</Link>
            <Link to="/register" className="hover:text-white transition-colors">Sign Up</Link>
          </div>
        </div>
      </footer>

      {/* ═══════════════════════ SERVICE DETAIL MODAL ═══════════════════════ */}
      <AnimatePresence>
        {activeService && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] bg-black/70 flex items-center justify-center p-4"
            onClick={() => setActiveService(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl max-w-lg w-full max-h-[85vh] overflow-y-auto shadow-2xl"
            >
              {(() => {
                const SIcon = activeService.icon;
                return (
                  <>
                    {/* Modal image */}
                    <div className="h-44 overflow-hidden relative rounded-t-2xl">
                      <img src={IMAGES[activeService.id]} alt={activeService.title} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
                      <button
                        onClick={() => setActiveService(null)}
                        className="absolute top-3 right-3 w-8 h-8 rounded-lg bg-black/40 hover:bg-black/60 flex items-center justify-center backdrop-blur-sm"
                      >
                        <X size={16} className="text-white" weight="bold" />
                      </button>
                      <div className="absolute bottom-4 left-4 flex items-center gap-3">
                        <div className="w-11 h-11 rounded-xl flex items-center justify-center bg-white/20 backdrop-blur-sm">
                          <SIcon size={22} weight="fill" className="text-white" />
                        </div>
                        <div>
                          <h3 className="font-bold text-xl text-white">{activeService.title}</h3>
                          <p className="text-xs text-white/70 italic">"{activeService.tagline}"</p>
                        </div>
                      </div>
                    </div>

                    <div className="p-6">
                      <p className="text-sm text-slate-600 leading-relaxed mb-6">{activeService.description}</p>

                      <div className="mb-6">
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Key Capabilities</h4>
                        <div className="grid grid-cols-1 gap-2">
                          {activeService.features.map((f) => (
                            <div key={f} className="flex items-center gap-2 text-sm text-slate-700">
                              <Check weight="bold" size={14} className="text-[#00A884] shrink-0" />
                              {f}
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 mb-6">
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Success Story</h4>
                        <p className="font-bold text-slate-900 text-sm">{activeService.caseStudy.client}</p>
                        <p className="text-[11px] text-slate-400 mb-2">{activeService.caseStudy.industry}</p>
                        <p className="text-sm font-bold" style={{ color: activeService.color }}>{activeService.caseStudy.result}</p>
                      </div>

                      <Link
                        to="/register"
                        className="w-full inline-flex items-center justify-center gap-2 bg-[#090E17] text-white font-bold py-3.5 rounded-xl hover:bg-[#0f1825] active:scale-[0.97] transition-all text-sm"
                      >
                        Get Started with {activeService.title} <ArrowRight weight="bold" size={16} />
                      </Link>
                    </div>
                  </>
                );
              })()}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
