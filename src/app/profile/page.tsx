"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Camera, Trash2, KeyRound } from "lucide-react";
import { useAuth } from "@/components/providers/AuthProvider";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { api } from "@/lib/api";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";

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

export default function ProfilePage() {
  const { user, loading: authLoading, updateUser } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [savingPhoto, setSavingPhoto] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

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
      </div>
    </AppLayout>
  );
}