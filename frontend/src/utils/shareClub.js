export async function shareClubLink(club) {
    if (!club || !club.id) {
        throw new Error('Cannot share club: missing id');
    }

    const baseUrl = window?.location?.origin ?? '';
    const shareUrl = `${baseUrl}/clubs/${club.id}`;

    if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareUrl);
        return shareUrl;
    }

    return shareUrl;
}