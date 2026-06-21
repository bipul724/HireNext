import React from 'react';
import { useExecutionStore } from '../../store/use-execution-store';
import { Play, Terminal, Trash2, CheckCircle2, XCircle, Clock } from 'lucide-react';

export function ExecutionPanel() {
  const { isRunning, stdout, stderr, exitCode, executionTime, executedBy, clearOutput } = useExecutionStore();

  const hasOutput = stdout || stderr || exitCode !== null;

  return (
    <div className="flex flex-col h-64 bg-gray-900 border-t border-gray-700 text-gray-300 font-mono text-sm overflow-hidden">
      {/* Panel Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-800 border-b border-gray-700">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-gray-400" />
          <span className="font-medium text-gray-200">Execution Output</span>
          {isRunning && (
            <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 flex items-center gap-1.5 animate-pulse">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-400"></div>
              Running...
            </span>
          )}
        </div>
        
        <div className="flex items-center gap-4">
          {hasOutput && !isRunning && (
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1 text-gray-400">
                <Clock className="w-3.5 h-3.5" />
                {executionTime}ms
              </span>
              <span className={`flex items-center gap-1 font-medium ${exitCode === 0 ? 'text-green-400' : 'text-red-400'}`}>
                {exitCode === 0 ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                Exit {exitCode}
              </span>
            </div>
          )}
          
          <button 
            onClick={clearOutput}
            disabled={!hasOutput && !isRunning}
            className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Clear
          </button>
        </div>
      </div>

      {/* Output Area */}
      <div className="flex-1 overflow-y-auto p-4 relative">
        {!hasOutput && !isRunning && (
          <div className="absolute inset-0 flex items-center justify-center text-gray-500 italic">
            Run your code to see the output here...
          </div>
        )}

        {isRunning && !hasOutput && (
          <div className="flex items-center gap-2 text-blue-400">
            <Play className="w-4 h-4 animate-bounce" />
            Executing code (requested by {executedBy})...
          </div>
        )}

        {stdout && (
          <pre className="whitespace-pre-wrap text-gray-300 break-words mb-2">{stdout}</pre>
        )}
        
        {stderr && (
          <pre className="whitespace-pre-wrap text-red-400 break-words mt-2">{stderr}</pre>
        )}
      </div>
    </div>
  );
}
