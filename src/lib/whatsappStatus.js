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
    return "bg-accent/20 text-accent";
  }

  switch (tone) {
    case "success":
      return "bg-accent text-accent-foreground";
    case "warning":
      return "bg-surface-strong/60 text-muted";
    default:
      return "bg-surface text-muted";
  }
};
