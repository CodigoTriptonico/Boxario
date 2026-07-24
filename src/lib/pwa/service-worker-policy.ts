export const DEV_SERVICE_WORKER_RELOAD_FLAG = "boxario:sw-dev-cleanup-reload";

export function shouldRegisterServiceWorker(input: {
  nodeEnv: string | undefined;
  protocol: string;
  hostname: string;
}) {
  if (input.nodeEnv !== "production") {
    return false;
  }

  return (
    input.protocol === "https:" ||
    input.hostname === "localhost" ||
    input.hostname === "127.0.0.1"
  );
}

export function shouldReloadAfterDevelopmentCleanup(input: {
  registrationCount: number;
  hasController: boolean;
}) {
  return input.registrationCount > 0 || input.hasController;
}

/** Avoid infinite reload loops when a controlling SW survives one unregister+reload cycle. */
export function shouldReloadOnceAfterDevelopmentCleanup(input: {
  hasController: boolean;
  alreadyReloaded: boolean;
}) {
  return input.hasController && !input.alreadyReloaded;
}
