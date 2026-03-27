import { Mppx, tempo } from "mppx/server";
import { sendWebResponse, toWebRequest } from "h3";

export default defineEventHandler(async (event) => {
  if (event.method === "OPTIONS") return;

  const config = useRuntimeConfig();
  // Use tempo.charge only — full tempo() also registers session(), which needs a viem signing `account` on the server.
  const mppx = Mppx.create({
    secretKey: config.mppSecretKey as string,
    methods: [
      tempo.charge({
        testnet: true,
        currency: config.mppTempoCurrency as `0x${string}`,
        recipient: config.mppTempoRecipient as `0x${string}`,
      }),
    ],
  });

  const webReq = toWebRequest(event);
  const charge = mppx.tempo.charge({ amount: "0.01" });
  const result = await charge(webReq);

  if (result.status === 402) {
    await sendWebResponse(event, result.challenge);
    return;
  }

  await sendWebResponse(
    event,
    result.withReceipt(
      new Response(
        JSON.stringify({
          message:
            "MPP Tempo payment verified. Protected JSON for agents / purl.",
          ok: true,
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      ),
    ),
  );
});
