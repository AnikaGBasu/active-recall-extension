(function () {
  const root = window.BeforeYouCopy || (window.BeforeYouCopy = {});

  const SYSTEM_PROMPT = `You are evaluating a student's brief reflection in a K-12 GenAI literacy scaffold.

Use this rubric:
0 = Empty, irrelevant, or nonsense
1 = Filler response
2 = Minimal but relevant
3 = Meaningful and specific
4 = Thoughtful, specific, and clearly reflective

Consider:
* Relevance to the application question
* Specificity
* Effort
* Whether the response demonstrates the target GenAI literacy concept
* Whether the student identifies verification, authorship, reasoning, missing perspective, voice, summary limitation, translation choice, or understanding when appropriate

Return only valid JSON:
{
"response_score": 3,
"response_label": "meaningful",
"reason": "The student identified a specific claim to verify.",
"feedback": "Good - you identified a specific claim to check.",
"unlock_recommendation": "allow"
}`;

  function clampScore(value) {
    const score = Number(value);
    if (!Number.isFinite(score)) {
      return 0;
    }
    return Math.max(0, Math.min(4, Math.round(score)));
  }

  function fallbackEvaluation(response, intervention, error) {
    const trimmed = (response || "").trim();
    const score = trimmed ? 2 : 0;
    return {
      response_score: score,
      response_label: trimmed ? "minimal" : "empty",
      reason: error && error.message === "LLM_NOT_CONFIGURED"
        ? "No LLM evaluator is configured, so the extension used a minimal non-blocking fallback."
        : "The LLM evaluator was unavailable, so the extension used a minimal non-blocking fallback.",
      feedback: trimmed
        ? intervention.feedbackIfGood
        : "Try adding one specific detail before you copy.",
      unlock_recommendation: trimmed ? "allow" : "follow_up",
      llm_error: error ? error.message : ""
    };
  }

  function sanitizeEvaluation(result, intervention) {
    const score = clampScore(result.response_score);
    return {
      response_score: score,
      response_label: result.response_label || (score >= 3 ? "meaningful" : "minimal"),
      reason: result.reason || "The response was evaluated with the GenAI literacy rubric.",
      feedback: result.feedback || (score >= 2
        ? intervention.feedbackIfGood
        : "Try adding one specific detail before you copy."),
      unlock_recommendation: result.unlock_recommendation || (score >= 2 ? "allow" : "follow_up")
    };
  }

  async function evaluateResponse(context) {
    const intervention = context.intervention;
    const payload = {
      intervention_family: context.intervention_family,
      cognitive_risk: context.cognitive_risk,
      risk_level: context.risk_level,
      mode: context.mode,
      application_question: context.application_question,
      student_response: context.student_response || "",
      rubric: "0 empty/irrelevant, 1 filler, 2 minimal but relevant, 3 meaningful and specific, 4 thoughtful and clearly reflective"
    };

    try {
      const result = await root.llmClient.callJson({
        task: "reflection_evaluator",
        systemPrompt: SYSTEM_PROMPT,
        userPrompt: JSON.stringify(payload, null, 2),
        temperature: 0.1
      });

      return sanitizeEvaluation(result, intervention);
    } catch (error) {
      console.warn("Before You Copy: evaluator fallback used.", error);
      return fallbackEvaluation(context.student_response, intervention, error);
    }
  }

  root.responseEvaluator = {
    evaluateResponse,
    sanitizeEvaluation
  };
})();
