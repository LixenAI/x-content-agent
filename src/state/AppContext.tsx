import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import type { AgencySettings, Brand, BrandProfileDraft, Campaign, IntegrationId, Platform, Post } from '../types';
import * as store from '../lib/store';
import * as api from '../lib/api';
import { demoBrandProfile, demoCampaignPosts, placeholderImage } from '../lib/demo';

const DEFAULT_SETTINGS: AgencySettings = {
  agencyName: 'BrandBlast',
  accentColor: '#7C3AED',
  logoText: 'BB',
  customDomain: '',
};

export interface CampaignProgress {
  campaignId: string;
  stage: 'writing' | 'images' | 'done';
  imagesDone: number;
  imagesTotal: number;
}

interface AppContextValue {
  brands: Brand[];
  campaigns: Campaign[];
  posts: Post[];
  activeBrandId: string | null;
  activeBrand: Brand | null;
  settings: AgencySettings;
  integrations: IntegrationId[];
  demoMode: boolean;
  toast: string | null;
  campaignProgress: CampaignProgress | null;

  showToast: (msg: string) => void;
  setActiveBrandId: (id: string | null) => void;
  analyzeBrandWebsite: (url: string) => Promise<BrandProfileDraft>;
  addBrand: (draft: BrandProfileDraft & { website: string; deepKnowledge: string }) => Brand;
  updateBrand: (id: string, patch: Partial<Brand>) => void;
  deleteBrand: (id: string) => void;
  createCampaign: (input: {
    name: string; goal: string; topics: string[]; platforms: Platform[];
    postsPerWeek: number; durationDays: number; startDate: string;
  }) => Promise<void>;
  deleteCampaign: (id: string) => void;
  updatePost: (id: string, patch: Partial<Post>) => void;
  deletePost: (id: string) => void;
  approveAllDrafts: () => void;
  generatePostImage: (postId: string) => Promise<void>;
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
  };
  const seeds = demoCampaignPosts(brand, campaign, 8);
  const posts: Post[] = seeds.map((s, i) => {
    const date = new Date(now);
    date.setDate(date.getDate() + s.dayOffset);
    const [h, m] = s.time.split(':').map(Number);
    date.setHours(h, m, 0, 0);
    return {
      id: store.uid(),
      brandId: brand.id,
      campaignId: campaign.id,
      platform: s.platform,
      caption: s.caption,
      hashtags: s.hashtags,
      imagePrompt: s.imagePrompt,
      imageUrl: placeholderImage(brand, i),
      imageStatus: 'none',
      scheduledAt: date.toISOString(),
      status: i < 3 ? 'scheduled' : 'draft',
      createdAt: now.toISOString(),
    };
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
  const [demoMode, setDemoMode] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [campaignProgress, setCampaignProgress] = useState<CampaignProgress | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const toastTimer = useRef<ReturnType<typeof setTimeout>>(null);

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

  const generatePostImage = useCallback(async (postId: string) => {
    const post = posts.find(p => p.id === postId);
    if (!post) return;
    setPosts(prev => prev.map(p => (p.id === postId ? { ...p, imageStatus: 'generating' } : p)));
    try {
      const imageUrl = await api.generateImage(post.imagePrompt);
      setPosts(prev => prev.map(p => (p.id === postId ? { ...p, imageUrl, imageStatus: 'done' } : p)));
    } catch {
      setPosts(prev => prev.map(p => (p.id === postId ? { ...p, imageStatus: 'failed' } : p)));
      enterDemoMode('Demo mode — image generation unavailable, keeping placeholder');
    }
  }, [posts, enterDemoMode]);

  const createCampaign = useCallback(async (input: {
    name: string; goal: string; topics: string[]; platforms: Platform[];
    postsPerWeek: number; durationDays: number; startDate: string;
  }) => {
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
    const count = Math.min(Math.max(1, Math.round((input.postsPerWeek * input.durationDays) / 7)), 30);
    setCampaignProgress({ campaignId: campaign.id, stage: 'writing', imagesDone: 0, imagesTotal: 0 });

    let seeds: api.GeneratedPostSeed[];
    let usedDemo = false;
    try {
      seeds = await api.generateCampaignPosts(brand, campaign, count);
    } catch {
      seeds = demoCampaignPosts(brand, campaign, count);
      usedDemo = true;
      enterDemoMode('Demo mode — generated sample posts (no AI key)');
    }

    const start = new Date(`${input.startDate}T00:00:00`);
    const newPosts: Post[] = seeds.map((s, i) => {
      const date = new Date(start);
      date.setDate(date.getDate() + s.dayOffset);
      const [h, m] = s.time.split(':').map(Number);
      date.setHours(h, m, 0, 0);
      return {
        id: store.uid(),
        brandId: brand.id,
        campaignId: campaign.id,
        platform: s.platform,
        caption: s.caption,
        hashtags: s.hashtags,
        imagePrompt: s.imagePrompt,
        imageUrl: placeholderImage(brand, i),
        imageStatus: 'none',
        scheduledAt: date.toISOString(),
        status: 'draft',
        createdAt: new Date().toISOString(),
      };
    });

    setPosts(prev => [...prev, ...newPosts]);
    setCampaigns(prev => prev.map(c => (c.id === campaign.id ? { ...c, status: 'ready' } : c)));

    // Generate real images for the first batch (concurrency 2); the rest stay
    // on placeholders with a per-post "Generate image" action.
    if (!usedDemo) {
      const batch = newPosts.slice(0, 10);
      setCampaignProgress({ campaignId: campaign.id, stage: 'images', imagesDone: 0, imagesTotal: batch.length });
      let done = 0;
      const tasks = batch.map(p => async () => {
        try {
          const imageUrl = await api.generateImage(p.imagePrompt);
          setPosts(prev => prev.map(x => (x.id === p.id ? { ...x, imageUrl, imageStatus: 'done' } : x)));
        } catch {
          setPosts(prev => prev.map(x => (x.id === p.id ? { ...x, imageStatus: 'failed' } : x)));
        } finally {
          done += 1;
          setCampaignProgress({ campaignId: campaign.id, stage: 'images', imagesDone: done, imagesTotal: batch.length });
        }
      });
      await api.runWithConcurrency(tasks, 2);
    }

    setCampaignProgress(null);
    showToast(`Campaign "${campaign.name}" ready — ${newPosts.length} posts created`);
  }, [brands, activeBrandId, showToast, enterDemoMode]);

  const deleteCampaign = useCallback((id: string) => {
    setCampaigns(prev => prev.filter(c => c.id !== id));
    setPosts(prev => prev.filter(p => p.campaignId !== id));
  }, []);

  const updatePost = useCallback((id: string, patch: Partial<Post>) => {
    setPosts(prev => prev.map(p => (p.id === id ? { ...p, ...patch } : p)));
  }, []);

  const deletePost = useCallback((id: string) => {
    setPosts(prev => prev.filter(p => p.id !== id));
  }, []);

  const approveAllDrafts = useCallback(() => {
    setPosts(prev => prev.map(p => (p.status === 'draft' && p.brandId === activeBrandId ? { ...p, status: 'scheduled' } : p)));
    showToast('All drafts approved and scheduled');
  }, [activeBrandId, showToast]);

  const rewriteCaption = useCallback(async (postId: string) => {
    const post = posts.find(p => p.id === postId);
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
  }, [posts, brands, updatePost, showToast, enterDemoMode]);

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
    demoMode, toast, campaignProgress,
    showToast, setActiveBrandId, analyzeBrandWebsite, addBrand, updateBrand, deleteBrand,
    createCampaign, deleteCampaign, updatePost, deletePost, approveAllDrafts,
    generatePostImage, rewriteCaption, toggleIntegration, updateSettings, resetData,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
