import type { Status } from "../hooks/useX402";
import type { PaymentDetails } from "../hooks/useX402";

interface PaymentStepperProps {
  status: Status;
  paymentDetails: PaymentDetails | null;
}

const steps = [
  { key: "fetching", label: "Fetch", description: "Requesting resource" },
  {
    key: "authorize",
    label: "Authorize",
    description: "Signing payment transaction",
  },
  {
    key: "fetching-with-signature",
    label: "Confirm",
    description: "Completing request with payment",
  },
  { key: "success", label: "Done", description: "Resource received" },
] as const;

function formatNetwork(network: string): string {
  if (network.startsWith("eip155:")) {
    const chainId = network.replace("eip155:", "");
    const chainNames: Record<string, string> = {
      "1": "Ethereum",
      "42431": "Tempo Moderato",
      "8453": "Base",
      "42161": "Arbitrum",
      "10": "Optimism",
      "137": "Polygon",
      "56": "BSC",
      "43114": "Avalanche",
    };
    return chainNames[chainId] || `Chain ${chainId}`;
  }
  return network;
}

function formatTimeout(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
  return `${Math.floor(seconds / 86400)}d`;
}

export function PaymentStepper({
  status,
  paymentDetails,
}: PaymentStepperProps) {
  const getStepIndex = (s: Status): number => {
    switch (s) {
      case "fetching":
        return 0;
      case "payment-required":
      case "signing":
        return 1;
      case "fetching-with-signature":
        return 2;
      case "success":
        return 3;
      case "error":
        return -1;
      default:
        return -1;
    }
  };

  const currentIndex = getStepIndex(status);
  const isError = status === "error";
  const showPaymentDetails =
    (status === "payment-required" ||
      status === "signing" ||
      status === "fetching-with-signature") &&
    paymentDetails;

  if (status === "idle") return null;

  return (
    <div className="flex flex-col items-center">
      <div className="flex items-center justify-center gap-0">
        {steps.map((step, index) => {
          const isCompleted = index < currentIndex || currentIndex == 3; //success
          const isActive = index === currentIndex;
          const isPending = index > currentIndex;

          return (
            <div key={step.key} className="flex items-center">
              <div className="flex flex-col items-center">
                <div
                  className={`
                    w-12 h-12 rounded-full flex items-center justify-center text-sm font-mono font-medium
                    transition-all duration-300 shadow-sm
                    ${isCompleted ? "bg-zinc-800 text-white" : ""}
                    ${isActive && status !== "success" ? "bg-zinc-700 text-white animate-pulse" : ""}
                    ${isActive && status === "success" ? "bg-zinc-800 text-white" : ""}
                    ${isPending ? "bg-zinc-200 text-zinc-400" : ""}
                    ${isError && index === currentIndex ? "bg-red-500 text-white" : ""}
                  `}
                >
                  {isCompleted ? "✓" : isActive ? "●" : index + 1}
                </div>
                <div className="mt-2 text-center min-w-[70px]">
                  <span
                    className={`
                      block text-xs font-mono uppercase tracking-wider
                      ${isActive ? "text-zinc-800" : isCompleted ? "text-zinc-500" : "text-zinc-400"}
                      ${isError && index === currentIndex ? "text-red-600" : ""}
                    `}
                  >
                    {step.label}
                  </span>
                  <span
                    className={`
                      block text-[10px] font-mono text-zinc-400 mt-0.5
                      ${isError && index === currentIndex ? "text-red-500" : ""}
                    `}
                  >
                    {step.description}
                  </span>
                </div>
              </div>
              {index < steps.length - 1 && (
                <div
                  className={`
                    w-14 h-0.5 mx-2 mb-6 transition-colors duration-300
                    ${index < currentIndex ? "bg-zinc-800" : "bg-zinc-200"}
                  `}
                />
              )}
            </div>
          );
        })}
      </div>

      {showPaymentDetails && (
        <div className="mt-4 bg-white border border-zinc-200 rounded-lg p-4 w-full max-w-sm shadow-sm">
          <h3 className="mb-4 mt-2 text-center">402: Payment Required</h3>
          <div className="space-y-2 font-mono text-xs">
            <div className="flex justify-between items-center py-1 border-b border-zinc-100">
              <span className="text-zinc-500">Amount</span>
              <span className="text-zinc-800 font-medium">
                {paymentDetails?.amount}
              </span>
            </div>
            <div className="flex justify-between items-center py-1 border-b border-zinc-100">
              <span className="text-zinc-500">Token</span>
              <span className="text-zinc-800 font-medium">
                {paymentDetails?.token}
              </span>
            </div>
            <div className="flex justify-between items-center py-1 border-b border-zinc-100">
              <span className="text-zinc-500">To</span>
              <span className="text-zinc-600">{paymentDetails?.recipient}</span>
            </div>
            <div className="flex justify-between items-center py-1 border-b border-zinc-100">
              <span className="text-zinc-500">Network</span>
              <span className="text-zinc-600">
                {formatNetwork(paymentDetails?.network || "")}
              </span>
            </div>
            <div className="flex justify-between items-center py-1">
              <span className="text-zinc-500">Timeout</span>
              <span className="text-zinc-600">
                {formatTimeout(paymentDetails?.maxTimeout || 0)}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
