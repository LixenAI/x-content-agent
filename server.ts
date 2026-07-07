import express from "express";
import path from "path";
import dotenv from "dotenv";
import cors from "cors";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());

  // API Route for Gemini Text
  app.post("/api/generate-text", async (req, res) => {
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
        return res.status(401).json({ error: "Your Gemini API key is set to 'MY_GEMINI_API_KEY'. Please open Settings (gear icon) -> Secrets, and DELETE the GEMINI_API_KEY to use the free key, or replace it with a valid key." });
      }
      
      const { prompt } = req.body;
      if (!prompt) return res.status(400).json({ error: "Prompt is required." });

      const { GoogleGenAI } = await import("@google/genai");
      const ai = new GoogleGenAI({ apiKey });

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
      });

      res.json({ text: response.text });
    } catch (err: any) {
      console.error("Gemini API Error:", err);
      let errorMsg = err.message || 'Failed to generate text';
      if (errorMsg.includes('{"error":')) {
        try {
          const parsed = JSON.parse(errorMsg.substring(errorMsg.indexOf('{')));
          errorMsg = parsed.error?.message || errorMsg;
        } catch(e) {}
      }
      res.status(500).json({ error: `Gemini API Error: ${errorMsg}` });
    }
  });

  // API Route for Website Brand Analysis
  app.post("/api/analyze-website", async (req, res) => {
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
        return res.status(401).json({ error: "Your Gemini API key is set to 'MY_GEMINI_API_KEY'. Please open Settings (gear icon) -> Secrets, and DELETE the GEMINI_API_KEY to use the free key, or replace it with a valid key." });
      }

      const { url } = req.body;
      if (!url || typeof url !== 'string') return res.status(400).json({ error: "URL is required." });

      let target: URL;
      try {
        target = new URL(url.startsWith('http') ? url : `https://${url}`);
        if (!['http:', 'https:'].includes(target.protocol)) throw new Error('bad protocol');
      } catch {
        return res.status(400).json({ error: "Please enter a valid website URL." });
      }

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 12000);
      let html = '';
      try {
        const siteRes = await fetch(target.toString(), {
          signal: controller.signal,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml',
          },
        });
        if (!siteRes.ok) {
          return res.status(502).json({ error: `Could not load the website (HTTP ${siteRes.status}).` });
        }
        html = await siteRes.text();
      } catch {
        return res.status(502).json({ error: "Could not reach that website. Check the URL and try again." });
      } finally {
        clearTimeout(timeout);
      }

      const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
      const descMatch = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i)
        || html.match(/<meta[^>]+content=["']([^"']*)["'][^>]+name=["']description["']/i);
      const bodyText = html
        .replace(/<script[\s\S]*?<\/script>/gi, ' ')
        .replace(/<style[\s\S]*?<\/style>/gi, ' ')
        .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
        .replace(/<[^>]+>/g, ' ')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&#\d+;|&\w+;/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 8000);

      const siteSummary = [
        `URL: ${target.toString()}`,
        titleMatch ? `Page title: ${titleMatch[1].trim()}` : '',
        descMatch ? `Meta description: ${descMatch[1].trim()}` : '',
        `Page text: ${bodyText}`,
      ].filter(Boolean).join('\n');

      const { GoogleGenAI } = await import("@google/genai");
      const ai = new GoogleGenAI({ apiKey });

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: `Analyze this website content and extract a brand profile for social media marketing.

${siteSummary}

Return a JSON object with exactly these fields:
- "name": the brand/company name
- "description": 1-2 sentence summary of what they do and their value proposition
- "toneOfVoice": how the brand speaks (e.g. "playful and bold", "professional and reassuring")
- "audience": who their target customers are
- "topics": array of 5-6 short content pillar topics for social posts
- "colors": array of 2-3 hex color codes matching the brand's likely palette (infer from industry/vibe if unknown)`,
        config: { responseMimeType: "application/json" },
      });

      let jsonText = (response.text || '').trim();
      if (jsonText.startsWith('```')) {
        jsonText = jsonText.replace(/```json/gi, '').replace(/```/g, '').trim();
      }
      const brand = JSON.parse(jsonText);
      res.json({ brand });
    } catch (err: any) {
      console.error("Analyze Website Error:", err);
      let errorMsg = err.message || 'Failed to analyze website';
      if (errorMsg.includes('{"error":')) {
        try {
          const parsed = JSON.parse(errorMsg.substring(errorMsg.indexOf('{')));
          errorMsg = parsed.error?.message || errorMsg;
        } catch(e) {}
      }
      res.status(500).json({ error: `Website analysis failed: ${errorMsg}` });
    }
  });

  // API Route for Anthropic
  app.post("/api/anthropic", async (req, res) => {
    try {
      const apiKey = process.env.ANTHROPIC_API_KEY;
      
      if (!apiKey) {
        return res.status(500).json({ 
          error: "API key missing. Connect your Anthropic API key in the settings or .env file." 
        });
      }

      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
          "anthropic-dangerously-allow-browser": "true"
        },
        body: JSON.stringify(req.body)
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Anthropic API Error:", errorText);
        let errorMsg = "Failed to generate content.";
        try {
          const parsed = JSON.parse(errorText);
          errorMsg = `Anthropic API Error: ${parsed.error?.message || errorText}`;
        } catch(e) {
          errorMsg = `Anthropic API Error: ${errorText}`;
        }
        return res.status(response.status).json({ error: errorMsg });
      }

      const data = await response.json();
      res.json(data);
    } catch (err: any) {
      console.error(err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // API Route for Gemini Image
  app.post("/api/generate-image", async (req, res) => {
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
        return res.status(401).json({ error: "Your Gemini API key is set to 'MY_GEMINI_API_KEY'. Please open Settings (gear icon) -> Secrets, and DELETE the GEMINI_API_KEY to use the free key, or replace it with a valid key." });
      }
      const { prompt } = req.body;
      if (!prompt) return res.status(400).json({ error: "Prompt is required." });

      const { GoogleGenAI } = await import("@google/genai");
      const ai = new GoogleGenAI({ apiKey });

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts: [{ text: prompt }] },
        config: { imageConfig: { aspectRatio: "1:1" } },
      });

      let base64Image = null;
      if (response.candidates && response.candidates[0]?.content?.parts) {
        for (const part of response.candidates[0].content.parts) {
          if (part.inlineData) {
            base64Image = part.inlineData.data;
            break;
          }
        }
      }

      if (base64Image) {
        res.json({ imageUrl: `data:image/png;base64,${base64Image}` });
      } else {
        res.status(500).json({ error: "Failed to generate image." });
      }
    } catch (err: any) {
      console.error("Gemini Image Error:", err);
      let errorMsg = err.message || 'Failed to generate image';
      if (errorMsg.includes('{"error":')) {
        try {
          const parsed = JSON.parse(errorMsg.substring(errorMsg.indexOf('{')));
          errorMsg = parsed.error?.message || errorMsg;
        } catch(e) {}
      }
      res.status(500).json({ error: errorMsg });
    }
  });

  // API Route for Gemini TTS
  app.post("/api/generate-tts", async (req, res) => {
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
        return res.status(401).json({ error: "Your Gemini API key is set to 'MY_GEMINI_API_KEY'. Please open Settings (gear icon) -> Secrets, and DELETE the GEMINI_API_KEY to use the free key, or replace it with a valid key." });
      }
      const { text, voice = 'Kore' } = req.body;
      if (!text) return res.status(400).json({ error: "Text is required." });

      const { GoogleGenAI, Modality } = await import("@google/genai");
      const ai = new GoogleGenAI({ apiKey });

      const response = await ai.models.generateContent({
        model: "gemini-3.1-flash-tts-preview",
        contents: [{ parts: [{ text }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: voice as "Puck" | "Charon" | "Kore" | "Fenrir" | "Zephyr" } },
          },
        },
      });

      const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (base64Audio) {
        res.json({ audioUrl: `data:audio/wav;base64,${base64Audio}` });
      } else {
        res.status(500).json({ error: "Failed to generate TTS." });
      }
    } catch (err: any) {
      console.error("Gemini TTS Error:", err);
      let errorMsg = err.message || 'Failed to generate TTS';
      if (errorMsg.includes('{"error":')) {
        try {
          const parsed = JSON.parse(errorMsg.substring(errorMsg.indexOf('{')));
          errorMsg = parsed.error?.message || errorMsg;
        } catch(e) {}
      }
      res.status(500).json({ error: errorMsg });
    }
  });

  // API Route for Video Proxy
  app.get("/api/video-proxy", async (req, res) => {
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      const { url } = req.query;
      if (!url || typeof url !== 'string') return res.status(400).send('URL required.');
      
      const response = await fetch(url, {
        method: 'GET',
        headers: { 'x-goog-api-key': apiKey || '' }
      });

      if (!response.ok) {
        return res.status(response.status).send('Failed to fetch video.');
      }

      const contentType = response.headers.get('content-type') || 'video/mp4';
      res.setHeader('Content-Type', contentType);
      
      if (response.body) {
        const { Readable } = await import('stream');
        const readable = Readable.fromWeb(response.body as any);
        readable.pipe(res);
      } else {
        res.status(500).send("No video body returned.");
      }
    } catch (err: any) {
      console.error("Video proxy error:", err);
      res.status(500).send("Video proxy error");
    }
  });

  // API Route for Google Veo Video
  app.post("/api/generate-video", async (req, res) => {
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
        return res.status(401).json({ error: "Your Gemini API key is set to 'MY_GEMINI_API_KEY'. Please open Settings (gear icon) -> Secrets, and DELETE the GEMINI_API_KEY to use the free key, or replace it with a valid key." });
      }

      const { prompt } = req.body;
      if (!prompt) return res.status(400).json({ error: "Prompt is required." });

      let aspectRatio: "16:9" | "9:16" = "16:9";
      if (prompt.includes("9:16")) aspectRatio = "9:16";

      const { GoogleGenAI } = await import("@google/genai");
      const ai = new GoogleGenAI({ apiKey });

      let operation = await ai.models.generateVideos({
        model: 'veo-3.1-lite-generate-preview',
        prompt,
        config: {
          numberOfVideos: 1,
          resolution: '1080p',
          aspectRatio
        }
      });

      // Poll for completion
      while (!operation.done) {
        await new Promise(resolve => setTimeout(resolve, 10000));
        operation = await ai.operations.getVideosOperation({ operation });
      }

      const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
      if (downloadLink) {
        res.json({ videoUrl: `/api/video-proxy?url=${encodeURIComponent(downloadLink)}` });
      } else {
        res.status(500).json({ error: "Failed to generate video (no URI returned)." });
      }
    } catch (err: any) {
      console.error("Veo Error:", err);
      let errorMsg = err.message || 'Failed to generate video';
      if (errorMsg.includes('{"error":')) {
        try {
          const parsed = JSON.parse(errorMsg.substring(errorMsg.indexOf('{')));
          errorMsg = parsed.error?.message || errorMsg;
        } catch(e) {}
      }
      res.status(500).json({ error: errorMsg });
    }
  });
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Production serving
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
