import { lazy, Suspense, useEffect, useRef, useState } from "react";

import { FolderAccessDialog } from "./components/FolderAccessDialog";
import { DesktopOnlyGuard } from "./components/DesktopOnlyGuard";
import { DotMapBackground } from "./components/DotMapBackground";

import { OllamaSetupGate } from "./components/OllamaSetupGate";

import { WelcomeScreen } from "./components/WelcomeScreen";

import { SetupFirstRunNotice } from "./components/SetupFirstRunNotice";

import { StatusBar } from "./components/StatusBar";

import { ToastContainer } from "./components/ToastContainer";

import { DropOverlay } from "./components/DropOverlay";

import { AppShellFallback } from "./components/AppShellFallback";

import { OnboardingLoadingShell } from "./components/OnboardingLoadingShell";

import { useBackendHealth } from "./hooks/useBackendHealth";

import { useKeyboardShortcuts } from "./hooks/useKeyboardShortcuts";

import { useSetupGate } from "./hooks/useSetupGate";
import { useSetupAutomation } from "./hooks/useSetupAutomation";

import { useTheme } from "./hooks/useTheme";

import { useFolderDropActions } from "./hooks/useFolderDropActions";

import { isOnboardingDone, isSetupDisclaimerSeen } from "./lib/storage";
import { dismissOnboardingFlow, ONBOARDING_DISMISSED_EVENT } from "./lib/onboarding-events";
import { NXTRIVE_REPLAY_WELCOME } from "./lib/app-events";

const Sidebar = lazy(() =>
  import("./components/Sidebar").then((m) => ({ default: m.Sidebar }))
);

const ChatPanel = lazy(() =>
  import("./components/ChatPanel").then((m) => ({ default: m.ChatPanel }))
);

const SettingsPanel = lazy(() =>
  import("./components/SettingsPanel").then((m) => ({ default: m.SettingsPanel }))
);

const KeyboardShortcutsModal = lazy(() =>
  import("./components/KeyboardShortcutsModal").then((m) => ({
    default: m.KeyboardShortcutsModal,
  }))
);

const IngestionCompleteModal = lazy(() =>
  import("./components/IngestionCompleteModal").then((m) => ({
    default: m.IngestionCompleteModal,
  }))
);

const OnboardingWizard = lazy(() =>
  import("./components/OnboardingWizard").then((m) => ({ default: m.OnboardingWizard }))
);

export default function App() {
  const setup = useSetupGate();

  const [showWelcome, setShowWelcome] = useState(true);
  const [postWelcome, setPostWelcome] = useState(false);
  const [showSetupNotice, setShowSetupNotice] = useState(false);

  const [showOnboarding, setShowOnboarding] = useState(false);
  const onboardingSuppressedRef = useRef(false);

  const setupAutomationEnabled = !showWelcome && !showSetupNotice;

  const automation = useSetupAutomation({
    enabled: setupAutomationEnabled,
    phase: setup.phase,
    checking: setup.checking,
    ollamaStatus: setup.ollamaStatus,
    onRecheck: () => void setup.recheck(),
  });

  const { online, retrying, retry } = useBackendHealth();

  useKeyboardShortcuts();

  useTheme();

  const { isDragging } = useFolderDropActions();

  useEffect(() => {
    const onReplay = () => {
      setPostWelcome(false);
      setShowWelcome(true);
      setShowSetupNotice(false);
      setShowOnboarding(false);
    };

    window.addEventListener(NXTRIVE_REPLAY_WELCOME, onReplay);

    return () => window.removeEventListener(NXTRIVE_REPLAY_WELCOME, onReplay);
  }, []);

  useEffect(() => {
    const onDismissed = () => {
      onboardingSuppressedRef.current = true;
      setShowOnboarding(false);
    };
    window.addEventListener(ONBOARDING_DISMISSED_EVENT, onDismissed);
    return () => window.removeEventListener(ONBOARDING_DISMISSED_EVENT, onDismissed);
  }, []);

  useEffect(() => {
    if (onboardingSuppressedRef.current) return;
    if (setup.phase === "ready" && !isOnboardingDone() && !showWelcome) {
      setShowOnboarding(true);
    }
  }, [setup.phase, showWelcome]);

  const setupComplete = setup.phase === "ready";

  const showPostWelcomeContent = postWelcome || !showWelcome;

  const dismissOnboarding = () => {
    onboardingSuppressedRef.current = true;
    dismissOnboardingFlow();
    setShowOnboarding(false);
  };

  return (
    <DesktopOnlyGuard>
      <div className="app-desktop-shell relative flex h-screen w-screen min-w-[1024px] flex-col overflow-hidden bg-transparent text-deep-ink">
        <DotMapBackground />

        <DropOverlay visible={isDragging && setupComplete} />

        {!setupComplete && !showWelcome && (
          <OllamaSetupGate
            phase={setup.phase}
            checking={setup.checking}
            backendOnline={setup.backendOnline}
            ollamaStatus={setup.ollamaStatus}
            backendError={setup.backendError}
            backendAttempt={setup.backendAttempt}
            onRecheck={() => void setup.recheck()}
            installNotice={automation.installNotice}
            pulling={automation.pulling}
            pullingModel={automation.pullingModel}
            pullLog={automation.pullLog}
            pullError={automation.pullError}
            onRunModelDownload={automation.runModelDownload}
            onClearPullError={() => automation.setPullError(null)}
            onSetPullError={automation.setPullError}
            onSetInstallNotice={automation.setInstallNotice}
          />
        )}

        {setupComplete && showPostWelcomeContent && (
          <>
              <a
                href="#main-chat"
                className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-card focus:bg-deep-indigo focus:px-4 focus:py-2 focus:text-white"
              >
                Skip to chat
              </a>

              <div className="relative z-10 flex h-full min-h-0 w-full flex-col">
                <StatusBar
                  backendOnline={online}
                  backendLoading={online === null}
                  retrying={retrying}
                  onRetry={retry}
                  welcomeOpen={showWelcome || showOnboarding}
                />

                <Suspense fallback={<AppShellFallback />}>
                  <div className="flex min-h-0 flex-1 flex-row">
                    <Sidebar />
                    <ChatPanel />
                  </div>
                </Suspense>
              </div>

              <ToastContainer />

              <FolderAccessDialog />

              <Suspense fallback={null}>
                <KeyboardShortcutsModal />
                <SettingsPanel />
                <IngestionCompleteModal />
              </Suspense>

              {showOnboarding && !showWelcome && (
                <Suspense fallback={<OnboardingLoadingShell />}>
                  <OnboardingWizard onComplete={dismissOnboarding} />
                </Suspense>
              )}
          </>
        )}

        <SetupFirstRunNotice
          open={showSetupNotice}
          onDismiss={() => setShowSetupNotice(false)}
        />

        {showWelcome && (
          <WelcomeScreen
            onEnterStart={() => setPostWelcome(true)}
            onEnterComplete={() => {
              setShowWelcome(false);
              if (!isSetupDisclaimerSeen()) {
                setShowSetupNotice(true);
              }
            }}
          />
        )}
      </div>
    </DesktopOnlyGuard>
  );
}
