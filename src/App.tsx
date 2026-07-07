import React, { useState } from 'react';
import type { Tab } from './types';
import { AppProvider, useApp } from './state/AppContext';
import { Sidebar } from './components/Sidebar';
import { Topbar } from './components/Topbar';
import { Toast } from './components/shared';
import { PostEditorModal } from './components/PostEditorModal';
import { Dashboard } from './components/panels/Dashboard';
import { Brands } from './components/panels/Brands';
import { Campaigns, CampaignWizard } from './components/panels/Campaigns';
import { Planner } from './components/panels/Planner';
import { Analytics } from './components/panels/Analytics';
import { Integrations } from './components/panels/Integrations';
import { Settings } from './components/panels/Settings';

function AppShell() {
  const { toast } = useApp();
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [openPostId, setOpenPostId] = useState<string | null>(null);
  const [campaignWizardOpen, setCampaignWizardOpen] = useState(false);

  const renderPanel = () => {
    switch (activeTab) {
      case 'dashboard': return <Dashboard onNavigate={setActiveTab} onOpenPost={setOpenPostId} />;
      case 'brands': return <Brands />;
      case 'campaigns': return <Campaigns onNavigate={setActiveTab} />;
      case 'planner': return <Planner onOpenPost={setOpenPostId} />;
      case 'analytics': return <Analytics />;
      case 'integrations': return <Integrations />;
      case 'settings': return <Settings />;
    }
  };

  return (
    <div className="flex h-screen overflow-hidden text-bb-dark font-sans">
      <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Topbar activeTab={activeTab} onNewCampaign={() => setCampaignWizardOpen(true)} />
        <div className="flex-1 overflow-y-auto p-6 md:p-8">
          {renderPanel()}
        </div>
      </div>
      {openPostId && <PostEditorModal postId={openPostId} onClose={() => setOpenPostId(null)} />}
      {campaignWizardOpen && (
        <CampaignWizard onClose={() => setCampaignWizardOpen(false)} onCreated={() => setActiveTab('campaigns')} />
      )}
      <Toast message={toast} />
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppShell />
    </AppProvider>
  );
}
