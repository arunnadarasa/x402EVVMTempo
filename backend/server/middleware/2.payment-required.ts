import {
  getSerializableSignedActionSchema,
  PayDataSchema,
} from "@evvm/evvm-js";
import {
  invalidPaymentResponse,
  LocalFacilitator,
  parseHeader,
  paymentRequiredResponse,
} from "@evvm/x402";
import { SettleResponse } from "@x402/core/types";

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig();
  const url = event.node.req.url;

  const protectedRoute = url && url.startsWith("/protected");

  if (!protectedRoute) return;

  const method = event.method;
  if (method === "OPTIONS") return;

  const paymentHeader = event.headers.get("PAYMENT-SIGNATURE");
  if (!paymentHeader)
    return paymentRequiredResponse([
      {
        scheme: "evvm",
        network: "eip155:42431",
        amount: "1000000000000000",
        asset: config.principalTokenAddress as `0x${string}`,
        payTo: config.receiver,
        maxTimeoutSeconds: 300,
        extra: {
          coreContractAddress: config.evvmCoreAddress,
          evvmId: Number(config.evvmId),
        },
      },
    ]);

  const signer = await useSigner();
  const facilitator = new LocalFacilitator(signer);

  const paymentPayload = parseHeader(paymentHeader);

  if (!paymentPayload) return invalidPaymentResponse("Invalid payment header");

  const {
    success,
    data: signedAction,
    error,
  } = getSerializableSignedActionSchema(PayDataSchema).safeParse(
    paymentPayload.payload,
  );

  if (!success) {
    console.error(error.message);
    return invalidPaymentResponse("Invalid signed action payload");
  }

  const res = await facilitator.verifyPaySignature(signedAction);
  if (!res.success)
    return invalidPaymentResponse(res.error || "Invalid signature");

  const txHash = await facilitator.settlePayment(signedAction);
  if (!txHash) return invalidPaymentResponse("Settlement failed");

  const settleResponse: SettleResponse = {
    success: true,
    payer: signedAction.data.from,
    transaction: txHash,
    network: paymentPayload.accepted.network as `${string}:${string}`,
  };

  const jsonString = JSON.stringify(settleResponse);
  const base64Payload = Buffer.from(jsonString).toString("base64");

  appendHeader(event, "PAYMENT-RESPONSE", base64Payload);

  return;
});
