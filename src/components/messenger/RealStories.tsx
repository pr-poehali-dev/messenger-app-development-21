import { useEffect, useRef, useState } from "react";
import Icon from "@/components/ui/icon";
import { api, avatarGrad, uploadMedia, type User } from "@/lib/api";

export interface StoryItem {
  id: number;
  media_url: string;
  caption?: string | null;
  created_at: number;
  expires_at: number;
  viewed: boolean;
}
export interface StoryGroup {
  user_id: number;
  user_name: string;
  avatar_url?: string | null;
  is_me: boolean;
  stories: StoryItem[];
  all_viewed: boolean;
}

export function RealStoriesBar({
  currentUser,
  onOpen,
  refreshKey,
}: {
  currentUser: User;
  onOpen: (groups: StoryGroup[], startUserId: number) => void;
  refreshKey?: number;
}) {
  const [groups, setGroups] = useState<StoryGroup[]>([]);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    const r = await api("story_feed", {}, currentUser.id);
    if (r && Array.isArray(r.groups)) setGroups(r.groups);
  };

  useEffect(() => { load(); }, [currentUser.id, refreshKey]);

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    if (!f.type.startsWith("image/")) { alert("Только изображения"); return; }
    if (f.size > 8 * 1024 * 1024) { alert("Файл слишком большой (макс 8 МБ)"); return; }
    setBusy(true);
    try {
      const up = await uploadMedia(f, currentUser.id);
      await api("story_publish", { media_url: up.url }, currentUser.id);
      await load();
    } catch (err) {
      alert((err as Error).message || "Ошибка загрузки");
    } finally {
      setBusy(false);
    }
  };

  const myGroup = groups.find(g => g.is_me);
  const others = groups.filter(g => !g.is_me);

  return (
    <div className="flex gap-3 px-4 py-3 overflow-x-auto no-scrollbar">
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onFile} />
      {/* Моя история — кнопка добавить */}
      <button
        onClick={() => {
          if (myGroup && myGroup.stories.length > 0) {
            onOpen(groups, currentUser.id);
          } else {
            fileRef.current?.click();
          }
        }}
        className="flex flex-col items-center gap-1.5 flex-shrink-0"
        disabled={busy}
      >
        <div className="relative">
          <div className={`p-[2px] rounded-full ${myGroup && myGroup.stories.length ? "bg-gradient-to-br from-violet-500 to-pink-500" : "bg-white/10"}`}>
            <div className="w-14 h-14 rounded-full bg-[hsl(var(--background))] p-[2px]">
              <div className={`w-full h-full rounded-full overflow-hidden bg-gradient-to-br ${avatarGrad(currentUser.id)} flex items-center justify-center text-white font-bold`}>
                {currentUser.avatar_url
                  ? <img src={currentUser.avatar_url} alt="me" className="w-full h-full object-cover" />
                  : currentUser.name[0]?.toUpperCase()}
              </div>
            </div>
          </div>
          <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full grad-primary flex items-center justify-center border-2 border-[hsl(var(--background))]">
            {busy
              ? <div className="w-2.5 h-2.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              : <Icon name="Plus" size={11} className="text-white" />}
          </div>
        </div>
        <span className="text-[10px] text-muted-foreground w-16 truncate text-center">Моя</span>
      </button>

      {others.map(g => (
        <button
          key={g.user_id}
          onClick={() => onOpen(groups, g.user_id)}
          className="flex flex-col items-center gap-1.5 flex-shrink-0"
        >
          <div className={`p-[2px] rounded-full ${g.all_viewed ? "bg-white/15" : "bg-gradient-to-br from-violet-500 to-pink-500"}`}>
            <div className="w-14 h-14 rounded-full bg-[hsl(var(--background))] p-[2px]">
              <div className={`w-full h-full rounded-full overflow-hidden bg-gradient-to-br ${avatarGrad(g.user_id)} flex items-center justify-center text-white font-bold`}>
                {g.avatar_url
                  ? <img src={g.avatar_url} alt={g.user_name} className="w-full h-full object-cover" />
                  : g.user_name[0]?.toUpperCase()}
              </div>
            </div>
          </div>
          <span className="text-[10px] text-muted-foreground w-16 truncate text-center">{g.user_name}</span>
        </button>
      ))}
    </div>
  );
}

