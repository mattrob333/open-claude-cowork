/**
 * Agent Browser Wrapper
 *
 * Provides browser automation capabilities for AI agents using Playwright.
 * Supports navigation, clicking, typing, and screenshots.
 */

import { chromium } from 'playwright';
import logger from './logger.js';

const log = logger.base.child({ module: 'agent-browser' });

// Default configuration
const DEFAULT_CONFIG = {
  headless: process.env.BROWSER_HEADLESS !== 'false',
  viewport: { width: 1280, height: 720 },
  timeout: 30000,
  screenshotPath: null // If set, saves screenshots to disk
};

/**
 * AgentBrowser class for browser automation
 */
class AgentBrowser {
  constructor(config = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.browser = null;
    this.context = null;
    this.page = null;
    this.isInitialized = false;
  }

  /**
   * Initialize the browser instance
   */
  async initialize() {
    if (this.isInitialized) {
      return;
    }

    log.info({ headless: this.config.headless }, 'Launching browser');

    try {
      this.browser = await chromium.launch({
        headless: this.config.headless
      });

      this.context = await this.browser.newContext({
        viewport: this.config.viewport,
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      });

      this.page = await this.context.newPage();
      this.page.setDefaultTimeout(this.config.timeout);

      this.isInitialized = true;
      log.info('Browser initialized successfully');
    } catch (error) {
      log.error({ error: error.message }, 'Failed to initialize browser');
      throw error;
    }
  }

  /**
   * Ensure browser is initialized before operations
   */
  async ensureInitialized() {
    if (!this.isInitialized) {
      await this.initialize();
    }
  }

  /**
   * Navigate to a URL
   * @param {string} url - The URL to navigate to
   * @param {Object} options - Navigation options
   * @returns {Object} Navigation result with page info
   */
  async navigate(url, options = {}) {
    await this.ensureInitialized();

    const { waitUntil = 'domcontentloaded' } = options;

    log.info({ url, waitUntil }, 'Navigating to URL');

    try {
      const response = await this.page.goto(url, {
        waitUntil,
        timeout: this.config.timeout
      });

      const title = await this.page.title();
      const currentUrl = this.page.url();

      log.info({ url: currentUrl, title, status: response?.status() }, 'Navigation complete');

      return {
        success: true,
        url: currentUrl,
        title,
        status: response?.status() || null
      };
    } catch (error) {
      log.error({ url, error: error.message }, 'Navigation failed');
      return {
        success: false,
        url,
        error: error.message
      };
    }
  }

  /**
   * Click on an element
   * @param {string} selector - CSS selector or text to click
   * @param {Object} options - Click options
   * @returns {Object} Click result
   */
  async click(selector, options = {}) {
    await this.ensureInitialized();

    const { timeout = this.config.timeout, force = false } = options;

    log.info({ selector }, 'Clicking element');

    try {
      // Try CSS selector first
      let element = await this.page.$(selector);

      // If not found, try text matching
      if (!element) {
        element = await this.page.getByText(selector, { exact: false }).first();
      }

      if (!element) {
        throw new Error(`Element not found: ${selector}`);
      }

      await element.click({ timeout, force });

      // Wait a moment for any resulting navigation/updates
      await this.page.waitForTimeout(500);

      const currentUrl = this.page.url();

      log.info({ selector, url: currentUrl }, 'Click successful');

      return {
        success: true,
        selector,
        url: currentUrl
      };
    } catch (error) {
      log.error({ selector, error: error.message }, 'Click failed');
      return {
        success: false,
        selector,
        error: error.message
      };
    }
  }

  /**
   * Type text into an element
   * @param {string} selector - CSS selector for the input
   * @param {string} text - Text to type
   * @param {Object} options - Type options
   * @returns {Object} Type result
   */
  async type(selector, text, options = {}) {
    await this.ensureInitialized();

    const { delay = 50, clear = true } = options;

    log.info({ selector, textLength: text.length }, 'Typing into element');

    try {
      const element = await this.page.$(selector);

      if (!element) {
        throw new Error(`Element not found: ${selector}`);
      }

      if (clear) {
        await element.fill('');
      }

      await element.type(text, { delay });

      log.info({ selector }, 'Type successful');

      return {
        success: true,
        selector,
        textLength: text.length
      };
    } catch (error) {
      log.error({ selector, error: error.message }, 'Type failed');
      return {
        success: false,
        selector,
        error: error.message
      };
    }
  }

  /**
   * Fill a form input (faster than type, no key events)
   * @param {string} selector - CSS selector for the input
   * @param {string} value - Value to fill
   * @returns {Object} Fill result
   */
  async fill(selector, value) {
    await this.ensureInitialized();

    log.info({ selector }, 'Filling element');

    try {
      await this.page.fill(selector, value);

      log.info({ selector }, 'Fill successful');

      return {
        success: true,
        selector
      };
    } catch (error) {
      log.error({ selector, error: error.message }, 'Fill failed');
      return {
        success: false,
        selector,
        error: error.message
      };
    }
  }

