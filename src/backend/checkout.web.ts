import { webMethod, Permissions } from '@wix/web-methods';
import { checkout } from '@wix/ecom';

export const updateLockerInCheckout = webMethod(
    Permissions.Anyone,
    async (checkoutId: string, lockerId: string, lockerAddress: string) => {
        try {
            console.log('UpdateLockerInCheckout - ID:', checkoutId, 'Locker:', lockerId);

            // Fetch the current checkout to get its version/existing fields if needed
            // but updateCheckout might be enough with just the ID and the fields we want to set.

            const customField = {
                title: 'BoxNow Locker ID',
                value: lockerId
            };

            const addressField = {
                title: 'BoxNow Locker Address',
                value: lockerAddress
            };

            const result = await checkout.updateCheckout(checkoutId, {
                customFields: [customField, addressField]
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
