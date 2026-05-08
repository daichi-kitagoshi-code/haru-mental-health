import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Image, RefreshControl, Animated, Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { C, GRAD } from "../constants/colors";
import { FONT, SIZE, RADIUS, SHADOW, SP } from "../constants/typography";
import { api } from "../services/api";

const { width: W } = Dimensions.get("window");

export interface CharacterProfile {
  id: string; name: string; age: number; gender: string;
  hometown: string; personality: string; speech_style: string;
  occupation?: string; current_city?: string; avatar_url?: string;
  narrative_profile?: string;
}

interface FeedPost {
  id: string; character_id: string; character_name: string;
  content: string; post_type: string; created_at: string;
}

interface Props {
  characters: CharacterProfile[];
  onSelectCharacter: (c: CharacterProfile) => void;
  onOpenProfile: (c: CharacterProfile) => void;
  onCreateNew: () => void;
  plan: string;
}

const POST_EMOJI: Record<string, string> = {
  daily: "📝", work: "💼", love: "💕", worry: "😟", followup: "🔄",
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "今";
  if (m < 60) return `${m}分前`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}時間前`;
  return `${Math.floor(h / 24)}日前`;
}

const CHAR_COLORS = ["#FF5A5F", "#4A90D9", "#52B788", "#F4A832", "#FF8FA3", "#FF385C"];
function charColor(id: string) {
  const hash = id.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  return CHAR_COLORS[hash % CHAR_COLORS.length];
}

function StoryRing({ character, onPress }: { character: CharacterProfile; onPress: () => void }) {
  const color = charColor(character.id);
  return (
    <TouchableOpacity style={st.storyWrap} onPress={onPress} activeOpacity={0.85}>
      <LinearGradient colors={[color + "CC", color]} style={st.storyRing} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
        <View style={st.storyInner}>
          {character.avatar_url ? (
            <Image source={{ uri: character.avatar_url }} style={st.storyImg} />
          ) : (
            <View style={[st.storyFallback, { backgroundColor: color + "22" }]}>
              <Text style={[st.storyInitial, { color }]}>{character.name[0]}</Text>
            </View>
          )}
        </View>
      </LinearGradient>
      <Text style={st.storyName} numberOfLines={1}>{character.name}</Text>
    </TouchableOpacity>
  );
}

function FeedCard({ post, character, onReply }: {
  post: FeedPost; character?: CharacterProfile; onReply: () => void;
}) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(8)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start();
  }, []);

  const color = charColor(post.character_id);

  return (
    <Animated.View style={[fc.wrap, SHADOW.light, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
      <View style={fc.header}>
        <View style={[fc.avatarRing, { borderColor: color + "44" }]}>
          {character?.avatar_url ? (
            <Image source={{ uri: character.avatar_url }} style={fc.avatarImg} />
          ) : (
            <View style={[fc.avatarFallback, { backgroundColor: color + "18" }]}>
              <Text style={[fc.avatarInitial, { color }]}>{post.character_name[0]}</Text>
            </View>
          )}
        </View>
        <View style={fc.meta}>
          <Text style={fc.name}>{post.character_name}</Text>
          <Text style={fc.sub}>{character?.occupation ?? ""} · {timeAgo(post.created_at)}</Text>
        </View>
        <Text style={fc.emoji}>{POST_EMOJI[post.post_type] ?? "📝"}</Text>
      </View>

      <Text style={fc.body}>{post.content}</Text>

      <View style={fc.actions}>
        <TouchableOpacity style={fc.replyBtn} onPress={onReply} activeOpacity={0.8}>
          <Text style={fc.replyText}>返事する</Text>
        </TouchableOpacity>
        <TouchableOpacity style={fc.likeBtn} activeOpacity={0.8}>
          <Text style={fc.likeText}>♡ いいね</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

function FriendRow({ character, onPress, onChatPress }: {
  character: CharacterProfile; onPress: () => void; onChatPress: () => void;
}) {
  const color = charColor(character.id);
  return (
    <TouchableOpacity style={[fr.wrap, SHADOW.light]} onPress={onPress} activeOpacity={0.85}>
      <View style={[fr.accentBar, { backgroundColor: color }]} />
      <View style={[fr.avatarRing, { borderColor: color + "40" }]}>
        {character.avatar_url ? (
          <Image source={{ uri: character.avatar_url }} style={fr.avatarImg} />
        ) : (
          <View style={[fr.avatarFallback, { backgroundColor: color + "18" }]}>
            <Text style={[fr.avatarInitial, { color }]}>{character.name[0]}</Text>
          </View>
        )}
        <View style={fr.onlineDot} />
      </View>
      <View style={fr.info}>
        <Text style={fr.name}>{character.name}</Text>
        <Text style={fr.sub} numberOfLines={1}>
          {character.occupation ?? ""}{character.current_city ? ` · ${character.current_city}` : ""}
        </Text>
      </View>
      <TouchableOpacity style={fr.chatChip} onPress={onChatPress} activeOpacity={0.8}>
        <Text style={fr.chatChipText}>チャット</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

export default function HomeScreen({ characters, onSelectCharacter, onOpenProfile, onCreateNew, plan }: Props) {
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => { loadFeed(); }, []);

  const loadFeed = async () => {
    try { setPosts(await api.posts.getFeed()); } catch {}
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadFeed();
    setRefreshing(false);
  }, []);

  const getCharacterById = (id: string) => characters.find(c => c.id === id);
  const limit = plan === "free" ? 2 : plan === "standard" ? 3 : 5;

  return (
    <SafeAreaView style={s.root} edges={["top"]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.accent} />}
      >
        {/* Header */}
        <View style={s.header}>
          <Text style={s.greeting}>おかえり 👋</Text>
          <Text style={s.titleRow}>
            <Text style={s.titleNormal}>友達の</Text>
            <Text style={s.titleAccent}>近況</Text>
            <Text style={s.titleNormal}>をチェック</Text>
          </Text>
        </View>

        {/* Stories */}
        {characters.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={s.storiesContent}
            style={s.stories}
          >
            {characters.map(c => (
              <StoryRing key={c.id} character={c} onPress={() => onOpenProfile(c)} />
            ))}
            {characters.length < limit && (
              <TouchableOpacity style={st.addStory} onPress={onCreateNew} activeOpacity={0.8}>
                <View style={st.addStoryCircle}>
                  <Text style={st.addStoryPlus}>＋</Text>
                </View>
                <Text style={st.storyName}>追加</Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        )}

        {/* Feed */}
        {posts.length > 0 && (
          <>
            <View style={s.sectionHeader}>
              <Text style={s.sectionLabel}>TODAY'S UPDATES</Text>
            </View>
            {posts.map(post => (
              <FeedCard
                key={post.id}
                post={post}
                character={getCharacterById(post.character_id)}
                onReply={() => {
                  const c = getCharacterById(post.character_id);
                  if (c) onSelectCharacter(c);
                }}
              />
            ))}
          </>
        )}

        {/* Friends list */}
        {characters.length > 0 && (
          <>
            <View style={s.sectionHeader}>
              <Text style={s.sectionLabel}>FRIENDS</Text>
              {characters.length < limit && (
                <TouchableOpacity onPress={onCreateNew}>
                  <Text style={s.sectionAction}>+ 追加</Text>
                </TouchableOpacity>
              )}
            </View>
            {characters.map(c => (
              <FriendRow
                key={c.id}
                character={c}
                onPress={() => onOpenProfile(c)}
                onChatPress={() => onSelectCharacter(c)}
              />
            ))}
          </>
        )}

        {/* Empty state */}
        {characters.length === 0 && (
          <View style={s.empty}>
            <Text style={s.emptyEmoji}>✨</Text>
            <Text style={s.emptyTitle}>友達を作ろう</Text>
            <Text style={s.emptySub}>AIが作るリアルな友達と{"\n"}毎日会話できます</Text>
            <TouchableOpacity style={s.emptyBtn} onPress={onCreateNew} activeOpacity={0.85}>
              <LinearGradient colors={GRAD} style={s.emptyBtnGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                <Text style={s.emptyBtnText}>最初の友達を作る</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}

        <View style={{ height: 16 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

/* Story styles */
const st = StyleSheet.create({
  storyWrap: { alignItems: "center", marginRight: 14, width: 68 },
  storyRing: { width: 64, height: 64, borderRadius: 32, padding: 2.5, marginBottom: 5 },
  storyInner: { flex: 1, borderRadius: 30, overflow: "hidden", backgroundColor: C.bg, borderWidth: 2, borderColor: C.bg },
  storyImg: { width: "100%", height: "100%" },
  storyFallback: { flex: 1, justifyContent: "center", alignItems: "center" },
  storyInitial: { fontSize: 22, fontFamily: FONT.bold },
  storyName: { fontSize: SIZE.caption, color: C.textSecondary, fontFamily: FONT.regular, textAlign: "center" },
  addStory: { alignItems: "center", marginRight: 14, width: 68 },
  addStoryCircle: {
    width: 64, height: 64, borderRadius: 32, borderWidth: 2,
    borderColor: C.border, borderStyle: "dashed",
    justifyContent: "center", alignItems: "center", marginBottom: 5,
    backgroundColor: C.bgSecondary,
  },
  addStoryPlus: { fontSize: 24, color: C.textTertiary, lineHeight: 28 },
});

/* Feed card styles */
const fc = StyleSheet.create({
  wrap: {
    backgroundColor: C.bg, borderRadius: RADIUS.lg, borderWidth: 1,
    borderColor: C.border, marginHorizontal: SP.md, marginBottom: 12, padding: SP.md,
  },
  header: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  avatarRing: { width: 44, height: 44, borderRadius: 22, borderWidth: 2, overflow: "hidden", marginRight: 10 },
  avatarImg: { width: "100%", height: "100%" },
  avatarFallback: { flex: 1, justifyContent: "center", alignItems: "center" },
  avatarInitial: { fontSize: 17, fontFamily: FONT.bold },
  meta: { flex: 1 },
  name: { fontSize: SIZE.body1, fontFamily: FONT.bold, color: C.text, marginBottom: 2 },
  sub: { fontSize: SIZE.caption, color: C.textTertiary, fontFamily: FONT.regular },
  emoji: { fontSize: 20 },
  body: { fontSize: SIZE.body, color: C.text, fontFamily: FONT.regular, lineHeight: SIZE.body * 1.72, marginBottom: 14 },
  actions: { flexDirection: "row", gap: 8 },
  replyBtn: {
    flex: 1, paddingVertical: 9, borderRadius: RADIUS.pill,
    backgroundColor: C.accentSoft, alignItems: "center",
  },
  replyText: { fontSize: SIZE.body2, color: C.accent, fontFamily: FONT.bold },
  likeBtn: {
    paddingVertical: 9, paddingHorizontal: 18, borderRadius: RADIUS.pill,
    backgroundColor: C.bgSecondary, alignItems: "center",
  },
  likeText: { fontSize: SIZE.body2, color: C.textSecondary, fontFamily: FONT.regular },
});

/* Friend row styles */
const fr = StyleSheet.create({
  wrap: {
    flexDirection: "row", alignItems: "center", backgroundColor: C.bg,
    borderRadius: RADIUS.md, borderWidth: 1, borderColor: C.border,
    marginHorizontal: SP.md, marginBottom: 10, paddingVertical: 12,
    paddingRight: 14, overflow: "hidden",
  },
  accentBar: { width: 3, alignSelf: "stretch", marginRight: 12 },
  avatarRing: { width: 44, height: 44, borderRadius: 22, borderWidth: 2, overflow: "hidden", marginRight: 10, position: "relative" },
  avatarImg: { width: "100%", height: "100%" },
  avatarFallback: { flex: 1, justifyContent: "center", alignItems: "center" },
  avatarInitial: { fontSize: 17, fontFamily: FONT.bold },
  onlineDot: {
    position: "absolute", bottom: 0, right: 0,
    width: 11, height: 11, borderRadius: 6,
    backgroundColor: C.online, borderWidth: 2, borderColor: C.bg,
  },
  info: { flex: 1 },
  name: { fontSize: SIZE.body1, fontFamily: FONT.bold, color: C.text, marginBottom: 2 },
  sub: { fontSize: SIZE.caption, color: C.textTertiary, fontFamily: FONT.regular },
  chatChip: {
    paddingHorizontal: 14, paddingVertical: 6, borderRadius: RADIUS.pill,
    backgroundColor: C.accentSoft,
  },
  chatChipText: { fontSize: SIZE.caption, color: C.accent, fontFamily: FONT.bold },
});

/* Main styles */
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  scroll: { paddingBottom: 24 },
  header: { paddingHorizontal: SP.md, paddingTop: SP.sm, paddingBottom: SP.md },
  greeting: { fontSize: SIZE.body2, color: C.textTertiary, fontFamily: FONT.regular, marginBottom: 4 },
  titleRow: { lineHeight: 38 },
  titleNormal: { fontSize: 28, fontFamily: FONT.black, color: C.text, letterSpacing: -1 },
  titleAccent: { fontSize: 28, fontFamily: FONT.black, color: C.accent, letterSpacing: -1 },
  stories: { marginBottom: SP.md },
  storiesContent: { paddingHorizontal: SP.md, paddingVertical: SP.xs },
  sectionHeader: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingHorizontal: SP.md, marginBottom: 10, marginTop: 4,
  },
  sectionLabel: {
    fontSize: SIZE.label, fontFamily: FONT.monoBold, color: C.textTertiary,
    letterSpacing: 1.2,
  },
  sectionAction: { fontSize: SIZE.body2, color: C.accent, fontFamily: FONT.bold },
  empty: { alignItems: "center", paddingTop: 60, paddingHorizontal: SP.xl },
  emptyEmoji: { fontSize: 56, marginBottom: 20 },
  emptyTitle: { fontSize: SIZE.title2, fontFamily: FONT.black, color: C.text, marginBottom: 8, letterSpacing: -0.5 },
  emptySub: { fontSize: SIZE.body, color: C.textSecondary, fontFamily: FONT.regular, textAlign: "center", lineHeight: SIZE.body * 1.7, marginBottom: 32 },
  emptyBtn: { width: "100%", borderRadius: RADIUS.pill, overflow: "hidden" },
  emptyBtnGrad: { paddingVertical: 17, alignItems: "center" },
  emptyBtnText: { color: C.white, fontSize: SIZE.subtitle, fontFamily: FONT.bold },
});
