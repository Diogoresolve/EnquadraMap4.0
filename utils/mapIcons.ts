export const getMapIcon = (options: { status: 'success' | 'fail' | 'pending' | 'terrain' | string, label: string }) => {
    let color = '#6b7280'; // gray for pending
    if (options.status === 'success') color = '#10b981'; // emerald-500
    if (options.status === 'fail') color = '#ef4444'; // red-500
    if (options.status === 'terrain') color = '#0ea5e9'; // sky-500 (or we could use #10b981 for terrain if they want it green, wait, earlier they had green for terrain, let's stick to emerald but maybe a different shape, or just a star for terrain)

    if (options.status === 'terrain') {
        color = '#10b981'; // match the original terrain color
        const svgTerrain = `
        <svg width="40" height="48" viewBox="0 0 40 48" xmlns="http://www.w3.org/2000/svg">
            <path d="M20 0C8.954 0 0 8.954 0 20c0 15 20 28 20 28s20-13 20-28C40 8.954 31.046 0 20 0z" fill="${color}" />
            <circle cx="20" cy="20" r="14" fill="#ffffff" />
            <path d="M20 10l2.5 7.5H30l-6 4.5 2.5 7.5-6-4.5-6 4.5 2.5-7.5-6-4.5h7.5z" fill="${color}" />
        </svg>`;
        return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svgTerrain)}`;
    }

    const svg = `
    <svg width="40" height="48" viewBox="0 0 40 48" xmlns="http://www.w3.org/2000/svg">
        <path d="M20 0C8.954 0 0 8.954 0 20c0 15 20 28 20 28s20-13 20-28C40 8.954 31.046 0 20 0z" fill="${color}" />
        <circle cx="20" cy="20" r="14" fill="#ffffff" />
        <text x="20" y="24" font-family="sans-serif" font-size="12" font-weight="bold" fill="${color}" text-anchor="middle">${options.label}</text>
    </svg>`;
    
    return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
};
