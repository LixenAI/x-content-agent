import React, { useEffect, useState } from 'react';
import type { Tab } from './types';
import * as api from './lib/api';
import { LoginScreen } from './components/LoginScreen';
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
  // Resolve auth BEFORE mounting AppProvider: the provider fetches workspace
  // state on mount, and every one of those calls would 401 behind the gate.
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [checkError, setCheckError] = useState<string | null>(null);

  useEffect(() => {
    api.getAuthStatus()
      .then(s => setAuthed(!s.authConfigured || s.authenticated))
      .catch(err => {
        setCheckError(err instanceof Error ? err.message : 'Could not reach the server.');
        setAuthed(false);
      });
  }, []);

  if (authed === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bb-bg">
        <div className="bb-spinner" />
      </div>
    );
  }

  if (!authed) {
    return (
      <>
        {checkError && (
          <div className="fixed top-4 inset-x-0 flex justify-center z-50 px-4">
            <div className="text-sm text-bb-error bg-red-50 border border-red-200 rounded-xl px-3 py-2">{checkError}</div>
          </div>
        )}
        <LoginScreen onAuthenticated={() => { setCheckError(null); setAuthed(true); }} />
      </>
    );
  }

  return (
    <AppProvider>
      <AppShell />
    </AppProvider>
  );
}
