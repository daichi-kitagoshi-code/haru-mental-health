import React, { useState, useEffect, useCallback } from "react";
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  Alert, Switch, TextInput, ActivityIndicator, Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { C, FLAT } from "../constants/colors";
import { FONT, SIZE, SP, RADIUS } from "../constants/typography";
import { api } from "../services/api";
import { ChevronRight, Bell, BellOff, Cake, LogOut, Crown } from "lucide-react-native";

interface Props {
  onLogout: () => void;
}

interface NotifSettings {
  notify_morning:  boolean;
  notify_evening:  boolean;
  notify_inactive: boolean;
  birthday:        string;   // "MM-DD" or ""
}

const CARD_OFFSET = 4;

// ── Flat section card ────────────────────────────────────────────────────────
function SectionCard({ children, style }: { children: React.ReactNode; style?: object }) {
  return (
    <View style={[fc.outer, style]}>
      <View style={fc.shadow} />
      <View style={fc.card}>{children}</View>
    </View>
  );
}

const fc = StyleSheet.create({
  outer: { position: "relative", marginBottom: CARD_OFFSET + 8, marginRight: CARD_OFFSET },
  shadow: {
    position: "absolute",
    top: CARD_OFFSET, left: CARD_OFFSET, right: -CARD_OFFSET, bottom: -CARD_OFFSET,
    backgroundColor: C.ink, borderRadius: RADIUS.md,
  },
  card: {
    borderWidth: 2, borderColor: C.ink, borderRadius: RADIUS.md,
    backgroundColor: C.white, overflow: "hidden",
  },
});

// ── Row components ───────────────────────────────────────────────────────────
function ToggleRow({
  label, sub, value, onChange, icon,
}: {
  label: string; sub?: string; value: boolean;
  onChange: (v: boolean) => void; icon?: React.ReactNode;
}) {
  return (
    <View style={r.row}>
      {icon && <View style={r.iconWrap}>{icon}</View>}
      <View style={{ flex: 1 }}>
        <Text style={r.label}>{label}</Text>
        {sub && <Text style={r.sub}>{sub}</Text>}
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: C.line, true: C.coral }}
        thumbColor={C.white}
        ios_backgroundColor={C.line}
      />
    </View>
  );
}

const r = StyleSheet.create({
  row: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: SP.md, paddingVertical: 14,
    borderBottomWidth: 2, borderBottomColor: C.line,
  },
  iconWrap: { marginRight: 12 },
  label: { fontFamily: FONT.syneSemi, fontSize: SIZE.body, color: C.ink },
  sub: { fontFamily: FONT.regular, fontSize: SIZE.caption, color: C.ink2, marginTop: 2 },
});

