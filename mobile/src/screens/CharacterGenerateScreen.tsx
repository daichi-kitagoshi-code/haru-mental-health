import React, { useState, useRef } from "react";
import {
  View, Text, TouchableOpacity, StyleSheet, ActivityIndicator,
  ScrollView, Alert, Animated, Dimensions, Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { COLORS, SPACING, SHADOW } from "../constants/theme";
import { api } from "../services/api";

const { height: SCREEN_H } = Dimensions.get("window");

type Gender = "male" | "female" | "other";
type AgeGroup = "same" | "older" | "younger";

export interface CharacterProfile {
  id: string; name: string; gender: string; age: number;
  hometown: string; education: string; background: string;
  hobbies: string; personality: string; speech_style: string;
  occupation?: string; current_city?: string;
  family_background?: string; childhood_story?: string;
  love_history?: string; current_romance_status?: string;
  work_hours?: string; narrative_profile?: string; avatar_url?: string;
}

const GENDER_LABELS: Record<Gender, string> = { male: "男性", female: "女性", other: "どちらでもない" };
const AGE_LABELS: Record<AgeGroup, string> = { same: "同い年くらい", older: "年上", younger: "年下" };

export default function CharacterGenerateScreen({
  onCharacterCreated,
}: {
  onCharacterCreated: (c: CharacterProfile) => void;
}) {
  const [gender, setGender] = useState<Gender | null>(null);
  const [ageGroup, setAgeGroup] = useState<AgeGroup | null>(null);
  const [preview, setPreview] = useState<CharacterProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const slideAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(1)).current;

  const animateIn = () => {
    slideAnim.setValue(60);
    opacityAnim.setValue(0);
    Animated.parallel([
      Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, damping: 18, stiffness: 200 }),
      Animated.timing(opacityAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start();
  };

  const fetchPreview = async () => {
    if (!gender || !ageGroup) return;
    setLoading(true);
    try {
      const char = await api.characters.generatePreview(gender, ageGroup);
      setPreview(char);
      animateIn();
    } catch (e: any) { Alert.alert("エラー", e.message || "生成に失敗しました"); }
    finally { setLoading(false); }
  };

  const confirmCharacter = async () => {
    if (!preview) return;
    setSaving(true);
    try {
      const saved = await api.characters.confirm(preview);
      onCharacterCreated(saved);
    } catch (e: any) { Alert.alert("エラー", e.message || "保存に失敗しました"); }
    finally { setSaving(false); }
  };

  if (preview) {
    const narrative = preview.narrative_profile ||
      `${preview.hometown}出身、${preview.age}歳。${preview.education}。${preview.background}。趣味は${preview.hobbies}。`;

    return (
      <SafeAreaView style={s.container}>
        <View style={s.flex}>
          <ScrollView contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
            <Text style={s.stepLabel}>こんな友達はどう？</Text>

            <Animated.View style={[s.card, SHADOW.card, {
              transform: [{ translateY: slideAnim }], opacity: opacityAnim,
            }]}>
              <View style={s.cardHeader}>
                {preview.avatar_url ? (
                  <Image source={{ uri: preview.avatar_url }} style={s.charAvatarImg} />
                ) : (
                  <View style={s.charAvatar}>
                    <Text style={s.charAvatarText}>{preview.name[0]}</Text>
                  </View>
                )}
                <View>
                  <Text style={s.charName}>{preview.name}</Text>
                  <Text style={s.charMeta}>
                    {preview.age}歳{preview.occupation ? ` · ${preview.occupation}` : ""}
                  </Text>
                </View>
              </View>
              <View style={s.divider} />
              <Text style={s.narrativeText}>{narrative}</Text>
            </Animated.View>

            <View style={s.spacer} />
          </ScrollView>

          <View style={s.bottomActions}>
            <TouchableOpacity style={s.retryLink} onPress={fetchPreview} disabled={loading}>
              {loading
                ? <ActivityIndicator size="small" color={COLORS.textSecondary} />
                : <Text style={s.retryLinkText}>別の子にする</Text>
              }
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.confirmBtn, saving && s.disabled]}
              onPress={confirmCharacter} disabled={saving}
            >
              {saving
                ? <ActivityIndicator color="#FFF" />
                : <Text style={s.confirmBtnText}>この子と話す</Text>
              }
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.container}>
      <ScrollView contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={s.title}>友達を作る</Text>
        <Text style={s.subtitle}>2つだけ選んで、あとは自動で決まるよ</Text>

        <Text style={s.sectionLabel}>性別</Text>
        <View style={s.optionRow}>
          {(["female", "male", "other"] as Gender[]).map(g => (
            <TouchableOpacity key={g}
              style={[s.option, gender === g && s.optionActive]}
              onPress={() => setGender(g)}>
              <Text style={[s.optionText, gender === g && s.optionTextActive]}>{GENDER_LABELS[g]}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={s.sectionLabel}>年齢層</Text>
        <View style={s.optionRow}>
          {(["same", "older", "younger"] as AgeGroup[]).map(a => (
            <TouchableOpacity key={a}
              style={[s.option, ageGroup === a && s.optionActive]}
              onPress={() => setAgeGroup(a)}>
              <Text style={[s.optionText, ageGroup === a && s.optionTextActive]}>{AGE_LABELS[a]}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          style={[s.confirmBtn, s.confirmBtnTop, (!gender || !ageGroup || loading) && s.disabled]}
          onPress={fetchPreview} disabled={!gender || !ageGroup || loading}>
          {loading
            ? <ActivityIndicator color="#FFF" />
            : <Text style={s.confirmBtnText}>生成する</Text>
          }
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  flex: { flex: 1 },
  scrollContent: { paddingHorizontal: SPACING.md, paddingTop: SPACING.lg, paddingBottom: 120 },
  title: { fontSize: 28, fontWeight: "700", color: COLORS.text, marginBottom: SPACING.sm },
  subtitle: { fontSize: 14, color: COLORS.textSecondary, marginBottom: SPACING.xl, lineHeight: 22 },
  stepLabel: { fontSize: 22, fontWeight: "700", color: COLORS.text, marginBottom: SPACING.lg },
  sectionLabel: {
    fontSize: 12, color: COLORS.textSecondary, letterSpacing: 1,
    textTransform: "uppercase", marginBottom: SPACING.sm, marginTop: SPACING.lg,
  },
  optionRow: { flexDirection: "row", gap: SPACING.sm },
  option: {
    flex: 1, paddingVertical: 12, borderRadius: 10,
    backgroundColor: COLORS.subBg, alignItems: "center",
  },
  optionActive: { backgroundColor: COLORS.text },
  optionText: { fontSize: 14, color: COLORS.textSecondary, fontWeight: "500" },
  optionTextActive: { color: "#FFF", fontWeight: "700" },
  card: {
    backgroundColor: COLORS.surface, borderRadius: 20,
    padding: SPACING.lg, marginBottom: SPACING.lg, borderWidth: 1, borderColor: COLORS.border,
  },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: SPACING.md },
  charAvatarImg: { width: 56, height: 56, borderRadius: 28 },
  charAvatar: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: COLORS.accent1 + "18", justifyContent: "center", alignItems: "center",
  },
  charAvatarText: { fontSize: 22, fontWeight: "700", color: COLORS.accent1 },
  charName: { fontSize: 22, fontWeight: "700", color: COLORS.text },
  charMeta: { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },
  divider: { height: 1, backgroundColor: COLORS.border, marginBottom: SPACING.md },
  narrativeText: { fontSize: 15, color: COLORS.text, lineHeight: 27 },
  spacer: { height: 20 },
  bottomActions: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    paddingHorizontal: SPACING.md, paddingBottom: 36, paddingTop: SPACING.sm,
    backgroundColor: COLORS.bg,
    borderTopWidth: 1, borderTopColor: COLORS.border,
    gap: 4,
  },
  retryLink: { paddingVertical: 10, alignItems: "center" },
  retryLinkText: { color: COLORS.textSecondary, fontSize: 14 },
  confirmBtn: {
    backgroundColor: COLORS.text, borderRadius: 14, paddingVertical: 17, alignItems: "center",
  },
  confirmBtnTop: { marginTop: SPACING.xl },
  confirmBtnText: { color: "#FFF", fontSize: 17, fontWeight: "700" },
  disabled: { opacity: 0.4 },
});
