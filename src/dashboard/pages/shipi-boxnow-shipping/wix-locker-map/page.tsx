import React, { type FC } from 'react';
import { dashboard } from '@wix/dashboard';
import {
  Button,
  EmptyState,
  Image,
  Page,
  WixDesignSystemProvider,
} from '@wix/design-system';
import '@wix/design-system/styles.global.css';
import * as Icons from '@wix/wix-ui-icons-common';
import wixLogo from '../wix_logo.svg';

// Standard Wix Dashboard Page with native components
const DashboardPage: FC = () => {
  return (
    <WixDesignSystemProvider features={{ newColorsBranding: true }}>
      <Page>
        <Page.Header
          title="Wix Locker Map"
          subtitle="Configure your BoxNow lockers map integration."
        />
        <Page.Content>
          <EmptyState
            image={
              <Image fit="contain" height="100px" src={wixLogo} transparent />
            }
            title="BoxNow Map Integration"
            subtitle="Manage your BoxNow lockers map integration settings."
            skin="page"
          >
            <div style={{ textAlign: 'center' }}>
              <p>To enable BoxNow lockers on your checkout page:</p>
              <ol style={{ textAlign: 'left', display: 'inline-block', margin: '20px' }}>
                <li>Click the <strong>Add BoxNow to Checkout</strong> button below.</li>
                <li>Open the Wix Editor, save and <strong>Publish</strong> your site to apply changes.</li>
              </ol>

              <div style={{ marginTop: '20px' }}>
                <Button
                  prefixIcon={<Icons.Add />}
                  onClick={() => {
                    const pluginId = '2f948e99-5879-4b56-80b7-78d3648c113f';
                    const pluginPlacement = {
                      appDefinitionId: '1380b703-ce81-ff05-f115-39571d94dfcd',
                      widgetId: '14fd5970-8072-c276-1246-058b79e70c1a',
                      slotId: 'checkout:summary:totalsBreakdown:before',
                    };

                    dashboard.addSitePlugin(pluginId, { placement: pluginPlacement })
                      .then(() => dashboard.showToast({ message: 'BoxNow Plugin added to Checkout!' }))
                      .catch((error) => {
                        console.error('Error adding plugin:', error);
                        dashboard.showToast({ message: 'Failed to add plugin. Check console.' });
                      });
                  }}
                >
                  Add BoxNow to Checkout
                </Button>
              </div>
            </div>
          </EmptyState>
        </Page.Content>
      </Page>
    </WixDesignSystemProvider>
  );
};

export default DashboardPage;
