import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.GEMINI_API_KEY || "";
const genAI = new GoogleGenerativeAI(apiKey);

export const transcriptionService = {
  /**
   * Transcribes audio from a Cloudinary URL using Gemini 1.5 Flash
   * Note: Gemini 1.5 Flash supports audio inputs via URI if accessible or base64.
   * For this implementation, we'll try to fetch the audio and send it as base64.
   */
  async transcribeAudio(audioUrl: string): Promise<string> {
    try {
      console.log(`🎙️ Starting transcription for: ${audioUrl}`);
      
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });

      // Fetch the audio file
      const response = await fetch(audioUrl);
      const audioBlob = await response.blob();
      
      // Convert blob to base64
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve) => {
        reader.onloadend = () => {
          const base64String = (reader.result as string).split(',')[1];
          resolve(base64String);
        };
        reader.readAsDataURL(audioBlob);
      });
      
      const audioBase64 = await base64Promise;

      const result = await model.generateContent([
        {
          inlineData: {
            mimeType: audioBlob.type || "audio/mpeg",
            data: audioBase64
          }
        },
        { text: "أرجو تحويل المقطع الصوتي المرفق إلى نص بدقة. إذا كان الكلام بالعربية، اكتبه بالعربية. إذا كان بلغة أخرى، اكتبه كما هو. أخرج النص فقط بدون أي تعليقات إضافية." }
      ]);

      const transcription = result.response.text();
      console.log(`✅ Transcription complete: ${transcription}`);
      return transcription;
    } catch (error) {
      console.error("❌ Transcription error:", error);
      return "فشل تحويل الصوت إلى نص. حاول مرة أخرى.";
    }
  }
};
