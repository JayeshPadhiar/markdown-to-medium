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

        const lines = content.split('\n');
        const sections = [];
        let i = 0;

        while (i < lines.length) {
            const line = lines[i];

            // Skip empty lines
            if (line.trim() === '') {
                i++;
                continue;
            }

            // Handle Headers (# ## ### #### ##### ######)
            if (line.trim().match(/^#{1,6}\s+/)) {
                const match = line.trim().match(/^(#{1,6})\s+(.+)$/);
                if (match) {
                    const level = match[1].length;
                    const text = removeInlineFormatting(match[2].trim());

                    // Determine type based on header level
                    let type;
                    if (level === 1) {
                        type = 'header';
                    } else if ((level >= 2) && (level <= 6)) {
                        type = 'subheader';
                    } else {
                        // Level 3+ headers should be treated as regular text
                        type = 'text';
                    }

                    console.log(level, type);

                    sections.push({
                        type: type,
                        content: [text],
                        level: level
                    });
                    console.log('sections', sections[sections.length - 1]);
                }
                i++;
                continue;
            }

            // Handle Code Blocks (```)
            if (line.trim().startsWith('```')) {
                const language = line.trim().substring(3).trim();
                const codeLines = [];
                i++; // Move to next line after opening ```

                while (i < lines.length && !lines[i].trim().startsWith('```')) {
                    codeLines.push(lines[i]);
                    i++;
                }

                sections.push({
                    type: 'code_block',
                    content: codeLines,
                    language: language || 'text'
                });
                i++; // Skip closing ```
                continue;
            }

            // Handle Tables (convert to regular content for now, as not in required types)
            if (line.trim().startsWith('|') && line.trim().endsWith('|')) {
                // Skip table separator line
                if (line.trim().match(/^\|[\s\-:|]+\|$/)) {
                    i++;
                    continue;
                }

                // Parse table row as regular content
                const cells = line.trim().slice(1, -1).split('|').map(cell => removeInlineFormatting(cell.trim()));
                const tableContent = cells.join(' | ');

                sections.push({
                    type: 'subheader', // Using link type as fallback for table content
                    content: [tableContent],
                    level: 2
                });
                i++;
                continue;
            }

            // Handle Images (convert to link type)
            if (line.trim().match(/^!\[.*\]\(.*\)/)) {
                const match = line.trim().match(/^!\[([^\]]*)\]\(([^)]+?)(?:\s+"([^"]*)")?\)$/);
                if (match) {
                    const altText = match[1] || '';
                    const url = match[2];
                    const title = match[3] || '';

                    sections.push({
                        type: 'link',
                        content: [altText || title || url],
                        url: url
                    });
                }
                i++;
                continue;
            }

            // Handle Blockquotes (> text)
            if (line.trim().startsWith('>')) {
                const quoteLines = [];

                while (i < lines.length && lines[i].trim().startsWith('>')) {
                    let currentLine = lines[i].trim();

                    // Remove > symbols and clean up
                    while (currentLine.startsWith('>')) {
                        currentLine = currentLine.substring(1).trim();
                    }

                    if (currentLine) {
                        quoteLines.push(removeInlineFormatting(currentLine));
                    }
                    i++;
                }

                sections.push({
                    type: 'quote',
                    content: quoteLines
                });
                continue;
            }

            // Handle Unordered Lists (*, -, +)
            if (line.match(/^(\s*)([-*+])\s+/)) {
                const listItems = [];

                while (i < lines.length && lines[i].match(/^(\s*)([-*+])\s+/)) {
                    const match = lines[i].match(/^(\s*)([-*+])\s+(.+)$/);
                    if (match) {
                        listItems.push(removeInlineFormatting(match[3]));
                    }
                    i++;
                }

                sections.push({
                    type: 'bullet_list',
                    content: listItems
                });
                continue;
            }

            // Handle Ordered Lists (1., 2., etc.)
            if (line.match(/^(\s*)\d+\.\s+/)) {
                const listItems = [];

                while (i < lines.length && lines[i].match(/^(\s*)\d+\.\s+/)) {
                    const match = lines[i].match(/^(\s*)\d+\.\s+(.+)$/);
                    if (match) {
                        listItems.push(removeInlineFormatting(match[2]));
                    }
                    i++;
                }

                sections.push({
                    type: 'num_list',
                    content: listItems
                });
                continue;
            }

            // Handle Horizontal Rules (---, ***, ___) - convert to subheader
            if (line.trim().match(/^(-{3,}|\*{3,}|_{3,})$/)) {
                sections.push({
                    type: 'subheader',
                    content: ['---'],
                    level: 2
                });
                i++;
                continue;
            }

            // Handle Links [text](url)
            if (line.trim().match(/^\[.*\]\(.*\)$/)) {
                const match = line.trim().match(/^\[([^\]]+)\]\(([^)]+)\)$/);
                if (match) {
                    sections.push({
                        type: 'link',
                        content: [removeInlineFormatting(match[1])],
                        url: match[2]
                    });
                }
                i++;
                continue;
            }

            // Handle regular paragraphs (collect consecutive non-special lines)
            const paragraphLines = [];
            while (i < lines.length &&
                lines[i].trim() !== '' &&
                !lines[i].trim().match(/^#{1,6}\s+/) && // Not header
                !lines[i].trim().startsWith('```') && // Not code block
                !lines[i].trim().startsWith('|') && // Not table
                !lines[i].trim().match(/^!\[.*\]\(.*\)/) && // Not image
                !lines[i].trim().startsWith('>') && // Not blockquote
                !lines[i].match(/^(\s*)([-*+]|\d+\.)\s+/) && // Not list
                !lines[i].trim().match(/^(-{3,}|\*{3,}|_{3,})$/) && // Not horizontal rule
                !lines[i].trim().match(/^\[.*\]\(.*\)$/)) { // Not standalone link

                const cleanLine = removeInlineFormatting(lines[i].trim());
                if (cleanLine) {
                    paragraphLines.push(cleanLine);
                }
                i++;
            }

            if (paragraphLines.length > 0) {
                // Check if paragraph contains links
                const hasLinks = paragraphLines.some(line => line.includes('http') || line.includes('www.'));

                sections.push({
                    type: hasLinks ? 'link' : 'text',
                    content: paragraphLines,
                    level: hasLinks ? undefined : undefined
                });
            }
        }

        console.log('Parsed sections:', sections);
        return sections;

    } catch (error) {
        console.error('Error parsing markdown:', error);
        return [{
            type: 'text',
            content: [content],
            level: 2
        }];
    }
}

