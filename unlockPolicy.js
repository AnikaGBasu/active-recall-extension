(function () {
  const root = window.BeforeYouCopy || (window.BeforeYouCopy = {});

  function normalizeMode(mode) {
    return ["gentle", "medium", "high", "auto"].includes(mode) ? mode : "medium";
  }

  function resolveMode(selectedMode, riskLevel) {
    const mode = normalizeMode(selectedMode);
    if (mode !== "auto") {
      return mode;
    }

    if (riskLevel === "low") {
      return "gentle";
    }
    if (riskLevel === "high") {
      return "high";
    }
    return "medium";
  }

  function decide(context) {
    const mode = normalizeMode(context.mode);
    const score = Number(context.response_score);

    if (context.skipped) {
      return { action: "unlock", reason: "Student skipped the scaffold." };
    }

    if (mode === "gentle") {
      return { action: "unlock", reason: "Gentle mode unlocks after an answer or skip." };
    }

    if (mode === "medium") {
      if (score >= 2) {
        return { action: "unlock", reason: "Medium mode threshold met." };
      }
      if (!context.followup_used) {
        return { action: "follow_up", reason: "Medium mode asks one follow-up for low-effort responses." };
      }
      return { action: "unlock", reason: "Medium mode unlocks after one follow-up." };
    }

    if (score >= 3) {
      return { action: "unlock", reason: "High mode threshold met." };
    }
    if (!context.followup_used) {
      return { action: "follow_up", reason: "High mode asks one follow-up before skip is offered." };
    }
    return { action: "skip_reason_required", reason: "High mode allows skip after one follow-up." };
  }

  root.unlockPolicy = {
    normalizeMode,
    resolveMode,
    decide
  };
})();
