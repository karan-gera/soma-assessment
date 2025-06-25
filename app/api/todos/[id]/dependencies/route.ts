import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Get dependencies for a todo
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const todoId = parseInt(params.id);
    
    const dependencies = await prisma.todoDependency.findMany({
      where: { dependentId: todoId },
      include: {
        required: {
          select: {
            id: true,
            title: true,
            dueDate: true,
            estimatedDuration: true,
          }
        }
      }
    });
    
    return NextResponse.json(dependencies.map((d: any) => d.required));
  } catch (error) {
    console.error('Error fetching dependencies:', error);
    return NextResponse.json({ error: 'Error fetching dependencies' }, { status: 500 });
  }
}

// Add a dependency to a todo
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const todoId = parseInt(params.id);
    const { requiredId } = await request.json();
    
    if (!requiredId) {
      return NextResponse.json({ error: 'Required ID is needed' }, { status: 400 });
    }
    
    // Check for circular dependencies
    if (todoId === requiredId) {
      return NextResponse.json({ error: 'A task cannot depend on itself' }, { status: 400 });
    }
    
    // Check if this would create a circular dependency
    const wouldCreateCycle = await checkForCircularDependency(todoId, requiredId);
    if (wouldCreateCycle) {
      return NextResponse.json({ error: 'This would create a circular dependency' }, { status: 400 });
    }
    
    const dependency = await prisma.todoDependency.create({
      data: {
        dependentId: todoId,
        requiredId: requiredId,
      },
      include: {
        required: {
          select: {
            id: true,
            title: true,
            dueDate: true,
            estimatedDuration: true,
          }
        }
      }
    });
    
    // Recalculate earliest start dates
    await recalculateEarliestStartDates();
    
    return NextResponse.json(dependency.required, { status: 201 });
  } catch (error) {
    console.error('Error adding dependency:', error);
    return NextResponse.json({ error: 'Error adding dependency' }, { status: 500 });
  }
}

// Remove a dependency from a todo
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const todoId = parseInt(params.id);
    const { searchParams } = new URL(request.url);
    const requiredId = searchParams.get('requiredId');
    
    if (!requiredId) {
      return NextResponse.json({ error: 'Required ID is needed' }, { status: 400 });
    }
    
    await prisma.todoDependency.deleteMany({
      where: {
        dependentId: todoId,
        requiredId: parseInt(requiredId),
      }
    });
    
    // Recalculate earliest start dates
    await recalculateEarliestStartDates();
    
    return NextResponse.json({ message: 'Dependency removed' });
  } catch (error) {
    console.error('Error removing dependency:', error);
    return NextResponse.json({ error: 'Error removing dependency' }, { status: 500 });
  }
}

// Helper function to check for circular dependencies
async function checkForCircularDependency(dependentId: number, requiredId: number): Promise<boolean> {
  const visited = new Set<number>();
  const recursionStack = new Set<number>();
  
  async function dfs(nodeId: number): Promise<boolean> {
    if (recursionStack.has(nodeId)) {
      return true; // Circular dependency found
    }
    
    if (visited.has(nodeId)) {
      return false;
    }
    
    visited.add(nodeId);
    recursionStack.add(nodeId);
    
    const dependencies = await prisma.todoDependency.findMany({
      where: { dependentId: nodeId }
    });
    
    for (const dep of dependencies) {
      if (await dfs(dep.requiredId)) {
        return true;
      }
    }
    
    recursionStack.delete(nodeId);
    return false;
  }
  
  return await dfs(requiredId);
}

// Helper function to recalculate earliest start dates
async function recalculateEarliestStartDates() {
  const todos = await prisma.todo.findMany({
    include: {
      dependencies: {
        include: {
          required: true
        }
      }
    }
  });
  
  // Topological sort to process todos in dependency order
  const sortedTodos = topologicalSort(todos);
  
  for (const todo of sortedTodos) {
    let earliestStart = new Date();
    
    if (todo.dependencies.length > 0) {
      // Find the latest completion time of all dependencies
      for (const dep of todo.dependencies) {
        const depCompletionTime = new Date(dep.required.earliestStartDate || new Date());
        if (dep.required.estimatedDuration) {
          depCompletionTime.setMinutes(depCompletionTime.getMinutes() + dep.required.estimatedDuration);
        }
        
        if (depCompletionTime > earliestStart) {
          earliestStart = depCompletionTime;
        }
      }
    }
    
    await prisma.todo.update({
      where: { id: todo.id },
      data: { earliestStartDate: earliestStart }
    });
  }
}

// Helper function for topological sort
function topologicalSort(todos: any[]): any[] {
  const visited = new Set<number>();
  const recursionStack = new Set<number>();
  const result: any[] = [];
  
  function dfs(todo: any): boolean {
    if (recursionStack.has(todo.id)) {
      return true; // Circular dependency
    }
    
    if (visited.has(todo.id)) {
      return false;
    }
    
    visited.add(todo.id);
    recursionStack.add(todo.id);
    
    for (const dep of todo.dependencies) {
      const requiredTodo = todos.find(t => t.id === dep.requiredId);
      if (requiredTodo && dfs(requiredTodo)) {
        return true;
      }
    }
    
    recursionStack.delete(todo.id);
    result.unshift(todo);
    return false;
  }
  
  for (const todo of todos) {
    if (!visited.has(todo.id)) {
      if (dfs(todo)) {
        throw new Error('Circular dependency detected');
      }
    }
  }
  
  return result;
} 