// Helper function to remove inline formatting and convert to plain text
function removeInlineFormatting(text) {
    if (!text || typeof text !== 'string') return text;

    let result = text;

    // Remove bold **text** or __text__
    result = result.replace(/\*\*([^*]+)\*\*/g, '$1');
    result = result.replace(/__([^_]+)__/g, '$1');

    // Remove italic *text* or _text_
    result = result.replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '$1');
    result = result.replace(/(?<!_)_([^_]+)_(?!_)/g, '$1');

    // Remove inline code `code`
    result = result.replace(/`([^`]+)`/g, '$1');

    // Remove strikethrough ~~text~~
    result = result.replace(/~~([^~]+)~~/g, '$1');

    // Convert links [text](url) to just text
    result = result.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');

    return result.trim();
}

// Insert function for markdown content
async function insertMarkdownContent(content) {
    const parsed = await parseMarkdownContent(content);
    console.log('Inserting markdown content:', parsed);

    for await (const section of parsed) {
        console.log('Inserting section:', section);

        // Route to appropriate insert function based on section type
        switch (section.type) {
            case 'text':
                await insertText(Array.isArray(section.content) ? section.content.join(' ') : section.content);
                break;
            case 'header':
                await insertHeader(section);
                break;
            case 'subheader':
                await insertSubheader(section);
                break;
            case 'quote':
                await insertQuote(section);
                break;
            case 'bullet_list':
                await insertBulletList(section);
                break;
            case 'num_list':
                await insertNumList(section);
                break;
            case 'code_block':
                await insertCodeBlock(section);
                break;
            case 'link':
                await insertLink(section);
                break;
            default:
                // Fallback to regular text insertion
                await insertText(Array.isArray(section.content) ? section.content.join(' ') : section.content);
        }
    }
}

// Insert function for headers
async function insertHeader(section) {
    await keyEvent('header');
    const headerText = Array.isArray(section.content) ? section.content.join(' ') : section.content;
    console.log('headerText', headerText);
    await insertText(headerText);
}

// Insert function for subheaders
async function insertSubheader(section) {
    await keyEvent('subheader');
    const subheaderText = Array.isArray(section.content) ? section.content.join(' ') : section.content;
    await insertText(subheaderText);
}

// Insert function for quotes
async function insertQuote(section) {
    await keyEvent('quote');
    const quoteText = Array.isArray(section.content) ? section.content.join(' ') : section.content;
    await insertText(quoteText);
}

// Insert function for bullet lists
async function insertBulletList(section) {
    //await keyEvent('bullet_list');
    if (Array.isArray(section.content)) {
        for (let i = 0; i < section.content.length; i++) {
            const item = section.content[i];
            await insertText((i == 0 ? '* ' : '') + item);

            // Add a small delay between list items
            if (i < section.content.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 100));
            }
        }
    } else {
        await insertText(section.content);
    }

    await keyEvent('backspace');
}

// Insert function for numbered lists
async function insertNumList(section) {
    //await keyEvent('num_list');
    if (Array.isArray(section.content)) {
        for (let i = 0; i < section.content.length; i++) {
            console.log('inserting bullet list item', i);
            const item = section.content[i];
            await insertText((i == 0 ? '1. ' : '') + item);

            // Add a small delay between list items
            if (i < section.content.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 100));
            }
        }
    } else {
        await insertText(section.content);
    }

    await keyEvent('backspace');
}

// Insert function for code blocks
async function insertCodeBlock(section) {
    return new Promise(async (resolve, reject) => {

        await keyEvent('code_block');
        if (Array.isArray(section.content)) {
            const codeText = section.content.join('\n');
            await insertText(codeText);
        } else {
            await insertText(section.content);
        }


        await keyEvent('enter');
        await setCursorToEnd(document.activeElement);
        let currentFocus = document.activeElement;
        currentFocus.focus();
        console.log('currentFocus', currentFocus);
        await keyEvent('right_key', currentFocus);
        //await keyEvent('enter');
        resolve(true);
    });
}

// Insert function for links
async function insertLink(section) {
    const linkText = Array.isArray(section.content) ? section.content.join(' ') : section.content;
    await insertText(linkText);
}


async function insertText(text) {
    return new Promise((resolve, reject) => {
        setTimeout(async () => {
            let selectedInput = document.querySelector('.is-selected');
            selectedInput.focus();
            await setCursorToEnd(selectedInput);
            selectedInput.textContent = text;
            selectedInput.dispatchEvent(new Event('input', { bubbles: true }));
            selectedInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
            await setCursorToEnd(selectedInput);
            await keyEvent('enter');

            setTimeout(async () => {
                selectedInput = document.querySelector('.is-selected');
                await setCursorToEnd(selectedInput);
                //selectedInput.focus();
                resolve(true);
            }, 100);
        }, 50);
    });
}

/**
 function insertText(text, index) {
    return new Promise((resolve, reject) => {
        const selectedInput = document.querySelector('.is-selected');
        if (index < text.length) {
            selectedInput.focus();
            setCursorToEnd(selectedInput);
            selectedInput.textContent = text.substring(0, index + 1);
            selectedInput.dispatchEvent(new Event('input', { bubbles: true }));
            selectedInput.scrollIntoView({ behavior: 'smooth', block: 'center' });

            setTimeout(() => {
                insertText(text, index + 1).then(resolve).catch(reject);
            }, 2);
        } else {
            selectedInput.focus();
            setCursorToEnd(selectedInput);

            setTimeout(async () => {
                await keyEvent('enter');
                setTimeout(() => {
                    resolve(true);
                }, 10);
            }, 500);
        }
    });
}
 */

// Helper function to set cursor to the end of contenteditable element
async function setCursorToEnd(element) {
    //await keyEvent('left_key', element);
    element.focus();

    if (typeof window.getSelection != "undefined" && typeof document.createRange != "undefined") {
        const range = document.createRange();
        range.selectNodeContents(element);
        range.collapse(false);

        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);
    } else if (typeof document.body.createTextRange != "undefined") {
        // Fallback for older browsers
        const textRange = document.body.createTextRange();
        textRange.moveToElementText(element);
        textRange.collapse(false);
        textRange.select();
    }
}

const keyMap = {
    // Header - Cmd+Opt+1 (macOS) / Ctrl+Alt+1 (Windows)
    header: {
        mac: { cmd: true, alt: true, key: '1', keyCode: 49, which: 49, code: 'Digit1' },
        windows: { ctrl: true, alt: true, key: '1', keyCode: 49, which: 49, code: 'Digit1' }
    },
    // Subheader - Cmd+Opt+2 (macOS) / Ctrl+Alt+2 (Windows)
    subheader: {
        mac: { cmd: true, alt: true, key: '2', keyCode: 50, which: 50, code: 'Digit2' },
        windows: { ctrl: true, alt: true, key: '2', keyCode: 50, which: 50, code: 'Digit2' }
    },
    // Quote - Cmd+Opt+5 (macOS) / Ctrl+Alt+5 (Windows)
    quote: {
        mac: { cmd: true, alt: true, key: '5', keyCode: 53, which: 53, code: 'Digit5' },
        windows: { ctrl: true, alt: true, key: '5', keyCode: 53, which: 53, code: 'Digit5' }
    },
    // Code block - Cmd+Opt+6 (macOS) / Ctrl+Alt+6 (Windows) or ``` (both platforms)
    code_block: {
        mac: { cmd: true, alt: true, key: '6', keyCode: 54, which: 54, code: 'Digit6' },
        windows: { ctrl: true, alt: true, key: '6', keyCode: 54, which: 54, code: 'Digit6' }
    },
    // Left arrow key
    left_key: {
        mac: { key: 'ArrowLeft', keyCode: 37, which: 37, code: 'ArrowLeft' },
        windows: { key: 'ArrowLeft', keyCode: 37, which: 37, code: 'ArrowLeft' }
    },
    // Right arrow key
    right_key: {
        mac: { key: 'ArrowRight', keyCode: 39, which: 39, code: 'ArrowRight' },
        windows: { key: 'ArrowRight', keyCode: 39, which: 39, code: 'ArrowRight' }
    },
    // Up arrow key
    up_key: {
        mac: { key: 'ArrowUp', keyCode: 38, which: 38, code: 'ArrowUp' },
        windows: { key: 'ArrowUp', keyCode: 38, which: 38, code: 'ArrowUp' }
    },
    // Down arrow key
    down_key: {
        mac: { key: 'ArrowDown', keyCode: 40, which: 40, code: 'ArrowDown' },
        windows: { key: 'ArrowDown', keyCode: 40, which: 40, code: 'ArrowDown' }
    },
    // Enter key
    enter: {
        mac: { key: 'Enter', keyCode: 13, which: 13, code: 'Enter' },
        windows: { key: 'Enter', keyCode: 13, which: 13, code: 'Enter' }
    },
    // Space key
    space: {
        mac: { key: ' ', keyCode: 32, which: 32, code: 'Space' },
        windows: { key: ' ', keyCode: 32, which: 32, code: 'Space' }
    },
    // . key
    dot: {
        mac: { key: '.', keyCode: 190, which: 190, code: 'Period' },
        windows: { key: '.', keyCode: 190, which: 190, code: 'Period' }
    },
    // backspace key
    backspace: {
        mac: { key: 'Backspace', keyCode: 8, which: 8, code: 'Backspace' },
        windows: { key: 'Backspace', keyCode: 8, which: 8, code: 'Backspace' }
    }
}


