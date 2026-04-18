import React, { useState } from 'react';
import { Settings, AlertCircle, CheckCircle2, Loader2, Briefcase } from 'lucide-react';
import { createWalletClient, createPublicClient, custom, parseAbi, parseUnits } from 'viem';

interface ERC8183Props {
  address: string | null;
}

const ERC8183_ADDRESS = '0x0747EEf0706327138c69792bF28Cd525089e4583';
const USDC_ADDRESS = '0x3600000000000000000000000000000000000000';

export function ERC8183Card({ address }: ERC8183Props) {
  const [action, setAction] = useState('create');
  const [jobId, setJobId] = useState('1');
  const [providerAddr, setProviderAddr] = useState('');
  const [evaluatorAddr, setEvaluatorAddr] = useState('');
  const [amount, setAmount] = useState('5.0');
  const [desc, setDesc] = useState('Review a market brief on stablecoin payments in Asia.');
  const [hashValue, setHashValue] = useState('0x56f2c5a6adee8c37f3d40bd77c97a5e2395569d45ed60f9cb8a2f9a1ef39ecb1');
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [txStatus, setTxStatus] = useState<'idle' | 'pending' | 'success' | 'error'>('idle');
  const [txHash, setTxHash] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const executeTx = async () => {
    if (!address || !window.ethereum) {
      alert('Lütfen önce cüzdanınızı bağlayın.');
      return;
    }

    setIsProcessing(true);
    setTxStatus('pending');
    setErrorMessage(null);
    setTxHash(null);

    try {
      const publicClient = createPublicClient({ transport: custom(window.ethereum as any) });
      const walletClient = createWalletClient({ transport: custom(window.ethereum as any) });
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
          account
        });
      } 
      else if (action === 'budget') {
        const abi = parseAbi(['function setBudget(uint256 jobId, uint256 amount, bytes optParams)']);
        finalHash = await walletClient.writeContract({
          address: ERC8183_ADDRESS,
          abi,
          functionName: 'setBudget',
          args: [BigInt(jobId), parseUnits(amount, 6), '0x'],
          account
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
          account
        });
        
        // Cüzdandan onayı bekleyip bloka yazılmasını garantiye al.
        await publicClient.waitForTransactionReceipt({ hash: approveHash });

        // ERC8183 Fund
        const abi = parseAbi(['function fund(uint256 jobId, bytes optParams)']);
        finalHash = await walletClient.writeContract({
          address: ERC8183_ADDRESS,
          abi,
          functionName: 'fund',
          args: [BigInt(jobId), '0x'],
          account
        });
      } 
      else if (action === 'submit') {
        const abi = parseAbi(['function submit(uint256 jobId, bytes32 deliverable, bytes optParams)']);
        finalHash = await walletClient.writeContract({
          address: ERC8183_ADDRESS,
          abi,
          functionName: 'submit',
          args: [BigInt(jobId), hashValue as `0x${string}`, '0x'],
          account
        });
      } 
      else if (action === 'complete') {
        const abi = parseAbi(['function complete(uint256 jobId, bytes32 reason, bytes optParams)']);
        finalHash = await walletClient.writeContract({
          address: ERC8183_ADDRESS,
          abi,
          functionName: 'complete',
          args: [BigInt(jobId), hashValue as `0x${string}`, '0x'],
          account
        });
      }

      if (finalHash) {
         setTxHash(finalHash);
         setTxStatus('success');
      }
    } catch (error: any) {
      console.error('ERC8183 Tx failed:', error);
      setErrorMessage(error.shortMessage || error.message || 'Sözleşme çağrısı başarısız oldu.');
      setTxStatus('error');
    } finally {
      setIsProcessing(false);
    }
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
          <button className="text-text-secondary hover:text-text-primary transition-colors">
            <Settings size={18} />
          </button>
        </div>

        <div className="space-y-4">
          
          {/* Action Selector */}
          <div className="bg-input rounded-2xl border border-transparent hover:border-border transition-colors">
            <select
              value={action}
              onChange={(e) => setAction(e.target.value)}
              className="w-full bg-transparent text-text-primary p-4 outline-none font-semibold cursor-pointer appearance-none"
            >
              <option value="create" className="bg-card">1. Create Job (İş Tanımla)</option>
              <option value="budget" className="bg-card">2. Set Budget (Bütçe Belirle)</option>
              <option value="fund" className="bg-card">3. Fund Job (Escrow Fonla)</option>
              <option value="submit" className="bg-card">4. Submit Work (Görevi Teslim Et)</option>
              <option value="complete" className="bg-card">5. Complete (Değerlendir ve Öde)</option>
            </select>
          </div>

          <div className="h-[1px] bg-border w-full my-2"></div>

          {/* Dynamic Form Fields based on Action */}
          
          {(action === 'create') && (
            <>
              <div className="space-y-1">
                <label className="text-xs text-text-secondary px-1">Provider Address (Ajan)</label>
                <input type="text" placeholder="0x..." value={providerAddr} onChange={e => setProviderAddr(e.target.value)} className="w-full bg-input rounded-xl p-3 text-sm outline-none font-mono" />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-text-secondary px-1">Evaluator Address (Hakem)</label>
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
              {action === 'fund' && <span className="text-[10px] text-[#f1c40f] px-1 block mt-1">Not: Fonlama işlemi hem Approve (Onay) hem de Fund akıllı kontrat işlemlerini arka arkaya çağırır.</span>}
            </div>
          )}

          {(action === 'submit' || action === 'complete') && (
            <div className="space-y-1 mt-2">
              <label className="text-xs text-text-secondary px-1">Hash Data (Deliverable / Reason)</label>
              <input type="text" value={hashValue} onChange={e => setHashValue(e.target.value)} className="w-full bg-input rounded-xl p-3 text-sm outline-none font-mono text-[11px]" />
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
          </div>
          <p className="text-xs text-text-secondary max-w-xs break-words mt-1 pl-8">
            {txStatus === 'pending' && 'Lütfen Cüzdanınızı (MetaMask) kontrol edin ve onaylayın...'}
            {txStatus === 'success' && (
              <>
                İşlem blokzincire başarılı bir şekilde yazıldı.{' '}
                {txHash && (
                  <a href={`https://testnet.arcscan.app/tx/${txHash}`} target="_blank" rel="noopener noreferrer" className="text-[#3d6eff] underline hover:text-white block mt-1">
                    ArcScan'de Görüntüle
                  </a>
                )}
              </>
            )}
            {txStatus === 'error' && errorMessage}
          </p>
        </div>
      )}
    </>
  );
}
