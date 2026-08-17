-- Supabase/PostgreSQL Database Schema for Grant Management
-- Version: 1.0.0
-- Date: 2026-04-30
-- Author: Audrey Evans (MIDNGHTSAPPHIRE)

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- ORGANIZATIONS
-- ============================================================================

CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  legal_name TEXT,
  ein TEXT UNIQUE,
  uei TEXT UNIQUE,
  duns TEXT, -- Legacy, but some systems still use it
  
  -- Contact information
  primary_contact_name TEXT,
  primary_contact_email TEXT,
  primary_contact_phone TEXT,
  address_line1 TEXT,
  address_line2 TEXT,
  city TEXT,
  state TEXT,
  zip_code TEXT,
  country TEXT DEFAULT 'USA',
  
  -- SAM.gov integration
  sam_status TEXT CHECK (sam_status IN ('active', 'inactive', 'expired', 'unknown')),
  sam_expiration_date DATE,
  sam_last_checked TIMESTAMPTZ,
  has_delinquent_federal_debt BOOLEAN DEFAULT FALSE,
  
  -- Organization details
  organization_type TEXT, -- nonprofit, for-profit, government, educational
  mission_statement TEXT,
  focus_areas TEXT[],
  annual_budget DECIMAL,
  staff_count INTEGER,
  founded_year INTEGER,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID,
  updated_by UUID
);

CREATE INDEX idx_organizations_uei ON organizations(uei);
CREATE INDEX idx_organizations_sam_status ON organizations(sam_status);

-- ============================================================================
-- FUNDING SOURCES
-- ============================================================================

