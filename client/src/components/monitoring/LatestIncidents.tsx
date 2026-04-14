import React from 'react';
import { Card, Title, Badge } from '@tremor/react';
import { Incident } from '../../types';
import { formatDistanceToNow } from '../../lib/utils';
import { Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow } from '@tremor/react';
import { parseISO, isValid } from 'date-fns';

interface LatestIncidentsProps {
    incidents: Incident[];
}

const MIN_VALID_YEAR = 2000;

export const LatestIncidents: React.FC<LatestIncidentsProps> = ({ incidents }) => {
    return (
        <Card>
            <Title>Latest Incidents</Title>
            <Table className="mt-5">
                <TableHead>
                    <TableRow>
                        <TableHeaderCell>Reason</TableHeaderCell>
                        <TableHeaderCell>Started</TableHeaderCell>
                        <TableHeaderCell>Duration</TableHeaderCell>
                        <TableHeaderCell>Status</TableHeaderCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {incidents.map((incident, index) => {
                        console.log('incident.started_at raw value:', JSON.stringify(incident.started_at));
                        let startedAt: string;
                        const parsed = incident.started_at ? parseISO(incident.started_at) : null;

                        if (parsed && isValid(parsed) && parsed.getFullYear() >= MIN_VALID_YEAR) {
                            startedAt = formatDistanceToNow(parsed);
                        } else {
                            startedAt = 'Unknown';
                        }

                        return (
                            <TableRow key={index}>
                                <TableCell>{incident.reason}</TableCell>
                                <TableCell>{startedAt}</TableCell>
                                <TableCell>{incident.duration_human}</TableCell>
                                <TableCell>
                                    <Badge color={incident.is_resolved ? 'green' : 'red'}>
                                        {incident.is_resolved ? 'Resolved' : 'Ongoing'}
                                    </Badge>
                                </TableCell>
                            </TableRow>
                        );
                    })}
                </TableBody>
            </Table>
        </Card>
    );
};
