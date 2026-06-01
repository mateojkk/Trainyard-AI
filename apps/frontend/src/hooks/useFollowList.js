import { useState } from "react";
import { profilesApi } from "../lib/api";

export default function useFollowList() {
  const [listTab, setListTab] = useState(null);
  const [followList, setFollowList] = useState([]);
  const [listLoading, setListLoading] = useState(false);

  const openList = async (tab, username) => {
    if (!username) return;
    setListTab(tab);
    setListLoading(true);
    try {
      const data = tab === "followers"
        ? await profilesApi.getFollowers(username)
        : await profilesApi.getFollowing(username);
      setFollowList(data[tab] || []);
    } catch { setFollowList([]); }
    setListLoading(false);
  };

  const toggleFollowInList = async (targetUsername) => {
    try {
      const u = followList.find(x => x.username === targetUsername);
      if (!u) return;
      if (u.is_following) {
        await profilesApi.unfollow(targetUsername);
      } else {
        await profilesApi.follow(targetUsername);
      }
      setFollowList(prev => prev.map(x =>
        x.username === targetUsername ? { ...x, is_following: !x.is_following } : x
      ));
    } catch {
      // Ignore error silently
    }
  };

  return { listTab, setListTab, followList, listLoading, openList, toggleFollowInList };
}
