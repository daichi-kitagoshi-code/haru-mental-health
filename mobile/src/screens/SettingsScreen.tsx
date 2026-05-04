import React from "react";
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert,
} from "react-native";
import { COLORS, SPACING } from "../constants/theme";

interface Props {
  onLogout: () => void;
}

export default function SettingsScreen({ onLogout }: Props) {
  const handleLogout = () => {
    Alert.alert(
      "ログアウト",
      "ログアウトしますか？",
      [
        { text: "キャンセル", style: "cancel" },
        { text: "ログアウト", style: "destructive", onPress: onLogout },
      ]
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>設定</Text>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>プラン</Text>
        <View style={styles.planCard}>
          <Text style={styles.planName}>無料プラン</Text>
          <Text style={styles.planDetail}>友達1人・1日5回まで会話</Text>
          <TouchableOpacity style={styles.upgradeButton}>
            <Text style={styles.upgradeText}>スタンダードにアップグレード ¥480/月</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>通知</Text>
        <Text style={styles.comingSoon}>近日対応予定</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>プライバシー</Text>
        <Text style={styles.privacyText}>
          あなたの会話は匿名で集計される場合があります。個人を特定する情報は共有されません。
        </Text>
      </View>

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutText}>ログアウト</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: SPACING.lg },
  title: { fontSize: 24, fontWeight: "700", color: COLORS.text, marginBottom: SPACING.lg },
  section: { marginBottom: SPACING.xl },
  sectionTitle: { fontSize: 16, fontWeight: "600", color: COLORS.text, marginBottom: SPACING.sm },
  planCard: { backgroundColor: COLORS.surface, borderRadius: 12, padding: SPACING.md },
  planName: { fontSize: 17, fontWeight: "700", color: COLORS.text },
  planDetail: { fontSize: 13, color: COLORS.textSecondary, marginTop: 4 },
  upgradeButton: {
    backgroundColor: COLORS.primary, borderRadius: 10, padding: SPACING.sm,
    alignItems: "center", marginTop: SPACING.md,
  },
  upgradeText: { color: "#FFF", fontSize: 14, fontWeight: "600" },
  comingSoon: { fontSize: 14, color: COLORS.textSecondary },
  privacyText: { fontSize: 13, color: COLORS.textSecondary, lineHeight: 20 },
  logoutButton: {
    borderWidth: 1, borderColor: COLORS.error, borderRadius: 12,
    padding: SPACING.md, alignItems: "center", marginTop: SPACING.xl,
  },
  logoutText: { color: COLORS.error, fontSize: 15, fontWeight: "600" },
});
