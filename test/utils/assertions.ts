export function expectError(func, error) {
    return expect(func).rejects.toContain(error);
}