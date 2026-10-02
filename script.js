// ============================================================
// Communication Systems AI - Frontend Only
// GitHub Pages compatible
// Gemini 3.8 Flash + DuckDuckGo + Browser PDF.js
// ============================================================

const GEMINI_MODEL = "gemini-3.8-flash";

const GEMINI_API_URL =
    "https://generativelanguage.googleapis.com/v1beta/models/" +
    GEMINI_MODEL +
    ":generateContent";

const DUCKDUCKGO_URL = "https://api.duckduckgo.com/";

let currentMode = "internet";

let uploadedPdfText = "";
let uploadedPdfName = "";

// ============================================================
// DOM ELEMENTS
// ============================================================

const answerBox = document.getElementById("answerBox");
const questionInput = document.getElementById("questionInput");
const statusBox = document.getElementById("status");
const modeBadge = document.getElementById("modeBadge");

const pdfUploadArea = document.getElementById("pdfUploadArea");
const pdfInput = document.getElementById("pdfInput");
const pdfStatus = document.getElementById("pdfStatus");

// ============================================================
// GEMINI API KEY
// ============================================================

function getGeminiAPIKey() {
    let apiKey = localStorage.getItem(
        "communicationGeminiAPIKey"
    );

    if (apiKey) {
        return apiKey;
    }

    apiKey = prompt(
        "Enter your Gemini API key.\n\n" +
        "WARNING:\n" +
        "This GitHub Pages version runs Gemini directly from the browser. " +
        "Your API key is therefore exposed to the browser/user.\n\n" +
        "Use a restricted/demo API key."
    );

    if (!apiKey) {
        return null;
    }

    apiKey = apiKey.trim();

    localStorage.setItem(
        "communicationGeminiAPIKey",
        apiKey
    );

    return apiKey;
}

// ============================================================
// HTML ESCAPING
// ============================================================

