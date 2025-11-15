"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  describeWhatsAppStatus,
  toneToBadgeClasses,
} from "@/lib/whatsappStatus";
import { resolveSessionQrImage } from "@/lib/whatsappQr";

const GOOGLE_AUTH_TOOL_OVERRIDES = {
  gmail: "Gmail",
  calendar: "Google Calendar",
};

const UPGRADE_PLAN_OPTIONS = [
  {
    code: "PRO_M",
    name: "Pro Monthly",
    priceLabel: "Rp 100.000 / bulan",
    description: "30 hari akses penuh ke semua konektor termasuk WhatsApp.",
  },
  {
    code: "PRO_Y",
    name: "Pro Yearly",
    priceLabel: "Rp 1.000.000 / tahun",
    description: "Hemat 17% untuk akses sepanjang tahun dan prioritas support.",
  },
];

const normalizeToolId = (value) =>
  (typeof value === "string" ? value : "").trim().toLowerCase();

const titleCase = (input) =>
  input
    .split(/[^a-z0-9]+/gi)
    .filter(Boolean)
    .map((segment) => segment[0].toUpperCase() + segment.slice(1))
    .join(" ");

const isGoogleToolId = (toolId) => {
  const normalized = normalizeToolId(toolId);
  if (!normalized) {
    return false;
  }
  if (normalized === "gmail" || normalized === "calendar") {
    return true;
  }
  if (normalized.startsWith("gmail") || normalized.startsWith("calendar")) {
    return true;
  }
  return normalized.includes("google");
};

const formatGoogleToolLabel = (toolId) => {
  const normalized = normalizeToolId(toolId);
  if (!normalized) {
    return "Google Workspace";
  }
  if (GOOGLE_AUTH_TOOL_OVERRIDES[normalized]) {
    return GOOGLE_AUTH_TOOL_OVERRIDES[normalized];
  }
  if (normalized.startsWith("gmail")) {
    const suffix = normalized.slice("gmail".length).replace(/^[^a-z0-9]+/i, "");
    return suffix ? `Gmail ${titleCase(suffix)}` : "Gmail";
  }
  if (normalized.startsWith("google")) {
    const suffix = normalized
      .slice("google".length)
      .replace(/^[^a-z0-9]+/i, "");
    return suffix ? `Google ${titleCase(suffix)}` : "Google";
  }
  if (normalized.includes("google")) {
    return titleCase(normalized.replace(/google/gi, "Google"));
  }
  return titleCase(normalized);
};

const WHATSAPP_QR_PREPARATION_SECONDS = 30;
const WHATSAPP_QR_EXPIRY_SECONDS = 60;

const EMPTY_WHATSAPP_SESSION = {
  status: "inactive",
  isActive: false,
  qrImage: null,
  qrUrl: null,
  updatedAt: null,
  raw: null,
};
import Link from "next/link";
import { useRouter, useSearchParams, useParams } from "next/navigation";
import { apiService } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";

