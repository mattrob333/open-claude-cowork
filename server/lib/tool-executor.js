/**
 * Tool Executor
 *
 * Handles execution of custom tools including browser automation.
 * Provides a registry of tool definitions and their handlers.
 */

import logger from './logger.js';
import AgentBrowser, { getDefaultBrowser, closeDefaultBrowser } from './agent-browser.js';

const log = logger.base.child({ module: 'tool-executor' });

/**
 * Browser tool definitions for Claude
 * These match the Anthropic tool schema format
 */
export const browserToolDefinitions = [
  {
    name: 'browser_navigate',
    description: 'Navigate the browser to a specified URL. Use this to open web pages.',
    input_schema: {
      type: 'object',
      properties: {
        url: {
          type: 'string',
          description: 'The URL to navigate to (must include protocol like https://)'
        },
        wait_until: {
          type: 'string',
          enum: ['load', 'domcontentloaded', 'networkidle'],
          description: 'When to consider navigation complete. Default: domcontentloaded'
        }
      },
      required: ['url']
    }
  },
  {
    name: 'browser_click',
    description: 'Click on an element in the current page. Can use CSS selector or visible text.',
    input_schema: {
      type: 'object',
      properties: {
        selector: {
          type: 'string',
          description: 'CSS selector (e.g., "#submit-btn", ".nav-link") or visible text to click'
        }
      },
      required: ['selector']
    }
  },
  {
    name: 'browser_type',
    description: 'Type text into an input field on the current page.',
    input_schema: {
      type: 'object',
      properties: {
        selector: {
          type: 'string',
          description: 'CSS selector for the input field'
        },
        text: {
          type: 'string',
          description: 'The text to type into the field'
        },
        clear_first: {
          type: 'boolean',
          description: 'Whether to clear the field before typing. Default: true'
        }
      },
      required: ['selector', 'text']
    }
  },
  {
    name: 'browser_screenshot',
    description: 'Take a screenshot of the current page. Returns base64-encoded image data.',
    input_schema: {
      type: 'object',
      properties: {
        full_page: {
          type: 'boolean',
          description: 'Capture the full scrollable page instead of just the viewport. Default: false'
        }
      }
    }
  },
  {
    name: 'browser_scroll',
    description: 'Scroll the current page up or down.',
    input_schema: {
      type: 'object',
      properties: {
        direction: {
          type: 'string',
          enum: ['up', 'down'],
          description: 'Direction to scroll'
        },
        amount: {
          type: 'number',
          description: 'Pixels to scroll. Default: 500'
        }
      },
      required: ['direction']
    }
  },
  {
    name: 'browser_get_content',
    description: 'Get the text content and current URL of the page. Useful to understand what is on the page.',
    input_schema: {
      type: 'object',
      properties: {}
    }
  },
  {
    name: 'browser_wait',
    description: 'Wait for an element to appear on the page.',
    input_schema: {
      type: 'object',
      properties: {
        selector: {
          type: 'string',
          description: 'CSS selector to wait for'
        },
        timeout: {
          type: 'number',
          description: 'Maximum time to wait in milliseconds. Default: 30000'
        }
      },
      required: ['selector']
    }
  },
  {
    name: 'browser_close',
    description: 'Close the browser instance. Call this when done with browser tasks.',
    input_schema: {
      type: 'object',
      properties: {}
    }
  }
];

/**
 * Tool Executor class
 */
class ToolExecutor {
  constructor() {
    this.browser = null;
    this.handlers = new Map();

    // Register browser tool handlers
    this.registerHandler('browser_navigate', this.handleBrowserNavigate.bind(this));
    this.registerHandler('browser_click', this.handleBrowserClick.bind(this));
    this.registerHandler('browser_type', this.handleBrowserType.bind(this));
    this.registerHandler('browser_screenshot', this.handleBrowserScreenshot.bind(this));
    this.registerHandler('browser_scroll', this.handleBrowserScroll.bind(this));
    this.registerHandler('browser_get_content', this.handleBrowserGetContent.bind(this));
    this.registerHandler('browser_wait', this.handleBrowserWait.bind(this));
    this.registerHandler('browser_close', this.handleBrowserClose.bind(this));
  }

  /**
   * Register a tool handler
   */
  registerHandler(toolName, handler) {
    this.handlers.set(toolName, handler);
  }

  /**
   * Check if a tool is a browser tool
   */
  isBrowserTool(toolName) {
    return toolName.startsWith('browser_');
  }

  /**
   * Get tool definitions
   */
  getToolDefinitions() {
    return browserToolDefinitions;
  }

  /**
   * Get browser instance (lazy initialization)
   */
  async getBrowser() {
    if (!this.browser) {
      this.browser = await getDefaultBrowser();
    }
    return this.browser;
  }

  /**
   * Execute a tool
   */
  async execute(toolName, input) {
    log.info({ toolName, input }, 'Executing tool');

    const handler = this.handlers.get(toolName);
    if (!handler) {
      log.warn({ toolName }, 'Unknown tool');
      return {
        success: false,
        error: `Unknown tool: ${toolName}`
      };
    }

    try {
      const result = await handler(input);
      log.info({ toolName, success: result.success }, 'Tool execution complete');
      return result;
    } catch (error) {
      log.error({ toolName, error: error.message }, 'Tool execution failed');
      return {
        success: false,
        error: error.message
      };
    }
  }

  // === Browser Tool Handlers ===

  async handleBrowserNavigate(input) {
    const browser = await this.getBrowser();
    return browser.navigate(input.url, {
      waitUntil: input.wait_until || 'domcontentloaded'
    });
  }

  async handleBrowserClick(input) {
    const browser = await this.getBrowser();
    return browser.click(input.selector);
  }

  async handleBrowserType(input) {
    const browser = await this.getBrowser();
    return browser.type(input.selector, input.text, {
      clear: input.clear_first !== false
    });
  }

  async handleBrowserScreenshot(input) {
    const browser = await this.getBrowser();
    return browser.screenshot({
      fullPage: input.full_page || false
    });
  }

  async handleBrowserScroll(input) {
    const browser = await this.getBrowser();
    return browser.scroll({
      direction: input.direction,
      amount: input.amount || 500
    });
  }

  async handleBrowserGetContent(input) {
    const browser = await this.getBrowser();
    const content = await browser.getContent();

    if (!content.success) {
      return content;
    }

    // Extract text content for easier reading
    const result = await browser.evaluate(() => {
      return document.body.innerText;
    });

    return {
      success: true,
      url: content.url,
      title: content.title,
      text: result.result || '',
      html_length: content.content.length
    };
  }

  async handleBrowserWait(input) {
    const browser = await this.getBrowser();
    return browser.waitForSelector(input.selector, {
      timeout: input.timeout || 30000
    });
  }

  async handleBrowserClose(input) {
    if (this.browser) {
      await closeDefaultBrowser();
      this.browser = null;
    }
    return { success: true, message: 'Browser closed' };
  }

  /**
   * Cleanup resources
   */
  async cleanup() {
    await this.handleBrowserClose({});
  }
}

// Export singleton instance
const toolExecutor = new ToolExecutor();

export default toolExecutor;
export { ToolExecutor };
