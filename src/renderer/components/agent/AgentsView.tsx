import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';
import { agentService } from '../../services/agent';
import { coworkService } from '../../services/cowork';
import { i18nService } from '../../services/i18n';
import { PlusIcon } from '@heroicons/react/24/outline';
import type { PresetAgent } from '../../types/agent';
import AgentCreateModal from './AgentCreateModal';
import AgentSettingsPanel from './AgentSettingsPanel';
import SidebarToggleIcon from '../icons/SidebarToggleIcon';
import ComposeIcon from '../icons/ComposeIcon';
import WindowTitleBar from '../window/WindowTitleBar';

interface AgentsViewProps {
  isSidebarCollapsed?: boolean;
  onToggleSidebar?: () => void;
  onNewChat?: () => void;
  onShowCowork?: () => void;
  updateBadge?: React.ReactNode;
}

const AgentsView: React.FC<AgentsViewProps> = ({
  isSidebarCollapsed,
  onToggleSidebar,
  onNewChat,
  onShowCowork,
  updateBadge,
}) => {
  const isMac = window.electron.platform === 'darwin';
  const agents = useSelector((state: RootState) => state.agent.agents);
  const currentAgentId = useSelector((state: RootState) => state.agent.currentAgentId);
  const [presets, setPresets] = useState<PresetAgent[]>([]);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [settingsAgentId, setSettingsAgentId] = useState<string | null>(null);
  const [addingPreset, setAddingPreset] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const isEn = i18nService.getLanguage() === 'en';

  useEffect(() => {
    agentService.loadAgents();
    agentService.getPresets().then(setPresets);
  }, []);

  useEffect(() => {
    agentService.getPresets().then(setPresets);
  }, [agents]);

  const enabledAgents = agents.filter((a) => a.enabled && a.id !== 'main');
  const customAgents = enabledAgents.filter((a) => a.source === 'custom');

  const handleAddPreset = async (presetId: string) => {
    setAddingPreset(presetId);
    try {
      await agentService.addPreset(presetId);
    } finally {
      setAddingPreset(null);
    }
  };

  const handleHire = async (preset: PresetAgent) => {
    if (!preset.installed) {
      await handleAddPreset(preset.id);
    }
    const installedAgent = agents.find((a) => a.presetId === preset.id || a.id === preset.id);
    if (installedAgent) {
      agentService.switchAgent(installedAgent.id);
      coworkService.loadSessions(installedAgent.id);
      onShowCowork?.();
    } else {
      onShowCowork?.();
    }
  };

  const handleSwitchAgent = (agentId: string) => {
    agentService.switchAgent(agentId);
    coworkService.loadSessions(agentId);
    onShowCowork?.();
  };

  // Build category list from preset categories
  const categories = React.useMemo(() => {
    const map = new Map<string, number>();
    presets.forEach((p) => {
      const cat = (isEn ? p.categoryEn : p.category) ?? (isEn ? 'Other' : '其他');
      map.set(cat, (map.get(cat) ?? 0) + 1);
    });
    return Array.from(map.entries()).map(([label, count]) => ({ label, count }));
  }, [presets, isEn]);

  const filteredPresets = activeCategory === 'all'
    ? presets
    : presets.filter((p) => {
        const cat = isEn ? p.categoryEn : p.category;
        return cat === activeCategory;
      });

  return (
    <div className="flex-1 flex flex-col bg-background h-full">
      {/* Header */}
      <div className="draggable flex h-12 items-center justify-between px-4 border-b border-border shrink-0">
        <div className="flex items-center space-x-3 h-8">
          {isSidebarCollapsed && (
            <div className={`non-draggable flex items-center gap-1 ${isMac ? 'pl-[68px]' : ''}`}>
              <button
                type="button"
                onClick={onToggleSidebar}
                className="h-8 w-8 inline-flex items-center justify-center rounded-lg text-secondary hover:bg-surface-raised transition-colors"
              >
                <SidebarToggleIcon className="h-4 w-4" isCollapsed={true} />
              </button>
              <button
                type="button"
                onClick={onNewChat}
                className="h-8 w-8 inline-flex items-center justify-center rounded-lg text-secondary hover:bg-surface-raised transition-colors"
              >
                <ComposeIcon className="h-4 w-4" />
              </button>
              {updateBadge}
            </div>
          )}
          <h1 className="text-lg font-semibold text-foreground">
            {i18nService.t('agentsCenterTitle')}
          </h1>
        </div>
        <WindowTitleBar inline />
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto min-h-0 [scrollbar-gutter:stable]">
        <div className="max-w-4xl mx-auto px-6 py-6">
          {/* Page title + subtitle */}
          <p className="text-sm text-secondary mb-5">
            {i18nService.t('agentsSubtitle')}
          </p>

          {/* Category tabs */}
          <div className="flex items-center gap-1 border-b border-border mb-6 overflow-x-auto">
            <CategoryTab
              label={i18nService.t('agentsCategoryAll')}
              count={presets.length}
              active={activeCategory === 'all'}
              onClick={() => setActiveCategory('all')}
              showCount={false}
            />
            {categories.map(({ label, count }) => (
              <CategoryTab
                key={label}
                label={label}
                count={count}
                active={activeCategory === label}
                onClick={() => setActiveCategory(label)}
                showCount={true}
              />
            ))}
          </div>

          {/* Preset expert cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 mb-8">
            {filteredPresets.map((preset) => {
              const name = isEn && preset.nameEn ? preset.nameEn : preset.name;
              const description = isEn && preset.descriptionEn ? preset.descriptionEn : preset.description;
              const installedAgent = agents.find(
                (a) => a.presetId === preset.id || a.id === preset.id,
              );
              const isActive = installedAgent?.id === currentAgentId;
              return (
                <ExpertCard
                  key={preset.id}
                  icon={preset.icon}
                  name={name}
                  description={description}
                  isInstalled={preset.installed}
                  isActive={isActive}
                  isHiring={addingPreset === preset.id}
                  onHire={() => handleHire(preset)}
                  onSettings={installedAgent ? () => setSettingsAgentId(installedAgent.id) : undefined}
                />
              );
            })}
          </div>

          {/* Custom agents section */}
          {(customAgents.length > 0 || activeCategory === 'all') && (
            <div>
              <h2 className="text-sm font-medium text-secondary mb-4">
                {i18nService.t('myCustomAgents')}
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {customAgents.map((agent) => (
                  <ExpertCard
                    key={agent.id}
                    icon={agent.icon}
                    name={agent.name}
                    description={agent.description}
                    isInstalled={true}
                    isActive={agent.id === currentAgentId}
                    isHiring={false}
                    onHire={() => handleSwitchAgent(agent.id)}
                    onSettings={() => setSettingsAgentId(agent.id)}
                  />
                ))}
                {/* Create new */}
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(true)}
                  className="flex flex-col items-center justify-center gap-2 p-4 rounded-2xl border-2 border-dashed border-border hover:border-primary hover:bg-primary/5 transition-colors min-h-[180px] cursor-pointer"
                >
                  <div className="w-12 h-12 rounded-full flex items-center justify-center bg-primary/10">
                    <PlusIcon className="h-6 w-6 text-primary" />
                  </div>
                  <span className="text-sm font-medium text-primary">
                    {i18nService.t('createNewAgent')}
                  </span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      <AgentCreateModal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} />
      <AgentSettingsPanel
        agentId={settingsAgentId}
        onClose={() => setSettingsAgentId(null)}
        onSwitchAgent={(id) => {
          setSettingsAgentId(null);
          handleSwitchAgent(id);
        }}
      />
    </div>
  );
};

