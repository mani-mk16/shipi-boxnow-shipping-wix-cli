import { webMethod, Permissions } from '@wix/web-methods';
import { auth } from '@wix/essentials';

export const getInstanceId = webMethod(
    Permissions.Anyone,
    async () => {
        try {
            // Decode the access token for the current session to get the instanceId
            const { instanceId } = await auth.getTokenInfo();
            return instanceId;
        } catch (error) {
            console.error('Failed to get instance ID:', error);
            throw error;
        }
    }
);
