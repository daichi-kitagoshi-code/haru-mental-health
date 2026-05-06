import React, { useState, useRef } from "react";
import {
  View, Text, TouchableOpacity, StyleSheet, ActivityIndicator,
  ScrollView, Alert, Animated, Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { C, GRAD } from "../constants/colors";
import { FONT, SIZE, SP, RADIUS, SHADOW } from "../constants/typography";
import { api } from "../services/api";

type Gender = "male" | "female" | "other";
type AgeGroup = "same" | "older" | "younger";

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

const GENDER_LABELS: Record<Gender, string> = {
  male: "男性",
  female: "女性",
  other: "どちらでもない",
};
const GENDER_EMOJI: Record<Gender, string> = {
  male: "👦",
  female: "👧",
  other: "🧑",
};
const AGE_LABELS: Record<AgeGroup, string> = {
  same: "同い年くらい",
  older: "年上",
  younger: "年下",
};
const AGE_EMOJI: Record<AgeGroup, string> = {
  same: "🤝",
  older: "🌿",
  younger: "✨",
};

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

  const cardY = useRef(new Animated.Value(50)).current;
  const cardO = useRef(new Animated.Value(0)).current;
  const card2Y = useRef(new Animated.Value(50 + 12)).current;
  const card3Y = useRef(new Animated.Value(50 + 24)).current;

  const animateCardIn = () => {
    cardY.setValue(50);
    cardO.setValue(0);
    card2Y.setValue(62);
    card3Y.setValue(74);
    Animated.parallel([
      Animated.spring(cardY, { toValue: 0, useNativeDriver: true, damping: 20, stiffness: 220 }),
      Animated.spring(card2Y, { toValue: 12, useNativeDriver: true, damping: 20, stiffness: 220 }),
      Animated.spring(card3Y, { toValue: 24, useNativeDriver: true, damping: 20, stiffness: 220 }),
      Animated.timing(cardO, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start();
  };

  const fetchPreview = async () => {
    if (!gender || !ageGroup) return;
    setLoading(true);
    try {
      const char = await api.characters.generatePreview(gender, ageGroup);
      setPreview(char);
      animateCardIn();
    } catch (e: any) {
      Alert.alert("エラー", e.message || "生成に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  const confirmCharacter = async () => {
    if (!preview) return;
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
    const narrative =
      preview.narrative_profile ||
      `${preview.hometown}出身、${preview.age}歳。${preview.background ?? ""}${
        preview.hobbies ? `趣味は${preview.hobbies}。` : ""
      }`;

    return (
      <SafeAreaView style={s.container}>
        <View style={{ flex: 1 }}>
          <ScrollView
            contentContainerStyle={s.previewScroll}
            showsVerticalScrollIndicator={false}
          >
            <Text style={s.stepLabel}>こんな友達はどう？</Text>
            <Text style={s.stepSub}>気に入ったら話しかけてみよう</Text>

            {/* Card stack depth effect */}
            <View style={s.cardStack}>
              <Animated.View style={[s.cardBehind2, { transform: [{ translateY: card3Y }] }]} />
              <Animated.View style={[s.cardBehind1, { transform: [{ translateY: card2Y }] }]} />

              <Animated.View
                style={[s.card, { transform: [{ translateY: cardY }], opacity: cardO }]}
              >
                {/* Card gradient header */}
                <LinearGradient
                  colors={["#FFE8E8", "#E8E8FF"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={s.cardGradTop}
                >
                  {preview.avatar_url ? (
                    <Image source={{ uri: preview.avatar_url }} style={s.cardAvatarImg} />
                  ) : (
                    <View style={s.cardAvatarFallback}>
                      <Text style={s.cardAvatarEmoji}>
                        {preview.gender === "female" ? "👧" : preview.gender === "male" ? "👦" : "🧑"}
                      </Text>
                    </View>
                  )}
                  <Text style={s.cardName}>{preview.name}</Text>
                  <Text style={s.cardMeta}>
                    {preview.age}歳
                    {preview.occupation ? ` · ${preview.occupation}` : ""}
                  </Text>
                </LinearGradient>

                <View style={s.cardBody}>
                  <Text style={s.narrativeText}>{narrative}</Text>
                </View>
              </Animated.View>
            </View>

            {/* Swipe hint */}
            <Text style={s.swipeHint}>↓ スクロールして続きを読む</Text>
          </ScrollView>

          {/* Bottom actions */}
          <View style={s.bottomBar}>
            <TouchableOpacity
              style={s.retryBtn}
              onPress={fetchPreview}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color={C.textSecondary} />
              ) : (
                <Text style={s.retryText}>別の子にする</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={confirmCharacter}
              disabled={saving}
              activeOpacity={0.85}
              style={{ flex: 1 }}
            >
              <LinearGradient
                colors={GRAD}
                style={[s.confirmBtn, saving && s.disabled]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                {saving ? (
                  <ActivityIndicator color={C.white} />
                ) : (
                  <Text style={s.confirmText}>この子と話す</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  const canGenerate = gender && ageGroup && !loading;

  return (
    <SafeAreaView style={s.container}>
      <ScrollView
        contentContainerStyle={s.setupScroll}
        showsVerticalScrollIndicator={false}
      >
        <Text style={s.title}>友達を作る</Text>
        <Text style={s.subtitle}>2つ選ぶだけ、あとは自動で決まるよ</Text>

        {/* Gender */}
        <Text style={s.sectionLabel}>性別</Text>
        <View style={s.optionRow}>
          {(["female", "male", "other"] as Gender[]).map(g => (
            <TouchableOpacity
              key={g}
              style={[s.optionChip, gender === g && s.optionChipActive]}
              onPress={() => setGender(g)}
            >
              <Text style={s.optionEmoji}>{GENDER_EMOJI[g]}</Text>
              <Text style={[s.optionLabel, gender === g && s.optionLabelActive]}>
                {GENDER_LABELS[g]}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Age */}
        <Text style={s.sectionLabel}>年齢層</Text>
        <View style={s.optionRow}>
          {(["same", "older", "younger"] as AgeGroup[]).map(a => (
            <TouchableOpacity
              key={a}
              style={[s.optionChip, ageGroup === a && s.optionChipActive]}
              onPress={() => setAgeGroup(a)}
            >
              <Text style={s.optionEmoji}>{AGE_EMOJI[a]}</Text>
              <Text style={[s.optionLabel, ageGroup === a && s.optionLabelActive]}>
                {AGE_LABELS[a]}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={{ height: SP.xl }} />

        <TouchableOpacity
          onPress={fetchPreview}
          disabled={!canGenerate}
          activeOpacity={0.85}
        >
          <LinearGradient
            colors={canGenerate ? GRAD : [C.bgSecondary, C.bgSecondary]}
            style={[s.generateBtn, !canGenerate && s.disabled]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            {loading ? (
              <ActivityIndicator color={canGenerate ? C.white : C.textTertiary} />
            ) : (
              <Text style={[s.generateText, !canGenerate && s.generateTextDisabled]}>
                友達を生成する
              </Text>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },

  // Setup screen
  setupScroll: {
    paddingHorizontal: SP.md,
    paddingTop: SP.xl,
    paddingBottom: 60,
  },
  title: {
    fontFamily: FONT.black,
    fontSize: SIZE.title,
    color: C.text,
    marginBottom: SP.xs,
  },
  subtitle: {
    fontFamily: FONT.regular,
    fontSize: SIZE.body,
    color: C.textSecondary,
    marginBottom: SP.xxl,
    lineHeight: SIZE.body * 1.6,
  },
  sectionLabel: {
    fontFamily: FONT.bold,
    fontSize: SIZE.label,
    color: C.textTertiary,
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: SP.sm,
    marginTop: SP.lg,
  },
  optionRow: { flexDirection: "row", gap: SP.sm },
  optionChip: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: RADIUS.md,
    backgroundColor: C.bgSecondary,
    alignItems: "center",
    gap: 4,
    borderWidth: 1.5,
    borderColor: "transparent",
  },
  optionChipActive: {
    backgroundColor: C.accentSofter,
    borderColor: C.accent,
  },
  optionEmoji: { fontSize: 22 },
  optionLabel: {
    fontFamily: FONT.medium,
    fontSize: SIZE.caption,
    color: C.textSecondary,
  },
  optionLabelActive: {
    color: C.accent,
    fontFamily: FONT.bold,
  },
  generateBtn: {
    borderRadius: RADIUS.lg,
    paddingVertical: 17,
    alignItems: "center",
    ...SHADOW.medium,
  },
  generateText: {
    fontFamily: FONT.bold,
    fontSize: SIZE.subtitle,
    color: C.white,
  },
  generateTextDisabled: { color: C.textTertiary },

  // Preview screen
  previewScroll: {
    paddingHorizontal: SP.md,
    paddingTop: SP.xl,
    paddingBottom: 130,
  },
  stepLabel: {
    fontFamily: FONT.black,
    fontSize: SIZE.title,
    color: C.text,
    marginBottom: SP.xs,
  },
  stepSub: {
    fontFamily: FONT.regular,
    fontSize: SIZE.body2,
    color: C.textSecondary,
    marginBottom: SP.xl,
  },

  // Card stack
  cardStack: {
    position: "relative",
    marginBottom: SP.md,
  },
  cardBehind1: {
    position: "absolute",
    left: 8,
    right: 8,
    top: 0,
    height: 200,
    backgroundColor: C.bgSecondary,
    borderRadius: RADIUS.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.border,
  },
  cardBehind2: {
    position: "absolute",
    left: 16,
    right: 16,
    top: 0,
    height: 200,
    backgroundColor: C.border,
    borderRadius: RADIUS.lg,
  },
  card: {
    backgroundColor: C.bg,
    borderRadius: RADIUS.lg,
    overflow: "hidden",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.border,
    ...SHADOW.strong,
  },
  cardGradTop: {
    paddingTop: SP.xl,
    paddingBottom: SP.xl,
    alignItems: "center",
    gap: SP.sm,
  },
  cardAvatarImg: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 3,
    borderColor: "rgba(255,255,255,0.8)",
  },
  cardAvatarFallback: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: "rgba(255,255,255,0.6)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: "rgba(255,255,255,0.8)",
  },
  cardAvatarEmoji: { fontSize: 40 },
  cardName: {
    fontFamily: FONT.bold,
    fontSize: SIZE.title2,
    color: C.text,
  },
  cardMeta: {
    fontFamily: FONT.regular,
    fontSize: SIZE.body2,
    color: C.textSecondary,
  },
  cardBody: { padding: SP.lg },
  narrativeText: {
    fontFamily: FONT.regular,
    fontSize: SIZE.body1,
    color: C.text,
    lineHeight: SIZE.body1 * 1.7,
  },
  swipeHint: {
    textAlign: "center",
    fontFamily: FONT.regular,
    fontSize: SIZE.caption,
    color: C.textTertiary,
    marginTop: SP.md,
  },

  // Bottom
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: SP.sm,
    paddingHorizontal: SP.md,
    paddingBottom: 36,
    paddingTop: SP.sm,
    backgroundColor: C.bgOverlay,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: C.border,
  },
  retryBtn: {
    paddingHorizontal: SP.md,
    paddingVertical: 17,
    borderRadius: RADIUS.lg,
    backgroundColor: C.bgSecondary,
    minWidth: 100,
    alignItems: "center",
  },
  retryText: {
    fontFamily: FONT.medium,
    fontSize: SIZE.body,
    color: C.textSecondary,
  },
  confirmBtn: {
    borderRadius: RADIUS.lg,
    paddingVertical: 17,
    alignItems: "center",
    ...SHADOW.medium,
  },
  confirmText: {
    fontFamily: FONT.bold,
    fontSize: SIZE.subtitle,
    color: C.white,
  },
  disabled: { opacity: 0.4 },
});