  /**
   * Take a screenshot
   * @param {Object} options - Screenshot options
   * @returns {Object} Screenshot result with base64 data or file path
   */
  async screenshot(options = {}) {
    await this.ensureInitialized();

    const {
      fullPage = false,
      type = 'png',
      quality = undefined, // Only for jpeg
      path = null
    } = options;

    log.info({ fullPage, type, path }, 'Taking screenshot');

    try {
      const screenshotOptions = {
        fullPage,
        type
      };

      if (type === 'jpeg' && quality !== undefined) {
        screenshotOptions.quality = quality;
      }

      let result;

      if (path || this.config.screenshotPath) {
        const filePath = path || `${this.config.screenshotPath}/screenshot_${Date.now()}.${type}`;
        screenshotOptions.path = filePath;
        await this.page.screenshot(screenshotOptions);
        result = { path: filePath };
        log.info({ path: filePath }, 'Screenshot saved to file');
      } else {
        const buffer = await this.page.screenshot(screenshotOptions);
        result = { base64: buffer.toString('base64') };
        log.info({ size: buffer.length }, 'Screenshot captured');
      }

      return {
        success: true,
        ...result,
        url: this.page.url(),
        title: await this.page.title()
      };
    } catch (error) {
      log.error({ error: error.message }, 'Screenshot failed');
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Wait for an element to appear
   * @param {string} selector - CSS selector to wait for
   * @param {Object} options - Wait options
   * @returns {Object} Wait result
   */
  async waitForSelector(selector, options = {}) {
    await this.ensureInitialized();

    const { timeout = this.config.timeout, state = 'visible' } = options;

    log.info({ selector, state }, 'Waiting for element');

    try {
      await this.page.waitForSelector(selector, { timeout, state });

      log.info({ selector }, 'Element found');

      return {
        success: true,
        selector
      };
    } catch (error) {
      log.error({ selector, error: error.message }, 'Wait for element failed');
      return {
        success: false,
        selector,
        error: error.message
      };
    }
  }

  /**
   * Wait for navigation to complete
   * @param {Object} options - Wait options
   * @returns {Object} Wait result
   */
  async waitForNavigation(options = {}) {
    await this.ensureInitialized();

    const { timeout = this.config.timeout, waitUntil = 'domcontentloaded' } = options;

    log.info({ waitUntil }, 'Waiting for navigation');

    try {
      await this.page.waitForLoadState(waitUntil, { timeout });
      const url = this.page.url();

      log.info({ url }, 'Navigation complete');

      return {
        success: true,
        url
      };
    } catch (error) {
      log.error({ error: error.message }, 'Wait for navigation failed');
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get the current page content
   * @returns {Object} Page content
   */
  async getContent() {
    await this.ensureInitialized();

    try {
      const content = await this.page.content();
      const title = await this.page.title();
      const url = this.page.url();

      return {
        success: true,
        content,
        title,
        url
      };
    } catch (error) {
      log.error({ error: error.message }, 'Failed to get content');
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Evaluate JavaScript in the page context
   * @param {Function|string} script - Script to evaluate
   * @param  {...any} args - Arguments to pass to the script
   * @returns {Object} Evaluation result
   */
  async evaluate(script, ...args) {
    await this.ensureInitialized();

    try {
      const result = await this.page.evaluate(script, ...args);
      return {
        success: true,
        result
      };
    } catch (error) {
      log.error({ error: error.message }, 'Evaluation failed');
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Scroll the page
   * @param {Object} options - Scroll options
   * @returns {Object} Scroll result
   */
  async scroll(options = {}) {
    await this.ensureInitialized();

    const { x = 0, y = 0, direction = 'down', amount = 500 } = options;

    try {
      if (x !== 0 || y !== 0) {
        await this.page.evaluate(({ x, y }) => window.scrollTo(x, y), { x, y });
      } else {
        const scrollY = direction === 'down' ? amount : -amount;
        await this.page.evaluate((y) => window.scrollBy(0, y), scrollY);
      }

      log.info({ direction, amount }, 'Scroll complete');

      return {
        success: true
      };
    } catch (error) {
      log.error({ error: error.message }, 'Scroll failed');
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get current page URL
   * @returns {string} Current URL
   */
  getCurrentUrl() {
    return this.page?.url() || null;
  }

  /**
   * Close the browser
   */
  async close() {
    if (this.browser) {
      log.info('Closing browser');
      await this.browser.close();
      this.browser = null;
      this.context = null;
      this.page = null;
      this.isInitialized = false;
      log.info('Browser closed');
    }
  }

  /**
   * Get browser status
   */
  getStatus() {
    return {
      initialized: this.isInitialized,
      url: this.getCurrentUrl(),
      config: {
        headless: this.config.headless,
        viewport: this.config.viewport
      }
    };
  }
}

// Export class and singleton factory
let defaultBrowser = null;

/**
 * Get or create the default browser instance
 */
async function getDefaultBrowser(config = {}) {
  if (!defaultBrowser) {
    defaultBrowser = new AgentBrowser(config);
  }
  return defaultBrowser;
}

/**
 * Close the default browser instance
 */
async function closeDefaultBrowser() {
  if (defaultBrowser) {
    await defaultBrowser.close();
    defaultBrowser = null;
  }
}

export default AgentBrowser;
export { getDefaultBrowser, closeDefaultBrowser };
