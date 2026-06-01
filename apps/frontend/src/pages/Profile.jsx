import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useZkLogin } from "../context/useZkLogin";
import { profilesApi } from "../lib/api";
import DatasetCard from "../components/DatasetCard";
import ProfileCard from "../components/ProfileCard";
import ProfileEditor from "../components/ProfileEditor";
import FollowListModal from "../components/FollowListModal";
import useFollowList from "../hooks/useFollowList";
import { User } from "lucide-react";
export default function Profile() {
  const { username: routeUsername } = useParams();
  const navigate = useNavigate();
  const { account } = useZkLogin();
  const [profile, setProfile] = useState(null);
  const [datasets, setDatasets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
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
        const ds = await profilesApi.getProfileDatasets(me.profile.username);
        setDatasets(ds.datasets);
      } else {
        const [pd, dd] = await Promise.all([
          profilesApi.getProfile(routeUsername),
          profilesApi.getProfileDatasets(routeUsername),
        ]);
        setProfile(pd.profile);
        setFollowing(pd.profile.is_following || false);
        setDatasets(dd.datasets);
      }
    } catch (err) {
      if (err?.response?.status === 404) setError("Profile not found");
      else setError(err.response?.data?.detail || err.message || "Failed to load profile");
    } finally {
      setLoading(false);
    }
  }, [routeUsername]);

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
          <h2 className="text-lg font-semibold text-gray-300 mb-4">
            {isOwn ? "Your Datasets" : "Datasets"}
          </h2>
          {datasets.length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-12">
              {isOwn ? "You haven't listed any datasets yet." : "No datasets listed yet"}
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {datasets.map((ds) => <DatasetCard key={ds.id} dataset={ds} />)}
            </div>
          )}
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
