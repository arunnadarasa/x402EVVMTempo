import type { PaymentPayloadV2 } from "@x402/core/schemas";
import type { IEvvmSchema } from "@evvm/x402";
import { useCallback, useEffect, useState } from "react";
import { useEVVM } from "./useEVVM";
import type { HexString } from "@evvm/evvm-js";
import { getRandomBigInt } from "../util/random";

export type Status =
  | "idle"
  | "fetching"
  | "payment-required"
  | "signing"
  | "fetching-with-signature"
  | "success"
  | "error";

export interface PaymentDetails {
  amount: string;
  token: string;
  recipient: string;
  network: string;
  maxTimeout: number;
}

export const useX402 = (url: string) => {
  const { core, signer, setCoreAddress } = useEVVM();
  const [signature, setSignature] = useState<string | null>(null);
  const [offer, setOffer] = useState<IEvvmSchema | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [content, setContent] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [paymentDetails, setPaymentDetails] = useState<PaymentDetails | null>(
    null,
  );

  useEffect(() => {
    // call fetchProtectedAsset automatically when signature is defined
    // (don't call fetchProtectedAsset upon mounting because that's going
    // to be triggered by the user manually)
    if (signature) fetchProtectedAsset();
  }, [signature]);

  useEffect(() => {
    // create payment signature when requirement and toolset defined
    signPayment();
  }, [offer, core, signer]);

  const fetchProtectedAsset = useCallback(async () => {
    const headers = new Headers();

    if (signature) {
      setStatus("fetching-with-signature");
      headers.set("PAYMENT-SIGNATURE", signature);
    } else {
      setStatus("fetching");
    }

    const raw = await fetch(url, { headers });

    switch (raw.status) {
      case 200:
        setStatus("success");
        const res = await raw.json();
        setContent(res);
        setSignature(null);
        break;
      case 402:
        setStatus("payment-required");
        const paymentRequiredHeader = raw.headers.get("PAYMENT-REQUIRED");
        if (!paymentRequiredHeader) {
          setStatus("error");
          setError("No PAYMENT-REQUIRED header");
          return;
        }

        try {
          // decode payment required header
          const paymentRequiredDecoded = atob(paymentRequiredHeader);
          const _paymentPayload = JSON.parse(paymentRequiredDecoded) as {
            offers: [IEvvmSchema];
          };
          setOffer(_paymentPayload.offers[0]);

          const required = _paymentPayload.offers[0];

          // it fails because the purpose of this frontend is meant to handle only evvm schemas,
          // this is the where you would add multi schema support if you wanted to
          if (required.scheme !== "evvm") {
            setError(
              `Invalid scheme received. Expected 'evvm', received '${required.scheme}'`,
            );
            return;
          }

          setCoreAddress(required.extra.coreContractAddress);
          setPaymentDetails({
            amount: required.amount,
            token: required.asset,
            recipient: `${required.payTo.slice(0, 6)}...${required.payTo.slice(-4)}`,
            network: required.network,
            maxTimeout: required.maxTimeoutSeconds,
          });
        } catch (err) {
          setError("Failed to parse payment required response");
          setStatus("error");
        }
        break;
      default:
        const msg = await raw.text();
        setError(`${raw.status} ${msg}`);
        setStatus("error");
    }
  }, [signature]);

  const signPayment = async () => {
    if (signature) return;
    if (!offer || !core || !signer) {
      return;
    }

    setStatus("signing");

    try {
      console.log({
        offer,
      });

      let nonce = 0n;
      let usedNonce = true;
      while (usedNonce) {
        nonce = getRandomBigInt();
        usedNonce = await core.getIfUsedAsyncNonce(nonce);
      }

      const paySignedAction = await core.pay({
        toAddress: offer.payTo as HexString,
        amount: BigInt(offer.amount),
        tokenAddress: offer.asset,
        nonce: nonce,
        priorityFee: 0n,
        originExecutor: offer.extra.originExecutor,
        isAsyncExec: true,
      });

      console.log({
        paySignedAction,
      });

      const paymentPayload: PaymentPayloadV2 = {
        x402Version: 2,
        accepted: offer,
        payload: paySignedAction.toJSON(),
      };

      const encoded = btoa(JSON.stringify(paymentPayload));

      setSignature(encoded);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Payment signing failed");
      setStatus("error");
    }
  };

  const reset = () => {
    console.log("reset");
    setStatus("idle");
    setSignature(null);
    setPaymentDetails(null);
    setOffer(null);
    setCoreAddress(null);
    setContent(null);
  };

  return {
    status,
    content,
    error,
    paymentDetails,
    fetchProtectedAsset,
    reset,
  };
};
