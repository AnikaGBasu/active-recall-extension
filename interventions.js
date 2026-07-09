(function () {
  const root = window.BeforeYouCopy || (window.BeforeYouCopy = {});

  const INTERVENTIONS = {
    active_recall: {
      title: "Active Recall Check",
      cognitiveRisk: "passive comprehension",
      teach: "AI explanations can sound clear because they are fluent, but fluency can create the feeling of understanding before you can explain the idea yourself.",
      apply: "Before copying, explain the main idea in your own words without using the AI's wording.",
      feedbackIfGood: "Good - you restated the idea in your own words. That means you are using AI as support, not as a replacement for understanding.",
      takeaway: "Fluent AI output is not the same as your own understanding.",
      gentleQuestion: "Which responsible step fits this copy moment?",
      gentleOptions: [
        "I can explain the main idea in my own words.",
        "I need to reread before I use this.",
        "I am only saving a small helpful phrase."
      ],
      followup: "Add one specific detail you understand in your own words.",
      highExtra: "What part would be hardest to explain without looking back?"
    },
    verification: {
      title: "Verification Check",
      cognitiveRisk: "hallucination risk",
      teach: "AI can sound confident even when it is wrong or oversimplified. Responsible GenAI users identify claims that need outside verification.",
      apply: "What is one claim in this response you would verify before using it?",
      feedbackIfGood: "Good - you identified a specific claim to check. Fluent AI output is not the same as verified information.",
      takeaway: "Trust AI less when the answer depends on facts, dates, sources, or statistics.",
      gentleQuestion: "What should happen before using this factual claim?",
      gentleOptions: [
        "I should verify at least one specific claim.",
        "I can trust it because it sounds confident.",
        "I should check dates, sources, or statistics if they matter."
      ],
      followup: "Name one fact, date, source, or statistic you would check.",
      highExtra: "Where would you look to verify that claim?"
    },
    authorship_reflection: {
      title: "Authorship Reflection",
      cognitiveRisk: "authorship loss",
      teach: "AI can help with structure and wording, but your final work should still reflect your own interpretation and choices.",
      apply: "What is one idea here that is yours, and one part of the wording you would rewrite in your own voice?",
      feedbackIfGood: "Nice - you separated your own thinking from the AI's phrasing.",
      takeaway: "Use AI to support expression, not replace authorship.",
      gentleQuestion: "Which choice best protects your authorship?",
      gentleOptions: [
        "I will rewrite AI wording in my own voice.",
        "I will copy the AI wording as my final voice.",
        "I can name which idea is mine before using this."
      ],
      followup: "Name one wording choice you would change so the work sounds like you.",
      highExtra: "What part of this response should not become your final wording?"
    },
    revision_comparison: {
      title: "Revision Comparison",
      cognitiveRisk: "loss of voice",
      teach: "AI edits can improve clarity, but they can also change your voice, tone, or meaning. Responsible revision means deciding which changes you actually agree with.",
      apply: "What did the AI change about your original writing: clarity, tone, structure, grammar, or argument?",
      feedbackIfGood: "Good - you noticed what changed instead of accepting the revision automatically.",
      takeaway: "AI revision is a suggestion, not a final authority.",
      gentleQuestion: "What should you check before accepting an AI revision?",
      gentleOptions: [
        "Whether it changed my voice, tone, or meaning.",
        "Whether it is longer than my original.",
        "Whether I agree with the change."
      ],
      followup: "Name one change you would accept, reject, or revise again.",
      highExtra: "What original meaning or voice do you want to preserve?"
    },
    step_reconstruction: {
      title: "Step Reconstruction",
      cognitiveRisk: "reasoning bypass",
      teach: "AI can give a correct-looking answer without helping you understand the reasoning. Responsible use means being able to reconstruct the steps.",
      apply: "What is the first key step in this solution, and why does it make sense?",
      feedbackIfGood: "Good - you explained the reasoning behind the solution instead of only copying the answer.",
      takeaway: "Do not use an AI solution unless you can explain how it works.",
      gentleQuestion: "What makes copying a solution safer for learning?",
      gentleOptions: [
        "I can explain the first key step.",
        "The answer looks polished.",
        "I know why the step makes sense."
      ],
      followup: "Explain one step in the solution using your own words.",
      highExtra: "What would you do next if this step were missing?"
    },
    error_explanation: {
      title: "Code Understanding Check",
      cognitiveRisk: "debugging bypass",
      teach: "AI can fix code without helping you understand the bug. Responsible coding with AI means being able to explain what changed and why.",
      apply: "What bug or issue did the AI identify, and how would you explain the fix?",
      feedbackIfGood: "Good - you identified the bug and explained the fix.",
      takeaway: "Copying code is risky if you cannot explain what changed.",
      gentleQuestion: "What should you know before copying code?",
      gentleOptions: [
        "What changed and why it fixes the issue.",
        "That the code is shorter.",
        "Which bug or error the code addresses."
      ],
      followup: "Name one changed line, idea, or behavior and why it matters.",
      highExtra: "How would you test that the fix actually works?"
    },
    main_idea_recall: {
      title: "Main Idea Recall",
      cognitiveRisk: "shallow synthesis",
      teach: "AI summaries can make complex material seem simpler than it is. Responsible use means checking what was kept, compressed, or left out.",
      apply: "What is one main idea from this summary, and what is one detail that might be missing?",
      feedbackIfGood: "Good - you identified both the main idea and a possible limitation of the summary.",
      takeaway: "AI summaries are compressed interpretations, not perfect replacements for the original.",
      gentleQuestion: "What should you remember about AI summaries?",
      gentleOptions: [
        "They may leave out important details.",
        "They replace the original perfectly.",
        "I should know the main idea and a possible missing detail."
      ],
      followup: "Name one idea kept by the summary and one thing it might leave out.",
      highExtra: "What source detail would you return to before relying on this?"
    },
    selection_rationale: {
      title: "Selection Rationale",
      cognitiveRisk: "passive idea acceptance",
      teach: "AI can generate many ideas quickly, but responsible users still choose, evaluate, and adapt ideas themselves.",
      apply: "Which idea would you choose from this response, and why?",
      feedbackIfGood: "Good - you made a choice and explained your reasoning.",
      takeaway: "Brainstorming with AI is most useful when you actively select and adapt ideas.",
      gentleQuestion: "What is your role when AI brainstorms ideas?",
      gentleOptions: [
        "I choose and adapt ideas myself.",
        "I accept the first idea automatically.",
        "I can explain why one idea fits my purpose."
      ],
      followup: "Pick one idea and give a reason it fits your goal.",
      highExtra: "How would you adapt the idea so it becomes more yours?"
    },
    counterargument: {
      title: "Missing Perspective Check",
      cognitiveRisk: "one-sided reasoning",
      teach: "AI responses can sound balanced while still leaving out important perspectives, assumptions, or counterarguments.",
      apply: "What is one counterargument, missing perspective, or assumption in this response?",
      feedbackIfGood: "Good - you checked what the model may have left out.",
      takeaway: "Strong AI-assisted reasoning includes looking for missing perspectives.",
      gentleQuestion: "What makes AI-assisted argumentation stronger?",
      gentleOptions: [
        "Looking for a counterargument or missing perspective.",
        "Using only the most confident-sounding side.",
        "Checking the assumptions behind the response."
      ],
      followup: "Name one missing perspective, assumption, or counterargument.",
      highExtra: "Who might disagree with this response, and why?"
    },
    meaning_grammar_check: {
      title: "Meaning and Grammar Check",
      cognitiveRisk: "language-learning bypass",
      teach: "AI translation can give a fluent answer, but it may hide grammar choices, tone, or meaning differences. Responsible use means noticing how the translation works.",
      apply: "What is one word, phrase, or grammar choice in this translation that you should understand before using it?",
      feedbackIfGood: "Good - you identified a language choice to understand instead of copying the translation blindly.",
      takeaway: "Use AI translation to learn language choices, not avoid them.",
      gentleQuestion: "What should you notice before using an AI translation?",
      gentleOptions: [
        "A word, phrase, grammar choice, or tone choice.",
        "Only whether it sounds fluent.",
        "Whether I understand why the translation works."
      ],
      followup: "Name one word, phrase, grammar choice, or tone choice you should understand.",
      highExtra: "What meaning could change if that choice is wrong?"
    },
    general_reflection: {
      title: "Responsible Use Reflection",
      cognitiveRisk: "general overreliance",
      teach: "Generative AI can be useful, but it works best when you stay aware of what you understand, trust, and contribute yourself.",
      apply: "Before copying, what is one thing you understand, question, or would change about this output?",
      feedbackIfGood: "Good - you paused to evaluate the AI output before using it.",
      takeaway: "Responsible AI use means evaluating output before adopting it.",
      gentleQuestion: "What is one responsible step before copying?",
      gentleOptions: [
        "I can name what I understand, question, or would change.",
        "I can copy without thinking if it sounds fluent.",
        "I can pause and evaluate the output first."
      ],
      followup: "Name one thing you understand, question, or would change.",
      highExtra: "What would make this output more trustworthy or more yours?"
    }
  };

  function getIntervention(family) {
    return INTERVENTIONS[family] || INTERVENTIONS.general_reflection;
  }

  root.interventions = {
    INTERVENTIONS,
    getIntervention
  };
})();
