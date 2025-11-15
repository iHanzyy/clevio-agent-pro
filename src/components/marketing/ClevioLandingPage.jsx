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

const WhatsAppIcon = ({ className = "h-4 w-4" }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 32 32"
    fill="currentColor"
    className={className}
    aria-hidden
  >
    <path d="M26.576 5.363c-2.69-2.69-6.406-4.354-10.511-4.354-8.209 0-14.865 6.655-14.865 14.865 0 2.732 0.737 5.291 2.022 7.491l-0.038-0.070-2.109 7.702 7.879-2.067c2.051 1.139 4.498 1.809 7.102 1.809h0.006c8.209-0.003 14.862-6.659 14.862-14.868 0-4.103-1.662-7.817-4.349-10.507l0 0zM16.062 28.228h-0.005c-0 0-0.001 0-0.001 0-2.319 0-4.489-0.64-6.342-1.753l0.056 0.031-0.451-0.267-4.675 1.227 1.247-4.559-0.294-0.467c-1.185-1.862-1.889-4.131-1.889-6.565 0-6.822 5.531-12.353 12.353-12.353s12.353 5.531 12.353 12.353c0 6.822-5.53 12.353-12.353 12.353h-0zM22.838 18.977c-0.371-0.186-2.197-1.083-2.537-1.208-0.341-0.124-0.589-0.185-0.837 0.187-0.246 0.371-0.958 1.207-1.175 1.455-0.216 0.249-0.434 0.279-0.805 0.094-1.15-0.466-2.138-1.087-2.997-1.852l0.010 0.009c-0.799-0.74-1.484-1.587-2.037-2.521l-0.028-0.052c-0.216-0.371-0.023-0.572 0.162-0.757 0.167-0.166 0.372-0.434 0.557-0.65 0.146-0.179 0.271-0.384 0.366-0.604l0.006-0.017c0.043-0.087 0.068-0.188 0.068-0.296 0-0.131-0.037-0.253-0.101-0.357l0.002 0.003c-0.094-0.186-0.836-2.014-1.145-2.758-0.302-0.724-0.609-0.625-0.836-0.637-0.216-0.010-0.464-0.012-0.712-0.012-0.395 0.010-0.746 0.188-0.988 0.463l-0.001 0.002c-0.802 0.761-1.3 1.834-1.3 3.023 0 0.026 0 0.053 0.001 0.079l-0-0.004c0.131 1.467 0.681 2.784 1.527 3.857l-0.012-0.015c1.604 2.379 3.742 4.282 6.251 5.564l0.094 0.043c0.548 0.248 1.25 0.513 1.968 0.74l0.149 0.041c0.442 0.14 0.951 0.221 1.479 0.221 0.303 0 0.601-0.027 0.889-0.078l-0.031 0.004c1.069-0.223 1.956-0.868 2.497-1.749l0.009-0.017c0.165-0.366 0.261-0.793 0.261-1.242 0-0.185-0.016-0.366-0.047-0.542l0.003 0.019c-0.092-0.155-0.34-0.247-0.712-0.434z" />
  </svg>
);

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
  src: "/AiStaffDemo.mp4",
  poster:
    "https://images.unsplash.com/photo-1520607162513-77705c0f0d4a?auto=format&fit=crop&w=1920&q=80",
  durationLabel: "03:00",
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
    en: "AI Staff Working Non-Stop, Priced Below Minimum Wage",
    id: "AI Staff Kerja Non-Stop, Harga di Bawah UMR",
  },
  hero_subheadline: {
    en: "Grow your business, AI handles every WhatsApp chat 24/7.",
    id: "Kembangkan bisnis, AI balas semua chat WhatsApp 24/7.",
  },
  cta_button_primary: {
    en: "Try Free Now",
    id: "Coba Gratis Sekarang",
  },
  cta_button_secondary: {
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
    id: ["hemat biaya karyawan", "AI penjualan UMKM", "staff AI harga murah"],
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
    en: "See How AI Staff Works in 1 Minutes",
    id: "Lihat Cara Kerja AI Staff dalam 1 Menit",
  },
  video_subtitle: {
    en: "Follow a few simple steps to activate your WhatsApp AI.",
    id: "Ikuti langkah mudah untuk aktifkan AI WhatsApp Anda.",
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
    en: "Priced below minimum wage. No salary, bonuses, or insurance.",
    id: "Harga di bawah UMR. Tanpa gaji, THR, atau BPJS.",
  },
  benefit_24_7_title: {
    en: "Works 24/7 Non-Stop",
    id: "Kerja 24/7 Tanpa Henti",
  },
  benefit_24_7_desc: {
    en: "Never sleeps or takes leave. Customers get instant replies anytime.",
    id: "Tidak pernah tidur atau cuti. Pelanggan dibalas instan kapan pun.",
  },
  benefit_easy_title: {
    en: "Super Simple Setup",
    id: "Setup Super Mudah",
  },
  benefit_easy_desc: {
    en: "Tap, pick a template, go live. Easy for everyone.",
    id: "Tekan, pilih template, langsung aktif. Mudah untuk semua.",
  },
  benefit_whatsapp_title: {
    en: "WhatsApp Integration",
    id: "Terintegrasi WhatsApp",
  },
  benefit_whatsapp_desc: {
    en: "Connect via QR scan, no API setup or technical hassle.",
    id: "Hubungkan lewat scan QR, tanpa setup API atau ribet teknis.",
  },
  stat_label_savings: {
    en: "Cost Savings",
    id: "Penghematan Biaya",
  },
  stat_label_replies: {
    en: "Response Rate",
    id: "Tingkat Respons",
  },
  stat_label_setup: {
    en: "Setup Time",
    id: "Waktu Setup",
  },
  stat_label_integration: {
    en: "Integration",
    id: "Integrasi",
  },
  cta_headline: {
    en: "Ready to Save Costs and Boost Sales?",
    id: "Siap Hemat Biaya dan Tingkatkan Penjualan?",
  },
  cta_subtext: {
    en: "No credit card • Live in 5 minutes",
    id: "Tidak perlu kartu kredit • Aktif dalam 5 menit",
  },
  cta_loading: {
    en: "Starting...",
    id: "Memulai...",
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
    en: "Test AI Staff risk-free and launch a WhatsApp assistant.",
    id: "Tes AI Staff tanpa risiko dan luncurkan asisten WhatsApp.",
  },
  pricing_monthly_desc: {
    en: "Grow sales with 24/7 AI, sales recaps, and priority help.",
    id: "Naikkan penjualan dengan AI 24/7, rekap penjualan, dan dukungan prioritas.",
  },
  pricing_yearly_desc: {
    en: "Scale with dedicated onboarding and the best savings.",
    id: "Skala dengan onboarding khusus dan hemat terbesar.",
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
    en: "AI Staff has no salary or benefits costs yet replies instantly.",
    id: "AI Staff tanpa gaji atau BPJS tapi tetap balas instan.",
  },
  faq_4_q: {
    en: "Does AI Staff answer chats 24/7?",
    id: "Apakah AI Staff membalas 24/7?",
  },
  faq_4_a: {
    en: "Yes. Replies stay under a minute even at midnight or on holidays.",
    id: "Ya. Balas kurang dari satu menit meski tengah malam atau libur.",
  },
  faq_5_q: {
    en: "How do I connect WhatsApp?",
    id: "Bagaimana cara menghubungkan WhatsApp?",
  },
  faq_5_a: {
    en: "Open the dashboard, scan the QR, and chats sync instantly, no API needed.",
    id: "Buka dashboard, scan QR, dan chat tersinkron langsung, tanpa API.",
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
        statLabel: t("stat_label_savings"),
      },
      {
        icon: "⏰",
        title: t("benefit_24_7_title"),
        description: t("benefit_24_7_desc"),
        statValue: "100%",
        statLabel: t("stat_label_replies"),
      },
      {
        icon: "⚡",
        title: t("benefit_easy_title"),
        description: t("benefit_easy_desc"),
        statValue: language === "id" ? "5 Menit" : "5 Minutes",
        statLabel: t("stat_label_setup"),
      },
      {
        icon: "whatsapp",
        title: t("benefit_whatsapp_title"),
        description: t("benefit_whatsapp_desc"),
        statValue: language === "id" ? "1 Klik" : "1 Tap",
        statLabel: t("stat_label_integration"),
      },
    ],
    [language, t]
  );

  const renderBenefitIcon = useCallback((icon) => {
    if (icon === "whatsapp") {
      return (
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#25D366]/10 text-[#25D366]">
          <WhatsAppIcon className="h-6 w-6" />
        </div>
      );
    }
    return (
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/5 text-2xl">
        <span aria-hidden>{icon}</span>
      </div>
    );
  }, []);

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
        console.warn(
          "[ClevioLandingPage] Unable to determine client IP",
          error
        );
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
      videoSectionRef.current.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
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
                src="/clevioAISTAFF-Logo-Black.png"
                alt="Clevio AI Staff"
                width={150}
                height={50}
                priority
                className="h-auto w-[150px]"
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
                transition={{
                  repeat: canAnimate ? Infinity : 0,
                  duration: 1.4,
                }}
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
            className="container mx-auto max-w-6xl px-4 pb-20 pt-16 sm:pb-24 sm:pt-20 lg:pb-28 lg:pt-24"
          >
            <div className="grid grid-cols-1 gap-10 lg:grid-cols-2 lg:items-center">
              <div className="space-y-6 sm:space-y-7">
                <motion.span
                  variants={FADE_UP_VARIANTS}
                  className="inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-primary"
                >
                  {t("hero_badge")}
                </motion.span>
                <motion.h1
                  variants={FADE_UP_VARIANTS}
                  className="text-3xl font-bold tracking-tight text-primary sm:text-4xl lg:text-5xl xl:text-6xl"
                >
                  {t("hero_headline")}
                </motion.h1>
                <motion.p
                  variants={FADE_UP_VARIANTS}
                  className="text-base leading-7 text-muted-foreground sm:text-lg"
                >
                  {t("hero_subheadline")}
                </motion.p>
                {heroKeywords.length > 0 && (
                  <motion.div
                    variants={FADE_UP_VARIANTS}
                    className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:justify-start"
                  >
                    {heroKeywords.map((keyword, index) => (
                      <span
                        key={keyword}
                        className={cn(
                          "inline-flex items-center justify-center rounded-full border border-border/70 bg-card/80 px-3 py-1.5 text-[0.65rem] font-semibold uppercase tracking-wide text-muted-foreground",
                          heroKeywords.length === 3 && index === 2
                            ? "col-span-2 justify-self-center sm:col-span-1"
                            : ""
                        )}
                      >
                        {keyword}
                      </span>
                    ))}
                  </motion.div>
                )}
                <motion.div
                  variants={FADE_UP_VARIANTS}
                  className="flex flex-col gap-3 sm:flex-row sm:flex-wrap"
                >
                  <Button
                    size="lg"
                    onClick={handleHeroCta}
                    className="w-full text-base sm:w-auto sm:min-w-[200px]"
                  >
                    {t("cta_button_secondary")}
                  </Button>
                </motion.div>
              </div>

              <motion.figure variants={FADE_UP_VARIANTS} className="relative">
                <div className="relative aspect-[3/2] w-full overflow-hidden rounded-3xl border border-border/70 bg-gradient-to-br from-primary/5 via-accent-sky/20 to-transparent shadow-[0_40px_120px_rgba(0,0,0,0.15)] sm:aspect-[4/3]">
                  <Image
                    src="/heroPicture.jpg"
                    alt={t("hero_placeholder_alt")}
                    fill
                    priority
                    className="object-cover"
                    sizes="(min-width: 1024px) 50vw, 100vw"
                  />
                  <div
                    className="pointer-events-none absolute inset-0 bg-gradient-to-t from-background/30 via-transparent"
                    aria-hidden
                  />
                </div>
              </motion.figure>
            </div>
          </motion.section>

          <motion.section
            ref={videoSectionRef}
            id="video-demo"
            {...sectionMotion}
            variants={STAGGER_CONTAINER_VARIANTS}
            className="container mx-auto max-w-7xl px-4 py-16 sm:py-20 lg:py-24"
          >
            <motion.div
              variants={FADE_UP_VARIANTS}
              className="mx-auto max-w-3xl text-center"
            >
              <span className="inline-flex items-center justify-center rounded-full border border-primary/20 bg-primary/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-primary">
                {t("video_badge")}
              </span>
              <h2 className="mt-6 text-3xl font-bold text-foreground sm:text-4xl lg:text-5xl">
                {t("video_title")}
              </h2>
              <p className="mt-4 text-base leading-7 text-muted-foreground sm:text-lg">
                {t("video_subtitle")}
              </p>
            </motion.div>

            <motion.div
              variants={FADE_UP_VARIANTS}
              className="mx-auto mt-10 max-w-4xl sm:mt-12 lg:mt-14"
            >
              <div className="rounded-[42px] bg-gradient-to-br from-black/15 via-black/5 to-transparent p-1 shadow-[0_30px_120px_rgba(0,0,0,0.35)]">
                <div className="relative aspect-video overflow-hidden rounded-[36px] border border-black/10 bg-black">
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
                    className="absolute left-1/2 top-1/2 z-20 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-black/20 bg-black/10 text-black backdrop-blur transition hover:bg-black/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/50"
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

                  <div className="absolute inset-x-6 bottom-6 flex flex-wrap items-center gap-4">
                    <div
                      className="relative flex-1 cursor-pointer rounded-full bg-black/20 p-0.5"
                      role="progressbar"
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-valuenow={Math.round(videoProgress)}
                      onClick={handleProgressClick}
                    >
                      <span
                        className="block h-1 rounded-full bg-black/90"
                        style={{ width: `${videoProgress}%` }}
                      />
                    </div>
                    <span className="text-xs font-semibold uppercase tracking-wide text-black/90">
                      {displayedCurrentTime} | {displayedDuration}
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={toggleMute}
                        className="flex h-9 w-9 items-center justify-center rounded-full border border-black/30 bg-black/10 text-black backdrop-blur transition hover:bg-black/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/50"
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
                        className="flex h-9 w-9 items-center justify-center rounded-full border border-black/30 bg-black/10 text-black backdrop-blur transition hover:bg-black/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/50"
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
            className="container mx-auto max-w-7xl px-4 py-16 sm:py-20 lg:py-24"
          >
            <motion.div
              variants={FADE_UP_VARIANTS}
              className="mx-auto max-w-2xl text-center"
            >
              <h2 className="text-3xl font-bold text-foreground sm:text-4xl lg:text-5xl">
                {t("benefits_headline")}
              </h2>
            </motion.div>

            <div className="mt-10 grid grid-cols-1 gap-6 sm:mt-12 sm:grid-cols-2 sm:gap-8 lg:mt-14 xl:grid-cols-4">
              {benefitCards.map((benefit) => (
                <motion.div
                  key={benefit.title}
                  variants={FADE_UP_VARIANTS}
                  className="flex h-full flex-col rounded-3xl border border-border/60 bg-card/95 p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-primary/60 hover:shadow-xl hover:shadow-primary/10 sm:p-8"
                >
                  <div aria-hidden>{renderBenefitIcon(benefit.icon)}</div>
                  <h3 className="mt-6 text-2xl font-bold text-foreground">
                    {benefit.title}
                  </h3>
                  <p className="mt-3 text-sm leading-7 text-muted-foreground">
                    {benefit.description}
                  </p>
                  <div className="mt-auto rounded-2xl border border-border/50 bg-gradient-to-br from-primary/5 to-accent-sky/10 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      {benefit.statLabel}
                    </p>
                    <p className="mt-1 text-3xl font-bold text-primary sm:text-4xl">
                      {benefit.statValue}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.section>

          <section className="container mx-auto max-w-7xl px-4 py-12 sm:py-16 lg:py-20">
            <div className="mx-auto max-w-2xl text-center">
              <h3 className="text-2xl font-bold text-foreground sm:text-3xl lg:text-4xl">
                {t("cta_headline")}
              </h3>
              <Button
                size="lg"
                className="mt-6 w-full justify-center text-base sm:mt-8 sm:w-auto sm:px-10 sm:text-lg lg:px-12"
                onClick={handleStartTrial}
                disabled={trialLoading}
                aria-busy={trialLoading}
              >
                {trialLoading ? t("cta_loading") : t("cta_button_primary")}
              </Button>
              <p className="mt-4 text-sm leading-7 text-muted-foreground">
                {t("cta_subtext")}
              </p>
              {trialError && (
                <p className="mt-3 text-sm font-medium text-destructive">
                  {trialError}
                </p>
              )}
            </div>
          </section>

          <motion.section
            id="pricing"
            {...sectionMotion}
            variants={STAGGER_CONTAINER_VARIANTS}
            className="container mx-auto max-w-7xl px-4 py-16 sm:py-20 lg:py-24"
          >
            <motion.div
              variants={FADE_UP_VARIANTS}
              className="mx-auto max-w-2xl text-center"
            >
              <h2 className="text-3xl font-bold text-foreground sm:text-4xl lg:text-5xl">
                {t("pricing_title")}
              </h2>
              <p className="mt-4 text-base text-muted-foreground">
                {t("pricing_subtitle")}
              </p>
            </motion.div>

            <div className="mt-10 grid grid-cols-1 gap-6 sm:mt-12 sm:gap-8 lg:mt-14 lg:grid-cols-3">
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
            className="container mx-auto max-w-7xl px-4 py-16 sm:py-20 lg:py-24"
          >
            <motion.div
              variants={FADE_UP_VARIANTS}
              className="mx-auto max-w-2xl text-center"
            >
              <h2 className="text-3xl font-bold text-foreground sm:text-4xl lg:text-5xl">
                {t("faq_title")}
              </h2>
            </motion.div>

            <div className="mx-auto mt-10 max-w-3xl space-y-4 sm:mt-12 lg:mt-14">
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

        <footer className="border-t border-border/70 bg-background/90 py-12 sm:py-14 lg:py-16">
          <div className="container mx-auto max-w-7xl px-4">
            <div className="grid grid-cols-2 gap-10 md:grid-cols-4">
              <div className="col-span-2 md:col-span-2 flex flex-col items-center text-center md:items-start md:text-left">
                <div className="flex items-center justify-center md:justify-start">
                  <Image
                    src="/clevioAISTAFF-Logo-Black.png"
                    alt="Clevio AI Staff"
                    width={180}
                    height={60}
                    className="h-auto w-[180px]"
                  />
                </div>
                <p className="mt-4 max-w-md text-sm text-muted-foreground">
                  {t("footer_tagline")}
                </p>
                <div className="mt-6 flex gap-4 justify-center md:justify-start">
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

              <div className="col-span-1">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  {t("footer_company")}
                </h3>
                <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
                  <li>
                    <a
                      className="transition-colors hover:text-primary"
                      href="#"
                    >
                      {t("footer_about")}
                    </a>
                  </li>
                  <li>
                    <a
                      className="transition-colors hover:text-primary"
                      href="#"
                    >
                      {t("footer_contact")}
                    </a>
                  </li>
                </ul>
              </div>

              <div className="col-span-1">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  {t("footer_resources")}
                </h3>
                <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
                  <li>
                    <a
                      className="transition-colors hover:text-primary"
                      href="/login"
                    >
                      {t("footer_login")}
                    </a>
                  </li>
                  <li>
                    <a
                      className="transition-colors hover:text-primary"
                      href="/register"
                    >
                      {t("footer_register")}
                    </a>
                  </li>
                  <li>
                    <a
                      className="transition-colors hover:text-primary"
                      href="#pricing"
                    >
                      {t("footer_pricing")}
                    </a>
                  </li>
                </ul>
              </div>
            </div>

            <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-border/60 pt-6 text-sm text-muted-foreground md:flex-row">
              <p>
                © {new Date().getFullYear()} Clevio AI Staff. All rights
                reserved.
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
