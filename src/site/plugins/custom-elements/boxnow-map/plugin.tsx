import React, { type FC, useEffect, useRef, useState } from 'react';
import ReactDOM from 'react-dom';
import reactToWebComponent from 'react-to-webcomponent';
import styles from './plugin.module.css';

import { getInstanceId } from '../../../../backend/instance.web';
import { updateLockerInCheckout, clearLockerFromCheckout } from '../../../../backend/checkout.web';

type Props = {
  partnerId?: string;
  debug?: string; // passing boolean as string for custom element attribute
  appId?: string;
  checkoutId?: string; // Automatically passed by Wix on Checkout page
};

declare global {
  interface Window {
    _bn_map_widget_config: any;
  }
}

const BoxNowMap: FC<Props> = (props) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLAnchorElement>(null); // Ref for the BoxNow trigger button
  const [selectedLocker, setSelectedLocker] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);

  useEffect(() => {
    console.log('BoxNow Component Props:', props);
  }, [props]);

  useEffect(() => {
    const checkAuth = async () => {
      const aid = props.appId || '28390b01-b1ee-4594-bc47-32290047a8f4';

      try {
        console.log('BoxNow CheckAuth - Fetching secure Instance ID...');
        const secureInstanceId = await getInstanceId();

        console.log('BoxNow CheckAuth - App ID:', aid);
        console.log('BoxNow CheckAuth - Secure Instance ID:', secureInstanceId);

        if (!secureInstanceId) {
          console.warn('BoxNow: Failed to retrieve secure instanceId. Component remains hidden.');
          setIsAuthorized(false);
          return;
        }

        const url = `https://app.myshipi.com/platforms/wix/check_boxnow_map.php?app_id=${aid}&instance_id=${secureInstanceId}`;
        console.log('BoxNow Fetching Auth:', url);

        const response = await fetch(url, {
          headers: {
            'ngrok-skip-browser-warning': 'true'
          }
        });
        const data = await response.json();

        console.log('BoxNow Auth Response:', data);
        setIsAuthorized(data.success === true);
      } catch (error) {
        console.error('BoxNow Auth API failed:', error);
        setIsAuthorized(false);
      }
    };
    checkAuth();
  }, [props.appId]);

  useEffect(() => {
    if (isAuthorized !== true) return;

    const loadBoxNowScript = () => {
      // Cleanup existing script to force re-execution
      const existingScript = document.querySelector('script[src*="boxnow.gr/map-widget/client/v5.js"]');
      if (existingScript) {
        existingScript.remove();
      }

      // Configure
      window._bn_map_widget_config = {
        partnerId: props.partnerId ? parseInt(props.partnerId, 10) : 123,
        parentElement: '#boxnowmap',
        type: 'popup', // Use popup as requested
        autoselect: false, // Required for popup type
        afterSelect: async function (selected: any) {
          console.log('BoxNow Locker Selected:', selected);
          setIsLoading(false);

          if (selected && selected.boxnowLockerId) {
            setSelectedLocker(selected);

            // NATIVE INTEGRATION: Update Wix Checkout with custom fields
            if (props.checkoutId) {
              console.log('Attempting to update Wix Checkout custom fields...');
              const result = await updateLockerInCheckout(
                props.checkoutId,
                selected.boxnowLockerId,
                selected.boxnowLockerAddressLine1 || ''
              );
              console.log('Update Checkout Result:', result);
            } else {
              console.warn('BoxNow: No checkoutId found in props. Locker data NOT persistent to order.');
            }
          }

          const event = new CustomEvent('boxnow-locker-selected', { detail: selected });
          window.dispatchEvent(event);

          if (props.debug === 'true') {
            alert(`Selected Locker: ${selected.boxnowLockerId}\nAddress: ${selected.boxnowLockerAddressLine1}`);
          }
        },
      };

      // Inject
      console.log('Injecting BoxNow Script...');
      const script = document.createElement('script');
      script.src = 'https://widget-cdn.boxnow.gr/map-widget/client/v5.js';
      script.async = true;
      script.defer = true;
      script.onload = () => {
        console.log('BoxNow Script Loaded');
      };
      script.onerror = (e) => {
        console.error('BoxNow Script Failed', e);
        setIsLoading(false);
      };
      document.head.appendChild(script);
    };

    const timer = setTimeout(loadBoxNowScript, 500);

    return () => clearTimeout(timer);
  }, [props.partnerId, props.debug, isAuthorized]);

  if (isAuthorized === false) {
    return null;
  }

  if (isAuthorized === null) {
    return null;
  }

  const handleSelectLockerClick = () => {
    setIsLoading(true);
    buttonRef.current?.click();

    // Fallback: hide loader after 10 seconds if no selection happened
    setTimeout(() => setIsLoading(false), 10000);
  };

  const handleRemoveLocker = async () => {
    console.log('BoxNow: Removing selected locker...');
    setSelectedLocker(null);

    if (props.checkoutId) {
      try {
        await clearLockerFromCheckout(props.checkoutId);
        console.log('BoxNow: Locker cleared from backend checkout.');
      } catch (err) {
        console.error('BoxNow: Failed to clear backend checkout:', err);
      }
    }

    const event = new CustomEvent('boxnow-locker-removed');
    window.dispatchEvent(event);
  };

  return (
    <div className={styles.root}>
      {/* Hidden persistent trigger that is always in the DOM for BoxNow script */}
      <a
        href="javascript:;"
        className="boxnow-map-widget-button"
        ref={buttonRef}
        style={{ display: 'none' }}
        onClick={() => {
          // Reset loading state briefly after trigger to allow re-clicks if map is already open
          setTimeout(() => setIsLoading(false), 2000);
        }}
      ></a>

      <style>
        {`
          .boxnow-spinner {
            display: inline-block;
            width: 16px;
            height: 16px;
            border: 2px solid rgba(255,255,255,0.3);
            border-radius: 50%;
            border-top-color: #fff;
            animation: spin 1s ease-in-out infinite;
            margin-right: 10px;
            vertical-align: middle;
          }
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
          .boxnow-locker-card {
            border: 2px solid #008060;
            border-radius: 16px;
            overflow: hidden;
            background: #fff;
            box-shadow: 0 4px 12px rgba(0, 128, 96, 0.15);
            margin-bottom: 20px;
            font-family: 'Inter', system-ui, -apple-system, sans-serif;
            animation: boxnowFadeIn 0.3s ease-out;
          }
          @keyframes boxnowFadeIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
          }
          .boxnow-card-header {
            background-color: #008060;
            padding: 10px 15px;
            display: flex;
            align-items: center;
            justify-content: space-between;
          }
          .boxnow-card-body {
            padding: 15px;
            position: relative;
          }
          .boxnow-remove-btn {
            background: none;
            border: none;
            color: #d32f2f;
            cursor: pointer;
            font-size: 13px;
            font-weight: 600;
            padding: 5px 10px;
            border-radius: 6px;
            transition: background 0.2s;
            text-transform: uppercase;
          }
          .boxnow-remove-btn:hover {
            background: rgba(211, 47, 47, 0.05);
          }
          .boxnow-location-icon {
            color: #008060;
            margin-right: 10px;
            font-size: 18px;
          }
        `}
      </style>

      {!selectedLocker && (
        <div style={{ marginBottom: '20px' }}>
          <a
            href="javascript:;"
            style={{
              display: 'block',
              width: '100%',
              boxSizing: 'border-box',
              marginBottom: '10px',
              padding: '12px 24px',
              background: '#008060',
              color: '#f0fdf4',
              textDecoration: 'none',
              borderRadius: '24px',
              textAlign: 'center',
              fontWeight: 'bold',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              fontFamily: 'Helvetica, Arial, sans-serif',
              opacity: isLoading ? 0.8 : 1,
              boxShadow: '0 4px 10px rgba(0, 128, 96, 0.2)'
            }}
            onClick={!isLoading ? handleSelectLockerClick : undefined}
          >
            {isLoading && <span className="boxnow-spinner"></span>}
            {isLoading ? 'Opening Map...' : 'Select BoxNow Locker from map'}
          </a>
          <div style={{
            fontSize: '14px',
            color: '#666',
            textAlign: 'center',
            fontFamily: 'Helvetica, Arial, sans-serif',
            lineHeight: '1.4',
            padding: '0 10px'
          }}>
            If you select BoxNow shipping method please select a locker from map. If locker is not selected, system automatically choose the nearest locker from your location.
          </div>
        </div>
      )}

      {selectedLocker && selectedLocker.boxnowLockerId && (
        <div className="boxnow-locker-card">
          <div className="boxnow-card-header">
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <svg width="20" height="24" viewBox="0 0 24 24" fill="#f0fdf4">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
              </svg>
              <span style={{ marginLeft: '8px', fontWeight: 'bold', color: '#f0fdf4', fontSize: '14px' }}>SELECTED LOCKER</span>
            </div>
            <button className="boxnow-remove-btn" style={{ color: '#fff' }} onClick={handleRemoveLocker}>Remove</button>
          </div>
          <div className="boxnow-card-body">
            <div style={{ fontWeight: 800, color: '#000', fontSize: '16px', marginBottom: '4px' }}>
              {selectedLocker.boxnowLockerName || 'BoxNow Locker'}
            </div>
            <div style={{ fontSize: '14px', color: '#555', lineHeight: '1.4' }}>
              {selectedLocker.boxnowLockerAddressLine1}<br />
              {selectedLocker.boxnowLockerPostalCode}
            </div>
            <div style={{
              marginTop: '10px',
              fontSize: '11px',
              color: '#999',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              borderTop: '1px solid #f0f0f0',
              paddingTop: '8px',
              display: 'flex',
              justifyContent: 'space-between'
            }}>
              <span>Locker ID: {selectedLocker.boxnowLockerId}</span>
              <span
                style={{ color: '#008060', fontWeight: 'bold', cursor: 'pointer' }}
                onClick={handleSelectLockerClick}
              >CHANGE</span>
            </div>
          </div>
        </div>
      )}

      <div id="boxnowmap" ref={mapContainerRef}></div>
    </div>
  );
};

const customElement = reactToWebComponent(
  BoxNowMap,
  React,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ReactDOM as any,
  {
    props: {
      partnerId: 'string',
      debug: 'string',
      appId: 'string',
      checkoutId: 'string',
    },
  }
);

export default customElement;
