"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Slot } from "@radix-ui/react-slot";
import { motion, useReducedMotion } from "framer-motion";
import { useRouter } from "next/navigation";
import {
  ArrowDown,
  Check,
  ChevronDown,
  Facebook,
  Instagram,
  Linkedin,
  Maximize2,
  Menu,
  Pause,
  Play,
  QrCode,
  Twitter,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import NumberFlow from "@number-flow/react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import Image from "next/image";
import Script from "next/script";

const Button = forwardRef(
  (
    {
      className,
      variant = "default",
      size = "default",
      asChild = false,
      ...props
    },
    ref
  ) => {
    const baseStyles =
      "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-semibold tracking-tight ring-offset-background transition-all duration-200 ease-out shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-60 motion-safe:hover:-translate-y-0.5 motion-safe:active:translate-y-0";
    const variants = {
      default:
        "bg-primary text-primary-foreground shadow-lg shadow-primary/20 hover:bg-primary/90",
      outline:
        "border border-border bg-background text-primary hover:bg-primary/10",
      ghost: "text-foreground hover:bg-accent/10 hover:text-primary",
    };
    const sizes = {
      default: "h-10 px-4 py-2",
      sm: "h-9 rounded-md px-3",
      lg: "h-11 rounded-md px-8",
    };
    const Comp = asChild ? Slot : "button";

    return (
      <Comp
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

const Card = forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "rounded-3xl border border-border/60 bg-card/95 text-card-foreground shadow-sm",
      className
    )}
    {...props}
  />
));
Card.displayName = "Card";

const MotionCard = motion.create(Card);

const FADE_UP_VARIANTS = {
  hidden: { opacity: 0, y: 24, filter: "blur(8px)" },
  show: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 0.6, ease: "easeOut" },
  },
};

const STAGGER_CONTAINER_VARIANTS = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.12,
      delayChildren: 0.05,
    },
  },
};

const PRODUCT_VIDEO_SOURCE = {
  src: "https://storage.googleapis.com/coverr-main/mp4/Mt_Baker.mp4",
  poster:
    "https://images.unsplash.com/photo-1520607162513-77705c0f0d4a?auto=format&fit=crop&w=1920&q=80",
  durationLabel: "02:03",
};

const SOFTWARE_APP_SCHEMA = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Clevio AI Staff",
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "IDR",
  },
};

