import React, { useState, useRef } from "react";
import {
  View, Text, TouchableOpacity, StyleSheet, ActivityIndicator,
  ScrollView, Alert, Animated,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { C } from "../constants/colors";
import { FONT, SIZE, SP, RADIUS } from "../constants/typography";
import { api } from "../services/api";
import CharacterAvatar from "../components/CharacterAvatar";

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
  male: "男性", female: "女性", other: "どちらでもない",
};
const GENDER_EMOJI: Record<Gender, string> = {
  male: "👦", female: "👧", other: "🧑",
};
const AGE_LABELS: Record<AgeGroup, string> = {
  same: "同い年くらい", older: "年上", younger: "年下",
};
const AGE_EMOJI: Record<AgeGroup, string> = {
  same: "🤝", older: "🌿", younger: "✨",
};

// Accent colours for option chips (active state)
const CHIP_COLORS: Record<string, { bg: string; border: string; shadow: string }> = {
  female:  { bg: C.coralXL,               border: C.coral,  shadow: C.coralD },
  male:    { bg: "#E8F4FF",               border: C.sky,    shadow: "#2B6DC4" },
  other:   { bg: "#F0EEFF",               border: C.lavender, shadow: "#7B6FCC" },
  same:    { bg: "#F0FFF8",               border: C.sage,   shadow: "#3A9068" },
  older:   { bg: "#FFFBF0",               border: C.gold,   shadow: "#C8851D" },
  younger: { bg: C.coralXL,               border: C.coral,  shadow: C.coralD },
};

