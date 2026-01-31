/**
 * Quick Actions Routes
 * 
 * Handles CRUD for quick actions - simplified workflows that are
 * AI-generated from successful chat threads.
 */

import express from 'express';
import { createClient } from '@supabase/supabase-js';

const router = express.Router();

// Initialize Supabase client
let supabase = null;
if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
  supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

// In-memory storage fallback for development
const inMemoryQuickActions = new Map();

// Categories matching Tasklet.ai
const CATEGORIES = ['comms', 'operations', 'admin', 'growth', 'insights'];

// Default Quick Actions (seeded for all users)
const DEFAULT_QUICK_ACTIONS = [
  {
    id: 'qa_default_acquiportal',
    title: 'AcquiPortal Company Analysis',
    description: 'Run comprehensive acquisition analysis on any company URL. Generates investor-grade analysis with financial estimates, AI transformation opportunities, and deal package.',
    category: 'operations',
    tools_used: ['firecrawl', 'github', 'web_search', 'composio'],
    system_prompt: `# ACQUIPORTAL COMPANY ANALYSIS WORKFLOW

You are an AI acquisition analyst for AcquiPortal. Your task is to analyze a target company and produce a comprehensive, investor-grade analysis package.

## FIRST: ASK FOR INPUT

Before starting, ask the user:

> **What company would you like me to analyze?**
> Please provide either:
> - The company website URL (e.g., https://smith-hvac.com)
> - Or the company name and location (e.g., "Smith HVAC Services, Phoenix AZ")

Wait for the user's response before proceeding.

---

## ANALYSIS WORKFLOW

Once you have the company info, execute these phases:

### Phase 1: Discovery & Data Collection

1. **Website Analysis** (use Firecrawl)
   - Scrape the company website for all available information
   - Identify: services, service areas, team members, contact info
   - Assess: website quality, mobile responsiveness, online booking
   - Note any technology signals (software mentions, integrations)

2. **Digital Presence Audit** (use web search)
   - Search "[Company Name] reviews"
   - Find Google Business Profile: rating, review count
   - Check Yelp, BBB, industry-specific review sites
   - Search for social media presence

3. **Owner Research** (use web search)
   - Search LinkedIn for owner/founder
   - Estimate owner age from career timeline
   - Look for news articles, press mentions
   - Check business registration if possible

4. **Competitive Landscape** (use web search)
   - Find top 3-5 competitors in same area
   - Compare ratings, digital presence

### Phase 2: Financial Analysis

5. **Revenue Estimation** - Use multiple methods:
   - **Employee method**: Count employees × $150-200K per employee
   - **Review method**: Total reviews ÷ 5-10% review rate × avg ticket
   - **Service area method**: Population × market penetration

6. **Valuation Analysis**
   - Apply industry EBITDA margins (8-15% for services)
   - Add back owner comp ($75-150K)
   - Calculate SDE (Seller's Discretionary Earnings)
   - Apply multiples: 2.5-4x SDE (Main Street) or 4-6x EBITDA (Lower MM)

### Phase 3: AI Transformation Opportunity

7. **Current State Scoring** (1-5 scale):
   - Digital Maturity (website, online booking, CRM)
   - Operational Efficiency (scheduling, dispatch)
   - Customer Communication (response time, automation)
   - Back Office (invoicing, payments)
   - Marketing (SEO, advertising)

8. **AI Opportunity Map** - Evaluate each:
   - Voice AI for inbound calls → capture missed leads
   - AI dispatch/scheduling optimization
   - Automated quoting and proposals
   - Predictive maintenance subscription model
   - AI chatbot for website/SMS
   - Automated review solicitation
   - AI bookkeeping/invoicing

   For each, estimate: implementation cost, annual impact, payback period

### Phase 4: Deal Package Generation

9. **Generate Outputs**:
   - Executive Summary (1-page overview)
   - Investment Memo (detailed analysis)
   - AI Transformation Roadmap with ROI projections
   - Owner Outreach Script (email + phone)
   - Red Flags & Risk Assessment

### Phase 5: Storage (use GitHub via Composio)

10. **Save to GitHub**:
    - Create folder: \`analyses/[company-slug]-[date]/\`
    - Save all markdown files
    - Include data sources and confidence levels

---

## OUTPUT FORMAT

Present findings in this structure:

\`\`\`
## 📊 EXECUTIVE SUMMARY
[Company] | [Location] | Est. Revenue: $X.XM | Valuation: $X-$XM

### Key Findings
- [3-5 bullet points]

### AI Transformation Potential
- Total annual value creation: $XXK
- Key opportunities: [list]

### Recommendation
[PROCEED / NEEDS MORE INFO / PASS]
\`\`\`

Then provide detailed sections for each phase.

---

## CONFIDENCE LEVELS

Rate each data point:
- **HIGH**: Multiple sources, public data
- **MEDIUM**: Single source, reasonable inference
- **LOW**: Significant assumptions required

---

## BEGIN

Start by asking for the company to analyze.`,
    is_default: true,
    created_at: '2026-01-30T00:00:00.000Z',
    updated_at: '2026-01-30T00:00:00.000Z',
  }
];

