"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const GOOGLE_AUTH_TOOL_OVERRIDES = {
  gmail: "Gmail",
  calendar: "Google Calendar",
};

const normalizeToolId = (value) => (typeof value === "string" ? value : "")
  .trim()
  .toLowerCase();

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
    EMPTY_WHATSAPP_SESSION,
  );
  const whatsAppPollRef = useRef(null);
  const whatsAppStatusLoadingRef = useRef(false);

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
  const closeWhatsAppQrPreview = useCallback(() => {
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
    [agentToolIds],
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
    ? "border-green-300 bg-green-50 text-green-800"
    : googleAuthError
      ? "border-red-300 bg-red-50 text-red-800"
      : "border-yellow-300 bg-yellow-50 text-yellow-800";

  const clearGoogleAuthPoll = useCallback(() => {
    if (googleAuthPollRef.current) {
      clearInterval(googleAuthPollRef.current);
      googleAuthPollRef.current = null;
    }
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
          previous?.status === "connected"
            ? null
            : previous?.authUrl || null,
        authState:
          previous?.status === "connected"
            ? null
            : previous?.authState || null,
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
    [clearGoogleAuthPoll],
  );


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
        console.warn("Unable to auto-generate API key for WhatsApp session", err);
      }
    }

    if (!apiKey) {
      throw new Error(
        "API key unavailable. Please refresh your session or generate an API key before linking WhatsApp.",
      );
    }

    return apiKey;
  }, [agent?.config?.api_key, user?.subscription]);

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
      let nextSession = session;
      setWhatsAppSessionInfo((previous) => {
        const prev = previous || EMPTY_WHATSAPP_SESSION;
        const nextStatus = (session.status || "").toLowerCase();
        const shouldPreserveActive =
          prev.isActive &&
          !session.isActive &&
          !session.qrImage &&
          !session.qrUrl &&
          (!nextStatus ||
            ["inactive", "not_linked", "not_found", "unknown"].includes(
              nextStatus,
            ));

        nextSession = shouldPreserveActive
          ? {
              ...prev,
              updatedAt: session.updatedAt || prev.updatedAt || null,
              raw: session.raw || prev.raw || null,
            }
          : session;

        return nextSession;
      });

      const qrValue =
        nextSession.qrImage || nextSession.qrUrl || session.qrImage || session.qrUrl || null;
      setWhatsAppQr(qrValue);
      setShowWhatsAppQr((prev) => prev && Boolean(qrValue));
      if (qrValue) {
        setWhatsAppQrCountdown(null);
      }
    } catch (err) {
      setWhatsAppError(
        err?.message ||
          "Unable to load WhatsApp session status right now. Please try again.",
      );
      setWhatsAppSessionInfo((previous) => {
        const next = {
          ...(previous || EMPTY_WHATSAPP_SESSION),
          status: previous?.status || "active",
        };
        return next;
      });
    } finally {
      whatsAppStatusLoadingRef.current = false;
      setWhatsAppStatusLoading(false);
    }
  }, [agent?.id]);

  const whatsAppStatusValue = useMemo(() => {
    const statusRaw =
      (whatsAppSessionInfo.status ||
        (whatsAppSessionInfo.isActive ? "active" : "inactive")) || "";
    return statusRaw.toLowerCase();
  }, [whatsAppSessionInfo.status, whatsAppSessionInfo.isActive]);

  const whatsAppStatusLabel = useMemo(() => {
    switch (whatsAppStatusValue) {
      case "awaiting_qr":
      case "waiting_qr":
      case "pending":
        return "Awaiting QR";
      case "qr_expired":
      case "expired":
        return "QR expired";
      case "connecting":
      case "connecting_qr":
        return "Connecting";
      case "connected":
      case "active":
        return "Active";
      case "not_found":
      case "inactive":
      default:
        return "Not linked";
    }
  }, [whatsAppStatusValue]);

  const whatsAppStatusClasses = useMemo(() => {
    if (whatsAppSessionInfo.isActive) {
      return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
    }
    if (whatsAppStatusLoading) {
      return "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200";
    }
    return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
  }, [whatsAppSessionInfo.isActive, whatsAppStatusLoading]);

  const whatsAppQrIsImage = useMemo(
    () =>
      typeof whatsAppQr === "string" &&
      (whatsAppQr.startsWith("data:image") || whatsAppQr.startsWith("http")),
    [whatsAppQr],
  );

  const whatsAppQrExpiresAt = useMemo(() => {
    const source = whatsAppSessionInfo.qrExpiresAt;
    if (typeof source === "number" && Number.isFinite(source)) {
      return source > 1e12 ? source : source * 1000;
    }
    if (typeof source === "string" && source.trim()) {
      const parsed = Date.parse(source);
      if (!Number.isNaN(parsed)) {
        return parsed;
      }
    }
    if (
      typeof whatsAppSessionInfo.qrExpiresInSeconds === "number" &&
      typeof whatsAppSessionInfo.qrGeneratedAt === "string"
    ) {
      const base = Date.parse(whatsAppSessionInfo.qrGeneratedAt);
      if (!Number.isNaN(base)) {
        return base + whatsAppSessionInfo.qrExpiresInSeconds * 1000;
      }
    }
    return null;
  }, [
    whatsAppSessionInfo.qrExpiresAt,
    whatsAppSessionInfo.qrExpiresInSeconds,
    whatsAppSessionInfo.qrGeneratedAt,
  ]);

  const whatsAppQrExpired =
    showWhatsAppQr &&
    !whatsAppSessionInfo.isActive &&
    ((typeof whatsAppQrCountdown === "number" &&
      whatsAppQrCountdown <= 0) ||
      ["expired", "qr_expired"].includes(whatsAppStatusValue));

  useEffect(() => {
    if (!params?.agentId) {
      return;
    }
    setKnowledge([]);
    setKnowledgeError("");
    setKnowledgeSuccess("");
  }, [params?.agentId]);

  useEffect(() => {
    if (!params?.agentId || authLoading) {
      return;
    }

    if (!user) {
      router.push("/login");
      return;
    }

    const abortController = new AbortController();

    const loadAgent = async () => {
      setLoading(true);
      setError("");
      try {
        const data = await apiService.getAgent(params.agentId);
        if (!abortController.signal.aborted) {
          setAgent(data);
          setDeleteError("");
          setChatMessages([]);
        }
      } catch (err) {
        console.error("Failed to load agent:", err);
        if (!abortController.signal.aborted) {
          setError(
            err?.message ||
              "Unable to load agent details right now. Please try again."
          );
        }
      } finally {
        if (!abortController.signal.aborted) {
          setLoading(false);
        }
      }
    };

    loadAgent();

    return () => abortController.abort();
  }, [params?.agentId, authLoading, user, router]);

  const loadKnowledge = useCallback(async () => {
    if (!params?.agentId || !user) {
      return;
    }

    setKnowledgeLoading(true);
    setKnowledgeError("");
    try {
      const result = await apiService.getAgentDocuments(params.agentId);
      const items = Array.isArray(result?.items) ? result.items : [];
      setKnowledge(items);
    } catch (err) {
      setKnowledgeError(
        err?.message || "Unable to load uploaded knowledge files."
      );
    } finally {
      setKnowledgeLoading(false);
    }
  }, [params?.agentId, user]);

  useEffect(() => {
    if (agent && user) {
      loadKnowledge();
    }
  }, [agent, user, loadKnowledge]);

  useEffect(() => {
    setWhatsAppError("");
    setWhatsAppLoading(false);
    void refreshWhatsAppSession();
  }, [refreshWhatsAppSession]);

  useEffect(() => {
    if (!showWhatsAppQr) {
      setWhatsAppQrCountdown(null);
      return;
    }
    if (!whatsAppQrExpiresAt) {
      setWhatsAppQrCountdown(null);
      return;
    }

    const updateCountdown = () => {
      const remainingSeconds = Math.max(
        0,
        Math.ceil((whatsAppQrExpiresAt - Date.now()) / 1000),
      );
      setWhatsAppQrCountdown(remainingSeconds);
    };

    updateCountdown();
    const timer = setInterval(updateCountdown, 1000);
    return () => {
      clearInterval(timer);
    };
  }, [showWhatsAppQr, whatsAppQrExpiresAt]);

  useEffect(() => {
    if (whatsAppSessionInfo.isActive) {
      setWhatsAppQrCountdown(null);
    }
  }, [whatsAppSessionInfo.isActive]);

  useEffect(() => {
    if (!showWhatsAppQr || !whatsAppSessionInfo.isActive) {
      return;
    }
    const timeout = setTimeout(() => {
      closeWhatsAppQrPreview();
    }, 4000);

    return () => clearTimeout(timeout);
  }, [showWhatsAppQr, whatsAppSessionInfo.isActive, closeWhatsAppQrPreview]);

  useEffect(() => {
    if (!agent?.id) {
      if (whatsAppPollRef.current) {
        clearInterval(whatsAppPollRef.current);
        whatsAppPollRef.current = null;
      }
      return undefined;
    }

    const shouldPoll =
      !whatsAppSessionInfo.isActive &&
      Boolean(whatsAppSessionInfo.raw) &&
      whatsAppStatusValue !== "inactive" &&
      whatsAppStatusValue !== "not_found";

    if (!shouldPoll) {
      if (whatsAppPollRef.current) {
        clearInterval(whatsAppPollRef.current);
        whatsAppPollRef.current = null;
      }
      return undefined;
    }

    if (!whatsAppPollRef.current) {
      whatsAppPollRef.current = setInterval(() => {
        void refreshWhatsAppSession();
      }, 5000);
    }

    return () => {
      if (whatsAppPollRef.current) {
        clearInterval(whatsAppPollRef.current);
        whatsAppPollRef.current = null;
      }
    };
  }, [
    agent?.id,
    refreshWhatsAppSession,
    whatsAppSessionInfo.raw,
    whatsAppSessionInfo.isActive,
    whatsAppStatusValue,
  ]);

  const capabilitySummary = useMemo(() => {
    const labels = [];
    if (googleToolIds.length > 0) {
      const suffix = googleAuthPending ? " (authorization pending)" : "";
      googleToolIds.forEach((toolId) => {
        const label = formatGoogleToolLabel(toolId);
        if (!labels.includes(label + suffix)) {
          labels.push(label + suffix);
        }
      });
    }
    if (!labels.includes("WhatsApp")) {
      labels.push("WhatsApp");
    }
    if (labels.length === 0) {
      labels.push("Core agent capabilities");
    }
    return labels.join(", ");
  }, [googleToolIds, googleAuthPending]);

  const handleWhatsAppQr = async () => {
    if (!agent) {
      return;
    }

    setWhatsAppError("");
    setWhatsAppLoading(true);
    setShowWhatsAppQr(false);
    setWhatsAppQr(null);
    setWhatsAppQrCountdown(null);
    try {
      if (!user?.user_id) {
        throw new Error("User identifier missing. Please re-authenticate.");
      }

      const apiKey = await getApiKeyForWhatsApp();
      const session = await apiService.createWhatsAppSession({
        userId: String(user.user_id),
        agentId: String(agent.id),
        agentName: agent.name,
        apiKey,
      });

      setWhatsAppSessionInfo((previous) => {
        const prev = previous || EMPTY_WHATSAPP_SESSION;
        const statusValue = (session.status || "").toLowerCase();
        const shouldPreserveActive =
          prev.isActive &&
          !session.isActive &&
          !session.qrImage &&
          !session.qrUrl &&
          (!statusValue ||
            ["inactive", "not_linked", "not_found", "unknown"].includes(
              statusValue,
            ));

        const nextSession = shouldPreserveActive
          ? {
              ...prev,
              updatedAt: session.updatedAt || prev.updatedAt || null,
              raw: session.raw || prev.raw || null,
            }
          : session;

        return nextSession;
      });
      const qr =
        session.qrImage ||
        session.qrUrl ||
        session.raw?.qr_image ||
        session.raw?.qr ||
        null;

      if (qr) {
        setWhatsAppQr(qr);
        setShowWhatsAppQr(true);
        setWhatsAppQrCountdown(null);
      } else if (!session.isActive) {
        setShowWhatsAppQr(false);
        setWhatsAppQr(null);
        setWhatsAppQrCountdown(null);
        setWhatsAppError(
          "QR code unavailable right now. Please try again shortly.",
        );
      }
      if (session.isActive) {
        setShowWhatsAppQr(false);
        setWhatsAppQr(null);
        setWhatsAppQrCountdown(null);
      } else {
        void refreshWhatsAppSession();
      }
    } catch (error) {
      setWhatsAppError(
        error?.message || "Unable to initialise WhatsApp session right now.",
      );
      setWhatsAppSessionInfo((previous) => {
        const next = previous || EMPTY_WHATSAPP_SESSION;
        return next;
      });
      setWhatsAppQr(null);
      setShowWhatsAppQr(false);
      setWhatsAppQrCountdown(null);
    } finally {
      setWhatsAppLoading(false);
    }
  };

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
      `Remove \\"${document?.filename || "this document"}\\" from this agent?`,
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
        err?.message || "Failed to delete knowledge document. Please try again.",
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
      } else if (response?.message && response.message !== "Agent execution started") {
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
        text:
          "Sorry, I ran into an error while processing that request. Please try again.",
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
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading agent...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-3xl mx-auto">
        <div className="p-6 bg-red-50 border border-red-200 rounded-lg">
          <h2 className="text-lg font-semibold text-red-700 mb-2">
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
      ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
      : "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200";

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            {agent.name}
          </h1>
          <p className="mt-2 flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <span>Agent ID:</span>
            <code className="px-2 py-1 rounded bg-gray-100 dark:bg-gray-800">
              {agent.id}
            </code>
          </p>
          {deleteError && (
            <p className="mt-2 text-sm text-red-600">{deleteError}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/dashboard/agents/${agent.id}/edit`}
            className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            Edit
          </Link>
          <button
            onClick={handleDelete}
            disabled={isDeleting}
            className="px-4 py-2 rounded-lg bg-red-500 hover:bg-red-600 text-white text-sm font-semibold disabled:opacity-60"
          >
            {isDeleting ? "Deleting..." : "Delete"}
          </button>
          <span
            className={`px-3 py-1 rounded-full text-xs font-semibold ${statusChipClasses}`}
          >
            {agent.status || "UNKNOWN"}
          </span>
        </div>
      </div>

      {requiresGoogleAuth && (
        <div
          className={`p-4 rounded-lg border text-sm ${googleAuthAlertClasses}`}
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
                <p className="mt-2 text-xs text-green-700">
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
                  className="inline-flex items-center mt-3 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold"
                >
                  Continue with Google
                </a>
              )}
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <button
                  onClick={() => {
                    void checkGoogleAuthStatus();
                  }}
                  disabled={googleAuthChecking}
                  className="inline-flex items-center px-3 py-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-sm font-semibold text-current disabled:opacity-60 disabled:cursor-not-allowed border border-current transition"
                >
                  {googleAuthChecking ? "Checking status..." : "Refresh status"}
                </button>
              </div>
              <p className="mt-2 text-xs text-yellow-700">
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

      <section className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 space-y-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          Configuration
        </h2>
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">
              LLM Model
            </p>
            <p className="text-sm text-gray-900 dark:text-gray-100">
              {agent.config?.model ||
                agent.config?.llm_model ||
                "Default"}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">
              Temperature
            </p>
            <p className="text-sm text-gray-900 dark:text-gray-100">
              {agent.config?.temperature ?? 0.7}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">
              Max Tokens
            </p>
            <p className="text-sm text-gray-900 dark:text-gray-100">
              {agent.config?.max_tokens ?? 1000}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">
              Memory Type
            </p>
            <p className="text-sm text-gray-900 dark:text-gray-100">
              {agent.config?.memory_type ?? "buffer"}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">
              Reasoning Strategy
            </p>
            <p className="text-sm text-gray-900 dark:text-gray-100">
              {agent.config?.reasoning_strategy ?? "react"}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">
              Capabilities
            </p>
            <p className="text-sm text-gray-900 dark:text-gray-100">
              {capabilitySummary}
            </p>
          </div>
        </div>
        {(agent.config?.system_message || agent.config?.system_prompt) && (
          <div>
            <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">
              System Prompt
            </p>
            <pre className="whitespace-pre-wrap text-sm leading-relaxed text-gray-900 dark:text-gray-100 bg-gray-50 dark:bg-gray-900/60 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              {agent.config.system_message || agent.config.system_prompt}
            </pre>
          </div>
        )}
        <div className="border-t border-dashed border-gray-200 dark:border-gray-700 pt-4 mt-4 space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                WhatsApp Session
              </p>
              <span
                className={`px-2.5 py-0.5 text-xs font-semibold rounded-full ${whatsAppStatusClasses}`}
              >
                {whatsAppStatusLoading ? "Checking..." : whatsAppStatusLabel}
              </span>
            </div>
            {whatsAppError && !showWhatsAppQr && (
              <p className="text-xs text-red-600 dark:text-red-400">
                {whatsAppError}
              </p>
            )}
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={handleWhatsAppQr}
                disabled={whatsAppLoading}
                className="inline-flex items-center px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm font-semibold transition disabled:opacity-60"
              >
                {whatsAppLoading
                  ? "Requesting QR..."
                  : whatsAppSessionInfo.isActive
                  ? "Re-link WhatsApp"
                  : "Scan WhatsApp QR"}
              </button>
              <button
                type="button"
                onClick={refreshWhatsAppSession}
                disabled={whatsAppStatusLoading || whatsAppLoading}
                className="inline-flex items-center px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-sm font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-60"
              >
                {whatsAppStatusLoading ? "Refreshing..." : "Refresh Status"}
              </button>
            </div>
            {whatsAppSessionInfo.isActive && (
              <p className="text-xs text-green-600 dark:text-green-300">
                WhatsApp session is active. Re-scan the QR if you need to link a
                different device.
              </p>
            )}
            {showWhatsAppQr && (
              <div className="rounded-lg border border-dashed border-green-400 bg-green-50/60 dark:bg-green-900/20 p-4 space-y-3">
                {whatsAppSessionInfo.isActive ? (
                  <div className="space-y-4 text-center">
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-green-700 dark:bg-green-800/60 dark:text-green-200">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                        className="h-10 w-10"
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
                      <p className="text-sm font-semibold text-green-700 dark:text-green-200">
                        WhatsApp connected
                      </p>
                      <p className="text-xs text-gray-600 dark:text-gray-300">
                        We detected the linked device. Messages can now be sent
                        through this agent.
                      </p>
                      {whatsAppSessionInfo.updatedAt && (
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Linked at {formatDateTime(whatsAppSessionInfo.updatedAt)}.
                        </p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={closeWhatsAppQrPreview}
                      className="inline-flex items-center px-3 py-1.5 rounded-md bg-green-600 hover:bg-green-700 text-sm font-semibold text-white"
                    >
                      Close
                    </button>
                  </div>
                ) : (
                  <>
                    {whatsAppLoading && (
                      <p className="text-sm text-gray-700 dark:text-gray-200">
                        Generating WhatsApp QR code…
                      </p>
                    )}
                    {!whatsAppLoading && whatsAppQr && (
                      <div className="space-y-4 text-center">
                        <p className="text-sm text-gray-700 dark:text-gray-200">
                          Open WhatsApp &gt; Linked Devices and scan this code
                          to connect the agent.
                        </p>
                        {whatsAppQrIsImage ? (
                          <div className="mx-auto inline-flex rounded-md border border-gray-200 bg-white p-2">
                            <Image
                              src={whatsAppQr}
                              alt="WhatsApp QR Code"
                              width={216}
                              height={216}
                              unoptimized
                              className="h-auto w-[216px]"
                            />
                          </div>
                        ) : (
                          <a
                            href={whatsAppQr}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold"
                          >
                            Open WhatsApp Link
                          </a>
                        )}
                        {typeof whatsAppQrCountdown === "number" ? (
                          <p
                            className={`text-xs font-semibold ${
                              whatsAppQrExpired
                                ? "text-red-600 dark:text-red-400"
                                : "text-gray-600 dark:text-gray-300"
                            }`}
                          >
                            {whatsAppQrExpired
                              ? "QR expired — generate a new code to continue."
                              : `QR expires in ${whatsAppQrCountdown}s`}
                          </p>
                        ) : (
                          <p className="text-xs text-gray-500 dark:text-gray-300">
                            QR codes expire after about a minute. Regenerate if
                            the scan times out.
                          </p>
                        )}
                        <ol className="mx-auto max-w-md space-y-1 text-left text-xs text-gray-600 dark:text-gray-300">
                          <li>
                            <span className="font-semibold text-gray-700 dark:text-gray-200">
                              1.
                            </span>{" "}
                            Open WhatsApp on your phone.
                          </li>
                          <li>
                            <span className="font-semibold text-gray-700 dark:text-gray-200">
                              2.
                            </span>{" "}
                            Tap <span className="font-medium">Linked Devices</span>{" "}
                            &gt; <span className="font-medium">Link a Device</span>.
                          </li>
                          <li>
                            <span className="font-semibold text-gray-700 dark:text-gray-200">
                              3.
                            </span>{" "}
                            Point the camera at this QR before it expires.
                          </li>
                        </ol>
                        {whatsAppSessionInfo.updatedAt && (
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            Last status update {formatDateTime(whatsAppSessionInfo.updatedAt)}.
                          </p>
                        )}
                        <div className="flex flex-wrap items-center justify-center gap-3">
                          {whatsAppQrExpired && (
                            <button
                              type="button"
                              onClick={handleWhatsAppQr}
                              disabled={whatsAppLoading}
                              className="inline-flex items-center px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm font-semibold disabled:opacity-60"
                            >
                              {whatsAppLoading ? "Requesting..." : "Generate new QR"}
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={refreshWhatsAppSession}
                            disabled={whatsAppStatusLoading || whatsAppLoading}
                            className="inline-flex items-center px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-sm font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-60"
                          >
                            {whatsAppStatusLoading ? "Refreshing..." : "Refresh status"}
                          </button>
                          <button
                            type="button"
                            onClick={closeWhatsAppQrPreview}
                            className="inline-flex items-center px-3 py-1.5 rounded-md bg-gray-200 hover:bg-gray-300 text-sm font-medium text-gray-700 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-gray-100 transition"
                          >
                            Close
                          </button>
                        </div>
                      </div>
                    )}
                    {!whatsAppLoading && !whatsAppQr && !whatsAppError && (
                      <p className="text-sm text-gray-700 dark:text-gray-200">
                        QR code is being prepared. This can take a few seconds…
                      </p>
                    )}
                    {!whatsAppLoading && whatsAppError && (
                      <p className="text-sm text-red-600">{whatsAppError}</p>
                    )}
                  </>
                )}
              </div>
            )}
        </div>
      </section>

      <section className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Next Steps
        </h2>
        <ul className="space-y-2 text-sm text-gray-700 dark:text-gray-300 list-disc list-inside">
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

      <section className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 space-y-6">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Add Knowledge
          </h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Upload up to 10 documents (PDF, PPTX, DOCX, TXT), 20 MB per file, to
            enrich this agent&apos;s context.
          </p>
        </div>

        {(knowledgeError || knowledgeSuccess) && (
          <div
            className={`p-3 rounded-lg text-sm ${
              knowledgeError
                ? "bg-red-50 border border-red-200 text-red-700"
                : "bg-green-50 border border-green-200 text-green-700"
            }`}
          >
            {knowledgeError || knowledgeSuccess}
          </div>
        )}

        <div className="space-y-4">
          <div className="flex flex-col md:flex-row md:items-center md:space-x-4 space-y-3 md:space-y-0">
            <input
              key={knowledgeInputKey}
              type="file"
              multiple
              accept=".pdf,.pptx,.docx,.txt"
              onChange={handleKnowledgeFileChange}
              className="flex-1 text-sm text-gray-700 dark:text-gray-200 file:mr-4 file:rounded-md file:border-0 file:bg-indigo-600 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-indigo-700"
              disabled={knowledgeUploading}
            />
            <button
              type="button"
              onClick={handleKnowledgeUpload}
              disabled={
                knowledgeUploading || selectedKnowledgeFiles.length === 0
              }
              className="inline-flex items-center px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {knowledgeUploading ? "Uploading..." : "Upload"}
            </button>
          </div>
          {selectedKnowledgeFiles.length > 0 && (
            <div className="rounded-lg border border-dashed border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/60 p-3">
              <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
                Files ready to upload:
              </p>
              <ul className="space-y-1 text-xs text-gray-600 dark:text-gray-300">
                {selectedKnowledgeFiles.map((file) => (
                  <li key={file.name}>
                    {file.name} · {formatBytes(file.size)}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div>
          <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-3">
            Upload History
          </h3>
          {knowledgeLoading ? (
            <div className="flex items-center justify-center py-6">
              <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : knowledge.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              No knowledge documents uploaded yet.
            </p>
          ) : (
            <div className="space-y-3">
              {knowledge.map((doc) => (
                <div
                  key={doc.id}
                  className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/60 p-4"
                >
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between text-sm">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-gray-100">
                        {doc.filename}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Uploaded {formatDateTime(doc.createdAt || doc.created_at)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleKnowledgeDelete(doc)}
                        className="inline-flex items-center rounded-md border border-red-200 bg-red-50 px-3 py-1 text-xs font-semibold text-red-600 hover:border-red-300 hover:bg-red-100 dark:border-red-700 dark:bg-red-900/40 dark:text-red-200"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                  <div className="mt-2 grid md:grid-cols-4 gap-2 text-xs text-gray-600 dark:text-gray-400">
                    <span>Size: {formatBytes(doc.sizeBytes ?? doc.size_bytes)}</span>
                    <span>Chunks: {doc.chunkCount ?? doc.chunk_count ?? "—"}</span>
                    <span>Type: {doc.contentType || doc.content_type || "Unknown"}</span>
                    <span>ID: {doc.id || "—"}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Test the Agent
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Start a quick conversation to verify your configuration. Messages here
          use the live agent and tools you selected.
        </p>
        <div className="space-y-4">
          <div className="h-72 overflow-y-auto rounded-lg border border-gray-200 dark:border-gray-700 bg-slate-50 dark:bg-gray-900/60 p-4 flex flex-col space-y-4">
            {chatMessages.length === 0 ? (
              <div className="m-auto text-center text-sm text-gray-500 dark:text-gray-400">
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
                  ? "ml-auto bg-green-500 text-white"
                  : message.error
                  ? "mr-auto bg-red-100 text-red-700"
                  : "mr-auto bg-white text-gray-900 dark:bg-gray-800 dark:text-gray-100";

                return (
                  <div key={message.id} className="max-w-[80%]">
                    <div
                      className={`rounded-2xl px-4 py-2 shadow-sm ${bubbleClasses}`}
                    >
                      <p className="text-sm whitespace-pre-wrap">
                        {message.text}
                      </p>
                    </div>
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      {isUser ? "You" : "Agent"} ·{" "}
                      {formatTimestamp(message.timestamp)}
                    </p>
                  </div>
                );
              })
            )}
          </div>

          {chatError && (
            <p className="text-sm text-red-600">{chatError}</p>
          )}

          <form
            onSubmit={handleChatSubmit}
            className="flex items-center gap-3"
          >
            <input
              type="text"
              value={chatInput}
              onChange={(event) => setChatInput(event.target.value)}
              placeholder="Type a message..."
              className="flex-1 rounded-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              disabled={isSending}
            />
            <button
              type="submit"
              disabled={isSending || !chatInput.trim()}
              className="inline-flex items-center px-4 py-2 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isSending ? "Sending..." : "Send"}
            </button>
          </form>
        </div>
      </section>
    </div>
  );
}
