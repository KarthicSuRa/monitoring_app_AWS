/**
 * dynamo-seed.js
 * Custom Resource Lambda — seeds default topics and all 39 MCM monitored sites
 * into DynamoDB on first deploy (or when seed data changes).
 */
const { batchWrite, TABLES, now, newId } = require('./dynamo-client');

const DEFAULT_TOPICS = [
  { name: 'Server Alerts',      description: 'Critical server monitoring alerts' },
  { name: 'Application Errors', description: 'Application-level error notifications' },
  { name: 'Security Events',    description: 'Security-related notifications' },
  { name: 'Site Monitoring',    description: 'Alerts from synthetic and ping tests.' },
  { name: 'Adyen Webhooks',     description: 'Notifications from Adyen payment events.' },
  { name: 'Order Sync',         description: 'Events related to SFCC and SOM order synchronization.' },
  { name: 'Synthetic Tests',    description: 'Alerts from synthetic user journey tests.' },
  { name: 'SSL Checks',         description: 'Alerts for SSL certificate expiry.' },
  { name: 'Heartbeat Checks',   description: 'Alerts for missed cron jobs or background tasks.' },
];

const MCM_SITES = [
  { name: 'MCM AU (English)', url: 'https://au.mcmworldwide.com/en_AU/home', country: 'AU', latitude: -33.8688, longitude: 151.2093 },
  { name: 'MCM AT (English)', url: 'https://at.mcmworldwide.com/en_AT/home', country: 'AT', latitude: 48.2082, longitude: 16.3738 },
  { name: 'MCM AT (German)',  url: 'https://at.mcmworldwide.com/de_AT/home', country: 'AT', latitude: 48.2082, longitude: 16.3738 },
  { name: 'MCM BE (English)', url: 'https://be.mcmworldwide.com/en_BE/home', country: 'BE', latitude: 50.8503, longitude: 4.3517 },
  { name: 'MCM CA (English)', url: 'https://ca.mcmworldwide.com/en_CA/home', country: 'CA', latitude: 45.4215, longitude: -75.6972 },
  { name: 'MCM CN (Chinese)', url: 'https://cn.mcmworldwide.com/zh_CN/home', country: 'CN', latitude: 39.9042, longitude: 116.4074 },
  { name: 'MCM CN (English)', url: 'https://cn.mcmworldwide.com/en_CN/home', country: 'CN', latitude: 39.9042, longitude: 116.4074 },
  { name: 'MCM CZ (English)', url: 'https://cz.mcmworldwide.com/en_CZ/home', country: 'CZ', latitude: 50.0755, longitude: 14.4378 },
  { name: 'MCM DK (English)', url: 'https://dk.mcmworldwide.com/en_DK/home', country: 'DK', latitude: 55.6761, longitude: 12.5683 },
  { name: 'MCM FI (English)', url: 'https://fi.mcmworldwide.com/en_FI/home', country: 'FI', latitude: 60.1699, longitude: 24.9384 },
  { name: 'MCM FR (English)', url: 'https://fr.mcmworldwide.com/en_FR/home', country: 'FR', latitude: 48.8566, longitude: 2.3522 },
  { name: 'MCM FR (French)',  url: 'https://fr.mcmworldwide.com/fr_FR/home', country: 'FR', latitude: 48.8566, longitude: 2.3522 },
  { name: 'MCM DE (English)', url: 'https://de.mcmworldwide.com/en_DE/home', country: 'DE', latitude: 52.5200, longitude: 13.4050 },
  { name: 'MCM DE (German)',  url: 'https://de.mcmworldwide.com/de_DE/home', country: 'DE', latitude: 52.5200, longitude: 13.4050 },
  { name: 'MCM GR (English)', url: 'https://gr.mcmworldwide.com/en_GR/home', country: 'GR', latitude: 37.9755, longitude: 23.7348 },
  { name: 'MCM HK (English)', url: 'https://hk.mcmworldwide.com/en_HK/home', country: 'HK', latitude: 22.3193, longitude: 114.1694 },
  { name: 'MCM HK (Chinese)', url: 'https://hk.mcmworldwide.com/zh_HK/home', country: 'HK', latitude: 22.3193, longitude: 114.1694 },
  { name: 'MCM IT (English)', url: 'https://it.mcmworldwide.com/en_IT/home', country: 'IT', latitude: 41.9028, longitude: 12.4964 },
  { name: 'MCM JP (English)', url: 'https://jp.mcmworldwide.com/en_JP/home', country: 'JP', latitude: 35.6895, longitude: 139.6917 },
  { name: 'MCM JP (Japanese)',url: 'https://jp.mcmworldwide.com/ja_JP/home', country: 'JP', latitude: 35.6895, longitude: 139.6917 },
  { name: 'MCM KR (Korean)',  url: 'https://kr.mcmworldwide.com/ko_KR/home', country: 'KR', latitude: 37.5665, longitude: 126.9780 },
  { name: 'MCM LU (English)', url: 'https://lu.mcmworldwide.com/en_LU/home', country: 'LU', latitude: 49.8153, longitude: 6.1296 },
  { name: 'MCM MY (English)', url: 'https://my.mcmworldwide.com/en_MY/home', country: 'MY', latitude: 4.2105, longitude: 101.9758 },
  { name: 'MCM NZ (English)', url: 'https://nz.mcmworldwide.com/en_NZ/home', country: 'NZ', latitude: -40.9006, longitude: 174.8860 },
  { name: 'MCM PL (English)', url: 'https://pl.mcmworldwide.com/en_PL/home', country: 'PL', latitude: 52.2297, longitude: 21.0122 },
  { name: 'MCM PT (English)', url: 'https://pt.mcmworldwide.com/en_PT/home', country: 'PT', latitude: 38.7223, longitude: -9.1393 },
  { name: 'MCM SG (English)', url: 'https://sg.mcmworldwide.com/en_SG/home', country: 'SG', latitude: 1.3521, longitude: 103.8198 },
  { name: 'MCM ES (English)', url: 'https://es.mcmworldwide.com/en_ES/home', country: 'ES', latitude: 40.4168, longitude: -3.7038 },
  { name: 'MCM SE (English)', url: 'https://se.mcmworldwide.com/en_SE/home', country: 'SE', latitude: 59.3293, longitude: 18.0686 },
  { name: 'MCM CH (English)', url: 'https://ch.mcmworldwide.com/en_CH/home', country: 'CH', latitude: 46.8182, longitude: 8.2275 },
  { name: 'MCM CH (French)',  url: 'https://ch.mcmworldwide.com/fr_CH/home', country: 'CH', latitude: 46.8182, longitude: 8.2275 },
  { name: 'MCM CH (German)',  url: 'https://ch.mcmworldwide.com/de_CH/home', country: 'CH', latitude: 46.8182, longitude: 8.2275 },
  { name: 'MCM TW (English)', url: 'https://tw.mcmworldwide.com/en_TW/home', country: 'TW', latitude: 23.6978, longitude: 120.9605 },
  { name: 'MCM TW (Chinese)', url: 'https://tw.mcmworldwide.com/zh_TW/home', country: 'TW', latitude: 23.6978, longitude: 120.9605 },
  { name: 'MCM TH (English)', url: 'https://th.mcmworldwide.com/en_TH/home', country: 'TH', latitude: 13.7563, longitude: 100.5018 },
  { name: 'MCM TH (Thai)',    url: 'https://th.mcmworldwide.com/th_TH/home', country: 'TH', latitude: 13.7563, longitude: 100.5018 },
  { name: 'MCM NL (English)', url: 'https://nl.mcmworldwide.com/en_NL/home', country: 'NL', latitude: 52.3676, longitude: 4.9041 },
  { name: 'MCM UK (English)', url: 'https://uk.mcmworldwide.com/en_GB/home', country: 'GB', latitude: 51.5074, longitude: -0.1278 },
  { name: 'MCM US (English)', url: 'https://us.mcmworldwide.com/en_US/home', country: 'US', latitude: 38.9072, longitude: -77.0369 },
];