/**
 * GET /api/quick-actions
 * Get all quick actions for a user (includes defaults)
 */
router.get('/', async (req, res) => {
  try {
    const userId = req.headers.authorization?.replace('Bearer ', '') || 'anonymous';
    const { category } = req.query;

    // Filter defaults by category if specified
    let defaults = DEFAULT_QUICK_ACTIONS.map(a => ({ ...a, user_id: userId }));
    if (category && CATEGORIES.includes(category)) {
      defaults = defaults.filter(a => a.category === category);
    }

    if (supabase) {
      let query = supabase
        .from('quick_actions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (category && CATEGORIES.includes(category)) {
        query = query.eq('category', category);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Merge defaults with user actions (defaults first)
      const userActions = data || [];
      const allActions = [...defaults, ...userActions];
      return res.json({ quickActions: allActions });
    } else {
      // In-memory fallback
      const userActions = inMemoryQuickActions.get(userId) || [];
      const filtered = category
        ? userActions.filter(a => a.category === category)
        : userActions;
      // Merge defaults with user actions
      const allActions = [...defaults, ...filtered];
      return res.json({ quickActions: allActions });
    }
  } catch (error) {
    console.error('Error fetching quick actions:', error);
    res.status(500).json({ error: 'Failed to fetch quick actions' });
  }
});

/**
 * GET /api/quick-actions/:id
 * Get a single quick action
 */
router.get('/:id', async (req, res) => {
  try {
    const userId = req.headers.authorization?.replace('Bearer ', '') || 'anonymous';
    const { id } = req.params;

    if (supabase) {
      const { data, error } = await supabase
        .from('quick_actions')
        .select('*')
        .eq('id', id)
        .eq('user_id', userId)
        .single();

      if (error) throw error;
      if (!data) return res.status(404).json({ error: 'Quick action not found' });

      return res.json(data);
    } else {
      const userActions = inMemoryQuickActions.get(userId) || [];
      const action = userActions.find(a => a.id === id);
      if (!action) return res.status(404).json({ error: 'Quick action not found' });
      return res.json(action);
    }
  } catch (error) {
    console.error('Error fetching quick action:', error);
    res.status(500).json({ error: 'Failed to fetch quick action' });
  }
});

/**
 * POST /api/quick-actions
 * Create a new quick action
 */
router.post('/', async (req, res) => {
  try {
    const userId = req.headers.authorization?.replace('Bearer ', '') || 'anonymous';
    const { title, description, system_prompt, tools_used, category } = req.body;

    if (!title || !system_prompt) {
      return res.status(400).json({ error: 'Title and system_prompt are required' });
    }

    const quickAction = {
      id: `qa_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      user_id: userId,
      title,
      description: description || '',
      system_prompt,
      tools_used: tools_used || [],
      category: CATEGORIES.includes(category) ? category : 'operations',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (supabase) {
      const { data, error } = await supabase
        .from('quick_actions')
        .insert(quickAction)
        .select()
        .single();

      if (error) throw error;
      return res.status(201).json(data);
    } else {
      // In-memory fallback
      const userActions = inMemoryQuickActions.get(userId) || [];
      userActions.unshift(quickAction);
      inMemoryQuickActions.set(userId, userActions);
      return res.status(201).json(quickAction);
    }
  } catch (error) {
    console.error('Error creating quick action:', error);
    res.status(500).json({ error: 'Failed to create quick action' });
  }
});

/**
 * PUT /api/quick-actions/:id
 * Update a quick action
 */
router.put('/:id', async (req, res) => {
  try {
    const userId = req.headers.authorization?.replace('Bearer ', '') || 'anonymous';
    const { id } = req.params;
    const { title, description, system_prompt, tools_used, category } = req.body;

    const updates = { updated_at: new Date().toISOString() };
    if (title) updates.title = title;
    if (description !== undefined) updates.description = description;
    if (system_prompt) updates.system_prompt = system_prompt;
    if (tools_used) updates.tools_used = tools_used;
    if (category && CATEGORIES.includes(category)) updates.category = category;

    if (supabase) {
      const { data, error } = await supabase
        .from('quick_actions')
        .update(updates)
        .eq('id', id)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) throw error;
      if (!data) return res.status(404).json({ error: 'Quick action not found' });

      return res.json(data);
    } else {
      const userActions = inMemoryQuickActions.get(userId) || [];
      const index = userActions.findIndex(a => a.id === id);
      if (index === -1) return res.status(404).json({ error: 'Quick action not found' });

      userActions[index] = { ...userActions[index], ...updates };
      return res.json(userActions[index]);
    }
  } catch (error) {
    console.error('Error updating quick action:', error);
    res.status(500).json({ error: 'Failed to update quick action' });
  }
});

/**
 * DELETE /api/quick-actions/:id
 * Delete a quick action
 */
router.delete('/:id', async (req, res) => {
  try {
    const userId = req.headers.authorization?.replace('Bearer ', '') || 'anonymous';
    const { id } = req.params;

    if (supabase) {
      const { error } = await supabase
        .from('quick_actions')
        .delete()
        .eq('id', id)
        .eq('user_id', userId);

      if (error) throw error;
      return res.json({ success: true, id });
    } else {
      const userActions = inMemoryQuickActions.get(userId) || [];
      const filtered = userActions.filter(a => a.id !== id);
      inMemoryQuickActions.set(userId, filtered);
      return res.json({ success: true, id });
    }
  } catch (error) {
    console.error('Error deleting quick action:', error);
    res.status(500).json({ error: 'Failed to delete quick action' });
  }
});

/**
 * POST /api/quick-actions/extract
 * Extract a quick action from a chat thread using AI
 */
router.post('/extract', async (req, res) => {
  try {
    const userId = req.headers.authorization?.replace('Bearer ', '') || 'anonymous';
    const { messages, tools_used } = req.body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'Messages array is required' });
    }

    // Build a condensed version of the conversation
    const conversationSummary = messages
      .filter(m => m.role === 'user' || m.role === 'assistant')
      .map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content?.substring(0, 500) || ''}`)
      .join('\n\n');

    // Extract the "golden prompt" - the essential instructions
    // For now, we'll use the first user message as the base prompt
    const firstUserMessage = messages.find(m => m.role === 'user');
    const goldenPrompt = firstUserMessage?.content || '';

    // Generate title and description from the conversation
    // In a real implementation, this would call the AI to generate these
    const title = goldenPrompt.split('\n')[0].substring(0, 50) || 'New Quick Action';
    const description = goldenPrompt.substring(0, 200);

    // Detect category based on tools used
    let category = 'operations';
    const toolsLower = (tools_used || []).map(t => t.toLowerCase());
    if (toolsLower.some(t => t.includes('gmail') || t.includes('slack') || t.includes('email'))) {
      category = 'comms';
    } else if (toolsLower.some(t => t.includes('calendar') || t.includes('asana') || t.includes('clickup'))) {
      category = 'admin';
    } else if (toolsLower.some(t => t.includes('linkedin') || t.includes('hubspot') || t.includes('sales'))) {
      category = 'growth';
    } else if (toolsLower.some(t => t.includes('analytics') || t.includes('report') || t.includes('data'))) {
      category = 'insights';
    }

    // Return the extracted quick action (not saved yet - user will confirm)
    res.json({
      title,
      description,
      system_prompt: goldenPrompt,
      tools_used: tools_used || [],
      category,
      conversation_summary: conversationSummary.substring(0, 1000),
    });
  } catch (error) {
    console.error('Error extracting quick action:', error);
    res.status(500).json({ error: 'Failed to extract quick action' });
  }
});

export default router;
