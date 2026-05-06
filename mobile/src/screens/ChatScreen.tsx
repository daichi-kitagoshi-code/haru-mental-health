import React, { useState, useRef, useCallback, useEffect } from "react";
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  StyleSheet, KeyboardAvoidingView, Platform, Animated, Image, Linking,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { C, GRAD } from "../constants/colors";
import { FONT, SIZE, SP, RADIUS, SHADOW } from "../constants/typography";
import { api } from "../services/api";
import { ChevronLeft } from "lucide-react-native";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  crisisResources?: string[];
  ts: number;
};

export interface CharacterProfile {
  id: string;
  name: string;
  gender: string;
  age: number;
  hometown: string;
  personality: string;
  speech_style: string;
  occupation?: string;
  current_city?: string;
  avatar_url?: string;
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

function TypingDots() {
  const scales = [
    useRef(new Animated.Value(1)).current,
    useRef(new Animated.Value(1)).current,
    useRef(new Animated.Value(1)).current,
  ];
  const opacities = [
    useRef(new Animated.Value(0.4)).current,
    useRef(new Animated.Value(0.4)).current,
    useRef(new Animated.Value(0.4)).current,
  ];

  useEffect(() => {
    const anims = scales.map((s, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 160),
          Animated.parallel([
            Animated.timing(s, { toValue: 1.4, duration: 220, useNativeDriver: true }),
            Animated.timing(opacities[i], { toValue: 1, duration: 220, useNativeDriver: true }),
          ]),
          Animated.parallel([
            Animated.timing(s, { toValue: 1, duration: 220, useNativeDriver: true }),
            Animated.timing(opacities[i], { toValue: 0.4, duration: 220, useNativeDriver: true }),
          ]),
          Animated.delay(320),
        ])
      )
    );
    anims.forEach(a => a.start());
    return () => anims.forEach(a => a.stop());
  }, []);

  return (
    <View style={ty.wrap}>
      {scales.map((s, i) => (
        <Animated.View
          key={i}
          style={[ty.dot, { transform: [{ scale: s }], opacity: opacities[i] }]}
        />
      ))}
    </View>
  );
}

const QUICK_REPLIES = ["うん、そうだね", "ありがとう！", "どうして？", "もう少し聞かせて"];

