import { defineNitroConfig } from "nitropack/config";

const DEFAULT_RPC = "https://rpc.moderato.tempo.xyz";
const DEFAULT_EVVM_ID = "1154";
const DEFAULT_MPP_CURRENCY = "0x20c0000000000000000000000000000000000000";

const requiredEnvVars = [
  "RECEIVER_ACCOUNT",
  "EVVM_CORE_ADDRESS",
  "EXECUTOR_PRIVATE_KEY",
  "PRINCIPAL_TOKEN_ADDRESS",
  "MPP_SECRET_KEY",
];

for (const key of requiredEnvVars) {
  if (!process.env[key]) {
    throw new Error(`Missing environment variable: ${key}`);
  }
}

export default defineNitroConfig({
  compatibilityDate: "latest",
  srcDir: "server",
  runtimeConfig: {
    receiver: process.env.RECEIVER_ACCOUNT!,
    evvmCoreAddress: process.env.EVVM_CORE_ADDRESS!,
    executorPrivateKey: process.env.EXECUTOR_PRIVATE_KEY!,
    principalTokenAddress: process.env.PRINCIPAL_TOKEN_ADDRESS!,
    evvmId: process.env.EVVM_ID ?? DEFAULT_EVVM_ID,
    rpcUrl: process.env.RPC_URL ?? DEFAULT_RPC,
    mppSecretKey: process.env.MPP_SECRET_KEY!,
    mppTempoCurrency:
      process.env.MPP_TEMPO_CURRENCY ?? DEFAULT_MPP_CURRENCY,
    mppTempoRecipient:
      process.env.MPP_TEMPO_RECIPIENT ?? process.env.RECEIVER_ACCOUNT!,
  },
  routeRules: {
    "*": {
      cors: true,
      headers: {
        "access-control-allow-credentials": "true",
        "access-control-allow-origin": "*",
        "access-control-allow-methods": "*",
        "access-control-allow-headers": "*",
      },
    },
  },
});
