import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useZkLogin } from "../context/useZkLogin";
import { paymentsApi, profilesApi } from "../lib/api";
import { fetchFromWalrus } from "../lib/walrus";
import { decryptBlob } from "../lib/crypto";
import DatasetCard from "../components/DatasetCard";
import ProfileCard from "../components/ProfileCard";
import ProfileEditor from "../components/ProfileEditor";
import FollowListModal from "../components/FollowListModal";
import useFollowList from "../hooks/useFollowList";
import { Download, Loader2, User } from "lucide-react";
export default function Profile() {
  const { username: routeUsername } = useParams();
  const navigate = useNavigate();
  const { account } = useZkLogin();
  const [profile, setProfile] = useState(null);
  const [datasets, setDatasets] = useState([]);
  const [purchasedDatasets, setPurchasedDatasets] = useState([]);
  const [activeTab, setActiveTab] = useState("listed");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [downloadError, setDownloadError] = useState("");
  const [downloadingId, setDownloadingId] = useState("");
  const [editing, setEditing] = useState(false);
  const [following, setFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const { listTab, setListTab, followList, listLoading, openList, toggleFollowInList } = useFollowList();
  const isOwn = !!account && (
    (!routeUsername && !!account?.sub) ||
    (profile && profile.google_sub === account?.sub)
  );

  const fetch = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      if (!routeUsername) {
        const me = await profilesApi.getMyProfile();
        if (!me.profile) {
          setProfile(null);
          setDatasets([]);
          setEditing(true);
          setLoading(false);
          return;
        }
        setProfile(me.profile);
        const [ds, purchased] = await Promise.all([
          profilesApi.getProfileDatasets(me.profile.username),
          paymentsApi.getPurchased(account?.address || ""),
        ]);
        setDatasets(ds.datasets);
        setPurchasedDatasets(purchased.datasets || []);
      } else {
        const [pd, dd] = await Promise.all([
          profilesApi.getProfile(routeUsername),
          profilesApi.getProfileDatasets(routeUsername),
        ]);
        setProfile(pd.profile);
        setFollowing(pd.profile.is_following || false);
        setDatasets(dd.datasets);
        if (account?.sub && pd.profile.google_sub === account.sub) {
          const purchased = await paymentsApi.getPurchased(account?.address || "");
          setPurchasedDatasets(purchased.datasets || []);
        } else {
          setPurchasedDatasets([]);
        }
      }
    } catch (err) {
      if (err?.response?.status === 404) setError("Profile not found");
      else setError(err.response?.data?.detail || err.message || "Failed to load profile");
    } finally {
      setLoading(false);
    }
  }, [account?.address, routeUsername]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetch();
    }, 0);
    return () => clearTimeout(timer);
  }, [fetch]);
  const saveProfile = async (form) => {
    await profilesApi.updateMyProfile(form);
    setEditing(false);
    if (form.username !== routeUsername) {
      navigate(`/profile/${form.username}`, { replace: true });
      return;
    }
    await fetch();
  };

  const toggleFollow = async () => {
    if (!profile || followLoading) return;
    setFollowLoading(true);
    try {
      if (following) {
        await profilesApi.unfollow(profile.username);
      } else {
        await profilesApi.follow(profile.username);
      }
      setFollowing(!following);
      setProfile((p) => ({ ...p, follower_count: p.follower_count + (following ? -1 : 1) }));
    } catch { /* ignore */ }
    setFollowLoading(false);
  }

  const downloadPurchasedDataset = async (dataset) => {
    if (!account?.address || downloadingId) return;
    setDownloadingId(dataset.id);
    setDownloadError("");
    try {
      const access = await paymentsApi.access(dataset.id, account.address);
      const encryptedBuffer = await fetchFromWalrus(access.dataset.blob_id);
      const decryptedBlob = await decryptBlob(encryptedBuffer, access.key_base64, access.iv);
      const url = URL.createObjectURL(decryptedBlob);
      const link = document.createElement("a");
      link.href = url;
      link.download = access.dataset.file_name || dataset.file_name || "trainyard-dataset";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      setDownloadError(err.response?.data?.detail || err.message || "Unable to download purchased dataset.");
    } finally {
      setDownloadingId("");
    }
  };
  if (loading) {
    return <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
      <div className="w-48 h-1 bg-[#2a2a2a] rounded-full overflow-hidden">
        <div className="h-full w-1/2 bg-[#D89F55] rounded-full" style={{ animation: "progress 1.2s ease-in-out infinite" }} />
      </div>
    </div>;
  }

  if (error && !profile) {
    return <div className="max-w-2xl mx-auto text-center py-20">
      <User className="w-16 h-16 mx-auto text-gray-500 mb-4" />
      <p className="text-gray-400 text-lg">{error}</p>
      <button onClick={() => navigate("/")} className="mt-4 text-[#e7c88f] hover:underline text-sm">
        Back to Marketplace
      </button>
    </div>;
  }

  return (
    <div className="max-w-5xl mx-auto">
      {editing ? (
        <ProfileEditor
          initial={profile}
          isNew={!profile}
          onSave={saveProfile}
          onCancel={() => { setEditing(false); if (!profile) navigate("/"); }}
        />
      ) : profile ? (
        <>
          <ProfileCard
            profile={profile}
            datasetsCount={datasets.length}
            isOwn={isOwn}
            following={following}
            followLoading={followLoading}
            onEdit={() => setEditing(true)}
            onFollow={toggleFollow}
            onFollowersClick={() => openList("followers", profile?.username)}
            onFollowingClick={() => openList("following", profile?.username)}
          />
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
            <h2 className="text-lg font-semibold text-gray-300">
              {isOwn ? "Your Profile Library" : "Datasets"}
            </h2>
            {isOwn && (
              <div className="inline-flex p-1 bg-[#242424] border border-[#3a322f] rounded-xl w-fit">
                <button
                  onClick={() => setActiveTab("listed")}
                  className={`px-3 py-1.5 text-xs rounded-lg transition ${activeTab === "listed" ? "bg-[#D89F55] text-[#23120A] font-semibold" : "text-gray-400 hover:text-gray-200"}`}
                >
                  Listed datasets
                </button>
                <button
                  onClick={() => setActiveTab("bought")}
                  className={`px-3 py-1.5 text-xs rounded-lg transition ${activeTab === "bought" ? "bg-[#D89F55] text-[#23120A] font-semibold" : "text-gray-400 hover:text-gray-200"}`}
                >
                  Bought datasets
                </button>
              </div>
            )}
          </div>
          {downloadError && (
            <div className="mb-4 text-xs text-red-300 bg-red-950/10 border border-red-900/30 rounded-xl p-3">
              {downloadError}
            </div>
          )}
          {(!isOwn || activeTab === "listed") && (datasets.length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-12">
              {isOwn ? "You haven't listed any datasets yet." : "No datasets listed yet"}
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {datasets.map((ds) => <DatasetCard key={ds.id} dataset={ds} />)}
            </div>
          ))}
          {isOwn && activeTab === "bought" && (purchasedDatasets.length === 0 ? (
            <div className="text-center py-12 px-4 bg-[#242424]/40 border border-[#3a322f] rounded-2xl">
              <p className="text-gray-400 text-sm">No bought datasets yet.</p>
              <p className="text-gray-500 text-xs mt-1">After you buy one, it will stay here for repeat downloads.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {purchasedDatasets.map((ds) => (
                <div key={ds.id} className="relative">
                  <DatasetCard dataset={ds} />
                  <button
                    onClick={(e) => { e.stopPropagation(); downloadPurchasedDataset(ds); }}
                    disabled={!!downloadingId}
                    className="mt-2 w-full flex items-center justify-center gap-2 px-3 py-2 text-xs rounded-xl bg-[#D89F55] hover:bg-[#f0c57a] disabled:opacity-60 text-[#23120A] font-semibold cursor-pointer transition border-0"
                  >
                    {downloadingId === ds.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                    {downloadingId === ds.id ? "Decrypting..." : "Download again"}
                  </button>
                </div>
              ))}
            </div>
          ))}
          <FollowListModal
            title={listTab === "followers" ? "Followers" : "Following"}
            users={followList}
            open={listTab !== null}
            onClose={() => setListTab(null)}
            onFollow={toggleFollowInList}
            onUnfollow={toggleFollowInList}
            followingMap={Object.fromEntries(followList.map(u => [u.google_sub, u.is_following || false]))}
            followLoading={listLoading}
          />
        </>
      ) : null}
    </div>
  );
}
