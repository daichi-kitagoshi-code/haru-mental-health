import React, { useState, useRef, useCallback, useEffect } from "react";
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator, Linking,
} from "react-native";
import { COLORS, SPACING } from "../constants/theme";
import { api } from "../services/api";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  crisisLevel?: number;
  crisisResources?: string[];
};

interface CharacterProfile {
  id: string;
  name: string;
  gender: string;
  age: number;
  hometown: string;
  personality: string;
  speech_style: string;
}

interface Props {
  character: CharacterProfile;
}

export default function ChatScreen({ character }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    // Opening greeting when chat starts
    if (messages.length === 0) {
      setMessages([{
        id: "greeting",
        role: "assistant",
        content: `やあ！${character.name}だよ。何でも話してね 😊`,
      }]);
    }
  }, []);

  const sendMessage = useCallback(async () => {
    if (!inputText.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: inputText.trim(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText("");
    setIsLoading(true);

    try {
      const response = await api.chat.sendMessage(userMessage.content, character.id);
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: response.reply,
        crisisLevel: response.crisis_level,
        crisisResources: response.crisis_resources,
      }]);
    } catch (error: any) {
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: error.message || "ごめん、ちょっとうまく返事できなかった…もう一回言ってくれる？",
      }]);
    } finally {
      setIsLoading(false);
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [inputText, isLoading, character.id]);

  const renderMessage = ({ item }: { item: Message }) => (
    <View style={[styles.messageBubble, item.role === "user" ? styles.userBubble : styles.assistantBubble]}>
      <Text style={[styles.messageText, item.role === "user" ? styles.userText : styles.assistantText]}>
        {item.content}
      </Text>
      {item.crisisResources && item.crisisResources.length > 0 && (
        <View style={styles.crisisBox}>
          <Text style={styles.crisisTitle}>🆘 もし辛くなったら</Text>
          {item.crisisResources.map((resource, i) => (
            <TouchableOpacity key={i} onPress={() => Linking.openURL(`tel:${resource.split(/[（(]/)[0].trim()}`)}>
              <Text style={styles.crisisResource}>{resource}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={90}
    >
      <View style={styles.header}>
        <Text style={styles.headerName}>{character.name}</Text>
        <Text style={styles.headerDetail}>{character.age}歳・{character.hometown}</Text>
      </View>

      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={item => item.id}
        renderItem={renderMessage}
        contentContainerStyle={styles.messageList}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
      />

      {isLoading && (
        <View style={styles.typingIndicator}>
          <ActivityIndicator size="small" color={COLORS.primary} />
          <Text style={styles.typingText}>{character.name}が入力中…</Text>
        </View>
      )}

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          value={inputText}
          onChangeText={setInputText}
          placeholder="メッセージを入力..."
          placeholderTextColor={COLORS.textLight}
          multiline
          maxLength={2000}
          onSubmitEditing={sendMessage}
        />
        <TouchableOpacity
          style={[styles.sendButton, (!inputText.trim() || isLoading) && styles.sendDisabled]}
          onPress={sendMessage}
          disabled={!inputText.trim() || isLoading}
        >
          <Text style={styles.sendText}>送信</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    backgroundColor: COLORS.surface, paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md, alignItems: "center",
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  headerName: { fontSize: 17, fontWeight: "700", color: COLORS.text },
  headerDetail: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  messageList: { padding: SPACING.md, paddingBottom: SPACING.lg },
  messageBubble: { maxWidth: "80%", marginVertical: 4, padding: SPACING.md, borderRadius: 16 },
  userBubble: { alignSelf: "flex-end", backgroundColor: COLORS.primary, borderBottomRightRadius: 4 },
  assistantBubble: { alignSelf: "flex-start", backgroundColor: COLORS.surface, borderBottomLeftRadius: 4 },
  messageText: { fontSize: 15, lineHeight: 22 },
  userText: { color: "#FFF" },
  assistantText: { color: COLORS.text },
  crisisBox: { marginTop: SPACING.sm, padding: SPACING.sm, backgroundColor: "#FFF3CD", borderRadius: 8 },
  crisisTitle: { fontSize: 13, fontWeight: "600", color: "#856404", marginBottom: 4 },
  crisisResource: { fontSize: 13, color: "#0066CC", textDecorationLine: "underline", marginTop: 2 },
  typingIndicator: {
    flexDirection: "row", alignItems: "center", paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs, gap: SPACING.xs,
  },
  typingText: { fontSize: 13, color: COLORS.textSecondary },
  inputContainer: {
    flexDirection: "row", padding: SPACING.sm, borderTopWidth: 1,
    borderTopColor: COLORS.border, backgroundColor: COLORS.surface,
    alignItems: "flex-end", gap: SPACING.xs,
  },
  input: {
    flex: 1, minHeight: 40, maxHeight: 120, backgroundColor: COLORS.background,
    borderRadius: 20, paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm,
    fontSize: 15, color: COLORS.text,
  },
  sendButton: {
    backgroundColor: COLORS.primary, borderRadius: 20, paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm, justifyContent: "center",
  },
  sendDisabled: { backgroundColor: COLORS.primary + "60" },
  sendText: { color: "#FFF", fontWeight: "600", fontSize: 15 },
});
