import { Suspense } from "react";
import LoginForm from "./login-form";

// LoginForm reads the callbackUrl from the query string, so it must sit inside
// a Suspense boundary during prerender.
export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
