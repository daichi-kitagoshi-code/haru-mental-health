import React from "react";
import {
  View, Text, TouchableOpacity, FlatList, StyleSheet, ActivityIndicator, Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { COLORS, SPACING, SHADOW } from "../constants/theme";
import { Plus } from "lucide-react-native";

export interface CharacterProfile {
  id: string; name: string; gender: string; age: number;
  hometown: string; personality: string; speech_style: string;
  occupation?: string; current_city?: string; avatar_url?: string;
}

interface Props {
  characters: CharacterProfile[];
  loading: boolean;
  selectedId?: string;
  onSelectCharacter: (c: CharacterProfile) => void;
  onCreateNew: () => void;
  plan: string;
}

const PLAN_LIMITS: Record<string, number> = { free: 2, standard: 3, premium: 5 };

export default function CharacterListScreen({
  characters, loading, selectedId, onSelectCharacter, onCreateNew, plan,
}: Props) {
  const limit = PLAN_LIMITS[plan] ?? 1;
  const canCreate = characters.length < limit;

  return (
    <SafeAreaView style={s.container} edges={["top"]}>
      <View style={s.header}>
        <Text style={s.title}>友達</Text>
      </View>

      {loading ? (
        <View style={s.center}>
          <ActivityIndicator color={COLORS.textSecondary} />
        </View>
      ) : (
        <FlatList
          data={characters}
          keyExtractor={item => item.id}
          contentContainerStyle={s.list}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={s.empty}>
              <Text style={s.emptyEmoji}>👋</Text>
              <Text style={s.emptyText}>まだ友達がいないよ</Text>
              <Text style={s.emptySubText}>最初の友達を作ってみよう</Text>
            </View>
          }
          renderItem={({ item }) => {
            const active = item.id === selectedId;
            const location = item.current_city || item.hometown;
            return (
              <TouchableOpacity
                style={s.card}
                onPress={() => onSelectCharacter(item)}
                activeOpacity={0.75}
              >
                {item.avatar_url ? (
                  <Image source={{ uri: item.avatar_url }} style={s.avatarImg} />
                ) : (
                  <View style={[s.avatar, active && s.avatarActive]}>
                    <Text style={[s.avatarText, active && s.avatarTextActive]}>
                      {item.name[0]}
                    </Text>
                  </View>
                )}
                <View style={s.info}>
                  <Text style={s.name}>{item.name}</Text>
                  <Text style={s.sub}>
                    {item.age}歳{item.occupation ? ` · ${item.occupation}` : ""} · {location}
                  </Text>
                </View>
                {active && <View style={s.activeBadge}><Text style={s.activeBadgeText}>話し中</Text></View>}
              </TouchableOpacity>
            );
          }}
          ListFooterComponent={
            canCreate ? (
              <TouchableOpacity style={s.addCard} onPress={onCreateNew} activeOpacity={0.7}>
                <View style={s.addIcon}>
                  <Plus size={20} color={COLORS.accent1} strokeWidth={2} />
                </View>
                <Text style={s.addText}>新しい友達を作る</Text>
              </TouchableOpacity>
            ) : (
              <View style={s.limitNote}>
                <Text style={s.limitNoteText}>友達は{limit}人まで（{plan}プラン）</Text>
              </View>
            )
          }
        />
      )}
    </SafeAreaView>
  );
}

const AVATAR_SIZE = 52;

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: {
    paddingHorizontal: SPACING.md, paddingVertical: 16,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  title: { fontSize: 24, fontWeight: "700", color: COLORS.text },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  list: { padding: SPACING.md, gap: 10 },
  empty: { paddingTop: 80, alignItems: "center", gap: 8 },
  emptyEmoji: { fontSize: 40, marginBottom: 8 },
  emptyText: { fontSize: 17, fontWeight: "600", color: COLORS.text },
  emptySubText: { fontSize: 14, color: COLORS.textSecondary },
  card: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: COLORS.surface, borderRadius: 16,
    padding: 14, gap: 12,
    borderWidth: 1, borderColor: COLORS.border,
    ...SHADOW.card,
  },
  avatarImg: { width: AVATAR_SIZE, height: AVATAR_SIZE, borderRadius: AVATAR_SIZE / 2 },
  avatar: {
    width: AVATAR_SIZE, height: AVATAR_SIZE, borderRadius: AVATAR_SIZE / 2,
    backgroundColor: COLORS.accent1 + "18", justifyContent: "center", alignItems: "center",
  },
  avatarActive: { backgroundColor: COLORS.accent1 + "30" },
  avatarText: { fontSize: 20, fontWeight: "700", color: COLORS.accent1 },
  avatarTextActive: { color: COLORS.accent1 },
  info: { flex: 1 },
  name: { fontSize: 16, fontWeight: "700", color: COLORS.text },
  sub: { fontSize: 13, color: COLORS.textSecondary, marginTop: 3 },
  activeBadge: {
    backgroundColor: COLORS.accent1 + "15", borderRadius: 8,
    paddingHorizontal: 8, paddingVertical: 4,
  },
  activeBadgeText: { fontSize: 11, color: COLORS.accent1, fontWeight: "600" },
  addCard: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: COLORS.subBg, borderRadius: 16,
    padding: 14, gap: 12,
    borderWidth: 1.5, borderColor: COLORS.border, borderStyle: "dashed",
  },
  addIcon: {
    width: AVATAR_SIZE, height: AVATAR_SIZE, borderRadius: AVATAR_SIZE / 2,
    backgroundColor: COLORS.accent1 + "10", justifyContent: "center", alignItems: "center",
  },
  addText: { fontSize: 15, color: COLORS.accent1, fontWeight: "600" },
  limitNote: { paddingTop: 16, alignItems: "center" },
  limitNoteText: { fontSize: 13, color: COLORS.textSecondary },
});
