#!/usr/bin/env node
/**
 * Agentic-drift - Agentic Flow & AgentDB Integration
 *
 * This demo showcases the integration of agentic-flow and agentdb
 * for building intelligent, learning AI agents.
 */

console.log('🚀 Agentic-drift - Agentic Flow & AgentDB Integration\n');
console.log('This repository integrates two powerful AI frameworks:');
console.log('  • Agentic Flow - 66+ specialized agents with 213 MCP tools');
console.log('  • AgentDB - Lightning-fast vector database for AI agents\n');

/**
 * Display available features
 */
function showFeatures() {
  console.log('📊 AgentDB Features:');
  console.log('  ✓ Reflexion Memory - Learn from past experiences with self-critique');
  console.log('  ✓ Skill Library - Auto-consolidate successful patterns');
  console.log('  ✓ Causal Memory - Track cause-effect relationships');
  console.log('  ✓ 29 MCP Tools - Zero-code integration with Claude Code');
  console.log('  ✓ Vector Search - 150x faster with HNSW indexing\n');

  console.log('⚡ Agentic Flow Features:');
  console.log('  ✓ Agent Booster - 352x faster code operations (Rust/WASM)');
  console.log('  ✓ ReasoningBank - Persistent learning memory system');
  console.log('  ✓ Multi-Model Router - 85-99% cost savings (100+ LLMs)');
  console.log('  ✓ 66+ Specialized Agents - coder, reviewer, tester, etc.');
  console.log('  ✓ QUIC Transport - 50-70% faster than TCP\n');
}

/**
 * Show CLI usage examples
 */
function showCLIExamples() {
  console.log('🛠️  CLI Usage Examples:\n');

  console.log('AgentDB Commands:');
  console.log('  # Store reflexion memory');
  console.log('  npx agentdb reflexion store "session-1" "api_dev" 0.95 true "Success!"\n');

  console.log('  # Search for skills');
  console.log('  npx agentdb skill search "authentication" 10\n');

  console.log('  # Query causal relationships');
  console.log('  npx agentdb causal query "" "code_quality" 0.8\n');

  console.log('Agentic Flow Commands:');
  console.log('  # Run agent with optimization');
  console.log('  npx agentic-flow --agent coder --task "Build REST API" --optimize\n');

  console.log('  # Use specialized agents');
  console.log('  npx agentic-flow --agent reviewer --task "Review PR #123"\n');

  console.log('  # Multi-agent swarm');
  console.log('  npx agentic-flow --agent swarm --task "Complex project"\n');
}

/**
 * Main function
 */
function main() {
  // Show available features
  showFeatures();

  // Show CLI examples
  showCLIExamples();

  console.log('✅ Setup Complete!\n');
  console.log('📚 Next Steps:');
  console.log('   1. Set up your ANTHROPIC_API_KEY in .env file');
  console.log('   2. Try the CLI commands shown above');
  console.log('   3. Run the examples: node examples/basic-agent.js');
  console.log('   4. Check README.md for detailed documentation');
  console.log('   5. Visit https://agentdb.ruv.io for more information\n');
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { showFeatures, showCLIExamples };
