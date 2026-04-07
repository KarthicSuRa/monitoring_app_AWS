import React from 'react';
import { Card, Title, AreaChart } from '@tremor/react';
import { PingLog } from '../../types';
import { formatDateTime } from '../../lib/formatters';

interface ResponseTimeChartProps {
    pings: PingLog[];
}

const customTooltip = (props: any) => {
    const { payload, active } = props;
    if (!active || !payload) return null;
    const category = payload[0];
    const time = category.payload.time;
    
    return (
        <div className="w-56 rounded-tremor-default text-tremor-default bg-tremor-background p-2 shadow-tremor-dropdown border-tremor-border">
            <div className="flex flex-1 space-x-2.5">
                <div className={`w-1 flex flex-col bg-${category.color}-500 rounded`}></div>
                <div className="w-full">
                    <p className="font-medium text-tremor-content-emphasis">{category.value} ms</p>
                    <p className="text-tremor-content">{time}</p>
                </div>
            </div>
        </div>
    );
};

export const ResponseTimeChart: React.FC<ResponseTimeChartProps> = ({ pings }) => {

    const chartData = pings.slice(0, 100).map(ping => ({
        time: formatDateTime(ping.checked_at),
        'Response Time (ms)': ping.response_time_ms,
    })).reverse();

    return (
        <Card>
            <Title>Response Time Over Last 100 Checks</Title>
            <AreaChart
                className="h-72 mt-4"
                data={chartData}
                index="time"
                categories={['Response Time (ms)']}
                colors={['blue']}
                yAxisWidth={60}
                valueFormatter={(number: number) => `${number} ms`}
                customTooltip={customTooltip}
                showLegend={false}
            />
        </Card>
    );
};