import { useState, useCallback, useRef, useEffect } from 'react';

interface UseSpeechReturn {
  isListening: boolean;
  isSpeaking: boolean;
  mouthOpen: number;
  transcript: string;
  startListening: () => void;
  stopListening: () => void;
  speak: (text: string) => void;
  stopSpeaking: () => void;
  isSupported: boolean;
}

export function useSpeech(): UseSpeechReturn {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [mouthOpen, setMouthOpen] = useState(0);
  const [transcript, setTranscript] = useState('');

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const synthRef = useRef(typeof window !== 'undefined' ? window.speechSynthesis : null);
  const lipAnimTimerRef = useRef<number | null>(null);
  const speechStartTimeRef = useRef(0);

  const clearLipAnimation = useCallback(() => {
    if (lipAnimTimerRef.current !== null) {
      window.clearInterval(lipAnimTimerRef.current);
      lipAnimTimerRef.current = null;
    }
    setMouthOpen(0);
  }, []);

  const isSupported =
    typeof window !== 'undefined' &&
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);

  useEffect(() => {
    return () => {
      recognitionRef.current?.abort();
      synthRef.current?.cancel();
      clearLipAnimation();
    };
  }, [clearLipAnimation]);

  const startListening = useCallback(() => {
    if (!isSupported) return;

    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => setIsListening(true);

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let text = '';
      for (let i = 0; i < event.results.length; i++) {
        text += event.results[i][0].transcript;
      }
      setTranscript(text);
    };

    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);

    recognitionRef.current = recognition;
    recognition.start();
  }, [isSupported]);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    setIsListening(false);
  }, []);

  const speak = useCallback((text: string) => {
    if (!synthRef.current) return;

    synthRef.current.cancel();
    clearLipAnimation();

    // Clean text: remove markdown-style formatting
    const cleanText = text
      .replace(/\*\*/g, '')
      .replace(/[•●]/g, '')
      .replace(/⚠️/g, '')
      .replace(/#{1,6}\s/g, '')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = 0.95;
    utterance.pitch = 1;
    utterance.volume = 1;

    utterance.onstart = () => {
      setIsSpeaking(true);
      speechStartTimeRef.current = performance.now();

      // Fallback lip movement loop while speech is active.
      lipAnimTimerRef.current = window.setInterval(() => {
        const elapsed = (performance.now() - speechStartTimeRef.current) / 1000;
        const base = (Math.sin(elapsed * 12) + 1) * 0.18;
        const jitter = Math.random() * 0.2;
        setMouthOpen(Math.min(0.9, base + jitter));
      }, 70);
    };

    utterance.onboundary = () => {
      // Boundary spikes simulate stronger phoneme articulation.
      setMouthOpen((prev) => Math.min(1, prev + 0.25));
    };

    utterance.onend = () => {
      setIsSpeaking(false);
      clearLipAnimation();
    };

    utterance.onerror = () => {
      setIsSpeaking(false);
      clearLipAnimation();
    };

    synthRef.current.speak(utterance);
  }, [clearLipAnimation]);

  const stopSpeaking = useCallback(() => {
    synthRef.current?.cancel();
    setIsSpeaking(false);
    clearLipAnimation();
  }, [clearLipAnimation]);

  return {
    isListening,
    isSpeaking,
    mouthOpen,
    transcript,
    startListening,
    stopListening,
    speak,
    stopSpeaking,
    isSupported,
  };
}
