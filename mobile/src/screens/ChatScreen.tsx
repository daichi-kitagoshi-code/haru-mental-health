import React, { useState, useRef, useCallback, useEffect } from "react";
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  StyleSheet, KeyboardAvoidingView, Platform, Animated, Linking,
} from "react-native";
import CharacterAvatar from "../components/CharacterAvatar";
import { SafeAreaView } from "react-native-safe-area-context";
import { C, FLAT } from "../constants/colors";
import { FONT, SIZE, SP, RADIUS } from "../constants/typography";
import { api, ApiError } from "../services/api";
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

// ── Flat typing indicator ──────────────────────────────────────────────────
function TypingDots() {
  const opacities = [
    useRef(new Animated.Value(0.3)).current,
    useRef(new Animated.Value(0.3)).current,
    useRef(new Animated.Value(0.3)).current,
  ];

  useEffect(() => {
    const anims = opacities.map((o, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 180),
          Animated.timing(o, { toValue: 1, duration: 240, useNativeDriver: true }),
          Animated.timing(o, { toValue: 0.3, duration: 240, useNativeDriver: true }),
          Animated.delay(360),
        ])
      )
    );
    anims.forEach(a => a.start());
    return () => anims.forEach(a => a.stop());
  }, []);

  return (
    <View style={ty.wrap}>
      {opacities.map((o, i) => (
        <Animated.View key={i} style={[ty.dot, { opacity: o }]} />
      ))}
    </View>
  );
}

const QUICK_REPLIES = ["うん、そうだね", "ありがとう！", "どうして？", "もう少し聞かせて"];

export default function ChatScreen({ character, onBack }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [slowResponse, setSlowResponse] = useState(false);   // shown after 10s
  const flatListRef = useRef<FlatList>(null);
  const slowTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setMessages([{
      id: "greeting",
      role: "assistant",
      content: `${character.name}だよ。何でも話してね 😊`,
      ts: Date.now(),
    }]);
  }, [character.id]);

  // ── レート制限：最大90秒サイレントリトライ ──────────────────────────
  // ユーザーには一切エラーを見せず、タイピングインジケーターを表示し続ける。
  const RATE_RETRY_DELAYS_MS = [500, 1000, 2000, 3000, 5000, 5000, 5000, 8000, 10000, 10000];
  const RATE_RETRY_MAX_MS    = 90_000; // 90秒でギブアップ

  const sendWithRateRetry = async (msg: string): Promise<any> => {
    const t0 = Date.now();
    let attempt = 0;
    let lastErr: unknown;

    while (true) {
      try {
        return await api.chat.sendMessage(msg, character.id);
      } catch (err) {
        lastErr = err;

        // rate_limit 以外は即座に再スロー
        if (!(err instanceof ApiError && err.kind === "rate_limit")) throw err;

        const elapsed = Date.now() - t0;
        if (elapsed >= RATE_RETRY_MAX_MS) {
          console.warn(`[ChatScreen] rate_limit: giving up after ${elapsed}ms`);
          throw err;
        }

        const delay = RATE_RETRY_DELAYS_MS[Math.min(attempt, RATE_RETRY_DELAYS_MS.length - 1)];
        console.log(`[ChatScreen] rate_limit → retry #${attempt + 1} in ${delay}ms (${elapsed}ms elapsed)`);
        await new Promise(r => setTimeout(r, delay));
        attempt++;
      }
    }
  };

  // エラー種別 → ユーザー向けメッセージ
  const errorMessage = (err: unknown): string => {
    if (err instanceof ApiError) {
      console.error(`[ChatScreen] ApiError kind=${err.kind} status=${err.status} msg=${err.message}`);
      switch (err.kind) {
        case "rate_limit": return "ちょっと通信が不安定みたい、もう一回送ってみてくれる？";
        case "timeout":    return "返事に時間がかかりすぎちゃった、もう一回送ってみて ⏳";
        case "network":    return "ネットがつながってないかも、確認してみて 📡";
        case "auth":       return "ログインが切れたかも、一度アプリを再起動してみて";
        default:           return "ちょっとサーバー側で問題があったみたい、もう一回試してみて";
      }
    }
    console.error("[ChatScreen] unknown error:", err);
    return "うまく送れなかった、もう一回試してみて";
  };

  const sendMessage = useCallback(async (text?: string) => {
    const msg = (text ?? inputText).trim();
    if (!msg || isLoading) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      content: msg,
      ts: Date.now(),
    };
    setMessages(prev => [...prev, userMsg]);
    setInputText("");
    setIsLoading(true);
    setSlowResponse(false);

    // 10秒後に「もう少し待ってね」を表示
    slowTimer.current = setTimeout(() => {
      console.log("[ChatScreen] slow response threshold reached (10s)");
      setSlowResponse(true);
    }, 10_000);

    console.log(`[ChatScreen] sending message (${msg.length} chars) to char=${character.id}`);
    const t0 = Date.now();

    try {
      const resp = await sendWithRateRetry(msg);
      console.log(`[ChatScreen] reply received in ${Date.now() - t0}ms, crisis_level=${resp.crisis_level}`);

      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: resp.reply,
        crisisResources: resp.crisis_resources,
        ts: Date.now(),
      }]);
    } catch (err) {
      const errMsg = errorMessage(err);
      console.warn(`[ChatScreen] error after ${Date.now() - t0}ms → "${errMsg}"`);

      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: errMsg,
        ts: Date.now(),
      }]);
    } finally {
      if (slowTimer.current) clearTimeout(slowTimer.current);
      setIsLoading(false);
      setSlowResponse(false);
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
            <View style={s.avatarWrap}>
              <CharacterAvatar uri={character.avatar_url} name={character.name} size={34} />
            </View>
          )}

          {/* Flat bubble */}
          <View style={isUser ? s.userBubbleOuter : s.aiBubbleOuter}>
            {/* flat shadow layer */}
            <View style={isUser ? s.userShadow : s.aiShadow} />
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
        </View>
      </>
    );
  };

  const showQuickReplies = messages.length <= 2 && !isLoading;

  return (
    <SafeAreaView style={s.container} edges={["top"]}>
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <View style={s.header}>
        <TouchableOpacity
          onPress={onBack}
          style={s.backBtn}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <View style={s.backShadow} />
          <View style={s.backInner}>
            <ChevronLeft size={18} color={C.ink} strokeWidth={2.5} />
          </View>
        </TouchableOpacity>

        <View style={s.headerCenter}>
          <View style={s.headerAvatarWrap}>
            <CharacterAvatar uri={character.avatar_url} name={character.name} size={42} />
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
            <View>
              <View style={s.rowLeft}>
                <View style={s.avatarWrap}>
                  <CharacterAvatar uri={character.avatar_url} name={character.name} size={34} />
                </View>
                <TypingDots />
              </View>
              {slowResponse && (
                <Text style={s.slowMsg}>
                  少し時間がかかってるよ、もう少し待ってね ☕
                </Text>
              )}
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
                activeOpacity={0.75}
              >
                <View style={s.quickShadow} />
                <View style={s.quickInner}>
                  <Text style={s.quickText}>{q}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* ── Input bar ───────────────────────────────────────────────── */}
        <View style={s.inputBar}>
          <View style={s.inputWrap}>
            <TextInput
              style={s.input}
              value={inputText}
              onChangeText={setInputText}
              placeholder="メッセージを送る"
              placeholderTextColor={C.ink3}
              multiline
              maxLength={2000}
              returnKeyType="default"
            />
          </View>

          <TouchableOpacity
            onPress={() => sendMessage()}
            disabled={!inputText.trim() || isLoading}
            activeOpacity={0.8}
            style={s.sendBtnWrap}
          >
            <View style={[s.sendShadow, (!inputText.trim() || isLoading) && s.sendDisabledShadow]} />
            <View style={[s.sendBtn, (!inputText.trim() || isLoading) && s.sendDisabled]}>
              <Text style={s.sendArrow}>↑</Text>
            </View>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ── Typing dots styles ─────────────────────────────────────────────────────
