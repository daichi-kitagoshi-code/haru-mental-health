import React, { useState, useEffect } from "react";
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  ActivityIndicator, FlatList,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { COLORS, SPACING, SHADOW } from "../constants/theme";
import { ChevronLeft, MessageCircle } from "lucide-react-native";
import { api } from "../services/api";

export interface CharacterProfile {
  id: string; name: string; gender: string; age: number;
  hometown: string; education?: string; background?: string;
  hobbies?: string; personality: string; speech_style: string;
  occupation?: string; current_city?: string;
  family_background?: string; childhood_story?: string;
  love_history?: string; current_romance_status?: string;
  work_hours?: string; narrative_profile?: string;
}

interface Post {
  id: string; content: string; post_type: string; created_at: string;
}

interface Worry {
  id: string; content: string; severity: number; resolved: boolean; created_at: string;
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

export default function CharacterProfileScreen({ character, onBack, onChat }: Props) {
  const [tab, setTab] = useState<Tab>("profile");
  const [posts, setPosts] = useState<Post[]>([]);
  const [worries, setWorries] = useState<Worry[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [loadingWorries, setLoadingWorries] = useState(false);

  useEffect(() => {
    if (tab === "posts" && posts.length === 0) loadPosts();
  }, [tab]);

  const loadPosts = async () => {
    setLoadingPosts(true);
    try {
      const data = await api.posts.getCharacterPosts(character.id);
      setPosts(data);
    } catch {}
    finally { setLoadingPosts(false); }
  };

  const narrative = character.narrative_profile ||
    `${character.hometown}出身、${character.age}歳。${character.background || ""}${character.hobbies ? `趣味は${character.hobbies}。` : ""}`;

  const location = character.current_city || character.hometown;

  return (
    <SafeAreaView style={s.container} edges={["top"]}>
      {/* Gradient header */}
      <LinearGradient
        colors={["#FFE0E0", "#E0E8FF"]}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={s.gradientHeader}
      >
        <TouchableOpacity onPress={onBack} style={s.backBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <ChevronLeft size={22} color={COLORS.text} strokeWidth={1.5} />
        </TouchableOpacity>
        <View style={s.heroContent}>
          <View style={s.heroAvatar}>
            <Text style={s.heroAvatarText}>{character.name[0]}</Text>
          </View>
          <Text style={s.heroName}>{character.name}</Text>
          <Text style={s.heroMeta}>
            {character.age}歳{character.occupation ? ` · ${character.occupation}` : ""} · {location}
          </Text>
        </View>
      </LinearGradient>

      {/* Tab bar */}
      <View style={s.tabBar}>
        {([["profile", "プロフィール"], ["posts", "最近の出来事"], ["worries", "悩み"]] as [Tab, string][]).map(([key, label]) => (
          <TouchableOpacity key={key} style={s.tabItem} onPress={() => setTab(key)}>
            <Text style={[s.tabLabel, tab === key && s.tabLabelActive]}>{label}</Text>
            {tab === key && <View style={s.tabUnderline} />}
          </TouchableOpacity>
        ))}
      </View>

      {/* Content */}
      <ScrollView style={s.body} contentContainerStyle={s.bodyContent} showsVerticalScrollIndicator={false}>
        {tab === "profile" && (
          <>
            <Card title="自己紹介">
              <Text style={s.bodyText}>{narrative}</Text>
            </Card>

            {character.family_background && (
              <Card title="家族のこと">
                <Text style={s.bodyText}>{character.family_background}</Text>
              </Card>
            )}

            {character.childhood_story && (
              <Card title="子ども時代">
                <Text style={s.bodyText}>{character.childhood_story}</Text>
              </Card>
            )}

            {character.love_history && (
              <Card title="恋愛遍歴">
                <Text style={s.bodyText}>{character.love_history}</Text>
              </Card>
            )}

            {character.current_romance_status && (
              <Card title="今の恋愛">
                <Text style={s.bodyText}>{character.current_romance_status}</Text>
              </Card>
            )}
          </>
        )}

        {tab === "posts" && (
          loadingPosts ? (
            <View style={s.loadingWrap}>
              <ActivityIndicator color={COLORS.textSecondary} />
            </View>
          ) : posts.length === 0 ? (
            <View style={s.emptyWrap}>
              <Text style={s.emptyText}>まだ投稿がありません</Text>
            </View>
          ) : (
            posts.map(post => (
              <View key={post.id} style={[s.card, s.postCard]}>
                <Text style={s.postTime}>{timeAgo(post.created_at)}</Text>
                <Text style={s.postContent}>{post.content}</Text>
              </View>
            ))
          )
        )}

        {tab === "worries" && (
          worries.length === 0 ? (
            <View style={s.emptyWrap}>
              <Text style={s.emptyText}>今は特に悩みはないみたい</Text>
            </View>
          ) : (
            worries.map(w => (
              <View key={w.id} style={[s.card, w.resolved && s.resolvedCard]}>
                <Text style={[s.worryText, w.resolved && s.resolvedText]}>{w.content}</Text>
                {w.resolved && <Text style={s.resolvedBadge}>解決済み</Text>}
              </View>
            ))
          )
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Chat button */}
      <View style={s.bottomBar}>
        <TouchableOpacity style={s.chatBtn} onPress={onChat} activeOpacity={0.85}>
          <MessageCircle size={18} color="#FFF" strokeWidth={2} />
          <Text style={s.chatBtnText}>{character.name}に話しかける</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={s.card}>
      <Text style={s.cardTitle}>{title}</Text>
      {children}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  gradientHeader: { paddingTop: 8, paddingBottom: 28, paddingHorizontal: SPACING.md },
  backBtn: { marginBottom: SPACING.md },
  heroContent: { alignItems: "center" },
  heroAvatar: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: "rgba(255,107,107,0.2)", justifyContent: "center", alignItems: "center",
    marginBottom: 12, borderWidth: 3, borderColor: "rgba(255,255,255,0.6)",
  },
  heroAvatarText: { fontSize: 32, fontWeight: "700", color: COLORS.accent1 },
  heroName: { fontSize: 24, fontWeight: "700", color: COLORS.text, marginBottom: 4 },
  heroMeta: { fontSize: 14, color: COLORS.textSecondary },
  tabBar: {
    flexDirection: "row", borderBottomWidth: 1, borderBottomColor: COLORS.border,
    backgroundColor: COLORS.bg,
  },
  tabItem: { flex: 1, alignItems: "center", paddingVertical: 12 },
  tabLabel: { fontSize: 13, color: COLORS.textSecondary, fontWeight: "500" },
  tabLabelActive: { color: COLORS.text, fontWeight: "700" },
  tabUnderline: { position: "absolute", bottom: 0, left: 16, right: 16, height: 2, backgroundColor: COLORS.accent1, borderRadius: 1 },
  body: { flex: 1 },
  bodyContent: { padding: SPACING.md, gap: 12 },
  bodyText: { fontSize: 15, color: COLORS.text, lineHeight: 26 },
  card: {
    backgroundColor: COLORS.surface, borderRadius: 16, padding: SPACING.md,
    borderWidth: 1, borderColor: COLORS.border, ...SHADOW.card,
  },
  cardTitle: { fontSize: 13, fontWeight: "700", color: COLORS.textSecondary, marginBottom: 8, letterSpacing: 0.5 },
  postCard: {},
  postTime: { fontSize: 12, color: COLORS.textSecondary, marginBottom: 6 },
  postContent: { fontSize: 15, color: COLORS.text, lineHeight: 26 },
  worryText: { fontSize: 15, color: COLORS.text, lineHeight: 24 },
  resolvedCard: { opacity: 0.6 },
  resolvedText: { textDecorationLine: "line-through" },
  resolvedBadge: { fontSize: 12, color: COLORS.accent2, marginTop: 6 },
  loadingWrap: { paddingTop: 60, alignItems: "center" },
  emptyWrap: { paddingTop: 60, alignItems: "center" },
  emptyText: { fontSize: 15, color: COLORS.textSecondary },
  bottomBar: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    paddingHorizontal: SPACING.md, paddingBottom: 36, paddingTop: SPACING.sm,
    backgroundColor: COLORS.bg, borderTopWidth: 1, borderTopColor: COLORS.border,
  },
  chatBtn: {
    backgroundColor: COLORS.text, borderRadius: 14, paddingVertical: 16,
    alignItems: "center", flexDirection: "row", justifyContent: "center", gap: 8,
  },
  chatBtnText: { color: "#FFF", fontSize: 17, fontWeight: "700" },
});
