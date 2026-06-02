import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useLanguage, LANGUAGES } from "lib/i18n";
import {
  ChatCircleDots, Lightning, Camera, Microphone, ChartLineUp,
  Bell, Translate, ShieldCheck, ArrowRight, Check, WhatsappLogo,
  Plus, Minus, List, X, Play, EnvelopeSimple, Phone, MapPin, PaperPlaneTilt,
} from "@phosphor-icons/react";
import * as Accordion from "@radix-ui/react-accordion";
import LoadingSplash from "components/LoadingSplash";

const HERO_IMG = "https://static.prod-images.emergentagent.com/jobs/a503b4b6-6b6e-4043-b725-ed5a99bdfc1b/images/1991894690da900a1aa838af3b341ddf63c0f67362e7301610a3003fe550fa66.png";
const HEALTH_IMG = "https://static.prod-images.emergentagent.com/jobs/a503b4b6-6b6e-4043-b725-ed5a99bdfc1b/images/ab0205d356c8f3a04f9d00d42129a04e100ba780f7a88aaa87dab87d48a5ae82.png";
const FLOW_IMG = "https://static.prod-images.emergentagent.com/jobs/a503b4b6-6b6e-4043-b725-ed5a99bdfc1b/images/04c27b7e4e15be2b3507c857931b9d31406e78de5004ec91756d512b90c30ddd.png";
const USER1 = "https://images.pexels.com/photos/36317181/pexels-photo-36317181.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940";
const USER2 = "https://images.pexels.com/photos/35317008/pexels-photo-35317008.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940";
const STORE = "https://images.pexels.com/photos/28624931/pexels-photo-28624931.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940";

const LANGS = ["\u0939\u093F\u0928\u094D\u0926\u0940", "English", "\u0BA4\u0BAE\u0BBF\u0BB4\u0BCD", "\u0C24\u0C46\u0C32\u0C41\u0C17\u0C41", "\u0C95\u0CA8\u0CCD\u0CA8\u0CA1", "\u09AC\u09BE\u0982\u09B2\u09BE", "\u092E\u0930\u09BE\u0920\u0940", "\u0A97\u0AC1\u0A9C\u0AB0\u0ABE\u0AA4\u0AC0", "\u0D2E\u0D32\u0D2F\u0D3E\u0D33\u0D02", "\u0A2A\u0A70\u0A1C\u0A3E\u0A2C\u0A40", "\u0B13\u0B21\u0B3C\u0B3F\u0B06", "\u0627\u0631\u062F\u0648"];

export default function Landing() {
  return (
    <div className="bg-[#F9FAFB] text-slate-900">
      <Header />
      <Hero />
      <LangRibbon />
      <HowItWorks />
      <Bento />
      <SocialProof />
      <Pricing />
      <Faq />
      <ContactUs />
      <Footer />
    </div>
  );
}

