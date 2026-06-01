import { memo } from "react";
import { useNavigate } from "react-router-dom";
import { User, X, UserPlus, UserCheck } from "lucide-react";

const FollowListModal = memo(function FollowListModal({ title, users, open, onClose, onFollow, onUnfollow, followingMap, followLoading }) {
  const navigate = useNavigate();
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-[#242424] border border-[#3a322f] rounded-xl w-full max-w-md max-h-[70vh] overflow-hidden shadow-xl">
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#3a322f]">
          <h3 className="text-sm font-bold text-gray-100">{title}</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-300"><X className="w-4 h-4" /></button>
        </div>
        <div className="overflow-y-auto max-h-[calc(70vh-53px)]">
          {users.length === 0 ? (
            <p className="text-center text-gray-500 text-xs py-8">No users yet</p>
          ) : users.map((u) => (
            <div key={u.google_sub} onClick={() => { onClose(); navigate(`/profile/${u.username}`); }}
              className="flex items-center gap-3 px-4 py-3 hover:bg-[#2f2f2f] border-b border-[#3a322f] last:border-b-0 cursor-pointer transition"
            >
              {u.avatar_url ? (
                <img src={u.avatar_url} alt="" className="w-9 h-9 rounded-full object-cover border border-[#3a322f]" />
              ) : (
                <div className="w-9 h-9 rounded-full bg-[#3a322f] flex items-center justify-center">
                  <User className="w-4 h-4 text-gray-400" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-200 truncate">{u.display_name || u.username}</p>
                <p className="text-[10px] text-gray-500">@{u.username}</p>
              </div>
              <button onClick={(e) => { e.stopPropagation(); const fn = followingMap[u.google_sub] ? onUnfollow : onFollow; fn(u.username); }}
                disabled={followLoading}
                className={`shrink-0 px-3 py-1 rounded text-xs font-semibold transition ${followingMap[u.google_sub] ? "bg-[#1c1c1c] border border-[#3a322f] text-gray-300" : "bg-[#e7c88f] text-[#1c1c1c] hover:bg-[#f0d49e]"}`}
              >
                {followingMap[u.google_sub] ? <><UserCheck className="w-3 h-3 inline mr-1" />Following</> : <><UserPlus className="w-3 h-3 inline mr-1" />Follow</>}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
});

export default FollowListModal;