exports.handler = async (event) => {
  console.log('DB Seed Lambda invoked:', JSON.stringify(event));

  // Only run on Create/Update, not Delete
  if (event.RequestType === 'Delete') {
    return { PhysicalResourceId: 'dynamo-seed' };
  }

  try {
    const ts = now();

    // Seed Topics
    const topicItems = DEFAULT_TOPICS.map(t => ({
      id: newId(),
      name: t.name,
      description: t.description,
      created_at: ts,
      updated_at: ts,
    }));
    await batchWrite(TABLES.TOPICS, topicItems);
    console.log(`Seeded ${topicItems.length} topics`);

    // Seed Monitored Sites
    const siteItems = MCM_SITES.map(s => ({
      id: newId(),
      name: s.name,
      url: s.url,
      country: s.country,
      latitude: s.latitude,
      longitude: s.longitude,
      is_paused: false,
      status: 'active',
      created_at: ts,
      updated_at: ts,
    }));
    await batchWrite(TABLES.MONITORED_SITES, siteItems);
    console.log(`Seeded ${siteItems.length} monitored sites`);

    return {
      PhysicalResourceId: 'dynamo-seed',
      Data: { topicsSeeded: topicItems.length, sitesSeeded: siteItems.length },
    };
  } catch (err) {
    console.error('Seed error:', err.message, err.stack);
    throw err;
  }
};
