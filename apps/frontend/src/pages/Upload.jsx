import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useZkLogin } from "../context/useZkLogin";
import { datasetsApi, aiApi } from "../lib/api";
import { generateKey, encryptFile } from "../lib/crypto";
import StepChooseFile from "../components/upload/StepChooseFile";
import StepMetadataForm from "../components/upload/StepMetadataForm";
import StepProgressTracker from "../components/upload/StepProgressTracker";
import StepSuccess from "../components/upload/StepSuccess";
import { ChevronRight } from "lucide-react";

export default function Upload() {
  const { account } = useZkLogin();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [step, setStep] = useState(0);
  const [file, setFile] = useState(null);
  const [loadingAi, setLoadingAi] = useState(false);
  const [metadata, setMetadata] = useState({ title: "", description: "", category: "nlp", price_sui: 0.1, tags: "" });
  
  const [uploadSteps, setUploadSteps] = useState([
    { id: 0, label: "Encrypting dataset locally", status: "idle" },
    { id: 1, label: "Uploading encrypted data to Walrus", status: "idle" },
    { id: 2, label: "Uploading preview index to Walrus", status: "idle" },
    { id: 3, label: "Registering listing metadata", status: "idle" },
  ]);

  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedBlob, setCopiedBlob] = useState(false);

  const processFile = (selectedFile) => {
    setError(null);
    setFile(selectedFile);
    const defaultTitle = selectedFile.name.split(".")[0].replace(/[_-]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
    setMetadata((p) => ({ ...p, title: defaultTitle }));
  };

  const handleContinueToForm = async () => {
    if (!file) return;
    setStep(1);
    setLoadingAi(true);
    try {
      const ext = file.name.includes(".") ? file.name.split(".").pop().toLowerCase() : "bin";
      const TEXT_EXTENSIONS = ["csv", "json", "txt", "tsv", "xml", "yaml", "yml", "md", "py", "js", "html", "css", "ini", "cfg", "conf", "sql"];
      let previewText = "";

      if (TEXT_EXTENSIONS.includes(ext) || file.type.startsWith("text/")) {
        previewText = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve(e.target.result.slice(0, 500));
          reader.readAsText(file.slice(0, 1000));
        });
      } else {
        previewText = `Binary payload metadata for package '${file.name}'. Contains encrypted binary features.`;
      }

      const aiData = await aiApi.describe({ file_name: file.name, file_type: ext, file_size_bytes: file.size, category: metadata.category, preview_text: previewText });
      setMetadata((p) => ({ ...p, title: aiData.suggested_title || p.title, description: aiData.description || p.description, tags: aiData.tags ? aiData.tags.join(", ") : p.tags }));
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingAi(false);
    }
  };

  const handleUploadAndStore = async () => {
    if (!account) return setError("Please sign in with zkLogin to proceed.");
    setError(null);
    setStep(2);

    const updateStatus = (index, status) => {
      setUploadSteps((prev) => prev.map((s) => (s.id === index ? { ...s, status } : s)));
    };

    try {
      const ext = file.name.includes(".") ? file.name.split(".").pop().toLowerCase() : "bin";
      
      updateStatus(0, "loading");
      const { keyBase64 } = await generateKey();
      const { encryptedBlob, iv } = await encryptFile(file, keyBase64);
      updateStatus(0, "done");

      updateStatus(1, "loading");
      const uploadBlobRes = await datasetsApi.uploadBlob(encryptedBlob, file.name);
      updateStatus(1, "done");

      updateStatus(2, "loading");
      let previewText = "";
      const TEXT_EXTENSIONS = ["csv", "json", "txt", "tsv", "xml", "yaml", "yml", "md", "py", "js", "html", "css", "ini", "cfg", "conf", "sql"];
      if (TEXT_EXTENSIONS.includes(ext) || file.type.startsWith("text/")) {
        previewText = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve(e.target.result.slice(0, 500));
          reader.readAsText(file.slice(0, 500));
        });
      } else {
        previewText = `Binary payload metadata for package '${file.name}'. Contains encrypted binary features.`;
      }
      const uploadPreviewRes = await datasetsApi.uploadPreview(previewText);
      const previewBlobId = uploadPreviewRes.blob_id;
      updateStatus(2, "done");

      updateStatus(3, "loading");
      const tagList = metadata.tags.split(",").map((t) => t.trim().toLowerCase()).filter((t) => t.length > 0);
      const listingResult = await datasetsApi.createListing({ title: metadata.title, description: metadata.description, category: metadata.category, price_sui: metadata.price_sui, seller_address: account.address, iv: iv, blob_id: uploadBlobRes.blob_id, preview_blob_id: previewBlobId, file_name: file.name, file_size_bytes: file.size, file_type: ext, tags: JSON.stringify(tagList), key_base64: keyBase64 });
      updateStatus(3, "done");
      
      listingResult.key_base64 = keyBase64;
      setResult(listingResult);
      setStep(3);
    } catch (err) {
      setError(err.message || "Failed to complete upload pipeline.");
      setUploadSteps((prev) => prev.map((s) => ({ ...s, status: "idle" })));
      setStep(1);
    }
  };

  const handleCopy = (text, type) => {
    navigator.clipboard.writeText(text);
    if (type === "key") {
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2000);
    } else {
      setCopiedBlob(true);
      setTimeout(() => setCopiedBlob(false), 2000);
    }
  };

  return (
    <div className="max-w-xl mx-auto">
      {step < 3 && (
        <div className="flex justify-between items-center mb-8 bg-[#242424] p-3 border border-[#3a322f] rounded text-xs font-mono text-[#f3e4cf]">
          <span className={step === 0 ? "text-brand-blue font-bold" : "text-[#d1d5db]"}>01. Choose File</span>
          <ChevronRight className="w-3.5 h-3.5 text-[#f3e4cf]" />
          <span className={step === 1 ? "text-brand-blue font-bold" : "text-[#d1d5db]"}>02. Configure Metadata</span>
          <ChevronRight className="w-3.5 h-3.5 text-[#f3e4cf]" />
          <span className={step === 2 ? "text-brand-blue font-bold" : "text-[#d1d5db]"}>03. Encrypt & Upload</span>
        </div>
      )}
      {step === 0 && <StepChooseFile file={file} error={error} handleDragOver={(e) => e.preventDefault()} handleDrop={(e) => { e.preventDefault(); if (e.dataTransfer.files?.[0]) processFile(e.dataTransfer.files[0]); }} triggerFileSelect={() => fileInputRef.current?.click()} fileInputRef={fileInputRef} handleFileChange={(e) => { if (e.target.files?.[0]) processFile(e.target.files[0]); }} handleContinueToForm={handleContinueToForm} />}
      {step === 1 && <StepMetadataForm file={file} metadata={metadata} setMetadata={setMetadata} loadingAi={loadingAi} error={error} account={account} handleUploadAndStore={handleUploadAndStore} setStep={setStep} />}
      {step === 2 && <StepProgressTracker uploadSteps={uploadSteps} />}
      {step === 3 && <StepSuccess result={result} copiedKey={copiedKey} copiedBlob={copiedBlob} handleCopy={handleCopy} navigate={navigate} />}
    </div>
  );
}
