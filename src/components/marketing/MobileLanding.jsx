"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { Menu, Send, BatteryMedium, Wifi, Signal, Check, MessageSquare, ShoppingCart, Headset, TrendingUp, Users, FileText, ArrowLeft, ArrowRight, Clock, Brain, ShieldCheck, Zap, Globe, User, Bot, Gift, Star, Rocket } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const HeaderClock = () => {
  const [time, setTime] = useState("");

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTime(now.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", hour12: false }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return <span>{time}</span>;
};

export default function MobileLanding() {
  const [status, setStatus] = useState("initial"); // initial, interviewing, finished
  const [isChatOpen, setIsChatOpen] = useState(false); // Controls chat expansion
  const [inputValue, setInputValue] = useState("");
  const [messages, setMessages] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);
  const resultRef = useRef(null);
  const inputRef = useRef(null); 
  const chatContainerRef = useRef(null); // Ref for message container
  const chatCardRef = useRef(null); // Ref for the main Chat Card wrapper

  const scrollToBottom = () => {
    if (chatContainerRef.current) {
        chatContainerRef.current.scrollTo({
            top: chatContainerRef.current.scrollHeight,
            behavior: "smooth"
        });
    }
  };

  useEffect(() => {
    if (isChatOpen) {
        // Use a small timeout to ensure DOM update before scrolling
        setTimeout(scrollToBottom, 100);
    }
  }, [messages, isTyping, isChatOpen]);

  // Keep focus on input when interviewing
  useEffect(() => {
    if (status === 'interviewing' && !isTyping) {
        setTimeout(() => {
             inputRef.current?.focus({ preventScroll: true }); 
             // We use preventScroll: true to stop the browser from jumping the whole page
             // The chat container scroll is handled by scrollToBottom separately
        }, 100);
    }
  }, [messages, status, isTyping]);

  // Auto-scroll to result when finished
  useEffect(() => {
    if (status === "finished") {
      setIsChatOpen(false); // Auto-minimize when done
      setTimeout(() => {
        resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 500);
    }
  }, [status]);

  const handleSend = () => {
    if (!inputValue.trim()) return;

    // Synchronous focus to force keyboard open on mobile
    inputRef.current?.focus();

    // Add user message
    const userMsg = { role: "user", text: inputValue };
    setMessages((prev) => [...prev, userMsg]);
    setInputValue("");
    setStatus("interviewing");
    setIsTyping(true);
    setIsChatOpen(true); // Ensure open on send

    // Force the view to scroll the Entire Chat Card to Center
    // This ensures "KEATAS" / "CHAT INPUT USER PERTAMA" behavior
    setTimeout(() => {
        chatCardRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 300); // 300ms delay for layout transition
    
    // Dummy Interview Logic
    setTimeout(() => {
      let aiResponseText = "";
      if (messages.length === 0) {
        aiResponseText = "Menarik! Apa detail tugas spesifik yang harus dilakukan oleh staf AI ini?";
      } else if (messages.length === 2) {
        aiResponseText = "Baik, saya mengerti kebutuhan Anda. Sistem kami sedang menyiapkan demo yang cocok.";
      } else {
        // Finish condition
        setIsTyping(false);
        setStatus("finished");
        return;
      }

      setMessages((prev) => [...prev, { role: "assistant", text: aiResponseText }]);
      setIsTyping(false);
    }, 1500); 
  };

  const handleInputFocus = () => {
      // Only expand on focus if we are already interviewing.
      // If initial, we keep it collapsed as a pill until they hit Send.
      if (status !== 'initial') {
        setIsChatOpen(true);
      }
  };
    
  const handleBackgroundClick = () => {
      if (status === 'interviewing' && isChatOpen) {
          setIsChatOpen(false);
      }
  };

  return (
    // Outer container
    <div className="flex min-h-[100dvh] w-full justify-center bg-black">
      
      {/* Mobile Frame Container */}
      <div className={`relative w-full max-w-[480px] bg-slate-900 font-sans shadow-2xl flex flex-col transition-all duration-500 min-h-[100dvh]`}>
        
        {/* Header */}
        <header className="absolute top-0 left-0 right-0 z-50 flex items-center justify-between px-6 pt-0 supports-[padding-top:env(safe-area-inset-top)]:pt-[env(safe-area-inset-top)]">
          <div className="relative h-20 w-20">
            <Image
              src="/clevioAISTAFF-Logo-White.png"
              alt="Clevio AI Staff"
              fill
              className="object-contain object-left"
              priority
            />
          </div>
          <button className="text-white hover:text-gray-200 transition-colors">
            <Menu className="h-8 w-8" />
          </button>
        </header>

        {/* Hero Background */}
        <div className="relative h-[100dvh] w-full shrink-0" onClick={handleBackgroundClick}>
            <div className="absolute inset-0 z-0">
            <Image
                src="/landing-page/top-image.png"
                alt="AI Staff Background"
                fill
                className="object-cover object-top"
                priority
            />
            {/* Overlay logic: Darken when chat is OPEN to focus attention, light otherwise */}
            <div className={`absolute inset-0 bg-gradient-to-b from-black/20 via-black/10 to-black/90 transition-opacity duration-500 ${isChatOpen ? 'opacity-0' : 'opacity-100'}`} />
            <div className={`absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-500 ${isChatOpen ? 'opacity-100' : 'opacity-0'}`} />
            </div>

            {/* Main Content Area */}
            <div className="relative z-10 flex h-full flex-col justify-end px-6 pb-6 supports-[padding-bottom:env(safe-area-inset-bottom)]:pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
            
            {/* Headline - Show if initial OR (interviewing AND minimized) */}
            <AnimatePresence>
                {(!isChatOpen || status === "initial") && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="space-y-1 mb-8 text-center text-[#FFFFFF] absolute bottom-32 left-0 right-0 px-6 pointer-events-none"
                >
                    <h1 className="text-2xl sm:text-3xl font-medium leading-tight drop-shadow-lg">
                    Jika Anda bisa mudah
                    </h1>
                    <h1 className="text-2xl sm:text-3xl font-medium leading-tight drop-shadow-lg">
                    membuat staf dari AI
                    </h1>
                    <h2 className="text-2xl sm:text-3xl font-extrabold uppercase tracking-wide drop-shadow-lg mt-2">
                    APA PERAN AI ANDA?
                    </h2>
                </motion.div>
                )}
            </AnimatePresence>

            {/* Chat Container */}
            <motion.div
                ref={chatCardRef}
                layout
                className={`relative w-full bg-white shadow-2xl overflow-hidden flex flex-col ${
                isChatOpen ? "rounded-t-3xl rounded-b-xl" : "rounded-full"
                }`}
                animate={{
                height: isChatOpen ? "65%" : "60px",
                }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside chat
            >
                {/* Chat Messages - Visible when Open */}
                <div 
                    ref={chatContainerRef}
                    className={`flex-1 overflow-y-auto p-4 space-y-4 scrollbar-hide ${!isChatOpen ? 'hidden' : ''}`}
                >
                    {messages.map((msg, idx) => (
                    <motion.div
                        key={idx}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                    >
                        <div
                        className={`max-w-[85%] px-4 py-2 rounded-2xl text-sm ${
                            msg.role === "user"
                            ? "bg-blue-600 text-white rounded-br-none"
                            : "bg-gray-100 text-gray-800 rounded-bl-none"
                        }`}
                        >
                        {msg.text}
                        </div>
                    </motion.div>
                    ))}
                    {isTyping && (
                    <div className="flex justify-start">
                        <div className="bg-gray-100 px-4 py-2 rounded-2xl rounded-bl-none">
                        <div className="flex space-x-1">
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-75" />
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-150" />
                        </div>
                        </div>
                    </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input Area or Finished State */}
                <div className={`relative flex items-center p-1.5 ${isChatOpen ? 'border-t border-gray-100 bg-white' : ''} shrink-0`}>
                    {status === 'finished' ? (
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="flex-1 flex items-center justify-between px-5 py-3 w-full bg-green-500 rounded-full"
                        >
                            <span className="text-white font-semibold text-base">Agent berhasil dibuat!</span>
                            <div className="bg-white/20 p-1 rounded-full">
                                <Check className="w-4 h-4 text-white" />
                            </div>
                        </motion.div>
                    ) : (
                        <>
                            <input
                                ref={inputRef}
                                type="text"
                                suppressHydrationWarning
                                value={inputValue}
                                onFocus={handleInputFocus}
                                onChange={(e) => setInputValue(e.target.value)}
                                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                                placeholder={status === "initial" ? "Ketik disini......" : "Tulis jawaban..."}
                                className="flex-1 px-5 py-3 text-gray-800 bg-transparent outline-none placeholder:text-gray-400 text-base min-w-0"
                            />
                            <button 
                                onClick={handleSend}
                                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-white hover:bg-blue-700 transition-transform active:scale-95 shadow-md"
                                style={{ backgroundColor: "#2563EB" }}
                                aria-label="Kirim"
                            >
                                <Send className="h-5 w-5 ml-0.5" />
                            </button>
                        </>
                    )}
                </div>
            </motion.div>
            </div>
        </div>
      
        {/* CSS Phone Result Section */}
        {status === "finished" && (
            <div ref={resultRef} className="relative w-full bg-white pb-20 pt-10 px-4 animate-in fade-in slide-in-from-bottom-20 duration-1000">
                
                {/* Professional Phone Component */}
                <div className="mx-auto w-full max-w-[340px] relative">
                    {/* Realistic Frame */}
                    <div className="relative bg-black rounded-[55px] p-3 shadow-2xl border-4 border-[#323232] ring-4 ring-gray-200/50">
                        {/* Side Buttons */}
                        <div className="absolute top-32 -left-2 w-1 h-8 bg-gray-800 rounded-l-md opacity-90"></div> {/* Vol Up */}
                        <div className="absolute top-44 -left-2 w-1 h-8 bg-gray-800 rounded-l-md opacity-90"></div> {/* Vol Down */}
                        <div className="absolute top-36 -right-2 w-1 h-12 bg-gray-800 rounded-r-md opacity-90"></div> {/* Power */}

                        {/* Screen Container */}
                        <div className="relative bg-white rounded-[45px] overflow-hidden h-full border border-gray-800/20">
                            
                            {/* Dynamic Island / Notch Area */}
                            <div className="absolute top-0 left-0 right-0 h-8 z-30 flex justify-center">
                                <div className="w-[120px] h-[28px] bg-black rounded-b-[18px] flex items-center justify-center">
                                    {/* Camera dot reflection hint */}
                                    <div className="w-16 h-2 bg-gray-800/50 rounded-full blur-[1px]"></div>
                                </div>
                            </div>

                            {/* Status Bar */}
                            <div className="flex justify-between items-center px-8 pt-3.5 pb-2 text-[10px] font-semibold text-gray-900 bg-white z-20 relative select-none">
                                <HeaderClock />
                                <div className="flex gap-1.5 opacity-80">
                                    <Signal className="w-3.5 h-3.5" />
                                    <Wifi className="w-3.5 h-3.5" />
                                    <BatteryMedium className="w-3.5 h-3.5" />
                                </div>
                            </div>

                            {/* App Header - Elegant */}
                            <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-50 bg-white/95 backdrop-blur-sm sticky top-0 z-10">
                                <div className="relative">
                                    <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-blue-100 to-indigo-50 flex items-center justify-center border border-blue-50">
                                        <span className="text-xl">🤖</span>
                                    </div>
                                    <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-bold text-base text-gray-900 leading-tight truncate">ralsi — asisten</h3>
                                    <p className="text-xs text-blue-600 font-medium">Online • Mengetik...</p>
                                </div>
                            </div>

                            {/* Chat Content Body - Elegant Spacing & Typography */}
                            <div className="bg-gray-50/50 h-[480px] p-5 space-y-4 overflow-y-auto font-sans">
                                <div className="text-xs text-center text-gray-400 mb-6 font-medium">Hari ini</div>
                                
                                <div className="flex justify-start">
                                    <div className="bg-white p-3.5 px-4 rounded-2xl rounded-tl-none shadow-[0_2px_8px_rgba(0,0,0,0.04)] text-[13px] leading-relaxed text-gray-700 border border-gray-100 max-w-[85%]">
                                        Halo James 👋, saya <span className="font-semibold text-blue-600">ralsi</span>. Saya siap membantu mengelola tugas harian bisnis Anda secara otomatis.
                                    </div>
                                </div>

                                <div className="flex justify-start">
                                    <div className="bg-white p-3.5 px-4 rounded-2xl rounded-tl-none shadow-[0_2px_8px_rgba(0,0,0,0.04)] text-[13px] leading-relaxed text-gray-700 border border-gray-100 max-w-[85%]">
                                        Dari <b>follow-up pelanggan</b>, <b>mencatat order</b>, sampai <b>menagih invoice</b>—semua bisa saya kerjakan 24/7 tanpa lelah.
                                    </div>
                                </div>

                                <div className="flex justify-start">
                                    <div className="bg-white p-3.5 px-4 rounded-2xl rounded-tl-none shadow-[0_2px_8px_rgba(0,0,0,0.04)] text-[13px] leading-relaxed text-gray-700 border border-gray-100 max-w-[85%]">
                                        Ada yang bisa saya bantu mulai sekarang?
                                    </div>
                                </div>
                            </div>

                            {/* Fake Input Footer - Minimalist */}
                            <div className="p-4 bg-white border-t border-gray-50 absolute bottom-0 left-0 right-0 z-20">
                                <div className="flex items-center gap-3 bg-gray-50/80 rounded-full px-5 py-3 border border-gray-100">
                                    <span className="text-gray-400 text-xs font-medium flex-1">Tulis pesan...</span>
                                    <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white shadow-md shadow-blue-200">
                                        <Send className="w-3.5 h-3.5 ml-0.5" />
                                    </div>
                                </div>
                                {/* Home Indicator */}
                                <div className="mx-auto w-32 h-1 bg-gray-300 rounded-full mt-5"></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        )}

        {/* Carousel Section - Always Rendered Below */}
        <CarouselSection />

        {/* How It Works Section */}
        <HowItWorksSection />

        {/* Features Section */}
        <FeatureSection />
      <TestimonialSection />
      <ComparisonSection />
      <PricingSection />
      <CTASection />
      <FooterSection />

      </div>
    </div>
  );
}

function HowItWorksSection() {
  const scrollRef = useRef(null);

  const scroll = (direction) => {
    if (scrollRef.current) {
        const { current } = scrollRef;
        const itemWidth = 270; // Card width + gap
        const currentScroll = current.scrollLeft;
        const index = Math.round(currentScroll / itemWidth);
        const targetScroll = direction === 'left' 
            ? Math.max(0, (index - 1) * itemWidth)
            : (index + 1) * itemWidth;
        
        current.scrollTo({ left: targetScroll, behavior: 'smooth' });
    }
  };

  const steps = [
    {
        title: "Daftar & Pilih Peran",
        desc: "Buat akun dan pilih peran Staff AI yang sesuai dengan kebutuhan bisnis Anda",
        color: "bg-[#FDF4C8]", // Cream
        cornerColor: "bg-[#C0A865]", // Dark Gold
        textColor: "text-[#5D4037]", // Dark Brown
        image: "/carousel-works/daftarDanPilihPeran.png"
    },
    {
        title: "Kustomisasi & Latih",
        desc: "Sesuaikan personality dan latih Staff AI dengan data bisnis Anda",
        color: "bg-[#7895A9]", // Slate Blue
        cornerColor: "bg-[#455A64]", // Dark Slate
        textColor: "text-[#263238]", // Dark Blue Gray
        image: "/carousel-works/kostumisasiDanLatih.png"
    },
    {
        title: "Aktifkan & Pantau",
        desc: "Aktifkan Staff AI Anda dan pantau performa secara real-time",
        color: "bg-[#FAD9D5]", // Pink
        cornerColor: "bg-[#A67C7C]", // Dark Pink
        textColor: "text-[#4E342E]", // Dark Red Brown
        image: "/carousel-works/aktifkanDanPantau.png"
    }
  ];

  return (
    <div className="w-full bg-white pb-20 pt-4 px-0 flex flex-col items-center">
        <div className="px-6 text-center mb-8">
            <h2 className="text-2xl font-bold text-[#1E3A8A] leading-tight mb-2">
                Cara Kerja Clevio
            </h2>
            <p className="text-black font-medium leading-snug">
                Mulai dengan Staf AI Anda <br/> dalam 3 langkah mudah
            </p>
        </div>

        {/* Carousel Container */}
        <div 
            ref={scrollRef}
            className="w-full flex overflow-x-auto gap-5 px-6 pb-6 snap-x snap-mandatory scrollbar-hide"
            style={{ msOverflowStyle: 'none', scrollbarWidth: 'none' }}
        >
            {steps.map((step, idx) => (
                <div 
                    key={idx}
                    className={`relative shrink-0 w-[280px] h-[380px] ${step.color} rounded-[2rem] flex flex-col snap-center overflow-hidden shadow-lg group`}
                >
                     {/* Top Half: Illustration Area */}
                     <div className="h-[55%] w-full relative flex items-center justify-center pt-4">
                        <div className="relative w-[250px] h-[250px]">
                            <Image 
                                src={step.image} 
                                alt={step.title}
                                fill
                                className="object-contain"
                            />
                        </div>
                     </div>

                     {/* Bottom Half: Text Content */}
                     <div className={`h-[45%] w-full px-6 pt-2 pb-6 flex flex-col ${step.textColor} relative z-10`}>
                        <h3 className="font-bold text-[22px] leading-tight mb-3">
                            {step.title}
                        </h3>
                        <p className="text-[14px] leading-snug opacity-90 font-medium">
                            {step.desc}
                        </p>
                     </div>

                     {/* Folded Corner Effect - 1:1 Match with Carousel Section */}
                     <div className="absolute bottom-0 right-0 w-[80px] h-[80px]">
                        {/* The Fold itself (Dark Shape)
                            - "Kiri atas lancip" -> Top-Left Sharp (rounded-tl-none)
                            - "Kanan bawah rounded" -> Bottom-Right Rounded (rounded-br-[2rem])
                        */}
                        <div className={`absolute bottom-0 right-0 w-[80px] h-[80px] ${step.cornerColor} rounded-br-[2rem] rounded-tl-none shadow-[-2px_-2px_10px_rgba(0,0,0,0.15)] z-20`}></div>
                        
                        {/* Masking the card corner behind isn't strictly necessary if the fold covers it,
                            but putting a container-bg colored block behind helps if there are gaps or for alpha blending.
                            Wait, the container BG here is WHITE (the section bg), NOT the card BG.
                            So we mask it with WHITE.
                        */}
                        <div className="absolute bottom-0 right-0 w-[80px] h-[80px] bg-white rounded-br-[2.5rem] z-10"></div>
                     </div>
                </div>
            ))}
             <div className="w-2 shrink-0"></div>
        </div>

         {/* Navigation Buttons - Right Aligned (Consistent with previous section) */}
         <div className="w-full flex justify-end gap-4 px-6 mt-4">
            <button 
                onClick={() => scroll('left')}
                className="w-12 h-12 bg-white rounded-full shadow-lg border border-gray-100 flex items-center justify-center text-gray-700 hover:bg-gray-50 active:scale-95 transition-all"
            >
                <ArrowLeft className="w-5 h-5" />
            </button>
            <button 
                onClick={() => scroll('right')}
                className="w-12 h-12 bg-white rounded-full shadow-lg border border-gray-100 flex items-center justify-center text-gray-700 hover:bg-gray-50 active:scale-95 transition-all"
            >
                <ArrowRight className="w-5 h-5" />
            </button>
        </div>
    </div>
  );
};

// Feature Section with 1:1 Visual Match
// Feature Section with Wooden Table Aesthetic
function FeatureSection() {
  const features = [
    {
      icon: <div className="w-10 h-10 bg-[#E3F2FD] rounded-xl flex items-center justify-center"><Clock className="w-6 h-6 text-[#1A237E] stroke-[2]" /></div>,
      title: "Tersedia 24/7",
      desc: "Staff AI Anda tidak pernah tidur dan siap melayani kapan saja"
    },
    {
      icon: <div className="w-10 h-10 bg-[#FFF9C4] rounded-xl flex items-center justify-center"><Brain className="w-6 h-6 text-[#1A237E] stroke-[2]" /></div>,
      title: "Pembelajaran Berkelanjutan",
      desc: "Semakin pintar seiring waktu dengan machine learning"
    },
    {
      icon: <div className="w-10 h-10 bg-[#E8F5E9] rounded-xl flex items-center justify-center"><TrendingUp className="w-6 h-6 text-[#1A237E] stroke-[2]" /></div>,
      title: "Analitik Real-time",
      desc: "Pantau performa dan dapatkan insights mendalam"
    },
    {
      icon: <div className="w-10 h-10 bg-[#E3F2FD] rounded-xl flex items-center justify-center"><ShieldCheck className="w-6 h-6 text-[#1A237E] stroke-[2]" /></div>,
      title: "Keamanan Terjamin",
      desc: "Data Anda dilindungi dengan enkripsi tingkat enterprise"
    },
    {
      icon: <div className="w-10 h-10 bg-[#FFF9C4] rounded-xl flex items-center justify-center"><Zap className="w-6 h-6 text-[#1A237E] stroke-[2]" /></div>,
      title: "Respons Instan",
      desc: "Jawab pertanyaan pelanggan dalam hitungan detik"
    },
    {
      icon: <div className="w-10 h-10 bg-[#E8F5E9] rounded-xl flex items-center justify-center"><Globe className="w-6 h-6 text-[#1A237E] stroke-[2]" /></div>,
      title: "Multi-bahasa",
      desc: "Berkomunikasi dalam berbagai bahasa dengan lancar"
    }
  ];

  return (
    // Wrap in bg-white to maintain page flow
    <div className="w-full bg-white pb-20 pt-8 px-6 flex flex-col items-center">
        {/* Wooden Table Container - Beige/Wood Color */}
        <div className="w-full bg-[#EBCFB2] rounded-[2.5rem] p-6 pb-8 flex flex-col items-center shadow-lg relative overflow-hidden">
            
            <h2 className="text-[28px] font-black text-[#4E342E] mb-6 text-center tracking-tight">
                Fitur Inovatif
            </h2>
            
            <div className="w-full flex flex-col gap-3.5">
                {features.map((feature, idx) => (
                    <div key={idx} className="w-full bg-white rounded-2xl p-5 flex flex-col items-start gap-3 shadow-[0_4px_10px_rgba(0,0,0,0.05)] border border-white/50">
                        <div className="shrink-0 mb-1">
                            {feature.icon}
                        </div>
                        <div>
                            <h3 className="text-[#1A237E] font-bold text-[17px] leading-tight mb-1.5">
                                {feature.title}
                            </h3>
                            <p className="text-gray-600 text-[13px] leading-[1.4] font-medium">
                                {feature.desc}
                            </p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    </div>
  );
}

function CarouselSection() {
  const scrollRef = useRef(null);

  const scroll = (direction) => {
    if (scrollRef.current) {
        const { current } = scrollRef;
        const itemWidth = 320; 
        const currentScroll = current.scrollLeft;
        const index = Math.round(currentScroll / itemWidth);
        
        let targetScroll;
        if (direction === 'left') {
            targetScroll = Math.max(0, (index - 1) * itemWidth);
        } else {
            targetScroll = (index + 1) * itemWidth;
        }

        current.scrollTo({ left: targetScroll, behavior: 'smooth' });
    }
  };

  const cards = [
    {
        icon: <MessageSquare className="w-6 h-6 text-black" />,
        title: "Customer Service",
        desc: "Layani pelanggan 24/7 dengan respons cepat dan akurat",
        bg: "bg-[#F2F2F2]", 
        foldColor: "bg-[#9E9E9E]",
        iconBg: "bg-white",
        text: "text-black"
    },
    {
        icon: <ShoppingCart className="w-6 h-6 text-black" />,
        title: "Sales Asistant",
        desc: "Tingkatkan penjualan dengan rekomendasi produk yang tepat",
        bg: "bg-[#90A4AE]", 
        foldColor: "bg-[#546E7A]",
        iconBg: "bg-white/30",
        text: "text-black"
    },
    {
        icon: <Headset className="w-6 h-6 text-black" />,
        title: "Support Agent",
        desc: "Berikan dukungan teknis yang efisien dan profesional",
        bg: "bg-[#FFF59D]", 
        foldColor: "bg-[#AFB42B]",
        iconBg: "bg-white/40",
        text: "text-black"
    },
    {
        icon: <TrendingUp className="w-6 h-6 text-black" />,
        title: "Marketing Assistant",
        desc: "Otomatisasi kampanye marketing dan analisis data",
        bg: "bg-[#A5D6A7]", 
        foldColor: "bg-[#558B2F]",
        iconBg: "bg-white/40",
        text: "text-black"
    },
    {
        icon: <Users className="w-6 h-6 text-black" />,
        title: "HR Assistant",
        desc: "Kelola rekrutmen dan onboarding karyawan dengan mudah",
        bg: "bg-[#F48FB1]", 
        foldColor: "bg-[#AD1457]",
        iconBg: "bg-white/40",
        text: "text-black"
    },
    {
        icon: <FileText className="w-6 h-6 text-black" />,
        title: "Admin Assistant",
        desc: "Atur jadwal, dokumen, dan tugas administratif lainnya",
        bg: "bg-[#FFCC80]", 
        foldColor: "bg-[#EF6C00]",
        iconBg: "bg-white/40",
        text: "text-black"
    }
  ];

  return (
    <div className="w-full bg-white pb-10 pt-10 px-4 flex justify-center">
        {/* Gray Rounded Container */}
        <div className="w-full bg-[#E5E7EB] rounded-[3rem] pt-12 pb-10 flex flex-col items-center relative overflow-hidden">
            
            <div className="px-6 text-center mb-10 w-full max-w-sm relative z-10">
                <h2 className="text-[24px] font-black text-black leading-tight mb-2">
                    Staf AI Apa Lagi Yang <br /> Bisa Anda Buat?
                </h2>
                <p className="text-black/70 text-[13px] font-medium leading-relaxed">
                    Banyak tugas yang bisa <br /> dibantu para staf AI Anda :
                </p>
            </div>

            {/* Carousel Container */}
            <div 
                ref={scrollRef}
                className="w-full flex overflow-x-auto gap-5 px-8 pb-12 snap-x snap-mandatory scrollbar-hide relative z-10 pl-8"
                style={{ msOverflowStyle: 'none', scrollbarWidth: 'none' }}
            >
                {cards.map((card, idx) => (
                    <div 
                        key={idx}
                        className={`relative shrink-0 w-[280px] h-[190px] ${card.bg} rounded-[2rem] p-6 flex flex-col snap-center shadow-lg`}
                    >
                        {/* Binder Holes */}
                        <div className="absolute top-4 left-1/2 -translate-x-1/2 flex gap-2 z-20">
                            <div className="w-3.5 h-3.5 bg-white rounded-full border-[1.5px] border-black/5 shadow-sm"></div>
                            <div className="w-3.5 h-3.5 bg-white rounded-full border-[1.5px] border-black/5 shadow-sm"></div>
                            <div className="w-3.5 h-3.5 bg-white rounded-full border-[1.5px] border-black/5 shadow-sm"></div>
                        </div>

                        <div className="flex flex-col gap-3 mt-5 relative z-10">
                            <div className={`w-12 h-12 ${card.iconBg} rounded-[1rem] flex items-center justify-center shadow-sm`}>
                                {card.icon}
                            </div>
                            <div>
                                <h3 className={`font-black text-[17px] mb-1 ${card.text} leading-tight`}>{card.title}</h3>
                                <p className={`text-[11px] font-semibold leading-snug w-[85%] ${card.text} opacity-70`}>
                                    {card.desc}
                                </p>
                            </div>
                        </div>

                        {/* Folded Corner Effect - Fixed Geometry */}
                         <div className="absolute bottom-0 right-0 w-[60px] h-[60px]">
                            {/* The Fold itself (Dark Shape)
                                - "Kiri atas lancip" -> Top-Left Sharp (rounded-tl-none)
                                - "Kanan bawah rounded" -> Bottom-Right Rounded (rounded-br-[2rem])
                                - Shape is a square patch that sits on the corner.
                            */}
                            <div className={`absolute bottom-0 right-0 w-[60px] h-[60px] ${card.foldColor} rounded-br-[2rem] rounded-tl-none shadow-[-2px_-2px_10px_rgba(0,0,0,0.1)] z-20`}></div>
                            
                            {/* Masking the card corner behind isn't strictly necessary if the fold covers it,
                                but putting a container-bg colored block behind helps if there are gaps or for alpha blending.
                            */}
                            <div className="absolute bottom-0 right-0 w-[60px] h-[60px] bg-[#E5E7EB] rounded-br-[3rem] z-10"></div>
                         </div>
                    </div>
                ))}
            </div>

            {/* Navigation Buttons - Right Aligned */}
            <div className="w-full flex justify-end gap-3 px-8 mt-[-10px] relative z-20">
                <button 
                    onClick={() => scroll('left')}
                    className="w-11 h-11 bg-white rounded-full shadow-md flex items-center justify-center text-black hover:bg-gray-50 active:scale-95 transition-all"
                >
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <button 
                    onClick={() => scroll('right')}
                    className="w-11 h-11 bg-white rounded-full shadow-md flex items-center justify-center text-black hover:bg-gray-50 active:scale-95 transition-all"
                >
                    <ArrowRight className="w-5 h-5" />
                </button>
            </div>
        </div>
    </div>
  );
}


// Testimonial Section with Wooden Frame Aesthetic
function TestimonialSection() {
    const scrollRef = useRef(null);

    const scroll = (direction) => {
        if (scrollRef.current) {
            const { current } = scrollRef;
            const itemWidth = 320; // Card width + gap
            const currentScroll = current.scrollLeft;
            const index = Math.round(currentScroll / itemWidth);
            
            let targetScroll;
            if (direction === 'left') {
                targetScroll = Math.max(0, (index - 1) * itemWidth);
            } else {
                targetScroll = (index + 1) * itemWidth;
            }
            current.scrollTo({ left: targetScroll, behavior: 'smooth' });
        }
    };

    const testimonials = [
        {
            name: "Dr. Kemal H.S. I Ist",
            image: "/testimoni/kemal-card.png"
        },
        {
            name: "Gatot Nuradi Sam",
            image: "/testimoni/gatot-card.png"
        },
        {
            name: "Sara Dhewanto",
            image: "/testimoni/sara-card.png"
        },
        {
            name: "Sinta Kaniawati",
            image: "/testimoni/sinta-card.png"
        }
    ];

    return (
        <div className="w-full bg-white pb-20 pt-10 flex flex-col items-center">
            <h2 className="text-[26px] font-bold text-black mb-10 text-center px-4">
                Ini Kata Mereka :
            </h2>

            <div 
                ref={scrollRef}
                className="w-full flex overflow-x-auto gap-6 px-8 pb-12 snap-x snap-mandatory scrollbar-hide"
                style={{ msOverflowStyle: 'none', scrollbarWidth: 'none' }}
            >
                {testimonials.map((item, idx) => (
                    <div 
                        key={idx}
                        className="relative shrink-0 w-[300px] h-[480px] snap-center"
                    >
                         <Image 
                            src={item.image} 
                            alt={item.name}
                            fill
                            className="object-contain"
                        />
                    </div>
                ))}
            </div>

            {/* Navigation Arrows */}
            <div className="w-full flex justify-end gap-4 px-6 mt-2">
                <button 
                    onClick={() => scroll('left')}
                    className="w-12 h-12 bg-white rounded-full shadow-lg border border-gray-100 flex items-center justify-center text-gray-700 hover:bg-gray-50 active:scale-95 transition-all"
                >
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <button 
                    onClick={() => scroll('right')}
                    className="w-12 h-12 bg-white rounded-full shadow-lg border border-gray-100 flex items-center justify-center text-gray-700 hover:bg-gray-50 active:scale-95 transition-all"
                >
                    <ArrowRight className="w-5 h-5" />
                </button>
            </div>
        </div>
    );
}

// Pricing Section: Wooden Board Aesthetic
function PricingSection() {
  const plans = [
    {
      name: "Gratis",
      desc: "Sempurna untuk mencoba Staff AI",
      features: [
        "1 Staff AI",
        "100 percakapan/bulan",
        "Fitur dasar",
        "Email support",
        "Dashboard analytics"
      ],
      cta: "Coba Gratis"
    },
    {
      name: "Pro",
      desc: "Untuk bisnis yang sedang berkembang",
      price: "Rp. 1.299.000",
      period: "/Bulan",
      features: [
        "5 Staff AI",
        "Unlimited percakapan",
        "Semua fitur premium",
        "Priority support 24/7",
        "Advanced analytics",
        "Custom branding",
        "API access"
      ],
      cta: "Coba Sekarang"
    },
    {
      name: "Enterprise",
      desc: "Solusi lengkap untuk perusahaan",
      customTitle: "Mari berdiskusi!", // Special emphasis
      features: [
        "Unlimited Staff AI",
        "Unlimited percakapan",
        "Semua fitur Pro",
        "Dedicated account manager",
        "Custom integration",
        "SLA guarantee",
        "Training & onboarding",
        "White-label solution"
      ],
      cta: "Coba Sekarang"
    }
  ];

  return (
    <div className="w-full bg-white pb-20 pt-10 flex flex-col items-center px-4">
        {/* Wooden Board Container */}
        <div className="w-full bg-[#EBCFB2] rounded-[3rem] p-6 pb-12 flex flex-col items-center shadow-md border border-[#D7B696]">
            <h2 className="text-[26px] font-black text-[#4E342E] text-center leading-tight mb-2 mt-4">
                Pilih Paket Anda
            </h2>
            <p className="text-[#795548] text-[13px] text-center mb-10 font-bold max-w-[80%] leading-relaxed">
                Lihat perbedaan signifikan antara <br /> Staf Biasa dan Staf AI
            </p>

            <div className="flex flex-col gap-6 w-full">
                {plans.map((plan, idx) => (
                    <div key={idx} className="relative w-full bg-white rounded-[2.5rem] p-8 pb-10 shadow-[0_4px_20px_rgba(0,0,0,0.08)] flex flex-col items-start border border-white/50">
                        
                        {/* Title Section */}
                        <h3 className="text-[#1565C0] font-bold text-[20px] mb-2 leading-tight">
                            {plan.name}
                        </h3>
                        <p className="text-gray-500 text-[13px] mb-6 leading-snug font-medium">
                            {plan.desc}
                        </p>

                        {/* Price Display */}
                        {plan.price && (
                            <div className="flex items-baseline gap-1 mb-6">
                                <span className="text-black font-black text-[28px] tracking-tight">{plan.price}</span>
                                <span className="text-gray-500 text-[12px] font-bold">{plan.period}</span>
                            </div>
                        )}

                        {/* Enterprise Custom Title */}
                        {plan.customTitle && (
                            <div className="mb-6">
                                <span className="text-black font-black text-[24px] tracking-tight leading-tight block">
                                    {plan.customTitle}
                                </span>
                            </div>
                        )}
                        
                        {/* Spacing for Gratis (if no price/customTitle) */}
                        {!plan.price && !plan.customTitle && (
                            <div className="mb-2"></div>
                        )}

                        {/* Features List */}
                        <div className="flex flex-col gap-3.5 mb-10 w-full">
                            {plan.features.map((feat, i) => (
                                <div key={i} className="flex items-start gap-3">
                                    <Check className="w-4 h-4 text-[#4CAF50] shrink-0 mt-0.5" strokeWidth={3} />
                                    <span className="text-gray-600 text-[13px] font-medium leading-tight">
                                        {feat}
                                    </span>
                                </div>
                            ))}
                        </div>

                        {/* 3D Pill Button */}
                        <button className="w-full py-3.5 bg-gradient-to-b from-white to-[#F0F0F0] text-black font-bold rounded-full text-[15px] shadow-[0_4px_6px_rgba(0,0,0,0.1),0_1px_3px_rgba(0,0,0,0.08),inset_0_-2px_4px_rgba(0,0,0,0.1)] border border-gray-100 hover:to-[#E0E0E0] active:scale-[0.98] active:shadow-inner transition-all mt-auto relative overflow-hidden group">
                           <span className="relative z-10">{plan.cta}</span>
                           <div className="absolute inset-0 bg-white/50 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        </button>
                    </div>
                ))}
            </div>
        </div>
    </div>
  );
}

// Comparison Section: 1:1 Match (Rounded Gray BG, Fixed Timeline)
function ComparisonSection() {
  const staffBiasa = [
    "Gaji bulanan + benefit + training",
    "Jam kerja terbatas (8 jam/hari)",
    "1 staf = 1 customer"
  ];

  const staffAI = [
    "Biaya langganan tetap, tanpa benefit & training",
    "Kerja 24/7 tanpa lembur & tanpa cuti",
    "1 Staf AI = ratusan customer sekaligus",
    "Tidak resign, tidak sakit, selalu ikut SOP",
    "Onboarding sangat cepat"
  ];

  return (
    <div className="w-full bg-white pb-10 pt-10 px-4">
        {/* Rounded Gray Container */}
        <div className="w-full bg-[#E5E5E5] rounded-[3rem] p-6 pb-12 flex flex-col items-center shadow-sm">
            <h2 className="text-[24px] font-black text-black text-center leading-tight mb-2 mt-4">
                Staf Biasa VS Staf AI
            </h2>
            <p className="text-gray-600 text-[13px] text-center mb-10 font-medium max-w-[90%] leading-relaxed">
                Lihat perbedaan signifikan antara <br /> Staf Biasa dan Staf AI
            </p>

            <div className="flex flex-col gap-6 w-full">
                {/* Staf Biasa Card (White) */}
                <div className="w-full bg-white rounded-[2.5rem] p-8 pb-12 shadow-sm relative flex flex-col items-center">
                    
                    {/* Header Pill */}
                    <div className="bg-white border border-gray-200/50 rounded-full py-3 px-8 flex items-center gap-3 shadow-[0_4px_10px_rgba(0,0,0,0.05)] mb-10 min-w-[200px] justify-center relative z-10">
                        <User className="w-6 h-6 text-black" strokeWidth={2.5} />
                        <span className="font-black text-[18px] text-black tracking-wide">Staf Biasa</span>
                    </div>

                    {/* Timeline List */}
                    <div className="relative w-full">
                        {/* Vertical Line Container - Absolute to match height */}
                        <div className="absolute left-[9px] top-2 bottom-6 w-[2px] bg-black rounded-full z-0"></div>

                        <div className="flex flex-col gap-7 z-10 relative">
                            {staffBiasa.map((item, idx) => (
                                <div key={idx} className="flex items-start gap-4">
                                    {/* Dot Column - Centered on line */}
                                    <div className="shrink-0 w-[20px] h-[20px] flex items-center justify-center">
                                        <div className="w-4 h-4 bg-black rounded-full border-[3px] border-white z-10 box-content shadow-sm"></div>
                                    </div>
                                    <span className="text-black font-bold text-[14px] leading-snug tracking-wide pt-0.5">
                                        {item}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Staf AI Card (Slate Blue) */}
                <div className="w-full bg-[#6B8594] rounded-[2.5rem] p-8 pb-12 shadow-lg relative flex flex-col items-center border-[4px] border-white">
                    
                    {/* Header Pill (Glow Effect) */}
                    <div className="bg-white rounded-full py-3 px-8 flex items-center gap-3 shadow-[0_0_20px_rgba(255,255,255,0.4)] mb-10 min-w-[200px] justify-center relative z-10">
                        <Bot className="w-7 h-7 text-[#6B8594]" strokeWidth={2.5} />
                        <span className="font-black text-[18px] text-[#6B8594] tracking-wide">Staf AI</span>
                    </div>

                    {/* Timeline List */}
                    <div className="relative w-full">
                         {/* Vertical Line Container */}
                         <div className="absolute left-[9px] top-2 bottom-4 w-[2px] bg-white/60 rounded-full z-0"></div>

                        <div className="flex flex-col gap-6 z-10 relative">
                            {staffAI.map((item, idx) => (
                                <div key={idx} className="flex items-start gap-4">
                                    {/* Dot Column */}
                                    <div className="shrink-0 w-[20px] h-[20px] flex items-center justify-center">
                                        <div className="w-3.5 h-3.5 bg-white rounded-full z-10 shadow-sm"></div>
                                    </div>
                                    <span className="text-white font-bold text-[14px] leading-snug tracking-wide pt-0.5 text-shadow-sm">
                                        {item}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
  );
}

function CTASection() {
  return (
    <div className="w-full bg-white pb-32 pt-10 px-4 flex justify-center">
        <div className="w-full bg-[#1A45D0] rounded-[2.5rem] p-8 pb-10 shadow-[0_15px_40px_-10px_rgba(59,102,245,0.6)] relative overflow-hidden flex flex-col items-center text-center">
            
            {/* Background Decorations */}
            <div className="absolute -top-10 -left-10 w-40 h-40 bg-white/5 rounded-[2rem] transform rotate-12"></div>
            <div className="absolute top-20 -right-10 w-32 h-32 bg-white/5 rounded-[2rem] transform -rotate-12"></div>
            <div className="absolute bottom-[-50px] left-[20%] w-60 h-60 bg-white/5 rounded-[3rem] transform rotate-6"></div>

            <h2 className="text-[28px] font-bold text-white mb-3 mt-4 relative z-10 leading-tight">
                Bangun tim Staff AI <br /> Anda
            </h2>
            
            <p className="text-blue-100 text-[14px] leading-relaxed mb-8 max-w-[90%] relative z-10 font-medium">
                Mulai transformasi digital bisnis Anda hari ini. Gratis untuk memulai, tidak perlu kartu kredit.
            </p>

            <button className="bg-white text-[#1A45D0] font-bold text-[16px] py-3.5 px-10 rounded-2xl shadow-lg hover:bg-gray-50 active:scale-95 transition-all relative z-10 mb-8 w-full max-w-[280px]">
                Mulai Gratis
            </button>

            <p className="text-blue-200/80 text-[11px] font-medium relative z-10">
                Tidak perlu kartu kredit • Setup dalam 5 menit • Cancel kapan saja
            </p>
        </div>
    </div>
  );
}

function FooterSection() {
  const links = {
    produk: ["Fitur", "Harga", "Integrasi", "API"],
    perusahaan: ["Tentang Kami", "Blog", "Karir", "Kontak"],
    legal: ["Privasi", "Syarat & Ketentuan", "Keamanan"]
  };

  return (
    <div className="w-full bg-[#1A237E] text-white pt-16 pb-8 px-8 rounded-t-[2.5rem] mt-[-60px] relative z-0">
        <div className="flex flex-col gap-8 mb-12">
            {/* Brand */}
            <div>
                <div className="relative w-[160px] h-[50px] mb-3">
                    <Image 
                        src="/clevioAISTAFF-Logo-White.png" 
                        alt="Clevio AI Staff Output"
                        fill
                        className="object-contain object-left"
                    />
                </div>
                <p className="text-white/70 text-[13px] font-medium leading-relaxed whitespace-nowrap">
                    Solusi Staff AI terdepan untuk bisnis modern
                </p>
            </div>

            {/* Links Grid */}
            <div className="grid grid-cols-2 gap-y-8 gap-x-4">
                {/* Produk */}
                <div>
                    <h4 className="font-bold text-[15px] mb-4">Produk</h4>
                    <ul className="flex flex-col gap-3">
                        {links.produk.map((item, i) => (
                            <li key={i} className="text-white/70 text-[13px] font-medium hover:text-white transition-colors cursor-pointer">{item}</li>
                        ))}
                    </ul>
                </div>

                {/* Perusahaan */}
                <div>
                    <h4 className="font-bold text-[15px] mb-4">Perusahaan</h4>
                    <ul className="flex flex-col gap-3">
                        {links.perusahaan.map((item, i) => (
                            <li key={i} className="text-white/70 text-[13px] font-medium hover:text-white transition-colors cursor-pointer">{item}</li>
                        ))}
                    </ul>
                </div>

                {/* Legal */}
                <div className="col-span-2 mt-2">
                    <h4 className="font-bold text-[15px] mb-4">Legal</h4>
                    <ul className="flex flex-col gap-3">
                        {links.legal.map((item, i) => (
                            <li key={i} className="text-white/70 text-[13px] font-medium hover:text-white transition-colors cursor-pointer">{item}</li>
                        ))}
                    </ul>
                </div>
            </div>
        </div>

        {/* Divider & Copyright */}
        <div className="w-full h-[1px] bg-white/10 mb-6"></div>
        <p className="text-center text-white/40 text-[11px] font-medium">
            © 2025 Clevio AI Staff. All rights reserved.
        </p>
    </div>
  );
}