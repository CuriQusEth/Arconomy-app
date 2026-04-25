import React, { useState } from 'react';
import { SendCard } from './components/SendCard';
import { ERC8183Card } from './components/ERC8183Card';
import { GMCard } from './components/GMCard';
import { WalletButton } from './components/WalletButton';
import { useWallet } from './hooks/useWallet';
import { AlertCircle } from 'lucide-react';

// Detect if we're running inside the AI Studio Preview iFrame
const isIframe = window !== window.parent;

export default function App() {
  const { address, adapter, isConnecting, connect, disconnect } = useWallet();
  const [activeTab, setActiveTab] = useState<'gm' | 'jobs' | 'send'>('gm');

  return (
    <div className="min-h-screen flex flex-col">
      {/* Navigation */}
      <header className="px-8 py-4 flex items-center justify-between border-b border-border">
        <div className="flex items-center gap-3 text-2xl font-bold tracking-tight">
          <img 
            src="/logo.png" 
            alt="Arconomy Logo" 
            className="w-10 h-10 object-contain"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
              if (e.currentTarget.nextElementSibling) {
                (e.currentTarget.nextElementSibling as HTMLElement).style.display = 'flex';
              }
            }}
          />
          {/* Fallback CSS Logo if image is not uploaded yet */}
          <div className="hidden w-10 h-10 rounded-full border-[2px] border-[#3d6eff] items-center justify-center relative bg-gradient-to-br from-[#0B1B3D] to-[#1A3673] shadow-[0_0_15px_rgba(61,110,255,0.5)]">
            <span className="text-[#F1C40F] font-black text-xl italic" style={{ textShadow: "0 0 10px rgba(241,196,15,0.8)" }}>A</span>
            <div className="absolute top-0 right-0 w-3 h-3 bg-[#3d6eff] rounded-full border border-[#0B1B3D]"></div>
          </div>
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-blue-200 to-white">
            ARCONOMY
          </span>
        </div>
        <WalletButton 
          address={address} 
          isConnecting={isConnecting} 
          onConnect={connect} 
          onDisconnect={disconnect} 
        />
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col justify-center items-center relative p-4 gap-6">
        
        {isIframe && (
          <div className="w-full max-w-[550px] bg-yellow-500/10 border border-yellow-500/50 text-yellow-500 p-3 rounded-xl flex items-start gap-3 text-sm font-medium shadow-lg">
            <AlertCircle className="shrink-0 mt-0.5 text-yellow-500" size={18} />
            <p className="leading-snug">
              <strong className="text-yellow-400 block mb-1">Sandbox Preview Active</strong>
              Wallet extensions (MetaMask) and external API calls are blocked in the Sandbox panel. To interact with the app, please click the <strong className="text-yellow-400">Open in New Tab (↗)</strong> button at the top right.
            </p>
          </div>
        )}

        {/* Tab Selector */}
        <div className="flex bg-input p-1 rounded-full w-full max-w-[550px]">
          <button 
            onClick={() => setActiveTab('gm')}
            className={`flex-1 py-1.5 text-sm font-semibold rounded-full transition-all ${activeTab === 'gm' ? 'bg-[#3d6eff] text-white shadow-sm' : 'text-text-secondary hover:text-text-primary'}`}
          >
            Daily GM
          </button>
          <button 
            onClick={() => setActiveTab('jobs')}
            className={`flex-1 py-1.5 text-sm font-semibold rounded-full transition-all ${activeTab === 'jobs' ? 'bg-[#3d6eff] text-white shadow-sm' : 'text-text-secondary hover:text-text-primary'}`}
          >
            Agentic Jobs (ERC-8183)
          </button>
          <button 
            onClick={() => setActiveTab('send')}
            className={`flex-1 py-1.5 text-sm font-semibold rounded-full transition-all ${activeTab === 'send' ? 'bg-[#3d6eff] text-white shadow-sm' : 'text-text-secondary hover:text-text-primary'}`}
          >
            Send USDC
          </button>
        </div>

        {activeTab === 'gm' && <GMCard address={address} />}
        {activeTab === 'send' && <SendCard adapter={adapter} address={address} />}
        {activeTab === 'jobs' && <ERC8183Card address={address} />}
        
        <div className="absolute bottom-5 left-5 text-xs text-text-secondary flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 bg-[#f1c40f] rounded-full animate-pulse"></div>
          Connected to Arc Testnet
        </div>
      </main>
    </div>
  );
}
