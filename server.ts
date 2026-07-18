import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import multer from 'multer';
import fs from 'fs';
import { v2 as cloudinary } from 'cloudinary';
import { GoogleGenAI, Type } from "@google/genai";
import admin from 'firebase-admin';
import crypto from 'crypto';

import os from 'os';

// Load Firebase Config
let firebaseConfig: any = null;
try {
  const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
  if (fs.existsSync(configPath)) {
    firebaseConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  }
} catch (err) {
  console.error("Failed to read firebase config:", err);
}

// Initialize Firebase Admin
if (firebaseConfig) {
  try {
    if (admin.apps.length === 0) {
      // In Cloud Run, applicationDefault() will find Google's metadata credentials automatically.
      admin.initializeApp({
        projectId: firebaseConfig.projectId,
      });
      console.log("🔥 Firebase Admin initialized successfully.");
    }
  } catch (initErr) {
    console.error("❌ Firebase Admin initialization failed:", initErr);
  }
}

// Configure multer for temporary disk storage in /tmp
const upload = multer({ 
  dest: os.tmpdir(),
  limits: { fileSize: 500 * 1024 * 1024 } // 500MB limit for videos
});

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Detailed logging for Cloudinary configuration
  console.log("--- Cloudinary Initialization ---");
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  let cloudinaryUrl = process.env.CLOUDINARY_URL;

  if (cloudinaryUrl) console.log("CLOUDINARY_URL is present");
  if (cloudName) console.log("CLOUDINARY_CLOUD_NAME is present:", cloudName);

  // Sanitize CLOUDINARY_URL to prevent SDK crash
  if (cloudinaryUrl && !cloudinaryUrl.startsWith('cloudinary://')) {
    console.warn('Invalid CLOUDINARY_URL detected (must start with cloudinary://).');
    cloudinaryUrl = undefined;
  }

  const hasCompleteDirectConfig = !!(cloudName && apiKey && apiSecret);
  const hasValidUrl = !!cloudinaryUrl;
  const isConfigured = hasValidUrl || hasCompleteDirectConfig;
  
  if (isConfigured) {
    console.log("✅ Cloudinary appears to be configured.");
  } else {
    console.warn("⚠️ Cloudinary configuration missing or incomplete.");
  }

  // Gemini client initialization
  let aiClient: GoogleGenAI | null = null;
  function getGeminiClient(): GoogleGenAI {
    if (!aiClient) {
      const key = process.env.GEMINI_API_KEY;
      if (!key) {
        throw new Error('GEMINI_API_KEY is not configured');
      }
      aiClient = new GoogleGenAI({
        apiKey: key,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });
    }
    return aiClient;
  }

  function generateStreamToken(userId: string, secret: string): string {
    const header = { alg: 'HS256', typ: 'JWT' };
    const now = Math.floor(Date.now() / 1000);
    const payload = {
      user_id: userId,
      iat: now,
      exp: now + 24 * 60 * 60, // 24 hours
    };

    const base64UrlEncode = (str: string): string => {
      return Buffer.from(str)
        .toString('base64')
        .replace(/=/g, '')
        .replace(/\+/g, '-')
        .replace(/\//g, '_');
    };

    const headerEncoded = base64UrlEncode(JSON.stringify(header));
    const payloadEncoded = base64UrlEncode(JSON.stringify(payload));
    const signatureInput = `${headerEncoded}.${payloadEncoded}`;

    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(signatureInput);
    const signatureEncoded = hmac.digest('base64')
      .replace(/=/g, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_');

    return `${signatureInput}.${signatureEncoded}`;
  }

  // API Routes
  app.post('/api/stream/credentials', (req, res) => {
    const { userId } = req.body;
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    const customAppId = process.env.VITE_STREAM_APP_ID;
    const streamSecret = process.env.STREAM_API_SECRET;

    let apiKey = "20b134d1bc94473d9d300e8f3bf0040e"; // Fallback to demo app ID
    let secret = "dev-signature"; // Default dummy secret for demo app ID

    if (customAppId && customAppId !== "20b134d1bc94473d9d300e8f3bf0040e") {
      if (streamSecret) {
        apiKey = customAppId;
        secret = streamSecret;
      } else {
        console.warn(`⚠️ VITE_STREAM_APP_ID is configured as "${customAppId}" but STREAM_API_SECRET is missing. Falling back to demo App ID "${apiKey}" to prevent token signature invalid errors.`);
      }
    }

    try {
      const token = generateStreamToken(userId, secret);
      res.json({ apiKey, token });
    } catch (err: any) {
      console.error("Error generating Stream token:", err);
      res.status(500).json({ error: 'Failed to generate Stream credentials' });
    }
  });
  app.post('/api/gemini/suggest-replies', async (req, res) => {
    const { commentText } = req.body;
    if (!commentText) {
      return res.status(400).json({ error: 'Comment text is required' });
    }

    try {
      const ai = getGeminiClient();
      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: `التعليق: "${commentText}"`,
        config: {
          systemInstruction: "أنت نظام ذكي لتوليد الردود المقترحة السريعة لتعليقات وسائل التواصل الاجتماعي. حلل نص التعليق واقترح بالضبط 3 ردود ذكية ومباشرة ومناسبة جداً باللغة العربية. يجب أن يكون كل رد قصيراً جداً (بين كلمة واحدة و 4 كلمات كحد أقصى). قد تشمل الردود رد فعل ودي أو شكر أو كلمة إعجاب أو تفاعل ذكي ملائم لسياق التعليق (مثلاً: 'رائع جداً'، 'أتفق معك تماماً'، 'شكراً لك'، 'جميل جداً'، 'أعجبني هذا'، إلخ). أرجع الردود في مصفوفة JSON تحتوي على 3 عناصر نصية فقط وبدون أي نصوص إضافية خارج مصفوفة JSON.",
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.STRING
            }
          }
        }
      });

      const text = response.text || "[]";
      let replies = JSON.parse(text.trim());
      if (!Array.isArray(replies)) {
        replies = [];
      }
      res.json({ replies });
    } catch (error: any) {
      console.error('Error generating suggestions:', error);
      res.status(500).json({ error: 'Failed to generate suggestions', details: error.message });
    }
  });

  app.post('/api/gemini/smart-assist', async (req, res) => {
    const { text, mode } = req.body;
    if (!text && mode !== 'draft') {
      return res.status(400).json({ error: 'Text is required unless drafting' });
    }

    try {
      const ai = getGeminiClient();
      let prompt = '';
      let systemInstruction = 'أنت مساعد ذكي مدمج في تطبيق محادثة عربي سريع ومتطور. ساعد المستخدم في تحسين أو ترجمة أو صياغة رسالته.';

      if (mode === 'improve') {
        prompt = `قم بتحسين الأسلوب وإعادة صياغة النص التالي باللغة العربية ليكون أكثر لباقة وجاذبية ووضوحاً، وحافظ على المعنى الأصلي دون تكلف:\n\n"${text}"`;
      } else if (mode === 'correct') {
        prompt = `قم بتصحيح الأخطاء الإملائية والنحوية وتعديل صياغة النص التالي باللغة العربية ليكون صحيحاً وخالياً تماماً من الأخطاء:\n\n"${text}"`;
      } else if (mode === 'translate_en') {
        prompt = `ترجم النص التالي بدقة إلى اللغة الإنجليزية بأسلوب طبيعي ومناسب للمحادثات:\n\n"${text}"`;
      } else if (mode === 'translate_ar') {
        prompt = `ترجم النص التالي بدقة إلى اللغة العربية بأسلوب طبيعي ومناسب للمحادثات:\n\n"${text}"`;
      } else if (mode === 'draft') {
        prompt = `صغ مسودة رسالة لبدء محادثة ودية ومناسبة باللغة العربية بناءً على هذا الوصف القصير أو الكلمات المفتاحية:\n\n"${text || 'تحية طيبة وسؤال عن الحال'}"`;
      } else {
        prompt = text;
      }

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          systemInstruction,
          temperature: 0.7,
        }
      });

      res.json({ result: response.text });
    } catch (error: any) {
      console.error('Error in smart-assist:', error);
      res.status(500).json({ error: 'Failed to process AI request', details: error.message });
    }
  });

  app.post('/api/upload-large', upload.single('file'), async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const currentUrl = process.env.CLOUDINARY_URL;
    const currentCloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const currentApiKey = process.env.CLOUDINARY_API_KEY;
    const currentApiSecret = process.env.CLOUDINARY_API_SECRET;

    if (!currentUrl && !(currentCloudName && currentApiKey && currentApiSecret)) {
      return res.status(500).json({ error: 'Cloudinary configuration missing' });
    }

    try {
      if (currentUrl) {
        cloudinary.config({ cloudinary_url: currentUrl, secure: true });
      } else {
        cloudinary.config({
          cloud_name: currentCloudName,
          api_key: currentApiKey,
          api_secret: currentApiSecret,
          secure: true
        });
      }

      console.log(`☁️ Starting upload_large for: ${req.file.path}`);
      
      const result = await cloudinary.uploader.upload_large(req.file.path, {
        resource_type: 'video',
        folder: 'trucast',
        chunk_size: 6000000 // 6MB pieces as requested
      });

      // Cleanup local file
      fs.unlinkSync(req.file.path);
      
      console.log('✅ upload_large completed successfully');
      res.json({ url: result.secure_url });
    } catch (error) {
      console.error('❌ upload_large error:', error);
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      res.status(500).json({ error: 'Failed to upload large file' });
    }
  });

  app.post('/api/cloudinary-signature', async (req, res) => {
    // Re-check environment inside the route for maximum reactivity
    let currentUrl = process.env.CLOUDINARY_URL;
    const currentCloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const currentApiKey = process.env.CLOUDINARY_API_KEY;
    const currentApiSecret = process.env.CLOUDINARY_API_SECRET;
    
    // Sanitize URL if it's a placeholder or invalid
    if (currentUrl && (!currentUrl.startsWith('cloudinary://') || currentUrl.includes('<'))) {
      currentUrl = undefined;
    }

    if (!currentUrl && !(currentCloudName && currentApiKey && currentApiSecret)) {
      return res.status(500).json({ 
        error: 'Cloudinary configuration is missing. Please set CLOUDINARY_URL in your Secrets.' 
      });
    }

    try {
      const { v2: cloudinary } = await import('cloudinary');
      
      console.log("Generating signature with URL:", currentUrl ? "YES" : "NO (using direct keys)");
      
      if (currentUrl) {
        cloudinary.config({
          cloudinary_url: currentUrl,
          secure: true
        });
      } else {
        cloudinary.config({
          cloud_name: currentCloudName,
          api_key: currentApiKey,
          api_secret: currentApiSecret,
          secure: true
        });
      }

      const timestamp = Math.round(new Date().getTime() / 1000);
      
      // IMPORTANT: resource_type is NOT part of the signature calculation.
      // It is part of the URL endpoint. Including it in the signature causes "Invalid Signature".
      const paramsToSign = { ...req.body };
      delete paramsToSign.resource_type;

      const signature = cloudinary.utils.api_sign_request(
        { timestamp, ...paramsToSign },
        currentApiSecret || cloudinary.config().api_secret!
      );
      
      const resolvedCloudName = currentCloudName || cloudinary.config().cloud_name;
      const resolvedApiKey = currentApiKey || cloudinary.config().api_key;

      if (!resolvedCloudName) {
        throw new Error('Could not resolve Cloudinary cloud_name from configuration');
      }

      const responseData = { 
        signature, 
        timestamp, 
        cloud_name: resolvedCloudName, 
        api_key: resolvedApiKey 
      };
      
      console.log("Signature generated for cloud:", responseData.cloud_name);
      res.json(responseData);
    } catch (error) {
      console.error('Error generating signature:', error);
      res.status(500).json({ error: 'Failed to generate signature' });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
