import React, { useState, useEffect } from 'react';
import { Layers, Film, PenLine, Smartphone, AlertCircle, Copy, CalendarPlus, RefreshCw, Send, CheckCircle2, Sparkles, Lightbulb, Download } from 'lucide-react';

interface ContentGeneratorProps {
  onSchedule: (postData: any) => void;
  initialData?: any;
}

type Pillar = 'AI Systems' | 'Results & Proof' | 'Education' | 'Behind the Brand' | 'Offers & CTAs';
type Format = 'carousel' | 'video' | 'caption' | 'story';

interface GeneratedSlide {
  h: string;
  b: string;
}

const CAROUSEL_TEMPLATES = [
  { name: "Carousel Style 1", url: "https://www.canva.com/design/DAHHt3XhSM4/aCIIxonNL9Qf7vjjeu6-_A/edit?continue_in_browser=true&ui=eyJEIjp7IlEiOnsiQSI6dHJ1ZX19fQ" },
  { name: "Carousel Style 2", url: "https://www.canva.com/design/DAHHt9rtPMs/zJV5f5dw6cMpEMcb6F54EQ/edit?continue_in_browser=true&ui=eyJEIjp7IlEiOnsiQSI6dHJ1ZX19fQ" },
  { name: "Carousel Style 3", url: "https://www.canva.com/design/DAHHt-pbXNA/6d_ydK85x4JyNY-N4a6icw/edit?continue_in_browser=true&ui=eyJEIjp7IlEiOnsiQSI6dHJ1ZX19fQ" },
  { name: "Carousel Style 4", url: "https://www.canva.com/design/DAHHt3qtzk4/0voE_IDNAQhIr3w_pdGndQ/edit?continue_in_browser=true&ui=eyJEIjp7IlEiOnsiQSI6dHJ1ZX19fQ" }
];

const REELS_TEMPLATES = [
  { name: "Reels Master 1", url: "https://www.canva.com/design/DAHHt7udPtc/VWm3JI_8jYUWkoqcnsliVg/edit?continue_in_browser=true&ui=eyJEIjp7IlEiOnsiQSI6dHJ1ZX19fQ" },
  { name: "Reels Master 2", url: "https://www.canva.com/design/DAHHt5Ll-bs/5epA7KIZGUS09XMcUvgFyg/edit?continue_in_browser=true&ui=eyJEIjp7IlEiOnsiQSI6dHJ1ZX19fQ" }
];

interface ContentTemplate {
  id: string;
  name: string;
  pillar: Pillar;
  format: Format;
  platform: string;
  cta: string;
  context: string;
  topic: string;
}