function Header() {
  const { t, language, setLanguage } = useLanguage();
  const [langOpen, setLangOpen] = React.useState(false);
  const [mobileNav, setMobileNav] = React.useState(false);
  const [showSplash, setShowSplash] = React.useState(false);
  const navigate = React.useCallback((path) => window.location.href = path, []);
  const currentLang = LANGUAGES.find((l) => l.code === language);

  const handleGetStarted = () => {
    setShowSplash(true);
    setTimeout(() => {
      window.location.href = "/register";
    }, 6000);
  };

  return (
    <>
    {showSplash && <LoadingSplash message="Setting up your experience..." />}
    <header className="sticky top-0 z-40 bg-[#090E17]/85 border-b border-white/10 ios-blur" style={{ WebkitBackdropFilter: 'blur(20px)', backdropFilter: 'blur(20px)' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-3 sm:py-4 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 shrink-0">
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded logo-zoom"><img src="/vyaparmind-logo.png" alt="VyaparMind" className="w-8 h-8 sm:w-10 sm:h-10" /></div>
          <span className="text-white font-display font-black tracking-tighter text-lg sm:text-xl">VyaparMind</span>
        </Link>
        <nav className="hidden md:flex items-center gap-8 text-sm text-white/75">
          <a href="#how" className="hover:text-white transition-colors">{t("landing.howItWorks")}</a>
          <a href="#features" className="hover:text-white transition-colors">{t("landing.features")}</a>
          <Link to="/services" className="hover:text-white transition-colors">Services</Link>
          <a href="#pricing" className="hover:text-white transition-colors">{t("landing.pricing")}</a>
          <a href="#faq" className="hover:text-white transition-colors">{t("landing.faq")}</a>
        </nav>
        <div className="flex items-center gap-1 sm:gap-2">
          {/* Language Selector */}
          <div className="relative">
            <button
              onClick={() => setLangOpen(!langOpen)}
              className="flex items-center gap-1 px-2 py-2 text-white/70 hover:text-white transition-colors text-sm"
            >
              <Translate size={18} />
            </button>
            {langOpen && (
              <div className="fixed sm:absolute top-auto sm:top-full right-4 sm:right-0 left-4 sm:left-auto mt-2 sm:w-64 bg-white border border-slate-200 shadow-2xl max-h-72 overflow-y-auto z-50 rounded-lg">
                <div className="p-3 border-b border-slate-100 sticky top-0 bg-white rounded-t-lg">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{t("lang.select")}</span>
                </div>
                <div className="p-1">
                  {LANGUAGES.map((lang) => (
                    <button
                      key={lang.code}
                      onClick={() => { setLanguage(lang.code); setLangOpen(false); }}
                      className={`w-full flex items-center gap-2 px-3 py-2.5 text-sm transition-colors ${
                        language === lang.code ? "bg-[#00A884]/10 text-[#00A884] font-semibold" : "text-slate-700 hover:bg-slate-50"
                      } rounded`}
                    >
                      <span className="flex-1 text-left">{lang.native}</span>
                      <span className="text-xs text-slate-400">{lang.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
          <Link to="/login" className="hidden sm:inline-block text-white/80 hover:text-white text-sm px-3 py-2">{t("landing.login")}</Link>
          <button onClick={handleGetStarted} className="btn-signal text-xs sm:text-sm !px-3 !py-2 sm:!px-5 sm:!py-3 whitespace-nowrap">{t("landing.getStarted")}</button>
          {/* Mobile hamburger */}
          <button onClick={() => setMobileNav(!mobileNav)} className="md:hidden p-2 text-white/70 hover:text-white">
            {mobileNav ? <X size={22} weight="bold" /> : <List size={22} weight="bold" />}
          </button>
        </div>
      </div>
      {/* Mobile nav drawer */}
      {mobileNav && (
        <div className="md:hidden bg-[#090E17] border-t border-white/10 px-4 pb-4 pt-2 space-y-1 animate-slideUp">
          <a href="#how" onClick={() => setMobileNav(false)} className="block px-3 py-2.5 text-sm text-white/75 hover:text-white">{t("landing.howItWorks")}</a>
          <a href="#features" onClick={() => setMobileNav(false)} className="block px-3 py-2.5 text-sm text-white/75 hover:text-white">{t("landing.features")}</a>
          <a href="#pricing" onClick={() => setMobileNav(false)} className="block px-3 py-2.5 text-sm text-white/75 hover:text-white">{t("landing.pricing")}</a>
          <a href="#faq" onClick={() => setMobileNav(false)} className="block px-3 py-2.5 text-sm text-white/75 hover:text-white">{t("landing.faq")}</a>
          <Link to="/login" onClick={() => setMobileNav(false)} className="block px-3 py-2.5 text-sm text-white/75 hover:text-white">{t("landing.login")}</Link>
        </div>
      )}
    </header>
    </>
  );
}

function Hero() {
  const [showSplash, setShowSplash] = React.useState(false);
  const handleStartFree = () => {
    setShowSplash(true);
    setTimeout(() => { window.location.href = "/register"; }, 6000);
  };

  return (
    <>
    {showSplash && <LoadingSplash message="Setting up your experience..." />}
    <section className="relative overflow-hidden bg-[#090E17] text-white noise">
      <div className="absolute inset-0 grid-bg opacity-60" />
      <div
        className="absolute inset-0 opacity-25"
        style={{ backgroundImage: `url(${HERO_IMG})`, backgroundSize: "cover", backgroundPosition: "center right" }}
      />
      <div className="absolute inset-0 bg-gradient-to-r from-[#090E17] via-[#090E17]/85 to-transparent" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-8 pt-14 sm:pt-28 pb-20 sm:pb-32 grid lg:grid-cols-12 gap-8 sm:gap-12 items-center">
        <div className="lg:col-span-7">
          <motion.div
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
            className="inline-flex items-center gap-2 border border-white/15 px-3 py-1.5 mb-7"
            style={{ borderRadius: 999 }}
          >
            <span className="w-1.5 h-1.5 bg-signal animate-pulse-dot rounded-full" />
            <span className="text-xs tracking-[0.2em] uppercase text-white/70">Live in 12 Indian languages</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}
            className="font-display font-black text-[2.5rem] sm:text-6xl lg:text-7xl tracking-tighter leading-[0.95]"
          >
            Your business <span className="text-signal">runs itself.</span><br />
            You just talk.
          </motion.h1>

          <motion.p
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2, duration: 0.6 }}
            className="mt-7 text-lg sm:text-xl text-white/70 max-w-xl leading-relaxed"
          >
            VyaparMind turns your WhatsApp-style messages, voice notes and photos of bills
            into structured books, smart insights and AI-driven decisions. Zero setup. Zero training.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
            className="mt-9 flex flex-wrap items-center gap-3"
          >
            <button onClick={handleStartFree} className="btn-signal inline-flex items-center gap-2">
              Start free <ArrowRight weight="bold" size={18} />
            </button>
            <Link to="/demo" className="btn-ghost-light inline-flex items-center gap-2">
              <Play weight="fill" size={18} /> View Demo
            </Link>
            <Link to="/services" className="btn-ghost-light inline-flex items-center gap-2 border border-white/20">
              <Lightning weight="fill" size={18} /> Explore Our Services
            </Link>
          </motion.div>

          <div className="mt-10 flex flex-wrap gap-x-8 gap-y-3 text-sm text-white/55">
            <span className="flex items-center gap-2"><Check weight="bold" className="text-signal" size={16} /> ₹0 setup</span>
            <span className="flex items-center gap-2"><Check weight="bold" className="text-signal" size={16} /> 12 languages</span>
            <span className="flex items-center gap-2"><Check weight="bold" className="text-signal" size={16} /> 5,000+ businesses</span>
          </div>
        </div>

        {/* Hero card */}
        <motion.div
          initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4, duration: 0.7 }}
          className="lg:col-span-5"
        >
          <div className="relative bg-white text-slate-900 p-5 border border-slate-200 shadow-2xl" style={{borderRadius: 6}}>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <img src="/vyaparmind-logo.png" alt="VyaparMind" className="h-8" />
                <div>
                  <div className="font-semibold text-sm">VyaparMind</div>
                  <div className="text-[10px] text-slate-500 tracking-widest uppercase">AI Assistant · Online</div>
                </div>
              </div>
              <span className="text-xs text-signal font-semibold tracking-widest uppercase">Live</span>
            </div>
            <div className="py-4 space-y-3 text-sm">
              <Bubble side="right">{"\u0906\u091C 5kg \u091A\u093E\u0935\u0932 \u20B9500 \u092E\u0947\u0902 Ramesh \u0915\u094B \u092C\u0947\u091A\u093E"}</Bubble>
              <Bubble side="left">
                <div className="text-[11px] text-signal font-bold tracking-widest uppercase mb-1">Recorded</div>
                +₹500 income · category: <b>Sales</b><br/>
                rice stock: <b>−5 kg</b> · customer: <b>Ramesh</b>
              </Bubble>
              <Bubble side="right">{"\u0915\u093F\u0924\u0928\u093E \u0915\u092E\u093E\u092F\u093E \u0906\u091C?"}</Bubble>
              <Bubble side="left">
                Today: <b>+₹2,140</b> profit on <b>9 sales</b>. Top item: <b>Rice</b>. You're 22% ahead of last Tuesday.
              </Bubble>
            </div>
            <div className="pt-3 border-t border-slate-100 flex items-center gap-2">
              <div className="flex-1 border border-slate-200 px-3 py-2 text-xs text-slate-400" style={{borderRadius:4}}>
                Type a message…
              </div>
              <button className="w-9 h-9 bg-slate-900 grid place-items-center text-white" style={{borderRadius:4}}>
                <Microphone weight="fill" size={16} />
              </button>
              <button className="w-9 h-9 bg-signal grid place-items-center text-white" style={{borderRadius:4}}>
                <Camera weight="fill" size={16} />
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
    </>
  );
}

function Bubble({ children, side }) {
  const isRight = side === "right";
  return (
    <div className={`flex ${isRight ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] px-3.5 py-2.5 text-[13px] leading-relaxed ${
          isRight ? "bg-slate-900 text-white" : "bg-emerald-50 border border-emerald-100 text-slate-800"
        }`}
        style={{ borderRadius: 4 }}
      >
        {children}
      </div>
    </div>
  );
}

function LangRibbon() {
  const list = [...LANGS, ...LANGS];
  return (
    <div className="bg-[#090E17] border-t border-white/5 overflow-hidden">
      <div className="py-4 overflow-hidden">
        <div className="ribbon animate-marquee">
          {list.map((l, i) => (
            <span key={i} className="text-white/40 font-display text-2xl tracking-tight">{l} <span className="text-signal mx-4">•</span></span>
          ))}
        </div>
      </div>
    </div>
  );
}

function HowItWorks() {
  const steps = [
    { n: "01", icon: ChatCircleDots, title: "Talk naturally", desc: "Send a WhatsApp-style text, voice note or photo of a bill \u2014 in any Indian language." },
    { n: "02", icon: Lightning, title: "AI understands", desc: "Claude-powered NLU parses amounts, items, customers and categories with high accuracy." },
    { n: "03", icon: ChartLineUp, title: "Business runs itself", desc: "Ledger, stock, customer history and insights update automatically \u2014 no forms, ever." },
  ];
  return (
    <section id="how" className="bg-white py-16 sm:py-32 border-y border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-16">
          <div className="max-w-2xl">
            <div className="label-tiny mb-3">How it works</div>
            <h2 className="font-display font-black text-3xl sm:text-5xl tracking-tighter leading-[1.02]">
              Three steps. <span className="text-signal">No setup.</span><br />No training. Just results.
            </h2>
          </div>
          <p className="text-slate-600 max-w-md">Stop juggling registers, photos, calculators and WhatsApp. One AI handles all of it — invisibly.</p>
        </div>

        <div className="grid md:grid-cols-3 gap-px bg-slate-200 border border-slate-200">
          {steps.map((s) => (
            <div key={s.n} className="bg-white p-8 sm:p-10 hover:bg-slate-50 transition-colors">
              <div className="flex items-center justify-between mb-8">
                <s.icon weight="duotone" size={36} className="text-signal" />
                <span className="font-display font-black text-4xl text-slate-200">{s.n}</span>
              </div>
              <h3 className="font-display font-bold text-2xl tracking-tight mb-2">{s.title}</h3>
              <p className="text-slate-600 leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Bento() {
  return (
    <section id="features" className="bg-[#F9FAFB] py-16 sm:py-32">
      <div className="max-w-7xl mx-auto px-4 sm:px-8">
        <div className="max-w-2xl mb-16">
          <div className="label-tiny mb-3">The platform</div>
          <h2 className="font-display font-black text-3xl sm:text-5xl tracking-tighter leading-[1.02]">
            An AI employee for every micro-business in India.
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
          {/* Health Score */}
          <div className="md:col-span-3 md:row-span-2 bg-[#090E17] text-white p-8 relative overflow-hidden" style={{borderRadius:6}}>
            <div className="label-tiny text-white/60 mb-3">Business health score</div>
            <h3 className="font-display font-black text-3xl tracking-tight mb-3">Know how your business is doing — without opening a single spreadsheet.</h3>
            <p className="text-white/65 leading-relaxed">A weekly AI-generated 0-100 score, with one-tap drill-down into what's working and what isn't.</p>
            <img src={HEALTH_IMG} alt="Health score" className="mt-6 w-full object-contain max-h-72" />
          </div>

          <FeatureCard icon={Microphone} title="Voice-first" desc="Long-press to record. Whisper transcribes 12 Indian languages." cols={3} />
          <FeatureCard icon={Camera} title="Photo intelligence" desc="Snap a bill. AI extracts amount, vendor, items, GST." cols={3} />

          <FeatureCard icon={Lightning} title="Pattern learning" desc="AI notices your routines and offers to automate them." cols={2} />
          <FeatureCard icon={Bell} title="Proactive alerts" desc="Low stock, payment due, unusual spend — pinged before it bites." cols={2} />
          <FeatureCard icon={Translate} title="12 languages" desc="Hindi, Tamil, Telugu, Kannada, Bengali, Marathi & more." cols={2} />

          <div className="md:col-span-4 bg-white p-8 border border-slate-200 relative overflow-hidden" style={{borderRadius:6}}>
            <div className="grid sm:grid-cols-2 gap-6 items-center">
              <div>
                <div className="label-tiny mb-3 text-slate-500">From chat to ledger</div>
                <h3 className="font-display font-black text-2xl tracking-tight mb-2">Your WhatsApp becomes your accountant.</h3>
                <p className="text-slate-600 leading-relaxed">Every message is parsed into structured rows. Filter, search, export to Tally — anytime.</p>
              </div>
              <img src={FLOW_IMG} alt="Data flow" className="w-full object-contain max-h-52" />
            </div>
          </div>
          <FeatureCard icon={ShieldCheck} title="Your data, encrypted" desc="Bank-grade encryption. Your books never leave India." cols={2} />
        </div>
      </div>
    </section>
  );
}

function FeatureCard({ icon: Icon, title, desc, cols }) {
  const colMap = { 2: "md:col-span-2", 3: "md:col-span-3", 4: "md:col-span-4" };
  return (
    <div className={`${colMap[cols] || "md:col-span-3"} bg-white p-6 border border-slate-200 hover:border-slate-400 transition-colors`} style={{borderRadius:6}}>
      <Icon weight="duotone" size={28} className="text-signal mb-4" />
      <h3 className="font-display font-bold text-lg tracking-tight mb-1.5">{title}</h3>
      <p className="text-sm text-slate-600 leading-relaxed">{desc}</p>
    </div>
  );
}

function SocialProof() {
  return (
    <section className="bg-white py-16 sm:py-32 border-y border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 sm:gap-8 mb-14">
          <div>
            <div className="label-tiny mb-3">Owners who switched</div>
            <h2 className="font-display font-black text-3xl sm:text-5xl tracking-tighter leading-[1.02]">5,000+ shops.<br/>One less worry.</h2>
          </div>
          <div className="grid grid-cols-3 gap-4 sm:gap-8 md:gap-12 text-right">
            <Stat n="2.4h" l="saved daily" />
            <Stat n="₹18K" l="avg leak fixed / mo" />
            <Stat n="98%" l="AI accuracy" />
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          <Testimonial img={USER1} name="Pankaj Kumar" role="Kirana, Lucknow"
            text="Pehle din-bhar register mein likhta tha. Ab WhatsApp pe bol deta hoon. Sab ho jaata hai." />
          <Testimonial img={USER2} name="Sandeep Soni" role="Mithai shop, Varanasi"
            text="Voice notes work even in Banarsi Hindi. Stock auto-deducts. I run two counters with one phone." />
          <div className="relative h-full min-h-[280px] overflow-hidden border border-slate-200" style={{borderRadius:6}}>
            <img src={STORE} alt="Indian shopfront" className="absolute inset-0 w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#090E17] via-[#090E17]/70 to-transparent" />
            <div className="absolute inset-0 p-6 flex flex-col justify-end text-white">
              <div className="label-tiny text-white/70 mb-2">Built for every</div>
              <h3 className="font-display font-black text-2xl tracking-tight">Kirana · Clinic · Salon · Workshop · Farm · Transport</h3>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Stat({ n, l }) {
  return (
    <div>
      <div className="font-display font-black text-2xl sm:text-4xl tracking-tighter">{n}</div>
      <div className="label-tiny text-slate-500 mt-1">{l}</div>
    </div>
  );
}

function Testimonial({ img, name, role, text }) {
  return (
    <div className="bg-white border border-slate-200 p-6 hover:border-slate-400 transition-colors flex flex-col" style={{borderRadius:6}}>
      <p className="text-slate-700 leading-relaxed flex-1">"{text}"</p>
      <div className="mt-6 flex items-center gap-3 pt-5 border-t border-slate-100">
        <img src={img} alt={name} className="w-10 h-10 object-cover" style={{borderRadius:4}} />
        <div>
          <div className="font-semibold text-sm">{name}</div>
          <div className="text-xs text-slate-500">{role}</div>
        </div>
      </div>
    </div>
  );
}

function Pricing() {
  const tiers = [
    { name: "Shunya", price: "\u20B90", per: "Forever free", desc: "Try it out \u2014 for one solo shop.", features: ["1 business, 1 user", "50 AI interactions / mo", "Text + voice + photo", "Weekly summary"], cta: "Start free", popular: false, link: "/register" },
    { name: "Vikas", price: "\u20B9499", per: "/ month", desc: "For growing dukaans.", features: ["3 users", "Unlimited AI chats", "Full automations", "Daily AI briefings", "Priority support"], cta: "Choose Vikas", popular: true, link: "/payment?plan=vikas" },
    { name: "Shakti", price: "\u20B91,499", per: "/ month", desc: "For serious operators.", features: ["3 businesses, 10 users", "Multi-location", "Custom automations", "Advanced analytics", "API access"], cta: "Choose Shakti", popular: false, link: "/payment?plan=shakti" },
    { name: "Samrajya", price: "Custom", per: "Enterprise", desc: "Chains, franchises, NBFCs.", features: ["Unlimited", "White-label", "SLA + on-premise", "Custom AI training"], cta: "Talk to sales", popular: false, link: "mailto:sales@vyaparmind.in" },
  ];
  return (
    <section id="pricing" className="bg-[#F9FAFB] py-16 sm:py-32">
      <div className="max-w-7xl mx-auto px-4 sm:px-8">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <div className="label-tiny mb-3">Pricing</div>
          <h2 className="font-display font-black text-3xl sm:text-5xl tracking-tighter leading-[1.02]">Start free. Upgrade when you outgrow chaos.</h2>
          <p className="mt-4 text-slate-600">No card. No demos. Just send a message.</p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          {tiers.map((t) => (
            <div key={t.name} className={`p-7 flex flex-col bg-white border ${t.popular ? "border-signal" : "border-slate-200"}`} style={{borderRadius:6, position:"relative"}}>
              {t.popular && (
                <div className="absolute -top-3 left-7 bg-signal text-white text-[10px] tracking-[0.2em] font-bold uppercase px-2 py-1" style={{borderRadius:3}}>Most popular</div>
              )}
              <div className="label-tiny text-slate-500 mb-1">{t.name}</div>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="font-display font-black text-4xl tracking-tighter">{t.price}</span>
                <span className="text-slate-500 text-sm">{t.per}</span>
              </div>
              <p className="text-sm text-slate-600 mt-2">{t.desc}</p>
              <ul className="mt-5 space-y-2.5 flex-1">
                {t.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-slate-700">
                    <Check weight="bold" size={14} className="text-signal mt-1 flex-shrink-0" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <Link
                to={t.link}
                className={`mt-6 text-center text-sm font-bold py-3 block ${t.popular ? "bg-signal text-white hover:bg-signalHover" : "bg-slate-900 text-white hover:bg-slate-700"} transition-colors`}
                style={{borderRadius:4}}
              >
                {t.cta}
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Faq() {
  const items = [
    { q: "Do I need to install an app?", a: "No. VyaparMind works on the browser as a PWA. WhatsApp Business integration is on our roadmap for phase 2." },
    { q: "Does it really work in Hindi or Tamil?", a: "Yes \u2014 voice and text are natively understood in 12 Indian languages via Whisper + Claude Sonnet." },
    { q: "Is my data safe?", a: "All data is encrypted at rest and in transit. You can export or delete everything anytime from Settings." },
    { q: "Can I keep my Tally / current books?", a: "Yes. Export to CSV / Tally is available on the Vikas plan." },
    { q: "What if AI gets something wrong?", a: "You can edit or delete any auto-extracted row in one tap. AI confidence is shown for every parse." },
  ];
  return (
    <section id="faq" className="bg-white py-16 sm:py-32 border-t border-slate-200">
      <div className="max-w-3xl mx-auto px-4 sm:px-8">
        <div className="text-center mb-12">
          <div className="label-tiny mb-3">FAQ</div>
          <h2 className="font-display font-black text-4xl tracking-tighter">Questions, answered.</h2>
        </div>
        <Accordion.Root type="single" collapsible className="space-y-3">
          {items.map((it, i) => (
            <Accordion.Item key={i} value={`v${i}`} className="bg-[#F9FAFB] border border-slate-200" style={{borderRadius:6}}>
              <Accordion.Header>
                <Accordion.Trigger className="group w-full flex items-center justify-between text-left px-5 py-4 font-semibold text-slate-900">
                  <span>{it.q}</span>
                  <Plus weight="bold" size={18} className="group-data-[state=open]:hidden" />
                  <Minus weight="bold" size={18} className="hidden group-data-[state=open]:block" />
                </Accordion.Trigger>
              </Accordion.Header>
              <Accordion.Content className="px-5 pb-4 text-slate-600 leading-relaxed text-sm">
                {it.a}
              </Accordion.Content>
            </Accordion.Item>
          ))}
        </Accordion.Root>
      </div>
    </section>
  );
}

function ContactUs() {
  const [form, setForm] = React.useState({ name: "", email: "", subject: "", message: "" });
  const [submitted, setSubmitted] = React.useState(false);
  const [sending, setSending] = React.useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setSending(true);
    // Simulate form submission
    setTimeout(() => {
      setSending(false);
      setSubmitted(true);
      setForm({ name: "", email: "", subject: "", message: "" });
    }, 1500);
  };

  return (
    <section id="contact" className="bg-[#090E17] py-16 sm:py-32 border-t border-white/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-8">
        <div className="text-center mb-14">
          <div className="label-tiny text-[#00A884] mb-3">GET IN TOUCH</div>
          <h2 className="font-display font-black text-4xl sm:text-5xl tracking-tighter text-white">Contact Us</h2>
          <p className="mt-4 text-white/55 max-w-lg mx-auto">Have questions or want to partner with us? We'd love to hear from you.</p>
        </div>

        <div className="grid lg:grid-cols-5 gap-10 lg:gap-14">
          {/* Contact Info */}
          <div className="lg:col-span-2 space-y-8">
            <div className="bg-white/[0.03] border border-white/10 p-6 sm:p-8" style={{borderRadius: 10}}>
              <h3 className="font-display font-bold text-xl text-white mb-6">Reach out to us</h3>
              <div className="space-y-5">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg bg-[#00A884]/10 flex items-center justify-center flex-shrink-0">
                    <EnvelopeSimple weight="fill" size={20} className="text-[#00A884]" />
                  </div>
                  <div>
                    <div className="text-xs uppercase tracking-wider text-white/40 mb-1">Email</div>
                    <a href="mailto:vyapaarminds@gmail.com" className="text-white hover:text-[#00A884] transition-colors font-medium">vyapaarminds@gmail.com</a>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg bg-[#00A884]/10 flex items-center justify-center flex-shrink-0">
                    <MapPin weight="fill" size={20} className="text-[#00A884]" />
                  </div>
                  <div>
                    <div className="text-xs uppercase tracking-wider text-white/40 mb-1">Location</div>
                    <p className="text-white/80 font-medium">Bengaluru, Karnataka, India</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg bg-[#00A884]/10 flex items-center justify-center flex-shrink-0">
                    <ChatCircleDots weight="fill" size={20} className="text-[#00A884]" />
                  </div>
                  <div>
                    <div className="text-xs uppercase tracking-wider text-white/40 mb-1">Support Hours</div>
                    <p className="text-white/80 font-medium">Mon – Sat, 9 AM – 7 PM IST</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Social / trust badge */}
            <div className="bg-gradient-to-br from-[#00A884]/10 to-transparent border border-[#00A884]/20 p-5" style={{borderRadius: 10}}>
              <div className="flex items-center gap-3 mb-3">
                <ShieldCheck weight="fill" size={24} className="text-[#00A884]" />
                <span className="font-semibold text-white text-sm">Your data is safe with us</span>
              </div>
              <p className="text-white/50 text-xs leading-relaxed">We never share your information with third parties. All communications are encrypted.</p>
            </div>
          </div>

          {/* Contact Form */}
          <div className="lg:col-span-3">
            <div className="bg-white/[0.03] border border-white/10 p-6 sm:p-8" style={{borderRadius: 10}}>
              {submitted ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 rounded-full bg-[#00A884]/10 flex items-center justify-center mx-auto mb-5">
                    <Check weight="bold" size={32} className="text-[#00A884]" />
                  </div>
                  <h3 className="font-display font-bold text-2xl text-white mb-2">Message Sent!</h3>
                  <p className="text-white/55 mb-6">Thank you for reaching out. We'll get back to you within 24 hours.</p>
                  <button onClick={() => setSubmitted(false)} className="text-[#00A884] font-semibold text-sm hover:underline">Send another message</button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-5">
                  <h3 className="font-display font-bold text-xl text-white mb-2">Send us a message</h3>
                  <p className="text-white/45 text-sm mb-6">Fill out the form and our team will reach out to you shortly.</p>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs uppercase tracking-wider text-white/40 mb-1.5">Full Name</label>
                      <input
                        type="text" required value={form.name} onChange={(e) => setForm({...form, name: e.target.value})}
                        placeholder="John Doe"
                        className="w-full px-4 py-3 bg-white/[0.04] border border-white/10 text-white placeholder:text-white/25 focus:border-[#00A884] focus:ring-1 focus:ring-[#00A884]/30 outline-none text-sm transition-colors"
                        style={{borderRadius: 6}}
                      />
                    </div>
                    <div>
                      <label className="block text-xs uppercase tracking-wider text-white/40 mb-1.5">Email</label>
                      <input
                        type="email" required value={form.email} onChange={(e) => setForm({...form, email: e.target.value})}
                        placeholder="you@business.com"
                        className="w-full px-4 py-3 bg-white/[0.04] border border-white/10 text-white placeholder:text-white/25 focus:border-[#00A884] focus:ring-1 focus:ring-[#00A884]/30 outline-none text-sm transition-colors"
                        style={{borderRadius: 6}}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs uppercase tracking-wider text-white/40 mb-1.5">Subject</label>
                    <input
                      type="text" required value={form.subject} onChange={(e) => setForm({...form, subject: e.target.value})}
                      placeholder="How can we help?"
                      className="w-full px-4 py-3 bg-white/[0.04] border border-white/10 text-white placeholder:text-white/25 focus:border-[#00A884] focus:ring-1 focus:ring-[#00A884]/30 outline-none text-sm transition-colors"
                      style={{borderRadius: 6}}
                    />
                  </div>
                  <div>
                    <label className="block text-xs uppercase tracking-wider text-white/40 mb-1.5">Message</label>
                    <textarea
                      required value={form.message} onChange={(e) => setForm({...form, message: e.target.value})}
                      rows={5}
                      placeholder="Tell us about your requirements..."
                      className="w-full px-4 py-3 bg-white/[0.04] border border-white/10 text-white placeholder:text-white/25 focus:border-[#00A884] focus:ring-1 focus:ring-[#00A884]/30 outline-none text-sm transition-colors resize-none"
                      style={{borderRadius: 6}}
                    />
                  </div>
                  <button
                    type="submit" disabled={sending}
                    className="w-full sm:w-auto px-8 py-3.5 bg-[#00A884] hover:bg-[#00C896] text-[#090E17] font-bold text-sm flex items-center justify-center gap-2 transition-colors disabled:opacity-60"
                    style={{borderRadius: 6}}
                  >
                    {sending ? "Sending..." : (<>Send Message <PaperPlaneTilt weight="fill" size={16} /></>)}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="bg-[#090E17] text-white border-t border-white/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-12 sm:py-16 grid md:grid-cols-4 gap-10">
        <div className="md:col-span-2">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-10 h-10 rounded logo-zoom"><img src="/vyaparmind-logo.png" alt="VyaparMind" className="w-10 h-10" /></div>
            <span className="font-display font-black text-xl tracking-tighter">VyaparMind</span>
          </div>
          <p className="text-white/55 max-w-md leading-relaxed">An AI operating system for India's 64 million micro-businesses. Built in Bengaluru with love.</p>
        </div>
        <div>
          <div className="label-tiny text-white/40 mb-4">Product</div>
          <ul className="space-y-2 text-sm text-white/70">
            <li><a href="#features" className="hover:text-white">Features</a></li>
            <li><a href="#pricing" className="hover:text-white">Pricing</a></li>
            <li><a href="#faq" className="hover:text-white">FAQ</a></li>
          </ul>
        </div>
        <div>
          <div className="label-tiny text-white/40 mb-4">Company</div>
          <ul className="space-y-2 text-sm text-white/70">
            {/* eslint-disable-next-line jsx-a11y/anchor-is-valid */}
            <li><a href="#about" className="hover:text-white">About</a></li>
            {/* eslint-disable-next-line jsx-a11y/anchor-is-valid */}
            <li><a href="#blog" className="hover:text-white">Blog</a></li>
            {/* eslint-disable-next-line jsx-a11y/anchor-is-valid */}
            <li><a href="#contact" className="hover:text-white">Contact Us</a></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10 py-5 text-center text-xs text-white/40 tracking-widest uppercase">
        © 2026 VyaparMind · Made for \u092C\u093E\u091C\u093C\u093E\u0930
      </div>
    </footer>
  );
}
