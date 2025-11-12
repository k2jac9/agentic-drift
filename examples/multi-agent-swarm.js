#!/usr/bin/env node
/**
 * Multi-Agent Swarm Example
 *
 * This example demonstrates how to orchestrate multiple AI agents
 * working together with shared memory via AgentDB.
 */

import { ReflexionMemory, CausalMemoryGraph } from 'agentdb';

class Agent {
  constructor(name, specialty) {
    this.name = name;
    this.specialty = specialty;
    this.reflexion = new ReflexionMemory();
    this.causal = new CausalMemoryGraph();
  }

  async execute(task) {
    console.log(`   🤖 ${this.name} (${this.specialty}) working on: ${task}`);

    // Simulate work
    await new Promise(resolve => setTimeout(resolve, Math.random() * 1000));

    const success = Math.random() > 0.2; // 80% success rate
    const score = success ? 0.75 + Math.random() * 0.25 : 0.3 + Math.random() * 0.4;

    // Store experience
    await this.reflexion.store({
      sessionId: `swarm-${Date.now()}`,
      taskName: task,
      score,
      success,
      reflection: `${this.name} completed ${task} with ${this.specialty} expertise`
    });

    return { agent: this.name, task, success, score };
  }
}

async function runMultiAgentSwarm() {
  console.log('🐝 Starting Multi-Agent Swarm Example\n');

  // Create agent swarm
  const agents = [
    new Agent('Alice', 'Backend Development'),
    new Agent('Bob', 'Frontend Development'),
    new Agent('Charlie', 'DevOps'),
    new Agent('Diana', 'Testing & QA')
  ];

  // Define tasks
  const tasks = [
    'Design API endpoints',
    'Build user interface',
    'Set up CI/CD pipeline',
    'Write integration tests'
  ];

  console.log('📋 Tasks to complete:');
  tasks.forEach((task, i) => console.log(`   ${i + 1}. ${task}`));
  console.log('\n🚀 Starting parallel execution...\n');

  // Execute tasks in parallel
  const results = await Promise.all(
    agents.map((agent, i) => agent.execute(tasks[i]))
  );

  // Analyze results
  console.log('\n📊 Results Summary:');
  results.forEach(result => {
    const status = result.success ? '✅' : '❌';
    console.log(`   ${status} ${result.agent}: ${result.task} (${(result.score * 100).toFixed(0)}%)`);
  });

  const totalScore = results.reduce((sum, r) => sum + r.score, 0) / results.length;
  const successRate = results.filter(r => r.success).length / results.length;

  console.log(`\n🎯 Overall Performance:`);
  console.log(`   Average Score: ${(totalScore * 100).toFixed(0)}%`);
  console.log(`   Success Rate: ${(successRate * 100).toFixed(0)}%`);
  console.log(`   Agents: ${agents.length}`);
  console.log(`   Tasks Completed: ${results.filter(r => r.success).length}/${tasks.length}`);
}

runMultiAgentSwarm();
