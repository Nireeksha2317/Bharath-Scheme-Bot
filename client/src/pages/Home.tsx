import { useState, useRef, useEffect } from "react";
import { useChat } from "@/hooks/use-schemes";
import { useSpeech } from "@/hooks/use-speech";
import { LanguageSelector } from "@/components/LanguageSelector";
import { Navigation } from "@/components/Navigation";
import { SchemeCard } from "@/components/SchemeCard";
import { type Scheme } from "@shared/routes";
import { Send, Bot, User, Sparkles, Loader2, BadgeIndianRupee, Mic, Volume2, VolumeX, UserCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import clsx from "clsx";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { EligibilityWizard } from "@/components/EligibilityWizard";
import { useProfile } from "@/hooks/use-profile";

interface Message {
  id: string;
  role: "user" | "bot";
  content: string;
  schemes?: Scheme[];
  suggestions?: string[];
  timestamp: Date;
}

const UI_LABELS: Record<string, { welcome: string; subtitle: string; placeholder: string; send: string; suggestions: string }> = {
  en: { welcome: "Bharat Scheme Bot", subtitle: "Find the right government schemes for you", placeholder: "Ask about schemes (e.g., 'scholarships for students')...", send: "Send", suggestions: "Try asking about:" },
  hi: { welcome: "भारत योजना बॉट", subtitle: "अपने लिए सही सरकारी योजनाएं खोजें", placeholder: "योजनाओं के बारे में पूछें (जैसे 'छात्रों के लिए छात्रवृत्ति')...", send: "भेजें", suggestions: "इसके बारे में पूछें:" },
  kn: { welcome: "ಭಾರತ ಯೋಜನೆ ಬೋಟ್", subtitle: "ನಿಮಗಾಗಿ ಸರಿಯಾದ ಸರ್ಕಾರಿ ಯೋಜನೆಗಳನ್ನು ಹುಡುಕಿ", placeholder: "ಯೋಜನೆಗಳ ಬಗ್ಗೆ ಕೇಳಿ (ಉದಾ. 'ವಿದ್ಯಾರ್ಥಿಗಳಿಗೆ ವಿದ್ಯಾರ್ಥಿವೇತನ')...", send: "ಕಳುಹಿಸಿ", suggestions: "ಇದರ ಬಗ್ಗೆ ಕೇಳಿ:" },
  ta: { welcome: "பாரத் திட்ட போட்", subtitle: "உங்களுக்கான சரியான அரசாங்கத் திட்டங்களைக் கண்டறியவும்", placeholder: "திட்டங்கள் பற்றி கேட்கவும்...", send: "அனுப்பு", suggestions: "இதைப் பற்றி கேட்கவும்:" },
  te: { welcome: "భారత్ స్కీమ్ బాట్", subtitle: "మీ కోసం సరైన ప్రభుత్వ పథకాలను కనుగొనండి", placeholder: "పథకాల గురించి అడగండి...", send: "పంపించు", suggestions: "దీని గురించి అడగండి:" },
};

export default function Home() {
  const [language, setLanguage] = useState("en");
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { mutate: sendMessage, isPending } = useChat();
  const { isListening, listen, speak, voiceEnabled, setVoiceEnabled } = useSpeech(language);
  const { profile } = useProfile();

  const labels = UI_LABELS[language] || UI_LABELS["en"];

  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isPending]);

  const handleSend = (text: string = input) => {
    if (!text.trim() || isPending) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      content: text,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMsg]);
    setInput("");

    sendMessage(
      { message: text, language },
      {
        onSuccess: (data) => {
          const botMsg: Message = {
            id: (Date.now() + 1).toString(),
            role: "bot",
            content: data.response,
            schemes: data.schemes,
            suggestions: data.suggestedQuestions,
            timestamp: new Date(),
          };
          setMessages(prev => [...prev, botMsg]);
          speak(data.response);
        },
        onError: () => {
          const errorMsg: Message = {
            id: (Date.now() + 1).toString(),
            role: "bot",
            content: "Sorry, I encountered an error. Please try again.",
            timestamp: new Date(),
          };
          setMessages(prev => [...prev, errorMsg]);
        }
      }
    );
  };

  const SUGGESTIONS = [
    "Student scholarships",
    "Farmer loans",
    "Women empowerment",
    "Healthcare schemes",
  ];

  return (
    <div className="flex flex-col h-screen bg-gray-50/50">
      {/* Header */}
      <header className="bg-white border-b border-border sticky top-0 z-30 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 via-white to-green-500 p-[2px] shadow-sm">
              <div className="w-full h-full rounded-full bg-white flex items-center justify-center">
                 <span className="text-xl">🇮🇳</span>
              </div>
            </div>
            <div>
              <h1 className="font-display font-bold text-lg leading-tight text-foreground">
                Bharat Bot
              </h1>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-xs font-medium text-muted-foreground">Online</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Dialog open={isProfileOpen} onOpenChange={setIsProfileOpen}>
              <DialogTrigger asChild>
                <button
                  className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors font-medium text-sm"
                  title="Update Profile for Better Recommendations"
                >
                  <UserCircle className="w-5 h-5" />
                  <span className="hidden md:inline">
                    {profile?.age ? "My Profile" : "Set Profile"}
                  </span>
                </button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl p-0 bg-transparent border-none shadow-none">
                <EligibilityWizard onComplete={() => setIsProfileOpen(false)} />
              </DialogContent>
            </Dialog>

            <div className="hidden md:block">
              <Navigation />
            </div>
            <div className="h-6 w-px bg-border mx-2 hidden md:block" />
            <button
              onClick={() => setVoiceEnabled(!voiceEnabled)}
              className="p-2 rounded-full hover:bg-gray-100 transition-colors"
              title={voiceEnabled ? "Disable Voice Output" : "Enable Voice Output"}
            >
              {voiceEnabled ? <Volume2 className="w-5 h-5 text-primary" /> : <VolumeX className="w-5 h-5 text-muted-foreground" />}
            </button>
            <LanguageSelector currentLang={language} onLanguageChange={setLanguage} />
          </div>
        </div>
      </header>

      {/* Chat Area */}
      <main className="flex-1 overflow-hidden relative max-w-4xl mx-auto w-full flex flex-col">
        <div 
          ref={scrollRef}
          className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 scroll-smooth pb-24 md:pb-6"
        >
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-8 min-h-[50vh]">
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.5 }}
                className="bg-white p-8 rounded-3xl shadow-xl shadow-black/5 border border-border/50 max-w-md"
              >
                <div className="w-20 h-20 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-6 text-4xl">
                  👋
                </div>
                <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3 font-display">
                  {labels.welcome}
                </h2>
                <p className="text-muted-foreground text-lg mb-8 leading-relaxed">
                  {labels.subtitle}
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      onClick={() => handleSend(s)}
                      className="px-4 py-3 bg-secondary/50 hover:bg-secondary text-secondary-foreground text-sm font-semibold rounded-xl transition-all duration-200 hover:-translate-y-0.5 text-left flex items-center gap-2"
                    >
                      <Sparkles className="w-4 h-4 opacity-70" />
                      {s}
                    </button>
                  ))}
                </div>
              </motion.div>
            </div>
          ) : (
            <div className="space-y-6">
              {messages.map((msg) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={clsx(
                    "flex gap-3 md:gap-4 max-w-3xl",
                    msg.role === "user" ? "ml-auto flex-row-reverse" : "mr-auto"
                  )}
                >
                  <div className={clsx(
                    "w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center shrink-0 shadow-sm",
                    msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-white border border-border text-foreground"
                  )}>
                    {msg.role === "user" ? <User className="w-5 h-5" /> : <Bot className="w-5 h-5" />}
                  </div>
                  
                  <div className={clsx(
                    "space-y-2 max-w-[85%] md:max-w-[75%]",
                    msg.role === "user" ? "items-end flex flex-col" : "items-start"
                  )}>
                    <div className={clsx(
                      "px-5 py-3.5 rounded-2xl text-base leading-relaxed shadow-sm relative group",
                      msg.role === "user" 
                        ? "bg-primary text-primary-foreground rounded-tr-none" 
                        : "bg-white border border-border text-foreground rounded-tl-none"
                    )}>
                      {msg.content}
                      {msg.role === "bot" && (
                        <button 
                          onClick={() => speak(msg.content)} 
                          className="absolute -right-8 top-1/2 -translate-y-1/2 p-1.5 rounded-full text-muted-foreground hover:bg-white hover:shadow-sm hover:text-primary opacity-0 group-hover:opacity-100 transition-all focus:opacity-100" 
                          title="Read Aloud"
                        >
                          <Volume2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    {/* Schemes Display */}
                    {msg.schemes && msg.schemes.length > 0 && (
                      <div className="grid gap-3 w-full mt-2">
                        {msg.schemes.map((scheme) => (
                          <SchemeCard key={scheme.id} scheme={scheme} />
                        ))}
                      </div>
                    )}

                    {/* Suggestions Chips */}
                    {msg.suggestions && msg.suggestions.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {msg.suggestions.map((s, idx) => (
                          <button
                            key={idx}
                            onClick={() => handleSend(s)}
                            disabled={isPending}
                            className="px-3 py-1.5 bg-white border border-primary/20 text-primary text-sm font-medium rounded-full hover:bg-primary/5 hover:border-primary/40 transition-colors disabled:opacity-50"
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    )}

                    <span className="text-[10px] text-muted-foreground px-1 opacity-70">
                      {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </motion.div>
              ))}
              
              {isPending && (
                <div className="flex gap-4 max-w-3xl mr-auto animate-pulse">
                  <div className="w-10 h-10 rounded-full bg-white border border-border flex items-center justify-center shrink-0">
                    <Bot className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <div className="bg-white border border-border px-5 py-4 rounded-2xl rounded-tl-none flex items-center gap-2">
                    <span className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="p-4 bg-white/80 backdrop-blur-md border-t border-border">
          <form 
            onSubmit={(e) => { e.preventDefault(); handleSend(); }}
            className="flex gap-3 max-w-4xl mx-auto relative"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={labels.placeholder}
              disabled={isPending}
              className="flex-1 bg-gray-50 border border-border/80 text-foreground placeholder:text-muted-foreground px-5 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all disabled:opacity-60 disabled:cursor-not-allowed"
            />
            <button
              type="button"
              onClick={() => {
                if (!isListening) {
                  listen((text) => setInput(text));
                }
              }}
              disabled={isPending}
              className={clsx(
                "p-3 rounded-xl transition-all shadow-sm flex items-center justify-center shrink-0",
                isListening 
                  ? "bg-red-100 text-red-500 animate-pulse border border-red-200" 
                  : "bg-white border border-border text-foreground hover:bg-gray-50"
              )}
              title="Click to speak"
            >
              <Mic className="w-5 h-5" />
            </button>
            <button
              type="submit"
              disabled={!input.trim() || isPending}
              className="px-5 py-3 bg-primary text-primary-foreground font-semibold rounded-xl shadow-lg shadow-primary/20 hover:shadow-xl hover:bg-primary/90 active:scale-95 disabled:opacity-50 disabled:shadow-none disabled:cursor-not-allowed transition-all duration-200 flex items-center gap-2"
            >
              {isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
              <span className="hidden md:inline">{labels.send}</span>
            </button>
          </form>
        </div>
      </main>

      {/* Mobile Nav Spacer */}
      <div className="h-[72px] md:hidden" />
      <div className="md:hidden">
        <Navigation />
      </div>
    </div>
  );
}
