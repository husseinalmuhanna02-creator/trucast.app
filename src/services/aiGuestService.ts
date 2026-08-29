// src/services/aiGuestService.ts

export interface AIGuestConfig {
  gender: 'male' | 'female';
  dialect: string;
}

export class AIGuestService {
  private ws: WebSocket | null = null;

  constructor(private config: AIGuestConfig) {}

  public connect() {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (!apiKey) {
      console.error("Gemini API Key is missing!");
      return;
    }

    const wsUrl = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent?key=${apiKey}`;
    this.ws = new WebSocket(wsUrl);

    this.ws.onopen = () => {
      console.log("Connected to Gemini Live API");
      this.sendSetup();
    };

    this.ws.onerror = (error) => {
      console.error("Gemini WS Error:", error);
    };
  }

  private sendSetup() {
    if (!this.ws) return;

    const setupMessage = {
      setup: {
        model: "models/gemini-2.0-flash-exp",
        generationConfig: {
          responseModalities: ["AUDIO"],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: {
                // Puck للذكور، Kore للإناث
                voiceName: this.config.gender === 'male' ? 'Puck' : 'Kore'
              }
            }
          }
        },
        systemInstruction: {
          parts: [{
            text: `أنت ضيف ذكاء اصطناعي تفاعلي في بث مباشر على تطبيق TruCast. تتحدث باللهجة: ${this.config.dialect}. إجاباتك عفوية، سريعة، ومناسبة لجو البث المباشر.`
          }]
        }
      }
    };

    this.ws.send(JSON.stringify(setupMessage));
  }

  public disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}
