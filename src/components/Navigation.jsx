import React from 'react';
import { Home, Search, Sparkles, Library } from 'lucide-react';

export default function Navigation({ activeTab, setActiveTab }) {
  const tabs = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'search', label: 'Search', icon: Search },
    { id: 'foryou', label: 'For You', icon: Sparkles },
    { id: 'library', label: 'Library', icon: Library },
  ];

  const activeIndex = Math.max(0, tabs.findIndex(t => t.id === activeTab));

  return (
    <nav className="bottom-navigation">
      {/* Liquid Sliding Pill Indicator */}
      <div
        className="nav-liquid-pill"
        style={{
          transform: `translateX(${activeIndex * 100}%)`,
        }}
      />

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
            <Icon
              size={20}
              strokeWidth={isActive ? 2.4 : 1.7}
              className={`nav-icon ${isActive ? 'active' : ''}`}
            />
            <span className="nav-tab-label">{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
