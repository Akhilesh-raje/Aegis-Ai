const API_BASE_URL = 'http://localhost:8000/api';

const extremeTestService = {
  /**
   * Trigger the 9-phase extreme testing suite.
   */
  runSuite: async () => {
    const response = await fetch(`${API_BASE_URL}/extreme-tests/run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!response.ok) {
      throw new Error(`Failed to trigger extreme tests: ${response.statusText}`);
    }
    return response.json();
  }
};

export default extremeTestService;
