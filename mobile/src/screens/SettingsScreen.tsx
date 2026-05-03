import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  TextInput,
  Alert,
} from "react-native";
import { COLORS, SPACING } from "../constants/theme";
import { api } from "../services/api";
import { useAuth } from "../hooks/useAuth";

const SPEECH_STYLES = [
  { id: "casual", label: "タメ口", example: "〜だよね、〜じゃん" },
  { id: "polite", label: "丁寧語", example: "〜ですね、〜かもしれませんね" },
  { id: "kansai", label: "関西弁", example: "〜やん、〜やで、ほんまに" },
  { id: "cool", label: "クール", example: "短めで落ち着いた感じ" },
];

export default function SettingsScreen() {
  const [charName, setCharName] = useState("ハル");
  const [speechStyle, setSpeechStyle] = useState("casual");
  const [saving, setSaving] = useState(false);
  const { signOut } = useAuth();

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const settings = await api.character.getSettings();
      setCharName(settings.char_name);
      setSpeechStyle(settings.speech_style);
    } catch (e) {}
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      await api.character.updateSettings(charName, speechStyle);
      Alert.alert("保存しました", `${charName}の設定を更新したよ！`);
    } catch (e) {
      Alert.alert("エラー", "保存に失敗しました");
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = () => {
    Alert.alert("ログアウト", "本当にログアウトしますか？", [
      { text: "キャンセル", style: "cancel" },
      { text: "ログアウト", style: "destructive", onPress: signOut },
    ]);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>キャラクター設定</Text>
        <Text style={styles.label}>名前</Text>
        <TextInput
          style={styles.input}
          value={charName}
          onChangeText={setCharName}
          maxLength={20}
          placeholder="キャラクターの名前"
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>話し方</Text>
        {SPEECH_STYLES.map((style) => (
          <TouchableOpacity
            key={style.id}
            style={[
              styles.styleOption,
              speechStyle === style.id && styles.styleOptionActive,
            ]}
            onPress={() => setSpeechStyle(style.id)}
          >
            <Text style={[styles.styleLabel, speechStyle === style.id && styles.styleLabelActive]}>
              {style.label}
            </Text>
            <Text style={styles.styleExample}>{style.example}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity
        style={[styles.saveButton, saving && { opacity: 0.6 }]}
        onPress={saveSettings}
        disabled={saving}
      >
        <Text style={styles.saveButtonText}>
          {saving ? "保存中..." : "設定を保存"}
        </Text>
      </TouchableOpacity>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>アカウント</Text>
        <TouchableOpacity style={styles.logoutButton} onPress={handleSignOut}>
          <Text style={styles.logoutText}>ログアウト</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: SPACING.lg },
  section: { marginBottom: SPACING.lg },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.textSecondary,
    marginBottom: SPACING.sm,
  },
  input: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: SPACING.md,
    fontSize: 16,
    color: COLORS.text,
  },
  styleOption: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    borderWidth: 2,
    borderColor: "transparent",
  },
  styleOptionActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary + "10",
  },
  styleLabel: { fontSize: 15, fontWeight: "600", color: COLORS.text },
  styleLabelActive: { color: COLORS.primaryDark },
  styleExample: { fontSize: 13, color: COLORS.textLight, marginTop: 2 },
  saveButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: SPACING.md,
    alignItems: "center",
    marginBottom: SPACING.xl,
  },
  saveButtonText: { color: "#FFF", fontSize: 16, fontWeight: "600" },
  logoutButton: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    paddingVertical: SPACING.md,
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.error,
  },
  logoutText: { color: COLORS.error, fontSize: 15 },
});
