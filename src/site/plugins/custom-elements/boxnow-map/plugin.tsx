import React, { type FC, useEffect, useRef, useState } from 'react';
import ReactDOM from 'react-dom';
import reactToWebComponent from 'react-to-webcomponent';
import styles from './plugin.module.css';

import { getInstanceId } from '../../../../backend/instance.web';
import { updateLockerInCheckout, clearLockerFromCheckout } from '../../../../backend/checkout.web';

type AuthData = {
  success: boolean;
  partner_id?: string;
  widget_gps?: boolean;
  widget_btn_color?: string;
  widget_btn_text?: string;
  widget_no_locker_msg?: string;
  regions?: Record<string, { max_weight: number; price: number }>;
};

type Props = {
  partnerId?: string;
  debug?: string; // passing boolean as string for custom element attribute
  appId?: string;
  checkoutId?: string; // Automatically passed by Wix on Checkout page
  checkoutUpdatedDate?: string; // Automatically passed by Wix whenever checkout changes
  onRefreshCheckout?: () => void; // Provided by Wix to refresh validations
};

declare global {
  interface Window {
    _bn_map_widget_config: any;
  }
}

const DEFAULT_BTN_COLOR = '#008060';
const DEFAULT_BTN_TEXT = 'Select a Locker';
const DEFAULT_NO_LOCKER_MSG = 'If you select BoxNow shipping method please select a locker from map. If locker is not selected, system automatically choose the nearest locker from your location.';
const FALLBACK_COUNTRIES = ['GR', 'CY', 'BG', 'HR'];
const CHECKOUT_Z_INDEX_SELECTORS = [
  '[data-hook="DeliverySection__root"]',
  '[data-hook="wcn-payment-widget"]',
  '#wcn-payment-widget-root',
];

const applyCheckoutZIndex = () => {
  CHECKOUT_Z_INDEX_SELECTORS.forEach((selector) => {
    document.querySelectorAll<HTMLElement>(selector).forEach((element) => {
      element.style.setProperty('z-index', '0', 'important');
    });
  });
};

const applyCheckoutZIndexAfterRender = () => {
  applyCheckoutZIndex();
  requestAnimationFrame(applyCheckoutZIndex);
};

