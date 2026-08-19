import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { App } from "./App";
import "./design/reset.css";
import "./design/tokens.css";
import "./design/brand.css";
import "./design/worlds.css";
import "./design/motion.css";
import "./design/app.css";
import "./design/scenes.css";

const root = document.getElementById("root");
if (!root) throw new Error("BOW could not find its application root.");

ReactDOM.createRoot(root).render(
  <React.StrictMode>
    {/* No `future` prop, because there is nothing left to opt into. Both flags this used to
        carry were v6 opt-ins into what v7 does by default — `v7_relativeSplatPath` is how a
        relative link inside a splat route resolves, and `v7_startTransition` wrapped router
        state updates in `React.startTransition`. v7's `BrowserRouter` does not accept `future`
        at all, and its `useTransitions` prop left unset is exactly what the old flag bought.
        Removing the prop is a rename of the default, not a change of behaviour.

        The other thing v7 changed is why `navigate(...)` is written `void navigate(...)` in
        all twelve places this product calls it. v7's `NavigateFunction` returns
        `void | Promise<void>` rather than `void`, so every one of those calls became a
        floating promise the moment the version moved, and ESLint said so twelve times.
        `void` rather than `await` on purpose: each of those calls is either the last line of
        an effect that must `return` immediately afterwards or a click handler that must stay
        synchronous, so awaiting would change when the code after them runs. There is nothing
        in the resolved promise this product wants. */}
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
);
