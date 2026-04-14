
import React from 'react';

interface ParcelsAppWidgetProps {
  trackingNumber: string | null;
}

const ParcelsAppWidget: React.FC<ParcelsAppWidgetProps> = ({ trackingNumber }) => {
  const widgetUrl = new URL('https://parcelsapp.com/widget');

  // Customization parameters to match the site's design
  widgetUrl.searchParams.set('backgroundColorButton', '#2563EB'); // blue-600
  widgetUrl.searchParams.set('colorButton', '#FFFFFF');
  widgetUrl.searchParams.set('borderRadiusButton', '6px');
  widgetUrl.searchParams.set('borderButton', 'none');
  widgetUrl.searchParams.set('placeholder', 'Enter tracking number');
  widgetUrl.searchParams.set('borderRadiusInput', '6px');
  widgetUrl.searchParams.set('widgetWrapBorderRadius', '8px');
  widgetUrl.searchParams.set('widgetWrapBorder', '1px solid #e5e7eb');

  // If a tracking number is selected on the page, pass it to the widget
  if (trackingNumber) {
    widgetUrl.searchParams.set('trackingNumber', trackingNumber);
  }

  return (
      <iframe
        src={widgetUrl.toString()}
        style={{
            width: '100%',
            height: '450px',
            border: 'none'
        }}
        title="Package Tracking Widget"
      ></iframe>
  );
};

export default ParcelsAppWidget;