CREATE TABLE funding_sources (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  type TEXT CHECK (type IN ('federal', 'state', 'foundation', 'corporate', 'other')),
  
  -- Contact information
  website TEXT,
  contact_name TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  address TEXT,
  
  -- Funder details
  typical_award_min DECIMAL,
  typical_award_max DECIMAL,
  funding_priorities TEXT[],
  geographic_focus TEXT[],
  eligible_entity_types TEXT[],
  
  -- Metadata
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_funding_sources_type ON funding_sources(type);

-- ============================================================================
-- GRANT OPPORTUNITIES
-- ============================================================================

CREATE TABLE grant_opportunities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  external_id TEXT UNIQUE, -- ID from Instrumentl, Grants.gov, etc.
  source TEXT NOT NULL, -- 'instrumentl', 'grants.gov', 'foundation', 'manual'
  
  funding_source_id UUID REFERENCES funding_sources(id) ON DELETE SET NULL,
  
  -- Basic information
  title TEXT NOT NULL,
  description TEXT,
  program_name TEXT,
  cfda_number TEXT, -- Catalog of Federal Domestic Assistance
  
  -- Funding details
  amount_min DECIMAL,
  amount_max DECIMAL,
  total_funding_available DECIMAL,
  expected_awards INTEGER,
  
  -- Dates
  posted_date DATE,
  deadline DATE NOT NULL,
  award_date DATE,
  project_start_date DATE,
  project_end_date DATE,
  
  -- Eligibility
  eligibility_requirements TEXT[],
  geographic_restrictions TEXT[],
  
  -- Requirements
  match_required BOOLEAN DEFAULT FALSE,
  match_percentage DECIMAL,
  indirect_costs_allowed BOOLEAN DEFAULT TRUE,
  max_indirect_rate DECIMAL,
  
  -- RFP details
  rfp_url TEXT,
  rfp_requirements JSONB, -- Structured requirements
  evaluation_criteria JSONB, -- How proposals are scored
  page_limits JSONB, -- Word/page limits per section
  
  -- Discovery metadata
  discovered_date DATE DEFAULT CURRENT_DATE,
  discovered_by TEXT, -- 'automated', 'manual', user_id
  fit_score INTEGER CHECK (fit_score >= 0 AND fit_score <= 100),
  fit_reasoning TEXT,
  
  -- Status
  status TEXT DEFAULT 'discovered' CHECK (status IN (
    'discovered',
    'reviewing',
    'go_decision',
    'no_go_decision',
    'applying',
    'submitted',
    'awarded',
    'declined',
    'expired'
  )),
  
  -- Metadata
  notes TEXT,
  tags TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_opportunities_deadline ON grant_opportunities(deadline);
CREATE INDEX idx_opportunities_status ON grant_opportunities(status);
CREATE INDEX idx_opportunities_fit_score ON grant_opportunities(fit_score);
CREATE INDEX idx_opportunities_source ON grant_opportunities(source);

-- ============================================================================
-- APPLICATIONS
-- ============================================================================

CREATE TABLE applications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  opportunity_id UUID REFERENCES grant_opportunities(id) ON DELETE RESTRICT,
  organization_id UUID REFERENCES organizations(id) ON DELETE RESTRICT,
  
  -- Application details
  internal_project_name TEXT,
  amount_requested DECIMAL NOT NULL,
  amount_awarded DECIMAL,
  match_amount DECIMAL,
  
  -- Team
  lead_writer_id UUID,
  project_director_name TEXT,
  project_director_email TEXT,
  team_members JSONB, -- Array of {name, role, email}
  
  -- Dates
  application_started DATE DEFAULT CURRENT_DATE,
  submission_deadline DATE NOT NULL,
  submitted_date DATE,
  decision_date DATE,
  project_start_date DATE,
  project_end_date DATE,
  
  -- Status tracking
  status TEXT DEFAULT 'drafting' CHECK (status IN (
    'drafting',
    'internal_review',
    'revising',
    'ready_to_submit',
    'submitted',
    'under_review',
    'awarded',
    'declined',
    'withdrawn'
  )),
  
  -- Proposal metadata
  proposal_version INTEGER DEFAULT 1,
  total_word_count INTEGER,
  ai_generated_percentage DECIMAL,
  quality_score DECIMAL CHECK (quality_score >= 0 AND quality_score <= 100),
  
  -- Submission
  submission_method TEXT, -- 'api', 'portal', 'email', 'mail'
  confirmation_number TEXT,
  submission_documents JSONB, -- URLs/paths to submitted files
  
  -- Decision
  reviewer_comments TEXT,
  score_received DECIMAL,
  strengths TEXT[],
  weaknesses TEXT[],
  
  -- Metadata
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_applications_status ON applications(status);
CREATE INDEX idx_applications_opportunity ON applications(opportunity_id);
CREATE INDEX idx_applications_org ON applications(organization_id);
CREATE INDEX idx_applications_deadline ON applications(submission_deadline);

-- ============================================================================
-- PROPOSAL SECTIONS
-- ============================================================================

CREATE TABLE proposal_sections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  application_id UUID REFERENCES applications(id) ON DELETE CASCADE,
  
  -- Section details
  section_name TEXT NOT NULL,
  section_order INTEGER,
  content TEXT,
  
  -- Limits
  word_count INTEGER,
  word_limit INTEGER,
  page_limit INTEGER,
  
  -- Generation metadata
  generated_by TEXT CHECK (generated_by IN ('ai', 'human', 'hybrid')),
  model_used TEXT, -- e.g., 'claude-sonnet-4.5'
  prompt_used TEXT, -- Store the prompt for reproducibility
  generation_date TIMESTAMPTZ,
  
  -- Review
  version INTEGER DEFAULT 1,
  reviewed BOOLEAN DEFAULT FALSE,
  reviewer_id UUID,
  reviewer_notes TEXT,
  approved BOOLEAN DEFAULT FALSE,
  approved_date TIMESTAMPTZ,
  
  -- Quality checks
  plagiarism_checked BOOLEAN DEFAULT FALSE,
  plagiarism_score DECIMAL,
  requirement_compliance JSONB, -- Checklist of requirements met
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_sections_application ON proposal_sections(application_id);
CREATE INDEX idx_sections_reviewed ON proposal_sections(reviewed);

-- ============================================================================
-- MILESTONES & DELIVERABLES
-- ============================================================================

CREATE TABLE milestones (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  application_id UUID REFERENCES applications(id) ON DELETE CASCADE,
  
  -- Milestone details
  name TEXT NOT NULL,
  description TEXT,
  milestone_type TEXT, -- 'deliverable', 'report', 'meeting', 'payment'
  
  -- Dates
  due_date DATE NOT NULL,
  completed_date DATE,
  
  -- Status
  status TEXT DEFAULT 'pending' CHECK (status IN (
    'pending',
    'in_progress',
    'completed',
    'overdue',
    'waived'
  )),
  
  -- Completion
  deliverable_url TEXT,
  deliverable_description TEXT,
  approved_by_funder BOOLEAN DEFAULT FALSE,
  
  -- Notifications
  reminder_sent BOOLEAN DEFAULT FALSE,
  escalation_sent BOOLEAN DEFAULT FALSE,
  
  -- Metadata
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_milestones_application ON milestones(application_id);
CREATE INDEX idx_milestones_due_date ON milestones(due_date);
CREATE INDEX idx_milestones_status ON milestones(status);

-- ============================================================================
-- EXPENSES
-- ============================================================================

CREATE TABLE expenses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  application_id UUID REFERENCES applications(id) ON DELETE CASCADE,
  
  -- Expense details
  expense_date DATE NOT NULL,
  category TEXT NOT NULL, -- 'personnel', 'supplies', 'travel', 'equipment', 'other'
  subcategory TEXT,
  description TEXT NOT NULL,
  
  -- Amount
  amount DECIMAL NOT NULL CHECK (amount >= 0),
  currency TEXT DEFAULT 'USD',
  
  -- Budget tracking
  budget_line_item TEXT,
  budgeted_amount DECIMAL,
  variance DECIMAL GENERATED ALWAYS AS (amount - COALESCE(budgeted_amount, 0)) STORED,
  
  -- Documentation
  receipt_url TEXT,
  invoice_number TEXT,
  vendor_name TEXT,
  
  -- Approval
  approved BOOLEAN DEFAULT FALSE,
  approved_by UUID,
  approved_date TIMESTAMPTZ,
  
  -- Grant compliance
  allowable BOOLEAN DEFAULT TRUE,
  allocable BOOLEAN DEFAULT TRUE,
  reasonable BOOLEAN DEFAULT TRUE,
  
  -- Metadata
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_expenses_application ON expenses(application_id);
CREATE INDEX idx_expenses_date ON expenses(expense_date);
CREATE INDEX idx_expenses_category ON expenses(category);
CREATE INDEX idx_expenses_approved ON expenses(approved);

-- ============================================================================
-- COMPLIANCE REPORTS
-- ============================================================================

CREATE TABLE compliance_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  application_id UUID REFERENCES applications(id) ON DELETE CASCADE,
  
  -- Report details
  report_type TEXT NOT NULL CHECK (report_type IN (
    'interim',
    'quarterly',
    'annual',
    'final',
    'financial'
  )),
  reporting_period_start DATE NOT NULL,
  reporting_period_end DATE NOT NULL,
  
  -- Dates
  due_date DATE NOT NULL,
  submission_date DATE,
  
  -- Status
  status TEXT DEFAULT 'pending' CHECK (status IN (
    'pending',
    'in_progress',
    'internal_review',
    'ready_to_submit',
    'submitted',
    'approved',
    'revisions_requested'
  )),
  
  -- Content
  narrative TEXT,
  outcomes_achieved JSONB,
  metrics JSONB,
  budget_summary JSONB,
  
  -- Documents
  document_url TEXT,
  supporting_documents JSONB, -- Array of URLs
  
  -- Funder response
  funder_approved BOOLEAN,
  funder_comments TEXT,
  revisions_required TEXT,
  
  -- Metadata
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_reports_application ON compliance_reports(application_id);
CREATE INDEX idx_reports_due_date ON compliance_reports(due_date);
CREATE INDEX idx_reports_status ON compliance_reports(status);

-- ============================================================================
-- AUDIT LOG
-- ============================================================================

CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Record details
  table_name TEXT NOT NULL,
  record_id UUID NOT NULL,
  
  -- Action
  action TEXT NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
  old_values JSONB,
  new_values JSONB,
  
  -- User
  user_id UUID,
  user_email TEXT,
  
  -- Context
  ip_address INET,
  user_agent TEXT,
  
  -- Timestamp
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_table_record ON audit_log(table_name, record_id);
CREATE INDEX idx_audit_created ON audit_log(created_at);
CREATE INDEX idx_audit_user ON audit_log(user_id);

-- ============================================================================
-- AUDIT TRIGGER FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION audit_trigger_func()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO audit_log (
    table_name,
    record_id,
    action,
    old_values,
    new_values,
    user_id,
    user_email
  ) VALUES (
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    TG_OP,
    CASE 
      WHEN TG_OP = 'DELETE' THEN row_to_json(OLD)::jsonb
      WHEN TG_OP = 'UPDATE' THEN row_to_json(OLD)::jsonb
      ELSE NULL
    END,
    CASE 
      WHEN TG_OP IN ('INSERT', 'UPDATE') THEN row_to_json(NEW)::jsonb
      ELSE NULL
    END,
    current_setting('app.user_id', true)::UUID,
    current_setting('app.user_email', true)
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply audit triggers to key tables
CREATE TRIGGER applications_audit
  AFTER INSERT OR UPDATE OR DELETE ON applications
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

CREATE TRIGGER opportunities_audit
  AFTER INSERT OR UPDATE OR DELETE ON grant_opportunities
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

CREATE TRIGGER expenses_audit
  AFTER INSERT OR UPDATE OR DELETE ON expenses
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

-- ============================================================================
-- UPDATED_AT TRIGGER FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
CREATE TRIGGER organizations_updated_at
  BEFORE UPDATE ON organizations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER opportunities_updated_at
  BEFORE UPDATE ON grant_opportunities
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER applications_updated_at
  BEFORE UPDATE ON applications
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER sections_updated_at
  BEFORE UPDATE ON proposal_sections
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER milestones_updated_at
  BEFORE UPDATE ON milestones
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER expenses_updated_at
  BEFORE UPDATE ON expenses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER reports_updated_at
  BEFORE UPDATE ON compliance_reports
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- ROW-LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE grant_opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE proposal_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_reports ENABLE ROW LEVEL SECURITY;

-- Example RLS policies (customize based on your auth system)
-- Allow users to see their organization's data

CREATE POLICY org_isolation_opportunities ON grant_opportunities
  FOR ALL
  USING (true); -- Public grant opportunities

CREATE POLICY org_isolation_applications ON applications
  FOR ALL
  USING (
    organization_id IN (
      SELECT id FROM organizations
      WHERE id = current_setting('app.organization_id', true)::UUID
    )
  );

-- ============================================================================
-- VIEWS FOR REPORTING
-- ============================================================================

-- Active applications dashboard
CREATE VIEW active_applications AS
SELECT 
  a.id,
  a.internal_project_name,
  o.title AS opportunity_title,
  fs.name AS funder_name,
  a.amount_requested,
  a.submission_deadline,
  a.status,
  a.quality_score,
  COUNT(DISTINCT ps.id) AS sections_count,
  COUNT(DISTINCT ps.id) FILTER (WHERE ps.approved) AS sections_approved,
  org.name AS organization_name
FROM applications a
JOIN grant_opportunities o ON a.opportunity_id = o.id
LEFT JOIN funding_sources fs ON o.funding_source_id = fs.id
LEFT JOIN proposal_sections ps ON a.id = ps.application_id
JOIN organizations org ON a.organization_id = org.id
WHERE a.status IN ('drafting', 'internal_review', 'revising', 'ready_to_submit', 'submitted', 'under_review')
GROUP BY a.id, o.title, fs.name, org.name;

-- Upcoming deadlines
CREATE VIEW upcoming_deadlines AS
SELECT 
  'application' AS type,
  a.id AS record_id,
  a.internal_project_name AS name,
  a.submission_deadline AS deadline,
  a.status,
  EXTRACT(DAY FROM (a.submission_deadline - CURRENT_DATE)) AS days_until_due
FROM applications a
WHERE a.submission_deadline >= CURRENT_DATE
  AND a.status NOT IN ('submitted', 'awarded', 'declined', 'withdrawn')
UNION ALL
SELECT 
  'milestone' AS type,
  m.id AS record_id,
  m.name,
  m.due_date AS deadline,
  m.status,
  EXTRACT(DAY FROM (m.due_date - CURRENT_DATE)) AS days_until_due
FROM milestones m
WHERE m.due_date >= CURRENT_DATE
  AND m.status NOT IN ('completed', 'waived')
UNION ALL
SELECT 
  'report' AS type,
  cr.id AS record_id,
  cr.report_type AS name,
  cr.due_date AS deadline,
  cr.status,
  EXTRACT(DAY FROM (cr.due_date - CURRENT_DATE)) AS days_until_due
FROM compliance_reports cr
WHERE cr.due_date >= CURRENT_DATE
  AND cr.status NOT IN ('submitted', 'approved')
ORDER BY deadline;

-- Budget summary per application
CREATE VIEW budget_summary AS
SELECT 
  a.id AS application_id,
  a.internal_project_name,
  a.amount_awarded,
  SUM(e.amount) AS total_spent,
  a.amount_awarded - COALESCE(SUM(e.amount), 0) AS remaining_budget,
  CASE 
    WHEN a.amount_awarded > 0 
    THEN (SUM(e.amount) / a.amount_awarded * 100)
    ELSE 0
  END AS budget_utilization_percentage
FROM applications a
LEFT JOIN expenses e ON a.id = e.application_id AND e.approved = true
WHERE a.status = 'awarded'
GROUP BY a.id, a.internal_project_name, a.amount_awarded;

-- ============================================================================
-- SAMPLE DATA FUNCTIONS
-- ============================================================================

-- Function to check SAM.gov status (placeholder - integrate with actual API)
CREATE OR REPLACE FUNCTION check_sam_status(org_uei TEXT)
RETURNS TABLE (
  status TEXT,
  expiration_date DATE,
  has_debt BOOLEAN
) AS $$
BEGIN
  -- This would call SAM.gov API in production
  -- For now, return sample data
  RETURN QUERY SELECT 
    'active'::TEXT,
    (CURRENT_DATE + INTERVAL '180 days')::DATE,
    false;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate fit score (customize based on your criteria)
CREATE OR REPLACE FUNCTION calculate_fit_score(
  p_opportunity_id UUID,
  p_organization_id UUID
) RETURNS INTEGER AS $$
DECLARE
  v_score INTEGER := 0;
  v_org organizations%ROWTYPE;
  v_opp grant_opportunities%ROWTYPE;
BEGIN
  SELECT * INTO v_org FROM organizations WHERE id = p_organization_id;
  SELECT * INTO v_opp FROM grant_opportunities WHERE id = p_opportunity_id;
  
  -- Award size match (25 points)
  IF v_org.annual_budget * 0.1 <= v_opp.amount_max 
     AND v_org.annual_budget * 0.5 >= v_opp.amount_min THEN
    v_score := v_score + 25;
  END IF;
  
  -- Focus area match (50 points)
  IF v_org.focus_areas && v_opp.eligibility_requirements THEN
    v_score := v_score + 50;
  END IF;
  
  -- Organization type match (25 points)
  IF v_org.organization_type = ANY(v_opp.eligibility_requirements) THEN
    v_score := v_score + 25;
  END IF;
  
  RETURN LEAST(v_score, 100);
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE organizations IS 'Organizations applying for grants';
COMMENT ON TABLE funding_sources IS 'Grant funders (federal agencies, foundations, etc.)';
COMMENT ON TABLE grant_opportunities IS 'Available grant opportunities discovered from various sources';
COMMENT ON TABLE applications IS 'Grant applications submitted by organizations';
COMMENT ON TABLE proposal_sections IS 'Individual sections of grant proposals with version control';
COMMENT ON TABLE milestones IS 'Project milestones and deliverables for awarded grants';
COMMENT ON TABLE expenses IS 'Budget tracking and expense documentation';
COMMENT ON TABLE compliance_reports IS 'Required reports to funders';
COMMENT ON TABLE audit_log IS 'Complete audit trail of all data changes';

-- ============================================================================
-- END OF SCHEMA
-- ============================================================================
