import React, { useState, useRef, useCallback, useEffect } from "react";
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator,
  Linking, Animated,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { COLORS, SPACING } from "../constants/theme";
import { api } from "../services/api";
import { ArrowUp, ChevronLeft } from "lucide-react-native";

type Message = {
  id: string; role: "user" | "assistant"; content: string;
  crisisResources?: string[]; ts: number;
};

export interface CharacterProfile {
  id: string; name: string; gender: string; age: number;
  hometown: string; personality: string; speech_style: string;
  occupation?: string; current_city?: string;
}

interface Props {
  character: CharacterProfile;
  onBack?: () => void;
}

function shouldShowTs(prev: Message | undefined, curr: Message) {
  if (!prev) return true;
  return curr.ts - prev.ts > 5 * 60 * 1000;
}
function fmtTime(ts: number) {
  const d = new Date(ts);
  return `${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function TypingIndicator() {
  const dots = [useRef(new Animated.Value(0)).current, useRef(new Animated.Value(0)).current, useRef(new Animated.Value(0)).current];
  useEffect(() => {
    const anims = dots.map((d, i) =>
      Animated.loop(Animated.sequence([
        Animated.delay(i * 150),
        Animated.timing(d, { toValue: -6, duration: 250, useNativeDriver: true }),
        Animated.timing(d, { toValue: 0, duration: 250, useNativeDriver: true }),
        Animated.delay(450),
      ]))
    );
    anims.forEach(a => a.start());
    return () => anims.forEach(a => a.stop());
  }, []);
  return (
    <View style={ty.row}>
      {dots.map((d, i) => (
        <Animated.View key={i} style={[ty.dot, { transform: [{ translateY: d }] }]} />
      ))}
    </View>
  );
}
const ty = StyleSheet.create({
  row: {
    flexDirection: "row", gap: 5, alignSelf: "flex-start",
    backgroundColor: COLORS.aiBubble, borderRadius: 20, borderBottomLeftRadius: 4,
    paddingHorizontal: 16, paddingVertical: 14, marginVertical: 3, marginLeft: SPACING.sm,
  },
  dot: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: COLORS.accent1 },
});

export default function ChatScreen({ character, onBack }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    if (messages.length === 0) {
      setMessages([{
        id: "greeting", role: "assistant",
        content: `${character.name}だよ。何でも話してね 😊`,
        ts: Date.now(),
      }]);
    }
  }, [character.id]);

  const sendMessage = useCallback(async () => {
    if (!inputText.trim() || isLoading) return;
    const userMsg: Message = { id: Date.now().toString(), role: "user", content: inputText.trim(), ts: Date.now() };
    setMessages(prev => [...prev, userMsg]);
    setInputText(""); setIsLoading(true);
    try {
      const resp = await api.chat.sendMessage(userMsg.content, character.id);
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(), role: "assistant",
        content: resp.reply, crisisResources: resp.crisis_resources, ts: Date.now(),
      }]);
    } catch {
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(), role: "assistant",
        content: "ちょっと返せなかった…もう一回言って？", ts: Date.now(),
      }]);
    } finally {
      setIsLoading(false);
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [inputText, isLoading, character.id]);

  const renderItem = ({ item, index }: { item: Message; index: number }) => {
    const prev = index > 0 ? messages[index - 1] : undefined;
    const isUser = item.role === "user";
    return (
      <>
        {shouldShowTs(prev, item) && <Text style={s.ts}>{fmtTime(item.ts)}</Text>}
        <View style={[s.row, isUser ? s.rowRight : s.rowLeft]}>
          {!isUser && (
            <View style={s.avatar}>
              <Text style={s.avatarText}>{character.name[0]}</Text>
            </View>
          )}
          <View style={[s.bubble, isUser ? s.userBubble : s.aiBubble]}>
            <Text style={[s.bubbleText, isUser ? s.userText : s.aiText]}>{item.content}</Text>
            {item.crisisResources && item.crisisResources.length > 0 && (
              <View style={s.crisis}>
                <Text style={s.crisisTitle}>もし辛くなったら</Text>
                {item.crisisResources.map((r, i) => (
                  <TouchableOpacity key={i} onPress={() => Linking.openURL(`tel:${r.split(/[（(]/)[0].trim()}`)}>
                    <Text style={s.crisisLink}>{r}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        </View>
      </>
    );
  };

  const location = character.current_city || character.hometown;

  return (
    <SafeAreaView style={s.container} edges={["top"]}>
      <View style={s.header}>
        {onBack && (
          <TouchableOpacity onPress={onBack} style={s.backBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <ChevronLeft size={22} color={COLORS.text} strokeWidth={1.5} />
          </TouchableOpacity>
        )}
        <View style={s.headerCenter}>
          <View style={s.headerAvatar}>
            <Text style={s.headerAvatarText}>{character.name[0]}</Text>
          </View>
          <View>
            <Text style={s.headerName}>{character.name}</Text>
            <Text style={s.headerSub}>{character.age}歳 · {location}</Text>
          </View>
        </View>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={0}>
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          contentContainerStyle={s.list}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
          showsVerticalScrollIndicator={false}
          ListFooterComponent={isLoading ? <TypingIndicator /> : null}
        />

        <View style={s.inputBar}>
          <TextInput
            style={s.input}
            value={inputText}
            onChangeText={setInputText}
            placeholder="メッセージ"
            placeholderTextColor={COLORS.textSecondary}
            multiline maxLength={2000}
          />
          <TouchableOpacity
            style={[s.sendBtnWrap, (!inputText.trim() || isLoading) && s.sendDisabled]}
            onPress={sendMessage}
            disabled={!inputText.trim() || isLoading}
          >
            <LinearGradient
              colors={["#FF6B6B", "#FF8E53"]}
              style={s.sendBtn}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            >
              <ArrowUp size={18} color="#FFF" strokeWidth={2.5} />
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: SPACING.md, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
    backgroundColor: COLORS.bg,
  },
  backBtn: { marginRight: SPACING.sm },
  headerCenter: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1 },
  headerAvatar: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: COLORS.accent1 + "22", justifyContent: "center", alignItems: "center",
  },
  headerAvatarText: { fontSize: 15, fontWeight: "700", color: COLORS.accent1 },
  headerName: { fontSize: 15, fontWeight: "700", color: COLORS.text },
  headerSub: { fontSize: 12, color: COLORS.textSecondary },
  list: { paddingHorizontal: SPACING.md, paddingTop: SPACING.md, paddingBottom: SPACING.sm },
  ts: { textAlign: "center", fontSize: 11, color: COLORS.textSecondary, marginVertical: 12 },
  row: { flexDirection: "row", marginVertical: 2, alignItems: "flex-end" },
  rowLeft: { justifyContent: "flex-start" },
  rowRight: { justifyContent: "flex-end" },
  avatar: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: COLORS.accent1 + "22", justifyContent: "center", alignItems: "center",
    marginRight: 6, marginBottom: 2,
  },
  avatarText: { fontSize: 11, fontWeight: "700", color: COLORS.accent1 },
  bubble: { maxWidth: "78%", paddingHorizontal: 14, paddingVertical: 10 },
  userBubble: { backgroundColor: COLORS.userBubble, borderRadius: 20, borderBottomRightRadius: 4 },
  aiBubble: { backgroundColor: COLORS.aiBubble, borderRadius: 20, borderBottomLeftRadius: 4 },
  bubbleText: { fontSize: 16, lineHeight: 24 },
  userText: { color: COLORS.userBubbleText },
  aiText: { color: COLORS.aiText },
  crisis: { marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: COLORS.border },
  crisisTitle: { fontSize: 12, color: COLORS.textSecondary, marginBottom: 4 },
  crisisLink: { fontSize: 13, color: COLORS.accent2 },
  inputBar: {
    flexDirection: "row", alignItems: "flex-end", gap: SPACING.sm,
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm,
    paddingBottom: Platform.OS === "ios" ? 20 : SPACING.sm,
    backgroundColor: COLORS.bg, borderTopWidth: 1, borderTopColor: COLORS.border,
  },
  input: {
    flex: 1, backgroundColor: COLORS.subBg, borderRadius: 24,
    paddingHorizontal: SPACING.md, paddingVertical: 10,
    fontSize: 16, color: COLORS.text, maxHeight: 120, lineHeight: 22,
  },
  sendBtnWrap: { borderRadius: 20 },
  sendBtn: { width: 40, height: 40, borderRadius: 20, justifyContent: "center", alignItems: "center" },
  sendDisabled: { opacity: 0.4 },
});
