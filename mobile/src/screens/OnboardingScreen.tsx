import React, { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  SafeAreaView, ActivityIndicator, KeyboardAvoidingView, Platform,
} from "react-native";
import { COLORS, SPACING } from "../constants/theme";
import * as SecureStore from "expo-secure-store";
import { api } from "../services/api";

interface Props {
  onLoginSuccess: () => void;
}

export default function OnboardingScreen({ onLoginSuccess }: Props) {
  const [step, setStep] = useState<"welcome" | "signup" | "signin">("welcome");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSignUp = async () => {
    if (!name.trim() || !email.trim() || password.length < 8) {
      setError("すべての項目を正しく入力してください（パスワードは8文字以上）");
      return;
    }
    setError(""); setLoading(true);
    try {
      const result = await api.auth.signUp(email.trim(), password, name.trim());
      await SecureStore.setItemAsync("access_token", result.access_token);
      await SecureStore.setItemAsync("user_id", result.user_id);
      if (result.refresh_token) await SecureStore.setItemAsync("refresh_token", result.refresh_token);
      onLoginSuccess();
    } catch (e: any) { setError(e.message || "登録に失敗しました"); }
    finally { setLoading(false); }
  };

  const handleSignIn = async () => {
    if (!email.trim() || !password) { setError("メールアドレスとパスワードを入力してください"); return; }
    setError(""); setLoading(true);
    try {
      const result = await api.auth.signIn(email.trim(), password);
      await SecureStore.setItemAsync("access_token", result.access_token);
      await SecureStore.setItemAsync("user_id", result.user_id);
      if (result.refresh_token) await SecureStore.setItemAsync("refresh_token", result.refresh_token);
      onLoginSuccess();
    } catch (e: any) { setError(e.message || "ログインに失敗しました"); }
    finally { setLoading(false); }
  };

  if (step === "welcome") {
    return (
      <SafeAreaView style={s.container}>
        <View style={s.welcome}>
          <View style={s.logoWrap}>
            <View style={s.logoDot} />
            <Text style={s.logoText}>haru</Text>
          </View>
          <Text style={s.tagline}>いつでもそこにいる、唯一の親友</Text>
          <Text style={s.desc}>
            愚痴も、恋バナも、しんどい話も。{"\n"}否定しないで、ただ聞いてくれる。
          </Text>
          <TouchableOpacity style={s.primaryBtn} onPress={() => setStep("signup")}>
            <Text style={s.primaryBtnText}>はじめる</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setStep("signin")} style={s.ghostBtn}>
            <Text style={s.ghostBtnText}>ログイン</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const isSignup = step === "signup";
  return (
    <SafeAreaView style={s.container}>
      <KeyboardAvoidingView style={s.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View style={s.form}>
          <TouchableOpacity onPress={() => setStep("welcome")} style={s.back}>
            <Text style={s.backText}>← 戻る</Text>
          </TouchableOpacity>
          <Text style={s.formTitle}>{isSignup ? "アカウント作成" : "ログイン"}</Text>
          {isSignup && (
            <TextInput style={s.input} placeholder="名前" placeholderTextColor={COLORS.textSecondary}
              value={name} onChangeText={setName} />
          )}
          <TextInput style={s.input} placeholder="メールアドレス" placeholderTextColor={COLORS.textSecondary}
            value={email} onChangeText={setEmail} keyboardType="email-address"
            autoCapitalize="none" autoCorrect={false} />
          <TextInput style={s.input} placeholder={isSignup ? "パスワード（8文字以上）" : "パスワード"}
            placeholderTextColor={COLORS.textSecondary} value={password}
            onChangeText={setPassword} secureTextEntry />
          {error ? <Text style={s.error}>{error}</Text> : null}
          <TouchableOpacity style={[s.primaryBtn, loading && s.disabled]}
            onPress={isSignup ? handleSignUp : handleSignIn} disabled={loading}>
            {loading ? <ActivityIndicator color="#FFF" /> : <Text style={s.primaryBtnText}>{isSignup ? "登録する" : "ログイン"}</Text>}
          </TouchableOpacity>
          <TouchableOpacity onPress={() => { setStep(isSignup ? "signin" : "signup"); setError(""); }} style={s.ghostBtn}>
            <Text style={s.ghostBtnText}>{isSignup ? "ログインはこちら" : "新規登録はこちら"}</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  flex: { flex: 1 },
  welcome: { flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: SPACING.xl },
  logoWrap: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: SPACING.lg },
  logoDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: COLORS.accent1 },
  logoText: { fontSize: 36, fontWeight: "800", color: COLORS.text, letterSpacing: 2 },
  tagline: { fontSize: 15, color: COLORS.textSecondary, marginBottom: SPACING.md, letterSpacing: 0.3 },
  desc: { fontSize: 15, color: COLORS.textSecondary, textAlign: "center", lineHeight: 26, marginBottom: SPACING.xl },
  primaryBtn: {
    backgroundColor: COLORS.text, width: "100%", paddingVertical: 16,
    borderRadius: 14, alignItems: "center", marginBottom: SPACING.sm,
  },
  primaryBtnText: { color: "#FFF", fontSize: 16, fontWeight: "700" },
  ghostBtn: { paddingVertical: 12, alignItems: "center" },
  ghostBtnText: { color: COLORS.textSecondary, fontSize: 14 },
  disabled: { opacity: 0.5 },
  form: { flex: 1, justifyContent: "center", paddingHorizontal: SPACING.lg },
  back: { marginBottom: SPACING.lg },
  backText: { fontSize: 14, color: COLORS.textSecondary },
  formTitle: { fontSize: 26, fontWeight: "700", color: COLORS.text, marginBottom: SPACING.lg },
  input: {
    backgroundColor: COLORS.subBg, borderRadius: 12, paddingHorizontal: SPACING.md,
    paddingVertical: 14, fontSize: 16, color: COLORS.text, marginBottom: SPACING.sm,
  },
  error: { color: COLORS.error, fontSize: 13, marginBottom: SPACING.sm },
});
