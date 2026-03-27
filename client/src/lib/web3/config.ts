import { http, createConfig } from "wagmi";
import { tempoModerato } from "viem/chains";
import { injected } from "wagmi/connectors";

const rpc =
  import.meta.env.VITE_RPC_URL ?? "https://rpc.moderato.tempo.xyz";

export const config = createConfig({
  chains: [tempoModerato],
  connectors: [injected()],
  transports: {
    [tempoModerato.id]: http(rpc),
  },
});
