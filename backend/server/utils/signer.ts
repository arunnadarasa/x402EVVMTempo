import { createSignerWithViem, HexString } from "@evvm/evvm-js";
import { createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { tempoModerato } from "viem/chains";

const DEFAULT_RPC = "https://rpc.moderato.tempo.xyz";

/** Normalize env private key: trim, strip quotes, ensure 0x prefix. */
function parseExecutorPrivateKey(raw: unknown): `0x${string}` {
  if (raw == null || (typeof raw === "string" && raw.trim() === "")) {
    throw new Error(
      "EXECUTOR_PRIVATE_KEY is empty. Set the facilitator key in backend/.env (0x + 64 hex chars).",
    );
  }
  if (typeof raw !== "string") {
    throw new Error("EXECUTOR_PRIVATE_KEY must be a string in backend/.env");
  }
  let s = raw.trim();
  if (
    (s.startsWith('"') && s.endsWith('"')) ||
    (s.startsWith("'") && s.endsWith("'"))
  ) {
    s = s.slice(1, -1).trim();
  }
  if (/^[0-9a-fA-F]{64}$/.test(s)) {
    s = `0x${s}`;
  }
  if (!/^0x[0-9a-fA-F]{64}$/.test(s)) {
    throw new Error(
      "EXECUTOR_PRIVATE_KEY must be exactly 0x plus 64 hex characters (32 bytes). Remove surrounding quotes and spaces in backend/.env.",
    );
  }
  return s as `0x${string}`;
}

export const useSigner = async () => {
  const config = useRuntimeConfig();
  const rpcUrl = (config.rpcUrl as string) || DEFAULT_RPC;
  const account = privateKeyToAccount(
    parseExecutorPrivateKey(config.executorPrivateKey) as HexString,
  );
  const client = createWalletClient({
    account,
    chain: tempoModerato,
    transport: http(rpcUrl),
  });
  const signer = await createSignerWithViem(client);

  return signer;
};