const ty = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    gap: 5,
    backgroundColor: C.white,
    borderWidth: 2,
    borderColor: C.ink,
    borderRadius: 16,
    borderBottomLeftRadius: 4,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginVertical: 2,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: C.ink2,
  },
});

const BUBBLE_SHADOW = 3;

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.mist },

  // ── Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: SP.md,
    paddingVertical: 10,
    borderBottomWidth: 2,
    borderBottomColor: C.ink,
    backgroundColor: C.white,
    gap: SP.sm,
  },
  backBtn: { position: "relative", width: 36, height: 36, marginBottom: BUBBLE_SHADOW },
  backShadow: {
    position: "absolute",
    top: BUBBLE_SHADOW,
    left: BUBBLE_SHADOW,
    right: -BUBBLE_SHADOW,
    bottom: -BUBBLE_SHADOW,
    backgroundColor: C.ink,
    borderRadius: 10,
  },
  backInner: {
    position: "absolute",
    inset: 0,
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: C.ink,
    backgroundColor: C.white,
    justifyContent: "center",
    alignItems: "center",
  },
  headerCenter: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  headerAvatarWrap: { position: "relative" },
  onlineDot: {
    position: "absolute", bottom: 1, right: 1,
    width: 10, height: 10, borderRadius: 5,
    backgroundColor: C.sage, borderWidth: 1.5, borderColor: C.white,
  },
  headerName: { fontFamily: FONT.syneBold, fontSize: SIZE.body1, color: C.ink },
  headerOnline: { fontFamily: FONT.syne, fontSize: SIZE.caption, color: C.sage, marginTop: 1 },

  // ── List
  list: { paddingHorizontal: SP.md, paddingTop: SP.md, paddingBottom: SP.sm },
  ts: {
    textAlign: "center",
    fontFamily: FONT.sans,
    fontSize: SIZE.label,
    color: C.ink3,
    marginVertical: 12,
  },
  slowMsg: {
    textAlign: "center",
    fontFamily: FONT.regular,
    fontSize: SIZE.small,
    color: C.ink2,
    marginTop: SP.sm,
    marginBottom: SP.xs,
    paddingHorizontal: SP.xl,
  },
  row: {
    flexDirection: "row",
    marginVertical: 4,
    alignItems: "flex-end",
  },
  rowLeft: { justifyContent: "flex-start" },
  rowRight: { justifyContent: "flex-end" },

  avatarWrap: { marginRight: 8, marginBottom: BUBBLE_SHADOW },

  // ── Flat bubble wrappers
  userBubbleOuter: {
    position: "relative",
    marginBottom: BUBBLE_SHADOW,
    marginRight: BUBBLE_SHADOW,
    maxWidth: "78%",
  },
  aiBubbleOuter: {
    position: "relative",
    marginBottom: BUBBLE_SHADOW,
    marginLeft: BUBBLE_SHADOW,
    maxWidth: "78%",
  },
  userShadow: {
    position: "absolute",
    top: BUBBLE_SHADOW,
    left: BUBBLE_SHADOW,
    right: -BUBBLE_SHADOW,
    bottom: -BUBBLE_SHADOW,
    backgroundColor: C.coralD,
    borderRadius: 16,
    borderBottomRightRadius: 4,
  },
  aiShadow: {
    position: "absolute",
    top: BUBBLE_SHADOW,
    left: BUBBLE_SHADOW,
    right: -BUBBLE_SHADOW,
    bottom: -BUBBLE_SHADOW,
    backgroundColor: C.ink,
    borderRadius: 16,
    borderBottomLeftRadius: 4,
  },
  bubble: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 2,
  },
  userBubble: {
    backgroundColor: C.coral,
    borderColor: C.coralD,
    borderRadius: 16,
    borderBottomRightRadius: 4,
  },
  aiBubble: {
    backgroundColor: C.white,
    borderColor: C.ink,
    borderRadius: 16,
    borderBottomLeftRadius: 4,
  },
  bubbleText: { fontFamily: FONT.regular, fontSize: SIZE.body, lineHeight: SIZE.body * 1.6 },
  userText: { color: C.white },
  aiText: { color: C.ink },

  // Crisis
  crisis: {
    marginTop: 8, paddingTop: 8,
    borderTopWidth: 1, borderTopColor: C.line,
  },
  crisisTitle: { fontFamily: FONT.medium, fontSize: SIZE.caption, color: C.ink2, marginBottom: 4 },
  crisisLink: { fontFamily: FONT.regular, fontSize: SIZE.small, color: C.coral },

  // ── Quick replies
  quickWrap: {
    flexDirection: "row", flexWrap: "wrap", gap: 6,
    paddingHorizontal: SP.md, paddingBottom: SP.sm,
  },
  quickChip: { position: "relative", marginBottom: BUBBLE_SHADOW, marginRight: BUBBLE_SHADOW },
  quickShadow: {
    position: "absolute",
    top: BUBBLE_SHADOW, left: BUBBLE_SHADOW,
    right: -BUBBLE_SHADOW, bottom: -BUBBLE_SHADOW,
    backgroundColor: C.ink, borderRadius: RADIUS.pill,
  },
  quickInner: {
    borderWidth: 2, borderColor: C.ink, borderRadius: RADIUS.pill,
    paddingHorizontal: 14, paddingVertical: 7,
    backgroundColor: C.white,
  },
  quickText: { fontFamily: FONT.syne, fontSize: SIZE.small, color: C.ink },

  // ── Input bar
  inputBar: {
    flexDirection: "row", alignItems: "flex-end", gap: SP.sm,
    paddingHorizontal: SP.md, paddingTop: SP.sm,
    paddingBottom: Platform.OS === "ios" ? 28 : SP.md,
    backgroundColor: C.white,
    borderTopWidth: 2, borderTopColor: C.ink,
  },
  inputWrap: {
    flex: 1,
    borderWidth: 2, borderColor: C.ink, borderRadius: 20,
    backgroundColor: C.white, overflow: "hidden",
  },
  input: {
    paddingHorizontal: SP.md, paddingVertical: 11,
    fontFamily: FONT.regular, fontSize: SIZE.body, color: C.ink,
    maxHeight: 120, lineHeight: SIZE.body * 1.5,
  },
  sendBtnWrap: {
    position: "relative",
    width: 42, height: 42,
    marginBottom: BUBBLE_SHADOW,
  },
  sendShadow: {
    position: "absolute",
    top: BUBBLE_SHADOW, left: BUBBLE_SHADOW,
    right: -BUBBLE_SHADOW, bottom: -BUBBLE_SHADOW,
    backgroundColor: C.coralD, borderRadius: 21,
  },
  sendDisabledShadow: { backgroundColor: C.ink3 },
  sendBtn: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: C.coral,
    borderWidth: 2, borderColor: C.coralD,
    justifyContent: "center", alignItems: "center",
  },
  sendDisabled: { backgroundColor: C.mist, borderColor: C.ink3 },
  sendArrow: { color: C.white, fontSize: 18, fontFamily: FONT.syneBold, marginTop: -1 },
});
