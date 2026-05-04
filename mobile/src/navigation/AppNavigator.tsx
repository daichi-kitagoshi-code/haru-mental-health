import React, { useState, useEffect } from "react";
import {
  View, Text, TouchableOpacity, ActivityIndicator, StyleSheet, Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { COLORS, SPACING } from "../constants/theme";
import * as SecureStore from "expo-secure-store";
import { api } from "../services/api";
import { Users, MessageCircle, Compass, Settings } from "lucide-react-native";

import OnboardingScreen from "../screens/OnboardingScreen";
import CharacterGenerateScreen, { CharacterProfile } from "../screens/CharacterGenerateScreen";
import CharacterListScreen from "../screens/CharacterListScreen";
import CharacterProfileScreen from "../screens/CharacterProfileScreen";
import ChatScreen from "../screens/ChatScreen";
import TodayScreen from "../screens/TodayScreen";
import SettingsScreen from "../screens/SettingsScreen";

type Tab = "home" | "chat" | "today" | "settings";

const TABS: { key: Tab; label: string; Icon: any }[] = [
  { key: "home", label: "友達", Icon: Users },
  { key: "chat", label: "チャット", Icon: MessageCircle },
  { key: "today", label: "今日", Icon: Compass },
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
    setProfileCharacter(c);
  };

  const handleReplyToCharacter = (characterId: string) => {
    const c = characters.find(ch => ch.id === characterId);
    if (c) {
      setSelectedCharacter(c);
      setActiveTab("chat");
    }
  };

  if (loading) {
    return (
      <View style={s.loadingWrap}>
        <ActivityIndicator size="large" color={COLORS.textSecondary} />
      </View>
    );
  }

  if (!isAuth) return <OnboardingScreen onLoginSuccess={handleLoginSuccess} />;
  if (showGenerate) return <CharacterGenerateScreen onCharacterCreated={handleCharacterCreated} />;

  // Character profile modal-style overlay
  if (profileCharacter && activeTab === "home") {
    return (
      <View style={s.root}>
        <CharacterProfileScreen
          character={profileCharacter}
          onBack={() => setProfileCharacter(null)}
          onChat={() => {
            setSelectedCharacter(profileCharacter);
            setProfileCharacter(null);
            setActiveTab("chat");
          }}
        />
        <TabBar activeTab="home" onTabPress={() => {}} hideBar />
      </View>
    );
  }

  return (
    <View style={s.root}>
      {/* Screens */}
      <View style={s.screens}>
        {activeTab === "home" && (
          <CharacterListScreen
            characters={characters}
            loading={false}
            selectedId={selectedCharacter?.id}
            onSelectCharacter={handleSelectCharacter}
            onCreateNew={() => setShowGenerate(true)}
            plan={userPlan}
          />
        )}
        {activeTab === "chat" && (
          selectedCharacter ? (
            <ChatScreen
              character={selectedCharacter}
            />
          ) : (
            <View style={s.noChatWrap}>
              <Text style={s.noChatEmoji}>💬</Text>
              <Text style={s.noChatText}>友達を選んで話しかけよう</Text>
              <TouchableOpacity onPress={() => setActiveTab("home")} style={s.noChatBtn}>
                <Text style={s.noChatBtnText}>友達を選ぶ</Text>
              </TouchableOpacity>
            </View>
          )
        )}
        {activeTab === "today" && (
          <TodayScreen onReplyToCharacter={handleReplyToCharacter} />
        )}
        {activeTab === "settings" && (
          <SettingsScreen onLogout={handleLogout} />
        )}
      </View>

      {/* Tab bar */}
      <TabBar activeTab={activeTab} onTabPress={setActiveTab} />
    </View>
  );
}

function TabBar({
  activeTab, onTabPress, hideBar,
}: {
  activeTab: Tab; onTabPress: (t: Tab) => void; hideBar?: boolean;
}) {
  if (hideBar) return null;
  return (
    <SafeAreaView edges={["bottom"]} style={s.tabBarWrap}>
      <View style={s.tabBar}>
        {TABS.map(({ key, label, Icon }) => {
          const active = activeTab === key;
          return (
            <TouchableOpacity
              key={key}
              style={s.tabItem}
              onPress={() => onTabPress(key)}
              activeOpacity={0.7}
            >
              <Icon
                size={22}
                color={active ? COLORS.accent1 : COLORS.textSecondary}
                strokeWidth={active ? 2.5 : 1.5}
              />
              <Text style={[s.tabLabel, active && s.tabLabelActive]}>{label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg },
  loadingWrap: { flex: 1, backgroundColor: COLORS.bg, justifyContent: "center", alignItems: "center" },
  screens: { flex: 1 },
  tabBarWrap: { backgroundColor: COLORS.bg, borderTopWidth: 1, borderTopColor: COLORS.border },
  tabBar: { flexDirection: "row", paddingTop: 8, paddingBottom: Platform.OS === "ios" ? 0 : 8 },
  tabItem: { flex: 1, alignItems: "center", gap: 3, paddingVertical: 4 },
  tabLabel: { fontSize: 10, color: COLORS.textSecondary, fontWeight: "500" },
  tabLabelActive: { color: COLORS.accent1, fontWeight: "700" },
  noChatWrap: { flex: 1, justifyContent: "center", alignItems: "center", gap: 12 },
  noChatEmoji: { fontSize: 48 },
  noChatText: { fontSize: 16, color: COLORS.textSecondary },
  noChatBtn: {
    marginTop: 8, backgroundColor: COLORS.text, borderRadius: 12,
    paddingHorizontal: 24, paddingVertical: 12,
  },
  noChatBtnText: { color: "#FFF", fontSize: 15, fontWeight: "600" },
});
