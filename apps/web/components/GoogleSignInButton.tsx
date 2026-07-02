"use client";

import Script from "next/script";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "../lib/auth-context";
import { ApiError } from "../lib/api";

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: { client_id: string; callback: (res: { credential: string }) => void }) => void;
          renderButton: (parent: HTMLElement, options: Record<string, unknown>) => void;
        };
      };
    };
  }
}

export function GoogleSignInButton() {
  const { loginWithGoogle } = useAuth();
  const buttonRef = useRef<HTMLDivElement>(null);
  const [scriptReady, setScriptReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

  useEffect(() => {
    if (!scriptReady || !clientId || !buttonRef.current || !window.google) return;

    window.google.accounts.id.initialize({
      client_id: clientId,
      callback: async (res) => {
        try {
          await loginWithGoogle(res.credential);
        } catch (err) {
          setError(err instanceof ApiError ? err.message : "Đăng nhập Google thất bại.");
        }
      }
    });
    window.google.accounts.id.renderButton(buttonRef.current, {
      theme: "outline",
      size: "large",
      width: 320,
      text: "continue_with"
    });
  }, [scriptReady, clientId, loginWithGoogle]);

  if (!clientId) return null;

  return (
    <div style={{ marginTop: 12 }}>
      <Script src="https://accounts.google.com/gsi/client" strategy="afterInteractive" onLoad={() => setScriptReady(true)} />
      <div ref={buttonRef} />
      {error ? <p className="error-text">{error}</p> : null}
    </div>
  );
}
