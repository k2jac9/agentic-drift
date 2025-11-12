#!/usr/bin/env node
/**
 * Learning Agent Example
 *
 * This example shows how agents can learn and improve over time
 * using ReflexionMemory and ReasoningBank.
 */

import { ReflexionMemory, SkillLibrary } from 'agentdb';

class LearningAgent {
  constructor(name) {
    this.name = name;
    this.reflexion = new ReflexionMemory();
    this.skills = new SkillLibrary();
    this.attemptCount = 0;
  }

  async attemptTask(taskName, difficulty = 0.5) {
    this.attemptCount++;
    const sessionId = `learning-${this.name}-${Date.now()}`;

    console.log(`\n🎯 Attempt #${this.attemptCount}: ${taskName}`);

    // Check past performance
    const pastAttempts = await this.reflexion.recall(sessionId);
    const hasExperience = pastAttempts && pastAttempts.length > 0;

    // Learning improves success rate
    const experienceBonus = hasExperience ? 0.2 : 0;
    const baseSuccessRate = 0.5 - difficulty;
    const successRate = Math.min(0.95, baseSuccessRate + experienceBonus + (this.attemptCount * 0.05));

    const success = Math.random() < successRate;
    const score = success
      ? 0.7 + Math.random() * 0.3
      : 0.2 + Math.random() * 0.4;

    // Store learning
    await this.reflexion.store({
      sessionId,
      taskName,
      score,
      success,
      reflection: success
        ? `Successfully completed ${taskName} using ${hasExperience ? 'past experience' : 'new approach'}`
        : `Failed ${taskName}, learned what not to do`
    });

    // If successful, store as a skill
    if (success && score > 0.8) {
      await this.skills.save({
        name: `${taskName}_skill`,
        description: `Learned skill for ${taskName}`,
        code: `// Approach for ${taskName}`,
        tags: [taskName, 'learned', `attempt-${this.attemptCount}`]
      });
      console.log(`   💡 New skill learned!`);
    }

    return { success, score, hasExperience };
  }
}

async function runLearningDemo() {
  console.log('🧠 Learning Agent Demonstration\n');
  console.log('This agent will attempt the same task multiple times,');
  console.log('learning and improving with each attempt.\n');

  const agent = new LearningAgent('Learner-1');
  const taskName = 'complex_algorithm_implementation';
  const difficulty = 0.4; // 0-1, higher = harder

  // Attempt the task multiple times
  for (let i = 0; i < 5; i++) {
    const result = await agent.attemptTask(taskName, difficulty);

    const status = result.success ? '✅ Success' : '❌ Failed';
    const exp = result.hasExperience ? '(using experience)' : '(first try)';
    console.log(`   ${status} - Score: ${(result.score * 100).toFixed(0)}% ${exp}`);

    // Pause between attempts
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  console.log('\n📈 Learning Progress:');
  console.log(`   Total Attempts: ${agent.attemptCount}`);
  console.log(`   The agent improved its performance through experience!`);
  console.log(`   Each failure teaches what to avoid.`);
  console.log(`   Each success reinforces good patterns.`);
}

runLearningDemo();
