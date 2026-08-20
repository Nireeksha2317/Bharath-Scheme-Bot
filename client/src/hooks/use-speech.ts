import { useState, useCallback, useEffect } from "react";

// Add TypeScript definitions for Web Speech API since it might not be in the default DOM lib
interface SpeechRecognitionEvent {
  results: {
    [index: number]: {
      [index: number]: {
        transcript: string;
      };
    };
  };
}

interface SpeechRecognitionErrorEvent {
  error: string;
}

interface SpeechRecognition extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: (event: SpeechRecognitionEvent) => void;
  onerror: (event: SpeechRecognitionErrorEvent) => void;
  onend: () => void;
}

declare global {
  interface Window {
    SpeechRecognition: {
      new (): SpeechRecognition;
    };
    webkitSpeechRecognition: {
      new (): SpeechRecognition;
    };
  }
}

const LANGUAGE_MAP: Record<string, string> = {
  en: "en-IN",
  hi: "hi-IN",
  kn: "kn-IN",
  ta: "ta-IN",
  te: "te-IN",
};

export function useSpeech(currentLang: string) {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(false); // Default to off, users can opt-in
  
  // Speech Recognition
  const listen = useCallback(
    (onResult: (text: string) => void, onError?: (err: string) => void) => {
      const SpeechRecognitionConstructor =
        window.SpeechRecognition || window.webkitSpeechRecognition;

      if (!SpeechRecognitionConstructor) {
        if (onError) onError("Speech recognition is not supported in this browser.");
        return;
      }

      const recognition = new SpeechRecognitionConstructor();
      recognition.lang = LANGUAGE_MAP[currentLang] || "en-IN";
      recognition.continuous = false;
      recognition.interimResults = false;

      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        onResult(transcript);
      };

      recognition.onerror = (event) => {
        if (onError) onError(event.error);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      try {
        recognition.start();
        setIsListening(true);
      } catch (err) {
        console.error("Speech recognition error", err);
        setIsListening(false);
      }
    },
    [currentLang]
  );

  // Speech Synthesis
  const speak = useCallback(
    (text: string) => {
      if (!voiceEnabled || !window.speechSynthesis) return;

      // Cancel any ongoing speech
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = LANGUAGE_MAP[currentLang] || "en-IN";

      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);

      window.speechSynthesis.speak(utterance);
    },
    [currentLang, voiceEnabled]
  );

  const stopSpeaking = useCallback(() => {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  }, []);

  // Cleanup synthesis on unmount
  useEffect(() => {
    return () => {
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  return {
    isListening,
    listen,
    isSpeaking,
    speak,
    stopSpeaking,
    voiceEnabled,
    setVoiceEnabled,
  };
}
