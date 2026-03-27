import { useState, useEffect } from "react";
import {
  Core,
  createSignerWithViem,
  type HexString,
  type ISigner,
} from "@evvm/evvm-js";
import { useWalletClient } from "wagmi";

export function useEVVM() {
  const { data: walletClient } = useWalletClient();
  const [core, setCore] = useState<Core | null>(null);
  const [signer, setSigner] = useState<ISigner | null>(null);
  const [coreAddress, setCoreAddress] = useState<HexString | null>(null);

  useEffect(() => {
    initCore();
  }, [walletClient, coreAddress]);

  async function initCore() {
    if (!walletClient || !coreAddress) {
      setCore(null);
      setSigner(null);
      return;
    }

    try {
      const signer = await createSignerWithViem(
        walletClient as unknown as Parameters<typeof createSignerWithViem>[0],
      );

      setSigner(signer);
      const evvmCore = new Core({
        signer,
        address: coreAddress,
        chainId: walletClient.chain.id,
      });
      setCore(evvmCore);
    } catch (err) {
      console.error("Failed to initialize EVVM Core:", err);
      setCore(null);
      setSigner(null);
    }
  }

  return {
    core,
    signer,
    setCoreAddress,
  };
}
