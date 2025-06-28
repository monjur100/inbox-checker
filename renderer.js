document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM fully loaded"); // Debug log
    
    const searchInput = document.getElementById('searchInput');
    const checkBtn = document.getElementById('checkBtn');
    const resultsDiv = document.getElementById('results');

    console.log("Elements loaded:", {searchInput, checkBtn, resultsDiv}); // Debug log

    checkBtn.addEventListener('click', async () => {
        console.log("Button clicked"); // Debug log
        
        const senderEmail = searchInput.value.trim();
        console.log("Sender email:", senderEmail); // Debug log
        
        if (!senderEmail) {
            console.log("No email entered"); // Debug log
            alert('Please enter a sender email address');
            return;
        }

        resultsDiv.innerHTML = '<div class="progress">Checking delivery status...</div>';
        
        try {
            console.log("Calling electronAPI.checkInbox"); // Debug log
            const results = await window.electronAPI.checkInbox(senderEmail);
            console.log("Results received:", results); // Debug log
            displayResults(results, senderEmail);
        } catch (error) {
            console.error("Error occurred:", error); // Debug log
            resultsDiv.innerHTML = `<div class="error">Error: ${error.message}</div>`;
        }
    });

    function displayResults(results, senderEmail) {
        console.log("Displaying results"); // Debug log
        let html = `
            <div class="progress">100%</div>
            <div class="email-header">${senderEmail}</div>
            <div class="divider">***</div>
        `;

        results.forEach((result, index) => {
            console.log("Processing result:", result); // Debug log
            const folderClass = result.folder === 'Spam' ? 'spam-tag' : 'inbox-tag';
            const senderDisplay = result.senderName ? `"${result.senderName}"` : '';
            
            html += `
                <div class="email-item">
                    <div class="email-header">
                        ${senderDisplay} ${result.from}
                        <span class="folder-tag ${folderClass}">${result.folder}</span>
                    </div>
                    <div class="email-subject">${result.subject}</div>
                </div>
            `;

            if (index < results.length - 1) {
                html += `<div class="divider">***</div>`;
            }
        });

        resultsDiv.innerHTML = html || '<div>No emails found from this sender</div>';
    }

    // Allow Enter key to trigger search
    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            console.log("Enter key pressed"); // Debug log
            checkBtn.click();
        }
    });

    // Verify electronAPI is available
    console.log("window.electronAPI:", window.electronAPI); // Debug log
});