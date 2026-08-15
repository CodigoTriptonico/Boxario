"use client";

import {
  BadgeCheck,
  Building2,
  Camera,
  Check,
  IdCard,
  KeyRound,
  Loader2,
  Mail,
  Pencil,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  changeMyPasswordAction,
  updateMyProfileAction,
  uploadMyProfileAvatarAction,
} from "@/app/actions/profile";
import { useSetShellConfig } from "@/components/app-frame";
import {
  iconWellEmerald,
  inputClass,
  labelMutedClass,
  primaryButtonClass,
  secondaryButtonClass,
} from "@/components/ui-blocks";
import { useNotify } from "@/hooks/use-notify";
import { formatPersonNameInput } from "@/lib/person-name";

function initials(fullName: string, email: string) {
  const parts = (fullName || email).trim().split(/\s+/).filter(Boolean);
  return parts.length > 1
    ? `${parts[0][0]}${parts[1][0]}`.toUpperCase()
    : (parts[0] || "?").slice(0, 2).toUpperCase();
}

type ProfileAccountClientProps = {
  initialAvatarUrl: string | null;
  sellerCode: number | null;
  session: {
    fullName: string | null;
    email: string;
    organizationName: string;
    roleName: string;
    permissions: string[];
  };
};

type ProfileSection = "personal" | "security" | "access";

