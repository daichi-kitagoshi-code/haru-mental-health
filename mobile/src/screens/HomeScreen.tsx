import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Image, RefreshControl, Animated,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { C, FLAT } from "../constants/colors";
import { FONT, SIZE, SP, RADIUS } from "../constants/typography";
import { api } from "../services/api";

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

const POST_BADGE: Record<string, string> = { daily: "📝", work: "💼", love: "💕", worry: "😟", followup: "🔄" };
const CHAR_COLORS = [C.coral, C.sky, C.sage, C.gold, C.lavender, C.coralL];
function charColor(id: string) {
  const h = id.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  return CHAR_COLORS[h % CHAR_COLORS.length];
}
function timeAgo(d: string) {
  const m = Math.floor((Date.now() - new Date(d).getTime()) / 60000);
  if (m < 1) return "今";
  if (m < 60) return `${m}分前`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}時間前`;
  return `${Math.floor(h / 24)}日前`;
}

// ── Flat shadow wrapper ──────────────────────────────────
function FlatCard({ children, style, shadowColor = C.ink, offset = 4, borderRadius = RADIUS.md }:
  { children: React.ReactNode; style?: any; shadowColor?: string; offset?: number; borderRadius?: number }) {
  return (
    <View style={{ marginBottom: offset, marginRight: offset }}>
      <View style={{
        position: "absolute", top: offset, left: offset, right: -offset, bottom: -offset,
        backgroundColor: shadowColor, borderRadius,
      }} />
      <View style={[{ borderRadius, borderWidth: 2, borderColor: C.ink, backgroundColor: C.white, overflow: "hidden" }, style]}>
        {children}
      </View>
    </View>
  );
}

// ── Story ring ───────────────────────────────────────────
function StoryRing({ char, onPress }: { char: CharacterProfile; onPress: () => void }) {
  const color = charColor(char.id);
  return (
    <TouchableOpacity style={st.wrap} onPress={onPress} activeOpacity={0.85}>
      <View style={[st.shadowDot, { backgroundColor: color }]} />
      <View style={[st.ring, { borderColor: color }]}>
        {char.avatar_url
          ? <Image source={{ uri: char.avatar_url }} style={st.img} />
          : <View style={[st.fallback, { backgroundColor: color + "22" }]}>
              <Text style={[st.initial, { color }]}>{char.name[0]}</Text>
            </View>}
      </View>
      <Text style={st.name} numberOfLines={1}>{char.name}</Text>
    </TouchableOpacity>
  );
}
const st = StyleSheet.create({
  wrap: { alignItems: "center", marginRight: 14, width: 68 },
  shadowDot: { position: "absolute", top: 3, left: 3, width: 60, height: 60, borderRadius: 30 },
  ring: {
    width: 60, height: 60, borderRadius: 30, borderWidth: 3,
    backgroundColor: C.white, overflow: "hidden",
  },
  img: { width: "100%", height: "100%" },
  fallback: { flex: 1, justifyContent: "center", alignItems: "center" },
  initial: { fontFamily: FONT.syneBold, fontSize: SIZE.subtitle },
  name: { fontFamily: FONT.syneBold, fontSize: SIZE.label, color: C.ink, marginTop: 5 },
});

// ── Feed card ────────────────────────────────────────────
function FeedCard({ post, char, onReply }: { post: FeedPost; char?: CharacterProfile; onReply: () => void }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, { toValue: 1, duration: 350, useNativeDriver: true }).start();
  }, []);
  const color = char ? charColor(char.id) : C.coral;
  return (
    <Animated.View style={{ opacity: anim, transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }], marginHorizontal: SP.md, marginBottom: 14 }}>
      <FlatCard borderRadius={RADIUS.md}>
        {/* Header */}
        <View style={fc.header}>
          <View style={[fc.av, { backgroundColor: color + "18", borderColor: C.ink }]}>
            {char?.avatar_url
              ? <Image source={{ uri: char.avatar_url }} style={fc.avImg} />
              : <Text style={[fc.avText, { color }]}>{post.character_name[0]}</Text>}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={fc.name}>{post.character_name}</Text>
            <Text style={fc.meta}>{timeAgo(post.created_at)} · {char?.occupation ?? ""}</Text>
          </View>
          <View style={fc.badge}>
            <Text style={fc.badgeText}>{POST_BADGE[post.post_type] ?? "📝"} NEW</Text>
          </View>
        </View>
        {/* Body */}
        <Text style={fc.body}>{post.content}</Text>
        {/* Actions */}
        <View style={fc.divider} />
        <View style={fc.actions}>
          <TouchableOpacity style={[fc.btn, fc.btnReply]} onPress={onReply} activeOpacity={0.85}>
            <Text style={[fc.btnText, { color: C.white }]}>💬 返事する</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[fc.btn, fc.btnLike]} activeOpacity={0.85}>
            <Text style={[fc.btnText, { color: C.ink }]}>🤍 いいね</Text>
          </TouchableOpacity>
        </View>
      </FlatCard>
    </Animated.View>
  );
}
const fc = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", gap: 10, padding: 14, paddingBottom: 10 },
  av: { width: 42, height: 42, borderRadius: RADIUS.sm, borderWidth: 2, justifyContent: "center", alignItems: "center", overflow: "hidden" },
  avImg: { width: "100%", height: "100%" },
  avText: { fontFamily: FONT.syneBold, fontSize: SIZE.subtitle },
  name: { fontFamily: FONT.syneBold, fontSize: SIZE.body1, color: C.ink },
  meta: { fontFamily: FONT.syne, fontSize: SIZE.caption, color: C.ink3 },
  badge: { backgroundColor: C.coral, borderRadius: RADIUS.pill, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText: { fontFamily: FONT.syneBold, fontSize: SIZE.label, color: C.white },
  body: { paddingHorizontal: 14, paddingBottom: 12, fontFamily: FONT.regular, fontSize: SIZE.body, color: C.ink, lineHeight: SIZE.body * 1.72 },
  divider: { height: 2, backgroundColor: C.line },
  actions: { flexDirection: "row", gap: 8, padding: 10 },
  btn: { flex: 1, paddingVertical: 9, borderRadius: RADIUS.sm, borderWidth: 2, borderColor: C.ink, alignItems: "center" },
  btnReply: { backgroundColor: C.coral, ...FLAT.coral },
  btnLike: { backgroundColor: C.white, ...FLAT.sm },
  btnText: { fontFamily: FONT.syneBold, fontSize: SIZE.small },
});

// ── Friend row ───────────────────────────────────────────
function FriendRow({ char, onPress, onChat }: { char: CharacterProfile; onPress: () => void; onChat: () => void }) {
  const color = charColor(char.id);
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.9} style={{ marginHorizontal: SP.md, marginBottom: 8 }}>
      <FlatCard style={{ flexDirection: "row", alignItems: "center", gap: 12, padding: 12, paddingRight: 14 }} borderRadius={RADIUS.md}>
        <View style={[fr.leftBar, { backgroundColor: color }]} />
        <View style={[fr.av, { backgroundColor: color + "18", borderColor: C.ink }]}>
          {char.avatar_url
            ? <Image source={{ uri: char.avatar_url }} style={fr.avImg} />
            : <Text style={[fr.avText, { color }]}>{char.name[0]}</Text>}
          <View style={fr.onlineDot} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={fr.name}>{char.name}</Text>
          <Text style={fr.sub} numberOfLines={1}>{char.occupation ?? char.hometown}</Text>
        </View>
        <TouchableOpacity onPress={onChat} style={[fr.chatBtn, { borderColor: C.ink }]} activeOpacity={0.8}>
          <Text style={fr.chatText}>チャット</Text>
        </TouchableOpacity>
      </FlatCard>
    </TouchableOpacity>
  );
}
const fr = StyleSheet.create({
  leftBar: { width: 4, height: "100%", position: "absolute", left: 0, top: 0, bottom: 0, borderTopLeftRadius: RADIUS.md, borderBottomLeftRadius: RADIUS.md },
  av: { width: 44, height: 44, borderRadius: RADIUS.sm, borderWidth: 2, justifyContent: "center", alignItems: "center", overflow: "hidden", position: "relative", marginLeft: 6 },
  avImg: { width: "100%", height: "100%" },
  avText: { fontFamily: FONT.syneBold, fontSize: SIZE.subtitle },
  onlineDot: { position: "absolute", bottom: 1, right: 1, width: 10, height: 10, borderRadius: 5, backgroundColor: C.sage, borderWidth: 1.5, borderColor: C.white },
  name: { fontFamily: FONT.syneBold, fontSize: SIZE.body1, color: C.ink },
  sub: { fontFamily: FONT.syne, fontSize: SIZE.caption, color: C.ink3, marginTop: 1 },
  chatBtn: { backgroundColor: C.coral, borderWidth: 2, borderRadius: RADIUS.sm, paddingHorizontal: 12, paddingVertical: 6, ...FLAT.sm },
  chatText: { fontFamily: FONT.syneBold, fontSize: SIZE.caption, color: C.white },
});

// ── Main screen ──────────────────────────────────────────
export default function HomeScreen({ characters, onSelectCharacter, onOpenProfile, onCreateNew, plan }: Props) {
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const limit = plan === "free" ? 2 : plan === "standard" ? 3 : 5;

  useEffect(() => { loadFeed(); }, []);
  const loadFeed = async () => {
    try { setPosts(await api.posts.getFeed()); } catch {}
  };
  const onRefresh = useCallback(async () => {
    setRefreshing(true); await loadFeed(); setRefreshing(false);
  }, []);
  const getChar = (id: string) => characters.find(c => c.id === id);

  return (
    <SafeAreaView style={s.root} edges={["top"]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.coral} />}
      >
        {/* Top bar */}
        <View style={s.topbar}>
          <View style={s.logoRow}>
            <View style={s.logoMark}>
              <Text style={{ fontSize: 14 }}>✦</Text>
            </View>
            <Text style={s.wordmark}>haru</Text>
          </View>
        </View>

        {/* Greeting hero card */}
        <View style={{ marginHorizontal: SP.md, marginBottom: SP.md }}>
          <FlatCard style={s.greetCard} shadowColor={C.ink} borderRadius={RADIUS.lg}>
            <Text style={s.greetSub}>おかえり 👋</Text>
            <Text style={s.greetMain}>友達の近況を{"\n"}チェック</Text>
            <Text style={{ position: "absolute", right: 16, bottom: 12, fontSize: 52 }}>🌸</Text>
          </FlatCard>
        </View>

        {/* Stories */}
        {characters.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.storiesCont} style={{ marginBottom: SP.md }}>
            {characters.map(c => <StoryRing key={c.id} char={c} onPress={() => onOpenProfile(c)} />)}
            {characters.length < limit && (
              <TouchableOpacity style={st.wrap} onPress={onCreateNew} activeOpacity={0.8}>
                <View style={[st.ring, { borderColor: C.line, borderStyle: "dashed" }]}>
                  <Text style={{ fontSize: 22, color: C.ink3 }}>＋</Text>
                </View>
                <Text style={[st.name, { color: C.ink3 }]}>追加</Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        )}

        {/* Feed */}
        {posts.length > 0 && (
          <>
            <View style={s.secRow}>
              <View style={s.secLabelWrap}><Text style={s.secLabel}>TODAY'S UPDATE</Text></View>
              <Text style={s.secAction}>すべて見る</Text>
            </View>
            {posts.map(p => (
              <FeedCard key={p.id} post={p} char={getChar(p.character_id)} onReply={() => onSelectCharacter(characters.find(c => c.id === p.character_id)!)} />
            ))}
          </>
        )}

        {/* Friends */}
        {characters.length > 0 && (
          <>
            <View style={[s.secRow, { marginTop: 4 }]}>
              <View style={s.secLabelWrap}><Text style={s.secLabel}>FRIENDS</Text></View>
              {characters.length < limit && (
                <TouchableOpacity onPress={onCreateNew}><Text style={s.secAction}>＋ 追加</Text></TouchableOpacity>
              )}
            </View>
            {characters.map(c => (
              <FriendRow key={c.id} char={c} onPress={() => onOpenProfile(c)} onChat={() => onSelectCharacter(c)} />
            ))}
          </>
        )}

        {/* Empty state */}
        {characters.length === 0 && (
          <View style={s.empty}>
            <Text style={{ fontSize: 64 }}>🌸</Text>
            <Text style={s.emptyTitle}>友達を作ろう</Text>
            <Text style={s.emptySub}>2問答えるだけで{"\n"}あなたの友達が生まれるよ</Text>
            <TouchableOpacity onPress={onCreateNew} activeOpacity={0.85}>
              <FlatCard style={s.emptyBtn} shadowColor={C.ink} borderRadius={RADIUS.md}>
                <Text style={s.emptyBtnText}>友達を作る ✦</Text>
              </FlatCard>
            </TouchableOpacity>
          </View>
        )}

        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.snow },
  scroll: { paddingBottom: 16 },
  topbar: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: SP.md, paddingTop: SP.sm, paddingBottom: SP.sm },
  logoRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  logoMark: { width: 32, height: 32, backgroundColor: C.coral, borderRadius: 10, borderWidth: 2, borderColor: C.ink, ...FLAT.sm, justifyContent: "center", alignItems: "center" },
  wordmark: { fontFamily: "DMSerifDisplay_400Regular", fontSize: 26, color: C.coral, letterSpacing: -0.5 },
  greetCard: { backgroundColor: C.coral, padding: 18, minHeight: 100, overflow: "hidden" },
  greetSub: { fontFamily: FONT.syneSemi, fontSize: SIZE.small, color: "rgba(255,255,255,0.75)", marginBottom: 4 },
  greetMain: { fontFamily: FONT.syneBlack, fontSize: SIZE.title2, color: C.white, letterSpacing: -0.5, lineHeight: SIZE.title2 * 1.2 },
  storiesCont: { paddingHorizontal: SP.md, paddingVertical: SP.xs },
  secRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: SP.md, marginBottom: 10 },
  secLabelWrap: { flexDirection: "row", alignItems: "center", gap: 6 },
  secLabel: { fontFamily: FONT.syneBlack, fontSize: SIZE.label, color: C.ink, letterSpacing: 1.2 },
  secAction: { fontFamily: FONT.syneBold, fontSize: SIZE.small, color: C.coral },
  empty: { alignItems: "center", paddingTop: 60, paddingHorizontal: SP.xl, gap: SP.md },
  emptyTitle: { fontFamily: FONT.syneBlack, fontSize: SIZE.title2, color: C.ink },
  emptySub: { fontFamily: FONT.regular, fontSize: SIZE.body, color: C.ink2, textAlign: "center", lineHeight: SIZE.body * 1.7 },
  emptyBtn: { backgroundColor: C.coral, paddingHorizontal: SP.xl, paddingVertical: 16, marginTop: SP.sm },
  emptyBtnText: { fontFamily: FONT.syneBold, fontSize: SIZE.subtitle, color: C.white },
});
