-- ============================================================
-- WORKFLOW SYSTEM DATABASE SCHEMA
-- ============================================================
-- Run this script in Supabase SQL Editor to set up workflow tables
-- Prerequisite: setup_supabase.sql must have been run first

-- ============================================================
-- WORKFLOWS TABLE
-- ============================================================

-- Main workflows table
CREATE TABLE IF NOT EXISTS workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,

  -- Basic info
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT DEFAULT '📋',
  color TEXT,

  -- Core content
  golden_instructions TEXT NOT NULL,
  steps JSONB NOT NULL DEFAULT '[]'::jsonb,
  variables JSONB NOT NULL DEFAULT '[]'::jsonb,
  output_config JSONB NOT NULL DEFAULT '{}'::jsonb,

  -- Source
  source_conversation_id TEXT,

  -- Organization
  is_favorite BOOLEAN DEFAULT false,
  folder_id UUID,
  tags TEXT[] DEFAULT '{}',

  -- Status
  status TEXT DEFAULT 'active' CHECK (status IN ('draft', 'active', 'archived')),

  -- Stats
  run_count INTEGER DEFAULT 0,
  average_run_time_ms INTEGER,
  last_run_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add comment
COMMENT ON TABLE workflows IS 'Stores user-created workflows with golden instructions and steps';

-- ============================================================
-- WORKFLOW RUNS TABLE
-- ============================================================

-- Workflow runs (execution history)
CREATE TABLE IF NOT EXISTS workflow_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID REFERENCES workflows(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,

  -- Input
  variables JSONB NOT NULL DEFAULT '{}'::jsonb,

  -- Execution state
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'paused', 'completed', 'failed', 'cancelled')),
  current_step_id TEXT,

  -- Results
  step_results JSONB NOT NULL DEFAULT '[]'::jsonb,
  output TEXT,
  output_format TEXT,

  -- Error info
  error JSONB,

  -- Timing
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  duration_ms INTEGER
);

-- Add comment
COMMENT ON TABLE workflow_runs IS 'Tracks individual workflow executions with results and timing';

-- ============================================================
-- WORKFLOW TEMPLATES TABLE
-- ============================================================

-- Workflow templates (pre-built starters)
CREATE TABLE IF NOT EXISTS workflow_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Info
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT DEFAULT '📋',
  category TEXT,

  -- Template content
  template_data JSONB NOT NULL,

  -- Metadata
  is_featured BOOLEAN DEFAULT false,
  use_count INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add comment
COMMENT ON TABLE workflow_templates IS 'Pre-built workflow templates for quick start';

-- ============================================================
-- WORKFLOW FOLDERS TABLE (optional organization)
-- ============================================================

CREATE TABLE IF NOT EXISTS workflow_folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  parent_id UUID REFERENCES workflow_folders(id) ON DELETE CASCADE,
  color TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add comment
COMMENT ON TABLE workflow_folders IS 'Optional folder organization for workflows';

-- ============================================================
-- INDEXES
-- ============================================================

-- Workflows indexes
CREATE INDEX IF NOT EXISTS idx_workflows_user ON workflows(user_id);
CREATE INDEX IF NOT EXISTS idx_workflows_status ON workflows(status);
CREATE INDEX IF NOT EXISTS idx_workflows_favorite ON workflows(user_id, is_favorite);
CREATE INDEX IF NOT EXISTS idx_workflows_tags ON workflows USING gin(tags);
CREATE INDEX IF NOT EXISTS idx_workflows_folder ON workflows(folder_id);
CREATE INDEX IF NOT EXISTS idx_workflows_updated ON workflows(updated_at DESC);

-- Workflow runs indexes
CREATE INDEX IF NOT EXISTS idx_workflow_runs_workflow ON workflow_runs(workflow_id);
CREATE INDEX IF NOT EXISTS idx_workflow_runs_user ON workflow_runs(user_id);
CREATE INDEX IF NOT EXISTS idx_workflow_runs_status ON workflow_runs(status);
CREATE INDEX IF NOT EXISTS idx_workflow_runs_started ON workflow_runs(started_at DESC);

