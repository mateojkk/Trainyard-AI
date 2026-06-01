import { memo } from "react";
import { Calendar, UserPlus, UserCheck, User } from "lucide-react";

const ProfileCard = memo(function ProfileCard({ profile, datasetsCount, isOwn, following, followLoading, onEdit, onFollow, onFollowersClick, onFollowingClick }) {
  return (
    <div className="bg-[#242424] border border-[#3a322f] rounded-xl p-4 sm:p-6 mb-8">
      <div className="flex flex-col sm:flex-row items-start gap-4">
        {profile.avatar_url ? (
          <img src={profile.avatar_url} alt="" className="w-12 sm:w-16 h-12 sm:h-16 rounded-full object-cover border border-[#3a322f] shrink-0" />
        ) : (
          <div className="w-12 sm:w-16 h-12 sm:h-16 rounded-full bg-[#3a322f] flex items-center justify-center shrink-0">
            <User className="w-5 sm:w-7 h-5 sm:h-7 text-gray-400" />
          </div>
        )}
        <div className="flex-1 min-w-0 w-full">
          <div className="flex flex-col sm:flex-row items-start justify-between gap-3">
            <div className="w-full sm:w-auto">
              <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 mb-1">
                <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-100 truncate">
                  {profile.display_name || profile.username}
                </h1>
                <span className="text-[#e7c88f] font-mono text-xs sm:text-sm shrink-0">@{profile.username}</span>
              </div>
              {profile.bio && <p className="text-gray-400 text-xs sm:text-sm mt-2">{profile.bio}</p>}
              <div className="flex items-center gap-2 sm:gap-3 mt-3 text-gray-500 text-xs flex-wrap">
                <div className="flex items-center gap-1"><Calendar className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                  <span>Joined {new Date(profile.created_at).toLocaleDateString("en-US", { month: "long", year: "numeric" })}</span>
                </div>
                <span className="hidden sm:inline">|</span>
                <button onClick={onFollowersClick} className="hover:underline cursor-pointer">{profile.follower_count} follower{profile.follower_count !== 1 ? "s" : ""}</button>
                <span>|</span>
                <button onClick={onFollowingClick} className="hover:underline cursor-pointer">{profile.following_count} following</button>
                <span className="hidden sm:inline">|</span>
                <span>{datasetsCount} dataset{datasetsCount !== 1 ? "s" : ""}</span>
              </div>
            </div>
            <div className="flex gap-2 shrink-0 w-full sm:w-auto">
              {isOwn ? (
                <button onClick={onEdit}
                  className="w-full sm:w-auto px-4 py-2 bg-[#1c1c1c] border border-[#3a322f] text-gray-300 rounded-lg text-sm hover:bg-[#2f2f2f] transition"
                >Edit Profile</button>
              ) : (
                <button onClick={onFollow} disabled={followLoading}
                  className={`w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition ${following ? "bg-[#1c1c1c] border border-[#3a322f] text-gray-300 hover:bg-[#2f2f2f]" : "bg-[#e7c88f] text-[#1c1c1c] hover:bg-[#f0d49e]"}`}
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
