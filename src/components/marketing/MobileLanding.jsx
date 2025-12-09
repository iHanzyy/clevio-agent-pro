"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { Menu, Send, BatteryMedium, Wifi, Signal, Check, MessageSquare, ShoppingCart, Headset, TrendingUp, Users, FileText, ArrowLeft, ArrowRight, Clock, Brain, ShieldCheck, Zap, Globe } from "lucide-react";
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
        color: "bg-[#FF4D4D]", 
        cornerColor: "bg-[#B71C1C]",
        image: "/carousel-works/daftarDanPilihPeran.png"
    },
    {
        title: "Kustomisasi & Latih",
        desc: "Sesuaikan personality dan latih Staff AI dengan data bisnis Anda",
        color: "bg-[#4466FF]", 
        cornerColor: "bg-[#1A237E]",
        image: "/carousel-works/kostumisasiDanLatih.png"
    },
    {
        title: "Aktifkan & Pantau",
        desc: "Aktifkan Staff AI Anda dan pantau performa secara real-time",
        color: "bg-[#E040FB]",
        cornerColor: "bg-[#880E4F]",
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
                    className={`relative shrink-0 w-[280px] h-[380px] ${step.color} rounded-[2rem] flex flex-col snap-center overflow-hidden group`}
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
                     <div className="h-[45%] w-full px-6 pt-2 pb-6 flex flex-col text-white relative z-10">
                        <h3 className="font-bold text-[22px] leading-tight mb-3">
                            {step.title}
                        </h3>
                        <p className="text-[14px] leading-snug opacity-95">
                            {step.desc}
                        </p>
                     </div>

                     {/* Folded Corner Effect - MATCHING CAROUSEL SECTION EXACTLY */}
                     {/* Using the linear gradient trick to imply a folded page/shadow */}
                     <div 
                        className="absolute bottom-0 right-0 w-[80px] h-[80px]"
                        style={{
                            background: 'linear-gradient(to top left, transparent 50%, rgba(0,0,0,0.2) 0)'
                        }}
                     ></div>
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
function FeatureSection() {
  const features = [
    {
      icon: <div className="w-10 h-10 bg-[#E3F2FD] rounded-xl flex items-center justify-center"><Clock className="w-6 h-6 text-[#1565C0] stroke-[2]" /></div>,
      title: "Tersedia 24/7",
      desc: "Staff AI Anda tidak pernah tidur dan siap melayani kapan saja"
    },
    {
      icon: <div className="w-10 h-10 bg-[#FFF9C4] rounded-xl flex items-center justify-center"><Brain className="w-6 h-6 text-[#1565C0] stroke-[2]" /></div>,
      title: "Pembelajaran Berkelanjutan",
      desc: "Semakin pintar seiring waktu dengan machine learning"
    },
    {
      icon: <div className="w-10 h-10 bg-[#E8F5E9] rounded-xl flex items-center justify-center"><TrendingUp className="w-6 h-6 text-[#1565C0] stroke-[2]" /></div>,
      title: "Analitik Real-time",
      desc: "Pantau performa dan dapatkan insights mendalam"
    },
    {
      icon: <div className="w-10 h-10 bg-[#E3F2FD] rounded-xl flex items-center justify-center"><ShieldCheck className="w-6 h-6 text-[#1565C0] stroke-[2]" /></div>,
      title: "Keamanan Terjamin",
      desc: "Data Anda dilindungi dengan enkripsi tingkat enterprise"
    },
    {
      icon: <div className="w-10 h-10 bg-[#FFF9C4] rounded-xl flex items-center justify-center"><Zap className="w-6 h-6 text-[#1565C0] stroke-[2]" /></div>,
      title: "Respons Instan",
      desc: "Jawab pertanyaan pelanggan dalam hitungan detik"
    },
    {
      icon: <div className="w-10 h-10 bg-[#E8F5E9] rounded-xl flex items-center justify-center"><Globe className="w-6 h-6 text-[#1565C0] stroke-[2]" /></div>,
      title: "Multi-bahasa",
      desc: "Berkomunikasi dalam berbagai bahasa dengan lancar"
    }
  ];

  return (
    // Wrap in bg-white to maintain page flow
    <div className="w-full bg-white pb-20 pt-8 px-6 flex flex-col items-center">
        {/* Blue Card Container */}
        <div className="w-full bg-gradient-to-b from-[#426EFF] to-[#3B66F5] rounded-[2.5rem] p-6 pb-8 flex flex-col items-center shadow-xl shadow-blue-200/50 relative overflow-hidden">
            {/* Glow effect at top */}
            <div className="absolute top-0 left-0 right-0 h-32 bg-white/10 blur-3xl rounded-full -translate-y-16 pointer-events-none"></div>

            <h2 className="text-[26px] font-bold text-white mb-6 text-center drop-shadow-sm">
                Fitur Unggulan
            </h2>
            
            <div className="w-full flex flex-col gap-3.5">
                {features.map((feature, idx) => (
                    <div key={idx} className="w-full bg-white rounded-2xl p-5 flex flex-col items-start gap-3 shadow-[0_4px_12px_rgba(0,0,0,0.08)] ring-1 ring-black/5">
                        <div className="shrink-0 mb-1">
                            {feature.icon}
                        </div>
                        <div>
                            <h3 className="text-[#1565C0] font-bold text-[16px] leading-tight mb-1.5">
                                {feature.title}
                            </h3>
                            <p className="text-gray-500 text-[13px] leading-[1.4] font-medium">
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
        const itemWidth = 296; // 280px width + 16px gap
        // Calculate current "index" based on scroll position
        const currentScroll = current.scrollLeft;
        const index = Math.round(currentScroll / itemWidth);
        
        // Determine target scroll position
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
        icon: <MessageSquare className="w-6 h-6 text-white" />,
        title: "Customer Service",
        desc: "Layani pelanggan 24/7 dengan respons cepat dan akurat",
        color: "bg-[#4A90E2]", // Blue
        cornerColor: "border-[#215fa8]",
        iconBg: "bg-white/20"
    },
    {
        icon: <ShoppingCart className="w-6 h-6 text-white" />,
        title: "Sales Asistant",
        desc: "Tingkatkan penjualan dengan rekomendasi produk yang tepat",
        color: "bg-[#EE5253]", // Red
        cornerColor: "border-[#b33939]",
        iconBg: "bg-white/20"
    },
    {
        icon: <Headset className="w-6 h-6 text-[#9a7d0a]" />,
        title: "Support Agent",
        desc: "Berikan dukungan teknis yang efisien dan profesional",
        color: "bg-[#F4D03F]", // Yellow warning text needs contrast? keeping white on yellow might be hard? user image shows white text.
        // Actually user image yellow card has white text? Let me check.
        // Image shows white text on yellow card. Okay.
        cornerColor: "border-[#d4ac0d]",
        iconBg: "bg-white/40",
        textColor: "text-white"
    },
    {
        icon: <TrendingUp className="w-6 h-6 text-white" />,
        title: "Marketing Assistant",
        desc: "Otomatisasi kampanye marketing dan analisis data",
        color: "bg-[#58D68D]", // Green
        cornerColor: "border-[#28b463]",
        iconBg: "bg-white/20"
    },
    {
        icon: <Users className="w-6 h-6 text-white" />,
        title: "HR Assistant",
        desc: "Kelola rekrutmen dan onboarding karyawan dengan mudah",
        color: "bg-[#F368E0]", // Pink
        cornerColor: "border-[#c0392b]", // Darker pink/red
        iconBg: "bg-white/20"
    },
    {
        icon: <FileText className="w-6 h-6 text-white" />,
        title: "Admin Assistant",
        desc: "Atur jadwal, dokumen, dan tugas administratif lainnya",
        color: "bg-[#FF6B6B]", // Light Red/Rose
        cornerColor: "border-[#c0392b]",
        iconBg: "bg-white/20"
    }
  ];

  return (
    <div className="w-full bg-white pb-20 pt-15 px-0 flex flex-col items-center">
        <div className="px-6 text-center mb-8">
            <h2 className="text-2xl font-bold text-blue-900 leading-tight">
                Staf AI Apa Lagi Yang <br /> Bisa Anda Buat?
            </h2>
            <p className="text-gray-600 mt-2 text-sm">
                Banyak tugas yang bisa dibantu para staf AI Anda :
            </p>
        </div>

        {/* Carousel Container */}
        <div 
            ref={scrollRef}
            className="w-full flex overflow-x-auto gap-4 px-6 pb-8 snap-x snap-mandatory scrollbar-hide"
            style={{ msOverflowStyle: 'none', scrollbarWidth: 'none' }}
        >
            {cards.map((card, idx) => (
                <div 
                    key={idx}
                    className={`relative shrink-0 w-[280px] h-[180px] ${card.color} rounded-2xl p-5 flex flex-col justify-between snap-center shadow-lg group overflow-hidden`}
                >
                     {/* 3 Dots */}
                     <div className="absolute top-3 left-1/2 -translate-x-1/2 flex space-x-2">
                        <div className="w-2.5 h-2.5 bg-white rounded-full opacity-90 shadow-sm"></div>
                        <div className="w-2.5 h-2.5 bg-white rounded-full opacity-90 shadow-sm"></div>
                        <div className="w-2.5 h-2.5 bg-white rounded-full opacity-90 shadow-sm"></div>
                     </div>

                     {/* Folded Corner Effect via Border Trick */}
                     <div className={`absolute bottom-0 right-0 w-0 h-0 border-b-[40px] border-l-[40px] border-b-white/40 border-l-transparent pointer-events-none transform rotate-0`}></div>
                     {/* We can use a different trick for the dark fold look.
                         User image has a dark triangle at the bottom right.
                         It looks like the corner is folded UP revealing a darker back, 
                         OR it's just a dark triangle decoration.
                         The image shows a dark triangular area on the bottom right corner.
                     */}
                     <div 
                        className="absolute bottom-0 right-0 w-[60px] h-[60px] bg-red-800"
                        style={{
                            background: 'linear-gradient(to top left, transparent 50%, rgba(0,0,0,0.3) 0)'
                        }}
                     ></div>
                     
                     {/* Actual Folded Corner HTML/CSS for strict 1:1 match with provided image needed.
                        In the image, it looks like a dark triangle on the bottom right. 
                        Let's use a solid dark color triangle.
                     */}
                     <div 
                        className={`absolute -bottom-1 -right-1 w-12 h-12 ${card.cornerColor ? card.cornerColor.replace('border-', 'bg-') : 'bg-black/30'} rounded-tl-xl z-20`}
                        style={{
                            clipPath: 'polygon(100% 0, 0% 100%, 100% 100%)' // Bottom right triangle
                        }}
                     ></div>
                      {/* Wait, the "Sticker" look usually is the page curling up.
                          The image shows a dark triangle at the bottom right corner.
                          It seems like the corner is "cut" or "folded". 
                          Based on user image: there is a dark triangle at the bottom right.
                          I will simulate this with a dark triangle.
                      */}

                     {/* Icon & Content */}
                     <div className="relative z-10">
                        <div className={`w-12 h-12 rounded-2xl ${card.iconBg} flex items-center justify-center mb-3 shadow-inner`}>
                            {card.icon}
                        </div>
                        <h3 className={`font-bold text-lg leading-none mb-1 text-white`}>{card.title}</h3>
                     </div>
                     <p className="relative z-10 text-[11px] leading-snug text-white/90 font-medium pr-6">
                        {card.desc}
                     </p>
                </div>
            ))}
             {/* Padding right to allow last card to be fully seen centrally if needed */}
             <div className="w-2 shrink-0"></div>
        </div>

        {/* Navigation Buttons - Right Aligned */}
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
};

function TestimonialSection() {
    const scrollRef = useRef(null);

    const scroll = (direction) => {
        if (scrollRef.current) {
            const { current } = scrollRef;
            const itemWidth = 320; // 300px width + 20px gap
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
            role: "Konsultan Manajemen Governance, Risk and Compliance",
            quote: "“Clevio menawarkan Kursus AI untuk Profesional, dirancang untuk meningkatkan kompetensi, produktivitas, dan efektivitas kerja Anda dengan dukungan analisis data yang kuat.”",
            image: "/testimoni/pakKemal.png"
        },
        {
            name: "Gatot Nuradi Sam",
            role: "Executive Director Bina Antarbudaya",
            quote: "“Kelemahan kita selalu di data dan managing information. AI bisa membantu meng-cluster informasi seperti relawan dan sponsor, lalu menunjukkan mana yang paling potensial untuk kita tindak lanjuti.”",
            image: "/testimoni/pakKemal.png"
        },
        {
            name: "Sara Dhewanto",
            role: "Impact Incubator",
            quote: "“Saya memakai staf AI untuk membantu pekerjaan saya agar tugas-tugas rutin bisa selesai lebih cepat dan akurat.”",
            image: "/testimoni/pakKemal.png"
        },
        {
            name: "Sinta Kaniawati",
            role: "Ketua Dewan Pengurus Bina Antarbudaya",
            quote: "“AI itu membantu, tapi keseimbangan manusia tetap penting. Tantangannya adalah bagaimana kita menggunakan AI dengan bijak agar tidak kehilangan nilai manusiawi.”",
            image: "/testimoni/pakKemal.png"
        }
    ];

    return (
        <div className="w-full bg-white pb-20 pt-10 flex flex-col items-center">
            <h2 className="text-[26px] font-bold text-[#1E3A8A] mb-8 text-center px-4">
                Ini Kata Mereka :
            </h2>

            <div 
                ref={scrollRef}
                className="w-full flex overflow-x-auto gap-5 px-6 pb-12 snap-x snap-mandatory scrollbar-hide"
                style={{ msOverflowStyle: 'none', scrollbarWidth: 'none' }}
            >
                {testimonials.map((item, idx) => (
                    <div 
                        key={idx}
                        className="relative shrink-0 w-[300px] h-[450px] bg-[#3B66F5] rounded-[2.5rem] p-8 flex flex-col justify-between snap-center shadow-[0_10px_30px_-10px_rgba(59,102,245,0.5)] overflow-hidden"
                    >
                         {/* Content */}
                         <div className="relative z-10">
                            <h3 className="text-white text-[19px] font-bold leading-tight mb-1">
                                {item.name}
                            </h3>
                            <p className="text-white/80 text-[11px] font-medium leading-snug mb-6 max-w-[90%]">
                                {item.role}
                            </p>
                            <p className="text-white text-[14px] leading-relaxed tracking-wide font-medium">
                                {item.quote}
                            </p>
                         </div>

                         {/* Image at bottom */}
                         <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[220px] h-[220px] flex items-end justify-center">
                            <div className="w-full h-full relative">
                                <Image 
                                    src={item.image} 
                                    alt={item.name}
                                    fill
                                    className="object-contain object-bottom"
                                />
                            </div>
                         </div>
                    </div>
                ))}
            </div>

            {/* Navigation Arrows */}
            <div className="w-full flex justify-end gap-4 px-6 mt-2">
                <button 
                    onClick={() => scroll('left')}
                    className="w-12 h-12 bg-white rounded-full shadow-lg flex items-center justify-center text-gray-700 hover:bg-gray-50 active:scale-95 transition-all"
                >
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <button 
                    onClick={() => scroll('right')}
                    className="w-12 h-12 bg-white rounded-full shadow-lg flex items-center justify-center text-gray-700 hover:bg-gray-50 active:scale-95 transition-all"
                >
                    <ArrowRight className="w-5 h-5" />
                </button>
            </div>
        </div>
    );
}