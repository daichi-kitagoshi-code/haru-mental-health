import React from "react";
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { COLORS, SPACING } from "../constants/theme";

interface Props {
  onLogout: () => void;
}

export default function SettingsScreen({ onLogout }: Props) {
  const handleLogout = () => {
    Alert.alert("ログアウト", "ログアウトしますか？", [
      { text: "キャンセル", style: "cancel" },
      { text: "ログアウト", style: "destructive", onPress: onLogout },
    ]);
  };

  return (
    <SafeAreaView style={s.container} edges={["top"]}>
      <View style={s.header}>
        <Text style={s.title}>設定</Text>
      </View>

      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <Section label="プラン">
          <Row label="現在のプラン" value="無料（1人）" />
          <TouchableOpacity style={s.upgradeBtn} activeOpacity={0.7}>
            <View>
              <Text style={s.upgradeBtnText}>スタンダードにアップグレード</Text>
              <Text style={s.upgradeBtnSub}>¥480/月 · 友達3人・無制限</Text>
            </View>
          </TouchableOpacity>
        </Section>

        <Section label="プライバシー">
          <Text style={s.bodyText}>
            会話は匿名で集計される場合があります。個人を特定する情報は共有されません。
          </Text>
        </Section>

        <Section label="アカウント">
          <TouchableOpacity style={s.logoutRow} onPress={handleLogout} activeOpacity={0.7}>
            <Text style={s.logoutText}>ログアウト</Text>
          </TouchableOpacity>
        </Section>
      </ScrollView>
    </SafeAreaView>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={s.section}>
      <Text style={s.sectionLabel}>{label}</Text>
      <View style={s.sectionBody}>{children}</View>
    </View>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={s.rowItem}>
      <Text style={s.rowLabel}>{label}</Text>
      <Text style={s.rowValue}>{value}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: {
    paddingHorizontal: SPACING.md, paddingVertical: 16,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  title: { fontSize: 24, fontWeight: "700", color: COLORS.text },
  content: { paddingHorizontal: SPACING.md, paddingTop: SPACING.lg, paddingBottom: 60 },
  section: { marginBottom: SPACING.xl },
  sectionLabel: {
    fontSize: 12, color: COLORS.textSecondary, letterSpacing: 1,
    textTransform: "uppercase", marginBottom: SPACING.sm,
  },
  sectionBody: {
    backgroundColor: COLORS.surface, borderRadius: 14, overflow: "hidden",
    borderWidth: 1, borderColor: COLORS.border,
  },
  rowItem: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingHorizontal: SPACING.md, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  rowLabel: { fontSize: 15, color: COLORS.text },
  rowValue: { fontSize: 14, color: COLORS.textSecondary },
  upgradeBtn: { paddingHorizontal: SPACING.md, paddingVertical: 14 },
  upgradeBtnText: { fontSize: 15, color: COLORS.accent1, fontWeight: "600" },
  upgradeBtnSub: { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },
  bodyText: {
    fontSize: 14, color: COLORS.textSecondary, lineHeight: 22,
    paddingHorizontal: SPACING.md, paddingVertical: 14,
  },
  logoutRow: { paddingHorizontal: SPACING.md, paddingVertical: 14 },
  logoutText: { fontSize: 15, color: COLORS.error, fontWeight: "500" },
});
