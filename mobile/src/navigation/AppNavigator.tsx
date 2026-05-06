import React, { useState, useEffect } from "react";
import {
  View, Text, TouchableOpacity, ActivityIndicator, StyleSheet, Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { C } from "../constants/colors";
import { FONT, SIZE, SP, SHADOW } from "../constants/typography";
import * as SecureStore from "expo-secure-store";
import { api } from "../services/api";
import { Home, MessageCircle, Users, Settings } from "lucide-react-native";

import OnboardingScreen from "../screens/OnboardingScreen";
import HomeScreen, { CharacterProfile } from "../screens/HomeScreen";
import CharacterGenerateScreen from "../screens/CharacterGenerateScreen";
import CharacterProfileScreen from "../screens/CharacterProfileScreen";
import ChatScreen from "../screens/ChatScreen";
import SettingsScreen from "../screens/SettingsScreen";

type Tab = "home" | "chat" | "friends" | "settings";

const TABS: { key: Tab; label: string; Icon: any }[] = [
  { key: "home", label: "ホーム", Icon: Home },
  { key: "chat", label: "チャット", Icon: MessageCircle },
  { key: "friends", label: "友達", Icon: Users },
  { key: "settings", label: "設定", Icon: Settings },
];

export default function AppNavigator() {
  const [isAuth, setIsAuth] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showGenerate, setShowGenerate] = useState(false);
  const [characters, setCharacters] = useState<CharacterProfile[]>([]);
  const [selectedCharacter, setSelectedCharacter] = useState<CharacterProfile | null>(null);
  const [profileCharacter, setProfileCharacter] = useState<CharacterProfile | null>(null);
  const [userPlan, setUserPlan] = useState("free");
  const [activeTab, setActiveTab] = useState<Tab>("home");

  useEffect(() => { checkAuth(); }, []);

  const checkAuth = async () => {
    const token = await SecureStore.getItemAsync("access_token");
    if (!token) { setLoading(false); return; }
    try {
      const chars = await api.characters.list();
      setCharacters(chars);
      setIsAuth(true);
      if (chars.length > 0) setSelectedCharacter(chars[0]);
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
      else setSelectedCharacter(chars[0]);
    } catch {
      setIsAuth(true);
      setShowGenerate(true);
    }
  };

  const handleCharacterCreated = (character: CharacterProfile) => {
    setCharacters(prev => [...prev, character]);
    setSelectedCharacter(character);
    setShowGenerate(false);
    setActiveTab("chat");
  };

  const handleLogout = async () => {
    await SecureStore.deleteItemAsync("access_token");
    await SecureStore.deleteItemAsync("user_id");
    setIsAuth(false);
    setCharacters([]);
    setSelectedCharacter(null);
    setShowGenerate(false);
    setProfileCharacter(null);
    setActiveTab("home");
  };

  const handleSelectCharacter = (c: CharacterProfile) => {
    setSelectedCharacter(c);
    setActiveTab("chat");
  };

  const handleOpenProfile = (c: CharacterProfile) => {
    setProfileCharacter(c);
  };

  if (loading) {
    return (
      <View style={s.loadingWrap}>
        <ActivityIndicator size="large" color={C.textTertiary} />
      </View>
    );
  }

  if (!isAuth) return <OnboardingScreen onLoginSuccess={handleLoginSuccess} />;
  if (showGenerate) return <CharacterGenerateScreen onCharacterCreated={handleCharacterCreated} />;

  // Profile overlay
  if (profileCharacter) {
    return (
      <CharacterProfileScreen
        character={profileCharacter}
        onBack={() => setProfileCharacter(null)}
        onChat={() => {
          setSelectedCharacter(profileCharacter);
          setProfileCharacter(null);
          setActiveTab("chat");
        }}
      />
    );
  }

  return (
    <View style={s.root}>
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
          selectedCharacter ? (
            <ChatScreen character={selectedCharacter} />
          ) : (
            <View style={s.emptyWrap}>
              <Text style={s.emptyEmoji}>💬</Text>
              <Text style={s.emptyText}>友達を選んで話しかけよう</Text>
              <TouchableOpacity onPress={() => setActiveTab("home")} style={s.emptyBtn}>
                <Text style={s.emptyBtnText}>ホームへ</Text>
              </TouchableOpacity>
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

      <BottomTabBar activeTab={activeTab} onPress={setActiveTab} />
    </View>
  );
}

function BottomTabBar({
  activeTab,
  onPress,
}: {
  activeTab: Tab;
  onPress: (t: Tab) => void;
}) {
  return (
    <SafeAreaView edges={["bottom"]} style={s.barSafe}>
      <View style={s.bar}>
        {TABS.map(({ key, label, Icon }) => {
          const active = activeTab === key;
          return (
            <TouchableOpacity
              key={key}
              style={s.barItem}
              onPress={() => onPress(key)}
              activeOpacity={0.7}
            >
              <View style={[s.iconWrap, active && s.iconWrapActive]}>
                <Icon
                  size={22}
                  color={active ? C.accent : C.textTertiary}
                  strokeWidth={active ? 2.5 : 1.8}
                />
              </View>
              <Text style={[s.barLabel, active && s.barLabelActive]}>{label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  loadingWrap: {
    flex: 1,
    backgroundColor: C.bg,
    justifyContent: "center",
    alignItems: "center",
  },
  screens: { flex: 1 },

  // Tab bar
  barSafe: {
    backgroundColor: C.bgOverlay,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: C.border,
  },
  bar: {
    flexDirection: "row",
    height: 56,
    paddingBottom: Platform.OS === "ios" ? 0 : 4,
  },
  barItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
    paddingTop: 6,
  },
  iconWrap: {
    width: 36,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
  },
  iconWrapActive: {
    backgroundColor: C.accentSofter,
  },
  barLabel: {
    fontFamily: FONT.regular,
    fontSize: SIZE.label,
    color: C.textTertiary,
  },
  barLabelActive: {
    fontFamily: FONT.bold,
    color: C.accent,
  },

  // Empty chat state
  emptyWrap: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: SP.md,
  },
  emptyEmoji: { fontSize: 48 },
  emptyText: {
    fontFamily: FONT.regular,
    fontSize: SIZE.body,
    color: C.textSecondary,
  },
  emptyBtn: {
    marginTop: SP.sm,
    backgroundColor: C.text,
    borderRadius: 12,
    paddingHorizontal: SP.lg,
    paddingVertical: 12,
  },
  emptyBtnText: {
    fontFamily: FONT.bold,
    fontSize: SIZE.body1,
    color: C.white,
  },
});
