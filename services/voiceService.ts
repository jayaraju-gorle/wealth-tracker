// ─── Gemini Live API Voice Service ────────────────────────────────────
// Uses WebSocket connection to Gemini's BidiGenerateContent for real-time
// voice conversations with high-quality speech recognition and synthesis.

import { buildPortfolioContext } from './geminiService';
import { AppState } from '../types';

const WS_URL = 'wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent';
const MODEL = 'gemini-2.5-flash-native-audio-preview-12-2025';

// ─── Types ────────────────────────────────────────────────────────────
export type VoiceSessionStatus = 'idle' | 'connecting' | 'connected' | 'listening' | 'thinking' | 'speaking' | 'error';

interface VoiceSessionCallbacks {
    onStatusChange: (status: VoiceSessionStatus) => void;
    onTranscript: (text: string, isFinal: boolean) => void;
    onResponse: (text: string) => void;
    onError: (error: string) => void;
    onActionDetected: (action: any) => void;
}

// ─── Audio Utilities ──────────────────────────────────────────────────
// Convert Float32Array from mic to 16-bit PCM
function float32ToPcm16(float32: Float32Array): ArrayBuffer {
    const buffer = new ArrayBuffer(float32.length * 2);
    const view = new DataView(buffer);
    for (let i = 0; i < float32.length; i++) {
        const s = Math.max(-1, Math.min(1, float32[i]));
        view.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    }
    return buffer;
}

// Convert ArrayBuffer to base64
function arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}

// Convert base64 to Float32Array for AudioContext playback (24kHz PCM16)
function pcm16ToFloat32(base64: string): Float32Array {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    const view = new DataView(bytes.buffer);
    const float32 = new Float32Array(bytes.length / 2);
    for (let i = 0; i < float32.length; i++) {
        float32[i] = view.getInt16(i * 2, true) / 0x8000;
    }
    return float32;
}

// Resample from source sample rate to target sample rate
function resample(input: Float32Array, srcRate: number, dstRate: number): Float32Array {
    if (srcRate === dstRate) return input;
    const ratio = srcRate / dstRate;
    const newLength = Math.round(input.length / ratio);
    const output = new Float32Array(newLength);
    for (let i = 0; i < newLength; i++) {
        const srcIdx = i * ratio;
        const lo = Math.floor(srcIdx);
        const hi = Math.min(lo + 1, input.length - 1);
        const frac = srcIdx - lo;
        output[i] = input[lo] * (1 - frac) + input[hi] * frac;
    }
    return output;
}

// ─── Voice Session ────────────────────────────────────────────────────
export class GeminiVoiceSession {
    private ws: WebSocket | null = null;
    private mediaStream: MediaStream | null = null;
    private audioContext: AudioContext | null = null;
    private processor: ScriptProcessorNode | null = null;
    private source: MediaStreamAudioSourceNode | null = null;
    private playbackContext: AudioContext | null = null;
    private scheduledSources: AudioBufferSourceNode[] = [];
    private nextStartTime = 0;
    private audioQueue: Float32Array[] = [];
    private isPlayingAudio = false;
    private callbacks: VoiceSessionCallbacks;
    private apiKey: string;
    private state: AppState;
    private status: VoiceSessionStatus = 'idle';

    constructor(apiKey: string, state: AppState, callbacks: VoiceSessionCallbacks) {
        this.apiKey = apiKey;
        this.state = state;
        this.callbacks = callbacks;
    }

    private setStatus(status: VoiceSessionStatus) {
        this.status = status;
        this.callbacks.onStatusChange(status);
    }

