import React, { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  SafeAreaView, ActivityIndicator,
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
    setError("");
    setLoading(true);
    try {
      const result = await api.auth.signUp(email.trim(), password, name.trim());
      await SecureStore.setItemAsync("access_token", result.access_token);
      await SecureStore.setItemAsync("user_id", result.user_id);
      onLoginSuccess();
    } catch (e: any) {
      setError(e.message || "登録に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async () => {
    if (!email.trim() || !password) {
      setError("メールアドレスとパスワードを入力してください");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const result = await api.auth.signIn(email.trim(), password);
      await SecureStore.setItemAsync("access_token", result.access_token);
      await SecureStore.setItemAsync("user_id", result.user_id);
      onLoginSuccess();
    } catch (e: any) {
      setError(e.message || "ログインに失敗しました");
    } finally {
      setLoading(false);
    }
  };

  if (step === "welcome") {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.welcomeContent}>
          <Text style={styles.logo}>🌸</Text>
          <Text style={styles.appName}>ハル</Text>
          <Text style={styles.tagline}>いつでもそこにいる、唯一の親友</Text>
          <Text style={styles.description}>
            愚痴も、恋バナも、しんどい話も。{"\n"}
            否定しないで、ただ聞いてくれる。{"\n"}
            そんな友達が、ここにいるよ。
          </Text>
          <TouchableOpacity style={styles.primaryButton} onPress={() => setStep("signup")}>
            <Text style={styles.primaryButtonText}>はじめる</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryButton} onPress={() => setStep("signin")}>
            <Text style={styles.secondaryButtonText}>すでにアカウントをお持ちの方</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const isSignup = step === "signup";

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.formContent}>
        <Text style={styles.formTitle}>{isSignup ? "アカウント作成" : "ログイン"}</Text>

        {isSignup && (
          <TextInput
            style={styles.input}
            placeholder="名前（ハルがこの名前で呼ぶよ）"
            placeholderTextColor={COLORS.textLight}
            value={name}
            onChangeText={setName}
          />
        )}
        <TextInput
          style={styles.input}
          placeholder="メールアドレス"
          placeholderTextColor={COLORS.textLight}
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
        />
        <TextInput
          style={styles.input}
          placeholder={isSignup ? "パスワード（8文字以上）" : "パスワード"}
          placeholderTextColor={COLORS.textLight}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <TouchableOpacity
          style={[styles.primaryButton, loading && styles.buttonDisabled]}
          onPress={isSignup ? handleSignUp : handleSignIn}
          disabled={loading}
        >
          {loading
            ? <ActivityIndicator color="#FFF" />
            : <Text style={styles.primaryButtonText}>{isSignup ? "登録する" : "ログイン"}</Text>
          }
        </TouchableOpacity>

        <TouchableOpacity style={styles.secondaryButton} onPress={() => { setStep(isSignup ? "signin" : "signup"); setError(""); }}>
          <Text style={styles.secondaryButtonText}>
            {isSignup ? "アカウントをお持ちの方はこちら" : "新規登録はこちら"}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  welcomeContent: { flex: 1, justifyContent: "center", alignItems: "center", padding: SPACING.xl },
  logo: { fontSize: 64, marginBottom: SPACING.md },
  appName: { fontSize: 36, fontWeight: "800", color: COLORS.text, marginBottom: SPACING.sm },
  tagline: { fontSize: 16, color: COLORS.primaryDark, marginBottom: SPACING.lg },
  description: { fontSize: 15, color: COLORS.textSecondary, textAlign: "center", lineHeight: 24, marginBottom: SPACING.xl },
  primaryButton: { backgroundColor: COLORS.primary, paddingHorizontal: SPACING.xl, paddingVertical: SPACING.md, borderRadius: 25, width: "100%", alignItems: "center", marginBottom: SPACING.sm },
  primaryButtonText: { color: "#FFF", fontSize: 17, fontWeight: "700" },
  secondaryButton: { marginTop: SPACING.sm, alignItems: "center", paddingVertical: SPACING.sm },
  secondaryButtonText: { color: COLORS.textSecondary, fontSize: 14 },
  formContent: { flex: 1, justifyContent: "center", padding: SPACING.xl },
  formTitle: { fontSize: 24, fontWeight: "700", color: COLORS.text, marginBottom: SPACING.lg, textAlign: "center" },
  input: { backgroundColor: COLORS.surface, borderRadius: 12, padding: SPACING.md, fontSize: 16, marginBottom: SPACING.md, color: COLORS.text },
  errorText: { color: COLORS.error, fontSize: 14, marginBottom: SPACING.md, textAlign: "center" },
  buttonDisabled: { opacity: 0.6 },
});
