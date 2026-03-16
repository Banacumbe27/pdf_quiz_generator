// --- Handle the Generation Form ---
const backendUrl = "https://classical-zoloft-budgets-identity.trycloudflare.com/";
document.getElementById('generate-form').addEventListener('submit', async (e) => {
    e.preventDefault(); // Stop the page from reloading

    const form = e.target;
    const submitBtn = document.getElementById('generate-btn');
    const loadingIndicator = document.getElementById('loading-indicator');
    const terminal = document.getElementById('live-terminal'); // Grabbing the terminal box!
    const resultBox = document.getElementById('result-box');
    const errorBox = document.getElementById('error-box');
    const accessCodeDisplay = document.getElementById('access-code-display');

    // Hide old results and show the loading state
    resultBox.classList.add('hidden');
    errorBox.classList.add('hidden');
    loadingIndicator.classList.remove('hidden');
    submitBtn.disabled = true;

    if (terminal) {
        terminal.textContent = "Connecting to server...\n";
    }

    // Package up the file and the form inputs
    const formData = new FormData();
    formData.append('file', document.getElementById('pdf-file').files[0]);
    formData.append('fallback_mode', document.getElementById('fallback-mode').value);
    formData.append('num_mcq', document.getElementById('num-mcq').value);
    formData.append('num_tf', document.getElementById('num-tf').value);
    formData.append('num_short', document.getElementById('num-short').value);

    try {
        // 1. Send it to the FastAPI backend to start the background job
        const response = await fetch(`${backendUrl}api/generate-test`, {
            method: 'POST',
            body: formData
        });

        const data = await response.json();

        // 2. Check if the backend gave us the thumbs up that the job STARTED
        if (response.ok && data.status === "success") {
            const accessCode = data.access_code;
            
            // 3. Start polling the server for logs every 1 second (1000ms)
            const pollInterval = setInterval(async () => {
                try {
                    const logResponse = await fetch(`${backendUrl}api/progress/${accessCode}`);
                    const logData = await logResponse.json();
                    
                    if (terminal) {
                        // Update the text and auto-scroll to the bottom
                        terminal.textContent = logData.log;
                        terminal.scrollTop = terminal.scrollHeight;
                    }

                    // 4. Stop checking if the script says "ALL DONE!"
                    if (logData.log.includes("ALL DONE!")) {
                        clearInterval(pollInterval);
                        loadingIndicator.classList.add('hidden');

                        if (logData.log.includes("CRITICAL ERROR")) {
                            errorBox.textContent = "The pipeline crashed. Check the terminal logs above.";
                            errorBox.classList.remove('hidden');
                        } else {
                            accessCodeDisplay.textContent = accessCode;
                            resultBox.classList.remove('hidden');

                            // Wire action buttons for this specific run code.
                            document.getElementById('download-btn').onclick = () => {
                                window.open(`http://localhost:8000/api/get-test/${accessCode}`, '_blank');
                            };

                            document.getElementById('take-test-btn').onclick = () => {
                                window.location.href = `quiz.html?code=${accessCode}`;
                            };
                        }
                        submitBtn.disabled = false;
                    }
                } catch (pollError) {
                    console.error("Error fetching progress:", pollError);
                }
            }, 1000);

        } else {
            // If the server rejected the initial POST request
            throw new Error(data.message || 'The pipeline failed to start.');
            loadingIndicator.classList.add('hidden');
            submitBtn.disabled = false;
        }
    } catch (error) {
        // If the fetch request itself completely failed (e.g., server offline)
        errorBox.textContent = `Error: ${error.message}`;
        errorBox.classList.remove('hidden');
        loadingIndicator.classList.add('hidden');
        submitBtn.disabled = false;
    } 
});

// --- Handle the Retrieval Form ---
document.getElementById('retrieve-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const accessCode = document.getElementById('access-code-input').value.trim();
    
    if (accessCode) {
        // Opening the URL in a new tab will show or download the JSON file
        window.open(`http://localhost:8000/api/get-test/${accessCode}`, '_blank');
    }
});

document.getElementById('retrieve-take-test-btn').addEventListener('click', () => {
    const accessCode = document.getElementById('access-code-input').value.trim();
    if (accessCode) {
        window.location.href = `quiz.html?code=${accessCode}`;
    }
});

document.getElementById('retrieve-view-log-btn').addEventListener('click', () => {
    const accessCode = document.getElementById('access-code-input').value.trim();
    if (accessCode) {
        window.open(`http://localhost:8000/api/get-log/${accessCode}`, '_blank');
    }
});