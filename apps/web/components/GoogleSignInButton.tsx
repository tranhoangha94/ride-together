"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { loginWithGoogle } from "../lib/auth";

type GoogleCredentialResponse = { credential: string };
type GoogleAccountsId = {
  initialize: (config: { client_id: string; callback: (response: GoogleCredentialResponse) => void }) => void;
  renderButton: (parent: HTMLElement, options: Record<string, unknown>) => void;
};

declare global {
  interface Window {
    google?: { accounts: { id: GoogleAccountsId } };
  }
}

const GSI_SCRIPT_SRC = "https://accounts.google.com/gsi/client";

export function GoogleSignInButton() {
  const router = useRouter();
  const buttonRef = useRef<HTMLDivElement>(null);
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

  useEffect(() => {
    if (!clientId) return;

    function renderButton() {
      if (!window.google || !buttonRef.current) return;
      window.google.accounts.id.initialize({
        client_id: clientId!,
        callback: async (response: GoogleCredentialResponse) => {
          try {
            await loginWithGoogle(response.credential);
            router.push("/");
          } catch {
            window.alert("Đăng nhập bằng Google thất bại. Vui lòng thử lại.");
          }
        }
      });
      window.google.accounts.id.renderButton(buttonRef.current, {
        theme: "outline",
        size: "large",
        width: 320,
        text: "continue_with",
        locale: "vi"
      });
    }

    if (window.google) {
      renderButton();
      return;
    }

    const existing = document.querySelector(`script[src="${GSI_SCRIPT_SRC}"]`);
    if (existing) {
      existing.addEventListener("load", renderButton);
      return () => existing.removeEventListener("load", renderButton);
    }

    const script = document.createElement("script");
    script.src = GSI_SCRIPT_SRC;
    script.async = true;
    script.onload = renderButton;
    document.head.appendChild(script);
  }, [clientId, router]);

  if (!clientId) return null;

  return (
    <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}>
      <div ref={buttonRef} />
    </div>
  );
}
