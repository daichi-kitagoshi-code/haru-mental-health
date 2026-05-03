import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
} from "react-native";
import { COLORS, SPACING } from "../constants/theme";
import { useAuth } from "../hooks/useAuth";

type Step = "welcome" | "signup" | "character";

export default function OnboardingScreen() {
  const [step, setStep] = useState<Step>("welcome");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const { signUp, signIn } = useAuth();

  const handleSignUp = async () => {
    setError("");
    try {
      await signUp(email, password, name);
    } catch (e: any) {
      setError(e.message);
    }
  };

  const handleSignIn = async () => {
    setError("");
    try {
      await signIn(email, password);
    } catch (e: any) {
      setError(e.message);
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
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => setStep("signup")}
          >
            <Text style={styles.primaryButtonText}>はじめる</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.formContent}>
        <Text style={styles.formTitle}>アカウント作成</Text>

        <TextInput
          style={styles.input}
          placeholder="名前（ハルがこの名前で呼ぶよ）"
          placeholderTextColor={COLORS.textLight}
          value={name}
          onChangeText={setName}
        />
        <TextInput
          style={styles.input}
          placeholder="メールアドレス"
          placeholderTextColor={COLORS.textLight}
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <TextInput
          style={styles.input}
          placeholder="パスワード（8文字以上）"
          placeholderTextColor={COLORS.textLight}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <TouchableOpacity style={styles.primaryButton} onPress={handleSignUp}>
          <Text style={styles.primaryButtonText}>登録する</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.secondaryButton} onPress={handleSignIn}>
          <Text style={styles.secondaryButtonText}>
            アカウントをお持ちの方はこちら
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  welcomeContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: SPACING.xl,
  },
  logo: { fontSize: 64, marginBottom: SPACING.md },
  appName: {
    fontSize: 36,
    fontWeight: "800",
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  tagline: {
    fontSize: 16,
    color: COLORS.primaryDark,
    marginBottom: SPACING.lg,
  },
  description: {
    fontSize: 15,
    color: COLORS.textSecondary,
    textAlign: "center",
    lineHeight: 24,
    marginBottom: SPACING.xl,
  },
  primaryButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
    borderRadius: 25,
    width: "100%",
    alignItems: "center",
  },
  primaryButtonText: {
    color: "#FFF",
    fontSize: 17,
    fontWeight: "700",
  },
  formContent: {
    flex: 1,
    justifyContent: "center",
    padding: SPACING.xl,
  },
  formTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: SPACING.lg,
    textAlign: "center",
  },
  input: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: SPACING.md,
    fontSize: 16,
    marginBottom: SPACING.md,
    color: COLORS.text,
  },
  errorText: {
    color: COLORS.error,
    fontSize: 14,
    marginBottom: SPACING.md,
    textAlign: "center",
  },
  secondaryButton: {
    marginTop: SPACING.md,
    alignItems: "center",
  },
  secondaryButtonText: {
    color: COLORS.textSecondary,
    fontSize: 14,
  },
});
