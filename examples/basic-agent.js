#!/usr/bin/env node
/**
 * Basic Agent Example
 *
 * This example shows how to create a simple AI agent using agentic-flow
 * with AgentDB for memory and learning.
 */

import { ReflexionMemory, SkillLibrary } from 'agentdb';

async function runBasicAgent() {
  console.log('🤖 Starting Basic Agent Example\n');

  // Initialize components
  const reflexion = new ReflexionMemory();
  const skills = new SkillLibrary();

  // Simulate an agent task
  const taskName = 'code_review';
  const sessionId = `session-${Date.now()}`;

  console.log(`📋 Task: ${taskName}`);
  console.log(`🔑 Session: ${sessionId}\n`);

  try {
    // Check for similar past experiences
    const pastExperiences = await reflexion.recall(sessionId);
    console.log(`💭 Found ${pastExperiences?.length || 0} past experiences`);

    // Search for relevant skills
    const relevantSkills = await skills.search('review', 5);
    console.log(`🛠️  Found ${relevantSkills?.length || 0} relevant skills`);

    // Simulate task execution
    console.log('\n⚙️  Executing task...');
    const success = Math.random() > 0.3; // 70% success rate simulation
    const score = success ? 0.8 + Math.random() * 0.2 : 0.4 + Math.random() * 0.3;

    // Store the experience
    await reflexion.store({
      sessionId,
      taskName,
      score,
      success,
      reflection: success
        ? 'Task completed successfully with good code quality'
        : 'Encountered issues, need to improve error detection'
    });

    console.log(`\n${success ? '✅' : '⚠️'} Task ${success ? 'completed' : 'failed'}`);
    console.log(`📊 Score: ${score.toFixed(2)}`);
    console.log(`💾 Experience stored for future learning`);

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

runBasicAgent();
