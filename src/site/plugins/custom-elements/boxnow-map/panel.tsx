import React, { type FC, useState, useEffect } from 'react';
import { widget } from '@wix/editor';
import {
  SidePanel,
  WixDesignSystemProvider,
  Input,
  FormField,
  Divider,
} from '@wix/design-system';
import '@wix/design-system/styles.global.css';

const Panel: FC = () => {
  const [partnerId, setPartnerId] = useState<string>('');
  const [debug, setDebug] = useState<string>('false');

  useEffect(() => {
    widget.getProp('partnerId').then(val => setPartnerId(val || '123'));
    widget.getProp('debug').then(val => setDebug(val || 'false'));
  }, []);

  return (
    <WixDesignSystemProvider>
      <SidePanel width="300">
        <SidePanel.Content noPadding stretchVertically>
          <SidePanel.Field>
            <FormField label="Partner ID" infoContent="Your BoxNow Partner ID">
              <Input
                type="number"
                value={partnerId}
                onChange={(event) => {
                  const newVal = event.target.value;
                  setPartnerId(newVal);
                  widget.setProp('partnerId', newVal);
                }}
              />
            </FormField>
          </SidePanel.Field>

          <Divider />

          <SidePanel.Field>
            <FormField label="Debug Mode" infoContent="Type 'true' to enable alerts on selection">
              <Input
                type="text"
                value={debug}
                onChange={(event) => {
                  const newVal = event.target.value;
                  setDebug(newVal);
                  widget.setProp('debug', newVal);
                }}
              />
            </FormField>
          </SidePanel.Field>

        </SidePanel.Content>
      </SidePanel>
    </WixDesignSystemProvider>
  );
};

export default Panel;