const BoxNowMap: FC<Props> = (props) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLAnchorElement>(null); // Ref for the BoxNow trigger button
  const [selectedLocker, setSelectedLocker] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
  const [authData, setAuthData] = useState<AuthData | null>(null);
  const [countryCode, setCountryCode] = useState<string | null>(null);
  const [shippingMethodCode, setShippingMethodCode] = useState<string | null>(null);
  const prevCountryRef = useRef<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false); // Loading state for validation refresh

  // Dynamic values from API response (with fallbacks)
  const btnColor = authData?.widget_btn_color || DEFAULT_BTN_COLOR;
  const btnText = authData?.widget_btn_text || DEFAULT_BTN_TEXT;
  const noLockerMsg = authData?.widget_no_locker_msg || DEFAULT_NO_LOCKER_MSG;
  const enableGPS = authData?.widget_gps ?? true;
  const partnerId = authData?.partner_id
    ? parseInt(authData.partner_id, 10)
    : props.partnerId
      ? parseInt(props.partnerId, 10)
      : 123;

  // Dynamic supported countries from enabled regions, or fallback
  const supportedCountries = authData?.regions && Object.keys(authData.regions).length > 0
    ? Object.keys(authData.regions).map(c => c.toUpperCase())
    : FALLBACK_COUNTRIES;
  const shouldShowSelectLockerButton = isAuthorized === true
    && !selectedLocker
    && !!countryCode
    && supportedCountries.includes(countryCode)
    && shippingMethodCode?.toUpperCase().startsWith('BOXNOW');



  useEffect(() => {
    const checkAuth = async () => {
      const aid = '28390b01-b1ee-4594-bc47-32290047a8f4';

      try {

        const secureInstanceId = await getInstanceId();



        if (!secureInstanceId) {

          setIsAuthorized(false);
          return;
        }

        const url = `https://app.myshipi.com/platforms/wix/check_boxnow_map.php?app_id=${aid}&instance_id=${secureInstanceId}`;


        const response = await fetch(url, {
          headers: {
            'ngrok-skip-browser-warning': 'true'
          }
        });
        const data: AuthData = await response.json();


        setAuthData(data);
        setIsAuthorized(data.success === true);
      } catch (error) {

        setIsAuthorized(false);
      }
    };
    checkAuth();
  }, [props.appId]);

  useEffect(() => {
    if (isAuthorized !== true) return;

    applyCheckoutZIndexAfterRender();

    const observer = new MutationObserver(applyCheckoutZIndexAfterRender);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    return () => observer.disconnect();
  }, [isAuthorized]);

  useEffect(() => {
    const fetchCountry = async () => {
      if (props.checkoutId) {
        try {
          const { getCheckoutCountry } = await import('../../../../backend/checkout.web');
          const result = await getCheckoutCountry(props.checkoutId);
          if (result.success) {
            if (result.countryCode && result.countryCode.toUpperCase() !== countryCode) {
              setCountryCode(result.countryCode.toUpperCase());
            }
            if (result.shippingMethodCode !== shippingMethodCode) {
              setShippingMethodCode(result.shippingMethodCode || null);
            }
            // Restore saved locker from checkout custom fields (e.g. after page refresh)
            if (result.savedLocker && !selectedLocker) {
              setSelectedLocker(result.savedLocker);
            }
          }
        } catch (error) {

        }
      }
    };
    fetchCountry();
  }, [props.checkoutId, props.checkoutUpdatedDate]);

  // Helper: call onRefreshCheckout on the custom element DOM node via props.container
  const triggerCheckoutRefresh = () => {
    const el = (props as any).container;
    if (el && typeof el.onRefreshCheckout === 'function') {
      setIsRefreshing(true);
      el.onRefreshCheckout();
      // Fallback: clear loading after 5s in case checkoutUpdatedDate doesn't fire
      setTimeout(() => setIsRefreshing(false), 5000);
    }
  };

  // When checkoutUpdatedDate changes, validation has completed — clear loading
  useEffect(() => {
    // console.log('BoxNow: checkoutUpdatedDate changed', props.checkoutUpdatedDate);
    if (isRefreshing) {
      setIsRefreshing(false);
    }
  }, [props.checkoutUpdatedDate]);

  useEffect(() => {
    if (prevCountryRef.current && countryCode && prevCountryRef.current !== countryCode) {

      handleRemoveLocker();
    }
    prevCountryRef.current = countryCode;
  }, [countryCode]);

  useEffect(() => {
    if (isAuthorized !== true) return;

    const loadBoxNowScript = () => {
      if (!countryCode || !supportedCountries.includes(countryCode) || !shippingMethodCode?.toUpperCase().startsWith('BOXNOW')) {

        if (selectedLocker) {

          handleRemoveLocker();
        }
        return;
      }

      const tld = countryCode === 'GR' ? 'gr' : countryCode.toLowerCase();
      const scriptUrl = `https://widget-cdn.boxnow.${tld}/map-widget/client/v5.js`;



      // Cleanup existing script to force re-execution
      const allBoxNowScripts = document.querySelectorAll('script[src*="boxnow."]');
      allBoxNowScripts.forEach(s => s.remove());

      // Configure widget with dynamic values from API
      window._bn_map_widget_config = {
        partnerId: partnerId,
        parentElement: '#boxnowmap',
        type: 'popup',
        autoselect: false,
        enableGPS: enableGPS,
        afterSelect: async function (selected: any) {

          setIsLoading(false);

          if (selected && selected.boxnowLockerId) {
            setSelectedLocker(selected);

            // NATIVE INTEGRATION: Update Wix Checkout with custom fields
            if (props.checkoutId) {

              const result = await updateLockerInCheckout(
                props.checkoutId,
                selected
              );
              if (result.success) {
                triggerCheckoutRefresh();
              }
            } else {

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

      const script = document.createElement('script');
      script.src = scriptUrl;
      script.async = true;
      script.defer = true;
      script.onload = () => {

      };
      script.onerror = (e) => {

        setIsLoading(false);
      };
      document.head.appendChild(script);
    };

    const timer = setTimeout(loadBoxNowScript, 500);

    return () => clearTimeout(timer);
  }, [props.debug, isAuthorized, countryCode, authData, shippingMethodCode]);

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

    setSelectedLocker(null);

    if (props.checkoutId) {
      try {
        await clearLockerFromCheckout(props.checkoutId);
        triggerCheckoutRefresh();
      } catch (err) {

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
            border: 2px solid ${btnColor};
            border-radius: 16px;
            overflow: hidden;
            background: #fff;
            box-shadow: 0 4px 12px ${btnColor}26;
            margin-bottom: 20px;
            font-family: 'Inter', system-ui, -apple-system, sans-serif;
            animation: boxnowFadeIn 0.3s ease-out;
          }
          @keyframes boxnowFadeIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
          }
          .boxnow-card-header {
            background-color: ${btnColor};
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
            color: ${btnColor};
            margin-right: 10px;
            font-size: 18px;
          }
          .boxnow-refresh-overlay {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 10px;
            padding: 14px;
            background: rgba(255, 255, 255, 0.92);
            border: 1px solid #e0e0e0;
            border-radius: 8px;
            margin-bottom: 16px;
            animation: boxnowFadeIn 0.2s ease-out;
          }
          .boxnow-refresh-spinner {
            display: inline-block;
            width: 18px;
            height: 18px;
            border: 2px solid #e0e0e0;
            border-radius: 50%;
            border-top-color: ${btnColor};
            animation: spin 0.8s linear infinite;
          }
        `}
      </style>

      {isRefreshing && (
        <div className="boxnow-refresh-overlay">
          <span className="boxnow-refresh-spinner"></span>
          <span style={{
            fontSize: '13px',
            color: '#555',
            fontFamily: 'system-ui, -apple-system, sans-serif'
          }}>Updating checkout...</span>
        </div>
      )}

      {!selectedLocker && countryCode && supportedCountries.includes(countryCode) && shippingMethodCode?.toUpperCase().startsWith('BOXNOW') && (
        <div style={{ marginBottom: '20px' }}>
          <a
            href="javascript:;"
            style={{
              display: 'block',
              width: '100%',
              boxSizing: 'border-box',
              marginBottom: '10px',
              padding: '14px 24px',
              background: btnColor,
              color: '#ffffff',
              textDecoration: 'none',
              borderRadius: '6px',
              textAlign: 'center',
              fontSize: '15px',
              fontWeight: '450',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, "Open Sans", "Helvetica Neue", sans-serif',
              opacity: isLoading ? 0.8 : 1,
              boxShadow: 'none'
            }}
            onClick={!isLoading ? handleSelectLockerClick : undefined}
          >
            {isLoading && <span className="boxnow-spinner"></span>}
            {isLoading ? 'Opening Map...' : btnText}
          </a>
          <div style={{
            fontSize: '14px',
            color: '#666',
            textAlign: 'center',
            fontFamily: 'Helvetica, Arial, sans-serif',
            lineHeight: '1.4',
            padding: '0 10px'
          }}>
          </div>
        </div>
      )}

      {selectedLocker && selectedLocker.boxnowLockerId && countryCode && supportedCountries.includes(countryCode) && shippingMethodCode?.toUpperCase().startsWith('BOXNOW') && (
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
                style={{ color: btnColor, fontWeight: 'bold', cursor: 'pointer' }}
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
      checkoutUpdatedDate: 'string',
      onRefreshCheckout: 'function',
    },
  }
);

export default customElement;
