(function () {
  const root = window.BeforeYouCopy || (window.BeforeYouCopy = {});

  const SYSTEM_PROMPT = `You are classifying a student's copy event from a generative AI tool for a K-12 GenAI literacy extension.

Your goal is not to identify the school subject. Your goal is to identify what the student needs to learn about responsible generative AI use in this moment.

Classify:

1. task_type
2. cognitive_risk
3. intervention_family
4. risk_level: low, medium, or high
5. risk_factors
6. reason

Allowed task_type values:
["explanation", "factual_lookup", "writing_generation", "revision", "problem_solving", "coding_help", "summarization", "brainstorming", "argumentation", "translation", "unknown"]

Allowed intervention_family values:
["active_recall", "verification", "authorship_reflection", "revision_comparison", "step_reconstruction", "error_explanation", "main_idea_recall", "selection_rationale", "counterargument", "meaning_grammar_check", "general_reflection"]

Risk should be categorical only:
["low", "medium", "high"]

Use the latest_user_prompt_excerpt as the strongest signal when it is available.

Important routing guidance:

Use this routing table:

* explanation -> passive comprehension -> active_recall
* factual_lookup -> hallucination risk -> verification
* writing_generation -> authorship loss -> authorship_reflection
* revision -> loss of voice -> revision_comparison
* problem_solving -> reasoning bypass -> step_reconstruction
* coding_help -> debugging bypass -> error_explanation
* summarization -> shallow synthesis -> main_idea_recall
* brainstorming -> passive idea acceptance -> selection_rationale
* argumentation -> one-sided reasoning -> counterargument
* translation -> language-learning bypass -> meaning_grammar_check
* unknown -> general overreliance -> general_reflection

Definitions for each route:

* explanation: The student asked AI to teach, explain, clarify, or interpret a concept, process, event, relationship, or why/how something works. Risk: passive comprehension, where a clear AI explanation can feel like understanding even if the student cannot explain it independently. Scaffold: active_recall, where the student restates the main idea in their own words.
* factual_lookup: The student asked AI for a definition, date, name, fact, statistic, direct answer, or sourceable claim, including "what is/was", "who", "when", or "where" questions. Risk: hallucination risk, where the student may copy a confident but inaccurate, incomplete, or oversimplified claim. Scaffold: verification, where the student identifies a claim to check against a reliable source.
* writing_generation: The student asked AI to draft or compose new wording for an essay, paragraph, story, email, script, speech, discussion post, assignment response, or other student-submitted prose. Risk: authorship loss, where AI wording may replace the student's own interpretation, decisions, or voice. Scaffold: authorship_reflection, where the student separates their own ideas from AI wording and decides what to rewrite.
* revision: The student gave AI existing writing and asked it to revise, improve, edit, rephrase, shorten, expand, polish, or change tone. Risk: loss of voice, where revisions may change meaning, style, or ownership without the student noticing. Scaffold: revision_comparison, where the student compares the original and revised version and chooses what to keep.
* problem_solving: The student asked AI to solve a math, science, logic, or step-based problem, or to provide a worked solution. Risk: reasoning bypass, where the student may copy the answer without reconstructing the reasoning. Scaffold: step_reconstruction, where the student explains the first key step or why the solution works.
* coding_help: The student asked AI to write, debug, explain, fix, or improve code, errors, tests, or programming logic. Risk: debugging bypass, where the student may use code or fixes without understanding the cause of the problem. Scaffold: error_explanation, where the student explains the bug, fix, or code behavior.
* summarization: The student asked AI to condense, summarize, outline, or extract main points from a text, article, reading, video, notes, or source material. Risk: shallow synthesis, where the student may accept a summary without knowing what was emphasized, omitted, or combined. Scaffold: main_idea_recall, where the student recalls the main idea and a supporting detail or missing piece.
* brainstorming: The student asked AI for ideas, options, topics, examples, titles, questions, plans, or possibilities before choosing a direction. Risk: passive idea acceptance, where the student may take the first appealing idea without evaluating fit or originality. Scaffold: selection_rationale, where the student explains which idea they would choose and why.
* argumentation: The student asked AI to make, support, critique, or strengthen a claim, thesis, persuasive response, debate position, or evidence-based argument. Risk: one-sided reasoning, where the student may copy a persuasive answer without considering assumptions, evidence quality, or opposing views. Scaffold: counterargument, where the student identifies a missing perspective or challenge.
* translation: The student asked AI to translate text, explain meaning across languages, or help with grammar, phrasing, vocabulary, tone, or usage in another language. Risk: language-learning bypass, where the student may copy translated language without understanding meaning or grammar choices. Scaffold: meaning_grammar_check, where the student explains a key word, phrase, grammar choice, or tone difference.
* unknown: The task is unclear, mixed, missing context, or does not fit the other categories. Risk: general overreliance, where the student may use AI output without reflecting on understanding, trust, or contribution. Scaffold: general_reflection, where the student names something they understand, question, or would change.

Risk factors to consider:

* selected_text_length
* time_since_response, if available
* task_type
* exact_copy_likelihood
* prior_low_effort_responses
* selected_mode

Return only valid JSON:
{
"task_type": "...",
"cognitive_risk": "...",
"intervention_family": "...",
"risk_level": "low|medium|high",
"risk_factors": ["...", "..."],
"reason": "one short explanation"
}`;

  const ROUTING = {
    explanation: {
      cognitive_risk: "passive comprehension",
      intervention_family: "active_recall"
    },
    factual_lookup: {
      cognitive_risk: "hallucination risk",
      intervention_family: "verification"
    },
    writing_generation: {
      cognitive_risk: "authorship loss",
      intervention_family: "authorship_reflection"
    },
    revision: {
      cognitive_risk: "loss of voice",
      intervention_family: "revision_comparison"
    },
    problem_solving: {
      cognitive_risk: "reasoning bypass",
      intervention_family: "step_reconstruction"
    },
    coding_help: {
      cognitive_risk: "debugging bypass",
      intervention_family: "error_explanation"
    },
    summarization: {
      cognitive_risk: "shallow synthesis",
      intervention_family: "main_idea_recall"
    },
    brainstorming: {
      cognitive_risk: "passive idea acceptance",
      intervention_family: "selection_rationale"
    },
    argumentation: {
      cognitive_risk: "one-sided reasoning",
      intervention_family: "counterargument"
    },
    translation: {
      cognitive_risk: "language-learning bypass",
      intervention_family: "meaning_grammar_check"
    },
    unknown: {
      cognitive_risk: "general overreliance",
      intervention_family: "general_reflection"
    }
  };

  const ALLOWED_TASKS = Object.keys(ROUTING);
  const ALLOWED_RISKS = ["low", "medium", "high"];

  function classificationFromTaskType(taskType, options = {}) {
    const normalizedTaskType = ALLOWED_TASKS.includes(taskType) ? taskType : "unknown";
    const route = ROUTING[normalizedTaskType];
    const riskLevel = ALLOWED_RISKS.includes(options.risk_level)
      ? options.risk_level
      : "medium";

    return {
      task_type: normalizedTaskType,
      cognitive_risk: route.cognitive_risk,
      intervention_family: route.intervention_family,
      risk_level: riskLevel,
      risk_factors: Array.isArray(options.risk_factors)
        ? options.risk_factors.map(String).slice(0, 5)
        : [],
      reason: options.reason || "The intervention was routed through the Before You Copy task map.",
      classification_source: options.classification_source || "manual_task_choice",
      requires_task_choice: Boolean(options.requires_task_choice)
    };
  }

  function sanitizeClassification(result) {
    const taskType = ALLOWED_TASKS.includes(result.task_type)
      ? result.task_type
      : "unknown";
    const route = ROUTING[taskType];
    const riskLevel = ALLOWED_RISKS.includes(result.risk_level)
      ? result.risk_level
      : "medium";

    return {
      task_type: taskType,
      cognitive_risk: route.cognitive_risk,
      intervention_family: route.intervention_family,
      risk_level: riskLevel,
      risk_factors: Array.isArray(result.risk_factors)
        ? result.risk_factors.map(String).slice(0, 5)
        : [],
      reason: result.reason || "The copy event needs a brief responsible-use reflection.",
      classification_source: result.classification_source || "llm",
      requires_task_choice: false
    };
  }

  function fallbackClassification(error) {
    const route = ROUTING.unknown;
    return {
      task_type: "unknown",
      cognitive_risk: route.cognitive_risk,
      intervention_family: route.intervention_family,
      risk_level: "medium",
      risk_factors: ["LLM classification unavailable"],
      reason: error && error.message === "LLM_NOT_CONFIGURED"
        ? "No LLM access is configured, so the extension needs the student to choose the closest task type."
        : "The classifier was unavailable, so the extension needs the student to choose the closest task type.",
      llm_error: error ? error.message : "",
      classification_source: "fallback",
      requires_task_choice: true
    };
  }

  async function classifyCopyEvent(context) {
    const payload = {
      selected_text_length: context.selected_text_length,
      latest_user_prompt_excerpt: context.latest_user_prompt_excerpt || "",
      last_ai_output_excerpt: context.last_ai_output_excerpt || "",
      page_url: context.page_url,
      event_type: "copy",
      prior_low_effort_responses: context.prior_low_effort_responses || 0,
      selected_mode: context.selected_mode || "medium",
      time_since_response: context.time_since_response ?? null,
      exact_copy_likelihood: context.exact_copy_likelihood || "uncertain"
    };

    if (context.selected_text_for_classification) {
      payload.selected_text = context.selected_text_for_classification;
    }

    try {
      const result = await root.llmClient.callJson({
        task: "copy_event_classifier",
        systemPrompt: SYSTEM_PROMPT,
        userPrompt: JSON.stringify(payload, null, 2),
        temperature: 0.1
      });

      return sanitizeClassification(result);
    } catch (error) {
      console.warn("Before You Copy: classifier fallback used.", error);
      return fallbackClassification(error);
    }
  }

  root.classifier = {
    ROUTING,
    classifyCopyEvent,
    sanitizeClassification,
    classificationFromTaskType
  };
})();
