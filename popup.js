document.addEventListener('DOMContentLoaded', function() {
    const uploadBtn = document.getElementById('uploadBtn');
    const convertBtn = document.getElementById('convertBtn');
    const preview = document.getElementById('preview');
    const status = document.getElementById('status');
    
    let markdownContent = '';
    let fileName = '';

    uploadBtn.addEventListener('click', function() {
        uploadMarkdownFile();
    });

    convertBtn.addEventListener('click', function() {
        convertToMedium();
    });

    // Upload markdown file function
    function uploadMarkdownFile() {
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = '.md,.markdown,.txt';
        fileInput.multiple = false;
        fileInput.style.display = 'none';
        
        fileInput.onchange = function(event) {
            const file = event.target.files[0];
            
            if (!file) {
                showStatus('No file selected', 'error');
                return;
            }

            // Validate file type
            const validExtensions = ['.md', '.markdown', '.txt'];
            const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
            
            if (!validExtensions.includes(fileExtension)) {
                showStatus('Please select a valid markdown file (.md, .markdown, .txt)', 'error');
                return;
            }

            // Validate file size (max 5MB)
            if (file.size > 5 * 1024 * 1024) {
                showStatus('File too large. Please select a file smaller than 5MB', 'error');
                return;
            }

            fileName = file.name;
            showStatus(`Loading ${fileName}...`, 'info');

            const reader = new FileReader();
            
            reader.onload = function(e) {
                markdownContent = e.target.result;
                
                // Show preview (first 300 characters)
                const previewText = markdownContent;
                
                preview.innerHTML = `<pre>${escapeHtml(previewText)}</pre>`;
                showStatus(`✅ ${fileName} loaded successfully (${markdownContent.length} characters)`, 'success');
            };
            
            reader.onerror = function() {
                showStatus('Error reading file. Please try again.', 'error');
            };
            
            reader.readAsText(file);
        };
        
        // Clean up previous file input if exists
        const existingInput = document.getElementById('temp-file-input');
        if (existingInput) {
            existingInput.remove();
        }
        
        fileInput.id = 'temp-file-input';
        document.body.appendChild(fileInput);
        fileInput.click();
        
        // Clean up after click
        setTimeout(() => {
            if (fileInput.parentNode) {
                fileInput.remove();
            }
        }, 1000);
    }

    // Convert to Medium function
    function convertToMedium() {



        if (!markdownContent) {
            showStatus('Please upload a markdown file first', 'error');
            return;
        }

        showStatus('Checking Medium page...', 'info');

        // Check if we're on a Medium page
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (!tabs[0]) {
                showStatus('No active tab found', 'error');
                return;
            }

            const currentUrl = tabs[0].url;
            
            // Check if on Medium new-story page
            //if (!currentUrl.includes('medium.com/new-story')) {
            //    showStatus('Please navigate to medium.com/new-story first', 'error');
            //    return;
            //}

            window.close();

            // Send message to content script
            chrome.tabs.sendMessage(tabs[0].id, {
                action: 'insertContent',
                content: markdownContent,
            }, (response) => {
                if (chrome.runtime.lastError) {
                    showStatus('Cannot connect to Medium page. Please refresh the page and try again.', 'error');
                    return;
                }

                if (response && response.success) {
                    showStatus('✅ Content inserted into Medium editor!', 'success');
                } else {
                    const errorMsg = response ? response.message : 'Failed to insert content';
                    showStatus(errorMsg, 'error');
                }
            });
        });
    }

    // Show status messages
    function showStatus(message, type) {
        status.textContent = message;
        status.className = `status ${type}`;
        status.classList.remove('hidden');
        
        // Auto-hide after 5 seconds for info messages
        if (type === 'info') {
            setTimeout(() => {
                status.classList.add('hidden');
            }, 5000);
        }
    }

    // Escape HTML to prevent XSS
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Initialize
    showStatus('Ready! Upload a markdown file to get started.', 'info');
});

