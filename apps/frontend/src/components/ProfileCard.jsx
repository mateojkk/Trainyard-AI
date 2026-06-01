import { memo } from "react";
import { Calendar, UserPlus, UserCheck, User } from "lucide-react";

const ProfileCard = memo(function ProfileCard({ profile, datasetsCount, isOwn, following, followLoading, onEdit, onFollow, onFollowersClick, onFollowingClick }) {
  return (
    <div className="bg-[#242424] border border-[#3a322f] rounded-xl p-6 mb-8">
      <div className="flex items-start gap-4">
        {profile.avatar_url ? (
          <img src={profile.avatar_url} alt="" className="w-16 h-16 rounded-full object-cover border border-[#3a322f] shrink-0" />
        ) : (
          <div className="w-16 h-16 rounded-full bg-[#3a322f] flex items-center justify-center shrink-0">
            <User className="w-7 h-7 text-gray-400" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-2xl font-bold text-gray-100 truncate">
                  {profile.display_name || profile.username}
                </h1>
                <span className="text-[#e7c88f] font-mono text-sm shrink-0">@{profile.username}</span>
              </div>
              {profile.bio && <p className="text-gray-400 text-sm mt-2">{profile.bio}</p>}
              <div className="flex items-center gap-3 mt-3 text-gray-500 text-xs flex-wrap">
                <div className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />
                  <span>Joined {new Date(profile.created_at).toLocaleDateString("en-US", { month: "long", year: "numeric" })}</span>
                </div>
                <span>|</span>
                <button onClick={onFollowersClick} className="hover:underline cursor-pointer">{profile.follower_count} follower{profile.follower_count !== 1 ? "s" : ""}</button>
                <span>|</span>
                <button onClick={onFollowingClick} className="hover:underline cursor-pointer">{profile.following_count} following</button>
                <span>|</span>
                <span>{datasetsCount} dataset{datasetsCount !== 1 ? "s" : ""}</span>
              </div>
            </div>
            <div className="flex gap-2 shrink-0">
              {isOwn ? (
                <button onClick={onEdit}
                  className="px-4 py-2 bg-[#1c1c1c] border border-[#3a322f] text-gray-300 rounded-lg text-sm hover:bg-[#2f2f2f] transition"
                >Edit Profile</button>
              ) : (
                <button onClick={onFollow} disabled={followLoading}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition ${following ? "bg-[#1c1c1c] border border-[#3a322f] text-gray-300 hover:bg-[#2f2f2f]" : "bg-[#e7c88f] text-[#1c1c1c] hover:bg-[#f0d49e]"}`}
                >
                  {following ? <UserCheck className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
                  {following ? "Following" : "Follow"}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

export default ProfileCard;
