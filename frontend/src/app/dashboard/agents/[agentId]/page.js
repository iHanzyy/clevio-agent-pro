"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

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
  const [knowledgeListingSupported, setKnowledgeListingSupported] =
    useState(null);
  const [localKnowledgeHistory, setLocalKnowledgeHistory] = useState([]);
  const [selectedKnowledgeFiles, setSelectedKnowledgeFiles] = useState([]);
  const [knowledgeUploading, setKnowledgeUploading] = useState(false);
  const [knowledgeInputKey, setKnowledgeInputKey] = useState(() => Date.now());
  const [whatsAppLoading, setWhatsAppLoading] = useState(false);
  const [whatsAppStatusLoading, setWhatsAppStatusLoading] = useState(false);
  const [whatsAppError, setWhatsAppError] = useState("");
  const [whatsAppQr, setWhatsAppQr] = useState(null);
  const [showWhatsAppQr, setShowWhatsAppQr] = useState(false);
  const [whatsAppSessionInfo, setWhatsAppSessionInfo] = useState(
    EMPTY_WHATSAPP_SESSION,
  );
  const whatsAppPollRef = useRef(null);
  const whatsAppStatusLoadingRef = useRef(false);

  const authUrl = searchParams?.get("authUrl");
  const authState = searchParams?.get("authState");

  const knowledgeStorageKey = useMemo(
    () =>
      params?.agentId
        ? `agent_knowledge_history_${params.agentId}`
        : null,
    [params?.agentId],
  );

  const whatsAppStorageKey = useMemo(
    () => (agent?.id ? `agent_whatsapp_session_${agent.id}` : null),
    [agent?.id],
  );

  const persistWhatsAppSession = useCallback(
    (session) => {
      if (!whatsAppStorageKey || typeof window === "undefined") {
        return;
      }
      try {
        if (!session) {
          sessionStorage.removeItem(whatsAppStorageKey);
        } else {
          sessionStorage.setItem(
            whatsAppStorageKey,
            JSON.stringify(session),
          );
        }
      } catch (err) {
        console.warn("Unable to persist WhatsApp session", err);
      }
    },
    [whatsAppStorageKey],
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
      setWhatsAppSessionInfo({
        status: "inactive",
        isActive: false,
        qrImage: null,
        qrUrl: null,
      });
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

        persistWhatsAppSession(nextSession);
        return nextSession;
      });

      const qrValue =
        nextSession.qrImage || nextSession.qrUrl || session.qrImage || session.qrUrl || null;
      setWhatsAppQr(qrValue);
      setShowWhatsAppQr((prev) => prev && Boolean(qrValue));
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
        persistWhatsAppSession(next);
        return next;
      });
    } finally {
      whatsAppStatusLoadingRef.current = false;
      setWhatsAppStatusLoading(false);
    }
  }, [agent?.id, persistWhatsAppSession]);

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

  const persistLocalKnowledgeHistory = useCallback(
    (records) => {
      if (!knowledgeStorageKey || typeof window === "undefined") {
        return;
      }
      try {
        if (!records || records.length === 0) {
          sessionStorage.removeItem(knowledgeStorageKey);
        } else {
          sessionStorage.setItem(
            knowledgeStorageKey,
            JSON.stringify(records),
          );
        }
      } catch (err) {
        console.warn("Unable to persist knowledge history", err);
      }
    },
    [knowledgeStorageKey],
  );

  const mergeDocumentHistory = useCallback((incoming = [], existing = []) => {
    const seen = new Set();
    const merged = [...incoming, ...existing];
    return merged.filter((doc) => {
      if (!doc) {
        return false;
      }
      const key =
        doc.id ||
        `${doc.filename || "file"}-${doc.created_at || ""}-${doc.size_bytes || ""}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }, []);

  useEffect(() => {
    if (!knowledgeStorageKey || typeof window === "undefined") {
      setLocalKnowledgeHistory([]);
      return;
    }
    try {
      const stored = sessionStorage.getItem(knowledgeStorageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setLocalKnowledgeHistory(parsed);
        } else {
          setLocalKnowledgeHistory([]);
        }
      } else {
        setLocalKnowledgeHistory([]);
      }
    } catch (err) {
      console.warn("Unable to load knowledge history", err);
      setLocalKnowledgeHistory([]);
    }
  }, [knowledgeStorageKey]);

  useEffect(() => {
    if (knowledgeListingSupported === false) {
      setKnowledge(localKnowledgeHistory);
    }
  }, [knowledgeListingSupported, localKnowledgeHistory]);

  useEffect(() => {
    if (!params?.agentId) {
      return;
    }
    setKnowledgeListingSupported(null);
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

    if (knowledgeListingSupported === false) {
      setKnowledge(localKnowledgeHistory);
      setKnowledgeError("");
      setKnowledgeLoading(false);
      return;
    }

    setKnowledgeLoading(true);
    setKnowledgeError("");
    try {
      const result = await apiService.getAgentDocuments(params.agentId);
      const supportsListing = Array.isArray(result)
        ? true
        : result?.supportsListing !== false;
      const items = Array.isArray(result)
        ? result
        : Array.isArray(result?.items)
        ? result.items
        : [];

      setKnowledgeListingSupported(supportsListing);
      if (supportsListing) {
        setKnowledge(items);
      } else {
        setKnowledge(localKnowledgeHistory);
      }
    } catch (err) {
      setKnowledgeError(
        err?.message || "Unable to load uploaded knowledge files."
      );
    } finally {
      setKnowledgeLoading(false);
    }
  }, [
    params?.agentId,
    user,
    knowledgeListingSupported,
    localKnowledgeHistory,
  ]);

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

  useEffect(() => {
    if (!whatsAppStorageKey || typeof window === "undefined") {
      return;
    }

    try {
      const stored = sessionStorage.getItem(whatsAppStorageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        setWhatsAppSessionInfo(parsed);
        if (parsed.qrImage || parsed.qrUrl) {
          setWhatsAppQr(parsed.qrImage || parsed.qrUrl || null);
          setShowWhatsAppQr(Boolean(parsed.qrImage || parsed.qrUrl));
        }
      } else {
        setWhatsAppSessionInfo(EMPTY_WHATSAPP_SESSION);
      }
    } catch (err) {
      console.warn("Unable to load stored WhatsApp session", err);
      setWhatsAppSessionInfo(EMPTY_WHATSAPP_SESSION);
    }
  }, [whatsAppStorageKey]);

  const capabilitySummary = useMemo(() => {
    const labels = [];
    if (authUrl) {
      labels.push("Gmail (authorization pending)");
    }
    if (
      Array.isArray(agent?.allowed_tools) &&
      agent.allowed_tools.includes("gmail") &&
      !authUrl
    ) {
      labels.push("Gmail");
    }
    if (
      Array.isArray(agent?.allowed_tools) &&
      agent.allowed_tools.includes("calendar")
    ) {
      labels.push("Calendar");
    }
    if (!labels.includes("WhatsApp")) {
      labels.push("WhatsApp");
    }
    if (labels.length === 0) {
      labels.push("Core agent capabilities");
    }
    return labels.join(", ");
  }, [agent, authUrl]);

  const handleWhatsAppQr = async () => {
    if (!agent) {
      return;
    }

    setWhatsAppError("");
    setWhatsAppLoading(true);
    setShowWhatsAppQr(false);
    setWhatsAppQr(null);
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

        persistWhatsAppSession(nextSession);
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
      } else if (!session.isActive) {
        setShowWhatsAppQr(false);
        setWhatsAppQr(null);
        setWhatsAppError(
          "QR code unavailable right now. Please try again shortly.",
        );
      }
      if (session.isActive) {
        setShowWhatsAppQr(false);
        setWhatsAppQr(null);
      } else {
        void refreshWhatsAppSession();
      }
    } catch (error) {
      setWhatsAppError(
        error?.message || "Unable to initialise WhatsApp session right now.",
      );
      setWhatsAppSessionInfo((previous) => {
        const next = previous || EMPTY_WHATSAPP_SESSION;
        persistWhatsAppSession(next);
        return next;
      });
      setWhatsAppQr(null);
      setShowWhatsAppQr(false);
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
      const uploadResult = await apiService.uploadAgentDocuments(
        agent.id,
        selectedKnowledgeFiles,
      );
      const uploadedItems = Array.isArray(uploadResult?.items)
        ? uploadResult.items.filter(Boolean)
        : [];

      const now = new Date().toISOString();
      const fallbackRecords =
        uploadedItems.length > 0
          ? uploadedItems
          : selectedKnowledgeFiles.map((file, index) => ({
              id: `local-${agent.id}-${Date.now()}-${index}-${Math.random()
                .toString(36)
                .slice(2, 8)}`,
              filename: file.name,
              size_bytes: file.size ?? null,
              chunk_count: null,
              content_type: file.type || "application/octet-stream",
              created_at: now,
              _localOnly: true,
            }));

      const shouldPersistLocally =
        knowledgeListingSupported === false ||
        fallbackRecords.some((record) => record?._localOnly);

      if (shouldPersistLocally) {
        setKnowledgeListingSupported(false);
        setLocalKnowledgeHistory((prev) => {
          const next = mergeDocumentHistory(fallbackRecords, prev);
          persistLocalKnowledgeHistory(next);
          return next;
        });
        setKnowledge((prev) =>
          mergeDocumentHistory(fallbackRecords, prev),
        );
      } else {
        await loadKnowledge();
      }

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

      {authUrl && (
        <div className="p-4 rounded-lg border border-yellow-300 bg-yellow-50 text-sm text-yellow-800">
          <p className="font-semibold">
            Action required: connect Google Workspace
          </p>
          <p className="mt-1">
            This agent needs permission to use Gmail. Click the button below to
            continue the Google authorization flow.
          </p>
          <a
            href={authUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center mt-3 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold"
          >
            Continue with Google
          </a>
          {authState && (
            <p className="mt-2 text-xs text-yellow-700">
              Keep this window open until the Google authorization completes.
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
                {whatsAppLoading && (
                  <p className="text-sm text-gray-700 dark:text-gray-200">
                    Generating WhatsApp QR code…
                  </p>
                )}
                {!whatsAppLoading && whatsAppQr && (
                  <div className="space-y-3 text-center">
                    <p className="text-sm text-gray-700 dark:text-gray-200">
                      Scan this QR code in WhatsApp &gt; Linked Devices to link
                      your automation session.
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
                    <p className="text-xs text-gray-500 dark:text-gray-300">
                      QR codes expire quickly. Refresh if the scan times out.
                    </p>
                  </div>
                )}
                {!whatsAppLoading && !whatsAppQr && !whatsAppError && (
                  <p className="text-sm text-gray-700 dark:text-gray-200">
                    QR code is not available yet. Please try again shortly.
                  </p>
                )}
                {!whatsAppLoading && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowWhatsAppQr(false);
                      setWhatsAppQr(null);
                      setWhatsAppError("");
                    }}
                    className="inline-flex items-center px-3 py-1.5 rounded-md bg-gray-200 hover:bg-gray-300 text-sm font-medium text-gray-700 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-gray-100 transition"
                  >
                    Close QR Preview
                  </button>
                )}
                {whatsAppError && (
                  <p className="text-sm text-red-600">{whatsAppError}</p>
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
            {authUrl
              ? "Complete the Google authorization before running email tasks."
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

        {knowledgeListingSupported === false && (
          <div className="p-3 rounded-lg border border-indigo-200 bg-indigo-50 text-xs text-indigo-800 dark:border-indigo-500/60 dark:bg-indigo-900/40 dark:text-indigo-100">
            Upload history is stored locally for this session because the
            backend does not expose a document listing endpoint. Refreshing the
            page or signing out will clear this list.
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
              {knowledgeListingSupported === false
                ? "Uploads are tracked locally for this session. Add a document to start building the history."
                : "No knowledge documents uploaded yet."}
            </p>
          ) : (
            <div className="space-y-3">
              {knowledge.map((doc) => (
                <div
                  key={doc.id}
                  className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/60 p-4"
                >
                  <div className="flex items-center justify-between text-sm">
                    <p className="font-medium text-gray-900 dark:text-gray-100">
                      {doc.filename}
                    </p>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {formatDateTime(doc.created_at)}
                    </span>
                  </div>
                  <div className="mt-2 grid md:grid-cols-4 gap-2 text-xs text-gray-600 dark:text-gray-400">
                    <span>Size: {formatBytes(doc.size_bytes)}</span>
                    <span>Chunks: {doc.chunk_count ?? "—"}</span>
                    <span>
                      Type: {doc.content_type || "Unknown"}{" "}
                    </span>
                    {doc._localOnly && (
                      <span className="text-indigo-500 dark:text-indigo-300 font-medium">
                        Session only
                      </span>
                    )}
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
