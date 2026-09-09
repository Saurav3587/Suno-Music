import React from 'react';
import { Home, Search, Sparkles, Library } from 'lucide-react';

export default function Navigation({ activeTab, setActiveTab }) {
  const tabs = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'search', label: 'Search', icon: Search },
    { id: 'foryou', label: 'For You', icon: Sparkles },
    { id: 'library', label: 'Library', icon: Library },
  ];

  return (
    <nav className="bottom-navigation">
      {tabs.map(tab => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            id={`nav-tab-${tab.id}`}
            className={`nav-tab ${isActive ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            <Icon size={22} strokeWidth={isActive ? 2.5 : 1.8} color={isActive ? '#ff4b72' : 'currentColor'} />
            <span className="nav-tab-label">{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
