import React, { useState, useEffect } from "react";
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  ActivityIndicator, Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { C, FLAT } from "../constants/colors";
import { FONT, SIZE, SP, RADIUS } from "../constants/typography";
import { ChevronLeft, MessageCircle } from "lucide-react-native";
import { api } from "../services/api";

export interface CharacterProfile {
  id: string;
  name: string;
  gender: string;
  age: number;
  hometown: string;
  education?: string;
  background?: string;
  hobbies?: string;
  personality: string;
  speech_style: string;
  occupation?: string;
  current_city?: string;
  family_background?: string;
  childhood_story?: string;
  love_history?: string;
  current_romance_status?: string;
  work_hours?: string;
  narrative_profile?: string;
  avatar_url?: string;
}

interface Post {
  id: string;
  content: string;
  post_type: string;
  created_at: string;
}

interface Worry {
  id: string;
  content: string;
  severity: number;
  resolved: boolean;
  created_at: string;
}

interface Props {
  character: CharacterProfile;
  onBack: () => void;
  onChat: () => void;
}

type Tab = "profile" | "posts" | "worries";

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}分前`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}時間前`;
  return `${Math.floor(hrs / 24)}日前`;
}

const TABS: [Tab, string][] = [
  ["profile", "プロフィール"],
  ["posts", "最近の出来事"],
  ["worries", "悩み"],
];

const CARD_OFFSET = 4;

// ── Flat card component ────────────────────────────────────────────────────
function FlatCard({
  children,
  style,
  shadowColor = C.ink,
}: {
  children: React.ReactNode;
  style?: object;
  shadowColor?: string;
}) {
  return (
    <View style={{ marginBottom: CARD_OFFSET, marginRight: CARD_OFFSET }}>
      <View style={[s.cardShadow, { backgroundColor: shadowColor }]} />
      <View style={[s.card, style]}>{children}</View>
    </View>
  );
}

