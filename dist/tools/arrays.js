export function dedup(array) {
    const seen = new Set();
    return Array.from(array.filter((item) => {
        if (seen.has(item)) {
            return false;
        }
        seen.add(item);
        return true;
    }));
}
