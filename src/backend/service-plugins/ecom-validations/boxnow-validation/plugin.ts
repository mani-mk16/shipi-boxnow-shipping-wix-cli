import { validations } from '@wix/ecom/service-plugins';

const APP_ID = '28390b01-b1ee-4594-bc47-32290047a8f4';
const DEFAULT_NO_LOCKER_MSG = 'Please select a BoxNow locker from the map to proceed.';

export default validations.provideHandlers({
  getValidationViolations: async ({ request, metadata }) => {
    const r = request as any;
    const validationInfo = r.validationInfo || r.checkout || r.order || r.validationContext?.checkout;
    


    if (!validationInfo) {
        return { violations: [] };
    }

    const shippingInfo = validationInfo.shippingInfo || {};
    const selectedShippingOption = shippingInfo.selectedShippingOption || shippingInfo.selectedCarrierServiceOption;
    const customFields = validationInfo.customFields?.fields || validationInfo.customFields || [];

    // Check if the shipping code starts with "BOXNOW"
    if (selectedShippingOption?.code?.startsWith('BOXNOW')) {

      
      const lockerIdField = customFields.find((f: any) => f.title === 'BoxNow Locker ID');

      
      if (!lockerIdField || !lockerIdField.value || String(lockerIdField.value).trim() === "") {

        
        let errorMessage = DEFAULT_NO_LOCKER_MSG;
        let shouldValidate = true;

        // FETCH DYNAMIC MESSAGE FROM PHP BACKEND
        try {
            const instanceId = metadata.instanceId;
            const url = `https://app.myshipi.com/platforms/wix/check_boxnow_map.php?app_id=${APP_ID}&instance_id=${instanceId}`;
            
            const response = await fetch(url, {
                headers: { 'ngrok-skip-browser-warning': 'true' }
            });
            
            if (response.ok) {
                const data = await response.json() as any;
                if (data.success === false) {
                    shouldValidate = false;
                } else if (data.widget_no_locker_msg) {
                    errorMessage = data.widget_no_locker_msg;
                }
            }
        } catch (error) {

        }

        if (!shouldValidate) {
            return { violations: [] };
        }

        return {
          violations: [
            {
              severity: 'ERROR' as any,
              target: {
                other: {
                  name: 'OTHER'
                }
              } as any,
              description: errorMessage,
            } as any,
          ],
        };
      }
    }


    return {
      violations: [],
    };
  },
});
