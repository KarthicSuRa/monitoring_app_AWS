-- =============================================================
--  FINAL & COMPLETE SCHEMA FOR AWS MIGRATION (v9)
--  Replaced OneSignal with native AWS SNS.
--  Added push_subscriptions table.
--  Removed onesignal_player_id from user_notification_preferences.
-- =============================================================

-- Ensure required extensions are enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================
--  HELPER FUNCTIONS
-- =============================================================

-- Trigger function to automatically set the 'updated_at' timestamp on row update
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =============================================================
--  USER, TEAM, AND ROLE MANAGEMENT
-- =============================================================

CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY, -- This will store the Cognito User Sub
    full_name TEXT,
    email TEXT NOT NULL UNIQUE,
    app_role TEXT NOT NULL DEFAULT 'member',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.teams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    created_by UUID NOT NULL REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.team_members (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    team_role TEXT NOT NULL DEFAULT 'member', -- e.g., 'member', 'admin'
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(team_id, user_id)
);

-- =============================================================
--  MONITORING & SYNTHETICS
-- =============================================================

CREATE TABLE IF NOT EXISTS public.monitored_sites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    url TEXT NOT NULL UNIQUE,
    country TEXT,
    latitude DECIMAL(10,7),
    longitude DECIMAL(10,7),
    is_paused BOOLEAN DEFAULT FALSE,
    status TEXT NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.ping_logs (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    site_id UUID NOT NULL REFERENCES public.monitored_sites(id) ON DELETE CASCADE,
    is_up BOOLEAN NOT NULL,
    response_time_ms INTEGER,
    status_code INTEGER,
    status_text TEXT,
    error_message TEXT,
    location TEXT, -- Added for multi-location checks
    checked_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.synthetic_tests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    site_id UUID NOT NULL REFERENCES public.monitored_sites(id) ON DELETE CASCADE,
    status TEXT NOT NULL, -- 'success' or 'failed'
    error_message TEXT,
    total_duration_ms INTEGER NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.synthetic_test_steps (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    test_id UUID NOT NULL REFERENCES public.synthetic_tests(id) ON DELETE CASCADE,
    step_name TEXT NOT NULL,
    status TEXT NOT NULL, -- 'success' or 'failed'
    duration_ms INTEGER NOT NULL,
    error_message TEXT, -- For storing the error of a specific failed step
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.alert_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    site_id UUID NOT NULL REFERENCES public.monitored_sites(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT NOT NULL, -- e.g., 'response_time', 'status_code'
    threshold_value INTEGER NOT NULL,
    comparison_operator TEXT NOT NULL, -- e.g., '>', '<', '='
    duration_minutes INTEGER NOT NULL,
    is_enabled BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.maintenance_windows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    site_id UUID NOT NULL REFERENCES public.monitored_sites(id) ON DELETE CASCADE,
    name TEXT,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.ssl_certificates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    site_id UUID NOT NULL REFERENCES public.monitored_sites(id) ON DELETE CASCADE,
    issuer TEXT,
    subject TEXT,
    valid_from TIMESTAMPTZ,
    valid_to TIMESTAMPTZ NOT NULL,
    last_checked_at TIMESTAMPTZ,
    is_valid BOOLEAN,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.heartbeat_checks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    expected_interval_minutes INTEGER NOT NULL,
    last_ping_at TIMESTAMPTZ,
    is_healthy BOOLEAN,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);


-- =============================================================
--  RAW & NORMALIZED ORDER DATA
-- =============================================================

CREATE TABLE IF NOT EXISTS public.sfcc_orders (
    order_no      TEXT NOT NULL,
    realm_key     TEXT NOT NULL,
    site_id       TEXT,
    status        TEXT,
    creation_date TIMESTAMPTZ,
    last_modified TIMESTAMPTZ NOT NULL,
    data          JSONB NOT NULL,
    created_at    TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at    TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    PRIMARY KEY (order_no, realm_key)
);

CREATE TABLE IF NOT EXISTS public.som_orders (
    order_number        TEXT PRIMARY KEY,
    last_modified_date  TIMESTAMPTZ NOT NULL,
    data                JSONB NOT NULL,
    created_at          TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at          TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.orders (
    order_no            TEXT NOT NULL,
    source_system       TEXT NOT NULL,
    order_status        TEXT NOT NULL,
    fulfillment_status  TEXT,
    order_total         NUMERIC(12,2) NOT NULL,
    currency            CHAR(3) NOT NULL,
    country             CHAR(2),
    creation_date       TIMESTAMPTZ NOT NULL,
    last_modified       TIMESTAMPTZ NOT NULL,
    last_updated_at     TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    PRIMARY KEY (order_no, source_system)
);

CREATE TABLE IF NOT EXISTS public.order_line_items (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_no            TEXT NOT NULL,
    source_system       TEXT NOT NULL,
    sku                 TEXT NOT NULL,
    product_name        TEXT,
    quantity            INTEGER NOT NULL CHECK (quantity > 0),
    unit_price          NUMERIC(12,2),
    total_price         NUMERIC(12,2),
    created_at          TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    FOREIGN KEY (order_no, source_system) REFERENCES public.orders(order_no, source_system) ON DELETE CASCADE,
    UNIQUE (order_no, source_system, sku)
);

-- =============================================================
--  NOTIFICATIONS, WEBHOOKS, AND USER DATA
-- =============================================================

CREATE TABLE IF NOT EXISTS public.topics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.webhook_sources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    source_type TEXT NOT NULL, -- e.g., 'adyen', 'generic'
    topic_id UUID REFERENCES public.topics(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.webhook_events (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    source_id UUID NOT NULL REFERENCES public.webhook_sources(id) ON DELETE CASCADE,
    payload JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    topic_id UUID REFERENCES public.topics(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    message TEXT,
    severity TEXT NOT NULL DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high')),
    status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'acknowledged', 'resolved')),
    type TEXT, -- For 'webhook', 'synthetic', 'manual'
    metadata JSONB, -- For extra data from webhooks
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    notification_id UUID NOT NULL REFERENCES public.notifications(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    text TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.topic_subscriptions (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    topic_id UUID NOT NULL REFERENCES public.topics(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, topic_id)
);

CREATE TABLE IF NOT EXISTS public.user_notification_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE NOT NULL,
    email_notifications BOOLEAN DEFAULT true,
    push_notifications BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.push_subscriptions (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    token TEXT NOT NULL UNIQUE,
    endpoint_arn TEXT NOT NULL,
    subscription_arn TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================
--  CALENDAR, AUDIT LOGS, AND EMAILS
-- =============================================================

CREATE TABLE IF NOT EXISTS public.calendar_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ,
    description TEXT,
    category TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.audit_logs (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id UUID,
    action TEXT NOT NULL,
    target_resource TEXT,
    details JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.emails (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipient TEXT NOT NULL,
    subject TEXT NOT NULL,
    body TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    source TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================
--  WEBSOCKET CONNECTIONS
-- =============================================================

CREATE TABLE IF NOT EXISTS public.websocket_connections (
    connection_id TEXT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================
--  INDEXES
-- =============================================================

CREATE INDEX IF NOT EXISTS idx_ping_logs_site_id_checked_at ON public.ping_logs(site_id, checked_at DESC);
CREATE INDEX IF NOT EXISTS idx_synthetic_tests_site_id_created_at ON public.synthetic_tests(site_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_synthetic_test_steps_test_id ON public.synthetic_test_steps(test_id);
CREATE INDEX IF NOT EXISTS idx_sfcc_orders_realm_last_modified ON public.sfcc_orders(realm_key, last_modified DESC);
CREATE INDEX IF NOT EXISTS idx_orders_last_modified ON public.orders(last_modified);
CREATE INDEX IF NOT EXISTS idx_webhook_events_source_id ON public.webhook_events(source_id);
CREATE INDEX IF NOT EXISTS idx_notifications_topic_id ON public.notifications(topic_id);
CREATE INDEX IF NOT EXISTS idx_topic_subscriptions_user_id ON public.topic_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_comments_notification_id ON public.comments(notification_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_start_time ON public.calendar_events(start_time);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id_created_at ON public.audit_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_emails_status ON public.emails(status);
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_teams_created_by ON public.teams(created_by);
CREATE INDEX IF NOT EXISTS idx_team_members_user_id ON public.team_members(user_id);
CREATE INDEX IF NOT EXISTS idx_team_members_team_id ON public.team_members(team_id);
CREATE INDEX IF NOT EXISTS idx_topics_team_id ON public.topics(team_id);
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id ON public.push_subscriptions(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_push_subscriptions_token_unique ON public.push_subscriptions(token);

-- New Indexes
CREATE INDEX IF NOT EXISTS idx_alert_rules_site_id ON public.alert_rules(site_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_windows_site_id ON public.maintenance_windows(site_id);
CREATE INDEX IF NOT EXISTS idx_ssl_certificates_site_id ON public.ssl_certificates(site_id);
CREATE INDEX IF NOT EXISTS idx_heartbeat_checks_name ON public.heartbeat_checks(name);
CREATE INDEX IF NOT EXISTS idx_websocket_connections_user_id ON public.websocket_connections(user_id);


-- =============================================================
--  TRIGGERS
-- =============================================================

DROP TRIGGER IF EXISTS handle_monitored_sites_updated_at ON public.monitored_sites;
CREATE TRIGGER handle_monitored_sites_updated_at BEFORE UPDATE ON public.monitored_sites FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trg_sfcc_orders_updated_at ON public.sfcc_orders;
CREATE TRIGGER trg_sfcc_orders_updated_at BEFORE UPDATE ON public.sfcc_orders FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trg_som_orders_updated_at ON public.som_orders;
CREATE TRIGGER trg_som_orders_updated_at BEFORE UPDATE ON public.som_orders FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS handle_webhook_sources_updated_at ON public.webhook_sources;
CREATE TRIGGER handle_webhook_sources_updated_at BEFORE UPDATE ON public.webhook_sources FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS handle_topics_updated_at ON public.topics;
CREATE TRIGGER handle_topics_updated_at BEFORE UPDATE ON public.topics FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS handle_notifications_updated_at ON public.notifications;
CREATE TRIGGER handle_notifications_updated_at BEFORE UPDATE ON public.notifications FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS handle_user_notification_preferences_updated_at ON public.user_notification_preferences;
CREATE TRIGGER handle_user_notification_preferences_updated_at BEFORE UPDATE ON public.user_notification_preferences FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS handle_calendar_events_updated_at ON public.calendar_events;
CREATE TRIGGER handle_calendar_events_updated_at BEFORE UPDATE ON public.calendar_events FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS handle_emails_updated_at ON public.emails;
CREATE TRIGGER handle_emails_updated_at BEFORE UPDATE ON public.emails FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS handle_users_updated_at ON public.users;
CREATE TRIGGER handle_users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS handle_teams_updated_at ON public.teams;
CREATE TRIGGER handle_teams_updated_at BEFORE UPDATE ON public.teams FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- New Triggers
DROP TRIGGER IF EXISTS handle_alert_rules_updated_at ON public.alert_rules;
CREATE TRIGGER handle_alert_rules_updated_at BEFORE UPDATE ON public.alert_rules FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS handle_maintenance_windows_updated_at ON public.maintenance_windows;
CREATE TRIGGER handle_maintenance_windows_updated_at BEFORE UPDATE ON public.maintenance_windows FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS handle_ssl_certificates_updated_at ON public.ssl_certificates;
CREATE TRIGGER handle_ssl_certificates_updated_at BEFORE UPDATE ON public.ssl_certificates FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS handle_heartbeat_checks_updated_at ON public.heartbeat_checks;
CREATE TRIGGER handle_heartbeat_checks_updated_at BEFORE UPDATE ON public.heartbeat_checks FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();


-- =============================================================
--  DEFAULT DATA
-- =============================================================

INSERT INTO public.topics (name, description) VALUES
    ('Server Alerts', 'Critical server monitoring alerts'),
    ('Application Errors', 'Application-level error notifications'),
    ('Security Events', 'Security-related notifications'),
    ('Site Monitoring', 'Alerts from synthetic and ping tests.'),
    ('Adyen Webhooks', 'Notifications from Adyen payment events.'),
    ('Order Sync', 'Events related to SFCC and SOM order synchronization.'),
    ('Synthetic Tests', 'Alerts from synthetic user journey tests.'),
    ('SSL Checks', 'Alerts for SSL certificate expiry.'),
    ('Heartbeat Checks', 'Alerts for missed cron jobs or background tasks.')
ON CONFLICT (name) DO NOTHING;

-- 8. Insert the updated MCM sites data
INSERT INTO public.monitored_sites (name, url, country, latitude, longitude) VALUES
('MCM AU (English)', 'https://au.mcmworldwide.com/en_AU/home', 'AU', -33.8688, 151.2093),
('MCM AT (English)', 'https://at.mcmworldwide.com/en_AT/home', 'AT', 48.2082, 16.3738),
('MCM AT (German)', 'https://at.mcmworldwide.com/de_AT/home', 'AT', 48.2082, 16.3738),
('MCM BE (English)', 'https://be.mcmworldwide.com/en_BE/home', 'BE', 50.8503, 4.3517),
('MCM CA (English)', 'https://ca.mcmworldwide.com/en_CA/home', 'CA', 45.4215, -75.6972),
('MCM CN (Chinese)', 'https://cn.mcmworldwide.com/zh_CN/home', 'CN', 39.9042, 116.4074),
('MCM CN (English)', 'https://cn.mcmworldwide.com/en_CN/home', 'CN', 39.9042, 116.4074),
('MCM CZ (English)', 'https://cz.mcmworldwide.com/en_CZ/home', 'CZ', 50.0755, 14.4378),
('MCM DK (English)', 'https://dk.mcmworldwide.com/en_DK/home', 'DK', 55.6761, 12.5683),
('MCM FI (English)', 'https://fi.mcmworldwide.com/en_FI/home', 'FI', 60.1699, 24.9384),
('MCM FR (English)', 'https://fr.mcmworldwide.com/en_FR/home', 'FR', 48.8566, 2.3522),
('MCM FR (French)', 'https://fr.mcmworldwide.com/fr_FR/home', 'FR', 48.8566, 2.3522),
('MCM DE (English)', 'https://de.mcmworldwide.com/en_DE/home', 'DE', 52.5200, 13.4050),
('MCM DE (German)', 'https://de.mcmworldwide.com/de_DE/home', 'DE', 52.5200, 13.4050),
('MCM GR (English)', 'https://gr.mcmworldwide.com/en_GR/home', 'GR', 37.9755, 23.7348),
('MCM HK (English)', 'https://hk.mcmworldwide.com/en_HK/home', 'HK', 22.3193, 114.1694),
('MCM HK (Chinese)', 'https://hk.mcmworldwide.com/zh_HK/home', 'HK', 22.3193, 114.1694),
('MCM IT (English)', 'https://it.mcmworldwide.com/en_IT/home', 'IT', 41.9028, 12.4964),
('MCM JP (English)', 'https://jp.mcmworldwide.com/en_JP/home', 'JP', 35.6895, 139.6917),
('MCM JP (Japanese)', 'https://jp.mcmworldwide.com/ja_JP/home', 'JP', 35.6895, 139.6917),
('MCM KR (Korean)', 'https://kr.mcmworldwide.com/ko_KR/home', 'KR', 37.5665, 126.9780),
('MCM LU (English)', 'https://lu.mcmworldwide.com/en_LU/home', 'LU', 49.8153, 6.1296),
('MCM MY (English)', 'https://my.mcmworldwide.com/en_MY/home', 'MY', 4.2105, 101.9758),
('MCM NZ (English)', 'https://nz.mcmworldwide.com/en_NZ/home', 'NZ', -40.9006, 174.8860),
('MCM PL (English)', 'https://pl.mcmworldwide.com/en_PL/home', 'PL', 52.2297, 21.0122),
('MCM PT (English)', 'https://pt.mcmworldwide.com/en_PT/home', 'PT', 38.7223, -9.1393),
('MCM SG (English)', 'https://sg.mcmworldwide.com/en_SG/home', 'SG', 1.3521, 103.8198),
('MCM ES (English)', 'https://es.mcmworldwide.com/en_ES/home', 'ES', 40.4168, -3.7038),
('MCM SE (English)', 'https://se.mcmworldwide.com/en_SE/home', 'SE', 59.3293, 18.0686),
('MCM CH (English)', 'https://ch.mcmworldwide.com/en_CH/home', 'CH', 46.8182, 8.2275),
('MCM CH (French)', 'https://ch.mcmworldwide.com/fr_CH/home', 'CH', 46.8182, 8.2275),
('MCM CH (German)', 'https://ch.mcmworldwide.com/de_CH/home', 'CH', 46.8182, 8.2275),
('MCM TW (English)', 'https://tw.mcmworldwide.com/en_TW/home', 'TW', 23.6978, 120.9605),
('MCM TW (Chinese)', 'https://tw.mcmworldwide.com/zh_TW/home', 'TW', 23.6978, 120.9605),
('MCM TH (English)', 'https://th.mcmworldwide.com/en_TH/home', 'TH', 13.7563, 100.5018),
('MCM TH (Thai)', 'https://th.mcmworldwide.com/th_TH/home', 'TH', 13.7563, 100.5018),
('MCM NL (English)', 'https://nl.mcmworldwide.com/en_NL/home', 'NL', 52.3676, 4.9041),
('MCM UK (English)', 'https://uk.mcmworldwide.com/en_GB/home', 'GB', 51.5074, -0.1278),
('MCM US (English)', 'https://us.mcmworldwide.com/en_US/home', 'US', 38.9072, -77.0369)
ON CONFLICT (url) DO NOTHING;