-- Templates indexes
CREATE INDEX IF NOT EXISTS idx_workflow_templates_category ON workflow_templates(category);
CREATE INDEX IF NOT EXISTS idx_workflow_templates_featured ON workflow_templates(is_featured);

-- Folders indexes
CREATE INDEX IF NOT EXISTS idx_workflow_folders_user ON workflow_folders(user_id);
CREATE INDEX IF NOT EXISTS idx_workflow_folders_parent ON workflow_folders(parent_id);

-- ============================================================
-- FUNCTIONS
-- ============================================================

-- Function to increment run count and update stats
CREATE OR REPLACE FUNCTION increment_workflow_run_count()
RETURNS TRIGGER AS $$
BEGIN
  -- Only trigger when run completes
  IF NEW.status IN ('completed', 'failed') AND OLD.status = 'running' THEN
    UPDATE workflows
    SET
      run_count = run_count + 1,
      last_run_at = NOW(),
      average_run_time_ms = CASE
        WHEN average_run_time_ms IS NULL THEN NEW.duration_ms
        ELSE (average_run_time_ms + COALESCE(NEW.duration_ms, 0)) / 2
      END,
      updated_at = NOW()
    WHERE id = NEW.workflow_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_workflow_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to increment template use count
CREATE OR REPLACE FUNCTION increment_template_use_count(template_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE workflow_templates
  SET use_count = use_count + 1
  WHERE id = template_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- TRIGGERS
-- ============================================================

-- Trigger to update workflow stats on run completion
DROP TRIGGER IF EXISTS trigger_workflow_run_complete ON workflow_runs;
CREATE TRIGGER trigger_workflow_run_complete
  AFTER UPDATE ON workflow_runs
  FOR EACH ROW
  EXECUTE FUNCTION increment_workflow_run_count();

-- Trigger to update updated_at on workflows
DROP TRIGGER IF EXISTS trigger_workflow_updated ON workflows;
CREATE TRIGGER trigger_workflow_updated
  BEFORE UPDATE ON workflows
  FOR EACH ROW
  EXECUTE FUNCTION update_workflow_updated_at();

-- Trigger to update updated_at on folders
DROP TRIGGER IF EXISTS trigger_folder_updated ON workflow_folders;
CREATE TRIGGER trigger_folder_updated
  BEFORE UPDATE ON workflow_folders
  FOR EACH ROW
  EXECUTE FUNCTION update_workflow_updated_at();

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_folders ENABLE ROW LEVEL SECURITY;

-- Workflows policies
CREATE POLICY "Users can view own workflows" ON workflows
  FOR SELECT USING (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

CREATE POLICY "Users can create own workflows" ON workflows
  FOR INSERT WITH CHECK (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

CREATE POLICY "Users can update own workflows" ON workflows
  FOR UPDATE USING (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

CREATE POLICY "Users can delete own workflows" ON workflows
  FOR DELETE USING (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

-- Workflow runs policies
CREATE POLICY "Users can view own runs" ON workflow_runs
  FOR SELECT USING (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

CREATE POLICY "Users can create own runs" ON workflow_runs
  FOR INSERT WITH CHECK (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

CREATE POLICY "Users can update own runs" ON workflow_runs
  FOR UPDATE USING (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

-- Workflow folders policies
CREATE POLICY "Users can view own folders" ON workflow_folders
  FOR SELECT USING (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

CREATE POLICY "Users can create own folders" ON workflow_folders
  FOR INSERT WITH CHECK (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

CREATE POLICY "Users can update own folders" ON workflow_folders
  FOR UPDATE USING (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

CREATE POLICY "Users can delete own folders" ON workflow_folders
  FOR DELETE USING (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

-- Templates are readable by all (public)
CREATE POLICY "Anyone can view templates" ON workflow_templates
  FOR SELECT USING (true);

-- ============================================================
-- SEED DATA: Sample Templates
-- ============================================================

INSERT INTO workflow_templates (name, description, icon, category, template_data, is_featured) VALUES
(
  'Lead Research & Outreach',
  'Research a company and generate personalized outreach emails',
  '🎯',
  'sales',
  '{
    "goldenInstructions": "Research the target company thoroughly, identify key decision makers, and draft personalized outreach emails.",
    "steps": [
      {"name": "Company Research", "tools": ["exa_search", "web_search"]},
      {"name": "Find Decision Makers", "tools": ["linkedin_search"]},
      {"name": "Draft Outreach Emails", "tools": []}
    ],
    "variables": [
      {"key": "company_name", "name": "Company Name", "type": "text", "required": true},
      {"key": "target_role", "name": "Target Role", "type": "select", "options": [
        {"value": "ceo", "label": "CEO"},
        {"value": "cto", "label": "CTO"},
        {"value": "vp_eng", "label": "VP Engineering"},
        {"value": "other", "label": "Other"}
      ]}
    ]
  }'::jsonb,
  true
),
(
  'Content Research & Summarization',
  'Research a topic and create a comprehensive summary',
  '📚',
  'research',
  '{
    "goldenInstructions": "Research the given topic using multiple sources, synthesize findings, and create a well-structured summary.",
    "steps": [
      {"name": "Initial Research", "tools": ["web_search", "exa_search"]},
      {"name": "Deep Dive", "tools": ["firecrawl_scrape"]},
      {"name": "Synthesize & Summarize", "tools": []}
    ],
    "variables": [
      {"key": "topic", "name": "Research Topic", "type": "textarea", "required": true},
      {"key": "depth", "name": "Research Depth", "type": "select", "options": [
        {"value": "quick", "label": "Quick Overview"},
        {"value": "standard", "label": "Standard"},
        {"value": "deep", "label": "Deep Dive"}
      ]}
    ]
  }'::jsonb,
  true
),
(
  'Code Review Assistant',
  'Review code for bugs, security issues, and best practices',
  '🔍',
  'development',
  '{
    "goldenInstructions": "Analyze the provided code for bugs, security vulnerabilities, performance issues, and suggest improvements.",
    "steps": [
      {"name": "Static Analysis", "tools": []},
      {"name": "Security Review", "tools": []},
      {"name": "Recommendations", "tools": []}
    ],
    "variables": [
      {"key": "code", "name": "Code to Review", "type": "textarea", "required": true},
      {"key": "language", "name": "Programming Language", "type": "select", "options": [
        {"value": "javascript", "label": "JavaScript/TypeScript"},
        {"value": "python", "label": "Python"},
        {"value": "go", "label": "Go"},
        {"value": "rust", "label": "Rust"},
        {"value": "other", "label": "Other"}
      ]},
      {"key": "focus", "name": "Review Focus", "type": "multi_select", "options": [
        {"value": "bugs", "label": "Bug Detection"},
        {"value": "security", "label": "Security"},
        {"value": "performance", "label": "Performance"},
        {"value": "style", "label": "Code Style"}
      ]}
    ]
  }'::jsonb,
  true
)
ON CONFLICT DO NOTHING;

-- ============================================================
-- VERIFICATION
-- ============================================================

-- Check that tables were created
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_tables WHERE tablename = 'workflows') THEN
    RAISE EXCEPTION 'Table workflows was not created';
  END IF;
  IF NOT EXISTS (SELECT FROM pg_tables WHERE tablename = 'workflow_runs') THEN
    RAISE EXCEPTION 'Table workflow_runs was not created';
  END IF;
  IF NOT EXISTS (SELECT FROM pg_tables WHERE tablename = 'workflow_templates') THEN
    RAISE EXCEPTION 'Table workflow_templates was not created';
  END IF;
  IF NOT EXISTS (SELECT FROM pg_tables WHERE tablename = 'workflow_folders') THEN
    RAISE EXCEPTION 'Table workflow_folders was not created';
  END IF;
  RAISE NOTICE 'All workflow tables created successfully!';
END $$;
