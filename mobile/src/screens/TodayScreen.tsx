import React, { useState, useEffect, useCallback } from "react";
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  ActivityIndicator, RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { COLORS, SPACING, SHADOW } from "../constants/theme";
import { api } from "../services/api";

interface FeedPost {
  id: string;
  character_id: string;
  character_name: string;
  content: string;
  post_type: string;
  created_at: string;
}

interface Props {
  onReplyToCharacter?: (characterId: string) => void;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "たった今";
  if (mins < 60) return `${mins}分前`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}時間前`;
  return `${Math.floor(hrs / 24)}日前`;
}

const POST_TYPE_EMOJI: Record<string, string> = {
  daily: "📝", work: "💼", love: "💕", worry: "😟", followup: "🔄",
};

export default function TodayScreen({ onReplyToCharacter }: Props) {
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => { loadFeed(); }, []);

  const loadFeed = async () => {
    try {
      const data = await api.posts.getFeed();
      setPosts(data);
    } catch {}
    finally { setLoading(false); }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadFeed();
    setRefreshing(false);
  }, []);

  if (loading) {
    return (
      <SafeAreaView style={s.container} edges={["top"]}>
        <View style={s.header}>
          <Text style={s.title}>今日</Text>
        </View>
        <View style={s.center}>
          <ActivityIndicator color={COLORS.textSecondary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.container} edges={["top"]}>
      <View style={s.header}>
        <Text style={s.title}>今日</Text>
        <Text style={s.headerSub}>友達の近況</Text>
      </View>

      <FlatList
        data={posts}
        keyExtractor={item => item.id}
        contentContainerStyle={s.list}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.textSecondary} />
        }
        ListEmptyComponent={
          <View style={s.empty}>
            <Text style={s.emptyEmoji}>🌅</Text>
            <Text style={s.emptyTitle}>まだ投稿がないよ</Text>
            <Text style={s.emptyText}>引っ張って更新してみて</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={s.postCard}>
            <View style={s.postHeader}>
              <View style={s.postAvatar}>
                <Text style={s.postAvatarText}>{item.character_name[0]}</Text>
              </View>
              <View style={s.postMeta}>
                <Text style={s.postName}>{item.character_name}</Text>
                <Text style={s.postTime}>{timeAgo(item.created_at)}</Text>
              </View>
              <Text style={s.postTypeEmoji}>{POST_TYPE_EMOJI[item.post_type] || "📝"}</Text>
            </View>

            <Text style={s.postContent}>{item.content}</Text>

            {onReplyToCharacter && (
              <TouchableOpacity
                style={s.replyBtn}
                onPress={() => onReplyToCharacter(item.character_id)}
                activeOpacity={0.7}
              >
                <Text style={s.replyBtnText}>返事する</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: {
    paddingHorizontal: SPACING.md, paddingVertical: 16,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  title: { fontSize: 24, fontWeight: "700", color: COLORS.text },
  headerSub: { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  list: { padding: SPACING.md, gap: 12 },
  empty: { paddingTop: 80, alignItems: "center", gap: 8 },
  emptyEmoji: { fontSize: 40, marginBottom: 8 },
  emptyTitle: { fontSize: 17, fontWeight: "600", color: COLORS.text },
  emptyText: { fontSize: 14, color: COLORS.textSecondary },
  postCard: {
    backgroundColor: COLORS.surface, borderRadius: 16, padding: SPACING.md,
    borderWidth: 1, borderColor: COLORS.border, ...SHADOW.card,
  },
  postHeader: { flexDirection: "row", alignItems: "center", marginBottom: 10, gap: 10 },
  postAvatar: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: COLORS.accent1 + "18", justifyContent: "center", alignItems: "center",
  },
  postAvatarText: { fontSize: 14, fontWeight: "700", color: COLORS.accent1 },
  postMeta: { flex: 1 },
  postName: { fontSize: 14, fontWeight: "700", color: COLORS.text },
  postTime: { fontSize: 12, color: COLORS.textSecondary, marginTop: 1 },
  postTypeEmoji: { fontSize: 18 },
  postContent: { fontSize: 15, color: COLORS.text, lineHeight: 26, marginBottom: 12 },
  replyBtn: {
    alignSelf: "flex-end",
    backgroundColor: COLORS.subBg, borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 7,
    borderWidth: 1, borderColor: COLORS.border,
  },
  replyBtnText: { fontSize: 13, color: COLORS.textSecondary, fontWeight: "600" },
});
