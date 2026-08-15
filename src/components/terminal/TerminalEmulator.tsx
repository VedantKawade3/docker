"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useDockerStore, TerminalEntry } from '@/store/useDockerStore';
import { RotateCcw, Undo2, HelpCircle } from 'lucide-react';

function OutputLine({ entry }: { entry: TerminalEntry }) {
  const color =
    entry.type === 'error' ? 'text-red-400' :
    entry.type === 'success' ? 'text-emerald-400 font-medium' :
    'text-slate-300';

  return (
    <div className="mb-3">
      <div className="flex items-center text-slate-200">
        <span className="text-blue-400 mr-1.5 select-none font-bold">❯</span>
        <span className="text-emerald-400 mr-2 select-none font-semibold">~/project</span>
        <span className="text-slate-500 mr-2 select-none">$</span>
        <span className="font-mono text-white font-medium">{entry.command}</span>
      </div>
      {entry.output && (
        <pre className={`mt-1 ml-5 whitespace-pre-wrap font-mono text-xs leading-relaxed ${color}`}>
          {entry.output}
        </pre>
      )}
    </div>
  );
}

export default function TerminalEmulator() {
  const { terminalHistory, executeCommand, undo, resetLevel } = useDockerStore();
  const [input, setInput] = useState('');
  const [historyIndex, setHistoryIndex] = useState(-1);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const commandHistory = terminalHistory.map(e => e.command).filter(Boolean);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [terminalHistory]);

  const focusInput = () => inputRef.current?.focus();

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      executeCommand(input.trim());
      setInput('');
      setHistoryIndex(-1);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const newIdx = Math.min(historyIndex + 1, commandHistory.length - 1);
      setHistoryIndex(newIdx);
      setInput(commandHistory[commandHistory.length - 1 - newIdx] ?? '');
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex <= 0) {
        setHistoryIndex(-1);
        setInput('');
      } else {
        const newIdx = historyIndex - 1;
        setHistoryIndex(newIdx);
        setInput(commandHistory[commandHistory.length - 1 - newIdx] ?? '');
      }
    } else if (e.key === 'Tab') {
      e.preventDefault();
      const completions = [
        'docker build -t my-app .',
        'docker build',
        'docker run -d -p 3000:3000 my-app',
        'docker run',
        'docker ps',
        'docker images',
        'docker stop',
        'docker network create',
        'docker-compose up',
        'docker-compose down',
        'undo',
        'reset',
        'clear',
        'help'
      ];
      const match = completions.find(c => c.startsWith(input));
      if (match) setInput(match);
    }
  };

  return (
    <div
      className="flex flex-col h-full font-mono text-sm overflow-hidden"
      style={{ background: 'var(--terminal-bg)' }}
      onClick={focusInput}
    >
      {/* Terminal toolbar */}
      <div
        className="flex items-center justify-between px-4 py-2 border-b select-none shrink-0"
        style={{ borderColor: 'rgba(255,255,255,0.08)', background: 'rgba(0,0,0,0.25)' }}
      >
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
          <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/80" />
          <div className="w-2.5 h-2.5 rounded-full bg-green-500/80" />
          <span className="text-slate-400 text-xs ml-2 font-medium">bash — ~/project</span>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={(e) => { e.stopPropagation(); undo(); }}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-md transition-colors"
            title="Undo last command"
          >
            <Undo2 size={13} />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); resetLevel(); }}
            className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-white/10 rounded-md transition-colors"
            title="Reset level"
          >
            <RotateCcw size={13} />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); executeCommand('help'); }}
            className="p-1.5 text-slate-400 hover:text-blue-400 hover:bg-white/10 rounded-md transition-colors"
            title="Show help"
          >
            <HelpCircle size={13} />
          </button>
        </div>
      </div>

      {/* Output area */}
      <div className="flex-1 overflow-y-auto p-4 cursor-text">
        <div className="text-slate-500 text-xs mb-4 select-none">
          # Learn Docker Workflow Simulation Terminal — type 'help' for commands
        </div>

        {terminalHistory.map((entry, i) => (
          <OutputLine key={i} entry={entry} />
        ))}

        {/* Active input line */}
        <div className="flex items-center text-slate-200">
          <span className="text-blue-400 mr-1.5 select-none font-bold">❯</span>
          <span className="text-emerald-400 mr-2 select-none font-semibold">~/project</span>
          <span className="text-slate-500 mr-2 select-none">$</span>
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 bg-transparent outline-none text-white font-mono caret-blue-400"
            autoFocus
            spellCheck={false}
            autoComplete="off"
            autoCapitalize="off"
          />
          {input === '' && (
            <span className="terminal-caret text-blue-400 select-none font-bold">▋</span>
          )}
        </div>

        <div ref={bottomRef} />
      </div>
    </div>
  );
}
