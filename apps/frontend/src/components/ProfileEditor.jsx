import { useState, useRef } from "react";
import { Save, Loader2, Upload } from "lucide-react";
import { profilesApi } from "../lib/api";

export default function ProfileEditor({ initial, isNew, onSave, onCancel }) {
  const [form, setForm] = useState({
    username: initial?.username || "",
    display_name: initial?.display_name || "",
    bio: initial?.bio || "",
    avatar_url: initial?.avatar_url || "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState(initial?.avatar_url || "");
  const fileRef = useRef(null);

  const handleFile = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.type.startsWith("image/")) { setError("Please select an image file"); return; }
    setPreview(URL.createObjectURL(f));
    setUploading(true); setError("");
    try {
      const data = await profilesApi.uploadAvatar(f);
      setForm({ ...form, avatar_url: data.url });
    } catch (err) {
      setError(err?.response?.data?.detail || err.message || "Upload failed");
      setPreview(form.avatar_url || "");
    }
    setUploading(false);
  };

  const handleSave = async () => {
    setSaving(true); setError("");
    try { await onSave(form); }
    catch (err) { setError(err?.response?.data?.detail || err.message || "Failed to save"); }
    finally { setSaving(false); }
  };

  return (
    <div className="bg-[#242424] border border-[#3a322f] rounded-xl p-6 mb-8">
      <div className="space-y-4">
        {isNew && (
          <>
            <h2 className="text-lg font-semibold text-gray-200">Create Your Profile</h2>
            <p className="text-xs text-gray-500">Set a username to get started.</p>
          </>
        )}
        <div className="flex items-center gap-4">
          <button type="button" onClick={() => fileRef.current?.click()}
            className="relative w-16 h-16 rounded-full overflow-hidden bg-[#1c1c1c] border border-[#3a322f] hover:border-[#e7c88f] transition group cursor-pointer shrink-0"
          >
            {preview ? (
              <img src={preview} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-500">
                <Upload className="w-5 h-5" />
              </div>
            )}
            {uploading && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                <Loader2 className="w-5 h-5 text-[#e7c88f] animate-spin" />
              </div>
            )}
          </button>
          <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} className="hidden" />
          <div>
            <p className="text-xs text-gray-400 font-medium">Profile Picture</p>
            <p className="text-[10px] text-gray-500 mt-0.5">Click to upload from your device</p>
          </div>
        </div>
        <div>
          <label className="text-xs text-gray-400 mb-1 block">Username *</label>
          <input type="text" value={form.username}
            onChange={(e) => setForm({ ...form, username: e.target.value })}
            className="w-full bg-[#1c1c1c] border border-[#3a322f] rounded-lg px-3 py-2 text-gray-200 text-sm outline-none focus:border-[#e7c88f]"
          />
        </div>
        <div>
          <label className="text-xs text-gray-400 mb-1 block">Display Name</label>
          <input type="text" value={form.display_name}
            onChange={(e) => setForm({ ...form, display_name: e.target.value })}
            className="w-full bg-[#1c1c1c] border border-[#3a322f] rounded-lg px-3 py-2 text-gray-200 text-sm outline-none focus:border-[#e7c88f]"
          />
        </div>
        <div>
          <label className="text-xs text-gray-400 mb-1 block">Bio</label>
          <textarea rows={3} value={form.bio}
            onChange={(e) => setForm({ ...form, bio: e.target.value })}
            className="w-full bg-[#1c1c1c] border border-[#3a322f] rounded-lg px-3 py-2 text-gray-200 text-sm outline-none focus:border-[#e7c88f] resize-none"
          />
        </div>
        <div className="flex gap-3">
          <button onClick={handleSave} disabled={saving || !form.username || uploading}
            className="flex items-center gap-2 px-4 py-2 bg-[#e7c88f] text-[#1c1c1c] rounded-lg font-semibold text-sm hover:bg-[#f0d49e] transition disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {isNew ? "Create Profile" : "Save"}
          </button>
          <button onClick={onCancel}
            className="px-4 py-2 bg-[#1c1c1c] text-gray-300 rounded-lg text-sm hover:bg-[#2f2f2f] transition"
          >Cancel</button>
        </div>
        {error && <p className="text-red-400 text-xs">{error}</p>}
      </div>
    </div>
  );
}