    async connect(): Promise<void> {
        this.setStatus('connecting');

        try {
            // Build system prompt with portfolio context
            const portfolioContext = buildPortfolioContext(this.state);
            const systemInstruction = `You are WealthTracker Voice Assistant. The user is speaking to you via voice in a personal wealth tracking app.

PORTFOLIO CONTEXT:
${portfolioContext}

RULES:
- Respond concisely and naturally (1-3 sentences for voice)
- You can help add, update, or query assets, liabilities, and milestones
- Parse Indian amounts: "5 lakh" = 500000, "2 crore" = 20000000
- If user asks to modify data, respond with what you've done AND include a JSON action block in your text like: ACTION_JSON:{"action":"ADD_ASSET","name":"...","value":number,"assetType":"..."}
- VALID ASSET TYPES: CASH, SAVINGS_ACCOUNT, MUTUAL_FUND, STOCK, REAL_ESTATE, GOLD, SILVER, FD, EPF_PPF, NPS, INSURANCE, BONDS, CRYPTO, VEHICLE, ESOPS, LENDING, OTHER
- VALID LIABILITY TYPES: HOME_LOAN, MORTGAGE, CAR_LOAN, VEHICLE_LOAN, EDUCATION_LOAN, PERSONAL_LOAN, BUSINESS_LOAN, GOLD_LOAN, CREDIT_CARD, OTHER
- Support English, Hindi, and Telugu
- Be warm, friendly, and brief — this is a voice conversation`;

            // Connect to WebSocket
            const url = `${WS_URL}?key=${this.apiKey}`;
            this.ws = new WebSocket(url);

            this.ws.onopen = () => {
                // Send setup message
                const setupMessage = {
                    setup: {
                        model: `models/${MODEL}`,
                        generationConfig: {
                            responseModalities: ['AUDIO'],
                        },
                        systemInstruction: {
                            parts: [{ text: systemInstruction }]
                        }
                    }
                };
                this.ws!.send(JSON.stringify(setupMessage));
            };

            this.ws.onmessage = async (event) => {
                try {
                    // Handle Blob (binary frame) from Gemini Live API
                    let textData = event.data;
                    if (event.data instanceof Blob) {
                        textData = await event.data.text();
                    }
                    const data = JSON.parse(textData);

                    // Setup complete
                    if (data.setupComplete) {
                        this.setStatus('connected');
                        this.startMicrophone();
                        return;
                    }

                    // Server content (model response)
                    if (data.serverContent) {
                        if (data.serverContent.interrupted) {
                            this.audioQueue = [];
                            this.scheduledSources.forEach(s => {
                                try { s.stop(); } catch (e) { }
                            });
                            this.scheduledSources = [];
                            this.isPlayingAudio = false;
                            this.nextStartTime = 0;
                            return;
                        }

                        if (data.serverContent.modelTurn?.parts) {
                            for (const part of data.serverContent.modelTurn.parts) {
                                // Audio response
                                if (part.inlineData?.data) {
                                    this.setStatus('speaking');
                                    const audioData = pcm16ToFloat32(part.inlineData.data);
                                    this.audioQueue.push(audioData);
                                    this.playAudioQueue();
                                }
                                // Text response
                                if (part.text) {
                                    // Check for action JSON in response
                                    const actionMatch = part.text.match(/ACTION_JSON:\s*(\{[\s\S]*?\})/);
                                    if (actionMatch) {
                                        try {
                                            const action = JSON.parse(actionMatch[1]);
                                            this.callbacks.onActionDetected(action);
                                        } catch { /* ignore malformed */ }
                                    }
                                    // Clean text for display
                                    const cleanText = part.text.replace(/ACTION_JSON:\s*\{[\s\S]*?\}/g, '').trim();
                                    if (cleanText) {
                                        this.callbacks.onResponse(cleanText);
                                    }
                                }
                            }
                        }

                        // Turn complete
                        if (data.serverContent.turnComplete) {
                            if (this.audioQueue.length === 0) {
                                this.setStatus('listening');
                            }
                        }
                    }
                } catch (e) {
                    console.error('[Voice] Parse error:', e);
                }
            };

            this.ws.onerror = () => {
                this.setStatus('error');
                this.callbacks.onError('Connection error. Check your API key.');
            };

            this.ws.onclose = (event) => {
                if (this.status !== 'idle') {
                    this.setStatus('idle');
                    if (event.code !== 1000) {
                        this.callbacks.onError(`Connection closed: ${event.reason || 'Unknown reason'}`);
                    }
                }
            };

        } catch (err: any) {
            this.setStatus('error');
            this.callbacks.onError(err.message || 'Failed to connect');
        }
    }

