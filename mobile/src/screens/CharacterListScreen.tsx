import React, { useCallback } from "react";
import {
  View, Text, TouchableOpacity, StyleSheet,
  FlatList, ActivityIndicator,
} from "react-native";
import { COLORS, SPACING } from "../constants/theme";

interface CharacterProfile {
  id: string;
  name: string;
  gender: string;
  age: number;
  hometown: string;
  personality: string;
  speech_style: string;
}

interface Props {
  characters: CharacterProfile[];
  loading: boolean;
  onSelectCharacter: (c: CharacterProfile) => void;
  onCreateNew: () => void;
  plan: string;
}

const PLAN_LIMITS: Record<string, number> = { free: 1, standard: 3, premium: 5 };

const GENDER_EMOJI: Record<string, string> = { male: "👦", female: "👧", other: "🧑" };

export default function CharacterListScreen({
  characters, loading, onSelectCharacter, onCreateNew, plan,
}: Props) {
  const limit = PLAN_LIMITS[plan] ?? 1;
  const canCreate = characters.length < limit;

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>友達一覧</Text>
      <Text style={styles.subtitle}>{characters.length}/{limit}人</Text>

      <FlatList
        data={characters}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.characterCard} onPress={() => onSelectCharacter(item)}>
            <Text style={styles.avatar}>{GENDER_EMOJI[item.gender] ?? "🧑"}</Text>
            <View style={styles.charInfo}>
              <Text style={styles.charName}>{item.name}</Text>
              <Text style={styles.charDetail}>{item.age}歳・{item.hometown}出身</Text>
              <Text style={styles.charPersonality}>{item.personality}</Text>
            </View>
            <Text style={styles.arrow}>›</Text>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>🌸</Text>
            <Text style={styles.emptyText}>まだ友達がいないよ</Text>
            <Text style={styles.emptySubtext}>最初の友達を作ってみよう！</Text>
          </View>
        }
      />

      {canCreate ? (
        <TouchableOpacity style={styles.createButton} onPress={onCreateNew}>
          <Text style={styles.createButtonText}>+ 新しい友達を作る</Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.limitBanner}>
          <Text style={styles.limitText}>
            {plan === "free" ? "スタンダードプランで3人まで作れます" : "アップグレードでもっと作れます"}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 24, fontWeight: "700", color: COLORS.text, textAlign: "center", paddingTop: SPACING.lg },
  subtitle: { fontSize: 13, color: COLORS.textSecondary, textAlign: "center", marginBottom: SPACING.md },
  list: { padding: SPACING.md },
  characterCard: {
    backgroundColor: COLORS.surface, borderRadius: 14, padding: SPACING.md,
    flexDirection: "row", alignItems: "center", marginBottom: SPACING.sm,
  },
  avatar: { fontSize: 36, marginRight: SPACING.md },
  charInfo: { flex: 1 },
  charName: { fontSize: 18, fontWeight: "700", color: COLORS.text },
  charDetail: { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },
  charPersonality: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  arrow: { fontSize: 22, color: COLORS.textSecondary },
  emptyState: { alignItems: "center", paddingTop: 80 },
  emptyEmoji: { fontSize: 48, marginBottom: SPACING.md },
  emptyText: { fontSize: 18, fontWeight: "600", color: COLORS.text },
  emptySubtext: { fontSize: 14, color: COLORS.textSecondary, marginTop: SPACING.xs },
  createButton: {
    margin: SPACING.lg, backgroundColor: COLORS.primary, borderRadius: 14,
    paddingVertical: 16, alignItems: "center",
  },
  createButtonText: { color: "#FFF", fontSize: 17, fontWeight: "700" },
  limitBanner: {
    margin: SPACING.lg, backgroundColor: COLORS.surface, borderRadius: 12,
    padding: SPACING.md, alignItems: "center",
  },
  limitText: { fontSize: 13, color: COLORS.textSecondary, textAlign: "center" },
});