export default function ChatScreen({ character, onBack }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    setMessages([{
      id: "greeting",
      role: "assistant",
      content: `${character.name}だよ。何でも話してね 😊`,
      ts: Date.now(),
    }]);
  }, [character.id]);

  const sendMessage = useCallback(async (text?: string) => {
    const msg = (text ?? inputText).trim();
    if (!msg || isLoading) return;
    const userMsg: Message = { id: Date.now().toString(), role: "user", content: msg, ts: Date.now() };
    setMessages(prev => [...prev, userMsg]);
    setInputText("");
    setIsLoading(true);
    try {
      const resp = await api.chat.sendMessage(msg, character.id);
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: resp.reply,
        crisisResources: resp.crisis_resources,
        ts: Date.now(),
      }]);
    } catch {
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "ちょっと返せなかった…もう一回言って？",
        ts: Date.now(),
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
        {shouldShowTs(prev, item) && (
          <Text style={s.ts}>{fmtTime(item.ts)}</Text>
        )}
        <View style={[s.row, isUser ? s.rowRight : s.rowLeft]}>
          {!isUser && (
            character.avatar_url ? (
              <Image source={{ uri: character.avatar_url }} style={s.avatarImg} />
            ) : (
              <View style={s.avatar}>
                <Text style={s.avatarInitial}>{character.name[0]}</Text>
              </View>
            )
          )}
          <View style={[s.bubble, isUser ? s.userBubble : s.aiBubble]}>
            <Text style={[s.bubbleText, isUser ? s.userText : s.aiText]}>
              {item.content}
            </Text>
            {item.crisisResources && item.crisisResources.length > 0 && (
              <View style={s.crisis}>
                <Text style={s.crisisTitle}>もし辛くなったら</Text>
                {item.crisisResources.map((r, i) => (
                  <TouchableOpacity
                    key={i}
                    onPress={() => Linking.openURL(`tel:${r.split(/[（(]/)[0].trim()}`)}
                  >
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

  const showQuickReplies = messages.length <= 2 && !isLoading;

  return (
    <SafeAreaView style={s.container} edges={["top"]}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity
          onPress={onBack}
          style={s.backBtn}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <ChevronLeft size={20} color={C.text} strokeWidth={2} />
        </TouchableOpacity>

        <View style={s.headerCenter}>
          <View style={s.avatarWrap}>
            {character.avatar_url ? (
              <Image source={{ uri: character.avatar_url }} style={s.headerAvatarImg} />
            ) : (
              <View style={s.headerAvatar}>
                <Text style={s.headerAvatarInitial}>{character.name[0]}</Text>
              </View>
            )}
            <View style={s.onlineDot} />
          </View>
          <View>
            <Text style={s.headerName}>{character.name}</Text>
            <Text style={s.headerOnline}>オンライン</Text>
          </View>
        </View>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={0}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          contentContainerStyle={s.list}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
          showsVerticalScrollIndicator={false}
          ListFooterComponent={isLoading ? (
            <View style={s.rowLeft}>
              {character.avatar_url ? (
                <Image source={{ uri: character.avatar_url }} style={s.avatarImg} />
              ) : (
                <View style={s.avatar}>
                  <Text style={s.avatarInitial}>{character.name[0]}</Text>
                </View>
              )}
              <TypingDots />
            </View>
          ) : null}
        />

        {/* Quick replies */}
        {showQuickReplies && (
          <View style={s.quickWrap}>
            {QUICK_REPLIES.map(q => (
              <TouchableOpacity
                key={q}
                style={s.quickChip}
                onPress={() => sendMessage(q)}
              >
                <Text style={s.quickText}>{q}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Input bar */}
        <View style={s.inputBar}>
          <TextInput
            style={s.input}
            value={inputText}
            onChangeText={setInputText}
            placeholder="メッセージ"
            placeholderTextColor={C.textTertiary}
            multiline
            maxLength={2000}
            returnKeyType="default"
          />
          <TouchableOpacity
            onPress={() => sendMessage()}
            disabled={!inputText.trim() || isLoading}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={GRAD}
              style={[s.sendBtn, (!inputText.trim() || isLoading) && s.sendDisabled]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Text style={s.sendArrow}>↑</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const ty = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    gap: 5,
    backgroundColor: C.bgSecondary,
    borderRadius: 18,
    borderBottomLeftRadius: 4,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginVertical: 2,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: C.textSecondary,
  },
});

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: SP.md,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: C.border,
    backgroundColor: C.bg,
    gap: SP.sm,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: C.bgSecondary,
    justifyContent: "center",
    alignItems: "center",
  },
  headerCenter: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  avatarWrap: { position: "relative" },
  headerAvatarImg: {
    width: 38,
    height: 38,
    borderRadius: 19,
  },
  headerAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: C.accentSoft,
    justifyContent: "center",
    alignItems: "center",
  },
  headerAvatarInitial: {
    fontFamily: FONT.bold,
    fontSize: SIZE.body1,
    color: C.accent,
  },
  onlineDot: {
    position: "absolute",
    bottom: 1,
    right: 1,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: C.online,
    borderWidth: 1.5,
    borderColor: C.bg,
  },
  headerName: {
    fontFamily: FONT.bold,
    fontSize: SIZE.body1,
    color: C.text,
  },
  headerOnline: {
    fontFamily: FONT.regular,
    fontSize: SIZE.caption,
    color: C.online,
    marginTop: 1,
  },

  // List
  list: {
    paddingHorizontal: SP.md,
    paddingTop: SP.md,
    paddingBottom: SP.sm,
  },
  ts: {
    textAlign: "center",
    fontFamily: FONT.regular,
    fontSize: SIZE.label,
    color: C.textTertiary,
    marginVertical: 12,
  },
  row: {
    flexDirection: "row",
    marginVertical: 2,
    alignItems: "flex-end",
  },
  rowLeft: { justifyContent: "flex-start" },
  rowRight: { justifyContent: "flex-end" },
  avatarImg: {
    width: 28,
    height: 28,
    borderRadius: 14,
    marginRight: 6,
    marginBottom: 2,
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: C.accentSoft,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 6,
    marginBottom: 2,
  },
  avatarInitial: {
    fontFamily: FONT.bold,
    fontSize: SIZE.label,
    color: C.accent,
  },

  // Bubbles
  bubble: {
    maxWidth: "78%",
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  userBubble: {
    backgroundColor: C.black,
    borderRadius: 18,
    borderBottomRightRadius: 4,
  },
  aiBubble: {
    backgroundColor: C.bgSecondary,
    borderRadius: 4,
    borderTopRightRadius: 18,
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 18,
  },
  bubbleText: {
    fontFamily: FONT.regular,
    fontSize: SIZE.body,
    lineHeight: SIZE.body * 1.6,
  },
  userText: { color: C.white },
  aiText: { color: C.text },

  // Crisis
  crisis: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: C.border,
  },
  crisisTitle: {
    fontFamily: FONT.medium,
    fontSize: SIZE.caption,
    color: C.textSecondary,
    marginBottom: 4,
  },
  crisisLink: {
    fontFamily: FONT.regular,
    fontSize: SIZE.small,
    color: C.accent,
  },

  // Quick replies
  quickWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: SP.xs,
    paddingHorizontal: SP.md,
    paddingBottom: SP.sm,
  },
  quickChip: {
    backgroundColor: C.bg,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: RADIUS.pill,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  quickText: {
    fontFamily: FONT.regular,
    fontSize: SIZE.small,
    color: C.text,
  },

  // Input
  inputBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: SP.sm,
    paddingHorizontal: SP.md,
    paddingTop: SP.sm,
    paddingBottom: Platform.OS === "ios" ? 28 : SP.md,
    backgroundColor: C.bg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: C.border,
  },
  input: {
    flex: 1,
    backgroundColor: C.bgSecondary,
    borderRadius: RADIUS.pill,
    paddingHorizontal: SP.md,
    paddingVertical: 11,
    fontFamily: FONT.regular,
    fontSize: SIZE.body,
    color: C.text,
    maxHeight: 120,
    lineHeight: SIZE.body * 1.5,
  },
  sendBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: "center",
    alignItems: "center",
    ...SHADOW.medium,
  },
  sendArrow: {
    color: C.white,
    fontSize: 18,
    fontWeight: "700",
    marginTop: -1,
  },
  sendDisabled: { opacity: 0.35 },
});
