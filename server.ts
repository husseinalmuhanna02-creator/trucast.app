import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import multer from 'multer';
import fs from 'fs';
import { v2 as cloudinary } from 'cloudinary';
import { GoogleGenAI, Type } from "@google/genai";
import admin from 'firebase-admin';

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
    if (!admin.apps || admin.apps.length === 0) {
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

  // API Routes
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

  app.post('/api/user/update-profile', async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthenticated. Missing token.' });
    }

    const token = authHeader.split('Bearer ')[1];
    const { displayName, username, bio, photoURL, oldUsername } = req.body;

    try {
      const decodedToken = await admin.auth().verifyIdToken(token);
      const uid = decodedToken.uid;

      if (!uid) {
        return res.status(401).json({ error: 'Invalid token, uid not found.' });
      }

      const db = firebaseConfig?.firestoreDatabaseId 
        ? admin.firestore(firebaseConfig.firestoreDatabaseId) 
        : admin.firestore();

      const userRef = db.collection('users').doc(uid);

      // If username is being changed, handle the usernames map
      if (username) {
        // If they have an old username, delete it
        if (oldUsername && oldUsername !== username) {
          try {
            await db.collection('usernames').doc(oldUsername).delete();
          } catch (e) {
            console.error("Failed to delete old username in Admin SDK:", e);
          }
        }

        // Check if username is already taken by someone else
        const usernameDoc = await db.collection('usernames').doc(username).get();
        if (usernameDoc.exists && usernameDoc.data()?.uid !== uid) {
          return res.status(400).json({ error: 'اسم المستخدم محجوز بالفعل.' });
        }

        // Save the new username mapping
        await db.collection('usernames').doc(username).set({
          uid: uid,
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
      }

      // Build update payload
      const updatePayload: any = {};
      if (displayName !== undefined) updatePayload.displayName = displayName;
      if (username !== undefined) updatePayload.username = username;
      if (bio !== undefined) updatePayload.bio = bio;
      if (photoURL !== undefined) updatePayload.photoURL = photoURL;

      // Update user document
      await userRef.set(updatePayload, { merge: true });

      res.json({ success: true, uid });
    } catch (error: any) {
      console.error('Error updating user profile via Admin SDK:', error);
      res.status(500).json({ error: error.message || 'Failed to update user profile' });
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