function escapeHtml(text) {
    return String(text)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

// ============================================================
// ANSWER FORMATTING
// ============================================================

function formatAnswer(text) {
    let html = escapeHtml(text);

    // Code blocks
    html = html.replace(
        /```([\s\S]*?)```/g,
        (_, code) => {
            return `<pre><code>${code.trim()}</code></pre>`;
        }
    );

    // Bold
    html = html.replace(
        /\*\*(.*?)\*\*/g,
        "<strong>$1</strong>"
    );

    // Italic
    html = html.replace(
        /\*(.*?)\*/g,
        "<em>$1</em>"
    );

    // Inline code
    html = html.replace(
        /`([^`]+)`/g,
        "<code>$1</code>"
    );

    const lines = html.split("\n");

    const output = [];

    let inList = false;

    for (const line of lines) {
        const trimmed = line.trim();

        // Bullet list
        if (/^[-*]\s+/.test(trimmed)) {

            if (!inList) {
                output.push("<ul>");
                inList = true;
            }

            output.push(
                "<li>" +
                trimmed.replace(/^[-*]\s+/, "") +
                "</li>"
            );

        } else {

            if (inList) {
                output.push("</ul>");
                inList = false;
            }

            // Headings
            if (/^###\s+/.test(trimmed)) {

                output.push(
                    "<h3>" +
                    trimmed.replace(/^###\s+/, "") +
                    "</h3>"
                );

            } else if (/^##\s+/.test(trimmed)) {

                output.push(
                    "<h2>" +
                    trimmed.replace(/^##\s+/, "") +
                    "</h2>"
                );

            } else if (/^#\s+/.test(trimmed)) {

                output.push(
                    "<h2>" +
                    trimmed.replace(/^#\s+/, "") +
                    "</h2>"
                );

            } else if (trimmed) {

                output.push(
                    "<p>" +
                    trimmed +
                    "</p>"
                );
            }
        }
    }

    if (inList) {
        output.push("</ul>");
    }

    return output.join("\n");
}

// ============================================================
// MATHJAX
// ============================================================

async function renderMath() {

    if (
        window.MathJax &&
        window.MathJax.typesetPromise
    ) {
        try {

            await window.MathJax.typesetPromise([
                answerBox
            ]);

        } catch (error) {

            console.warn(
                "MathJax rendering failed:",
                error
            );
        }
    }
}

// ============================================================
// UI HELPERS
// ============================================================

function setStatus(message, isError = false) {

    statusBox.textContent = message || "";

    statusBox.className =
        isError
            ? "status error"
            : "status";
}

function setAnswer(text) {

    answerBox.innerHTML =
        formatAnswer(text);

    renderMath();
}

function setLoading(
    message = "Thinking..."
) {

    answerBox.innerHTML =
        `<p class="loading">${escapeHtml(message)}</p>`;
}

// ============================================================
// SEARCH HISTORY
// ============================================================

function getHistory() {

    try {

        return JSON.parse(
            localStorage.getItem(
                "communicationSearchHistory"
            ) || "[]"
        );

    } catch (error) {

        return [];
    }
}

function saveHistory(
    question,
    answer,
    mode
) {

    const history = getHistory();

    history.unshift({
        question: question,
        answer: answer,
        mode: mode,
        time: Date.now()
    });

    localStorage.setItem(
        "communicationSearchHistory",
        JSON.stringify(
            history.slice(0, 30)
        )
    );

    renderHistory();
}

function renderHistory() {

    const list =
        document.getElementById(
            "historyList"
        );

    const history = getHistory();

    list.innerHTML = "";

    history.forEach((item) => {

        const div =
            document.createElement("div");

        div.className =
            "history-item";

        div.textContent =
            item.question;

        div.title =
            item.question;

        div.addEventListener(
            "click",
            () => {

                questionInput.value =
                    item.question;

                setAnswer(
                    item.answer
                );

                currentMode =
                    item.mode || "internet";

                updateModeUI();
            }
        );

        list.appendChild(div);
    });
}

// ============================================================
// MODE UI
// ============================================================

function updateModeUI() {

    const internetBtn =
        document.getElementById(
            "internetBtn"
        );

    const pdfBtn =
        document.getElementById(
            "pdfBtn"
        );

    internetBtn.classList.toggle(
        "active",
        currentMode === "internet"
    );

    pdfBtn.classList.toggle(
        "active",
        currentMode === "pdf"
    );

    modeBadge.textContent =
        currentMode === "internet"
            ? "Internet Q&A"
            : "PDF Q&A";

    pdfUploadArea.style.display =
        currentMode === "pdf"
            ? "block"
            : "none";
}

// ============================================================
// DUCKDUCKGO SEARCH
// ============================================================

async function searchDuckDuckGo(query) {

    const url =
        DUCKDUCKGO_URL +
        "?q=" +
        encodeURIComponent(query) +
        "&format=json" +
        "&no_html=1" +
        "&skip_disambig=1";

    const response =
        await fetch(url);

    if (!response.ok) {

        throw new Error(
            "DuckDuckGo search failed."
        );
    }

    const data =
        await response.json();

    const results = [];

    // Main abstract
    if (
        data.AbstractText &&
        data.AbstractURL
    ) {

        if (
            !data.AbstractURL.includes(
                "wikipedia.org"
            )
        ) {

            results.push({
                title:
                    data.Heading ||
                    "Search result",

                url:
                    data.AbstractURL,

                text:
                    data.AbstractText
            });
        }
    }

    // Related topics
    if (
        Array.isArray(
            data.RelatedTopics
        )
    ) {

        for (
            const topic
            of data.RelatedTopics
        ) {

            if (
                topic.Text &&
                topic.FirstURL
            ) {

                if (
                    !topic.FirstURL.includes(
                        "wikipedia.org"
                    )
                ) {

                    results.push({
                        title:
                            topic.Text.split(
                                " - "
                            )[0],

                        url:
                            topic.FirstURL,

                        text:
                            topic.Text
                    });
                }
            }

            if (results.length >= 8) {
                break;
            }
        }
    }

    return results;
}

// ============================================================
// GEMINI REQUEST
// ============================================================

async function callGemini(prompt) {

    const apiKey =
        getGeminiAPIKey();

    if (!apiKey) {

        throw new Error(
            "Gemini API key was not provided."
        );
    }

    const response =
        await fetch(
            GEMINI_API_URL +
            "?key=" +
            encodeURIComponent(apiKey),
            {
                method: "POST",

                headers: {
                    "Content-Type":
                        "application/json"
                },

                body: JSON.stringify({

                    contents: [

                        {
                            role: "user",

                            parts: [
                                {
                                    text: prompt
                                }
                            ]
                        }

                    ]

                })
            }
        );

    const data =
        await response.json();

    if (!response.ok) {

        const message =
            data?.error?.message ||
            "Gemini API request failed.";

        throw new Error(message);
    }

    const answer =
        data?.candidates?.[0]
            ?.content
            ?.parts
            ?.map(
                part =>
                    part.text || ""
            )
            ?.join("")
            ?.trim();

    if (!answer) {

        throw new Error(
            "Gemini returned an empty answer."
        );
    }

    return answer;
}

// ============================================================
// INTERNET Q&A
// ============================================================

async function askInternet(question) {

    setLoading(
        "Searching the Internet..."
    );

    setStatus(
        "Searching relevant sources..."
    );

    const results =
        await searchDuckDuckGo(
            question
        );

    if (!results.length) {

        throw new Error(
            "No usable search results were returned. " +
            "Your browser or network may be blocking the DuckDuckGo request."
        );
    }

    const context =
        results
            .map(
                (result, index) => {

                    return (
                        `SOURCE ${index + 1}\n` +
                        `TITLE: ${result.title}\n` +
                        `URL: ${result.url}\n` +
                        `CONTENT: ${result.text}`
                    );
                }
            )
            .join("\n\n");

    const prompt = `

You are Communication Systems AI.

The user is asking a question about
Communication Systems, Computer Networks,
Electronics, Networking, or related
engineering topics.

Answer the user's question using the
search information provided below.

IMPORTANT RULES:

1. Give only relevant and essential information.

2. Do not use Wikipedia.

3. Prefer technically reliable sources such as:
   - Cisco
   - IBM
   - Cloudflare
   - Juniper
   - RFC
   - IETF

4. Do not invent facts.

5. If the search information is insufficient,
   clearly say that reliable information
   could not be confirmed.

6. Explain technical concepts in a
   simple student-friendly way.

7. Use short headings and bullet points
   when useful.

8. Do not simply copy search snippets.

9. Synthesize the information into one
   clear answer.

10. At the end include a "Sources" section
    containing the URLs actually used.

USER QUESTION:

${question}

SEARCH INFORMATION:

${context}

`;

    setStatus(
        "Generating answer with Gemini..."
    );

    const answer =
        await callGemini(prompt);

    return answer;
}

// ============================================================
// PDF.JS LOADER
// ============================================================

async function loadPDFJS() {

    if (window.pdfjsLib) {
        return;
    }

    await new Promise(
        (resolve, reject) => {

            const script =
                document.createElement(
                    "script"
                );

            script.src =
                "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";

            script.onload =
                resolve;

            script.onerror =
                () => {

                    reject(
                        new Error(
                            "Could not load PDF.js. " +
                            "Check your Internet connection."
                        )
                    );
                };

            document.head.appendChild(
                script
            );
        }
    );

    if (!window.pdfjsLib) {

        throw new Error(
            "PDF.js did not load."
        );
    }

    window.pdfjsLib
        .GlobalWorkerOptions
        .workerSrc =
        "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
}

// ============================================================
// PDF TEXT EXTRACTION
// ============================================================

async function extractPdfText(file) {

    await loadPDFJS();

    const buffer =
        await file.arrayBuffer();

    const pdf =
        await window.pdfjsLib
            .getDocument({
                data: buffer
            })
            .promise;

    let fullText = "";

    for (
        let pageNo = 1;
        pageNo <= pdf.numPages;
        pageNo++
    ) {

        const page =
            await pdf.getPage(
                pageNo
            );

        const content =
            await page.getTextContent();

        const pageText =
            content.items
                .map(
                    item =>
                        item.str || ""
                )
                .join(" ");

        fullText +=
            `\n\nPAGE ${pageNo}\n${pageText}`;
    }

    return fullText.trim();
}

// ============================================================
// PDF Q&A
// ============================================================

async function askPDF(question) {

    if (!uploadedPdfText) {

        throw new Error(
            "Please upload a PDF first."
        );
    }

    setLoading(
        "Reading the uploaded PDF..."
    );

    setStatus(
        "Searching only inside the uploaded PDF..."
    );

    const prompt = `

You are a PDF question-answering assistant.

Answer the user's question ONLY using
the uploaded PDF text below.

IMPORTANT RULES:

1. Do not use Internet knowledge.

2. Do not add outside information.

3. Answer only what is supported
   by the uploaded PDF.

4. Keep the answer focused on
   the exact question.

5. If the information is not present
   anywhere in the PDF, reply EXACTLY:

This information was not found in the uploaded PDF.

6. Do not create unrelated questions.

7. Do not generate an "important questions"
   list.

8. Use simple student-friendly language.

UPLOADED PDF:

${uploadedPdfName}

PDF TEXT:

${uploadedPdfText}

USER QUESTION:

${question}

`;

    const answer =
        await callGemini(prompt);

    return answer;
}

// ============================================================
// SEND QUESTION
// ============================================================

async function sendQuestion() {

    const question =
        questionInput.value.trim();

    if (!question) {

        setStatus(
            "Please enter a question.",
            true
        );

        return;
    }

    try {

        setStatus("");

        setLoading();

        let answer;

        if (
            currentMode === "pdf"
        ) {

            answer =
                await askPDF(
                    question
                );

        } else {

            answer =
                await askInternet(
                    question
                );
        }

        setAnswer(answer);

        saveHistory(
            question,
            answer,
            currentMode
        );

        setStatus(
            "Answer generated."
        );

    } catch (error) {

        console.error(error);

        setAnswer(
            "Error: " +
            error.message
        );

        setStatus(
            error.message,
            true
        );
    }
}

// ============================================================
// SEND BUTTON
// ============================================================

document
    .getElementById("sendBtn")
    .addEventListener(
        "click",
        sendQuestion
    );

// ============================================================
// INTERNET MODE
// ============================================================

document
    .getElementById("internetBtn")
    .addEventListener(
        "click",
        () => {

            currentMode =
                "internet";

            updateModeUI();

            setStatus(
                "Internet Q&A mode selected."
            );
        }
    );

// ============================================================
// PDF MODE
// ============================================================

document
    .getElementById("pdfBtn")
    .addEventListener(
        "click",
        () => {

            currentMode =
                "pdf";

            updateModeUI();

            setStatus(
                uploadedPdfText
                    ? `PDF loaded: ${uploadedPdfName}`
                    : "Upload a PDF before asking PDF questions."
            );
        }
    );

// ============================================================
// UPLOAD PDF BUTTON
// ============================================================

document
    .getElementById("uploadPdfBtn")
    .addEventListener(
        "click",
        () => {

            currentMode =
                "pdf";

            updateModeUI();

            pdfInput.click();
        }
    );

// ============================================================
// PDF FILE INPUT
// ============================================================

pdfInput.addEventListener(
    "change",
    async () => {

        const file =
            pdfInput.files?.[0];

        if (!file) {
            return;
        }

        if (
            file.type !==
            "application/pdf"
        ) {

            pdfStatus.textContent =
                "Please select a PDF file.";

            return;
        }

        try {

            pdfStatus.textContent =
                "Reading PDF...";

            setStatus(
                "Extracting PDF text..."
            );

            uploadedPdfText =
                await extractPdfText(
                    file
                );

            uploadedPdfName =
                file.name;

            pdfStatus.textContent =
                `Loaded: ${file.name} (${uploadedPdfText.length.toLocaleString()} characters)`;

            setStatus(
                "PDF loaded successfully."
            );

            currentMode =
                "pdf";

            updateModeUI();

        } catch (error) {

            console.error(error);

            uploadedPdfText =
                "";

            uploadedPdfName =
                "";

            pdfStatus.textContent =
                "Failed to read the PDF.";

            setStatus(
                error.message,
                true
            );
        }
    }
);

// ============================================================
// NEW CHAT
// ============================================================

document
    .getElementById("newChatBtn")
    .addEventListener(
        "click",
        () => {

            questionInput.value =
                "";

            uploadedPdfText =
                "";

            uploadedPdfName =
                "";

            pdfInput.value =
                "";

            pdfStatus.textContent =
                "No PDF selected.";

            setAnswer(
                "Ask a Communication Systems or Computer Networks question, " +
                "or upload a PDF for PDF Q&A."
            );

            currentMode =
                "internet";

            updateModeUI();

            setStatus("");
        }
    );

// ============================================================
// CLEAR HISTORY
// ============================================================

document
    .getElementById("clearHistoryBtn")
    .addEventListener(
        "click",
        () => {

            localStorage.removeItem(
                "communicationSearchHistory"
            );

            renderHistory();
        }
    );

// ============================================================
// CHATGPT BUTTON
// ============================================================

document
    .getElementById("chatgptBtn")
    .addEventListener(
        "click",
        () => {

            window.open(
                "https://chatgpt.com/",
                "_blank"
            );
        }
    );

// ============================================================
// GEMINI BUTTON
// ============================================================

document
    .getElementById("geminiBtn")
    .addEventListener(
        "click",
        () => {

            window.open(
                "https://gemini.google.com/",
                "_blank"
            );
        }
    );

// ============================================================
// ENTER KEY
// ============================================================

questionInput.addEventListener(
    "keydown",
    (event) => {

        if (
            event.key === "Enter" &&
            !event.shiftKey
        ) {

            event.preventDefault();

            sendQuestion();
        }
    }
);

// ============================================================
// INITIALIZE
// ============================================================

renderHistory();

updateModeUI();
