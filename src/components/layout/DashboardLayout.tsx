"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useDockerStore } from '@/store/useDockerStore';
import { levels } from '@/data/levels';
import { Cpu, ExternalLink, Moon, Sun, TerminalSquare, FileCode, MonitorPlay, ChevronDown, CheckCircle2 } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';

interface DashboardLayoutProps {
  editor: React.ReactNode;
  visualizer: React.ReactNode;
  terminal: React.ReactNode;
}

type MobileTab = 'editor' | 'visualizer' | 'terminal';

export default function DashboardLayout({ editor, visualizer, terminal }: DashboardLayoutProps) {
  const { currentLevelIndex, isLevelComplete, completedLevels, setLevel } = useDockerStore();
  const currentLevel = levels[currentLevelIndex] || levels[0];
  const { theme, toggle } = useTheme();

  // ── Resizable Layout State ──
  const [sidebarWidth, setSidebarWidth] = useState(340);
  const [terminalHeight, setTerminalHeight] = useState(40); // percentage
  const [showLevelMenu, setShowLevelMenu] = useState(false);

  // ── Mobile State ──
  const [activeTab, setActiveTab] = useState<MobileTab>('editor');
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // ── Drag Handlers ──
  const startColDrag = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = sidebarWidth;

    const onMouseMove = (moveEvent: MouseEvent) => {
      const newWidth = Math.max(250, Math.min(startWidth + (moveEvent.clientX - startX), window.innerWidth * 0.5));
      setSidebarWidth(newWidth);
    };
    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      document.body.classList.remove('is-resizing');
    };

    document.body.classList.add('is-resizing');
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }, [sidebarWidth]);

  const startRowDrag = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const startY = e.clientY;
    const startHeight = terminalHeight;

    const onMouseMove = (moveEvent: MouseEvent) => {
      // Calculate delta as percentage of window height
      const deltaY = moveEvent.clientY - startY;
      const deltaPct = (deltaY / window.innerHeight) * 100;
      // Subtract delta because moving mouse down DECREASES terminal height
      const newHeight = Math.max(20, Math.min(startHeight - deltaPct, 80));
      setTerminalHeight(newHeight);
    };
    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      document.body.classList.remove('is-resizing');
    };

    document.body.classList.add('is-resizing');
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }, [terminalHeight]);

  return (
    <div className="flex flex-col h-screen overflow-hidden" style={{ background: 'var(--bg-app)', color: 'var(--text-primary)' }}>

      {/* ── Top Navigation ── */}
      <header className="flex items-center justify-between px-4 py-2.5 border-b shrink-0 z-20" style={{ borderColor: 'var(--border-strong)', background: 'var(--bg-surface)' }}>
        <div className="flex items-center gap-3">
          {/* Logo */}
          <div className="relative w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-900/20">
            <Cpu size={16} className="text-white" />
          </div>
          <div className="hidden sm:block">
            <h1 className="text-sm font-bold tracking-tight leading-none">Learn Docker Workflow</h1>
            <p className="text-[10px] leading-none mt-0.5" style={{ color: 'var(--text-muted)' }}>Interactive Simulation</p>
          </div>
        </div>

        {/* Center: interactive level selector dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowLevelMenu(!showLevelMenu)}
            className="flex items-center gap-2 text-xs font-mono px-3 py-1.5 rounded-lg border transition-all hover:border-blue-500/50"
            style={{
              background: isLevelComplete ? 'rgba(16,185,129,0.12)' : 'var(--bg-active)',
              borderColor: isLevelComplete ? 'rgba(16,185,129,0.35)' : 'var(--border)',
              color: isLevelComplete ? 'var(--success)' : 'var(--text-primary)',
            }}
          >
            <span className="text-[10px] font-bold uppercase tracking-widest text-blue-500">
              L{currentLevelIndex + 1}
            </span>
            <span className="font-semibold max-w-[200px] sm:max-w-[320px] truncate">
              {currentLevel.title}
            </span>
            {isLevelComplete && <span className="text-emerald-500 font-bold">✓</span>}
            <ChevronDown size={13} className={`opacity-60 transition-transform ${showLevelMenu ? 'rotate-180' : ''}`} />
          </button>

          {/* Dropdown Menu */}
          {showLevelMenu && (
            <>
              <div className="fixed inset-0 z-30" onClick={() => setShowLevelMenu(false)} />
              <div
                className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-80 sm:w-96 rounded-xl border shadow-2xl z-40 p-2 overflow-hidden"
                style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-strong)' }}
              >
                <div className="px-3 py-2 border-b flex items-center justify-between" style={{ borderColor: 'var(--border)' }}>
                  <span className="text-xs font-bold uppercase tracking-wider text-blue-500">
                    Docker Learning Journey
                  </span>
                  <span className="text-[10px] font-mono" style={{ color: 'var(--text-muted)' }}>
                    {completedLevels.length} / {levels.length} Completed
                  </span>
                </div>
                <div className="max-h-80 overflow-y-auto py-1 space-y-0.5">
                  {levels.map((lvl, idx) => {
                    const isCurrent = idx === currentLevelIndex;
                    const isDone = completedLevels.includes(idx);
                    return (
                      <button
                        key={lvl.id}
                        onClick={() => {
                          setLevel(idx);
                          setShowLevelMenu(false);
                        }}
                        className={[
                          'w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left text-xs transition-colors',
                          isCurrent
                            ? 'bg-blue-500/15 text-blue-500 font-semibold'
                            : 'hover:bg-black/5 dark:hover:bg-white/5',
                        ].join(' ')}
                        style={{
                          color: isCurrent ? 'var(--accent)' : 'var(--text-primary)',
                        }}
                      >
                        <span className="w-5 text-[10px] font-mono opacity-50 shrink-0">
                          {idx + 1}.
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="truncate font-medium">{lvl.title.replace(/^Level \d+:\s*/, '')}</div>
                          <div className="text-[10px] truncate opacity-60 font-normal" style={{ color: 'var(--text-muted)' }}>
                            {lvl.objective}
                          </div>
                        </div>
                        {isDone && <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Right: links & theme toggle */}
        <div className="flex items-center gap-3">
          <button
            onClick={toggle}
            className="p-1.5 rounded-md hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
            title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          >
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          </button>
          <a
            href="https://docs.docker.com"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:flex items-center gap-1.5 text-xs transition-colors hover:text-blue-500"
            style={{ color: 'var(--text-muted)' }}
          >
            <ExternalLink size={12} /> Docs
          </a>
        </div>
      </header>

      {/* ── Main Layout ── */}
      <main className="flex flex-1 overflow-hidden">

        {isMobile ? (
          /* ── MOBILE LAYOUT ── */
          <div className="mobile-layout w-full h-full">
            <div className={`mobile-pane ${activeTab === 'editor' ? 'active' : ''}`}>
              {editor}
            </div>
            <div className={`mobile-pane ${activeTab === 'visualizer' ? 'active' : ''}`}>
               <div className="flex items-center gap-2 px-4 py-2 border-b" style={{ borderColor: 'var(--border)', background: 'var(--bg-surface)' }}>
                <span className="text-xs font-semibold tracking-tight">Docker Engine Visualizer</span>
              </div>
              <div className="flex-1 overflow-hidden relative">
                {visualizer}
              </div>
            </div>
            <div className={`mobile-pane ${activeTab === 'terminal' ? 'active' : ''}`} style={{ background: 'var(--terminal-bg)' }}>
              {terminal}
            </div>

            {/* Mobile Tab Bar */}
            <div className="mobile-tab-bar">
              <button 
                className={activeTab === 'editor' ? 'active' : ''} 
                onClick={() => setActiveTab('editor')}
              >
                <FileCode size={20} />
                <span>Editor</span>
              </button>
              <button 
                className={activeTab === 'visualizer' ? 'active' : ''} 
                onClick={() => setActiveTab('visualizer')}
              >
                <MonitorPlay size={20} />
                <span>Engine</span>
              </button>
              <button 
                className={activeTab === 'terminal' ? 'active' : ''} 
                onClick={() => setActiveTab('terminal')}
              >
                <TerminalSquare size={20} />
                <span>Terminal</span>
              </button>
            </div>
          </div>
        ) : (
          /* ── DESKTOP LAYOUT (Split Panes) ── */
          <div className="desktop-layout flex w-full h-full">
            
            {/* Left Pane (Editor) */}
            <aside 
              className="flex flex-col overflow-hidden shrink-0"
              style={{ width: sidebarWidth, borderRight: '1px solid var(--border-strong)', background: 'var(--editor-bg)' }}
            >
              {editor}
            </aside>

            {/* Vertical Resize Handle */}
            <div className="resize-handle-col" onMouseDown={startColDrag} />

            {/* Right Pane (Visualizer + Terminal) */}
            <section className="flex-1 flex flex-col min-w-0 overflow-hidden">
              
              {/* Top Right: Visualizer */}
              <div 
                className="relative overflow-hidden flex flex-col"
                style={{ height: `${100 - terminalHeight}%` }}
              >
                <div className="absolute top-0 left-0 right-0 z-10 flex items-center gap-2 px-5 py-2.5 border-b backdrop-blur-sm" style={{ borderColor: 'var(--border-strong)', background: 'var(--bg-surface)' }}>
                  <div className="w-2 h-2 rounded-full bg-blue-500" />
                  <span className="text-xs font-semibold tracking-tight">Docker Engine Visualizer</span>
                  <div className="ml-auto flex items-center gap-1.5 text-[10px] font-mono" style={{ color: 'var(--text-muted)' }}>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                    Simulated
                  </div>
                </div>
                <div className="flex-1 pt-10 overflow-hidden relative" style={{ background: 'var(--bg-app)' }}>
                  {visualizer}
                </div>
              </div>

              {/* Horizontal Resize Handle */}
              <div className="resize-handle-row" onMouseDown={startRowDrag} style={{ borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }} />

              {/* Bottom Right: Terminal */}
              <div 
                className="overflow-hidden"
                style={{ height: `${terminalHeight}%`, background: 'var(--terminal-bg)' }}
              >
                {terminal}
              </div>

            </section>
          </div>
        )}
      </main>
    </div>
  );
}
