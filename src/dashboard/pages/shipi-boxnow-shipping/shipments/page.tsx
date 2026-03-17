import React, { type FC } from 'react';
import { Page, WixDesignSystemProvider } from '@wix/design-system';
import '@wix/design-system/styles.global.css';

const DashboardPage: FC = () => {
  return (
    <WixDesignSystemProvider features={{ newColorsBranding: true }}>
      <div style={{ width: '100vw', height: '100vh', margin: 0, padding: 0, overflow: 'hidden' }}>
        <iframe
          src={`https://app.myshipi.com/embed/label.php?${window.location.search.substring(1)}`}
          width="100%"
          height="100%"
          style={{ border: 'none' }}
          title="Shipments"
        />
      </div>
    </WixDesignSystemProvider>
  );
};

export default DashboardPage;
