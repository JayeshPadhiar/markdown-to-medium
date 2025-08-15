# markdown-to-medium
A Chrome extension that converts markdown files to Medium.com articles using advanced rich text parsing.

## Installation

### For Development:
1. Clone or download this repository
2. Install dependencies: `npm install`
3. Build the extension: `npm run build`
4. Open Chrome and go to `chrome://extensions/`
5. Enable "Developer mode" in the top right corner
6. Click "Load unpacked" and select the project folder
7. The extension should now appear in your Chrome toolbar

### For Users:
1. Download the latest release
2. Extract the files
3. Open Chrome and go to `chrome://extensions/`
4. Enable "Developer mode" in the top right corner
5. Click "Load unpacked" and select the extracted folder

## Usage

### Step 1: Navigate to Medium New Story
1. Go to **https://medium.com/new-story** in your browser
2. The extension will automatically detect you're on the correct page

### Step 2: Use the Extension
1. Click the extension icon in your Chrome toolbar
2. The popup will show your current page status:
   - ✅ **Green**: On Medium write page - ready to insert content
   - 📖 **Blue**: On Medium new-story page - can navigate to write
   - ❌ **Red**: Not on the correct Medium page

### Step 3: Upload and Insert Content
1. Select a markdown file using "Choose Markdown File"
2. Preview your content in the popup
3. **If on new-story page**: Click "Go to Write Page" to navigate to the editor
4. **If on write page**: Click "Insert into Editor" to add your content

## Features

- ✅ **Rich Text Parsing**: Uses @contentful/rich-text-from-markdown for accurate conversion
- ✅ **Smart Formatting**: Automatically applies Medium formatting (headings, quotes, code blocks)
- ✅ **Content Injection**: Direct insertion into Medium's editor
- ✅ **File Upload**: Support for .md and .markdown files
- ✅ **Live Preview**: See your content before publishing
- ✅ **Advanced Markdown Support**: Handles headings, quotes, code blocks, lists, and more

## How It Works

The extension uses:
- **@contentful/rich-text-from-markdown**: Professional-grade markdown parsing
- **Webpack Bundling**: Enables npm package usage in browser extension
- **Content Scripts** to interact with Medium's page elements
- **DOM Manipulation** to insert content into Medium's editor
- **Medium Keyboard Shortcuts**: Automatically applies proper formatting
- **Real-time Communication** between popup and content script

## Supported Pages

- ✅ `https://medium.com/new-story/*` (Main publication page)
- ✅ Medium write/editor pages when accessed from new-story
- ❌ Other Medium publications (not supported)

## Development Status

**Currently Working:**
- Rich text markdown parsing with @contentful/rich-text-from-markdown
- Advanced formatting support (headings, quotes, code blocks, lists)
- File upload and preview
- Automatic Medium formatting application
- Content insertion into Medium editor

**Development Commands:**
- `npm run build`: Build the extension for production
- `npm run dev`: Build and watch for changes during development

**Technical Features:**
- Uses webpack for bundling npm packages
- Babel transpilation for browser compatibility
- Contentful rich text parsing for accurate markdown conversion
