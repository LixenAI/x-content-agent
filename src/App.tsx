import React, { useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { Topbar } from './components/Topbar';
import { ContentGenerator } from './components/panels/ContentGenerator';
import { ContentHistory } from './components/panels/ContentHistory';
import { ScheduleQueue } from './components/panels/ScheduleQueue';
import { PlatformConnect } from './components/panels/PlatformConnect';
import { Analytics } from './components/panels/Analytics';
import { LeadScoring } from './components/panels/LeadScoring';
import { AgentSettings } from './components/panels/AgentSettings';

export type Tab = 'generate' | 'history' | 'schedule' | 'platforms' | 'analytics' | 'leads' | 'settings';

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('generate');
  const [editingPost, setEditingPost] = useState<any>(null);

  const [posts, setPosts] = useState<any[]>([
    { id: '1', topic: 'AI replaced my admin — carousel', platform: 'Instagram', format: 'carousel', dateStr: 'Today 8:00 AM PST', status: 'SCHEDULED' },
    { id: '2', topic: "3 things caregivers don't know about AI", platform: 'TikTok', format: 'video', dateStr: 'Today 7:00 PM PST', status: 'DRAFT' },
    { id: '3', topic: 'How RennXAI Studio cut client onboarding by 60%', platform: 'LinkedIn', format: 'caption', dateStr: 'Thu Apr 25 · 9:00 AM PST', status: 'SCHEDULED' },
    { id: '4', topic: 'Why solopreneurs stay broke — the real system problem', platform: 'Facebook', format: 'caption', dateStr: 'Fri Apr 25 · 12:00 PM PST', status: 'SCHEDULED' },
    { id: '5', topic: 'Freebie promo — Stolen Year Calculator', platform: 'Instagram', format: 'story', dateStr: 'Sat Apr 26 · 6:00 PM PST', status: 'POSTED' },
  ]);

  const handleEditPost = (post: any) => {
    setEditingPost(post);
    setActiveTab('generate');
  };

  const handleNewPost = () => {
    setEditingPost(null);
    setActiveTab('generate');
  };

  const handleScheduleOrUpdate = (postData: any) => {
    if (editingPost && editingPost.id) {
      setPosts(posts.map(p => p.id === editingPost.id ? { ...p, ...postData } : p));
    } else {
      setPosts([{ ...postData, id: Date.now().toString(), status: 'SCHEDULED' }, ...posts]);
    }
    setEditingPost(null);
    setActiveTab('schedule');
  };

  const renderPanel = () => {
    switch (activeTab) {
      case 'generate':
        return <ContentGenerator onSchedule={handleScheduleOrUpdate} initialData={editingPost} />;
      case 'history':
        return <ContentHistory />;
      case 'schedule':
        return <ScheduleQueue posts={posts} onNewPost={handleNewPost} onEditPost={handleEditPost} />;
      case 'platforms':
        return <PlatformConnect />;
      case 'analytics':
        return <Analytics />;
      case 'leads':
        return <LeadScoring />;
      case 'settings':
        return <AgentSettings />;
      default:
        return null;
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-transparent text-renx-dark font-sans">
      <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Topbar activeTab={activeTab} onTabChange={setActiveTab} />
        <div className="flex-1 overflow-y-auto p-6 md:p-8">
          {renderPanel()}
        </div>
      </div>
    </div>
  );
}