export function RealStoryViewer({
  groups,
  startUserId,
  currentUser,
  onClose,
  onChanged,
}: {
  groups: StoryGroup[];
  startUserId: number;
  currentUser: User;
  onClose: () => void;
  onChanged?: () => void;
}) {
  const startGroupIdx = Math.max(0, groups.findIndex(g => g.user_id === startUserId));
  const [groupIdx, setGroupIdx] = useState(startGroupIdx);
  const [storyIdx, setStoryIdx] = useState(0);
  const [progress, setProgress] = useState(0);
  const [paused, setPaused] = useState(false);
  const [showViews, setShowViews] = useState<{ id: number; views: { user_id: number; name: string; viewed_at: number }[] } | null>(null);

  const group = groups[groupIdx];
  const story = group?.stories[storyIdx];

  // Отметка просмотра
  useEffect(() => {
    if (!story) return;
    if (group.is_me) return;
    api("story_view", { story_id: story.id }, currentUser.id);
  }, [story?.id, group?.is_me]);

  // Прогресс 5 секунд
  useEffect(() => {
    if (!story || paused) return;
    setProgress(0);
    const start = Date.now();
    const dur = 5000;
    const t = setInterval(() => {
      const p = Math.min(100, ((Date.now() - start) / dur) * 100);
      setProgress(p);
      if (p >= 100) { clearInterval(t); next(); }
    }, 50);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [story?.id, paused]);

  const next = () => {
    if (!group) return;
    if (storyIdx + 1 < group.stories.length) {
      setStoryIdx(storyIdx + 1);
    } else if (groupIdx + 1 < groups.length) {
      setGroupIdx(groupIdx + 1);
      setStoryIdx(0);
    } else {
      onClose();
    }
  };
  const prev = () => {
    if (storyIdx > 0) setStoryIdx(storyIdx - 1);
    else if (groupIdx > 0) {
      const g = groups[groupIdx - 1];
      setGroupIdx(groupIdx - 1);
      setStoryIdx(g.stories.length - 1);
    }
  };

  const openViews = async () => {
    if (!story || !group?.is_me) return;
    setPaused(true);
    const r = await api("story_my_views", { story_id: story.id }, currentUser.id);
    setShowViews({ id: story.id, views: r?.views || [] });
  };

  const removeStory = async () => {
    if (!story || !group?.is_me) return;
    if (!confirm("Удалить эту историю?")) return;
    await api("story_delete", { story_id: story.id }, currentUser.id);
    onChanged?.();
    onClose();
  };

  if (!story) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[300] bg-black animate-fade-in select-none" onClick={onClose}>
      {/* Прогресс-бары */}
      <div className="absolute top-0 left-0 right-0 z-20 flex gap-1 px-3 pt-3" style={{ paddingTop: "calc(0.75rem + env(safe-area-inset-top))" }}>
        {group.stories.map((_, i) => (
          <div key={i} className="flex-1 h-0.5 bg-white/20 rounded-full overflow-hidden">
            <div
              className="h-full bg-white"
              style={{ width: i < storyIdx ? "100%" : i === storyIdx ? `${progress}%` : "0%" }}
            />
          </div>
        ))}
      </div>

      {/* Шапка */}
      <div className="absolute top-0 left-0 right-0 z-20 flex items-center gap-2 px-3 pt-6" style={{ paddingTop: "calc(1.5rem + env(safe-area-inset-top))" }} onClick={e => e.stopPropagation()}>
        <div className={`w-8 h-8 rounded-full overflow-hidden bg-gradient-to-br ${avatarGrad(group.user_id)} flex items-center justify-center text-white text-xs font-bold flex-shrink-0`}>
          {group.avatar_url
            ? <img src={group.avatar_url} alt={group.user_name} className="w-full h-full object-cover" />
            : group.user_name[0]?.toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-white font-semibold text-sm truncate">{group.user_name}</div>
          <div className="text-white/60 text-[10px]">{relTime(story.created_at)}</div>
        </div>
        {group.is_me && (
          <button onClick={removeStory} className="p-2 rounded-full hover:bg-white/10">
            <Icon name="Trash2" size={16} className="text-white/80" />
          </button>
        )}
        <button onClick={onClose} className="p-2 rounded-full hover:bg-white/10">
          <Icon name="X" size={18} className="text-white" />
        </button>
      </div>

      {/* Картинка */}
      <div
        className="absolute inset-0 flex items-center justify-center"
        onPointerDown={() => setPaused(true)}
        onPointerUp={() => setPaused(false)}
        onPointerCancel={() => setPaused(false)}
      >
        <img src={story.media_url} alt="story" className="max-w-full max-h-full object-contain" />
      </div>

      {/* Тапы по сторонам */}
      <button
        className="absolute left-0 top-0 bottom-0 w-1/3 z-10"
        onClick={(e) => { e.stopPropagation(); prev(); }}
        aria-label="Назад"
      />
      <button
        className="absolute right-0 top-0 bottom-0 w-1/3 z-10"
        onClick={(e) => { e.stopPropagation(); next(); }}
        aria-label="Вперёд"
      />

      {/* Подпись + просмотры */}
      <div className="absolute bottom-0 left-0 right-0 z-20 p-4 pb-6 bg-gradient-to-t from-black/70 to-transparent" style={{ paddingBottom: "calc(1.5rem + env(safe-area-inset-bottom))" }} onClick={e => e.stopPropagation()}>
        {story.caption && (
          <p className="text-white text-sm mb-2 text-center">{story.caption}</p>
        )}
        {group.is_me && (
          <button onClick={openViews} className="mx-auto flex items-center gap-1.5 text-white/80 text-xs glass rounded-full px-3 py-1.5">
            <Icon name="Eye" size={12} />
            Кто смотрел
          </button>
        )}
      </div>

      {showViews && (
        <div className="absolute inset-0 z-30 bg-black/70 flex items-end" onClick={() => { setShowViews(null); setPaused(false); }}>
          <div className="w-full glass-strong rounded-t-3xl p-4 max-h-[60%] overflow-y-auto" onClick={e => e.stopPropagation()} style={{ paddingBottom: "calc(1rem + env(safe-area-inset-bottom))" }}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold">Просмотры ({showViews.views.length})</h3>
              <button onClick={() => { setShowViews(null); setPaused(false); }} className="p-1.5 rounded-lg hover:bg-white/8">
                <Icon name="X" size={14} />
              </button>
            </div>
            {showViews.views.length === 0
              ? <p className="text-sm text-muted-foreground text-center py-4">Пока никто не смотрел</p>
              : showViews.views.map(v => (
                <div key={v.user_id} className="flex items-center gap-3 py-2">
                  <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${avatarGrad(v.user_id)} flex items-center justify-center text-white text-sm font-bold`}>
                    {v.name[0]?.toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold truncate">{v.name}</div>
                    <div className="text-[10px] text-muted-foreground">{relTime(v.viewed_at)}</div>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}

function relTime(ts: number) {
  const diff = Math.max(0, Date.now() / 1000 - ts);
  if (diff < 60) return "только что";
  if (diff < 3600) return `${Math.floor(diff / 60)} мин назад`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} ч назад`;
  return `${Math.floor(diff / 86400)} д назад`;
}
