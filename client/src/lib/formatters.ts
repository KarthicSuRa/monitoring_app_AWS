export const formatDateTime = (isoString: string | undefined | null): string => {
    if (!isoString) return 'Invalid Date';
    try {
        const date = new Date(isoString);
        if (isNaN(date.getTime())) return 'Invalid Date';
        return date.toLocaleString(undefined, {
            year: 'numeric', month: 'short', day: 'numeric', 
            hour: 'numeric', minute: '2-digit', second: '2-digit'
        });
    } catch (e) {
        return 'Invalid Date';
    }
};

export const formatDate = (isoString: string | undefined | null): string => {
    if (!isoString) return 'Invalid Date';
    try {
        const date = new Date(isoString);
        if (isNaN(date.getTime())) return 'Invalid Date';
        return date.toLocaleDateString(undefined, {
            year: 'numeric', month: 'long', day: 'numeric' 
        });
    } catch (e) {
        return 'Invalid Date';
    }
};