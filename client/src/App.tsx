import { useX402 } from "./hooks/useX402";
import { PaymentStepper } from "./components/PaymentStepper";
import { JsonViewer } from "./components/JsonViewer";
import { CustomConnectButton } from "./components/CusomConnectButton";
import { useAccount } from "wagmi";

function App() {
  const { status, content, error, paymentDetails, fetchProtectedAsset  } =
    useX402("http://localhost:3000/protected");
  const { isConnected } = useAccount();

  const handleFetch = () => {
    fetchProtectedAsset();
  };

  const isButtonDisabled =
    !isConnected ||
    (status !== "idle" && status !== "error" && status !== "success");

  const getButtonText = () => {
    if (status === "idle" || status === "error" || status === "success")
      return "Fetch Protected Resource";
    if (status === "fetching") return "Fetching...";
    if (status === "payment-required") return "Authorize Payment";
    if (status === "signing") return "Signing...";
    return "Confirming...";
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 relative overflow-hidden">
      <div className="gradient-green" />
      <div className="gradient-blue" />

      <header className="text-center mb-8">
        <h1 className="text-xl tracking-widest text-zinc-700/60 uppercase">
          EVVM + x402 · Tempo
        </h1>
      </header>

      <div className="flex flex-col items-center gap-6 w-full max-w-md">
        <CustomConnectButton />

        {isConnected ? (
          <button
            onClick={handleFetch}
            disabled={isButtonDisabled}
            className="px-6 py-2.5 bg-zinc-900 hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-md font-mono text-sm transition-colors"
          >
            {getButtonText()}
          </button>
        ) : null}

        <PaymentStepper status={status} paymentDetails={paymentDetails} />

        {error && (
          <div className="text-red-600 font-mono text-sm mt-4">{error}</div>
        )}

        {content && status === "success" && <JsonViewer data={content} />}
      </div>
    </div>
  );
}

export default App;
