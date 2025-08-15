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

        // Split content into lines for processing
        const lines = content.split('\n');
        const sections = [];
        let currentSection = '';
        let inCodeBlock = false;
        let codeBlockContent = '';
        let codeBlockLanguage = '';

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            
            // Handle code blocks
            if (line.trim().startsWith('```')) {
                if (!inCodeBlock) {
                    // Starting code block
                    if (currentSection.trim()) {
                        sections.push({
                            type: 'paragraph',
                            content: parseInlineFormatting(currentSection.trim())
                        });
                        currentSection = '';
                    }
                    inCodeBlock = true;
                    codeBlockLanguage = line.trim().substring(3);
                    codeBlockContent = '';
                } else {
                    // Ending code block
                    inCodeBlock = false;
                    sections.push({
                        type: 'code',
                        content: codeBlockContent.replace(/\n$/, ''),
                        language: codeBlockLanguage || 'text'
                    });
                    codeBlockContent = '';
                    codeBlockLanguage = '';
                }
                continue;
            }

            if (inCodeBlock) {
                codeBlockContent += line + '\n';
                continue;
            }

            // Handle headers
            if (line.trim().startsWith('#')) {
                if (currentSection.trim()) {
                    sections.push({
                        type: 'paragraph',
                        content: parseInlineFormatting(currentSection.trim())
                    });
                    currentSection = '';
                }
                
                const match = line.trim().match(/^(#{1,6})\s+(.+)$/);
                if (match) {
                    const level = match[1].length;
                    const text = parseInlineFormatting(match[2]);
                    sections.push({
                        type: 'header',
                        content: text,
                        level: level
                    });
                }
                continue;
            }

            // Handle images
            if (line.trim().match(/^!\[.*\]\(.*\)$/)) {
                if (currentSection.trim()) {
                    sections.push({
                        type: 'paragraph',
                        content: parseInlineFormatting(currentSection.trim())
                    });
                    currentSection = '';
                }
                
                const match = line.trim().match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
                if (match) {
                    sections.push({
                        type: 'image',
                        content: match[2], // URL
                        alt: match[1], // Alt text
                        caption: match[1] // Use alt as caption
                    });
                }
                continue;
            }

            // Handle horizontal rules
            if (line.trim().match(/^-{3,}$/) || line.trim().match(/^\*{3,}$/)) {
                if (currentSection.trim()) {
                    sections.push({
                        type: 'paragraph',
                        content: parseInlineFormatting(currentSection.trim())
                    });
                    currentSection = '';
                }
                sections.push({
                    type: 'divider',
                    content: ''
                });
                continue;
            }

            // Handle blockquotes
            if (line.trim().startsWith('>')) {
                if (currentSection.trim()) {
                    sections.push({
                        type: 'paragraph',
                        content: parseInlineFormatting(currentSection.trim())
                    });
                    currentSection = '';
                }
                
                // Collect consecutive blockquote lines
                let blockquoteContent = line.substring(line.indexOf('>') + 1).trim();
                while (i + 1 < lines.length && lines[i + 1].trim().startsWith('>')) {
                    i++;
                    blockquoteContent += '\n' + lines[i].substring(lines[i].indexOf('>') + 1).trim();
                }
                
                sections.push({
                    type: 'quote',
                    content: parseInlineFormatting(blockquoteContent)
                });
                continue;
            }

            // Handle lists
            if (line.trim().match(/^[-*+]\s/) || line.trim().match(/^\d+\.\s/)) {
                if (currentSection.trim()) {
                    sections.push({
                        type: 'paragraph',
                        content: parseInlineFormatting(currentSection.trim())
                    });
                    currentSection = '';
                }
                
                // Collect consecutive list items
                const isOrdered = line.trim().match(/^\d+\.\s/);
                let listItems = [];
                listItems.push(parseInlineFormatting(line.trim().replace(/^[-*+]\s|^\d+\.\s/, '')));
                
                while (i + 1 < lines.length && (lines[i + 1].trim().match(/^[-*+]\s/) || lines[i + 1].trim().match(/^\d+\.\s/))) {
                    i++;
                    listItems.push(parseInlineFormatting(lines[i].trim().replace(/^[-*+]\s|^\d+\.\s/, '')));
                }
                
                sections.push({
                    type: 'list',
                    content: listItems,
                    ordered: !!isOrdered
                });
                continue;
            }

            // Handle empty lines
            if (line.trim() === '') {
                if (currentSection.trim()) {
                    sections.push({
                        type: 'paragraph',
                        content: parseInlineFormatting(currentSection.trim())
                    });
                    currentSection = '';
                }
                continue;
            }

            // Add to current section
            if (currentSection) {
                currentSection += '\n' + line;
            } else {
                currentSection = line;
            }
        }

        // Handle remaining content
        if (currentSection.trim()) {
            sections.push({
                type: 'paragraph',
                content: parseInlineFormatting(currentSection.trim())
            });
        }

        console.log('Parsed sections:', sections);
        return sections;

    } catch (error) {
        console.error('Error parsing markdown:', error);
        // Fallback to original markdown content as a single paragraph
        return [{
            type: 'paragraph',
            content: content
        }];
    }
}

// Helper function for parsing inline formatting (returns formatted text, not HTML)
function parseInlineFormatting(text) {
    // For now, keep the markdown formatting as-is
    // You can later decide how to handle bold, italic, etc. in the content
    return text;
}

function getSelectedInput(){
    const element = document.querySelector('.is-selected');
    return element;
}

function pressEnter(){
    const selectedInput = getSelectedInput();
    selectedInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true, code: 'Enter', keyCode: 13, which: 13 }));
}

async function insertMarkdownContent(content) {
    const parsedContent = await parseMarkdownContent(content);
    console.log('Parsed content:', parsedContent);

    const selectedInput = getSelectedInput();
    console.log('Selected input:', selectedInput);
    if (selectedInput) {
        // Focus the input first
        selectedInput.focus();

        // Insert Medium-friendly HTML content
        //selectedInput.innerHTML = parsedContent;
        
        // Trigger input event to notify Medium
        selectedInput.dispatchEvent(new Event('input', { bubbles: true }));
        selectedInput.dispatchEvent(new Event('change', { bubbles: true }));
        
        console.log('Medium-friendly HTML inserted successfully');
    } else {
        console.error('No suitable input element found');
    }
}


