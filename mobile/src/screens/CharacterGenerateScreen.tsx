import React, { useState } from "react";
import {
  View, Text, TouchableOpacity, StyleSheet,
  ActivityIndicator, ScrollView, Alert,
} from "react-native";
import { COLORS, SPACING } from "../constants/theme";
import { api } from "../services/api";

type Gender = "male" | "female" | "other";
type AgeGroup = "same" | "older" | "younger";

interface CharacterProfile {
  id: string;
  name: string;
  gender: string;
  age: number;
  hometown: string;
  education: string;
  background: string;
  hobbies: string;
  personality: string;
  speech_style: string;
}

const GENDER_LABELS: Record<Gender, string> = {
  male: "男性", female: "女性", other: "どちらでもない",
};
const AGE_LABELS: Record<AgeGroup, string> = {
  same: "同い年くらい", older: "年上", younger: "年下",
};

export default function CharacterGenerateScreen({ onCharacterCreated }: { onCharacterCreated: (c: CharacterProfile) => void }) {
  const [gender, setGender] = useState<Gender | null>(null);
  const [ageGroup, setAgeGroup] = useState<AgeGroup | null>(null);
  const [preview, setPreview] = useState<CharacterProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const generatePreview = async () => {
    if (!gender || !ageGroup) return;
    setLoading(true);
    try {
      const char = await api.characters.generatePreview(gender, ageGroup);
      setPreview(char);
    } catch (e: any) {
      Alert.alert("エラー", e.message || "生成に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  const confirmCharacter = async () => {
    if (!preview || !gender || !ageGroup) return;
    setSaving(true);
    try {
      const saved = await api.characters.confirm(preview);
      onCharacterCreated(saved);
    } catch (e: any) {
      Alert.alert("エラー", e.message || "保存に失敗しました");
    } finally {
      setSaving(false);
    }
  };

  if (preview) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Text style={styles.title}>こんな友達はどう？</Text>
        <View style={styles.profileCard}>
          <Text style={styles.charName}>{preview.name}</Text>
          <Text style={styles.charAge}>{preview.age}歳・{preview.hometown}出身</Text>
          <View style={styles.divider} />
          <ProfileRow label="学歴" value={preview.education} />
          <ProfileRow label="経歴" value={preview.background} />
          <ProfileRow label="趣味" value={preview.hobbies} />
          <ProfileRow label="性格" value={preview.personality} />
          <ProfileRow label="話し方" value={preview.speech_style} />
        </View>

        <TouchableOpacity style={styles.primaryButton} onPress={confirmCharacter} disabled={saving}>
          {saving ? <ActivityIndicator color="#FFF" /> : <Text style={styles.primaryButtonText}>この子と話す ✨</Text>}
        </TouchableOpacity>

        <TouchableOpacity style={styles.secondaryButton} onPress={generatePreview} disabled={loading}>
          {loading ? <ActivityIndicator color={COLORS.primary} /> : <Text style={styles.secondaryButtonText}>別の子にする</Text>}
        </TouchableOpacity>
      </ScrollView>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>友達を作る</Text>
      <Text style={styles.subtitle}>2つだけ選んで、あとは自動で決まるよ</Text>

      <Text style={styles.sectionLabel}>性別</Text>
      <View style={styles.optionRow}>
        {(["female", "male", "other"] as Gender[]).map(g => (
          <TouchableOpacity
            key={g}
            style={[styles.optionButton, gender === g && styles.optionSelected]}
            onPress={() => setGender(g)}
          >
            <Text style={[styles.optionText, gender === g && styles.optionTextSelected]}>
              {GENDER_LABELS[g]}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.sectionLabel}>年齢層</Text>
      <View style={styles.optionRow}>
        {(["same", "older", "younger"] as AgeGroup[]).map(a => (
          <TouchableOpacity
            key={a}
            style={[styles.optionButton, ageGroup === a && styles.optionSelected]}
            onPress={() => setAgeGroup(a)}
          >
            <Text style={[styles.optionText, ageGroup === a && styles.optionTextSelected]}>
              {AGE_LABELS[a]}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity
        style={[styles.primaryButton, (!gender || !ageGroup) && styles.buttonDisabled]}
        onPress={generatePreview}
        disabled={!gender || !ageGroup || loading}
      >
        {loading
          ? <ActivityIndicator color="#FFF" />
          : <Text style={styles.primaryButtonText}>友達を生成する 🎲</Text>
        }
      </TouchableOpacity>
    </ScrollView>
  );
}

function ProfileRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.profileRow}>
      <Text style={styles.profileLabel}>{label}</Text>
      <Text style={styles.profileValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: SPACING.lg, paddingBottom: 60 },
  title: { fontSize: 26, fontWeight: "700", color: COLORS.text, textAlign: "center", marginBottom: SPACING.xs },
  subtitle: { fontSize: 14, color: COLORS.textSecondary, textAlign: "center", marginBottom: SPACING.xl },
  sectionLabel: { fontSize: 16, fontWeight: "600", color: COLORS.text, marginBottom: SPACING.sm, marginTop: SPACING.md },
  optionRow: { flexDirection: "row", gap: SPACING.sm, marginBottom: SPACING.sm },
  optionButton: {
    flex: 1, paddingVertical: SPACING.sm, paddingHorizontal: SPACING.xs,
    borderRadius: 10, borderWidth: 1.5, borderColor: COLORS.border,
    alignItems: "center", backgroundColor: COLORS.surface,
  },
  optionSelected: { borderColor: COLORS.primary, backgroundColor: COLORS.primary + "15" },
  optionText: { fontSize: 14, color: COLORS.textSecondary, fontWeight: "500" },
  optionTextSelected: { color: COLORS.primary, fontWeight: "700" },
  primaryButton: {
    backgroundColor: COLORS.primary, borderRadius: 14, paddingVertical: 16,
    alignItems: "center", marginTop: SPACING.xl,
  },
  primaryButtonText: { color: "#FFF", fontSize: 17, fontWeight: "700" },
  secondaryButton: {
    borderRadius: 14, paddingVertical: 14, alignItems: "center", marginTop: SPACING.md,
    borderWidth: 1.5, borderColor: COLORS.primary,
  },
  secondaryButtonText: { color: COLORS.primary, fontSize: 16, fontWeight: "600" },
  buttonDisabled: { opacity: 0.45 },
  profileCard: {
    backgroundColor: COLORS.surface, borderRadius: 16, padding: SPACING.lg,
    marginBottom: SPACING.lg,
  },
  charName: { fontSize: 28, fontWeight: "800", color: COLORS.text, textAlign: "center" },
  charAge: { fontSize: 15, color: COLORS.textSecondary, textAlign: "center", marginTop: 4, marginBottom: SPACING.md },
  divider: { height: 1, backgroundColor: COLORS.border, marginBottom: SPACING.md },
  profileRow: { flexDirection: "row", marginBottom: SPACING.sm },
  profileLabel: { width: 55, fontSize: 13, color: COLORS.textSecondary, fontWeight: "600" },
  profileValue: { flex: 1, fontSize: 14, color: COLORS.text },
});
