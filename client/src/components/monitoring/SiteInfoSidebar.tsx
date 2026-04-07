import React from 'react';
import { Card, Text, Metric, Grid, Badge, Flex, Icon } from '@tremor/react';
import { MonitoredSite } from '../../types';
import { CountryToEmoji } from '../../components/CountryToEmoji';
import { formatDate, formatDateTime } from '../../lib/formatters';
import { GlobeAltIcon, CalendarIcon, ClockIcon, ShieldCheckIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';

interface SiteInfoSidebarProps {
  site: MonitoredSite;
}

export const SiteInfoSidebar: React.FC<SiteInfoSidebarProps> = ({ site }) => {

  const DetailItem: React.FC<{icon: React.ElementType, label: string, value: React.ReactNode}> = ({ icon, label, value }) => (
    <div className="flex items-start space-x-3">
        <Icon icon={icon} className="h-5 w-5 text-tremor-content" />
        <div>
            <Text className="text-tremor-content">{label}</Text>
            <Text className="font-medium text-tremor-content-emphasis">{value}</Text>
        </div>
    </div>
  );

  return (
    <Card className="p-4">
      <div className="space-y-6">
        <DetailItem 
          icon={GlobeAltIcon} 
          label="Country" 
          value={<>{<CountryToEmoji countryCode={site.country} />} <span className="ml-2">{site.country || 'Unknown'}</span></>}
        />
        <DetailItem 
          icon={ClockIcon} 
          label="Last Checked"
          value={formatDateTime(site.latest_ping?.checked_at)}
        />
        <DetailItem 
          icon={CalendarIcon} 
          label="Created"
          value={formatDate(site.created_at)}
        />

        {site.ssl_info && (
            <div className="border-t border-tremor-border pt-6 mt-6">
              <Flex alignItems="center" className="mb-3">
                  <Icon icon={site.ssl_info.is_valid ? ShieldCheckIcon : ExclamationTriangleIcon} 
                      className={`h-6 w-6 ${site.ssl_info.is_valid ? 'text-green-500' : 'text-red-500'}`} />
                  <Text className="text-tremor-default font-medium uppercase text-tremor-content ml-2">SSL Certificate</Text>
              </Flex>
              <div className="space-y-4">
                <DetailItem 
                    icon={CalendarIcon} 
                    label="Expires"
                    value={formatDate(site.ssl_info.valid_to)}
                />
                <DetailItem 
                    icon={ShieldCheckIcon} 
                    label="Issuer"
                    value={site.ssl_info.issuer_s_o || 'N/A'}
                />
              </div>
          </div>
        )}

      </div>
    </Card>
  );
};