import React, { useState, useEffect } from "react";
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  ActivityIndicator, Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { C, GRAD } from "../constants/colors";
import { FONT, SIZE, SP, RADIUS, SHADOW } from "../constants/typography";
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
      {/* Gradient header */}
      <LinearGradient
        colors={["#FFE8E8", "#E8E8FF"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={s.gradHeader}
      >
        <TouchableOpacity
          onPress={onBack}
          style={s.backBtn}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <ChevronLeft size={20} color={C.text} strokeWidth={2} />
        </TouchableOpacity>

        <View style={s.heroWrap}>
          <View style={s.avatarRing}>
            {character.avatar_url ? (
              <Image source={{ uri: character.avatar_url }} style={s.avatarImg} />
            ) : (
              <View style={s.avatarFallback}>
                <Text style={s.avatarInitial}>{character.name[0]}</Text>
              </View>
            )}
          </View>
          <Text style={s.heroName}>{character.name}</Text>
          <Text style={s.heroMeta}>
            {character.age}歳
            {character.occupation ? ` · ${character.occupation}` : ""}
            {" · "}{location}
          </Text>
        </View>
      </LinearGradient>

      {/* Tab bar */}
      <View style={s.tabBar}>
        {TABS.map(([key, label]) => (
          <TouchableOpacity
            key={key}
            style={s.tabItem}
            onPress={() => setTab(key)}
          >
            <Text style={[s.tabLabel, tab === key && s.tabLabelActive]}>
              {label}
            </Text>
            {tab === key && <View style={s.tabLine} />}
          </TouchableOpacity>
        ))}
      </View>

      {/* Content */}
      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {tab === "profile" && (
          <>
            <InfoCard title="自己紹介">
              <Text style={s.bodyText}>{narrative}</Text>
            </InfoCard>

            {character.family_background && (
              <InfoCard title="家族のこと">
                <Text style={s.bodyText}>{character.family_background}</Text>
              </InfoCard>
            )}

            {character.childhood_story && (
              <InfoCard title="子ども時代">
                <Text style={s.bodyText}>{character.childhood_story}</Text>
              </InfoCard>
            )}

            {character.love_history && (
              <InfoCard title="恋愛遍歴">
                <Text style={s.bodyText}>{character.love_history}</Text>
              </InfoCard>
            )}

            {character.current_romance_status && (
              <InfoCard title="今の恋愛">
                <Text style={s.bodyText}>{character.current_romance_status}</Text>
              </InfoCard>
            )}
          </>
        )}

        {tab === "posts" && (
          loadingPosts ? (
            <View style={s.centerWrap}>
              <ActivityIndicator color={C.textTertiary} />
            </View>
          ) : posts.length === 0 ? (
            <View style={s.centerWrap}>
              <Text style={s.emptyText}>まだ投稿がありません</Text>
            </View>
          ) : (
            posts.map(post => (
              <View key={post.id} style={s.postCard}>
                <Text style={s.postTime}>{timeAgo(post.created_at)}</Text>
                <Text style={s.postContent}>{post.content}</Text>
              </View>
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
              <View key={w.id} style={[s.worryCard, w.resolved && s.worryResolved]}>
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
                <View style={s.severityBar}>
                  <View style={[s.severityFill, { width: `${w.severity * 10}%` as any }]} />
                </View>
              </View>
            ))
          )
        )}

        <View style={{ height: 110 }} />
      </ScrollView>

      {/* Bottom CTA */}
      <View style={s.bottomBar}>
        <TouchableOpacity onPress={onChat} activeOpacity={0.85}>
          <LinearGradient
            colors={GRAD}
            style={s.chatBtn}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <MessageCircle size={18} color={C.white} strokeWidth={2} />
            <Text style={s.chatBtnText}>{character.name}に話しかける</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

function InfoCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={s.card}>
      <Text style={s.cardTitle}>{title}</Text>
      {children}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },

  // Gradient header
  gradHeader: {
    paddingTop: SP.sm,
    paddingBottom: SP.xl,
    paddingHorizontal: SP.md,
    minHeight: 220,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.6)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: SP.md,
  },
  heroWrap: { alignItems: "center" },
  avatarRing: {
    width: 100,
    height: 100,
    borderRadius: 50,
    padding: 3,
    backgroundColor: C.white,
    marginBottom: 12,
    ...SHADOW.medium,
  },
  avatarImg: {
    width: 94,
    height: 94,
    borderRadius: 47,
  },
  avatarFallback: {
    width: 94,
    height: 94,
    borderRadius: 47,
    backgroundColor: C.accentSoft,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarInitial: {
    fontFamily: FONT.bold,
    fontSize: SIZE.largeTitle,
    color: C.accent,
  },
  heroName: {
    fontFamily: FONT.bold,
    fontSize: SIZE.title2,
    color: C.text,
    marginBottom: 4,
  },
  heroMeta: {
    fontFamily: FONT.regular,
    fontSize: SIZE.body2,
    color: C.textSecondary,
  },

  // Tabs
  tabBar: {
    flexDirection: "row",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: C.border,
    backgroundColor: C.bg,
  },
  tabItem: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 13,
    position: "relative",
  },
  tabLabel: {
    fontFamily: FONT.medium,
    fontSize: SIZE.small,
    color: C.textTertiary,
  },
  tabLabelActive: {
    color: C.text,
    fontFamily: FONT.bold,
  },
  tabLine: {
    position: "absolute",
    bottom: 0,
    left: SP.md,
    right: SP.md,
    height: 2,
    backgroundColor: C.accent,
    borderRadius: 1,
  },

  // Content
  scroll: { flex: 1 },
  scrollContent: {
    padding: SP.md,
    gap: 12,
  },
  bodyText: {
    fontFamily: FONT.regular,
    fontSize: SIZE.body1,
    color: C.text,
    lineHeight: SIZE.body1 * 1.7,
  },

  // Cards
  card: {
    backgroundColor: C.bg,
    borderRadius: RADIUS.md,
    padding: SP.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.border,
    ...SHADOW.light,
  },
  cardTitle: {
    fontFamily: FONT.bold,
    fontSize: SIZE.label,
    color: C.textTertiary,
    letterSpacing: 0.8,
    marginBottom: SP.sm,
    textTransform: "uppercase",
  },

  // Posts
  postCard: {
    backgroundColor: C.bg,
    borderRadius: RADIUS.md,
    padding: SP.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.border,
    ...SHADOW.light,
  },
  postTime: {
    fontFamily: FONT.regular,
    fontSize: SIZE.caption,
    color: C.textTertiary,
    marginBottom: 6,
  },
  postContent: {
    fontFamily: FONT.regular,
    fontSize: SIZE.body1,
    color: C.text,
    lineHeight: SIZE.body1 * 1.65,
  },

  // Worries
  worryCard: {
    backgroundColor: C.bg,
    borderRadius: RADIUS.md,
    padding: SP.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.border,
    ...SHADOW.light,
  },
  worryResolved: { opacity: 0.55 },
  worryHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: SP.sm,
    marginBottom: SP.sm,
  },
  worryText: {
    flex: 1,
    fontFamily: FONT.regular,
    fontSize: SIZE.body,
    color: C.text,
    lineHeight: SIZE.body * 1.6,
  },
  worryStrike: { textDecorationLine: "line-through" },
  resolvedBadge: {
    backgroundColor: C.accentSofter,
    borderRadius: RADIUS.pill,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  resolvedBadgeText: {
    fontFamily: FONT.medium,
    fontSize: SIZE.label,
    color: C.accent,
  },
  severityBar: {
    height: 3,
    backgroundColor: C.bgSecondary,
    borderRadius: 2,
    overflow: "hidden",
  },
  severityFill: {
    height: "100%",
    backgroundColor: C.accent,
    borderRadius: 2,
  },

  // Empty / Loading
  centerWrap: {
    paddingTop: 60,
    alignItems: "center",
  },
  emptyText: {
    fontFamily: FONT.regular,
    fontSize: SIZE.body,
    color: C.textTertiary,
  },

  // Bottom CTA
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: SP.md,
    paddingBottom: 36,
    paddingTop: SP.sm,
    backgroundColor: C.bgOverlay,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: C.border,
  },
  chatBtn: {
    borderRadius: RADIUS.lg,
    paddingVertical: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: SP.sm,
    ...SHADOW.medium,
  },
  chatBtnText: {
    fontFamily: FONT.bold,
    fontSize: SIZE.subtitle,
    color: C.white,
  },
});