export default function AgentDetailPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  const agentIdParam = params?.agentId || null;

  const [agent, setAgent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [chatError, setChatError] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [sessionId] = useState(() => `dashboard-session-${Date.now()}`);
  const [knowledge, setKnowledge] = useState([]);
  const [knowledgeLoading, setKnowledgeLoading] = useState(true);
  const [knowledgeError, setKnowledgeError] = useState("");
  const [knowledgeSuccess, setKnowledgeSuccess] = useState("");
  const [selectedKnowledgeFiles, setSelectedKnowledgeFiles] = useState([]);
  const [knowledgeUploading, setKnowledgeUploading] = useState(false);
  const [knowledgeInputKey, setKnowledgeInputKey] = useState(() => Date.now());
  const [whatsAppLoading, setWhatsAppLoading] = useState(false);
  const [whatsAppStatusLoading, setWhatsAppStatusLoading] = useState(false);
  const [whatsAppError, setWhatsAppError] = useState("");
  const [whatsAppQr, setWhatsAppQr] = useState(null);
  const [showWhatsAppQr, setShowWhatsAppQr] = useState(false);
  const [whatsAppQrCountdown, setWhatsAppQrCountdown] = useState(null);
  const [whatsAppSessionInfo, setWhatsAppSessionInfo] = useState(
    EMPTY_WHATSAPP_SESSION
  );
  const [whatsAppDeleting, setWhatsAppDeleting] = useState(false);
  const [whatsAppReconnecting, setWhatsAppReconnecting] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [selectedUpgradePlan, setSelectedUpgradePlan] = useState("PRO_M");
  const [upgradeProcessing, setUpgradeProcessing] = useState(false);
  const qrPollAbortRef = useRef(null);
  const whatsAppStatusLoadingRef = useRef(false);
  // ⭐ TAMBAH: Flag untuk mencegah auto-close
  const whatsAppQrUserClosedRef = useRef(false);
  const qrFlowAbortRef = useRef(null);
  const qrPreparationTimerRef = useRef(null);
  const qrExpiryTimerRef = useRef(null);

  const queryAuthUrl = searchParams?.get("authUrl") || null;
  const queryAuthState = searchParams?.get("authState") || null;

  const [googleAuthInfo, setGoogleAuthInfo] = useState(() => ({
    agentId: agentIdParam,
    status: queryAuthUrl ? "pending" : "idle",
    authUrl: queryAuthUrl,
    authState: queryAuthState,
    tokens: [],
    lastCheckedAt: null,
  }));
  const [googleAuthError, setGoogleAuthError] = useState("");
  const [googleAuthChecking, setGoogleAuthChecking] = useState(false);
  const googleAuthPollRef = useRef(null);
  const googleAuthCheckingRef = useRef(false);

  const normalizedUserPlan = useMemo(() => {
    const planCode =
      user?.subscription?.plan_code ||
      user?.subscription?.planCode ||
      (typeof apiService.getPlanCode === "function"
        ? apiService.getPlanCode()
        : null);
    return typeof planCode === "string" ? planCode.trim().toLowerCase() : null;
  }, [user?.subscription?.plan_code, user?.subscription?.planCode]);

  const isTrialPlan = Boolean(user?.is_trial || normalizedUserPlan === "trial");
  const closeWhatsAppQrPreview = useCallback(() => {
    whatsAppQrUserClosedRef.current = true; // ⭐ Set flag bahwa user yang close
    if (qrFlowAbortRef.current) {
      qrFlowAbortRef.current.abort();
      qrFlowAbortRef.current = null;
    }
    if (qrPreparationTimerRef.current) {
      clearTimeout(qrPreparationTimerRef.current);
      qrPreparationTimerRef.current = null;
    }
    if (qrExpiryTimerRef.current) {
      clearInterval(qrExpiryTimerRef.current);
      qrExpiryTimerRef.current = null;
    }
    setShowWhatsAppQr(false);
    setWhatsAppQr(null);
    setWhatsAppQrCountdown(null);
    setWhatsAppError("");
  }, []);

  useEffect(() => {
    const upcomingAuthUrl = queryAuthUrl || null;
    const upcomingAuthState = queryAuthState || null;
    const nextAgentId = agentIdParam;

    setGoogleAuthInfo((previous) => {
      const prevAgentId = previous?.agentId ?? null;
      const prevAuthUrl = previous?.authUrl ?? null;
      const prevAuthState = previous?.authState ?? null;

      const hasAgentChanged = prevAgentId !== nextAgentId;
      const hasAuthChanged =
        prevAuthUrl !== upcomingAuthUrl || prevAuthState !== upcomingAuthState;

      if (!hasAgentChanged && !hasAuthChanged) {
        return previous;
      }

      if (
        !hasAgentChanged &&
        previous?.status === "connected" &&
        !upcomingAuthUrl
      ) {
        if (
          prevAuthUrl === null &&
          prevAuthState === null &&
          prevAgentId === nextAgentId
        ) {
          return previous;
        }
        return {
          ...previous,
          agentId: nextAgentId,
          authUrl: null,
          authState: null,
        };
      }

      return {
        agentId: nextAgentId,
        status: upcomingAuthUrl ? "pending" : "idle",
        authUrl: upcomingAuthUrl,
        authState: upcomingAuthState,
        tokens: [],
        lastCheckedAt: null,
      };
    });

    setGoogleAuthError("");
  }, [agentIdParam, queryAuthUrl, queryAuthState]);

  useEffect(() => {
    if (!showWhatsAppQr || !whatsAppQr) {
      if (qrExpiryTimerRef.current) {
        clearInterval(qrExpiryTimerRef.current);
        qrExpiryTimerRef.current = null;
      }
      return;
    }

    if (qrExpiryTimerRef.current) {
      clearInterval(qrExpiryTimerRef.current);
    }

    const intervalId = setInterval(() => {
      setWhatsAppQrCountdown((prev) => {
        if (typeof prev !== "number") {
          return prev;
        }
        if (prev <= 0) {
          clearInterval(intervalId);
          qrExpiryTimerRef.current = null;
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    qrExpiryTimerRef.current = intervalId;

    return () => {
      clearInterval(intervalId);
      if (qrExpiryTimerRef.current === intervalId) {
        qrExpiryTimerRef.current = null;
      }
    };
  }, [showWhatsAppQr, whatsAppQr]);

  const handleUpgradeRedirect = useCallback(() => {
    if (!selectedUpgradePlan) {
      return;
    }
    setUpgradeProcessing(true);
    try {
      const params = new URLSearchParams({
        plan: selectedUpgradePlan,
        source: "whatsapp-upgrade",
      });
      if (user?.email) {
        params.set("email", user.email);
      }
      if (user?.user_id) {
        params.set("user_id", user.user_id);
      }
      router.push(`/payment?${params.toString()}`);
    } finally {
      setUpgradeProcessing(false);
      setShowUpgradeModal(false);
    }
  }, [router, selectedUpgradePlan, user?.email, user?.user_id]);

  const agentToolIds = useMemo(() => {
    const collected = new Set();

    const addTool = (value) => {
      const normalized = normalizeToolId(value);
      if (normalized) {
        collected.add(normalized);
      }
    };

    const addFrom = (value) => {
      if (!value) {
        return;
      }
      if (Array.isArray(value)) {
        value.forEach(addTool);
        return;
      }
      if (typeof value === "string") {
        addTool(value);
        return;
      }
      if (typeof value === "object") {
        Object.entries(value).forEach(([key, flag]) => {
          if (flag) {
            addTool(key);
          }
        });
      }
    };

    addFrom(agent?.allowed_tools);
    addFrom(agent?.allowedTools);
    addFrom(agent?.tools);

    return collected;
  }, [agent]);

  const googleToolIds = useMemo(
    () => Array.from(agentToolIds).filter(isGoogleToolId),
    [agentToolIds]
  );

  const requiresGoogleAuth = googleToolIds.length > 0;

  const googleAuthStatus = googleAuthInfo.status;
  const googleAuthPending = googleAuthStatus === "pending";
  const googleAuthConnected = googleAuthStatus === "connected";
  const googleAuthUrl = googleAuthConnected ? null : googleAuthInfo.authUrl;
  const googleAuthTokens = Array.isArray(googleAuthInfo.tokens)
    ? googleAuthInfo.tokens
    : [];
  const googleAuthPrimaryToken =
    googleAuthTokens.length > 0 ? googleAuthTokens[0] : null;
  const googleToolSummary = useMemo(() => {
    const labels = googleToolIds.map(formatGoogleToolLabel);
    return Array.from(new Set(labels)).join(", ");
  }, [googleToolIds]);
  const googleAuthAlertClasses = googleAuthConnected
    ? "border-accent/40 bg-background text-accent"
    : googleAuthError
    ? "border-red-300 bg-red-50 text-red-800"
    : "border-surface-strong/60 bg-background text-muted";

  const clearGoogleAuthPoll = useCallback(() => {
    if (googleAuthPollRef.current) {
      clearInterval(googleAuthPollRef.current);
      googleAuthPollRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      if (qrFlowAbortRef.current) {
        qrFlowAbortRef.current.abort();
        qrFlowAbortRef.current = null;
      }
      if (qrPreparationTimerRef.current) {
        clearTimeout(qrPreparationTimerRef.current);
        qrPreparationTimerRef.current = null;
      }
      if (qrExpiryTimerRef.current) {
        clearInterval(qrExpiryTimerRef.current);
        qrExpiryTimerRef.current = null;
      }
    };
  }, []);

  const checkGoogleAuthStatus = useCallback(async () => {
    if (!user || !requiresGoogleAuth) {
      return null;
    }
    if (googleAuthCheckingRef.current) {
      return null;
    }

    googleAuthCheckingRef.current = true;
    setGoogleAuthChecking(true);
    setGoogleAuthError("");

    try {
      const response = await apiService.checkGoogleAuthStatus();

      if (Array.isArray(response?.tokens) && response.tokens.length > 0) {
        const tokens = response.tokens;
        setGoogleAuthInfo({
          agentId: agentIdParam,
          status: "connected",
          authUrl: null,
          authState: null,
          tokens,
          lastCheckedAt: Date.now(),
        });
        clearGoogleAuthPoll();

        if (agentIdParam && (queryAuthUrl || queryAuthState)) {
          router.replace(`/dashboard/agents/${agentIdParam}`);
        }

        return "connected";
      }

      if (response?.auth_url) {
        setGoogleAuthInfo({
          agentId: agentIdParam,
          status: "pending",
          authUrl: response.auth_url,
          authState: response.auth_state || null,
          tokens: [],
          lastCheckedAt: Date.now(),
        });
        return "pending";
      }

      setGoogleAuthInfo((previous) => ({
        agentId: agentIdParam,
        status: previous?.status === "connected" ? "connected" : "pending",
        authUrl:
          previous?.status === "connected" ? null : previous?.authUrl || null,
        authState:
          previous?.status === "connected" ? null : previous?.authState || null,
        tokens: previous?.status === "connected" ? previous.tokens : [],
        lastCheckedAt: Date.now(),
      }));

      return "unknown";
    } catch (err) {
      const fallback =
        err?.message ||
        "Unable to verify Google authentication status right now.";
      setGoogleAuthError(fallback);
      return "error";
    } finally {
      googleAuthCheckingRef.current = false;
      setGoogleAuthChecking(false);
    }
  }, [
    user,
    requiresGoogleAuth,
    agentIdParam,
    queryAuthUrl,
    queryAuthState,
    router,
    clearGoogleAuthPoll,
  ]);

  useEffect(() => {
    if (!requiresGoogleAuth || !user || authLoading) {
      return;
    }

    if (googleAuthInfo.status !== "connected") {
      void checkGoogleAuthStatus();
    }
  }, [
    requiresGoogleAuth,
    user,
    authLoading,
    googleAuthInfo.status,
    checkGoogleAuthStatus,
  ]);

  useEffect(() => {
    if (!requiresGoogleAuth || googleAuthInfo.status !== "pending") {
      clearGoogleAuthPoll();
      return;
    }

    if (!googleAuthPollRef.current) {
      googleAuthPollRef.current = setInterval(() => {
        void checkGoogleAuthStatus();
      }, 5000);
    }

    return () => {
      clearGoogleAuthPoll();
    };
  }, [
    requiresGoogleAuth,
    googleAuthInfo.status,
    checkGoogleAuthStatus,
    clearGoogleAuthPoll,
  ]);

  useEffect(
    () => () => {
      clearGoogleAuthPoll();
    },
    [clearGoogleAuthPoll]
  );

  const loadAgent = useCallback(async () => {
    if (!agentIdParam) {
      setError("Missing agent identifier in the URL.");
      setAgent(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");
    try {
      const data = await apiService.getAgent(agentIdParam);
      setAgent(data || null);
    } catch (err) {
      console.error("Failed to load agent:", err);
      setAgent(null);
      setError(
        err?.message ||
          "Unable to load this agent right now. Please try again shortly."
      );
    } finally {
      setLoading(false);
    }
  }, [agentIdParam]);

  useEffect(() => {
    if (authLoading) {
      return;
    }
    if (!user) {
      setAgent(null);
      setLoading(false);
      setError("You need to sign in to view this agent.");
      return;
    }

    void loadAgent();
  }, [authLoading, user, loadAgent]);

  const loadKnowledge = useCallback(async () => {
    if (!agent?.id) {
      setKnowledge([]);
      setKnowledgeLoading(false);
      return;
    }

    setKnowledgeLoading(true);
    setKnowledgeError("");
    try {
      const docs = await apiService.getAgentDocuments(agent.id);
      const items = Array.isArray(docs)
        ? docs
        : Array.isArray(docs?.items)
        ? docs.items
        : Array.isArray(docs?.data)
        ? docs.data
        : [];
      setKnowledge(items);
    } catch (err) {
      setKnowledge([]);
      setKnowledgeError(
        err?.message ||
          "Unable to load knowledge documents right now. Please try again."
      );
    } finally {
      setKnowledgeLoading(false);
    }
  }, [agent?.id]);

  useEffect(() => {
    void loadKnowledge();
  }, [loadKnowledge]);

  useEffect(() => {
    return () => {
      if (qrPollAbortRef.current) {
        qrPollAbortRef.current.abort();
      }
    };
  }, []);

  const getApiKeyForWhatsApp = useCallback(async () => {
    let apiKey =
      (typeof apiService.getCurrentApiKey === "function"
        ? apiService.getCurrentApiKey()
        : null) ||
      user?.subscription?.api_key ||
      user?.subscription?.apiKey ||
      null;

    if (!apiKey && agent?.config?.api_key) {
      apiKey = agent.config.api_key;
    }

    if (!apiKey) {
      try {
        await apiService.ensureApiKey();
        apiKey =
          typeof apiService.getCurrentApiKey === "function"
            ? apiService.getCurrentApiKey()
            : null;
      } catch (err) {
        console.warn(
          "Unable to auto-generate API key for WhatsApp session",
          err
        );
      }
    }

    if (!apiKey) {
      throw new Error(
        "API key unavailable. Please refresh your session or generate an API key before linking WhatsApp."
      );
    }

    return apiKey;
  }, [agent?.config?.api_key, user?.subscription]);

  // ✅ PINDAHKAN refreshWhatsAppSession KE SINI (sebelum useEffect polling)
  const refreshWhatsAppSession = useCallback(async () => {
    if (whatsAppStatusLoadingRef.current) {
      return;
    }

    if (!agent?.id) {
      setWhatsAppSessionInfo(EMPTY_WHATSAPP_SESSION);
      return;
    }

    whatsAppStatusLoadingRef.current = true;
    setWhatsAppStatusLoading(true);
    setWhatsAppError("");

    try {
      const session = await apiService.getWhatsAppSession(agent.id);
      const currentQrValue = resolveSessionQrImage(session);

      setWhatsAppSessionInfo((previous) => {
        const prev = previous || EMPTY_WHATSAPP_SESSION;

        // ⭐ JANGAN preserve active state jika modal terbuka
        if (showWhatsAppQr) {
          return session;
        }

        // Preserve logic hanya untuk background refresh
        if (prev.isActive && !session.isActive) {
          const nextStatus = (session.status || "").toLowerCase();
          const shouldPreserve =
            !currentQrValue &&
            (!nextStatus ||
              ["inactive", "not_linked", "not_found", "unknown"].includes(
                nextStatus
              ));

          if (shouldPreserve) {
            return {
              ...prev,
              updatedAt: session.updatedAt || prev.updatedAt || null,
              raw: session.raw || prev.raw || null,
            };
          }
        }

        return session;
      });

      if (showWhatsAppQr) {
        if (currentQrValue) {
          setWhatsAppQr(currentQrValue);
        }

        if (session.isActive && !whatsAppQrUserClosedRef.current) {
          // Optional: Tampilkan success message
        }
      }
    } catch (err) {
      setWhatsAppError(
        err?.message ||
          "Unable to load WhatsApp session status right now. Please try again."
      );
    } finally {
      whatsAppStatusLoadingRef.current = false;
      setWhatsAppStatusLoading(false);
    }
  }, [agent?.id, showWhatsAppQr]);

  useEffect(() => {
    if (
      showWhatsAppQr &&
      whatsAppSessionInfo.isActive &&
      !whatsAppQrUserClosedRef.current
    ) {
      const timer = setTimeout(() => {
        closeWhatsAppQrPreview();
      }, 1200);
      return () => clearTimeout(timer);
    }
  }, [showWhatsAppQr, whatsAppSessionInfo.isActive, closeWhatsAppQrPreview]);

  // ✅ handleWhatsAppQr tetap di bawah
  const handleWhatsAppQr = async () => {
    if (!agent) {
      return;
    }

    if (isTrialPlan) {
      setShowUpgradeModal(true);
      return;
    }

    if (qrFlowAbortRef.current) {
      qrFlowAbortRef.current.abort();
    }
    const flowAbortController = new AbortController();
    qrFlowAbortRef.current = flowAbortController;

    const createAbortError = () => {
      try {
        return new DOMException("Aborted", "AbortError");
      } catch (_err) {
        const abortError = new Error("Aborted");
        abortError.name = "AbortError";
        return abortError;
      }
    };

    const clearPreparationTimer = () => {
      if (qrPreparationTimerRef.current) {
        clearTimeout(qrPreparationTimerRef.current);
        qrPreparationTimerRef.current = null;
      }
    };

    const waitForQrPreparation = () =>
      new Promise((resolve, reject) => {
        if (WHATSAPP_QR_PREPARATION_SECONDS <= 0) {
          resolve();
          return;
        }

        const abortSignal = flowAbortController.signal;
        let abortHandler;

        const cleanup = () => {
          clearPreparationTimer();
          if (abortHandler) {
            abortSignal.removeEventListener("abort", abortHandler);
            abortHandler = null;
          }
        };

        abortHandler = () => {
          cleanup();
          reject(createAbortError());
        };

        abortSignal.addEventListener("abort", abortHandler);

        qrPreparationTimerRef.current = setTimeout(() => {
          cleanup();
          resolve();
        }, WHATSAPP_QR_PREPARATION_SECONDS * 1000);
      });

    whatsAppQrUserClosedRef.current = false; // ⭐ Reset flag saat generate QR baru
    setWhatsAppError("");
    setWhatsAppLoading(true);
    setShowWhatsAppQr(true);
    setWhatsAppQr(null);
    setWhatsAppQrCountdown(null);

    try {
      if (!user?.user_id) {
        throw new Error("User identifier missing. Please re-authenticate.");
      }

      const apiKey = await getApiKeyForWhatsApp();
      await apiService.createWhatsAppSession({
        userId: String(user.user_id),
        agentId: String(agent.id),
        agentName: agent.name,
        apiKey,
      });

      await waitForQrPreparation();

      const session = await apiService.fetchWhatsAppQr(agent.id);
      const qr = resolveSessionQrImage(session);

      setWhatsAppSessionInfo(session);

      if (qr) {
        setWhatsAppQr(qr);
        setWhatsAppQrCountdown(WHATSAPP_QR_EXPIRY_SECONDS);
      } else {
        throw new Error(
          "QR code unavailable right now. Please try again shortly."
        );
      }
    } catch (error) {
      if (error?.name === "AbortError") {
        return;
      }
      setWhatsAppError(
        error?.message || "Unable to initialise WhatsApp session right now."
      );
      setWhatsAppSessionInfo((previous) => previous || EMPTY_WHATSAPP_SESSION);
      setWhatsAppQr(null);
      setShowWhatsAppQr(false);
      setWhatsAppQrCountdown(null);
    } finally {
      setWhatsAppLoading(false);
      clearPreparationTimer();
      if (qrFlowAbortRef.current === flowAbortController) {
        qrFlowAbortRef.current = null;
      }
    }
  };

  const handleWhatsAppReconnect = useCallback(async () => {
    if (!agent?.id) {
      return;
    }
    if (isTrialPlan) {
      setShowUpgradeModal(true);
      return;
    }

    setWhatsAppError("");
    setWhatsAppReconnecting(true);
    try {
      const session = await apiService.reconnectWhatsAppSession(agent.id);
      setWhatsAppSessionInfo(session || EMPTY_WHATSAPP_SESSION);

      const qr = resolveSessionQrImage(session);
      if (qr) {
        whatsAppQrUserClosedRef.current = false;
        setShowWhatsAppQr(true);
        setWhatsAppQr(qr);
        setWhatsAppQrCountdown(WHATSAPP_QR_EXPIRY_SECONDS);
      }

      await refreshWhatsAppSession();
    } catch (error) {
      setWhatsAppError(
        error?.message || "Unable to reconnect WhatsApp session right now."
      );
    } finally {
      setWhatsAppReconnecting(false);
    }
  }, [agent?.id, isTrialPlan, refreshWhatsAppSession]);

  const handleWhatsAppDelete = useCallback(async () => {
    if (!agent?.id) {
      return;
    }

    setWhatsAppError("");
    setWhatsAppDeleting(true);
    try {
      await apiService.deleteWhatsAppSession(agent.id);
      closeWhatsAppQrPreview();
      setWhatsAppSessionInfo(EMPTY_WHATSAPP_SESSION);
      await refreshWhatsAppSession();
    } catch (error) {
      setWhatsAppError(
        error?.message || "Unable to delete WhatsApp session right now."
      );
    } finally {
      setWhatsAppDeleting(false);
    }
  }, [agent?.id, closeWhatsAppQrPreview, refreshWhatsAppSession]);

  // ❌ HAPUS definisi refreshWhatsAppSession yang lama (sekitar line 549)
  // const refreshWhatsAppSession = useCallback(async () => { ... }, [agent?.id, showWhatsAppQr]);

  const requiresWhatsApp = useMemo(() => {
    if (whatsAppSessionInfo.isActive) {
      return false;
    }
    const statusRaw =
      whatsAppSessionInfo.status ||
      (whatsAppSessionInfo.isActive ? "active" : "inactive") ||
      "";
    const status = statusRaw.toLowerCase();

    return (
      status !== "inactive" &&
      status !== "not_found" &&
      Boolean(whatsAppSessionInfo.raw)
    );
  }, [whatsAppSessionInfo]);

  const whatsAppStatusDescriptor = useMemo(
    () => describeWhatsAppStatus(whatsAppSessionInfo),
    [whatsAppSessionInfo]
  );
  const whatsAppStatusLabel = whatsAppStatusDescriptor.label;
  const whatsAppStatusClasses = toneToBadgeClasses(
    whatsAppStatusDescriptor.tone,
    { loading: whatsAppStatusLoading }
  );

  const agentDescription = useMemo(() => {
    const parts = [];

    if (agent?.description) {
      parts.push(agent.description);
    }

    if (googleToolIds.length > 0) {
      const suffix = googleAuthPending ? " (authorization pending)" : "";
      googleToolIds.forEach((toolId) => {
        const label = formatGoogleToolLabel(toolId);
        if (!parts.includes(label + suffix)) {
          parts.push(label + suffix);
        }
      });
    }

    if (!parts.includes("WhatsApp")) {
      parts.push("WhatsApp");
    }

    return parts.join(", ");
  }, [agent?.description, googleToolIds, googleAuthPending]);

  const whatsAppQrIsImage = useMemo(() => {
    if (typeof whatsAppQr !== "string" || !whatsAppQr) {
      return false;
    }
    return (
      whatsAppQr.startsWith("data:image") ||
      whatsAppQr.startsWith("http://") ||
      whatsAppQr.startsWith("https://")
    );
  }, [whatsAppQr]);

  const whatsAppQrExpired =
    typeof whatsAppQrCountdown === "number" && whatsAppQrCountdown <= 0;

  const handleDelete = async () => {
    if (!agent) return;
    const confirmed = window.confirm(
      "Delete this agent? This action cannot be undone."
    );
    if (!confirmed) {
      return;
    }

    setDeleteError("");
    setIsDeleting(true);
    try {
      await apiService.deleteAgent(agent.id);
      router.push("/dashboard/agents");
    } catch (err) {
      console.error("Failed to delete agent:", err);
      setDeleteError(
        err?.message || "Unable to delete this agent. Please try again."
      );
    } finally {
      setIsDeleting(false);
    }
  };

  const appendMessage = (message) => {
    setChatMessages((prev) => [...prev, message]);
  };

  const resetKnowledgeSelection = () => {
    setSelectedKnowledgeFiles([]);
    setKnowledgeInputKey(Date.now());
  };

  const handleKnowledgeFileChange = (event) => {
    const files = Array.from(event.target.files || []);
    setKnowledgeSuccess("");
    setKnowledgeError("");

    if (!files.length) {
      resetKnowledgeSelection();
      return;
    }

    if (files.length > 10) {
      setKnowledgeError("You can upload up to 10 files at a time.");
      resetKnowledgeSelection();
      return;
    }

    const oversized = files.find((file) => file.size > 20 * 1024 * 1024);
    if (oversized) {
      setKnowledgeError(
        `${oversized.name} exceeds the 20 MB size limit. Please remove it.`
      );
      resetKnowledgeSelection();
      return;
    }

    setSelectedKnowledgeFiles(files);
  };

  const handleKnowledgeUpload = async () => {
    if (!agent || !selectedKnowledgeFiles.length) {
      setKnowledgeError("Select at least one file to upload.");
      return;
    }

    setKnowledgeUploading(true);
    setKnowledgeError("");
    setKnowledgeSuccess("");
    try {
      await apiService.uploadAgentDocuments(agent.id, selectedKnowledgeFiles);
      await loadKnowledge();
      setKnowledgeSuccess("Knowledge uploaded successfully.");
      resetKnowledgeSelection();
    } catch (err) {
      setKnowledgeError(
        err?.message || "Failed to upload knowledge. Please try again."
      );
    } finally {
      setKnowledgeUploading(false);
    }
  };

  const handleKnowledgeDelete = async (document) => {
    if (!agent) {
      return;
    }
    const documentId =
      document?.id || document?.upload_id || document?.uploadId || null;
    if (!documentId) {
      setKnowledgeError("Unable to determine document identifier.");
      return;
    }

    const confirmed = window.confirm(
      `Remove \\"${document?.filename || "this document"}\\" from this agent?`
    );
    if (!confirmed) {
      return;
    }

    try {
      setKnowledgeError("");
      setKnowledgeSuccess("");
      await apiService.deleteAgentDocument(agent.id, documentId);
      setKnowledgeSuccess("Knowledge document deleted.");
      await loadKnowledge();
    } catch (err) {
      setKnowledgeError(
        err?.message || "Failed to delete knowledge document. Please try again."
      );
    }
  };

  const handleChatSubmit = async (event) => {
    event.preventDefault();
    if (!chatInput.trim() || !agent) {
      return;
    }

    const userMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      text: chatInput.trim(),
      timestamp: Date.now(),
    };

    appendMessage(userMessage);
    setChatInput("");
    setChatError("");
    setIsSending(true);

    try {
      const response = await apiService.executeAgent(
        agent.id,
        userMessage.text,
        {},
        sessionId
      );

      const payload = response?.response;
      let replyText;
      if (typeof payload === "string") {
        replyText = payload;
      } else if (payload?.output) {
        replyText = payload.output;
      } else if (payload?.result) {
        replyText = payload.result;
      } else if (
        response?.message &&
        response.message !== "Agent execution started"
      ) {
        replyText = response.message;
      } else {
        replyText =
          "Execution completed. Check intermediate steps for additional context.";
      }

      const assistantMessage = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        text: replyText,
        timestamp: Date.now(),
        details: payload?.intermediate_steps || payload?.tools_used || null,
      };

      appendMessage(assistantMessage);
    } catch (err) {
      console.error("Failed to execute agent:", err);
      setChatError(err?.message || "Agent failed to respond.");
      appendMessage({
        id: `assistant-error-${Date.now()}`,
        role: "assistant",
        text: "Sorry, I ran into an error while processing that request. Please try again.",
        timestamp: Date.now(),
        error: true,
      });
    } finally {
      setIsSending(false);
    }
  };

  const formatTimestamp = (timestamp) =>
    new Date(timestamp).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });

  const formatDateTime = (value) => {
    if (!value) return "Unknown";
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return "Unknown";
    return parsed.toLocaleString([], {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatBytes = (bytes) => {
    if (bytes === null || bytes === undefined) return "Unknown";
    if (bytes === 0) return "0 B";
    const units = ["B", "KB", "MB", "GB"];
    let size = bytes;
    let unit = 0;
    while (size >= 1024 && unit < units.length - 1) {
      size /= 1024;
      unit += 1;
    }
    return `${size.toFixed(unit === 0 ? 0 : 1)} ${units[unit]}`;
  };

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center h-64 px-4">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-sm sm:text-base text-muted">
            Loading agent...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-3xl mx-auto px-4">
        <div className="p-4 sm:p-6 bg-red-50 border border-red-200 rounded-lg">
          <h2 className="text-base sm:text-lg font-semibold text-red-700 mb-2">
            Something went wrong
          </h2>
          <p className="text-sm text-red-600">{error}</p>
        </div>
      </div>
    );
  }

  if (!agent) {
    return null;
  }

  const statusChipClasses =
    agent.status === "ACTIVE"
      ? "bg-accent/15 text-accent"
      : "bg-surface text-foreground";

  return (
    <div className="max-w-4xl mx-auto space-y-6 sm:space-y-8 px-4 sm:px-6 pb-6">
      {/* Header Section */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground break-words">
            {agent.name}
          </h1>
          <div className="mt-2 flex flex-col sm:flex-row sm:items-center gap-2 text-xs sm:text-sm text-muted">
            <span>Agent ID:</span>
            <code className="px-2 py-1 rounded bg-surface text-xs break-all">
              {agent.id}
            </code>
          </div>
          {deleteError && (
            <p className="mt-2 text-xs sm:text-sm text-red-600">
              {deleteError}
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={`/dashboard/agents/${agent.id}/edit`}
            className="px-3 sm:px-4 py-2 rounded-lg border border-surface-strong/60 text-xs sm:text-sm font-medium text-muted hover:bg-surface"
          >
            Edit
          </Link>
          <button
            onClick={handleDelete}
            disabled={isDeleting}
            className="px-3 sm:px-4 py-2 rounded-lg bg-red-500 hover:bg-red-600 text-accent-foreground text-xs sm:text-sm font-semibold disabled:opacity-60 cursor-pointer"
          >
            {isDeleting ? "Deleting..." : "Delete"}
          </button>
          <span
            className={`px-2.5 sm:px-3 py-1 rounded-full text-xs font-semibold ${statusChipClasses}`}
          >
            {agent.status || "UNKNOWN"}
          </span>
        </div>
      </div>

      {/* Google Auth Section */}
      {requiresGoogleAuth && (
        <div
          className={`p-4 sm:p-5 rounded-lg border text-xs sm:text-sm ${googleAuthAlertClasses}`}
        >
          {googleAuthConnected ? (
            <>
              <p className="font-semibold">Google Workspace connected</p>
              <p className="mt-1">
                {googleToolSummary
                  ? `${googleToolSummary} tools are ready to use with this account.`
                  : "Google Workspace tools are ready to use with this account."}
              </p>
              {googleAuthPrimaryToken?.expires_at && (
                <p className="mt-2 text-xs text-accent">
                  Access valid until{" "}
                  {formatDateTime(googleAuthPrimaryToken.expires_at)}. Re-run
                  the check if you need to refresh permissions later.
                </p>
              )}
            </>
          ) : (
            <>
              <p className="font-semibold">
                Action required: connect Google Workspace
              </p>
              <p className="mt-1">
                {googleToolSummary
                  ? `This agent needs permission to use ${googleToolSummary}. Click the button below to continue the Google authorization flow.`
                  : "This agent needs permission to use Google Workspace tools. Click the button below to continue the Google authorization flow."}
              </p>
              {googleAuthUrl && (
                <a
                  href={googleAuthUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center mt-3 px-4 py-2 rounded-lg bg-accent hover:bg-accent-hover text-accent-foreground text-xs sm:text-sm font-semibold"
                >
                  Continue with Google
                </a>
              )}
              <div className="mt-3 flex flex-wrap items-center gap-2 sm:gap-3">
                <button
                  onClick={() => {
                    void checkGoogleAuthStatus();
                  }}
                  disabled={googleAuthChecking}
                  className="inline-flex items-center px-3 py-1.5 rounded-lg bg-surface/20 hover:bg-surface/30 text-xs sm:text-sm font-semibold text-current disabled:opacity-60 disabled:cursor-not-allowed border border-current transition"
                >
                  {googleAuthChecking ? "Checking..." : "Refresh status"}
                </button>
              </div>
              <p className="mt-2 text-xs text-muted">
                Keep this window open. We will update the status automatically
                once Google confirms the authorization.
              </p>
            </>
          )}
          {googleAuthError && (
            <p className="mt-2 text-xs font-medium text-red-700">
              {googleAuthError}
            </p>
          )}
        </div>
      )}

      {/* Configuration Section */}
      <section className="bg-surface rounded-xl shadow-sm border border-surface-strong/60 p-4 sm:p-6 space-y-4">
        <h2 className="text-base sm:text-lg font-semibold text-foreground">
          Configuration
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted mb-1">
              LLM Model
            </p>
            <p className="text-sm text-foreground break-words">
              {agent.config?.model || agent.config?.llm_model || "Default"}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-muted mb-1">
              Temperature
            </p>
            <p className="text-sm text-foreground">
              {agent.config?.temperature ?? 0.7}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-muted mb-1">
              Max Tokens
            </p>
            <p className="text-sm text-foreground">
              {agent.config?.max_tokens ?? 1000}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-muted mb-1">
              Memory Type
            </p>
            <p className="text-sm text-foreground">
              {agent.config?.memory_type ?? "buffer"}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-muted mb-1">
              Reasoning Strategy
            </p>
            <p className="text-sm text-foreground">
              {agent.config?.reasoning_strategy ?? "react"}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-muted mb-1">
              Capabilities
            </p>
            <p className="text-sm text-foreground break-words">
              {agentDescription}
            </p>
          </div>
        </div>
        {(agent.config?.system_message || agent.config?.system_prompt) && (
          <div>
            <p className="text-xs uppercase tracking-wide text-muted mb-1">
              System Prompt
            </p>
            <pre className="whitespace-pre-wrap text-xs sm:text-sm leading-relaxed text-foreground bg-background border border-surface-strong/60 rounded-lg p-3 sm:p-4 overflow-x-auto">
              {agent.config.system_message || agent.config.system_prompt}
            </pre>
          </div>
        )}

        {/* WhatsApp Section */}
        <div className="border-t border-dashed border-surface-strong/60 pt-4 mt-4 space-y-3">
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <p className="text-sm font-medium text-foreground">
              WhatsApp Session
            </p>
            <span
              className={`px-2 sm:px-2.5 py-0.5 text-xs font-semibold rounded-full ${whatsAppStatusClasses}`}
            >
              {whatsAppStatusLoading ? "Checking..." : whatsAppStatusLabel}
            </span>
          </div>
          {whatsAppError && !showWhatsAppQr && (
            <p className="text-xs text-red-600">{whatsAppError}</p>
          )}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={handleWhatsAppQr}
              disabled={
                whatsAppLoading || whatsAppDeleting || whatsAppReconnecting
              }
              className="inline-flex items-center px-3 sm:px-4 py-2 rounded-lg bg-[#25D366] hover:bg-accent-hover text-accent-foreground text-xs sm:text-sm font-semibold transition disabled:opacity-60 cursor-pointer"
            >
              {whatsAppLoading
                ? "Loading QR..."
                : whatsAppSessionInfo.isActive
                ? "Re-link WhatsApp"
                : "Connect WhatsApp"}
            </button>
            <button
              type="button"
              onClick={refreshWhatsAppSession}
              disabled={
                whatsAppStatusLoading ||
                whatsAppLoading ||
                whatsAppDeleting ||
                whatsAppReconnecting
              }
              className="inline-flex items-center px-3 sm:px-4 py-2 rounded-lg border border-surface-strong/60 text-xs sm:text-sm font-semibold text-muted hover:bg-surface disabled:opacity-60 cursor-pointer"
            >
              {whatsAppStatusLoading ? "Refreshing..." : "Refresh Status"}
            </button>
          </div>
          {whatsAppSessionInfo.isActive && (
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <button
                type="button"
                onClick={handleWhatsAppReconnect}
                disabled={
                  whatsAppReconnecting ||
                  whatsAppLoading ||
                  whatsAppStatusLoading ||
                  whatsAppDeleting
                }
                className="inline-flex items-center px-3 sm:px-4 py-2 rounded-lg border border-accent/40 text-xs font-semibold text-accent hover:bg-accent/5 disabled:opacity-60"
              >
                {whatsAppReconnecting ? "Reconnecting..." : "Reconnect session"}
              </button>
              <button
                type="button"
                onClick={handleWhatsAppDelete}
                disabled={whatsAppDeleting || whatsAppReconnecting}
                className="inline-flex items-center px-3 sm:px-4 py-2 rounded-lg border border-red-200 text-xs font-semibold text-red-600 hover:bg-red-500/10 disabled:opacity-60"
              >
                {whatsAppDeleting ? "Deleting..." : "Delete session"}
              </button>
            </div>
          )}
          {whatsAppSessionInfo.isActive && (
            <p className="text-xs text-accent">
              WhatsApp session is active. Re-scan the QR if you need to link a
              different device.
            </p>
          )}

          {/* WhatsApp QR Modal */}
          {showWhatsAppQr && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
              <div className="relative w-full max-w-sm rounded-2xl border border-surface-strong/60 bg-surface p-4 sm:p-6 text-center shadow-xl max-h-[90vh] overflow-y-auto">
                <button
                  type="button"
                  onClick={closeWhatsAppQrPreview}
                  className="absolute right-3 top-3 rounded-full bg-surface px-2 py-1 text-xs font-semibold text-muted hover:bg-surface-strong/60"
                >
                  Close
                </button>
                <h3 className="text-sm sm:text-base font-semibold text-foreground pr-12">
                  Scan WhatsApp QR
                </h3>
                <div className="mt-4 space-y-4">
                  {whatsAppSessionInfo.isActive ? (
                    <div className="space-y-3 sm:space-y-4">
                      <div className="mx-auto flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center rounded-full bg-accent/15 text-accent">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 24 24"
                          fill="currentColor"
                          className="h-8 w-8 sm:h-10 sm:w-10"
                          aria-hidden="true"
                        >
                          <path
                            fillRule="evenodd"
                            d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25Zm4.28 7.28a.75.75 0 0 0-1.06-1.06l-4.72 4.72-1.72-1.72a.75.75 0 1 0-1.06 1.06l2.25 2.25a.75.75 0 0 0 1.06 0l5.25-5.25Z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm font-semibold text-accent">
                          WhatsApp connected
                        </p>
                        <p className="text-xs text-muted">
                          Linked device detected. Messages can now be sent
                          through this agent.
                        </p>
                        {whatsAppSessionInfo.updatedAt && (
                          <p className="text-xs text-muted">
                            Linked at{" "}
                            {formatDateTime(whatsAppSessionInfo.updatedAt)}.
                          </p>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={closeWhatsAppQrPreview}
                        className="inline-flex items-center justify-center rounded-md bg-accent px-4 py-2 text-xs sm:text-sm font-semibold text-accent-foreground hover:bg-accent-hover"
                      >
                        Close
                      </button>
                    </div>
                  ) : (
                    <>
                      {whatsAppLoading && (
                        <div className="space-y-3">
                          <div className="mx-auto h-10 w-10 rounded-full border-2 border-accent/40 border-t-transparent animate-spin"></div>
                          <p className="text-xs sm:text-sm text-muted">
                            Waiting for WhatsApp QR response…
                          </p>
                          <p className="text-xs text-muted">
                            Keep this window open until the QR appears.
                          </p>
                        </div>
                      )}
                      {!whatsAppLoading && whatsAppQr && (
                        <div className="space-y-3 sm:space-y-4">
                          <p className="text-xs sm:text-sm text-muted">
                            Open WhatsApp &gt; Linked Devices and scan this code
                            to connect the agent.
                          </p>
                          {whatsAppQrIsImage ? (
                            <div className="mx-auto inline-flex rounded-md border border-surface-strong/60 bg-surface p-2">
                              <Image
                                src={whatsAppQr}
                                alt="WhatsApp QR Code"
                                width={200}
                                height={200}
                                unoptimized
                                className="h-auto w-full max-w-[200px] sm:max-w-[216px]"
                              />
                            </div>
                          ) : (
                            <a
                              href={whatsAppQr}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center justify-center rounded-lg bg-accent px-4 py-2 text-xs sm:text-sm font-semibold text-accent-foreground hover:bg-accent-hover"
                            >
                              Open WhatsApp Link
                            </a>
                          )}
                          {typeof whatsAppQrCountdown === "number" ? (
                            <p
                              className={`text-xs font-semibold ${
                                whatsAppQrExpired
                                  ? "text-red-600"
                                  : "text-muted"
                              }`}
                            >
                              {whatsAppQrExpired
                                ? "QR expired — generate a new code to continue."
                                : `QR expires in ${whatsAppQrCountdown}s`}
                            </p>
                          ) : (
                            <p className="text-xs text-muted">
                              QR codes expire after about a minute. Regenerate
                              if the scan times out.
                            </p>
                          )}
                          <ol className="mx-auto max-w-md space-y-1 text-left text-xs text-muted">
                            <li>
                              <span className="font-semibold text-muted">
                                1.
                              </span>{" "}
                              Open WhatsApp on your phone.
                            </li>
                            <li>
                              <span className="font-semibold text-muted">
                                2.
                              </span>{" "}
                              Tap{" "}
                              <span className="font-medium">
                                Linked Devices
                              </span>{" "}
                              &gt;{" "}
                              <span className="font-medium">Link a Device</span>
                              .
                            </li>
                            <li>
                              <span className="font-semibold text-muted">
                                3.
                              </span>{" "}
                              Point the camera at this QR before it expires.
                            </li>
                          </ol>
                          {whatsAppSessionInfo.updatedAt && (
                            <p className="text-xs text-muted">
                              Last status update{" "}
                              {formatDateTime(whatsAppSessionInfo.updatedAt)}.
                            </p>
                          )}
                          <div className="flex flex-col sm:flex-row flex-wrap items-center justify-center gap-2 sm:gap-3">
                            {whatsAppQrExpired && (
                              <button
                                type="button"
                                onClick={handleWhatsAppQr}
                                disabled={whatsAppLoading}
                                className="w-full sm:w-auto inline-flex items-center justify-center rounded-lg bg-accent px-4 py-2 text-xs sm:text-sm font-semibold text-accent-foreground hover:bg-accent-hover disabled:opacity-60"
                              >
                                {whatsAppLoading
                                  ? "Loading..."
                                  : "Generate new QR"}
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={refreshWhatsAppSession}
                              disabled={
                                whatsAppStatusLoading || whatsAppLoading
                              }
                              className="w-full sm:w-auto inline-flex items-center justify-center rounded-lg border border-surface-strong/60 px-4 py-2 text-xs sm:text-sm font-semibold text-muted hover:bg-surface disabled:opacity-60"
                            >
                              {whatsAppStatusLoading
                                ? "Refreshing..."
                                : "Refresh status"}
                            </button>
                            <button
                              type="button"
                              onClick={closeWhatsAppQrPreview}
                              className="w-full sm:w-auto inline-flex items-center justify-center rounded-lg border border-transparent px-4 py-2 text-xs sm:text-sm font-semibold text-muted hover:text-foreground"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}
                      {!whatsAppLoading && !whatsAppQr && !whatsAppError && (
                        <p className="text-xs sm:text-sm text-muted">
                          QR code is being prepared. This can take a few
                          seconds…
                        </p>
                      )}
                      {!whatsAppLoading && whatsAppError && (
                        <p className="text-xs sm:text-sm text-red-600">
                          {whatsAppError}
                        </p>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Upgrade Modal */}
          {showUpgradeModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
              <div className="relative w-full max-w-2xl rounded-3xl border border-surface-strong/60 bg-surface p-4 sm:p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
                <button
                  type="button"
                  onClick={() => {
                    setShowUpgradeModal(false);
                    setUpgradeProcessing(false);
                  }}
                  className="absolute right-3 top-3 sm:right-4 sm:top-4 rounded-full bg-surface px-2 py-1 text-xs font-semibold text-muted hover:bg-surface-strong/70"
                >
                  Close
                </button>
                <div className="space-y-3">
                  <h3 className="text-lg sm:text-xl font-semibold text-foreground pr-12">
                    Upgrade required
                  </h3>
                  <p className="text-xs sm:text-sm text-muted">
                    WhatsApp integration isn&apos;t available on the trial plan.
                    Upgrade to unlock WhatsApp messaging, automation, and QR
                    connectivity.
                  </p>
                  <div className="mt-4 grid gap-3 sm:gap-4 md:grid-cols-2">
                    {UPGRADE_PLAN_OPTIONS.map((plan) => {
                      const isActive = selectedUpgradePlan === plan.code;
                      return (
                        <button
                          type="button"
                          key={plan.code}
                          onClick={() => setSelectedUpgradePlan(plan.code)}
                          className={`rounded-2xl border p-3 sm:p-4 text-left transition ${
                            isActive
                              ? "border-accent bg-accent/5 shadow-lg"
                              : "border-surface-strong/60 hover:border-accent/60"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-sm sm:text-base font-semibold text-foreground">
                              {plan.name}
                            </span>
                            {isActive && (
                              <span className="text-xs font-semibold text-accent">
                                Selected
                              </span>
                            )}
                          </div>
                          <p className="mt-2 text-xs sm:text-sm font-medium text-foreground">
                            {plan.priceLabel}
                          </p>
                          <p className="mt-1 text-xs text-muted">
                            {plan.description}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                  <div className="mt-4 sm:mt-6 flex flex-col sm:flex-row flex-wrap justify-end gap-2 sm:gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setShowUpgradeModal(false);
                        setUpgradeProcessing(false);
                      }}
                      className="w-full sm:w-auto rounded-lg border border-surface-strong/60 px-4 py-2 text-xs sm:text-sm font-semibold text-muted hover:bg-surface"
                    >
                      Maybe later
                    </button>
                    <button
                      type="button"
                      onClick={handleUpgradeRedirect}
                      disabled={upgradeProcessing}
                      className="w-full sm:w-auto inline-flex items-center justify-center rounded-lg bg-accent px-5 py-2 text-xs sm:text-sm font-semibold text-accent-foreground transition hover:bg-accent-hover disabled:opacity-60"
                    >
                      {upgradeProcessing
                        ? "Redirecting..."
                        : "Continue to payment"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Next Steps Section */}
      <section className="bg-surface rounded-xl shadow-sm border border-surface-strong/60 p-4 sm:p-6">
        <h2 className="text-base sm:text-lg font-semibold text-foreground mb-3 sm:mb-4">
          Next Steps
        </h2>
        <ul className="space-y-2 text-xs sm:text-sm text-muted list-disc list-inside">
          <li>
            Use the dashboard to execute this agent or integrate it into your
            workflows.
          </li>
          <li>
            Upload documents to give the agent domain knowledge from the
            documents tab.
          </li>
          <li>
            {googleAuthConnected
              ? "Run Google Workspace tasks immediately or connect additional tools at any time."
              : googleAuthPending
              ? "Complete the Google authorization before running Google Workspace tasks."
              : requiresGoogleAuth
              ? "Refresh the Google authorization status once the Google flow completes."
              : "Connect additional tools or adjust agent settings at any time."}
          </li>
        </ul>
      </section>

      {/* Knowledge Section */}
      <section className="bg-surface rounded-xl shadow-sm border border-surface-strong/60 p-4 sm:p-6 space-y-4 sm:space-y-6">
        <div>
          <h2 className="text-base sm:text-lg font-semibold text-foreground">
            Add Knowledge
          </h2>
          <p className="mt-2 text-xs sm:text-sm text-muted">
            Upload up to 10 documents (PDF, PPTX, DOCX, TXT), 20 MB per file, to
            enrich this agent&apos;s context.
          </p>
        </div>

        {(knowledgeError || knowledgeSuccess) && (
          <div
            className={`p-3 rounded-lg text-xs sm:text-sm ${
              knowledgeError
                ? "bg-red-50 border border-red-200 text-red-700"
                : "bg-background border border-accent/40 text-accent"
            }`}
          >
            {knowledgeError || knowledgeSuccess}
          </div>
        )}

        <div className="space-y-3 sm:space-y-4">
          <div className="flex flex-col space-y-3">
            <input
              key={knowledgeInputKey}
              type="file"
              multiple
              accept=".pdf,.pptx,.docx,.txt"
              onChange={handleKnowledgeFileChange}
              className="w-full text-xs sm:text-sm text-muted file:mr-4 file:rounded-md file:border-0 file:bg-accent file:px-3 file:py-2 file:text-xs sm:file:text-sm file:font-semibold file:text-accent-foreground hover:file:bg-accent-hover"
              disabled={knowledgeUploading}
            />
            <button
              type="button"
              onClick={handleKnowledgeUpload}
              disabled={
                knowledgeUploading || selectedKnowledgeFiles.length === 0
              }
              className="w-full inline-flex items-center justify-center px-4 py-2 rounded-lg bg-accent hover:bg-accent-hover text-accent-foreground text-xs sm:text-sm font-semibold disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {knowledgeUploading ? "Uploading..." : "Upload"}
            </button>
          </div>
          {selectedKnowledgeFiles.length > 0 && (
            <div className="rounded-lg border border-dashed border-surface-strong/60 bg-background p-3">
              <p className="text-xs font-medium text-muted mb-2">
                Files ready to upload:
              </p>
              <ul className="space-y-1 text-xs text-muted">
                {selectedKnowledgeFiles.map((file) => (
                  <li key={file.name} className="break-all">
                    {file.name} · {formatBytes(file.size)}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div>
          <h3 className="text-sm font-semibold text-foreground mb-3">
            Upload History
          </h3>
          {knowledgeLoading ? (
            <div className="flex items-center justify-center py-6">
              <div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin" />
            </div>
          ) : knowledge.length === 0 ? (
            <p className="text-xs sm:text-sm text-muted">
              No knowledge documents uploaded yet.
            </p>
          ) : (
            <div className="space-y-3">
              {knowledge.map((doc) => (
                <div
                  key={doc.id}
                  className="rounded-lg border border-surface-strong/60 bg-background p-3 sm:p-4"
                >
                  <div className="flex flex-col gap-3 text-xs sm:text-sm">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-foreground break-words">
                          {doc.filename}
                        </p>
                        <p className="text-xs text-muted mt-1">
                          Uploaded{" "}
                          {formatDateTime(doc.createdAt || doc.created_at)}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleKnowledgeDelete(doc)}
                        className="flex-shrink-0 inline-flex items-center rounded-md border border-red-200 bg-red-50 px-2 sm:px-3 py-1 text-xs font-semibold text-red-600 hover:border-red-300 hover:bg-red-100 cursor-pointer"
                      >
                        Delete
                      </button>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs text-muted">
                      <span className="break-words">
                        Size: {formatBytes(doc.sizeBytes ?? doc.size_bytes)}
                      </span>
                      <span>
                        Chunks: {doc.chunkCount ?? doc.chunk_count ?? "—"}
                      </span>
                      <span className="break-words col-span-2 sm:col-span-1">
                        Type: {doc.contentType || doc.content_type || "Unknown"}
                      </span>
                      <span className="break-all col-span-2 sm:col-span-1">
                        ID: {doc.id || "—"}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Test Agent Section */}
      <section className="bg-surface rounded-xl shadow-sm border border-surface-strong/60 p-4 sm:p-6">
        <h2 className="text-base sm:text-lg font-semibold text-foreground mb-3 sm:mb-4">
          Test the Agent
        </h2>
        <p className="text-xs sm:text-sm text-muted mb-4">
          Start a quick conversation to verify your configuration. Messages here
          use the live agent and tools you selected.
        </p>
        <div className="space-y-4">
          <div className="h-64 sm:h-72 overflow-y-auto rounded-lg border border-surface-strong/60 bg-background p-3 sm:p-4 flex flex-col space-y-3 sm:space-y-4">
            {chatMessages.length === 0 ? (
              <div className="m-auto text-center text-xs sm:text-sm text-muted px-4">
                <p className="font-medium">No messages yet</p>
                <p className="mt-1">
                  Ask your agent something, for example:{" "}
                  <span className="italic">
                    &ldquo;Summarise the last unread email in my inbox.&rdquo;
                  </span>
                </p>
              </div>
            ) : (
              chatMessages.map((message) => {
                const isUser = message.role === "user";
                const bubbleClasses = isUser
                  ? "ml-auto bg-accent text-accent-foreground"
                  : message.error
                  ? "mr-auto bg-red-100 text-red-700"
                  : "mr-auto bg-surface text-foreground";

                return (
                  <div key={message.id} className="max-w-[85%] sm:max-w-[80%]">
                    <div
                      className={`rounded-2xl px-3 py-2 sm:px-4 sm:py-2 shadow-sm ${bubbleClasses}`}
                    >
                      <p className="text-xs sm:text-sm whitespace-pre-wrap break-words">
                        {message.text}
                      </p>
                    </div>
                    <p className="mt-1 text-xs text-muted">
                      {isUser ? "You" : "Agent"} ·{" "}
                      {formatTimestamp(message.timestamp)}
                    </p>
                  </div>
                );
              })
            )}
          </div>

          {chatError && (
            <p className="text-xs sm:text-sm text-red-600">{chatError}</p>
          )}

          <form
            onSubmit={handleChatSubmit}
            className="flex items-center gap-2 sm:gap-3"
          >
            <input
              type="text"
              value={chatInput}
              onChange={(event) => setChatInput(event.target.value)}
              placeholder="Type a message..."
              className="flex-1 rounded-full border border-surface-strong/60 bg-surface px-3 py-2 sm:px-4 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-accent"
              disabled={isSending}
            />
            <button
              type="submit"
              disabled={isSending || !chatInput.trim()}
              className="inline-flex items-center px-3 py-2 sm:px-4 rounded-full bg-accent hover:bg-accent-hover text-accent-foreground text-xs sm:text-sm font-semibold disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
            >
              {isSending ? "Sending..." : "Send"}
            </button>
          </form>
        </div>
      </section>
    </div>
  );
}
