const OPENAI_API_KEY = //ENTERYOURSHERE;
const OPENAI_MODEL = "gpt-4o-mini";

async function generateQuestionsFromText(text) {
  const prompt = `
You are generating active recall questions. Create a mix of 3 short free-response questions AND 3 multiple-choice questions (MCQs) with four options each.

Return ONLY JSON:
{
 "questions": ["Free response question 1", ...],
 "answers": ["Answer 1", ...],
 "mcqs": [
    {
      "question": "MCQ Question 1?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correct_index": 1 // The index (0, 1, 2, or 3) of the correct option
    },
    // ... more MCQs
 ]
}
Based on:
"""${text}"""`;

  const res = await fetch("https://api.openai.com/v1/chat/completions",{
    method:"POST",
    headers:{
      "Content-Type":"application/json",
      "Authorization":"Bearer "+OPENAI_API_KEY
    },
    body:JSON.stringify({
      model:OPENAI_MODEL,
      messages:[{role:"user",content:prompt}],
      temperature:0.3,
      // Request JSON object output from the model
      response_format: { type: "json_object" } 
    })
  });

  const data=await res.json();
  const jsonString = data.choices[0].message.content.trim();
  try {
      return JSON.parse(jsonString);
  } catch (e) {
      console.error("Failed to parse JSON:", jsonString, e);
      return { questions: ["Error: Could not generate questions."], answers: ["Check console for API error."], mcqs: [] };
  }
}

// NEW FUNCTION: Handles rendering and interactivity for one MCQ
function renderMCQ(mcq, index, container) {
    const mcqItem = document.createElement('div');
    mcqItem.className = 'mcq-item';
    
    mcqItem.innerHTML = `<div class="mcq-question">MCQ ${index + 1}: ${mcq.question}</div>`;
    
    mcq.options.forEach((optionText, optionIndex) => {
        const button = document.createElement('button');
        button.className = 'mcq-option';
        button.textContent = optionText;
        
        button.addEventListener('click', () => {
            // Disable all buttons for this MCQ after first click
            mcqItem.querySelectorAll('.mcq-option').forEach(btn => btn.disabled = true);
            
            // Check if correct
            if (optionIndex === mcq.correct_index) {
                button.classList.add('correct');
                button.textContent += " ✅ Correct!";
            } else {
                button.classList.add('incorrect');
                
                // Highlight the correct answer
                const correctButton = mcqItem.querySelectorAll('.mcq-option')[mcq.correct_index];
                correctButton.classList.add('correct');
                correctButton.textContent += " (Correct)";
            }
        });
        
        mcqItem.appendChild(button);
    });

    container.appendChild(mcqItem);
}

document.addEventListener("DOMContentLoaded",()=>{
  const status=document.getElementById("status");
  const mcqDiv=document.getElementById("mcqs-container"); 
  const qDiv=document.getElementById("questions");
  const aDiv=document.getElementById("answers");
  const gen=document.getElementById("generateBtn");
  const rev=document.getElementById("revealBtn");
  
  // Clear containers on load
  mcqDiv.innerHTML = '';
  qDiv.innerHTML = '';
  aDiv.innerHTML = '';


  chrome.storage.local.get("lastAIOutput", async (data)=>{
    const text=data.lastAIOutput;
    if(!text){
      status.textContent="No AI output found.";
      return;
    }
    status.textContent="AI output detected. Click Generate Quiz.";
    gen.onclick=async ()=>{
      status.textContent="Generating...";
      gen.disabled = true; // Disable button while generating
      rev.style.display="none"; // Hide reveal button until questions are ready
      
      // Clear previous results
      mcqDiv.innerHTML = '';
      qDiv.innerHTML = '';
      aDiv.innerHTML = '';
      
      const qa=await generateQuestionsFromText(text);
      
      // --- RENDER MCQs ---
      if (qa.mcqs && qa.mcqs.length > 0) {
          const header = document.createElement('div');
          header.className = 'header mcq-header';
          header.textContent = 'Multiple Choice Questions';
          mcqDiv.appendChild(header);
          
          qa.mcqs.forEach((mcq, i) => {
              renderMCQ(mcq, i, mcqDiv);
          });
      }
      
      // --- RENDER FREE RESPONSE ---
      if (qa.questions && qa.questions.length > 0) {
          qDiv.innerHTML = `<div class="header">Free Response Questions:</div>` + 
                           qa.questions.map((q,i)=>`<div class="question-item"><strong>Q${i+1}:</strong> ${q}</div>`).join("");
          
          aDiv.innerHTML = `<div class="header" style="border-top: 1px solid #ccc; padding-top: 10px;">Answers:</div>` + 
                           qa.answers.map((a,i)=>`<div class="answer-item"><strong>A${i+1}:</strong> ${a}</div>`).join("");
          
          rev.style.display="block";
      }

      status.textContent="Done. Start quizzing!";
      gen.disabled = false;
    };
    rev.onclick=()=>{ aDiv.style.display="block"; };
  });
});