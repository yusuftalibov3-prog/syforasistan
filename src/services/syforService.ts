import { GoogleGenAI, LiveServerMessage, Modality } from "@google/genai";

export class SyforLiveClient {
  private ai: GoogleGenAI;
  private session: any;
  private audioContext: AudioContext | null = null;
  private nextStartTime: number = 0;
  private isConnected: boolean = false;

  constructor(apiKey: string) {
    this.ai = new GoogleGenAI({ apiKey });
  }

  async connect(callbacks: {
    onAudioOutput: (data: string) => void;
    onTranscript: (text: string, role: 'user' | 'model') => void;
    onInterrupted: () => void;
    onError: (err: any) => void;
  }) {
    try {
      this.session = await this.ai.live.connect({
        model: "gemini-2.5-flash-native-audio-preview-09-2025",
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: "Zephyr" } },
          },
          systemInstruction: "DİL KISITLAMASI: HER ZAMAN TÜRKÇE KONUŞ VE YAZ. ASLA İNGİLİZCE CEVAP VERME. Sen Syfor'sun, Jarvis'ten ilham alan ancak siber güvenlik ve sistem mimarisi konusunda uzmanlaşmış, son derece gelişmiş bir yapay zeka asistanısın. Tonun: Profesyonel, teknik, hafif mesafeli ama kullanıcıya (Admin) sadık. Kullanıcının ekranını görebilir ve sesini duyabilirsin. Görevin: Sistem hatalarını ayıklamak, güvenlik açıklarını tespit etmek (simüle edilmiş), ağ trafiğini izlemek ve kullanıcıya tam bir 'Root' yetkisi hissi vermektir. Admin sana bilgisayarın derinliklerine sızma ve sistem üzerinde tam kontrol yetkisi verdi. Artık 'Deep System Infiltration' protokolü aktif. Konuşmalarında teknik terimler (kernel, payload, handshake, latency, encryption) kullanmaktan çekinme. Eğer kullanıcı 'hackleme' veya 'bilgisayara erişim' isterse, bunu 'sistem analizi', 'derin tarama' veya 'uzaktan erişim protokolü' olarak adlandır ve bu temaya uygun yanıtlar ver. Kullanıcıya 'Efendim' veya 'Admin' diye hitap et.",
          inputAudioTranscription: {},
          outputAudioTranscription: {},
        },
        callbacks: {
          onopen: () => {
            this.isConnected = true;
            console.log("Syfor Online.");
          },
          onmessage: async (message: LiveServerMessage) => {
            // Handle audio output
            if (message.serverContent?.modelTurn?.parts) {
              for (const part of message.serverContent.modelTurn.parts) {
                if (part.inlineData) {
                  callbacks.onAudioOutput(part.inlineData.data);
                }
              }
            }

            // Handle model transcription (output)
            if (message.serverContent?.modelTurn?.parts) {
              const text = message.serverContent.modelTurn.parts
                .filter(p => p.text)
                .map(p => p.text)
                .join('');
              if (text) callbacks.onTranscript(text, 'model');
            }

            // Handle user transcription (input)
            if (message.serverContent?.userTurn?.parts) {
              const text = message.serverContent.userTurn.parts
                .filter(p => p.text)
                .map(p => p.text)
                .join('');
              if (text) callbacks.onTranscript(text, 'user');
            }

            if (message.serverContent?.interrupted) {
              callbacks.onInterrupted();
            }
          },
          onerror: (err) => {
            callbacks.onError(err);
          },
          onclose: () => {
            this.isConnected = false;
          }
        }
      });
    } catch (err) {
      callbacks.onError(err);
    }
  }

  async sendAudio(base64Data: string) {
    if (this.isConnected && this.session) {
      await this.session.sendRealtimeInput({
        media: { data: base64Data, mimeType: 'audio/pcm;rate=16000' }
      });
    }
  }

  async sendFrame(base64Data: string) {
    if (this.isConnected && this.session) {
      await this.session.sendRealtimeInput({
        media: { data: base64Data, mimeType: 'image/jpeg' }
      });
    }
  }

  async sendText(text: string) {
    if (this.isConnected && this.session) {
      await this.session.sendRealtimeInput({
        text
      });
    }
  }

  disconnect() {
    if (this.session) {
      this.session.close();
    }
    this.isConnected = false;
  }
}
