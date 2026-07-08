import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import type {
  AgencySettings, AspectRatio, Brand, BrandProfileDraft, Campaign, CaptionVariant,
  FormatMix, IntegrationId, Platform, Post, ProviderStatus,
} from '../types';
import * as store from '../lib/store';
import * as api from '../lib/api';
import {
  animatedVideoPlaceholder, demoBrandProfile, demoCampaignPosts,
  demoVariants, demoVirality, placeholderImage,
} from '../lib/demo';
import { PLATFORM_MATRIX, resolveVideoStyle, VIDEO_STYLES } from '../lib/frameworks';

const DEFAULT_SETTINGS: AgencySettings = {
  agencyName: 'Content Pro Agent',
  accentColor: '#7C3AED',
  logoText: 'CP',
  customDomain: '',
};

const DEFAULT_PROVIDERS: ProviderStatus = {
  gemini: false, kling: false, higgsfield: false, pollinations: true, canvaTemplateUrl: null,
};

export interface CampaignProgress {
  campaignId: string;
  stage: 'writing' | 'images' | 'done';
  imagesDone: number;
  imagesTotal: number;
}

export interface CampaignInput {
  name: string;
  goal: string;
  topics: string[];
  platforms: Platform[];
  postsPerWeek: number;
  durationDays: number;
  startDate: string;
  formatMix: FormatMix;
  hookFormula: string;
  scriptFramework: string;
  videoStyle: string;
}

interface AppContextValue {
  brands: Brand[];
  campaigns: Campaign[];
  posts: Post[];
  activeBrandId: string | null;
  activeBrand: Brand | null;
  settings: AgencySettings;
  integrations: IntegrationId[];
  providerStatus: ProviderStatus;
  demoMode: boolean;
  toast: string | null;
  campaignProgress: CampaignProgress | null;

  showToast: (msg: string) => void;
  setActiveBrandId: (id: string | null) => void;
  analyzeBrandWebsite: (url: string) => Promise<BrandProfileDraft>;
  addBrand: (draft: BrandProfileDraft & { website: string; deepKnowledge: string }) => Brand;
  updateBrand: (id: string, patch: Partial<Brand>) => void;
  deleteBrand: (id: string) => void;
  createCampaign: (input: CampaignInput) => Promise<void>;
  deleteCampaign: (id: string) => void;
  updatePost: (id: string, patch: Partial<Post>) => void;
  deletePost: (id: string) => void;
  approveAllDrafts: () => void;
  generatePostImage: (postId: string) => Promise<void>;
  generateSlideImage: (postId: string, slideIndex: number) => Promise<void>;
  generateVideoKeyframe: (postId: string) => Promise<void>;
  generatePostVideo: (postId: string) => Promise<void>;
  predictViralityFor: (postId: string) => Promise<void>;
  fetchVariants: (postId: string) => Promise<CaptionVariant[]>;
  rewriteCaption: (postId: string) => Promise<void>;
  toggleIntegration: (id: IntegrationId) => void;
  updateSettings: (patch: Partial<AgencySettings>) => void;
  resetData: () => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}

function computeCounts(total: number, mix: FormatMix): { post: number; carousel: number; video: number } {
  const carousel = Math.round((mix.carousel / 100) * total);
  const video = Math.round((mix.video / 100) * total);
  return { post: Math.max(0, total - carousel - video), carousel, video };
}

function seedToPost(
  seed: ReturnType<typeof demoCampaignPosts>[number] | api.GeneratedPostSeed,
  brand: Brand,
  campaign: Campaign,
  start: Date,
  index: number,
): Post {
  const date = new Date(start);
  date.setDate(date.getDate() + seed.dayOffset);
  const [h, m] = seed.time.split(':').map(Number);
  date.setHours(h, m, 0, 0);
  const videoAspect: AspectRatio = PLATFORM_MATRIX[seed.platform].videoAspect;
  return {
    id: store.uid(),
    brandId: brand.id,
    campaignId: campaign.id,
    platform: seed.platform,
    format: seed.format,
    caption: seed.caption,
    hashtags: seed.hashtags,
    imagePrompt: seed.imagePrompt,
    imageUrl: placeholderImage(brand, index),
    imageStatus: 'none',
    slides: seed.format === 'carousel' && seed.slides
      ? seed.slides.map(s => ({ ...s, imageUrl: null, imageStatus: 'none' as const }))
      : undefined,
    video: seed.format === 'video' && seed.video
      ? {
          ...seed.video,
          aspectRatio: videoAspect,
          keyframeUrl: null,
          videoUrl: null,
          videoStatus: 'none',
          provider: null,
        }
      : undefined,
    virality: null,
    scheduledAt: date.toISOString(),
    status: 'draft',
    createdAt: new Date().toISOString(),
  };
}