export function ProfileAccountClient({ initialAvatarUrl, sellerCode, session }: ProfileAccountClientProps) {
  const notify = useNotify();
  const router = useRouter();
  const setShellConfig = useSetShellConfig();
  const inputRef = useRef<HTMLInputElement>(null);
  const [fullName, setFullName] = useState(session.fullName || "");
  const [savedName, setSavedName] = useState(session.fullName || "");
  const [avatarUrl, setAvatarUrl] = useState(initialAvatarUrl);
  const [savingProfile, setSavingProfile] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwords, setPasswords] = useState({ currentPassword: "", nextPassword: "", confirmation: "" });
  const [activeSection, setActiveSection] = useState<ProfileSection>("personal");

  useEffect(() => {
    setShellConfig({ contextNavLabel: "Mi perfil", compactNavLabel: "Mi perfil" });
    return () => setShellConfig({ contextNavLabel: undefined, compactNavLabel: undefined });
  }, [setShellConfig]);

  async function saveProfile(event: React.FormEvent) {
    event.preventDefault();
    setSavingProfile(true);
    const result = await updateMyProfileAction(fullName);
    setSavingProfile(false);
    if (!result.ok) {
      notify.error(result.error);
      return;
    }
    setFullName(result.data.fullName);
    setSavedName(result.data.fullName);
    router.refresh();
    notify.success("Perfil actualizado");
  }

  async function uploadAvatar(file: File | null) {
    if (!file) return;
    const formData = new FormData();
    formData.set("avatar", file);
    setUploadingAvatar(true);
    const result = await uploadMyProfileAvatarAction(formData);
    setUploadingAvatar(false);
    if (!result.ok) {
      notify.error(result.error);
      return;
    }
    setAvatarUrl(result.data.avatarUrl);
    router.refresh();
    notify.success("Foto de perfil actualizada");
  }

  async function changePassword(event: React.FormEvent) {
    event.preventDefault();
    setChangingPassword(true);
    const result = await changeMyPasswordAction(passwords);
    setChangingPassword(false);
    if (!result.ok) {
      notify.error(result.error);
      return;
    }
    setPasswords({ currentPassword: "", nextPassword: "", confirmation: "" });
    router.refresh();
    notify.success("Contraseña actualizada");
  }

  const shownName = fullName.trim() || session.email.split("@")[0];
  const shownSellerCode = sellerCode ? String(sellerCode).padStart(3, "0") : null;
  const visiblePermissions = session.permissions.includes("all")
    ? ["Acceso total a la aplicación"]
    : session.permissions.length
      ? session.permissions
      : ["Acceso según las tareas asignadas"];

  return (
    <div className="min-w-0 w-full self-stretch p-3 sm:p-5 lg:p-6">
      <main className="overflow-hidden rounded-2xl bg-surface-shell shadow-[0_18px_48px_rgba(0,0,0,0.28)]">
        <header className="relative overflow-hidden border-b border-app-border-divider bg-surface-card-header">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(52,211,153,0.16),transparent_38%)]" />
          <div className="relative flex flex-col gap-5 px-4 py-6 sm:flex-row sm:items-center sm:px-6 lg:px-8 lg:py-8">
            <div className="relative mx-auto shrink-0 sm:mx-0">
              <div className="flex h-28 w-28 items-center justify-center overflow-hidden rounded-full border-4 border-surface-shell bg-emerald-600 text-3xl font-black text-white shadow-[0_12px_30px_rgba(0,0,0,0.3)] sm:h-32 sm:w-32">
                {avatarUrl ? (
                  // Signed Supabase URLs cannot be covered by a static remote image allow list.
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={avatarUrl} alt="Foto de perfil" className="h-full w-full object-cover" />
                ) : initials(shownName, session.email)}
              </div>
              <button type="button" onClick={() => inputRef.current?.click()} disabled={uploadingAvatar} className="absolute bottom-1 right-1 flex h-10 w-10 items-center justify-center rounded-full border-2 border-surface-shell bg-emerald-400 text-slate-950 shadow-lg transition hover:bg-emerald-300 disabled:opacity-50" aria-label="Cambiar foto de perfil" title="Cambiar foto">
                {uploadingAvatar ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
              </button>
              <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(event) => { void uploadAvatar(event.target.files?.[0] || null); event.currentTarget.value = ""; }} />
            </div>

            <div className="min-w-0 flex-1 text-center sm:text-left">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-emerald-300">Mi perfil</p>
              <h1 className="mt-1 break-words text-3xl font-black tracking-tight text-app-text-primary sm:text-4xl">{shownName}</h1>
              <div className="mt-2 flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-400/12 px-3 py-1 text-sm font-black text-emerald-200 ring-1 ring-inset ring-emerald-400/30">
                  <IdCard className="h-4 w-4" />
                  {shownSellerCode ? `Código de vendedor ${shownSellerCode}` : "Código de vendedor no asignado"}
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-inset px-3 py-1 text-sm font-black text-app-text-secondary">
                  <BadgeCheck className="h-4 w-4 text-emerald-300" />{session.roleName}
                </span>
              </div>
              <p className="mt-3 flex min-w-0 items-center justify-center gap-2 break-all text-sm font-bold text-app-text-secondary sm:justify-start">
                <Mail className="h-4 w-4 shrink-0 text-app-text-muted" />{session.email}
              </p>
            </div>

            <div className="flex shrink-0 justify-center sm:self-end">
              <button type="button" onClick={() => inputRef.current?.click()} disabled={uploadingAvatar} className={`${secondaryButtonClass} bg-surface-shell/70`}>
                <Camera className="h-4 w-4" />{uploadingAvatar ? "Subiendo..." : "Cambiar foto"}
              </button>
            </div>
          </div>
          <nav className="relative border-t border-app-border-divider px-3 sm:px-6 lg:px-8" aria-label="Secciones del perfil">
            <div className="flex min-w-max gap-1 overflow-x-auto">
              <button type="button" role="tab" aria-selected={activeSection === "personal"} onClick={() => setActiveSection("personal")} className={`inline-flex min-h-12 items-center gap-2 border-b-2 px-3 text-sm font-black transition-colors ${activeSection === "personal" ? "border-emerald-300 text-emerald-200" : "border-transparent text-app-text-secondary hover:text-app-text-primary"}`}><UserRound className="h-4 w-4" />Información personal</button>
              <button type="button" role="tab" aria-selected={activeSection === "security"} onClick={() => setActiveSection("security")} className={`inline-flex min-h-12 items-center gap-2 border-b-2 px-3 text-sm font-black transition-colors ${activeSection === "security" ? "border-emerald-300 text-emerald-200" : "border-transparent text-app-text-secondary hover:text-app-text-primary"}`}><KeyRound className="h-4 w-4" />Seguridad</button>
              <button type="button" role="tab" aria-selected={activeSection === "access"} onClick={() => setActiveSection("access")} className={`inline-flex min-h-12 items-center gap-2 border-b-2 px-3 text-sm font-black transition-colors ${activeSection === "access" ? "border-emerald-300 text-emerald-200" : "border-transparent text-app-text-secondary hover:text-app-text-primary"}`}><ShieldCheck className="h-4 w-4" />Acceso y permisos</button>
            </div>
          </nav>
        </header>

        <div className="min-w-0">
          {activeSection !== "access" ? <div className="min-w-0">
            {activeSection === "personal" ? <section className="p-4 sm:p-6 lg:p-8">
              <div className="flex items-center gap-3">
                <span className={`h-10 w-10 ${iconWellEmerald}`}><UserRound className="h-5 w-5" /></span>
                <div><h2 className="text-lg font-black text-app-text-primary">Información personal</h2><p className="text-sm font-bold text-app-text-secondary">El nombre que verá tu equipo dentro de Boxario.</p></div>
              </div>
              <form className="mt-5 grid gap-4" onSubmit={(event) => void saveProfile(event)}>
                <label className="grid gap-1.5"><span className={labelMutedClass}>Nombre completo</span><input className={inputClass} value={fullName} onChange={(event) => setFullName(formatPersonNameInput(event.target.value))} maxLength={120} autoComplete="name" required /></label>
                <label className="grid min-w-0 gap-1.5"><span className={labelMutedClass}>Correo de acceso</span><span className={`${inputClass} !bg-[#0B1220] flex min-w-0 items-center break-all text-app-text-secondary`}>{session.email}</span><span className="text-xs font-bold text-app-text-muted">El administrador de la empresa gestiona este correo.</span></label>
                <div className="flex justify-end"><button type="submit" className={primaryButtonClass} disabled={savingProfile || fullName.trim() === savedName.trim()}>{savingProfile ? <Loader2 className="h-4 w-4 animate-spin" /> : <Pencil className="h-4 w-4" />}{savingProfile ? "Guardando..." : "Guardar cambios"}</button></div>
              </form>
            </section> : null}

            {activeSection === "security" ? <section className="border-t border-app-border-divider p-4 sm:p-6 lg:p-8">
              <div className="flex items-center gap-3"><span className={`h-10 w-10 ${iconWellEmerald}`}><KeyRound className="h-5 w-5" /></span><div><h2 className="text-lg font-black text-app-text-primary">Seguridad</h2><p className="text-sm font-bold text-app-text-secondary">Actualiza tu contraseña confirmando primero la actual.</p></div></div>
              <form className="mt-5 grid gap-4" onSubmit={(event) => void changePassword(event)}>
                <label className="grid gap-1.5"><span className={labelMutedClass}>Contraseña actual</span><input className={inputClass} type="password" value={passwords.currentPassword} onChange={(event) => setPasswords((current) => ({ ...current, currentPassword: event.target.value }))} autoComplete="current-password" required /></label>
                <div className="grid gap-4 sm:grid-cols-2"><label className="grid gap-1.5"><span className={labelMutedClass}>Nueva contraseña</span><input className={inputClass} type="password" value={passwords.nextPassword} onChange={(event) => setPasswords((current) => ({ ...current, nextPassword: event.target.value }))} autoComplete="new-password" minLength={8} required /></label><label className="grid gap-1.5"><span className={labelMutedClass}>Confirmar contraseña</span><input className={inputClass} type="password" value={passwords.confirmation} onChange={(event) => setPasswords((current) => ({ ...current, confirmation: event.target.value }))} autoComplete="new-password" minLength={8} required /></label></div>
                <div className="flex justify-end"><button type="submit" className={primaryButtonClass} disabled={changingPassword}>{changingPassword ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}{changingPassword ? "Actualizando..." : "Cambiar contraseña"}</button></div>
              </form>
            </section> : null}
          </div> : null}

          {activeSection === "access" ? <aside className="min-w-0 bg-surface-card/35">
            <section className="p-4 sm:p-6 lg:p-8">
              <div className="flex items-center gap-3"><span className={`h-10 w-10 ${iconWellEmerald}`}><BadgeCheck className="h-5 w-5" /></span><div><h2 className="text-lg font-black text-app-text-primary">Tu acceso</h2><p className="text-sm font-bold text-app-text-secondary">Asignado por tu empresa.</p></div></div>
              <dl className="mt-5 divide-y divide-app-border-divider">
                <div className="flex items-start gap-3 py-4 first:pt-0"><Building2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-300" /><div className="min-w-0"><dt className={labelMutedClass}>Empresa</dt><dd className="mt-1 break-words text-base font-black text-app-text-primary">{session.organizationName}</dd></div></div>
                <div className="flex items-start gap-3 py-4"><ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-300" /><div className="min-w-0"><dt className={labelMutedClass}>Rol</dt><dd className="mt-1 break-words text-base font-black text-app-text-primary">{session.roleName}</dd></div></div>
                <div className="flex items-start gap-3 py-4 last:pb-0"><IdCard className="mt-0.5 h-5 w-5 shrink-0 text-emerald-300" /><div className="min-w-0"><dt className={labelMutedClass}>Código de vendedor</dt><dd className="mt-1 font-mono text-2xl font-black tracking-[0.18em] text-emerald-200">{shownSellerCode ?? "—"}</dd></div></div>
              </dl>
            </section>

            <section className="border-t border-app-border-divider p-4 sm:p-6 lg:p-8">
              <div className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-emerald-300" /><h2 className="text-base font-black text-app-text-primary">Permisos activos</h2></div>
              <ul className="mt-4 divide-y divide-app-border-divider">{visiblePermissions.map((permission) => <li key={permission} className="flex items-start gap-2 py-3 first:pt-0 last:pb-0 text-sm font-bold text-app-text-secondary"><span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-400/15"><Check className="h-3.5 w-3.5 text-emerald-300" /></span>{permission}</li>)}</ul>
            </section>
          </aside> : null}
        </div>
      </main>
    </div>
  );
}
