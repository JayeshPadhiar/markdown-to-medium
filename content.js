// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {  
    console.log('Content script received message:', request);
    switch (request.action) {
        case 'insertContent':
            insertMarkdownContent(request.content);
            sendResponse({ success: true, message: 'Markdown content inserted successfully' });
            break;
            
        default:
            sendResponse({ success: false, message: 'Unknown action: ' + request.action });
    }
    return true;
});

async function parseMarkdownContent(content) {
    try {
        console.log('Parsing markdown content:', content);
        
    } catch (error) {
        console.error('Error parsing markdown:', error);
        // Fallback to original markdown content
        return content;
    }
}

function getSelectedInput(){
    const element = document.querySelector('.is-selected');
    return element;
}

async function insertMarkdownContent(content) {
    const mediumHTML = await parseMarkdownContent(content);
    console.log('Inserting Medium-friendly HTML:', mediumHTML);

    const selectedInput = getSelectedInput();
    console.log('Selected input:', selectedInput);
    if (selectedInput) {
        // Focus the input first
        selectedInput.focus();

        // Insert Medium-friendly HTML content
        selectedInput.innerHTML = mediumHTML;
        
        // Trigger input event to notify Medium
        selectedInput.dispatchEvent(new Event('input', { bubbles: true }));
        selectedInput.dispatchEvent(new Event('change', { bubbles: true }));
        
        console.log('Medium-friendly HTML inserted successfully');
    } else {
        console.error('No suitable input element found');
    }
}


