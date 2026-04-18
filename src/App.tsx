import React, { useState } from 'react';
import { SwapCard } from './components/SwapCard';
import { SendCard } from './components/SendCard';
import { WalletButton } from './components/WalletButton';
import { useWallet } from './hooks/useWallet';

export default function App() {
  const { address, adapter, isConnecting, connect, disconnect } = useWallet();
  const [activeTab, setActiveTab] = useState<'swap' | 'send'>('swap');

  return (
    <div className="min-h-screen flex flex-col">
      {/* Navigation */}
      <header className="px-8 py-4 flex items-center justify-between border-b border-border">
        <div className="flex items-center gap-2.5 text-xl font-bold tracking-tight">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#3d6eff] to-[#ff3dbe]"></div>
          Arc App Kit
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
        
        {/* Tab Selector */}
        <div className="flex bg-input p-1 rounded-full w-full max-w-[480px]">
          <button 
            onClick={() => setActiveTab('swap')}
            className={`flex-1 py-2 text-sm font-semibold rounded-full transition-all ${activeTab === 'swap' ? 'bg-card text-text-primary shadow-sm' : 'text-text-secondary hover:text-text-primary'}`}
          >
            Swap
          </button>
          <button 
            onClick={() => setActiveTab('send')}
            className={`flex-1 py-2 text-sm font-semibold rounded-full transition-all ${activeTab === 'send' ? 'bg-card text-text-primary shadow-sm' : 'text-text-secondary hover:text-text-primary'}`}
          >
            Send
          </button>
        </div>

        {activeTab === 'swap' ? (
          <SwapCard adapter={adapter} address={address} />
        ) : (
          <SendCard adapter={adapter} address={address} />
        )}
        
        <div className="absolute bottom-5 left-5 text-xs text-text-secondary flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 bg-[#f1c40f] rounded-full"></div>
          Connected to Arc_Testnet
        </div>
      </main>
    </div>
  );
}
