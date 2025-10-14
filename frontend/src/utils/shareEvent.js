export async function shareEventLink(event) {
    if (!event || !event.id) {
        throw new Error('Cannot share event: missing id');
    }

    const baseUrl = window?.location?.origin ?? '';
    const shareUrl = `${baseUrl}/events/${event.id}`;

    if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareUrl);
        return shareUrl;
    }

    return shareUrl;
}
