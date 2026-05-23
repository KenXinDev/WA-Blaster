/**
 * Basic setup test to verify Jest and fast-check are working correctly
 */
import * as fc from 'fast-check';

describe('Test Setup Verification', () => {
  it('should run basic Jest tests', () => {
    expect(1 + 1).toBe(2);
  });

  it('should run property-based tests with fast-check', () => {
    fc.assert(
      fc.property(fc.integer(), fc.integer(), (a, b) => {
        return a + b === b + a; // Addition is commutative
      })
    );
  });

  it('should have TypeScript interfaces available', () => {
    // Import a type to verify TypeScript compilation works
    const testUser: { id: string; email: string } = {
      id: 'test-id',
      email: 'test@example.com',
    };
    
    expect(testUser.id).toBe('test-id');
    expect(testUser.email).toBe('test@example.com');
  });
});