    private async startMicrophone(): Promise<void> {
        try {
            this.mediaStream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    sampleRate: 16000,
                    channelCount: 1,
                    echoCancellation: true,
                    noiseSuppression: true,
                }
            });

            this.audioContext = new AudioContext({ sampleRate: 16000 });
            this.source = this.audioContext.createMediaStreamSource(this.mediaStream);

            // Use ScriptProcessor for raw PCM access (AudioWorklet is better but more complex)
            this.processor = this.audioContext.createScriptProcessor(4096, 1, 1);
            this.processor.onaudioprocess = (e) => {
                if (this.ws?.readyState !== WebSocket.OPEN) return;

                const inputData = e.inputBuffer.getChannelData(0);

                // Client-side VAD for zero-latency barge-in
                if (this.isPlayingAudio) {
                    let sum = 0;
                    for (let i = 0; i < inputData.length; i++) {
                        sum += inputData[i] * inputData[i];
                    }
                    const rms = Math.sqrt(sum / inputData.length);

                    // 0.03 is a good threshold for speech vs background
                    if (rms > 0.03) {
                        this.audioQueue = [];
                        this.scheduledSources.forEach(s => {
                            try { s.stop(); } catch (e) { }
                        });
                        this.scheduledSources = [];
                        this.isPlayingAudio = false;
                        this.nextStartTime = 0;
                    }
                }

                // Resample to 16kHz if needed
                const resampled = this.audioContext!.sampleRate !== 16000
                    ? resample(inputData, this.audioContext!.sampleRate, 16000)
                    : inputData;

                const pcm = float32ToPcm16(resampled);
                const base64 = arrayBufferToBase64(pcm);

                const msg = {
                    realtimeInput: {
                        audio: {
                            mimeType: 'audio/pcm;rate=16000',
                            data: base64
                        }
                    }
                };
                this.ws!.send(JSON.stringify(msg));
            };

            this.source.connect(this.processor);
            this.processor.connect(this.audioContext.destination);
            this.setStatus('listening');

        } catch (err: any) {
            this.setStatus('error');
            this.callbacks.onError('Microphone access denied. Please allow microphone permission.');
        }
    }

    private playAudioQueue(): void {
        if (!this.playbackContext) {
            this.playbackContext = new AudioContext({ sampleRate: 24000 });
            this.nextStartTime = this.playbackContext.currentTime + 0.1;
        }

        while (this.audioQueue.length > 0) {
            const chunk = this.audioQueue.shift()!;
            const buffer = this.playbackContext.createBuffer(1, chunk.length, 24000);
            buffer.getChannelData(0).set(chunk);

            const source = this.playbackContext.createBufferSource();
            source.buffer = buffer;
            source.connect(this.playbackContext.destination);

            if (this.nextStartTime < this.playbackContext.currentTime) {
                this.nextStartTime = this.playbackContext.currentTime + 0.05;
            }

            source.start(this.nextStartTime);
            this.scheduledSources.push(source);
            this.isPlayingAudio = true;
            this.nextStartTime += buffer.duration;

            source.onended = () => {
                const idx = this.scheduledSources.indexOf(source);
                if (idx > -1) this.scheduledSources.splice(idx, 1);

                if (this.scheduledSources.length === 0) {
                    this.isPlayingAudio = false;
                    if (this.status === 'speaking') {
                        this.setStatus('listening');
                    }
                }
            };
        }
    }

    disconnect(): void {
        // Stop microphone
        if (this.processor) {
            this.processor.disconnect();
            this.processor = null;
        }
        if (this.source) {
            this.source.disconnect();
            this.source = null;
        }
        if (this.audioContext) {
            this.audioContext.close();
            this.audioContext = null;
        }
        if (this.mediaStream) {
            this.mediaStream.getTracks().forEach(t => t.stop());
            this.mediaStream = null;
        }
        // Stop playback
        if (this.playbackContext) {
            this.playbackContext.close();
            this.playbackContext = null;
        }
        this.scheduledSources.forEach(s => {
            try { s.stop(); } catch (e) { }
        });
        this.scheduledSources = [];
        this.nextStartTime = 0;
        this.audioQueue = [];
        this.isPlayingAudio = false;
        // Close WebSocket
        if (this.ws) {
            this.ws.close(1000);
            this.ws = null;
        }
        this.setStatus('idle');
    }

    get currentStatus(): VoiceSessionStatus {
        return this.status;
    }
}

// ─── Feature Detection ────────────────────────────────────────────────
export function isVoiceSupported(): boolean {
    return !!(navigator.mediaDevices?.getUserMedia) && !!window.WebSocket;
}