/* ── Category Tab ─────────────────────────── */

const CategoryTab: React.FC<{
  label: string;
  count: number;
  active: boolean;
  showCount: boolean;
  onClick: () => void;
}> = ({ label, count, active, showCount, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className={`shrink-0 px-3 pb-2 text-sm font-medium border-b-2 transition-colors ${
      active
        ? 'border-primary text-primary'
        : 'border-transparent text-secondary hover:text-foreground'
    }`}
  >
    {label}
    {showCount && (
      <span className="ml-1 text-xs opacity-60">({count})</span>
    )}
  </button>
);

/* ── Expert Card ─────────────────────────── */

const ExpertCard: React.FC<{
  icon: string;
  name: string;
  description: string;
  isInstalled: boolean;
  isActive: boolean;
  isHiring: boolean;
  onHire: () => void;
  onSettings?: () => void;
}> = ({ icon, name, description, isInstalled, isActive, isHiring, onHire, onSettings }) => {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      className={`relative flex flex-col items-center text-center rounded-2xl border bg-surface transition-all duration-200 overflow-hidden min-h-[200px] ${
        isActive ? 'border-primary shadow-md' : 'border-border hover:shadow-md'
      }`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Pin decoration */}
      <div className="w-4 h-4 rounded-full bg-border/60 mt-3 mb-2 shrink-0" />

      {/* Avatar */}
      <div
        className={`w-16 h-16 rounded-full flex items-center justify-center text-3xl mb-3 shrink-0 ${
          isActive ? 'bg-primary/15' : 'bg-surface-raised'
        }`}
      >
        {icon || '🤖'}
      </div>

      {/* Name badge */}
      <div className="px-3 py-1 rounded-full bg-primary/10 mb-2 mx-3">
        <span className="text-xs font-semibold text-primary line-clamp-1">{name}</span>
      </div>

      {/* Description */}
      <p className="text-xs text-secondary px-3 line-clamp-3 leading-relaxed">
        {description}
      </p>

      {/* Dashed divider */}
      <div className="w-full border-t border-dashed border-border mt-auto mx-0 mb-0" style={{ marginTop: 'auto' }} />

      {/* Hover overlay with hire button */}
      <div
        className={`absolute inset-0 flex items-end justify-center pb-4 transition-opacity duration-200 ${
          hovered ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        style={{ background: 'linear-gradient(to top, rgba(var(--color-background-rgb, 255,255,255), 0.92) 0%, transparent 60%)' }}
      >
        <div className="flex gap-2">
          {onSettings && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onSettings(); }}
              className="px-3 py-1.5 text-xs font-medium rounded-lg border border-border bg-surface text-secondary hover:bg-surface-raised transition-colors"
            >
              {i18nService.t('agentSettings')}
            </button>
          )}
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onHire(); }}
            disabled={isHiring}
            className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-colors disabled:opacity-50 ${
              isActive
                ? 'bg-primary/10 text-primary border border-primary'
                : 'bg-primary text-white hover:bg-primary-hover'
            }`}
          >
            {isHiring
              ? '...'
              : isActive
              ? i18nService.t('agentsHired')
              : i18nService.t('agentsHireButton')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AgentsView;
