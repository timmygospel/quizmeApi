export function generateEventCode(length = 6): string {
    const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // removed confusing chars I,O,1,0
    let code = "";
    for (let i = 0; i < length; i++) {
        code += alphabet[Math.floor(Math.random() * alphabet.length)];
    }
    return code;
}