const CARD_OFFSET = 4;

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

  const cardY = useRef(new Animated.Value(40)).current;
  const cardO = useRef(new Animated.Value(0)).current;
  const card2Y = useRef(new Animated.Value(52)).current;
  const card3Y = useRef(new Animated.Value(64)).current;

  const animateCardIn = () => {
    cardY.setValue(40); cardO.setValue(0);
    card2Y.setValue(52); card3Y.setValue(64);
    Animated.parallel([
      Animated.spring(cardY,  { toValue: 0,  useNativeDriver: true, damping: 18, stiffness: 200 }),
      Animated.spring(card2Y, { toValue: 10, useNativeDriver: true, damping: 18, stiffness: 200 }),
      Animated.spring(card3Y, { toValue: 20, useNativeDriver: true, damping: 18, stiffness: 200 }),
      Animated.timing(cardO,  { toValue: 1, duration: 200, useNativeDriver: true }),
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

  // ── Preview screen ─────────────────────────────────────────────────────
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

            {/* ── Card stack ─────────────────────────────────────────── */}
            <View style={s.cardStack}>
              {/* cs2 — furthest back (sage) */}
              <Animated.View
                style={[s.cardBehind2, { transform: [{ translateY: card3Y }] }]}
              />
              {/* cs1 — middle (peach) */}
              <Animated.View
                style={[s.cardBehind1, { transform: [{ translateY: card2Y }] }]}
              />

              {/* Main card */}
              <Animated.View
                style={[s.cardOuter, { transform: [{ translateY: cardY }], opacity: cardO }]}
              >
                {/* hard shadow layer */}
                <View style={s.cardShadow} />
                <View style={s.card}>
                  {/* Coral header */}
                  <View style={s.cardHeader}>
                    <CharacterAvatar
                      uri={preview.avatar_url}
                      name={preview.name}
                      size={92}
                    />
                    <Text style={s.cardName}>{preview.name}</Text>
                    <Text style={s.cardMeta}>
                      {preview.age}歳
                      {preview.occupation ? ` · ${preview.occupation}` : ""}
                    </Text>
                  </View>

                  {/* Body */}
                  <View style={s.cardBody}>
                    <Text style={s.narrativeText}>{narrative}</Text>
                  </View>
                </View>
              </Animated.View>
            </View>

            <Text style={s.swipeHint}>↓ スクロールして続きを読む</Text>
          </ScrollView>

          {/* ── Bottom actions ───────────────────────────────────────── */}
          <View style={s.bottomBar}>
            {/* Retry button */}
            <View style={s.retryOuter}>
              <View style={s.retryBtnShadow} />
              <TouchableOpacity
                style={s.retryBtn}
                onPress={fetchPreview}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator size="small" color={C.ink2} />
                ) : (
                  <Text style={s.retryText}>別の子にする</Text>
                )}
              </TouchableOpacity>
            </View>

            {/* Confirm button */}
            <View style={[s.confirmOuter, { flex: 1 }]}>
              <View style={s.confirmShadow} />
              <TouchableOpacity
                onPress={confirmCharacter}
                disabled={saving}
                activeOpacity={0.85}
                style={[s.confirmBtn, saving && s.disabled]}
              >
                {saving ? (
                  <ActivityIndicator color={C.white} />
                ) : (
                  <Text style={s.confirmText}>この子と話す</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // ── Setup screen ───────────────────────────────────────────────────────
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
          {(["female", "male", "other"] as Gender[]).map(g => {
            const active = gender === g;
            const colors = CHIP_COLORS[g];
            return (
              <View key={g} style={s.chipOuter}>
                {active && <View style={[s.chipShadow, { backgroundColor: colors.shadow }]} />}
                <TouchableOpacity
                  style={[
                    s.optionChip,
                    active
                      ? { backgroundColor: colors.bg, borderColor: colors.border }
                      : { backgroundColor: C.white, borderColor: C.line },
                  ]}
                  onPress={() => setGender(g)}
                  activeOpacity={0.8}
                >
                  <Text style={s.optionEmoji}>{GENDER_EMOJI[g]}</Text>
                  <Text style={[s.optionLabel, active && { color: colors.border, fontFamily: FONT.syneBold }]}>
                    {GENDER_LABELS[g]}
                  </Text>
                </TouchableOpacity>
              </View>
            );
          })}
        </View>

        {/* Age */}
        <Text style={s.sectionLabel}>年齢層</Text>
        <View style={s.optionRow}>
          {(["same", "older", "younger"] as AgeGroup[]).map(a => {
            const active = ageGroup === a;
            const colors = CHIP_COLORS[a];
            return (
              <View key={a} style={s.chipOuter}>
                {active && <View style={[s.chipShadow, { backgroundColor: colors.shadow }]} />}
                <TouchableOpacity
                  style={[
                    s.optionChip,
                    active
                      ? { backgroundColor: colors.bg, borderColor: colors.border }
                      : { backgroundColor: C.white, borderColor: C.line },
                  ]}
                  onPress={() => setAgeGroup(a)}
                  activeOpacity={0.8}
                >
                  <Text style={s.optionEmoji}>{AGE_EMOJI[a]}</Text>
                  <Text style={[s.optionLabel, active && { color: colors.border, fontFamily: FONT.syneBold }]}>
                    {AGE_LABELS[a]}
                  </Text>
                </TouchableOpacity>
              </View>
            );
          })}
        </View>

        <View style={{ height: SP.xl }} />

        {/* Generate button */}
        <View style={s.generateOuter}>
          {canGenerate && <View style={s.generateShadow} />}
          <TouchableOpacity
            onPress={fetchPreview}
            disabled={!canGenerate}
            activeOpacity={0.85}
            style={[
              s.generateBtn,
              canGenerate
                ? { backgroundColor: C.coral, borderColor: C.coralD }
                : { backgroundColor: C.mist, borderColor: C.line },
            ]}
          >
            {loading ? (
              <ActivityIndicator color={canGenerate ? C.white : C.ink3} />
            ) : (
              <Text style={[s.generateText, !canGenerate && s.generateTextDisabled]}>
                友達を生成する
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.mist },

  // ── Setup screen
  setupScroll: {
    paddingHorizontal: SP.md, paddingTop: SP.xl, paddingBottom: 60,
  },
  title: {
    fontFamily: FONT.syneBlack, fontSize: SIZE.title,
    color: C.ink, marginBottom: SP.xs,
  },
  subtitle: {
    fontFamily: FONT.regular, fontSize: SIZE.body,
    color: C.ink2, marginBottom: SP.xxl,
    lineHeight: SIZE.body * 1.6,
  },
  sectionLabel: {
    fontFamily: FONT.syneSemi, fontSize: SIZE.label,
    color: C.ink2, letterSpacing: 1,
    textTransform: "uppercase", marginBottom: SP.sm, marginTop: SP.lg,
  },
  optionRow: { flexDirection: "row", gap: SP.sm },

  chipOuter: {
    flex: 1, position: "relative",
    marginBottom: CARD_OFFSET, marginRight: CARD_OFFSET,
  },
  chipShadow: {
    position: "absolute",
    top: CARD_OFFSET, left: CARD_OFFSET, right: -CARD_OFFSET, bottom: -CARD_OFFSET,
    borderRadius: RADIUS.md,
  },
  optionChip: {
    paddingVertical: 14, borderRadius: RADIUS.md,
    alignItems: "center", gap: 4,
    borderWidth: 2,
  },
  optionEmoji: { fontSize: 22 },
  optionLabel: {
    fontFamily: FONT.syne, fontSize: SIZE.caption, color: C.ink2,
  },

  // Generate button
  generateOuter: {
    position: "relative",
    marginBottom: CARD_OFFSET + 2, marginRight: CARD_OFFSET + 2,
  },
  generateShadow: {
    position: "absolute",
    top: CARD_OFFSET, left: CARD_OFFSET, right: -CARD_OFFSET, bottom: -CARD_OFFSET,
    backgroundColor: C.coralD, borderRadius: RADIUS.lg,
  },
  generateBtn: {
    borderRadius: RADIUS.lg, borderWidth: 2,
    paddingVertical: 17, alignItems: "center",
  },
  generateText: { fontFamily: FONT.syneBold, fontSize: SIZE.subtitle, color: C.white },
  generateTextDisabled: { color: C.ink3 },

  // ── Preview screen
  previewScroll: {
    paddingHorizontal: SP.md, paddingTop: SP.xl, paddingBottom: 130,
  },
  stepLabel: {
    fontFamily: FONT.syneBlack, fontSize: SIZE.title, color: C.ink, marginBottom: SP.xs,
  },
  stepSub: {
    fontFamily: FONT.regular, fontSize: SIZE.body2,
    color: C.ink2, marginBottom: SP.xl,
  },

  // Card stack
  cardStack: {
    position: "relative",
    marginBottom: SP.md,
    paddingBottom: 24, // space for bg cards
  },
  cardBehind2: {
    position: "absolute",
    left: 16, right: -16, top: 20,
    height: 180,
    backgroundColor: C.sage,
    borderRadius: RADIUS.lg,
    borderWidth: 2, borderColor: C.ink,
    opacity: 0.6,
  },
  cardBehind1: {
    position: "absolute",
    left: 8, right: -8, top: 10,
    height: 180,
    backgroundColor: C.peach,
    borderRadius: RADIUS.lg,
    borderWidth: 2, borderColor: C.ink,
    opacity: 0.8,
  },
  cardOuter: { position: "relative", marginBottom: CARD_OFFSET, marginRight: CARD_OFFSET },
  cardShadow: {
    position: "absolute",
    top: CARD_OFFSET, left: CARD_OFFSET, right: -CARD_OFFSET, bottom: -CARD_OFFSET,
    backgroundColor: C.ink, borderRadius: RADIUS.lg,
  },
  card: {
    backgroundColor: C.white, borderRadius: RADIUS.lg,
    borderWidth: 2, borderColor: C.ink, overflow: "hidden",
  },

  // Card header (coral)
  cardHeader: {
    backgroundColor: C.coral,
    borderBottomWidth: 2, borderBottomColor: C.ink,
    paddingVertical: SP.xl, alignItems: "center", gap: SP.sm,
  },
  cardName: { fontFamily: FONT.syneBlack, fontSize: SIZE.title2, color: C.white },
  cardMeta: { fontFamily: FONT.syne, fontSize: SIZE.body2, color: "rgba(255,255,255,0.8)" },

  // Card body
  cardBody: { padding: SP.lg },
  narrativeText: {
    fontFamily: FONT.regular, fontSize: SIZE.body1,
    color: C.ink, lineHeight: SIZE.body1 * 1.7,
  },
  swipeHint: {
    textAlign: "center", fontFamily: FONT.syne,
    fontSize: SIZE.caption, color: C.ink3, marginTop: SP.md,
  },

  // Bottom bar
  bottomBar: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    flexDirection: "row", alignItems: "center", gap: SP.sm,
    paddingHorizontal: SP.md, paddingBottom: 36, paddingTop: SP.sm,
    backgroundColor: C.white,
    borderTopWidth: 2, borderTopColor: C.ink,
  },

  retryOuter: { position: "relative", marginBottom: CARD_OFFSET, marginRight: CARD_OFFSET },
  retryBtnShadow: {
    position: "absolute",
    top: CARD_OFFSET, left: CARD_OFFSET, right: -CARD_OFFSET, bottom: -CARD_OFFSET,
    backgroundColor: C.ink, borderRadius: RADIUS.md,
  },
  retryBtn: {
    paddingHorizontal: SP.md, paddingVertical: 17,
    borderRadius: RADIUS.md, borderWidth: 2, borderColor: C.ink,
    backgroundColor: C.white, minWidth: 100, alignItems: "center",
  },
  retryText: { fontFamily: FONT.syneSemi, fontSize: SIZE.body, color: C.ink },

  confirmOuter: { position: "relative", marginBottom: CARD_OFFSET, marginRight: CARD_OFFSET },
  confirmShadow: {
    position: "absolute",
    top: CARD_OFFSET, left: CARD_OFFSET, right: -CARD_OFFSET, bottom: -CARD_OFFSET,
    backgroundColor: C.coralD, borderRadius: RADIUS.md,
  },
  confirmBtn: {
    borderRadius: RADIUS.md, borderWidth: 2, borderColor: C.coralD,
    paddingVertical: 17, alignItems: "center",
    backgroundColor: C.coral,
  },
  confirmText: { fontFamily: FONT.syneBold, fontSize: SIZE.subtitle, color: C.white },
  disabled: { opacity: 0.4 },
});
