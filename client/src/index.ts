/**
 * x402 Client Example
 *
 * This script demonstrates how to:
 * 1. Make a request to a protected endpoint
 * 2. Automatically handle 402 Payment Required
 * 3. Sign and submit payment
 * 4. Receive the protected content
 */

import { config } from "dotenv";
import { x402Client, wrapFetchWithPayment, x402HTTPClient } from "@x402/fetch";
import { registerExactEvmScheme } from "@x402/evm/exact/client";
import { privateKeyToAccount } from "viem/accounts";
import { createPublicClient, http } from "viem";
import { sepolia } from "viem/chains";

config();

// Configuration
const VENDOR_URL = process.env.VENDOR_URL || "http://localhost:3002";

// Validate required environment variables
if (!process.env.EVM_PRIVATE_KEY) {
  console.error("EVM_PRIVATE_KEY environment variable is required");
  console.error("   Add your testnet private key to .env file");
  process.exit(1);
}

// Initialize the EVM account from private key
const evmSigner = privateKeyToAccount(
  process.env.EVM_PRIVATE_KEY as `0x${string}`
);

console.log("\n" + "=".repeat(60));
console.log("           x402 CLIENT - Payment Demo");
console.log("=".repeat(60));
console.log(`\nClient Wallet: ${evmSigner.address}`);
console.log(`Network: Ethereum Sepolia (eip155:11155111)`);
console.log(`Vendor URL: ${VENDOR_URL}`);

// Create public client for balance check
const publicClient = createPublicClient({
  chain: sepolia,
  transport: http(),
});

// MATE on Ethereum Sepolia
const MATE_ADDRESS = "0x0000000000000000000000000000000000000001" as const;

/**
 * Check MATE balance
 */
async function checkBalance(): Promise<number> {
  try {
    const balance = await publicClient.readContract({
      address: MATE_ADDRESS,
      abi: [
        {
          name: "balanceOf",
          type: "function",
          stateMutability: "view",
          inputs: [{ name: "account", type: "address" }],
          outputs: [{ name: "", type: "uint256" }],
        },
      ],
      functionName: "balanceOf",
      args: [evmSigner.address],
    });

    const formatted = Number(balance) / 1e18; // MATE has 18 decimals
    return formatted;
  } catch (error) {
    console.error("   Error checking balance:", error);
    return 0;
  }
}

/**
 * Make a paid request to the vendor
 */
async function makePaidRequest(): Promise<void> {
  console.log("\n" + "-".repeat(60));
  console.log("[STEP 1] Making initial request to protected endpoint");
  console.log("-".repeat(60));
  console.log(`   URL: ${VENDOR_URL}/api/hello`);
  console.log("   Method: GET");
  console.log("   Payment: None (will receive 402)");

  // Initialize x402 client with EVM signer
  const client = new x402Client();
  registerExactEvmScheme(client, { signer: evmSigner });

  // Wrap fetch with automatic payment handling
  const fetchWithPayment = wrapFetchWithPayment(fetch, client);

  try {
    console.log("\n" + "-".repeat(60));
    console.log("[STEP 2] Sending request (x402 handles payment automatically)");
    console.log("-".repeat(60));
    console.log("   Request sent...");
    console.log("   Waiting for 402 Payment Required...");
    console.log("   Signing EIP-3009 authorization...");
    console.log("   Retrying with PAYMENT-SIGNATURE header...");

    const response = await fetchWithPayment(`${VENDOR_URL}/api/hello`, {
      method: "GET",
    });

    if (response.ok) {
      const data = await response.json();
      
      console.log("\n" + "-".repeat(60));
      console.log("[STEP 3] Request successful - Content received!");
      console.log("-".repeat(60));
      console.log("\nResponse Body:");
      console.log(JSON.stringify(data, null, 2));

      // Get payment settlement details
      const httpClient = new x402HTTPClient(client);
      const paymentResponse = httpClient.getPaymentSettleResponse((name) =>
        response.headers.get(name)
      );

      if (paymentResponse) {
        console.log("\n" + "-".repeat(60));
        console.log("[STEP 4] Payment Settlement Details");
        console.log("-".repeat(60));
        console.log(`   Success: ${paymentResponse.success}`);
        console.log(`   TX Hash: ${paymentResponse.transaction}`);
        console.log(`   Network: ${paymentResponse.network}`);
        console.log(`   Payer: ${paymentResponse.payer}`);
        console.log(`\n   View on Etherscan:`);
        console.log(`   https://sepolia.etherscan.io/tx/${paymentResponse.transaction}`);
      }
    } else {
      console.error(`\nRequest failed with status: ${response.status}`);
      const text = await response.text();
      console.error("   Response:", text);
    }
  } catch (error) {
    console.error("\nError:", error);
  }
}

/**
 * Test public endpoint (no payment required)
 */
async function testPublicEndpoint(): Promise<void> {
  console.log("\n" + "-".repeat(60));
  console.log("Testing public endpoint (no payment required)");
  console.log("-".repeat(60));
  console.log(`   URL: ${VENDOR_URL}/api/info`);

  try {
    const response = await fetch(`${VENDOR_URL}/api/info`);
    const data = await response.json();
    console.log("   Response:", JSON.stringify(data, null, 2));
  } catch (error) {
    console.error("   Error:", error);
  }
}

// Main execution
async function main(): Promise<void> {
  // Check initial balance
  console.log("\n" + "-".repeat(60));
  console.log("Checking initial MATE balance");
  console.log("-".repeat(60));
  const balanceBefore = await checkBalance();
  console.log(`   Balance: ${balanceBefore} MATE`);

  if (balanceBefore < 0.1) {
    console.log("\nInsufficient balance for payment (need 0.1 MATE)");
    console.log("   Get testnet MATE: https://evvm.dev");
    process.exit(1);
  }

  // Test public endpoint first
  await testPublicEndpoint();

  // Make paid request
  await makePaidRequest();

  // Check final balance
  console.log("\n" + "-".repeat(60));
  console.log("Checking final MATE balance");
  console.log("-".repeat(60));
  const balanceAfter = await checkBalance();
  console.log(`   Balance: ${balanceAfter} MATE`);
  console.log(`   Spent: ${(balanceBefore - balanceAfter).toFixed(2)} MATE`);

  console.log("\n" + "=".repeat(60));
  console.log("   Demo complete!");
  console.log("=".repeat(60) + "\n");
}

main().catch(console.error);
