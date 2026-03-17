import React, { type FC, useEffect } from 'react';
import { dashboard } from '@wix/dashboard';
import { Loader, Page, WixDesignSystemProvider } from '@wix/design-system';
import '@wix/design-system/styles.global.css';

const DashboardPage: FC = () => {
  useEffect(() => {
    // Navigate using the confirmed Extension ID for Shipments
    dashboard.navigate('e4b3e8a4-0a37-4b7e-9665-c3f25c78a9c4');
  }, []);

  return (
    <WixDesignSystemProvider features={{ newColorsBranding: true }}>
      <Page height="100vh">
        <Page.Content>
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', minHeight: '400px' }}>
            <Loader text="Loading..." />
          </div>
        </Page.Content>
      </Page>
    </WixDesignSystemProvider>
  );
};

export default DashboardPage;
