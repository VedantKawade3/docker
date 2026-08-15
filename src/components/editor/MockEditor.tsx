"use client";

import React, { useState, useCallback, useEffect } from 'react';
import { useDockerStore } from '@/store/useDockerStore';
import { levels, FileNode } from '@/data/levels';
import {
  ChevronRight, ChevronDown, FileText, Folder, Terminal,
  CheckCircle2, ArrowRight, Trophy, Upload, X, Copy, Check,
  FolderOpen, AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// ── File tree item ────────────────────────────────────────────────────────────

function FileTreeItem({
  node, depth = 0, onSelect, selectedFile,
}: { node: FileNode; depth?: number; onSelect: (n: FileNode) => void; selectedFile: FileNode | null }) {
  const [open, setOpen] = useState(true);
  const isDir = node.type === 'folder';
  const isSelected = selectedFile?.name === node.name && !isDir;

  return (
    <div>
      <div
        onClick={() => isDir ? setOpen(!open) : onSelect(node)}
        style={{
          paddingLeft: `${depth * 14 + 10}px`,
          color: isSelected ? 'var(--accent)' : 'var(--text-secondary)',
        }}
        className={[
          'flex items-center gap-1.5 py-[4px] pr-3 cursor-pointer text-xs select-none transition-all rounded-md mx-1 my-0.5',
          isSelected
            ? 'bg-blue-500/15 text-blue-500 font-medium'
            : 'hover:bg-black/5 dark:hover:bg-white/5',
        ].join(' ')}
      >
        {isDir
          ? open
            ? <ChevronDown size={13} className="opacity-60 shrink-0" />
            : <ChevronRight size={13} className="opacity-60 shrink-0" />
          : <FileText size={13} className="opacity-70 shrink-0" />
        }
        {isDir ? <Folder size={13} className="text-amber-500 shrink-0" /> : null}
        <span className={isDir ? 'font-medium' : ''} style={{ color: isDir ? 'var(--text-primary)' : undefined }}>
          {node.name}
        </span>
      </div>
      {isDir && open && node.children?.map((child, i) => (
        <FileTreeItem key={i} node={child} depth={depth + 1} onSelect={onSelect} selectedFile={selectedFile} />
      ))}
    </div>
  );
}

// ── Syntax highlighter (Theme-aware) ──────────────────────────────────────────

function HighlightedCode({ content, name }: { content: string; name: string }) {
  const ext = name.split('.').pop() ?? '';
  const lines = content.split('\n');

  const getSyntaxClass = (line: string) => {
    if (!line.trim()) return '';
    if (ext === 'json') return 'text-emerald-600 dark:text-emerald-300';
    if (ext === 'dockerfile' || name === 'Dockerfile') {
      if (line.startsWith('FROM') || line.startsWith('WORKDIR') || line.startsWith('COPY') || line.startsWith('RUN') || line.startsWith('EXPOSE') || line.startsWith('CMD')) {
        return 'text-blue-600 dark:text-blue-400 font-semibold';
      }
      return 'text-sky-700 dark:text-sky-300';
    }
    if (ext === 'yml' || ext === 'yaml') {
      if (line.includes(':')) return 'text-amber-700 dark:text-amber-300';
      return 'text-emerald-700 dark:text-emerald-400';
    }
    if (ext === 'js' || ext === 'ts') {
      if (line.includes('require') || line.includes('import') || line.includes('const') || line.includes('let')) {
        return 'text-indigo-600 dark:text-indigo-400';
      }
      return 'text-slate-800 dark:text-slate-200';
    }
    return 'text-slate-800 dark:text-slate-200';
  };

  return (
    <div className="p-4 font-mono text-xs leading-relaxed overflow-auto h-full select-text">
      {lines.map((line, i) => (
        <div key={i} className="flex">
          <span className="select-none w-8 text-right pr-4 opacity-40 shrink-0" style={{ color: 'var(--text-muted)' }}>
            {i + 1}
          </span>
          <span className={getSyntaxClass(line)} style={{ color: !getSyntaxClass(line) ? 'var(--text-primary)' : undefined }}>
            {line || '\u00A0'}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Upload Project Modal ───────────────────────────────────────────────────────

function UploadProjectModal({ onClose }: { onClose: () => void }) {
  const { setCustomProjectStructure } = useDockerStore();
  const [pastedText, setPastedText] = useState('');
  const [error, setError] = useState('');
  const [step, setStep] = useState<1 | 2>(1);
  const [copied, setCopied] = useState<string | null>(null);

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  const parseVedantOutput = useCallback((text: string): FileNode[] | null => {
    try {
      const parsed = JSON.parse(text.trim());
      if (Array.isArray(parsed)) return parsed as FileNode[];
    } catch {
      // Fall through to tree parser
    }

    const lines = text.trim().split('\n').filter(l => l.trim());
    if (lines.length === 0) return null;

    const rootName = lines[0].trim().replace(/\/$/, '');
    const root: FileNode = { name: rootName, type: 'folder', children: [] };
    const stack: { node: FileNode; depth: number }[] = [{ node: root, depth: -1 }];

    for (let i = 1; i < lines.length; i++) {
      const raw = lines[i];
      const depth = raw.search(/[a-zA-Z0-9._]/);
      const nameRaw = raw.replace(/^[│├└─\s]+/, '').trim();
      if (!nameRaw) continue;
      const isDir = nameRaw.endsWith('/');
      const name = nameRaw.replace(/\/$/, '');

      const node: FileNode = isDir
        ? { name, type: 'folder', children: [] }
        : { name, type: 'file', content: `# ${name}\n# Uploaded from custom repository structure` };

      while (stack.length > 1 && stack[stack.length - 1].depth >= depth) {
        stack.pop();
      }
      const parent = stack[stack.length - 1].node;
      parent.children = parent.children ?? [];
      parent.children.push(node);
      if (isDir) stack.push({ node, depth });
    }

    return [root];
  }, []);

  const handleLoad = () => {
    setError('');
    if (!pastedText.trim()) {
      setError('Please paste your project structure first.');
      return;
    }
    const result = parseVedantOutput(pastedText);
    if (!result) {
      setError('Could not parse the structure. Ensure you ran `vedant` or pasted valid project tree format.');
      return;
    }
    setCustomProjectStructure(result);
    onClose();
  };

  const handleClear = () => {
    setCustomProjectStructure(null);
    onClose();
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)' }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="w-full max-w-lg rounded-2xl border shadow-2xl overflow-hidden"
        style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-strong)', color: 'var(--text-primary)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-2">
            <Upload size={16} className="text-blue-500" />
            <span className="font-semibold text-sm">Upload Project Structure</span>
          </div>
          <button
            onClick={onClose}
            aria-label="Close modal"
            className="p-1 rounded-md hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
            style={{ color: 'var(--text-muted)' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Step tabs */}
        <div className="flex border-b" style={{ borderColor: 'var(--border)', background: 'var(--bg-elevated)' }}>
          {([1, 2] as const).map(s => (
            <button
              key={s}
              onClick={() => setStep(s)}
              className={[
                'flex-1 py-2.5 text-xs font-semibold transition-colors',
                step === s ? 'text-blue-500 border-b-2 border-blue-500 -mb-px' : 'text-neutral-500',
              ].join(' ')}
            >
              {s === 1 ? '1. Export Structure' : '2. Paste & Visualize'}
            </button>
          ))}
        </div>

        <div className="p-5">
          {step === 1 && (
            <div className="space-y-4">
              <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                Run these two commands in your terminal to generate your project repository structure:
              </p>

              {/* Step A */}
              <div className="rounded-xl p-3.5 border" style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border)' }}>
                <p className="text-[10px] uppercase tracking-widest font-bold mb-2" style={{ color: 'var(--text-muted)' }}>Step A — Install CLI</p>
                <div className="flex items-center gap-2 rounded-lg px-3 py-2 font-mono text-xs" style={{ background: 'var(--code-bg)', border: '1px solid var(--border)' }}>
                  <span className="text-emerald-500 font-semibold flex-1">pip install vedant</span>
                  <button onClick={() => handleCopy('pip install vedant', 'a')} className="p-1 rounded hover:bg-black/5 dark:hover:bg-white/10 transition-colors" style={{ color: 'var(--text-muted)' }}>
                    {copied === 'a' ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                  </button>
                </div>
              </div>

              {/* Step B */}
              <div className="rounded-xl p-3.5 border" style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border)' }}>
                <p className="text-[10px] uppercase tracking-widest font-bold mb-2" style={{ color: 'var(--text-muted)' }}>Step B — Run in your project directory</p>
                <div className="flex items-center gap-2 rounded-lg px-3 py-2 font-mono text-xs" style={{ background: 'var(--code-bg)', border: '1px solid var(--border)' }}>
                  <span className="text-amber-500 font-semibold flex-1">vedant</span>
                  <button onClick={() => handleCopy('vedant', 'b')} className="p-1 rounded hover:bg-black/5 dark:hover:bg-white/10 transition-colors" style={{ color: 'var(--text-muted)' }}>
                    {copied === 'b' ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                  </button>
                </div>
                <p className="text-[10px] mt-2" style={{ color: 'var(--text-muted)' }}>
                  This command outputs your project hierarchy tree. Copy the entire output.
                </p>
              </div>

              <button
                onClick={() => setStep(2)}
                className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold px-4 py-2.5 rounded-xl transition-all shadow-md shadow-blue-500/20"
              >
                Continue to Paste <ArrowRight size={14} />
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                Paste the terminal tree output from <code className="text-amber-500 font-mono px-1 py-0.5 rounded" style={{ background: 'var(--bg-elevated)' }}>vedant</code>:
              </p>
              <textarea
                value={pastedText}
                onChange={e => { setPastedText(e.target.value); setError(''); }}
                placeholder={`my-project/\n├── src/\n│   ├── index.js\n│   └── server.js\n├── package.json\n└── Dockerfile`}
                rows={8}
                className="w-full font-mono text-xs p-3 rounded-xl border resize-none outline-none focus:ring-2 focus:ring-blue-500/30 transition-all"
                style={{ background: 'var(--code-bg)', borderColor: 'var(--border-strong)', color: 'var(--text-primary)' }}
              />
              {error && (
                <div className="flex items-start gap-2 text-xs text-red-500 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                  <AlertCircle size={14} className="shrink-0 mt-0.5" />
                  {error}
                </div>
              )}
              <div className="flex gap-2">
                <button
                  onClick={handleClear}
                  className="flex-1 text-xs font-medium px-4 py-2.5 rounded-xl border transition-colors hover:bg-black/5 dark:hover:bg-white/5"
                  style={{ borderColor: 'var(--border-strong)', color: 'var(--text-secondary)' }}
                >
                  Reset to Level Files
                </button>
                <button
                  onClick={handleLoad}
                  className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold px-4 py-2.5 rounded-xl transition-all shadow-md shadow-blue-500/20"
                >
                  <FolderOpen size={13} /> Load Structure
                </button>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function MockEditor() {
  const {
    currentLevelIndex, isLevelComplete, completedLevels,
    advanceLevel, executeCommand, customProjectStructure,
  } = useDockerStore();
  const level = levels[currentLevelIndex] || levels[0];

  const displayFiles = (customProjectStructure ?? level.initialFiles) as FileNode[];

  const getFirstFile = (nodes: FileNode[]): FileNode | null => {
    for (const n of nodes) {
      if (n.type === 'file') return n;
      if (n.children) { const f = getFirstFile(n.children); if (f) return f; }
    }
    return null;
  };

  const [selectedFile, setSelectedFile] = useState<FileNode | null>(getFirstFile(displayFiles));
  const [activeTab, setActiveTab] = useState<'editor' | 'hints'>('editor');
  const [showUploadModal, setShowUploadModal] = useState(false);

  // Sync selected file when advancing levels or loading custom project
  useEffect(() => {
    setSelectedFile(getFirstFile(displayFiles));
  }, [currentLevelIndex, customProjectStructure]);

  const hints = level?.hints ?? [];

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ background: 'var(--bg-surface)', color: 'var(--text-primary)' }}>
      {/* ── Objective banner ── */}
      <div className="p-4 border-b shrink-0" style={{ borderColor: 'var(--border)', background: 'var(--bg-elevated)' }}>
        <div className="flex items-center gap-2 mb-1.5">
          <span className="text-[10px] font-bold uppercase tracking-widest text-blue-500 bg-blue-500/10 px-2 py-0.5 rounded-full border border-blue-500/20">
            Level {currentLevelIndex + 1} / {levels.length}
          </span>
          <div className="flex gap-1 ml-auto">
            {levels.map((_, i) => (
              <div
                key={i}
                className={[
                  'w-2 h-2 rounded-full transition-colors',
                  i === currentLevelIndex ? 'bg-blue-500' :
                  completedLevels.includes(i) ? 'bg-emerald-500' :
                  'bg-neutral-400 dark:bg-neutral-700',
                ].join(' ')}
              />
            ))}
          </div>
        </div>
        <h2 className="text-sm font-bold mb-1 leading-tight">{level.title}</h2>
        <p className="text-blue-500 dark:text-blue-400 text-xs font-semibold mb-1.5">{level.objective}</p>
        <p className="text-xs leading-relaxed px-3 py-2 rounded-lg border" style={{ color: 'var(--text-secondary)', background: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
          {level.problem}
        </p>
      </div>

      {/* ── Level complete overlay ── */}
      <AnimatePresence>
        {isLevelComplete && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="mx-3 mt-3 p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 level-complete-glow shrink-0"
          >
            <div className="flex items-center gap-2 mb-2">
              <Trophy className="text-amber-500" size={16} />
              <span className="text-emerald-600 dark:text-emerald-400 font-bold text-xs">Level Complete!</span>
            </div>
            <p className="text-xs mb-3" style={{ color: 'var(--text-secondary)' }}>
              Great work! You've successfully completed this level.
            </p>
            {currentLevelIndex < levels.length - 1 ? (
              <button
                onClick={advanceLevel}
                className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors w-full justify-center shadow-sm"
              >
                Next Level <ArrowRight size={14} />
              </button>
            ) : (
              <div className="text-center text-amber-500 font-bold text-xs">
                🎉 All levels completed! Docker Master!
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Tabs + Upload button ── */}
      <div className="flex items-center border-b shrink-0" style={{ borderColor: 'var(--border)', background: 'var(--bg-surface)' }}>
        <button
          onClick={() => setActiveTab('editor')}
          className={[
            'flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium transition-colors',
            activeTab === 'editor'
              ? 'text-blue-500 border-b-2 border-blue-500 -mb-px font-semibold'
              : 'hover:text-blue-500',
          ].join(' ')}
          style={{ color: activeTab === 'editor' ? 'var(--accent)' : 'var(--text-muted)' }}
        >
          <FileText size={13} /> Files
          {customProjectStructure && <span className="ml-1 w-1.5 h-1.5 rounded-full bg-amber-500 inline-block" title="Custom project loaded" />}
        </button>
        <button
          onClick={() => setActiveTab('hints')}
          className={[
            'flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium transition-colors',
            activeTab === 'hints'
              ? 'text-blue-500 border-b-2 border-blue-500 -mb-px font-semibold'
              : 'hover:text-blue-500',
          ].join(' ')}
          style={{ color: activeTab === 'hints' ? 'var(--accent)' : 'var(--text-muted)' }}
        >
          <Terminal size={13} /> Hints
        </button>
        <button
          onClick={() => setShowUploadModal(true)}
          className="ml-auto mr-3 flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded-md border transition-colors hover:border-blue-500 hover:text-blue-500"
          style={{ color: 'var(--text-secondary)', borderColor: 'var(--border)' }}
          title="Upload project structure"
        >
          <Upload size={12} /> Upload
        </button>
      </div>

      {/* ── Editor tab ── */}
      {activeTab === 'editor' && (
        <div className="flex flex-1 overflow-hidden">
          {/* File explorer */}
          <div className="w-40 border-r py-2 overflow-y-auto shrink-0" style={{ borderColor: 'var(--border)', background: 'var(--bg-app)' }}>
            <div className="px-3 mb-1.5 text-[9px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
              {customProjectStructure ? 'Custom Project' : 'Explorer'}
            </div>
            {displayFiles.map((node, i) => (
              <FileTreeItem
                key={i}
                node={node}
                onSelect={f => setSelectedFile(f)}
                selectedFile={selectedFile}
              />
            ))}
          </div>

          {/* Code preview */}
          <div className="flex-1 flex flex-col min-w-0" style={{ background: 'var(--editor-bg)' }}>
            {selectedFile ? (
              <>
                <div className="flex items-center gap-2 px-3 py-2 border-b text-xs shrink-0 font-medium" style={{ borderColor: 'var(--border)', background: 'var(--code-bg)', color: 'var(--text-secondary)' }}>
                  <FileText size={12} className="shrink-0 opacity-70" />
                  <span className="truncate">{selectedFile.name}</span>
                </div>
                <div className="flex-1 overflow-auto">
                  <HighlightedCode content={selectedFile.content ?? ''} name={selectedFile.name} />
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-xs" style={{ color: 'var(--text-muted)' }}>
                Select a file to view content
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Hints tab ── */}
      {activeTab === 'hints' && (
        <div className="flex-1 overflow-y-auto p-4">
          <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>
            Run these commands in order to complete this level:
          </p>
          <div className="space-y-2">
            {hints.map((hint, i) => (
              <button
                key={i}
                onClick={() => executeCommand(hint)}
                className="w-full flex items-center justify-between gap-3 p-3 rounded-xl border transition-all group text-left hover:border-blue-500/50 hover:shadow-sm"
                style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border)' }}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <CheckCircle2 size={14} className="text-blue-500 shrink-0" />
                  <code className="text-xs font-mono font-medium text-emerald-600 dark:text-emerald-400 truncate">{hint}</code>
                </div>
                <span className="text-[10px] font-semibold text-blue-500 shrink-0 opacity-80 group-hover:opacity-100">Run ↵</span>
              </button>
            ))}
          </div>
          <p className="text-[10px] mt-4 italic" style={{ color: 'var(--text-muted)' }}>
            Click any command to execute it, or type it in the terminal below.
          </p>
        </div>
      )}

      {/* ── Upload Modal ── */}
      <AnimatePresence>
        {showUploadModal && <UploadProjectModal onClose={() => setShowUploadModal(false)} />}
      </AnimatePresence>
    </div>
  );
}
