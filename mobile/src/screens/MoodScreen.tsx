import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  ScrollView,
} from "react-native";
import { COLORS, SPACING } from "../constants/theme";
import { api } from "../services/api";

const MOOD_EMOJIS = ["😢", "😟", "😐", "🙂", "😊"];
const MOOD_LABELS = ["つらい", "落ち込み", "ふつう", "まあまあ", "元気！"];

export default function MoodScreen() {
  const [selectedMood, setSelectedMood] = useState<number | null>(null);
  const [note, setNote] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [historyData, summaryData] = await Promise.all([
        api.mood.getHistory(30),
        api.mood.getSummary(),
      ]);
      setHistory(historyData.logs || []);
      setSummary(summaryData);
    } catch (e) {}
  };

  const submitMood = async () => {
    if (selectedMood === null) return;
    try {
      await api.mood.log(selectedMood + 1, note || undefined);
      setSubmitted(true);
      loadData();
    } catch (e) {}
  };

  const getTrendText = (trend: string) => {
    switch (trend) {
      case "improving": return "📈 上向き傾向";
      case "declining": return "📉 下がり気味";
      case "stable": return "➡️ 安定";
      default: return "データ不足";
    }
  };

  if (submitted) {
    return (
      <View style={styles.container}>
        <View style={styles.thankYouCard}>
          <Text style={styles.thankYouEmoji}>✨</Text>
          <Text style={styles.thankYouText}>記録できたよ！</Text>
          <Text style={styles.thankYouSub}>
            {selectedMood !== null && selectedMood < 2
              ? "辛い時は無理しないでね。ハルはいつでもここにいるよ。"
              : "今日も教えてくれてありがとう！"}
          </Text>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => {
              setSubmitted(false);
              setSelectedMood(null);
              setNote("");
            }}
          >
            <Text style={styles.backButtonText}>戻る</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>今日の気分は？</Text>

      <View style={styles.moodSelector}>
        {MOOD_EMOJIS.map((emoji, index) => (
          <TouchableOpacity
            key={index}
            style={[
              styles.moodOption,
              selectedMood === index && styles.moodOptionSelected,
            ]}
            onPress={() => setSelectedMood(index)}
          >
            <Text style={styles.moodEmoji}>{emoji}</Text>
            <Text style={styles.moodLabel}>{MOOD_LABELS[index]}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <TextInput
        style={styles.noteInput}
        placeholder="何かメモがあれば（任意）"
        placeholderTextColor={COLORS.textLight}
        value={note}
        onChangeText={setNote}
        multiline
        maxLength={200}
      />

      <TouchableOpacity
        style={[styles.submitButton, selectedMood === null && styles.submitDisabled]}
        onPress={submitMood}
        disabled={selectedMood === null}
      >
        <Text style={styles.submitText}>記録する</Text>
      </TouchableOpacity>

      {summary && summary.average !== null && (
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>今週のまとめ</Text>
          <Text style={styles.summaryAverage}>
            平均スコア: {summary.average} / 5
          </Text>
          <Text style={styles.summaryTrend}>{getTrendText(summary.trend)}</Text>
        </View>
      )}

      {history.length > 0 && (
        <View style={styles.historySection}>
          <Text style={styles.historyTitle}>最近の記録</Text>
          {history.slice(-7).reverse().map((log, i) => (
            <View key={i} style={styles.historyItem}>
              <Text style={styles.historyEmoji}>
                {MOOD_EMOJIS[(log.score || 3) - 1]}
              </Text>
              <Text style={styles.historyDate}>
                {new Date(log.created_at).toLocaleDateString("ja-JP", {
                  month: "short",
                  day: "numeric",
                })}
              </Text>
              {log.note && <Text style={styles.historyNote}>{log.note}</Text>}
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: SPACING.lg },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: COLORS.text,
    textAlign: "center",
    marginBottom: SPACING.lg,
  },
  moodSelector: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: SPACING.lg,
  },
  moodOption: {
    alignItems: "center",
    padding: SPACING.sm,
    borderRadius: 12,
  },
  moodOptionSelected: {
    backgroundColor: COLORS.primary + "30",
    transform: [{ scale: 1.1 }],
  },
  moodEmoji: { fontSize: 36 },
  moodLabel: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },
  noteInput: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: SPACING.md,
    fontSize: 15,
    minHeight: 80,
    textAlignVertical: "top",
    marginBottom: SPACING.md,
  },
  submitButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: SPACING.md,
    alignItems: "center",
    marginBottom: SPACING.lg,
  },
  submitDisabled: { opacity: 0.5 },
  submitText: { color: "#FFF", fontSize: 16, fontWeight: "600" },
  thankYouCard: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: SPACING.xl,
  },
  thankYouEmoji: { fontSize: 48, marginBottom: SPACING.md },
  thankYouText: { fontSize: 22, fontWeight: "700", color: COLORS.text },
  thankYouSub: {
    fontSize: 15,
    color: COLORS.textSecondary,
    textAlign: "center",
    marginTop: SPACING.sm,
  },
  backButton: { marginTop: SPACING.lg, padding: SPACING.md },
  backButtonText: { color: COLORS.primary, fontSize: 16 },
  summaryCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
  },
  summaryTitle: { fontSize: 16, fontWeight: "600", color: COLORS.text },
  summaryAverage: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },
  summaryTrend: { fontSize: 14, marginTop: SPACING.xs },
  historySection: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: SPACING.md,
  },
  historyTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  historyItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: SPACING.xs,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  historyEmoji: { fontSize: 20, marginRight: SPACING.sm },
  historyDate: { fontSize: 13, color: COLORS.textSecondary, width: 60 },
  historyNote: { fontSize: 13, color: COLORS.text, flex: 1 },
});
