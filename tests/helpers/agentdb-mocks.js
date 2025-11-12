/**
 * Mock implementations of AgentDB components for unit testing
 * Following TDD London School - mock external dependencies
 */

export class MockDatabase {
  constructor() {
    this.data = new Map();
  }

  prepare(sql) {
    return {
      run: (...params) => ({ changes: 1 }),
      get: (...params) => null,
      all: (...params) => []
    };
  }

  exec(sql) {
    return [];
  }
}

export class MockEmbeddingService {
  async embed(text) {
    // Return mock embedding vector
    return new Array(384).fill(0).map(() => Math.random());
  }
}

export class MockReflexionMemory {
  constructor() {
    this.episodes = [];
  }

  async storeEpisode(episode) {
    const episodeWithId = {
      ...episode,
      id: this.episodes.length + 1,
      timestamp: episode.timestamp || Date.now()
    };
    this.episodes.push(episodeWithId);
    return episodeWithId.id;
  }

  async retrieveRelevant(query) {
    return this.episodes.slice(-5);
  }

  async getAllEpisodes() {
    return this.episodes;
  }
}

export class MockSkillLibrary {
  constructor() {
    this.skills = [];
  }

  async createSkill(skill) {
    const skillWithId = {
      ...skill,
      id: this.skills.length + 1,
      createdAt: Date.now()
    };
    this.skills.push(skillWithId);
    return skillWithId.id;
  }

  async searchSkills(query) {
    return this.skills.filter(s => s.successRate >= (query.minSuccessRate || 0)).slice(0, query.k || 5);
  }

  async getAllSkills() {
    return this.skills;
  }
}

export class MockCausalMemoryGraph {
  constructor() {
    this.edges = [];
  }

  addCausalEdge(edge) {
    this.edges.push(edge);
    return this.edges.length;
  }

  getCausalPaths(fromId, toId) {
    return this.edges.filter(e => e.fromMemoryId === fromId && e.toMemoryId === toId);
  }
}

/**
 * Factory function to create mock AgentDB components
 */
export function createMockAgentDB() {
  const db = new MockDatabase();
  const embedder = new MockEmbeddingService();
  const reflexion = new MockReflexionMemory();
  const skills = new MockSkillLibrary();
  const causal = new MockCausalMemoryGraph();

  return {
    db,
    embedder,
    reflexion,
    skills,
    causal
  };
}