const translations = {
  hero_badge: {
    en: "WhatsApp AI Staff",
    id: "AI Staff WhatsApp",
  },
  hero_headline: {
    en: "AI Staff That Works Non-Stop, Priced Below Minimum Wage",
    id: "AI Staff yang Kerja Non-Stop, Harga di Bawah UMR",
  },
  hero_subheadline: {
    en: "Focus on growing your business—AI Staff handles every WhatsApp chat, day and night.",
    id: "Fokus kembangkan bisnis Anda, biarkan AI Staff balas semua chat WhatsApp siang malam.",
  },
  hero_video_cta: {
    en: "Watch Video Demo",
    id: "Lihat Video Demo",
  },
  hero_placeholder_alt: {
    en: "Business owner is relaxed because Clevio AI Staff handles WhatsApp customers",
    id: "Pemilik bisnis santai karena AI Staff Clevio menangani chat pelanggan",
  },
  hero_keywords: {
    en: [
      "WhatsApp AI automation",
      "no payroll risk",
      "boost sales automatically",
      "Indonesian SME growth",
    ],
    id: [
      "hemat biaya karyawan",
      "AI penjualan UMKM",
      "staff AI harga murah",
    ],
  },
  nav_login: {
    en: "Login",
    id: "Masuk",
  },
  nav_register: {
    en: "Register",
    id: "Daftar",
  },
  video_badge: {
    en: "Quick Tutorial",
    id: "Tutorial Singkat",
  },
  video_title: {
    en: "See How AI Staff Works in 3 Minutes",
    id: "Lihat Cara Kerja AI Staff dalam 3 Menit",
  },
  video_subtitle: {
    en: "No technical skills needed—follow these easy steps to activate your WhatsApp AI.",
    id: "Tidak perlu skill teknis—cukup ikuti langkah mudah untuk mengaktifkan AI WhatsApp Anda.",
  },
  video_play: {
    en: "Play product demo",
    id: "Putar demo",
  },
  video_pause: {
    en: "Pause demo",
    id: "Jeda demo",
  },
  video_mute: {
    en: "Mute video",
    id: "Bisukan video",
  },
  video_unmute: {
    en: "Unmute video",
    id: "Aktifkan suara video",
  },
  video_fullscreen: {
    en: "Toggle fullscreen",
    id: "Alihkan layar penuh",
  },
  benefits_headline: {
    en: "Why 1000+ SMEs Choose AI Staff",
    id: "Mengapa 1000+ UMKM Memilih AI Staff",
  },
  benefit_cost_title: {
    en: "Drastic Cost Savings",
    id: "Hemat Biaya Drastis",
  },
  benefit_cost_desc: {
    en: "AI Staff costs below minimum wage—no salary, bonuses, or insurance. Invest once, profit repeatedly.",
    id: "Harga AI Staff di bawah UMR. Tidak perlu gaji, THR, atau BPJS. Investasi sekali, untung berkali-kali.",
  },
  benefit_cost_stat: {
    en: "Save up to 80% of payroll and operational costs",
    id: "Hemat hingga 80% biaya gaji & operasional",
  },
  benefit_24_7_title: {
    en: "Works 24/7 Non-Stop",
    id: "Kerja 24/7 Tanpa Henti",
  },
  benefit_24_7_desc: {
    en: "AI never sleeps or asks for leave. Customers get replies instantly—even at midnight or on holidays.",
    id: "AI tidak pernah tidur atau cuti. Pelanggan dibalas instan, bahkan tengah malam atau saat libur.",
  },
  benefit_24_7_stat: {
    en: "0 missed chats from 100 daily conversations",
    id: "0 chat terlewat dari 100 chat harian",
  },
  benefit_easy_title: {
    en: "Super Simple Setup",
    id: "Setup Super Mudah",
  },
  benefit_easy_desc: {
    en: "Tap, choose a template, and AI goes live. Even a warung owner can activate it in minutes.",
    id: "Cukup tekan-tekan, pilih template, dan AI langsung aktif. Bahkan Ibu warung pun bisa.",
  },
  benefit_easy_stat: {
    en: "Live in 5 minutes",
    id: "Aktif dalam 5 menit",
  },
  cta_headline: {
    en: "Ready to Save Costs and Boost Sales?",
    id: "Siap Hemat Biaya dan Tingkatkan Penjualan?",
  },
  cta_button: {
    en: "Try AI Staff Free Now",
    id: "Coba AI Staff Gratis Sekarang",
  },
  cta_subtext: {
    en: "No credit card • Live in 5 minutes",
    id: "Tidak perlu kartu kredit • Aktif dalam 5 menit",
  },
  cta_loading: {
    en: "Starting...",
    id: "Memulai...",
  },
  integrations_title: {
    en: "Connect to WhatsApp Instantly",
    id: "Langsung Terhubung dengan WhatsApp",
  },
  integrations_desc: {
    en: "Scan a QR code and AI Staff is live—no API forms, no technical headache.",
    id: "Scan QR dan AI Staff langsung aktif—tanpa form API, tanpa ribet teknis.",
  },
  integration_caption: {
    en: "Scan QR → WhatsApp goes live → Chats flow automatically. Zero complex steps.",
    id: "Scan QR → WhatsApp aktif → Chat otomatis jalan. Tanpa langkah rumit.",
  },
  pricing_title: {
    en: "Choose Your Plan",
    id: "Pilih Paket Anda",
  },
  pricing_subtitle: {
    en: "All plans include 24/7 AI staff and WhatsApp automation.",
    id: "Semua paket termasuk AI staff 24/7 dan otomatisasi WhatsApp.",
  },
  pricing_free: {
    en: "Free",
    id: "Gratis",
  },
  pricing_monthly: {
    en: "Monthly",
    id: "Bulanan",
  },
  pricing_yearly: {
    en: "Yearly",
    id: "Tahunan",
  },
  pricing_free_desc: {
    en: "Test AI Staff without risk and launch your first WhatsApp assistant.",
    id: "Tes AI Staff tanpa risiko dan luncurkan asisten WhatsApp pertama Anda.",
  },
  pricing_monthly_desc: {
    en: "Grow sales with AI Staff 24/7, sales insights, and priority help.",
    id: "Naikkan penjualan dengan AI Staff 24/7, laporan penjualan, dan dukungan prioritas.",
  },
  pricing_yearly_desc: {
    en: "Scale nationwide with dedicated onboarding and the best savings.",
    id: "Skalakan bisnis nasional dengan onboarding khusus dan hemat terbesar.",
  },
  pricing_badge_popular: {
    en: "Most Popular",
    id: "Paling Populer",
  },
  pricing_yearly_bonus: {
    en: "Best Savings",
    id: "Paling Hemat",
  },
  pricing_cta_start: {
    en: "Get Started",
    id: "Mulai Sekarang",
  },
  pricing_cta_upgrade: {
    en: "Upgrade Now",
    id: "Upgrade Sekarang",
  },
  pricing_cta_scale: {
    en: "Scale Now",
    id: "Scale Sekarang",
  },
  faq_title: {
    en: "Frequently Asked Questions",
    id: "Pertanyaan yang Sering Diajukan",
  },
  faq_1_q: {
    en: "Is the free trial really free?",
    id: "Apakah uji coba benar-benar gratis?",
  },
  faq_1_a: {
    en: "Yes. Activate AI Staff instantly without a credit card and explore every feature for 14 days.",
    id: "Ya. Aktifkan AI Staff seketika tanpa kartu kredit dan pakai semua fitur selama 14 hari.",
  },
  faq_2_q: {
    en: "Do I need technical skills?",
    id: "Apakah saya perlu skill teknis?",
  },
  faq_2_a: {
    en: "No. If you can use WhatsApp, you can launch AI Staff with guided templates.",
    id: "Tidak. Kalau Anda bisa pakai WhatsApp, Anda bisa meluncurkan AI Staff dengan template panduan.",
  },
  faq_3_q: {
    en: "Why is it cheaper than hiring staff?",
    id: "Mengapa lebih murah dari karyawan?",
  },
  faq_3_a: {
    en: "AI Staff has no salary, overtime, or insurance costs but replies to every customer instantly.",
    id: "AI Staff tidak punya gaji, lembur, atau BPJS tapi tetap membalas setiap pelanggan secara instan.",
  },
  faq_4_q: {
    en: "Does AI Staff answer chats 24/7?",
    id: "Apakah AI Staff membalas 24/7?",
  },
  faq_4_a: {
    en: "Yes. Response time stays under a minute even at midnight or during holidays.",
    id: "Ya. Waktu respons tetap di bawah satu menit meski tengah malam atau hari libur.",
  },
  faq_5_q: {
    en: "How do I connect WhatsApp?",
    id: "Bagaimana cara menghubungkan WhatsApp?",
  },
  faq_5_a: {
    en: "Open your dashboard, scan the QR, and chats sync instantly—no API approval needed.",
    id: "Buka dashboard, scan QR, dan chat tersinkron langsung—tanpa perlu approval API.",
  },
  faq_6_q: {
    en: "Can I cancel anytime?",
    id: "Bisakah berhenti kapan saja?",
  },
  faq_6_a: {
    en: "Absolutely. Stop or upgrade whenever you want with zero penalties.",
    id: "Tentu. Berhenti atau upgrade kapan saja tanpa penalti.",
  },
  faq_7_q: {
    en: "Is my data secure?",
    id: "Apakah data saya aman?",
  },
  faq_7_a: {
    en: "We use enterprise-grade encryption and comply with international data standards.",
    id: "Kami memakai enkripsi kelas enterprise dan patuh standar data internasional.",
  },
  footer_company: {
    en: "Company",
    id: "Perusahaan",
  },
  footer_about: {
    en: "About Us",
    id: "Tentang Kami",
  },
  footer_contact: {
    en: "Contact Sales",
    id: "Hubungi Sales",
  },
  footer_resources: {
    en: "Resources",
    id: "Sumber Daya",
  },
  footer_login: {
    en: "Login",
    id: "Masuk",
  },
  footer_register: {
    en: "Register",
    id: "Daftar",
  },
  footer_pricing: {
    en: "Pricing",
    id: "Harga",
  },
  footer_privacy: {
    en: "Privacy Policy",
    id: "Kebijakan Privasi",
  },
  footer_terms: {
    en: "Terms of Service",
    id: "Syarat Layanan",
  },
  footer_tagline: {
    en: "AI Staff for Indonesian SMEs",
    id: "AI Staff untuk UMKM Indonesia",
  },
  mobile_scroll_text: {
    en: "Swipe up",
    id: "Geser ke atas",
  },
};

