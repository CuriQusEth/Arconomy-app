import React from 'react';
import { Bot, Copy, ExternalLink, ShieldCheck } from 'lucide-react';
import { AGENT_WALLET } from '../lib/contracts';

export function AgentCard() {
  const copyToClipboard = () => {
    navigator.clipboard.writeText(AGENT_WALLET);
  };

  return (
    <div className="bg-card w-full max-w-[480px] p-6 rounded-[24px] border border-[#3d6eff]/30 shadow-[0_20px_40px_rgba(0,0,0,0.4)] relative overflow-hidden">
      {/* Decorative gradient blur */}
      <div className="absolute top-[-50px] right-[-50px] w-32 h-32 bg-[#3d6eff]/20 rounded-full blur-3xl pointer-events-none"></div>

      <div className="flex justify-between items-center mb-6 relative z-10">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Bot className="text-[#3d6eff]" size={22} /> AI Agent Wallet
        </h2>
        <div className="px-2 py-1 bg-success/10 border border-success/30 rounded-md flex items-center gap-1 text-[10px] text-success font-bold uppercase tracking-wide">
          <ShieldCheck size={12} /> Active
        </div>
      </div>

      <div className="space-y-4 relative z-10">
        <div className="bg-input rounded-2xl p-4 border border-transparent shadow-inner">
          <div className="text-xs text-text-secondary mb-1">Agent Identity (Arc Testnet / BASE)</div>
          <div className="flex items-center justify-between mt-2 mb-1">
            <span className="font-mono text-sm tracking-wide text-white break-all pr-4">
              {AGENT_WALLET}
            </span>
          </div>
          <div className="flex gap-2 mt-3">
            <button 
              onClick={copyToClipboard}
              className="flex-1 flex items-center justify-center gap-1 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-xs font-semibold transition-colors"
            >
              <Copy size={14} /> Copy Address
            </button>
            <a 
              href={`https://testnet.arcscan.app/address/${AGENT_WALLET}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-1 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-xs font-semibold transition-colors text-[#3d6eff] hover:text-[#4d7dff]"
            >
              <ExternalLink size={14} /> View Explorer
            </a>
          </div>
        </div>

        <div className="bg-[#3d6eff]/5 border border-[#3d6eff]/20 rounded-xl p-4 text-sm mt-4 text-text-secondary leading-relaxed">
          <strong className="text-[#3d6eff] block mb-1">Autonomous Capabilities</strong>
          This integrated AI Agent holds funds and autonomously evaluates Escrow milestones via Circle Agent Wallet capabilities. It securely interacts with the ERC-8183 Vault Contract and operates within predefined limits.
        </div>
      </div>
    </div>
  );
}
