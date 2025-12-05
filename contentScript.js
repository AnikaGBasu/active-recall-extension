console.log("AI Extension: content script loaded (v4 - with debounce)");

function getLastAssistantMessage() {
    // Select ALL assistant message containers
    const nodes = document.querySelectorAll('[data-message-author-role="assistant"]');
    if (nodes.length === 0) {
        return null;
    }

    // Take the LAST one (latest response)
    const last = nodes[nodes.length - 1];

    // Find the text content inside the standard markdown container
    const content = last.querySelector('.markdown');
    if (!content) {
        return null;
    }

    const text = content.innerText.trim();
    console.log("AI Ext: Extracted text:", text.slice(0, 200));
    return text;
}

function saveLatest() {
    const text = getLastAssistantMessage();
    if (!text) {
        console.log("AI Ext: No text found, not saving.");
        return;
    }

    chrome.storage.local.set({ lastAIOutput: text }, () => {
        console.log("AI Ext: Saved lastAIOutput to storage.");
    });
}

// Timer to prevent saving an incomplete (still streaming) response
let saveTimer = null;

const observer = new MutationObserver((mutations) => {
    // Clear the timer on every change to 'debounce' the save action.
    // This ensures we only run saveLatest() 1 second *after* the last change.
    if (saveTimer) {
        clearTimeout(saveTimer);
    }
    
    saveTimer = setTimeout(() => {
        console.log("AI Ext: Changes stopped, saving latest response.");
        saveLatest();
        saveTimer = null;
    }, 1000); // Wait 1 second (1000ms) after last mutation
});

console.log("AI Ext: Starting observer.");
observer.observe(document.body, {
    subtree: true,
    childList: true,
    characterData: true // Watch for text content changing (streaming)
});

// Run once on load to get any existing text
saveLatest();