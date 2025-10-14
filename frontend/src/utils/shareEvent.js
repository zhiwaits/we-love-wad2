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

    // Fallback for very old browsers
    const textArea = document.createElement('textarea');
    textArea.value = shareUrl;
    textArea.setAttribute('readonly', '');
    textArea.style.position = 'absolute';
    textArea.style.left = '-9999px';
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand('copy');
    document.body.removeChild(textArea);

    return shareUrl;
}
