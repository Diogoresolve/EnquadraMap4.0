"use client";

import { useState, useEffect, useCallback, useRef } from 'react';

// Window interface extended in global.d.ts

export type VoiceState = 'idle' | 'listening' | 'processing' | 'speaking';

export const useVoiceInput = () => {
    const [isSupported, setIsSupported] = useState(false);
    const [text, setText] = useState('');
    const [state, setState] = useState<VoiceState>('idle');
    const recognitionRef = useRef<any>(null);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const { webkitSpeechRecognition, SpeechRecognition } = window;
            if (webkitSpeechRecognition || SpeechRecognition) {
                setIsSupported(true);
                const SpeechRecognitionConstructor = SpeechRecognition || webkitSpeechRecognition;
                const recognition = new SpeechRecognitionConstructor();
                recognition.continuous = false;
                recognition.interimResults = false;
                recognition.lang = 'pt-BR'; // Default to Portuguese based on user language

                recognition.onstart = () => {
                    setState('listening');
                };

                recognition.onend = () => {
                    setState((prev) => (prev === 'listening' ? 'idle' : prev));
                };

                recognition.onresult = (event: any) => {
                    const transcript = event.results[0][0].transcript;
                    setText(transcript);
                    setState('processing');
                };

                recognition.onerror = (event: any) => {
                    console.error("Speech recognition error", event.error);
                    setState('idle');
                };

                recognitionRef.current = recognition;
            }
        }
    }, []);

    const startListening = useCallback(() => {
        if (recognitionRef.current && state === 'idle') {
            setText('');
            try {
                recognitionRef.current.start();
            } catch (e) {
                console.error("Error starting recognition:", e);
            }
        }
    }, [state]);

    const stopListening = useCallback(() => {
        if (recognitionRef.current) {
            recognitionRef.current.stop();
            setState('idle');
        }
    }, []);

    const speak = useCallback((message: string) => {
        if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
            // Cancel any ongoing speech
            window.speechSynthesis.cancel();

            const utterance = new SpeechSynthesisUtterance(message);
            utterance.lang = 'pt-BR';

            utterance.onstart = () => setState('speaking');
            utterance.onend = () => setState('idle');

            window.speechSynthesis.speak(utterance);
        }
    }, []);

    return {
        isSupported,
        text,
        state,
        startListening,
        stopListening,
        speak,
        setText, // Allow manual override if needed
        setState
    };
};
