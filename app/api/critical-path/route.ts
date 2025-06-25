import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const todos = await prisma.todo.findMany({
      include: {
        dependencies: {
          include: {
            required: true
          }
        }
      }
    });

    // Calculate critical path using longest path algorithm
    const criticalPath = calculateCriticalPath(todos);
    
    return NextResponse.json({
      criticalPath,
      totalDuration: criticalPath.reduce((sum, todo) => sum + (todo.estimatedDuration || 0), 0)
    });
  } catch (error) {
    console.error('Error calculating critical path:', error);
    return NextResponse.json({ error: 'Error calculating critical path' }, { status: 500 });
  }
}

function calculateCriticalPath(todos: any[]): any[] {
  // Create adjacency list for dependencies
  const graph: { [key: number]: number[] } = {};
  const inDegree: { [key: number]: number } = {};
  
  todos.forEach(todo => {
    graph[todo.id] = [];
    inDegree[todo.id] = 0;
  });
  
  todos.forEach(todo => {
    todo.dependencies.forEach((dep: any) => {
      graph[dep.requiredId].push(todo.id);
      inDegree[todo.id]++;
    });
  });
  
  // Find tasks with no dependencies (start nodes)
  const startNodes = todos.filter(todo => inDegree[todo.id] === 0);
  
  // Calculate longest path from each start node
  let maxPath: any[] = [];
  let maxDuration = 0;
  
  startNodes.forEach(startNode => {
    const path = longestPathFromNode(startNode, graph, todos);
    const duration = path.reduce((sum, todo) => sum + (todo.estimatedDuration || 0), 0);
    
    if (duration > maxDuration) {
      maxDuration = duration;
      maxPath = path;
    }
  });
  
  return maxPath;
}

function longestPathFromNode(node: any, graph: { [key: number]: number[] }, todos: any[]): any[] {
  const visited = new Set<number>();
  const path: any[] = [];
  
  function dfs(currentNode: any): void {
    if (visited.has(currentNode.id)) return;
    
    visited.add(currentNode.id);
    path.push(currentNode);
    
    const neighbors = graph[currentNode.id] || [];
    let maxDuration = 0;
    let bestNeighbor: any = null;
    
    neighbors.forEach((neighborId: number) => {
      const neighbor = todos.find(t => t.id === neighborId);
      if (neighbor) {
        const neighborPath = longestPathFromNode(neighbor, graph, todos);
        const duration = neighborPath.reduce((sum, todo) => sum + (todo.estimatedDuration || 0), 0);
        
        if (duration > maxDuration) {
          maxDuration = duration;
          bestNeighbor = neighbor;
        }
      }
    });
    
    if (bestNeighbor) {
      dfs(bestNeighbor);
    }
  }
  
  dfs(node);
  return path;
} 