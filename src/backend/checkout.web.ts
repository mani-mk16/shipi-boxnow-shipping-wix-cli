import { webMethod, Permissions } from '@wix/web-methods';
import { checkout } from '@wix/ecom';

export const updateLockerInCheckout = webMethod(
    Permissions.Anyone,
    async (checkoutId: string, locker: any) => {
        try {


            const customFields = [
                { title: 'Selected Locker', value: `Name: ${locker.boxnowLockerName || ''}, Address: ${locker.boxnowLockerAddressLine1 || ''}, ${locker.boxnowLockerAddressLine2 || ''}, ${locker.boxnowLockerPostalCode || ''}, ID: ${locker.boxnowLockerId || ''}` },
                { title: 'BoxNow Locker ID', value: locker.boxnowLockerId ?? '' },
                { title: 'BoxNow Locker Name', value: locker.boxnowLockerName ?? '' },
                { title: 'BoxNow Locker Address', value: locker.boxnowLockerAddressLine1 ?? '' },
                { title: 'BoxNow Locker City', value: locker.boxnowLockerAddressLine2 ?? '' },
                { title: 'BoxNow Locker Postal Code', value: locker.boxnowLockerPostalCode ?? '' },
                { title: 'BoxNow Locker Latitude', value: locker.boxnowLockerLat ?? '' },
                { title: 'BoxNow Locker Longitude', value: locker.boxnowLockerLng ?? '' }
            ].filter(field => field.value); // Only send fields that have a value

            const result = await checkout.updateCheckout(checkoutId, {
                customFields
            });


            return { success: true, checkout: result };
        } catch (error: any) {

            return { success: false, error: error.message };
        }
    }
);

export const clearLockerFromCheckout = webMethod(
    Permissions.Anyone,
    async (checkoutId: string) => {
        try {


            // Clearing custom fields by passing an empty array or empty values
            const result = await checkout.updateCheckout(checkoutId, {
                customFields: []
            });


            return { success: true };
        } catch (error: any) {

            return { success: false, error: error.message };
        }
    }
);

export const getCheckoutCountry = webMethod(
    Permissions.Anyone,
    async (checkoutId: string) => {
        try {


            const result = await checkout.getCheckout(checkoutId);



            // Use official Wix paths provided in documentation
            const countryCode =
                (result.shippingInfo as any)?.shippingDestination?.address?.country ||
                (result.billingInfo as any)?.address?.country ||
                (result.shippingInfo as any)?.shippingAddress?.address?.countryCode ||
                (result.shippingInfo as any)?.logistics?.shippingAddress?.address?.countryCode;

            const shippingMethodCode =
                (result.shippingInfo as any)?.selectedShippingOption?.code ||
                (result.shippingInfo as any)?.selectedCarrierServiceOption?.code;

            // Extract saved locker data from custom fields
            const customFields = result.customFields || [];
            let savedLocker = null;
            const lockerIdField = customFields.find((f: any) => f.title === 'BoxNow Locker ID');
            if (lockerIdField && lockerIdField.value) {
                const getField = (title: string) => customFields.find((f: any) => f.title === title)?.value || '';
                savedLocker = {
                    boxnowLockerId: lockerIdField.value,
                    boxnowLockerName: getField('BoxNow Locker Name'),
                    boxnowLockerAddressLine1: getField('BoxNow Locker Address'),
                    boxnowLockerAddressLine2: getField('BoxNow Locker City'),
                    boxnowLockerPostalCode: getField('BoxNow Locker Postal Code'),
                    boxnowLockerLat: getField('BoxNow Locker Latitude'),
                    boxnowLockerLng: getField('BoxNow Locker Longitude'),
                };
            }

            return { success: true, countryCode, shippingMethodCode, savedLocker };
        } catch (error: any) {

            return { success: false, error: error.message };
        }
    }
);
