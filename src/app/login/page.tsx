import { Suspense } from "react";
import { LoginForm } from "@/app/login/login-form";
import { isPublicSignupEnabled } from "@/lib/auth/public-signup";

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[40vh] items-center justify-center" aria-busy="true" aria-label="Cargando">
          <div className="skeleton-line h-2 w-24 rounded-full bg-surface-card" />
        </div>
      }
    >
      <LoginForm allowSignup={isPublicSignupEnabled()} />
    </Suspense>
  );
}