export function ContentGenerator({ onSchedule, initialData }: ContentGeneratorProps) {
  const [pillar, setPillar] = useState<Pillar>('AI Systems');
  const [format, setFormat] = useState<Format>('carousel');
  const [topic, setTopic] = useState('');
  const [platform, setPlatform] = useState('Instagram');
  const [cta, setCta] = useState('Bio link — freebie');
  const [context, setContext] = useState('');
  const [scheduleDate, setScheduleDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [scheduleTime, setScheduleTime] = useState('08:00');
  const [recurring, setRecurring] = useState('none');
  
  const [savedTemplates, setSavedTemplates] = useState<ContentTemplate[]>(() => {
    try {
      const saved = localStorage.getItem('renx_templates');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [showSaveTemplateModal, setShowSaveTemplateModal] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState('');
  const [templateFilter, setTemplateFilter] = useState('All');
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [resultText, setResultText] = useState('');
  const [captionOptions, setCaptionOptions] = useState<string[]>([]);
  const [selectedCaptionIndex, setSelectedCaptionIndex] = useState(0);
  const [slides, setSlides] = useState<GeneratedSlide[]>([]);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [videoHook, setVideoHook] = useState('');
  const [toast, setToast] = useState('');
  
  const [isGeneratingIdeas, setIsGeneratingIdeas] = useState(false);
  const [suggestedIdeas, setSuggestedIdeas] = useState<string[]>([]);

  useEffect(() => {
    if (initialData) {
      if (initialData.topic) setTopic(initialData.topic);
      if (initialData.platform) setPlatform(initialData.platform);
      if (initialData.format) setFormat(initialData.format as Format);
      // We could also trigger generation automatically if desired
    }
  }, [initialData]);

  const pillars: Pillar[] = ['AI Systems', 'Results & Proof', 'Education', 'Behind the Brand', 'Offers & CTAs'];

  
  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const handleSaveTemplate = () => {
    if (!newTemplateName.trim()) {
      showToast('⚠ Enter a template name');
      return;
    }
    const newTemplate: ContentTemplate = {
      id: Date.now().toString(),
      name: newTemplateName.trim(),
      pillar,
      format,
      platform,
      cta,
      context,
      topic
    };
    const updated = [...savedTemplates, newTemplate];
    setSavedTemplates(updated);
    localStorage.setItem('renx_templates', JSON.stringify(updated));
    setNewTemplateName('');
    setShowSaveTemplateModal(false);
    showToast(`✅ Template "${newTemplate.name}" saved!`);
  };

  const handleLoadTemplate = (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (!e.target.value) return;
    const tpl = savedTemplates.find(t => t.id === e.target.value);
    if (!tpl) return;
    setPillar(tpl.pillar);
    setFormat(tpl.format);
    setPlatform(tpl.platform);
    setCta(tpl.cta);
    setContext(tpl.context);
    setTopic(tpl.topic);
    showToast(`Loaded Template: ${tpl.name}`);
  };

  const generateIdeas = async () => {
    setIsGeneratingIdeas(true);
    try {
      const prompt = `You are a social media strategist for RennXAI. Brainstorm 5 compelling content topics/hooks for the "${pillar}" pillar. Focus on AI systems, business automation, and solopreneurs. Provide JUST the 5 topics as a JSON array of strings, nothing else.`;
      
      const response = await fetch('/api/generate-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error);

      let text = data.text || '';
      
      try {
        const cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim();
        const parsed = JSON.parse(cleaned);
        if (Array.isArray(parsed)) {
          setSuggestedIdeas(parsed);
        } else {
          throw new Error('Not an array');
        }
      } catch {
        const split = text.split('\n').map((s: string) => s.replace(/^\d+\.\s*|^- /, '').trim()).filter(Boolean);
        setSuggestedIdeas(split.slice(0, 5));
      }
    } catch (err) {
      console.error(err);
      setSuggestedIdeas([
        "How I automated 80% of my client onboarding",
        "Stop hiring VAs before you build the system",
        "The exact AI stack we use to run a 6-figure studio",
        "Why 'working harder' is actually hurting your business",
        "3 AI prompts that save me 5 hours every week"
      ]);
    } finally {
      setIsGeneratingIdeas(false);
    }
  };

  const generateContent = async () => {
    if (!topic) {
      showToast('⚠ Enter a topic or hook first');
      return;
    }
    setIsGenerating(true);

    const voiceRules = `You are the AI Social Media Manager for RennXAI — an AI-powered brand and business systems studio. Voice: Direct. Confident. Practical. Systems-minded. Faith-anchored when relevant. NEVER use: therapy jargon, inspirational fluff, victim narratives, the word "green" in visuals. ALWAYS use one specific CTA. Anchor brand: RennXAI. Pillar: ${pillar}. Platform: ${platform}. CTA: ${cta}.`;

    let prompt = '';
    if (format === 'carousel') {
      prompt = `${voiceRules}\n\nCreate a 6-slide Instagram carousel for RennXAI on this topic: "${topic}". ${context ? 'Extra context: ' + context : ''}\n\nReturn in this exact format:\nSLIDE 1 HEADLINE: [hook — max 8 words]\nSLIDE 1 BODY: [1-2 sentences]\nSLIDE 2 HEADLINE: [point 1 — max 8 words]\nSLIDE 2 BODY: [2-3 sentences]\nSLIDE 3 HEADLINE: [point 2 — max 8 words]\nSLIDE 3 BODY: [2-3 sentences]\nSLIDE 4 HEADLINE: [point 3 — max 8 words]\nSLIDE 4 BODY: [2-3 sentences]\nSLIDE 5 HEADLINE: [the truth/system — max 8 words]\nSLIDE 5 BODY: [2-3 sentences]\nSLIDE 6 HEADLINE: [CTA slide — max 6 words]\nSLIDE 6 BODY: [CTA + ${cta}]\n\nGenerate 3 completely distinct variations of the caption. Format exactly as:\nCAPTION 1:\n[Full caption variation 1 with Hook → Truth → Value → single CTA]... #hashtags\n\nCAPTION 2:\n[...]\n\nCAPTION 3:\n[...]`;
    } else if (format === 'video') {
      prompt = `${voiceRules}\n\nWrite a 30-second video script for ${platform} on: "${topic}". ${context ? 'Extra context: ' + context : ''}\n\nFormat:\nHOOK (0-3s): [attention-stopping opening — max 10 words]\nPROBLEM (3-8s): [the real situation]\nVALUE (8-20s): [what RennXAI does/how it works — 2-3 points]\nCTA (20-30s): [single clear action: ${cta}]\n\nGenerate 3 completely distinct variations of the caption. Format exactly as:\nCAPTION 1:\n[Platform-optimized caption 1]... #hashtags\n\nCAPTION 2:\n[...]\n\nCAPTION 3:\n[...]`;
    } else if (format === 'caption') {
      prompt = `${voiceRules}\n\nWrite a ${platform} caption for RennXAI on: "${topic}". ${context ? 'Extra context: ' + context : ''}\n\nGenerate 3 completely distinct variations of the caption. Format exactly as:\nCAPTION 1:\n[Hook → Truth → Value → CTA 1]\n\nCAPTION 2:\n[...]\n\nCAPTION 3:\n[...]`;
    } else if (format === 'story') {
      prompt = `${voiceRules}\n\nWrite a 5-frame Instagram Story sequence for RennXAI on: "${topic}". ${context ? 'Extra context: ' + context : ''}\n\nFrame 1 HOOK: [bold statement]\nFrame 2 PROBLEM: [name the pain point]\nFrame 3 INSIGHT: [key truth or system]\nFrame 4 PROOF: [result or evidence]\nFrame 5 CTA: [${cta}]\n\nGenerate 3 completely distinct variations of an accompanying text/caption (if needed for the first frame, or to accompany the sequence). Format exactly as:\nCAPTION 1:\n[Variation 1]\n\nCAPTION 2:\n[...]\n\nCAPTION 3:\n[...]`;
    }

    try {
      const response = await fetch('/api/generate-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt })
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate');
      }

      const text = data.text || '';
      processOutput(text, topic);
      showToast('✦ Content generated successfully');
    } catch (err) {
      console.error(err);
      // Fallback to sample content
      const sample = buildSampleContent(topic, cta);
      processOutput(sample.text, topic, sample.slides);
      showToast('✦ Demo mode — Connect API for live generation');
    } finally {
      setIsGenerating(false);
    }
  };

  const buildSampleContent = (topicStr: string, ctaStr: string) => {
    const t = topicStr || 'AI is changing how solopreneurs work';
    const sampleSlides = [
      { h: t.length > 40 ? t.substring(0, 40) + '...' : t, b: 'Most people are still doing this manually. That ends today.' },
      { h: 'The real problem no one talks about', b: 'Manual admin work is stealing 20+ hours a week from solopreneurs. That\'s not a productivity problem. It\'s a systems problem.' },
      { h: 'Here\'s what the system looks like', b: 'RennXAI builds AI-powered brand and business systems that replace manual workflows — in 2-3 weeks, not months.' },
      { h: 'What clients get instead', b: 'A done-for-you system running 24/7. No more chasing leads, writing from scratch, or burning out managing admin.' },
      { h: 'This is not about hustle', b: 'It\'s about building a workflow that works without you. Philippians 4:6 — be anxious for nothing. Build the system. Trust the process.' },
      { h: 'Ready to build yours?', b: ctaStr + ' — link in bio or DM "START" right now.' },
    ];
    const baseText = sampleSlides.map((s, i) => `SLIDE ${i + 1} HEADLINE: ${s.h}\nSLIDE ${i + 1} BODY: ${s.b}`).join('\n');
    const text = baseText + 
      `\n\nCAPTION 1:\n${t} — and most people have no idea where to start.\n\nThat's the gap RennXAI exists to close.\n\nWe build AI-powered systems for solopreneurs who are tired of doing everything manually.\n\n→ ${ctaStr}\n\n#RennXAI` +
      `\n\nCAPTION 2:\nTired of doing everything manually?\n\n${t} and you need to adapt.\n\nHere is how RennXAI can help you automate your workflows.\n\n→ ${ctaStr}\n\n#RennXAI #Automation` +
      `\n\nCAPTION 3:\nThe old way: manual admin work.\n\nThe new way: ${t}.\n\nRennXAI builds systems that run 24/7 so you don't have to.\n\n→ ${ctaStr}\n\n#RennXAI #Systems`;
    return { text, slides: sampleSlides };
  };

  const processOutput = (text: string, originalTopic: string, prebuiltSlides?: GeneratedSlide[]) => {
    // Extract captions if present
    const caps: string[] = [];
    const splits = text.split(/CAPTION \d+:/i);
    let mainResultText = splits[0].trim();
    if (splits.length > 1) {
      for (let i = 1; i < splits.length; i++) {
        const cap = splits[i].trim();
        if (cap) caps.push(cap);
      }
    } else {
        const capMatch = text.match(/Caption:?\s*([\s\S]+)/i);
        if(capMatch) {
            caps.push(capMatch[1].trim());
            mainResultText = text.replace(/Caption:?\s*([\s\S]+)/i, '').trim();
        }
    }
    
    setCaptionOptions(caps);
    setSelectedCaptionIndex(0);
    setResultText(mainResultText); 

    if (format === 'carousel') {
      let parsedSlides = prebuiltSlides || [];
      if (!parsedSlides.length) {
        const headlines = [...text.matchAll(/SLIDE \d+ HEADLINE:\s*(.+)/gi)].map(m => m[1]);
        const bodies = [...text.matchAll(/SLIDE \d+ BODY:\s*(.+)/gi)].map(m => m[1]);
        parsedSlides = headlines.map((h, i) => ({ h, b: bodies[i] || '' }));
      }
      if (!parsedSlides.length) parsedSlides = [{ h: originalTopic, b: 'Generated content' }];
      setSlides(parsedSlides);
      setCurrentSlide(0);
    } else if (format === 'video') {
      const hookMatch = text.match(/HOOK.*?:\s*(.+)/i);
      setVideoHook(hookMatch ? hookMatch[1].replace(/\[|\]/g,'') : originalTopic);
    } else {
      setSlides([{ h: originalTopic, b: text.substring(0, 120) + '...' }]);
      setCurrentSlide(0);
    }

    try {
      const saved = localStorage.getItem('renx_content_history');
      const history = saved ? JSON.parse(saved) : [];
      history.unshift({
        id: Date.now().toString(),
        topic: originalTopic,
        format,
        platform,
        resultText: text,
        createdAt: new Date().toISOString()
      });
      localStorage.setItem('renx_content_history', JSON.stringify(history));
    } catch(err) {
      console.error('Failed to save to history', err);
    }
  };

  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [generatedImageUrl, setGeneratedImageUrl] = useState('');
  
  const [isGeneratingVoice, setIsGeneratingVoice] = useState(false);
  const [generatedVoiceUrl, setGeneratedVoiceUrl] = useState('');

  const [isGeneratingVeo, setIsGeneratingVeo] = useState(false);
  const [generatedVeoUrl, setGeneratedVeoUrl] = useState('');
  const [veoPrompt, setVeoPrompt] = useState('');
  const [videoStyle, setVideoStyle] = useState('Cinematic');
  const [videoAspectRatio, setVideoAspectRatio] = useState('9:16');
  const [videoDuration, setVideoDuration] = useState('15s');

  const [isAnimPlaying, setIsAnimPlaying] = useState(false);
  const [animIndex, setAnimIndex] = useState(0);
  const [animSequence, setAnimSequence] = useState<string[]>([]);
  
  const [carouselTemplateIdx, setCarouselTemplateIdx] = useState(0);
  const [reelsTemplateIdx, setReelsTemplateIdx] = useState(0);
  
  const [animType, setAnimType] = useState('css');
  const [animSpeed, setAnimSpeed] = useState('normal');

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isAnimPlaying && animSequence.length > 0) {
      const speedMs = animSpeed === 'fast' ? 1200 : animSpeed === 'slow' ? 4000 : 2500;
      interval = setInterval(() => {
        setAnimIndex((prev) => {
          if (prev + 1 >= animSequence.length) {
            setIsAnimPlaying(false);
            return 0; // reset
          }
          return prev + 1;
        });
      }, speedMs);
    }
    return () => clearInterval(interval);
  }, [isAnimPlaying, animSequence, animSpeed]);

  const handlePlayTypographicVideo = () => {
    if (!resultText) return;
    const seq = [];
    if (videoHook) seq.push(videoHook);
    slides.forEach(s => {
      if (s.h) seq.push(s.h);
      if (s.b) seq.push(s.b);
    });
    if (cta) seq.push(cta);
    
    setAnimSequence(seq.filter(Boolean).map(text => text.substring(0, 120) + (text.length > 120 ? '...' : '')));
    setAnimIndex(0);
    setIsAnimPlaying(true);
  };

  const handleGenerateVeoVideo = async () => {
    if (!resultText) {
      showToast('Generate content first');
      return;
    }
    setIsGeneratingVeo(true);
    setGeneratedVeoUrl('');
    try {
      const prompt = veoPrompt.trim() || `High quality ${videoStyle.toLowerCase()} video for social media: ${topic}. 1080p resolution, smooth motion.`;
      const res = await fetch('/api/generate-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: `${prompt} The video aspect ratio should be ${videoAspectRatio} and duration should be approximately ${videoDuration}.` })
      });
      const data = await res.json();
      if (res.ok && data.videoUrl) {
        setGeneratedVeoUrl(data.videoUrl);
        showToast('Veo Video generated successfully');
      } else {
        throw new Error(data.error);
      }
    } catch (err: any) {
      console.error(err);
      showToast(err.message || 'Failed to generate Veo video.');
    } finally {
      setIsGeneratingVeo(false);
    }
  };

  const handleGenerateImage = async () => {
    if (!resultText) {
      showToast('Generate content first');
      return;
    }
    setIsGeneratingImage(true);
    try {
      const prompt = `Realistic high quality editorial photograph for social media representing: ${topic}. Cinematic lighting.`;
      const res = await fetch('/api/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt })
      });
      const data = await res.json();
      if (res.ok && data.imageUrl) {
        setGeneratedImageUrl(data.imageUrl);
        showToast('Image generated successfully');
      } else {
        throw new Error(data.error);
      }
    } catch (err: any) {
      console.error(err);
      showToast(err.message || 'Failed to generate image. Please use a valid API key.');
    } finally {
      setIsGeneratingImage(false);
    }
  };

  const handleGenerateVoiceover = async () => {
    if (!resultText) {
      showToast('Generate content first');
      return;
    }
    setIsGeneratingVoice(true);
    try {
      // Just extract a short snippet for TTS or use the hook
      let textToRead = videoHook || topic || "This is a great piece of content from RennXAI.";
      const res = await fetch('/api/generate-tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: textToRead, voice: 'Kore' })
      });
      const data = await res.json();
      if (res.ok && data.audioUrl) {
        setGeneratedVoiceUrl(data.audioUrl);
        showToast('Voiceover generated successfully');
      } else {
        throw new Error(data.error);
      }
    } catch (err: any) {
      console.error(err);
      showToast(err.message || 'Failed to generate voiceover. Please use a valid API key.');
    } finally {
      setIsGeneratingVoice(false);
    }
  };

  const handleDownloadVideo = () => {
    if (!generatedVeoUrl) return;
    const a = document.createElement('a');
    a.href = generatedVeoUrl;
    a.download = `rennxai_video_${Date.now()}.mp4`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    showToast('Video download started');
  };

  const handleCopy = () => {
    const textToCopy = captionOptions.length > 0
      ? (resultText ? resultText + '\n\n' : '') + 'Caption:\n' + captionOptions[selectedCaptionIndex]
      : resultText;
    navigator.clipboard.writeText(textToCopy);
    showToast('📋 Copied to clipboard');
  };

  const handleSchedule = () => {
    showToast(initialData ? `📅 Updated → Slack #rxai-content` : `📅 Scheduled → Slack #rxai-content`);
    setTimeout(() => {
      let formatRecurring = recurring !== 'none' ? ` (${recurring})` : '';
      onSchedule({
        topic,
        platform,
        format,
        dateStr: `${scheduleDate} at ${scheduleTime}${formatRecurring}`,
      });
    }, 1000);
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[1fr_380px] gap-6 items-start pb-20">
      
      {/* LEFT: INPUT */}
      <div className="glass-card rounded-xl overflow-hidden relative">
        <div className="px-6 py-4 border-b border-renx-border flex items-center justify-between">
          <div className="font-heading text-[13px] font-bold text-renx-navy tracking-[0.02em] flex items-center gap-2">
            <Sparkles size={16} className="text-renx-blue" /> Generate Content
          </div>
          <div className="flex items-center gap-2">
            {savedTemplates.length > 0 && (
              <select
                value={templateFilter}
                onChange={(e) => setTemplateFilter(e.target.value)}
                className="px-2 py-1 text-[11px] font-semibold text-renx-gray bg-white border border-renx-border rounded-md focus:outline-none focus:border-renx-blue transition-colors max-w-[100px]"
              >
                <option value="All">All Platforms</option>
                {Array.from(new Set(savedTemplates.map(t => t.platform))).filter(Boolean).map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            )}
            <select 
              onChange={handleLoadTemplate}
              className="px-2.5 py-1 text-[11px] font-semibold text-renx-dark bg-renx-surface border-1.5 border-renx-border rounded-md focus:outline-none focus:border-renx-blue transition-colors max-w-[120px]"
            >
              <option value="">Load Template...</option>
              {savedTemplates
                .filter(t => templateFilter === 'All' || t.platform === templateFilter)
                .map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
            <button 
              onClick={() => setShowSaveTemplateModal(true)}
              className="inline-flex items-center px-3 py-1 bg-gradient-to-br from-[#7B2FBE] to-[#4353FF] hover:opacity-90 rounded-md text-[10px] font-bold text-white tracking-[0.04em] transition-opacity cursor-pointer"
            >
              Save As Template
            </button>
          </div>
        </div>

        {showSaveTemplateModal && (
          <div className="absolute top-14 right-6 bg-white border border-renx-border shadow-xl rounded-lg p-4 z-20 w-[240px] animate-in fade-in zoom-in duration-200">
            <label className="block text-[10.5px] font-bold text-renx-gray uppercase tracking-[0.06em] mb-2 text-left">Template Name</label>
            <input 
              type="text" 
              value={newTemplateName}
              onChange={e => setNewTemplateName(e.target.value)}
              placeholder="e.g. Weekly Tip Carousel"
              className="w-full px-3 py-1.5 text-[12px] border border-renx-border rounded bg-renx-surface focus:outline-none focus:border-renx-blue mb-3"
            />
            <div className="flex gap-2">
              <button onClick={() => setShowSaveTemplateModal(false)} className="flex-1 py-1.5 text-[11px] font-semibold text-renx-gray hover:text-renx-dark transition-colors">Cancel</button>
              <button onClick={handleSaveTemplate} className="flex-1 py-1.5 bg-renx-blue text-white text-[11px] font-semibold rounded hover:bg-[#185a8c] transition-colors">Save</button>
            </div>
          </div>
        )}
        
        <div className="p-6">
          <div className="font-heading text-[11px] font-bold text-renx-gray tracking-[0.1em] uppercase mb-3 text-left">Content Pillar</div>
          <div className="flex flex-wrap gap-2 mb-6 text-left">
            {pillars.map(p => (
              <button
                key={p}
                onClick={() => setPillar(p)}
                className={`px-3.5 py-1.5 rounded-full text-[11.5px] font-semibold transition-colors font-heading border-1.5
                  ${pillar === p 
                    ? 'border-renx-blue text-renx-blue bg-renx-blue/5' 
                    : 'border-renx-border text-renx-gray hover:border-renx-slate'}`}
              >
                {p}
              </button>
            ))}
          </div>

          <div className="font-heading text-[11px] font-bold text-renx-gray tracking-[0.1em] uppercase mb-3 text-left">Format</div>
          <div className="grid grid-cols-2 gap-2.5 mb-6">
            <button onClick={() => setFormat('carousel')} className={`border-1.5 p-3.5 rounded-[10px] text-center transition-colors ${format === 'carousel' ? 'border-renx-blue bg-renx-blue/5' : 'border-renx-border hover:border-renx-blue/30'}`}>
              <Layers size={22} className="mx-auto mb-1.5 text-renx-navy" />
              <div className="font-heading text-[11.5px] font-bold text-renx-navy mb-0.5">Carousel</div>
              <div className="text-[10px] text-renx-gray">Canva template · 5–10 slides</div>
            </button>
            <button onClick={() => setFormat('video')} className={`border-1.5 p-3.5 rounded-[10px] text-center transition-colors ${format === 'video' ? 'border-renx-blue bg-renx-blue/5' : 'border-renx-border hover:border-renx-blue/30'}`}>
              <Film size={22} className="mx-auto mb-1.5 text-renx-navy" />
              <div className="font-heading text-[11.5px] font-bold text-renx-navy mb-0.5">Video Script</div>
              <div className="text-[10px] text-renx-gray">TikTok · Reels · Shorts</div>
            </button>
            <button onClick={() => setFormat('caption')} className={`border-1.5 p-3.5 rounded-[10px] text-center transition-colors ${format === 'caption' ? 'border-renx-blue bg-renx-blue/5' : 'border-renx-border hover:border-renx-blue/30'}`}>
              <PenLine size={22} className="mx-auto mb-1.5 text-renx-navy" />
              <div className="font-heading text-[11.5px] font-bold text-renx-navy mb-0.5">Caption</div>
              <div className="text-[10px] text-renx-gray">Hook → Truth → CTA</div>
            </button>
            <button onClick={() => setFormat('story')} className={`border-1.5 p-3.5 rounded-[10px] text-center transition-colors ${format === 'story' ? 'border-renx-blue bg-renx-blue/5' : 'border-renx-border hover:border-renx-blue/30'}`}>
              <Smartphone size={22} className="mx-auto mb-1.5 text-renx-navy" />
              <div className="font-heading text-[11.5px] font-bold text-renx-navy mb-0.5">Story Sequence</div>
              <div className="text-[10px] text-renx-gray">Instagram · Facebook</div>
            </button>
          </div>

          <div className="font-heading text-[11px] font-bold text-renx-gray tracking-[0.1em] uppercase mb-4 text-left">Content Brief</div>
          
          <label className="block text-[11.5px] font-semibold text-renx-gray tracking-[0.06em] uppercase mb-1.5 text-left">Topic / Hook</label>
          <input 
            type="text" 
            value={topic}
            onChange={e => setTopic(e.target.value)}
            placeholder="e.g. AI replaced my admin work in 3 weeks"
            className="w-full px-3.5 py-2.5 border-1.5 border-renx-border rounded-lg text-[13.5px] text-renx-dark bg-white focus:outline-none focus:border-renx-blue transition-colors mb-2"
          />
          <div className="mb-4 text-left">
            <button 
              onClick={generateIdeas} 
              disabled={isGeneratingIdeas}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-renx-surface border border-renx-border rounded-md text-[11px] font-bold text-renx-dark hover:border-renx-blue hover:text-renx-blue transition-colors disabled:opacity-50"
            >
              {isGeneratingIdeas ? <RefreshCw className="animate-spin" size={14} /> : <Lightbulb size={14} />}
              Get Content Ideas
            </button>
            
            {suggestedIdeas.length > 0 && (
              <div className="mt-3">
                <div className="text-[10px] font-bold text-renx-gray mb-1.5 uppercase tracking-[0.05em]">Suggested Topics (Click to select):</div>
                <div className="flex flex-col gap-1.5">
                  {suggestedIdeas.map((idea, i) => (
                    <button
                      key={i}
                      onClick={() => { setTopic(idea); setSuggestedIdeas([]); }}
                      className="text-left px-3 py-2 bg-renx-blue/5 border border-renx-blue/20 rounded-md text-[12.5px] text-renx-navy hover:bg-renx-blue/10 transition-colors"
                    >
                      {idea}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3.5 mb-4">
            <div>
              <label className="block text-[11.5px] font-semibold text-renx-gray tracking-[0.06em] uppercase mb-1.5 text-left">Platform</label>
              <select 
                value={platform}
                onChange={e => setPlatform(e.target.value)}
                className="w-full px-3.5 py-2.5 border-1.5 border-renx-border rounded-lg text-[13.5px] text-renx-dark bg-white focus:outline-none focus:border-renx-blue transition-colors"
              >
                <option>Instagram</option>
                <option>TikTok</option>
                <option>Facebook</option>
                <option>LinkedIn</option>
              </select>
            </div>
            <div>
              <label className="block text-[11.5px] font-semibold text-renx-gray tracking-[0.06em] uppercase mb-1.5 text-left">CTA</label>
              <select 
                value={cta}
                onChange={e => setCta(e.target.value)}
                className="w-full px-3.5 py-2.5 border-1.5 border-renx-border rounded-lg text-[13.5px] text-renx-dark bg-white focus:outline-none focus:border-renx-blue transition-colors"
              >
                <option>Bio link — freebie</option>
                <option>DM "START"</option>
                <option>Comment below</option>
                <option>Save this post</option>
                <option>Share with someone</option>
              </select>
            </div>
          </div>

          <label className="block text-[11.5px] font-semibold text-renx-gray tracking-[0.06em] uppercase mb-1.5 text-left">Additional Context (optional)</label>
          <textarea 
            value={context}
            onChange={e => setContext(e.target.value)}
            placeholder="Any specific points, stats, or angles to include..."
            className="w-full px-3.5 py-2.5 border-1.5 border-renx-border rounded-lg text-[13.5px] text-renx-dark bg-white focus:outline-none focus:border-renx-blue transition-colors min-h-[80px] resize-y mb-4"
          ></textarea>

          <div className="flex gap-2.5">
            <button 
              onClick={generateContent}
              disabled={isGenerating}
              className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-renx-action text-white rounded-lg font-heading text-[12.5px] font-bold tracking-[0.03em] hover:opacity-90 transition-all disabled:opacity-50 shadow-[0_4px_16px_rgba(10,147,246,0.3)] hover:shadow-[0_6px_24px_rgba(10,147,246,0.4)]"
            >
              {isGenerating ? <RefreshCw className="animate-spin" size={16} /> : <Sparkles size={16} />}
              {isGenerating ? 'Generating...' : 'Generate Content'}
            </button>
            <button 
              onClick={() => { setTopic(''); setContext(''); setResultText(''); setCaptionOptions([]); }}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 border-1.5 border-renx-border text-renx-dark rounded-lg font-heading text-[12.5px] font-bold tracking-[0.03em] hover:border-renx-action hover:text-renx-action transition-colors"
            >
              Clear
            </button>
          </div>

          {resultText || captionOptions.length > 0 ? (
            <div className="mt-6 animation-fade-in">
              <div className="bg-renx-surface border-1.5 border-renx-border rounded-[10px] p-4 relative text-left">
                <div className="font-heading text-[10px] font-bold text-renx-blue tracking-[0.1em] uppercase mb-2">
                  Generated Output {captionOptions.length > 0 && format !== 'caption' ? '(Script/Slides)' : ''}
                </div>
                {resultText && format !== 'caption' && (
                  <div className="text-[13px] text-renx-dark font-sans leading-[1.65] whitespace-pre-wrap">
                    {resultText}
                  </div>
                )}
                
                {captionOptions.length > 0 && (
                  <div className={format !== 'caption' && resultText ? "mt-4 pt-4 border-t border-renx-border" : ""}>
                    <div className="flex justify-between items-center mb-3">
                      <div className="font-heading text-[10px] font-bold text-renx-blue tracking-[0.1em] uppercase">
                        Caption Variations
                      </div>
                      <div className="flex gap-2">
                         {captionOptions.map((_, idx) => (
                           <button 
                             key={idx}
                             onClick={() => setSelectedCaptionIndex(idx)}
                             className={`px-2.5 py-1 text-[10px] font-bold rounded-md transition-colors ${selectedCaptionIndex === idx ? 'bg-renx-blue text-white' : 'bg-renx-border text-renx-dark text-opacity-70 hover:bg-renx-blue/20'}`}
                           >
                             Option {idx + 1}
                           </button>
                         ))}
                      </div>
                    </div>
                    <div className="text-[13px] text-renx-dark font-sans leading-[1.65] whitespace-pre-wrap">
                      {captionOptions[selectedCaptionIndex]}
                    </div>
                  </div>
                )}

                <button 
                  onClick={handleCopy}
                  className="mt-4 inline-flex items-center gap-1.5 text-[11px] font-semibold text-renx-blue hover:underline"
                >
                  <Copy size={12} /> Copy to clipboard
                </button>
              </div>

              <div className="flex gap-2.5 mt-3">
                <button 
                  onClick={handleSchedule}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-renx-navy text-white rounded-lg font-heading text-[12.5px] font-bold tracking-[0.03em] hover:bg-[#0a1f38] transition-colors"
                >
                  <CalendarPlus size={16} /> {initialData ? 'Update Scheduled Post' : 'Add to Schedule'}
                </button>
                <button 
                  onClick={generateContent}
                  className="inline-flex flex-1 items-center justify-center gap-2 px-5 py-2.5 border-1.5 border-renx-border text-renx-dark rounded-lg font-heading text-[12.5px] font-bold tracking-[0.03em] hover:border-renx-blue hover:text-renx-blue transition-colors"
                >
                  <RefreshCw size={16} /> Regenerate
                </button>
              </div>
            </div>
          ) : null}

        </div>
      </div>

      {/* RIGHT: PREVIEW */}
      <div className="glass-card rounded-xl overflow-hidden sticky top-6">
        <div className="px-6 py-4 border-b border-renx-border flex items-center justify-between">
          <div className="font-heading text-[13px] font-bold text-renx-navy tracking-[0.02em]">Live Preview</div>
          <div className="text-[11px] text-renx-gray capitalize">{format}</div>
        </div>
        <div className="p-6 text-left">
          
          <div className="bg-renx-surface rounded-xl min-h-[300px] flex items-center justify-center mb-6 relative overflow-hidden">
            
            {!resultText && (
              <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center">
                <div className={`relative mb-6 shadow-xl ${format === 'video' || format === 'story' ? 'w-[160px] h-[284px] rounded-xl bg-gradient-to-b from-gray-800 to-black border border-gray-700' : 'w-[200px] h-[200px] rounded-xl bg-gradient-to-br from-gray-50 to-white border border-gray-200'}`}>
                  {/* Minimalistic placeholders */}
                  {(format === 'video' || format === 'story') ? (
                    <div className="absolute inset-0 flex flex-col pt-12 px-4 pb-6">
                      <div className="w-full h-4 bg-white/20 rounded mb-2"></div>
                      <div className="w-3/4 h-4 bg-white/20 rounded mb-auto"></div>
                      
                      <div className="flex gap-2 mb-4 justify-end items-end w-full">
                        <div className="flex flex-col gap-2">
                           <div className="w-8 h-8 rounded-full bg-white/20"></div>
                           <div className="w-8 h-8 rounded-full bg-white/20"></div>
                        </div>
                      </div>
                      
                      <div className="w-2/3 h-3 bg-white/30 rounded mb-2"></div>
                      <div className="w-full h-2 bg-white/10 rounded"></div>
                    </div>
                  ) : format === 'carousel' ? (
                     <div className="absolute inset-0 flex flex-col justify-end p-4 text-left">
                       <div className="w-full h-5 bg-gray-200/80 rounded mb-2"></div>
                       <div className="w-3/4 h-3 bg-gray-100/80 rounded mb-1"></div>
                       <div className="w-1/2 h-3 bg-gray-100/80 rounded mb-4"></div>
                       <div className="w-16 h-6 bg-renx-blue rounded-full"></div>
                     </div>
                  ) : (
                    <div className="absolute inset-0 flex flex-col p-4 text-left">
                      <div className="flex gap-2 items-center mb-3">
                         <div className="w-8 h-8 rounded-full bg-gray-200"></div>
                         <div>
                            <div className="w-16 h-2 bg-gray-200 rounded mb-1"></div>
                            <div className="w-10 h-2 bg-gray-100 rounded"></div>
                         </div>
                      </div>
                      <div className="w-full h-2 bg-gray-200 rounded mb-1.5 mt-2"></div>
                      <div className="w-full h-2 bg-gray-200 rounded mb-1.5"></div>
                      <div className="w-4/5 h-2 bg-gray-200 rounded mb-4"></div>
                      <div className="w-full flex-1 bg-gray-100 rounded border border-gray-200/50"></div>
                    </div>
                  )}

                  {/* Template Meta Overlays */}
                  <div className="absolute -top-3 -right-3 px-2.5 py-1 bg-white shadow-md border border-renx-border rounded-lg text-[9px] font-bold text-renx-blue uppercase tracking-wider flex items-center gap-1">
                    <Sparkles size={10} /> {format} Template
                  </div>
                </div>
                
                <h3 className="font-heading text-[14px] font-bold text-renx-navy mb-1">
                  Ready to Generate
                </h3>
                <p className="text-[11px] text-renx-gray max-w-[250px] leading-relaxed">
                  Template is set up for <strong>{platform}</strong> focusing on <strong>{pillar}</strong>.
                  {topic && <span className="block mt-1 text-renx-blue opacity-80 truncate">"{topic}"</span>}
                </p>
              </div>
            )}

            {resultText && (format === 'carousel' || format === 'caption' || format === 'story') && slides.length > 0 && (
              <div className="w-full p-5 flex flex-col items-center relative">
                {generatedImageUrl ? (
                  <div className="w-[240px] shadow-lg rounded-xl overflow-hidden relative">
                    <img src={generatedImageUrl} alt="Generated UI" className="w-full h-full object-cover aspect-[4/5] opacity-50" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent flex flex-col justify-end p-5 text-left">
                      <div className="font-heading text-[14px] font-extrabold text-white leading-[1.3] mb-2">{slides[currentSlide].h}</div>
                      <div className="text-[10px] text-white/90 leading-[1.5] mb-2">{slides[currentSlide].b.substring(0, 80)}...</div>
                    </div>
                  </div>
                ) : (
                  <div className="slide-thumb w-[240px] shadow-lg">
                    <div className="font-heading text-[9px] font-bold text-renx-light-blue tracking-[0.1em] mb-2 relative z-10">
                       SLIDE {currentSlide + 1} OF {slides.length} · RENNXAI
                    </div>
                    <div className="font-heading text-[14px] font-extrabold text-white leading-[1.3] relative z-10 mb-2">
                      {slides[currentSlide].h}
                    </div>
                    <div className="text-[10px] text-white/60 leading-[1.5] relative z-10">
                      {slides[currentSlide].b.substring(0, 100)}...
                    </div>
                    <div className="mt-3 px-3.5 py-1 bg-renx-blue rounded-full font-heading text-[9px] font-bold text-white tracking-[0.05em] relative z-10 shadow-sm inline-block">
                      {cta.substring(0,15)} →
                    </div>
                  </div>
                )}
                
                {slides.length > 1 && (
                  <div className="flex items-center justify-center gap-3 mt-4">
                    {slides.map((_, i) => (
                      <button 
                        key={i}
                        onClick={() => setCurrentSlide(i)}
                        className={`transition-all rounded-full ${currentSlide === i ? 'w-5 h-[7px] bg-renx-blue rounded-full' : 'w-[7px] h-[7px] bg-renx-slate'}`}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

            {resultText && format === 'video' && (
              <div 
                className={`video-preview w-full bg-black rounded-[10px] relative flex flex-col items-center justify-center overflow-hidden mx-auto my-4 shadow-xl border border-white/10 transition-all duration-300 ${
                  videoAspectRatio === '16:9' ? 'max-w-[320px] aspect-[16/9]' :
                  videoAspectRatio === '4:3' ? 'max-w-[280px] aspect-[4/3]' :
                  'max-w-[200px] aspect-[9/16]'
                }`}
              >
                {generatedVeoUrl ? (
                  <video src={generatedVeoUrl} controls playsInline className="absolute inset-0 object-contain w-full h-full bg-black z-20" />
                ) : generatedImageUrl ? (
                  <img src={generatedImageUrl} alt="Bg" className="absolute inset-0 object-cover opacity-60 w-full h-full" />
                ) : (
                  <div className="absolute inset-0 bg-gradient-to-b from-renx-navy/80 to-black/90"></div>
                )}
                
                {!generatedVeoUrl && (
                  <>
                    <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-sm text-white/90 text-[9px] font-bold px-1.5 py-0.5 rounded border border-white/10 z-10 transition-all">
                      {videoStyle} Style
                    </div>
                    <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-sm text-white/90 text-[9px] font-bold px-1.5 py-0.5 rounded border border-white/10 z-10 transition-all flex gap-1 items-center">
                      <span>{videoAspectRatio}</span>
                      <span className="w-1 h-1 bg-white/30 rounded-full mx-0.5"></span>
                      <span>{videoDuration}</span>
                    </div>
                  </>
                )}
                
                <div className="relative z-10 text-center p-5 w-full">
                  {isAnimPlaying && animSequence.length > 0 ? (
                    <div key={animIndex} className="animate-in fade-in zoom-in duration-300 ease-out">
                      <div className="font-heading text-xl font-black text-white leading-[1.2] drop-shadow-md">
                        {animSequence[animIndex]}
                      </div>
                      <div className="mt-4 text-[9px] font-bold text-renx-light-blue tracking-[0.1em] uppercase">
                        Frame {animIndex + 1} / {animSequence.length}
                      </div>
                    </div>
                  ) : !generatedVeoUrl ? (
                    <>
                      <div className="font-heading text-base font-black text-white leading-[1.2] mb-2.5">
                        {videoHook}
                      </div>
                      <div className="text-[10px] text-white/50">RennXAI · @rennxai</div>
                    </>
                  ) : null}
                </div>
                {!generatedVeoUrl && (
                  <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between z-10">
                    <div className="font-heading text-[9px] font-bold text-white/60">@rennxai</div>
                    <div className="font-heading text-[8px] font-bold text-white bg-renx-blue px-2 py-1 rounded-[12px]">{cta.substring(0,12)}</div>
                  </div>
                )}
              </div>
            )}
          </div>

          {resultText && (
            <div className="flex flex-col gap-2 mb-6">
              {format === 'video' && (
                <div className="p-3 bg-renx-surface border border-renx-border rounded-lg mb-2 text-left">
                  <div className="grid grid-cols-2 gap-2 mb-2">
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-semibold text-renx-dark uppercase tracking-[0.05em]">Aspect Ratio</label>
                      <select 
                        value={videoAspectRatio}
                        onChange={e => setVideoAspectRatio(e.target.value)}
                        className="text-[10px] p-1 px-2 border border-renx-border rounded bg-white focus:outline-none focus:border-renx-blue transition-colors"
                      >
                        <option value="16:9">16:9 (Landscape)</option>
                        <option value="9:16">9:16 (Portrait)</option>
                        <option value="4:3">4:3 (Standard)</option>
                      </select>
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-semibold text-renx-dark uppercase tracking-[0.05em]">Duration</label>
                      <select 
                        value={videoDuration}
                        onChange={e => setVideoDuration(e.target.value)}
                        className="text-[10px] p-1 px-2 border border-renx-border rounded bg-white focus:outline-none focus:border-renx-blue transition-colors"
                      >
                        <option value="15s">15 Seconds</option>
                        <option value="30s">30 Seconds</option>
                        <option value="60s">60 Seconds</option>
                      </select>
                    </div>
                  </div>
                  <div className="flex gap-2 items-center mb-2">
                    <label className="text-[10px] font-semibold text-renx-dark uppercase tracking-[0.05em]">Video Style</label>
                    <select 
                      value={videoStyle}
                      onChange={e => setVideoStyle(e.target.value)}
                      className="text-[10px] p-1 px-2 border border-renx-border rounded bg-white focus:outline-none focus:border-renx-blue transition-colors flex-1"
                    >
                      <option>Cinematic</option>
                      <option>Anime</option>
                      <option>3D Animation</option>
                      <option>Minimalist</option>
                      <option>Hand-drawn</option>
                    </select>
                  </div>
                  <label className="block text-[10px] font-semibold text-renx-dark mb-1 uppercase tracking-[0.05em]">TikTok / Veo Generation Prompt</label>
                  <textarea 
                    value={veoPrompt}
                    onChange={e => setVeoPrompt(e.target.value)}
                    placeholder={`High quality ${videoStyle.toLowerCase()} video for social media: ${topic}. 1080p resolution, smooth motion.`}
                    className="w-full text-[11px] p-2 border border-renx-border rounded bg-white min-h-[50px] focus:outline-none focus:border-renx-blue transition-colors"
                  />
                </div>
              )}
              <div className="flex gap-2">
                <button 
                  onClick={handleGenerateVeoVideo}
                  disabled={isGeneratingVeo}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 bg-blue-500/10 text-blue-600 rounded cursor-pointer font-bold text-[11px] hover:bg-blue-500/20 disabled:opacity-50"
                >
                  <Film size={14} /> {isGeneratingVeo ? 'Generating Video...' : 'Generate Video Clip'}
                </button>
                {generatedVeoUrl && (
                  <button 
                    onClick={handleDownloadVideo}
                    className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 bg-green-500/10 text-green-600 rounded cursor-pointer font-bold text-[11px] hover:bg-green-500/20"
                  >
                    <Download size={14} /> Download Video
                  </button>
                )}
                <button 
                  onClick={handleGenerateImage}
                  disabled={isGeneratingImage}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 bg-pink-500/10 text-pink-600 rounded cursor-pointer font-bold text-[11px] hover:bg-pink-500/20 disabled:opacity-50"
                >
                  <Layers size={14} /> {isGeneratingImage ? 'Generating Image...' : 'Google Imagen'}
                </button>
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={handleGenerateVoiceover}
                  disabled={isGeneratingVoice}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 bg-purple-500/10 text-purple-600 rounded cursor-pointer font-bold text-[11px] hover:bg-purple-500/20 disabled:opacity-50"
                >
                  <Smartphone size={14} /> {isGeneratingVoice ? 'Generating Audio...' : 'Gemini 3.1 TTS'}
                </button>
                {(format === 'carousel' || format === 'video') && (
                  <button 
                    onClick={() => {
                      const url = format === 'carousel' 
                        ? CAROUSEL_TEMPLATES[carouselTemplateIdx].url 
                        : REELS_TEMPLATES[reelsTemplateIdx].url;
                      window.open(url, '_blank');
                    }}
                    className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 bg-[#00C4CC]/10 text-[#00C4CC] rounded cursor-pointer font-bold text-[11px] hover:bg-[#00C4CC]/20"
                  >
                    <Layers size={14} /> Open in Canva
                  </button>
                )}
              </div>

              {(format === 'carousel' || format === 'video') && (
                 <div className="p-3 bg-[#00C4CC]/5 border border-[#00C4CC]/30 rounded-lg mt-2 flex items-center justify-between">
                   <div className="text-[10px] font-bold text-[#00C4CC] uppercase tracking-[0.05em] flex items-center gap-1.5">
                     <Layers size={13} />
                     Canva Template
                   </div>
                   <select 
                     value={format === 'carousel' ? carouselTemplateIdx : reelsTemplateIdx}
                     onChange={(e) => format === 'carousel' ? setCarouselTemplateIdx(Number(e.target.value)) : setReelsTemplateIdx(Number(e.target.value))}
                     className="max-w-[180px] text-[10px] p-1 border border-[#00C4CC]/30 rounded bg-white text-renx-dark focus:outline-none focus:border-[#00C4CC]"
                   >
                     {format === 'carousel' && CAROUSEL_TEMPLATES.map((t, i) => (
                       <option key={i} value={i}>{t.name}</option>
                     ))}
                     {format === 'video' && REELS_TEMPLATES.map((t, i) => (
                       <option key={i} value={i}>{t.name}</option>
                     ))}
                   </select>
                 </div>
               )}

              {(format === 'video' || format === 'story') && (
                <div className="p-3 bg-renx-surface border border-renx-border rounded-lg mt-2">
                  <div className="font-heading text-[10px] font-bold text-renx-gray uppercase tracking-[0.06em] mb-3 text-left">Browser Engine Animation</div>
                  <div className="grid grid-cols-2 gap-3 mb-3 text-left">
                    <div>
                      <label className="block text-[10px] font-semibold text-renx-dark mb-1">Engine</label>
                      <select value={animType} onChange={e => setAnimType(e.target.value)} className="w-full text-[11px] p-1.5 border border-renx-border rounded bg-white">
                        <option value="css">CSS / Tailwind</option>
                        <option value="remotion">Remotion (DOM)</option>
                        <option value="p5">p5.js (Canvas)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-renx-dark mb-1">Speed</label>
                      <select value={animSpeed} onChange={e => setAnimSpeed(e.target.value)} className="w-full text-[11px] p-1.5 border border-renx-border rounded bg-white">
                        <option value="slow">Slow & Cinematic</option>
                        <option value="normal">Normal</option>
                        <option value="fast">Fast & Punchy</option>
                      </select>
                    </div>
                  </div>
                  <button 
                    onClick={handlePlayTypographicVideo}
                    disabled={isAnimPlaying}
                    className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 bg-white text-renx-navy rounded cursor-pointer font-bold text-[11px] hover:bg-gray-50 disabled:opacity-50 border border-renx-border shadow-sm"
                  >
                    <Smartphone size={14} /> {isAnimPlaying ? `Rendering via ${animType}...` : 'Preview Typographic Animation'}
                  </button>
                </div>
              )}
            </div>
          )}
          
          {generatedVoiceUrl && (
            <div className="mb-6 p-3 bg-white border border-renx-border rounded-lg shadow-sm">
              <div className="text-[11px] font-bold text-renx-dark mb-2">Voiceover Review</div>
              <audio controls src={generatedVoiceUrl} className="w-full h-8" />
            </div>
          )}

          <div className="font-heading text-[11px] font-bold text-renx-gray tracking-[0.1em] uppercase mb-4 text-left">Auto-Post Settings</div>
          
          <div className="flex items-center justify-between mb-3 text-left">
            <span className="text-[13px] text-renx-dark font-medium">Post to Instagram</span>
            <div className="toggle on"><div className="w-[14px] h-[14px] bg-white rounded-full absolute top-[3px] left-[3px] shadow transition-transform translate-x-[18px]"></div></div>
          </div>
          <div className="flex items-center justify-between mb-3 text-left">
            <span className="text-[13px] text-renx-dark font-medium">Post to Facebook</span>
            <div className="toggle on"><div className="w-[14px] h-[14px] bg-white rounded-full absolute top-[3px] left-[3px] shadow transition-transform translate-x-[18px]"></div></div>
          </div>
          <div className="flex items-center justify-between mb-6 text-left">
            <span className="text-[13px] text-renx-dark font-medium">Post to TikTok</span>
            <div className="toggle"><div className="w-[14px] h-[14px] bg-white rounded-full absolute top-[3px] left-[3px] shadow transition-transform"></div></div>
          </div>

          <div className="font-heading text-[11px] font-bold text-renx-gray tracking-[0.1em] uppercase mb-4 text-left">Schedule</div>
          <div className="grid grid-cols-2 gap-3.5 mb-4 text-left">
            <div>
              <label className="block text-[11.5px] font-semibold text-renx-gray tracking-[0.06em] uppercase mb-1.5 text-left">Date</label>
              <input 
                type="date" 
                value={scheduleDate}
                onChange={e => setScheduleDate(e.target.value)}
                className="w-full px-3.5 py-2 border-1.5 border-renx-border rounded-lg text-[13px] bg-white text-renx-dark focus:outline-none focus:border-renx-blue transition-colors" 
              />
            </div>
            <div>
              <label className="block text-[11.5px] font-semibold text-renx-gray tracking-[0.06em] uppercase mb-1.5 text-left">Time (PST)</label>
              <input 
                type="time" 
                value={scheduleTime}
                onChange={e => setScheduleTime(e.target.value)}
                className="w-full px-3.5 py-2 border-1.5 border-renx-border rounded-lg text-[13px] bg-white text-renx-dark focus:outline-none focus:border-renx-blue transition-colors" 
              />
            </div>
          </div>
          <div className="text-left mb-1">
            <label className="block text-[11.5px] font-semibold text-renx-gray tracking-[0.06em] uppercase mb-1.5 text-left">Recurring Option</label>
            <select 
              value={recurring}
              onChange={e => setRecurring(e.target.value)}
              className="w-full px-3.5 py-2 border-1.5 border-renx-border rounded-lg text-[13px] bg-white text-renx-dark focus:outline-none focus:border-renx-blue transition-colors"
            >
              <option value="none">Do not repeat</option>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
          </div>

        </div>
      </div>

      {/* TOAST */}
      {toast && (
        <div className="fixed bottom-6 right-6 bg-renx-navy text-white px-5 py-3 rounded-xl shadow-2xl text-[13px] font-medium z-50 flex items-center gap-2 animate-in slide-in-from-bottom-5">
          <CheckCircle2 size={16} className="text-renx-success" />
          {toast}
        </div>
      )}

    </div>
  );
}