function keyEvent(keytype, element) {
    return new Promise((resolve, reject) => {
        //const selectedInput = element || document.querySelector('.is-selected');
        setTimeout(() => {
            let selectedInput = element || document.querySelector('.is-selected');

            const isWindows = navigator.platform.toUpperCase().indexOf('WIN') >= 0;
            const keyConfig = keyMap[keytype][isWindows ? 'windows' : 'mac'];

            if (!keyConfig) {
                resolve(false);
                return;
            }

            const keydown = new KeyboardEvent('keydown', {
                key: keyConfig.key,
                code: keyConfig.code,
                keyCode: keyConfig.keyCode,
                which: keyConfig.which,
                ctrlKey: keyConfig.ctrl || false,
                metaKey: keyConfig.cmd || false,
                altKey: keyConfig.alt || false,
                shiftKey: keyConfig.shift || false,
                bubbles: true,
                cancelable: true
            });

            const keyup = new KeyboardEvent('keyup', {
                key: keyConfig.key,
                code: keyConfig.code,
                keyCode: keyConfig.keyCode,
                which: keyConfig.which,
                ctrlKey: keyConfig.ctrl || false,
                metaKey: keyConfig.cmd || false,
                altKey: keyConfig.alt || false,
                shiftKey: keyConfig.shift || false,
                bubbles: true,
                cancelable: true
            });

            
            setTimeout(() => {
                while (!selectedInput) {
                    selectedInput = element || document.querySelector('.is-selected');
                }

                // Ensure the element is focused before sending key events
                selectedInput.focus();

                selectedInput.dispatchEvent(keydown);
                selectedInput.dispatchEvent(keyup);

                console.log('keyEvent', keytype);

                resolve(true);
            }, 200);
        }, 100);
    });
}