// ── Main screen ──────────────────────────────────────────────────────────────
export default function SettingsScreen({ onLogout }: Props) {
  const [loading,   setLoading]  = useState(true);
  const [saving,    setSaving]   = useState(false);
  const [notif, setNotif] = useState<NotifSettings>({
    notify_morning:  true,
    notify_evening:  true,
    notify_inactive: true,
    birthday:        "",
  });

  // birthday input state: month / day separately for easy validation
  const [bMonth, setBMonth] = useState("");
  const [bDay,   setBDay]   = useState("");

  // ── Load settings ──────────────────────────────────────────────────────
  useEffect(() => {
    api.notifications.getSettings()
      .then(data => {
        setNotif({
          notify_morning:  data.notify_morning  ?? true,
          notify_evening:  data.notify_evening  ?? true,
          notify_inactive: data.notify_inactive ?? true,
          birthday:        data.birthday        ?? "",
        });
        if (data.birthday) {
          const [m, d] = data.birthday.split("-");
          setBMonth(m || "");
          setBDay(d || "");
        }
      })
      .catch(e => console.warn("[SettingsScreen] load failed:", e))
      .finally(() => setLoading(false));
  }, []);

  // ── Save helper ────────────────────────────────────────────────────────
  const saveToggle = useCallback(
    async (field: keyof NotifSettings, value: boolean) => {
      setNotif(prev => ({ ...prev, [field]: value }));
      try {
        await api.notifications.updateSettings({ [field]: value });
      } catch (e) {
        console.error("[SettingsScreen] save toggle failed:", e);
        // revert on failure
        setNotif(prev => ({ ...prev, [field]: !value }));
        Alert.alert("保存できませんでした", "もう一度試してください");
      }
    },
    [],
  );

  const saveBirthday = useCallback(async () => {
    const m = bMonth.trim().padStart(2, "0");
    const d = bDay.trim().padStart(2, "0");

    if (!m || !d) {
      Alert.alert("入力不足", "月と日を入力してください");
      return;
    }
    const mInt = parseInt(m, 10);
    const dInt = parseInt(d, 10);
    if (mInt < 1 || mInt > 12 || dInt < 1 || dInt > 31) {
      Alert.alert("入力エラー", "正しい月日を入力してください");
      return;
    }

    const birthday = `${m}-${d}`;
    setSaving(true);
    try {
      await api.notifications.updateSettings({ birthday });
      setNotif(prev => ({ ...prev, birthday }));
      Alert.alert("保存しました", `誕生日を ${mInt}月${dInt}日 に設定しました 🎂`);
    } catch (e) {
      console.error("[SettingsScreen] save birthday failed:", e);
      Alert.alert("保存できませんでした", "もう一度試してください");
    } finally {
      setSaving(false);
    }
  }, [bMonth, bDay]);

  const handleLogout = () => {
    Alert.alert(
      "ログアウト",
      "ログアウトすると会話の記憶が端末から消えます。本当によろしいですか？",
      [
        { text: "キャンセル", style: "cancel" },
        { text: "ログアウトする", style: "destructive", onPress: onLogout },
      ],
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={s.container} edges={["top"]}>
        <View style={s.loadingWrap}>
          <ActivityIndicator color={C.coral} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.container} edges={["top"]}>
      {/* ── Header ─────────────────────────────────────────────────── */}
      <View style={s.header}>
        <Text style={s.headerTitle}>設定</Text>
      </View>

      <ScrollView
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
      >

        {/* ── プラン ─────────────────────────────────────────────────── */}
        <Text style={s.sectionLabel}>プラン</Text>
        <SectionCard>
          <View style={s.planRow}>
            <View style={s.planBadge}>
              <Text style={s.planBadgeText}>無料</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.planTitle}>フリープラン</Text>
              <Text style={s.planSub}>友達1人 · 1日5回 · 記憶7日間</Text>
            </View>
          </View>

          {/* Upgrade button */}
          <View style={s.upgradeBtnOuter}>
            <View style={s.upgradeBtnShadow} />
            <TouchableOpacity style={s.upgradeBtn} activeOpacity={0.85}>
              <Crown size={16} color={C.white} strokeWidth={2} />
              <View>
                <Text style={s.upgradeBtnText}>スタンダードにアップグレード</Text>
                <Text style={s.upgradeBtnSub}>¥480/月 · 友達3人 · 無制限 · 記憶30日</Text>
              </View>
            </TouchableOpacity>
          </View>
        </SectionCard>

        {/* ── 通知 ─────────────────────────────────────────────────── */}
        <Text style={s.sectionLabel}>通知</Text>
        <SectionCard>
          <ToggleRow
            label="朝のあいさつ"
            sub="毎朝 8:00 に「おはよう」と話しかけてくれる"
            value={notif.notify_morning}
            onChange={v => saveToggle("notify_morning", v)}
            icon={<Bell size={18} color={C.coral} strokeWidth={2} />}
          />
          <ToggleRow
            label="夜のチェックイン"
            sub="毎晩 22:00 に「今日どうだった？」と届く"
            value={notif.notify_evening}
            onChange={v => saveToggle("notify_evening", v)}
            icon={<Bell size={18} color={C.sky} strokeWidth={2} />}
          />
          <View style={[r.row, { borderBottomWidth: 0 }]}>
            <View style={r.iconWrap}>
              <BellOff size={18} color={C.ink2} strokeWidth={2} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={r.label}>ひさしぶり通知</Text>
              <Text style={r.sub}>3日間来ていない時に「また話してほしい」と届く</Text>
            </View>
            <Switch
              value={notif.notify_inactive}
              onValueChange={v => saveToggle("notify_inactive", v)}
              trackColor={{ false: C.line, true: C.coral }}
              thumbColor={C.white}
              ios_backgroundColor={C.line}
            />
          </View>
        </SectionCard>

        {/* ── 誕生日 ────────────────────────────────────────────────── */}
        <Text style={s.sectionLabel}>誕生日</Text>
        <SectionCard>
          <View style={s.birthdayHeader}>
            <Cake size={18} color={C.coral} strokeWidth={2} />
            <Text style={s.birthdayTitle}>誕生日を教えて</Text>
          </View>
          <Text style={s.birthdayDesc}>
            当日に友達から「おめでとう」のメッセージが届きます 🎂
          </Text>
          <View style={s.birthdayInputRow}>
            {/* Month */}
            <View style={s.dateInputOuter}>
              <View style={s.dateInputShadow} />
              <TextInput
                style={s.dateInput}
                value={bMonth}
                onChangeText={v => setBMonth(v.replace(/[^0-9]/g, "").slice(0, 2))}
                placeholder="月"
                placeholderTextColor={C.ink3}
                keyboardType="number-pad"
                maxLength={2}
                textAlign="center"
              />
            </View>
            <Text style={s.dateSep}>月</Text>

            {/* Day */}
            <View style={s.dateInputOuter}>
              <View style={s.dateInputShadow} />
              <TextInput
                style={s.dateInput}
                value={bDay}
                onChangeText={v => setBDay(v.replace(/[^0-9]/g, "").slice(0, 2))}
                placeholder="日"
                placeholderTextColor={C.ink3}
                keyboardType="number-pad"
                maxLength={2}
                textAlign="center"
              />
            </View>
            <Text style={s.dateSep}>日</Text>

            {/* Save */}
            <View style={s.saveBtnOuter}>
              <View style={s.saveBtnShadow} />
              <TouchableOpacity
                style={s.saveBtn}
                onPress={saveBirthday}
                disabled={saving}
                activeOpacity={0.85}
              >
                {saving ? (
                  <ActivityIndicator size="small" color={C.white} />
                ) : (
                  <Text style={s.saveBtnText}>保存</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>

          {notif.birthday ? (
            <Text style={s.birthdaySaved}>
              ✓ 現在の設定: {parseInt(notif.birthday.split("-")[0], 10)}月{parseInt(notif.birthday.split("-")[1], 10)}日
            </Text>
          ) : null}
        </SectionCard>

        {/* ── プライバシー ──────────────────────────────────────────── */}
        <Text style={s.sectionLabel}>プライバシー</Text>
        <SectionCard>
          <View style={s.privacyBody}>
            <Text style={s.privacyText}>
              会話の内容は暗号化されて保存されます。個人を特定できる情報が外部に共有されることはありません。
            </Text>
          </View>
        </SectionCard>

        {/* ── アカウント ────────────────────────────────────────────── */}
        <Text style={s.sectionLabel}>アカウント</Text>
        <SectionCard>
          <View style={s.logoutBtnOuter}>
            <View style={s.logoutBtnShadow} />
            <TouchableOpacity
              style={s.logoutBtn}
              onPress={handleLogout}
              activeOpacity={0.85}
            >
              <LogOut size={16} color={C.ink} strokeWidth={2} />
              <Text style={s.logoutBtnText}>ログアウト</Text>
            </TouchableOpacity>
          </View>
        </SectionCard>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.mist },
  loadingWrap: { flex: 1, justifyContent: "center", alignItems: "center" },

  // Header
  header: {
    paddingHorizontal: SP.md, paddingVertical: 14,
    borderBottomWidth: 2, borderBottomColor: C.ink,
    backgroundColor: C.white,
  },
  headerTitle: { fontFamily: FONT.syneBlack, fontSize: SIZE.title2, color: C.ink },

  scroll: { paddingHorizontal: SP.md, paddingTop: SP.lg },

  sectionLabel: {
    fontFamily: FONT.syneSemi, fontSize: SIZE.label,
    color: C.ink2, letterSpacing: 1, textTransform: "uppercase",
    marginBottom: SP.sm, marginTop: SP.xs,
  },

  // Plan card
  planRow: {
    flexDirection: "row", alignItems: "center",
    padding: SP.md, gap: SP.sm,
    borderBottomWidth: 2, borderBottomColor: C.line,
  },
  planBadge: {
    backgroundColor: C.mist, borderWidth: 2, borderColor: C.ink,
    borderRadius: RADIUS.xs, paddingHorizontal: 8, paddingVertical: 3,
  },
  planBadgeText: { fontFamily: FONT.syneBold, fontSize: SIZE.small, color: C.ink2 },
  planTitle: { fontFamily: FONT.syneBold, fontSize: SIZE.body, color: C.ink },
  planSub: { fontFamily: FONT.regular, fontSize: SIZE.caption, color: C.ink2, marginTop: 2 },

  upgradeBtnOuter: {
    position: "relative", margin: SP.md,
    marginBottom: CARD_OFFSET + 4, marginRight: CARD_OFFSET + 4,
  },
  upgradeBtnShadow: {
    position: "absolute",
    top: CARD_OFFSET, left: CARD_OFFSET, right: -CARD_OFFSET, bottom: -CARD_OFFSET,
    backgroundColor: C.coralD, borderRadius: RADIUS.sm,
  },
  upgradeBtn: {
    flexDirection: "row", alignItems: "center", gap: SP.sm,
    backgroundColor: C.coral,
    borderWidth: 2, borderColor: C.coralD, borderRadius: RADIUS.sm,
    paddingHorizontal: SP.md, paddingVertical: 14,
  },
  upgradeBtnText: { fontFamily: FONT.syneBold, fontSize: SIZE.body, color: C.white },
  upgradeBtnSub:  { fontFamily: FONT.syne, fontSize: SIZE.caption, color: "rgba(255,255,255,0.8)", marginTop: 2 },

  // Birthday
  birthdayHeader: {
    flexDirection: "row", alignItems: "center", gap: 8,
    paddingHorizontal: SP.md, paddingTop: SP.md, paddingBottom: SP.xs,
  },
  birthdayTitle: { fontFamily: FONT.syneBold, fontSize: SIZE.body, color: C.ink },
  birthdayDesc: {
    fontFamily: FONT.regular, fontSize: SIZE.small, color: C.ink2,
    paddingHorizontal: SP.md, marginBottom: SP.md, lineHeight: SIZE.small * 1.6,
  },
  birthdayInputRow: {
    flexDirection: "row", alignItems: "center", gap: SP.xs,
    paddingHorizontal: SP.md, paddingBottom: SP.md,
  },
  dateInputOuter: {
    position: "relative", width: 52, height: 44,
    marginBottom: CARD_OFFSET, marginRight: CARD_OFFSET,
  },
  dateInputShadow: {
    position: "absolute",
    top: CARD_OFFSET, left: CARD_OFFSET, right: -CARD_OFFSET, bottom: -CARD_OFFSET,
    backgroundColor: C.ink, borderRadius: RADIUS.xs,
  },
  dateInput: {
    width: 52, height: 44,
    borderWidth: 2, borderColor: C.ink, borderRadius: RADIUS.xs,
    backgroundColor: C.white,
    fontFamily: FONT.sansBold, fontSize: SIZE.subtitle, color: C.ink,
    textAlign: "center",
  },
  dateSep: { fontFamily: FONT.syneBold, fontSize: SIZE.subtitle, color: C.ink },
  saveBtnOuter: {
    position: "relative", flex: 1,
    marginBottom: CARD_OFFSET, marginRight: CARD_OFFSET, marginLeft: SP.xs,
  },
  saveBtnShadow: {
    position: "absolute",
    top: CARD_OFFSET, left: CARD_OFFSET, right: -CARD_OFFSET, bottom: -CARD_OFFSET,
    backgroundColor: C.coralD, borderRadius: RADIUS.xs,
  },
  saveBtn: {
    height: 44, borderRadius: RADIUS.xs,
    borderWidth: 2, borderColor: C.coralD,
    backgroundColor: C.coral,
    justifyContent: "center", alignItems: "center",
  },
  saveBtnText: { fontFamily: FONT.syneBold, fontSize: SIZE.body, color: C.white },
  birthdaySaved: {
    fontFamily: FONT.syne, fontSize: SIZE.caption, color: C.sage,
    paddingHorizontal: SP.md, paddingBottom: SP.md,
  },

  // Privacy
  privacyBody: { padding: SP.md },
  privacyText: {
    fontFamily: FONT.regular, fontSize: SIZE.body2,
    color: C.ink2, lineHeight: SIZE.body2 * 1.7,
  },

  // Logout
  logoutBtnOuter: {
    position: "relative", margin: SP.md,
    marginBottom: CARD_OFFSET + 4, marginRight: CARD_OFFSET + 4,
  },
  logoutBtnShadow: {
    position: "absolute",
    top: CARD_OFFSET, left: CARD_OFFSET, right: -CARD_OFFSET, bottom: -CARD_OFFSET,
    backgroundColor: C.ink, borderRadius: RADIUS.sm,
  },
  logoutBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: SP.sm,
    backgroundColor: C.white,
    borderWidth: 2, borderColor: C.ink, borderRadius: RADIUS.sm,
    paddingVertical: 14,
  },
  logoutBtnText: { fontFamily: FONT.syneBold, fontSize: SIZE.body, color: C.ink },
});
