/* ==========================================================================
   TOEFL iBT® Complete the Words — Frontend Logic
   ========================================================================== */

(function () {
    "use strict";

    // -----------------------------------------------------------------------
    // DOM References
    // -----------------------------------------------------------------------
    const topicBadge       = document.getElementById("topic-badge");
    const topicText        = document.getElementById("topic-text");
    const directions       = document.getElementById("directions");
    const passageContainer = document.getElementById("passage-container");
    const resultBanner     = document.getElementById("result-banner");
    const resultIcon       = document.getElementById("result-icon");
    const resultScore      = document.getElementById("result-score");
    const resultMessage    = document.getElementById("result-message");
    const loadingOverlay   = document.getElementById("loading-overlay");
    const errorMessage     = document.getElementById("error-message");
    const errorText        = document.getElementById("error-text");
    const retryBtn         = document.getElementById("retry-btn");
    const timerDisplay     = document.getElementById("timer");
    const submitBtn        = document.getElementById("submit-btn");
    const nextBtn          = document.getElementById("next-btn");
    const questionInfo     = document.getElementById("question-info");
    const blankCount       = document.getElementById("blank-count");

    // -----------------------------------------------------------------------
    // State
    // -----------------------------------------------------------------------
    let currentProblem = null;   // { topic, original_paragraph, masked_paragraph, answers }
    let timerSeconds   = 0;
    let timerInterval  = null;
    let isSubmitted    = false;

    // -----------------------------------------------------------------------
    // API
    // -----------------------------------------------------------------------
    const API_URL = "/api/generate-problem";

    async function fetchProblem() {
        const response = await fetch(API_URL);
        if (!response.ok) {
            const detail = await response.json().catch(() => ({}));
            throw new Error(detail.detail || `Server error: ${response.status}`);
        }
        return response.json();
    }

    // -----------------------------------------------------------------------
    // Timer
    // -----------------------------------------------------------------------
    function startTimer() {
        stopTimer();
        timerSeconds = 0;
        updateTimerDisplay();
        timerInterval = setInterval(() => {
            timerSeconds++;
            updateTimerDisplay();
        }, 1000);
    }

    function stopTimer() {
        if (timerInterval) {
            clearInterval(timerInterval);
            timerInterval = null;
        }
    }

    function updateTimerDisplay() {
        const mins = String(Math.floor(timerSeconds / 60)).padStart(2, "0");
        const secs = String(timerSeconds % 60).padStart(2, "0");
        timerDisplay.textContent = `${mins}:${secs}`;
    }

    // -----------------------------------------------------------------------
    // Passage Rendering & Parsing
    // -----------------------------------------------------------------------

    /**
     * Parse the masked paragraph and render it into the passage container.
     *
     * Strategy:
     *  1. Use regex to find patterns of [optional letters][consecutive underscores]
     *  2. Split text around these patterns
     *  3. Render normal text as <span> and blanks as <input>
     */
    function renderPassage(maskedText) {
        passageContainer.innerHTML = "";

        // Regex: capture optional letter prefix + consecutive underscores
        // Matches things like "form_____", "envi_______", or just "_____"
        const pattern = /([a-zA-Z]*)(_+)/g;

        let lastIndex = 0;
        let match;
        let inputIndex = 0;

        while ((match = pattern.exec(maskedText)) !== null) {
            const fullMatchStart = match.index;
            const prefix = match[1];          // visible prefix (may be "")
            const underscores = match[2];      // consecutive underscores
            const missingLen = underscores.length;

            // The prefix is part of the word, so the "text before this word"
            // is everything from lastIndex to the start of the prefix
            const textBefore = maskedText.substring(lastIndex, fullMatchStart);

            // Append preceding plain text
            if (textBefore) {
                const textNode = document.createElement("span");
                textNode.textContent = textBefore;
                passageContainer.appendChild(textNode);
            }

            // Append visible prefix
            if (prefix) {
                const prefixSpan = document.createElement("span");
                prefixSpan.textContent = prefix;
                prefixSpan.classList.add("word-prefix");
                passageContainer.appendChild(prefixSpan);
            }

            // Create a group for the N individual letter boxes
            const group = document.createElement("span");
            group.classList.add("blank-group");
            group.dataset.index = inputIndex;
            group.dataset.prefix = prefix;
            group.dataset.length = missingLen;

            for (let i = 0; i < missingLen; i++) {
                const charInput = document.createElement("input");
                charInput.type = "text";
                charInput.classList.add("char-input");
                charInput.maxLength = 1;
                charInput.autocomplete = "off";
                charInput.autocapitalize = "none";
                charInput.spellcheck = false;
                charInput.dataset.blankIndex = inputIndex;
                charInput.dataset.charIndex = i;
                charInput.setAttribute("aria-label", `Blank ${inputIndex + 1}, letter ${i + 1}`);
                group.appendChild(charInput);
            }

            passageContainer.appendChild(group);

            inputIndex++;
            lastIndex = pattern.lastIndex;
        }

        // Append any remaining text after the last match
        if (lastIndex < maskedText.length) {
            const remaining = document.createElement("span");
            remaining.textContent = maskedText.substring(lastIndex);
            passageContainer.appendChild(remaining);
        }

        // Update blank count in footer
        blankCount.textContent = inputIndex;

        // Attach input event listeners
        attachInputListeners();
    }

    // -----------------------------------------------------------------------
    // Keyboard Navigation & Input Handling
    // -----------------------------------------------------------------------
    function attachInputListeners() {
        const inputs = Array.from(passageContainer.querySelectorAll(".char-input"));

        inputs.forEach((input, idx) => {
            // Auto-advance when typing
            input.addEventListener("input", (e) => {
                // Only allow letters
                input.value = input.value.replace(/[^a-zA-Z]/g, "");

                if (input.value.length > 0) {
                    const nextInput = inputs[idx + 1];
                    if (nextInput) {
                        nextInput.focus();
                        nextInput.select();
                    }
                }
                updateSubmitState();
            });

            // Enter / Backspace / Navigation keys
            input.addEventListener("keydown", (e) => {
                if (e.key === "Backspace") {
                    if (input.value === "") {
                        e.preventDefault();
                        const prevInput = inputs[idx - 1];
                        if (prevInput) {
                            prevInput.value = "";
                            prevInput.focus();
                        }
                    } else {
                        input.value = "";
                        e.preventDefault();
                        updateSubmitState();
                    }
                } else if (e.key === "ArrowLeft") {
                    e.preventDefault();
                    const prevInput = inputs[idx - 1];
                    if (prevInput) {
                        prevInput.focus();
                        prevInput.select();
                    }
                } else if (e.key === "ArrowRight") {
                    e.preventDefault();
                    const nextInput = inputs[idx + 1];
                    if (nextInput) {
                        nextInput.focus();
                        nextInput.select();
                    }
                } else if (e.key === "Tab") {
                    e.preventDefault();
                    const currentBlankIndex = parseInt(input.dataset.blankIndex, 10);
                    if (e.shiftKey) {
                        // Shift+Tab: Move to the first letter of the previous blank group
                        const prevGroupInput = inputs.find(
                            (inp) => parseInt(inp.dataset.blankIndex, 10) === currentBlankIndex - 1
                        );
                        if (prevGroupInput) {
                            prevGroupInput.focus();
                            prevGroupInput.select();
                        }
                    } else {
                        // Tab: Move to the first letter of the next blank group
                        const nextGroupInput = inputs.find(
                            (inp) => parseInt(inp.dataset.blankIndex, 10) === currentBlankIndex + 1
                        );
                        if (nextGroupInput) {
                            nextGroupInput.focus();
                            nextGroupInput.select();
                        } else {
                            // Last group: focus submit button if enabled
                            if (!submitBtn.disabled && !isSubmitted) {
                                submitBtn.focus();
                            }
                        }
                    }
                } else if (e.key === "Enter") {
                    e.preventDefault();
                    // Move to the first letter of the next blank group
                    const currentBlankIndex = parseInt(input.dataset.blankIndex, 10);
                    const nextGroupInput = inputs.find(
                        (inp) => parseInt(inp.dataset.blankIndex, 10) > currentBlankIndex
                    );

                    if (nextGroupInput) {
                        nextGroupInput.focus();
                        nextGroupInput.select();
                    } else {
                        // Last input: trigger submit if possible
                        if (!submitBtn.disabled && !isSubmitted) {
                            handleSubmit();
                        }
                    }
                }
            });

            // Anti-cheat: disable paste on inputs
            input.addEventListener("paste", (e) => e.preventDefault());
            input.addEventListener("drop", (e) => e.preventDefault());
        });
    }

    function updateSubmitState() {
        if (isSubmitted) return;
        const inputs = passageContainer.querySelectorAll(".char-input");
        const allFilled = Array.from(inputs).every(
            (inp) => inp.value.length > 0
        );
        submitBtn.disabled = !allFilled;
    }

    // -----------------------------------------------------------------------
    // Grading
    // -----------------------------------------------------------------------
    function handleSubmit() {
        if (isSubmitted || !currentProblem) return;
        isSubmitted = true;
        stopTimer();

        const groups = passageContainer.querySelectorAll(".blank-group");
        const answers = currentProblem.answers;
        let correctCount = 0;

        groups.forEach((group, idx) => {
            const prefix = group.dataset.prefix || "";
            const charInputs = group.querySelectorAll(".char-input");
            
            // Concatenate all character inputs in this group
            let typedSuffix = "";
            charInputs.forEach(input => {
                typedSuffix += input.value;
                input.disabled = true;
            });

            const userAnswer = prefix + typedSuffix;
            const expectedAnswer = answers[idx] || "";

            // Case-insensitive comparison
            const isCorrect =
                userAnswer.toLowerCase() === expectedAnswer.toLowerCase();

            if (isCorrect) {
                charInputs.forEach(input => input.classList.add("correct"));
                correctCount++;
            } else {
                charInputs.forEach(input => input.classList.add("incorrect"));
                // Show the correct answer next to the incorrect group
                const reveal = document.createElement("span");
                reveal.classList.add("answer-reveal");
                const correctSuffix = expectedAnswer.substring(prefix.length);
                reveal.textContent = `→ ${correctSuffix}`;
                group.insertAdjacentElement("afterend", reveal);
            }
        });

        // Show result banner
        showResult(correctCount, groups.length);

        // Show next button, hide submit
        submitBtn.classList.add("hidden");
        nextBtn.classList.remove("hidden");
    }

    function showResult(correct, total) {
        const pct = total > 0 ? (correct / total) * 100 : 0;

        resultScore.textContent = `${correct} / ${total} correct`;

        if (pct === 100) {
            resultBanner.className = "perfect";
            resultIcon.textContent = "🎉";
            resultMessage.textContent = "Perfect! Outstanding work!";
        } else if (pct >= 60) {
            resultBanner.className = "good";
            resultIcon.textContent = "👍";
            resultMessage.textContent = "Good job! Review the words you missed.";
        } else {
            resultBanner.className = "needs-work";
            resultIcon.textContent = "📖";
            resultMessage.textContent = "Keep practicing! Review the correct answers above.";
        }

        resultBanner.classList.remove("hidden");
    }

    // -----------------------------------------------------------------------
    // Game Loop
    // -----------------------------------------------------------------------
    async function loadNewProblem() {
        // Reset UI
        isSubmitted = false;
        currentProblem = null;
        passageContainer.innerHTML = "";
        resultBanner.classList.add("hidden");
        errorMessage.classList.add("hidden");
        submitBtn.classList.add("hidden");
        nextBtn.classList.add("hidden");
        topicBadge.classList.add("hidden");
        directions.classList.add("hidden");
        passageContainer.classList.add("hidden");
        questionInfo.classList.add("hidden");
        submitBtn.disabled = true;

        // Show loading
        loadingOverlay.classList.remove("hidden");

        try {
            const data = await fetchProblem();
            currentProblem = data;

            // Set topic
            topicText.textContent = data.topic;

            // Render passage
            renderPassage(data.masked_paragraph);

            // Show UI elements
            loadingOverlay.classList.add("hidden");
            topicBadge.classList.remove("hidden");
            directions.classList.remove("hidden");
            passageContainer.classList.remove("hidden");
            questionInfo.classList.remove("hidden");
            submitBtn.classList.remove("hidden");

            // Start timer
            startTimer();

            // Focus first input
            const firstInput = passageContainer.querySelector(".char-input");
            if (firstInput) {
                setTimeout(() => firstInput.focus(), 100);
            }
        } catch (err) {
            loadingOverlay.classList.add("hidden");
            errorText.textContent = `Failed to load problem: ${err.message}`;
            errorMessage.classList.remove("hidden");
            console.error("Error loading problem:", err);
        }
    }

    // -----------------------------------------------------------------------
    // Anti-Cheat: disable right-click & copy on the passage container
    // -----------------------------------------------------------------------
    passageContainer.addEventListener("contextmenu", (e) => e.preventDefault());
    passageContainer.addEventListener("copy", (e) => e.preventDefault());
    passageContainer.addEventListener("cut", (e) => e.preventDefault());

    // Also disable on the whole document for extra security
    document.addEventListener("contextmenu", (e) => {
        if (e.target.closest("#passage-container")) {
            e.preventDefault();
        }
    });

    // -----------------------------------------------------------------------
    // Event Listeners
    // -----------------------------------------------------------------------
    submitBtn.addEventListener("click", handleSubmit);
    nextBtn.addEventListener("click", loadNewProblem);
    retryBtn.addEventListener("click", loadNewProblem);

    // Keyboard shortcut: Ctrl+Enter to submit
    document.addEventListener("keydown", (e) => {
        if (e.ctrlKey && e.key === "Enter" && !isSubmitted && !submitBtn.disabled) {
            handleSubmit();
        }
    });

    // -----------------------------------------------------------------------
    // Initialize — load the first problem on page load
    // -----------------------------------------------------------------------
    loadNewProblem();
})();
