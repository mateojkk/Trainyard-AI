import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { datasetsApi } from "../lib/api";
import { fetchPreview } from "../lib/walrus";
import DatasetInfo from "../components/DatasetInfo";
import DatasetStats from "../components/DatasetStats";
import BuyModal from "../components/BuyModal";
import { ArrowLeft, Info } from "lucide-react";

export default function Dataset() {
  const { id } = useParams();
  const [dataset, setDataset] = useState(null);
  const [previewText, setPreviewText] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [error, setError] = useState(null);
  const [buyModalOpen, setBuyModalOpen] = useState(false);

  useEffect(() => {
    async function loadDataset() {
      setLoading(true);
      setError(null);
      try {
        const data = await datasetsApi.getOne(id);
        setDataset(data);
        
        // Fetch Preview unencrypted text from Walrus
        if (data.preview_blob_id) {
          setLoadingPreview(true);
          try {
            const preview = await fetchPreview(data.preview_blob_id);
            setPreviewText(preview);
          } catch (prevErr) {
            console.error("Failed to load Walrus preview:", prevErr);
            setPreviewText("Symmetric preview currently unavailable on Walrus mainnet.");
          } finally {
            setLoadingPreview(false);
          }
        }
      } catch (err) {
        console.error("Error loading dataset:", err);
        setError("Failed to fetch dataset details. The resource may not exist.");
      } finally {
        setLoading(false);
      }
    }

    if (id) loadDataset();
  }, [id]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4 text-xs text-[#f3e4cf] font-mono">
        <div className="w-48 h-1 bg-[#2a2a2a] rounded-full overflow-hidden">
          <div className="h-full w-1/2 bg-[#D89F55] rounded-full" style={{ animation: "progress 1.2s ease-in-out infinite" }} />
        </div>
        Synchronizing storage record...
      </div>
    );
  }

  if (error || !dataset) {
    return (
      <div className="max-w-md mx-auto space-y-4 py-10">
        <div className="bg-red-950/10 border border-red-900/30 text-xs text-red-400 p-4 rounded flex items-start gap-2">
          <Info className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <span className="font-bold block">Retrieval Error</span>
            <p className="mt-1">{error || "Dataset listing could not be found."}</p>
          </div>
        </div>
        <Link to="/" className="inline-flex items-center gap-1.5 text-xs text-brand-blue hover:underline">
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Marketplace
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Link to="/" className="inline-flex items-center gap-1.5 text-xs text-[#f3e4cf] hover:text-brand-blue transition duration-150">
        <ArrowLeft className="w-3.5 h-3.5" />
        Back to Marketplace
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-8 items-start">
        <DatasetInfo dataset={dataset} previewText={previewText} loadingPreview={loadingPreview} />
        <DatasetStats dataset={dataset} onBuyClick={() => setBuyModalOpen(true)} />
      </div>

      {buyModalOpen && (
        <BuyModal dataset={dataset} isOpen={buyModalOpen} onClose={() => setBuyModalOpen(false)} previewText={previewText} />
      )}
    </div>
  );
}
