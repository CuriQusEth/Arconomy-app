import React, { useState } from 'react';
import { SendCard } from './components/SendCard';
import { ERC8183Card } from './components/ERC8183Card';
import { WalletButton } from './components/WalletButton';
import { useWallet } from './hooks/useWallet';
import { AlertCircle } from 'lucide-react';

// Detect if we're running inside the AI Studio Preview iFrame
const isIframe = window !== window.parent;

export default function App() {
  const { address, adapter, isConnecting, connect, disconnect } = useWallet();
  const [activeTab, setActiveTab] = useState<'send' | 'jobs'>('jobs');

  return (
    <div className="min-h-screen flex flex-col">
      {/* Navigation */}
      <header className="px-8 py-4 flex items-center justify-between border-b border-border">
        <div className="flex items-center gap-2.5 text-xl font-bold tracking-tight">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#3d6eff] to-[#ff3dbe]"></div>
          Arc Agentic App
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
          <div className="w-full max-w-[480px] bg-yellow-500/10 border border-yellow-500/50 text-yellow-500 p-3 rounded-xl flex items-start gap-3 text-sm font-medium shadow-lg">
            <AlertCircle className="shrink-0 mt-0.5 text-yellow-500" size={18} />
            <p className="leading-snug">
              <strong className="text-yellow-400 block mb-1">Sandbox Preview Active</strong>
              Cüzdan uzantıları (MetaMask) ve dış API çağrıları Sandbox panelinde engellenir. Bu yüzden fonksiyonlar çalışmaz. İşlem yapabilmek için <strong className="text-yellow-400">sağ üstteki ↗ (Yeni Sekmede Aç)</strong> butonuna tıklayın.
            </p>
          </div>
        )}

        {/* Tab Selector */}
        <div className="flex bg-input p-1 rounded-full w-full max-w-[480px]">
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

        {activeTab === 'send' ? (
          <SendCard adapter={adapter} address={address} />
        ) : (
          <ERC8183Card address={address} />
        )}
        
        <div className="absolute bottom-5 left-5 text-xs text-text-secondary flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 bg-[#f1c40f] rounded-full"></div>
          Connected to Arc_Testnet
        </div>
      </main>
    </div>
  );
}