function seedData(): { brands: Brand[]; campaigns: Campaign[]; posts: Post[] } {
  const now = new Date();
  const brand: Brand = {
    id: store.uid(),
    name: 'Bloom Coffee Co.',
    website: 'https://bloomcoffee.example.com',
    description: 'A specialty coffee roaster bringing small-batch, ethically sourced beans to everyday coffee lovers.',
    toneOfVoice: 'Warm, artisanal, and a little playful — like your favorite barista.',
    audience: 'Urban professionals aged 25-40 who care about quality and sustainability.',
    topics: ['Brewing tips', 'Origin stories', 'Behind the roast', 'Customer features', 'Sustainability'],
    colors: ['#7C5A3C', '#D4A574', '#2D5016'],
    deepKnowledge: '',
    createdAt: now.toISOString(),
  };
  const campaign: Campaign = {
    id: store.uid(),
    brandId: brand.id,
    name: 'Spring Awakening',
    goal: 'Grow brand awareness and drive online bean subscriptions',
    topics: brand.topics.slice(0, 3),
    platforms: ['instagram', 'facebook'],
    postsPerWeek: 4,
    durationDays: 14,
    startDate: now.toISOString().slice(0, 10),
    status: 'ready',
    createdAt: now.toISOString(),
    formatMix: { post: 50, carousel: 25, video: 25 },
    hookFormula: 'auto',
    scriptFramework: 'auto',
    videoStyle: 'auto',
  };
  const seeds = demoCampaignPosts(brand, campaign, { post: 4, carousel: 2, video: 2 });
  const posts = seeds.map((s, i) => {
    const p = seedToPost(s, brand, campaign, now, i);
    return { ...p, status: (i < 3 ? 'scheduled' : 'draft') as Post['status'] };
  });
  return { brands: [brand], campaigns: [campaign], posts };
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [activeBrandId, setActiveBrandIdState] = useState<string | null>(null);
  const [settings, setSettings] = useState<AgencySettings>(DEFAULT_SETTINGS);
  const [integrations, setIntegrations] = useState<IntegrationId[]>([]);
  const [providerStatus, setProviderStatus] = useState<ProviderStatus>(DEFAULT_PROVIDERS);
  const [demoMode, setDemoMode] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [campaignProgress, setCampaignProgress] = useState<CampaignProgress | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const toastTimer = useRef<ReturnType<typeof setTimeout>>(null);
  const postsRef = useRef<Post[]>([]);
  postsRef.current = posts;

  // Hydrate from localStorage (seed on first run)
  useEffect(() => {
    let loadedBrands = store.loadBrands();
    let loadedCampaigns = store.loadCampaigns();
    let loadedPosts = store.loadPosts();
    if (loadedBrands.length === 0) {
      const seed = seedData();
      loadedBrands = seed.brands;
      loadedCampaigns = seed.campaigns;
      loadedPosts = seed.posts;
    }
    setBrands(loadedBrands);
    setCampaigns(loadedCampaigns);
    setPosts(loadedPosts);
    setActiveBrandIdState(store.loadActiveBrand() ?? loadedBrands[0]?.id ?? null);
    setSettings(store.loadSettings(DEFAULT_SETTINGS));
    setIntegrations(store.loadIntegrations());
    setHydrated(true);
    api.getProviders().then(setProviderStatus).catch(() => setProviderStatus(DEFAULT_PROVIDERS));
  }, []);

  // Write-through persistence
  useEffect(() => { if (hydrated) store.saveBrands(brands); }, [brands, hydrated]);
  useEffect(() => { if (hydrated) store.saveCampaigns(campaigns); }, [campaigns, hydrated]);
  useEffect(() => { if (hydrated) store.savePosts(posts); }, [posts, hydrated]);
  useEffect(() => { if (hydrated) store.saveActiveBrand(activeBrandId); }, [activeBrandId, hydrated]);
  useEffect(() => { if (hydrated) store.saveSettings(settings); }, [settings, hydrated]);
  useEffect(() => { if (hydrated) store.saveIntegrations(integrations); }, [integrations, hydrated]);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 3200);
  }, []);

  const enterDemoMode = useCallback((reason?: string) => {
    setDemoMode(true);
    if (reason) showToast(reason);
  }, [showToast]);

  const setActiveBrandId = useCallback((id: string | null) => setActiveBrandIdState(id), []);
  const activeBrand = brands.find(b => b.id === activeBrandId) ?? null;

  const analyzeBrandWebsite = useCallback(async (url: string): Promise<BrandProfileDraft> => {
    try {
      return await api.analyzeWebsite(url);
    } catch (err) {
      const status = err instanceof api.ApiError ? err.status : 0;
      if (status === 400 || status === 502) throw err; // real user-facing errors
      enterDemoMode('Demo mode — no AI key detected, using a sample profile');
      return demoBrandProfile(url);
    }
  }, [enterDemoMode]);

  const addBrand = useCallback((draft: BrandProfileDraft & { website: string; deepKnowledge: string }): Brand => {
    const brand: Brand = { id: store.uid(), createdAt: new Date().toISOString(), ...draft };
    setBrands(prev => [...prev, brand]);
    setActiveBrandIdState(brand.id);
    return brand;
  }, []);

  const updateBrand = useCallback((id: string, patch: Partial<Brand>) => {
    setBrands(prev => prev.map(b => (b.id === id ? { ...b, ...patch } : b)));
  }, []);

  const deleteBrand = useCallback((id: string) => {
    setBrands(prev => prev.filter(b => b.id !== id));
    setCampaigns(prev => prev.filter(c => c.brandId !== id));
    setPosts(prev => prev.filter(p => p.brandId !== id));
    setActiveBrandIdState(prev => (prev === id ? null : prev));
  }, []);

  const updatePost = useCallback((id: string, patch: Partial<Post>) => {
    setPosts(prev => prev.map(p => (p.id === id ? { ...p, ...patch } : p)));
  }, []);

  const patchSlide = useCallback((postId: string, slideIndex: number, patch: Partial<NonNullable<Post['slides']>[number]>) => {
    setPosts(prev => prev.map(p =>
      p.id === postId && p.slides
        ? { ...p, slides: p.slides.map((s, i) => (i === slideIndex ? { ...s, ...patch } : s)) }
        : p,
    ));
  }, []);

  const patchVideo = useCallback((postId: string, patch: Partial<NonNullable<Post['video']>>) => {
    setPosts(prev => prev.map(p =>
      p.id === postId && p.video ? { ...p, video: { ...p.video, ...patch } } : p,
    ));
  }, []);

  const generatePostImage = useCallback(async (postId: string) => {
    const post = postsRef.current.find(p => p.id === postId);
    if (!post) return;
    updatePost(postId, { imageStatus: 'generating' });
    try {
      const imageUrl = await api.generateImage(post.imagePrompt, PLATFORM_MATRIX[post.platform].imageAspect);
      updatePost(postId, { imageUrl, imageStatus: 'done' });
    } catch {
      updatePost(postId, { imageStatus: 'failed' });
      enterDemoMode('Image generation unavailable — keeping placeholder');
    }
  }, [updatePost, enterDemoMode]);

  const generateSlideImage = useCallback(async (postId: string, slideIndex: number) => {
    const post = postsRef.current.find(p => p.id === postId);
    const slide = post?.slides?.[slideIndex];
    if (!post || !slide) return;
    patchSlide(postId, slideIndex, { imageStatus: 'generating' });
    try {
      const imageUrl = await api.generateImage(slide.imagePrompt, '1:1');
      patchSlide(postId, slideIndex, { imageUrl, imageStatus: 'done' });
      if (slideIndex === 0) updatePost(postId, { imageUrl }); // cover doubles as thumbnail
    } catch {
      patchSlide(postId, slideIndex, { imageStatus: 'failed' });
      enterDemoMode('Image generation unavailable — keeping placeholder');
    }
  }, [patchSlide, updatePost, enterDemoMode]);

  const generateVideoKeyframe = useCallback(async (postId: string) => {
    const post = postsRef.current.find(p => p.id === postId);
    const brand = brands.find(b => b.id === post?.brandId);
    if (!post?.video || !brand) return;
    const scene = post.video.scenes[0];
    try {
      const keyframeUrl = await api.generateImage(scene?.imagePrompt ?? post.imagePrompt, post.video.aspectRatio);
      patchVideo(postId, { keyframeUrl, videoStatus: post.video.videoUrl ? post.video.videoStatus : 'keyframe' });
      updatePost(postId, { imageUrl: keyframeUrl });
    } catch {
      patchVideo(postId, { keyframeUrl: animatedVideoPlaceholder(brand, 1) });
      enterDemoMode('Image generation unavailable — using animated placeholder');
    }
  }, [brands, patchVideo, updatePost, enterDemoMode]);

  const generatePostVideo = useCallback(async (postId: string) => {
    const post = postsRef.current.find(p => p.id === postId);
    const brand = brands.find(b => b.id === post?.brandId);
    if (!post?.video || !brand) return;

    let keyframeUrl = post.video.keyframeUrl;
    patchVideo(postId, { videoStatus: 'generating' });
    if (!keyframeUrl) {
      try {
        keyframeUrl = await api.generateImage(post.video.scenes[0]?.imagePrompt ?? post.imagePrompt, post.video.aspectRatio);
        patchVideo(postId, { keyframeUrl });
      } catch {
        keyframeUrl = null;
      }
    }

    const style = VIDEO_STYLES.find(s => s.id === post.video?.style) ?? resolveVideoStyle('auto', 0);
    const motionPrompt = `${post.video.hook}. ${post.video.scenes[0]?.description ?? ''}. ${style.visualDirection}. Subtle cinematic motion.`;
    try {
      const { videoUrl, provider } = await api.generateVideoPro({
        prompt: motionPrompt,
        imageUrl: keyframeUrl ?? undefined,
        aspectRatio: post.video.aspectRatio,
      });
      patchVideo(postId, { videoUrl, provider, videoStatus: 'done' });
      showToast(`Video generated via ${provider}`);
    } catch {
      patchVideo(postId, {
        videoStatus: 'failed',
        provider: 'demo',
        keyframeUrl: keyframeUrl ?? animatedVideoPlaceholder(brand, 2),
      });
      enterDemoMode('Demo mode — video providers unavailable, showing animated preview');
    }
  }, [brands, patchVideo, showToast, enterDemoMode]);

  const predictViralityFor = useCallback(async (postId: string) => {
    const post = postsRef.current.find(p => p.id === postId);
    const brand = brands.find(b => b.id === post?.brandId);
    if (!post || !brand) return;
    try {
      const report = await api.predictVirality(post, brand);
      updatePost(postId, { virality: report });
    } catch {
      updatePost(postId, { virality: demoVirality(post) });
      enterDemoMode('Demo mode — using heuristic virality score');
    }
  }, [brands, updatePost, enterDemoMode]);

  const fetchVariants = useCallback(async (postId: string): Promise<CaptionVariant[]> => {
    const post = postsRef.current.find(p => p.id === postId);
    const brand = brands.find(b => b.id === post?.brandId);
    if (!post || !brand) return [];
    try {
      return await api.generateVariants(post, brand);
    } catch {
      enterDemoMode('Demo mode — using template variants');
      return demoVariants(post);
    }
  }, [brands, enterDemoMode]);

  const createCampaign = useCallback(async (input: CampaignInput) => {
    const brand = brands.find(b => b.id === activeBrandId);
    if (!brand) {
      showToast('Add a brand first');
      return;
    }
    const campaign: Campaign = {
      id: store.uid(),
      brandId: brand.id,
      status: 'generating',
      createdAt: new Date().toISOString(),
      ...input,
    };
    setCampaigns(prev => [...prev, campaign]);
    const total = Math.min(Math.max(1, Math.round((input.postsPerWeek * input.durationDays) / 7)), 30);
    const counts = computeCounts(total, input.formatMix);
    setCampaignProgress({ campaignId: campaign.id, stage: 'writing', imagesDone: 0, imagesTotal: 0 });

    let seeds: api.GeneratedPostSeed[];
    try {
      seeds = await api.generateCampaignPosts(brand, campaign, counts);
    } catch {
      seeds = demoCampaignPosts(brand, campaign, counts) as api.GeneratedPostSeed[];
      enterDemoMode('Demo mode — generated sample content (no AI key)');
    }

    const start = new Date(`${input.startDate}T00:00:00`);
    const newPosts = seeds.map((s, i) => seedToPost(s, brand, campaign, start, i));
    setPosts(prev => [...prev, ...newPosts]);
    setCampaigns(prev => prev.map(c => (c.id === campaign.id ? { ...c, status: 'ready' } : c)));

    // Generate real media for the first batch (concurrency 2) — images work
    // even keyless via the free Pollinations fallback. Remaining posts keep
    // placeholders with per-post generate buttons.
    const batch = newPosts.slice(0, 10);
    setCampaignProgress({ campaignId: campaign.id, stage: 'images', imagesDone: 0, imagesTotal: batch.length });
    let done = 0;
    const bump = () => {
      done += 1;
      setCampaignProgress({ campaignId: campaign.id, stage: 'images', imagesDone: done, imagesTotal: batch.length });
    };
    const tasks = batch.map(p => async () => {
      try {
        if (p.format === 'carousel' && p.slides?.length) {
          const imageUrl = await api.generateImage(p.slides[0].imagePrompt, '1:1');
          patchSlide(p.id, 0, { imageUrl, imageStatus: 'done' });
          updatePost(p.id, { imageUrl, imageStatus: 'done' });
        } else if (p.format === 'video' && p.video) {
          const keyframeUrl = await api.generateImage(p.video.scenes[0]?.imagePrompt ?? p.imagePrompt, p.video.aspectRatio);
          patchVideo(p.id, { keyframeUrl, videoStatus: 'keyframe' });
          updatePost(p.id, { imageUrl: keyframeUrl, imageStatus: 'done' });
        } else {
          const imageUrl = await api.generateImage(p.imagePrompt, PLATFORM_MATRIX[p.platform].imageAspect);
          updatePost(p.id, { imageUrl, imageStatus: 'done' });
        }
      } catch {
        updatePost(p.id, { imageStatus: 'failed' });
      } finally {
        bump();
      }
    });
    await api.runWithConcurrency(tasks, 2);

    setCampaignProgress(null);
    showToast(`Campaign "${campaign.name}" ready — ${newPosts.length} pieces of content created`);
  }, [brands, activeBrandId, showToast, enterDemoMode, patchSlide, patchVideo, updatePost]);

  const deleteCampaign = useCallback((id: string) => {
    setCampaigns(prev => prev.filter(c => c.id !== id));
    setPosts(prev => prev.filter(p => p.campaignId !== id));
  }, []);

  const deletePost = useCallback((id: string) => {
    setPosts(prev => prev.filter(p => p.id !== id));
  }, []);

  const approveAllDrafts = useCallback(() => {
    setPosts(prev => prev.map(p => (p.status === 'draft' && p.brandId === activeBrandId ? { ...p, status: 'scheduled' } : p)));
    showToast('All drafts approved and scheduled');
  }, [activeBrandId, showToast]);

  const rewriteCaption = useCallback(async (postId: string) => {
    const post = postsRef.current.find(p => p.id === postId);
    const brand = brands.find(b => b.id === post?.brandId);
    if (!post || !brand) return;
    try {
      const text = await api.generateText(
        `Rewrite this social media caption for ${brand.name} (tone: ${brand.toneOfVoice}). Keep it under 60 words, keep the same core message, make it fresher and more engaging. Return ONLY the new caption text, no quotes or commentary.\n\nCaption: ${post.caption}`,
      );
      updatePost(postId, { caption: text.trim() });
      showToast('Caption rewritten');
    } catch {
      enterDemoMode('Demo mode — AI rewrite unavailable');
    }
  }, [brands, updatePost, showToast, enterDemoMode]);

  const toggleIntegration = useCallback((id: IntegrationId) => {
    setIntegrations(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]));
  }, []);

  const updateSettings = useCallback((patch: Partial<AgencySettings>) => {
    setSettings(prev => ({ ...prev, ...patch }));
  }, []);

  const resetData = useCallback(() => {
    store.resetAll();
    const seed = seedData();
    setBrands(seed.brands);
    setCampaigns(seed.campaigns);
    setPosts(seed.posts);
    setActiveBrandIdState(seed.brands[0].id);
    setSettings(DEFAULT_SETTINGS);
    setIntegrations([]);
    showToast('All data reset to demo defaults');
  }, [showToast]);

  const value: AppContextValue = {
    brands, campaigns, posts, activeBrandId, activeBrand, settings, integrations,
    providerStatus, demoMode, toast, campaignProgress,
    showToast, setActiveBrandId, analyzeBrandWebsite, addBrand, updateBrand, deleteBrand,
    createCampaign, deleteCampaign, updatePost, deletePost, approveAllDrafts,
    generatePostImage, generateSlideImage, generateVideoKeyframe, generatePostVideo,
    predictViralityFor, fetchVariants, rewriteCaption,
    toggleIntegration, updateSettings, resetData,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
