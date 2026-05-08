import { useEffect } from "react";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { api } from "../services/api";

// ── SDK54 requires shouldShowBanner + shouldShowList ───────────────────────
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert:  true,
    shouldShowBanner: true,
    shouldShowList:   true,
    shouldPlaySound:  true,
    shouldSetBadge:   false,
  }),
});

/**
 * アプリ起動時にプッシュ通知のパーミッションを要求し、
 * Expo プッシュトークンをバックエンドに登録する。
 *
 * @param isAuthenticated ログイン済みの場合のみ登録処理を実行
 */
export function usePushNotifications(isAuthenticated: boolean) {
  useEffect(() => {
    if (!isAuthenticated) return;

    const run = async () => {
      try {
        await registerForPushNotifications();
      } catch (e) {
        // 開発環境・シミュレーターでは失敗することがある
        console.warn("[usePushNotifications] registration failed:", e);
      }
    };
    run();
  }, [isAuthenticated]);
}

async function registerForPushNotifications() {
  // Android 用チャンネルを先に作成
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "ハル からの通知",
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#FF4F5E",
    });
  }

  // パーミッション確認・要求
  const { status: current } = await Notifications.getPermissionsAsync();
  let finalStatus = current;
  if (current !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== "granted") {
    console.log("[usePushNotifications] permission denied");
    return;
  }

  // Expo プッシュトークン取得
  const tokenData = await Notifications.getExpoPushTokenAsync();
  console.log("[usePushNotifications] token:", tokenData.data);

  // バックエンドに登録
  await api.notifications.registerToken(tokenData.data, true);
}
