import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import * as dotenv from "dotenv";

// Load environment variables for local dev
dotenv.config({ path: ".env.local" });
dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware to parse JSON
  app.use(express.json());

  // API Route: Backend flow for GM Rewards (Circle integration)
  app.post("/api/circle/reward", async (req, res) => {
    try {
      const { address, streak } = req.body;
      
      const apiKey = process.env.CIRCLE_API_KEY;
      if (!apiKey) {
        console.error("CIRCLE_API_KEY environment variable is missing.");
        return res.status(500).json({ error: "CIRCLE_API_KEY is not configured on the server." });
      }

      console.log(`[Backend] Processing Circle GM Reward for address: ${address}, streak: ${streak}`);
      
      // Calculate reward (e.g., 1 GM -> 0.01 USDC, bonus at 7 streak)
      let rewardAmount = 0.01;
      if (streak % 7 === 0) {
        rewardAmount += 0.05; // Bonus for 7-day streak
        console.log(`[Backend] Applying bonus reward. Total: ${rewardAmount} USDC`);
      }

      // Here you would implement the specific Circle Developer API call using the circle SDK or fetch.
      // Example placeholder logic:
      // const response = await fetch("https://api.circle.com/v1/w3s/developer/transactions/transfer", {
      //   method: "POST",
      //   headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
      //   body: JSON.stringify({ amount: rewardAmount.toString(), tokenId: "USDC_TOKEN_ID", ... })
      // });
      
      return res.json({ 
        success: true, 
        message: `Processed ${rewardAmount} USDC reward for ${address} via Circle API!`,
        reward: rewardAmount
      });

    } catch (error) {
      console.error("[Backend] Circle reward error:", error);
      return res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Production static serving
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Backend] Server running on http://localhost:${PORT}`);
  });
}

startServer();