const LanguageToggle = ({ language, setLanguage }) => {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const languages = useMemo(
    () => [
      { code: "en", label: "English", flag: "🇺🇸" },
      { code: "id", label: "Bahasa Indonesia", flag: "🇮🇩" },
    ],
    []
  );

  const selected = languages.find((item) => item.code === language);

  return (
    <div className="relative inline-block" ref={dropdownRef}>
      <button
        onClick={() => setOpen((prev) => !prev)}
        className={cn(
          "flex items-center gap-2 rounded-full border border-border/70 bg-card/90 px-3 py-1.5 text-sm text-foreground shadow-sm backdrop-blur transition-all duration-200 ease-out motion-safe:hover:-translate-y-0.5 motion-safe:hover:shadow-md"
        )}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span>{selected?.flag}</span>
        <span className="hidden sm:inline">{selected?.label}</span>
        <ChevronDown className="h-4 w-4 text-muted-foreground" />
      </button>

      {open && (
        <div
          className={cn(
            "absolute right-0 mt-2 w-48 overflow-hidden rounded-xl border border-border bg-card/95 shadow-lg backdrop-blur"
          )}
          role="listbox"
        >
          {languages.map((lang) => (
            <button
              key={lang.code}
              onClick={() => {
                setLanguage(lang.code);
                setOpen(false);
              }}
              className={cn(
                "flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors",
                selected?.code === lang.code
                  ? "font-semibold text-primary bg-primary/10"
                  : "text-foreground hover:bg-primary/5"
              )}
              role="option"
              aria-selected={selected?.code === lang.code}
            >
              <span>{lang.flag}</span>
              <span className="flex-1">{lang.label}</span>
              {selected?.code === lang.code && (
                <Check className="h-4 w-4 text-primary" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default function ClevioLandingPage() {
  const router = useRouter();
  const { startTrialSession } = useAuth();
  const [language, setLanguage] = useState("id");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [trialLoading, setTrialLoading] = useState(false);
  const [trialError, setTrialError] = useState("");
  const [publicIp, setPublicIp] = useState(null);
  const productVideoRef = useRef(null);
  const videoSectionRef = useRef(null);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [videoTime, setVideoTime] = useState(0);
  const [videoDuration, setVideoDuration] = useState(0);
  const [isVideoMuted, setIsVideoMuted] = useState(true);
  const [showScrollIndicator, setShowScrollIndicator] = useState(false);
  const prefersReducedMotion = useReducedMotion();
  const canAnimate = !prefersReducedMotion;

  const t = useCallback(
    (key) => translations[key]?.[language] ?? key,
    [language]
  );

  const heroKeywords = translations.hero_keywords?.[language] ?? [];

  const formatVideoTime = useCallback((seconds) => {
    if (!Number.isFinite(seconds)) {
      return "00:00";
    }
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${String(minutes).padStart(2, "0")}:${String(secs).padStart(
      2,
      "0"
    )}`;
  }, []);

  const handleVideoTimeUpdate = useCallback(() => {
    const media = productVideoRef.current;
    if (!media) return;
    setVideoTime(media.currentTime);
    if (Number.isFinite(media.duration)) {
      setVideoDuration(media.duration);
    }
  }, []);

  const toggleVideoPlayback = useCallback(() => {
    const media = productVideoRef.current;
    if (!media) return;
    if (media.paused) {
      media
        .play()
        .then(() => setIsVideoPlaying(true))
        .catch(() => {});
    } else {
      media.pause();
      setIsVideoPlaying(false);
    }
  }, []);

  const handleVideoEnded = useCallback(() => {
    setIsVideoPlaying(false);
    setVideoTime(0);
  }, []);

  const handleProgressClick = useCallback((event) => {
    const media = productVideoRef.current;
    if (!media || !Number.isFinite(media.duration)) {
      return;
    }
    const rect = event.currentTarget.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const ratio = Math.min(Math.max(clickX / rect.width, 0), 1);
    media.currentTime = ratio * media.duration;
    setVideoTime(media.currentTime);
  }, []);

  const toggleMute = useCallback(() => {
    const media = productVideoRef.current;
    if (!media) return;
    const nextMuted = !isVideoMuted;
    media.muted = nextMuted;
    setIsVideoMuted(nextMuted);
  }, [isVideoMuted]);

  const handleFullscreen = useCallback(() => {
    const media = productVideoRef.current;
    if (!media || typeof document === "undefined") {
      return;
    }
    if (document.fullscreenElement) {
      document.exitFullscreen?.();
      return;
    }
    media.requestFullscreen?.();
  }, []);

  const heroMotion = canAnimate ? { initial: "hidden", animate: "show" } : {};

  const sectionMotion = canAnimate
    ? {
        initial: "hidden",
        whileInView: "show",
        viewport: { once: true, amount: 0.2 },
      }
    : {};

  const videoProgress = videoDuration
    ? Math.min((videoTime / videoDuration) * 100, 100)
    : 0;
  const displayedCurrentTime = formatVideoTime(videoTime);
  const displayedDuration = videoDuration
    ? formatVideoTime(videoDuration)
    : PRODUCT_VIDEO_SOURCE.durationLabel ?? "00:00";

  const socialLinks = useMemo(
    () => [
      { id: "facebook", icon: Facebook },
      { id: "instagram", icon: Instagram },
      { id: "twitter", icon: Twitter },
      { id: "linkedin", icon: Linkedin },
    ],
    []
  );

  const benefitCards = useMemo(
    () => [
      {
        icon: "💰",
        title: t("benefit_cost_title"),
        description: t("benefit_cost_desc"),
        statValue: "80%",
        statLabel: t("benefit_cost_stat"),
      },
      {
        icon: "⏰",
        title: t("benefit_24_7_title"),
        description: t("benefit_24_7_desc"),
        statValue: "0/100",
        statLabel: t("benefit_24_7_stat"),
      },
      {
        icon: "⚡",
        title: t("benefit_easy_title"),
        description: t("benefit_easy_desc"),
        statValue: language === "id" ? "5 Menit" : "5 Minutes",
        statLabel: t("benefit_easy_stat"),
      },
    ],
    [language, t]
  );

  const pricingPlans = useMemo(
    () => [
      {
        id: "free",
        title: t("pricing_free"),
        description: t("pricing_free_desc"),
        priceDisplay: language === "id" ? "Gratis" : "Free",
        cta: t("pricing_cta_start"),
        variant: "outline",
        features:
          language === "id"
            ? [
                "1 AI Staff untuk WhatsApp",
                "Template onboarding Bahasa Indonesia",
                "Tidak perlu kartu kredit",
                "Dukungan komunitas email",
              ]
            : [
                "1 AI Staff for WhatsApp",
                "Indonesian onboarding templates",
                "No credit card needed",
                "Community email support",
              ],
      },
      {
        id: "monthly",
        title: t("pricing_monthly"),
        description: t("pricing_monthly_desc"),
        price: 100000,
        priceSuffix: language === "id" ? "/ bulan" : "/ month",
        badge: t("pricing_badge_popular"),
        cta: t("pricing_cta_upgrade"),
        variant: "default",
        features:
          language === "id"
            ? [
                "Hingga 5 AI Staff siaga 24/7",
                "Laporan penjualan otomatis via WhatsApp",
                "Prioritas dukungan chat",
                "Follow-up pelanggan otomatis",
              ]
            : [
                "Up to 5 AI Staff on duty 24/7",
                "Automatic sales recap via WhatsApp",
                "Priority chat support",
                "Automated customer follow-up",
              ],
      },
      {
        id: "yearly",
        title: t("pricing_yearly"),
        description: t("pricing_yearly_desc"),
        price: 1000000,
        priceSuffix: language === "id" ? "/ tahun" : "/ year",
        badge: t("pricing_yearly_bonus"),
        cta: t("pricing_cta_scale"),
        variant: "outline",
        features:
          language === "id"
            ? [
                "AI Staff tanpa batas untuk seluruh cabang",
                "Onboarding dan pelatihan eksklusif",
                "Integrasi kustom sesuai kebutuhan",
                "Success manager khusus",
              ]
            : [
                "Unlimited AI Staff across branches",
                "Exclusive onboarding and training",
                "Custom integrations for your tools",
                "Dedicated success manager",
              ],
      },
    ],
    [language, t]
  );

  useEffect(() => {
    let active = true;
    const loadIp = async () => {
      try {
        const response = await fetch("/api/ip", { cache: "no-store" });
        if (!active) return;
        if (response.ok) {
          const data = await response.json();
          if (data?.ip) {
            setPublicIp(data.ip);
          }
        }
      } catch (error) {
        console.warn("[ClevioLandingPage] Unable to determine client IP", error);
      }
    };
    loadIp();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    if (window.innerWidth >= 768) {
      setShowScrollIndicator(false);
      return;
    }
    setShowScrollIndicator(true);
    const handleScroll = () => {
      if (window.scrollY > 50) {
        setShowScrollIndicator(false);
      }
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleStartTrial = async () => {
    if (trialLoading) {
      return;
    }
    setTrialLoading(true);
    setTrialError("");
    try {
      const response = await fetch("/api/trial", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ip_user: publicIp }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || data?.success === false) {
        throw new Error(data?.error || "Unable to start trial");
      }

      startTrialSession?.({
        apiKey: data.apiKey,
        planCode: data.planCode,
        expiresAt: data.expiresAt,
        ipAddress: data.ip,
        metadata: data.raw,
      });

      router.push("/trial/templates");
    } catch (error) {
      setTrialError(error.message || "Unable to start trial");
    } finally {
      setTrialLoading(false);
    }
  };

  const handleHeroCta = useCallback(() => {
    if (videoSectionRef.current) {
      videoSectionRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, []);

  return (
    <>
      <Script id="clevio-ai-staff-schema" type="application/ld+json">
        {JSON.stringify(SOFTWARE_APP_SCHEMA)}
      </Script>

      <div className="relative min-h-screen bg-background text-foreground">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[640px] bg-gradient-to-b from-primary/20 via-accent-sky/10 to-transparent blur-3xl"
        />

        <nav className="sticky top-0 z-50 border-b border-border/70 bg-background/90 backdrop-blur-xl">
          <div className="container mx-auto flex h-16 items-center justify-between px-4">
            <div className="flex items-center">
              <Image
                src="/clevioAIAssistantsLogo.png"
                alt="Clevio AI Staff"
                width={150}
                height={50}
                className="h-auto w-[150px]"
                priority
              />
            </div>

            <div className="hidden items-center gap-4 md:flex">
              <LanguageToggle language={language} setLanguage={setLanguage} />
              <Button variant="ghost" asChild>
                <a href="/login">{t("nav_login")}</a>
              </Button>
              <Button asChild>
                <a href="/register">{t("nav_register")}</a>
              </Button>
            </div>

            <div className="flex items-center gap-2 md:hidden">
              <LanguageToggle language={language} setLanguage={setLanguage} />
              <button
                onClick={() => setMobileMenuOpen((prev) => !prev)}
                className="rounded-full border border-border bg-card/80 p-2 text-foreground shadow-sm transition-colors hover:bg-primary/10"
                aria-label="Toggle menu"
              >
                {mobileMenuOpen ? (
                  <X className="h-5 w-5" />
                ) : (
                  <Menu className="h-5 w-5" />
                )}
              </button>
            </div>
          </div>

          {mobileMenuOpen && (
            <div className="border-t border-border/60 bg-background/95 px-4 py-4 shadow-sm md:hidden">
              <div className="space-y-2">
                <Button variant="ghost" className="w-full" asChild>
                  <a href="/login">{t("nav_login")}</a>
                </Button>
                <Button className="w-full" asChild>
                  <a href="/register">{t("nav_register")}</a>
                </Button>
              </div>
            </div>
          )}
        </nav>

        {showScrollIndicator && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="fixed bottom-8 left-1/2 z-40 -translate-x-1/2 md:hidden"
          >
            <div className="flex flex-col items-center gap-2 rounded-full border border-primary/40 bg-background/95 px-4 py-2 text-primary shadow-lg">
              <span className="text-sm font-semibold uppercase tracking-wide">
                {t("mobile_scroll_text")}
              </span>
              <motion.div
                animate={canAnimate ? { y: [0, 8, 0] } : {}}
                transition={{ repeat: canAnimate ? Infinity : 0, duration: 1.4 }}
              >
                <ArrowDown className="h-5 w-5" />
              </motion.div>
            </div>
          </motion.div>
        )}

        <main>
          <motion.section
            {...heroMotion}
            variants={STAGGER_CONTAINER_VARIANTS}
            className="container mx-auto px-4 pb-24 pt-20 sm:pt-24"
          >
            <div className="grid grid-cols-1 gap-12 lg:grid-cols-2">
              <div className="space-y-8">
                <motion.span
                  variants={FADE_UP_VARIANTS}
                  className="inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-primary"
                >
                  {t("hero_badge")}
                </motion.span>
                <motion.h1
                  variants={FADE_UP_VARIANTS}
                  className="text-4xl font-bold tracking-tight text-primary sm:text-5xl lg:text-6xl"
                >
                  {t("hero_headline")}
                </motion.h1>
                <motion.p
                  variants={FADE_UP_VARIANTS}
                  className="text-lg leading-relaxed text-muted-foreground sm:text-xl"
                >
                  {t("hero_subheadline")}
                </motion.p>
                {heroKeywords.length > 0 && (
                  <motion.div
                    variants={FADE_UP_VARIANTS}
                    className="flex flex-wrap gap-2"
                  >
                    {heroKeywords.map((keyword) => (
                      <span
                        key={keyword}
                        className="rounded-full border border-border/70 bg-card/80 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                      >
                        {keyword}
                      </span>
                    ))}
                  </motion.div>
                )}
                <motion.div variants={FADE_UP_VARIANTS}>
                  <Button size="lg" onClick={handleHeroCta}>
                    {t("hero_video_cta")}
                  </Button>
                </motion.div>
              </div>

              <motion.figure
                variants={FADE_UP_VARIANTS}
                className="relative"
              >
                <div className="relative aspect-[4/3] w-full overflow-hidden rounded-3xl border border-border/70 bg-gradient-to-br from-primary/5 via-accent-sky/20 to-transparent shadow-[0_40px_120px_rgba(0,0,0,0.15)]">
                  <Image
                    src="/heroPicture.jpg"
                    alt={t("hero_placeholder_alt")}
                    fill
                    priority
                    className="object-cover"
                    sizes="(min-width: 1024px) 50vw, 100vw"
                  />
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-background/30 via-transparent" aria-hidden />
                </div>
              </motion.figure>
            </div>
          </motion.section>

          <motion.section
            ref={videoSectionRef}
            id="video-demo"
            {...sectionMotion}
            variants={STAGGER_CONTAINER_VARIANTS}
            className="container mx-auto px-4 pb-20"
          >
            <motion.div
              variants={FADE_UP_VARIANTS}
              className="mx-auto max-w-3xl text-center"
            >
              <span className="inline-flex items-center justify-center rounded-full border border-black/10 bg-black/5 px-4 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-black">
                {t("video_badge")}
              </span>
              <h2 className="mt-6 text-4xl font-bold text-foreground sm:text-5xl">
                {t("video_title")}
              </h2>
              <p className="mt-4 text-lg text-muted-foreground">
                {t("video_subtitle")}
              </p>
            </motion.div>

            <motion.div
              variants={FADE_UP_VARIANTS}
              className="mx-auto mt-12 max-w-5xl"
            >
              <div className="rounded-[42px] bg-gradient-to-br from-black/15 via-black/5 to-transparent p-1 shadow-[0_30px_120px_rgba(0,0,0,0.35)]">
                <div className="relative overflow-hidden rounded-[36px] border border-black/10 bg-black">
                  {/* TODO: Replace with final tutorial video (MP4, <3 minutes) */}
                  <video
                    ref={productVideoRef}
                    src={PRODUCT_VIDEO_SOURCE.src}
                    poster={PRODUCT_VIDEO_SOURCE.poster}
                    className="block h-full w-full object-cover"
                    muted={isVideoMuted}
                    playsInline
                    preload="none"
                    onPlay={() => setIsVideoPlaying(true)}
                    onPause={() => setIsVideoPlaying(false)}
                    onEnded={handleVideoEnded}
                    onTimeUpdate={handleVideoTimeUpdate}
                    onLoadedMetadata={handleVideoTimeUpdate}
                  />

                  <button
                    type="button"
                    onClick={toggleVideoPlayback}
                    aria-pressed={isVideoPlaying}
                    className="absolute left-1/2 top-1/2 z-20 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-black/40 bg-black/10 text-white backdrop-blur transition hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
                  >
                    {isVideoPlaying ? (
                      <Pause className="h-7 w-7" />
                    ) : (
                      <Play className="h-7 w-7 translate-x-0.5" />
                    )}
                    <span className="sr-only">
                      {isVideoPlaying ? t("video_pause") : t("video_play")}
                    </span>
                  </button>

                  <div className="absolute inset-x-6 bottom-6 flex flex-wrap items-center gap-4 text-black/80">
                    <div
                      className="relative flex-1 cursor-pointer rounded-full bg-black/20 p-0.5"
                      role="progressbar"
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-valuenow={Math.round(videoProgress)}
                      onClick={handleProgressClick}
                    >
                      <span
                        className="block h-1 rounded-full bg-black"
                        style={{ width: `${videoProgress}%` }}
                      />
                    </div>
                    <span className="text-xs font-semibold uppercase tracking-wide text-white/80">
                      {displayedCurrentTime} | {displayedDuration}
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={toggleMute}
                        className="flex h-9 w-9 items-center justify-center rounded-full border border-white/30 bg-white/10 text-white transition hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
                        aria-pressed={isVideoMuted}
                      >
                        {isVideoMuted ? (
                          <VolumeX className="h-4 w-4" />
                        ) : (
                          <Volume2 className="h-4 w-4" />
                        )}
                        <span className="sr-only">
                          {isVideoMuted ? t("video_unmute") : t("video_mute")}
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={handleFullscreen}
                        className="flex h-9 w-9 items-center justify-center rounded-full border border-white/30 bg-white/10 text-white transition hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
                        aria-label={t("video_fullscreen")}
                      >
                        <Maximize2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.section>

          <motion.section
            {...sectionMotion}
            variants={STAGGER_CONTAINER_VARIANTS}
            className="container mx-auto px-4 pb-12"
          >
            <motion.div
              variants={FADE_UP_VARIANTS}
              className="mx-auto max-w-2xl text-center"
            >
              <h2 className="text-4xl font-bold text-foreground sm:text-5xl">
                {t("benefits_headline")}
              </h2>
            </motion.div>

            <div className="mt-12 grid grid-cols-1 gap-8 md:grid-cols-3">
              {benefitCards.map((benefit) => (
                <motion.div
                  key={benefit.title}
                  variants={FADE_UP_VARIANTS}
                  className="flex h-full flex-col rounded-3xl border border-border/70 bg-card/95 p-8"
                >
                  <div className="text-5xl" aria-hidden>
                    {benefit.icon}
                  </div>
                  <h3 className="mt-6 text-2xl font-bold text-foreground">
                    {benefit.title}
                  </h3>
                  <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                    {benefit.description}
                  </p>
                  <div className="mt-8 border-t border-border/60 pt-6">
                    <div className="text-4xl font-bold text-primary">
                      {benefit.statValue}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {benefit.statLabel}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.section>

          <section className="container mx-auto px-4 py-16">
            <div className="mx-auto max-w-2xl text-center">
              <h3 className="text-3xl font-bold text-foreground sm:text-4xl">
                {t("cta_headline")}
              </h3>
              <Button
                size="lg"
                className="mt-8 w-full justify-center text-lg sm:w-auto sm:px-12 sm:py-6"
                onClick={handleStartTrial}
                disabled={trialLoading}
                aria-busy={trialLoading}
              >
                {trialLoading ? t("cta_loading") : t("cta_button")}
              </Button>
              <p className="mt-4 text-sm text-muted-foreground">
                {t("cta_subtext")}
              </p>
              {trialError && (
                <p className="mt-4 text-sm font-medium text-destructive">
                  {trialError}
                </p>
              )}
            </div>
          </section>

          <motion.section
            {...sectionMotion}
            variants={STAGGER_CONTAINER_VARIANTS}
            className="bg-primary/5 py-20"
          >
            <div className="container mx-auto grid gap-12 px-4 md:grid-cols-2 md:items-center">
              <motion.div variants={FADE_UP_VARIANTS}>
                <h2 className="text-3xl font-bold text-foreground sm:text-4xl">
                  {t("integrations_title")}
                </h2>
                <p className="mt-4 text-lg text-muted-foreground">
                  {t("integrations_desc")}
                </p>
              </motion.div>

              <motion.div
                variants={FADE_UP_VARIANTS}
                className="relative rounded-3xl border border-border/60 bg-card/95 p-8"
              >
                <div className="flex flex-col items-center gap-6 text-center">
                  <div className="flex items-center gap-4 text-emerald-500">
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-100 text-3xl">
                      🟢
                    </div>
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-border/50 bg-background">
                      <QrCode className="h-10 w-10 text-foreground" />
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {t("integration_caption")}
                  </p>
                </div>
              </motion.div>
            </div>
          </motion.section>

          <motion.section
            id="pricing"
            {...sectionMotion}
            variants={STAGGER_CONTAINER_VARIANTS}
            className="container mx-auto px-4 py-20"
          >
            <motion.div
              variants={FADE_UP_VARIANTS}
              className="mx-auto max-w-2xl text-center"
            >
              <h2 className="text-4xl font-bold text-foreground sm:text-5xl">
                {t("pricing_title")}
              </h2>
              <p className="mt-4 text-muted-foreground">
                {t("pricing_subtitle")}
              </p>
            </motion.div>

            <div className="mt-14 grid grid-cols-1 gap-8 lg:grid-cols-3">
              {pricingPlans.map(
                ({
                  id,
                  title,
                  description,
                  price,
                  priceSuffix,
                  priceDisplay,
                  cta,
                  features,
                  badge,
                  variant,
                }) => (
                  <MotionCard
                    key={id}
                    variants={FADE_UP_VARIANTS}
                    className={cn(
                      "flex h-full flex-col border-border/60 bg-card/95 p-8",
                      variant === "default"
                        ? "border-primary/60 bg-primary text-primary-foreground shadow-xl shadow-primary/30"
                        : ""
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p
                          className={cn(
                            "text-sm font-semibold uppercase tracking-wide",
                            variant === "default"
                              ? "text-primary-foreground/80"
                              : "text-muted-foreground"
                          )}
                        >
                          {title}
                        </p>
                        <p
                          className={cn(
                            "mt-3 text-sm",
                            variant === "default"
                              ? "text-primary-foreground/80"
                              : "text-muted-foreground"
                          )}
                        >
                          {description}
                        </p>
                      </div>
                      {badge && (
                        <span
                          className={cn(
                            "rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide",
                            variant === "default"
                              ? "bg-primary-foreground/10 text-primary-foreground"
                              : "bg-primary/10 text-primary"
                          )}
                        >
                          {badge}
                        </span>
                      )}
                    </div>

                    <div className="mt-8 flex items-baseline gap-2">
                      {price !== undefined ? (
                        <>
                          <span className="text-5xl font-bold tracking-tight">
                            <NumberFlow
                              value={price}
                              format={{
                                style: "currency",
                                currency: "IDR",
                                minimumFractionDigits: 0,
                                maximumFractionDigits: 0,
                              }}
                              formatter={(value) =>
                                `Rp${Number(value).toLocaleString("id-ID")}`
                              }
                              transformTiming={{
                                duration: 600,
                                easing: "ease-out",
                              }}
                              willChange={canAnimate}
                            />
                          </span>
                          <span
                            className={cn(
                              "text-sm font-medium",
                              variant === "default"
                                ? "text-primary-foreground/80"
                                : "text-muted-foreground"
                            )}
                          >
                            {priceSuffix}
                          </span>
                        </>
                      ) : (
                        <span className="text-5xl font-bold tracking-tight">
                          {priceDisplay}
                        </span>
                      )}
                    </div>

                    <ul
                      className={cn(
                        "mt-8 flex flex-1 flex-col gap-3 text-sm",
                        variant === "default"
                          ? "text-primary-foreground/90"
                          : "text-foreground"
                      )}
                    >
                      {features.map((feature) => (
                        <li key={feature} className="flex items-start gap-2">
                          <span
                            className={cn(
                              "mt-1 inline-flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full",
                              variant === "default"
                                ? "bg-primary-foreground/20 text-primary-foreground"
                                : "bg-primary/10 text-primary"
                            )}
                          >
                            <Check className="h-3 w-3" />
                          </span>
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>

                    <Button
                      variant={variant}
                      className={cn(
                        "mt-8 w-full",
                        variant === "default"
                          ? "bg-primary-foreground text-primary shadow-none hover:bg-primary-foreground/80"
                          : ""
                      )}
                    >
                      {cta}
                    </Button>
                  </MotionCard>
                )
              )}
            </div>
          </motion.section>

          <motion.section
            {...sectionMotion}
            variants={STAGGER_CONTAINER_VARIANTS}
            className="container mx-auto px-4 py-20"
          >
            <motion.div
              variants={FADE_UP_VARIANTS}
              className="mx-auto max-w-2xl text-center"
            >
              <h2 className="text-3xl font-bold text-foreground sm:text-4xl">
                {t("faq_title")}
              </h2>
            </motion.div>

            <div className="mt-12 space-y-4">
              {[1, 2, 3, 4, 5, 6, 7].map((num) => (
                <motion.details
                  key={num}
                  variants={FADE_UP_VARIANTS}
                  className="group overflow-hidden rounded-2xl border border-border/70 bg-card/95 p-5 shadow-sm transition-all duration-200"
                >
                  <summary className="flex cursor-pointer items-center justify-between gap-4 text-left text-sm font-semibold text-foreground">
                    <span>{t(`faq_${num}_q`)}</span>
                    <ChevronDown className="h-5 w-5 text-muted-foreground transition-transform duration-200 group-open:rotate-180" />
                  </summary>
                  <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                    {t(`faq_${num}_a`)}
                  </p>
                </motion.details>
              ))}
            </div>
          </motion.section>
        </main>

        <footer className="border-t border-border/70 bg-background/90 py-14">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-1 gap-10 md:grid-cols-4">
              <div className="md:col-span-2">
                <div className="flex items-center">
                  <Image
                    src="/clevioAIAssistantsLogo.png"
                    alt="Clevio AI Staff"
                    width={180}
                    height={60}
                    className="h-auto w-[180px]"
                  />
                </div>
                <p className="mt-4 max-w-md text-sm text-muted-foreground">
                  {t("footer_tagline")}
                </p>
                <div className="mt-6 flex gap-4">
                  {socialLinks.map(({ id, icon: Icon }) => (
                    <a
                      key={id}
                      href="#"
                      aria-label={id}
                      className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card/90 text-muted-foreground transition-colors hover:border-primary/60 hover:text-primary"
                    >
                      <Icon className="h-5 w-5" />
                    </a>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  {t("footer_company")}
                </h3>
                <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
                  <li>
                    <a className="transition-colors hover:text-primary" href="#">
                      {t("footer_about")}
                    </a>
                  </li>
                  <li>
                    <a className="transition-colors hover:text-primary" href="#">
                      {t("footer_contact")}
                    </a>
                  </li>
                </ul>
              </div>

              <div>
                <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  {t("footer_resources")}
                </h3>
                <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
                  <li>
                    <a className="transition-colors hover:text-primary" href="/login">
                      {t("footer_login")}
                    </a>
                  </li>
                  <li>
                    <a className="transition-colors hover:text-primary" href="/register">
                      {t("footer_register")}
                    </a>
                  </li>
                  <li>
                    <a className="transition-colors hover:text-primary" href="#pricing">
                      {t("footer_pricing")}
                    </a>
                  </li>
                </ul>
              </div>
            </div>

            <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-border/60 pt-6 text-sm text-muted-foreground md:flex-row">
              <p>
                © {new Date().getFullYear()} Clevio AI Staff. All rights reserved.
              </p>
              <div className="flex gap-4">
                <a className="transition-colors hover:text-primary" href="#">
                  {t("footer_privacy")}
                </a>
                <a className="transition-colors hover:text-primary" href="#">
                  {t("footer_terms")}
                </a>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}
