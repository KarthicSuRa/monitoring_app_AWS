const fs = require('fs');
const path = require('path');
const axios = require('axios');

// ===========================================================================
// CONFIGURATION
// ===========================================================================

const API_ENDPOINT = 'http://localhost:3001/calendar'; // Replace with your actual local API endpoint
const MARKDOWN_FILE = path.join(__dirname, '../release_calendar.md');

// ===========================================================================
// SCRIPT LOGIC
// ===========================================================================

const parseMarkdownTable = (markdown) => {
    const lines = markdown.trim().split('\n');
    const header = lines[0].split('|').map(h => h.trim());
    const rows = lines.slice(2).map(line => {
        const values = line.split('|').map(v => v.trim());
        const rowData = {};
        header.forEach((key, index) => {
            if (key) rowData[key.toLowerCase().replace(/ /g, '_')] = values[index];
        });
        return rowData;
    });
    return rows;
};

const createCalendarEvent = async (eventData) => {
    try {
        const response = await axios.post(API_ENDPOINT, eventData, {
            // If your API requires authentication, you'll need to add headers
            // headers: { 'Authorization': 'Bearer YOUR_TOKEN' }
        });
        console.log(`Successfully created event: ${eventData.title}`);
        return response.data;
    } catch (error) {
        console.error(`Error creating event: ${eventData.title}`,
            error.response ? error.response.data : error.message);
    }
};

const main = async () => {
    const markdown = fs.readFileSync(MARKDOWN_FILE, 'utf-8');
    const releases = parseMarkdownTable(markdown);

    for (const release of releases) {
        const releaseVersion = release.release_version;
        if (!releaseVersion) continue;

        const deploymentTypes = ['dev_deployment', 'stg_deployment', 'prod_deployment'];

        for (const type of deploymentTypes) {
            const dateStr = release[type];
            if (dateStr && dateStr.trim()) {
                // Handle multiple dates in a single cell
                const dates = dateStr.split('<br>').map(d => d.trim());
                for (const d of dates) {
                    const date = new Date(d);
                    if (!isNaN(date)) {
                        const event = {
                            title: `${releaseVersion} - ${type.replace(/_/g, ' ').toUpperCase()}`,
                            start_time: date.toISOString(),
                            end_time: date.toISOString(), // Assuming it's a single-day event
                            description: `Release: ${releaseVersion}\nTeam: ${release.team || 'N/A'}\nNotes: ${release.wiki__notes || 'N/A'}`,
                            category: type.replace(/_/g, '-') // e.g., 'dev-deployment'
                        };
                        await createCalendarEvent(event);
                    }
                }
            }
        }
    }

    console.log('\nRelease calendar import complete.');
};

main();
