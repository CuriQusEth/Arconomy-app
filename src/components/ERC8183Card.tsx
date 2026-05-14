import React, { useState, useEffect } from 'react';
import { Settings, AlertCircle, CheckCircle2, Loader2, Briefcase, History, X, Sparkles } from 'lucide-react';
import { createWalletClient, createPublicClient, custom, parseAbi, parseUnits, http, toHex, keccak256 } from 'viem';
import { ARC_TESTNET_CONFIG, AGENT_WALLET } from '../lib/contracts';
import { useLogs } from '../context/LogContext';

interface ERC8183Props {
  address: string | null;
}

const ERC8183_ADDRESS = '0x0747EEf0706327138c69792bF28Cd525089e4583';
const USDC_ADDRESS = '0x3600000000000000000000000000000000000000';

interface TxHistory {
  action: string;
  hash: string;
  time: string;
  jobId?: string;
}

export function ERC8183Card({ address }: ERC8183Props) {
  const { logAction } = useLogs();
  const [action, setAction] = useState('create');
  const [jobId, setJobId] = useState('1');
  const [providerAddr, setProviderAddr] = useState(AGENT_WALLET);
  const [evaluatorAddr, setEvaluatorAddr] = useState('');
  const [amount, setAmount] = useState('5.0');
  const [desc, setDesc] = useState('Review a market brief on stablecoin payments in Asia.');
  const [hashValue, setHashValue] = useState('0x56f2c5a6adee8c37f3d40bd77c97a5e2395569d45ed60f9cb8a2f9a1ef39ecb1');
  const [useTextForHash, setUseTextForHash] = useState(true);
  const [textForHash, setTextForHash] = useState('Analysis successfully completed. No critical vulnerabilities found in the dataset.');

  const JOB_TEMPLATES = [
    { name: 'Market Brief Review', desc: 'Review a market brief on stablecoin payments in Asia.', amount: '5.0' },
    { name: 'Data Pipeline Analysis', desc: 'Process and analyze DEX volume data for the last 30 days', amount: '15.0' },
    { name: 'Smart Contract Audit', desc: 'Perform static analysis and audit of ERC20 token contract', amount: '50.0' },
  ];

  const getComputedHash = () => {
    if (!useTextForHash) return hashValue;
    try {
      return keccak256(toHex(textForHash));
    } catch {
      return '0x0000000000000000000000000000000000000000000000000000000000000000';
    }
  };
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [txStatus, setTxStatus] = useState<'idle' | 'pending' | 'success' | 'error'>('idle');
  const [txHash, setTxHash] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [showHistory, setShowHistory] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [txHistory, setTxHistory] = useState<TxHistory[]>([]);

  // Load history from local storage on mount
  useEffect(() => {
    const saved = localStorage.getItem('arconomy_history');
    if (saved) {
      try { setTxHistory(JSON.parse(saved)); } catch (e) {}
    }
  }, []);

  const saveHistory = (newHistory: TxHistory[]) => {
    setTxHistory(newHistory);
    localStorage.setItem('arconomy_history', JSON.stringify(newHistory));
  };

  const executeTx = async () => {
    if (!address || !window.ethereum) {
      alert('Please connect your wallet first.');
      return;
    }

    setIsProcessing(true);
    setTxStatus('pending');
    setErrorMessage(null);
    setTxHash(null);

    try {
      // Request wallet to switch to Arc Testnet
      try {
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: '0x4cef52' }], // 5042002 in hex
        });
      } catch (switchError: any) {
        if (switchError.code === 4902) {
          try {
            await window.ethereum.request({
              method: 'wallet_addEthereumChain',
              params: [
                {
                  chainId: '0x4cef52',
                  chainName: 'Arc Testnet',
                  rpcUrls: ['https://rpc.testnet.arc.network'],
                  nativeCurrency: {
                    name: 'USDC',
                    symbol: 'USDC',
                    decimals: 18
                  },
                  blockExplorerUrls: ['https://testnet.arcscan.app']
                },
              ],
            });
          } catch (addError) {
            throw new Error('Failed to add Arc Testnet to wallet. Please add it manually.');
          }
        } else {
          throw new Error('Switch to Arc Testnet was rejected or failed.');
        }
      }

      const publicClient = createPublicClient({ 
        chain: ARC_TESTNET_CONFIG,
        transport: http('https://rpc.testnet.arc.network') 
      });
      const walletClient = createWalletClient({ 
        chain: ARC_TESTNET_CONFIG,
        transport: custom(window.ethereum as any) 
      });
      const account = address as `0x${string}`;
      let finalHash: `0x${string}` | null = null;

      if (action === 'create') {
        const abi = parseAbi(['function createJob(address provider, address evaluator, uint256 expiredAt, string description, address hook) returns (uint256)']);
        finalHash = await walletClient.writeContract({
          address: ERC8183_ADDRESS,
          abi,
          functionName: 'createJob',
          args: [
            (providerAddr || address) as `0x${string}`, 
            (evaluatorAddr || address) as `0x${string}`, 
            BigInt(Math.floor(Date.now() / 1000) + 3600), // expire in 1 hour
            desc, 
            '0x0000000000000000000000000000000000000000'
          ],
          account,
          chain: ARC_TESTNET_CONFIG,
        });
      } 
      else if (action === 'budget') {
        const abi = parseAbi(['function setBudget(uint256 jobId, uint256 amount, bytes optParams)']);
        finalHash = await walletClient.writeContract({
          address: ERC8183_ADDRESS,
          abi,
          functionName: 'setBudget',
          args: [BigInt(jobId), parseUnits(amount, 6), '0x'],
          account,
          chain: ARC_TESTNET_CONFIG,
        });
      } 
      else if (action === 'fund') {
        // USDC Approve 
        const usdcAbi = parseAbi(['function approve(address spender, uint256 amount) returns (bool)']);
        const approveHash = await walletClient.writeContract({
          address: USDC_ADDRESS,
          abi: usdcAbi,
          functionName: 'approve',
          args: [ERC8183_ADDRESS, parseUnits(amount, 6)],
          account,
          chain: ARC_TESTNET_CONFIG,
        });
        
        // Wait for receipt
        await publicClient.waitForTransactionReceipt({ hash: approveHash });

        // ERC8183 Fund
        const abi = parseAbi(['function fund(uint256 jobId, bytes optParams)']);
        finalHash = await walletClient.writeContract({
          address: ERC8183_ADDRESS,
          abi,
          functionName: 'fund',
          args: [BigInt(jobId), '0x'],
          account,
          chain: ARC_TESTNET_CONFIG,
        });
      } 
      else if (action === 'submit') {
        const abi = parseAbi(['function submit(uint256 jobId, bytes32 deliverable, bytes optParams)']);
        finalHash = await walletClient.writeContract({
          address: ERC8183_ADDRESS,
          abi,
          functionName: 'submit',
          args: [BigInt(jobId), getComputedHash() as `0x${string}`, '0x'],
          account,
          chain: ARC_TESTNET_CONFIG,
        });
      } 
      else if (action === 'complete') {
        const abi = parseAbi(['function complete(uint256 jobId, bytes32 reason, bytes optParams)']);
        finalHash = await walletClient.writeContract({
          address: ERC8183_ADDRESS,
          abi,
          functionName: 'complete',
          args: [BigInt(jobId), getComputedHash() as `0x${string}`, '0x'],
          account,
          chain: ARC_TESTNET_CONFIG,
        });
      }

      if (finalHash) {
         setTxHash(finalHash);
         setTxStatus('success');
         
         // Format action name for history
         let actionName = 'Unknown Action';
         if (action === 'create') actionName = 'Job Created';
         if (action === 'budget') actionName = 'Budget Set';
         if (action === 'fund') actionName = 'Job Funded';
         if (action === 'submit') actionName = 'Work Submitted';
         if (action === 'complete') actionName = 'Job Completed';

         const newRecord: TxHistory = {
           action: actionName,
           hash: finalHash,
           time: new Date().toLocaleString(),
           jobId: (action !== 'create') ? jobId : undefined
         };

         saveHistory([newRecord, ...txHistory]);
         
         logAction(`Job Action: ${actionName}`, address, `Executed ${action} flow. TxHash: ${finalHash}`);
      }
    } catch (error: any) {
      console.error('ERC8183 Tx failed:', error);
      setErrorMessage(error.shortMessage || error.message || 'Contract call failed.');
      setTxStatus('error');
    } finally {
      setIsProcessing(false);
    }
  };

  const renderHistoryModal = () => {
    if (!showHistory) return null;
    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-card border border-border w-full max-w-[500px] max-h-[80vh] rounded-[24px] shadow-2xl flex flex-col">
          <div className="px-6 py-4 border-b border-border flex justify-between items-center">
            <h3 className="font-bold text-lg flex items-center gap-2"><History size={20}/> Transaction History</h3>
            <button onClick={() => setShowHistory(false)} className="text-text-secondary hover:text-white transition-colors">
              <X size={20} />
            </button>
          </div>
          <div className="p-6 overflow-y-auto flex-1">
            {txHistory.length === 0 ? (
              <p className="text-center text-text-secondary text-sm my-8">No transactions found.</p>
            ) : (
              <div className="space-y-4">
                {txHistory.map((tx, idx) => (
                  <div key={idx} className="bg-input rounded-xl p-4 flex flex-col gap-1">
                    <div className="flex justify-between items-start">
                      <strong className="text-white text-sm">{tx.action}</strong>
                      <span className="text-xs text-text-secondary">{tx.time}</span>
                    </div>
                    {tx.jobId && <span className="text-xs text-text-secondary">Job ID: {tx.jobId}</span>}
                    <a href={`https://testnet.arcscan.app/tx/${tx.hash}`} target="_blank" rel="noopener noreferrer" className="text-[#3d6eff] text-xs underline truncate mt-1">
                      {tx.hash}
                    </a>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderSettingsModal = () => {
    if (!showSettings) return null;
    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-card border border-border w-full max-w-[400px] rounded-[24px] shadow-2xl flex flex-col">
          <div className="px-6 py-4 border-b border-border flex justify-between items-center">
            <h3 className="font-bold text-lg flex items-center gap-2"><Settings size={20}/> Settings</h3>
            <button onClick={() => setShowSettings(false)} className="text-text-secondary hover:text-white transition-colors">
              <X size={20} />
            </button>
          </div>
          <div className="p-6 space-y-4">
            <div>
              <label className="text-xs text-text-secondary block mb-1">Target Network</label>
              <p className="text-sm font-semibold bg-input p-3 rounded-xl border border-transparent">Arc Testnet (5042002)</p>
            </div>
            <div>
              <label className="text-xs text-text-secondary block mb-1">Protocol Contract</label>
              <p className="text-xs bg-input p-3 rounded-xl break-all font-mono text-text-secondary">{ERC8183_ADDRESS}</p>
            </div>
            <div>
              <label className="text-xs text-text-secondary block mb-1">USDC Contract</label>
              <p className="text-xs bg-input p-3 rounded-xl break-all font-mono text-text-secondary">{USDC_ADDRESS}</p>
            </div>
            <button onClick={() => setShowSettings(false)} className="w-full mt-4 p-3 rounded-xl bg-[#3d6eff] hover:bg-[#2b5ae6] text-white font-semibold transition-colors">
              Close
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      <div className="bg-card w-full max-w-[480px] p-4 rounded-[24px] border border-border shadow-[0_20px_40px_rgba(0,0,0,0.4)]">
        <div className="flex justify-between items-center mb-6">
          <div className="flex flex-col">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Briefcase size={22} className="text-[#3d6eff]" />
              Agentic Escrow
            </h2>
            <span className="text-xs text-text-secondary mt-1">ERC-8183 Open Standard Workflow</span>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => setShowHistory(true)} className="text-text-secondary hover:text-text-primary transition-colors cursor-pointer" title="Transaction History">
              <History size={18} />
            </button>
            <button onClick={() => setShowSettings(true)} className="text-text-secondary hover:text-text-primary transition-colors cursor-pointer" title="Settings">
              <Settings size={18} />
            </button>
          </div>
        </div>

        <div className="space-y-4">
          
          {/* Action Selector */}
          <div className="bg-input rounded-2xl border border-transparent hover:border-border transition-colors">
            <select
              value={action}
              onChange={(e) => setAction(e.target.value)}
              className="w-full bg-transparent text-text-primary p-4 outline-none font-semibold cursor-pointer appearance-none"
            >
              <option value="create" className="bg-card">1. Create Job</option>
              <option value="budget" className="bg-card">2. Set Budget</option>
              <option value="fund" className="bg-card">3. Fund Job</option>
              <option value="submit" className="bg-card">4. Submit Work</option>
              <option value="complete" className="bg-card">5. Complete Job</option>
            </select>
          </div>

          <div className="h-[1px] bg-border w-full my-2"></div>

          {/* Dynamic Form Fields based on Action */}
          
          {(action === 'create') && (
            <>
              <div className="mb-4">
                <label className="text-xs text-text-secondary px-1 flex items-center gap-1 mb-2">
                  <Sparkles size={12} className="text-[#f1c40f]" /> AI Job Templates
                </label>
                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
                  {JOB_TEMPLATES.map(t => (
                    <button
                      key={t.name}
                      onClick={() => { setDesc(t.desc); setAmount(t.amount); }}
                      className="whitespace-nowrap px-3 py-1.5 bg-[#3d6eff]/10 hover:bg-[#3d6eff]/20 border border-[#3d6eff]/20 rounded-lg text-xs font-medium text-[#3d6eff] transition-colors"
                    >
                      {t.name}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between items-center px-1">
                  <label className="text-xs text-text-secondary">Provider Address (Agent)</label>
                  {providerAddr === AGENT_WALLET && <span className="text-[10px] text-[#3d6eff] font-bold">Auto-assigned</span>}
                </div>
                <input type="text" placeholder="0x..." value={providerAddr} onChange={e => setProviderAddr(e.target.value)} className="w-full bg-input rounded-xl p-3 text-sm outline-none font-mono" />
              </div>
              <div className="space-y-1">
                <div className="flex justify-between items-center px-1">
                  <label className="text-xs text-text-secondary">Evaluator Address</label>
                  <button onClick={() => setEvaluatorAddr(AGENT_WALLET)} className="text-[10px] text-[#3d6eff] font-bold hover:underline bg-[#3d6eff]/10 px-2 py-0.5 rounded-full">Use AI Agent</button>
                </div>
                <input type="text" placeholder="0x..." value={evaluatorAddr} onChange={e => setEvaluatorAddr(e.target.value)} className="w-full bg-input rounded-xl p-3 text-sm outline-none font-mono" />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-text-secondary px-1">Description</label>
                <input type="text" value={desc} onChange={e => setDesc(e.target.value)} className="w-full bg-input rounded-xl p-3 text-sm outline-none" />
              </div>
            </>
          )}

          {(action === 'budget' || action === 'fund' || action === 'submit' || action === 'complete') && (
            <div className="space-y-1">
              <label className="text-xs text-text-secondary px-1">Job ID</label>
              <input type="number" placeholder="1" value={jobId} onChange={e => setJobId(e.target.value)} className="w-full bg-input rounded-xl p-3 text-sm outline-none" />
            </div>
          )}

          {(action === 'budget' || action === 'fund') && (
            <div className="space-y-1 mt-2">
              <label className="text-xs text-text-secondary px-1">Amount (USDC)</label>
              <input type="number" placeholder="5" value={amount} onChange={e => setAmount(e.target.value)} className="w-full bg-input rounded-xl p-3 text-sm outline-none" />
              {action === 'fund' && <span className="text-[10px] text-[#f1c40f] px-1 block mt-1">Note: Funding requires two steps. You will be prompted to approve USDC, then fund the escrow.</span>}
            </div>
          )}

          {(action === 'submit' || action === 'complete') && (
            <div className="space-y-2 mt-2">
              <div className="flex justify-between items-center px-1">
                <label className="text-xs text-text-secondary">Deliverable Data (Hashed onchain)</label>
                <button 
                  onClick={() => setUseTextForHash(!useTextForHash)}
                  className="text-[10px] text-[#3d6eff] font-bold hover:underline bg-[#3d6eff]/10 px-2 py-0.5 rounded-full"
                >
                  {useTextForHash ? 'Use Raw Hex Hash' : 'Generate from Text'}
                </button>
              </div>
              
              {useTextForHash ? (
                <div>
                  <textarea 
                    value={textForHash} 
                    onChange={e => setTextForHash(e.target.value)} 
                    className="w-full bg-input rounded-xl p-3 text-sm outline-none resize-none h-20"
                    placeholder="Enter the analysis result or deliverable text here..."
                  />
                  <div className="text-[10px] text-text-secondary mt-1 px-1 break-all flex flex-col">
                    <span>Generated Keccak256 Hash:</span>
                    <span className="font-mono text-[#3d6eff]">{getComputedHash()}</span>
                  </div>
                </div>
              ) : (
                <input type="text" value={hashValue} onChange={e => setHashValue(e.target.value)} className="w-full bg-input rounded-xl p-3 text-sm outline-none font-mono text-[11px]" placeholder="0x..." />
              )}
            </div>
          )}
          
        </div>

        {/* Execute Button */}
        <button
          onClick={executeTx}
          disabled={!address || isProcessing}
          className={`w-full p-4 rounded-xl text-md shadow-lg font-semibold mt-6 transition-colors ${
            !address ? 'bg-input text-text-secondary cursor-not-allowed' :
            isProcessing ? 'bg-accent/50 text-white/50 cursor-not-allowed' :
            'bg-[#3d6eff] hover:bg-[#2b5ae6] text-white'
          }`}
        >
          {!address ? 'Connect Wallet' : isProcessing ? 'Executing...' : 'Execute ERC-8183 Action'}
        </button>
      </div>

      {/* Transaction Status Overlay */}
      {txStatus !== 'idle' && (
        <div className={`fixed bottom-10 right-10 bg-card border px-6 py-4 rounded-xl flex flex-col gap-1 shadow-[0_10px_40px_rgba(0,0,0,0.6)] z-50 min-w-[300px] ${
          txStatus === 'pending' ? 'border-[#3d6eff]' :
          txStatus === 'success' ? 'border-success' :
          'border-red-500'
        }`}>
          <div className="flex items-center gap-3">
            {txStatus === 'pending' && <Loader2 className="animate-spin text-[#3d6eff]" size={20} />}
            {txStatus === 'success' && <CheckCircle2 className="text-success" size={20} />}
            {txStatus === 'error' && <AlertCircle className="text-red-500" size={20} />}
            
            <h4 className="text-sm font-semibold">
              {txStatus === 'pending' ? 'Transaction Pending' : txStatus === 'success' ? 'Contract Executed!' : 'Execution Failed'}
            </h4>
            <div className="absolute top-2 right-2">
              <button onClick={() => setTxStatus('idle')} className="text-text-secondary hover:text-white">
                <X size={16} />
              </button>
            </div>
          </div>
          <p className="text-xs text-text-secondary max-w-xs break-words mt-1 pl-8">
            {txStatus === 'pending' && 'Please check your wallet (MetaMask) and approve the transaction...'}
            {txStatus === 'success' && (
              <>
                Transaction successfully recorded on the blockchain.{' '}
                {txHash && (
                  <a href={`https://testnet.arcscan.app/tx/${txHash}`} target="_blank" rel="noopener noreferrer" className="text-[#3d6eff] underline hover:text-white block mt-1">
                    View on ArcScan
                  </a>
                )}
              </>
            )}
            {txStatus === 'error' && errorMessage}
          </p>
        </div>
      )}

      {renderHistoryModal()}
      {renderSettingsModal()}
    </>
  );
}
