import React, { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, ActivityIndicator } from "react-native";
import { COLORS } from "../constants/theme";
import * as SecureStore from "expo-secure-store";
import { api } from "../services/api";

import OnboardingScreen from "../screens/OnboardingScreen";
import CharacterGenerateScreen from "../screens/CharacterGenerateScreen";
import CharacterListScreen from "../screens/CharacterListScreen";
import ChatScreen from "../screens/ChatScreen";
import SettingsScreen from "../screens/SettingsScreen";

type Tab = "friends" | "chat" | "settings";

interface CharacterProfile {
  id: string; name: string; gender: string; age: number;
  hometown: string; personality: string; speech_style: string;
}

export default function AppNavigator() {
  const [isAuth, setIsAuth] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showGenerate, setShowGenerate] = useState(false);
  const [characters, setCharacters] = useState<CharacterProfile[]>([]);
  const [selectedCharacter, setSelectedCharacter] = useState<CharacterProfile | null>(null);
  const [userPlan, setUserPlan] = useState("free");
  const [tab, setTab] = useState<Tab>("friends");

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
    setTab("chat");
  };

  const handleLogout = async () => {
    await SecureStore.deleteItemAsync("access_token");
    setIsAuth(false);
    setCharacters([]);
    setSelectedCharacter(null);
    setShowGenerate(false);
  };

  if (loading) {
    return <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: COLORS.background }}>
      <ActivityIndicator size="large" color={COLORS.primary} />
    </View>;
  }

  if (!isAuth) return <OnboardingScreen onLoginSuccess={handleLoginSuccess} />;
  if (showGenerate) return <CharacterGenerateScreen onCharacterCreated={handleCharacterCreated} />;

  const TABS = [
    { id: "friends" as Tab, label: "友達", emoji: "👥" },
    { id: "chat" as Tab, label: selectedCharacter?.name ?? "チャット", emoji: "💬" },
    { id: "settings" as Tab, label: "設定", emoji: "⚙️" },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.background }}>
      <View style={{ flex: 1 }}>
        {tab === "friends" && (
          <CharacterListScreen
            characters={characters}
            loading={false}
            onSelectCharacter={c => { setSelectedCharacter(c); setTab("chat"); }}
            onCreateNew={() => setShowGenerate(true)}
            plan={userPlan}
          />
        )}
        {tab === "chat" && selectedCharacter && (
          <ChatScreen character={selectedCharacter} />
        )}
        {tab === "settings" && (
          <SettingsScreen onLogout={handleLogout} />
        )}
      </View>

      <View style={{ flexDirection: "row", borderTopWidth: 1, borderTopColor: COLORS.border, backgroundColor: COLORS.surface, paddingBottom: 24, paddingTop: 8 }}>
        {TABS.map(t => (
          <TouchableOpacity key={t.id} style={{ flex: 1, alignItems: "center" }} onPress={() => setTab(t.id)}>
            <Text style={{ fontSize: 22 }}>{t.emoji}</Text>
            <Text style={{ fontSize: 11, marginTop: 2, color: tab === t.id ? COLORS.primary : COLORS.textSecondary, fontWeight: tab === t.id ? "700" : "400" }}>
              {t.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}
