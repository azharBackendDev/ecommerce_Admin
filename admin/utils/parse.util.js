
export function safeParseJSON(input) {
    if (!input) return null;
    
    if (typeof input !== 'string') return input; //frontend se object aaya already fixed return kado
    try {
        return JSON.parse(input); // agar string format hai to json format kardo or response bhej do
    } catch (e) {
        throw new Error('Malformed JSON in one of the fields (attributes/variants/tags).');
    }
}