export default function CharacterProfileScreen({ character, onBack, onChat }: Props) {
  const [tab, setTab] = useState<Tab>("profile");
  const [posts, setPosts] = useState<Post[]>([]);
  const [worries, setWorries] = useState<Worry[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(false);

  useEffect(() => {
    if (tab === "posts" && posts.length === 0) {
      setLoadingPosts(true);
      api.posts.getCharacterPosts(character.id)
        .then(setPosts)
        .catch(() => {})
        .finally(() => setLoadingPosts(false));
    }
  }, [tab]);

  const narrative =
    character.narrative_profile ||
    `${character.hometown}出身、${character.age}歳。${character.background ?? ""}${
      character.hobbies ? `趣味は${character.hobbies}。` : ""
    }`;

  const location = character.current_city || character.hometown;

  return (
    <SafeAreaView style={s.container} edges={["top"]}>
      {/* ── Coral flat cover ─────────────────────────────────────────── */}
      <View style={s.cover}>
        {/* Back button */}
        <TouchableOpacity
          onPress={onBack}
          style={s.backBtnWrap}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <View style={s.backShadow} />
          <View style={s.backInner}>
            <ChevronLeft size={18} color={C.white} strokeWidth={2.5} />
          </View>
        </TouchableOpacity>

        {/* Hero */}
        <View style={s.heroWrap}>
          {/* Avatar with flat border ring */}
          <View style={s.avatarRingOuter}>
            <View style={s.avatarRingShadow} />
            <View style={s.avatarRing}>
              {character.avatar_url ? (
                <Image source={{ uri: character.avatar_url }} style={s.avatarImg} />
              ) : (
                <View style={s.avatarFallback}>
                  <Text style={s.avatarInitial}>{character.name[0]}</Text>
                </View>
              )}
            </View>
          </View>
          <Text style={s.heroName}>{character.name}</Text>
          <Text style={s.heroMeta}>
            {character.age}歳
            {character.occupation ? ` · ${character.occupation}` : ""}
            {" · "}{location}
          </Text>

          {/* Stat pills */}
          <View style={s.statRow}>
            <View style={s.statPillOuter}>
              <View style={s.statPillShadow} />
              <View style={s.statPill}>
                <Text style={s.statLabel}>性格</Text>
                <Text style={s.statValue} numberOfLines={1}>{character.personality}</Text>
              </View>
            </View>
            <View style={s.statPillOuter}>
              <View style={s.statPillShadow} />
              <View style={s.statPill}>
                <Text style={s.statLabel}>話し方</Text>
                <Text style={s.statValue} numberOfLines={1}>{character.speech_style}</Text>
              </View>
            </View>
          </View>
        </View>
      </View>

      {/* ── Tab bar ─────────────────────────────────────────────────── */}
      <View style={s.tabBar}>
        {TABS.map(([key, label]) => (
          <TouchableOpacity key={key} style={s.tabItem} onPress={() => setTab(key)}>
            <Text style={[s.tabLabel, tab === key && s.tabLabelActive]}>{label}</Text>
            {tab === key && <View style={s.tabLine} />}
          </TouchableOpacity>
        ))}
      </View>

      {/* ── Content ─────────────────────────────────────────────────── */}
      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {tab === "profile" && (
          <>
            <FlatCard>
              <Text style={s.cardTitle}>自己紹介</Text>
              <Text style={s.bodyText}>{narrative}</Text>
            </FlatCard>
            {character.family_background && (
              <FlatCard>
                <Text style={s.cardTitle}>家族のこと</Text>
                <Text style={s.bodyText}>{character.family_background}</Text>
              </FlatCard>
            )}
            {character.childhood_story && (
              <FlatCard>
                <Text style={s.cardTitle}>子ども時代</Text>
                <Text style={s.bodyText}>{character.childhood_story}</Text>
              </FlatCard>
            )}
            {character.love_history && (
              <FlatCard>
                <Text style={s.cardTitle}>恋愛遍歴</Text>
                <Text style={s.bodyText}>{character.love_history}</Text>
              </FlatCard>
            )}
            {character.current_romance_status && (
              <FlatCard>
                <Text style={s.cardTitle}>今の恋愛</Text>
                <Text style={s.bodyText}>{character.current_romance_status}</Text>
              </FlatCard>
            )}
          </>
        )}

        {tab === "posts" && (
          loadingPosts ? (
            <View style={s.centerWrap}>
              <ActivityIndicator color={C.ink3} />
            </View>
          ) : posts.length === 0 ? (
            <View style={s.centerWrap}>
              <Text style={s.emptyText}>まだ投稿がありません</Text>
            </View>
          ) : (
            posts.map(post => (
              <FlatCard key={post.id}>
                <Text style={s.postTime}>{timeAgo(post.created_at)}</Text>
                <Text style={s.postContent}>{post.content}</Text>
              </FlatCard>
            ))
          )
        )}

        {tab === "worries" && (
          worries.length === 0 ? (
            <View style={s.centerWrap}>
              <Text style={s.emptyText}>今は特に悩みはないみたい</Text>
            </View>
          ) : (
            worries.map(w => (
              <FlatCard key={w.id} shadowColor={w.resolved ? C.sage : C.ink}>
                <View style={s.worryHeader}>
                  <Text style={[s.worryText, w.resolved && s.worryStrike]}>
                    {w.content}
                  </Text>
                  {w.resolved && (
                    <View style={s.resolvedBadge}>
                      <Text style={s.resolvedBadgeText}>解決済み</Text>
                    </View>
                  )}
                </View>
                {/* Severity bar */}
                <View style={s.severityTrack}>
                  <View style={[s.severityFill, { width: `${w.severity * 10}%` as any }]} />
                </View>
              </FlatCard>
            ))
          )
        )}

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* ── Bottom CTA ──────────────────────────────────────────────── */}
      <View style={s.bottomBar}>
        <View style={s.chatBtnOuter}>
          <View style={s.chatBtnShadow} />
          <TouchableOpacity onPress={onChat} activeOpacity={0.85} style={s.chatBtn}>
            <MessageCircle size={18} color={C.white} strokeWidth={2.5} />
            <Text style={s.chatBtnText}>{character.name}に話しかける</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.mist },

  // ── Cover
  cover: {
    backgroundColor: C.coral,
    borderBottomWidth: 2,
    borderBottomColor: C.ink,
    paddingTop: SP.sm,
    paddingBottom: SP.xl,
    paddingHorizontal: SP.md,
  },
  backBtnWrap: { position: "relative", width: 36, height: 36, marginBottom: SP.md },
  backShadow: {
    position: "absolute",
    top: 3, left: 3, right: -3, bottom: -3,
    backgroundColor: C.coralD, borderRadius: 10,
  },
  backInner: {
    position: "absolute", inset: 0,
    width: 36, height: 36, borderRadius: 10,
    borderWidth: 2, borderColor: "rgba(255,255,255,0.6)",
    backgroundColor: "rgba(255,255,255,0.15)",
    justifyContent: "center", alignItems: "center",
  },

  heroWrap: { alignItems: "center" },
  avatarRingOuter: {
    position: "relative",
    marginBottom: 12,
    width: 104, height: 104,
    marginRight: 4, // visual offset for shadow
  },
  avatarRingShadow: {
    position: "absolute",
    top: 4, left: 4, right: -4, bottom: -4,
    backgroundColor: C.coralD,
    borderRadius: 52,
  },
  avatarRing: {
    width: 104, height: 104, borderRadius: 52,
    borderWidth: 3, borderColor: C.white,
    overflow: "hidden",
    backgroundColor: C.coralXL,
  },
  avatarImg: { width: 98, height: 98, borderRadius: 49 },
  avatarFallback: {
    width: 98, height: 98, borderRadius: 49,
    backgroundColor: C.coralXL,
    justifyContent: "center", alignItems: "center",
  },
  avatarInitial: { fontFamily: FONT.syneBlack, fontSize: SIZE.largeTitle, color: C.coral },
  heroName: {
    fontFamily: FONT.syneBlack, fontSize: SIZE.title2,
    color: C.white, marginBottom: 4,
  },
  heroMeta: {
    fontFamily: FONT.syne, fontSize: SIZE.body2,
    color: "rgba(255,255,255,0.8)", marginBottom: SP.md,
  },

  statRow: { flexDirection: "row", gap: SP.sm, marginTop: SP.xs },
  statPillOuter: {
    position: "relative", flex: 1,
    marginBottom: 3, marginRight: 3,
  },
  statPillShadow: {
    position: "absolute",
    top: 3, left: 3, right: -3, bottom: -3,
    backgroundColor: C.coralD, borderRadius: RADIUS.sm,
  },
  statPill: {
    borderWidth: 2, borderColor: "rgba(255,255,255,0.6)",
    borderRadius: RADIUS.sm, paddingVertical: 6, paddingHorizontal: 10,
    backgroundColor: "rgba(255,255,255,0.2)", alignItems: "center",
  },
  statLabel: { fontFamily: FONT.syne, fontSize: SIZE.label, color: "rgba(255,255,255,0.7)" },
  statValue: { fontFamily: FONT.syneBold, fontSize: SIZE.small, color: C.white },

  // ── Tabs
  tabBar: {
    flexDirection: "row",
    borderBottomWidth: 2, borderBottomColor: C.ink,
    backgroundColor: C.white,
  },
  tabItem: {
    flex: 1, alignItems: "center", paddingVertical: 13,
    position: "relative",
  },
  tabLabel: {
    fontFamily: FONT.syne, fontSize: SIZE.small, color: C.ink3,
  },
  tabLabelActive: { fontFamily: FONT.syneBold, color: C.ink },
  tabLine: {
    position: "absolute", bottom: 0,
    left: SP.md, right: SP.md,
    height: 3, backgroundColor: C.coral, borderRadius: 0,
  },

  // ── Content
  scroll: { flex: 1 },
  scrollContent: { padding: SP.md, gap: 12 },

  // Flat card
  cardShadow: {
    position: "absolute",
    top: CARD_OFFSET, left: CARD_OFFSET, right: -CARD_OFFSET, bottom: -CARD_OFFSET,
    backgroundColor: C.ink, borderRadius: RADIUS.md,
  },
  card: {
    backgroundColor: C.white,
    borderRadius: RADIUS.md,
    borderWidth: 2, borderColor: C.ink,
    padding: SP.md,
  },
  cardTitle: {
    fontFamily: FONT.syneSemi, fontSize: SIZE.label,
    color: C.ink2, letterSpacing: 0.8,
    marginBottom: SP.sm, textTransform: "uppercase",
  },
  bodyText: {
    fontFamily: FONT.regular, fontSize: SIZE.body1,
    color: C.ink, lineHeight: SIZE.body1 * 1.7,
  },

  // Posts
  postTime: {
    fontFamily: FONT.sans, fontSize: SIZE.caption,
    color: C.ink3, marginBottom: 6,
  },
  postContent: {
    fontFamily: FONT.regular, fontSize: SIZE.body1,
    color: C.ink, lineHeight: SIZE.body1 * 1.65,
  },

  // Worries
  worryHeader: {
    flexDirection: "row", justifyContent: "space-between",
    alignItems: "flex-start", gap: SP.sm, marginBottom: SP.sm,
  },
  worryText: {
    flex: 1, fontFamily: FONT.regular, fontSize: SIZE.body,
    color: C.ink, lineHeight: SIZE.body * 1.6,
  },
  worryStrike: { textDecorationLine: "line-through", color: C.ink2 },
  resolvedBadge: {
    backgroundColor: C.sage, borderRadius: RADIUS.pill,
    paddingHorizontal: 8, paddingVertical: 3,
    borderWidth: 1.5, borderColor: C.ink,
  },
  resolvedBadgeText: { fontFamily: FONT.syneBold, fontSize: SIZE.label, color: C.white },
  severityTrack: {
    height: 4, backgroundColor: C.mist,
    borderRadius: 2, overflow: "hidden",
    borderWidth: 1, borderColor: C.line,
  },
  severityFill: { height: "100%", backgroundColor: C.coral, borderRadius: 2 },

  // Empty
  centerWrap: { paddingTop: 60, alignItems: "center" },
  emptyText: { fontFamily: FONT.syne, fontSize: SIZE.body, color: C.ink3 },

  // ── Bottom CTA
  bottomBar: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    paddingHorizontal: SP.md, paddingBottom: 36, paddingTop: SP.sm,
    backgroundColor: C.white,
    borderTopWidth: 2, borderTopColor: C.ink,
  },
  chatBtnOuter: {
    position: "relative",
    marginBottom: 4, marginRight: 4,
  },
  chatBtnShadow: {
    position: "absolute",
    top: 4, left: 4, right: -4, bottom: -4,
    backgroundColor: C.coralD, borderRadius: RADIUS.lg,
  },
  chatBtn: {
    backgroundColor: C.coral,
    borderRadius: RADIUS.lg, borderWidth: 2, borderColor: C.coralD,
    paddingVertical: 16,
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: SP.sm,
  },
  chatBtnText: { fontFamily: FONT.syneBold, fontSize: SIZE.subtitle, color: C.white },
});
