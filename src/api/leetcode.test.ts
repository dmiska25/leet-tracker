import { mapTagsToCategories, fetchProblemCatalog, fetchRecentSolves } from './leetcode';

describe('mapTagsToCategories', () => {
  it('should include only valid categories', () => {
    const input = ['Array', 'Tree', 'Graph'];
    const result = mapTagsToCategories(input);

    expect(result).toEqual(['Array', 'Tree', 'Graph']);
  });

  it('should exclude unknown or misspelled categories', () => {
    const input = ['Array', 'Graphs', 'Dynamic Programming', 'HashMap'];
    const result = mapTagsToCategories(input);

    expect(result).toEqual(['Array', 'Dynamic Programming']);
  });

  it('should return an empty array if no valid categories are given', () => {
    const input = ['Graphs', 'HashMaps', 'Quantum'];
    const result = mapTagsToCategories(input);

    expect(result).toEqual([]);
  });

  it('should handle an empty input array', () => {
    const result = mapTagsToCategories([]);
    expect(result).toEqual([]);
  });

  it('should preserve order of valid tags', () => {
    const input = ['Math', 'Array', 'Queue'];
    const result = mapTagsToCategories(input);

    expect(result).toEqual(['Math', 'Array', 'Queue']);
  });
});

describe('fetchProblemCatalog', () => {
  beforeEach(() => {
    global.fetch = vi.fn();
  });

  it('should parse and map valid problem data', async () => {
    const mockData = [
      {
        slug: 'two-sum',
        title: 'Two Sum',
        isPaidOnly: false,
        isFundamental: true,
        popularity: 0.9,
        difficulty: 'Easy',
        topicTags: ['Array', 'Hash Table'],
        likes: 54000,
        dislikes: 2000,
        description: '<p>desc</p>',
        createdAt: 1746308137,
      },
    ];

    (fetch as any).mockResolvedValueOnce({
      json: async () => mockData,
    });

    const result = await fetchProblemCatalog('https://example.com/data.json');

    expect(result).toEqual([
      {
        slug: 'two-sum',
        title: 'Two Sum',
        isFundamental: true,
        isPaid: false,
        popularity: 0.9,
        difficulty: 'Easy',
        description: '<p>desc</p>',
        tags: ['Array', 'Hash Table'],
        createdAt: 1746308137,
      },
    ]);
  });
});

describe('fetchRecentSolves', () => {
  beforeEach(() => {
    global.fetch = vi.fn();
  });

  it('should map raw submission data to Solve type', async () => {
    const mockSubmission = {
      count: 2,
      submission: [
        {
          title: 'Minimum Window Substring',
          titleSlug: 'minimum-window-substring',
          timestamp: '1746032384',
          statusDisplay: 'Accepted',
          lang: 'python3',
        },
        {
          title: 'Sliding Window Maximum',
          titleSlug: 'sliding-window-maximum',
          timestamp: '1746031189',
          statusDisplay: 'Accepted',
          lang: 'python3',
        },
      ],
    };

    (fetch as any).mockResolvedValueOnce({
      json: async () => mockSubmission,
    });

    const result = await fetchRecentSolves('dmiska25');

    expect(result).toEqual([
      {
        slug: 'minimum-window-substring',
        title: 'Minimum Window Substring',
        timestamp: 1746032384,
        status: 'Accepted',
        lang: 'python3',
      },
      {
        slug: 'sliding-window-maximum',
        title: 'Sliding Window Maximum',
        timestamp: 1746031189,
        status: 'Accepted',
        lang: 'python3',
      },
    ]);
  });
});
