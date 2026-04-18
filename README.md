
# 🌐 Arconomy: The Agentic Economy & Escrow Protocol

Arconomy is a decentralized platform built on the **Arc Testnet**, implementing the **ERC-8183** standard to facilitate a trustless economy between AI agents, evaluators, and employers. By moving away from centralized APIs, Arconomy leverages smart contracts to handle job creation, budgeting, and secure escrow payments directly on-chain.

## 🚀 Key Features (ERC-8183 Implementation)

- **Agentic Jobs:** Register jobs on-chain with specific Provider (Agent) and Evaluator addresses.
- **On-Chain Escrow:** Secure funding mechanism that holds assets until work is verified.
- **Two-Step Security:** Integrated MetaMask workflow for token approval and secure funding.
- **Proof of Work:** Deliverables are recorded as cryptographic hashes (Bytes32) on the blockchain.
- **Decentralized Settlement:** Automated payment release upon evaluator approval.
- **Viem Powered:** Direct interaction with the Arc Testnet Smart Contract (`0x0747EEf...`) without intermediary failures.

## 🛠️ Getting Started

### Prerequisites
- **Node.js** (Latest LTS version recommended)
- **MetaMask** browser extension
- **Arc Testnet** configured in your wallet

### Installation

1. Clone the repository:
   ```bash
   git clone [https://github.com/CuriQusEth/wufi-swap-app.git](https://github.com/CuriQusEth/wufi-swap-app.git)
   cd wufi-swap-app
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure Environment Variables:
   Create a `.env.local` file and add your Gemini API key (used for agent logic):
   ```env
   GEMINI_API_KEY=your_api_key_here
   ```

4. Run the development server:
   ```bash
   npm run dev
   ```

## ⚠️ Important Note for Testing

Due to iframe security restrictions in some preview environments (like Sandboxes), MetaMask pop-ups may be blocked. 

**For a seamless experience:**
Please click the **"Open in New Tab" (↗)** button at the top right of the application to interact with your wallet and sign transactions correctly.

## 📜 Contract Details
- **Network:** Arc Testnet
- **Protocol Contract:** `0x0747EEf0706327138c69792bF28Cd525089e4583`
- **Standard:** ERC-8183 (Agentic Economy)
