"use client";

import { useRef, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Loader2,
  Camera,
  Trash2,
  KeyRound,
  Link2,
  Unlink,
  Bell,
  BellOff,
  Copy,
  Check,
  Gift,
  Smartphone,
  Apple,
} from "lucide-react";
import { useAuth } from "@/components/providers/AuthProvider";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { api } from "@/lib/api";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Avatar } from "@/components/ui/Avatar";
import { Modal } from "@/components/ui/Modal";
import { VAPID_PUBLIC_KEY, urlBase64ToUint8Array } from "@/lib/vapid";

function compressImage(file: File, maxSize = 400): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("canvas not available"));
          return;
        }
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", 0.85));
      };
      img.onerror = () => reject(new Error("invalid image"));
      img.src = reader.result as string;
    };
    reader.onerror = () => reject(new Error("read error"));
    reader.readAsDataURL(file);
  });
}

interface LinkedProfessional {
  id: string;
  name: string;
  email: string;
}

interface ProfileLinks {
  personal: LinkedProfessional | null;
  nutritionist: LinkedProfessional | null;
}

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function isStandaloneMode() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

export default function ProfilePage() {
  const { user, loading: authLoading, updateUser } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [savingPhoto, setSavingPhoto] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const isProfessional = user?.role === "PERSONAL" || user?.role === "NUTRITIONIST";
  const isStudent = user?.role === "STUDENT";

  // Vinculo do aluno
  const [links, setLinks] = useState<ProfileLinks | null>(null);
  const [linkCode, setLinkCode] = useState("");
  const [linkType, setLinkType] = useState<"personal" | "nutritionist">("personal");
  const [linking, setLinking] = useState(false);

  // Push
  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushBusy, setPushBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [guideOpen, setGuideOpen] = useState(false);
  const [guidePlatform, setGuidePlatform] = useState<"android" | "ios">("android");
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    if (!isStudent || !user) return;
    api
      .get<{ links: ProfileLinks }>("/api/profile/link")
      .then((res) => setLinks(res.links))
      .catch(() => {});
  }, [isStudent, user]);

  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator) || !("PushManager" in window)) {
      return;
    }
    navigator.serviceWorker.ready
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => setPushEnabled(!!sub))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (isStandaloneMode() || window.localStorage.getItem("fitpro_app_installed") === "1") {
      setInstalled(true);
    }
    const onInstalled = () => {
      window.localStorage.setItem("fitpro_app_installed", "1");
      setInstalled(true);
      setMessage(t("profile.downloadInstalled"));
      setError("");
    };
    window.addEventListener("appinstalled", onInstalled);
    return () => window.removeEventListener("appinstalled", onInstalled);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const onPrompt = (e: Event) => {
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-accent animate-spin" />
      </div>
    );
  }

  if (!user) {
    router.replace("/");
    return null;
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setError(t("profile.photoTooBig"));
      setMessage("");
      return;
    }
    setSavingPhoto(true);
    setError("");
    setMessage("");
    try {
      const dataUrl = await compressImage(file);
      const res = await api.profile.update({ avatarUrl: dataUrl });
      updateUser((prev) => (prev ? { ...prev, avatarUrl: res.user.avatarUrl } : prev));
      setMessage(t("profile.photoSaved"));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t("profile.error"));
    } finally {
      setSavingPhoto(false);
    }
  }

  async function handleRemovePhoto() {
    setSavingPhoto(true);
    setError("");
    setMessage("");
    try {
      const res = await api.profile.update({ avatarUrl: null });
      updateUser((prev) => (prev ? { ...prev, avatarUrl: res.user.avatarUrl } : prev));
      setMessage(t("profile.photoRemoved"));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t("profile.error"));
    } finally {
      setSavingPhoto(false);
    }
  }

  async function handleLink() {
    if (!linkCode.trim()) return;
    setLinking(true);
    setError("");
    setMessage("");
    try {
      const res = await api.put<{ links: ProfileLinks }>("/api/profile/link", {
        code: linkCode.trim(),
        type: linkType,
      });
      setLinks(res.links);
      setLinkCode("");
      setMessage(t("profile.linkSuccess"));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t("profile.linkErrorNonProf"));
    } finally {
      setLinking(false);
    }
  }

  async function handleUnlink(type: "personal" | "nutritionist") {
    setError("");
    setMessage("");
    try {
      const res = await api.delete<{ links: ProfileLinks }>(`/api/profile/link?type=${type}`);
      setLinks(res.links);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t("profile.error"));
    }
  }

  async function handlePushToggle() {
    if (pushBusy) return;
    setPushBusy(true);
    setError("");
    setMessage("");
    try {
      if (!pushEnabled) {
        if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
          setError(t("profile.pushIosNote"));
          return;
        }
        const reg = await navigator.serviceWorker.register("/sw.js");
        const sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY).buffer as ArrayBuffer,
        });
        const p256 = sub.getKey("p256dh");
        const authRaw = sub.getKey("auth");
        if (!p256 || !authRaw) {
          setError(t("profile.pushIosNote"));
          return;
        }
        await api.post("/api/push/subscribe", {
          endpoint: sub.endpoint,
          p256dh: btoa(String.fromCharCode(...new Uint8Array(p256))),
          auth: btoa(String.fromCharCode(...new Uint8Array(authRaw))),
        });
        setPushEnabled(true);
        setMessage(t("profile.pushEnabled"));
      } else {
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.getSubscription();
        if (sub) {
          await api.delete(`/api/push/subscribe?endpoint=${encodeURIComponent(sub.endpoint)}`);
          await sub.unsubscribe();
        }
        setPushEnabled(false);
      }
    } catch (err: unknown) {
      setError(t("profile.pushIosNote"));
    } finally {
      setPushBusy(false);
    }
  }

  async function copyCode() {
    if (!user || !user.referralCode) return;
    try {
      await navigator.clipboard.writeText(user.referralCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  }

  function handleAndroidDownload() {
    if (installed) {
      setMessage(t("profile.downloadInstalled"));
      setError("");
      return;
    }
    if (deferredPrompt) {
      deferredPrompt.prompt().catch(() => {
        setGuidePlatform("android");
        setGuideOpen(true);
      });
      deferredPrompt.userChoice.finally(() => setDeferredPrompt(null));
      return;
    }
    setGuidePlatform("android");
    setGuideOpen(true);
  }

  function handleIosDownload() {
    if (installed) {
      setMessage(t("profile.downloadInstalled"));
      setError("");
      return;
    }
    setGuidePlatform("ios");
    setGuideOpen(true);
  }

  return (
    <AppLayout title={t("profile.title")}>
      <div className="max-w-xl space-y-6 animate-fadeIn">
        <div>
          <h1 className="text-2xl font-bold mb-1">{t("profile.title")}</h1>
          <p className="text-muted">{t("profile.subtitle")}</p>
        </div>

        {(error || message) && (
          <div
            className={`text-sm rounded-lg px-4 py-3 border ${
              error
                ? "bg-red-500/10 border-red-500/20 text-red-400"
                : "bg-green-500/10 border-green-500/20 text-green-400"
            }`}
          >
            {error || message}
          </div>
        )}

        <Card className="p-6">
          <div className="flex items-center gap-5">
            <Avatar src={user.avatarUrl} name={user.name} size="lg" />
            <div className="space-y-2">
              <p className="text-sm font-semibold">{t("profile.photo")}</p>
              <div className="flex flex-wrap gap-2">
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFile}
                />
                <Button
                  size="sm"
                  variant="secondary"
                  icon={<Camera className="w-3.5 h-3.5" />}
                  loading={savingPhoto}
                  disabled={savingPhoto}
                  onClick={() => fileRef.current?.click()}
                >
                  {user.avatarUrl ? t("profile.changePhoto") : t("profile.addPhoto")}
                </Button>
                {user.avatarUrl && (
                  <Button
                    size="sm"
                    variant="secondary"
                    icon={<Trash2 className="w-3.5 h-3.5" />}
                    disabled={savingPhoto}
                    onClick={handleRemovePhoto}
                  >
                    {t("profile.removePhoto")}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </Card>

        {isProfessional && user.referralCode && (
          <Card className="p-6">
            <div className="flex items-start gap-3 mb-3">
              <div className="w-9 h-9 rounded-lg bg-accent/10 flex items-center justify-center text-accent shrink-0">
                <Gift className="w-4 h-4" />
              </div>
              <div>
                <p className="text-sm font-semibold">{t("profile.referralCodeTitle")}</p>
                <p className="text-xs text-muted mt-0.5">{t("profile.referralCodeInfo")}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <code className="text-sm bg-bg border border-border rounded-md px-3 py-2 font-mono flex-1">
                {user.referralCode}
              </code>
              <Button size="sm" variant="secondary" icon={copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />} onClick={copyCode}>
                {copied ? t("common.copied") : t("common.copy")}
              </Button>
            </div>
          </Card>
        )}

        {isStudent && (
          <Card className="p-6">
            <div className="flex items-start gap-3 mb-3">
              <div className="w-9 h-9 rounded-lg bg-accent/10 flex items-center justify-center text-accent shrink-0">
                <Link2 className="w-4 h-4" />
              </div>
              <div>
                <p className="text-sm font-semibold">{t("profile.linked")}</p>
                <p className="text-xs text-muted mt-0.5">{t("profile.linkedSubtitle")}</p>
              </div>
            </div>

            <div className="space-y-3 mb-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg bg-bg border border-border p-3">
                  <p className="text-xs text-muted">{t("profile.myPersonal")}</p>
                  {links?.personal ? (
                    <div className="mt-1 flex items-center justify-between gap-2">
                      <p className="text-sm font-medium truncate">{links.personal.name}</p>
                      <button
                        onClick={() => handleUnlink("personal")}
                        className="text-muted hover:text-red-400 transition-colors"
                        title={t("profile.unlinkBtn")}
                      >
                        <Unlink className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <p className="text-sm text-muted mt-1">{t("profile.noneLinked")}</p>
                  )}
                </div>
                <div className="rounded-lg bg-bg border border-border p-3">
                  <p className="text-xs text-muted">{t("profile.myNutritionist")}</p>
                  {links?.nutritionist ? (
                    <div className="mt-1 flex items-center justify-between gap-2">
                      <p className="text-sm font-medium truncate">{links.nutritionist.name}</p>
                      <button
                        onClick={() => handleUnlink("nutritionist")}
                        className="text-muted hover:text-red-400 transition-colors"
                        title={t("profile.unlinkBtn")}
                      >
                        <Unlink className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <p className="text-sm text-muted mt-1">{t("profile.noneLinked")}</p>
                  )}
                </div>
              </div>
              <p className="text-xs text-muted">{t("profile.linkAll")}</p>
            </div>

            <div className="space-y-3">
              <Input
                label={t("auth.referralCode")}
                placeholder={t("profile.linkPlaceholder")}
                value={linkCode}
                onChange={(e) => setLinkCode(e.target.value)}
              />
              <Select
                label={t("profile.linkAs")}
                value={linkType}
                onChange={(e) => setLinkType(e.target.value as "personal" | "nutritionist")}
                options={[
                  { value: "personal", label: t("profile.myPersonal") },
                  { value: "nutritionist", label: t("profile.myNutritionist") },
                ]}
              />
              <Button icon={<Link2 className="w-4 h-4" />} onClick={handleLink} loading={linking} disabled={!linkCode.trim()}>
                {t("profile.linkBtn")}
              </Button>
            </div>
          </Card>
        )}

        <Card className="p-6">
          <div className="flex items-start gap-3 mb-3">
            <div className="w-9 h-9 rounded-lg bg-accent/10 flex items-center justify-center text-accent shrink-0">
              {pushEnabled ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
            </div>
            <div>
              <p className="text-sm font-semibold">{t("profile.pushTitle")}</p>
              <p className="text-xs text-muted mt-0.5">{t("profile.pushSubtitle")}</p>
            </div>
          </div>
          <Button
            variant={pushEnabled ? "secondary" : "primary"}
            icon={pushEnabled ? <BellOff className="w-4 h-4" /> : <Bell className="w-4 h-4" />}
            onClick={handlePushToggle}
            loading={pushBusy}
          >
            {pushEnabled ? t("profile.pushDisable") : t("profile.pushEnable")}
          </Button>
          <p className="text-xs text-muted mt-3">{t("profile.pushIosNote")}</p>
        </Card>

        <Card className="p-6">
          <div className="flex items-start gap-3 mb-3">
            <div className="w-9 h-9 rounded-lg bg-accent/10 flex items-center justify-center text-accent shrink-0">
              <Smartphone className="w-4 h-4" />
            </div>
            <div>
              <p className="text-sm font-semibold">{t("profile.downloadTitle")}</p>
              <p className="text-xs text-muted mt-0.5">{t("profile.downloadSubtitle")}</p>
            </div>
          </div>
          {installed ? (
            <div className="rounded-lg bg-green-500/10 border border-green-500/20 text-green-400 text-sm px-4 py-3 flex items-center gap-2">
              <Check className="w-4 h-4 shrink-0" />
              {t("profile.downloadInstalled")}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <Button icon={<Smartphone className="w-4 h-4" />} onClick={handleAndroidDownload}>
                {t("profile.downloadAndroid")}
              </Button>
              <Button variant="secondary" icon={<Apple className="w-4 h-4" />} onClick={handleIosDownload}>
                {t("profile.downloadIos")}
              </Button>
            </div>
          )}
        </Card>

        <Card className="p-6">
          <div className="space-y-4">
            <div>
              <p className="text-xs text-muted uppercase tracking-wide mb-1">{t("auth.name")}</p>
              <p className="font-medium">{user.name}</p>
            </div>
            <div>
              <p className="text-xs text-muted uppercase tracking-wide mb-1">{t("auth.email")}</p>
              <p className="font-medium">{user.email}</p>
            </div>
            <div className="border-t border-border pt-4">
              <Button
                variant="secondary"
                icon={<KeyRound className="w-4 h-4" />}
                onClick={() => router.push("/change-password")}
              >
                {t("header.changePassword")}
              </Button>
            </div>
          </div>
        </Card>

        <Modal
          open={guideOpen}
          onClose={() => setGuideOpen(false)}
          title={guidePlatform === "android" ? t("profile.guideAndroidTitle") : t("profile.guideIosTitle")}
        >
          <ol className="list-decimal list-inside space-y-2 text-sm text-muted">
            {(guidePlatform === "android"
              ? [
                  t("profile.guideAndroidStep1"),
                  t("profile.guideAndroidStep2"),
                  t("profile.guideAndroidStep3"),
                ]
              : [
                  t("profile.guideIosStep1"),
                  t("profile.guideIosStep2"),
                  t("profile.guideIosStep3"),
                  t("profile.guideIosStep4"),
                ]
            ).map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
          <div className="mt-5 flex justify-end">
            <Button variant="secondary" size="sm" onClick={() => setGuideOpen(false)}>
              {t("common.close")}
            </Button>
          </div>
        </Modal>
      </div>
    </AppLayout>
  );
}