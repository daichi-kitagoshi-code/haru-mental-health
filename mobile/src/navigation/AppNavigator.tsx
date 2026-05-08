import React, { useState, useEffect } from "react";
import {
  View, Text, TouchableOpacity, ActivityIndicator, StyleSheet, Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { C } from "../constants/colors";
import { FONT, SIZE, SP } from "../constants/typography";
import * as SecureStore from "expo-secure-store";
import { api } from "../services/api";
import { Home, MessageCircle, Users, Settings, Plus } from "lucide-react-native";

import { usePushNotifications } from "../hooks/usePushNotifications";
import OnboardingScreen from "../screens/OnboardingScreen";
import HomeScreen, { CharacterProfile } from "../screens/HomeScreen";
import CharacterGenerateScreen from "../screens/CharacterGenerateScreen";
import CharacterProfileScreen from "../screens/CharacterProfileScreen";
import ChatScreen from "../screens/ChatScreen";
import SettingsScreen from "../screens/SettingsScreen";

type Tab = "home" | "chat" | "friends" | "settings";

// ── Bottom tab bar ─────────────────────────────────────────────────────────
// Layout: [home] [chat] [+ center button] [friends] [settings]
const LEFT_TABS: { key: Tab; label: string; Icon: any }[] = [
  { key: "home",  label: "ホーム",  Icon: Home },
  { key: "chat",  label: "チャット", Icon: MessageCircle },
];
const RIGHT_TABS: { key: Tab; label: string; Icon: any }[] = [
  { key: "friends",  label: "友達", Icon: Users },
  { key: "settings", label: "設定", Icon: Settings },
];

const CENTER_SIZE  = 58;
const CENTER_RISE  = 18;   // how far the + button rises above the bar
const BAR_HEIGHT   = 60;
const SHADOW_OFFSET = 3;

function BottomTabBar({
  activeTab,
  onPress,
  onPressCenter,
}: {
  activeTab: Tab;
  onPress: (t: Tab) => void;
  onPressCenter: () => void;
}) {
  return (
    <SafeAreaView edges={["bottom"]} style={s.barSafe}>
      {/* Hard-shadow top border */}
      <View style={s.barTopBorder} />

      <View style={s.bar}>
        {/* Left tabs */}
        {LEFT_TABS.map(({ key, label, Icon }) => {
          const active = activeTab === key;
          return (
            <TouchableOpacity
              key={key}
              style={s.barItem}
              onPress={() => onPress(key)}
              activeOpacity={0.7}
            >
              {active && <View style={s.activeIndicator} />}
              <Icon
                size={22}
                color={active ? C.coral : C.ink3}
                strokeWidth={active ? 2.5 : 1.8}
              />
              <Text style={[s.barLabel, active && s.barLabelActive]}>{label}</Text>
            </TouchableOpacity>
          );
        })}

        {/* Center spacer (occupied by floating button) */}
        <View style={s.centerSpace} />

        {/* Right tabs */}
        {RIGHT_TABS.map(({ key, label, Icon }) => {
          const active = activeTab === key;
          return (
            <TouchableOpacity
              key={key}
              style={s.barItem}
              onPress={() => onPress(key)}
              activeOpacity={0.7}
            >
              {active && <View style={s.activeIndicator} />}
              <Icon
                size={22}
                color={active ? C.coral : C.ink3}
                strokeWidth={active ? 2.5 : 1.8}
              />
              <Text style={[s.barLabel, active && s.barLabelActive]}>{label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* ── Floating center + button ─────────────────────────────────── */}
      <View style={s.centerBtnContainer} pointerEvents="box-none">
        {/* flat shadow */}
        <View style={s.centerBtnShadow} />
        <TouchableOpacity
          onPress={onPressCenter}
          activeOpacity={0.85}
          style={s.centerBtn}
        >
          <Plus size={28} color={C.white} strokeWidth={2.5} />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

// ── AppNavigator ───────────────────────────────────────────────────────────
export default function AppNavigator() {
  const [isAuth,          setIsAuth]          = useState(false);
  const [loading,         setLoading]         = useState(true);
  const [showGenerate,    setShowGenerate]    = useState(false);
  const [characters,      setCharacters]      = useState<CharacterProfile[]>([]);
  const [selectedChar,    setSelectedChar]    = useState<CharacterProfile | null>(null);
  const [profileChar,     setProfileChar]     = useState<CharacterProfile | null>(null);
  const [userPlan,        setUserPlan]        = useState("free");
  const [activeTab,       setActiveTab]       = useState<Tab>("home");

  // プッシュ通知：ログイン後に自動登録
  usePushNotifications(isAuth);

  useEffect(() => { checkAuth(); }, []);

  const checkAuth = async () => {
    const token = await SecureStore.getItemAsync("access_token");
    if (!token) { setLoading(false); return; }
    try {
      const chars = await api.characters.list();
      setCharacters(chars);
      setIsAuth(true);
      if (chars.length > 0) setSelectedChar(chars[0]);
      else setShowGenerate(true);
    } catch {
      await SecureStore.deleteItemAsync("access_token");
    } finally {
      setLoading(false);
    }
  };

  const handleLoginSuccess = async () => {
    try {
      const chars = await api.characters.list();
      setCharacters(chars);
      setIsAuth(true);
      if (chars.length === 0) setShowGenerate(true);
      else setSelectedChar(chars[0]);
    } catch {
      setIsAuth(true);
      setShowGenerate(true);
    }
  };

  const handleCharacterCreated = (character: CharacterProfile) => {
    setCharacters(prev => [...prev, character]);
    setSelectedChar(character);
    setShowGenerate(false);
    setActiveTab("chat");
  };

  const handleLogout = async () => {
    await SecureStore.deleteItemAsync("access_token");
    await SecureStore.deleteItemAsync("user_id");
    setIsAuth(false);
    setCharacters([]);
    setSelectedChar(null);
    setShowGenerate(false);
    setProfileChar(null);
    setActiveTab("home");
  };

  const handleSelectCharacter = (c: CharacterProfile) => {
    setSelectedChar(c);
    setActiveTab("chat");
  };

  const handleOpenProfile = (c: CharacterProfile) => {
    setProfileChar(c);
  };

  // Loading
  if (loading) {
    return (
      <View style={s.loadingWrap}>
        <ActivityIndicator size="large" color={C.ink3} />
      </View>
    );
  }

  // Unauthenticated
  if (!isAuth) return <OnboardingScreen onLoginSuccess={handleLoginSuccess} />;

  // Character generation
  if (showGenerate) return <CharacterGenerateScreen onCharacterCreated={handleCharacterCreated} />;

  // Profile overlay
  if (profileChar) {
    return (
      <CharacterProfileScreen
        character={profileChar}
        onBack={() => setProfileChar(null)}
        onChat={() => {
          setSelectedChar(profileChar);
          setProfileChar(null);
          setActiveTab("chat");
        }}
      />
    );
  }

  return (
    <View style={s.root}>
      {/* ── Tab content ─────────────────────────────────────────────── */}
      <View style={s.screens}>
        {activeTab === "home" && (
          <HomeScreen
            characters={characters}
            onSelectCharacter={handleSelectCharacter}
            onOpenProfile={handleOpenProfile}
            onCreateNew={() => setShowGenerate(true)}
            plan={userPlan}
          />
        )}

        {activeTab === "chat" && (
          selectedChar ? (
            <ChatScreen character={selectedChar} />
          ) : (
            <View style={s.emptyWrap}>
              {/* Empty state card */}
              <View style={s.emptyCardOuter}>
                <View style={s.emptyCardShadow} />
                <View style={s.emptyCard}>
                  <Text style={s.emptyEmoji}>💬</Text>
                  <Text style={s.emptyTitle}>友達を選んで話しかけよう</Text>
                  <Text style={s.emptyBody}>ホームから友達を選ぶか、新しい友達を作ってね</Text>
                </View>
              </View>

              <View style={s.emptyBtnOuter}>
                <View style={s.emptyBtnShadow} />
                <TouchableOpacity onPress={() => setActiveTab("home")} style={s.emptyBtn}>
                  <Text style={s.emptyBtnText}>ホームへ</Text>
                </TouchableOpacity>
              </View>
            </View>
          )
        )}

        {activeTab === "friends" && (
          <HomeScreen
            characters={characters}
            onSelectCharacter={handleSelectCharacter}
            onOpenProfile={handleOpenProfile}
            onCreateNew={() => setShowGenerate(true)}
            plan={userPlan}
          />
        )}

        {activeTab === "settings" && (
          <SettingsScreen onLogout={handleLogout} />
        )}
      </View>

      {/* ── Bottom nav ───────────────────────────────────────────────── */}
      <BottomTabBar
        activeTab={activeTab}
        onPress={setActiveTab}
        onPressCenter={() => setShowGenerate(true)}
      />
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.mist },
  loadingWrap: {
    flex: 1, backgroundColor: C.mist,
    justifyContent: "center", alignItems: "center",
  },
  screens: { flex: 1 },

  // ── Bar chrome
  barSafe: {
    backgroundColor: C.white,
    position: "relative",
  },
  barTopBorder: {
    height: 2, backgroundColor: C.ink,
  },
  bar: {
    flexDirection: "row",
    height: BAR_HEIGHT,
    paddingBottom: Platform.OS === "ios" ? 0 : 4,
    alignItems: "center",
  },
  barItem: {
    flex: 1, alignItems: "center", justifyContent: "center",
    gap: 3, paddingTop: 6, position: "relative",
  },
  activeIndicator: {
    position: "absolute", top: 0,
    width: 24, height: 3,
    backgroundColor: C.coral, borderRadius: 0,
  },
  barLabel: {
    fontFamily: FONT.syne, fontSize: SIZE.label, color: C.ink3,
  },
  barLabelActive: {
    fontFamily: FONT.syneBold, color: C.coral,
  },

  // Center spacer — same width as one barItem
  centerSpace: { flex: 1 },

  // ── Floating + button
  centerBtnContainer: {
    position: "absolute",
    alignSelf: "center",
    // sit above bar top border
    top: -(CENTER_SIZE / 2 + CENTER_RISE) + 2,
  },
  centerBtnShadow: {
    position: "absolute",
    top: SHADOW_OFFSET,
    left: SHADOW_OFFSET,
    right: -SHADOW_OFFSET,
    bottom: -SHADOW_OFFSET,
    backgroundColor: C.coralD,
    borderRadius: CENTER_SIZE / 2,
  },
  centerBtn: {
    width: CENTER_SIZE,
    height: CENTER_SIZE,
    borderRadius: CENTER_SIZE / 2,
    backgroundColor: C.coral,
    borderWidth: 2,
    borderColor: C.coralD,
    justifyContent: "center",
    alignItems: "center",
  },

  // ── Empty chat state
  emptyWrap: {
    flex: 1, justifyContent: "center", alignItems: "center",
    gap: SP.lg, paddingHorizontal: SP.xl,
  },
  emptyCardOuter: {
    position: "relative", width: "100%",
    marginBottom: 4, marginRight: 4,
  },
  emptyCardShadow: {
    position: "absolute",
    top: 4, left: 4, right: -4, bottom: -4,
    backgroundColor: C.ink, borderRadius: 16,
  },
  emptyCard: {
    backgroundColor: C.white,
    borderWidth: 2, borderColor: C.ink, borderRadius: 16,
    padding: SP.xl, alignItems: "center", gap: SP.sm,
  },
  emptyEmoji: { fontSize: 48 },
  emptyTitle: {
    fontFamily: FONT.syneBold, fontSize: SIZE.subtitle, color: C.ink,
    textAlign: "center",
  },
  emptyBody: {
    fontFamily: FONT.regular, fontSize: SIZE.body2, color: C.ink2,
    textAlign: "center", lineHeight: SIZE.body2 * 1.6,
  },
  emptyBtnOuter: {
    position: "relative",
    marginBottom: 4, marginRight: 4,
  },
  emptyBtnShadow: {
    position: "absolute",
    top: 4, left: 4, right: -4, bottom: -4,
    backgroundColor: C.coralD, borderRadius: 12,
  },
  emptyBtn: {
    backgroundColor: C.coral,
    borderWidth: 2, borderColor: C.coralD, borderRadius: 12,
    paddingHorizontal: SP.xl, paddingVertical: 14,
  },
  emptyBtnText: {
    fontFamily: FONT.syneBold, fontSize: SIZE.body1, color: C.white,
  },
});
