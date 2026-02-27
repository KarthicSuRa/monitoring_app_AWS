-- =============================================================
--  FINAL & COMPLETE SCHEMA FOR AWS MIGRATION (v7)
-- Added realm_key and other columns to sfcc_orders.
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
    user_id UUID NOT NULL,
    topic_id UUID NOT NULL REFERENCES public.topics(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, topic_id)
);

CREATE TABLE IF NOT EXISTS public.user_notification_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE NOT NULL,
    email_notifications BOOLEAN DEFAULT true,
    push_notifications BOOLEAN DEFAULT true,
    onesignal_player_id TEXT, -- For sending push notifications
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
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

-- =============================================================
--  TRIGGERS
-- =============================================================

DROP TRIGGER IF EXISTS handle_monitored_sites_updated_at ON public.monitored_sites;
CREATE TRIGGER handle_monitored_sites_updated_at BEFORE UPDATE ON public.monitored_sites FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trg_sfcc_orders_updated_at ON public.sfcc_orders;
CREATE TRIGGER trg_sfcc_orders_updated_at BEFORE UPDATE ON public.sfcc_orders FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trg_som_orders_updated_at ON public.som_orders;
CREATE TRIGGER trg_som_orders_updated_at BEFORE UPDATE ON public.som_orders FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS handle_webhook__sources_updated_at ON public.webhook_sources;
CREATE TRIGGER handle_webhook_sources_updated_at BEFORE UPDATE ON public.webhook_sources FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS handle_topics_updated_at ON public.topics;
CREATE TRIGGER handle_topics_updated_at BEFORE UPDATE ON public.topics FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS handle_notifications_updated_at ON public.notifications;
CREATE TRIGGER handle_notifications_updated_at BEFORE UPDATE ON public.notifications FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS handle_user_notification_preferences_updated_at ON public.user_notification_preferences;
CREATE TRIGGER handle_user_notification_preferences_updated_at BEFORE UPDATE ON public.user_notification_preferences FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

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
    ('Synthetic Tests', 'Alerts from synthetic user journey tests.')
ON CONFLICT (name) DO NOTHING;
