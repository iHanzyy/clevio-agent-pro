const defaultHelper =
  "Connect this agent to WhatsApp to start replying to conversations.";

export const describeWhatsAppStatus = (session) => {
  if (!session) {
    return {
      label: "Not connected",
      tone: "neutral",
      helper: defaultHelper,
    };
  }

  const awaitingLink = Boolean(session.qrImage || session.qrUrl);
  const normalizedStatus =
    typeof session.status === "string"
      ? session.status.toLowerCase()
      : undefined;

  if (session.isActive) {
    return {
      label: "Connected",
      tone: "success",
      helper: "WhatsApp session is live and ready to receive messages.",
    };
  }

  if (awaitingLink || normalizedStatus === "pending") {
    return {
      label: "Not connected",
      tone: "warning",
      helper: "Scan the QR code in WhatsApp within 60 seconds to finish.",
    };
  }

  return {
    label: "Not connected",
    tone: "neutral",
    helper: defaultHelper,
  };
};

export const toneToBadgeClasses = (tone, { loading = false } = {}) => {
  if (loading) {
    return "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200";
  }

  switch (tone) {
    case "success":
      return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/70 dark:text-emerald-200";
    case "warning":
      return "bg-amber-100 text-amber-700 dark:bg-amber-900/70 dark:text-amber-200";
    default:
      return "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200";
  }
};
