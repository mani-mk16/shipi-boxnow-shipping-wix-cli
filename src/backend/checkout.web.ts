import { webMethod, Permissions } from '@wix/web-methods';
import { checkout } from '@wix/ecom';

export const updateLockerInCheckout = webMethod(
    Permissions.Anyone,
    async (checkoutId: string, locker: any) => {
        try {
            console.log('UpdateLockerInCheckout - ID:', checkoutId, 'Locker:', locker.boxnowLockerId);

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

            console.log('Checkout updated successfully:', result._id);
            return { success: true, checkout: result };
        } catch (error: any) {
            console.error('Failed to update checkout custom fields:', error);
            return { success: false, error: error.message };
        }
    }
);

export const clearLockerFromCheckout = webMethod(
    Permissions.Anyone,
    async (checkoutId: string) => {
        try {
            console.log('ClearLockerFromCheckout - ID:', checkoutId);

            // Clearing custom fields by passing an empty array or empty values
            const result = await checkout.updateCheckout(checkoutId, {
                customFields: []
            });

            console.log('Checkout cleared successfully:', result._id);
            return { success: true };
        } catch (error: any) {
            console.error('Failed to clear checkout custom fields:', error);
            return { success: false, error: error.message };
        }
    }
);
